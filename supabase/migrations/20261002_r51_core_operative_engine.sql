-- R51 — SCD Core Operative Engine
-- Additive migration aligned with the existing Club Graph.
-- Keeps scd_events as the canonical event source and avoids duplicate medical-state storage.

alter table public.scd_people
  add column if not exists fiscal_code text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'scd_people_fiscal_code_format_chk'
      and conrelid = 'public.scd_people'::regclass
  ) then
    alter table public.scd_people
      add constraint scd_people_fiscal_code_format_chk
      check (fiscal_code is null or upper(fiscal_code) ~ '^[A-Z0-9]{16}$');
  end if;
end $$;

create unique index if not exists scd_people_org_fiscal_code_uq
  on public.scd_people (organization_id, upper(fiscal_code))
  where fiscal_code is not null;

create table if not exists public.scd_person_roles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  person_id uuid not null references public.scd_people(id) on delete cascade,
  role text not null check (role in ('ATHLETE','COACH','MANAGER','MEDICAL_STAFF','PARENT','VOLUNTEER')),
  active boolean not null default true,
  valid_from date,
  valid_to date,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (valid_to is null or valid_from is null or valid_to >= valid_from)
);

create unique index if not exists scd_person_roles_active_uq
  on public.scd_person_roles (organization_id, person_id, role)
  where active;

create index if not exists scd_person_roles_person_idx
  on public.scd_person_roles (person_id, active);

create table if not exists public.scd_tesseramenti (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  person_id uuid not null references public.scd_people(id) on delete cascade,
  season_id uuid not null references public.scd_seasons(id) on delete cascade,
  category_id uuid references public.scd_categories(id) on delete set null,
  team_id uuid references public.scd_teams(id) on delete set null,
  figc_category_name text,
  portal_status text not null default 'IN_LAVORAZIONE'
    check (portal_status in ('IN_LAVORAZIONE','DOCUMENTI_CARICATI','FIRMATO_ELETTRONICAMENTE','APPROVATO_FIGC','RESPINTO')),
  quota_iscrizione_pagata numeric(10,2) not null default 0
    check (quota_iscrizione_pagata >= 0),
  sport_relationship_type text not null default 'NESSUNO'
    check (sport_relationship_type in ('VOLONTARIO','CO_CO_CO_SPORTIVO','NESSUNO')),
  source_id text not null default 'UNVERIFIED',
  source_record_id text,
  source_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists scd_tesseramenti_person_season_team_uq
  on public.scd_tesseramenti (
    organization_id,
    season_id,
    person_id,
    coalesce(team_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

create index if not exists scd_tesseramenti_status_idx
  on public.scd_tesseramenti (organization_id, portal_status);

create table if not exists public.scd_matches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  event_id uuid not null unique references public.scd_events(id) on delete cascade,
  campionato_name text not null,
  home_team text not null,
  away_team text not null,
  venue_name text not null,
  google_maps_url text,
  tuttocampo_match_id text,
  convocazioni_status text not null default 'DA_COMPILARE'
    check (convocazioni_status in ('DA_COMPILARE','INVIATE','CHIUSE')),
  source_id text not null default 'UNVERIFIED',
  source_record_id text,
  source_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists scd_matches_tuttocampo_uq
  on public.scd_matches (organization_id, tuttocampo_match_id)
  where tuttocampo_match_id is not null;

create index if not exists scd_matches_org_event_idx
  on public.scd_matches (organization_id, event_id);

alter table public.scd_person_roles enable row level security;
alter table public.scd_tesseramenti enable row level security;
alter table public.scd_matches enable row level security;

revoke all on table public.scd_person_roles from anon, authenticated;
revoke all on table public.scd_tesseramenti from anon, authenticated;
revoke all on table public.scd_matches from anon, authenticated;

grant select, insert, update, delete on table public.scd_person_roles to authenticated;
grant select, insert, update, delete on table public.scd_tesseramenti to authenticated;
grant select, insert, update, delete on table public.scd_matches to authenticated;

create policy "scd_person_roles_select_member" on public.scd_person_roles
for select to authenticated
using (public.scd_is_org_member(organization_id));

create policy "scd_person_roles_insert_secretariat" on public.scd_person_roles
for insert to authenticated
with check (public.scd_has_org_role(organization_id,array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role]));

create policy "scd_person_roles_update_secretariat" on public.scd_person_roles
for update to authenticated
using (public.scd_has_org_role(organization_id,array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role]))
with check (public.scd_has_org_role(organization_id,array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role]));

create policy "scd_person_roles_delete_secretariat" on public.scd_person_roles
for delete to authenticated
using (public.scd_has_org_role(organization_id,array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role]));

create policy "scd_tesseramenti_select_member" on public.scd_tesseramenti
for select to authenticated
using (public.scd_is_org_member(organization_id));

create policy "scd_tesseramenti_insert_registration" on public.scd_tesseramenti
for insert to authenticated
with check (public.scd_has_org_role(organization_id,array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role,'REGISTRATION'::public.scd_role]));

