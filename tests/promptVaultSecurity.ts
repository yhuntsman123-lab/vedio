import assert from "node:assert/strict";
import { signPayload, verifyPayloadSignature } from "../src/security/signing";
import { renderPromptSecure } from "../src/prompts/vault/service";

const secret = "vault-secret";
const payload = JSON.stringify({ templateId: "three_view_expert_v1" });
const sig = signPayload(payload, secret);
assert.equal(verifyPayloadSignature(payload, sig, secret), true);
assert.equal(verifyPayloadSignature(payload, "bad", secret), false);

const rendered = renderPromptSecure(
  {
    templateId: "three_view_expert_v1",
    caller: "worker",
    context: {
      styleProfileId: "cn_cyber_dark",
      projectTitle: "P",
      characterName: "程平安",
      characterDescription: "26岁女性，黑发，深棕瞳，黑色机能服。"
    }
  },
  secret
);

assert.ok(rendered.prompt.includes("角色设定板"));
assert.ok(rendered.fingerprint.length === 16);

let blocked = false;
try {
  renderPromptSecure(
    {
      templateId: "three_view_expert_v1",
      caller: "guest",
      context: {
        styleProfileId: "cn_cyber_dark",
        projectTitle: "P",
        characterName: "程平安",
        characterDescription: "x"
      }
    },
    secret
  );
} catch {
  blocked = true;
}
assert.equal(blocked, true);

console.log("Prompt vault security test passed.");
