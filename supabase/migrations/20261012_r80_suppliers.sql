-- r80: M11 Fornitori ed economia — copy of the master "SCD - TESORERIA FORNITORI | SCADENZE E CHIUSURE 2026-2027"
-- (decision N2: suppliers master = TESORERIA FORNITORI). The sheet stays the master; a scheduled job writes this copy.
-- Stored: supplier company name, plan state, amounts, instalments, next action, strategy, link to the mail thread.
-- Never stored: contacts (people, phones, e-mails), IBAN, notes. Readers: Direzione and Tesoreria only (RISERVATO).

create table if not exists public.scd_supplier_positions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id),
  season text not null default '2026/27',
  supplier_key text not null,
  supplier text not null,
  plan_status text,
  plan_group text not null default 'DA_DEFINIRE'
    check (plan_group in ('PIANO_ATTIVO','DA_DEFINIRE','CHIUSO','CONTESTATO')),
  balance numeric(12,2),
  paid numeric(12,2),
  residual numeric(12,2),
  instalments_count integer check (instalments_count is null or instalments_count between 0 and 60),
  next_amount numeric(12,2),
  next_due date,
  closing_expected date,
  next_action text,
  commercial_position text,
  strategy text,
  mail_url text check (mail_url is null or mail_url like 'https://mail.google.com/%'),
  active boolean not null default true,
  synced_at timestamptz not null default now(),
  unique (organization_id, season, supplier_key)
);
alter table public.scd_supplier_positions enable row level security;

create table if not exists public.scd_supplier_instalments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id),
  season text not null default '2026/27',
  instalment_key text not null,
  supplier_key text not null,
  supplier text not null,
  label text,
  amount numeric(12,2),
  due date,
  plan_status text,
  urgency text,
  todo text,
  mail_url text check (mail_url is null or mail_url like 'https://mail.google.com/%'),
  active boolean not null default true,
  synced_at timestamptz not null default now(),
  unique (organization_id, season, instalment_key)
);
create index if not exists scd_supplier_instalments_due_idx on public.scd_supplier_instalments (organization_id, due) where active;
alter table public.scd_supplier_instalments enable row level security;

create table if not exists public.scd_supplier_sync (
  organization_id uuid primary key references public.scd_organizations(id),
  synced_at timestamptz not null,
  source_modified_at timestamptz,
  source_aligned_on date,
  counts jsonb not null default '{}'::jsonb
);
alter table public.scd_supplier_sync enable row level security;

