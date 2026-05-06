import { triggerModalRender } from "../../integrations/modal";
import { triggerCloudRunCompose } from "../../integrations/cloudRunComposer";

export interface QueueEnv {
  MODAL_ENDPOINT?: string;
  MODAL_TOKEN?: string;
  CLOUD_RUN_COMPOSER_URL?: string;
  CLOUD_RUN_ID_TOKEN?: string;
}

export async function handleRenderQueueMessage(env: QueueEnv, msg: {
  jobId: string;
  projectId: string;
  actorId: string;
  shots: Array<{ shotId: string; promptEn: string; promptSource: string; semanticCheckScore: number; durationSec: number; seed: number }>;
}): Promise<{ outputR2Key: string }> {
  if (!env.MODAL_ENDPOINT || !env.MODAL_TOKEN || !env.CLOUD_RUN_COMPOSER_URL || !env.CLOUD_RUN_ID_TOKEN) {
    throw new Error("missing queue env configuration");
  }

  const shotAssets: Array<{ shotId: string; imageR2Key: string; audioR2Key: string; durationSec: number }> = [];

  for (const shot of msg.shots) {
    const rendered = await triggerModalRender(env.MODAL_ENDPOINT, env.MODAL_TOKEN, {
      workflowName: "sdxl_instantid_ipadapter",
      promptEn: shot.promptEn,
      promptSource: shot.promptSource,
      semanticCheckScore: shot.semanticCheckScore,
      actorId: msg.actorId,
      shotId: shot.shotId,
      seed: shot.seed
    });

    shotAssets.push({
      shotId: shot.shotId,
      imageR2Key: rendered.imageR2Key,
      audioR2Key: `audio/${msg.projectId}/${shot.shotId}.wav`,
      durationSec: shot.durationSec
    });
  }

  const composed = await triggerCloudRunCompose(env.CLOUD_RUN_COMPOSER_URL, env.CLOUD_RUN_ID_TOKEN, {
    jobId: msg.jobId,
    projectId: msg.projectId,
    shotAssets
  });

  return { outputR2Key: composed.outputR2Key };
}
