-- r74: Pulmini (transport) — copy of the Master Flotta e Trasporti + trips planned in the app (2026-10-12).
-- Decision (Direzione, 12/10/2026): "copia automatica" — the Google Sheet
-- "05_PULMINI - Master Flotta e Trasporti SCD 2026-27" stays the master for fleet, drivers, availability,
-- stops and service users; a scheduled job copies it here several times a day through scd_transport_sync.
-- Trips (corse) are planned in the app: the sheet tab "01 CORSE SERVIZI" is empty, the app becomes the
-- place where they are written, with author and status. No row is ever removed: rows missing from the
-- sheet become active = false. Service users are stored WITHOUT names (sheet code AT-xxxx only):
-- name-only matching with scd_people is forbidden, so the link waits for a verified code map.

create table if not exists public.scd_transport_vehicles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id),
  source_record_id text not null,
  label text not null,
  plate text,
  model text,
  ownership text,
  seats_homologated integer check (seats_homologated is null or seats_homologated between 1 and 60),
  seats_passengers integer check (seats_passengers is null or seats_passengers between 1 and 60),
  fuel text,
  km integer,
  status text,
  base_availability text,
  insurance_due date,
  inspection_due date,
  road_tax_due date,
  service_due date,
  notes text,
  active boolean not null default true,
  source_id text not null default 'PULMINI_MASTER_2026_27',
  synced_at timestamptz not null default now(),
  unique (organization_id, source_record_id)
);

create table if not exists public.scd_transport_drivers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id),
  source_record_id text not null,
  display_name text not null,
  kind text,
  status text,
  licence_category text,
  licence_due date,
  extra_availability text,
  phone text,
  active boolean not null default true,
  source_id text not null default 'PULMINI_MASTER_2026_27',
  synced_at timestamptz not null default now(),
  unique (organization_id, source_record_id)
);

create table if not exists public.scd_transport_driver_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id),
  source_record_id text not null,
  driver_source_id text not null,
  days text,
  from_time text,
  to_time text,
  status text,
  kind text,
  reason text,
  valid_from date,
  valid_to date,
  active boolean not null default true,
  synced_at timestamptz not null default now(),
  unique (organization_id, source_record_id)
);

create table if not exists public.scd_transport_stops (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id),
  source_record_id text not null,
  line_id text,
  line_label text,
  position integer,
  town text,
  place text,
  status text,
  eta text,
  active boolean not null default true,
  synced_at timestamptz not null default now(),
  unique (organization_id, source_record_id)
);

create table if not exists public.scd_transport_riders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id),
  source_record_id text not null,
  person_source_id text,
  team_group text,
  service_status text,
  base_type text,
  line_label text,
  stop_out text,
  stop_back text,
  stop_status text,
  days jsonb not null default '{}'::jsonb,
  weekend_extra text,
  active boolean not null default true,
  synced_at timestamptz not null default now(),
  unique (organization_id, source_record_id)
);

