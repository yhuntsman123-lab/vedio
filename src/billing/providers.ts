export type BillingProvider = "stripe" | "creem" | "dodo";

export interface BillingProviderConfig {
  provider: BillingProvider;
  enabled: boolean;
  webhookSecret?: string;
  checkoutBaseUrl: string;
}

export interface BillingEnv {
  BILLING_STRIPE_ENABLED?: string;
  BILLING_CREEM_ENABLED?: string;
  BILLING_DODO_ENABLED?: string;
  BILLING_PROVIDER_PRIORITY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  CREEM_WEBHOOK_SECRET?: string;
  DODO_WEBHOOK_SECRET?: string;
}

export function isTrueFlag(value?: string): boolean {
  return (value ?? "").trim().toUpperCase() === "TRUE";
}

export function parseProviderPriority(priorityRaw?: string): BillingProvider[] {
  const fallback: BillingProvider[] = ["stripe", "creem", "dodo"];
  if (!priorityRaw?.trim()) {
    return fallback;
  }

  const parsed = priorityRaw
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter((x): x is BillingProvider => x === "stripe" || x === "creem" || x === "dodo");

  if (parsed.length === 0) {
    return fallback;
  }

  const deduped: BillingProvider[] = [];
  for (const item of parsed) {
    if (!deduped.includes(item)) {
      deduped.push(item);
    }
  }

  for (const item of fallback) {
    if (!deduped.includes(item)) {
      deduped.push(item);
    }
  }

  return deduped;
}

export function buildBillingConfigs(env: BillingEnv): BillingProviderConfig[] {
  return [
    {
      provider: "stripe",
      enabled: isTrueFlag(env.BILLING_STRIPE_ENABLED),
      webhookSecret: env.STRIPE_WEBHOOK_SECRET,
      checkoutBaseUrl: "https://stripe.com"
    },
    {
      provider: "creem",
      enabled: isTrueFlag(env.BILLING_CREEM_ENABLED),
      webhookSecret: env.CREEM_WEBHOOK_SECRET,
      checkoutBaseUrl: "https://www.creem.io"
    },
    {
      provider: "dodo",
      enabled: isTrueFlag(env.BILLING_DODO_ENABLED),
      webhookSecret: env.DODO_WEBHOOK_SECRET,
      checkoutBaseUrl: "https://app.dodopayments.com/home"
    }
  ];
}

export function selectBillingProvider(env: BillingEnv, preferred?: BillingProvider): BillingProviderConfig {
  const configs = buildBillingConfigs(env);
  const enabled = configs.filter((x) => x.enabled);
  if (enabled.length === 0) {
    throw new Error("no billing provider enabled; set BILLING_*_ENABLED=TRUE");
  }

  if (preferred) {
    const match = enabled.find((x) => x.provider === preferred);
    if (match) {
      return match;
    }
  }

  const priority = parseProviderPriority(env.BILLING_PROVIDER_PRIORITY);
  for (const p of priority) {
    const found = enabled.find((x) => x.provider === p);
    if (found) {
      return found;
    }
  }

  return enabled[0];
}

export function getBillingProviderConfig(env: BillingEnv, provider: BillingProvider): BillingProviderConfig {
  const cfg = buildBillingConfigs(env).find((x) => x.provider === provider);
  if (!cfg) {
    throw new Error(`unknown provider: ${provider}`);
  }
  if (!cfg.enabled) {
    throw new Error(`provider '${provider}' is disabled; set BILLING_${provider.toUpperCase()}_ENABLED=TRUE`);
  }
  return cfg;
}
