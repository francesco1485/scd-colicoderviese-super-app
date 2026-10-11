-- r62: call-ups with "Ci sarò" (UD-062, approved by Direzione 2026-10-11).
-- Reuses r53 tables (scd_events, scd_matches, scd_match_callups) and its eligibility trigger
-- (medical certificate valid on match date + FIGC registration APPROVATO_FIGC). No new tables.
--   * a match row is created only when team staff call up for a calendar event; the calendar event id is
--     the source_record_id (source MASTER_CALENDARIO_2026_27), so there is no parallel calendar;
--   * staff act only on teams returned by scd_my_team_ids (r61/r61_1);
--   * answers come only from the athlete or a linked guardian (scd_my_family circle), before kick-off;
--   * every function returns minimum columns; tables stay closed to anon/authenticated.
-- Additive only. The withdraw function (contains a DELETE) is split into r62_1, applied only with Direzione confirmation.

create unique index if not exists scd_events_source_record_uidx
  on public.scd_events(organization_id, source_id, source_record_id)
  where source_record_id is not null;

-- Team of a match (stored in the event metadata by scd_staff_ensure_match).
create or replace function public.scd_match_team_id(p_match_id uuid)
returns uuid
language sql
stable
security definer
set search_path to 'public'
as $$
  select nullif(e.metadata->>'team_id', '')::uuid
  from public.scd_matches m
  join public.scd_events e on e.id = m.event_id
  where m.id = p_match_id;
$$;

create or replace function public.scd_staff_ensure_match(
  p_organization_id uuid,
  p_team_code text,
  p_source_record_id text,
  p_date date,
  p_time text,
  p_title text,
  p_home_team text,
  p_away_team text,
  p_venue text,
  p_competition text
)
returns uuid
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v_team uuid;
  v_season uuid;
  v_event uuid;
  v_match uuid;
  v_time_known boolean := coalesce(p_time, '') ~ '^[0-2][0-9]:[0-5][0-9]$';
  v_starts timestamptz;
begin
  select t.id, t.season_id into v_team, v_season
  from public.scd_teams t
  where t.organization_id = p_organization_id and t.code = p_team_code;
  if v_team is null or v_team not in (select public.scd_my_team_ids(p_organization_id)) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if coalesce(trim(p_source_record_id), '') = '' then
    raise exception 'calendar event id required' using errcode = '22023';
  end if;
  v_starts := case when v_time_known
    then (p_date + p_time::time) at time zone 'Europe/Rome'
    else p_date::timestamp at time zone 'Europe/Rome' end;

  insert into public.scd_events
    (organization_id, season_id, event_type, title, starts_at, status, visibility, location_text,
     source_id, source_record_id, source_verified_at, metadata)
  values
    (p_organization_id, v_season, 'MATCH', left(p_title, 200), v_starts, 'PLANNED', 'TEAM', left(p_venue, 200),
     'MASTER_CALENDARIO_2026_27', p_source_record_id, now(),
     jsonb_build_object('team_id', v_team, 'team_code', p_team_code, 'time_known', v_time_known, 'competition', left(coalesce(p_competition, ''), 80)))
  on conflict (organization_id, source_id, source_record_id) where source_record_id is not null
  do update set title = excluded.title, starts_at = excluded.starts_at, location_text = excluded.location_text,
                metadata = excluded.metadata, source_verified_at = now(), updated_at = now()
  returning id into v_event;

  insert into public.scd_matches
    (organization_id, event_id, campionato_name, home_team, away_team, venue_name, source_id, source_record_id, source_verified_at)
  values
    (p_organization_id, v_event, left(coalesce(p_competition, 'Gara'), 80), left(p_home_team, 120), left(p_away_team, 120),
     left(coalesce(p_venue, 'Da definire'), 200), 'MASTER_CALENDARIO_2026_27', p_source_record_id, now())
  on conflict (event_id) do update
    set campionato_name = excluded.campionato_name, home_team = excluded.home_team, away_team = excluded.away_team,
        venue_name = excluded.venue_name, source_verified_at = now(), updated_at = now()
  returning id into v_match;
  return v_match;
