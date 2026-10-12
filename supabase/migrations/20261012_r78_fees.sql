-- r78: Quote e Fondo (process 3 of SCD_MAPPA_A_Z, UD-076/UD-082) — 2026-10-12.
-- Decision UD-082: the master for fees is SCD_MASTER_GESTIONALE_2026-27 (tab 32_QUOTE_OPERATIVE + 17_CONTROLLO_QUOTE).
-- A scheduled job copies it here through scd_fee_sync. The app never collects money, never stores IBAN,
-- ISEE values, fund percentages, names, e-mails or fiscal codes: the copy carries the sheet code (ATLETA_ID),
-- amounts, status and a sha256 fingerprint used only to link the position to scd_people.
-- Who sees what:
--   office (Direzione, Segreteria, positions tesoreria/segreteria/direzione/presidente/direttore-generale):
--     scd_fee_board — totals per category and status, the work list with names of linked people;
--   families: scd_my_fees — only the positions of the people in their own family circle (scd_my_family),
--     amounts and status, no internal notes.
-- No row is ever removed: positions missing from the sheet become active = false.

create table if not exists public.scd_fee_positions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id),
  season text not null default '2026/27',
  source_record_id text not null,
  person_id uuid references public.scd_people(id),
  match_method text check (match_method is null or match_method in ('FISCAL_CODE','NAME_BIRTH')),
  birth_year integer check (birth_year is null or birth_year between 1950 and 2030),
  category text,
  fee_total numeric(10,2),
  paid numeric(10,2),
  residual numeric(10,2),
  overdue numeric(10,2),
  status text,
  status_override text,
  status_group text not null default 'DA_VERIFICARE'
    check (status_group in ('SALDATO','REGOLARE','IN_RITARDO','DA_COMUNICARE','DA_VERIFICARE','ESCLUSO')),
  notice_sent boolean,
  notice_date text,
  plan text check (plan is null or plan in ('UNICA','2 RATE','3 RATE')),
  instalments numeric(10,2)[] not null default '{}',
  fund_benefit boolean not null default false,
  family_rule text,
  action text,
  active boolean not null default true,
  source_id text not null default 'GESTIONALE_2026_27',
  synced_at timestamptz not null default now(),
  unique (organization_id, season, source_record_id)
);
create index if not exists scd_fee_positions_person_idx on public.scd_fee_positions (person_id) where person_id is not null;
alter table public.scd_fee_positions enable row level security;

create table if not exists public.scd_fee_sync (
  organization_id uuid primary key references public.scd_organizations(id),
  synced_at timestamptz not null,
  source_modified_at timestamptz,
  counts jsonb not null default '{}'::jsonb
);
alter table public.scd_fee_sync enable row level security;

-- Fingerprints used to link a sheet row to a person without moving fiscal codes or names.
create or replace function public.scd_fee_cf_hash(p_fiscal_code text)
returns text language sql immutable set search_path to 'public', 'extensions' as $$
  select case when coalesce(trim(p_fiscal_code), '') = '' then null
    else encode(extensions.digest(upper(regexp_replace(p_fiscal_code, '\s', '', 'g')), 'sha256'), 'hex') end;
$$;
create or replace function public.scd_fee_name_hash(p_last text, p_first text, p_birth date)
returns text language sql immutable set search_path to 'public', 'extensions' as $$
  select case when p_birth is null or coalesce(trim(p_last), '') = '' or coalesce(trim(p_first), '') = '' then null
    else encode(extensions.digest(lower(regexp_replace(trim(p_last), '\s+', ' ', 'g')) || '|' || lower(regexp_replace(trim(p_first), '\s+', ' ', 'g')) || '|' || p_birth::text, 'sha256'), 'hex') end;
$$;

