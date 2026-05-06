import type { RewriteMode, StoryboardResult } from "../../shared/types";
import type { StyleProfileId } from "../../shared/styleProfiles";
import { detectLanguage } from "../../shared/i18n";
import { InMemoryD1 } from "../db/inMemoryD1";
import { normalizeInput } from "../services/inputNormalizer";
import { rewriteToStoryboard } from "../services/storyboard";
import { runJobPipeline } from "../queue/pipeline";

export class AiStudioService {
  private storyboardCache = new Map<string, StoryboardResult>();
  private projectStyle = new Map<string, StyleProfileId>();

  constructor(private readonly db: InMemoryD1) {}

  async createProject(input: {
    userId: string;
    title: string;
    sourceType: "paste" | "txt" | "md" | "url";
    sourceText?: string;
    sourceUri?: string;
    contentLanguage?: "zh" | "en";
    styleProfileId: StyleProfileId;
  }): Promise<{ projectId: string }> {
    const normalized = await normalizeInput(input);
    const projectId = this.makeId("proj");
    this.db.createProject({
      id: projectId,
      userId: input.userId,
      title: input.title,
      contentLanguage: input.contentLanguage ?? detectLanguage(normalized.sourceText),
      sourceType: normalized.sourceType,
      sourceText: normalized.sourceText,
      sourceUri: normalized.sourceUri
    });
    this.projectStyle.set(projectId, input.styleProfileId);
    return { projectId };
  }

  async rewriteAndStoryboard(input: {
    projectId: string;
    rawScript: string;
    mode: RewriteMode;
  }): Promise<StoryboardResult> {
    const style = this.projectStyle.get(input.projectId);
    if (!style) {
      throw new Error("style profile is required and immutable per project");
    }
    const storyboard = await rewriteToStoryboard(input.rawScript, input.mode, style);
    this.storyboardCache.set(input.projectId, storyboard);
    return storyboard;
  }

  async startRender(input: {
    userId: string;
    projectId: string;
    actorId: string;
    estimatedPoints: number;
    providerId?: "generic" | "doubao" | "keling" | "runway";
  }): Promise<{ jobId: string; outputR2Key: string; settledPoints: number; segmentCount: number }> {
    const storyboard = this.storyboardCache.get(input.projectId);
    if (!storyboard) {
      throw new Error("storyboard not found; run rewrite/storyboard first");
    }

    const jobId = this.makeId("job");
    this.db.preAuthorizeAndCreateJob({
      userId: input.userId,
      projectId: input.projectId,
      jobId,
      estimatedPoints: input.estimatedPoints,
      idempotencyKey: `${jobId}:preauth`
    });

    try {
      const pipeline = await runJobPipeline(this.db, {
        jobId,
        projectId: input.projectId,
        userId: input.userId,
        actorId: input.actorId,
        storyboard,
        providerId: input.providerId
      });

      this.db.settleJob({
        userId: input.userId,
        jobId,
        holdPoints: input.estimatedPoints,
        actualPoints: pipeline.actualPoints,
        idempotencyKey: `${jobId}:settle`
      });

      return {
        jobId,
        outputR2Key: pipeline.outputR2Key,
        settledPoints: pipeline.actualPoints,
        segmentCount: pipeline.segmentCount
      };
    } catch (error) {
      this.db.updateJobStatus(jobId, "FAILED", undefined, String(error));
      this.db.settleJob({
        userId: input.userId,
        jobId,
        holdPoints: input.estimatedPoints,
        actualPoints: 0,
        idempotencyKey: `${jobId}:settle_fail`
      });
      throw error;
    }
  }

  getJob(jobId: string): { status: string; outputR2Key?: string; settledPoints?: number; errorMessage?: string } {
    const job = this.db.getJob(jobId);
    return {
      status: job.status,
      outputR2Key: job.outputR2Key,
      settledPoints: job.settledPoints,
      errorMessage: job.errorMessage
    };
  }

  private makeId(prefix: string): string {
    return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
  }
}
