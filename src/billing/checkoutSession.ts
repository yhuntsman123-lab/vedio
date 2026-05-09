import type { BillingProvider, BillingProviderConfig, BillingEnv } from "./providers";
import { buildBillingConfigs, parseProviderPriority } from "./providers";

export interface CheckoutRequestInput {
  pointsPackageId: string;
  customerEmail?: string;
  clientReferenceId?: string;
  userId?: string;
  preferredProvider?: BillingProvider;
}

export interface CheckoutSessionResult {
  provider: BillingProvider;
  checkoutUrl: string;
  sessionId?: string;
}

interface BillingProductMapItem {
  stripePriceId?: string;
  creemProductId?: string;
  dodoProductId?: string;
  points?: number;
}

interface ExtendedBillingEnv extends BillingEnv {
  STRIPE_SECRET_KEY?: string;
  DODO_PAYMENTS_API_KEY?: string;
  CREEM_API_KEY?: string;
  BILLING_PRODUCT_MAP_JSON?: string;
  STRIPE_SUCCESS_URL?: string;
  STRIPE_CANCEL_URL?: string;
  APP_BASE_URL?: string;
  DODO_API_BASE?: string;
  CREEM_API_BASE?: string;
}

export async function createCheckoutWithFailover(
  env: ExtendedBillingEnv,
  input: CheckoutRequestInput,
  fetchFn: typeof fetch = fetch
): Promise<CheckoutSessionResult> {
  const enabled = buildBillingConfigs(env).filter((x) => x.enabled);
  if (enabled.length === 0) {
    throw new Error("no billing provider enabled; set BILLING_*_ENABLED=TRUE");
  }

  const priority = parseProviderPriority(env.BILLING_PROVIDER_PRIORITY ?? env.PAYMENT_PROVIDER_ORDER);
  const ordered = orderProviders(enabled, priority, input.preferredProvider);

  const errors: string[] = [];
  for (const cfg of ordered) {
    try {
      return await createProviderCheckout(cfg, env, input, fetchFn);
    } catch (err) {
      errors.push(`${cfg.provider}: ${String(err)}`);
    }
  }

  throw new Error(`all checkout providers failed: ${errors.join(" | ")}`);
}

function orderProviders(
  enabled: BillingProviderConfig[],
  priority: BillingProvider[],
  preferred?: BillingProvider
): BillingProviderConfig[] {
  const out: BillingProviderConfig[] = [];
  if (preferred) {
    const p = enabled.find((x) => x.provider === preferred);
    if (p) out.push(p);
  }
  for (const key of priority) {
    const hit = enabled.find((x) => x.provider === key);
    if (hit && !out.includes(hit)) out.push(hit);
  }
  for (const cfg of enabled) {
    if (!out.includes(cfg)) out.push(cfg);
  }
  return out;
}

async function createProviderCheckout(
  cfg: BillingProviderConfig,
  env: ExtendedBillingEnv,
  input: CheckoutRequestInput,
  fetchFn: typeof fetch
): Promise<CheckoutSessionResult> {
  switch (cfg.provider) {
    case "stripe":
      return createStripeCheckout(env, input, fetchFn);
    case "creem":
      return createCreemCheckout(env, input, fetchFn);
    case "dodo":
      return createDodoCheckout(env, input, fetchFn);
    default:
      throw new Error("unsupported provider");
  }
}

function parseProductMap(env: ExtendedBillingEnv): Record<string, BillingProductMapItem> {
  if (!env.BILLING_PRODUCT_MAP_JSON?.trim()) {
    throw new Error("missing BILLING_PRODUCT_MAP_JSON");
  }
  try {
    const parsed = JSON.parse(env.BILLING_PRODUCT_MAP_JSON) as Record<string, BillingProductMapItem>;
    return parsed;
  } catch {
    throw new Error("invalid BILLING_PRODUCT_MAP_JSON");
  }
}

function getMappedItem(env: ExtendedBillingEnv, packageId: string): BillingProductMapItem {
  const map = parseProductMap(env);
  const item = map[packageId];
  if (!item) {
    throw new Error(`points package not mapped: ${packageId}`);
  }
  return item;
}

