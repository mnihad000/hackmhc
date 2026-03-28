-- Invite codes for family join flow

create table if not exists invite_codes (
  id            uuid primary key default gen_random_uuid(),
  family_id     uuid not null references families(id) on delete cascade,
  code          text not null unique,
  created_by    uuid not null references profiles(id),
  role          text not null check (role in ('admin', 'member', 'child')) default 'member',
  max_uses      int not null default 1 check (max_uses > 0),
  used_count    int not null default 0 check (used_count >= 0),
  expires_at    timestamptz not null,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

create index if not exists invite_codes_family_id_idx on invite_codes(family_id);
create index if not exists invite_codes_code_idx on invite_codes(code);

alter table invite_codes enable row level security;

create policy "Admins can create family invite codes"
  on invite_codes
  for insert
  with check (
    family_id = get_my_family_id()
    and (select role from profiles where id = auth.uid()) = 'admin'
  );

create policy "Family admins can view invite codes"
  on invite_codes
  for select
  using (
    family_id = get_my_family_id()
    and (select role from profiles where id = auth.uid()) = 'admin'
  );

create policy "Family admins can update invite codes"
  on invite_codes
  for update
  using (
    family_id = get_my_family_id()
    and (select role from profiles where id = auth.uid()) = 'admin'
  );
