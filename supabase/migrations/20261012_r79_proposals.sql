-- r79: T5 Proposte e conferme (UD-083, UD-084, SCD_MACCHINE_v1 §9 T5) — 2026-10-12.
-- One work queue for every machine. Automations (T6 Posta, sheet copies, file intake) PROPOSE items found in
-- mail and files; a person CONFIRMS. Nothing is ever applied automatically: accepting a proposal only records
-- the decision; each machine applies it in its own page. Model: Linear Triage (accept / decline with reason /
-- duplicate / snooze / needs info), Zendesk-like states, decision log append-only.
-- Privacy: the queue stores a short title, the source reference (message id + link) and the machine target.
-- It never stores message bodies, ISEE values, fiscal codes, IBAN or health data. Items flagged RISERVATO
-- (e.g. Fondo Solidale) are visible only to Direzione and Tesoreria positions.

create table if not exists public.scd_proposals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id),
  machine text not null,                          -- e.g. 'M3' (quote), 'M2', 'M11'
  area text not null,                             -- work area that handles it, e.g. 'quote', 'segreteria'
  kind text not null check (kind in ('RICEVUTA_PAGAMENTO','RITIRO','FONDO','FATTURA','RICHIESTA','DOCUMENTO','ALTRO')),
  title text not null check (char_length(title) between 1 and 200),
  reason text check (reason is null or char_length(reason) <= 300),   -- why the machine proposes it
  sensitivity text not null default 'INTERNO' check (sensitivity in ('INTERNO','RISERVATO')),
  source_kind text not null check (source_kind in ('MAIL','FILE','SHEET','MANUAL')),
  source_ref text not null,                       -- idempotency key, e.g. 'gmail:<message id>'
  source_url text,
  source_at timestamptz,
  source_mailbox text,
  target_ref text,                                -- e.g. fee position code
  target_label text,
  suggested jsonb not null default '{}'::jsonb,   -- e.g. {"action":"record_receipt"}
  confidence numeric(3,2) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  status text not null default 'NEW'
    check (status in ('NEW','IN_PROGRESS','NEEDS_INFO','SNOOZED','ACCEPTED','REJECTED','DUPLICATE')),
  assignee uuid references auth.users(id),
  due_at timestamptz,
  snooze_until timestamptz,
  duplicate_of uuid references public.scd_proposals(id),
  decided_by uuid references auth.users(id),
  decided_at timestamptz,
  decision_note text check (decision_note is null or char_length(decision_note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, source_ref)
);
create index if not exists scd_proposals_open_idx on public.scd_proposals (organization_id, status, due_at);
alter table public.scd_proposals enable row level security;

create table if not exists public.scd_proposal_events (
  id bigint generated always as identity primary key,
  proposal_id uuid not null references public.scd_proposals(id),
  at timestamptz not null default now(),
  actor uuid references auth.users(id),
  action text not null,
  note text
);
create index if not exists scd_proposal_events_idx on public.scd_proposal_events (proposal_id, at);
alter table public.scd_proposal_events enable row level security;

