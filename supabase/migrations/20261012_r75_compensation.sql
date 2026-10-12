-- r75: Compensi e stipendi (UD-075, 2026-10-12). Direction keeps agreements and monthly entries,
-- authorizes the month; Treasury sees the authorized amounts, verifies and records the payment.
-- Month of competence -> payment due on day 15 of the following month (settembre -> entro il 15 ottobre),
-- as in the Control Tower tab "09_PAGAMENTI_OTTOBRE". The app never executes a payment.
-- Payable only if: relationship active and not ceased, IBAN confirmed, contract/RASD OK,
-- Direction authorization, net > 0 (same rule as the treasury workbook, formula AE5).
-- IBANs are NOT stored here: only their verification status. Every write is audited.
-- Access: Direzione (role DIRECTION or positions direzione/presidente/direttore-generale) and the
-- position "tesoreria". Tables have no policies: all access goes through the functions below.

create table if not exists public.scd_comp_agreements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id),
  person_code text,
  person_id uuid references public.scd_people(id),
  display_name text not null,
  area text,
  role_label text,
  contract_type text not null default 'DA_VERIFICARE'
    check (contract_type in ('LAVORO_SPORTIVO', 'VOLONTARIATO_SPORTIVO', 'COLLABORAZIONE', 'DIPENDENTE', 'ALTRO', 'DA_VERIFICARE')),
  monthly_fixed numeric(10,2) not null default 0 check (monthly_fixed >= 0),
  legacy_monthly numeric(10,2),
  goal_rate numeric(10,2) check (goal_rate is null or goal_rate >= 0),
  iban_status text not null default 'MANCANTE' check (iban_status in ('MANCANTE', 'DA_VERIFICARE', 'CONFERMATO')),
  contract_status text not null default 'DA_VERIFICARE' check (contract_status in ('DA_VERIFICARE', 'OK', 'BLOCCATO')),
  relationship_status text not null default 'ATTIVO' check (relationship_status in ('ATTIVO', 'SOSPESO', 'CESSATO')),
  start_date date,
  end_date date,
  ceased_at date,
  open_advances numeric(10,2) not null default 0,
  open_recoveries numeric(10,2) not null default 0,
  notes text,
  source_id text not null default 'APP',
  source_record_id text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists scd_comp_agreements_source on public.scd_comp_agreements (organization_id, source_id, source_record_id) where source_record_id is not null;

create table if not exists public.scd_comp_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id),
  agreement_id uuid references public.scd_comp_agreements(id),
  storage_path text not null,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  kind text not null default 'ALTRO' check (kind in ('CONTRATTO', 'RASD', 'RICEVUTA', 'GIUSTIFICATIVO', 'DELIBERA', 'BONIFICO', 'ALTRO')),
  uploaded_by uuid,
  uploaded_at timestamptz not null default now()
);

create table if not exists public.scd_comp_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id),
  agreement_id uuid not null references public.scd_comp_agreements(id),
  period text not null check (period ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  kind text not null check (kind in ('VARIABILE', 'ATTIVITA_BASE', 'PREMIO', 'GOAL', 'TORNEO', 'RIMBORSO_SPESE', 'RETTIFICA_PIU',
                                     'ACCONTO', 'RECUPERO', 'CONTRIBUTO_CASA', 'ALTRO_AIUTO', 'RETTIFICA_MENO')),
  quantity numeric(10,2),
  unit_amount numeric(10,2),
  amount numeric(10,2) not null check (amount > 0),
  entry_date date not null default current_date,
  note text,
  document_id uuid references public.scd_comp_documents(id),
  status text not null default 'ATTIVA' check (status in ('ATTIVA', 'ANNULLATA')),
  cancel_reason text,
  created_by uuid,
  created_at timestamptz not null default now(),
  cancelled_by uuid,
  cancelled_at timestamptz
);
create index if not exists scd_comp_entries_period on public.scd_comp_entries (organization_id, period);

