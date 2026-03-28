-- FamilyOS Database Schema
-- Run this in the Supabase SQL Editor

-- Enable pgvector extension
create extension if not exists vector;

-- ============================================================
-- FAMILIES
-- ============================================================
create table families (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  created_at    timestamptz default now()
);

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  family_id     uuid references families(id) on delete set null,
  display_name  text not null,
  role          text not null check (role in ('admin', 'member', 'child')),
  created_at    timestamptz default now()
);

-- ============================================================
-- DOCUMENTS
-- ============================================================
create table documents (
  id            uuid primary key default gen_random_uuid(),
  family_id     uuid not null references families(id) on delete cascade,
  uploaded_by   uuid not null references profiles(id),
  filename      text not null,
  storage_path  text not null,
  category      text not null default 'uncategorized',
  mime_type     text default 'application/pdf',
  page_count    int,
  extracted_text text,
  created_at    timestamptz default now()
);

-- ============================================================
-- DOCUMENT CHUNKS (for RAG vector search)
-- ============================================================
create table document_chunks (
  id            uuid primary key default gen_random_uuid(),
  document_id   uuid not null references documents(id) on delete cascade,
  family_id     uuid not null references families(id) on delete cascade,
  chunk_index   int not null,
  content       text not null,
  embedding     vector(1536) not null,
  metadata      jsonb default '{}',
  created_at    timestamptz default now()
);

-- Vector similarity search index
create index on document_chunks
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 20);

-- ============================================================
-- CHAT MESSAGES
-- ============================================================
create table chat_messages (
  id            uuid primary key default gen_random_uuid(),
  family_id     uuid not null references families(id) on delete cascade,
  user_id       uuid not null references profiles(id),
  role          text not null check (role in ('user', 'assistant')),
  content       text not null,
  created_at    timestamptz default now()
);

-- ============================================================
-- VECTOR SEARCH FUNCTION
-- ============================================================
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
  select
    dc.id,
    dc.document_id,
    dc.content,
    dc.metadata,
    1 - (dc.embedding <=> query_embedding) as similarity
  from document_chunks dc
  where dc.family_id = match_family_id
  order by dc.embedding <=> query_embedding
  limit match_count;
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Helper: get current user's family_id
create or replace function get_my_family_id()
returns uuid
language sql stable
security definer
as $$
  select family_id from profiles where id = auth.uid();
$$;

-- Families RLS
alter table families enable row level security;

create policy "Users can view their own family"
  on families for select
  using (id = get_my_family_id());

-- Profiles RLS
alter table profiles enable row level security;

create policy "Users can view family members"
  on profiles for select
  using (family_id = get_my_family_id());

create policy "Users can update their own profile"
  on profiles for update
  using (id = auth.uid());

-- Documents RLS
alter table documents enable row level security;

create policy "Users can view family documents"
  on documents for select
  using (family_id = get_my_family_id());

create policy "Non-child users can insert documents"
  on documents for insert
  with check (
    family_id = get_my_family_id()
    and (select role from profiles where id = auth.uid()) in ('admin', 'member')
  );

create policy "Admins can delete documents"
  on documents for delete
  using (
    family_id = get_my_family_id()
    and (select role from profiles where id = auth.uid()) = 'admin'
  );

-- Document Chunks RLS
alter table document_chunks enable row level security;

create policy "Users can view family chunks"
  on document_chunks for select
  using (family_id = get_my_family_id());

create policy "Service can insert chunks"
  on document_chunks for insert
  with check (family_id = get_my_family_id());

-- Chat Messages RLS
alter table chat_messages enable row level security;

create policy "Users can view family chat"
  on chat_messages for select
  using (family_id = get_my_family_id());

create policy "Users can insert chat messages"
  on chat_messages for insert
  with check (
    family_id = get_my_family_id()
    and user_id = auth.uid()
  );
