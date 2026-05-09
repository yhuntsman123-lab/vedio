import assert from "node:assert/strict";
import { buildBillingConfigs, parseProviderPriority, selectBillingProvider } from "../src/billing/providers";

const cfg = buildBillingConfigs({
  STRIPE_ENABLED: "TRUE",
  CREEM_ENABLED: "FALSE",
  DODO_ENABLED: "TRUE"
});

assert.equal(cfg.find((x) => x.provider === "stripe")?.enabled, true);
assert.equal(cfg.find((x) => x.provider === "creem")?.enabled, false);
assert.equal(cfg.find((x) => x.provider === "dodo")?.enabled, true);

const p = parseProviderPriority("creem,dodo,stripe");
assert.deepEqual(p.slice(0, 3), ["creem", "dodo", "stripe"]);

const selected1 = selectBillingProvider(
  {
    STRIPE_ENABLED: "TRUE",
    CREEM_ENABLED: "TRUE",
    DODO_ENABLED: "FALSE",
    PAYMENT_PROVIDER_ORDER: "creem,stripe,dodo"
  },
  undefined
);
assert.equal(selected1.provider, "creem");

const selected2 = selectBillingProvider(
  {
    STRIPE_ENABLED: "TRUE",
    CREEM_ENABLED: "TRUE",
    DODO_ENABLED: "FALSE",
    PAYMENT_PROVIDER_ORDER: "creem,stripe,dodo"
  },
  "stripe"
);
assert.equal(selected2.provider, "stripe");

let noEnabled = false;
try {
  selectBillingProvider({ STRIPE_ENABLED: "FALSE", CREEM_ENABLED: "FALSE", DODO_ENABLED: "FALSE" });
} catch {
  noEnabled = true;
}
assert.equal(noEnabled, true);

console.log("Billing provider failover test passed.");
