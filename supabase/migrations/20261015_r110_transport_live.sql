-- r110: "Pulmino in diretta" phase 1 — live position of a minibus run shared by the volunteer driver's phone
-- (2026-10-15, chat CLOUD range r110-r129). STAGED: written, NOT applied.
-- Apply only after the Direzione's explicit OK, the DPIA and the volunteer drivers' acknowledgement text are approved.
-- Requires r74 (scd_transport_runs, scd_transport_drivers, scd_has_position), r61 (scd_my_family) and
-- r84 (scd_transport_requests, scd_transport_office) already applied.
--
-- Decisions (Direzione 2026-10-15): every driver is a volunteer. Phase 1 = the driver's phone, no map, text only
-- (distance and estimated arrival, always labelled "stima"), one position every 15 seconds, position points deleted
-- within 24 hours, session log kept 90 days, automatic close 60 minutes after the planned end of the run
-- (or 60 minutes without any position).
--
-- What it adds (additive only, no existing table or row is changed, no row is inserted):
--   * scd_transport_live_drivers: which app account drives which driver of the Master (scd_transport_drivers is a copy
--     of the 05_PULMINI sheet and has no account), set by the transport office, plus the volunteer's acknowledgement
--     (time and text version) given on the phone before the first shared run;
--   * scd_transport_live_sessions: one row per shared run (who, when, planned expiry, how it ended) — the 90-day log;
--   * scd_transport_live_points: the positions (lat/lng/accuracy/speed/heading/time) — deleted after 24 hours.
--
-- Access: the three tables have RLS on, NO policy and NO grant (nobody reads or writes them directly); everything goes
-- through the SECURITY DEFINER functions below:
--   * scd_transport_live_start: only the account linked to the driver assigned to that run, on the day of the run;
--   * scd_transport_live_ping:  only the driver of an open, not expired session; at most one point every 10 seconds;
--   * scd_transport_live_stop:  the driver, or the transport office (Direzione, Segreteria, responsabile trasporti);
--   * scd_transport_live_view:  the driver (own runs of today), parents/guardians of a person with a CONFIRMED seat
--     request on that run (no names, no coordinates: status, last update, distance only) and the transport office;
--   * scd_transport_live_purge: scheduled job only (service_role): closes expired sessions, deletes points older than
--     24 hours and sessions older than 90 days;
--   * scd_transport_live_link_driver: transport office only.
-- No name of a minor is stored or returned by any of these functions.
-- The pure rules are mirrored in apps/superapp/src/lib/transport-live.ts and pinned by transport-live.test.ts.

create table if not exists public.scd_transport_live_drivers (
  driver_id uuid primary key references public.scd_transport_drivers(id),
  organization_id uuid not null references public.scd_organizations(id),
  user_id uuid not null,
  active boolean not null default true,
  linked_by uuid,
  linked_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  acknowledgement_version text check (acknowledgement_version is null or char_length(acknowledgement_version) <= 40)
);
create unique index if not exists scd_transport_live_drivers_user on public.scd_transport_live_drivers (organization_id, user_id) where active;

create table if not exists public.scd_transport_live_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id),
  run_id uuid not null references public.scd_transport_runs(id),
  driver_id uuid not null references public.scd_transport_drivers(id),
  driver_user_id uuid not null,
  status text not null default 'ATTIVA' check (status in ('ATTIVA', 'CHIUSA')),
  started_at timestamptz not null default now(),
  last_ping_at timestamptz,
  expires_at timestamptz not null,
  ended_at timestamptz,
  end_reason text check (end_reason is null or end_reason in ('AUTISTA', 'UFFICIO', 'SCADUTA')),
  target_label text check (target_label is null or char_length(target_label) <= 60),
  target_lat double precision check (target_lat is null or target_lat between -90 and 90),
  target_lng double precision check (target_lng is null or target_lng between -180 and 180),
  points_count integer not null default 0,
  check ((target_lat is null) = (target_lng is null))
);
create unique index if not exists scd_transport_live_sessions_one_open_run on public.scd_transport_live_sessions (run_id) where status = 'ATTIVA';
create unique index if not exists scd_transport_live_sessions_one_open_driver on public.scd_transport_live_sessions (driver_user_id) where status = 'ATTIVA';
create index if not exists scd_transport_live_sessions_started on public.scd_transport_live_sessions (organization_id, started_at);

