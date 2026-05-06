export type ContentLanguage = "zh" | "en";

/**
 * 简单语言推断：包含大量 CJK 字符则判定中文，否则英文。
 */
export function detectLanguage(text: string): ContentLanguage {
  const cjkCount = (text.match(/[\u4e00-\u9fff]/g) ?? []).length;
  return cjkCount >= Math.max(4, Math.floor(text.length * 0.15)) ? "zh" : "en";
}

/**
 * 字幕统一按 UTF-8 处理，天然支持中文、英文与字母数字。
 */
export const SUBTITLE_ENCODING = "utf-8";
