# Prompt Vault Anti-Theft Baseline

## Objective
Solidify all expert prompts into product runtime without exposing proprietary templates to end users.

## Mandatory Controls
1. Server-side prompt vault only. Never ship prompt templates to frontend bundle.
2. Internal API key required for prompt listing/rendering endpoints.
3. Request payload signature required (`x-prompt-signature`) with `PROMPT_VAULT_SECRET`.
4. Prompt rendering endpoints are rate-limited.
5. Every rendered prompt gets immutable fingerprint for leak tracing.
6. Prompt responses include template id + fingerprint for audit.

## Endpoints
- `GET /api/prompts/templates` (internal only)
- `POST /api/prompts/render` (internal only + signed payload)

## Runtime Secrets
- `INTERNAL_API_KEY`
- `PROMPT_VAULT_SECRET`
- `STRIPE_WEBHOOK_SECRET`

## Operational Rules
1. Rotate `PROMPT_VAULT_SECRET` monthly.
2. Rotate `INTERNAL_API_KEY` at least every quarter.
3. Keep render logs with caller, templateId, fingerprint, timestamp.
4. Reject unknown callers.

## Leak Response
1. Locate leaked prompt via fingerprint.
2. Revoke related key immediately.
3. Roll template version and secret.
4. Run audit on caller/source IP and request history.
