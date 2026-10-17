-- r116: Risultati & Classifiche — official LND data only (phase R1, 2026-10-17, chat CLOUD range r110-r129;
-- number assigned by the coordinator: r111-r114 are taken on the database, r115 by scd_club_catalog (PR #193)).
-- STAGED: NOT APPLIED. Apply only after Francesco writes "applica r116". Never apply from an agent.
-- Target: SCD PULSE (ndevtxxijbcnskgysdit). Never on dfnwzwutvnwiitiffwvr.
-- Requires r33 (scd_organizations, scd_people, scd_events), r35 (scd_has_org_role) and r51 (scd_matches) applied:
-- a guard below stops the migration when one of them is missing.
--
-- Why (Francesco DG, 17/10/2026 12:33: «ok classifiche LND», UD-181): the app rule «l'app non pubblica punteggi
-- propri» becomes «pubblichiamo solo i dati ufficiali LND, con fonte e link». Standings and results are copied from
-- gare.lnd.it with source URL and fetch time; nothing is computed or typed by hand.
-- Engine: PERSONE (families and fans find standings and results in the app and come back after every matchday).
-- Measure: weekly visits of /classifiche and of the "Classifica" block on team pages; freshness = hours between the
-- last LND matchday end and the newest scd_standings_snapshots.fetched_at (target <= 6 h, <= 1 h on weekends).
--
-- What it adds (additive only; no existing row is inserted, changed or removed):
--   1. scd_competitions: the LND championships and cups of SCD teams (code, group, source URL). Attività di base
--      teams (Piccoli Amici, Primi Calci, Pulcini, Esordienti) are refused by a check: no standings by SGS rule.
--   2. scd_standings_snapshots: one copy of an official standings table per fetch (rows jsonb of
--      team/pos/pt/g/v/n/p/gf/gs), source_url on gare.lnd.it only. Append-only for readers.
--   3. scd_matches (r51) gets official LND fields only: lnd_match_id, lnd_competition_id, lnd_home_goals,
--      lnd_away_goals, lnd_result_label, lnd_result_source_url, lnd_result_fetched_at. Convocations, sheets, scorers
--      and reports stay with r51/r53/r62/r70/r92 and the mister «Area partite» work (r117+): nothing of that here.
--      scd_matches keeps its member-only RLS; the public reads results only through scd_public_lnd_results().
--   4. scd_official_notices: index of official comunicati (issuer, number, date, url). No content copied.
--   5. scd_disciplinary_items: measures of the Giudice sportivo that concern SCD, STAFF read only (never public).
--      A person is referenced by id (scd_people) and never copied by name.
-- Read: competitions, standings, notices and results are public (anon select). Write: service role only (the
-- ingestion job), no insert/update/delete grant or policy for anon or authenticated.
-- No personal data of minors anywhere: standings and results carry club names only.
--
-- Planned ingestion (not scheduled by this migration): apps/superapp/scripts/ingest-lnd-standings.mjs every 6 hours,
-- every hour from Friday 18:00 to Monday 12:00 (Europe/Rome), with the service role key held by the job runner.
--
-- Rollback (manual, only if Francesco asks):
--   drop function if exists public.scd_public_lnd_results(uuid, integer);
--   drop table if exists public.scd_disciplinary_items, public.scd_official_notices,
--     public.scd_standings_snapshots cascade;
--   alter table public.scd_matches drop column if exists lnd_match_id, drop column if exists lnd_competition_id,
--     drop column if exists lnd_home_goals, drop column if exists lnd_away_goals, drop column if exists lnd_result_label,
--     drop column if exists lnd_result_source_url, drop column if exists lnd_result_fetched_at;
--   drop table if exists public.scd_competitions cascade;

do $$
begin
  if to_regclass('public.scd_organizations') is null
     or to_regclass('public.scd_people') is null
     or to_regclass('public.scd_events') is null
     or to_regclass('public.scd_matches') is null
     or to_regprocedure('public.scd_has_org_role(uuid, public.scd_role[])') is null then
    raise exception 'r116 prerequisites missing (r33, r35, r51)';
  end if;
end $$;

-- ---------------------------------------------------------------- 1. competitions
create table if not exists public.scd_competitions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  season text not null check (season ~ '^20[0-9]{2}/[0-9]{2}$'),
  team_code text not null check (team_code ~ '^[a-z0-9_-]{1,40}$'),
  kind text not null check (kind in ('CAMPIONATO', 'COPPA')),
  lnd_committee text not null default 'lombardia' check (lnd_committee ~ '^[a-z-]{2,40}$'),
  lnd_championship_code text not null check (lnd_championship_code ~ '^[A-Z0-9*]{1,4}$'),
  lnd_group_code text not null check (lnd_group_code ~ '^[A-Z0-9]{1,4}$'),
  name text not null check (length(trim(name)) between 1 and 120),
  group_name text not null check (length(trim(group_name)) between 1 and 60),
  source_url text not null check (source_url ~ '^https://gare\.lnd\.it/'),
  has_standings boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, season, lnd_committee, lnd_championship_code, lnd_group_code),
  -- SGS: no standings for the attività di base, during the whole season.
  constraint scd_competitions_no_base_activity
    check (team_code not in ('piccoli', 'primicalci', 'pulcini', 'esordienti', '2014', '2015')
           and team_code !~ '^(piccoli|primi|pulcini|esordienti)')
);

