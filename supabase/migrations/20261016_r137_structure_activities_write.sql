-- r137: write path of "Attivita in struttura" (G04, /gestionale/struttura), 2026-10-16, chat PC range r130-r149.
-- STAGED: NOT APPLIED. Apply only after Francesco writes "applica r137". Never apply from an agent.
-- Requires: r135 (scd_structure_activities, APPLIED on SCD PULSE ndevtxxijbcnskgysdit 16/10/2026), r79 (scd_proposals,
-- scd_proposal_events: the work queue of /gestionale/coda, UNVERIFIED on the live project until checked at apply
-- time), r35 (scd_has_org_role), r74 (scd_has_position). A guard below stops the migration if r135 or r79 is missing.
--
-- Why (Francesco, DG):
--   * UD-159 (16/10/2026 08:53) "le attivita le decido nel gestionale io e il presidente": activities are decided in
--     the gestionale by the Direttore Generale and the Presidente. Writers = DIRECTION role, or positions presidente /
--     direttore-generale (mirror of apps/superapp/src/lib/structure-activities.ts STRUCTURE_WRITER_ROLES and
--     STRUCTURE_WRITER_POSITIONS, kept equal by structure-write-migration.test.ts). Nobody else writes, never anon.
--   * UD-156 (16/10/2026 06:57) "segreteria sempre informata": EVERY insert, change or cancellation (both sites) puts
--     an in-app notice for the Segreteria in the EXISTING work queue scd_proposals (r79: machine 'G04', area
--     'segreteria', kind 'ALTRO', source 'MANUAL'); the Segreteria reads it in /gestionale/coda (scd_proposal_queue,
--     office = DIRECTION/SECRETARIAT roles and segreteria positions) and closes it with "Conferma". No new
--     notification table, no e-mail, no message to third parties.
--
-- What it adds:
--   1. scd_structure_activity_events: append-only audit of every write (who, when, before/after of the activity
--      fields, reason of a cancellation, the notice it created). RLS on, no policies, no grants; update and delete
--      refused by a trigger. Not readable from the app (audit for the Direzione via SQL editor).
--   2. scd_structure_writer(org): the write gate (sql, internal, not executable by authenticated).
--   3. scd_structure_write_access(org) -> {canWrite}: tells the page whether to show the form. Its absence on the
--      database means r137 is not applied: the page says "Scrittura non ancora attiva" (fail closed).
--   4. scd_structure_activity_create / _update / _cancel: SECURITY DEFINER, fixed search_path, explicit writer check
--      (42501 otherwise), validated input (site, area, kind, title, Rome day and times, role id, notes; no e-mail or
--      phone numbers), one audit row and one Segreteria notice per real change. A change that changes nothing writes
--      nothing. A cancelled activity is never edited again. Rows are never deleted.
--
-- No personal data: the responsible is a role id, never a name; title, notes and the cancellation reason refuse
-- e-mail addresses and phone numbers; no minors' data of any kind. A COLICO notice carries the activity title,
-- site, kind and start (no person). A DERVIO notice is generic ("Struttura Dervio: nuova attività — apri Attività in
-- struttura": no title, day, time, kind or reason) because scd_proposal_queue is also read by office positions that are
-- not Dervio readers in r135 (e.g. tesoreria); the Segreteria reads the details in the page (UD-156).
-- actor/created_by are kept for audit and never returned.
--
-- Engines: TEMPO (the DG and the Presidente decide in one place; the Segreteria learns of every change without a
-- phone call) and PERSONE (volunteers and members see the updated week). Measure: activities written per week from
-- the gestionale (scd_structure_activity_events), share of Segreteria notices closed within 48 hours
-- (scd_proposals machine 'G04', decided_at - created_at), changes done outside the gestionale (SQL editor) trending
-- to zero.
--
-- Additive only, idempotent (create if not exists / create or replace). Nothing existing is changed: r135 table,
-- r135 functions and r79 objects keep their definitions; r137 only inserts rows through its own functions.
--
-- Rollback (notices already in scd_proposals stay as ordinary queue items):
--   begin;
--   drop function if exists public.scd_structure_activity_cancel(uuid, uuid, text);
--   drop function if exists public.scd_structure_activity_update(uuid, uuid, jsonb);
--   drop function if exists public.scd_structure_activity_create(uuid, jsonb);
--   drop function if exists public.scd_structure_notify(public.scd_structure_activities, text, text);
--   drop function if exists public.scd_structure_activity_json(public.scd_structure_activities);
--   drop function if exists public.scd_structure_activity_clean(jsonb);
--   drop function if exists public.scd_structure_write_access(uuid);
--   drop function if exists public.scd_structure_writer(uuid);
--   drop trigger if exists scd_structure_activity_events_append_only on public.scd_structure_activity_events;
--   drop function if exists public.scd_structure_activity_events_block_change();
--   drop table if exists public.scd_structure_activity_events;
--   commit;

begin;

-- ---------------------------------------------------------------- 0. prerequisites (fail closed)
do $$
begin
  if to_regclass('public.scd_structure_activities') is null
     or to_regclass('public.scd_proposals') is null
     or to_regclass('public.scd_proposal_events') is null
     or to_regprocedure('public.scd_has_org_role(uuid, public.scd_role[])') is null
     or to_regprocedure('public.scd_has_position(uuid, text[])') is null then
    raise exception 'r137 prerequisites missing (r135, r79, r35, r74)';
  end if;
end;
$$;

-- ---------------------------------------------------------------- 1. audit (append-only)
create table if not exists public.scd_structure_activity_events (
  id bigint generated always as identity primary key,
  activity_id uuid not null references public.scd_structure_activities(id),
  organization_id uuid not null references public.scd_organizations(id),
  at timestamptz not null default now(),
  actor uuid,
  action text not null check (action in ('CREATE','UPDATE','CANCEL')),
  before jsonb,
  after jsonb not null,
  reason text check (reason is null or char_length(reason) <= 300),
  notice_id uuid references public.scd_proposals(id)
);
create index if not exists scd_structure_activity_events_idx
  on public.scd_structure_activity_events (organization_id, activity_id, at);
alter table public.scd_structure_activity_events enable row level security;
revoke all on table public.scd_structure_activity_events from anon, authenticated;

create or replace function public.scd_structure_activity_events_block_change()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  raise exception 'scd_structure_activity_events is append-only' using errcode = '42501';
end;
$$;
revoke all on function public.scd_structure_activity_events_block_change() from public, anon, authenticated;
create or replace trigger scd_structure_activity_events_append_only
  before update or delete on public.scd_structure_activity_events
  for each row execute function public.scd_structure_activity_events_block_change();

-- ---------------------------------------------------------------- 2. who may write (UD-159)
create or replace function public.scd_structure_writer(p_organization_id uuid)
returns boolean
language sql
stable
set search_path to 'public'
as $$
  select public.scd_has_org_role(p_organization_id, array['DIRECTION']::public.scd_role[])
    or public.scd_has_position(p_organization_id, array['presidente','direttore-generale']);
$$;
revoke all on function public.scd_structure_writer(uuid) from public, anon, authenticated;

-- The page asks this before showing the form (missing function = r137 not applied = no form).
create or replace function public.scd_structure_write_access(p_organization_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
begin
  return jsonb_build_object('canWrite', auth.uid() is not null and public.scd_structure_writer(p_organization_id));
end;
$$;
revoke all on function public.scd_structure_write_access(uuid) from public, anon;
grant execute on function public.scd_structure_write_access(uuid) to authenticated;

-- ---------------------------------------------------------------- 3. input check (mirror of validateStructureDraft)
-- Input: {site, area, kind, title, date 'YYYY-MM-DD', start 'HH:MM', end 'HH:MM', responsibleRole, covered, notes}
-- in Europe/Rome. An end not after the start means the next day (at most 24 hours). Answer: {"code": "..."} on the
-- first problem, otherwise the clean values with startsAt/endsAt as timestamptz text.
create or replace function public.scd_structure_activity_clean(p jsonb)
returns jsonb
language plpgsql
stable
set search_path to 'public'
as $$
declare
  v_title text := btrim(coalesce(p->>'title', ''));
  v_notes text := nullif(btrim(coalesce(p->>'notes', '')), '');
  v_role text := nullif(btrim(coalesce(p->>'responsibleRole', '')), '');
  v_date date;
  v_start time;
  v_end time;
  v_starts timestamptz;
  v_ends timestamptz;
  v_today date := (now() at time zone 'Europe/Rome')::date;
  c_mail constant text := '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}';
  c_phone constant text := '(\+|00)?[0-9]([ ./-]?[0-9]){8,}';
begin
  if p is null or jsonb_typeof(p) <> 'object' then return jsonb_build_object('code', 'input'); end if;
  if coalesce(p->>'site', '') not in ('COLICO','DERVIO') then return jsonb_build_object('code', 'site'); end if;
  if coalesce(p->>'area', '') not in ('CAMPO','SPOGLIATOI','CLUB_HOUSE','PALESTRA') then return jsonb_build_object('code', 'area'); end if;
  if coalesce(p->>'kind', '') not in ('TURNO_VOLONTARIO','APERTURA','CHIUSURA','ATTIVITA_SERALE','EVENTO') then
    return jsonb_build_object('code', 'kind');
  end if;
  if char_length(v_title) not between 2 and 80 then return jsonb_build_object('code', 'title'); end if;
  if v_title ~ c_mail or v_title ~ c_phone then return jsonb_build_object('code', 'contact'); end if;
  if v_notes is not null and char_length(v_notes) > 300 then return jsonb_build_object('code', 'notes'); end if;
  if v_notes is not null and (v_notes ~ c_mail or v_notes ~ c_phone) then return jsonb_build_object('code', 'contact'); end if;
  if v_role is not null and v_role !~ '^[a-z0-9-]{2,60}$' then return jsonb_build_object('code', 'role'); end if;
  if p ? 'covered' and jsonb_typeof(p->'covered') not in ('boolean','null') then return jsonb_build_object('code', 'input'); end if;
  if coalesce(p->>'date', '') !~ '^\d{4}-\d{2}-\d{2}$' then return jsonb_build_object('code', 'date'); end if;
  begin
    v_date := (p->>'date')::date;
  exception when others then
    return jsonb_build_object('code', 'date');
  end;
  if v_date < v_today - 7 or v_date > v_today + 366 then return jsonb_build_object('code', 'date_range'); end if;
  if coalesce(p->>'start', '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or coalesce(p->>'end', '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then
    return jsonb_build_object('code', 'time');
  end if;
  v_start := (p->>'start')::time;
  v_end := (p->>'end')::time;
  if v_end = v_start then return jsonb_build_object('code', 'time'); end if;
  v_starts := (v_date + v_start) at time zone 'Europe/Rome';
  v_ends := (case when v_end > v_start then v_date else v_date + 1 end + v_end) at time zone 'Europe/Rome';
  if v_ends <= v_starts or v_ends > v_starts + interval '24 hours' then return jsonb_build_object('code', 'time'); end if;
  return jsonb_build_object(
    'site', p->>'site',
    'area', p->>'area',
    'kind', p->>'kind',
    'title', v_title,
    'startsAt', v_starts,
    'endsAt', v_ends,
    'responsibleRole', v_role,
    'covered', coalesce((p->>'covered')::boolean, false),
    'notes', v_notes);
end;
$$;
revoke all on function public.scd_structure_activity_clean(jsonb) from public, anon, authenticated;

-- The activity fields kept in the audit (never created_by).
create or replace function public.scd_structure_activity_json(a public.scd_structure_activities)
returns jsonb
language sql
immutable
set search_path to 'public'
as $$
  select jsonb_build_object('site', a.site, 'area', a.area, 'kind', a.kind, 'title', a.title,
    'startsAt', a.starts_at, 'endsAt', a.ends_at, 'responsibleRole', a.responsible_role,
    'covered', a.covered, 'status', a.status, 'notes', a.notes);
$$;
revoke all on function public.scd_structure_activity_json(public.scd_structure_activities) from public, anon, authenticated;

-- ---------------------------------------------------------------- 4. Segreteria notice in the existing queue (r79)
create or replace function public.scd_structure_notify(a public.scd_structure_activities, p_change text, p_reason text)
returns uuid
language plpgsql
volatile
set search_path to 'public'
as $$
declare
  v_id uuid;
  v_site text := case a.site when 'DERVIO' then 'Dervio' else 'Colico' end;
  v_what text := case p_change when 'CREATE' then 'nuova attività' when 'UPDATE' then 'attività modificata' else 'attività annullata' end;
begin
  insert into public.scd_proposals (organization_id, machine, area, kind, title, reason, sensitivity, source_kind,
    source_ref, source_at, target_ref, target_label, suggested, due_at)
  -- DERVIO (UD-156): the queue is also read by office positions that do not read Dervio (e.g. tesoreria), so a
  -- Dervio notice is generic: no title, day, time, kind or reason; the Segreteria opens Attivita in struttura.
  values (a.organization_id, 'G04', 'segreteria', 'ALTRO',
    case when a.site = 'DERVIO'
      then 'Struttura Dervio: ' || v_what || ' — apri Attività in struttura'
      else left('Struttura ' || v_site || ': ' || v_what || ' «' || a.title || '» '
        || to_char(a.starts_at at time zone 'Europe/Rome', 'DD/MM HH24:MI'), 200) end,
    left('Decisa nel gestionale da Direzione, Presidente o Direttore generale (Attività in struttura). '
      || 'Avviso automatico alla Segreteria: basta prenderne visione.'
      || case when a.site = 'DERVIO' then '' else coalesce(' Motivo: ' || nullif(btrim(p_reason), ''), '') end, 300),
    'INTERNO', 'MANUAL',
    'structure:' || a.id::text || ':' || lower(p_change) || ':' || gen_random_uuid()::text,
    now(),
    a.id::text,
    'Attività in struttura · ' || v_site,
    case when a.site = 'DERVIO'
      then jsonb_build_object('action', 'structure_activity_notice', 'change', p_change, 'activityId', a.id, 'site', a.site)
      else jsonb_build_object('action', 'structure_activity_notice', 'change', p_change, 'activityId', a.id,
        'site', a.site, 'kind', a.kind, 'startsAt', a.starts_at) end,
    now() + interval '2 days')
  returning id into v_id;
  insert into public.scd_proposal_events (proposal_id, actor, action, note)
  values (v_id, auth.uid(), 'CREATED', 'Avviso automatico da Attività in struttura');
  return v_id;
end;
$$;
revoke all on function public.scd_structure_notify(public.scd_structure_activities, text, text) from public, anon, authenticated;

-- ---------------------------------------------------------------- 5. write functions (staff writers only)
create or replace function public.scd_structure_activity_create(p_organization_id uuid, p_activity jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v jsonb;
  v_row public.scd_structure_activities;
  v_notice uuid;
begin
  if auth.uid() is null or not public.scd_structure_writer(p_organization_id) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  v := public.scd_structure_activity_clean(p_activity);
  if v ? 'code' then return jsonb_build_object('ok', false, 'code', v->>'code'); end if;
  insert into public.scd_structure_activities (organization_id, site, area, kind, title, starts_at, ends_at,
    responsible_role, covered, status, notes, created_by)
  values (p_organization_id, v->>'site', v->>'area', v->>'kind', v->>'title', (v->>'startsAt')::timestamptz,
    (v->>'endsAt')::timestamptz, v->>'responsibleRole', (v->>'covered')::boolean, 'PREVISTA', v->>'notes', auth.uid())
  returning * into v_row;
  v_notice := public.scd_structure_notify(v_row, 'CREATE', null);
  insert into public.scd_structure_activity_events (activity_id, organization_id, actor, action, before, after, notice_id)
  values (v_row.id, p_organization_id, auth.uid(), 'CREATE', null, public.scd_structure_activity_json(v_row), v_notice);
  return jsonb_build_object('ok', true, 'id', v_row.id, 'noticed', true);
end;
$$;
revoke all on function public.scd_structure_activity_create(uuid, jsonb) from public, anon;
grant execute on function public.scd_structure_activity_create(uuid, jsonb) to authenticated;

create or replace function public.scd_structure_activity_update(p_organization_id uuid, p_id uuid, p_activity jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v jsonb;
  v_old public.scd_structure_activities;
  v_row public.scd_structure_activities;
  v_notice uuid;
begin
  if auth.uid() is null or not public.scd_structure_writer(p_organization_id) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select * into v_old from public.scd_structure_activities
    where id = p_id and organization_id = p_organization_id for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  if v_old.status = 'ANNULLATA' then return jsonb_build_object('ok', false, 'code', 'cancelled'); end if;
  v := public.scd_structure_activity_clean(p_activity);
  if v ? 'code' then return jsonb_build_object('ok', false, 'code', v->>'code'); end if;
  if v_old.site = v->>'site' and v_old.area = v->>'area' and v_old.kind = v->>'kind' and v_old.title = v->>'title'
     and v_old.starts_at = (v->>'startsAt')::timestamptz and v_old.ends_at = (v->>'endsAt')::timestamptz
     and v_old.responsible_role is not distinct from v->>'responsibleRole'
     and v_old.covered = (v->>'covered')::boolean and v_old.notes is not distinct from v->>'notes' then
    return jsonb_build_object('ok', true, 'id', p_id, 'unchanged', true, 'noticed', false);
  end if;
  update public.scd_structure_activities set
    site = v->>'site', area = v->>'area', kind = v->>'kind', title = v->>'title',
    starts_at = (v->>'startsAt')::timestamptz, ends_at = (v->>'endsAt')::timestamptz,
    responsible_role = v->>'responsibleRole', covered = (v->>'covered')::boolean, notes = v->>'notes',
    updated_at = now()
  where id = p_id
  returning * into v_row;
  v_notice := public.scd_structure_notify(v_row, 'UPDATE', null);
  insert into public.scd_structure_activity_events (activity_id, organization_id, actor, action, before, after, notice_id)
  values (p_id, p_organization_id, auth.uid(), 'UPDATE', public.scd_structure_activity_json(v_old),
    public.scd_structure_activity_json(v_row), v_notice);
  return jsonb_build_object('ok', true, 'id', p_id, 'noticed', true);
end;
$$;
revoke all on function public.scd_structure_activity_update(uuid, uuid, jsonb) from public, anon;
grant execute on function public.scd_structure_activity_update(uuid, uuid, jsonb) to authenticated;

create or replace function public.scd_structure_activity_cancel(p_organization_id uuid, p_id uuid, p_reason text default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_old public.scd_structure_activities;
  v_row public.scd_structure_activities;
  v_notice uuid;
begin
  if auth.uid() is null or not public.scd_structure_writer(p_organization_id) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if v_reason is not null and char_length(v_reason) > 300 then return jsonb_build_object('ok', false, 'code', 'reason'); end if;
  if v_reason is not null and (v_reason ~ '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}' or v_reason ~ '(\+|00)?[0-9]([ ./-]?[0-9]){8,}') then
    return jsonb_build_object('ok', false, 'code', 'contact');
  end if;
  select * into v_old from public.scd_structure_activities
    where id = p_id and organization_id = p_organization_id for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  if v_old.status = 'ANNULLATA' then return jsonb_build_object('ok', false, 'code', 'cancelled'); end if;
  update public.scd_structure_activities set status = 'ANNULLATA', updated_at = now()
  where id = p_id
  returning * into v_row;
  v_notice := public.scd_structure_notify(v_row, 'CANCEL', v_reason);
  insert into public.scd_structure_activity_events (activity_id, organization_id, actor, action, before, after, reason, notice_id)
  values (p_id, p_organization_id, auth.uid(), 'CANCEL', public.scd_structure_activity_json(v_old),
    public.scd_structure_activity_json(v_row), v_reason, v_notice);
  return jsonb_build_object('ok', true, 'id', p_id, 'noticed', true);
end;
$$;
revoke all on function public.scd_structure_activity_cancel(uuid, uuid, text) from public, anon;
grant execute on function public.scd_structure_activity_cancel(uuid, uuid, text) to authenticated;

commit;
