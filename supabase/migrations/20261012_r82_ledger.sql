-- r82 (UD-083, telaio T3 Soldi): register of the club's account movements, starting with the SumUp business
-- account where families pay fees and minibus. One row per bank transaction, immutable in its core fields
-- (date, amount, fee, balance); only the reconciliation fields change, and every change is logged.
-- Reconciliation has three states for family payments: DA_ABBINARE -> PROPOSTO (linked automatically) -> VERIFICATO
-- (a person of Tesoreria/Direzione confirms). No IBAN and no family names are stored: the link to the fee position
-- is computed from a transient hint that is never saved. Readers: Direzione and Tesoreria only.

create table if not exists public.scd_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id),
  account text not null,
  txn_code text not null,
  seq integer not null,
  booked_at timestamptz not null,
  kind text not null check (kind in ('BONIFICO_IN','BONIFICO_OUT','SUMUP_ACCREDITO','POS','ONLINE','PRELIEVO','ALTRO')),
  amount numeric(12,2) not null,
  fee numeric(12,2) not null default 0,
  balance_after numeric(12,2),
  status text,
  category text not null check (category in ('QUOTA','FONDO_SOLIDALE','PULMINO','ADESIONE_PULMINO','INCASSI_SUMUP',
    'ENTRATA_DA_CLASSIFICARE','FORNITORE','CLUB_HOUSE_ACQUISTI','ACQUISTI_MATERIALE','SOFTWARE_SERVIZI','FEDERAZIONE',
    'PRELIEVO_CONTANTI','STAFF_E_SPESE','RIMBORSO','USCITA_DA_CLASSIFICARE')),
  months text[] not null default '{}',
  counterparty text,
  family boolean not null default false,
  link_kind text check (link_kind is null or link_kind in ('FEE_POSITION','SUPPLIER')),
  link_ref text,
  match_state text not null default 'NON_APPLICABILE'
    check (match_state in ('DA_ABBINARE','PROPOSTO','VERIFICATO','NON_APPLICABILE')),
  verified_by uuid,
  verified_at timestamptz,
  note text check (note is null or char_length(note) <= 300),
  created_at timestamptz not null default now(),
  unique (organization_id, account, txn_code)
);
create index if not exists scd_ledger_entries_seq_idx on public.scd_ledger_entries (organization_id, account, seq);
create index if not exists scd_ledger_entries_link_idx on public.scd_ledger_entries (organization_id, link_kind, link_ref);
alter table public.scd_ledger_entries enable row level security;
revoke all on public.scd_ledger_entries from anon, authenticated;

create table if not exists public.scd_ledger_events (
  id bigint generated always as identity primary key,
  entry_id uuid not null references public.scd_ledger_entries(id),
  action text not null,
  before_state text,
  after_state text,
  link_ref text,
  note text,
  actor uuid default auth.uid(),
  at timestamptz not null default now()
);
alter table public.scd_ledger_events enable row level security;
revoke all on public.scd_ledger_events from anon, authenticated;

-- Core fields of a movement never change after it is booked.
create or replace function public.scd_ledger_guard()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  if new.account is distinct from old.account or new.txn_code is distinct from old.txn_code
     or new.booked_at is distinct from old.booked_at or new.amount is distinct from old.amount
     or new.fee is distinct from old.fee or new.balance_after is distinct from old.balance_after
     or new.kind is distinct from old.kind or new.seq is distinct from old.seq
     or new.organization_id is distinct from old.organization_id then
    raise exception 'ledger entries are immutable (only reconciliation fields can change)';
  end if;
  return new;
end;
$$;
create trigger scd_ledger_guard before update on public.scd_ledger_entries for each row execute function public.scd_ledger_guard();