-- ---------------------------------------------------------------- 2. standings snapshots
create table if not exists public.scd_standings_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  competition_id uuid not null references public.scd_competitions(id) on delete cascade,
  fetched_at timestamptz not null,
  source_url text not null check (source_url ~ '^https://gare\.lnd\.it/'),
  matchday integer check (matchday is null or matchday between 1 and 60),
  -- [{team, pos, pt, g, v, n, p, gf, gs}], exactly as published by LND.
  rows jsonb not null check (jsonb_typeof(rows) = 'array' and jsonb_array_length(rows) between 1 and 40),
  created_at timestamptz not null default now(),
  unique (competition_id, fetched_at)
);
create index if not exists scd_standings_snapshots_latest_idx
  on public.scd_standings_snapshots (competition_id, fetched_at desc);

-- ---------------------------------------------------------------- 3. official LND fields on the r51 match table
alter table public.scd_matches add column if not exists lnd_match_id bigint;
alter table public.scd_matches add column if not exists lnd_competition_id uuid
  references public.scd_competitions(id) on delete set null;
alter table public.scd_matches add column if not exists lnd_home_goals integer;
alter table public.scd_matches add column if not exists lnd_away_goals integer;
alter table public.scd_matches add column if not exists lnd_result_label text;
alter table public.scd_matches add column if not exists lnd_result_source_url text;
alter table public.scd_matches add column if not exists lnd_result_fetched_at timestamptz;
alter table public.scd_matches drop constraint if exists scd_matches_lnd_result_check;
alter table public.scd_matches add constraint scd_matches_lnd_result_check check (
  (lnd_home_goals is null or lnd_home_goals between 0 and 99)
  and (lnd_away_goals is null or lnd_away_goals between 0 and 99)
  and ((lnd_home_goals is null) = (lnd_away_goals is null))
  and (lnd_result_label is null or length(lnd_result_label) <= 80)
  and (lnd_result_source_url is null or lnd_result_source_url ~ '^https://gare\.lnd\.it/')
  -- a score is always stored with its source and fetch time
  and (lnd_home_goals is null or (lnd_result_source_url is not null and lnd_result_fetched_at is not null))
);
create unique index if not exists scd_matches_org_lnd_match_idx
  on public.scd_matches (organization_id, lnd_match_id) where lnd_match_id is not null;

-- ---------------------------------------------------------------- 4. official notices (index only)
create table if not exists public.scd_official_notices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  issuer text not null check (issuer in ('LND', 'CR_LOMBARDIA', 'DELEGAZIONE_LECCO', 'DELEGAZIONE_SONDRIO', 'SGS', 'FIGC')),
  season text not null check (season ~ '^20[0-9]{2}/[0-9]{2}$'),
  number text not null check (number ~ '^[0-9A-Za-z/._-]{1,20}$'),
  published_on date not null,
  title text check (title is null or length(title) <= 200),
  url text not null check (url ~ '^https://'),
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (organization_id, issuer, season, number)
);