-- Copy from the master (scheduled job, service role only). Rows missing from the payload become inactive.
create or replace function public.scd_supplier_sync_copy(p_organization_id uuid, p_payload jsonb)
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
  insert into public.scd_supplier_positions as t (organization_id, season, supplier_key, supplier, plan_status, plan_group,
    balance, paid, residual, instalments_count, next_amount, next_due, closing_expected, next_action, commercial_position,
    strategy, mail_url, active, synced_at)
  select p_organization_id, v_season, x->>'key', left(x->>'supplier', 120), left(nullif(x->>'planStatus', ''), 80),
    coalesce(nullif(x->>'planGroup', ''), 'DA_DEFINIRE'),
    nullif(x->>'balance', '')::numeric, nullif(x->>'paid', '')::numeric, nullif(x->>'residual', '')::numeric,
    nullif(x->>'instalments', '')::int, nullif(x->>'nextAmount', '')::numeric,
    nullif(x->>'nextDue', '')::date, nullif(x->>'closingExpected', '')::date,
    left(nullif(x->>'nextAction', ''), 200), left(nullif(x->>'commercialPosition', ''), 120),
    left(nullif(x->>'strategy', ''), 200), nullif(x->>'mailUrl', ''), true, v_now
  from jsonb_array_elements(coalesce(p_payload->'suppliers', '[]')) x
  where coalesce(x->>'key', '') <> '' and coalesce(x->>'supplier', '') <> ''
  on conflict (organization_id, season, supplier_key) do update set
    supplier = excluded.supplier, plan_status = excluded.plan_status, plan_group = excluded.plan_group,
    balance = excluded.balance, paid = excluded.paid, residual = excluded.residual,
    instalments_count = excluded.instalments_count, next_amount = excluded.next_amount, next_due = excluded.next_due,
    closing_expected = excluded.closing_expected, next_action = excluded.next_action,
    commercial_position = excluded.commercial_position, strategy = excluded.strategy, mail_url = excluded.mail_url,
    active = true, synced_at = v_now;
  update public.scd_supplier_positions set active = false
    where organization_id = p_organization_id and season = v_season and synced_at < v_now and active;

  insert into public.scd_supplier_instalments as t (organization_id, season, instalment_key, supplier_key, supplier, label,
    amount, due, plan_status, urgency, todo, mail_url, active, synced_at)
  select p_organization_id, v_season, x->>'key', x->>'supplierKey', left(x->>'supplier', 120), left(nullif(x->>'label', ''), 40),
    nullif(x->>'amount', '')::numeric, nullif(x->>'due', '')::date, left(nullif(x->>'planStatus', ''), 80),
    left(nullif(x->>'urgency', ''), 40), left(nullif(x->>'todo', ''), 200), nullif(x->>'mailUrl', ''), true, v_now
  from jsonb_array_elements(coalesce(p_payload->'instalments', '[]')) x
  where coalesce(x->>'key', '') <> '' and coalesce(x->>'supplierKey', '') <> '' and coalesce(x->>'supplier', '') <> ''
  on conflict (organization_id, season, instalment_key) do update set
    supplier_key = excluded.supplier_key, supplier = excluded.supplier, label = excluded.label, amount = excluded.amount,
    due = excluded.due, plan_status = excluded.plan_status, urgency = excluded.urgency, todo = excluded.todo,
    mail_url = excluded.mail_url, active = true, synced_at = v_now;
  update public.scd_supplier_instalments set active = false
    where organization_id = p_organization_id and season = v_season and synced_at < v_now and active;

  v_counts := jsonb_build_object(
    'suppliers', (select count(*) from public.scd_supplier_positions where organization_id = p_organization_id and season = v_season and active),
    'instalments', (select count(*) from public.scd_supplier_instalments where organization_id = p_organization_id and season = v_season and active));
  insert into public.scd_supplier_sync (organization_id, synced_at, source_modified_at, source_aligned_on, counts)
  values (p_organization_id, v_now, nullif(p_payload->>'sourceModifiedAt', '')::timestamptz,
    nullif(p_payload->>'alignedOn', '')::date, v_counts)
  on conflict (organization_id) do update set synced_at = excluded.synced_at, source_modified_at = excluded.source_modified_at,
    source_aligned_on = excluded.source_aligned_on, counts = excluded.counts;
  return v_counts;
end;
$$;
revoke all on function public.scd_supplier_sync_copy(uuid, jsonb) from public, anon, authenticated;

-- Board for Direzione and Tesoreria. Null for anyone else.
create or replace function public.scd_supplier_board(p_organization_id uuid, p_season text default '2026/27')
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
begin
  if not public.scd_proposal_reserved_reader(p_organization_id) then
    return null;
  end if;
  return jsonb_build_object(
    'season', p_season,
    'sync', (select jsonb_build_object('syncedAt', s.synced_at, 'sourceModifiedAt', s.source_modified_at,
               'alignedOn', s.source_aligned_on, 'counts', s.counts)
             from public.scd_supplier_sync s where s.organization_id = p_organization_id),
    'suppliers', coalesce((select jsonb_agg(jsonb_build_object(
        'key', p.supplier_key, 'supplier', p.supplier, 'planStatus', p.plan_status, 'planGroup', p.plan_group,
        'balance', p.balance, 'paid', p.paid, 'residual', p.residual, 'instalments', p.instalments_count,
        'nextAmount', p.next_amount, 'nextDue', p.next_due, 'closingExpected', p.closing_expected,
        'nextAction', p.next_action, 'commercialPosition', p.commercial_position, 'strategy', p.strategy,
        'mailUrl', p.mail_url) order by p.next_due nulls last, p.supplier)
      from public.scd_supplier_positions p
      where p.organization_id = p_organization_id and p.season = p_season and p.active), '[]'::jsonb),
    'instalments', coalesce((select jsonb_agg(jsonb_build_object(
        'key', i.instalment_key, 'supplierKey', i.supplier_key, 'supplier', i.supplier, 'label', i.label,
        'amount', i.amount, 'due', i.due, 'planStatus', i.plan_status, 'urgency', i.urgency, 'todo', i.todo,
        'mailUrl', i.mail_url) order by i.due nulls last, i.supplier)
      from public.scd_supplier_instalments i
      where i.organization_id = p_organization_id and i.season = p_season and i.active), '[]'::jsonb));
end;
$$;
revoke all on function public.scd_supplier_board(uuid, text) from public, anon;
grant execute on function public.scd_supplier_board(uuid, text) to authenticated;
