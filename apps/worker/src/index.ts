import { handleHttp } from "../../../src/worker/routes/http";
import { handleRenderQueueMessage } from "../../../src/worker/queue/consumer";

export default {
  async fetch(request: Request, env: Record<string, string | undefined>): Promise<Response> {
    try {
      return await handleHttp(request, {
        STRIPE_WEBHOOK_SECRET: env.STRIPE_WEBHOOK_SECRET,
        CREEM_WEBHOOK_SECRET: env.CREEM_WEBHOOK_SECRET,
        DODO_WEBHOOK_SECRET: env.DODO_WEBHOOK_SECRET,
        STRIPE_ENABLED: env.STRIPE_ENABLED,
        CREEM_ENABLED: env.CREEM_ENABLED,
        DODO_ENABLED: env.DODO_ENABLED,
        PAYMENT_PROVIDER_ORDER: env.PAYMENT_PROVIDER_ORDER,
        BILLING_STRIPE_ENABLED: env.BILLING_STRIPE_ENABLED,
        BILLING_CREEM_ENABLED: env.BILLING_CREEM_ENABLED,
        BILLING_DODO_ENABLED: env.BILLING_DODO_ENABLED,
        BILLING_PROVIDER_PRIORITY: env.BILLING_PROVIDER_PRIORITY,
        STRIPE_SECRET_KEY: env.STRIPE_SECRET_KEY,
        CREEM_API_KEY: env.CREEM_API_KEY,
        DODO_PAYMENTS_API_KEY: env.DODO_PAYMENTS_API_KEY,
        BILLING_PRODUCT_MAP_JSON: env.BILLING_PRODUCT_MAP_JSON,
        STRIPE_SUCCESS_URL: env.STRIPE_SUCCESS_URL,
        STRIPE_CANCEL_URL: env.STRIPE_CANCEL_URL,
        APP_BASE_URL: env.APP_BASE_URL,
        DODO_API_BASE: env.DODO_API_BASE,
        CREEM_API_BASE: env.CREEM_API_BASE,
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
      try {
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
      } catch (err) {
        // Do not ack on failure; let Cloudflare Queues retry.
        console.error("queue message failed", err);
      }
    }
  }
};
