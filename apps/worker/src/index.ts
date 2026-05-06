import { handleHttp } from "../../../src/worker/routes/http";
import { handleRenderQueueMessage } from "../../../src/worker/queue/consumer";

export default {
  async fetch(request: Request, env: Record<string, string | undefined>): Promise<Response> {
    try {
      return await handleHttp(request, {
        STRIPE_WEBHOOK_SECRET: env.STRIPE_WEBHOOK_SECRET,
        PROMPT_VAULT_SECRET: env.PROMPT_VAULT_SECRET,
        INTERNAL_API_KEY: env.INTERNAL_API_KEY
      });
    } catch (error) {
      return new Response(JSON.stringify({ ok: false, error: String(error) }), {
        status: 500,
        headers: { "content-type": "application/json" }
      });
    }
  },

  async queue(batch: MessageBatch<{ type: string; payload: unknown }>, env: Record<string, string | undefined>): Promise<void> {
    for (const message of batch.messages) {
      const body = message.body;
      if (body.type === "render_pipeline") {
        await handleRenderQueueMessage(
          {
            MODAL_ENDPOINT: env.MODAL_ENDPOINT,
            MODAL_TOKEN: env.MODAL_TOKEN,
            CLOUD_RUN_COMPOSER_URL: env.CLOUD_RUN_COMPOSER_URL,
            CLOUD_RUN_ID_TOKEN: env.CLOUD_RUN_ID_TOKEN
          },
          body.payload as {
            jobId: string;
            projectId: string;
            actorId: string;
            shots: Array<{ shotId: string; promptEn: string; promptSource: string; semanticCheckScore: number; durationSec: number; seed: number }>;
          }
        );
      }
      message.ack();
    }
  }
};
