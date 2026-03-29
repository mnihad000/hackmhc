# Backend Handoff For Extension Alignment

This note captures backend work that still matters for the extension, but was not changed here because the backend edit scope was limited to `backend/routers/autofill.py`.

## What was adapted in-router

- `POST /api/autofill` now accepts the extension's `familyos.autofill.v1` request envelope.
- The router adapts the current legacy RAG `{ fills, sources }` result into contract-shaped `suggestions[]`.
- `POST /api/autofill/feedback` now exists as a temporary acknowledgement endpoint so the extension can complete its feedback flow during testing.

## Backend work still needed

1. Move contract shaping out of the router and into backend-owned domain/service code.
The router currently computes `confidence`, `confidence_bucket`, `fill_strategy`, `source_type`, `profile_key`, and `requires_review` heuristically because the underlying autofill service still returns only `{ fills, sources }`.

2. Update the real autofill pipeline to consume the full field descriptor.
The extension sends `field_id`, `placeholder`, `section`, `normalized_key`, `context`, `required`, `autocomplete`, and `options`, but the current RAG service prompt only uses `field_name`, `label`, and `type`. That prevents option-aware retrieval and real confidence ownership.

3. Implement durable feedback ingestion.
`POST /api/autofill/feedback` currently returns success without persistence. Backend still needs storage, validation, deduping, and any learning-queue promotion logic.

4. Fix Chrome extension CORS handling in `backend/main.py`.
`allow_origins=["chrome-extension://*"]` is not a reliable wildcard configuration for FastAPI/Starlette CORS middleware. Use explicit extension IDs or `allow_origin_regex` instead.

5. Add backend tests for the shared autofill contract.
There is currently no backend coverage enforcing the request schema, response schema, or feedback endpoint behavior.

## Testing note

The backend currently starts locally after installing the missing Python dependency `email-validator`, which is required because the auth router uses `EmailStr`.
