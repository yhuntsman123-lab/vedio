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
  assertSafePublicUrl(url);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`failed to fetch url: ${res.status}`);
  }
  return res.text();
}

function assertSafePublicUrl(rawUrl: string): void {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    throw new Error("invalid URL");
  }

  if (u.protocol !== "https:") {
    throw new Error("only https URLs are allowed");
  }

  const host = u.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local")) {
    throw new Error("localhost/local domains are not allowed");
  }

  // Block common metadata and private endpoints to reduce SSRF risk.
  const blockedHosts = new Set([
    "169.254.169.254",
    "metadata.google.internal",
    "100.100.100.200"
  ]);
  if (blockedHosts.has(host)) {
    throw new Error("metadata endpoints are not allowed");
  }

  if (isPrivateIp(host)) {
    throw new Error("private IP addresses are not allowed");
  }
}

function isPrivateIp(host: string): boolean {
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) {
    return false;
  }
  const nums = m.slice(1).map(Number);
  if (nums.some((x) => x < 0 || x > 255)) return false;
  const [a, b] = nums;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 169 && b === 254) return true;
  return false;
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