create table if not exists public.scd_transport_live_points (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.scd_transport_live_sessions(id) on delete cascade,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  accuracy_m real check (accuracy_m is null or accuracy_m between 0 and 500),
  speed_mps real check (speed_mps is null or speed_mps between 0 and 70),
  heading_deg real check (heading_deg is null or heading_deg between 0 and 360),
  recorded_at timestamptz not null,
  received_at timestamptz not null default now()
);
create index if not exists scd_transport_live_points_session on public.scd_transport_live_points (session_id, received_at desc);
create index if not exists scd_transport_live_points_received on public.scd_transport_live_points (received_at);

alter table public.scd_transport_live_drivers enable row level security;
alter table public.scd_transport_live_sessions enable row level security;
alter table public.scd_transport_live_points enable row level security;
-- No table policies and no grants: every read and write goes through the SECURITY DEFINER functions below.
revoke all on table public.scd_transport_live_drivers, public.scd_transport_live_sessions, public.scd_transport_live_points
  from public, anon, authenticated;

-- Feature probe for the app (fail-closed until this migration is applied).
create or replace function public.scd_transport_live_engine()
returns text language sql immutable set search_path to 'public' as $$ select 'r110'::text; $$;

-- Minutes from midnight of an "HH:MM" text (r74 format), null when empty.
create or replace function public.scd_transport_live_minutes(p_hhmm text)
returns integer language sql immutable set search_path to 'public' as $$
  select case when p_hhmm ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
    then split_part(p_hhmm, ':', 1)::int * 60 + split_part(p_hhmm, ':', 2)::int end;
$$;

-- Planned end of a run in Europe/Rome: return estimate, or departure + 4 hours (same rule as scd_transport_plan_run).
create or replace function public.scd_transport_live_planned_end(p_run_date date, p_departure text, p_return text)
returns timestamptz language plpgsql immutable set search_path to 'public' as $$
declare
  v_start int := public.scd_transport_live_minutes(p_departure);
  v_end int := public.scd_transport_live_minutes(p_return);
begin
  if v_start is null then return null; end if;
  if v_end is null or v_end <= v_start then v_end := v_start + 240; end if;
  return (p_run_date + make_interval(mins => v_end)) at time zone 'Europe/Rome';
end;
$$;

-- Is a session still live? Open, before its expiry and with a position (or the start) in the last 60 minutes.
create or replace function public.scd_transport_live_is_open(p_status text, p_expires_at timestamptz, p_started_at timestamptz, p_last_ping_at timestamptz)
returns boolean language sql stable set search_path to 'public' as $$
  select p_status = 'ATTIVA' and now() < p_expires_at and coalesce(p_last_ping_at, p_started_at) > now() - interval '60 minutes';
$$;

-- Great-circle distance in km (haversine, mean Earth radius 6371 km). Mirrors haversineKm in transport-live.ts.
create or replace function public.scd_transport_live_km(p_lat1 double precision, p_lng1 double precision, p_lat2 double precision, p_lng2 double precision)
returns double precision language sql immutable set search_path to 'public' as $$
  select case when p_lat1 is null or p_lng1 is null or p_lat2 is null or p_lng2 is null then null else
    2 * 6371 * asin(least(1, sqrt(
      power(sin(radians(p_lat2 - p_lat1) / 2), 2)
      + cos(radians(p_lat1)) * cos(radians(p_lat2)) * power(sin(radians(p_lng2 - p_lng1) / 2), 2)))) end;
$$;

-- Today in Europe/Rome.
create or replace function public.scd_transport_live_today()
returns date language sql stable set search_path to 'public' as $$ select (now() at time zone 'Europe/Rome')::date; $$;

