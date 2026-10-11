-- r70: pre-distinta (UD-069). The mister picks, among the athletes called up (r62/r68/r69), who goes on the match
-- sheet, with shirt numbers, starters/reserves, captain and vice-captain, and the adults on the bench.
-- It is NOT the official match sheet: for SGS youth championships the CRL Lombardia requires the "lista di
-- presentazione" on the LND portal; the club officer copies this draft there (or prints it where paper is allowed).
-- Rules (sources, 2026-10-11):
--   * LND Lombardia "Regolamento competizioni dilettantistiche 26-27" art. 19.1 (captain and vice among starters),
--     art. 26.2 (max 9 reserves in 2026/27) -> prima, u19, u18: max 20 listed, max 11 starters;
--   * CRL Lombardia "Regolamenti SGS Campionato" art. 6 (max 20 listed, 7 substitutions) -> u14..u17: max 20, max 11 starters;
--   * attività di base (esordienti, pulcini, primi calci, piccoli amici): no starters/captain constraint here.
-- Storage: one row per match; players and bench staff as jsonb (replaced as a whole, nothing removed row by row).
-- No document numbers, phones or e-mails are stored or returned. Additive only.

create table if not exists public.scd_match_sheets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id),
  match_id uuid not null unique references public.scd_matches(id),
  players jsonb not null default '[]'::jsonb check (jsonb_typeof(players) = 'array'),
  staff jsonb not null default '[]'::jsonb check (jsonb_typeof(staff) = 'array'),
  captain_athlete_id uuid,
  vice_athlete_id uuid,
  status text not null default 'DRAFT' check (status in ('DRAFT', 'READY')),
  note text check (length(note) <= 300),
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.scd_match_sheets enable row level security;
revoke all on table public.scd_match_sheets from anon, authenticated;

-- Limits per team code (kept equal to MATCH_SHEET_RULES in apps/superapp/src/lib/match-sheet.ts).
create or replace function public.scd_match_sheet_rules(p_team_code text)
returns table (max_listed integer, max_starters integer, captain_required boolean)
language sql
immutable
set search_path to 'public'
as $$
  select case
           when p_team_code in ('prima', 'u19', 'u18') then 20
           when p_team_code in ('u17', 'u16', 'u15', 'u14') then 20
           else 40
         end,
         case when p_team_code in ('prima', 'u19', 'u18', 'u17', 'u16', 'u15', 'u14') then 11 else null end,
         p_team_code in ('prima', 'u19', 'u18', 'u17', 'u16', 'u15', 'u14');
$$;

-- Adults who can sit on the bench for a match: staff of that team plus club-level dirigenti.
create or replace function public.scd_match_sheet_staff_candidates(p_organization_id uuid, p_match_id uuid)
returns table (person_id uuid, display_name text, role_label text)
language sql
stable
security definer
set search_path to 'public'
as $$
  select distinct on (p.id) p.id,
    coalesce(nullif(p.display_name, ''), trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, ''))),
    r.role_label
  from public.scd_structure_roles r
  join public.scd_people p on p.id = r.person_id and p.status <> 'ARCHIVED' and p.left_at is null
  where r.organization_id = p_organization_id and r.active and (r.valid_to is null or r.valid_to >= current_date)
    and (
      (r.team_id = public.scd_match_team_id(p_match_id) and r.role_kind in ('MISTER', 'DIRIGENTE', 'STAFF'))
      or (r.team_id is null and r.role_kind = 'DIRIGENTE')
    )
    and public.scd_match_team_id(p_match_id) in (select public.scd_my_team_ids(p_organization_id))
  order by p.id, (r.team_id is null), r.role_label;
$$;