-- Intake (scheduled job / service role only). Idempotent on (account, txn_code).
create or replace function public.scd_ledger_ingest(p_organization_id uuid, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_account text := coalesce(nullif(p_payload->>'account', ''), 'SUMUP_MYYM50MA');
  v_item jsonb;
  v_new int := 0;
  v_skip int := 0;
  v_linked int := 0;
  v_hint text;
  v_ref text;
  v_kind text;
  v_state text;
  v_id uuid;
  v_cat text;
begin
  for v_item in select * from jsonb_array_elements(coalesce(p_payload->'items', '[]'::jsonb)) loop
    if coalesce(v_item->>'code', '') = '' or coalesce(v_item->>'bookedAt', '') = '' then
      v_skip := v_skip + 1;
      continue;
    end if;
    v_cat := coalesce(nullif(v_item->>'category', ''), case when (v_item->>'amount')::numeric >= 0 then 'ENTRATA_DA_CLASSIFICARE' else 'USCITA_DA_CLASSIFICARE' end);
    v_ref := null;
    v_kind := null;
    v_hint := lower(coalesce(v_item->>'hint', ''));
    if v_hint <> '' and v_cat in ('QUOTA','FONDO_SOLIDALE','PULMINO','ADESIONE_PULMINO','ENTRATA_DA_CLASSIFICARE') then
      select min(f.source_record_id) into v_ref
      from public.scd_fee_positions f
      join public.scd_people p on p.id = f.person_id
      where f.organization_id = p_organization_id and f.active
        and length(trim(coalesce(p.first_name, ''))) >= 2 and length(trim(coalesce(p.last_name, ''))) >= 2
        and position(lower(trim(p.last_name)) in v_hint) > 0
        and position(lower(trim(p.first_name)) in v_hint) > 0
      having count(*) = 1;
      if v_ref is not null then v_kind := 'FEE_POSITION'; end if;
    elsif v_cat = 'FORNITORE' and coalesce(v_item->>'counterparty', '') <> '' then
      select min(s.supplier_key) into v_ref
      from public.scd_supplier_positions s
      where s.organization_id = p_organization_id and s.active
        and length(split_part(s.supplier, ' ', 1)) >= 4
        and position(lower(split_part(s.supplier, ' ', 1)) in lower(v_item->>'counterparty')) > 0
      having count(*) = 1;
      if v_ref is not null then v_kind := 'SUPPLIER'; end if;
    end if;
    v_state := case
      when coalesce((v_item->>'family')::boolean, false) then (case when v_ref is null then 'DA_ABBINARE' else 'PROPOSTO' end)
      when v_cat = 'FORNITORE' then (case when v_ref is null then 'DA_ABBINARE' else 'PROPOSTO' end)
      when v_cat in ('ENTRATA_DA_CLASSIFICARE','USCITA_DA_CLASSIFICARE') then 'DA_ABBINARE'
      else 'NON_APPLICABILE' end;
    insert into public.scd_ledger_entries (organization_id, account, txn_code, seq, booked_at, kind, amount, fee, balance_after,
      status, category, months, counterparty, family, link_kind, link_ref, match_state)
    values (p_organization_id, v_account, v_item->>'code', coalesce((v_item->>'seq')::int, 0), (v_item->>'bookedAt')::timestamptz,
      coalesce(nullif(v_item->>'kind', ''), 'ALTRO'), (v_item->>'amount')::numeric, coalesce((v_item->>'fee')::numeric, 0),
      nullif(v_item->>'balanceAfter', '')::numeric, left(nullif(v_item->>'status', ''), 40), v_cat,
      coalesce((select array_agg(m) from jsonb_array_elements_text(coalesce(v_item->'months', '[]')) m), '{}'),
      left(nullif(v_item->>'counterparty', ''), 80), coalesce((v_item->>'family')::boolean, false), v_kind, v_ref, v_state)
    on conflict (organization_id, account, txn_code) do nothing
    returning id into v_id;
    if v_id is null then
      v_skip := v_skip + 1;
    else
      v_new := v_new + 1;
      if v_ref is not null then v_linked := v_linked + 1; end if;
      insert into public.scd_ledger_events (entry_id, action, after_state, link_ref) values (v_id, 'BOOKED', v_state, v_ref);
    end if;
    v_id := null;
  end loop;
  return jsonb_build_object('new', v_new, 'skipped', v_skip, 'linked', v_linked);
end;
$$;
revoke all on function public.scd_ledger_ingest(uuid, jsonb) from public, anon, authenticated;

-- Board for Direzione and Tesoreria. Null for anyone else.
create or replace function public.scd_ledger_board(p_organization_id uuid)
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
  return (with e as (
      select l.*,
        lag(l.balance_after) over (partition by l.account order by l.seq) as prev_balance,
        row_number() over (partition by l.account order by l.seq) as rn
      from public.scd_ledger_entries l where l.organization_id = p_organization_id
    ), chk as (
      select count(*) filter (where rn > 1 and prev_balance is not null and balance_after is not null
               and abs(prev_balance + amount - fee - balance_after) > 0.005) as broken
      from e
    ), fee_bank as (
      select l.link_ref, sum(l.amount) as bank_total, count(*) as n
      from public.scd_ledger_entries l
      where l.organization_id = p_organization_id and l.link_kind = 'FEE_POSITION'
        and l.category in ('QUOTA','FONDO_SOLIDALE') and l.match_state in ('PROPOSTO','VERIFICATO')
      group by l.link_ref
    )
    select jsonb_build_object(
      'summary', (select jsonb_build_object(
          'movements', count(*), 'incoming', coalesce(sum(amount) filter (where amount > 0), 0),
          'outgoing', coalesce(-sum(amount) filter (where amount < 0), 0), 'fees', coalesce(sum(fee), 0),
          'firstAt', min(booked_at), 'lastAt', max(booked_at),
          'balance', (select balance_after from e x order by x.booked_at desc, x.seq desc limit 1),
          'brokenBalances', (select broken from chk),
          'toMatch', count(*) filter (where match_state = 'DA_ABBINARE'),
          'proposed', count(*) filter (where match_state = 'PROPOSTO'),
          'verified', count(*) filter (where match_state = 'VERIFICATO')) from e),
      'months', coalesce((select jsonb_agg(jsonb_build_object('month', m.month, 'incoming', m.inc, 'outgoing', m.outg, 'fees', m.fees) order by m.month)
          from (select to_char(booked_at at time zone 'Europe/Rome', 'YYYY-MM') as month,
                  sum(amount) filter (where amount > 0) as inc, -sum(amount) filter (where amount < 0) as outg, sum(fee) as fees
                from e group by 1) m), '[]'::jsonb),
      'categories', coalesce((select jsonb_agg(jsonb_build_object('category', c.category, 'count', c.n, 'total', c.total) order by c.total desc)
          from (select category, count(*) as n, sum(amount) as total from e group by 1) c), '[]'::jsonb),
      'entries', coalesce((select jsonb_agg(jsonb_build_object(
          'code', e.txn_code, 'bookedAt', e.booked_at, 'kind', e.kind, 'amount', e.amount, 'fee', e.fee,
          'balance', e.balance_after, 'category', e.category, 'months', to_jsonb(e.months), 'counterparty', e.counterparty,
          'family', e.family, 'matchState', e.match_state, 'linkKind', e.link_kind, 'linkRef', e.link_ref,
          'linkLabel', case
            when e.link_kind = 'FEE_POSITION' then (select trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, ''))
              || coalesce(' · ' || f.category, '') from public.scd_fee_positions f left join public.scd_people p on p.id = f.person_id
              where f.organization_id = p_organization_id and f.source_record_id = e.link_ref and f.active limit 1)
            when e.link_kind = 'SUPPLIER' then (select s.supplier from public.scd_supplier_positions s
              where s.organization_id = p_organization_id and s.supplier_key = e.link_ref limit 1)
          end,
          'verifiedAt', e.verified_at, 'note', e.note) order by e.booked_at desc, e.seq desc) from e), '[]'::jsonb),
      'feeCompare', coalesce((select jsonb_agg(jsonb_build_object(
          'ref', fb.link_ref,
          'label', trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')),
          'category', f.category, 'bank', fb.bank_total, 'movements', fb.n, 'gestionale', f.paid,
          'difference', fb.bank_total - coalesce(f.paid, 0)) order by abs(fb.bank_total - coalesce(f.paid, 0)) desc)
        from fee_bank fb
        join public.scd_fee_positions f on f.organization_id = p_organization_id and f.source_record_id = fb.link_ref and f.active
        left join public.scd_people p on p.id = f.person_id), '[]'::jsonb)
    ));