create policy "scd_tesseramenti_update_registration" on public.scd_tesseramenti
for update to authenticated
using (public.scd_has_org_role(organization_id,array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role,'REGISTRATION'::public.scd_role]))
with check (public.scd_has_org_role(organization_id,array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role,'REGISTRATION'::public.scd_role]));

create policy "scd_tesseramenti_delete_registration" on public.scd_tesseramenti
for delete to authenticated
using (public.scd_has_org_role(organization_id,array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role,'REGISTRATION'::public.scd_role]));

create policy "scd_matches_select_member" on public.scd_matches
for select to authenticated
using (public.scd_is_org_member(organization_id));

create policy "scd_matches_insert_staff" on public.scd_matches
for insert to authenticated
with check (public.scd_has_org_role(organization_id,array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role,'STAFF'::public.scd_role,'MISTER'::public.scd_role,'TOURNAMENTS'::public.scd_role]));

create policy "scd_matches_update_staff" on public.scd_matches
for update to authenticated
using (public.scd_has_org_role(organization_id,array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role,'STAFF'::public.scd_role,'MISTER'::public.scd_role,'TOURNAMENTS'::public.scd_role]))
with check (public.scd_has_org_role(organization_id,array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role,'STAFF'::public.scd_role,'MISTER'::public.scd_role,'TOURNAMENTS'::public.scd_role]));

create policy "scd_matches_delete_staff" on public.scd_matches
for delete to authenticated
using (public.scd_has_org_role(organization_id,array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role,'STAFF'::public.scd_role,'MISTER'::public.scd_role,'TOURNAMENTS'::public.scd_role]));

create or replace view public.scd_secretariat_alerts_v
with (security_invoker = true)
as
select
  t.id as registration_id,
  t.organization_id,
  p.id as person_id,
  coalesce(c.name, t.figc_category_name, tm.name, 'Categoria non indicata') as categoria,
  trim(p.first_name || ' ' || p.last_name) as athlete_name,
  t.portal_status,
  a.medical_certificate_expires_at,
  case
    when t.portal_status = 'RESPINTO' then 'critical'
    when a.medical_certificate_expires_at is null then 'critical'
    when a.medical_certificate_expires_at < current_date then 'critical'
    when a.medical_certificate_expires_at <= current_date + 30 then 'warning'
    when t.portal_status <> 'APPROVATO_FIGC' then 'warning'
    else 'ok'
  end as severity,
  case
    when t.portal_status = 'RESPINTO' then 'Tesseramento respinto: verifica documenti e motivazione sul portale LND/FIGC.'
    when a.medical_certificate_expires_at is null then 'Certificato medico non censito.'
    when a.medical_certificate_expires_at < current_date then 'Certificato medico scaduto.'
    when a.medical_certificate_expires_at <= current_date + 30 then 'Certificato medico in scadenza entro 30 giorni.'
    when t.portal_status <> 'APPROVATO_FIGC' then 'Tesseramento non ancora approvato FIGC.'
    else 'Nessuna anomalia.'
  end as message
from public.scd_tesseramenti t
join public.scd_people p on p.id = t.person_id
left join public.scd_athletes a
  on a.organization_id = t.organization_id
 and a.person_id = t.person_id
left join public.scd_categories c on c.id = t.category_id
left join public.scd_teams tm on tm.id = t.team_id
where
  t.portal_status <> 'APPROVATO_FIGC'
  or a.medical_certificate_expires_at is null
  or a.medical_certificate_expires_at <= current_date + 30;

create or replace view public.scd_match_day_v
with (security_invoker = true)
as
select
  m.id,
  m.organization_id,
  m.event_id,
  m.campionato_name,
  e.starts_at as match_date,
  m.home_team,
  m.away_team,
  m.venue_name,
  m.google_maps_url,
  m.tuttocampo_match_id,
  m.convocazioni_status,
  e.status as event_status,
  e.visibility,
  e.source_id as event_source_id,
  e.source_record_id as event_source_record_id,
  e.source_verified_at as event_source_verified_at,
  m.source_id as match_source_id,
  m.source_record_id as match_source_record_id,
  m.source_verified_at as match_source_verified_at
from public.scd_matches m
join public.scd_events e on e.id = m.event_id;

revoke all on table public.scd_secretariat_alerts_v from anon, authenticated;
revoke all on table public.scd_match_day_v from anon, authenticated;
grant select on table public.scd_secretariat_alerts_v to authenticated;
grant select on table public.scd_match_day_v to authenticated;

comment on table public.scd_tesseramenti is 'Operational LND/FIGC registration state. Medical expiry stays canonical in scd_athletes.';
comment on table public.scd_matches is 'Match-specific extension of canonical scd_events EVENT_ID.';
comment on view public.scd_secretariat_alerts_v is 'Derived compliance alerts; current-date state is calculated at read time, never stored.';
comment on view public.scd_match_day_v is 'Match-day projection over canonical event data.';
