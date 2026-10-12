-- r84: Pulmini — weekend transport requests from families (Francesco, 12/10/2026: "perché non compare la possibilità di
-- chiedere il pulmino nel fine settimana"). A guardian asks a seat for a person of their own circle (scd_my_family) on an
-- away match of the official calendar (event id of the calendar copy, the same key used by scd_transport_runs). The
-- transport office (Direzione, Segreteria, responsabile trasporti) confirms or answers "non possibile"; every step is
-- logged. The request never assigns a seat by itself: seats are planned on the trip (scd_transport_plan_run).
-- Names are returned only to the transport office and to the family itself. Additive only.

create table if not exists public.scd_transport_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id),
  event_source_id text not null check (char_length(event_source_id) between 3 and 120),
  event_date date not null,
  team_code text not null check (char_length(team_code) between 2 and 30),
  event_label text check (event_label is null or char_length(event_label) <= 160),
  person_id uuid not null references public.scd_people(id),
  direction text not null default 'ANDATA_RITORNO' check (direction in ('ANDATA', 'RITORNO', 'ANDATA_RITORNO')),
  stop_id uuid references public.scd_transport_stops(id),
  note text check (note is null or char_length(note) <= 200),
  status text not null default 'RICHIESTA' check (status in ('RICHIESTA', 'CONFERMATA', 'NON_POSSIBILE', 'ANNULLATA')),
  decision_note text check (decision_note is null or char_length(decision_note) <= 200),
  requested_by uuid not null,
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, event_source_id, person_id)
);
create index if not exists scd_transport_requests_date on public.scd_transport_requests (organization_id, event_date);
alter table public.scd_transport_requests enable row level security;
revoke all on table public.scd_transport_requests from anon, authenticated;

create table if not exists public.scd_transport_request_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null,
  request_id uuid not null references public.scd_transport_requests(id),
  action text not null check (action in ('RICHIESTA', 'MODIFICATA', 'ANNULLATA', 'CONFERMATA', 'NON_POSSIBILE')),
  actor uuid,
  note text,
  at timestamptz not null default now()
);
alter table public.scd_transport_request_events enable row level security;
revoke all on table public.scd_transport_request_events from anon, authenticated;

create or replace function public.scd_transport_office(p_organization_id uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select public.scd_has_org_role(p_organization_id, array['DIRECTION','SECRETARIAT']::public.scd_role[])
    or public.scd_has_position(p_organization_id, array['responsabile-trasporti','direzione','presidente','direttore-generale']);
$$;
revoke all on function public.scd_transport_office(uuid) from public, anon;

-- Stops a family can choose (place and town only). Any signed-in member of the organization.
create or replace function public.scd_transport_stop_options(p_organization_id uuid)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  select case when not exists (
      select 1 from public.scd_memberships m
      where m.organization_id = p_organization_id and m.user_id = (select auth.uid()) and m.active)
    then '[]'::jsonb
    else coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'line', s.line_label, 'town', s.town, 'place', s.place)
        order by s.line_id, s.position)
      from public.scd_transport_stops s where s.organization_id = p_organization_id and s.active), '[]'::jsonb)
  end;
$$;
revoke all on function public.scd_transport_stop_options(uuid) from public, anon;
grant execute on function public.scd_transport_stop_options(uuid) to authenticated;

-- The caller's own requests (people of their circle), from today on.
create or replace function public.scd_my_transport_requests(p_organization_id uuid)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', r.id, 'eventId', r.event_source_id, 'date', r.event_date, 'teamCode', r.team_code, 'event', r.event_label,
      'personId', r.person_id, 'direction', r.direction, 'stopId', r.stop_id,
      'stop', nullif(trim(coalesce(s.place, '') || ' ' || coalesce(s.town, '')), ''),
      'note', r.note, 'status', r.status, 'decisionNote', r.decision_note, 'updatedAt', r.updated_at)
    order by r.event_date, r.created_at), '[]'::jsonb)
  from public.scd_transport_requests r
  left join public.scd_transport_stops s on s.id = r.stop_id
  where r.organization_id = p_organization_id
    and r.event_date >= current_date
    and r.person_id in (select f.person_id from public.scd_my_family(p_organization_id) f);