-- Staff view of the sheet for one calendar event: the saved draft (names resolved) plus the called-up athletes
-- with the shirt number each one last wore for this team.
create or replace function public.scd_staff_match_sheet(p_organization_id uuid, p_source_record_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_match uuid;
  v_team uuid;
  v_code text;
  v_starts timestamptz;
  v_sheet public.scd_match_sheets;
  v_rules record;
begin
  select m.id, nullif(e.metadata->>'team_id', '')::uuid, e.starts_at into v_match, v_team, v_starts
  from public.scd_events e join public.scd_matches m on m.event_id = e.id
  where e.organization_id = p_organization_id and e.source_id = 'MASTER_CALENDARIO_2026_27' and e.source_record_id = p_source_record_id;
  if v_match is null then
    return null;
  end if;
  if v_team is null or v_team not in (select public.scd_my_team_ids(p_organization_id)) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select code into v_code from public.scd_teams where id = v_team;
  select * into v_rules from public.scd_match_sheet_rules(v_code);
  select * into v_sheet from public.scd_match_sheets where match_id = v_match;

  return jsonb_build_object(
    'match_id', v_match,
    'team_code', v_code,
    'starts_at', v_starts,
    'locked', v_starts < now(),
    'rules', jsonb_build_object('max_listed', v_rules.max_listed, 'max_starters', v_rules.max_starters, 'captain_required', v_rules.captain_required),
    'status', coalesce(v_sheet.status, 'NONE'),
    'captain_athlete_id', v_sheet.captain_athlete_id,
    'vice_athlete_id', v_sheet.vice_athlete_id,
    'note', v_sheet.note,
    'updated_at', v_sheet.updated_at,
    'players', coalesce(v_sheet.players, '[]'::jsonb),
    'staff', coalesce((
      select jsonb_agg(jsonb_build_object('person_id', s->>'person_id', 'role', s->>'role',
               'display_name', coalesce(nullif(p.display_name, ''), trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, ''))))
             order by ord)
      from jsonb_array_elements(coalesce(v_sheet.staff, '[]'::jsonb)) with ordinality as x(s, ord)
      left join public.scd_people p on p.id = nullif(s->>'person_id', '')::uuid
    ), '[]'::jsonb),
    'called_up', coalesce((
      select jsonb_agg(jsonb_build_object(
               'athlete_id', c.athlete_id,
               'display_name', coalesce(nullif(p.display_name, ''), trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, ''))),
               'birth_year', extract(year from p.birth_date)::integer,
               'response', c.response_status,
               'last_shirt', (
                 select (pl->>'shirt')::integer
                 from public.scd_match_sheets ms
                 join public.scd_matches m2 on m2.id = ms.match_id and m2.id <> v_match
                 join public.scd_events e2 on e2.id = m2.event_id and nullif(e2.metadata->>'team_id', '')::uuid = v_team
                 cross join lateral jsonb_array_elements(ms.players) pl
                 where pl->>'athlete_id' = c.athlete_id::text
                 order by ms.updated_at desc
                 limit 1)
             ) order by p.last_name, p.first_name)
      from public.scd_match_callups c
      join public.scd_athletes a on a.id = c.athlete_id
      join public.scd_people p on p.id = a.person_id
      where c.match_id = v_match and c.withdrawn_at is null
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.scd_staff_save_match_sheet(
  p_organization_id uuid,
  p_match_id uuid,
  p_players jsonb,
  p_staff jsonb,
  p_captain uuid,
  p_vice uuid,
  p_status text,
  p_note text
)
returns text
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v_team uuid := public.scd_match_team_id(p_match_id);
  v_code text;
  v_starts timestamptz;
  v_rules record;
  v_n integer;
  v_starters integer;
  v_before jsonb;
