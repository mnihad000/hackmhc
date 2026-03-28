# FamilyOS Autofill Extension Plan (Team Brief)

## Why we are building this

We are building a Chrome extension that helps families autofill forms using data extracted from their FamilyOS documents.

The MVP goal is to reduce repetitive typing while keeping user trust high.

## MVP product behavior

- User starts filling a form on any website.
- Extension detects fillable fields and prompts: "Autofill with FamilyOS?"
- Extension requests suggestions from backend using field descriptors.
- Extension shows a preview and only preselects high-confidence values.
- User confirms and extension fills approved fields.

## Core principle for MVP

`Precision first`:
- We prefer skipping a field over filling it wrong.
- Confidence gating is required before any autofill.

## Scope split by team

### Extension

- Detect and normalize form fields (`label`, `name/id`, `placeholder`, `type`, context).
- Prompt user and display fill preview in popup UI.
- Apply only approved values to page fields.
- Send fill outcomes back to backend (`accepted/rejected/edited/manual`).

### Backend (FastAPI + Supabase)

- Receive field descriptors and return candidate values + confidence + source info.
- Use canonical profile data first; use RAG fallback when needed.
- Provide feedback endpoint for adaptive learning queue.
- Validate and promote learned mappings safely.

### Frontend (FamilyOS web app)

- Show source/provenance and profile correction tools.
- Keep field taxonomy aligned with backend/extension naming.
- Support trust and correction workflows for users.

## API alignment (v1 contract)

### `POST /api/autofill`

Input:
- `fields`: array of normalized field descriptors

Output:
- `suggestions`: array of objects:
  - `field_name`
  - `value`
  - `confidence` (0.0-1.0)
  - `sourceType` (canonical/rag/inferred)
  - `sourceRef`
  - `reason`

### `POST /api/autofill/feedback`

Input:
- accepted/rejected/edited suggestions
- unseen field + manual value captures (for adaptive learning)

Output:
- acknowledgement

## Confidence policy (initial)

- `>= 0.85`: preselect in preview.
- `0.65-0.84`: show suggestion, unchecked.
- `< 0.65`: do not suggest/fill.

Confidence should combine semantic similarity with rule checks:
- field/type compatibility
- format validation (email/phone/date/etc.)
- source reliability
- optional recency weighting

## Adaptive learning (important)

When we fail to fill an unseen field and user fills it manually:
- capture field descriptor + value + context
- send to backend learning queue
- validate before promotion (format, conflicts, sensitive data rules)
- only then add to retrieval memory / mapping index

Guardrail:
- critical fields require repeated confirmations before auto-fill eligibility

## Immediate next steps

1. Bootstrap clean MV3 extension skeleton in `extension/` (plain JS).
2. Implement field extraction + prompt + preview + approve flow.
3. Lock backend response schema for `suggestions` and `feedback`.
4. Test with 4 form types:
   - school enrollment
   - healthcare/insurance
   - tax forms
   - generic contact
5. Track MVP metrics:
   - precision (wrong-fill rate)
   - coverage (fields suggested)
   - acceptance rate (suggestions accepted)

## Working agreement

- Contract-first changes: schema updates are versioned.
- No breaking API changes without extension-team review.
- Weekly sync to keep extension/backend/frontend aligned.