create table if not exists public.scd_comp_periods (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id),
  agreement_id uuid not null references public.scd_comp_agreements(id),
  period text not null check (period ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  fixed_amount numeric(10,2) check (fixed_amount is null or fixed_amount >= 0),
  status text not null default 'BOZZA' check (status in ('BOZZA', 'AUTORIZZATO', 'PAGATO', 'BLOCCATO')),
  authorized_by uuid,
  authorized_at timestamptz,
  authorized_net numeric(10,2),
  paid_amount numeric(10,2),
  paid_at date,
  paid_method text,
  paid_ref text,
  paid_by uuid,
  paid_document_id uuid references public.scd_comp_documents(id),
  note text,
  updated_by uuid,
  updated_at timestamptz not null default now(),
  unique (agreement_id, period)
);

alter table public.scd_comp_agreements enable row level security;
alter table public.scd_comp_documents enable row level security;
alter table public.scd_comp_entries enable row level security;
alter table public.scd_comp_periods enable row level security;
revoke all on public.scd_comp_agreements, public.scd_comp_documents, public.scd_comp_entries, public.scd_comp_periods from anon, authenticated;

-- Who may act: 'DIREZIONE' (full), 'TESORERIA' (entries + payment), or null.
create or replace function public.scd_comp_actor(p_organization_id uuid)
returns text
language sql
stable
set search_path to 'public'
as $$
  select case
    when public.scd_has_org_role(p_organization_id, array['DIRECTION']::public.scd_role[])
      or public.scd_has_position(p_organization_id, array['direzione','presidente','direttore-generale']) then 'DIREZIONE'
    when public.scd_has_position(p_organization_id, array['tesoreria']) then 'TESORERIA'
    else null end;
$$;

create or replace function public.scd_comp_sign(p_kind text)
returns integer
language sql
immutable
as $$
  select case when p_kind in ('ACCONTO', 'RECUPERO', 'CONTRIBUTO_CASA', 'ALTRO_AIUTO', 'RETTIFICA_MENO') then -1 else 1 end;
$$;

-- Blockers of an agreement for a period (empty array = payable once authorized).
create or replace function public.scd_comp_blockers(a public.scd_comp_agreements, p_period text, p_net numeric)
returns text[]
language sql
stable
as $$
  select array_remove(array[
    case when a.relationship_status <> 'ATTIVO' then 'RAPPORTO_NON_ATTIVO' end,
    case when a.ceased_at is not null and a.ceased_at < to_date(p_period || '-01', 'YYYY-MM-DD') then 'CESSATO' end,
    case when a.iban_status <> 'CONFERMATO' then 'IBAN_NON_CONFERMATO' end,
    case when a.contract_status <> 'OK' then 'CONTRATTO_RASD_DA_VERIFICARE' end,
    case when coalesce(p_net, 0) <= 0 then 'NETTO_ZERO' end
  ], null);
$$;

-- The month: one line per agreement active in the period, with entries, totals, status and blockers.
create or replace function public.scd_comp_board(p_organization_id uuid, p_period text)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_actor text := public.scd_comp_actor(p_organization_id);
  v_start date;
  v_end date;
