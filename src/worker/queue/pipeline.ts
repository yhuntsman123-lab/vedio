import { toRenderMessages } from "../../queue/renderMessage";
import type { StoryboardResult } from "../../shared/types";
import { getProviderCapabilities, splitShotByCapabilities, type ProviderId } from "../../providers/capabilities";
import { InMemoryD1 } from "../db/inMemoryD1";

export interface PipelineResult {
  outputR2Key: string;
  actualPoints: number;
  renderCount: number;
  segmentCount: number;
}

export async function runJobPipeline(db: InMemoryD1, args: {
  jobId: string;
  projectId: string;
  userId: string;
  actorId: string;
  storyboard: StoryboardResult;
  providerId?: ProviderId;
}): Promise<PipelineResult> {
  db.updateJobStatus(args.jobId, "SCRIPTED");
  const caps = getProviderCapabilities(args.providerId ?? "generic");

  const renderMessages = toRenderMessages(
    args.jobId,
    args.projectId,
    args.userId,
    args.actorId,
    args.storyboard.shots
  );
  const segments = renderMessages.flatMap((m) => splitShotByCapabilities(m.shotId, m.durationSec, caps));

  db.updateJobStatus(args.jobId, "RENDERING");
  const rendered = await Promise.all(renderMessages.map(simulateRenderWithFallback));

  db.updateJobStatus(args.jobId, "TTS_DONE");
  await Promise.all(rendered.map(simulateTts));

  db.updateJobStatus(args.jobId, "COMPOSITING");

  const outputR2Key = `outputs/${args.projectId}/${args.jobId}/final.mp4`;
  const totalDuration = args.storyboard.shots.reduce((sum, s) => sum + s.durationSec, 0);
  const actualPoints = estimateActualPoints(args.storyboard.shots.length, totalDuration);

  db.updateJobStatus(args.jobId, "SUCCEEDED", outputR2Key);

  return {
    outputR2Key,
    actualPoints,
    renderCount: renderMessages.length,
    segmentCount: segments.length
  };
}

function estimateActualPoints(shots: number, totalDurationSec: number): number {
  return Math.ceil(shots * 8 + totalDurationSec * 1.2);
}

async function simulateRender(msg: {
  shotId: string;
  promptEn: string;
  semanticCheckScore: number;
  durationSec: number;
}): Promise<{ shotId: string; image: string; durationSec: number }> {
  if (msg.semanticCheckScore < 0.9) {
    throw new Error(`semantic guard failed for ${msg.shotId}`);
  }
  if (!msg.promptEn.trim()) {
    throw new Error("empty promptEn");
  }
  return {
    shotId: msg.shotId,
    image: `r2://renders/${msg.shotId}.png`,
    durationSec: msg.durationSec
  };
}

async function simulateRenderWithFallback(msg: {
  shotId: string;
  promptEn: string;
  semanticCheckScore: number;
  durationSec: number;
}): Promise<{ shotId: string; image: string; durationSec: number }> {
  try {
    return await simulateRender(msg);
  } catch (err) {
    console.error("simulateRender failed, fallback used", err);
    return {
      shotId: msg.shotId,
      image: `r2://renders/fallback_${msg.shotId}.png`,
      durationSec: msg.durationSec
    };
  }
}

async function simulateTts(input: {
  shotId: string;
  image: string;
  durationSec: number;
}): Promise<{ shotId: string; image: string; audio: string; durationSec: number }> {
  return {
    shotId: input.shotId,
    image: input.image,
    audio: `r2://audio/${input.shotId}.wav`,
    durationSec: input.durationSec
  };
}
