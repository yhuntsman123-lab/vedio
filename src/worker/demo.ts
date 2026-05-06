import { InMemoryD1 } from "./db/inMemoryD1";
import { AiStudioService } from "./api/service";

async function main(): Promise<void> {
  const db = new InMemoryD1();
  db.ensureUser({ id: "user_demo", email: "demo@aistudio.dev" });
  db.credit("user_demo", 1000, "topup-demo");

  const service = new AiStudioService(db);

  const project = await service.createProject({
    userId: "user_demo",
    title: "Neon Infiltration",
    styleProfileId: "cn_cyber_dark",
    sourceType: "paste",
    sourceText: "夜幕低垂，主角潜入核心塔，在霓虹和警报中寻找失落芯片。"
  });

  const storyboard = await service.rewriteAndStoryboard({
    projectId: project.projectId,
    rawScript: "夜幕低垂，主角潜入核心塔，在霓虹和警报中寻找失落芯片。",
    mode: "balanced"
  });

  const started = await service.startRender({
    userId: "user_demo",
    projectId: project.projectId,
    actorId: "actor_neon_01",
    estimatedPoints: 160,
    providerId: "generic"
  });

  const job = service.getJob(started.jobId);

  console.log(
    JSON.stringify(
      {
        project,
        storyboardShots: storyboard.shots.length,
        renderResult: started,
        job,
        wallet: db.getWallet("user_demo")
      },
      null,
      2
    )
  );
}

void main();
