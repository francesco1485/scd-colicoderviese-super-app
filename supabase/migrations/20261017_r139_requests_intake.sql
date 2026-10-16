-- r139: "Vetrina richieste" phase F1 — the r133 request catalogue opens to external requests (2026-10-16, chat PC
-- range r130-r149, next after r138).
-- STAGED: NOT APPLIED. Apply only after Francesco writes "applica r139". Never apply from an agent.
-- Target: SCD PULSE (ndevtxxijbcnskgysdit). Never on dfnwzwutvnwiitiffwvr.
-- Requires: r33 (scd_organizations), r35 (scd_has_org_role), r74 (scd_has_position), r133 (scd_requests,
-- scd_request_events, scd_request_redact, scd_request_json, scd_request_viewer). r133 objects are present on SCD PULSE
-- (design PROGETTO_VETRINA_RICHIESTE 16/10/2026: tables and functions live, 0 rows, kind check AMICHEVOLE only) but
-- r133 has no row in supabase_migrations.schema_migrations. VERIFIED 16/10/2026 ~16:30 (pg_get_functiondef, read-only):
-- the live scd_requests_board, scd_request_form and scd_request_notices are identical to the r133 file, so section 10
-- recreates them from that text plus `kind = 'AMICHEVOLE'`. scd_requests_to_confirm is NOT recreated (its live body was
-- not read): it already excludes every intake row, because it keeps only rows whose team_key has confirmers and intake
-- rows have team_key null. Before applying, re-check the checks this file drops (read-only):
--   select conname, pg_get_constraintdef(oid) from pg_constraint where conrelid in
--     ('public.scd_requests'::regclass, 'public.scd_request_events'::regclass) and contype = 'c';
--   select proname, md5(prosrc) from pg_proc where proname in ('scd_requests_board','scd_request_form','scd_request_notices');
-- A guard below stops the migration when a prerequisite is missing.
--
-- Why (Francesco, DG, 16/10/2026):
--   * 14:57: Tally links and forms in the gestionali for tournaments, visits, sponsors, companies (convenzioni /
--     partnership di vendita), field rental, other; everything catalogued in ONE place; after acceptance internal
--     management, traced payment, Segreteria informed.
--   * 15:44 «Esterni Tally, soci app»: external parties (societa, aziende, scuole, privati adulti) use ONE Tally form
--     "Richieste alla SCD" with a branch per kind and a hidden field `tipo`; members and families ask from their
--     in-app area (no minors' names through Tally).
--   * 15:44 «Li crea la Tesoreria»: a Tesoreria person creates the payment link of each ACCEPTED request (no
--     automatic SumUp links); the link is recorded on the request and reconciled later.
--   * 13:31 «DG conferma tutto»: the Direttore Generale decides every kind (with the Presidente and the Direzione).
--
-- What it adds (mirror: apps/superapp/src/lib/intake-kinds.ts, kept equal by intake-migration.test.ts):
--   1. scd_requests.kind: AMICHEVOLE + the F1 external kinds ISCRIZIONE_TORNEO, SPONSOR, CONVENZIONE, AFFITTO_CAMPO,
--      VISITA_CENTRO, ALTRO. channel + TALLY, VETRINA. status + RICEVUTA, IN_VALUTAZIONE, ACCETTATA, IN_GESTIONE,
--      CHIUSA, and a kind/status constraint: friendlies keep the r133 states only, the new kinds the intake states
--      only (RICEVUTA -> IN_VALUTAZIONE -> ACCETTATA | RIFIUTATA -> IN_GESTIONE -> CHIUSA, ANNULLATA). The two state
--      sets are disjoint, so the r133 write functions (update/send/decide/cancel/mark_copied/form status) can never
--      move an intake row (they all start from BOZZA/DA_CONFERMARE/CONFERMATA).
--   2. new nullable columns on scd_requests: area, site, public_code (receipt "V-26-0001"), requester_kind,
--      source_ref (idempotency "tally:<submission>"), owner_position, received/taken/decided/accepted/closed times,
--      decided_by, and the payment fields of the Tesoreria (payment_status, payment_amount_cents, payment_link,
--      payment_set_by, payment_set_at). Existing rows are not touched.
--   3. scd_request_events.action + RICEVUTA, IN_VALUTAZIONE, ACCETTATA, IN_GESTIONE, CHIUSA, ASSEGNATA,
--      RICLASSIFICATA, PAGAMENTO, CONTATTO_LETTO, CONTATTI_CANCELLATI (every r133 value kept). Still append-only.
--   4. scd_request_contacts: the external contact (organisation, adult referent, role, e-mail, phone, privacy
--      consent) in a SEPARATE table, RLS on, no policies, no grants. Contacts have an expiry date (purge_after,
--      PROPOSED periods, not decided by Francesco: 12 months from receipt, 6 months after RIFIUTATA/ANNULLATA,
--      12 months after CHIUSA); scd_request_contacts_purge() deletes the expired rows but runs only when a scheduled
--      job (service role, NOT created yet) calls it. Reading a contact is logged (CONTATTO_LETTO).
--   5. scd_request_ingest(org, payload): ONLY the service role (future Make scenario "Tally richieste"): strict
--      whitelist per kind, adult and privacy consent required, contacts (also obfuscated e-mails and split phone
--      numbers, scd_intake_redact) and health words removed from free text, idempotent on source_ref (also under
--      concurrent calls), hourly cap (PROPOSED: 60/hour); creates RICEVUTA + contact + in-app notice. Never sends
--      anything.
--   6. scd_intake_kinds() (probe, harmless), scd_intake_board(org, filters), scd_intake_decide(org, id, action, note,
--      value), scd_intake_contact(org, id), scd_intake_payment_set(org, id, payload), scd_intake_notices(org): each
--      role sees only the kinds it handles (chi-fa-cosa positions, UD-156 Dervio rule), the Direzione sees all;
--      the payment fields are written ONLY by the position tesoreria and only after ACCETTATA.
--   7. r133 reads scd_requests_board, scd_request_form and scd_request_notices: same text plus `kind = 'AMICHEVOLE'`
--      (the friendlies page never shows external requests). MODIFIES existing functions: review.
--
-- Deciders. DECIDED by Francesco: «DG conferma tutto» (13:31) and the payment link of an accepted request is created
-- by a Tesoreria person («Li crea la Tesoreria», 15:44). Everything else below is PROPOSED (mirror of the
-- lib/chi-fa-cosa.ts topics, design question 5 still open: who decides field rentals and visits, and whether the DG
-- alone decides below a threshold); the positions, the per-kind payment-link yes/no, the 60/hour cap and the contact
-- retention periods wait for Francesco's confirmation. Always deciding: the Direzione (role DIRECTION), the
-- Presidente and the Direttore Generale; per kind (PROPOSED):
--   ISCRIZIONE_TORNEO (tornei): decide responsabile-tornei, prepare segreteria, inform coordinatore, tesoreria;
--   SPONSOR, CONVENZIONE (sponsor): decide DG + Presidente + Consiglio (direzione), inform tesoreria;
--   AFFITTO_CAMPO (impianti): decide board, prepare responsabile-campi, inform tesoreria + Colico structure;
--   VISITA_CENTRO (impianti): decide board, prepare segreteria, inform responsabile-campi + Colico structure;
--   ALTRO (comunicazioni): decide segreteria (smista, may reclassify), DG.
--   Dervio (UD-156): DERVIO_ALWAYS informed; responsabile-campi, Club House and structure positions never see it.
--
-- Data: no minors, no health. External requests carry only an adult referent and an organisation (contacts table,
-- purged); payload = whitelisted fields; free text <= 500 chars without phones, e-mails or health words. Amounts
-- never appear in notices. RLS on every table with NO policies; nothing executable by anon.
--
-- Engines: TEMPO (one catalogue instead of mails and phone calls; the right deciders told at once) and SOLDI
-- (tournament fees and field rentals tracked from acceptance to payment). Measure: requests per month and per kind
-- (scd_requests.received_at), median hours RICEVUTA -> decision (decided_at - received_at), share RIFIUTATA,
-- accepted requests with payment_status RISCONTRATO within 7 days of LINK_INVIATO (scd_request_events PAGAMENTO).
--
-- Idempotent (create if not exists / create or replace / constraints dropped and recreated by column).
--
-- Rollback (only on Francesco's explicit order; intake rows and contacts are lost):
--   begin;
--   drop function if exists public.scd_intake_notices(uuid);
--   drop function if exists public.scd_intake_payment_set(uuid, uuid, jsonb);
--   drop function if exists public.scd_intake_contact(uuid, uuid);
--   drop function if exists public.scd_intake_decide(uuid, uuid, text, text, text);
--   drop function if exists public.scd_intake_board(uuid, jsonb);
--   drop function if exists public.scd_intake_row_json(public.scd_requests, boolean, boolean);
--   drop function if exists public.scd_intake_kinds();
--   drop function if exists public.scd_request_contacts_purge();
--   drop function if exists public.scd_request_ingest(uuid, jsonb);
--   drop function if exists public.scd_request_clean_intake(text, jsonb);
--   drop function if exists public.scd_request_contact_clean(text, jsonb);
--   drop function if exists public.scd_request_intake_text(text);
--   drop function if exists public.scd_intake_redact(text);
--   drop function if exists public.scd_request_notify(text, text, text, text);
--   drop function if exists public.scd_request_can(uuid, text, text, text, text);
--   drop function if exists public.scd_request_kind_positions(text, text, text);
--   drop function if exists public.scd_request_kind_rules(text);
--   drop table if exists public.scd_request_contacts;
--   delete from public.scd_request_events where request_id in (select id from public.scd_requests where kind <> 'AMICHEVOLE');
--     (the append-only trigger must be disabled for this single statement)
--   delete from public.scd_requests where kind <> 'AMICHEVOLE';
--   then re-run the r133 checks (kind, channel, status, action) and the r133 scd_requests_board, scd_request_form,
--   scd_request_notices; the new columns may stay (all nullable).
--   commit;

begin;

-- ---------------------------------------------------------------- 0. prerequisites (fail closed)
do $$
begin
  if to_regclass('public.scd_requests') is null
     or to_regclass('public.scd_request_events') is null
     or to_regclass('public.scd_organizations') is null
     or to_regprocedure('public.scd_has_org_role(uuid, public.scd_role[])') is null
     or to_regprocedure('public.scd_has_position(uuid, text[])') is null
     or to_regprocedure('public.scd_request_redact(text)') is null
     or to_regprocedure('public.scd_request_json(public.scd_requests)') is null
     or to_regprocedure('public.scd_request_viewer(uuid)') is null then
    raise exception 'r139 prerequisites missing (r33, r35, r74, r133)';
  end if;
end;
$$;

-- ---------------------------------------------------------------- 1. new columns (nullable, nothing existing changes)
alter table public.scd_requests add column if not exists area text;
alter table public.scd_requests add column if not exists site text;
alter table public.scd_requests add column if not exists public_code text;
alter table public.scd_requests add column if not exists requester_kind text;
alter table public.scd_requests add column if not exists source_ref text;
alter table public.scd_requests add column if not exists owner_position text;
alter table public.scd_requests add column if not exists received_at timestamptz;
alter table public.scd_requests add column if not exists taken_at timestamptz;
alter table public.scd_requests add column if not exists decided_at timestamptz;
alter table public.scd_requests add column if not exists decided_by uuid;
alter table public.scd_requests add column if not exists accepted_at timestamptz;
alter table public.scd_requests add column if not exists closed_at timestamptz;
alter table public.scd_requests add column if not exists payment_status text;
alter table public.scd_requests add column if not exists payment_amount_cents integer;
alter table public.scd_requests add column if not exists payment_link text;
alter table public.scd_requests add column if not exists payment_set_by uuid;
alter table public.scd_requests add column if not exists payment_set_at timestamptz;

-- ---------------------------------------------------------------- 2. vocabularies: drop the single-column checks of
-- kind, channel, status (scd_requests) and action (scd_request_events), whatever their live names, then recreate them
-- with every r133 value kept. The r133 "CONFERMATA needs an event" check (several columns) is not touched.
do $$
declare
  c record;
begin
  for c in
    select con.conname, rel.relname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace ns on ns.oid = rel.relnamespace
    join pg_attribute att on att.attrelid = con.conrelid and att.attnum = con.conkey[1]
    where ns.nspname = 'public' and con.contype = 'c' and cardinality(con.conkey) = 1
      and ((rel.relname = 'scd_requests' and att.attname in ('kind','channel','status'))
        or (rel.relname = 'scd_request_events' and att.attname = 'action'))
  loop
    execute format('alter table public.%I drop constraint %I', c.relname, c.conname);
  end loop;
end;
$$;

alter table public.scd_requests add constraint scd_requests_kind_check check (kind in (
  'AMICHEVOLE','ISCRIZIONE_TORNEO','SPONSOR','CONVENZIONE','AFFITTO_CAMPO','VISITA_CENTRO','ALTRO'));
alter table public.scd_requests add constraint scd_requests_channel_check check (channel in (
  'WHATSAPP','EMAIL','APP','SEGRETERIA','TALLY','VETRINA'));
alter table public.scd_requests add constraint scd_requests_status_check check (status in (
  'BOZZA','DA_CONFERMARE','CONFERMATA','RIFIUTATA','SCADUTA','ANNULLATA',
  'RICEVUTA','IN_VALUTAZIONE','ACCETTATA','IN_GESTIONE','CHIUSA'));
alter table public.scd_request_events add constraint scd_request_events_action_check check (action in (
  'CREATA','MODIFICATA','INVIATA','CONFERMATA','RIFIUTATA','SCADUTA','ANNULLATA','MODULO','CALENDARIO',
  'RICEVUTA','IN_VALUTAZIONE','ACCETTATA','IN_GESTIONE','CHIUSA','ASSEGNATA','RICLASSIFICATA','PAGAMENTO',
  'CONTATTO_LETTO','CONTATTI_CANCELLATI'));

alter table public.scd_requests drop constraint if exists scd_requests_kind_status_check;
alter table public.scd_requests add constraint scd_requests_kind_status_check check (
  (kind = 'AMICHEVOLE' and status in ('BOZZA','DA_CONFERMARE','CONFERMATA','RIFIUTATA','SCADUTA','ANNULLATA'))
  or (kind <> 'AMICHEVOLE' and status in ('RICEVUTA','IN_VALUTAZIONE','ACCETTATA','RIFIUTATA','IN_GESTIONE','CHIUSA','ANNULLATA')));
alter table public.scd_requests drop constraint if exists scd_requests_intake_fields_check;
alter table public.scd_requests add constraint scd_requests_intake_fields_check check (
  (area is null or area in ('tornei','crm','impianti-campi','segreteria'))
  and (site is null or site in ('COLICO','DERVIO'))
  and (public_code is null or public_code ~ '^V-[0-9]{2}-[0-9]{4,6}$')
  and (requester_kind is null or requester_kind in ('ESTERNO','SOCIO','STAFF'))
  and (source_ref is null or source_ref ~ '^tally:[A-Za-z0-9_-]{3,64}$')
  and (owner_position is null or owner_position ~ '^[a-z][a-z-]{1,59}$')
  and (payment_status is null or payment_status in ('NON_DOVUTO','DA_PAGARE','LINK_INVIATO','PAGATO_DA_RISCONTRARE','RISCONTRATO','ANNULLATO'))
  and (payment_amount_cents is null or payment_amount_cents between 0 and 10000000)
  and (payment_link is null or (payment_link ~ '^https://[A-Za-z0-9.-]+\.[A-Za-z]{2,}(/[^[:space:]]*)?$' and char_length(payment_link) <= 300))
  -- payment only after acceptance (Francesco 15:44)
  and (payment_status is null or status in ('ACCETTATA','IN_GESTIONE','CHIUSA')));
create unique index if not exists scd_requests_public_code_uidx on public.scd_requests (public_code) where public_code is not null;
create unique index if not exists scd_requests_source_ref_uidx on public.scd_requests (organization_id, source_ref) where source_ref is not null;
create index if not exists scd_requests_intake_idx on public.scd_requests (organization_id, kind, status, received_at desc) where kind <> 'AMICHEVOLE';
create sequence if not exists public.scd_request_public_code_seq;
revoke all on sequence public.scd_request_public_code_seq from public, anon, authenticated;

-- ---------------------------------------------------------------- 3. external contacts (separate, purged)
create table if not exists public.scd_request_contacts (
  request_id uuid primary key references public.scd_requests(id) on delete cascade,
  organization_id uuid not null references public.scd_organizations(id),
  org_name text check (org_name is null or char_length(org_name) between 2 and 120),
  contact_name text not null check (char_length(contact_name) between 2 and 80),
  contact_role text check (contact_role is null or char_length(contact_role) <= 60),
  email text check (email is null or (char_length(email) <= 120 and email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')),
  phone text check (phone is null or phone ~ '^\+?[0-9]{6,15}$'),
  consent_privacy_at timestamptz not null,
  adult_declared boolean not null check (adult_declared),
  purge_after timestamptz not null,
  created_at timestamptz not null default now(),
  check (email is not null or phone is not null)
);
create index if not exists scd_request_contacts_purge_idx on public.scd_request_contacts (purge_after);
alter table public.scd_request_contacts enable row level security;
revoke all on table public.scd_request_contacts from anon, authenticated;

-- ---------------------------------------------------------------- 4. rules per kind (mirror of lib/intake-kinds.ts)
-- PROPOSED, to be confirmed by Francesco (design question 5 open; only «DG conferma tutto» and «Li crea la Tesoreria»
-- are decided): area, chi-fa-cosa topic, positions that decide / prepare / are informed / may own the accepted request, whether a
-- site (COLICO/DERVIO) is required and whether the Tesoreria may record a payment link (sponsors and convenzioni are
-- invoiced by contract, never by link). NULL for AMICHEVOLE and unknown kinds.
create or replace function public.scd_request_kind_rules(p_kind text)
returns jsonb language sql immutable set search_path to 'public' as $$
  select case p_kind
    when 'ISCRIZIONE_TORNEO' then jsonb_build_object('area', 'tornei', 'topic', 'tornei',
      'deciders', jsonb_build_array('responsabile-tornei','direttore-generale'),
      'preparers', jsonb_build_array('segreteria'),
      'informed', jsonb_build_array('coordinatore-attivita-sportiva','tesoreria'),
      'owners', jsonb_build_array('responsabile-tornei','segreteria'),
      'siteRequired', false, 'paymentLink', true)
    when 'SPONSOR' then jsonb_build_object('area', 'crm', 'topic', 'sponsor',
      'deciders', jsonb_build_array('direttore-generale','presidente','direzione'),
      'preparers', jsonb_build_array(),
      'informed', jsonb_build_array('tesoreria'),
      'owners', jsonb_build_array('direttore-generale','presidente','tesoreria'),
      'siteRequired', false, 'paymentLink', false)
    when 'CONVENZIONE' then jsonb_build_object('area', 'crm', 'topic', 'sponsor',
      'deciders', jsonb_build_array('direttore-generale','presidente','direzione'),
      'preparers', jsonb_build_array(),
      'informed', jsonb_build_array('tesoreria'),
      'owners', jsonb_build_array('direttore-generale','presidente','tesoreria'),
      'siteRequired', false, 'paymentLink', false)
    when 'AFFITTO_CAMPO' then jsonb_build_object('area', 'impianti-campi', 'topic', 'impianti',
      'deciders', jsonb_build_array('direttore-generale','presidente','direzione'),
      'preparers', jsonb_build_array('responsabile-campi'),
      'informed', jsonb_build_array('tesoreria','responsabile-struttura-colico','responsabile-struttura'),
      'owners', jsonb_build_array('responsabile-campi','tesoreria','direttore-generale'),
      'siteRequired', true, 'paymentLink', true)
    when 'VISITA_CENTRO' then jsonb_build_object('area', 'impianti-campi', 'topic', 'impianti',
      'deciders', jsonb_build_array('direttore-generale','presidente','direzione'),
      'preparers', jsonb_build_array('segreteria'),
      'informed', jsonb_build_array('responsabile-campi','responsabile-struttura-colico','responsabile-struttura'),
      'owners', jsonb_build_array('segreteria','direttore-generale'),
      'siteRequired', true, 'paymentLink', true)
    when 'ALTRO' then jsonb_build_object('area', 'segreteria', 'topic', 'comunicazioni',
      'deciders', jsonb_build_array('segreteria','direttore-generale'),
      'preparers', jsonb_build_array(),
      'informed', jsonb_build_array(),
      'owners', jsonb_build_array('segreteria'),
      'siteRequired', false, 'paymentLink', true)
    else null
  end;
$$;
revoke all on function public.scd_request_kind_rules(text) from public, anon, authenticated;

-- Positions of a kind for a set ('deciders' | 'preparers' | 'viewers' | 'owners'), with the UD-156 Dervio rule:
-- for a Dervio request the DERVIO_ALWAYS positions are added to the viewers and the positions that never see Dervio
-- are removed from every set. 'viewers' = watchers + deciders + preparers + informed + owners (+ Dervio).
-- Mirror of lib/intake-kinds.ts kindPositions.
create or replace function public.scd_request_kind_positions(p_kind text, p_site text, p_set text)
returns text[] language plpgsql immutable set search_path to 'public' as $$
declare
  r jsonb := public.scd_request_kind_rules(p_kind);
  v text[];
  v_always text[] := array['direttore-generale','presidente'];
  v_watchers text[] := array['direttore-generale','coordinatore-attivita-sportiva'];
  v_dervio_always text[] := array['presidente','direttore-generale','coordinatore-attivita-sportiva','responsabile-attivita-base',
    'direttore-sportivo-agonistica','direttore-sportivo-generale','segreteria'];
  v_dervio_excluded text[] := array['responsabile-struttura-dervio','responsabile-campi','responsabile-club-house',
    'responsabile-struttura','responsabile-struttura-colico'];
begin
  if r is null then return null; end if;
  v := case p_set
    when 'deciders' then v_always || array(select jsonb_array_elements_text(r->'deciders'))
    when 'preparers' then array(select jsonb_array_elements_text(r->'preparers'))
    when 'owners' then array(select jsonb_array_elements_text(r->'owners'))
    when 'viewers' then v_watchers || v_always
      || array(select jsonb_array_elements_text(r->'deciders')) || array(select jsonb_array_elements_text(r->'preparers'))
      || array(select jsonb_array_elements_text(r->'informed')) || array(select jsonb_array_elements_text(r->'owners'))
      || case when p_site = 'DERVIO' then v_dervio_always else array[]::text[] end
    else null end;
  if v is null then return null; end if;
  if p_site = 'DERVIO' then
    v := array(select x from unnest(v) x where not (x = any(v_dervio_excluded)));
  end if;
  return array(select distinct x from unnest(v) x order by x);
end;
$$;
revoke all on function public.scd_request_kind_positions(text, text, text) from public, anon, authenticated;

-- May the caller do p_what ('view' | 'decide' | 'prepare') on a request of this kind and site? The Direzione (role
-- DIRECTION) always may; 'prepare' also allows the owner position chosen by a decider.
create or replace function public.scd_request_can(p_organization_id uuid, p_kind text, p_site text, p_owner text, p_what text)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select auth.uid() is not null and public.scd_request_kind_rules(p_kind) is not null and (
    public.scd_has_org_role(p_organization_id, array['DIRECTION']::public.scd_role[])
    or case p_what
      when 'view' then public.scd_has_position(p_organization_id, public.scd_request_kind_positions(p_kind, p_site, 'viewers'))
      when 'decide' then public.scd_has_position(p_organization_id, public.scd_request_kind_positions(p_kind, p_site, 'deciders'))
      when 'prepare' then public.scd_has_position(p_organization_id,
        public.scd_request_kind_positions(p_kind, p_site, 'deciders') || public.scd_request_kind_positions(p_kind, p_site, 'preparers')
        || case when p_owner is not null and p_owner = any(public.scd_request_kind_positions(p_kind, p_site, 'viewers'))
                then array[p_owner] else array[]::text[] end)
      else false end);
$$;
revoke all on function public.scd_request_can(uuid, text, text, text, text) from public, anon, authenticated;

-- Positions told in the app about a step (chi-fa-cosa UD-141: informed positions only after acceptance).
create or replace function public.scd_request_notify(p_kind text, p_site text, p_action text, p_owner text)
returns text[] language sql immutable set search_path to 'public' as $$
  select array(select distinct x from unnest(
    case
      when p_action in ('CONTATTO_LETTO','CONTATTI_CANCELLATI') then array[]::text[]
      when p_action = 'PAGAMENTO' then array['tesoreria','segreteria','direttore-generale'] || coalesce(array[p_owner], array[]::text[])
      when p_action in ('ACCETTATA') then public.scd_request_kind_positions(p_kind, p_site, 'viewers')
      when p_action in ('IN_GESTIONE','CHIUSA','ASSEGNATA') then array['direttore-generale','coordinatore-attivita-sportiva']
        || public.scd_request_kind_positions(p_kind, p_site, 'preparers') || coalesce(array[p_owner], array[]::text[])
      else array['direttore-generale','coordinatore-attivita-sportiva']
        || public.scd_request_kind_positions(p_kind, p_site, 'deciders') || public.scd_request_kind_positions(p_kind, p_site, 'preparers')
        || case when p_site = 'DERVIO' then array['presidente','direttore-generale','coordinatore-attivita-sportiva','responsabile-attivita-base',
             'direttore-sportivo-agonistica','direttore-sportivo-generale','segreteria'] else array[]::text[] end
    end) x where x is not null and x <> 'direzione' order by x);
$$;
revoke all on function public.scd_request_notify(text, text, text, text) from public, anon, authenticated;

-- ---------------------------------------------------------------- 5. cleaning (the form and Make are never trusted)
-- Contact redaction of r139 (r133's live scd_request_redact is left as it is): plain e-mails, obfuscated e-mails
-- ("nome at dominio it", "nome [at] dominio [dot] it", "nome(at)dominio.it") and phone numbers whose digits are split by
-- spaces, dots, dashes, slashes or brackets (9+ digits; a date like 24/10/2026 has 8 and stays). Mirror of
-- lib/intake-kinds.ts INTAKE_EMAIL_PATTERN / INTAKE_EMAIL_OBFUSCATED_PATTERN / INTAKE_PHONE_PATTERN (same strings).
create or replace function public.scd_intake_redact(p_text text)
returns text language sql immutable set search_path to 'public' as $$
  select case when p_text is null then null else
    regexp_replace(
      regexp_replace(
        regexp_replace(p_text, '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}', '[email]', 'g'),
        '[A-Za-z0-9._%+-]+(?:\s*(?:\[at\]|\(at\))\s*|\s+(?:at|chiocciola)\s+)[A-Za-z0-9-]+(?:(?:\s*(?:\[dot\]|\(dot\)|\[punto\]|\(punto\)|\.)\s*|\s+(?:dot|punto)\s+|\s+)[A-Za-z0-9-]+)?(?:\s*(?:\[dot\]|\(dot\)|\[punto\]|\(punto\)|\.)\s*|\s+(?:dot|punto)\s+|\s+)(?:it|com|net|org|eu|info|biz|ch)(?![A-Za-z0-9])', '[email]', 'gi'),
      '(\+|00)?\(?[0-9](?:[ .()/-]{0,2}[0-9]){8,}', '[telefono]', 'g')
  end;
$$;
revoke all on function public.scd_intake_redact(text) from public, anon, authenticated;

-- Free text: contacts redacted (scd_intake_redact) and, when it mentions health, replaced as a whole: health data
-- never enter the catalogue (no symptoms, no diagnoses). Stems at the start of a word, short words as whole words
-- ("entusiasma", "fantasma", "autista", "operatore" are not health). Mirror of lib/intake-kinds.ts HEALTH_PREFIXES,
-- HEALTH_WORDS and cleanIntakeText.
create or replace function public.scd_request_intake_text(p_text text)
returns text language sql immutable set search_path to 'public' as $$
  select case
    when nullif(btrim(coalesce(p_text, '')), '') is null then null
    when p_text ~* '\m(diagnos|patolog|malat|allergi|intolleran|farmac|terapi|sintom|infortun|disabil|certificat[oi] medic|celiac|diabet|epiless|ricover|frattur|psicolog|gravidanz|incinta|handicap|autism|autistic)|\m(asma|gesso|dsa|adhd|operat[oaie]|ferit[oaie])\M'
      then '[testo rimosso: possibili dati di salute]'
    else left(btrim(regexp_replace(public.scd_intake_redact(p_text), '[[:cntrl:]]+', ' ', 'g')), 500)
  end;
$$;
revoke all on function public.scd_request_intake_text(text) from public, anon, authenticated;

-- Fields of a kind: strict whitelist (an unknown field is refused), limits and enumerations. Returns the cleaned
-- object or {"error": code}. Mirror of lib/intake-kinds.ts INTAKE_FIELDS.
create or replace function public.scd_request_clean_intake(p_kind text, p jsonb)
returns jsonb language plpgsql stable set search_path to 'public' as $$
declare
  v_allowed text[];
  v_out jsonb := '{}'::jsonb;
  v_key text;
  v_date date;
  v_date2 date;
  v_int integer;
  v_today date := (now() at time zone 'Europe/Rome')::date;
begin
  if p is null or jsonb_typeof(p) <> 'object' or octet_length(p::text) > 3000 then return jsonb_build_object('error', 'invalid'); end if;
  v_allowed := case p_kind
    when 'ISCRIZIONE_TORNEO' then array['tournament','category','teams','city','province','figcMatricola','note']
    when 'SPONSOR' then array['sector','packages','note']
    when 'CONVENZIONE' then array['proposal','sector','note']
    when 'AFFITTO_CAMPO' then array['date','slot','pitch','activity','people','note']
    when 'VISITA_CENTRO' then array['date','date2','people','ageBand','note']
    when 'ALTRO' then array['subject','note']
    else null end;
  if v_allowed is null then return jsonb_build_object('error', 'kind'); end if;
  for v_key in select jsonb_object_keys(p) loop
    if not (v_key = any(v_allowed)) then return jsonb_build_object('error', 'field'); end if;
    if jsonb_typeof(p->v_key) not in ('string','number','array','null') then return jsonb_build_object('error', 'invalid'); end if;
  end loop;

  begin
    if p_kind = 'ISCRIZIONE_TORNEO' then
      if coalesce(p->>'tournament', '') not in ('christmas-lario-cup-maschile','christmas-lario-cup-female','memorial-jose-nasazzi','memorial-sandro-guattini') then
        return jsonb_build_object('error', 'tournament');
      end if;
      if coalesce(p->>'category', '') !~ '^[[:alnum:] /.-]{2,40}$' then return jsonb_build_object('error', 'category'); end if;
      v_int := (p->>'teams')::integer;
      if v_int is null or v_int not between 1 and 6 then return jsonb_build_object('error', 'teams'); end if;
      if nullif(p->>'city', '') is not null and (p->>'city') !~ '^[[:alpha:] ''.-]{2,80}$' then return jsonb_build_object('error', 'city'); end if;
      if nullif(p->>'province', '') is not null and upper(p->>'province') !~ '^[A-Z]{2}$' then return jsonb_build_object('error', 'province'); end if;
      if nullif(p->>'figcMatricola', '') is not null and (p->>'figcMatricola') !~ '^[0-9]{3,10}$' then return jsonb_build_object('error', 'figcMatricola'); end if;
      v_out := jsonb_build_object('tournament', p->>'tournament', 'category', btrim(p->>'category'), 'teams', v_int,
        'city', nullif(btrim(coalesce(p->>'city', '')), ''), 'province', nullif(upper(btrim(coalesce(p->>'province', ''))), ''),
        'figcMatricola', nullif(p->>'figcMatricola', ''));
    elsif p_kind in ('SPONSOR','CONVENZIONE') then
      if nullif(p->>'sector', '') is not null and (p->>'sector') !~ '^[[:alnum:] ,''./&-]{2,60}$' then return jsonb_build_object('error', 'sector'); end if;
      v_out := jsonb_build_object('sector', nullif(btrim(coalesce(p->>'sector', '')), ''));
      if p_kind = 'SPONSOR' and p ? 'packages' and jsonb_typeof(p->'packages') <> 'null' then
        if jsonb_typeof(p->'packages') <> 'array' or jsonb_array_length(p->'packages') > 5
           or exists (select 1 from jsonb_array_elements(p->'packages') e where jsonb_typeof(e) <> 'string' or (e #>> '{}') !~ '^[a-z0-9-]{2,40}$') then
          return jsonb_build_object('error', 'packages');
        end if;
        v_out := v_out || jsonb_build_object('packages', p->'packages');
      end if;
      if p_kind = 'CONVENZIONE' then
        if coalesce(p->>'proposal', '') not in ('SCONTO_TESSERATI','VENDITA_CONGIUNTA','FORNITURA','ALTRO') then return jsonb_build_object('error', 'proposal'); end if;
        v_out := v_out || jsonb_build_object('proposal', p->>'proposal');
      end if;
    elsif p_kind in ('AFFITTO_CAMPO','VISITA_CENTRO') then
      v_date := (p->>'date')::date;
      if v_date is null or v_date < v_today or v_date > v_today + 365 then return jsonb_build_object('error', 'date'); end if;
      v_int := nullif(p->>'people', '')::integer;
      if p_kind = 'AFFITTO_CAMPO' then
        if coalesce(p->>'slot', '') not in ('MATTINA','POMERIGGIO','SERA') then return jsonb_build_object('error', 'slot'); end if;
        if coalesce(p->>'activity', '') not in ('ALLENAMENTO','PARTITA','TORNEO','EVENTO','ALTRO') then return jsonb_build_object('error', 'activity'); end if;
        if nullif(p->>'pitch', '') is not null and (p->>'pitch') not in ('CAMPO_11','CAMPO_7','CAMPO_5','INDIFFERENTE') then return jsonb_build_object('error', 'pitch'); end if;
        if v_int is not null and v_int not between 1 and 500 then return jsonb_build_object('error', 'people'); end if;
        v_out := jsonb_build_object('date', v_date, 'slot', p->>'slot', 'activity', p->>'activity', 'pitch', nullif(p->>'pitch', ''), 'people', v_int);
      else
        v_date2 := nullif(p->>'date2', '')::date;
        if v_date2 is not null and (v_date2 < v_today or v_date2 > v_today + 365) then return jsonb_build_object('error', 'date'); end if;
        if v_int is null or v_int not between 1 and 200 then return jsonb_build_object('error', 'people'); end if;
        if coalesce(p->>'ageBand', '') not in ('BAMBINI','RAGAZZI','ADULTI','MISTO') then return jsonb_build_object('error', 'ageBand'); end if;
        v_out := jsonb_build_object('date', v_date, 'date2', v_date2, 'people', v_int, 'ageBand', p->>'ageBand');
      end if;
    elsif p_kind = 'ALTRO' then
      if coalesce(p->>'subject', '') not in ('INFORMAZIONI','COLLABORAZIONE','PROPOSTA','ALTRO') then return jsonb_build_object('error', 'subject'); end if;
      if nullif(btrim(coalesce(p->>'note', '')), '') is null then return jsonb_build_object('error', 'note'); end if;
      v_out := jsonb_build_object('subject', p->>'subject');
    end if;
  exception when others then
    return jsonb_build_object('error', 'invalid');
  end;

  if char_length(coalesce(p->>'note', '')) > 2000 then return jsonb_build_object('error', 'note'); end if;
  v_out := v_out || jsonb_build_object('note', public.scd_request_intake_text(p->>'note'));
  return jsonb_strip_nulls(v_out);
end;
$$;
revoke all on function public.scd_request_clean_intake(text, jsonb) from public, anon, authenticated;

-- External contact: adult referent + organisation (not for a private person) + at least one of e-mail and phone.
-- Returns the cleaned object or {"error": code}. Mirror of lib/intake-kinds.ts INTAKE_CONTACT_RULES.
create or replace function public.scd_request_contact_clean(p_org_kind text, p jsonb)
returns jsonb language plpgsql immutable set search_path to 'public' as $$
declare
  v_org text := nullif(regexp_replace(btrim(coalesce(p->>'orgName', '')), '\s+', ' ', 'g'), '');
  v_name text := regexp_replace(btrim(coalesce(p->>'name', '')), '\s+', ' ', 'g');
  v_role text := nullif(regexp_replace(btrim(coalesce(p->>'role', '')), '\s+', ' ', 'g'), '');
  v_email text := nullif(lower(btrim(coalesce(p->>'email', ''))), '');
  v_phone text := nullif(regexp_replace(coalesce(p->>'phone', ''), '[ ./()-]', '', 'g'), '');
  v_key text;
begin
  if p is null or jsonb_typeof(p) <> 'object' then return jsonb_build_object('error', 'contact'); end if;
  for v_key in select jsonb_object_keys(p) loop
    if not (v_key = any(array['orgName','name','role','email','phone'])) then return jsonb_build_object('error', 'field'); end if;
  end loop;
  if v_name !~ '^[[:alpha:] ''.-]{2,80}$' then return jsonb_build_object('error', 'contact'); end if;
  if v_role is not null and v_role !~ '^[[:alnum:] ''./-]{2,60}$' then return jsonb_build_object('error', 'contact'); end if;
  if p_org_kind = 'PRIVATO' then
    v_org := null;
  elsif v_org is null or char_length(v_org) not between 2 and 120 or v_org ~ '[@]' or v_org ~ '[0-9]{6,}' then
    return jsonb_build_object('error', 'organization');
  end if;
  if v_email is not null and (char_length(v_email) > 120 or v_email !~ '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$') then
    return jsonb_build_object('error', 'email');
  end if;
  if v_phone is not null then
    if v_phone ~ '^00' then v_phone := '+' || substr(v_phone, 3); end if;
    if v_phone !~ '^\+?[0-9]{6,15}$' then return jsonb_build_object('error', 'phone'); end if;
  end if;
  if v_email is null and v_phone is null then return jsonb_build_object('error', 'contact'); end if;
  return jsonb_strip_nulls(jsonb_build_object('orgName', v_org, 'name', v_name, 'role', v_role, 'email', v_email, 'phone', v_phone));
end;
$$;
revoke all on function public.scd_request_contact_clean(text, jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------- 6. ingest (service role only: Make "Tally richieste")
-- Payload: {"sourceRef":"tally:<submissionId>","tipo":"torneo|sponsor|convenzione|affitto-campo|visita|altro",
--   "site":"COLICO|DERVIO|null","orgKind":"SOCIETA|AZIENDA|SCUOLA|ENTE|PRIVATO","fields":{...},
--   "contact":{"orgName","name","role","email","phone"},"consentPrivacy":true,"adultDeclared":true}
-- Answer: {"ok":true,"id","publicCode","duplicate"} or {"ok":false,"code"}. Nothing is sent to anybody.
create or replace function public.scd_request_ingest(p_organization_id uuid, p jsonb)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  v_claims text := nullif(current_setting('request.jwt.claims', true), '');
  v_role text;
  v_kind text;
  v_site text := nullif(p->>'site', '');
  v_org_kind text := nullif(p->>'orgKind', '');
  v_ref text := nullif(p->>'sourceRef', '');
  v_rules jsonb;
  v_fields jsonb;
  v_contact jsonb;
  v_existing public.scd_requests;
  v_id uuid;
  v_code text;
  v_key text;
begin
  -- Grants already restrict execution to the service role; this refuses any PostgREST caller with another role.
  begin
    v_role := coalesce(v_claims::jsonb->>'role', nullif(current_setting('request.jwt.claim.role', true), ''));
  exception when others then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end;
  if v_role is not null and v_role <> 'service_role' then return jsonb_build_object('ok', false, 'code', 'forbidden'); end if;

  if p is null or jsonb_typeof(p) <> 'object' or octet_length(p::text) > 6000 then return jsonb_build_object('ok', false, 'code', 'invalid'); end if;
  for v_key in select jsonb_object_keys(p) loop
    if not (v_key = any(array['sourceRef','tipo','site','orgKind','fields','contact','consentPrivacy','adultDeclared'])) then
      return jsonb_build_object('ok', false, 'code', 'field');
    end if;
  end loop;
  if not exists (select 1 from public.scd_organizations where id = p_organization_id) then return jsonb_build_object('ok', false, 'code', 'organization'); end if;
  if v_ref is null or v_ref !~ '^tally:[A-Za-z0-9_-]{3,64}$' then return jsonb_build_object('ok', false, 'code', 'source'); end if;

  -- idempotent: the same Tally submission twice is the same request
  select * into v_existing from public.scd_requests where organization_id = p_organization_id and source_ref = v_ref;
  if v_existing.id is not null then
    return jsonb_build_object('ok', true, 'id', v_existing.id, 'publicCode', v_existing.public_code, 'duplicate', true);
  end if;

  v_kind := case p->>'tipo'
    when 'torneo' then 'ISCRIZIONE_TORNEO' when 'sponsor' then 'SPONSOR' when 'convenzione' then 'CONVENZIONE'
    when 'affitto-campo' then 'AFFITTO_CAMPO' when 'visita' then 'VISITA_CENTRO' when 'altro' then 'ALTRO' else null end;
  if v_kind is null then return jsonb_build_object('ok', false, 'code', 'kind'); end if;
  v_rules := public.scd_request_kind_rules(v_kind);

  if (p->'consentPrivacy') is distinct from 'true'::jsonb then return jsonb_build_object('ok', false, 'code', 'consent'); end if;
  if (p->'adultDeclared') is distinct from 'true'::jsonb then return jsonb_build_object('ok', false, 'code', 'adult'); end if;
  if v_site is not null and v_site not in ('COLICO','DERVIO') then return jsonb_build_object('ok', false, 'code', 'site'); end if;
  if (v_rules->>'siteRequired')::boolean and v_site is null then return jsonb_build_object('ok', false, 'code', 'site'); end if;
  if v_org_kind is null or v_org_kind not in ('SOCIETA','AZIENDA','SCUOLA','ENTE','PRIVATO')
     or (v_kind = 'ISCRIZIONE_TORNEO' and v_org_kind <> 'SOCIETA')
     or (v_kind in ('SPONSOR','CONVENZIONE') and v_org_kind not in ('AZIENDA','ENTE')) then
    return jsonb_build_object('ok', false, 'code', 'orgKind');
  end if;

  v_fields := public.scd_request_clean_intake(v_kind, coalesce(p->'fields', '{}'::jsonb));
  if v_fields ? 'error' then return jsonb_build_object('ok', false, 'code', v_fields->>'error'); end if;
  v_contact := public.scd_request_contact_clean(v_org_kind, p->'contact');
  if v_contact ? 'error' then return jsonb_build_object('ok', false, 'code', v_contact->>'error'); end if;

  -- the stored row must fit the r133 payload limit (2000 bytes): refuse instead of failing on the insert
  if octet_length((v_fields || jsonb_build_object('orgKind', v_org_kind))::text) > 2000 then
    return jsonb_build_object('ok', false, 'code', 'too_long');
  end if;

  -- hourly cap against a flood from the public form (PROPOSED value 60; Make retries stay idempotent above)
  if (select count(*) from public.scd_requests where organization_id = p_organization_id and channel = 'TALLY'
        and created_at > now() - interval '1 hour') >= 60 then
    return jsonb_build_object('ok', false, 'code', 'rate');
  end if;

  v_code := 'V-' || to_char(now() at time zone 'Europe/Rome', 'YY') || '-' || lpad(nextval('public.scd_request_public_code_seq')::text, 4, '0');
  insert into public.scd_requests (organization_id, kind, channel, payload, status, area, site, public_code,
    requester_kind, source_ref, received_at, created_by)
  values (p_organization_id, v_kind, 'TALLY', v_fields || jsonb_build_object('orgKind', v_org_kind), 'RICEVUTA',
    v_rules->>'area', v_site, v_code, 'ESTERNO', v_ref, now(), null)
  on conflict (organization_id, source_ref) where source_ref is not null do nothing
  returning id into v_id;
  -- a concurrent call with the same submission won the race: same request, nothing else written
  if v_id is null then
    select * into v_existing from public.scd_requests where organization_id = p_organization_id and source_ref = v_ref;
    return jsonb_build_object('ok', true, 'id', v_existing.id, 'publicCode', v_existing.public_code, 'duplicate', true);
  end if;
  insert into public.scd_request_contacts (request_id, organization_id, org_name, contact_name, contact_role, email, phone,
    consent_privacy_at, adult_declared, purge_after)
  values (v_id, p_organization_id, v_contact->>'orgName', v_contact->>'name', v_contact->>'role', v_contact->>'email',
    v_contact->>'phone', now(), true, now() + interval '12 months');
  insert into public.scd_request_events (organization_id, request_id, action, actor, note, notify_positions)
  values (p_organization_id, v_id, 'RICEVUTA', null, 'Dal modulo pubblico «Richieste alla SCD»',
    public.scd_request_notify(v_kind, v_site, 'RICEVUTA', null));
  return jsonb_build_object('ok', true, 'id', v_id, 'publicCode', v_code, 'duplicate', false);
end;
$$;
revoke all on function public.scd_request_ingest(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.scd_request_ingest(uuid, jsonb) to service_role;

-- Delete the contacts past purge_after (service role only, for a scheduled job). Logged per request.
create or replace function public.scd_request_contacts_purge()
returns integer language plpgsql security definer set search_path to 'public' as $$
declare
  v_n integer;
begin
  with gone as (
    delete from public.scd_request_contacts where purge_after <= now() returning request_id, organization_id
  ), logged as (
    insert into public.scd_request_events (organization_id, request_id, action, actor, note, notify_positions)
    select organization_id, request_id, 'CONTATTI_CANCELLATI', null, 'Recapiti cancellati alla scadenza', array[]::text[] from gone
    returning 1
  )
  select count(*) into v_n from logged;
  return v_n;
end;
$$;
revoke all on function public.scd_request_contacts_purge() from public, anon, authenticated;
grant execute on function public.scd_request_contacts_purge() to service_role;

-- ---------------------------------------------------------------- 7. reads
-- Kinds open in this phase: harmless, also the probe "r139 is live" of the app (registry-live.server.ts).
create or replace function public.scd_intake_kinds()
returns jsonb language sql immutable set search_path to 'public' as $$
  select '["ISCRIZIONE_TORNEO","SPONSOR","CONVENZIONE","AFFITTO_CAMPO","VISITA_CENTRO","ALTRO"]'::jsonb;
$$;
revoke all on function public.scd_intake_kinds() from public, anon;
grant execute on function public.scd_intake_kinds() to authenticated;

-- One row of the catalogue for a caller. Amount and link only for who handles payments (p_money); no contact data.
create or replace function public.scd_intake_row_json(r public.scd_requests, p_money boolean, p_events boolean)
returns jsonb language sql stable set search_path to 'public' as $$
  select jsonb_strip_nulls(jsonb_build_object('id', r.id, 'publicCode', r.public_code, 'kind', r.kind, 'channel', r.channel,
    'area', r.area, 'site', r.site, 'status', r.status, 'payload', r.payload, 'ownerPosition', r.owner_position,
    'receivedAt', coalesce(r.received_at, r.created_at), 'takenAt', r.taken_at, 'decidedAt', r.decided_at,
    'acceptedAt', r.accepted_at, 'closedAt', r.closed_at, 'decisionNote', r.decision_note, 'updatedAt', r.updated_at,
    'hasContact', exists (select 1 from public.scd_request_contacts c where c.request_id = r.id),
    'paymentStatus', r.payment_status,
    'paymentAmountCents', case when p_money then r.payment_amount_cents end,
    'paymentLink', case when p_money then r.payment_link end,
    'events', case when p_events then (
      select coalesce(jsonb_agg(jsonb_build_object('at', e.at, 'action', e.action, 'note', e.note) order by e.at desc), '[]'::jsonb)
      from (select * from public.scd_request_events where request_id = r.id and action <> 'CONTATTO_LETTO' order by at desc limit 8) e) end));
$$;
revoke all on function public.scd_intake_row_json(public.scd_requests, boolean, boolean) from public, anon, authenticated;

-- Catalogue for the caller: only the kinds and sites the caller handles; per row the actions the caller may take.
-- Filters (all optional): {"kind": one kind, "status": [statuses], "area": one area, "site": COLICO|DERVIO}.
-- Open requests and those changed in the last 90 days. Raises 42501 for a caller who handles no kind.
create or replace function public.scd_intake_board(p_organization_id uuid, p_filters jsonb)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
declare
  f jsonb := coalesce(p_filters, '{}'::jsonb);
  v_kind text := nullif(f->>'kind', '');
  v_area text := nullif(f->>'area', '');
  v_site text := nullif(f->>'site', '');
  v_status text[];
  v_money boolean;
  v_pay boolean;
  v_any boolean;
begin
  if auth.uid() is null then raise exception 'forbidden' using errcode = '42501'; end if;
  v_any := public.scd_has_org_role(p_organization_id, array['DIRECTION']::public.scd_role[])
    or exists (select 1 from jsonb_array_elements_text(public.scd_intake_kinds()) k
               where public.scd_request_can(p_organization_id, k, null, null, 'view')
                  or public.scd_request_can(p_organization_id, k, 'DERVIO', null, 'view'));
  if not v_any then raise exception 'forbidden' using errcode = '42501'; end if;
  if jsonb_typeof(f) <> 'object'
     or (v_kind is not null and not (public.scd_intake_kinds() ? v_kind))
     or (v_area is not null and v_area not in ('tornei','crm','impianti-campi','segreteria'))
     or (v_site is not null and v_site not in ('COLICO','DERVIO'))
     or (f ? 'status' and jsonb_typeof(f->'status') <> 'array') then
    raise exception 'invalid filters' using errcode = '22023';
  end if;
  if f ? 'status' then
    v_status := array(select jsonb_array_elements_text(f->'status'));
    if exists (select 1 from unnest(v_status) s where s not in ('RICEVUTA','IN_VALUTAZIONE','ACCETTATA','RIFIUTATA','IN_GESTIONE','CHIUSA','ANNULLATA')) then
      raise exception 'invalid filters' using errcode = '22023';
    end if;
  end if;
  v_pay := public.scd_has_position(p_organization_id, array['tesoreria']);
  v_money := v_pay or public.scd_has_org_role(p_organization_id, array['DIRECTION']::public.scd_role[])
    or public.scd_has_position(p_organization_id, array['presidente','direttore-generale']);
  return jsonb_build_object('canPay', v_pay, 'rows', coalesce((
    select jsonb_agg(public.scd_intake_row_json(r, v_money, true) || jsonb_build_object('can', jsonb_build_object(
        'decide', public.scd_request_can(p_organization_id, r.kind, r.site, r.owner_position, 'decide'),
        'prepare', public.scd_request_can(p_organization_id, r.kind, r.site, r.owner_position, 'prepare'),
        'contact', public.scd_request_can(p_organization_id, r.kind, r.site, r.owner_position, 'prepare'),
        'pay', v_pay and r.status in ('ACCETTATA','IN_GESTIONE','CHIUSA')),
        'owners', to_jsonb(public.scd_request_kind_positions(r.kind, r.site, 'owners')),
        'paymentLinkAllowed', (public.scd_request_kind_rules(r.kind)->>'paymentLink')::boolean)
      order by coalesce(r.received_at, r.created_at) desc)
    from public.scd_requests r
    where r.organization_id = p_organization_id and r.kind <> 'AMICHEVOLE'
      and public.scd_request_can(p_organization_id, r.kind, r.site, r.owner_position, 'view')
      and (v_kind is null or r.kind = v_kind)
      and (v_area is null or r.area = v_area)
      and (v_site is null or r.site = v_site)
      and (v_status is null or r.status = any(v_status))
      and (r.status in ('RICEVUTA','IN_VALUTAZIONE','ACCETTATA','IN_GESTIONE') or r.updated_at > now() - interval '90 days')), '[]'::jsonb));
end;
$$;
revoke all on function public.scd_intake_board(uuid, jsonb) from public, anon;
grant execute on function public.scd_intake_board(uuid, jsonb) to authenticated;

-- In-app notices of the last 30 days for the caller's positions (and every step for the Direzione), only on rows the
-- caller may see. Kind, receipt code, step and site: no organisation, no contact, no amount.
create or replace function public.scd_intake_notices(p_organization_id uuid)
returns jsonb language sql stable security definer set search_path to 'public' as $$
  select case when auth.uid() is null then '[]'::jsonb else coalesce((
    select jsonb_agg(jsonb_build_object('at', e.at, 'action', e.action, 'requestId', r.id, 'publicCode', r.public_code,
      'kind', r.kind, 'status', r.status, 'site', r.site) order by e.at desc)
    from (select * from public.scd_request_events
          where organization_id = p_organization_id and at > now() - interval '30 days' and cardinality(notify_positions) > 0
          order by at desc limit 200) e
    join public.scd_requests r on r.id = e.request_id and r.kind <> 'AMICHEVOLE'
    where public.scd_request_can(p_organization_id, r.kind, r.site, r.owner_position, 'view')
      and (public.scd_has_org_role(p_organization_id, array['DIRECTION']::public.scd_role[])
           or public.scd_has_position(p_organization_id, e.notify_positions))), '[]'::jsonb) end;
$$;
revoke all on function public.scd_intake_notices(uuid) from public, anon;
grant execute on function public.scd_intake_notices(uuid) to authenticated;

-- External contact of one request, for who decides or prepares it (never the informed positions). Every read is
-- logged (CONTATTO_LETTO, no notice). After the purge: {"purged": true}.
create or replace function public.scd_intake_contact(p_organization_id uuid, p_request_id uuid)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  r public.scd_requests;
  c public.scd_request_contacts;
begin
  select * into r from public.scd_requests where id = p_request_id and organization_id = p_organization_id and kind <> 'AMICHEVOLE';
  if r.id is null then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  if not public.scd_request_can(p_organization_id, r.kind, r.site, r.owner_position, 'prepare') then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  select * into c from public.scd_request_contacts where request_id = r.id;
  insert into public.scd_request_events (organization_id, request_id, action, actor, notify_positions)
  values (p_organization_id, r.id, 'CONTATTO_LETTO', auth.uid(), array[]::text[]);
  if c.request_id is null then return jsonb_build_object('ok', true, 'purged', true); end if;
  return jsonb_build_object('ok', true, 'purged', false, 'contact', jsonb_strip_nulls(jsonb_build_object(
    'orgName', c.org_name, 'name', c.contact_name, 'role', c.contact_role, 'email', c.email, 'phone', c.phone,
    'consentAt', c.consent_privacy_at, 'purgeAfter', c.purge_after)));
end;
$$;
revoke all on function public.scd_intake_contact(uuid, uuid) from public, anon;
grant execute on function public.scd_intake_contact(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------- 8. state machine
-- take      RICEVUTA -> IN_VALUTAZIONE                 deciders or preparers
-- accept    IN_VALUTAZIONE -> ACCETTATA                deciders
-- reject    IN_VALUTAZIONE -> RIFIUTATA (reason)       deciders
-- start     ACCETTATA -> IN_GESTIONE                   deciders, preparers, owner
-- close     IN_GESTIONE -> CHIUSA                      deciders, preparers, owner
-- cancel    any open state -> ANNULLATA (reason)       deciders
-- assign    open state, value = owner position         deciders (owner among the kind's owners, visible for the site)
-- reclassify ALTRO in RICEVUTA/IN_VALUTAZIONE, value = new kind   deciders of ALTRO
create or replace function public.scd_intake_decide(p_organization_id uuid, p_request_id uuid, p_action text, p_note text, p_value text)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  r public.scd_requests;
  v_note text := nullif(left(btrim(public.scd_intake_redact(coalesce(p_note, ''))), 300), '');
  v_value text := nullif(btrim(coalesce(p_value, '')), '');
  v_to text;
  v_event text;
  v_open text[] := array['RICEVUTA','IN_VALUTAZIONE','ACCETTATA','IN_GESTIONE'];
  v_rules jsonb;
begin
  if p_action is null or p_action not in ('take','accept','reject','start','close','cancel','assign','reclassify') then
    return jsonb_build_object('ok', false, 'code', 'invalid');
  end if;
  if v_note is not null and public.scd_request_intake_text(v_note) like '[testo rimosso%' then
    return jsonb_build_object('ok', false, 'code', 'health');
  end if;
  select * into r from public.scd_requests where id = p_request_id and organization_id = p_organization_id and kind <> 'AMICHEVOLE' for update;
  if r.id is null then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  if not public.scd_request_can(p_organization_id, r.kind, r.site, r.owner_position, 'view') then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;

  if p_action in ('accept','reject','cancel','assign','reclassify') then
    if not public.scd_request_can(p_organization_id, r.kind, r.site, r.owner_position, 'decide') then
      return jsonb_build_object('ok', false, 'code', 'forbidden');
    end if;
  elsif p_action = 'take' then
    if not public.scd_request_can(p_organization_id, r.kind, r.site, null, 'prepare') then
      return jsonb_build_object('ok', false, 'code', 'forbidden');
    end if;
  elsif not public.scd_request_can(p_organization_id, r.kind, r.site, r.owner_position, 'prepare') then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;

  if p_action = 'assign' then
    if not (r.status = any(v_open)) then return jsonb_build_object('ok', false, 'code', 'state'); end if;
    if v_value is null or not (v_value = any(public.scd_request_kind_positions(r.kind, r.site, 'owners'))) then
      return jsonb_build_object('ok', false, 'code', 'owner');
    end if;
    update public.scd_requests set owner_position = v_value, updated_at = now() where id = r.id;
    insert into public.scd_request_events (organization_id, request_id, action, actor, note, notify_positions)
    values (p_organization_id, r.id, 'ASSEGNATA', auth.uid(), coalesce(v_note, 'Gestisce: ' || v_value),
      public.scd_request_notify(r.kind, r.site, 'ASSEGNATA', v_value));
    return jsonb_build_object('ok', true, 'status', r.status, 'owner', v_value);
  end if;

  if p_action = 'reclassify' then
    if r.kind <> 'ALTRO' or r.status not in ('RICEVUTA','IN_VALUTAZIONE') then return jsonb_build_object('ok', false, 'code', 'state'); end if;
    if v_value is null or v_value = 'ALTRO' or not (public.scd_intake_kinds() ? v_value) then
      return jsonb_build_object('ok', false, 'code', 'kind');
    end if;
    v_rules := public.scd_request_kind_rules(v_value);
    -- the new kind's own rules hold: a site where it is required, the requester type it accepts
    if (v_rules->>'siteRequired')::boolean and r.site is null then return jsonb_build_object('ok', false, 'code', 'site'); end if;
    if (v_value = 'ISCRIZIONE_TORNEO' and coalesce(r.payload->>'orgKind', '') <> 'SOCIETA')
       or (v_value in ('SPONSOR','CONVENZIONE') and coalesce(r.payload->>'orgKind', '') not in ('AZIENDA','ENTE')) then
      return jsonb_build_object('ok', false, 'code', 'orgKind');
    end if;
    update public.scd_requests set kind = v_value, area = v_rules->>'area', owner_position = null, updated_at = now() where id = r.id;
    insert into public.scd_request_events (organization_id, request_id, action, actor, note, notify_positions)
    values (p_organization_id, r.id, 'RICLASSIFICATA', auth.uid(), coalesce(v_note, 'Nuovo tipo: ' || v_value),
      public.scd_request_notify(v_value, r.site, 'RICLASSIFICATA', null));
    return jsonb_build_object('ok', true, 'status', r.status, 'kind', v_value);
  end if;

  v_to := case
    when p_action = 'take' and r.status = 'RICEVUTA' then 'IN_VALUTAZIONE'
    when p_action = 'accept' and r.status = 'IN_VALUTAZIONE' then 'ACCETTATA'
    when p_action = 'reject' and r.status = 'IN_VALUTAZIONE' then 'RIFIUTATA'
    when p_action = 'start' and r.status = 'ACCETTATA' then 'IN_GESTIONE'
    when p_action = 'close' and r.status = 'IN_GESTIONE' then 'CHIUSA'
    when p_action = 'cancel' and r.status = any(v_open) then 'ANNULLATA'
    else null end;
  if v_to is null then return jsonb_build_object('ok', false, 'code', 'state'); end if;
  if p_action in ('reject','cancel') and (v_note is null or char_length(v_note) < 3) then
    return jsonb_build_object('ok', false, 'code', 'reason');
  end if;
  v_event := v_to;

  update public.scd_requests set status = v_to, updated_at = now(),
    taken_at = case when v_to = 'IN_VALUTAZIONE' then now() else taken_at end,
    decided_at = case when v_to in ('ACCETTATA','RIFIUTATA') then now() else decided_at end,
    decided_by = case when v_to in ('ACCETTATA','RIFIUTATA') then auth.uid() else decided_by end,
    accepted_at = case when v_to = 'ACCETTATA' then now() else accepted_at end,
    closed_at = case when v_to in ('CHIUSA','RIFIUTATA','ANNULLATA') then now() else closed_at end,
    decision_note = case when v_to in ('ACCETTATA','RIFIUTATA','ANNULLATA') then coalesce(v_note, decision_note) else decision_note end,
    -- the payment status is cleared on cancellation (the check allows it only from ACCETTATA on); when one was
    -- recorded, the event below tells the Tesoreria in the app to void the link outside the app
    payment_status = case when v_to = 'ANNULLATA' then null else payment_status end
  where id = r.id;
  -- contacts kept only as long as needed: 6 months after a refusal or cancellation, 12 months after closing
  if v_to in ('RIFIUTATA','ANNULLATA') then
    update public.scd_request_contacts set purge_after = least(purge_after, now() + interval '6 months') where request_id = r.id;
  elsif v_to = 'CHIUSA' then
    update public.scd_request_contacts set purge_after = now() + interval '12 months' where request_id = r.id;
  end if;
  insert into public.scd_request_events (organization_id, request_id, action, actor, note, notify_positions)
  values (p_organization_id, r.id, v_event, auth.uid(),
    coalesce(v_note, case when v_to = 'ANNULLATA' and r.payment_status is not null then 'Pagamento annullato: verificare il link con la Tesoreria' end),
    public.scd_request_notify(r.kind, r.site, v_event, r.owner_position)
      || case when v_to = 'ANNULLATA' and r.payment_status is not null then array['tesoreria'] else array[]::text[] end);
  return jsonb_build_object('ok', true, 'status', v_to);
end;
$$;
revoke all on function public.scd_intake_decide(uuid, uuid, text, text, text) from public, anon;
grant execute on function public.scd_intake_decide(uuid, uuid, text, text, text) to authenticated;

-- ---------------------------------------------------------------- 9. payment (Tesoreria only, after acceptance)
-- Francesco 15:44 «Li crea la Tesoreria»: the person of the Tesoreria creates the link (SumUp or other) outside the
-- app and records it here; nothing is generated or sent by the app. Only the position tesoreria writes (not the
-- Direzione); amounts never reach notices. Payload {"status", "amountCents", "link"}.
create or replace function public.scd_intake_payment_set(p_organization_id uuid, p_request_id uuid, p jsonb)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  r public.scd_requests;
  v_status text := nullif(p->>'status', '');
  v_amount integer;
  v_link text := nullif(btrim(coalesce(p->>'link', '')), '');
  v_key text;
begin
  if auth.uid() is null or not public.scd_has_position(p_organization_id, array['tesoreria']) then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  if p is null or jsonb_typeof(p) <> 'object' then return jsonb_build_object('ok', false, 'code', 'invalid'); end if;
  for v_key in select jsonb_object_keys(p) loop
    if not (v_key = any(array['status','amountCents','link'])) then return jsonb_build_object('ok', false, 'code', 'field'); end if;
  end loop;
  select * into r from public.scd_requests where id = p_request_id and organization_id = p_organization_id and kind <> 'AMICHEVOLE' for update;
  if r.id is null then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  if r.status not in ('ACCETTATA','IN_GESTIONE','CHIUSA') then return jsonb_build_object('ok', false, 'code', 'state'); end if;
  if v_status is null or v_status not in ('NON_DOVUTO','DA_PAGARE','LINK_INVIATO','PAGATO_DA_RISCONTRARE','RISCONTRATO','ANNULLATO') then
    return jsonb_build_object('ok', false, 'code', 'invalid');
  end if;
  begin
    v_amount := nullif(p->>'amountCents', '')::integer;
  exception when others then
    return jsonb_build_object('ok', false, 'code', 'amount');
  end;
  if v_amount is not null and v_amount not between 0 and 10000000 then return jsonb_build_object('ok', false, 'code', 'amount'); end if;
  if v_link is not null then
    if not (public.scd_request_kind_rules(r.kind)->>'paymentLink')::boolean then return jsonb_build_object('ok', false, 'code', 'link_not_allowed'); end if;
    if char_length(v_link) > 300 or v_link !~ '^https://[A-Za-z0-9.-]+\.[A-Za-z]{2,}(/[^[:space:]]*)?$' then
      return jsonb_build_object('ok', false, 'code', 'link');
    end if;
  end if;
  if v_status = 'LINK_INVIATO' and v_link is null and r.payment_link is null then return jsonb_build_object('ok', false, 'code', 'link'); end if;
  if v_status in ('DA_PAGARE','LINK_INVIATO') and coalesce(v_amount, r.payment_amount_cents) is null then
    return jsonb_build_object('ok', false, 'code', 'amount');
  end if;
  update public.scd_requests set payment_status = v_status,
    payment_amount_cents = coalesce(v_amount, payment_amount_cents),
    payment_link = coalesce(v_link, payment_link),
    payment_set_by = auth.uid(), payment_set_at = now(), updated_at = now()
  where id = r.id;
  insert into public.scd_request_events (organization_id, request_id, action, actor, note, notify_positions)
  values (p_organization_id, r.id, 'PAGAMENTO', auth.uid(), 'Pagamento: ' || v_status,
    public.scd_request_notify(r.kind, r.site, 'PAGAMENTO', r.owner_position));
  return jsonb_build_object('ok', true, 'paymentStatus', v_status);
end;
$$;
revoke all on function public.scd_intake_payment_set(uuid, uuid, jsonb) from public, anon;
grant execute on function public.scd_intake_payment_set(uuid, uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------- 10. r133 reads: friendlies only
-- Same text as r133 plus `kind = 'AMICHEVOLE'`: the friendlies board, form and notices never show external requests.
create or replace function public.scd_requests_board(p_organization_id uuid)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
begin
  if not public.scd_request_viewer(p_organization_id) then raise exception 'forbidden' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(public.scd_request_json(r) order by r.created_at desc)
    from public.scd_requests r
    where r.organization_id = p_organization_id and r.kind = 'AMICHEVOLE'
      and (r.status in ('BOZZA','DA_CONFERMARE')
           or (r.status = 'CONFERMATA' and (r.form_status <> 'INVIATO' or r.calendar_copied_at is null))
           or r.updated_at > now() - interval '60 days')), '[]'::jsonb);
end;
$$;
revoke all on function public.scd_requests_board(uuid) from public, anon;
grant execute on function public.scd_requests_board(uuid) to authenticated;

create or replace function public.scd_request_form(p_organization_id uuid, p_request_id uuid)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
declare
  r public.scd_requests;
begin
  if not public.scd_request_viewer(p_organization_id) then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into r from public.scd_requests where id = p_request_id and organization_id = p_organization_id and kind = 'AMICHEVOLE';
  if r.id is null then return null; end if;
  return public.scd_request_json(r) || jsonb_build_object('organization',
    (select o.name from public.scd_organizations o where o.id = p_organization_id));
end;
$$;
revoke all on function public.scd_request_form(uuid, uuid) from public, anon;
grant execute on function public.scd_request_form(uuid, uuid) to authenticated;

create or replace function public.scd_request_notices(p_organization_id uuid)
returns jsonb language sql stable security definer set search_path to 'public' as $$
  select case when auth.uid() is null then '[]'::jsonb else coalesce((
    select jsonb_agg(jsonb_build_object('at', e.at, 'action', e.action, 'note', e.note, 'requestId', r.id,
      'teamKey', r.team_key, 'startsAt', r.proposed_starts_at, 'status', r.status,
      'opponent', coalesce((select c.name from public.scd_clubs c where c.id = r.opponent_club_id), r.opponent_text)) order by e.at desc)
    from (select * from public.scd_request_events
          where organization_id = p_organization_id and at > now() - interval '30 days'
          order by at desc limit 50) e
    join public.scd_requests r on r.id = e.request_id and r.kind = 'AMICHEVOLE'
    where public.scd_has_org_role(p_organization_id, array['DIRECTION']::public.scd_role[])
       or public.scd_has_position(p_organization_id, e.notify_positions)), '[]'::jsonb) end;
$$;
revoke all on function public.scd_request_notices(uuid) from public, anon;
grant execute on function public.scd_request_notices(uuid) to authenticated;

comment on table public.scd_request_contacts is 'r139: contact of an external request (adult referent, organisation, one e-mail or phone, privacy consent). Separate, purged, read only through scd_intake_contact (logged).';
comment on table public.scd_requests is 'r133 + r139: ONE catalogue of requests (UD-154 friendlies; UD-163 Vetrina richieste F1 external kinds). No minors, no health data.';

commit;
