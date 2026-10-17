-- r114: Pulmini — «presa visione» of a confirmed seat by the family (start-up of the service 2026/27, 2026-10-17,
-- chat CLOUD range r110-r129). STAGED: written and tested on PGlite, NOT APPLIED. Apply only after Francesco writes
-- «applica r114». Target: SCD PULSE (ndevtxxijbcnskgysdit). Never on dfnwzwutvnwiitiffwvr.
-- Requires r84 (scd_transport_requests, scd_transport_request_events, scd_transport_office, scd_transport_stops) and
-- r61 (scd_my_family) already applied: a guard below stops the migration when one of them is missing.
--
-- Why (Francesco DG, 17/10/2026 11:36: «importante anche la piattaforma servizio pulmini che deve partire»): the flow is
-- famiglia chiede posto -> Responsabile servizio pulmini conferma -> posto sulla corsa -> presa visione. r84 stops at
-- the confirmation, so the office cannot tell whether the family has read day, stop and direction.
-- Engine: TEMPO (no more "hai visto?" in the chats). Measure: share of confirmed seats with a valid presa visione 24 hours
-- before departure (scd_transport_requests where status = 'CONFERMATA' and ack_at >= decided_at).
--
-- What it adds (additive only; no row is inserted, changed or removed):
--   1. scd_transport_requests.ack_at / ack_by: when and by whom the family took presa visione. Valid only while
--      ack_at >= decided_at: a new decision (or a changed request, which clears decided_at) makes it stale by itself,
--      no other function needs to touch it.
--   2. scd_transport_request_events.action also accepts 'PRESA_VISIONE' (check widened, every r84 value kept).
--   3. scd_ack_transport_request(org, request): only for a person of the caller's circle (scd_my_family), only on a
--      CONFERMATA seat of a match still to come; idempotent; logged.
--   4. scd_my_transport_requests and scd_transport_requests_board: same output as r84 plus 'acknowledged' (boolean).
--      Names, access checks, order and filters are unchanged.
-- No name of a minor is added anywhere; no phone, no address.
--
-- Rollback (manual, only if Francesco asks):
--   drop function if exists public.scd_ack_transport_request(uuid, uuid);
--   -- re-run the two r84 functions scd_my_transport_requests / scd_transport_requests_board from r84;
--   -- columns ack_at / ack_by and the widened check can stay (unused).

do $$
begin
  if to_regclass('public.scd_transport_requests') is null
     or to_regclass('public.scd_transport_request_events') is null
     or to_regclass('public.scd_transport_stops') is null
     or to_regprocedure('public.scd_transport_office(uuid)') is null
     or to_regprocedure('public.scd_my_family(uuid)') is null then
    raise exception 'r114 prerequisites missing (r61, r74, r84)';
  end if;
end $$;

-- ---------------------------------------------------------------- 1. columns
alter table public.scd_transport_requests add column if not exists ack_at timestamptz;
alter table public.scd_transport_requests add column if not exists ack_by uuid;

-- ---------------------------------------------------------------- 2. event action (r84 values kept)
alter table public.scd_transport_request_events drop constraint if exists scd_transport_request_events_action_check;
alter table public.scd_transport_request_events add constraint scd_transport_request_events_action_check
  check (action in ('RICHIESTA', 'MODIFICATA', 'ANNULLATA', 'CONFERMATA', 'NON_POSSIBILE', 'PRESA_VISIONE'));

-- ---------------------------------------------------------------- 3. presa visione
create or replace function public.scd_ack_transport_request(p_organization_id uuid, p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_person uuid;
  v_status text;
  v_date date;
  v_decided timestamptz;
  v_ack timestamptz;
begin
  if (select auth.uid()) is null then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  select person_id, status, event_date, decided_at, ack_at into v_person, v_status, v_date, v_decided, v_ack
    from public.scd_transport_requests where id = p_request_id and organization_id = p_organization_id;
  if v_person is null then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;
  if v_person not in (select f.person_id from public.scd_my_family(p_organization_id) f) then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  if v_status <> 'CONFERMATA' then
    return jsonb_build_object('ok', false, 'code', 'not_confirmed');
  end if;
  if v_date < current_date then
    return jsonb_build_object('ok', false, 'code', 'past');
  end if;
  if v_ack is not null and v_decided is not null and v_ack >= v_decided then
    return jsonb_build_object('ok', true, 'already', true);
  end if;
  update public.scd_transport_requests set ack_at = now(), ack_by = (select auth.uid()) where id = p_request_id;
  insert into public.scd_transport_request_events (organization_id, request_id, action, actor)
    values (p_organization_id, p_request_id, 'PRESA_VISIONE', (select auth.uid()));
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.scd_ack_transport_request(uuid, uuid) from public, anon;
grant execute on function public.scd_ack_transport_request(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------- 4. the two r84 reads + 'acknowledged'
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
      'note', r.note, 'status', r.status, 'decisionNote', r.decision_note, 'updatedAt', r.updated_at,
      'acknowledged', (r.status = 'CONFERMATA' and r.ack_at is not null and r.decided_at is not null and r.ack_at >= r.decided_at))
    order by r.event_date, r.created_at), '[]'::jsonb)
  from public.scd_transport_requests r
  left join public.scd_transport_stops s on s.id = r.stop_id
  where r.organization_id = p_organization_id
    and r.event_date >= current_date
    and r.person_id in (select f.person_id from public.scd_my_family(p_organization_id) f);
$$;
revoke all on function public.scd_my_transport_requests(uuid) from public, anon;
grant execute on function public.scd_my_transport_requests(uuid) to authenticated;

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
      'createdAt', r.created_at, 'updatedAt', r.updated_at,
      'acknowledged', (r.status = 'CONFERMATA' and r.ack_at is not null and r.decided_at is not null and r.ack_at >= r.decided_at))
    order by r.event_date, r.team_code, p.last_name, p.first_name)
    from public.scd_transport_requests r
    join public.scd_people p on p.id = r.person_id
    left join public.scd_transport_stops s on s.id = r.stop_id
    where r.organization_id = p_organization_id and r.event_date between p_from and p_to), '[]'::jsonb)
  end;
$$;
revoke all on function public.scd_transport_requests_board(uuid, date, date) from public, anon;
grant execute on function public.scd_transport_requests_board(uuid, date, date) to authenticated;
