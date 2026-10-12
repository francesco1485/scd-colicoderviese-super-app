-- r92: Fantacalcio SCD (UD-094) and the match report ("tabellino") that feeds it.
--   * Tabellino: after kick-off the staff of the team records goals for/against and, per player, minutes, goals,
--     assists, cards and the fantasy role (P/D/C/A). Reuses r53 tables scd_match_performance and
--     scd_match_team_stats; nothing new is invented for match data.
--   * Fantacalcio: one league per organization (r53 scd_fantasy_leagues, no money by table constraint). Each member
--     keeps a roster of up to 11 athletes of the competitive teams (prima, u19, u16, u15), max 4 per team; the roster
--     changes until Friday 20:00 (Europe/Rome) and applies from that week's matches. Points come only from recorded
--     match reports (no invented data). Prizes are non-monetary and outside the database.
--   * Everybody enters with the account; the age rules are automatic: minors appear with first name and initial only
--     (same rule as scd_vote_candidates), standings show the chosen display name, never the real one.

alter table public.scd_athletes add column if not exists fanta_role text
  check (fanta_role is null or fanta_role in ('P', 'D', 'C', 'A'));


-- r56 defined these three tables in the repo but SCD PULSE never received them (verified 2026-10-12): created here,
-- same shape, so the file and the database agree.
create table if not exists public.scd_match_team_stats (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  match_id uuid not null references public.scd_matches(id) on delete cascade,
  team_id uuid references public.scd_teams(id) on delete set null,
  is_scd_team boolean not null default true,
  goals_for integer not null default 0 check (goals_for >= 0),
  goals_against integer not null default 0 check (goals_against >= 0),
  yellow_cards integer not null default 0 check (yellow_cards >= 0),
  red_cards integer not null default 0 check (red_cards >= 0),
  result_code text check (result_code in ('W','D','L')),
  source_id text not null,
  source_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (match_id, team_id)
);
alter table public.scd_match_team_stats enable row level security;
revoke all on table public.scd_match_team_stats from anon, authenticated;

create table if not exists public.scd_fantasy_leagues (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  name text not null,
  season_id uuid references public.scd_seasons(id) on delete set null,
  audience_mode text not null default 'ADULT_REGISTERED'
    check (audience_mode in ('ADULT_REGISTERED','ALL_AGES_TEAM_GAME','MINOR_COOPERATIVE')),
  status text not null default 'DRAFT' check (status in ('DRAFT','ACTIVE','CLOSED','CANCELLED')),
  monetary_entry boolean not null default false,
  monetary_prize boolean not null default false,
  public_player_ranking boolean not null default false,
  rules jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (monetary_entry = false),
  check (monetary_prize = false)
);
create table if not exists public.scd_fantasy_entries (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.scd_fantasy_leagues(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  points numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (league_id, user_id)
);

-- ---------------------------------------------------------------------------------------------------------------
-- Tabellino
-- ---------------------------------------------------------------------------------------------------------------

-- Players who may appear in the report: current roster of the match team plus anyone called up for the match.
create or replace function public.scd_staff_match_report(p_organization_id uuid, p_match_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_team uuid := public.scd_match_team_id(p_match_id);
  v_code text;
  v_starts timestamptz;
  v_home text;
  v_away text;
  v_ts public.scd_match_team_stats;
begin
  if v_team is null or v_team not in (select public.scd_my_team_ids(p_organization_id)) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select e.starts_at, m.home_team, m.away_team into v_starts, v_home, v_away
  from public.scd_matches m join public.scd_events e on e.id = m.event_id
  where m.id = p_match_id and m.organization_id = p_organization_id;
  select code into v_code from public.scd_teams where id = v_team;
  select * into v_ts from public.scd_match_team_stats ts where ts.match_id = p_match_id and ts.is_scd_team limit 1;

  return jsonb_build_object(
    'match_id', p_match_id,
    'team_code', v_code,
    'starts_at', v_starts,
    'open', v_starts <= now(),
    'home_team', v_home,
    'away_team', v_away,
    'goals_for', v_ts.goals_for,
    'goals_against', v_ts.goals_against,
    'recorded_at', v_ts.updated_at,
    'players', coalesce((
      select jsonb_agg(jsonb_build_object(
          'athlete_id', x.athlete_id,
          'display_name', x.display_name,
          'birth_year', x.birth_year,
          'role', x.fanta_role,
          'minutes', coalesce(mp.minutes_played, 0),
          'goals', coalesce(mp.goals, 0),
          'assists', coalesce(mp.assists, 0),
          'yellow', coalesce(mp.yellow_cards, 0),
          'red', coalesce(mp.red_card, false),
          'recorded', mp.id is not null)
        order by x.last_name, x.first_name)
      from (
        select distinct on (a.id) a.id as athlete_id, a.fanta_role,
          coalesce(nullif(p.display_name, ''), trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, ''))) as display_name,
          extract(year from p.birth_date)::integer as birth_year, p.last_name, p.first_name
        from public.scd_athletes a
        join public.scd_people p on p.id = a.person_id
        where a.organization_id = p_organization_id and (
          exists (select 1 from public.scd_team_memberships tm where tm.athlete_id = a.id and tm.team_id = v_team and tm.valid_to is null)
          or exists (select 1 from public.scd_match_callups c where c.athlete_id = a.id and c.match_id = p_match_id and c.withdrawn_at is null)
          or exists (select 1 from public.scd_match_performance mp2 where mp2.athlete_id = a.id and mp2.match_id = p_match_id))
      ) x
      left join public.scd_match_performance mp on mp.match_id = p_match_id and mp.athlete_id = x.athlete_id
    ), '[]'::jsonb));
