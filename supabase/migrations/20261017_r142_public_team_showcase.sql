-- r142: public team showcase («vetrina squadre») for Prima Squadra, Juniores U19 Élite and Allievi U16 Élite, plus the
-- mister's «Ruoli della rosa» write path, 2026-10-17, chat PC (range r130-r149; r141 is held by feat/rubrica-staff).
-- STAGED: NOT APPLIED. Apply only after Francesco writes "applica r142". Never apply from an agent.
-- Target: SCD PULSE (ndevtxxijbcnskgysdit). Never on dfnwzwutvnwiitiffwvr.
-- Requires (r33, r51, r59, r61, r62, r70, r92): scd_teams, scd_seasons, scd_team_memberships, scd_athletes.fanta_role,
-- scd_people, scd_family_members, scd_person_consents, scd_structure_roles, scd_matches, scd_events,
-- scd_match_performance, scd_match_team_stats, scd_match_sheets, scd_audit_events, scd_has_org_role, scd_my_team_ids,
-- scd_my_person_ids. A guard below stops the migration when one of them is missing.
--
-- Why (Francesco, Direttore Generale, 17/10/2026 11:27, rule set approved 11:28 «ok vetrina squadre»; UD-168):
--   «prima squadra e juniores e u16 elite li darei pubblici in nomi dei calciatori e ruoli e info e statistiche sempre
--   a tutti senza registrazione». Rules:
--   * public, no login, ONLY team codes prima, u19, u16 of the active season;
--   * adults (18+ on the day, from scd_people.birth_date): first name + surname, role, shirt number if recorded, stats;
--   * minors (<18) and people whose birth date is unknown: first name + surname initial («Luca R.»), role, stats.
--     Full name only with a recorded consent: IMMAGINE_NOME granted, not revoked, given by a guardian of the same
--     family (scd_family_members.is_guardian); from 14 years also a second, own consent row of the player. With the
--     r132 "one active choice per person and type" index the two rows cannot coexist, so 14-17 year olds stay
--     «nome + iniziale» until the consent model gets a co-signature (fail closed, by design). No photos at all;
--   * never birth dates, ages, birth years, towns, contacts, fiscal codes or internal ids in the payload (players get a
--     positional key "p1", "p2", ...);
--   * stats only from recorded matches of the team in the active season (r92 tabellino: scd_match_performance with a
--     saved scd_match_team_stats row): presenze (minutes > 0), gol, ammonizioni, espulsioni. A player without any
--     recorded row gets stats null (the page writes «da confermare», never 0: UNKNOWN != ZERO);
--   * role = scd_athletes.fanta_role (P/D/C/A, r92) or null («ruolo da confermare»);
--   * staff of the team (scd_structure_roles, the organigram registry r59, seeded by r141): adults only, name and
--     role label, never phone or e-mail. Labels that look like a phone number or an e-mail are not returned.
--
-- What it adds (no new table, no new column, no new login, no parallel registry):
--   1. scd_showcase_full_name(person_id, birth_date) -> boolean: internal helper of the name rule (no grant).
--   2. scd_public_team_showcase(org_slug, team_code) -> jsonb: the ONE public read of the showcase (anon, authenticated).
--   3. scd_staff_team_roles(org, team_id) -> jsonb [{athleteId, role}]: current roles of the caller's team
--      (scd_my_team_ids: staff of that team or office roles), for the mister desk.
--   4. scd_staff_set_team_roles(org, team_id, rows) -> integer: the mister of that team (structure role MISTER, active)
--      or the Direzione sets P/D/C/A or clears it (null) for athletes currently in the team. Writes only
--      scd_athletes.fanta_role (the column r92 already writes from the tabellino) and one audit row with COUNTS only.
--
-- Security: SECURITY DEFINER with fixed search_path; the showcase is the only function executable by anon and returns
-- only the whitelisted fields above; 3 and 4 check the caller with auth.uid() and are not executable by anon.
-- Engines: PERSONE (families, fans and scouts find the three élite rosters without signing up) and TEMPO (rosters and
-- roles maintained once by the mister, no manual lists for the press or the social pages).
-- Measure: visits to /squadre/prima, /squadre/u19, /squadre/u16 (Meta analytics, platform 22); share of players with a
-- role (scd_athletes.fanta_role not null over current memberships of the three teams, today 0 of 315 athletes);
-- ROSTER_ROLES_SET audit rows per team; share of players with recorded stats.
--
-- Additive and idempotent (create or replace). Existing rows are never deleted; only fanta_role changes, through 4.
--
-- Rollback (only on Francesco's explicit order; roles already set by the misters stay in fanta_role):
--   begin;
--   drop function if exists public.scd_staff_set_team_roles(uuid, uuid, jsonb);
--   drop function if exists public.scd_staff_team_roles(uuid, uuid);
--   drop function if exists public.scd_public_team_showcase(text, text);
--   drop function if exists public.scd_showcase_full_name(uuid, date);
--   commit;

begin;

-- ---------------------------------------------------------------- 0. prerequisites (fail closed)
do $$
begin
  if to_regclass('public.scd_teams') is null
     or to_regclass('public.scd_seasons') is null
     or to_regclass('public.scd_team_memberships') is null
     or to_regclass('public.scd_athletes') is null
     or to_regclass('public.scd_people') is null
     or to_regclass('public.scd_family_members') is null
     or to_regclass('public.scd_person_consents') is null
     or to_regclass('public.scd_structure_roles') is null
     or to_regclass('public.scd_matches') is null
     or to_regclass('public.scd_events') is null
     or to_regclass('public.scd_match_performance') is null
     or to_regclass('public.scd_match_team_stats') is null
     or to_regclass('public.scd_match_sheets') is null
     or to_regclass('public.scd_audit_events') is null
     or to_regclass('public.scd_organizations') is null
     or to_regprocedure('public.scd_has_org_role(uuid, public.scd_role[])') is null
     or to_regprocedure('public.scd_my_team_ids(uuid)') is null
     or to_regprocedure('public.scd_my_person_ids(uuid)') is null
     or not exists (select 1 from information_schema.columns
                    where table_schema = 'public' and table_name = 'scd_athletes' and column_name = 'fanta_role') then
    raise exception 'r142 prerequisites missing (r33, r51, r59, r61, r62, r70, r92)';
  end if;
end;
$$;

-- ---------------------------------------------------------------- 1. name rule (internal)
-- true = first name + surname may be shown in public. Adults: yes. Unknown birth date: no (treated as a minor).
-- Minors: a guardian consent IMMAGINE_NOME (granted, not revoked, given by a guardian of the same family) and, from
-- 14 years, also an own consent row of the player (given by the player or with no giver). Photos are never returned.
create or replace function public.scd_showcase_full_name(p_person_id uuid, p_birth_date date)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select case
    when p_birth_date is null then false
    when p_birth_date <= current_date - interval '18 years' then true
    else exists (
        select 1
        from public.scd_person_consents c
        where c.person_id = p_person_id and c.consent_type = 'IMMAGINE_NOME' and c.granted and c.revoked_at is null
          and c.given_by_person_id is not null and c.given_by_person_id <> p_person_id
          and exists (
            select 1
            from public.scd_family_members g
            join public.scd_family_members k on k.family_id = g.family_id and k.person_id = p_person_id
            where g.person_id = c.given_by_person_id and g.is_guardian))
      and (
        p_birth_date > current_date - interval '14 years'
        or exists (
          select 1
          from public.scd_person_consents s
          where s.person_id = p_person_id and s.consent_type = 'IMMAGINE_NOME' and s.granted and s.revoked_at is null
            and (s.given_by_person_id is null or s.given_by_person_id = p_person_id)))
  end;
$$;
revoke all on function public.scd_showcase_full_name(uuid, date) from public, anon, authenticated;

-- ---------------------------------------------------------------- 2. public showcase (anon)
create or replace function public.scd_public_team_showcase(p_org_slug text, p_team_code text)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  with org as (
    select id from public.scd_organizations where slug = p_org_slug
  ),
  code as (
    select lower(coalesce(p_team_code, '')) as code
  ),
  team as (
    select t.id, t.code, s.code as season, s.starts_on, s.ends_on
    from public.scd_teams t
    cross join org
    cross join code
    join public.scd_seasons s on s.id = t.season_id and s.active
    where t.organization_id = org.id and t.code = code.code and t.status = 'ACTIVE'
      and code.code in ('prima', 'u19', 'u16')
    order by t.created_at desc
    limit 1
  ),
  team_matches as (
    select m.id as match_id, e.starts_at
    from team
    join public.scd_events e on nullif(e.metadata->>'team_id', '')::uuid = team.id
      and e.starts_at >= team.starts_on and e.starts_at < team.ends_on + 1
    join public.scd_matches m on m.event_id = e.id
  ),
  recorded as (
    select tm.match_id
    from team_matches tm
    join team on true
    where exists (select 1 from public.scd_match_team_stats ts
                  where ts.match_id = tm.match_id and ts.is_scd_team and ts.team_id = team.id)
  ),
  roster as (
    select a.id as athlete_id, p.id as person_id, a.fanta_role,
      public.scd_showcase_full_name(p.id, p.birth_date) as full_name,
      p.birth_date is not null and p.birth_date <= current_date - interval '18 years' as adult,
      trim(coalesce(p.first_name, '')) as first_name,
      trim(coalesce(p.last_name, '')) as last_name
    from team
    join public.scd_team_memberships tm on tm.team_id = team.id
      and (tm.valid_to is null or tm.valid_to >= current_date)
    join public.scd_athletes a on a.id = tm.athlete_id
    join public.scd_people p on p.id = a.person_id
    where p.left_at is null and coalesce(p.status, 'ACTIVE') = 'ACTIVE'
  ),
  shown as (
    select r.athlete_id, r.fanta_role, r.adult,
      case when r.full_name then trim(r.first_name || ' ' || r.last_name)
           when r.last_name = '' then r.first_name
           else trim(r.first_name || ' ' || upper(left(r.last_name, 1)) || '.') end as name
    from roster r
    where r.first_name <> ''
  ),
  stats as (
    select mp.athlete_id,
      count(*)::integer as matches,
      count(*) filter (where mp.minutes_played > 0)::integer as appearances,
      sum(mp.goals)::integer as goals,
      sum(mp.yellow_cards)::integer as yellow,
      count(*) filter (where mp.red_card)::integer as red
    from public.scd_match_performance mp
    join recorded rc on rc.match_id = mp.match_id
    group by mp.athlete_id
  ),
  shirts as (
    select distinct on ((pl->>'athlete_id')) (pl->>'athlete_id') as athlete_id, (pl->>'shirt')::integer as shirt
    from team_matches tm
    join public.scd_match_sheets ms on ms.match_id = tm.match_id
    cross join lateral jsonb_array_elements(ms.players) pl
    where (pl->>'shirt') ~ '^[0-9]{1,2}$' and (pl->>'shirt')::integer between 1 and 99
    order by (pl->>'athlete_id'), tm.starts_at desc, ms.updated_at desc
  ),
  ordered as (
    select s.*, st.matches, st.appearances, st.goals, st.yellow, st.red,
      case when s.adult then sh.shirt else null end as shirt,
      row_number() over (order by
        case s.fanta_role when 'P' then 0 when 'D' then 1 when 'C' then 2 when 'A' then 3 else 9 end,
        case when s.adult then sh.shirt else null end nulls last, s.name) as ord
    from shown s
    left join stats st on st.athlete_id = s.athlete_id
    left join shirts sh on sh.athlete_id = s.athlete_id::text
  ),
  staff as (
    select distinct on (p.id, r.role_label)
      trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')) as name,
      r.role_label as role,
      case r.role_kind when 'MISTER' then 0 when 'STAFF' then 1 when 'DIRIGENTE' then 2 else 3 end as rank
    from team
    join public.scd_structure_roles r on r.team_id = team.id and r.active and r.show_in_app
      and (r.valid_to is null or r.valid_to >= current_date)
      and r.role_kind in ('MISTER', 'DIRIGENTE', 'STAFF', 'RESPONSABILE')
    join public.scd_people p on p.id = r.person_id
    where p.left_at is null and coalesce(p.status, 'ACTIVE') = 'ACTIVE'
      and p.birth_date is not null and p.birth_date <= current_date - interval '18 years'
      and r.role_label !~ '@' and r.role_label !~ '[0-9][0-9 ./-]{5,}'
      and trim(coalesce(p.first_name, '') || coalesce(p.last_name, '')) <> ''
    order by p.id, r.role_label
  )
  select case when not exists (select 1 from team) then
    jsonb_build_object('team', (select code from code), 'available', false)
  else jsonb_build_object(
    'team', (select code from team),
    'available', true,
    'season', (select season from team),
    'count', (select count(*) from shown),
    'matchesRecorded', (select count(*) from recorded),
    'players', coalesce((
      select jsonb_agg(jsonb_build_object(
          'key', 'p' || o.ord,
          'name', o.name,
          'role', case when o.fanta_role in ('P', 'D', 'C', 'A') then o.fanta_role else null end,
          'shirt', o.shirt,
          'stats', case when o.matches is null then null else jsonb_build_object(
            'matches', o.matches, 'appearances', o.appearances, 'goals', o.goals, 'yellow', o.yellow, 'red', o.red) end)
        order by o.ord)
      from ordered o), '[]'::jsonb),
    'staff', coalesce((
      select jsonb_agg(jsonb_build_object('name', st.name, 'role', st.role) order by st.rank, st.role, st.name)
      from staff st), '[]'::jsonb))
  end;
$$;
revoke all on function public.scd_public_team_showcase(text, text) from public;
grant execute on function public.scd_public_team_showcase(text, text) to anon, authenticated;

-- ---------------------------------------------------------------- 3. roles of the caller's team (mister desk)
create or replace function public.scd_staff_team_roles(p_organization_id uuid, p_team_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
begin
  if p_team_id is null or p_team_id not in (select public.scd_my_team_ids(p_organization_id)) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('athleteId', a.id, 'role', a.fanta_role) order by a.id)
    from public.scd_team_memberships tm
    join public.scd_athletes a on a.id = tm.athlete_id and a.organization_id = p_organization_id
    where tm.team_id = p_team_id and (tm.valid_to is null or tm.valid_to >= current_date)), '[]'::jsonb);
