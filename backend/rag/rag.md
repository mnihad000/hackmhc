# RAG Runtime Architecture (Current)

This document reflects the **live implementation** used by chat/autofill today.

## Active data path
- Retrieval source tables:
  - `public.documents`
  - `public.document_chunks`
- Storage path for uploaded PDFs:
  - Supabase storage bucket `documents`
- Chat retrieval stays family-scoped via `family_id`.

## Category routing behavior
- Source of truth for routing: `public.documents.category`.
- Category is inferred from the user question with deterministic keyword routing:
  - finance-like terms -> `finance`
  - healthcare/medical-like terms -> `medical`
  - education-like terms -> `education`
  - identity-like terms -> `identity`
  - legal-like terms -> `legal`
- If category is unclear, route to `other`.

## Retrieval function
- Migration: `supabase/migrations/004_match_chunks_category.sql`
- `match_chunks` now supports optional category filtering:
  - `match_chunks(query_embedding, match_family_id, match_count, match_category)`
- Behavior:
  - joins `public.document_chunks` to `public.documents`
  - filters by `family_id`
  - if `match_category` is provided, filters by `documents.category`
  - orders by cosine distance/similarity and returns top results
- Backward compatibility is preserved for 3-argument callers.

## Answer policy and fallback
- Assistant system identity: **Docster**.
- Answer generation is grounded only in retrieved document excerpts.
- If retrieval returns no relevant chunks (or similarity is below threshold), response is:
  - `Sorry, we couldn't find that in your uploaded documents.`
- In fallback cases, `sources` is returned as an empty list.

## Environment variables
Backend OpenAI key precedence in `backend/config.py`:
1. `OPENAI_LLM_API_KEY`
2. `OPENAI_RAG_API_KEY`
3. `OPENAI_API_KEY`

If none are set, backend startup fails with a clear runtime error.

## Frontend integration (Docster widget)
- Floating chatbot widget is mounted globally on authenticated frontend pages.
- Widget is hidden on `/login` and `/signup`.
- Widget uses existing backend endpoints:
  - `POST /api/chat`
  - `GET /api/chat/history`
- UI name/copy uses **Docster**.
