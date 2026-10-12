-- r83: Magazzino — copy of the kit order "SCD_ORDINE_KIT_SEMPLICE_TAGLIA_UNICA_2026-27" (xlsx in the club Drive).
-- The sheet stays the master for sizes; a scheduled job writes this copy. Only aggregates per group and size are stored:
-- no names (most rows are minors), no declared sizes per person. Deliveries are recorded in the app, per group and size,
-- by the warehouse office; every change is logged. Readers and writers: Direzione, Segreteria, Tesoreria,
-- responsabile magazzino.

create table if not exists public.scd_kit_orders (
  organization_id uuid not null references public.scd_organizations(id),
  order_key text not null,
  season text not null default '2026/27',
  title text not null,
  components jsonb not null default '{}'::jsonb,
  sizes text[] not null default array['3XS','2XS','XS','S','M','L','XL','2XL'],
  source_modified_at timestamptz,
  synced_at timestamptz not null default now(),
  primary key (organization_id, order_key)
);
alter table public.scd_kit_orders enable row level security;

create table if not exists public.scd_kit_order_groups (
  organization_id uuid not null references public.scd_organizations(id),
  order_key text not null,
  group_key text not null,
  label text not null,
  position integer not null default 0,
  athletes integer not null default 0 check (athletes >= 0),
  staff integer not null default 0 check (staff >= 0),
  sizes jsonb not null default '{}'::jsonb,
  undefined_count integer not null default 0 check (undefined_count >= 0),
  active boolean not null default true,
  synced_at timestamptz not null default now(),
  primary key (organization_id, order_key, group_key)
);
alter table public.scd_kit_order_groups enable row level security;

create table if not exists public.scd_kit_deliveries (
  organization_id uuid not null references public.scd_organizations(id),
  order_key text not null,
  group_key text not null,
  size text not null,
  delivered integer not null default 0 check (delivered >= 0),
  updated_by uuid,
  updated_at timestamptz not null default now(),
  primary key (organization_id, order_key, group_key, size)
);
alter table public.scd_kit_deliveries enable row level security;

create table if not exists public.scd_kit_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.scd_organizations(id),
  order_key text not null,
  group_key text not null,
  size text not null,
  delivered_before integer not null,
  delivered_after integer not null,
  actor uuid,
  at timestamptz not null default now()
);
alter table public.scd_kit_events enable row level security;