end;
$$;
revoke all on function public.scd_staff_team_roles(uuid, uuid) from public, anon;
grant execute on function public.scd_staff_team_roles(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------- 4. «Ruoli della rosa» (mister of the team or Direzione)
-- rows: [{"athlete_id": uuid, "role": "P"|"D"|"C"|"A"|null}], max 60, each athlete once, each in the team now.
create or replace function public.scd_staff_set_team_roles(p_organization_id uuid, p_team_id uuid, p_rows jsonb)
returns integer
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v_changed integer;
  v_n integer;
begin
  if p_team_id is null or not exists (
      select 1 from public.scd_teams t where t.id = p_team_id and t.organization_id = p_organization_id) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if not (
    public.scd_has_org_role(p_organization_id, array['DIRECTION']::public.scd_role[])
    or exists (
      select 1 from public.scd_structure_roles r
      where r.team_id = p_team_id and r.organization_id = p_organization_id and r.active and r.role_kind = 'MISTER'
        and (r.valid_to is null or r.valid_to >= current_date)
        and r.person_id in (select public.scd_my_person_ids(p_organization_id)))
  ) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 or jsonb_array_length(p_rows) > 60 then
    raise exception 'invalid rows' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_rows) x
    where jsonb_typeof(x) <> 'object'
       or coalesce(x->>'athlete_id', '') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       or not (x ? 'role')
       or (jsonb_typeof(x->'role') <> 'null' and coalesce(x->>'role', '') not in ('P', 'D', 'C', 'A'))
  ) then
    raise exception 'invalid row' using errcode = '22023';
  end if;
  select count(*) into v_n from jsonb_array_elements(p_rows);
  if (select count(distinct x->>'athlete_id') from jsonb_array_elements(p_rows) x) <> v_n then
    raise exception 'duplicate athlete' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_rows) x
    where not exists (
      select 1 from public.scd_team_memberships tm
      join public.scd_athletes a on a.id = tm.athlete_id and a.organization_id = p_organization_id
      where tm.team_id = p_team_id and tm.athlete_id = (x->>'athlete_id')::uuid
        and (tm.valid_to is null or tm.valid_to >= current_date))
  ) then
    raise exception 'athlete not in team' using errcode = '22023';
  end if;

  with upd as (
    update public.scd_athletes a
    set fanta_role = x.role, updated_at = now()
    from (select (e->>'athlete_id')::uuid as id, e->>'role' as role from jsonb_array_elements(p_rows) e) x
    where a.id = x.id and a.organization_id = p_organization_id and a.fanta_role is distinct from x.role
    returning 1
  )
  select count(*) into v_changed from upd;

  insert into public.scd_audit_events (organization_id, actor_user_id, action, entity_type, entity_id, payload)
  values (p_organization_id, (select auth.uid()), 'ROSTER_ROLES_SET', 'scd_teams', p_team_id,
          jsonb_build_object('rows', v_n, 'changed', v_changed));
  return v_changed;
end;
$$;
revoke all on function public.scd_staff_set_team_roles(uuid, uuid, jsonb) from public, anon;
grant execute on function public.scd_staff_set_team_roles(uuid, uuid, jsonb) to authenticated;

commit;
