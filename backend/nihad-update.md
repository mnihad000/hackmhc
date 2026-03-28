# Nihad Backend Update

## Scope Completed
- Implemented backend-focused changes for `auth`, `family`, and `documents`.
- Left `/api/chat` and `/api/autofill` unchanged.
- Removed upload-time RAG work (no embeddings/classification during upload).

## Files Changed
- `backend/routers/auth.py`
- `backend/routers/documents.py`
- `backend/routers/family.py`
- `backend/services/pdf_pipeline.py`
- `supabase/migrations/002_invite_codes.sql`

## What Was Implemented

### 0) Signup/login input normalization + cleaner errors
In `backend/routers/auth.py`:
- `signup` now normalizes input before Supabase call:
  - `email -> strip().lower()`
  - `password -> strip()`
- `login` now normalizes input the same way.
- `signup` now catches Supabase auth exceptions and returns `400` with the upstream error message instead of an unhandled `500`.
- `signup` now uses `supabase.auth.admin.create_user(..., email_confirm=true)` instead of `sign_up`, so local dev/testing is not blocked by Supabase email send rate limits.

### 1) Invite-code family flow
Added endpoints:
- `POST /api/auth/invite-code` (admin only)
- `POST /api/auth/invite` (alias of `invite-code`, compatibility path)
- `POST /api/auth/join-family` (authenticated user)

#### `POST /api/auth/invite-code`
Request body:
```json
{
  "role": "member",
  "expires_in_hours": 24,
  "max_uses": 1
}
```

Notes:
- Optional `email` key is accepted for backward compatibility but ignored in code-based flow.
- `role` must be one of: `admin`, `member`, `child`.
- `expires_in_hours` allowed range: `1..168`.
- `max_uses` allowed range: `1..50`.

Response shape:
```json
{
  "code": "AB12CD34",
  "role": "member",
  "max_uses": 1,
  "used_count": 0,
  "expires_at": "2026-03-29T15:00:00+00:00",
  "is_active": true
}
```

#### `POST /api/auth/join-family`
Request body:
```json
{
  "code": "AB12CD34"
}
```

Behavior:
- User must be authenticated.
- User must **not already be in a family** (`409` if already assigned).
- Validates code existence, active state, expiry, and usage limits.
- On success:
  - updates `profiles.family_id` and `profiles.role`
  - increments invite usage
  - deactivates code when `used_count >= max_uses`

Response:
```json
{
  "message": "Joined family successfully",
  "family_id": "<uuid>",
  "role": "member"
}
```

### 2) New DB migration for invite codes
Added: `supabase/migrations/002_invite_codes.sql`

Includes:
- New table `invite_codes`
- Role/usage checks
- Indexes on `family_id` and `code`
- RLS enabled
- Policies for family admins to insert/select/update family invite codes

### 3) Document upload moved to store-only pipeline
Updated upload behavior in `backend/routers/documents.py` and `backend/services/pdf_pipeline.py`.

Upload endpoint now supports:
- `file` (single)
- `files` (multiple)
- both in the same request

Processing now does:
1. Validate PDF + 10MB limit per file
2. Upload file to Supabase Storage
3. Extract text + page count (PyMuPDF)
4. Insert into `documents` table with category default `"other"`

Processing now does **not** do:
- chunk generation
- embedding generation
- LLM classification
- `document_chunks` insertion

Upload response shape:
```json
{
  "uploaded": [
    {
      "document_id": "<uuid>",
      "filename": "w2.pdf",
      "category": "other",
      "page_count": 2,
      "status": "stored",
      "warning": null
    }
  ],
  "failed": [],
  "total": 1,
  "success_count": 1,
  "failure_count": 0,
  "category": "other"
}
```

Backward compatibility:
- For a successful single-file upload, top-level `category` is still included.

### 4) Family route hardening
In `backend/routers/family.py`:
- `GET /api/family` now returns `404` if user is not assigned to a family.
- Role updates normalize role input (`strip().lower()`) before validation and save.

## Validation Run
- Ran: `python -m compileall backend`
- Result: success (no syntax errors across backend modules)

## Notes
- Existing `/api/chat` and `/api/autofill` were intentionally left untouched.
- Existing signup/login flows remain intact.