-- Transport office: link (or unlink) an app account to a driver of the Master. The account must be an active member of
-- the organization with the 'autista' position; a change of account clears the previous acknowledgement.
create or replace function public.scd_transport_live_link_driver(p_organization_id uuid, p_driver_id uuid, p_user_id uuid, p_active boolean)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_prev uuid;
begin
  if not public.scd_transport_office(p_organization_id) then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  if not exists (select 1 from public.scd_transport_drivers d where d.id = p_driver_id and d.organization_id = p_organization_id and d.active) then
    return jsonb_build_object('ok', false, 'code', 'driver');
  end if;
  if coalesce(p_active, false) and not exists (
      select 1 from public.scd_memberships m
      where m.organization_id = p_organization_id and m.user_id = p_user_id and m.active
        and jsonb_typeof(m.scope -> 'positions') = 'array'
        and exists (select 1 from jsonb_array_elements_text(m.scope -> 'positions') p where p = 'autista')) then
    return jsonb_build_object('ok', false, 'code', 'not_driver_account');
  end if;
  select user_id into v_prev from public.scd_transport_live_drivers where driver_id = p_driver_id;
  if coalesce(p_active, false) and exists (
      select 1 from public.scd_transport_live_drivers l
      where l.organization_id = p_organization_id and l.user_id = p_user_id and l.active and l.driver_id <> p_driver_id) then
    return jsonb_build_object('ok', false, 'code', 'account_already_linked');
  end if;
  insert into public.scd_transport_live_drivers (driver_id, organization_id, user_id, active, linked_by, linked_at)
  values (p_driver_id, p_organization_id, p_user_id, coalesce(p_active, false), auth.uid(), now())
  on conflict (driver_id) do update set user_id = excluded.user_id, active = excluded.active, linked_by = excluded.linked_by,
    linked_at = excluded.linked_at,
    acknowledged_at = case when public.scd_transport_live_drivers.user_id = excluded.user_id then public.scd_transport_live_drivers.acknowledged_at end,
    acknowledgement_version = case when public.scd_transport_live_drivers.user_id = excluded.user_id then public.scd_transport_live_drivers.acknowledgement_version end;
  insert into public.scd_audit_events (organization_id, actor_user_id, action, entity_type, entity_id, payload)
  values (p_organization_id, auth.uid(), 'TRANSPORT_LIVE_LINK_DRIVER', 'scd_transport_drivers', p_driver_id,
    jsonb_build_object('active', coalesce(p_active, false), 'accountChanged', v_prev is distinct from p_user_id));
  return jsonb_build_object('ok', true);
end;
$$;

-- Start sharing the position of a run. Only the account linked to the driver assigned to the run, on the day of the run,
-- from 60 minutes before departure until the planned end + 60 minutes. The first time, the volunteer must confirm the
-- acknowledgement (p_acknowledged with the text version shown on the phone). Idempotent for the same driver and run.
create or replace function public.scd_transport_live_start(
  p_organization_id uuid, p_run_id uuid, p_acknowledged boolean, p_ack_version text,
  p_target_label text, p_target_lat double precision, p_target_lng double precision)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_run public.scd_transport_runs%rowtype;
  v_link public.scd_transport_live_drivers%rowtype;
  v_end timestamptz;
  v_expires timestamptz;
  v_dep timestamptz;
  v_open public.scd_transport_live_sessions%rowtype;
  v_id uuid;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  select * into v_run from public.scd_transport_runs where id = p_run_id and organization_id = p_organization_id;
  if not found or v_run.status = 'ANNULLATA' or v_run.driver_id is null then
    return jsonb_build_object('ok', false, 'code', 'not_assigned');
  end if;
  select * into v_link from public.scd_transport_live_drivers
  where driver_id = v_run.driver_id and organization_id = p_organization_id and user_id = auth.uid() and active;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'not_assigned');
  end if;
  if v_run.run_date <> public.scd_transport_live_today() then
    return jsonb_build_object('ok', false, 'code', 'outside_window');
  end if;
  v_dep := (v_run.run_date + make_interval(mins => public.scd_transport_live_minutes(v_run.departure))) at time zone 'Europe/Rome';
  v_end := public.scd_transport_live_planned_end(v_run.run_date, v_run.departure, v_run.return_estimate);
  v_expires := v_end + interval '60 minutes';
  if v_dep is null or now() < v_dep - interval '60 minutes' or now() >= v_expires then
    return jsonb_build_object('ok', false, 'code', 'outside_window');
  end if;
  if v_link.acknowledged_at is null then
    if not coalesce(p_acknowledged, false) or coalesce(p_ack_version, '') !~ '^[A-Za-z0-9._-]{1,40}$' then
      return jsonb_build_object('ok', false, 'code', 'ack_required');
    end if;
    update public.scd_transport_live_drivers set acknowledged_at = now(), acknowledgement_version = p_ack_version
    where driver_id = v_link.driver_id;
  end if;
  if (p_target_lat is null) <> (p_target_lng is null)
     or (p_target_lat is not null and (p_target_lat not between -90 and 90 or p_target_lng not between -180 and 180))
     or char_length(coalesce(p_target_label, '')) > 60 then
    return jsonb_build_object('ok', false, 'code', 'invalid');
  end if;

  -- Close what is open but no longer live (expired or silent), so the unique indexes do not block a new start.
  update public.scd_transport_live_sessions s set status = 'CHIUSA', ended_at = now(), end_reason = 'SCADUTA'
  where s.status = 'ATTIVA' and (s.run_id = p_run_id or s.driver_user_id = auth.uid())
    and not public.scd_transport_live_is_open(s.status, s.expires_at, s.started_at, s.last_ping_at);

  select * into v_open from public.scd_transport_live_sessions where status = 'ATTIVA' and run_id = p_run_id;
  if found then
    if v_open.driver_user_id = auth.uid() then
      return jsonb_build_object('ok', true, 'id', v_open.id, 'expiresAt', v_open.expires_at, 'resumed', true);
    end if;
    return jsonb_build_object('ok', false, 'code', 'already_live');
  end if;
  if exists (select 1 from public.scd_transport_live_sessions where status = 'ATTIVA' and driver_user_id = auth.uid()) then
    return jsonb_build_object('ok', false, 'code', 'driver_busy');
  end if;

  insert into public.scd_transport_live_sessions (organization_id, run_id, driver_id, driver_user_id, expires_at,
    target_label, target_lat, target_lng)
  values (p_organization_id, p_run_id, v_run.driver_id, auth.uid(), v_expires,
    nullif(left(coalesce(p_target_label, ''), 60), ''), p_target_lat, p_target_lng)
  returning id into v_id;
  insert into public.scd_audit_events (organization_id, actor_user_id, action, entity_type, entity_id, payload)
  values (p_organization_id, auth.uid(), 'TRANSPORT_LIVE_START', 'scd_transport_runs', p_run_id,
    jsonb_build_object('session', v_id, 'expiresAt', v_expires));
  return jsonb_build_object('ok', true, 'id', v_id, 'expiresAt', v_expires, 'resumed', false);