create table if not exists public.scd_transport_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id),
  run_date date not null,
  departure text not null check (departure ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  return_estimate text check (return_estimate is null or return_estimate ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  kind text not null check (kind in ('TRASFERTA', 'ALLENAMENTO', 'EXTRA')),
  event_source_id text,
  title text not null,
  destination text,
  meeting_point text,
  vehicle_id uuid references public.scd_transport_vehicles(id),
  driver_id uuid references public.scd_transport_drivers(id),
  passengers integer check (passengers is null or passengers between 0 and 60),
  status text not null default 'PIANIFICATA' check (status in ('PIANIFICATA', 'CONFERMATA', 'ANNULLATA')),
  note text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists scd_transport_runs_date on public.scd_transport_runs (organization_id, run_date);

create table if not exists public.scd_transport_sync (
  organization_id uuid primary key references public.scd_organizations(id),
  synced_at timestamptz not null,
  source_modified_at timestamptz,
  counts jsonb not null default '{}'::jsonb
);

alter table public.scd_transport_vehicles enable row level security;
alter table public.scd_transport_drivers enable row level security;
alter table public.scd_transport_driver_rules enable row level security;
alter table public.scd_transport_stops enable row level security;
alter table public.scd_transport_riders enable row level security;
alter table public.scd_transport_runs enable row level security;
alter table public.scd_transport_sync enable row level security;
-- No table policies: every read and write goes through the SECURITY DEFINER functions below,
-- which check role and position and never return phones to people who should not see them.
revoke all on public.scd_transport_vehicles, public.scd_transport_drivers, public.scd_transport_driver_rules,
  public.scd_transport_stops, public.scd_transport_riders, public.scd_transport_runs, public.scd_transport_sync
  from anon, authenticated;

-- Club position assigned by the Direzione in scd_memberships.scope.positions (e.g. "responsabile-trasporti").
create or replace function public.scd_has_position(p_organization_id uuid, p_positions text[])
returns boolean
language sql
stable
set search_path to 'public'
as $$
  select exists (
    select 1 from public.scd_memberships m
    where m.organization_id = p_organization_id
      and m.user_id = (select auth.uid())
      and m.active
      and jsonb_typeof(m.scope -> 'positions') = 'array'
      and exists (select 1 from jsonb_array_elements_text(m.scope -> 'positions') p where p = any(p_positions))
  );
$$;

-- Copy job: the whole snapshot of the sheet in one call (idempotent). Run by the scheduled job only.
create or replace function public.scd_transport_sync(p_organization_id uuid, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_now timestamptz := now();
  v_counts jsonb;
begin
  insert into public.scd_transport_vehicles as t (organization_id, source_record_id, label, plate, model, ownership,
    seats_homologated, seats_passengers, fuel, km, status, base_availability, insurance_due, inspection_due,
    road_tax_due, service_due, notes, active, synced_at)
  select p_organization_id, x->>'id', coalesce(nullif(x->>'label', ''), x->>'id'), nullif(x->>'plate', ''), nullif(x->>'model', ''),
    nullif(x->>'ownership', ''), (x->>'seatsHomologated')::int, (x->>'seatsPassengers')::int, nullif(x->>'fuel', ''),
    (x->>'km')::int, nullif(x->>'status', ''), nullif(x->>'baseAvailability', ''), (x->>'insuranceDue')::date,
    (x->>'inspectionDue')::date, (x->>'roadTaxDue')::date, (x->>'serviceDue')::date, nullif(x->>'notes', ''), true, v_now
  from jsonb_array_elements(coalesce(p_payload->'vehicles', '[]')) x
  where coalesce(x->>'id', '') <> ''
  on conflict (organization_id, source_record_id) do update set label = excluded.label, plate = excluded.plate,
    model = excluded.model, ownership = excluded.ownership, seats_homologated = excluded.seats_homologated,
    seats_passengers = excluded.seats_passengers, fuel = excluded.fuel, km = excluded.km, status = excluded.status,
    base_availability = excluded.base_availability, insurance_due = excluded.insurance_due,
    inspection_due = excluded.inspection_due, road_tax_due = excluded.road_tax_due, service_due = excluded.service_due,
    notes = excluded.notes, active = true, synced_at = v_now;
  update public.scd_transport_vehicles set active = false where organization_id = p_organization_id and synced_at < v_now and active;

  insert into public.scd_transport_drivers (organization_id, source_record_id, display_name, kind, status,
    licence_category, licence_due, extra_availability, phone, active, synced_at)
  select p_organization_id, x->>'id', coalesce(nullif(x->>'displayName', ''), x->>'id'), nullif(x->>'kind', ''), nullif(x->>'status', ''),
    nullif(x->>'licenceCategory', ''), (x->>'licenceDue')::date, nullif(x->>'extraAvailability', ''), nullif(x->>'phone', ''), true, v_now
  from jsonb_array_elements(coalesce(p_payload->'drivers', '[]')) x
  where coalesce(x->>'id', '') <> ''
  on conflict (organization_id, source_record_id) do update set display_name = excluded.display_name, kind = excluded.kind,
    status = excluded.status, licence_category = excluded.licence_category, licence_due = excluded.licence_due,
    extra_availability = excluded.extra_availability, phone = excluded.phone, active = true, synced_at = v_now;
  update public.scd_transport_drivers set active = false where organization_id = p_organization_id and synced_at < v_now and active;

  insert into public.scd_transport_driver_rules (organization_id, source_record_id, driver_source_id, days, from_time,
    to_time, status, kind, reason, valid_from, valid_to, active, synced_at)
  select p_organization_id, x->>'id', x->>'driverId', nullif(x->>'days', ''), nullif(x->>'from', ''), nullif(x->>'to', ''),
    nullif(x->>'status', ''), nullif(x->>'kind', ''), nullif(x->>'reason', ''), (x->>'validFrom')::date, (x->>'validTo')::date, true, v_now
  from jsonb_array_elements(coalesce(p_payload->'rules', '[]')) x
  where coalesce(x->>'id', '') <> '' and coalesce(x->>'driverId', '') <> ''
  on conflict (organization_id, source_record_id) do update set driver_source_id = excluded.driver_source_id,
    days = excluded.days, from_time = excluded.from_time, to_time = excluded.to_time, status = excluded.status,
    kind = excluded.kind, reason = excluded.reason, valid_from = excluded.valid_from, valid_to = excluded.valid_to,
    active = true, synced_at = v_now;
  update public.scd_transport_driver_rules set active = false where organization_id = p_organization_id and synced_at < v_now and active;

  insert into public.scd_transport_stops (organization_id, source_record_id, line_id, line_label, position, town, place,
    status, eta, active, synced_at)
  select p_organization_id, x->>'id', nullif(x->>'lineId', ''), nullif(x->>'line', ''), (x->>'position')::int, nullif(x->>'town', ''),
    nullif(x->>'place', ''), nullif(x->>'status', ''), nullif(x->>'eta', ''), coalesce((x->>'active')::boolean, true), v_now
  from jsonb_array_elements(coalesce(p_payload->'stops', '[]')) x
  where coalesce(x->>'id', '') <> ''
  on conflict (organization_id, source_record_id) do update set line_id = excluded.line_id, line_label = excluded.line_label,
    position = excluded.position, town = excluded.town, place = excluded.place, status = excluded.status, eta = excluded.eta,
    active = excluded.active, synced_at = v_now;
  update public.scd_transport_stops set active = false where organization_id = p_organization_id and synced_at < v_now and active;

  insert into public.scd_transport_riders (organization_id, source_record_id, person_source_id, team_group, service_status,
    base_type, line_label, stop_out, stop_back, stop_status, days, weekend_extra, active, synced_at)
  select p_organization_id, x->>'id', nullif(x->>'personId', ''), nullif(x->>'teamGroup', ''), nullif(x->>'serviceStatus', ''),
    nullif(x->>'baseType', ''), nullif(x->>'line', ''), nullif(x->>'stopOut', ''), nullif(x->>'stopBack', ''),
    nullif(x->>'stopStatus', ''), coalesce(x->'days', '{}'::jsonb), nullif(x->>'weekendExtra', ''), true, v_now
  from jsonb_array_elements(coalesce(p_payload->'riders', '[]')) x
  where coalesce(x->>'id', '') <> ''
  on conflict (organization_id, source_record_id) do update set person_source_id = excluded.person_source_id,
    team_group = excluded.team_group, service_status = excluded.service_status, base_type = excluded.base_type,
    line_label = excluded.line_label, stop_out = excluded.stop_out, stop_back = excluded.stop_back,
    stop_status = excluded.stop_status, days = excluded.days, weekend_extra = excluded.weekend_extra, active = true, synced_at = v_now;
  update public.scd_transport_riders set active = false where organization_id = p_organization_id and synced_at < v_now and active;

  v_counts := jsonb_build_object(
    'vehicles', (select count(*) from public.scd_transport_vehicles where organization_id = p_organization_id and active),
    'drivers', (select count(*) from public.scd_transport_drivers where organization_id = p_organization_id and active),
    'rules', (select count(*) from public.scd_transport_driver_rules where organization_id = p_organization_id and active),
    'stops', (select count(*) from public.scd_transport_stops where organization_id = p_organization_id and active),
    'riders', (select count(*) from public.scd_transport_riders where organization_id = p_organization_id and active));
  insert into public.scd_transport_sync (organization_id, synced_at, source_modified_at, counts)
  values (p_organization_id, v_now, (p_payload->>'sourceModifiedAt')::timestamptz, v_counts)
  on conflict (organization_id) do update set synced_at = excluded.synced_at,
    source_modified_at = excluded.source_modified_at, counts = excluded.counts;
  return v_counts;
end;
$$;
revoke all on function public.scd_transport_sync(uuid, jsonb) from public, anon, authenticated;

-- The board: everything the Pulmini page shows. Direzione, Segreteria, responsabile trasporti: full view
-- (driver phones included). Autista: full view without other people's phones. Nobody else: null.
-- Service users come out as counts only (line, stop, team group, weekday) — never a name.
create or replace function public.scd_transport_board(p_organization_id uuid, p_from date, p_to date)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_manage boolean := public.scd_has_org_role(p_organization_id, array['DIRECTION','SECRETARIAT']::public.scd_role[])
    or public.scd_has_position(p_organization_id, array['responsabile-trasporti','direzione','presidente','direttore-generale']);
  v_driver boolean := public.scd_has_position(p_organization_id, array['autista']);
begin
  if not (v_manage or v_driver) then
    return null;
  end if;
  return jsonb_build_object(
    'canManage', v_manage,
    'sync', (select to_jsonb(s) - 'organization_id' from public.scd_transport_sync s where s.organization_id = p_organization_id),
    'vehicles', coalesce((select jsonb_agg(jsonb_build_object('id', v.id, 'code', v.source_record_id, 'label', v.label,
        'plate', v.plate, 'model', v.model, 'ownership', v.ownership, 'seatsHomologated', v.seats_homologated,
        'seatsPassengers', v.seats_passengers, 'status', v.status, 'baseAvailability', v.base_availability,
        'insuranceDue', v.insurance_due, 'inspectionDue', v.inspection_due, 'roadTaxDue', v.road_tax_due,
        'serviceDue', v.service_due, 'notes', v.notes) order by v.source_record_id)
      from public.scd_transport_vehicles v where v.organization_id = p_organization_id and v.active), '[]'),
    'drivers', coalesce((select jsonb_agg(jsonb_build_object('id', d.id, 'code', d.source_record_id, 'name', d.display_name,
        'kind', d.kind, 'status', d.status, 'licenceCategory', d.licence_category, 'licenceDue', d.licence_due,
        'extraAvailability', d.extra_availability, 'phone', case when v_manage then d.phone end) order by d.source_record_id)
      from public.scd_transport_drivers d where d.organization_id = p_organization_id and d.active), '[]'),
    'rules', coalesce((select jsonb_agg(jsonb_build_object('code', r.source_record_id, 'driver', r.driver_source_id,
        'days', r.days, 'from', r.from_time, 'to', r.to_time, 'status', r.status, 'kind', r.kind, 'reason', r.reason,
        'validFrom', r.valid_from, 'validTo', r.valid_to) order by r.source_record_id)
      from public.scd_transport_driver_rules r where r.organization_id = p_organization_id and r.active), '[]'),
    'stops', coalesce((select jsonb_agg(jsonb_build_object('code', s.source_record_id, 'lineId', s.line_id, 'line', s.line_label,
        'position', s.position, 'town', s.town, 'place', s.place, 'status', s.status, 'eta', s.eta) order by s.line_id, s.position)
      from public.scd_transport_stops s where s.organization_id = p_organization_id and s.active), '[]'),
    'riders', coalesce((select jsonb_agg(jsonb_build_object('teamGroup', r.team_group, 'serviceStatus', r.service_status,
        'baseType', r.base_type, 'line', r.line_label, 'stopOut', r.stop_out, 'stopBack', r.stop_back,
        'stopStatus', r.stop_status, 'days', r.days, 'weekendExtra', r.weekend_extra))
      from public.scd_transport_riders r where r.organization_id = p_organization_id and r.active), '[]'),
    'runs', coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'date', t.run_date, 'departure', t.departure,
        'returnEstimate', t.return_estimate, 'kind', t.kind, 'eventId', t.event_source_id, 'title', t.title,
        'destination', t.destination, 'meetingPoint', t.meeting_point, 'vehicleId', t.vehicle_id, 'driverId', t.driver_id,
        'passengers', t.passengers, 'status', t.status, 'note', t.note, 'updatedAt', t.updated_at) order by t.run_date, t.departure)
      from public.scd_transport_runs t where t.organization_id = p_organization_id and t.run_date between p_from and p_to), '[]')
  );
