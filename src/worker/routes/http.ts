import { InMemoryD1 } from "../db/inMemoryD1";
import { AiStudioService } from "../api/service";
import { verifyStripeSignature } from "../../billing/stripeWebhook";
import { verifyGenericWebhookSignature } from "../../billing/genericWebhook";
import { selectBillingProvider, getBillingProviderConfig, type BillingProvider } from "../../billing/providers";
import { createCheckoutWithFailover } from "../../billing/checkoutSession";
import { renderPromptSecure, listPromptTemplateIds } from "../../prompts/vault/service";
import { verifyPayloadSignature } from "../../security/signing";
import { checkRateLimit } from "../../security/rateLimit";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" }
  });
}

function getApiToken(request: Request): string | null {
  const internal = request.headers.get("x-internal-api-key");
  if (internal) return internal;
  const auth = request.headers.get("authorization") ?? "";
  if (auth.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  return null;
}

function isAuthorized(request: Request, internalKey?: string): boolean {
  if (!internalKey) return false;
  return getApiToken(request) === internalKey;
}

async function safeJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new Error("invalid JSON body");
  }
}

function parseProductPointsMap(raw?: string): Record<string, number> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, { points?: number }>;
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v?.points === "number" && Number.isFinite(v.points) && v.points > 0) {
        out[k] = Math.floor(v.points);
      }
    }
    return out;
  } catch {
    return {};
  }
}

function progressByStatus(status: string): number {
  switch (status) {
    case "QUEUED": return 5;
    case "SCRIPTED": return 20;
    case "RENDERING": return 55;
    case "TTS_DONE": return 75;
    case "COMPOSITING": return 90;
    case "SUCCEEDED": return 100;
    case "FAILED": return 100;
    default: return 0;
  }
}

