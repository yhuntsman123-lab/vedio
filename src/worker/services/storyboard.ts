import type { SemanticCheckResult, StoryboardResult, StoryboardShot } from "../../shared/types";
import { callLlmWithFallback } from "./llmRouter";
import type { StyleProfileId } from "../../shared/styleProfiles";
import { STYLE_PROFILES, enforceStylePrompt } from "../../shared/styleProfiles";
import { selectSceneVariant } from "../../shared/sceneMasters";
import { detectLanguage } from "../../shared/i18n";

export async function rewriteToStoryboard(
  rawScript: string,
  mode: "preserve" | "balanced" | "dramatic",
  styleId: StyleProfileId
): Promise<StoryboardResult> {
  const system = "You are an expert screenplay adapter. Output JSON only.";
  const user = `Mode: ${mode}\nInput:\n${rawScript}`;
  const rewritten = await callLlmWithFallback({ system, user, task: "rewrite" });
  const detectedLanguage = detectLanguage(rawScript);

  const parsed = JSON.parse(rewritten.text) as Omit<StoryboardResult, "shots" | "language"> & {
    language?: "zh" | "en";
    shots: Array<Omit<StoryboardShot, "promptSource" | "promptEn" | "semanticCheckScore">>;
  };

  const shots: StoryboardShot[] = [];
  for (const s of parsed.shots) {
    const sceneVariant = selectSceneVariant(s.scene, s.mood);
    const promptSource = buildPromptSource({ ...s, sceneVariantKey: sceneVariant.key });
    const promptEn = await buildBestPrompt(promptSource, styleId, parsed.language ?? detectedLanguage);
    const semantic = await semanticCheck(promptSource, promptEn);

    shots.push({
      ...s,
      sceneVariantKey: sceneVariant.key,
      promptSource,
      promptEn,
      semanticCheckScore: semantic.semanticCheckScore
    });
  }

  return {
    title: parsed.title,
    synopsis: parsed.synopsis,
    language: parsed.language ?? detectedLanguage,
    characters: parsed.characters,
    shots
  };
}

function buildPromptSource(shot: Omit<StoryboardShot, "promptSource" | "promptEn" | "semanticCheckScore">): string {
  return [
    `scene: ${shot.scene}`,
    `scene_variant: ${shot.sceneVariantKey}`,
    `action: ${shot.action}`,
    `mood: ${shot.mood}`,
    `camera: ${shot.camera}`,
    `purpose: ${shot.shotPurpose}`,
    `outfit_state: ${shot.outfitState}`
  ].join("; ");
}

async function translatePrompt(
  promptSource: string,
  styleId: StyleProfileId,
  sourceLanguage: "zh" | "en",
  variant: "A" | "B"
): Promise<string> {
  const stylePrefix = STYLE_PROFILES[styleId].stylePrefix;
  const system = "Translate source shot text into one-line English image prompt. Keep semantics identical.";
  const user = `style_prefix: ${stylePrefix}\nsource_language: ${sourceLanguage}\nvariant: ${variant}\nsource: ${promptSource}`;
  const result = await callLlmWithFallback({ system, user, task: "translate" });
  return result.text.trim();
}

async function buildBestPrompt(promptSource: string, styleId: StyleProfileId, sourceLanguage: "zh" | "en"): Promise<string> {
  const candidateA = await translatePrompt(promptSource, styleId, sourceLanguage, "A");
  const candidateB = await translatePrompt(promptSource, styleId, sourceLanguage, "B");
  enforceStylePrompt(styleId, candidateA);
  enforceStylePrompt(styleId, candidateB);

  const scoreA = await semanticCheck(promptSource, candidateA);
  const scoreB = await semanticCheck(promptSource, candidateB);
  return scoreA.semanticCheckScore >= scoreB.semanticCheckScore ? candidateA : candidateB;
}

async function semanticCheck(promptSource: string, promptEn: string): Promise<SemanticCheckResult> {
  const system = "Check semantic fidelity and return JSON only.";
  const user = `source: ${promptSource}\nenglish_prompt: ${promptEn}`;
  const result = await callLlmWithFallback({ system, user, task: "semantic-check" });
  const parsed = JSON.parse(result.text) as SemanticCheckResult;
  if (!parsed.pass || parsed.semanticCheckScore < 0.9) {
    // A single auto-rewrite attempt keeps costs bounded.
    const retryEn = promptEn;
    const retryResult = await callLlmWithFallback({
      system,
      user: `source: ${promptSource}\nenglish_prompt: ${retryEn}`,
      task: "semantic-check"
    });
    return JSON.parse(retryResult.text) as SemanticCheckResult;
  }
  return parsed;
}
