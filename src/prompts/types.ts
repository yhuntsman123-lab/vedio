export interface PromptContext {
  styleProfileId: "cn_cyber_dark" | "cn_gothic_dark" | "cn_realistic_drama";
  projectTitle: string;
  characterName?: string;
  characterDescription?: string;
  rawScript?: string;
  sceneText?: string;
  shotText?: string;
  extra?: Record<string, string>;
}

export interface PromptTemplate {
  id: string;
  name: string;
  purpose: "three_view" | "storyboard" | "scene_extract" | "rewrite" | "voiceover";
  body: string;
  requiredVars: string[];
}
