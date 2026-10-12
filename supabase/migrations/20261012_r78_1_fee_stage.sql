-- r78.1: staging table for the fee copy, so a large snapshot can be loaded in parts and checked row by row
-- before it is applied in one transaction by scd_fee_sync. Service role only. Rows are kept (emptied) as a log.
create table if not exists public.scd_fee_stage (
  organization_id uuid not null references public.scd_organizations(id),
  batch text not null,
  part integer not null,
  positions jsonb not null,
  applied_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (organization_id, batch, part)
);
alter table public.scd_fee_stage enable row level security;

create or replace function public.scd_fee_sync_from_stage(p_organization_id uuid, p_batch text, p_source_modified_at text, p_expected integer)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_all jsonb;
  v_out jsonb;
begin
  select coalesce(jsonb_agg(e order by s.part), '[]'::jsonb) into v_all
  from public.scd_fee_stage s, jsonb_array_elements(s.positions) e
  where s.organization_id = p_organization_id and s.batch = p_batch and s.applied_at is null;
  if jsonb_array_length(v_all) <> p_expected then
    return jsonb_build_object('ok', false, 'code', 'count_mismatch', 'staged', jsonb_array_length(v_all), 'expected', p_expected);
  end if;
  v_out := public.scd_fee_sync(p_organization_id, jsonb_build_object('season', '2026/27', 'sourceModifiedAt', p_source_modified_at, 'positions', v_all));
  update public.scd_fee_stage set applied_at = now(), positions = '[]'::jsonb
    where organization_id = p_organization_id and batch = p_batch and applied_at is null;
  return jsonb_build_object('ok', true, 'counts', v_out);
end;
$$;
revoke all on function public.scd_fee_sync_from_stage(uuid, text, text, integer) from public, anon, authenticated;

-- r78.2: link positions to people by the name+birth fingerprint (the database keeps no fiscal codes).
create or replace function public.scd_fee_link_by_name(p_organization_id uuid, p_links jsonb, p_season text default '2026/27')
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_linked integer;
begin
  with src as (
    select x->>'id' as rid, x->>'nameHash' as h
    from jsonb_array_elements(coalesce(p_links, '[]')) x
    where coalesce(x->>'id', '') <> '' and coalesce(x->>'nameHash', '') <> ''
  ),
  m as (
    select s.rid, min(p.id::text)::uuid as person_id, count(*) as n
    from src s join public.scd_people p
      on p.organization_id = p_organization_id
     and public.scd_fee_name_hash(p.last_name, p.first_name, p.birth_date) = s.h
    group by s.rid
  )
  update public.scd_fee_positions f
     set person_id = m.person_id, match_method = 'NAME_BIRTH'
    from m
   where m.n = 1 and f.organization_id = p_organization_id and f.season = p_season
     and f.source_record_id = m.rid and f.person_id is null;
  select count(*) into v_linked from public.scd_fee_positions
   where organization_id = p_organization_id and season = p_season and active and person_id is not null;
  return jsonb_build_object('linked', v_linked);
end;
$$;
revoke all on function public.scd_fee_link_by_name(uuid, jsonb, text) from public, anon, authenticated;
