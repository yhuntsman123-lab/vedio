import type { LlmProviderResponse } from "../../shared/types";

export interface LlmRouterInput {
  system: string;
  user: string;
  task: "rewrite" | "translate" | "semantic-check";
}

/**
 * Frozen routing priority:
 * 1) Gemini
 * 2) Cloudflare Workers AI free model
 * 3) DeepSeek
 */
export async function callLlmWithFallback(input: LlmRouterInput): Promise<LlmProviderResponse> {
  const providers: Array<"gemini" | "cloudflare" | "deepseek"> = ["gemini", "cloudflare", "deepseek"];
  let lastError: unknown = null;

  for (const provider of providers) {
    try {
      const text = await mockCall(provider, input);
      return { text, provider };
    } catch (err) {
      lastError = err;
    }
  }

  throw new Error(`All LLM providers failed: ${String(lastError)}`);
}

async function mockCall(provider: "gemini" | "cloudflare" | "deepseek", input: LlmRouterInput): Promise<string> {
  // TODO: wire real provider SDK/API calls in next step.
  if (!input.user.trim()) {
    throw new Error("Empty user prompt");
  }

  if (input.task === "semantic-check") {
    return JSON.stringify({ semanticCheckScore: 0.95, driftItems: [], pass: true });
  }

  if (input.task === "translate") {
    return "dark epic, cyberpunk neon cyan lighting, cinematic close-up, same character identity, stealth outfit";
  }

  return JSON.stringify({
    title: "Auto Storyboard",
    synopsis: "Generated storyboard synopsis.",
    language: "en",
    characters: ["Lead"],
    shots: [
      {
        shotId: "s1",
        durationSec: 4,
        scene: "Rooftop night",
        sceneVariantKey: "night_stealth",
        action: "Lead looks down at neon streets",
        narration: "Night breathes beneath the city",
        mood: "tense",
        camera: "close-up push-in",
        shotPurpose: "narrative",
        outfitState: "stealth"
      }
    ]
  });
}
