import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { verifyStripeSignature } from "../src/billing/stripeWebhook";
import { buildComposePlan } from "../src/compose/ffmpegPlan";
import { InMemoryD1 } from "../src/worker/db/inMemoryD1";
import { AiStudioService } from "../src/worker/api/service";
import { handleRenderQueueMessage } from "../src/worker/queue/consumer";

async function round1ArchitectureTech(): Promise<void> {
  const db = new InMemoryD1();
  db.ensureUser({ id: "arch", email: "arch@demo" });
  db.credit("arch", 1000, "arch-topup");

  const service = new AiStudioService(db);
  const { projectId } = await service.createProject({
    userId: "arch",
    title: "Arch test",
    styleProfileId: "cn_cyber_dark",
    sourceType: "paste",
    sourceText: "主角在塔顶对峙，风暴来临。"
  });

  const sb = await service.rewriteAndStoryboard({ projectId, rawScript: "主角在塔顶对峙，风暴来临。", mode: "balanced" });
  const started = await service.startRender({ userId: "arch", projectId, actorId: "actor_arch", estimatedPoints: 120 });
  const job = service.getJob(started.jobId);

  assert.equal(job.status, "SUCCEEDED");
  assert.ok(sb.shots.every((s) => s.semanticCheckScore >= 0.9));
}

async function round2CinematicQuality(): Promise<void> {
  const plan = buildComposePlan([
    { shotId: "s1", image: "a.png", audio: "a.wav", durationSec: 3.4 },
    { shotId: "s2", image: "b.png", audio: "b.wav", durationSec: 3.8 }
  ]);

  assert.equal(plan.perShotCommands.length, 2);
  assert.equal(plan.transitionCommands.length, 1);
  assert.ok(plan.transitionCommands[0].includes("xfade"));
  assert.ok(plan.subtitleCommand.includes("subtitles="));
}

async function round3SecurityCostOps(): Promise<void> {
  const payload = JSON.stringify({ id: "evt_1", type: "checkout.session.completed" });
  const t = Math.floor(Date.now() / 1000).toString();
  const secret = "whsec_test";
  const signedPayload = `${t}.${payload}`;
  const v1 = createHmac("sha256", secret).update(signedPayload).digest("hex");
  const header = `t=${t},v1=${v1}`;

  assert.equal(
    verifyStripeSignature({ payload, stripeSignatureHeader: header, endpointSecret: secret }),
    true
  );

  let queueConfigFailed = false;
  try {
    await handleRenderQueueMessage(
      {},
      { jobId: "j", projectId: "p", actorId: "a", shots: [{ shotId: "s", promptEn: "ok", promptSource: "源", semanticCheckScore: 0.95, durationSec: 3, seed: 1 }] }
    );
  } catch {
    queueConfigFailed = true;
  }
  assert.equal(queueConfigFailed, true);
}

async function main(): Promise<void> {
  await round1ArchitectureTech();
  await round2CinematicQuality();
  await round3SecurityCostOps();
  console.log("Full project expert 3-round test passed.");
}

void main();