begin
  if v_actor is null or p_period !~ '^\d{4}-(0[1-9]|1[0-2])$' then
    return null;
  end if;
  v_start := to_date(p_period || '-01', 'YYYY-MM-DD');
  v_end := (v_start + interval '1 month - 1 day')::date;
  return jsonb_build_object(
    'actor', v_actor,
    'period', p_period,
    'dueDate', (v_start + interval '1 month' + interval '14 days')::date,
    'lines', coalesce((
      select jsonb_agg(line order by line->>'name')
      from (
        select jsonb_build_object(
          'agreementId', a.id, 'personCode', a.person_code, 'name', a.display_name, 'area', a.area, 'role', a.role_label,
          'contractType', a.contract_type, 'monthlyFixed', a.monthly_fixed, 'legacyMonthly', a.legacy_monthly, 'goalRate', a.goal_rate,
          'ibanStatus', a.iban_status, 'contractStatus', a.contract_status, 'relationshipStatus', a.relationship_status,
          'startDate', a.start_date, 'endDate', a.end_date, 'ceasedAt', a.ceased_at, 'openAdvances', a.open_advances,
          'openRecoveries', a.open_recoveries, 'notes', a.notes,
          'fixed', coalesce(pr.fixed_amount, a.monthly_fixed),
          'plus', coalesce(t.plus, 0), 'minus', coalesce(t.minus, 0),
          'net', coalesce(pr.fixed_amount, a.monthly_fixed) + coalesce(t.plus, 0) - coalesce(t.minus, 0),
          'status', coalesce(pr.status, 'BOZZA'), 'authorizedAt', pr.authorized_at, 'authorizedNet', pr.authorized_net,
          'paidAmount', pr.paid_amount, 'paidAt', pr.paid_at, 'paidMethod', pr.paid_method, 'paidRef', pr.paid_ref, 'periodNote', pr.note,
          'blockers', to_jsonb(public.scd_comp_blockers(a, p_period, coalesce(pr.fixed_amount, a.monthly_fixed) + coalesce(t.plus, 0) - coalesce(t.minus, 0))),
          'entries', coalesce((select jsonb_agg(jsonb_build_object('id', e.id, 'kind', e.kind, 'quantity', e.quantity, 'unitAmount', e.unit_amount,
                'amount', e.amount, 'sign', public.scd_comp_sign(e.kind), 'date', e.entry_date, 'note', e.note,
                'documentId', e.document_id, 'status', e.status, 'cancelReason', e.cancel_reason, 'createdAt', e.created_at) order by e.entry_date, e.created_at)
              from public.scd_comp_entries e where e.agreement_id = a.id and e.period = p_period), '[]'::jsonb),
          'documents', coalesce((select jsonb_agg(jsonb_build_object('id', d.id, 'name', d.file_name, 'kind', d.kind, 'uploadedAt', d.uploaded_at) order by d.uploaded_at desc)
              from public.scd_comp_documents d where d.agreement_id = a.id), '[]'::jsonb)
        ) as line
        from public.scd_comp_agreements a
        left join public.scd_comp_periods pr on pr.agreement_id = a.id and pr.period = p_period
        left join lateral (
          select sum(e.amount) filter (where public.scd_comp_sign(e.kind) > 0) as plus,
                 sum(e.amount) filter (where public.scd_comp_sign(e.kind) < 0) as minus
          from public.scd_comp_entries e where e.agreement_id = a.id and e.period = p_period and e.status = 'ATTIVA'
        ) t on true
        where a.organization_id = p_organization_id
          and (a.start_date is null or a.start_date <= v_end)
          and (a.end_date is null or a.end_date >= v_start or pr.id is not null)
          and (a.relationship_status <> 'CESSATO' or a.ceased_at is null or a.ceased_at >= v_start or pr.id is not null)
      ) s
    ), '[]'::jsonb)
  );
end;
$$;
revoke all on function public.scd_comp_board(uuid, text) from public, anon;
grant execute on function public.scd_comp_board(uuid, text) to authenticated;

