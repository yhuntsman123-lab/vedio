import { buildPrompt, listTemplates } from "../builder";
import type { PromptContext } from "../types";
import { templateFingerprint } from "../../security/signing";

export interface PromptRenderRequest {
  // 模板ID：例如 three_view_expert_v1
  templateId: string;
  // 模板变量上下文（角色、人设、文案等）
  context: PromptContext;
  // 调用来源（仅内部服务允许）
  caller: string;
}

export interface PromptRenderResponse {
  prompt: string;
  templateId: string;
  fingerprint: string;
  generatedAt: string;
}

const ALLOWED_CALLERS = new Set(["worker", "pipeline", "admin"]);

export function renderPromptSecure(req: PromptRenderRequest, secret: string): PromptRenderResponse {
  // 防盗：非白名单调用者直接拒绝
  if (!ALLOWED_CALLERS.has(req.caller)) {
    throw new Error("caller not allowed to access prompt vault");
  }

  // 真正的模板渲染发生在服务端，前端不持有模板原文
  const prompt = buildPrompt(req.templateId, req.context);
  // 指纹用于泄露溯源（同模板同前缀内容可追踪）
  const fingerprint = templateFingerprint(req.templateId, prompt, secret);

  return {
    prompt,
    templateId: req.templateId,
    fingerprint,
    generatedAt: new Date().toISOString()
  };
}

export function listPromptTemplateIds(): string[] {
  return listTemplates().map((t) => t.id);
}
