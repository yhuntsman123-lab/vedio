export type RewriteMode = "preserve" | "balanced" | "dramatic";
export type ContentLanguage = "zh" | "en";

export type OutfitState = "normal" | "stealth" | "battle" | "damaged";

export interface StoryboardShot {
  shotId: string;
  durationSec: number;
  scene: string;
  sceneVariantKey: string;
  action: string;
  shotPurpose: "narrative" | "emotion" | "information";
  dialogue?: string;
  narration?: string;
  mood: string;
  camera: string;
  outfitState: OutfitState;
  promptSource: string;
  promptEn: string;
  semanticCheckScore: number;
}

export interface StoryboardResult {
  title: string;
  synopsis: string;
  language: ContentLanguage;
  characters: string[];
  shots: StoryboardShot[];
}

export interface SemanticCheckResult {
  semanticCheckScore: number;
  driftItems: string[];
  pass: boolean;
}

export interface LlmProviderResponse {
  text: string;
  provider: "gemini" | "cloudflare" | "deepseek";
}