-- Agreement: insert or update (Direzione only).
create or replace function public.scd_comp_save_agreement(p_organization_id uuid, p_id uuid, p_data jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_id uuid := p_id;
begin
  if public.scd_comp_actor(p_organization_id) is distinct from 'DIREZIONE' then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  if coalesce(trim(p_data->>'name'), '') = '' then
    return jsonb_build_object('ok', false, 'code', 'missing');
  end if;
  if v_id is null then
    insert into public.scd_comp_agreements (organization_id, person_code, display_name, area, role_label, contract_type, monthly_fixed,
      goal_rate, iban_status, contract_status, relationship_status, start_date, end_date, ceased_at, notes, source_id, created_by, updated_by)
    values (p_organization_id, nullif(p_data->>'personCode', ''), left(trim(p_data->>'name'), 120), nullif(p_data->>'area', ''),
      nullif(p_data->>'role', ''), coalesce(nullif(p_data->>'contractType', ''), 'DA_VERIFICARE'), coalesce((p_data->>'monthlyFixed')::numeric, 0),
      (p_data->>'goalRate')::numeric, coalesce(nullif(p_data->>'ibanStatus', ''), 'MANCANTE'), coalesce(nullif(p_data->>'contractStatus', ''), 'DA_VERIFICARE'),
      coalesce(nullif(p_data->>'relationshipStatus', ''), 'ATTIVO'), (p_data->>'startDate')::date, (p_data->>'endDate')::date,
      (p_data->>'ceasedAt')::date, left(nullif(p_data->>'notes', ''), 1000), 'APP', auth.uid(), auth.uid())
    returning id into v_id;
  else
    update public.scd_comp_agreements set
      display_name = left(trim(p_data->>'name'), 120), area = nullif(p_data->>'area', ''), role_label = nullif(p_data->>'role', ''),
      contract_type = coalesce(nullif(p_data->>'contractType', ''), contract_type), monthly_fixed = coalesce((p_data->>'monthlyFixed')::numeric, monthly_fixed),
      goal_rate = (p_data->>'goalRate')::numeric, iban_status = coalesce(nullif(p_data->>'ibanStatus', ''), iban_status),
      contract_status = coalesce(nullif(p_data->>'contractStatus', ''), contract_status),
      relationship_status = coalesce(nullif(p_data->>'relationshipStatus', ''), relationship_status),
      start_date = (p_data->>'startDate')::date, end_date = (p_data->>'endDate')::date, ceased_at = (p_data->>'ceasedAt')::date,
      notes = left(nullif(p_data->>'notes', ''), 1000), updated_by = auth.uid(), updated_at = now()
    where id = v_id and organization_id = p_organization_id;
    if not found then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  end if;
  insert into public.scd_audit_events (organization_id, actor_user_id, action, entity_type, entity_id, payload)
  values (p_organization_id, auth.uid(), 'COMP_AGREEMENT_SAVE', 'scd_comp_agreements', v_id, p_data - 'notes');
  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;
revoke all on function public.scd_comp_save_agreement(uuid, uuid, jsonb) from public, anon;
grant execute on function public.scd_comp_save_agreement(uuid, uuid, jsonb) to authenticated;

-- Entry during the month (advance, goal, bonus, expense…): Direzione and Tesoreria.
create or replace function public.scd_comp_add_entry(p_organization_id uuid, p_data jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_actor text := public.scd_comp_actor(p_organization_id);
  v_agreement uuid := (p_data->>'agreementId')::uuid;
  v_period text := p_data->>'period';
  v_qty numeric := (p_data->>'quantity')::numeric;
  v_unit numeric := (p_data->>'unitAmount')::numeric;
  v_amount numeric := (p_data->>'amount')::numeric;
  v_status text;
  v_id uuid;
begin
  if v_actor is null then return jsonb_build_object('ok', false, 'code', 'forbidden'); end if;
  if not exists (select 1 from public.scd_comp_agreements where id = v_agreement and organization_id = p_organization_id) then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;
  select status into v_status from public.scd_comp_periods where agreement_id = v_agreement and period = v_period;
  if v_status in ('AUTORIZZATO', 'PAGATO') then
    return jsonb_build_object('ok', false, 'code', 'period_locked');
  end if;
  if v_amount is null and v_qty is not null and v_unit is not null then v_amount := round(v_qty * v_unit, 2); end if;
  if v_amount is null or v_amount <= 0 then return jsonb_build_object('ok', false, 'code', 'amount'); end if;
  if p_data->>'documentId' is not null and not exists (select 1 from public.scd_comp_documents where id = (p_data->>'documentId')::uuid and organization_id = p_organization_id) then
    return jsonb_build_object('ok', false, 'code', 'document');
  end if;
  insert into public.scd_comp_entries (organization_id, agreement_id, period, kind, quantity, unit_amount, amount, entry_date, note, document_id, created_by)
  values (p_organization_id, v_agreement, v_period, p_data->>'kind', v_qty, v_unit, v_amount, coalesce((p_data->>'date')::date, current_date),
    left(nullif(p_data->>'note', ''), 500), (p_data->>'documentId')::uuid, auth.uid())
  returning id into v_id;
  insert into public.scd_audit_events (organization_id, actor_user_id, action, entity_type, entity_id, payload)
  values (p_organization_id, auth.uid(), 'COMP_ENTRY_ADD', 'scd_comp_entries', v_id,
    jsonb_build_object('agreement', v_agreement, 'period', v_period, 'kind', p_data->>'kind', 'amount', v_amount, 'actor', v_actor));
  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;
revoke all on function public.scd_comp_add_entry(uuid, jsonb) from public, anon;
grant execute on function public.scd_comp_add_entry(uuid, jsonb) to authenticated;

-- Cancel an entry (never removed: status ANNULLATA with reason). Direzione and Tesoreria, only while the month is open.
create or replace function public.scd_comp_cancel_entry(p_organization_id uuid, p_entry_id uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_actor text := public.scd_comp_actor(p_organization_id);
  e public.scd_comp_entries;
begin
  if v_actor is null then return jsonb_build_object('ok', false, 'code', 'forbidden'); end if;
  select * into e from public.scd_comp_entries where id = p_entry_id and organization_id = p_organization_id;
  if not found then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  if exists (select 1 from public.scd_comp_periods where agreement_id = e.agreement_id and period = e.period and status in ('AUTORIZZATO', 'PAGATO')) then
    return jsonb_build_object('ok', false, 'code', 'period_locked');
  end if;
  if coalesce(trim(p_reason), '') = '' then return jsonb_build_object('ok', false, 'code', 'reason'); end if;
  update public.scd_comp_entries set status = 'ANNULLATA', cancel_reason = left(p_reason, 300), cancelled_by = auth.uid(), cancelled_at = now()
  where id = p_entry_id;
  insert into public.scd_audit_events (organization_id, actor_user_id, action, entity_type, entity_id, payload)
  values (p_organization_id, auth.uid(), 'COMP_ENTRY_CANCEL', 'scd_comp_entries', p_entry_id, jsonb_build_object('reason', left(p_reason, 300), 'actor', v_actor));
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.scd_comp_cancel_entry(uuid, uuid, text) from public, anon;
grant execute on function public.scd_comp_cancel_entry(uuid, uuid, text) to authenticated;

-- Month actions:
--   set_fixed (Direzione), authorize / unauthorize / block / unblock (Direzione),
--   mark_paid (Tesoreria or Direzione, only when authorized), unmark_paid (Direzione).
create or replace function public.scd_comp_period_action(p_organization_id uuid, p_agreement_id uuid, p_period text, p_action text, p_data jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_actor text := public.scd_comp_actor(p_organization_id);
  a public.scd_comp_agreements;
  pr public.scd_comp_periods;
  v_fixed numeric;
  v_net numeric;
  v_blockers text[];
begin
  if v_actor is null then return jsonb_build_object('ok', false, 'code', 'forbidden'); end if;
  if p_period !~ '^\d{4}-(0[1-9]|1[0-2])$' then return jsonb_build_object('ok', false, 'code', 'period'); end if;
  select * into a from public.scd_comp_agreements where id = p_agreement_id and organization_id = p_organization_id;
  if not found then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  insert into public.scd_comp_periods (organization_id, agreement_id, period, updated_by)
  values (p_organization_id, p_agreement_id, p_period, auth.uid())
  on conflict (agreement_id, period) do nothing;
  select * into pr from public.scd_comp_periods where agreement_id = p_agreement_id and period = p_period for update;
  v_fixed := coalesce(pr.fixed_amount, a.monthly_fixed);
  select v_fixed + coalesce(sum(e.amount * public.scd_comp_sign(e.kind)), 0) into v_net
  from public.scd_comp_entries e where e.agreement_id = p_agreement_id and e.period = p_period and e.status = 'ATTIVA';
  v_blockers := public.scd_comp_blockers(a, p_period, v_net);

  if p_action = 'set_fixed' then
    if v_actor <> 'DIREZIONE' then return jsonb_build_object('ok', false, 'code', 'forbidden'); end if;
    if pr.status in ('AUTORIZZATO', 'PAGATO') then return jsonb_build_object('ok', false, 'code', 'period_locked'); end if;
    update public.scd_comp_periods set fixed_amount = (p_data->>'fixed')::numeric, note = coalesce(left(nullif(p_data->>'note', ''), 500), note),
      updated_by = auth.uid(), updated_at = now() where id = pr.id;
  elsif p_action = 'authorize' then
    if v_actor <> 'DIREZIONE' then return jsonb_build_object('ok', false, 'code', 'forbidden'); end if;
    if pr.status = 'PAGATO' then return jsonb_build_object('ok', false, 'code', 'already_paid'); end if;
    if array_length(v_blockers, 1) > 0 then return jsonb_build_object('ok', false, 'code', 'blocked', 'blockers', to_jsonb(v_blockers)); end if;
    update public.scd_comp_periods set status = 'AUTORIZZATO', authorized_by = auth.uid(), authorized_at = now(), authorized_net = v_net,
      updated_by = auth.uid(), updated_at = now() where id = pr.id;
  elsif p_action = 'unauthorize' then
    if v_actor <> 'DIREZIONE' then return jsonb_build_object('ok', false, 'code', 'forbidden'); end if;
    if pr.status <> 'AUTORIZZATO' then return jsonb_build_object('ok', false, 'code', 'state'); end if;
    update public.scd_comp_periods set status = 'BOZZA', authorized_by = null, authorized_at = null, authorized_net = null,
      updated_by = auth.uid(), updated_at = now() where id = pr.id;
  elsif p_action = 'block' or p_action = 'unblock' then
    if v_actor <> 'DIREZIONE' then return jsonb_build_object('ok', false, 'code', 'forbidden'); end if;
    if pr.status = 'PAGATO' then return jsonb_build_object('ok', false, 'code', 'already_paid'); end if;
    update public.scd_comp_periods set status = case when p_action = 'block' then 'BLOCCATO' else 'BOZZA' end,
      note = coalesce(left(nullif(p_data->>'note', ''), 500), note), updated_by = auth.uid(), updated_at = now() where id = pr.id;
  elsif p_action = 'mark_paid' then
    if pr.status <> 'AUTORIZZATO' then return jsonb_build_object('ok', false, 'code', 'not_authorized'); end if;
    if array_length(v_blockers, 1) > 0 then return jsonb_build_object('ok', false, 'code', 'blocked', 'blockers', to_jsonb(v_blockers)); end if;
    if (p_data->>'amount')::numeric is null or (p_data->>'amount')::numeric <= 0 or (p_data->>'paidAt')::date is null then
      return jsonb_build_object('ok', false, 'code', 'missing');
    end if;
    update public.scd_comp_periods set status = 'PAGATO', paid_amount = (p_data->>'amount')::numeric, paid_at = (p_data->>'paidAt')::date,
      paid_method = left(nullif(p_data->>'method', ''), 40), paid_ref = left(nullif(p_data->>'ref', ''), 120),
      paid_document_id = (p_data->>'documentId')::uuid, paid_by = auth.uid(), updated_by = auth.uid(), updated_at = now() where id = pr.id;
  elsif p_action = 'unmark_paid' then
    if v_actor <> 'DIREZIONE' then return jsonb_build_object('ok', false, 'code', 'forbidden'); end if;
    if pr.status <> 'PAGATO' then return jsonb_build_object('ok', false, 'code', 'state'); end if;
    update public.scd_comp_periods set status = 'AUTORIZZATO', paid_amount = null, paid_at = null, paid_method = null, paid_ref = null,
      paid_document_id = null, paid_by = null, updated_by = auth.uid(), updated_at = now() where id = pr.id;
  else
    return jsonb_build_object('ok', false, 'code', 'action');
  end if;
  insert into public.scd_audit_events (organization_id, actor_user_id, action, entity_type, entity_id, payload)
  values (p_organization_id, auth.uid(), 'COMP_PERIOD_' || upper(p_action), 'scd_comp_periods', pr.id,
    jsonb_build_object('agreement', p_agreement_id, 'period', p_period, 'net', v_net, 'actor', v_actor) || coalesce(p_data - 'note', '{}'::jsonb));
  return jsonb_build_object('ok', true, 'net', v_net);
end;
$$;
revoke all on function public.scd_comp_period_action(uuid, uuid, text, text, jsonb) from public, anon;
grant execute on function public.scd_comp_period_action(uuid, uuid, text, text, jsonb) to authenticated;

-- Register a file already uploaded to storage (bucket scd-private, path <org>/comp/...). Direzione and Tesoreria.
create or replace function public.scd_comp_register_document(p_organization_id uuid, p_data jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_id uuid;
  v_path text := p_data->>'path';
begin
  if public.scd_comp_actor(p_organization_id) is null then return jsonb_build_object('ok', false, 'code', 'forbidden'); end if;
  if v_path is null or split_part(v_path, '/', 1) <> p_organization_id::text or split_part(v_path, '/', 2) <> 'comp' then
    return jsonb_build_object('ok', false, 'code', 'path');
  end if;
  insert into public.scd_comp_documents (organization_id, agreement_id, storage_path, file_name, mime_type, size_bytes, kind, uploaded_by)
  values (p_organization_id, (p_data->>'agreementId')::uuid, v_path, left(coalesce(nullif(p_data->>'fileName', ''), 'documento'), 160),
    left(nullif(p_data->>'mime', ''), 80), (p_data->>'size')::bigint, coalesce(nullif(p_data->>'kind', ''), 'ALTRO'), auth.uid())
  returning id into v_id;
  insert into public.scd_audit_events (organization_id, actor_user_id, action, entity_type, entity_id, payload)
  values (p_organization_id, auth.uid(), 'COMP_DOCUMENT_ADD', 'scd_comp_documents', v_id, jsonb_build_object('kind', p_data->>'kind', 'agreement', p_data->>'agreementId'));
  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;
revoke all on function public.scd_comp_register_document(uuid, jsonb) from public, anon;
grant execute on function public.scd_comp_register_document(uuid, jsonb) to authenticated;

-- Storage path of a document the caller may open (null otherwise).
create or replace function public.scd_comp_document_path(p_organization_id uuid, p_document_id uuid)
returns text
language sql
stable
security definer
set search_path to 'public'
as $$
  select d.storage_path from public.scd_comp_documents d
  where d.id = p_document_id and d.organization_id = p_organization_id and public.scd_comp_actor(p_organization_id) is not null;
$$;
revoke all on function public.scd_comp_document_path(uuid, uuid) from public, anon;
grant execute on function public.scd_comp_document_path(uuid, uuid) to authenticated;

-- Private storage for club documents. Compensation files live under <org>/comp/ and are reachable
-- only by Direzione and Tesoreria of that organization.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('scd-private', 'scd-private', false, 15728640, array['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/webp'])
on conflict (id) do nothing;

create or replace function public.scd_storage_comp_allowed(p_name text)
returns boolean
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_org uuid;
begin
  if split_part(p_name, '/', 2) <> 'comp' then return false; end if;
  begin
    v_org := split_part(p_name, '/', 1)::uuid;
  exception when others then
    return false;
  end;
  return public.scd_comp_actor(v_org) is not null;
end;
$$;
revoke all on function public.scd_storage_comp_allowed(text) from public, anon;
grant execute on function public.scd_storage_comp_allowed(text) to authenticated;

create policy scd_private_comp_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'scd-private' and public.scd_storage_comp_allowed(name));
create policy scd_private_comp_select on storage.objects for select to authenticated
  using (bucket_id = 'scd-private' and public.scd_storage_comp_allowed(name));