$$;
revoke all on function public.scd_my_transport_requests(uuid) from public, anon;
grant execute on function public.scd_my_transport_requests(uuid) to authenticated;

-- Ask (or change) a seat. Only for a person of the caller's circle, for a future date, with a stop of the club.
create or replace function public.scd_request_transport(p_organization_id uuid, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_person uuid := nullif(p_payload->>'personId', '')::uuid;
  v_event text := nullif(trim(p_payload->>'eventId'), '');
  v_date date := nullif(p_payload->>'date', '')::date;
  v_team text := nullif(trim(p_payload->>'teamCode'), '');
  v_direction text := coalesce(nullif(p_payload->>'direction', ''), 'ANDATA_RITORNO');
  v_stop uuid := nullif(p_payload->>'stopId', '')::uuid;
  v_note text := left(nullif(trim(p_payload->>'note'), ''), 200);
  v_label text := left(nullif(trim(p_payload->>'event'), ''), 160);
  v_id uuid;
  v_prev text;
begin
  if v_person is null or v_event is null or v_date is null or v_team is null then
    return jsonb_build_object('ok', false, 'code', 'missing');
  end if;
  if v_person not in (select f.person_id from public.scd_my_family(p_organization_id) f) then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  if v_date < current_date then
    return jsonb_build_object('ok', false, 'code', 'past');
  end if;
  if v_direction not in ('ANDATA', 'RITORNO', 'ANDATA_RITORNO') then
    return jsonb_build_object('ok', false, 'code', 'direction');
  end if;
  if v_stop is not null and not exists (
      select 1 from public.scd_transport_stops s where s.id = v_stop and s.organization_id = p_organization_id and s.active) then
    return jsonb_build_object('ok', false, 'code', 'stop');
  end if;

  select id, status into v_id, v_prev from public.scd_transport_requests
    where organization_id = p_organization_id and event_source_id = v_event and person_id = v_person;
  if v_id is null then
    insert into public.scd_transport_requests (organization_id, event_source_id, event_date, team_code, event_label,
      person_id, direction, stop_id, note, requested_by)
    values (p_organization_id, v_event, v_date, v_team, v_label, v_person, v_direction, v_stop, v_note, auth.uid())
    returning id into v_id;
    insert into public.scd_transport_request_events (organization_id, request_id, action, actor)
      values (p_organization_id, v_id, 'RICHIESTA', auth.uid());
  else
    if v_prev = 'CONFERMATA' then
      return jsonb_build_object('ok', false, 'code', 'confirmed');
    end if;
    update public.scd_transport_requests set direction = v_direction, stop_id = v_stop, note = v_note,
      event_label = coalesce(v_label, event_label), status = 'RICHIESTA', decision_note = null, decided_by = null,
      decided_at = null, requested_by = auth.uid(), updated_at = now()
      where id = v_id;
    insert into public.scd_transport_request_events (organization_id, request_id, action, actor)
      values (p_organization_id, v_id, case when v_prev = 'RICHIESTA' then 'MODIFICATA' else 'RICHIESTA' end, auth.uid());
  end if;
  return jsonb_build_object('ok', true, 'id', v_id, 'status', 'RICHIESTA');
end;
$$;
revoke all on function public.scd_request_transport(uuid, jsonb) from public, anon;
grant execute on function public.scd_request_transport(uuid, jsonb) to authenticated;

-- Withdraw a request (family). A confirmed seat can be withdrawn too: the office sees it as ANNULLATA.
create or replace function public.scd_cancel_transport_request(p_organization_id uuid, p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_person uuid;
  v_date date;
begin
  select person_id, event_date into v_person, v_date from public.scd_transport_requests
    where id = p_request_id and organization_id = p_organization_id;
  if v_person is null then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;
  if v_person not in (select f.person_id from public.scd_my_family(p_organization_id) f) then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  if v_date < current_date then
    return jsonb_build_object('ok', false, 'code', 'past');
  end if;
  update public.scd_transport_requests set status = 'ANNULLATA', updated_at = now() where id = p_request_id;
  insert into public.scd_transport_request_events (organization_id, request_id, action, actor)
    values (p_organization_id, p_request_id, 'ANNULLATA', auth.uid());
  return jsonb_build_object('ok', true, 'status', 'ANNULLATA');
end;
$$;
revoke all on function public.scd_cancel_transport_request(uuid, uuid) from public, anon;
grant execute on function public.scd_cancel_transport_request(uuid, uuid) to authenticated;

-- Requests of a period for the transport office (names included: they organise the seats). Null for anyone else.
create or replace function public.scd_transport_requests_board(p_organization_id uuid, p_from date, p_to date)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  select case when not public.scd_transport_office(p_organization_id) then null
  else coalesce((select jsonb_agg(jsonb_build_object(
      'id', r.id, 'eventId', r.event_source_id, 'date', r.event_date, 'teamCode', r.team_code, 'event', r.event_label,
      'name', coalesce(nullif(p.display_name, ''), trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, ''))),
      'direction', r.direction, 'stop', nullif(trim(coalesce(s.place, '') || ' ' || coalesce(s.town, '')), ''),
      'line', s.line_label, 'note', r.note, 'status', r.status, 'decisionNote', r.decision_note,
      'createdAt', r.created_at, 'updatedAt', r.updated_at)
    order by r.event_date, r.team_code, p.last_name, p.first_name)
    from public.scd_transport_requests r
    join public.scd_people p on p.id = r.person_id
    left join public.scd_transport_stops s on s.id = r.stop_id
    where r.organization_id = p_organization_id and r.event_date between p_from and p_to), '[]'::jsonb)
  end;
