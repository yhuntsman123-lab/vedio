export type StyleProfileId = "cn_cyber_dark" | "cn_gothic_dark" | "cn_realistic_drama";

export interface StyleProfile {
  id: StyleProfileId;
  // 中文展示名（给运营/产品后台使用）
  displayName: string;
  // 风格前缀（系统自动拼到绘图提示词）
  stylePrefix: string;
  // 建议关键词（用于引导模型聚焦风格）
  allowedKeywords: string[];
  // 禁止关键词（防止一部剧混入其他画风）
  blockedKeywords: string[];
}

export const STYLE_PROFILES: Record<StyleProfileId, StyleProfile> = {
  cn_cyber_dark: {
    id: "cn_cyber_dark",
    displayName: "暗黑国风赛博",
    stylePrefix: "dark epic, cyberpunk neon cyan lighting, dark guofeng, cinematic volumetric lighting, high contrast, ultra detailed",
    allowedKeywords: ["cyberpunk", "neon", "guofeng", "cinematic"],
    blockedKeywords: ["pixar", "ghibli", "chibi", "q-version", "cartoon toy"]
  },
  cn_gothic_dark: {
    id: "cn_gothic_dark",
    displayName: "暗黑哥特国风",
    stylePrefix: "dark gothic chinese aesthetic, misty atmosphere, cinematic contrast, detailed texture",
    allowedKeywords: ["gothic", "dark", "mist", "cinematic"],
    blockedKeywords: ["pixar", "ghibli", "chibi", "cute"]
  },
  cn_realistic_drama: {
    id: "cn_realistic_drama",
    displayName: "写实电影国漫",
    stylePrefix: "realistic cinematic chinese comic style, high fidelity texture, dramatic lighting",
    allowedKeywords: ["realistic", "cinematic", "texture"],
    blockedKeywords: ["pixar", "chibi", "toy"]
  }
};

export function enforceStylePrompt(styleId: StyleProfileId, promptEn: string): void {
  // 风格锁：命中禁词即拦截，避免“动漫+仿真”混风
  const p = promptEn.toLowerCase();
  const profile = STYLE_PROFILES[styleId];
  for (const blocked of profile.blockedKeywords) {
    if (p.includes(blocked)) {
      throw new Error(`style lock violation: contains blocked keyword '${blocked}'`);
    }
  }
}