export async function handleHttp(
  request: Request,
  env: {
    STRIPE_WEBHOOK_SECRET?: string;
    CREEM_WEBHOOK_SECRET?: string;
    DODO_WEBHOOK_SECRET?: string;
    BILLING_STRIPE_ENABLED?: string;
    BILLING_CREEM_ENABLED?: string;
    BILLING_DODO_ENABLED?: string;
    BILLING_PROVIDER_PRIORITY?: string;
    STRIPE_ENABLED?: string;
    CREEM_ENABLED?: string;
    DODO_ENABLED?: string;
    PAYMENT_PROVIDER_ORDER?: string;
    STRIPE_SECRET_KEY?: string;
    CREEM_API_KEY?: string;
    DODO_PAYMENTS_API_KEY?: string;
    BILLING_PRODUCT_MAP_JSON?: string;
    STRIPE_SUCCESS_URL?: string;
    STRIPE_CANCEL_URL?: string;
    APP_BASE_URL?: string;
    DODO_API_BASE?: string;
    CREEM_API_BASE?: string;
    PROMPT_VAULT_SECRET?: string;
    INTERNAL_API_KEY?: string;
  }
): Promise<Response> {
  const url = new URL(request.url);

  if (request.method === "GET" && url.pathname === "/api/health") {
    return json({ ok: true, service: "ai-studio-worker" });
  }

  const db = new InMemoryD1();
  const service = new AiStudioService(db);

  if (request.method === "POST" && url.pathname === "/api/billing/webhook/stripe") {
    const payload = await request.text();
    const signature = request.headers.get("stripe-signature") ?? "";
    const secret = env.STRIPE_WEBHOOK_SECRET ?? "";
    if (!secret) return json({ ok: false, error: "missing stripe secret" }, 500);

    const ok = verifyStripeSignature({ payload, stripeSignatureHeader: signature, endpointSecret: secret });
    if (!ok) return json({ ok: false, error: "invalid signature" }, 400);

    let evt: any;
    try {
      evt = JSON.parse(payload);
    } catch {
      return json({ ok: false, error: "invalid webhook json" }, 400);
    }

    if (evt?.type === "checkout.session.completed") {
      const obj = evt?.data?.object ?? {};
      const userId = obj?.metadata?.user_id;
      const packageId = obj?.metadata?.points_package_id;
      const pointsMap = parseProductPointsMap(env.BILLING_PRODUCT_MAP_JSON);
      const points = pointsMap[packageId] ?? 0;
      if (userId && points > 0) {
        db.ensureUser({ id: userId, email: "webhook@aitvmake.com" });
        service.creditUser(userId, points, `stripe:${evt.id}`, `stripe:${packageId}`);
      }
    }

    return json({ ok: true });
  }

  if (request.method === "POST" && url.pathname === "/api/billing/webhook/creem") {
    const payload = await request.text();
    const signature = request.headers.get("x-signature") ?? "";
    const cfg = getBillingProviderConfig(env, "creem");
    if (!cfg.webhookSecret) return json({ ok: false, error: "missing creem secret" }, 500);

    const ok = verifyGenericWebhookSignature({ payload, signatureHeader: signature, endpointSecret: cfg.webhookSecret });
    if (!ok) return json({ ok: false, error: "invalid signature" }, 400);

    let evt: any;
    try {
      evt = JSON.parse(payload);
    } catch {
      return json({ ok: false, error: "invalid webhook json" }, 400);
    }

    const md = evt?.data?.metadata ?? evt?.metadata ?? {};
    const userId = md?.user_id;
    const packageId = md?.points_package_id;
    const pointsMap = parseProductPointsMap(env.BILLING_PRODUCT_MAP_JSON);
    const points = pointsMap[packageId] ?? 0;
    if (userId && points > 0) {
      db.ensureUser({ id: userId, email: "webhook@aitvmake.com" });
      service.creditUser(userId, points, `creem:${evt?.id ?? Date.now()}`, `creem:${packageId}`);
    }

    return json({ ok: true });
  }

  if (request.method === "POST" && url.pathname === "/api/billing/webhook/dodo") {
    const payload = await request.text();
    const signature = request.headers.get("x-signature") ?? "";
    const cfg = getBillingProviderConfig(env, "dodo");
    if (!cfg.webhookSecret) return json({ ok: false, error: "missing dodo secret" }, 500);

    const ok = verifyGenericWebhookSignature({ payload, signatureHeader: signature, endpointSecret: cfg.webhookSecret });
    if (!ok) return json({ ok: false, error: "invalid signature" }, 400);

    let evt: any;
    try {
      evt = JSON.parse(payload);
    } catch {
      return json({ ok: false, error: "invalid webhook json" }, 400);
    }

    const md = evt?.data?.metadata ?? evt?.metadata ?? {};
    const userId = md?.user_id;
    const packageId = md?.points_package_id;
    const pointsMap = parseProductPointsMap(env.BILLING_PRODUCT_MAP_JSON);
    const points = pointsMap[packageId] ?? 0;
    if (userId && points > 0) {
      db.ensureUser({ id: userId, email: "webhook@aitvmake.com" });
      service.creditUser(userId, points, `dodo:${evt?.id ?? Date.now()}`, `dodo:${packageId}`);
    }

    return json({ ok: true });
  }

  if (!isAuthorized(request, env.INTERNAL_API_KEY)) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }

  const userId = request.headers.get("x-user-id")?.trim();
  const userEmail = request.headers.get("x-user-email")?.trim() ?? "user@aitvmake.com";
  if (!userId) return json({ ok: false, error: "missing x-user-id" }, 400);

  db.ensureUser({ id: userId, email: userEmail });

  if (request.method === "POST" && url.pathname === "/api/billing/credit-demo") {
    db.credit(userId, 1000, `demo-credit-${Date.now()}`);
    return json({ ok: true, wallet: db.getWallet(userId) });
  }

  if (request.method === "GET" && url.pathname === "/api/billing/providers") {
    const selected = selectBillingProvider(env);
    return json({ ok: true, selectedProvider: selected.provider });
  }

  if (request.method === "POST" && url.pathname === "/api/billing/checkout-session") {
    const body = await safeJson<{
      preferredProvider?: BillingProvider;
      pointsPackageId?: string;
      points_package_id?: string;
      customerEmail?: string;
      clientReferenceId?: string;
    }>(request);

    const pointsPackageId = body.pointsPackageId ?? body.points_package_id;
    if (!pointsPackageId) return json({ ok: false, error: "missing points_package_id" }, 400);

    const created = await createCheckoutWithFailover(env, {
      preferredProvider: body.preferredProvider,
      pointsPackageId,
      customerEmail: body.customerEmail,
      clientReferenceId: body.clientReferenceId,
      userId
    });
    return json({ ok: true, ...created });
  }

  if (request.method === "POST" && url.pathname === "/api/projects") {
    const body = await safeJson<{
      title: string;
      styleProfileId?: "cn_cyber_dark" | "cn_gothic_dark" | "cn_realistic_drama";
      contentLanguage?: "zh" | "en";
      content_language?: "zh" | "en";
      sourceType?: "paste" | "txt" | "md" | "url";
      source_type?: "paste" | "txt" | "md" | "url";
      sourceText?: string;
      source_text?: string;
      sourceUri?: string;
      source_uri?: string;
    }>(request);

    const project = await service.createProject({
      userId,
      title: body.title,
      styleProfileId: body.styleProfileId ?? "cn_cyber_dark",
      contentLanguage: body.contentLanguage ?? body.content_language,
      sourceType: body.sourceType ?? body.source_type ?? "paste",
      sourceText: body.sourceText ?? body.source_text,
      sourceUri: body.sourceUri ?? body.source_uri
    });
    return json(project);
  }

  if (request.method === "POST" && url.pathname.startsWith("/api/projects/") && url.pathname.endsWith("/rewrite")) {
    const projectId = url.pathname.split("/")[3];
    const body = await safeJson<{ mode: "preserve" | "balanced" | "dramatic" }>(request);
    const rewritten = await service.rewriteProject({ projectId, mode: body.mode });
    return json({ project_id: rewritten.projectId, rewritten_script: rewritten.rewrittenScript, mode: rewritten.mode });
  }

  if (request.method === "POST" && url.pathname.startsWith("/api/projects/") && url.pathname.endsWith("/storyboard")) {
    const projectId = url.pathname.split("/")[3];
    const body = await safeJson<{ mode?: "preserve" | "balanced" | "dramatic"; rawScript?: string }>(request);
    const mode = body.mode ?? "balanced";
    const storyboard = body.rawScript
      ? await service.rewriteAndStoryboard({ projectId, rawScript: body.rawScript, mode })
      : await service.storyboardProject({ projectId, mode });
    return json(storyboard);
  }

  if (request.method === "POST" && url.pathname.startsWith("/api/projects/") && url.pathname.endsWith("/render")) {
    const projectId = url.pathname.split("/")[3];
    const body = await safeJson<{
      quality?: "draft" | "standard" | "pro";
      actor_bindings?: Array<{ actor_id?: string }>;
      actorId?: string;
      estimatedPoints?: number;
      providerId?: "generic" | "doubao" | "keling" | "runway";
    }>(request);

    const actorId = body.actor_bindings?.[0]?.actor_id ?? body.actorId;
    if (!actorId) return json({ ok: false, error: "missing actor binding" }, 400);

    const quality = body.quality ?? "standard";
    const qualityPoints = quality === "draft" ? 60 : quality === "pro" ? 180 : 120;
    const estimatedPoints = body.estimatedPoints ?? qualityPoints;

    const result = await service.startRender({
      userId,
      projectId,
      actorId,
      estimatedPoints,
      providerId: body.providerId
    });

    return json({
      job_id: result.jobId,
      settled_points: result.settledPoints,
      output_url: result.outputR2Key
    });
  }

  if (request.method === "GET" && url.pathname.startsWith("/api/jobs/")) {
    const jobId = url.pathname.split("/")[3];
    const job = service.getJob(jobId);
    return json({
      status: job.status,
      progress: progressByStatus(job.status),
      estimated_points: job.estimatedPoints,
      settled_points: job.settledPoints,
      output_url: job.outputR2Key
    });
  }

  if (request.method === "GET" && url.pathname === "/api/prompts/templates") {
    return json({ templates: listPromptTemplateIds() });
  }

  if (request.method === "POST" && url.pathname === "/api/prompts/render") {
    if (!env.PROMPT_VAULT_SECRET) return json({ ok: false, error: "prompt vault secret missing" }, 500);
    const rl = checkRateLimit(`prompt:${userId}`, 120, 60_000);
    if (!rl.ok) return json({ ok: false, error: "rate limited" }, 429);

    const signature = request.headers.get("x-prompt-signature") ?? "";
    const payload = await request.text();
    if (!verifyPayloadSignature(payload, signature, env.PROMPT_VAULT_SECRET)) {
      return json({ ok: false, error: "invalid signature" }, 400);
    }

    let body:
      | {
          templateId: string;
          context: {
            styleProfileId: "cn_cyber_dark" | "cn_gothic_dark" | "cn_realistic_drama";
            projectTitle: string;
            characterName?: string;
            characterDescription?: string;
            rawScript?: string;
            sceneText?: string;
            shotText?: string;
          };
          caller?: string;
        }
      | undefined;

    try {
      body = JSON.parse(payload);
    } catch {
      return json({ ok: false, error: "invalid JSON payload" }, 400);
    }
    if (!body) return json({ ok: false, error: "invalid JSON payload" }, 400);

    const rendered = renderPromptSecure(
      { templateId: body.templateId, context: body.context, caller: body.caller ?? "worker" },
      env.PROMPT_VAULT_SECRET
    );
    return json({ ok: true, ...rendered });
  }

  return json({ ok: false, error: "not found" }, 404);
}
