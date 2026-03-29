-- Dedicated RAG schema for per-user document retrieval and semantic search.

create extension if not exists vector;
create schema if not exists rag;

create table if not exists rag.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  source_file_id uuid null references public.documents(id) on delete set null,
  s3_key text not null,
  file_name text,
  mime_type text,
  category text not null,
  classification_confidence numeric,
  document_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rag_documents_category_check
    check (category in ('finance', 'education', 'medical', 'identity', 'legal', 'other')),
  constraint rag_documents_classification_confidence_check
    check (
      classification_confidence is null
      or (classification_confidence >= 0 and classification_confidence <= 1)
    )
);

comment on table rag.documents is 'RAG document records linked to uploaded files and owned by a single user.';
comment on column rag.documents.source_file_id is 'Optional link to public.documents upload metadata.';
comment on column rag.documents.category is 'Document category for routing and retrieval filters.';
comment on column rag.documents.classification_confidence is 'Classifier confidence score between 0 and 1.';
comment on column rag.documents.document_metadata is 'Arbitrary JSON metadata from extraction/classification pipeline.';

create table if not exists rag.document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references rag.documents(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  token_count integer,
  -- OpenAI text-embedding-3-small outputs 1536-dimensional embeddings.
  embedding vector(1536),
  chunk_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint rag_document_chunks_document_chunk_index_unique unique (document_id, chunk_index)
);

comment on table rag.document_chunks is 'Chunked document content with pgvector embeddings for semantic retrieval.';
comment on column rag.document_chunks.embedding is 'Vector embedding (1536 dims) for cosine similarity search.';
comment on column rag.document_chunks.chunk_metadata is 'Chunk-level JSON metadata (page numbers, offsets, parser data).';

create index if not exists rag_documents_user_id_idx on rag.documents(user_id);
create index if not exists rag_documents_category_idx on rag.documents(category);
create index if not exists rag_document_chunks_user_id_idx on rag.document_chunks(user_id);
create index if not exists rag_document_chunks_document_id_idx on rag.document_chunks(document_id);

-- Supabase generally recommends HNSW for pgvector nearest-neighbor search.
create index if not exists rag_document_chunks_embedding_hnsw_idx
  on rag.document_chunks
  using hnsw (embedding vector_cosine_ops)
  where embedding is not null;

create or replace function rag.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger rag_documents_set_updated_at
before update on rag.documents
for each row
execute function rag.set_updated_at();

create or replace function rag.match_document_chunks(
  query_embedding vector(1536),
  match_user_id uuid,
  match_count integer default 5,
  match_category text default null
)
returns table (
  chunk_id uuid,
  document_id uuid,
  user_id uuid,
  chunk_index integer,
  content text,
  token_count integer,
  chunk_metadata jsonb,
  document_category text,
  file_name text,
  source_file_id uuid,
  similarity double precision
)
language sql
stable
as $$
  /*
    User-scoped semantic chunk retrieval.
    Always filters by match_user_id.
    Optionally filters by category via rag.documents.
  */
  select
    c.id as chunk_id,
    c.document_id,
    c.user_id,
    c.chunk_index,
    c.content,
    c.token_count,
    c.chunk_metadata,
    d.category as document_category,
    d.file_name,
    d.source_file_id,
    1 - (c.embedding <=> query_embedding) as similarity
  from rag.document_chunks c
  join rag.documents d on d.id = c.document_id
  where c.embedding is not null
    and c.user_id = match_user_id
    and d.user_id = match_user_id
    and (match_category is null or d.category = match_category)
  order by c.embedding <=> query_embedding
  limit greatest(match_count, 1);
$$;

comment on function rag.match_document_chunks(vector(1536), uuid, integer, text)
is 'RPC-friendly per-user chunk retrieval with optional category filter and cosine similarity scoring.';

alter table rag.documents enable row level security;
alter table rag.document_chunks enable row level security;

create policy "Users can view their own rag documents"
  on rag.documents
  for select
  using (user_id = auth.uid());

create policy "Users can insert their own rag documents"
  on rag.documents
  for insert
  with check (user_id = auth.uid());

create policy "Users can update their own rag documents"
  on rag.documents
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can delete their own rag documents"
  on rag.documents
  for delete
  using (user_id = auth.uid());

create policy "Users can view their own rag chunks"
  on rag.document_chunks
  for select
  using (user_id = auth.uid());

create policy "Users can insert their own rag chunks"
  on rag.document_chunks
  for insert
  with check (user_id = auth.uid());

create policy "Users can update their own rag chunks"
  on rag.document_chunks
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can delete their own rag chunks"
  on rag.document_chunks
  for delete
  using (user_id = auth.uid());