-- ---------------------------------------------------------------- 5. disciplinary items (STAFF only)
create table if not exists public.scd_disciplinary_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  notice_id uuid not null references public.scd_official_notices(id) on delete cascade,
  competition_id uuid references public.scd_competitions(id) on delete set null,
  match_id uuid references public.scd_matches(id) on delete set null,
  subject_kind text not null check (subject_kind in ('SOCIETA', 'DIRIGENTE', 'TECNICO', 'CALCIATORE')),
  -- reference only: the name is never copied here
  person_id uuid references public.scd_people(id) on delete set null,
  measure text not null check (measure in ('AMMONIZIONE', 'DIFFIDA', 'SQUALIFICA', 'INIBIZIONE', 'AMMENDA', 'ALTRO')),
  matches_count integer check (matches_count is null or matches_count between 1 and 99),
  until_date date,
  created_at timestamptz not null default now(),
  check (subject_kind = 'SOCIETA' or person_id is not null or measure = 'ALTRO')
);

-- ---------------------------------------------------------------- RLS and grants
alter table public.scd_competitions enable row level security;
alter table public.scd_standings_snapshots enable row level security;
alter table public.scd_official_notices enable row level security;
alter table public.scd_disciplinary_items enable row level security;

revoke all on table public.scd_competitions, public.scd_standings_snapshots, public.scd_official_notices,
  public.scd_disciplinary_items from public, anon, authenticated;
grant select on table public.scd_competitions, public.scd_standings_snapshots, public.scd_official_notices
  to anon, authenticated;
grant select on table public.scd_disciplinary_items to authenticated;
grant all on table public.scd_competitions, public.scd_standings_snapshots, public.scd_official_notices,
  public.scd_disciplinary_items to service_role;

drop policy if exists "scd_competitions_public_read" on public.scd_competitions;
create policy "scd_competitions_public_read" on public.scd_competitions
  for select to anon, authenticated using (active);

drop policy if exists "scd_standings_snapshots_public_read" on public.scd_standings_snapshots;
create policy "scd_standings_snapshots_public_read" on public.scd_standings_snapshots
  for select to anon, authenticated using (true);

drop policy if exists "scd_official_notices_public_read" on public.scd_official_notices;
create policy "scd_official_notices_public_read" on public.scd_official_notices
  for select to anon, authenticated using (true);

drop policy if exists "scd_disciplinary_items_staff_read" on public.scd_disciplinary_items;
create policy "scd_disciplinary_items_staff_read" on public.scd_disciplinary_items
  for select to authenticated
  using (public.scd_has_org_role(organization_id, array['DIRECTION', 'SECRETARIAT', 'STAFF', 'MISTER', 'MANAGER']::public.scd_role[]));

-- ---------------------------------------------------------------- public read of official results
-- Only the official LND fields of scd_matches, never convocations, sheets or people.
create or replace function public.scd_public_lnd_results(p_competition_id uuid, p_limit integer default 10)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(jsonb_agg(x.r order by x.d desc), '[]'::jsonb)
  from (
    select e.starts_at as d, jsonb_build_object(
        'lndMatchId', m.lnd_match_id,
        'date', to_char(e.starts_at at time zone 'Europe/Rome', 'YYYY-MM-DD'),
        'time', to_char(e.starts_at at time zone 'Europe/Rome', 'HH24:MI'),
        'home', m.home_team, 'away', m.away_team,
        'homeGoals', m.lnd_home_goals, 'awayGoals', m.lnd_away_goals,
        'label', m.lnd_result_label,
        'sourceUrl', m.lnd_result_source_url, 'fetchedAt', m.lnd_result_fetched_at) as r
    from public.scd_matches m
    join public.scd_events e on e.id = m.event_id
    join public.scd_competitions c on c.id = m.lnd_competition_id and c.active
    where m.lnd_competition_id = p_competition_id
      and m.lnd_home_goals is not null
    order by e.starts_at desc
    limit least(greatest(coalesce(p_limit, 10), 1), 40)
  ) x;
$$;
revoke all on function public.scd_public_lnd_results(uuid, integer) from public;
grant execute on function public.scd_public_lnd_results(uuid, integer) to anon, authenticated, service_role;