$$;
revoke all on function public.scd_transport_requests_board(uuid, date, date) from public, anon;
grant execute on function public.scd_transport_requests_board(uuid, date, date) to authenticated;

-- Office decision: CONFERMATA or NON_POSSIBILE (a reason is required for NON_POSSIBILE). Logged.
create or replace function public.scd_decide_transport_request(p_organization_id uuid, p_request_id uuid,
  p_decision text, p_note text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_status text;
  v_note text := left(nullif(trim(p_note), ''), 200);
begin
  if not public.scd_transport_office(p_organization_id) then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  if p_decision not in ('CONFERMATA', 'NON_POSSIBILE') then
    return jsonb_build_object('ok', false, 'code', 'decision');
  end if;
  if p_decision = 'NON_POSSIBILE' and v_note is null then
    return jsonb_build_object('ok', false, 'code', 'note_required');
  end if;
  select status into v_status from public.scd_transport_requests
    where id = p_request_id and organization_id = p_organization_id;
  if v_status is null then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;
  if v_status = 'ANNULLATA' then
    return jsonb_build_object('ok', false, 'code', 'cancelled');
  end if;
  update public.scd_transport_requests set status = p_decision, decision_note = v_note, decided_by = auth.uid(),
    decided_at = now(), updated_at = now() where id = p_request_id;
  insert into public.scd_transport_request_events (organization_id, request_id, action, actor, note)
    values (p_organization_id, p_request_id, p_decision, auth.uid(), v_note);
  return jsonb_build_object('ok', true, 'status', p_decision);
end;
$$;
revoke all on function public.scd_decide_transport_request(uuid, uuid, text, text) from public, anon;
grant execute on function public.scd_decide_transport_request(uuid, uuid, text, text) to authenticated;