end;
$$;

-- Save the report. Rows: {athlete_id, minutes, goals, assists, yellow, red, role}. Players left out are zeroed.
create or replace function public.scd_staff_save_match_report(
  p_organization_id uuid,
  p_match_id uuid,
  p_goals_for integer,
  p_goals_against integer,
  p_rows jsonb
)
returns integer
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v_team uuid := public.scd_match_team_id(p_match_id);
  v_starts timestamptz;
  v_n integer;
  v_goals integer;
  r record;
begin
  if v_team is null or v_team not in (select public.scd_my_team_ids(p_organization_id)) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select e.starts_at into v_starts from public.scd_matches m join public.scd_events e on e.id = m.event_id
  where m.id = p_match_id and m.organization_id = p_organization_id;
  if v_starts is null or v_starts > now() then
    raise exception 'match not played yet' using errcode = '22023';
  end if;
  if p_goals_for is null or p_goals_against is null or p_goals_for not between 0 and 30 or p_goals_against not between 0 and 30 then
    raise exception 'invalid score' using errcode = '22023';
  end if;
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) > 40 then
    raise exception 'invalid rows' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_rows) x
    where jsonb_typeof(x) <> 'object'
       or (x->>'athlete_id') !~ '^[0-9a-f-]{36}$'
       or (x->>'minutes') !~ '^[0-9]{1,3}$' or (x->>'minutes')::integer not between 0 and 130
       or (x->>'goals') !~ '^[0-9]{1,2}$' or (x->>'assists') !~ '^[0-9]{1,2}$'
       or (x->>'yellow') !~ '^[0-2]$'
       or jsonb_typeof(x->'red') <> 'boolean'
       or (x->>'role') is not null and (x->>'role') not in ('P', 'D', 'C', 'A')
  ) then
    raise exception 'invalid player row' using errcode = '22023';
  end if;
  select count(*), coalesce(sum((x->>'goals')::integer), 0) into v_n, v_goals from jsonb_array_elements(p_rows) x;
  if (select count(distinct x->>'athlete_id') from jsonb_array_elements(p_rows) x) <> v_n then
    raise exception 'duplicate player' using errcode = '22023';
  end if;
  if v_goals > p_goals_for then
    raise exception 'more scorers than goals' using errcode = '22023';
  end if;
  -- every athlete must be one of the report candidates
  if exists (
    select 1 from jsonb_array_elements(p_rows) x
    where (x->>'athlete_id')::uuid not in (
      select (c->>'athlete_id')::uuid from jsonb_array_elements(public.scd_staff_match_report(p_organization_id, p_match_id)->'players') c)
  ) then
    raise exception 'player not in team' using errcode = '22023';
  end if;

  -- players left out of the report count as not played (rows are zeroed, never removed)
  update public.scd_match_performance mp
  set starter = false, minutes_played = 0, goals = 0, assists = 0, yellow_cards = 0, red_card = false, updated_at = now()
  where mp.match_id = p_match_id
    and mp.athlete_id not in (select (x->>'athlete_id')::uuid from jsonb_array_elements(p_rows) x);

  for r in select * from jsonb_array_elements(p_rows) x loop
    insert into public.scd_match_performance
      (organization_id, match_id, athlete_id, starter, minutes_played, goals, assists, yellow_cards, red_card, recorded_by_user_id)
    values
      (p_organization_id, p_match_id, (r.x->>'athlete_id')::uuid, (r.x->>'minutes')::integer >= 60, (r.x->>'minutes')::integer,
       (r.x->>'goals')::integer, (r.x->>'assists')::integer, (r.x->>'yellow')::integer, (r.x->>'red')::boolean, (select auth.uid()))
    on conflict (match_id, athlete_id) do update
      set starter = excluded.starter, minutes_played = excluded.minutes_played, goals = excluded.goals, assists = excluded.assists,
          yellow_cards = excluded.yellow_cards, red_card = excluded.red_card, recorded_by_user_id = excluded.recorded_by_user_id,
          updated_at = now();
    if (r.x->>'role') is not null then
      update public.scd_athletes set fanta_role = r.x->>'role', updated_at = now()
      where id = (r.x->>'athlete_id')::uuid and organization_id = p_organization_id and fanta_role is distinct from (r.x->>'role');
    end if;
  end loop;

  insert into public.scd_match_team_stats
    (organization_id, match_id, team_id, is_scd_team, goals_for, goals_against,
     yellow_cards, red_cards, result_code, source_id, source_verified_at)
  values
    (p_organization_id, p_match_id, v_team, true, p_goals_for, p_goals_against,
     (select coalesce(sum((x->>'yellow')::integer), 0) from jsonb_array_elements(p_rows) x),
     (select count(*) filter (where (x->>'red')::boolean) from jsonb_array_elements(p_rows) x),
     case when p_goals_for > p_goals_against then 'W' when p_goals_for = p_goals_against then 'D' else 'L' end,
     'STAFF_APP', now())
  on conflict (match_id, team_id) do update
    set goals_for = excluded.goals_for, goals_against = excluded.goals_against, yellow_cards = excluded.yellow_cards,
        red_cards = excluded.red_cards, result_code = excluded.result_code, source_verified_at = now(), updated_at = now();

  insert into public.scd_audit_events (organization_id, actor_user_id, action, entity_type, entity_id, payload)
  values (p_organization_id, (select auth.uid()), 'MATCH_REPORT_SAVED', 'scd_matches', p_match_id,
          jsonb_build_object('players', v_n, 'goals_for', p_goals_for, 'goals_against', p_goals_against));
  return v_n;
