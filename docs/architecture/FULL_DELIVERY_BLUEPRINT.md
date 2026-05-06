# AI Studio Full Delivery Blueprint (Non-MVP)

## Scope Completion
- Input: paste/txt/md/url
- Rewrite: preserve/balanced/dramatic
- Storyboard: structured shot JSON with prompt_source + prompt_en + semantic score
- Render pipeline: queued, model fallback, identity consistency constraints
- Compose pipeline: FFmpeg zoompan + xfade + subtitle burn-in
- Billing: points pre-auth + settlement + refund
- Security: webhook signature verification + authenticated compose boundary
- SEO/GEO: VideoObject page template + robots + llms.txt

## Runtime Components
1. Cloudflare Worker API + Queue consumer
2. D1 schema and ledger transaction model
3. Modal render adapter and Cloud Run composer adapter
4. Next.js public episode pages
5. Test suites for architecture/quality/cost-security

## Mandatory Frozen Rules
1. English-only draw prompts with semantic parity to source script.
2. Dual prompt fields persisted per shot.
3. Quality gate blocks low semantic score renders.
4. Billing starts at render confirmation only.
5. Model fallback order: Gemini -> Cloudflare AI -> DeepSeek.

## Production Checklists
- Configure real D1/R2 bindings in Wrangler
- Plug real LLM provider calls in `llmRouter.ts`
- Replace in-memory DB with D1 adapter preserving idempotency semantics
- Wire queue producer from render endpoint
- Deploy Worker and Web app with environment secrets
