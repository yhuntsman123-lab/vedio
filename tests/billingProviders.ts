import assert from "node:assert/strict";
import { buildBillingConfigs, parseProviderPriority, selectBillingProvider } from "../src/billing/providers";

const cfg = buildBillingConfigs({
  BILLING_STRIPE_ENABLED: "TRUE",
  BILLING_CREEM_ENABLED: "FALSE",
  BILLING_DODO_ENABLED: "TRUE"
});

assert.equal(cfg.find((x) => x.provider === "stripe")?.enabled, true);
assert.equal(cfg.find((x) => x.provider === "creem")?.enabled, false);
assert.equal(cfg.find((x) => x.provider === "dodo")?.enabled, true);

const p = parseProviderPriority("creem,dodo,stripe");
assert.deepEqual(p.slice(0, 3), ["creem", "dodo", "stripe"]);

const selected1 = selectBillingProvider(
  {
    BILLING_STRIPE_ENABLED: "TRUE",
    BILLING_CREEM_ENABLED: "TRUE",
    BILLING_DODO_ENABLED: "FALSE",
    BILLING_PROVIDER_PRIORITY: "creem,stripe,dodo"
  },
  undefined
);
assert.equal(selected1.provider, "creem");

const selected2 = selectBillingProvider(
  {
    BILLING_STRIPE_ENABLED: "TRUE",
    BILLING_CREEM_ENABLED: "TRUE",
    BILLING_DODO_ENABLED: "FALSE",
    BILLING_PROVIDER_PRIORITY: "creem,stripe,dodo"
  },
  "stripe"
);
assert.equal(selected2.provider, "stripe");

let noEnabled = false;
try {
  selectBillingProvider({ BILLING_STRIPE_ENABLED: "FALSE", BILLING_CREEM_ENABLED: "FALSE", BILLING_DODO_ENABLED: "FALSE" });
} catch {
  noEnabled = true;
}
assert.equal(noEnabled, true);

console.log("Billing provider failover test passed.");
