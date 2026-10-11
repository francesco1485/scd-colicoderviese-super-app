-- APPLIED to project ndevtxxijbcnskgysdit (SCD PULSE) on 2026-10-11 as migration
-- "r59_people_lifecycle_and_consents" in an additive form (create/add only, no drop statements:
-- the tables were new and scd_people had no status check). The idempotent text below is kept for
-- local and fresh environments; both produce the same schema. Hardening follows in r59_1.
-- R59 · People lifecycle, structure roles, guardian consents (UD-028, UD-040, UD-046, decision 2026-10-11)
--
-- Purpose
--   The Director (DIRECTION) and the Secretariat manage people from the app like a proper
--   gestionale: new athletes and staff are entered, people who leave are marked as left with
--   date and reason, every change is written to history and the person disappears from the
--   operative views while the record stays for federal and accounting duties.
--
-- Scope (what this migration does NOT do)
--   No authentication changes, no new roles in public.scd_role, no change to existing RLS.
--   New tables get their own RLS: read for org members, write only for DIRECTION / SECRETARIAT.
--
-- Depends on: r33 (people, roles, athletes, teams), r35 (scd_has_org_role, scd_is_org_member).

begin;

-- ---------------------------------------------------------------- 1. person status
-- ACTIVE: in the club. PENDING: registration started, not yet confirmed.
-- LEFT: left the club (date + reason in history). ARCHIVED: historical record only.
alter table public.scd_people
  drop constraint if exists scd_people_status_check;
alter table public.scd_people
  add constraint scd_people_status_check
  check (status in ('ACTIVE','PENDING','LEFT','ARCHIVED'));

alter table public.scd_people
  add column if not exists left_at date,
  add column if not exists left_reason text,
  add column if not exists display_name text generated always as (
    trim(first_name || ' ' || last_name)
  ) stored,
  add column if not exists source_id text not null default 'UNVERIFIED',
  add column if not exists source_record_id text;

-- Minor status is computed at query time (current_date is not immutable, so no generated column).
create or replace function public.scd_is_minor(p_birth_date date)
returns boolean
language sql
stable
set search_path = public
as $$ select case when p_birth_date is null then null else p_birth_date > (current_date - interval '18 years') end $$;

alter table public.scd_people
  drop constraint if exists scd_people_left_consistency;
alter table public.scd_people
  add constraint scd_people_left_consistency
  check (
    (status = 'LEFT' and left_at is not null)
    or (status <> 'LEFT' and left_at is null)
  );

-- ---------------------------------------------------------------- 2. structure roles
-- The club list uses roles that do not fit the six person roles of r33.
-- Structure roles are kept separately with the club's own labels (ELENCO DIRIGENTI E RUOLI).
create table if not exists public.scd_structure_roles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  person_id uuid not null references public.scd_people(id) on delete cascade,
  season_id uuid references public.scd_seasons(id) on delete set null,
  role_label text not null,                       -- "Dirigente accompagnatore U15", as the club writes it
  role_kind text not null check (role_kind in ('DIRIGENTE','MISTER','AUTISTA','RESPONSABILE','STAFF','ORGANO_SOCIETARIO')),
  team_id uuid references public.scd_teams(id) on delete set null,
  area_id text,                                   -- "pulmini", "club-house", "infermeria", ... (work areas registry)
  show_in_app boolean not null default true,      -- the "omino" next to pitches and vans
  contact_email text,                             -- shown only to logged-in members, never public
  contact_phone text,                             -- never shown on public pages
  valid_from date,
  valid_to date,
  active boolean not null default true,
  source_id text not null default 'UNVERIFIED',
  source_record_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (valid_to is null or valid_from is null or valid_to >= valid_from)
);
create index if not exists scd_structure_roles_person_idx on public.scd_structure_roles(organization_id, person_id) where active;
create index if not exists scd_structure_roles_team_idx on public.scd_structure_roles(team_id) where active;

