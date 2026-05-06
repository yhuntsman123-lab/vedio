import { createHmac, timingSafeEqual } from "node:crypto";

export function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function verifyPayloadSignature(payload: string, signature: string, secret: string): boolean {
  const expected = signPayload(payload, secret);
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function templateFingerprint(templateId: string, prompt: string, secret: string): string {
  const payload = `${templateId}:${prompt.slice(0, 200)}`;
  return signPayload(payload, secret).slice(0, 16);
}
