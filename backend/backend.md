# FamilyOS Backend Architecture

## Tech Stack
- **Framework**: FastAPI (Python 3.11+)
- **Database**: Supabase Postgres + pgvector
- **Storage**: Supabase Storage (PDF blobs)
- **Auth**: Supabase Auth (JWT validation in FastAPI)
- **PDF Parsing**: PyMuPDF (fitz)
- **Embeddings**: OpenAI text-embedding-3-small (1536 dims)
- **LLM**: OpenAI GPT-4o-mini (classification + RAG + autofill)
- **Text Chunking**: langchain-text-splitters

## Project Structure
```
backend/
  main.py                     -- FastAPI app, CORS, route registration
  config.py                   -- Environment variable loading
  requirements.txt            -- Python dependencies
  .env.example                -- Template for environment variables
  middleware/
    __init__.py
    auth.py                   -- JWT verification dependency
  services/
    __init__.py
    supabase_client.py        -- Supabase client singleton
    pdf_pipeline.py           -- Extract, chunk, embed, classify PDFs
    rag.py                    -- Vector search + LLM answer generation
  routers/
    __init__.py
    auth.py                   -- /api/auth/* endpoints
    documents.py              -- /api/documents/* endpoints
    chat.py                   -- /api/chat endpoint
    family.py                 -- /api/family/* endpoints
    autofill.py               -- /api/autofill endpoint
```

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/auth/signup | none | Register + create profile + family |
| POST | /api/auth/login | none | Returns JWT |
| POST | /api/auth/invite | admin | Invite family member |
| GET | /api/family | user | Family info + members |
| PATCH | /api/family/members/{uid} | admin | Change role |
| DELETE | /api/family/members/{uid} | admin | Remove member |
| POST | /api/documents/upload | admin/member | Upload PDF(s), triggers pipeline |
| GET | /api/documents | user | List docs (filter by category) |
| GET | /api/documents/{id} | user | Single doc metadata |
| DELETE | /api/documents/{id} | admin | Delete doc + chunks + file |
| POST | /api/chat | user | RAG query -> answer + sources |
| GET | /api/chat/history | user | Past messages |
| POST | /api/autofill | user | Field names -> matched values |

## PDF Pipeline Flow
1. **Extract** -- PyMuPDF `page.get_text()` per page
2. **Chunk** -- RecursiveCharacterTextSplitter (500 tokens, 50 overlap)
3. **Embed** -- OpenAI text-embedding-3-small (batch all chunks)
4. **Classify** -- GPT-4o-mini on first 1000 chars -> category
5. **Store** -- Supabase Storage (PDF) + Postgres (documents + document_chunks)

Categories: `finance`, `education`, `medical`, `identity`, `legal`, `other`

## RAG Flow
1. Embed user question (text-embedding-3-small)
2. pgvector similarity search via `match_chunks()` function (top 5, filtered by family_id)
3. Build prompt with retrieved chunks as context
4. GPT-4o-mini generates answer citing source documents
5. Return answer + source references

## Environment Variables
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret
OPENAI_API_KEY=sk-...
```

## Running
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env  # fill in values
uvicorn main:app --reload --port 8000
```