-- ---------------------------------------------------------------- 3. lifecycle history
-- "lo mettiamo scritto": every entry, exit, transfer or team change is a row here, with who did it.
create table if not exists public.scd_person_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  person_id uuid not null references public.scd_people(id) on delete cascade,
  event_type text not null check (event_type in (
    'ENTRATA','USCITA','TRASFERIMENTO_OUT','TRASFERIMENTO_IN','PRESTITO_OUT','RIENTRO',
    'CAMBIO_SQUADRA','CAMBIO_RUOLO','CAMBIO_STATO','NOTA'
  )),
  event_date date not null default current_date,
  reason text,
  from_team_id uuid references public.scd_teams(id) on delete set null,
  to_team_id uuid references public.scd_teams(id) on delete set null,
  other_club text,                                -- destination/origin club for transfers and loans
  note text,
  actor_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists scd_person_events_person_idx on public.scd_person_events(person_id, event_date desc);

-- ---------------------------------------------------------------- 4. guardian consents
-- From the registration form (Liberatoria immagini, Regolamento trasferte, Informativa privacy).
-- One row per person and consent type; minors' consents are given by a guardian.
create table if not exists public.scd_person_consents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  person_id uuid not null references public.scd_people(id) on delete cascade,
  consent_type text not null check (consent_type in (
    'IMMAGINI_ISTITUZIONALI','COMUNICAZIONI_PROMOZIONALI','PULMINO_SERVIZIO','USCITA_AUTONOMA','AVATAR_APP','FOTO_PARTITA_APP'
  )),
  granted boolean not null,
  given_by_person_id uuid references public.scd_people(id) on delete set null,   -- the guardian, for minors
  policy_version text not null,
  given_at timestamptz not null default now(),
  revoked_at timestamptz,
  source_id text not null default 'UNVERIFIED',
  source_record_id text,
  unique (person_id, consent_type, policy_version)
);
create index if not exists scd_person_consents_person_idx on public.scd_person_consents(person_id) where revoked_at is null;

-- ---------------------------------------------------------------- 5. operative views (LEFT people disappear)
create or replace view public.scd_v_people_active
with (security_invoker = true) as
  select p.*
  from public.scd_people p
  where p.status = 'ACTIVE';

create or replace view public.scd_v_structure_active
with (security_invoker = true) as
  select r.id, r.organization_id, r.person_id, p.display_name, r.role_label, r.role_kind,
         r.team_id, t.code as team_code, t.name as team_name, r.area_id, r.show_in_app,
         r.contact_email, r.valid_from, r.valid_to
  from public.scd_structure_roles r
  join public.scd_people p on p.id = r.person_id and p.status = 'ACTIVE'
  left join public.scd_teams t on t.id = r.team_id
  where r.active = true
    and (r.valid_to is null or r.valid_to >= current_date);

-- Public projection for the "omini": name, role, team. No contacts, never minors.
create or replace view public.scd_v_structure_public
with (security_invoker = true) as
  select s.id, s.organization_id, s.display_name, s.role_label, s.role_kind, s.team_code, s.team_name, s.area_id
  from public.scd_v_structure_active s
  join public.scd_people p on p.id = s.person_id
  where s.show_in_app = true
    and coalesce(public.scd_is_minor(p.birth_date), false) = false;

