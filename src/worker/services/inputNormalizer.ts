export interface NormalizedInput {
  sourceType: "paste" | "txt" | "md" | "url";
  sourceText: string;
  sourceUri?: string;
}

export async function normalizeInput(input: {
  sourceType: "paste" | "txt" | "md" | "url";
  sourceText?: string;
  sourceUri?: string;
}): Promise<NormalizedInput> {
  if (input.sourceType === "url") {
    if (!input.sourceUri) {
      throw new Error("sourceUri required for url input");
    }
    const html = await fetchText(input.sourceUri);
    const text = extractMainText(html);
    return { sourceType: "url", sourceUri: input.sourceUri, sourceText: text };
  }

  const sourceText = (input.sourceText ?? "").trim();
  if (!sourceText) {
    throw new Error("sourceText is empty");
  }
  return { sourceType: input.sourceType, sourceText };
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`failed to fetch url: ${res.status}`);
  }
  return res.text();
}

function extractMainText(html: string): string {
  // Lightweight extraction fallback for MVP. Replace with trafilatura/readability service in prod.
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return stripped.slice(0, 30000);
}
