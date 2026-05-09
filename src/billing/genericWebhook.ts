import { createHmac, timingSafeEqual } from "node:crypto";

function safeEqualHex(aHex: string, bHex: string): boolean {
  const a = Buffer.from(aHex, "utf8");
  const b = Buffer.from(bHex, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

function sign(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Generic HMAC webhook verification for providers exposing `x-signature`.
 * If providers later publish stricter formats, we can replace this function safely.
 */
export function verifyGenericWebhookSignature(params: {
  payload: string;
  signatureHeader: string;
  endpointSecret: string;
}): boolean {
  const { payload, signatureHeader, endpointSecret } = params;
  if (!signatureHeader || !endpointSecret) {
    return false;
  }

  const normalized = signatureHeader.replace(/^sha256=/i, "").trim();
  const expected = sign(endpointSecret, payload);
  return safeEqualHex(expected, normalized);
}
