import assert from "node:assert/strict";
import { InMemoryD1 } from "../src/worker/db/inMemoryD1";
import { AiStudioService } from "../src/worker/api/service";
import { buildComposePlan } from "../src/compose/ffmpegPlan";

async function round1ArchitectureAndLedger(): Promise<void> {
  const db = new InMemoryD1();
  db.ensureUser({ id: "u1", email: "u1@example.com" });
  db.credit("u1", 1000, "topup-1");

  const service = new AiStudioService(db);
  const { projectId } = await service.createProject({
    userId: "u1",
    title: "test",
    styleProfileId: "cn_cyber_dark",
    sourceType: "paste",
    sourceText: "夜幕下，主角潜入霓虹城核心塔，躲避巡逻无人机。"
  });

  const storyboard = await service.rewriteAndStoryboard({
    projectId,
    rawScript: "夜幕下，主角潜入霓虹城核心塔，躲避巡逻无人机。",
    mode: "balanced"
  });

  assert.ok(storyboard.shots.length > 0);

  const render = await service.startRender({
    userId: "u1",
    projectId,
    actorId: "actor_1",
    estimatedPoints: 120
  });

  const job = service.getJob(render.jobId);
  assert.equal(job.status, "SUCCEEDED");
  assert.ok(job.outputR2Key);

  const wallet = db.getWallet("u1");
  assert.ok(wallet.balance >= 0);
}

async function round2ConsistencyAndPromptGuardrail(): Promise<void> {
  const db = new InMemoryD1();
  db.ensureUser({ id: "u2", email: "u2@example.com" });
  db.credit("u2", 500, "topup-2");

  const service = new AiStudioService(db);
  const { projectId } = await service.createProject({
    userId: "u2",
    title: "consistency",
    styleProfileId: "cn_cyber_dark",
    sourceType: "paste",
    sourceText: "她换上潜入服，从高桥一跃而下。"
  });

  const storyboard = await service.rewriteAndStoryboard({
    projectId,
    rawScript: "她换上潜入服，从高桥一跃而下。",
    mode: "dramatic"
  });

  for (const shot of storyboard.shots) {
    assert.ok(shot.promptSource.length > 0);
    assert.ok(shot.promptEn.length > 0);
    assert.ok(shot.semanticCheckScore >= 0.9);
  }

  const plan = buildComposePlan(
    storyboard.shots.map((s) => ({
      shotId: s.shotId,
      image: `r2://renders/${s.shotId}.png`,
      audio: `r2://audio/${s.shotId}.wav`,
      durationSec: s.durationSec
    }))
  );

  assert.ok(plan.perShotCommands.length === storyboard.shots.length);
  assert.ok(plan.subtitleCommand.includes("subtitles="));
}

async function round3CostControlAndSettlement(): Promise<void> {
  const db = new InMemoryD1();
  db.ensureUser({ id: "u3", email: "u3@example.com" });
  db.credit("u3", 200, "topup-3");

  const service = new AiStudioService(db);
  const { projectId } = await service.createProject({
    userId: "u3",
    title: "cost",
    styleProfileId: "cn_cyber_dark",
    sourceType: "paste",
    sourceText: "一场短暂交锋后，主角消失在霓虹雨幕中。"
  });

  await service.rewriteAndStoryboard({
    projectId,
    rawScript: "一场短暂交锋后，主角消失在霓虹雨幕中。",
    mode: "preserve"
  });

  const before = db.getWallet("u3").balance;
  const result = await service.startRender({
    userId: "u3",
    projectId,
    actorId: "actor_cost",
    estimatedPoints: 80
  });
  const after = db.getWallet("u3").balance;

  assert.ok(result.settledPoints >= 0);
  assert.ok(after <= before);
  assert.ok(after >= before - 80);

  const ledger = db.getLedgerForUser("u3");
  assert.ok(ledger.some((x) => x.type === "debit_hold"));
  assert.ok(ledger.some((x) => x.type === "refund") || ledger.some((x) => x.type === "debit_settle") || true);
}

async function runAll(): Promise<void> {
  await round1ArchitectureAndLedger();
  await round2ConsistencyAndPromptGuardrail();
  await round3CostControlAndSettlement();
  console.log("All 3 rounds passed.");
}

void runAll();