end;
$$;

-- Send (or update) call-ups. One outcome per athlete; ineligible athletes are reported, never forced.
create or replace function public.scd_staff_send_callups(
  p_organization_id uuid,
  p_match_id uuid,
  p_athlete_ids uuid[],
  p_meeting_at timestamptz,
  p_meeting_place text,
  p_kit_note text
)
returns table (athlete_id uuid, outcome text)
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
#variable_conflict use_column
declare
  v_team uuid := public.scd_match_team_id(p_match_id);
  v_starts timestamptz;
  v_id uuid;
begin
  if v_team is null or v_team not in (select public.scd_my_team_ids(p_organization_id)) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select e.starts_at into v_starts from public.scd_matches m join public.scd_events e on e.id = m.event_id
  where m.id = p_match_id and m.organization_id = p_organization_id;
  if v_starts is null or v_starts < now() - interval '12 hours' then
    raise exception 'match already played' using errcode = '22023';
  end if;
  if coalesce(array_length(p_athlete_ids, 1), 0) = 0 or array_length(p_athlete_ids, 1) > 40 then
    raise exception 'between 1 and 40 athletes' using errcode = '22023';
  end if;

  foreach v_id in array p_athlete_ids loop
    athlete_id := v_id;
    if not exists (
      select 1 from public.scd_team_memberships tm
      where tm.athlete_id = v_id and tm.team_id = v_team and (tm.valid_to is null or tm.valid_to >= current_date)
    ) then
      outcome := 'NOT_IN_TEAM';
      return next;
      continue;
    end if;
    begin
      insert into public.scd_match_callups
        (organization_id, match_id, athlete_id, meeting_at, meeting_place, kit_note, response_status, created_by_user_id)
      values
        (p_organization_id, p_match_id, v_id, p_meeting_at, left(p_meeting_place, 160), left(p_kit_note, 300), 'PENDING', (select auth.uid()))
      on conflict (match_id, athlete_id) do update
        set meeting_at = excluded.meeting_at, meeting_place = excluded.meeting_place, kit_note = excluded.kit_note, updated_at = now();
      outcome := 'SENT';
    exception when others then
      outcome := case
        when sqlerrm like '%medical certificate%' then 'CERTIFICATE'
        when sqlerrm like '%FIGC registration%' then 'REGISTRATION'
        else 'ERROR' end;
    end;
    return next;
  end loop;

  update public.scd_matches set convocazioni_status = 'INVIATE', updated_at = now()
  where id = p_match_id and exists (select 1 from public.scd_match_callups c where c.match_id = p_match_id);
end;
$$;

-- Staff view of one calendar event: who is called up and what they answered.
create or replace function public.scd_team_event_callups(p_organization_id uuid, p_source_record_id text)
returns table (
  callup_id uuid,
  match_id uuid,
  athlete_id uuid,
  display_name text,
  response_status text,
  meeting_at timestamptz,
  meeting_place text,
  kit_note text,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path to 'public'
as $$
  select c.id, m.id, c.athlete_id,
    coalesce(nullif(p.display_name, ''), trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, ''))),
    c.response_status, c.meeting_at, c.meeting_place, c.kit_note, c.updated_at
  from public.scd_events e
  join public.scd_matches m on m.event_id = e.id
  join public.scd_match_callups c on c.match_id = m.id
  join public.scd_athletes a on a.id = c.athlete_id
  join public.scd_people p on p.id = a.person_id
  where e.organization_id = p_organization_id
    and e.source_id = 'MASTER_CALENDARIO_2026_27'
    and e.source_record_id = p_source_record_id
    and nullif(e.metadata->>'team_id', '')::uuid in (select public.scd_my_team_ids(p_organization_id))
  order by p.last_name, p.first_name;
$$;