-- ---------------------------------------------------------------- 6. lifecycle function
-- Marks a person as LEFT, writes the history row, closes roles and team memberships.
-- Only DIRECTION / SECRETARIAT may call it (explicit check inside).
create or replace function public.scd_person_mark_left(
  p_person_id uuid,
  p_left_at date,
  p_reason text,
  p_event_type text default 'USCITA',
  p_other_club text default null,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
-- security definer: the audit table is append-only through server code; the role check
-- below is the authorization, and every write it performs is recorded in the history and audit.
declare
  v_org uuid;
begin
  select organization_id into v_org from public.scd_people where id = p_person_id;
  if v_org is null then
    raise exception 'person not found';
  end if;
  if not public.scd_has_org_role(v_org, array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role]) then
    raise exception 'not allowed';
  end if;
  if p_event_type not in ('USCITA','TRASFERIMENTO_OUT','PRESTITO_OUT') then
    raise exception 'event type not allowed for leaving';
  end if;
  if exists (select 1 from public.scd_people where id = p_person_id and status = 'LEFT') then
    raise exception 'person already marked as left';
  end if;

  update public.scd_people
     set status = 'LEFT', left_at = p_left_at, left_reason = p_reason, updated_at = now()
   where id = p_person_id;

  update public.scd_structure_roles
     set active = false, valid_to = least(coalesce(valid_to, p_left_at), p_left_at), updated_at = now()
   where person_id = p_person_id and active = true;

  update public.scd_person_roles
     set active = false, valid_to = least(coalesce(valid_to, p_left_at), p_left_at), updated_at = now()
   where person_id = p_person_id and active = true;

  update public.scd_team_memberships tm
     set valid_to = least(coalesce(tm.valid_to, p_left_at), p_left_at)
    from public.scd_athletes a
   where a.id = tm.athlete_id and a.person_id = p_person_id
     and (tm.valid_to is null or tm.valid_to > p_left_at);

  insert into public.scd_person_events (organization_id, person_id, event_type, event_date, reason, other_club, note, actor_user_id)
  values (v_org, p_person_id, p_event_type, p_left_at, p_reason, p_other_club, p_note, (select auth.uid()));

  insert into public.scd_audit_events (organization_id, actor_user_id, action, entity_type, entity_id, payload)
  values (v_org, (select auth.uid()), 'PERSON_LEFT', 'scd_people', p_person_id,
          jsonb_build_object('left_at', p_left_at, 'reason', p_reason, 'event_type', p_event_type));
end;
$$;
revoke all on function public.scd_person_mark_left(uuid, date, text, text, text, text) from anon;
grant execute on function public.scd_person_mark_left(uuid, date, text, text, text, text) to authenticated;

-- ---------------------------------------------------------------- 7. RLS for the new tables
alter table public.scd_structure_roles enable row level security;
alter table public.scd_person_events   enable row level security;
alter table public.scd_person_consents enable row level security;

-- structure roles: members read; DIRECTION/SECRETARIAT write
drop policy if exists "scd_structure_roles_select_members" on public.scd_structure_roles;
create policy "scd_structure_roles_select_members" on public.scd_structure_roles
for select to authenticated
using (public.scd_is_org_member(organization_id));
drop policy if exists "scd_structure_roles_write_direction" on public.scd_structure_roles;
create policy "scd_structure_roles_write_direction" on public.scd_structure_roles
for all to authenticated
using (public.scd_has_org_role(organization_id, array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role]))
with check (public.scd_has_org_role(organization_id, array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role]));

-- history: DIRECTION/SECRETARIAT read and insert; never update or delete (append-only)
drop policy if exists "scd_person_events_select_direction" on public.scd_person_events;
create policy "scd_person_events_select_direction" on public.scd_person_events
for select to authenticated
using (public.scd_has_org_role(organization_id, array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role]));
drop policy if exists "scd_person_events_insert_direction" on public.scd_person_events;
create policy "scd_person_events_insert_direction" on public.scd_person_events
for insert to authenticated
with check (public.scd_has_org_role(organization_id, array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role]));

-- consents: DIRECTION/SECRETARIAT read and write; the person (or guardian) may read their own later (r60)
drop policy if exists "scd_person_consents_direction" on public.scd_person_consents;
create policy "scd_person_consents_direction" on public.scd_person_consents
for all to authenticated
using (public.scd_has_org_role(organization_id, array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role]))
with check (public.scd_has_org_role(organization_id, array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role]));

-- table privileges (RLS above decides the rows; Supabase default privileges may not cover new tables)
grant select, insert, update, delete on public.scd_structure_roles to authenticated;
grant select, insert on public.scd_person_events to authenticated;
grant select, insert, update, delete on public.scd_person_consents to authenticated;
grant select on public.scd_v_people_active, public.scd_v_structure_active, public.scd_v_structure_public to authenticated;
grant select on public.scd_v_structure_public to anon;
revoke all on public.scd_structure_roles, public.scd_person_events, public.scd_person_consents from anon;

-- updated_at maintenance
create or replace function public.scd_touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists scd_structure_roles_touch on public.scd_structure_roles;
create trigger scd_structure_roles_touch before update on public.scd_structure_roles
for each row execute function public.scd_touch_updated_at();

commit;