end;
$$;

revoke all on function public.scd_staff_match_report(uuid, uuid) from public, anon;
revoke all on function public.scd_staff_save_match_report(uuid, uuid, integer, integer, jsonb) from public, anon;
grant execute on function public.scd_staff_match_report(uuid, uuid) to authenticated;
grant execute on function public.scd_staff_save_match_report(uuid, uuid, integer, integer, jsonb) to authenticated;

-- ---------------------------------------------------------------------------------------------------------------
-- Fantacalcio
-- ---------------------------------------------------------------------------------------------------------------

-- One row per entry and week: the whole roster of that week (replaced as a whole, nothing removed row by row).
create table if not exists public.scd_fantasy_rosters (
  entry_id uuid not null references public.scd_fantasy_entries(id) on delete cascade,
  week_start date not null,
  athlete_ids uuid[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (entry_id, week_start)
);
alter table public.scd_fantasy_rosters enable row level security;
revoke all on table public.scd_fantasy_rosters from anon, authenticated;
alter table public.scd_fantasy_leagues enable row level security;
revoke all on table public.scd_fantasy_leagues from anon, authenticated;
alter table public.scd_fantasy_entries enable row level security;
revoke all on table public.scd_fantasy_entries from anon, authenticated;

-- The one active league of the organization; created on first use. Money is excluded by the r53 table checks.
create or replace function public.scd_fanta_league(p_organization_id uuid)
returns uuid
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v_id uuid;
  v_season uuid;
  v_code text;
begin
  select id into v_id from public.scd_fantasy_leagues where organization_id = p_organization_id and status = 'ACTIVE' order by created_at desc limit 1;
  if v_id is not null then return v_id; end if;
  select id, code into v_season, v_code from public.scd_seasons
  where organization_id = p_organization_id and current_date between starts_on and ends_on order by starts_on desc limit 1;
  insert into public.scd_fantasy_leagues (organization_id, name, season_id, audience_mode, status, public_player_ranking, rules)
  values (p_organization_id, 'Fantacalcio SCD ' || coalesce(v_code, to_char(current_date, 'YYYY')), v_season, 'ALL_AGES_TEAM_GAME', 'ACTIVE', false,
          jsonb_build_object('roster', 11, 'perTeam', 4, 'played', 1, 'goal', 3, 'goalGkDef', 4, 'assist', 1, 'yellow', -0.5, 'red', -1, 'cleanSheet', 1, 'lock', 'friday 20:00 Europe/Rome'))
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.scd_fanta_league(uuid) from public, anon, authenticated;

-- Week whose roster the member is editing now: the current one until Friday 20:00 (Europe/Rome), then the next.
create or replace function public.scd_fanta_roster_week()
returns date language sql stable as $$
  select case when (now() at time zone 'Europe/Rome') > ((public.scd_week_start() + 4)::timestamp + time '20:00')
              then public.scd_week_start() + 7 else public.scd_week_start() end;
$$;

-- Points of every recorded performance (only matches with a report exist here).
create or replace function public.scd_fanta_athlete_scores(p_organization_id uuid)
returns table (athlete_id uuid, match_id uuid, match_day date, team_code text, points numeric)
language sql
stable
security definer
set search_path to 'public'
as $$
  select mp.athlete_id, mp.match_id, (e.starts_at at time zone 'Europe/Rome')::date, e.metadata->>'team_code',
    (case when mp.minutes_played > 0 then 1 else 0 end)
    + mp.goals * (case when a.fanta_role in ('P', 'D') then 4 else 3 end)
    + mp.assists
    - 0.5 * mp.yellow_cards
    - (case when mp.red_card then 1 else 0 end)
    + (case when a.fanta_role = 'P' and mp.minutes_played >= 60 and coalesce(ts.goals_against, 1) = 0 then 1 else 0 end)
  from public.scd_match_performance mp
  join public.scd_matches m on m.id = mp.match_id
  join public.scd_events e on e.id = m.event_id
  join public.scd_athletes a on a.id = mp.athlete_id
  left join public.scd_match_team_stats ts on ts.match_id = m.id and ts.is_scd_team
  where mp.organization_id = p_organization_id;
$$;
revoke all on function public.scd_fanta_athlete_scores(uuid) from public, anon, authenticated;

-- Points of every entry of a league between two days (inclusive), with the roster in force each match week.
create or replace function public.scd_fanta_entry_points(p_league_id uuid, p_from date, p_to date)
returns table (entry_id uuid, points numeric)
language sql
stable
security definer
set search_path to 'public'
as $$
  select e.id, coalesce(sum(s.points), 0)
  from public.scd_fantasy_entries e
  join public.scd_fantasy_leagues l on l.id = e.league_id
  left join lateral (
    select s.points
    from public.scd_fanta_athlete_scores(l.organization_id) s
    where s.match_day between p_from and p_to
      and s.athlete_id = any (coalesce((
        select r.athlete_ids from public.scd_fantasy_rosters r
        where r.entry_id = e.id and r.week_start <= public.scd_week_start(s.match_day)
        order by r.week_start desc limit 1), '{}'))
  ) s on true
  where e.league_id = p_league_id
  group by e.id;
$$;
revoke all on function public.scd_fanta_entry_points(uuid, date, date) from public, anon, authenticated;

-- Public standings: display names only. Month = first day of the month (default: current month, Europe/Rome).
create or replace function public.scd_fanta_standings(p_org_slug text, p_month date default null)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_org uuid;
  v_league uuid;
  v_month date := date_trunc('month', coalesce(p_month, (now() at time zone 'Europe/Rome')::date))::date;
  v_from date;
  v_to date;
begin
  select id into v_org from public.scd_organizations where slug = p_org_slug;
  select id into v_league from public.scd_fantasy_leagues where organization_id = v_org and status = 'ACTIVE' order by created_at desc limit 1;
  select coalesce(s.starts_on, date '2026-07-01'), coalesce(s.ends_on, date '2027-06-30') into v_from, v_to
  from public.scd_fantasy_leagues l left join public.scd_seasons s on s.id = l.season_id where l.id = v_league;
  if v_league is null then
    return jsonb_build_object('month', v_month, 'players', 0, 'monthTop', '[]'::jsonb, 'seasonTop', '[]'::jsonb);
  end if;
  return jsonb_build_object(
    'month', v_month,
    'players', (select count(*) from public.scd_fantasy_entries where league_id = v_league),
    'monthTop', coalesce((
      select jsonb_agg(jsonb_build_object('entryId', e.id, 'name', e.display_name, 'points', p.points) order by p.points desc, e.created_at)
      from (select * from public.scd_fanta_entry_points(v_league, v_month, (v_month + interval '1 month - 1 day')::date) order by points desc limit 20) p
      join public.scd_fantasy_entries e on e.id = p.entry_id), '[]'::jsonb),
    'seasonTop', coalesce((
      select jsonb_agg(jsonb_build_object('entryId', e.id, 'name', e.display_name, 'points', p.points) order by p.points desc, e.created_at)
      from (select * from public.scd_fanta_entry_points(v_league, v_from, v_to) order by points desc limit 20) p
      join public.scd_fantasy_entries e on e.id = p.entry_id), '[]'::jsonb));
end;
$$;
revoke all on function public.scd_fanta_standings(text, date) from public;
grant execute on function public.scd_fanta_standings(text, date) to anon, authenticated;

-- The caller's own game: entry, roster being edited, candidates (names per age rule), points, last recorded round.
create or replace function public.scd_fanta_me(p_organization_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_league uuid;
  v_entry public.scd_fantasy_entries;
  v_week date := public.scd_fanta_roster_week();
  v_month date := date_trunc('month', (now() at time zone 'Europe/Rome')::date)::date;
  v_roster jsonb := '[]'::jsonb;
  v_last_day date;
begin
  if auth.uid() is null or not exists (select 1 from public.scd_memberships m
      where m.organization_id = p_organization_id and m.user_id = (select auth.uid()) and m.active) then
    return null;
  end if;
  select id into v_league from public.scd_fantasy_leagues where organization_id = p_organization_id and status = 'ACTIVE' order by created_at desc limit 1;
  if v_league is not null then
    select * into v_entry from public.scd_fantasy_entries where league_id = v_league and user_id = (select auth.uid());
  end if;
  if v_entry.id is not null then
    select to_jsonb(r.athlete_ids) into v_roster from public.scd_fantasy_rosters r
    where r.entry_id = v_entry.id and r.week_start <= v_week order by r.week_start desc limit 1;
    v_roster := coalesce(v_roster, '[]'::jsonb);
  end if;
  select max(match_day) into v_last_day from public.scd_fanta_athlete_scores(p_organization_id);

  return jsonb_build_object(
    'joined', v_entry.id is not null,
    'displayName', v_entry.display_name,
    'editWeek', v_week,
    'lockAt', ((v_week + 4)::timestamp + time '20:00') at time zone 'Europe/Rome',
    'roster', v_roster,
    'monthPoints', case when v_entry.id is null then 0 else coalesce((select points from public.scd_fanta_entry_points(v_league, v_month, (v_month + interval '1 month - 1 day')::date) where entry_id = v_entry.id), 0) end,
    'seasonPoints', case when v_entry.id is null then 0 else coalesce((select points from public.scd_fanta_entry_points(v_league, date '2000-01-01', date '2100-01-01') where entry_id = v_entry.id), 0) end,
    'candidates', (
      select coalesce(jsonb_agg(c || jsonb_build_object('role', a.fanta_role,
          'lastPoints', (select s.points from public.scd_fanta_athlete_scores(p_organization_id) s where s.athlete_id = a.id and s.match_day = v_last_day limit 1))
          order by c->>'team', c->>'name'), '[]'::jsonb)
      from jsonb_array_elements(public.scd_vote_candidates(p_organization_id)) c
      join public.scd_athletes a on a.id = (c->>'athleteId')::uuid),
    'lastDay', v_last_day);
end;
$$;
revoke all on function public.scd_fanta_me(uuid) from public, anon;
grant execute on function public.scd_fanta_me(uuid) to authenticated;

-- Join or update: display name (checked by the content rules) and roster for the edit week.
create or replace function public.scd_fanta_set_roster(p_organization_id uuid, p_display_name text, p_athlete_ids uuid[])
returns jsonb
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v_league uuid;
  v_entry uuid;
  v_name text := left(regexp_replace(trim(coalesce(p_display_name, '')), '\s+', ' ', 'g'), 24);
  v_week date := public.scd_fanta_roster_week();
  v_ids uuid[] := (select coalesce(array_agg(distinct x), '{}') from unnest(p_athlete_ids) x);
  v_rules jsonb;
begin
  if auth.uid() is null or not exists (select 1 from public.scd_memberships m
      where m.organization_id = p_organization_id and m.user_id = (select auth.uid()) and m.active) then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  if length(v_name) < 2 or v_name !~ '^[[:alnum:] ''.\-]+$' then
    return jsonb_build_object('ok', false, 'code', 'name');
  end if;
  v_rules := public.scd_auto_rules(p_organization_id, 'club', v_name, '');
  if v_rules->>'verdict' = 'BLOCK' then
    return jsonb_build_object('ok', false, 'code', 'name');
  end if;
  if cardinality(v_ids) > 11 then
    return jsonb_build_object('ok', false, 'code', 'size');
  end if;
  if exists (select 1 from unnest(v_ids) i where i not in (
      select (c->>'athleteId')::uuid from jsonb_array_elements(public.scd_vote_candidates(p_organization_id)) c)) then
    return jsonb_build_object('ok', false, 'code', 'candidate');
  end if;
  if exists (
    select 1 from jsonb_array_elements(public.scd_vote_candidates(p_organization_id)) c
    where (c->>'athleteId')::uuid = any (v_ids) group by c->>'team' having count(*) > 4) then
    return jsonb_build_object('ok', false, 'code', 'perTeam');
  end if;

  v_league := public.scd_fanta_league(p_organization_id);
  insert into public.scd_fantasy_entries (league_id, user_id, display_name)
  values (v_league, (select auth.uid()), v_name)
  on conflict (league_id, user_id) do update set display_name = excluded.display_name, updated_at = now()
  returning id into v_entry;
  insert into public.scd_fantasy_rosters (entry_id, week_start, athlete_ids)
  values (v_entry, v_week, v_ids)
  on conflict (entry_id, week_start) do update set athlete_ids = excluded.athlete_ids, updated_at = now();
  return jsonb_build_object('ok', true, 'week', v_week, 'count', cardinality(v_ids));
end;
$$;
revoke all on function public.scd_fanta_set_roster(uuid, text, uuid[]) from public, anon;
grant execute on function public.scd_fanta_set_roster(uuid, text, uuid[]) to authenticated;