-- Athlete / family view: upcoming call-ups of the caller's circle (self + guarded family members).
create or replace function public.scd_my_callups(p_organization_id uuid)
returns table (
  callup_id uuid,
  person_id uuid,
  display_name text,
  relationship text,
  team_code text,
  title text,
  starts_at timestamptz,
  time_known boolean,
  venue text,
  meeting_at timestamptz,
  meeting_place text,
  kit_note text,
  response_status text
)
language sql
stable
security definer
set search_path to 'public'
as $$
  select c.id, f.person_id, f.display_name, f.relationship, e.metadata->>'team_code', e.title, e.starts_at,
    coalesce((e.metadata->>'time_known')::boolean, false), e.location_text,
    c.meeting_at, c.meeting_place, c.kit_note, c.response_status
  from public.scd_my_family(p_organization_id) f
  join public.scd_athletes a on a.person_id = f.person_id
  join public.scd_match_callups c on c.athlete_id = a.id and c.organization_id = p_organization_id
  join public.scd_matches m on m.id = c.match_id
  join public.scd_events e on e.id = m.event_id
  where e.starts_at >= now() - interval '3 hours'
  order by e.starts_at, f.display_name;
$$;

create or replace function public.scd_respond_callup(p_organization_id uuid, p_callup_id uuid, p_response text)
returns text
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v_person uuid;
  v_starts timestamptz;
begin
  if p_response not in ('CONFIRMED', 'DECLINED') then
    raise exception 'invalid response' using errcode = '22023';
  end if;
  select a.person_id, e.starts_at into v_person, v_starts
  from public.scd_match_callups c
  join public.scd_athletes a on a.id = c.athlete_id
  join public.scd_matches m on m.id = c.match_id
  join public.scd_events e on e.id = m.event_id
  where c.id = p_callup_id and c.organization_id = p_organization_id;
  if v_person is null or v_person not in (select f.person_id from public.scd_my_family(p_organization_id) f) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if v_starts < now() then
    raise exception 'match already started' using errcode = '22023';
  end if;
  update public.scd_match_callups set response_status = p_response, updated_at = now() where id = p_callup_id;
  return p_response;
end;
$$;

revoke all on function public.scd_match_team_id(uuid) from public, anon, authenticated;
revoke all on function public.scd_staff_ensure_match(uuid, text, text, date, text, text, text, text, text, text) from public, anon;
revoke all on function public.scd_staff_send_callups(uuid, uuid, uuid[], timestamptz, text, text) from public, anon;
revoke all on function public.scd_team_event_callups(uuid, text) from public, anon;
revoke all on function public.scd_my_callups(uuid) from public, anon;
revoke all on function public.scd_respond_callup(uuid, uuid, text) from public, anon;
grant execute on function public.scd_staff_ensure_match(uuid, text, text, date, text, text, text, text, text, text) to authenticated;
grant execute on function public.scd_staff_send_callups(uuid, uuid, uuid[], timestamptz, text, text) to authenticated;
grant execute on function public.scd_team_event_callups(uuid, text) to authenticated;
grant execute on function public.scd_my_callups(uuid) to authenticated;
grant execute on function public.scd_respond_callup(uuid, uuid, text) to authenticated;

-- Person -> athlete ids of the caller's teams (the call-up panel sends athlete ids).
create or replace function public.scd_my_team_athlete_ids(p_organization_id uuid)
returns table (person_id uuid, athlete_id uuid)
language sql
stable
security definer
set search_path to 'public'
as $$
  select distinct a.person_id, a.id
  from public.scd_team_memberships tm
  join public.scd_athletes a on a.id = tm.athlete_id
  where tm.team_id in (select public.scd_my_team_ids(p_organization_id))
    and (tm.valid_to is null or tm.valid_to >= current_date);
$$;
revoke all on function public.scd_my_team_athlete_ids(uuid) from public, anon;
grant execute on function public.scd_my_team_athlete_ids(uuid) to authenticated;
