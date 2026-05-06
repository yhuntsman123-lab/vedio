import assert from "node:assert/strict";
import { getProviderCapabilities, splitShotByCapabilities } from "../src/providers/capabilities";

const doubao = getProviderCapabilities("doubao");
assert.equal(doubao.maxClipDurationSec, 9);

const s1 = splitShotByCapabilities("shot1", 8, doubao);
assert.equal(s1.length, 1);
assert.equal(s1[0].durationSec, 8);

const s2 = splitShotByCapabilities("shot2", 20, doubao);
assert.equal(s2.length, 3);
assert.equal(s2[0].durationSec, 9);
assert.equal(s2[1].durationSec, 9);
assert.equal(s2[2].durationSec, 2);
assert.equal(Number((s2[0].durationSec + s2[1].durationSec + s2[2].durationSec).toFixed(3)), 20);

console.log("Provider capability segmentation test passed.");
