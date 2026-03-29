-- Extend public.match_chunks to support optional category routing via documents.category.

create or replace function match_chunks(
  query_embedding vector(1536),
  match_family_id uuid,
  match_count int default 5,
  match_category text default null
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  metadata jsonb,
  similarity float
)
language sql stable
as $$
  select
    dc.id,
    dc.document_id,
    dc.content,
    dc.metadata,
    1 - (dc.embedding <=> query_embedding) as similarity
  from document_chunks dc
  join documents d on d.id = dc.document_id
  where dc.family_id = match_family_id
    and d.family_id = match_family_id
    and (match_category is null or d.category = match_category)
  order by dc.embedding <=> query_embedding
  limit greatest(match_count, 1);
$$;

-- Backward-compatible wrapper signature for existing 3-arg callers.
create or replace function match_chunks(
  query_embedding vector(1536),
  match_family_id uuid,
  match_count int default 5
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  metadata jsonb,
  similarity float
)
language sql stable
as $$
  select *
  from match_chunks(query_embedding, match_family_id, match_count, null);
$$;
