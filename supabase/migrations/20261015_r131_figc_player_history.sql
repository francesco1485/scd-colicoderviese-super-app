-- r131: "Storia dei calciatori" — FIGC/LND season tabulati and per-player career history ("Storico calciatore")
-- (2026-10-15, chat PC range r130-r149). STAGED: NOT applied.
-- Apply only after Francesco writes "applica". Requires r33 (scd_organizations, scd_people, scd_audit_events,
-- scd_has_org_role, scd_role) and r51 (scd_tesseramenti.source_record_id) already applied.
--
-- Why: the Direzione wants the history of the club's players, season by season — who stays, who comes back, who
-- arrives and from which club, who left — always available in the Super App (/segreteria/storia).
-- Engines: PERSONE (retention and recovery of players and families) and TEMPO (no manual reconciliation of the
-- portal pages by the Segreteria).
--
-- Source: the FIGC/LND portal (iscrizioni.lnd.it), read by the Segreteria in its own logged-in browser with the
-- export script of apps/superapp/src/lib/figc-export-script.ts; the JSON file is validated by
-- apps/superapp/src/lib/figc-history.ts and passed to scd_figc_history_import below.
--
-- Minimisation: birth YEAR only (no birth date), no fiscal code, no contacts, no address. FIGC number (matricola)
-- is the key. These tables never change scd_people / scd_tesseramenti: they only link person_id when the match is
-- certain (same FIGC number in scd_tesseramenti.source_record_id, or exactly one person with the same name and birth
-- year in the same organization).
--
-- Access: RLS on, SELECT for DIRECTION and SECRETARIAT of the organization only, no INSERT/UPDATE/DELETE policy:
-- writes go only through the SECURITY DEFINER function, which checks the role and writes one audit row (counts only).
--
-- Rollback:
--   drop function if exists public.scd_figc_history_import(uuid, timestamptz, jsonb, jsonb);
--   drop table if exists public.scd_figc_career;
--   drop table if exists public.scd_figc_roster;

create table if not exists public.scd_figc_roster (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  season text not null check (season ~ '^\d{4}/\d{4}$'),
  matricola text not null check (matricola ~ '^\d{5,8}$'),
  sector text not null check (sector in ('D', 'S')),
  last_name text not null check (char_length(last_name) between 1 and 80),
  first_name text not null check (char_length(first_name) between 0 and 80),
  birth_year int check (birth_year between 1900 and 2100),
  person_id uuid references public.scd_people(id) on delete set null,
  read_at timestamptz not null,
  unique (organization_id, season, matricola)
);

comment on table public.scd_figc_roster is
  'r131: FIGC/LND tabulato rows per season (Dilettanti D, Settore Giovanile S). Birth year only, no fiscal code. Writes only via scd_figc_history_import.';

create index if not exists scd_figc_roster_matricola_idx on public.scd_figc_roster (organization_id, matricola);
create index if not exists scd_figc_roster_person_idx on public.scd_figc_roster (person_id) where person_id is not null;

create table if not exists public.scd_figc_career (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  matricola text not null check (matricola ~ '^\d{5,8}$'),
  season text not null check (season ~ '^\d{4}/\d{4}$'),
  movement_code text not null check (movement_code ~ '^[A-Z0-9]{2}$'),
  movement_label text not null check (char_length(movement_label) <= 120),
  club_code text not null check (club_code ~ '^[0-9]{1,10}$'),
  club_name text not null check (char_length(club_name) <= 160),
  is_own_club boolean not null,
  status_code text check (status_code is null or char_length(status_code) <= 60),
  event_date date,
  release_code text check (release_code is null or char_length(release_code) <= 8),
  release_date date,
  read_at timestamptz not null
);

comment on table public.scd_figc_career is
  'r131: FIGC "Storico calciatore" rows per FIGC number (movement, club, status, date, release). Writes only via scd_figc_history_import.';

create unique index if not exists scd_figc_career_uq
  on public.scd_figc_career (organization_id, matricola, season, club_code, movement_code, event_date)
  nulls not distinct;

alter table public.scd_figc_roster enable row level security;
alter table public.scd_figc_career enable row level security;

drop policy if exists scd_figc_roster_read on public.scd_figc_roster;
create policy scd_figc_roster_read on public.scd_figc_roster
  for select to authenticated
  using (public.scd_has_org_role(organization_id, array['DIRECTION', 'SECRETARIAT']::public.scd_role[]));