create or replace function public.scd_kit_office(p_organization_id uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select public.scd_has_org_role(p_organization_id, array['DIRECTION','SECRETARIAT']::public.scd_role[])
    or public.scd_has_position(p_organization_id, array['responsabile-magazzino','tesoreria','segreteria','segreteria-presenza','segreteria-remoto','direzione','presidente','direttore-generale']);
$$;
revoke all on function public.scd_kit_office(uuid) from public, anon;

-- Copy from the master (scheduled job, service role only). Groups missing from the payload become inactive.
create or replace function public.scd_kit_sync_copy(p_organization_id uuid, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_now timestamptz := now();
  v_key text := coalesce(nullif(p_payload->>'orderKey', ''), 'PRE_CAMPIONATO_2026_27');
  v_counts jsonb;
begin
  if jsonb_typeof(p_payload->'groups') <> 'array' then
    raise exception 'groups must be an array';
  end if;
  insert into public.scd_kit_orders (organization_id, order_key, season, title, components, source_modified_at, synced_at)
  values (p_organization_id, v_key, coalesce(nullif(p_payload->>'season', ''), '2026/27'),
    left(coalesce(nullif(p_payload->>'title', ''), 'Ordine kit'), 120), coalesce(p_payload->'components', '{}'::jsonb),
    nullif(p_payload->>'sourceModifiedAt', '')::timestamptz, v_now)
  on conflict (organization_id, order_key) do update set season = excluded.season, title = excluded.title,
    components = excluded.components, source_modified_at = excluded.source_modified_at, synced_at = v_now;

  insert into public.scd_kit_order_groups (organization_id, order_key, group_key, label, position, athletes, staff, sizes,
    undefined_count, active, synced_at)
  select p_organization_id, v_key, x->>'key', left(x->>'label', 60), coalesce((x->>'position')::int, 0),
    coalesce((x->>'athletes')::int, 0), coalesce((x->>'staff')::int, 0),
    (select coalesce(jsonb_object_agg(k, v), '{}'::jsonb) from jsonb_each(coalesce(x->'sizes', '{}'::jsonb)) e(k, v)
      where k in ('3XS','2XS','XS','S','M','L','XL','2XL') and jsonb_typeof(v) = 'number'),
    coalesce((x->>'undefined')::int, 0), true, v_now
  from jsonb_array_elements(p_payload->'groups') x
  where coalesce(x->>'key', '') <> '' and coalesce(x->>'label', '') <> ''
  on conflict (organization_id, order_key, group_key) do update set label = excluded.label, position = excluded.position,
    athletes = excluded.athletes, staff = excluded.staff, sizes = excluded.sizes, undefined_count = excluded.undefined_count,
    active = true, synced_at = v_now;
  update public.scd_kit_order_groups set active = false
    where organization_id = p_organization_id and order_key = v_key and synced_at < v_now and active;

  select jsonb_build_object('groups', count(*), 'people', coalesce(sum(athletes + staff), 0),
    'undefined', coalesce(sum(undefined_count), 0))
  into v_counts from public.scd_kit_order_groups
  where organization_id = p_organization_id and order_key = v_key and active;
  return v_counts;
end;
$$;
revoke all on function public.scd_kit_sync_copy(uuid, jsonb) from public, anon, authenticated;

-- Board for the warehouse office. Null for anyone else.
create or replace function public.scd_kit_board(p_organization_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
begin
  if not public.scd_kit_office(p_organization_id) then
    return null;
  end if;
  return jsonb_build_object(
    'orders', coalesce((select jsonb_agg(jsonb_build_object(
        'key', o.order_key, 'season', o.season, 'title', o.title, 'components', o.components, 'sizes', to_jsonb(o.sizes),
        'sourceModifiedAt', o.source_modified_at, 'syncedAt', o.synced_at,
        'groups', coalesce((select jsonb_agg(jsonb_build_object(
            'key', g.group_key, 'label', g.label, 'athletes', g.athletes, 'staff', g.staff, 'sizes', g.sizes,
            'undefined', g.undefined_count,
            'delivered', coalesce((select jsonb_object_agg(d.size, d.delivered) from public.scd_kit_deliveries d
               where d.organization_id = g.organization_id and d.order_key = g.order_key and d.group_key = g.group_key
                 and d.delivered > 0), '{}'::jsonb)) order by g.position, g.label)
          from public.scd_kit_order_groups g
          where g.organization_id = o.organization_id and g.order_key = o.order_key and g.active), '[]'::jsonb))
      order by o.synced_at desc)
      from public.scd_kit_orders o where o.organization_id = p_organization_id), '[]'::jsonb));
end;
$$;
revoke all on function public.scd_kit_board(uuid) from public, anon;
grant execute on function public.scd_kit_board(uuid) to authenticated;

-- Record how many kits of a size were handed over to a group. Bounded by the ordered quantity; logged.
create or replace function public.scd_kit_set_delivered(p_organization_id uuid, p_order_key text, p_group_key text,
  p_size text, p_delivered integer)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_ordered integer;
  v_before integer;
begin
  if not public.scd_kit_office(p_organization_id) then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  select (g.sizes->>p_size)::int into v_ordered from public.scd_kit_order_groups g
    where g.organization_id = p_organization_id and g.order_key = p_order_key and g.group_key = p_group_key and g.active;
  if v_ordered is null then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;
  if p_delivered is null or p_delivered < 0 or p_delivered > v_ordered then
    return jsonb_build_object('ok', false, 'code', 'out_of_range', 'ordered', v_ordered);
  end if;
  select d.delivered into v_before from public.scd_kit_deliveries d
    where d.organization_id = p_organization_id and d.order_key = p_order_key and d.group_key = p_group_key and d.size = p_size;
  insert into public.scd_kit_deliveries (organization_id, order_key, group_key, size, delivered, updated_by, updated_at)
  values (p_organization_id, p_order_key, p_group_key, p_size, p_delivered, auth.uid(), now())
  on conflict (organization_id, order_key, group_key, size) do update set delivered = excluded.delivered,
    updated_by = excluded.updated_by, updated_at = excluded.updated_at;
  insert into public.scd_kit_events (organization_id, order_key, group_key, size, delivered_before, delivered_after, actor)
  values (p_organization_id, p_order_key, p_group_key, p_size, coalesce(v_before, 0), p_delivered, auth.uid());
  return jsonb_build_object('ok', true, 'delivered', p_delivered, 'ordered', v_ordered);
end;
$$;
revoke all on function public.scd_kit_set_delivered(uuid, text, text, text, integer) from public, anon;
grant execute on function public.scd_kit_set_delivered(uuid, text, text, text, integer) to authenticated;