-- Who may read RISERVATO items: Direzione and Tesoreria positions.
create or replace function public.scd_proposal_reserved_reader(p_organization_id uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select public.scd_has_org_role(p_organization_id, array['DIRECTION']::public.scd_role[])
    or public.scd_has_position(p_organization_id, array['tesoreria','direzione','presidente','direttore-generale']);
$$;
revoke all on function public.scd_proposal_reserved_reader(uuid) from public, anon;

-- Intake (automations only, service role). Idempotent on source_ref: an item already in the queue is never
-- touched again. For RICEVUTA/RITIRO/FONDO on machine M3 the function tries to link the fee position whose
-- linked person's first and last name both appear in p_items[].hint (the hint is NOT stored).
create or replace function public.scd_proposal_ingest(p_organization_id uuid, p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_item jsonb;
  v_new int := 0;
  v_skip int := 0;
  v_linked int := 0;
  v_target text;
  v_label text;
  v_id uuid;
  v_hint text;
begin
  for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
    if coalesce(v_item->>'sourceRef', '') = '' or coalesce(v_item->>'title', '') = '' then
      v_skip := v_skip + 1;
      continue;
    end if;
    v_target := nullif(v_item->>'targetRef', '');
    v_label := nullif(v_item->>'targetLabel', '');
    v_hint := lower(coalesce(v_item->>'hint', ''));
    if v_target is null and v_hint <> '' and coalesce(v_item->>'machine', '') = 'M3' then
      select min(f.source_record_id), min(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')))
        into v_target, v_label
      from public.scd_fee_positions f
      join public.scd_people p on p.id = f.person_id
      where f.organization_id = p_organization_id and f.active
        and length(trim(coalesce(p.first_name, ''))) >= 2 and length(trim(coalesce(p.last_name, ''))) >= 2
        and position(lower(trim(p.last_name)) in v_hint) > 0
        and position(lower(trim(p.first_name)) in v_hint) > 0
      having count(*) = 1;
    end if;
    insert into public.scd_proposals (organization_id, machine, area, kind, title, reason, sensitivity, source_kind,
      source_ref, source_url, source_at, source_mailbox, target_ref, target_label, suggested, confidence, due_at)
    values (p_organization_id,
      coalesce(nullif(v_item->>'machine', ''), 'M16'),
      coalesce(nullif(v_item->>'area', ''), 'segreteria'),
      coalesce(nullif(v_item->>'kind', ''), 'ALTRO'),
      left(v_item->>'title', 200),
      left(nullif(v_item->>'reason', ''), 300),
      case when v_item->>'sensitivity' = 'RISERVATO' then 'RISERVATO' else 'INTERNO' end,
      coalesce(nullif(v_item->>'sourceKind', ''), 'MAIL'),
      v_item->>'sourceRef',
      nullif(v_item->>'sourceUrl', ''),
      nullif(v_item->>'sourceAt', '')::timestamptz,
      nullif(v_item->>'mailbox', ''),
      v_target, v_label,
      coalesce(v_item->'suggested', '{}'::jsonb),
      nullif(v_item->>'confidence', '')::numeric,
      coalesce(nullif(v_item->>'dueAt', '')::timestamptz, now() + interval '3 days'))
    on conflict (organization_id, source_ref) do nothing
    returning id into v_id;
    if v_id is null then
      v_skip := v_skip + 1;
    else
      v_new := v_new + 1;
      if v_target is not null then v_linked := v_linked + 1; end if;
      insert into public.scd_proposal_events (proposal_id, action, note) values (v_id, 'CREATED', left(v_item->>'reason', 300));
    end if;
    v_id := null;
  end loop;
  return jsonb_build_object('new', v_new, 'skipped', v_skip, 'linked', v_linked);
end;
$$;
revoke all on function public.scd_proposal_ingest(uuid, jsonb) from public, anon, authenticated;

-- Office queue: open items first (most urgent first), then the last 50 decisions. Null for non-office.
create or replace function public.scd_proposal_queue(p_organization_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_reserved boolean;
begin
  if not public.scd_fee_office(p_organization_id) then
    return null;
  end if;
  v_reserved := public.scd_proposal_reserved_reader(p_organization_id);
  return jsonb_build_object(
    'me', auth.uid(),
    'canReadReserved', v_reserved,
    'items', coalesce((select jsonb_agg(row_to_json(x)::jsonb order by x.open desc, x.due_at nulls last, x.created_at)
      from (
        select q.id, q.machine, q.area, q.kind, q.title, q.reason, q.sensitivity, q.source_kind as "sourceKind",
          q.source_url as "sourceUrl", q.source_at as "sourceAt", q.source_mailbox as "mailbox",
          q.target_ref as "targetRef", q.target_label as "targetLabel", q.suggested, q.confidence, q.status,
          q.assignee = auth.uid() as "mine", q.assignee is not null as "assigned", q.due_at, q.snooze_until as "snoozeUntil",
          q.duplicate_of as "duplicateOf", q.decided_at as "decidedAt", q.decision_note as "decisionNote", q.created_at,
          q.status in ('NEW','IN_PROGRESS','NEEDS_INFO') or (q.status = 'SNOOZED' and q.snooze_until <= now()) as open,
          fp.status_group as "targetState"
        from public.scd_proposals q
        left join public.scd_fee_positions fp
          on q.machine = 'M3' and fp.organization_id = q.organization_id and fp.source_record_id = q.target_ref and fp.active
        where q.organization_id = p_organization_id
          and (q.sensitivity <> 'RISERVATO' or v_reserved)
          and (q.status in ('NEW','IN_PROGRESS','NEEDS_INFO','SNOOZED')
               or q.id in (select id from public.scd_proposals d where d.organization_id = p_organization_id
                             and d.status in ('ACCEPTED','REJECTED','DUPLICATE') order by d.decided_at desc nulls last limit 50))
      ) x), '[]'::jsonb)
  );
end;
$$;
revoke all on function public.scd_proposal_queue(uuid) from public, anon;
grant execute on function public.scd_proposal_queue(uuid) to authenticated;

-- Decisions (office). take | release | accept | reject (note required) | duplicate (target required) |
-- snooze (until required) | needs_info (note required) | reopen. Every action is logged.
create or replace function public.scd_proposal_decide(p_organization_id uuid, p_id uuid, p_action text,
  p_note text default null, p_duplicate_of uuid default null, p_snooze_until timestamptz default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_row public.scd_proposals;
  v_note text := nullif(trim(coalesce(p_note, '')), '');
begin
  if auth.uid() is null or not public.scd_fee_office(p_organization_id) then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  select * into v_row from public.scd_proposals where id = p_id and organization_id = p_organization_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;
  if v_row.sensitivity = 'RISERVATO' and not public.scd_proposal_reserved_reader(p_organization_id) then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  if p_action not in ('take','release','accept','reject','duplicate','snooze','needs_info','reopen') then
    return jsonb_build_object('ok', false, 'code', 'action');
  end if;
  if p_action in ('reject','needs_info') and v_note is null then
    return jsonb_build_object('ok', false, 'code', 'note_required');
  end if;
  if p_action = 'duplicate' and (p_duplicate_of is null or p_duplicate_of = p_id
      or not exists (select 1 from public.scd_proposals where id = p_duplicate_of and organization_id = p_organization_id)) then
    return jsonb_build_object('ok', false, 'code', 'duplicate_target');
  end if;
  if p_action = 'snooze' and (p_snooze_until is null or p_snooze_until <= now()) then
    return jsonb_build_object('ok', false, 'code', 'snooze_date');
  end if;
  if p_action <> 'reopen' and v_row.status in ('ACCEPTED','REJECTED','DUPLICATE') then
    return jsonb_build_object('ok', false, 'code', 'closed');
  end if;

  update public.scd_proposals set
    status = case p_action
      when 'take' then 'IN_PROGRESS' when 'release' then 'NEW' when 'accept' then 'ACCEPTED'
      when 'reject' then 'REJECTED' when 'duplicate' then 'DUPLICATE' when 'snooze' then 'SNOOZED'
      when 'needs_info' then 'NEEDS_INFO' when 'reopen' then 'NEW' end,
    assignee = case when p_action = 'take' then auth.uid() when p_action in ('release','reopen') then null else coalesce(assignee, auth.uid()) end,
    snooze_until = case when p_action = 'snooze' then p_snooze_until else null end,
    duplicate_of = case when p_action = 'duplicate' then p_duplicate_of when p_action = 'reopen' then null else duplicate_of end,
    decided_by = case when p_action in ('accept','reject','duplicate') then auth.uid() when p_action = 'reopen' then null else decided_by end,
    decided_at = case when p_action in ('accept','reject','duplicate') then now() when p_action = 'reopen' then null else decided_at end,
    decision_note = case when p_action in ('accept','reject','duplicate','needs_info') then v_note when p_action = 'reopen' then null else decision_note end,
    updated_at = now()
  where id = p_id;
  insert into public.scd_proposal_events (proposal_id, actor, action, note) values (p_id, auth.uid(), upper(p_action), v_note);
  return jsonb_build_object('ok', true, 'id', p_id);
end;
$$;
revoke all on function public.scd_proposal_decide(uuid, uuid, text, text, uuid, timestamptz) from public, anon;
grant execute on function public.scd_proposal_decide(uuid, uuid, text, text, uuid, timestamptz) to authenticated;
