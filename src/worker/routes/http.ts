import { InMemoryD1 } from "../db/inMemoryD1";
import { AiStudioService } from "../api/service";
import { verifyStripeSignature } from "../../billing/stripeWebhook";
import { renderPromptSecure, listPromptTemplateIds } from "../../prompts/vault/service";
import { verifyPayloadSignature } from "../../security/signing";
import { checkRateLimit } from "../../security/rateLimit";

const db = new InMemoryD1();
db.ensureUser({ id: "demo_user", email: "demo@aitvmake.com" });
const service = new AiStudioService(db);

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" }
  });
}

export async function handleHttp(
  request: Request,
  env: { STRIPE_WEBHOOK_SECRET?: string; PROMPT_VAULT_SECRET?: string; INTERNAL_API_KEY?: string }
): Promise<Response> {
  const url = new URL(request.url);

  if (request.method === "GET" && url.pathname === "/api/health") {
    return json({ ok: true, service: "ai-studio-worker" });
  }

  if (request.method === "POST" && url.pathname === "/api/billing/credit-demo") {
    db.credit("demo_user", 1000, `demo-credit-${Date.now()}`);
    return json({ ok: true, wallet: db.getWallet("demo_user") });
  }

  if (request.method === "POST" && url.pathname === "/api/projects") {
    const body = (await request.json()) as {
      title: string;
      styleProfileId?: "cn_cyber_dark" | "cn_gothic_dark" | "cn_realistic_drama";
      contentLanguage?: "zh" | "en";
      sourceType: "paste" | "txt" | "md" | "url";
      sourceText?: string;
      sourceUri?: string;
    };
    const project = await service.createProject({
      userId: "demo_user",
      title: body.title,
      styleProfileId: body.styleProfileId ?? "cn_cyber_dark",
      contentLanguage: body.contentLanguage,
      sourceType: body.sourceType,
      sourceText: body.sourceText,
      sourceUri: body.sourceUri
    });
    return json(project);
  }

  if (request.method === "GET" && url.pathname === "/api/prompts/templates") {
    // 内部接口：仅允许服务间调用，前端不可直连
    const auth = request.headers.get("x-internal-api-key") ?? "";
    if (!env.INTERNAL_API_KEY || auth !== env.INTERNAL_API_KEY) {
      return json({ ok: false, error: "unauthorized" }, 401);
    }
    return json({ templates: listPromptTemplateIds() });
  }

  if (request.method === "POST" && url.pathname === "/api/prompts/render") {
    // 内部接口：渲染专家模板提示词（模板不下发前端）
    const auth = request.headers.get("x-internal-api-key") ?? "";
    if (!env.INTERNAL_API_KEY || auth !== env.INTERNAL_API_KEY) {
      return json({ ok: false, error: "unauthorized" }, 401);
    }
    if (!env.PROMPT_VAULT_SECRET) {
      return json({ ok: false, error: "prompt vault secret missing" }, 500);
    }

    // 防刷：每分钟最多 120 次提示词渲染请求
    const rl = checkRateLimit(`prompt:${auth}`, 120, 60_000);
    if (!rl.ok) {
      return json({ ok: false, error: "rate limited" }, 429);
    }

    // 防篡改：请求体必须带签名，服务端验签通过才执行
    const signature = request.headers.get("x-prompt-signature") ?? "";
    const payload = await request.text();
    if (!verifyPayloadSignature(payload, signature, env.PROMPT_VAULT_SECRET)) {
      return json({ ok: false, error: "invalid signature" }, 400);
    }

    const body = JSON.parse(payload) as {
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
    };
    // 返回结果附带指纹，便于泄露追踪
    const rendered = renderPromptSecure(
      { templateId: body.templateId, context: body.context, caller: body.caller ?? "worker" },
      env.PROMPT_VAULT_SECRET
    );
    return json({ ok: true, ...rendered });
  }

  if (request.method === "POST" && url.pathname.startsWith("/api/projects/") && url.pathname.endsWith("/storyboard")) {
    const projectId = url.pathname.split("/")[3];
    const body = (await request.json()) as { rawScript: string; mode: "preserve" | "balanced" | "dramatic" };
    const storyboard = await service.rewriteAndStoryboard({
      projectId,
      rawScript: body.rawScript,
      mode: body.mode
    });
    return json(storyboard);
  }

  if (request.method === "POST" && url.pathname.startsWith("/api/projects/") && url.pathname.endsWith("/render")) {
    const projectId = url.pathname.split("/")[3];
    const body = (await request.json()) as {
      actorId: string;
      estimatedPoints: number;
      // 平台适配参数：不传则走 generic（不绑定单平台）
      providerId?: "generic" | "doubao" | "keling" | "runway";
    };
    const result = await service.startRender({
      userId: "demo_user",
      projectId,
      actorId: body.actorId,
      estimatedPoints: body.estimatedPoints,
      providerId: body.providerId
    });
    return json(result);
  }

  if (request.method === "GET" && url.pathname.startsWith("/api/jobs/")) {
    const jobId = url.pathname.split("/")[3];
    return json(service.getJob(jobId));
  }

  if (request.method === "POST" && url.pathname === "/api/billing/webhook/stripe") {
    const payload = await request.text();
    const signature = request.headers.get("stripe-signature") ?? "";
    const secret = env.STRIPE_WEBHOOK_SECRET ?? "";
    if (!secret) {
      return json({ ok: false, error: "missing stripe secret" }, 500);
    }

    const ok = verifyStripeSignature({
      payload,
      stripeSignatureHeader: signature,
      endpointSecret: secret
    });

    if (!ok) {
      return json({ ok: false, error: "invalid signature" }, 400);
    }

    return json({ ok: true });
  }

  return json({ ok: false, error: "not found" }, 404);
}
