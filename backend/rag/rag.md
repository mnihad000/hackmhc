# RAG Schema Notes

## Added migration
- `supabase/migrations/003_rag_schema.sql`

## What the migration adds
- Enables `vector` extension (if not already enabled).
- Creates dedicated `rag` schema.
- Creates `rag.documents` for classified, user-owned RAG documents.
- Creates `rag.document_chunks` for chunked content + pgvector embeddings.
- Creates retrieval function `rag.match_document_chunks(...)` for RPC usage.
- Enables RLS on `rag` tables and adds per-user ownership policies.

## Tables

### `rag.documents`
- `id` uuid primary key
- `user_id` uuid not null -> `public.profiles(id)`
- `source_file_id` uuid null -> `public.documents(id)`
- `s3_key` text not null
- `file_name` text
- `mime_type` text
- `category` text not null with check:
  - `finance`, `education`, `medical`, `identity`, `legal`, `other`
- `classification_confidence` numeric null (checked 0..1 when present)
- `document_metadata` jsonb default `'{}'::jsonb`
- `created_at` timestamptz default `now()`
- `updated_at` timestamptz default `now()` with update trigger

Indexes:
- btree: `rag.documents(user_id)`
- btree: `rag.documents(category)`

### `rag.document_chunks`
- `id` uuid primary key
- `document_id` uuid not null -> `rag.documents(id)` on delete cascade
- `user_id` uuid not null -> `public.profiles(id)`
- `chunk_index` integer not null
- `content` text not null
- `token_count` integer null
- `embedding` `vector(1536)` null
- `chunk_metadata` jsonb default `'{}'::jsonb`
- `created_at` timestamptz default `now()`
- unique: `(document_id, chunk_index)`

Indexes:
- btree: `rag.document_chunks(user_id)`
- btree: `rag.document_chunks(document_id)`
- vector: HNSW on `embedding vector_cosine_ops` (where embedding is not null)

## Retrieval function
Function name:
- `rag.match_document_chunks(query_embedding vector(1536), match_user_id uuid, match_count integer default 5, match_category text default null)`

Behavior:
- Always filters by `match_user_id`.
- Joins `rag.document_chunks` to `rag.documents`.
- If `match_category` is provided, filters by document category.
- Orders by cosine similarity and returns scored results.

## RLS summary
- `rag.documents` and `rag.document_chunks` have RLS enabled.
- Policies enforce strict per-user ownership for:
  - `select`
  - `insert`
  - `update`
  - `delete`
- Policy condition style is `user_id = auth.uid()`.

## OpenAI env wiring
Backend config now supports a dedicated RAG key:
- `OPENAI_RAG_API_KEY` (preferred)
- fallback: `OPENAI_API_KEY`

`backend/rag/service.py` now initializes OpenAI with the resolved RAG key.

## Assumptions
- Embedding dimension is `1536` because backend is configured for OpenAI `text-embedding-3-small`.
- User table reference is `public.profiles(id)` (which maps to `auth.users(id)`).
- New `rag` objects are per-user scoped (not family-shared).

## Pending Integration Tasks
- Update upload pipeline to write RAG records:
  - insert into `rag.documents` (link `source_file_id` to `public.documents.id`)
  - chunk/extract content into `rag.document_chunks`
  - generate/store embeddings in `rag.document_chunks.embedding`
  - persist classifier output (`category`, `classification_confidence`)
- Switch retrieval code to use `rag.match_document_chunks(...)` instead of legacy `match_chunks`.
- Pass `user_id` into RAG retrieval path (strict user-scoped filtering), with optional category filter support.
- Align chat/autofill source lookups and citations with `rag.documents` / `rag.document_chunks`.
- Validate no regressions in existing upload/list/delete APIs while introducing new RAG-backed flow.
