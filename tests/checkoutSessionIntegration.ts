import assert from "node:assert/strict";
import { createCheckoutWithFailover } from "../src/billing/checkoutSession";

async function run(): Promise<void> {
  let calls: string[] = [];

  const mockFetch: typeof fetch = (async (input: RequestInfo | URL): Promise<Response> => {
    const url = String(input);
    calls.push(url);

    if (url.includes("api.stripe.com")) {
      return new Response(JSON.stringify({ id: "cs_test", url: "https://checkout.stripe.test/cs_test" }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }

    if (url.includes("api.creem.io")) {
      return new Response(JSON.stringify({ id: "cr_1", checkout_url: "https://checkout.creem.test/cr_1" }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }

    if (url.includes("dodopayments.com")) {
      return new Response(JSON.stringify({ session_id: "dd_1", checkout_url: "https://checkout.dodo.test/dd_1" }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }

    return new Response("not found", { status: 404 });
  }) as typeof fetch;

  const env = {
    BILLING_STRIPE_ENABLED: "TRUE",
    BILLING_CREEM_ENABLED: "TRUE",
    BILLING_DODO_ENABLED: "TRUE",
    BILLING_PROVIDER_PRIORITY: "stripe,creem,dodo",
    BILLING_PRODUCT_MAP_JSON: JSON.stringify({
      points_small: {
        stripePriceId: "price_123",
        creemProductId: "creem_prod_123",
        dodoProductId: "dodo_prod_123"
      }
    }),
    STRIPE_SECRET_KEY: "sk_test",
    CREEM_API_KEY: "creem_key",
    DODO_PAYMENTS_API_KEY: "dodo_key"
  };

  const r1 = await createCheckoutWithFailover(env, { pointsPackageId: "points_small" }, mockFetch);
  assert.equal(r1.provider, "stripe");
  assert.ok(r1.checkoutUrl.includes("stripe"));

  calls = [];
  const envNoStripe = { ...env, BILLING_STRIPE_ENABLED: "FALSE", BILLING_PROVIDER_PRIORITY: "creem,dodo,stripe" };
  const r2 = await createCheckoutWithFailover(envNoStripe, { pointsPackageId: "points_small" }, mockFetch);
  assert.equal(r2.provider, "creem");
  assert.ok(r2.checkoutUrl.includes("creem"));

  console.log("Checkout session provider integration test passed.");
}

void run();