end;
$$;

-- One position of an open session, from its driver only. Refused when the session is expired (it is closed here),
-- when the previous point is less than 10 seconds old, when the fix is older than 2 minutes or in the future, or when
-- the accuracy is worse than 500 m (not stored).
create or replace function public.scd_transport_live_ping(
  p_organization_id uuid, p_session_id uuid, p_lat double precision, p_lng double precision,
  p_accuracy real, p_speed real, p_heading real, p_recorded_at timestamptz)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_s public.scd_transport_live_sessions%rowtype;
begin
  select * into v_s from public.scd_transport_live_sessions
  where id = p_session_id and organization_id = p_organization_id and driver_user_id = auth.uid()
  for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;
  if v_s.status <> 'ATTIVA' then
    return jsonb_build_object('ok', false, 'code', 'closed');
  end if;
  if not public.scd_transport_live_is_open(v_s.status, v_s.expires_at, v_s.started_at, v_s.last_ping_at) then
    update public.scd_transport_live_sessions set status = 'CHIUSA', ended_at = now(), end_reason = 'SCADUTA' where id = v_s.id;
    return jsonb_build_object('ok', false, 'code', 'expired');
  end if;
  if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180
     or (p_speed is not null and p_speed not between 0 and 70)
     or (p_heading is not null and p_heading not between 0 and 360)
     or p_recorded_at is null then
    return jsonb_build_object('ok', false, 'code', 'invalid');
  end if;
  if p_accuracy is null or p_accuracy < 0 or p_accuracy > 500 then
    return jsonb_build_object('ok', false, 'code', 'inaccurate');
  end if;
  if p_recorded_at < now() - interval '2 minutes' or p_recorded_at > now() + interval '30 seconds' then
    return jsonb_build_object('ok', false, 'code', 'stale');
  end if;
  if v_s.last_ping_at is not null and v_s.last_ping_at > now() - interval '10 seconds' then
    return jsonb_build_object('ok', false, 'code', 'too_soon');
  end if;
  insert into public.scd_transport_live_points (session_id, lat, lng, accuracy_m, speed_mps, heading_deg, recorded_at)
  values (v_s.id, p_lat, p_lng, p_accuracy, p_speed, p_heading, p_recorded_at);
  update public.scd_transport_live_sessions set last_ping_at = now(), points_count = points_count + 1 where id = v_s.id;
  return jsonb_build_object('ok', true, 'expiresAt', v_s.expires_at);
end;
$$;

