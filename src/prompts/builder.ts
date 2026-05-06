import type { PromptContext, PromptTemplate } from "./types";
import { THREE_VIEW_EXPERT_TEMPLATE } from "./templates/threeViewExpert";
import { STORYBOARD_EXPERT_TEMPLATE } from "./templates/storyboardExpert";
import { SCENE_EXTRACT_EXPERT_TEMPLATE } from "./templates/sceneExtractExpert";

const TEMPLATES: Record<string, PromptTemplate> = {
  [THREE_VIEW_EXPERT_TEMPLATE.id]: THREE_VIEW_EXPERT_TEMPLATE,
  [STORYBOARD_EXPERT_TEMPLATE.id]: STORYBOARD_EXPERT_TEMPLATE,
  [SCENE_EXTRACT_EXPERT_TEMPLATE.id]: SCENE_EXTRACT_EXPERT_TEMPLATE
};

function getVars(ctx: PromptContext): Record<string, string> {
  return {
    styleProfileId: ctx.styleProfileId,
    projectTitle: ctx.projectTitle,
    characterName: ctx.characterName ?? "",
    characterDescription: ctx.characterDescription ?? "",
    rawScript: ctx.rawScript ?? "",
    sceneText: ctx.sceneText ?? "",
    shotText: ctx.shotText ?? "",
    ...(ctx.extra ?? {})
  };
}

export function buildPrompt(templateId: string, ctx: PromptContext): string {
  const template = TEMPLATES[templateId];
  if (!template) {
    throw new Error(`template not found: ${templateId}`);
  }

  const vars = getVars(ctx);
  for (const key of template.requiredVars) {
    if (!vars[key]?.trim()) {
      throw new Error(`missing required var '${key}' for template '${templateId}'`);
    }
  }

  return template.body.replace(/\{\{(.*?)\}\}/g, (_, k: string) => vars[k.trim()] ?? "");
}

export function listTemplates(): PromptTemplate[] {
  return Object.values(TEMPLATES);
}
