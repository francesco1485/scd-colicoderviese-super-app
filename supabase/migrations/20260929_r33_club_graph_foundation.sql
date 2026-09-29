-- R33 — SCD PULSE Supabase Club Graph foundation
-- SAFE STAGED MIGRATION: no destructive statements, no production activation.
-- Target: dedicated SCD Supabase project. Do not apply to CEPA Maglia OS.

create extension if not exists pgcrypto;

do $$ begin
  create type public.scd_role as enum (
    'USER_BASE','FAMILY','ATHLETE','MISTER','STAFF','MANAGER',
    'SECRETARIAT','REGISTRATION','TOURNAMENTS','DIRECTION'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.scd_event_status as enum (
    'PLANNED','CONFIRMED','CHANGED','POSTPONED','CANCELLED','COMPLETED'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.scd_event_visibility as enum (
    'PUBLIC','TEAM','FAMILY','STAFF','DIRECTION'
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.scd_organizations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  timezone text not null default 'Europe/Rome',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.scd_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.scd_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.scd_role not null default 'USER_BASE',
  scope jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table if not exists public.scd_seasons (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  code text not null,
  starts_on date not null,
  ends_on date not null,
  active boolean not null default false,
  created_at timestamptz not null default now(),
  unique (organization_id, code),
  check (ends_on >= starts_on)
);

create table if not exists public.scd_people (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  birth_date date,
  email text,
  phone text,
  status text not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.scd_families (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.scd_family_members (
  family_id uuid not null references public.scd_families(id) on delete cascade,
  person_id uuid not null references public.scd_people(id) on delete cascade,
  relationship text not null,
  is_guardian boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (family_id, person_id)
);

create table if not exists public.scd_athletes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  person_id uuid not null references public.scd_people(id) on delete cascade,
  registration_status text not null default 'UNVERIFIED',
  medical_certificate_expires_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, person_id)
);

create table if not exists public.scd_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  season_id uuid not null references public.scd_seasons(id) on delete cascade,
  code text not null,
  name text not null,
  birth_year_from integer,
  birth_year_to integer,
  created_at timestamptz not null default now(),
  unique (organization_id, season_id, code)
);

create table if not exists public.scd_teams (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  season_id uuid not null references public.scd_seasons(id) on delete cascade,
  category_id uuid references public.scd_categories(id) on delete set null,
  code text not null,
  name text not null,
  status text not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, season_id, code)
);

create table if not exists public.scd_team_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  team_id uuid not null references public.scd_teams(id) on delete cascade,
  athlete_id uuid not null references public.scd_athletes(id) on delete cascade,
  valid_from date,
  valid_to date,
  source_state text not null default 'UNVERIFIED',
  created_at timestamptz not null default now(),
  unique (team_id, athlete_id),
  check (valid_to is null or valid_from is null or valid_to >= valid_from)
);

create table if not exists public.scd_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  season_id uuid references public.scd_seasons(id) on delete set null,
  event_type text not null,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  status public.scd_event_status not null default 'PLANNED',
  visibility public.scd_event_visibility not null default 'TEAM',
  location_text text,
  source_id text not null default 'UNVERIFIED',
  source_record_id text,
  source_verified_at timestamptz,
  source_confidence smallint check (source_confidence between 0 and 100),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);

create table if not exists public.scd_event_scopes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  event_id uuid not null references public.scd_events(id) on delete cascade,
  team_id uuid references public.scd_teams(id) on delete cascade,
  family_id uuid references public.scd_families(id) on delete cascade,
  person_id uuid references public.scd_people(id) on delete cascade,
  role_scope public.scd_role,
  created_at timestamptz not null default now(),
  check (num_nonnulls(team_id, family_id, person_id, role_scope) = 1)
);

create table if not exists public.scd_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  person_id uuid references public.scd_people(id) on delete set null,
  team_id uuid references public.scd_teams(id) on delete set null,
  event_id uuid references public.scd_events(id) on delete set null,
  document_type text not null,
  title text not null,
  storage_path text,
  expires_at date,
  visibility public.scd_event_visibility not null default 'STAFF',
  source_id text not null default 'UNVERIFIED',
  source_record_id text,
  source_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.scd_external_refs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  source_id text not null,
  source_record_id text not null,
  source_verified_at timestamptz,
  confidence smallint check (confidence between 0 and 100),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (organization_id, source_id, source_record_id)
);

create table if not exists public.scd_audit_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists scd_memberships_user_idx on public.scd_memberships(user_id, organization_id) where active;
create index if not exists scd_people_org_idx on public.scd_people(organization_id, last_name, first_name);
create index if not exists scd_team_memberships_team_idx on public.scd_team_memberships(team_id, athlete_id);
create index if not exists scd_events_org_start_idx on public.scd_events(organization_id, starts_at);
create index if not exists scd_event_scopes_event_idx on public.scd_event_scopes(event_id);
create index if not exists scd_external_refs_lookup_idx on public.scd_external_refs(source_id, source_record_id);

alter table public.scd_organizations enable row level security;
alter table public.scd_profiles enable row level security;
alter table public.scd_memberships enable row level security;
alter table public.scd_seasons enable row level security;
alter table public.scd_people enable row level security;
alter table public.scd_families enable row level security;
alter table public.scd_family_members enable row level security;
alter table public.scd_athletes enable row level security;
alter table public.scd_categories enable row level security;
alter table public.scd_teams enable row level security;
alter table public.scd_team_memberships enable row level security;
alter table public.scd_events enable row level security;
alter table public.scd_event_scopes enable row level security;
alter table public.scd_documents enable row level security;
alter table public.scd_external_refs enable row level security;
alter table public.scd_audit_events enable row level security;

