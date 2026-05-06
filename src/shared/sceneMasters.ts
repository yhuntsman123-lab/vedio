export interface SceneVariant {
  key: string;
  lighting: string;
  weather: string;
  mood: string;
}

export interface SceneMaster {
  sceneId: string;
  baseEnvironment: string;
  materials: string[];
  variants: SceneVariant[];
}

export const SCENE_MASTERS: SceneMaster[] = [
  {
    sceneId: "neon_core_tower",
    baseEnvironment: "cyber tower interior",
    materials: ["wet metal", "holographic glass", "aged concrete"],
    variants: [
      { key: "night_alert", lighting: "blue neon with red warning strips", weather: "indoor mist", mood: "tense" },
      { key: "night_stealth", lighting: "low cyan practical lights", weather: "indoor dry", mood: "silent" }
    ]
  }
];

export function selectSceneVariant(sceneText: string, mood: string): SceneVariant {
  const master = SCENE_MASTERS[0];
  if (sceneText.toLowerCase().includes("潜入") || mood.includes("tense") || mood.includes("紧张")) {
    return master.variants.find((v) => v.key === "night_stealth") ?? master.variants[0];
  }
  return master.variants[0];
}
