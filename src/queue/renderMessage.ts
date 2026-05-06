import type { StoryboardShot } from "../shared/types";

export interface RenderQueueMessage {
  jobId: string;
  projectId: string;
  userId: string;
  actorId: string;
  shotId: string;
  seed: number;
  workflow: "sdxl_instantid_ipadapter" | "flux_pulid_fallback";
  promptSource: string;
  promptEn: string;
  semanticCheckScore: number;
  durationSec: number;
  outfitState: string;
  shotPurpose: string;
  sceneVariantKey: string;
}

export function toRenderMessages(
  jobId: string,
  projectId: string,
  userId: string,
  actorId: string,
  shots: StoryboardShot[]
): RenderQueueMessage[] {
  return shots.map((s, idx) => ({
    jobId,
    projectId,
    userId,
    actorId,
    shotId: s.shotId,
    seed: 100000 + idx,
    workflow: "sdxl_instantid_ipadapter",
    promptSource: s.promptSource,
    promptEn: s.promptEn,
    semanticCheckScore: s.semanticCheckScore,
    durationSec: s.durationSec,
    outfitState: s.outfitState,
    shotPurpose: s.shotPurpose,
    sceneVariantKey: s.sceneVariantKey
  }));
}