drop policy if exists scd_figc_career_read on public.scd_figc_career;
create policy scd_figc_career_read on public.scd_figc_career
  for select to authenticated
  using (public.scd_has_org_role(organization_id, array['DIRECTION', 'SECRETARIAT']::public.scd_role[]));

revoke all on public.scd_figc_roster from anon, public;
revoke all on public.scd_figc_career from anon, public;
revoke insert, update, delete, truncate on public.scd_figc_roster from authenticated;
revoke insert, update, delete, truncate on public.scd_figc_career from authenticated;
grant select on public.scd_figc_roster to authenticated;
grant select on public.scd_figc_career to authenticated;

create or replace function public.scd_figc_history_import(
  p_organization_id uuid,
  p_read_at timestamptz,
  p_roster jsonb,
  p_career jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_roster int := 0;
  v_career int := 0;
  v_linked_t int := 0;
  v_linked_n int := 0;
  v_bad int;
begin
  if p_organization_id is null
     or not public.scd_has_org_role(p_organization_id, array['DIRECTION', 'SECRETARIAT']::public.scd_role[]) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_read_at is null or p_read_at > now() + interval '1 day' or p_read_at < timestamptz '2000-01-01' then
    raise exception 'invalid read_at' using errcode = '22023';
  end if;
  if p_roster is null or jsonb_typeof(p_roster) <> 'array' or p_career is null or jsonb_typeof(p_career) <> 'array' then
    raise exception 'roster and career must be arrays' using errcode = '22023';
  end if;
  if jsonb_array_length(p_roster) > 2000 or jsonb_array_length(p_career) > 20000 then
    raise exception 'too many rows' using errcode = '22023';
  end if;

  -- Validation: every row must be an object with the expected formats (no free shape enters the tables).
  select count(*) into v_bad
  from jsonb_array_elements(p_roster) r
  where jsonb_typeof(r) <> 'object'
     or coalesce(r->>'season', '') !~ '^\d{4}/\d{4}$'
     or coalesce(r->>'matricola', '') !~ '^\d{5,8}$'
     or coalesce(r->>'sector', '') not in ('D', 'S')
     or char_length(coalesce(r->>'last_name', '')) not between 1 and 80
     or char_length(coalesce(r->>'first_name', '')) > 80
     or case coalesce(jsonb_typeof(r->'birth_year'), 'null')
          when 'null' then false
          when 'number' then (r->>'birth_year')::numeric not between 1900 and 2100
                             or (r->>'birth_year')::numeric <> trunc((r->>'birth_year')::numeric)
          else true
        end
     or r ? 'birth_date'
     or r ? 'fiscal_code';
  if v_bad > 0 then
    raise exception 'invalid roster rows: %', v_bad using errcode = '22023';
  end if;

  select count(*) into v_bad
  from jsonb_array_elements(p_career) c
  where jsonb_typeof(c) <> 'object'
     or coalesce(c->>'season', '') !~ '^\d{4}/\d{4}$'
     or coalesce(c->>'matricola', '') !~ '^\d{5,8}$'
     or coalesce(c->>'movement_code', '') !~ '^[A-Z0-9]{2}$'
     or char_length(coalesce(c->>'movement_label', '')) > 120
     or coalesce(c->>'club_code', '') !~ '^[0-9]{1,10}$'
     or char_length(coalesce(c->>'club_name', '')) > 160
     or jsonb_typeof(c->'is_own_club') is distinct from 'boolean'
     or char_length(coalesce(c->>'status_code', '')) > 60
     or (c->>'event_date' is not null and c->>'event_date' !~ '^\d{4}-\d{2}-\d{2}$')
     or (c->>'release_date' is not null and c->>'release_date' !~ '^\d{4}-\d{2}-\d{2}$')
     or char_length(coalesce(c->>'release_code', '')) > 8;
  if v_bad > 0 then
    raise exception 'invalid career rows: %', v_bad using errcode = '22023';
  end if;

  with src as (
    select distinct on (r->>'season', r->>'matricola')
      r->>'season' as season,
      r->>'matricola' as matricola,
      r->>'sector' as sector,
      r->>'last_name' as last_name,
      coalesce(r->>'first_name', '') as first_name,
      (r->>'birth_year')::int as birth_year
    from jsonb_array_elements(p_roster) r
    order by r->>'season', r->>'matricola'
  ), up as (
    insert into public.scd_figc_roster as t (organization_id, season, matricola, sector, last_name, first_name, birth_year, read_at)
    select p_organization_id, s.season, s.matricola, s.sector, s.last_name, s.first_name, s.birth_year, p_read_at
    from src s
    on conflict (organization_id, season, matricola) do update
      set sector = excluded.sector,
          last_name = excluded.last_name,
          first_name = excluded.first_name,
          birth_year = coalesce(excluded.birth_year, t.birth_year),
          read_at = greatest(t.read_at, excluded.read_at)
    returning 1
  )
  select count(*) into v_roster from up;

  with src as (
    select distinct on (c->>'matricola', c->>'season', c->>'club_code', c->>'movement_code', c->>'event_date')
      c->>'matricola' as matricola,
      c->>'season' as season,
      c->>'movement_code' as movement_code,
      coalesce(c->>'movement_label', '') as movement_label,
      c->>'club_code' as club_code,
      coalesce(c->>'club_name', '') as club_name,
      (c->>'is_own_club')::boolean as is_own_club,
      nullif(c->>'status_code', '') as status_code,
      (c->>'event_date')::date as event_date,
      nullif(c->>'release_code', '') as release_code,
      (c->>'release_date')::date as release_date
    from jsonb_array_elements(p_career) c
    order by c->>'matricola', c->>'season', c->>'club_code', c->>'movement_code', c->>'event_date',
             (c->>'release_code') is null, (c->>'status_code') is null
  ), up as (
    insert into public.scd_figc_career as t (organization_id, matricola, season, movement_code, movement_label, club_code, club_name,
                                             is_own_club, status_code, event_date, release_code, release_date, read_at)
    select p_organization_id, s.matricola, s.season, s.movement_code, s.movement_label, s.club_code, s.club_name,
           s.is_own_club, s.status_code, s.event_date, s.release_code, s.release_date, p_read_at
    from src s
    on conflict (organization_id, matricola, season, club_code, movement_code, event_date) do update
      set read_at = greatest(t.read_at, excluded.read_at),
          movement_label = excluded.movement_label,
          club_name = excluded.club_name,
          status_code = coalesce(excluded.status_code, t.status_code),
          release_code = coalesce(excluded.release_code, t.release_code),
          release_date = coalesce(excluded.release_date, t.release_date)
    returning 1
  )
  select count(*) into v_career from up;

  -- Link 1: same FIGC number already recorded on a tesseramento of the same organization.
  with m as (
    select distinct on (ro.id) ro.id, te.person_id
    from public.scd_figc_roster ro
    join public.scd_tesseramenti te
      on te.organization_id = ro.organization_id and te.source_record_id = ro.matricola
    where ro.organization_id = p_organization_id and ro.person_id is null
    order by ro.id, te.updated_at desc
  ), u as (
    update public.scd_figc_roster ro set person_id = m.person_id from m where ro.id = m.id returning 1
  )
  select count(*) into v_linked_t from u;

  -- Link 2: exactly one person of the organization with the same surname, name and birth year.
  with cand as (
    select ro.id, p.id as person_id, count(*) over (partition by ro.id) as n
    from public.scd_figc_roster ro
    join public.scd_people p
      on p.organization_id = ro.organization_id
     and lower(p.last_name) = lower(ro.last_name)
     and lower(p.first_name) = lower(ro.first_name)
     and p.birth_date is not null
     and extract(year from p.birth_date)::int = ro.birth_year
    where ro.organization_id = p_organization_id and ro.person_id is null and ro.birth_year is not null
  ), u as (
    update public.scd_figc_roster ro set person_id = cand.person_id from cand where ro.id = cand.id and cand.n = 1 returning 1
  )
  select count(*) into v_linked_n from u;

  insert into public.scd_audit_events (organization_id, actor_user_id, action, entity_type, entity_id, payload)
  values (p_organization_id, (select auth.uid()), 'FIGC_HISTORY_IMPORT', 'scd_figc_roster', null,
          jsonb_build_object('roster', v_roster, 'career', v_career, 'linked', v_linked_t + v_linked_n, 'read_at', p_read_at));

  return jsonb_build_object('roster', v_roster, 'career', v_career, 'linked', v_linked_t + v_linked_n);
end;
$$;

revoke all on function public.scd_figc_history_import(uuid, timestamptz, jsonb, jsonb) from public, anon;
grant execute on function public.scd_figc_history_import(uuid, timestamptz, jsonb, jsonb) to authenticated;
