export interface Env {
  GEMINI_API_KEY?: string;
  DEEPSEEK_API_KEY?: string;
  CLOUDFLARE_AI_ACCOUNT_ID?: string;
  CLOUDFLARE_AI_TOKEN?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  CREEM_WEBHOOK_SECRET?: string;
  DODO_WEBHOOK_SECRET?: string;
  BILLING_STRIPE_ENABLED?: string;
  BILLING_CREEM_ENABLED?: string;
  BILLING_DODO_ENABLED?: string;
  BILLING_PROVIDER_PRIORITY?: string;
  BILLING_PRODUCT_MAP_JSON?: string;
  STRIPE_SECRET_KEY?: string;
  CREEM_API_KEY?: string;
  DODO_PAYMENTS_API_KEY?: string;
  STRIPE_SUCCESS_URL?: string;
  STRIPE_CANCEL_URL?: string;
  APP_BASE_URL?: string;
  DODO_API_BASE?: string;
  CREEM_API_BASE?: string;
  MODAL_ENDPOINT?: string;
  MODAL_TOKEN?: string;
  CLOUD_RUN_COMPOSER_URL?: string;
  CLOUD_RUN_ID_TOKEN?: string;
  PROMPT_VAULT_SECRET?: string;
  INTERNAL_API_KEY?: string;
}