end;
$$;
revoke all on function public.scd_ledger_board(uuid) from public, anon;
grant execute on function public.scd_ledger_board(uuid) to authenticated;

-- Tesoreria/Direzione reconcile a movement. Actions: verify, reopen, link (fee position code), unlink, not_applicable.
create or replace function public.scd_ledger_decide(p_organization_id uuid, p_code text, p_action text, p_fee_ref text default null, p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_row public.scd_ledger_entries;
  v_state text;
  v_ref text;
  v_kind text;
begin
  if not public.scd_proposal_reserved_reader(p_organization_id) then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  select * into v_row from public.scd_ledger_entries where organization_id = p_organization_id and txn_code = p_code;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;
  v_state := v_row.match_state;
  v_ref := v_row.link_ref;
  v_kind := v_row.link_kind;
  if p_action = 'verify' then
    v_state := 'VERIFICATO';
  elsif p_action = 'reopen' then
    v_state := case when v_ref is null then 'DA_ABBINARE' else 'PROPOSTO' end;
  elsif p_action = 'link' then
    if coalesce(p_fee_ref, '') = '' or not exists (select 1 from public.scd_fee_positions f
        where f.organization_id = p_organization_id and f.source_record_id = p_fee_ref and f.active) then
      return jsonb_build_object('ok', false, 'code', 'fee_not_found');
    end if;
    v_ref := p_fee_ref;
    v_kind := 'FEE_POSITION';
    v_state := 'VERIFICATO';
  elsif p_action = 'unlink' then
    v_ref := null;
    v_kind := null;
    v_state := 'DA_ABBINARE';
  elsif p_action = 'not_applicable' then
    if coalesce(trim(p_note), '') = '' then
      return jsonb_build_object('ok', false, 'code', 'note_required');
    end if;
    v_state := 'NON_APPLICABILE';
  else
    return jsonb_build_object('ok', false, 'code', 'action');
  end if;
  update public.scd_ledger_entries set match_state = v_state, link_ref = v_ref, link_kind = v_kind,
    verified_by = case when v_state = 'VERIFICATO' then auth.uid() else null end,
    verified_at = case when v_state = 'VERIFICATO' then now() else null end,
    note = coalesce(left(nullif(trim(p_note), ''), 300), note)
    where id = v_row.id;
  insert into public.scd_ledger_events (entry_id, action, before_state, after_state, link_ref, note)
    values (v_row.id, upper(p_action), v_row.match_state, v_state, v_ref, left(nullif(trim(p_note), ''), 300));
  return jsonb_build_object('ok', true, 'state', v_state, 'linkRef', v_ref);
end;
$$;
revoke all on function public.scd_ledger_decide(uuid, text, text, text, text) from public, anon;
grant execute on function public.scd_ledger_decide(uuid, text, text, text, text) to authenticated;