async function createStripeCheckout(env: ExtendedBillingEnv, input: CheckoutRequestInput, fetchFn: typeof fetch): Promise<CheckoutSessionResult> {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error("missing STRIPE_SECRET_KEY");
  }

  const mapped = getMappedItem(env, input.pointsPackageId);
  if (!mapped.stripePriceId) {
    throw new Error(`missing stripePriceId mapping for package ${input.pointsPackageId}`);
  }

  const appBase = env.APP_BASE_URL ?? "https://aitvmake.com";
  const successUrl = env.STRIPE_SUCCESS_URL ?? `${appBase}/billing/success?provider=stripe`;
  const cancelUrl = env.STRIPE_CANCEL_URL ?? `${appBase}/billing/cancel?provider=stripe`;

  const form = new URLSearchParams();
  form.set("mode", "payment");
  form.set("success_url", successUrl);
  form.set("cancel_url", cancelUrl);
  form.set("line_items[0][price]", mapped.stripePriceId);
  form.set("line_items[0][quantity]", "1");
  if (input.customerEmail) form.set("customer_email", input.customerEmail);
  if (input.clientReferenceId) form.set("client_reference_id", input.clientReferenceId);
  if (input.userId) form.set("metadata[user_id]", input.userId);
  form.set("metadata[points_package_id]", input.pointsPackageId);

  const res = await fetchFn("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: form.toString()
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`stripe checkout create failed: ${res.status} ${t}`);
  }

  const data = (await res.json()) as { id: string; url: string };
  return { provider: "stripe", sessionId: data.id, checkoutUrl: data.url };
}

async function createCreemCheckout(env: ExtendedBillingEnv, input: CheckoutRequestInput, fetchFn: typeof fetch): Promise<CheckoutSessionResult> {
  if (!env.CREEM_API_KEY) {
    throw new Error("missing CREEM_API_KEY");
  }

  const mapped = getMappedItem(env, input.pointsPackageId);
  if (!mapped.creemProductId) {
    throw new Error(`missing creemProductId mapping for package ${input.pointsPackageId}`);
  }

  const apiBase = env.CREEM_API_BASE ?? "https://api.creem.io";
  const appBase = env.APP_BASE_URL ?? "https://aitvmake.com";
  const body = {
    product_id: mapped.creemProductId,
    units: 1,
    request_id: input.clientReferenceId,
    success_url: `${appBase}/billing/success?provider=creem`,
    customer: input.customerEmail ? { email: input.customerEmail } : undefined,
    metadata: {
      user_id: input.userId,
      points_package_id: input.pointsPackageId
    }
  };

  const res = await fetchFn(`${apiBase}/v1/checkouts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.CREEM_API_KEY
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`creem checkout create failed: ${res.status} ${t}`);
  }

  const data = (await res.json()) as { id?: string; checkout_url?: string; url?: string };
  const checkoutUrl = data.checkout_url ?? data.url;
  if (!checkoutUrl) {
    throw new Error("creem checkout response missing checkout URL");
  }
  return { provider: "creem", sessionId: data.id, checkoutUrl };
}

async function createDodoCheckout(env: ExtendedBillingEnv, input: CheckoutRequestInput, fetchFn: typeof fetch): Promise<CheckoutSessionResult> {
  if (!env.DODO_PAYMENTS_API_KEY) {
    throw new Error("missing DODO_PAYMENTS_API_KEY");
  }

  const mapped = getMappedItem(env, input.pointsPackageId);
  if (!mapped.dodoProductId) {
    throw new Error(`missing dodoProductId mapping for package ${input.pointsPackageId}`);
  }

  const apiBase = env.DODO_API_BASE ?? "https://live.dodopayments.com";
  const appBase = env.APP_BASE_URL ?? "https://aitvmake.com";
  const body = {
    product_cart: [{ product_id: mapped.dodoProductId, quantity: 1 }],
    return_url: `${appBase}/billing/success?provider=dodo`,
    metadata: {
      client_reference_id: input.clientReferenceId,
      user_id: input.userId,
      points_package_id: input.pointsPackageId
    },
    customer: input.customerEmail ? { email: input.customerEmail } : undefined
  };

  const res = await fetchFn(`${apiBase}/checkouts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.DODO_PAYMENTS_API_KEY}`
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`dodo checkout create failed: ${res.status} ${t}`);
  }

  const data = (await res.json()) as { session_id?: string; checkout_url?: string };
  if (!data.checkout_url) {
    throw new Error("dodo checkout response missing checkout_url");
  }
  return { provider: "dodo", sessionId: data.session_id, checkoutUrl: data.checkout_url };
}
