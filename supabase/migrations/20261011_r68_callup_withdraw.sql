-- r68: the mister takes an athlete out of a call-up already sent (Direzione "Si", 2026-10-11 20:06).
-- Replaces the pending r62_1 (which removed the row): here nothing is removed, the call-up is marked withdrawn
-- (withdrawn_at / withdrawn_by) and stays in the history.
--   * only team staff of that match (scd_my_team_ids), only before kick-off;
--   * withdrawn call-ups disappear from the staff view, the family view, the answers and the push list;
--   * calling the athlete up again clears the withdrawal, resets the answer to PENDING and notifies again.
-- Same signatures as r62 / r67 (create or replace). Additive only.

alter table public.scd_match_callups
  add column if not exists withdrawn_at timestamptz,
  add column if not exists withdrawn_by uuid;

create or replace function public.scd_staff_withdraw_callups(p_organization_id uuid, p_callup_ids uuid[])
returns integer
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v_ids uuid[] := (select coalesce(array_agg(distinct x), '{}') from unnest(coalesce(p_callup_ids, '{}')) x);
  v_bad integer;
  v_n integer;
begin
  if coalesce(array_length(v_ids, 1), 0) = 0 or array_length(v_ids, 1) > 40 then
    raise exception 'between 1 and 40 call-ups' using errcode = '22023';
  end if;
  select count(*) into v_bad
  from unnest(v_ids) i(id)
  left join public.scd_match_callups c on c.id = i.id and c.organization_id = p_organization_id
  left join public.scd_matches m on m.id = c.match_id
  left join public.scd_events e on e.id = m.event_id
  where c.id is null
     or public.scd_match_team_id(c.match_id) is null
     or public.scd_match_team_id(c.match_id) not in (select public.scd_my_team_ids(p_organization_id))
     or e.starts_at < now();
  if v_bad > 0 then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.scd_match_callups
    set withdrawn_at = now(), withdrawn_by = (select auth.uid()), updated_at = now()
    where id = any(v_ids) and withdrawn_at is null;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

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
      insert into public.scd_match_callups as c
        (organization_id, match_id, athlete_id, meeting_at, meeting_place, kit_note, response_status, created_by_user_id)
      values
        (p_organization_id, p_match_id, v_id, p_meeting_at, left(p_meeting_place, 160), left(p_kit_note, 300), 'PENDING', (select auth.uid()))
      on conflict (match_id, athlete_id) do update
        set meeting_at = excluded.meeting_at, meeting_place = excluded.meeting_place, kit_note = excluded.kit_note, updated_at = now(),
            response_status = case when c.withdrawn_at is not null then 'PENDING' else c.response_status end,
            notified_at = case when c.withdrawn_at is not null then null else c.notified_at end,
            withdrawn_at = null,
            withdrawn_by = null;
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
  where id = p_match_id and exists (select 1 from public.scd_match_callups c where c.match_id = p_match_id and c.withdrawn_at is null);
end;
$$;

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
  join public.scd_match_callups c on c.match_id = m.id and c.withdrawn_at is null
  join public.scd_athletes a on a.id = c.athlete_id
  join public.scd_people p on p.id = a.person_id
  where e.organization_id = p_organization_id
    and e.source_id = 'MASTER_CALENDARIO_2026_27'
    and e.source_record_id = p_source_record_id
    and nullif(e.metadata->>'team_id', '')::uuid in (select public.scd_my_team_ids(p_organization_id))
  order by p.last_name, p.first_name;
$$;

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
  join public.scd_match_callups c on c.athlete_id = a.id and c.organization_id = p_organization_id and c.withdrawn_at is null
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
  where c.id = p_callup_id and c.organization_id = p_organization_id and c.withdrawn_at is null;
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

create or replace function public.scd_push_callup_targets(p_match_id uuid)
returns table (
  callup_id uuid,
  first_name text,
  title text,
  starts_at timestamptz,
  time_known boolean,
  meeting_at timestamptz,
  subscription_id uuid,
  endpoint text,
  p256dh text,
  auth text
)
language sql
stable
security definer
set search_path to 'public'
as $$
  with pending as (
    select c.id as callup_id, c.organization_id, a.person_id, p.first_name, e.title, e.starts_at,
           coalesce((e.metadata->>'time_known')::boolean, false) as time_known, c.meeting_at
    from public.scd_match_callups c
    join public.scd_athletes a on a.id = c.athlete_id
    join public.scd_people p on p.id = a.person_id
    join public.scd_matches m on m.id = c.match_id
    join public.scd_events e on e.id = m.event_id
    where c.match_id = p_match_id and c.notified_at is null and c.withdrawn_at is null and e.starts_at >= now() - interval '3 hours'
  ),
  circle as (
    select pd.callup_id, pd.person_id as recipient_person from pending pd
    union
    select pd.callup_id, g.person_id
    from pending pd
    join public.scd_family_members fm on fm.person_id = pd.person_id
    join public.scd_families f on f.id = fm.family_id and f.organization_id = pd.organization_id
    join public.scd_family_members g on g.family_id = fm.family_id and g.is_guardian and g.person_id <> pd.person_id
  ),
  users as (
    select distinct c.callup_id, l.user_id
    from circle c
    join pending pd on pd.callup_id = c.callup_id
    join public.scd_identity_links l
      on l.person_id = c.recipient_person and l.organization_id = pd.organization_id
     and l.link_state in ('AUTO_VERIFIED','VERIFIED_BY_STAFF')
    join public.scd_memberships mb on mb.organization_id = l.organization_id and mb.user_id = l.user_id and mb.active
  )
  select pd.callup_id, pd.first_name, pd.title, pd.starts_at, pd.time_known, pd.meeting_at, s.id, s.endpoint, s.p256dh, s.auth
  from users u
  join pending pd on pd.callup_id = u.callup_id
  join public.scd_push_subscriptions s on s.user_id = u.user_id and s.organization_id = pd.organization_id and s.disabled_at is null;
$$;

revoke all on function public.scd_staff_withdraw_callups(uuid, uuid[]) from public, anon;
grant execute on function public.scd_staff_withdraw_callups(uuid, uuid[]) to authenticated;
revoke all on function public.scd_push_callup_targets(uuid) from public, anon, authenticated;
grant execute on function public.scd_push_callup_targets(uuid) to service_role;