end;
$$;
revoke all on function public.scd_transport_board(uuid, date, date) from public, anon;
grant execute on function public.scd_transport_board(uuid, date, date) to authenticated;

-- Plan, change or cancel a trip. Direzione, Segreteria and responsabile trasporti only.
-- Refuses the same van or the same driver on two overlapping trips of the same day.
create or replace function public.scd_transport_plan_run(p_organization_id uuid, p_run_id uuid, p_run jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_id uuid := p_run_id;
  v_date date := (p_run->>'date')::date;
  v_dep text := p_run->>'departure';
  v_ret text := nullif(p_run->>'returnEstimate', '');
  v_vehicle uuid := nullif(p_run->>'vehicleId', '')::uuid;
  v_driver uuid := nullif(p_run->>'driverId', '')::uuid;
  v_status text := coalesce(nullif(p_run->>'status', ''), 'PIANIFICATA');
  v_start int;
  v_end int;
  v_clash text;
begin
  if not (public.scd_has_org_role(p_organization_id, array['DIRECTION','SECRETARIAT']::public.scd_role[])
          or public.scd_has_position(p_organization_id, array['responsabile-trasporti','direzione','presidente','direttore-generale'])) then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  if v_date is null or v_dep is null or coalesce(p_run->>'title', '') = '' then
    return jsonb_build_object('ok', false, 'code', 'missing');
  end if;
  v_start := split_part(v_dep, ':', 1)::int * 60 + split_part(v_dep, ':', 2)::int;
  v_end := coalesce(split_part(v_ret, ':', 1)::int * 60 + split_part(v_ret, ':', 2)::int, v_start + 240);
  if v_end <= v_start then v_end := v_start + 240; end if;
  if v_vehicle is not null and not exists (select 1 from public.scd_transport_vehicles where id = v_vehicle and organization_id = p_organization_id and active) then
    return jsonb_build_object('ok', false, 'code', 'vehicle');
  end if;
  if v_driver is not null and not exists (select 1 from public.scd_transport_drivers where id = v_driver and organization_id = p_organization_id and active) then
    return jsonb_build_object('ok', false, 'code', 'driver');
  end if;
  if v_status <> 'ANNULLATA' then
    select case when t.vehicle_id = v_vehicle then 'vehicle_busy' else 'driver_busy' end into v_clash
    from public.scd_transport_runs t
    where t.organization_id = p_organization_id and t.run_date = v_date and t.status <> 'ANNULLATA'
      and (v_id is null or t.id <> v_id)
      and ((v_vehicle is not null and t.vehicle_id = v_vehicle) or (v_driver is not null and t.driver_id = v_driver))
      and (split_part(t.departure, ':', 1)::int * 60 + split_part(t.departure, ':', 2)::int) < v_end
      and coalesce(split_part(t.return_estimate, ':', 1)::int * 60 + split_part(t.return_estimate, ':', 2)::int,
                   split_part(t.departure, ':', 1)::int * 60 + split_part(t.departure, ':', 2)::int + 240) > v_start
    limit 1;
    if v_clash is not null then
      return jsonb_build_object('ok', false, 'code', v_clash);
    end if;
  end if;
  if v_id is null then
    insert into public.scd_transport_runs (organization_id, run_date, departure, return_estimate, kind, event_source_id, title,
      destination, meeting_point, vehicle_id, driver_id, passengers, status, note, created_by, updated_by)
    values (p_organization_id, v_date, v_dep, v_ret, coalesce(nullif(p_run->>'kind', ''), 'TRASFERTA'), nullif(p_run->>'eventId', ''),
      left(p_run->>'title', 160), left(nullif(p_run->>'destination', ''), 200), left(nullif(p_run->>'meetingPoint', ''), 160),
      v_vehicle, v_driver, (p_run->>'passengers')::int, v_status, left(nullif(p_run->>'note', ''), 500), auth.uid(), auth.uid())
    returning id into v_id;
  else
    update public.scd_transport_runs set run_date = v_date, departure = v_dep, return_estimate = v_ret,
      kind = coalesce(nullif(p_run->>'kind', ''), kind), title = left(p_run->>'title', 160),
      destination = left(nullif(p_run->>'destination', ''), 200), meeting_point = left(nullif(p_run->>'meetingPoint', ''), 160),
      vehicle_id = v_vehicle, driver_id = v_driver, passengers = (p_run->>'passengers')::int, status = v_status,
      note = left(nullif(p_run->>'note', ''), 500), updated_by = auth.uid(), updated_at = now()
    where id = v_id and organization_id = p_organization_id;
    if not found then
      return jsonb_build_object('ok', false, 'code', 'not_found');
    end if;
  end if;
  insert into public.scd_audit_events (organization_id, actor_user_id, action, entity_type, entity_id, payload)
  values (p_organization_id, auth.uid(), 'TRANSPORT_RUN_SAVE', 'scd_transport_runs', v_id,
    jsonb_build_object('date', v_date, 'departure', v_dep, 'status', v_status, 'vehicle', v_vehicle, 'driver', v_driver));
  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;
revoke all on function public.scd_transport_plan_run(uuid, uuid, jsonb) from public, anon;
grant execute on function public.scd_transport_plan_run(uuid, uuid, jsonb) to authenticated;