-- Office check shared by the board.
create or replace function public.scd_fee_office(p_organization_id uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select public.scd_has_org_role(p_organization_id, array['DIRECTION','SECRETARIAT']::public.scd_role[])
    or public.scd_has_position(p_organization_id, array['tesoreria','segreteria','segreteria-presenza','segreteria-remoto','direzione','presidente','direttore-generale']);
$$;

-- Copy job: the whole snapshot in one call (idempotent). Run by the scheduled job only (service role).
create or replace function public.scd_fee_sync(p_organization_id uuid, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_now timestamptz := now();
  v_season text := coalesce(nullif(p_payload->>'season', ''), '2026/27');
  v_counts jsonb;
begin
  with src as (
    select x->>'id' as rid, x
    from jsonb_array_elements(coalesce(p_payload->'positions', '[]')) x
    where coalesce(x->>'id', '') <> ''
  ),
  by_cf as (
    select s.rid, min(p.id::text)::uuid as person_id, count(*) as n
    from src s join public.scd_people p
      on p.organization_id = p_organization_id and nullif(s.x->>'cfHash', '') is not null
     and public.scd_fee_cf_hash(p.fiscal_code) = s.x->>'cfHash'
    group by s.rid
  ),
  by_name as (
    select s.rid, min(p.id::text)::uuid as person_id, count(*) as n
    from src s join public.scd_people p
      on p.organization_id = p_organization_id and nullif(s.x->>'nameHash', '') is not null
     and public.scd_fee_name_hash(p.last_name, p.first_name, p.birth_date) = s.x->>'nameHash'
    group by s.rid
  )
  insert into public.scd_fee_positions as t (organization_id, season, source_record_id, person_id, match_method, birth_year,
    category, fee_total, paid, residual, overdue, status, status_override, status_group, notice_sent, notice_date, plan,
    instalments, fund_benefit, family_rule, action, active, synced_at)
  select p_organization_id, v_season, s.rid,
    case when c.n = 1 then c.person_id when nm.n = 1 then nm.person_id end,
    case when c.n = 1 then 'FISCAL_CODE' when nm.n = 1 then 'NAME_BIRTH' end,
    nullif(s.x->>'birthYear', '')::int,
    nullif(s.x->>'category', ''),
    nullif(s.x->>'feeTotal', '')::numeric, nullif(s.x->>'paid', '')::numeric,
    nullif(s.x->>'residual', '')::numeric, nullif(s.x->>'overdue', '')::numeric,
    nullif(s.x->>'status', ''), nullif(s.x->>'override', ''),
    coalesce(nullif(s.x->>'statusGroup', ''), 'DA_VERIFICARE'),
    case when s.x ? 'noticeSent' and jsonb_typeof(s.x->'noticeSent') = 'boolean' then (s.x->>'noticeSent')::boolean end,
    nullif(s.x->>'noticeDate', ''),
    nullif(s.x->>'plan', ''),
    coalesce((select array_agg(v::numeric) from jsonb_array_elements_text(coalesce(s.x->'instalments', '[]')) v), '{}'),
    coalesce((s.x->>'fund')::boolean, false),
    nullif(s.x->>'familyRule', ''), nullif(s.x->>'action', ''), true, v_now
  from src s
  left join by_cf c on c.rid = s.rid
  left join by_name nm on nm.rid = s.rid
  on conflict (organization_id, season, source_record_id) do update set
    person_id = coalesce(excluded.person_id, t.person_id),
    match_method = coalesce(excluded.match_method, t.match_method),
    birth_year = excluded.birth_year, category = excluded.category, fee_total = excluded.fee_total,
    paid = excluded.paid, residual = excluded.residual, overdue = excluded.overdue, status = excluded.status,
    status_override = excluded.status_override, status_group = excluded.status_group, notice_sent = excluded.notice_sent,
    notice_date = excluded.notice_date, plan = excluded.plan, instalments = excluded.instalments,
    fund_benefit = excluded.fund_benefit, family_rule = excluded.family_rule, action = excluded.action,
    active = true, synced_at = v_now;
  update public.scd_fee_positions set active = false
    where organization_id = p_organization_id and season = v_season and synced_at < v_now and active;

  v_counts := jsonb_build_object(
    'positions', (select count(*) from public.scd_fee_positions where organization_id = p_organization_id and season = v_season and active),
    'linked', (select count(*) from public.scd_fee_positions where organization_id = p_organization_id and season = v_season and active and person_id is not null));
  insert into public.scd_fee_sync (organization_id, synced_at, source_modified_at, counts)
  values (p_organization_id, v_now, nullif(p_payload->>'sourceModifiedAt', '')::timestamptz, v_counts)
  on conflict (organization_id) do update set synced_at = excluded.synced_at,
    source_modified_at = excluded.source_modified_at, counts = excluded.counts;
  return v_counts;
end;
$$;
revoke all on function public.scd_fee_sync(uuid, jsonb) from public, anon, authenticated;

-- Office board: totals per category and per status, and every active position for the work list
-- (names only for positions linked to a person). Null for anyone else.
create or replace function public.scd_fee_board(p_organization_id uuid, p_season text default '2026/27')
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
begin
  if not public.scd_fee_office(p_organization_id) then
    return null;
  end if;
  return jsonb_build_object(
    'season', p_season,
    'sync', (select to_jsonb(s) - 'organization_id' from public.scd_fee_sync s where s.organization_id = p_organization_id),
    'positions', coalesce((select jsonb_agg(jsonb_build_object(
        'code', f.source_record_id,
        'name', case when f.person_id is not null then coalesce(nullif(p.display_name, ''), trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, ''))) end,
        'birthYear', f.birth_year, 'category', f.category, 'feeTotal', f.fee_total, 'paid', f.paid,
        'residual', f.residual, 'overdue', f.overdue, 'status', f.status, 'override', f.status_override,
        'group', f.status_group, 'noticeSent', f.notice_sent, 'noticeDate', f.notice_date, 'plan', f.plan,
        'instalments', to_jsonb(f.instalments), 'fund', f.fund_benefit, 'familyRule', f.family_rule,
        'action', f.action, 'linked', f.person_id is not null) order by f.category nulls last, f.birth_year, f.source_record_id)
      from public.scd_fee_positions f
      left join public.scd_people p on p.id = f.person_id
      where f.organization_id = p_organization_id and f.season = p_season and f.active), '[]'::jsonb)
  );
end;
$$;
revoke all on function public.scd_fee_board(uuid, text) from public, anon;
grant execute on function public.scd_fee_board(uuid, text) to authenticated;

-- Family view: positions of the people in the caller's own family circle. No internal notes or rules.
create or replace function public.scd_my_fees(p_organization_id uuid, p_season text default '2026/27')
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'personId', fam.person_id, 'name', fam.display_name, 'feeTotal', f.fee_total, 'paid', f.paid,
      'residual', f.residual, 'overdue', f.overdue, 'group', f.status_group, 'plan', f.plan,
      'instalments', to_jsonb(f.instalments), 'noticeSent', f.notice_sent) order by fam.display_name), '[]'::jsonb)
  from public.scd_my_family(p_organization_id) fam
  join public.scd_fee_positions f
    on f.person_id = fam.person_id and f.organization_id = p_organization_id and f.season = p_season and f.active
   and f.status_group <> 'ESCLUSO';
$$;
revoke all on function public.scd_my_fees(uuid, text) from public, anon;
grant execute on function public.scd_my_fees(uuid, text) to authenticated;
revoke all on function public.scd_fee_office(uuid) from public, anon;
grant execute on function public.scd_fee_office(uuid) to authenticated;
