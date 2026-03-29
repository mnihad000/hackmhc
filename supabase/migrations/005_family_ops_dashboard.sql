-- Family operations center tables for dashboard workflows.

create table if not exists family_work_items (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  title text not null,
  description text default '',
  kind text not null check (kind in ('deadline', 'task')),
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done', 'overdue')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  due_at timestamptz,
  assigned_to uuid references profiles(id) on delete set null,
  created_by uuid not null references profiles(id),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists family_work_items_family_id_idx on family_work_items(family_id);
create index if not exists family_work_items_due_at_idx on family_work_items(due_at);
create index if not exists family_work_items_assigned_to_idx on family_work_items(assigned_to);

create table if not exists family_routines (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  title text not null,
  description text default '',
  cadence text not null check (cadence in ('daily', 'weekly', 'monthly')),
  next_due_at timestamptz not null,
  assigned_to uuid references profiles(id) on delete set null,
  active boolean not null default true,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists family_routines_family_id_idx on family_routines(family_id);
create index if not exists family_routines_next_due_at_idx on family_routines(next_due_at);
create index if not exists family_routines_assigned_to_idx on family_routines(assigned_to);

create table if not exists family_events (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  title text not null,
  description text default '',
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text default '',
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists family_events_family_id_idx on family_events(family_id);
create index if not exists family_events_starts_at_idx on family_events(starts_at);

create table if not exists required_doc_templates (
  id uuid primary key default gen_random_uuid(),
  template_key text not null unique,
  title text not null,
  category text not null check (category in ('finance', 'education', 'medical', 'identity', 'legal', 'other')),
  description text default '',
  created_at timestamptz not null default now()
);

insert into required_doc_templates (template_key, title, category, description)
values
  ('tax_1098_t', '1098-T Tuition Statement', 'finance', 'Needed for education tax filing.'),
  ('school_enrollment_form', 'School Enrollment Form', 'education', 'Used for annual school registration.'),
  ('insurance_card', 'Health Insurance Card', 'medical', 'Current insurance details for appointments.'),
  ('birth_certificate', 'Birth Certificate', 'identity', 'Official identity and relationship record.'),
  ('lease_or_mortgage', 'Lease or Mortgage Statement', 'legal', 'Proof of housing for many forms.')
on conflict (template_key) do nothing;

create table if not exists family_required_docs (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  template_id uuid not null references required_doc_templates(id) on delete cascade,
  enabled boolean not null default true,
  completed boolean not null default false,
  completed_at timestamptz,
  notes text default '',
  created_at timestamptz not null default now(),
  unique (family_id, template_id)
);

create index if not exists family_required_docs_family_id_idx on family_required_docs(family_id);
create index if not exists family_required_docs_enabled_idx on family_required_docs(enabled);

alter table family_work_items enable row level security;
alter table family_routines enable row level security;
alter table family_events enable row level security;
alter table required_doc_templates enable row level security;
alter table family_required_docs enable row level security;

create policy "Users can view family work items"
  on family_work_items for select
  using (family_id = get_my_family_id());

create policy "Admins and members can insert family work items"
  on family_work_items for insert
  with check (
    family_id = get_my_family_id()
    and (select role from profiles where id = auth.uid()) in ('admin', 'member')
  );

create policy "Admins and members can update family work items"
  on family_work_items for update
  using (
    family_id = get_my_family_id()
    and (select role from profiles where id = auth.uid()) in ('admin', 'member')
  );

create policy "Users can view family routines"
  on family_routines for select
  using (family_id = get_my_family_id());

create policy "Admins and members can insert family routines"
  on family_routines for insert
  with check (
    family_id = get_my_family_id()
    and (select role from profiles where id = auth.uid()) in ('admin', 'member')
  );

create policy "Admins and members can update family routines"
  on family_routines for update
  using (
    family_id = get_my_family_id()
    and (select role from profiles where id = auth.uid()) in ('admin', 'member')
  );

create policy "Users can view family events"
  on family_events for select
  using (family_id = get_my_family_id());

create policy "Admins and members can insert family events"
  on family_events for insert
  with check (
    family_id = get_my_family_id()
    and (select role from profiles where id = auth.uid()) in ('admin', 'member')
  );

create policy "Admins and members can update family events"
  on family_events for update
  using (
    family_id = get_my_family_id()
    and (select role from profiles where id = auth.uid()) in ('admin', 'member')
  );

create policy "Users can view required document templates"
  on required_doc_templates for select
  using (true);

create policy "Users can view family required docs"
  on family_required_docs for select
  using (family_id = get_my_family_id());

create policy "Admins and members can insert family required docs"
  on family_required_docs for insert
  with check (
    family_id = get_my_family_id()
    and (select role from profiles where id = auth.uid()) in ('admin', 'member')
  );

create policy "Admins and members can update family required docs"
  on family_required_docs for update
  using (
    family_id = get_my_family_id()
    and (select role from profiles where id = auth.uid()) in ('admin', 'member')
  );
