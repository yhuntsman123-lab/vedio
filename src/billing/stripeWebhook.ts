import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyStripeSignature(params: {
  payload: string;
  stripeSignatureHeader: string;
  endpointSecret: string;
}): boolean {
  const { payload, stripeSignatureHeader, endpointSecret } = params;
  const parts = Object.fromEntries(
    stripeSignatureHeader.split(",").map((x) => {
      const [k, v] = x.split("=");
      return [k, v];
    })
  );

  const timestamp = parts.t;
  const signatures = (parts.v1 ?? "").split(";").filter(Boolean);
  if (!timestamp || signatures.length === 0) {
    return false;
  }

  const signedPayload = `${timestamp}.${payload}`;
  const expected = createHmac("sha256", endpointSecret).update(signedPayload).digest("hex");

  for (const sig of signatures) {
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(sig, "utf8");
    if (a.length === b.length && timingSafeEqual(a, b)) {
      return true;
    }
  }

  return false;
}