create or replace function public.scd_is_org_member(p_organization_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.scd_memberships m
    where m.organization_id = p_organization_id
      and m.user_id = auth.uid()
      and m.active = true
  );
$$;

create or replace function public.scd_has_org_role(p_organization_id uuid, p_roles public.scd_role[])
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.scd_memberships m
    where m.organization_id = p_organization_id
      and m.user_id = auth.uid()
      and m.active = true
      and m.role = any(p_roles)
  );
$$;

revoke all on function public.scd_is_org_member(uuid) from anon;
revoke all on function public.scd_has_org_role(uuid, public.scd_role[]) from anon;
grant execute on function public.scd_is_org_member(uuid) to authenticated;
grant execute on function public.scd_has_org_role(uuid, public.scd_role[]) to authenticated;

create policy "scd_profiles_select_self" on public.scd_profiles
for select to authenticated using (user_id = auth.uid());
create policy "scd_profiles_update_self" on public.scd_profiles
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "scd_memberships_select_self" on public.scd_memberships
for select to authenticated using (user_id = auth.uid());

create policy "scd_organizations_select_member" on public.scd_organizations
for select to authenticated using (public.scd_is_org_member(id));

create policy "scd_seasons_select_member" on public.scd_seasons
for select to authenticated using (public.scd_is_org_member(organization_id));
create policy "scd_people_select_member" on public.scd_people
for select to authenticated using (public.scd_is_org_member(organization_id));
create policy "scd_families_select_member" on public.scd_families
for select to authenticated using (public.scd_is_org_member(organization_id));
create policy "scd_athletes_select_member" on public.scd_athletes
for select to authenticated using (public.scd_is_org_member(organization_id));
create policy "scd_categories_select_member" on public.scd_categories
for select to authenticated using (public.scd_is_org_member(organization_id));
create policy "scd_teams_select_member" on public.scd_teams
for select to authenticated using (public.scd_is_org_member(organization_id));
create policy "scd_team_memberships_select_member" on public.scd_team_memberships
for select to authenticated using (public.scd_is_org_member(organization_id));
create policy "scd_events_select_member" on public.scd_events
for select to authenticated using (public.scd_is_org_member(organization_id));
create policy "scd_event_scopes_select_member" on public.scd_event_scopes
for select to authenticated using (public.scd_is_org_member(organization_id));
create policy "scd_documents_select_member" on public.scd_documents
for select to authenticated using (public.scd_is_org_member(organization_id));
create policy "scd_external_refs_select_member" on public.scd_external_refs
for select to authenticated using (public.scd_is_org_member(organization_id));

create policy "scd_family_members_select_member" on public.scd_family_members
for select to authenticated using (
  exists (
    select 1 from public.scd_families f
    where f.id = family_id and public.scd_is_org_member(f.organization_id)
  )
);

create policy "scd_audit_select_direction" on public.scd_audit_events
for select to authenticated using (
  public.scd_has_org_role(organization_id, array['DIRECTION'::public.scd_role])
);

create policy "scd_seasons_write_secretariat" on public.scd_seasons
for all to authenticated
using (public.scd_has_org_role(organization_id, array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role]))
with check (public.scd_has_org_role(organization_id, array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role]));

create policy "scd_people_write_secretariat" on public.scd_people
for all to authenticated
using (public.scd_has_org_role(organization_id, array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role]))
with check (public.scd_has_org_role(organization_id, array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role]));

create policy "scd_families_write_secretariat" on public.scd_families
for all to authenticated
using (public.scd_has_org_role(organization_id, array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role]))
with check (public.scd_has_org_role(organization_id, array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role]));

create policy "scd_athletes_write_secretariat" on public.scd_athletes
for all to authenticated
using (public.scd_has_org_role(organization_id, array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role]))
with check (public.scd_has_org_role(organization_id, array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role]));

create policy "scd_categories_write_secretariat" on public.scd_categories
for all to authenticated
using (public.scd_has_org_role(organization_id, array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role]))
with check (public.scd_has_org_role(organization_id, array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role]));

create policy "scd_teams_write_secretariat" on public.scd_teams
for all to authenticated
using (public.scd_has_org_role(organization_id, array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role]))
with check (public.scd_has_org_role(organization_id, array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role]));

create policy "scd_team_memberships_write_secretariat" on public.scd_team_memberships
for all to authenticated
using (public.scd_has_org_role(organization_id, array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role]))
with check (public.scd_has_org_role(organization_id, array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role]));

create policy "scd_events_write_staff" on public.scd_events
for all to authenticated
using (public.scd_has_org_role(organization_id, array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role,'STAFF'::public.scd_role,'MISTER'::public.scd_role]))
with check (public.scd_has_org_role(organization_id, array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role,'STAFF'::public.scd_role,'MISTER'::public.scd_role]));

create policy "scd_event_scopes_write_staff" on public.scd_event_scopes
for all to authenticated
using (public.scd_has_org_role(organization_id, array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role,'STAFF'::public.scd_role,'MISTER'::public.scd_role]))
with check (public.scd_has_org_role(organization_id, array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role,'STAFF'::public.scd_role,'MISTER'::public.scd_role]));

create policy "scd_documents_write_secretariat" on public.scd_documents
for all to authenticated
using (public.scd_has_org_role(organization_id, array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role]))
with check (public.scd_has_org_role(organization_id, array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role]));

create policy "scd_external_refs_write_secretariat" on public.scd_external_refs
for all to authenticated
using (public.scd_has_org_role(organization_id, array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role]))
with check (public.scd_has_org_role(organization_id, array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role]));

comment on table public.scd_events is 'Single EVENT_ID source for public/team/family/staff/direction projections.';
comment on table public.scd_external_refs is 'Adapter bridge between Supabase Club Graph entities and R20/Drive/Gmail/Sheets source records.';