begin
  if v_team is null or v_team not in (select public.scd_my_team_ids(p_organization_id)) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select e.starts_at into v_starts from public.scd_matches m join public.scd_events e on e.id = m.event_id
  where m.id = p_match_id and m.organization_id = p_organization_id;
  if v_starts is null or v_starts < now() then
    raise exception 'match already started' using errcode = '22023';
  end if;
  if p_status not in ('DRAFT', 'READY') or jsonb_typeof(p_players) <> 'array' or jsonb_typeof(p_staff) <> 'array' then
    raise exception 'invalid sheet' using errcode = '22023';
  end if;
  select code into v_code from public.scd_teams where id = v_team;
  select * into v_rules from public.scd_match_sheet_rules(v_code);

  -- players: well formed, unique, called up for this match (not withdrawn), unique shirt 1..99
  if exists (
    select 1 from jsonb_array_elements(p_players) pl
    where jsonb_typeof(pl) <> 'object'
       or (pl->>'athlete_id') !~ '^[0-9a-f-]{36}$'
       or (pl->>'shirt') !~ '^[0-9]{1,2}$' or (pl->>'shirt')::integer not between 1 and 99
       or jsonb_typeof(pl->'starter') <> 'boolean'
  ) then
    raise exception 'invalid player entry' using errcode = '22023';
  end if;
  select count(*), count(*) filter (where (pl->>'starter')::boolean) into v_n, v_starters from jsonb_array_elements(p_players) pl;
  if v_n > v_rules.max_listed then
    raise exception 'too many players: max %', v_rules.max_listed using errcode = '22023';
  end if;
  if v_rules.max_starters is not null and v_starters > v_rules.max_starters then
    raise exception 'too many starters: max %', v_rules.max_starters using errcode = '22023';
  end if;
  if (select count(distinct pl->>'athlete_id') from jsonb_array_elements(p_players) pl) <> v_n then
    raise exception 'duplicate player' using errcode = '22023';
  end if;
  if (select count(distinct (pl->>'shirt')::integer) from jsonb_array_elements(p_players) pl) <> v_n then
    raise exception 'duplicate shirt number' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_players) pl
    where not exists (
      select 1 from public.scd_match_callups c
      where c.match_id = p_match_id and c.withdrawn_at is null and c.athlete_id = (pl->>'athlete_id')::uuid)
  ) then
    raise exception 'player not called up' using errcode = '22023';
  end if;

  -- captain / vice: listed, different, starters when starters apply
  if p_captain is not null and p_captain = p_vice then
    raise exception 'captain and vice must differ' using errcode = '22023';
  end if;
  if exists (
    select 1 from unnest(array[p_captain, p_vice]) k(id)
    where k.id is not null and not exists (
      select 1 from jsonb_array_elements(p_players) pl
      where (pl->>'athlete_id')::uuid = k.id and (v_rules.max_starters is null or (pl->>'starter')::boolean))
  ) then
    raise exception 'captain and vice must be starters' using errcode = '22023';
  end if;

  -- staff: known roles, people among the candidates, one accompanying officer when READY
  if exists (
    select 1 from jsonb_array_elements(p_staff) s
    where jsonb_typeof(s) <> 'object'
       or (s->>'role') not in ('DIRIGENTE_ACCOMPAGNATORE', 'ALLENATORE', 'ALLENATORE_IN_SECONDA', 'PREPARATORE_PORTIERI', 'PREPARATORE_ATLETICO', 'MEDICO', 'OPERATORE_SANITARIO', 'DIRIGENTE_ADDETTO_ARBITRO')
       or (s->>'person_id') !~ '^[0-9a-f-]{36}$'
       or (s->>'person_id')::uuid not in (select c.person_id from public.scd_match_sheet_staff_candidates(p_organization_id, p_match_id) c)
  ) then
    raise exception 'invalid staff entry' using errcode = '22023';
  end if;
  if jsonb_array_length(p_staff) > 10 then
    raise exception 'too many staff' using errcode = '22023';
  end if;

  if p_status = 'READY' then
    if v_n = 0 then
      raise exception 'empty sheet' using errcode = '22023';
    end if;
    if v_rules.captain_required and (p_captain is null or p_vice is null) then
      raise exception 'captain and vice required' using errcode = '22023';
    end if;
    if not exists (select 1 from jsonb_array_elements(p_staff) s where s->>'role' = 'DIRIGENTE_ACCOMPAGNATORE') then
      raise exception 'accompanying officer required' using errcode = '22023';
    end if;
  end if;

  select to_jsonb(ms) - 'organization_id' into v_before from public.scd_match_sheets ms where ms.match_id = p_match_id;
  insert into public.scd_match_sheets (organization_id, match_id, players, staff, captain_athlete_id, vice_athlete_id, status, note, updated_by)
  values (p_organization_id, p_match_id, p_players, p_staff, p_captain, p_vice, p_status, left(nullif(trim(p_note), ''), 300), (select auth.uid()))
  on conflict (match_id) do update
    set players = excluded.players, staff = excluded.staff, captain_athlete_id = excluded.captain_athlete_id,
        vice_athlete_id = excluded.vice_athlete_id, status = excluded.status, note = excluded.note,
        updated_by = excluded.updated_by, updated_at = now();

  insert into public.scd_audit_events (organization_id, actor_user_id, action, entity_type, entity_id, payload)
  values (p_organization_id, (select auth.uid()), 'MATCH_SHEET_SAVED', 'scd_matches', p_match_id,
          jsonb_build_object('status', p_status, 'players', v_n, 'starters', v_starters, 'had_previous', v_before is not null));
  return p_status;
end;
$$;

revoke all on function public.scd_match_sheet_staff_candidates(uuid, uuid) from public, anon;
revoke all on function public.scd_staff_match_sheet(uuid, text) from public, anon;
revoke all on function public.scd_staff_save_match_sheet(uuid, uuid, jsonb, jsonb, uuid, uuid, text, text) from public, anon;
grant execute on function public.scd_match_sheet_staff_candidates(uuid, uuid) to authenticated;
grant execute on function public.scd_staff_match_sheet(uuid, text) to authenticated;
grant execute on function public.scd_staff_save_match_sheet(uuid, uuid, jsonb, jsonb, uuid, uuid, text, text) to authenticated;
