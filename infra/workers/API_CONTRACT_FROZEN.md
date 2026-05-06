# Worker API Contract (Frozen)

## Endpoints

### POST /api/projects
- input: { title, source_type, source_text?, source_uri? }
- source_type: paste | txt | md | url
- behavior: normalize input to source_text

### POST /api/projects/:id/rewrite
- input: { mode: preserve|balanced|dramatic }
- behavior: LLM rewrite only, no billing

### POST /api/projects/:id/storyboard
- behavior: produce shot JSON preview only, no billing
- output (required fields per shot):
  - prompt_source (same language as script)
  - prompt_en (English image-generation prompt)
  - semantic_check_score (source vs back-translation consistency score)

### POST /api/projects/:id/render
- input: { quality: draft|standard|pro, actor_bindings[] }
- billing: pre-authorize points here (first charge moment)
- behavior: create job, queue pipeline

### GET /api/jobs/:id
- output: { status, progress, estimated_points, settled_points, output_url }

### POST /api/billing/checkout-session
- input: { points_package_id }
- behavior: create stripe checkout session

### POST /api/billing/webhook/stripe
- behavior: verify stripe signature then append credit ledger

## Billing Transaction Pseudocode

1. begin D1 atomic batch
2. ensure idempotency key not exists
3. select wallet balance
4. if balance < estimated_points => reject
5. insert points_ledger(type='debit_hold')
6. update wallet balance = balance - estimated_points
7. insert job(status='QUEUED')
8. commit

## Settlement
- on success:
  - settle = actual_points
  - refund = hold - settle (if hold > settle)
- on fail before GPU stage:
  - full refund
- on partial fail:
  - charge completed shots only

## Prompt Fidelity Guardrail (Frozen)
1. `prompt_source` is the semantic source of truth.
2. `prompt_en` is execution text for image models only.
3. Pipeline must run back-translation check:
   - if semantic_check_score < threshold => auto-rewrite prompt_en and re-check
4. Glossary lock is mandatory for names, places, terms, and outfit states.