-- End sharing: the driver of the session, or the transport office.
create or replace function public.scd_transport_live_stop(p_organization_id uuid, p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_s public.scd_transport_live_sessions%rowtype;
  v_office boolean := public.scd_transport_office(p_organization_id);
begin
  select * into v_s from public.scd_transport_live_sessions where id = p_session_id and organization_id = p_organization_id for update;
  if not found or not (v_s.driver_user_id = auth.uid() or v_office) then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;
  if v_s.status <> 'ATTIVA' then
    return jsonb_build_object('ok', true, 'already', true);
  end if;
  update public.scd_transport_live_sessions set status = 'CHIUSA', ended_at = now(),
    end_reason = case when v_s.driver_user_id = auth.uid() then 'AUTISTA' else 'UFFICIO' end
  where id = v_s.id;
  insert into public.scd_audit_events (organization_id, actor_user_id, action, entity_type, entity_id, payload)
  values (p_organization_id, auth.uid(), 'TRANSPORT_LIVE_STOP', 'scd_transport_runs', v_s.run_id,
    jsonb_build_object('session', v_s.id, 'points', v_s.points_count));
  return jsonb_build_object('ok', true);
end;
$$;

-- What the caller may see of today's runs.
--   driver:  linked account, acknowledgement state and today's runs assigned to that driver, with the open session;
--   live:    today's runs the caller may follow (office: every run with a session today; family: runs of an away match
--            where a person of the caller's circle has a CONFIRMED seat request), with status, last update, distance
--            to the arrival point and the average recent speed. Coordinates only for the transport office.
-- Never a name of a person.
create or replace function public.scd_transport_live_view(p_organization_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_today date := public.scd_transport_live_today();
  v_office boolean := public.scd_transport_office(p_organization_id);
  v_link public.scd_transport_live_drivers%rowtype;
  v_member boolean;
begin
  select exists (select 1 from public.scd_memberships m where m.organization_id = p_organization_id and m.user_id = (select auth.uid()) and m.active)
    into v_member;
  if not coalesce(v_member, false) then
    return null;
  end if;
  select * into v_link from public.scd_transport_live_drivers
  where organization_id = p_organization_id and user_id = (select auth.uid()) and active;

  return jsonb_build_object(
    'engine', 'r110',
    'office', v_office,
    'driver', case when v_link.driver_id is null then null else jsonb_build_object(
      'acknowledged', v_link.acknowledged_at is not null,
      'runs', coalesce((select jsonb_agg(jsonb_build_object(
          'runId', t.id, 'title', t.title, 'kind', t.kind, 'date', t.run_date, 'departure', t.departure,
          'returnEstimate', t.return_estimate, 'destination', t.destination, 'meetingPoint', t.meeting_point,
          'session', (select jsonb_build_object('id', s.id, 'startedAt', s.started_at, 'lastPingAt', s.last_ping_at,
              'expiresAt', s.expires_at, 'targetLabel', s.target_label)
            from public.scd_transport_live_sessions s
            where s.run_id = t.id and s.driver_user_id = (select auth.uid())
              and public.scd_transport_live_is_open(s.status, s.expires_at, s.started_at, s.last_ping_at)
            limit 1)) order by t.departure)
        from public.scd_transport_runs t
        where t.organization_id = p_organization_id and t.run_date = v_today and t.status <> 'ANNULLATA'
          and t.driver_id = v_link.driver_id), '[]'::jsonb)) end,
    'live', coalesce((select jsonb_agg(x.item order by x.departure) from (
        select t.departure, jsonb_build_object(
          'runId', t.id, 'title', t.title, 'kind', t.kind, 'departure', t.departure, 'returnEstimate', t.return_estimate,
          'state', case
            when s.id is null then 'NON_PARTITO'
            when public.scd_transport_live_is_open(s.status, s.expires_at, s.started_at, s.last_ping_at) then 'IN_VIAGGIO'
            else 'CONCLUSO' end,
          'startedAt', s.started_at,
          'endedAt', case when s.id is not null and not public.scd_transport_live_is_open(s.status, s.expires_at, s.started_at, s.last_ping_at)
            then coalesce(s.ended_at, least(s.expires_at, coalesce(s.last_ping_at, s.started_at) + interval '60 minutes')) end,
          'lastUpdate', case when public.scd_transport_live_is_open(s.status, s.expires_at, s.started_at, s.last_ping_at) then p.received_at end,
          'targetLabel', s.target_label,
          'distanceKm', case when public.scd_transport_live_is_open(s.status, s.expires_at, s.started_at, s.last_ping_at)
            then round(public.scd_transport_live_km(p.lat, p.lng, s.target_lat, s.target_lng)::numeric, 2) end,
          'avgSpeedKmh', case when public.scd_transport_live_is_open(s.status, s.expires_at, s.started_at, s.last_ping_at)
            then (select round((avg(q.speed_mps) * 3.6)::numeric, 1) from (
              select q1.speed_mps from public.scd_transport_live_points q1
              where q1.session_id = s.id and q1.speed_mps is not null order by q1.received_at desc limit 5) q) end,
          'position', case when v_office and public.scd_transport_live_is_open(s.status, s.expires_at, s.started_at, s.last_ping_at) and p.id is not null
            then jsonb_build_object('lat', p.lat, 'lng', p.lng, 'accuracy', p.accuracy_m) end
        ) as item
        from public.scd_transport_runs t
        left join lateral (
          select * from public.scd_transport_live_sessions s1
          where s1.run_id = t.id and (s1.started_at at time zone 'Europe/Rome')::date >= v_today - 1
          order by (s1.status = 'ATTIVA') desc, s1.started_at desc limit 1) s on true
        left join lateral (
          select * from public.scd_transport_live_points p1
          where p1.session_id = s.id order by p1.received_at desc limit 1) p on true
        where t.organization_id = p_organization_id and t.run_date = v_today and t.status <> 'ANNULLATA'
          and (
            (v_office and s.id is not null)
            or (t.event_source_id is not null and exists (
              select 1 from public.scd_transport_requests r
              where r.organization_id = p_organization_id and r.event_source_id = t.event_source_id and r.status = 'CONFERMATA'
                and r.person_id in (select f.person_id from public.scd_my_family(p_organization_id) f)))
          )
      ) x), '[]'::jsonb)
  );
end;
$$;

-- Scheduled job (service_role only): close sessions no longer live, delete points older than 24 hours and sessions
-- (the log) older than 90 days. Returns counts only.
create or replace function public.scd_transport_live_purge()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_closed int;
  v_points int;
  v_sessions int;
begin
  update public.scd_transport_live_sessions s set status = 'CHIUSA',
    ended_at = least(now(), greatest(s.started_at, least(s.expires_at, coalesce(s.last_ping_at, s.started_at) + interval '60 minutes'))),
    end_reason = 'SCADUTA'
  where s.status = 'ATTIVA' and not public.scd_transport_live_is_open(s.status, s.expires_at, s.started_at, s.last_ping_at);
  get diagnostics v_closed = row_count;
  delete from public.scd_transport_live_points where received_at < now() - interval '24 hours';
  get diagnostics v_points = row_count;
  delete from public.scd_transport_live_sessions where started_at < now() - interval '90 days' and status = 'CHIUSA';
  get diagnostics v_sessions = row_count;
  return jsonb_build_object('closedSessions', v_closed, 'deletedPoints', v_points, 'deletedSessions', v_sessions);
end;
$$;

revoke all on function public.scd_transport_live_engine() from public;
revoke all on function public.scd_transport_live_minutes(text) from public, anon;
revoke all on function public.scd_transport_live_planned_end(date, text, text) from public, anon;
revoke all on function public.scd_transport_live_is_open(text, timestamptz, timestamptz, timestamptz) from public, anon;
revoke all on function public.scd_transport_live_km(double precision, double precision, double precision, double precision) from public, anon;
revoke all on function public.scd_transport_live_today() from public, anon;
revoke all on function public.scd_transport_live_link_driver(uuid, uuid, uuid, boolean) from public, anon;
revoke all on function public.scd_transport_live_start(uuid, uuid, boolean, text, text, double precision, double precision) from public, anon;
revoke all on function public.scd_transport_live_ping(uuid, uuid, double precision, double precision, real, real, real, timestamptz) from public, anon;
revoke all on function public.scd_transport_live_stop(uuid, uuid) from public, anon;
revoke all on function public.scd_transport_live_view(uuid) from public, anon;
revoke all on function public.scd_transport_live_purge() from public, anon, authenticated;

grant execute on function public.scd_transport_live_engine() to anon, authenticated;
grant execute on function public.scd_transport_live_link_driver(uuid, uuid, uuid, boolean) to authenticated;
grant execute on function public.scd_transport_live_start(uuid, uuid, boolean, text, text, double precision, double precision) to authenticated;
grant execute on function public.scd_transport_live_ping(uuid, uuid, double precision, double precision, real, real, real, timestamptz) to authenticated;
grant execute on function public.scd_transport_live_stop(uuid, uuid) to authenticated;
grant execute on function public.scd_transport_live_view(uuid) to authenticated;
grant execute on function public.scd_transport_live_purge() to service_role;
