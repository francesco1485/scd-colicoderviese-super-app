-- r142: «I miei documenti» — personal document drawer of every member (2026-10-17, chat PC range r130-r149).
-- STAGED: NOT APPLIED. Apply only after Francesco writes "applica r142". Never apply from an agent.
-- Target: SCD PULSE (ndevtxxijbcnskgysdit). Never on dfnwzwutvnwiitiffwvr.
-- Requires: r33 (scd_documents, scd_people, scd_families, scd_family_members, scd_athletes, scd_audit_events),
-- r35 (scd_has_org_role), r59 (scd_is_minor, scd_people.display_name/left_at, scd_person_consents),
-- r61 (scd_my_person_ids, scd_my_team_ids), r66 (scd_set_certificate), r74 (scd_has_position),
-- r95 (scd_comm_settings/threads/messages/recipients, scd_comm_offices, scd_comm_resolve_envelopes, scd_comm_audit).
-- A guard below stops the migration when a prerequisite is missing. pg_cron is created if missing (as r140).
--
-- Why (Francesco, 16/10/2026, project doc claude/SCD_MIA_AREA_FAMIGLIA_PIANO_2026-10-16.md):
--   * «ognuno deve poter mettere i suoi documenti o vedere quelli già disponibili e allegare altri se richiesti»:
--     upload from the app into the person's folder of the club Drive; Drive stays the archive, the app keeps an index.
--   * «voglio che vedano i documenti presenti e firmati sul modulo iscrizione»: /documenti signed in = own documents.
--   * «se c'è un documento scaduto deve accendersi una lampadina dentro e inviare la notifica via mail».
-- Engines: TEMPO (Segreteria stops chasing documents by phone/WhatsApp) and PERSONE (families see what is in order).
-- Measure: open requests and «in verifica» uploads per week (scd_doc_office_board counts), expired documents per day
-- (scd_doc_lamp totals, audited DOC_EXPIRY_RUN counts), days from request to approval (requests created_at ->
-- decided_at).
--
-- Live state: scd_documents exists and is EMPTY (VERIFIED by the coordinator 16/10/2026). Its shape here is taken
-- from r33/r34/r35/r85 (INFERRED equal to live: re-check before applying, read-only):
--   select column_name, data_type, is_nullable from information_schema.columns
--     where table_schema = 'public' and table_name = 'scd_documents' order by ordinal_position;
--   select policyname, permissive, cmd from pg_policies where tablename = 'scd_documents';
--   select count(*) from public.scd_documents;   -- expected 0
--
-- What it does
--   1. scd_documents: new nullable columns only (section, status, accepted_at, drive_file_id, file_name, mime_type,
--      size_bytes, sha256, request_id, uploaded_by, verified_by, verified_at, review_note). document_type is the kind
--      code (catalogue scd_doc_kinds(), mirrored in apps/superapp/src/lib/my-documents.ts); source_id/source_record_id
--      (r33) carry provenance (APP_UPLOAD, TALLY_VLAJNY, TALLY_PDEZNV, DRIVE_IMPORT); a partial unique index makes the
--      enrolment import idempotent.
--   2. READ TIGHTENING (the only non-additive statement): r33 policy "scd_documents_select_member" let every non-base
--      member read every row. Health, identity and ISEE documents must not be readable by mister/staff, so it is
--      replaced by "scd_documents_select_office" (Direzione and Segreteria roles). Members read through the functions
--      below. The table is empty, no app code reads it directly (VERIFIED by grep 17/10/2026).
--   3. scd_document_requests (aperta -> caricato_in_verifica -> approvato | rifiutato), scd_document_settings
--      (expiry mail switch, enrolment import mark), scd_document_notices (one expiry notice per person/kind/date/state).
--      RLS on, no policies, no grants: functions only.
--   4. Functions (SECURITY DEFINER, search_path fixed, audited in scd_audit_events with ids and counts only):
--      scd_my_documents, scd_doc_lamp, scd_doc_upload_target, scd_doc_register_upload, scd_doc_review,
--      scd_doc_request_create, scd_doc_office_board, scd_team_documents_ok, scd_doc_set_expiry_mail,
--      scd_doc_expiry_run (service/cron only).
--   Visibility: the caller sees themself and the minors of the families where they are guardian (unknown birth date =
--   minor, as r95); adults only themselves. Health and identity: person/guardians, Segreteria, Direzione. ISEE:
--   person/guardians, Segreteria, Tesoreria, Direzione. Mister/staff: one boolean «in regola» per athlete
--   (scd_team_documents_ok), never files or kinds. Families never receive Drive file ids.
--   Medical certificate: scd_athletes.medical_certificate_expires_at stays the single source of truth (manifest
--   medical_source_of_truth): approving an uploaded certificate calls r66 scd_set_certificate.
--   5. Expiry mail: daily pg_cron job 'scd_doc_expiry_notices' (06:05 UTC) runs scd_doc_expiry_run(). It queues mail
--      ONLY through the r95 Posta del club tables and only when ALL are true: gmail_connected, sending_enabled
--      (r95 switches) and scd_document_settings.expiry_mail_enabled (new switch, Direzione, default OFF). Recipients
--      come from scd_comm_resolve_envelopes (r95 minors rule: never a child under 14, guardians only; 14-17 with the
--      guardians in copy). Bodies are generic (no document type, no health data). Otherwise it queues nothing.
--
-- Rollback (only on Francesco's explicit order):
--   select cron.unschedule(jobid) from cron.job where jobname = 'scd_doc_expiry_notices';
--   drop function public.scd_doc_expiry_run(), public.scd_doc_set_expiry_mail(uuid, boolean),
--     public.scd_team_documents_ok(uuid), public.scd_doc_office_board(uuid, text),
--     public.scd_doc_request_create(uuid, uuid, text, text, date), public.scd_doc_review(uuid, uuid, text, date, text, text),
--     public.scd_doc_register_upload(uuid, uuid, text, uuid, text, text, text, integer, text),
--     public.scd_doc_upload_target(uuid, uuid, text, uuid), public.scd_doc_lamp(uuid), public.scd_my_documents(uuid),
--     public.scd_doc_due(uuid), public.scd_doc_circle(uuid), public.scd_doc_office_can(uuid, text), public.scd_doc_state(date),
--     public.scd_doc_kinds();
--   drop table public.scd_document_notices, public.scd_document_settings; (requests only if empty)
--   create policy "scd_documents_select_member" on public.scd_documents for select to authenticated
--     using (public.scd_is_org_member(organization_id));   -- restores the r33 read

begin;

do $$
begin
  if to_regclass('public.scd_documents') is null or to_regclass('public.scd_family_members') is null
     or to_regclass('public.scd_athletes') is null or to_regclass('public.scd_person_consents') is null
     or to_regprocedure('public.scd_my_person_ids(uuid)') is null
     or to_regprocedure('public.scd_my_team_ids(uuid)') is null
     or to_regprocedure('public.scd_is_minor(date)') is null
     or to_regprocedure('public.scd_set_certificate(uuid, uuid, date, text, boolean, text)') is null
     or to_regprocedure('public.scd_comm_offices(uuid)') is null
     or to_regprocedure('public.scd_comm_resolve_envelopes(uuid, jsonb)') is null
     or to_regclass('public.scd_comm_settings') is null or to_regclass('public.scd_comm_messages') is null then
    raise exception 'r142 prerequisites missing (r33, r59, r61, r66, r95)';
  end if;
end;
$$;

-- ------------------------------------------------------------------ 1. scd_documents: index columns
alter table public.scd_documents
  add column if not exists section text,
  add column if not exists status text,
  add column if not exists accepted_at timestamptz,
  add column if not exists drive_file_id text,
  add column if not exists file_name text,
  add column if not exists mime_type text,
  add column if not exists size_bytes integer,
  add column if not exists sha256 text,
  add column if not exists request_id uuid,
  add column if not exists uploaded_by uuid references auth.users(id) on delete set null,
  add column if not exists verified_by uuid references auth.users(id) on delete set null,
  add column if not exists verified_at timestamptz,
  add column if not exists review_note text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'scd_documents_r142_section_check') then
    alter table public.scd_documents add constraint scd_documents_r142_section_check
      check (section is null or section in ('FIRMATO','CONSEGNATO'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'scd_documents_r142_status_check') then
    alter table public.scd_documents add constraint scd_documents_r142_status_check
      check (status is null or status in ('ACCETTATO','CARICATO_IN_VERIFICA','APPROVATO','RIFIUTATO','SOSTITUITO'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'scd_documents_r142_file_check') then
    alter table public.scd_documents add constraint scd_documents_r142_file_check
      check ((drive_file_id is null or drive_file_id ~ '^[A-Za-z0-9_-]{10,200}$')
         and (file_name is null or length(file_name) <= 160)
         and (size_bytes is null or size_bytes between 1 and 10485760)
         and (sha256 is null or sha256 ~ '^[0-9a-f]{64}$')
         and (review_note is null or length(review_note) <= 300));
  end if;
end;
$$;

create index if not exists scd_documents_person_kind_idx on public.scd_documents (person_id, document_type, created_at desc);
create unique index if not exists scd_documents_source_record_uidx
  on public.scd_documents (organization_id, source_id, source_record_id) where source_record_id is not null;

-- ------------------------------------------------------------------ 2. read tightening
drop policy if exists "scd_documents_select_member" on public.scd_documents;
do $$ begin
  create policy "scd_documents_select_office" on public.scd_documents for select to authenticated
    using (public.scd_has_org_role(organization_id, array['DIRECTION','SECRETARIAT']::public.scd_role[]));
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------------------ 3. requests, settings, notices
create table if not exists public.scd_document_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  person_id uuid not null references public.scd_people(id) on delete cascade,
  doc_kind text not null,
  note text check (note is null or length(note) <= 300),
  due_date date,
  status text not null default 'APERTA' check (status in ('APERTA','CARICATO_IN_VERIFICA','APPROVATO','RIFIUTATO')),
  document_id uuid references public.scd_documents(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists scd_document_requests_person_idx on public.scd_document_requests (person_id, status);
create index if not exists scd_document_requests_org_idx on public.scd_document_requests (organization_id, status);
alter table public.scd_document_requests enable row level security;
revoke all on table public.scd_document_requests from anon, authenticated;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'scd_documents_r142_request_fk') then
    alter table public.scd_documents add constraint scd_documents_r142_request_fk
      foreign key (request_id) references public.scd_document_requests(id) on delete set null;
  end if;
end;
$$;

create table if not exists public.scd_document_settings (
  organization_id uuid primary key references public.scd_organizations(id) on delete cascade,
  expiry_mail_enabled boolean not null default false,
  enabled_by uuid references auth.users(id) on delete set null,
  enabled_at timestamptz,
  enrolment_import_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.scd_document_settings enable row level security;
revoke all on table public.scd_document_settings from anon, authenticated;
insert into public.scd_document_settings (organization_id)
select id from public.scd_organizations on conflict (organization_id) do nothing;

create table if not exists public.scd_document_notices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  person_id uuid not null references public.scd_people(id) on delete cascade,
  doc_kind text not null,
  expires_at date not null,
  state text not null check (state in ('IN_SCADENZA','SCADUTO')),
  outcome text not null check (outcome in ('IN_CODA','NESSUN_DESTINATARIO')),
  message_id uuid references public.scd_comm_messages(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (organization_id, person_id, doc_kind, expires_at, state)
);
alter table public.scd_document_notices enable row level security;
revoke all on table public.scd_document_notices from anon, authenticated;

-- ------------------------------------------------------------------ 4. catalogue and helpers
-- Kind catalogue. section FIRMATO = accepted on the enrolment form; CONSEGNATO = file delivered.
-- doc_class: FIRMA (acceptances), SANITARIO, IDENTITA, ECONOMICO. required: ATLETA (every athlete), ATLETA_MINORE
-- (athletes under 18 or unknown age), NO (only when present or requested). PROPOSED: the required set mirrors the
-- enrolment form as described by the Direzione; confirm with the Segreteria.
create or replace function public.scd_doc_kinds()
returns table (code text, section text, doc_class text, has_expiry boolean, required text)
language sql
immutable
set search_path to 'public'
as $$
  select * from (values
    ('INFORMATIVA_PRIVACY', 'FIRMATO', 'FIRMA', false, 'NO'),
    ('MOG_SAFEGUARDING', 'FIRMATO', 'FIRMA', false, 'NO'),
    ('REGOLAMENTO_CENTRO_SPORTIVO', 'FIRMATO', 'FIRMA', false, 'NO'),
    ('REGOLAMENTO_TRASFERTE', 'FIRMATO', 'FIRMA', false, 'NO'),
    ('CODICE_CONDOTTA_ATLETA', 'FIRMATO', 'FIRMA', false, 'NO'),
    ('CODICE_CONDOTTA_GENITORE', 'FIRMATO', 'FIRMA', false, 'NO'),
    ('LIBERATORIA_IMMAGINI', 'FIRMATO', 'FIRMA', false, 'NO'),
    ('DICHIARAZIONE_SOSTITUTIVA', 'FIRMATO', 'FIRMA', false, 'NO'),
    ('CONFERMA_QUOTA', 'FIRMATO', 'FIRMA', false, 'NO'),
    ('CONFERMA_PULMINO', 'FIRMATO', 'FIRMA', false, 'NO'),
    ('CONFERMA_ABBIGLIAMENTO', 'FIRMATO', 'FIRMA', false, 'NO'),
    ('CERTIFICATO_MEDICO', 'CONSEGNATO', 'SANITARIO', true, 'ATLETA'),
    ('DOC_IDENTITA_ATLETA_FRONTE', 'CONSEGNATO', 'IDENTITA', true, 'ATLETA'),
    ('DOC_IDENTITA_ATLETA_RETRO', 'CONSEGNATO', 'IDENTITA', false, 'ATLETA'),
    ('TESSERA_SANITARIA_FRONTE', 'CONSEGNATO', 'IDENTITA', true, 'ATLETA'),
    ('TESSERA_SANITARIA_RETRO', 'CONSEGNATO', 'IDENTITA', false, 'ATLETA'),
    ('PERMESSO_SOGGIORNO', 'CONSEGNATO', 'IDENTITA', true, 'NO'),
    ('FOTOTESSERA', 'CONSEGNATO', 'IDENTITA', false, 'ATLETA'),
    ('DOC_IDENTITA_GENITORE', 'CONSEGNATO', 'IDENTITA', true, 'ATLETA_MINORE'),
    ('DOC_IDENTITA_GENITORE_2', 'CONSEGNATO', 'IDENTITA', true, 'NO'),
    ('DOC_GIUSTIFICATIVO', 'CONSEGNATO', 'IDENTITA', false, 'NO'),
    ('DOC_DELEGATI_RITIRO', 'CONSEGNATO', 'IDENTITA', true, 'NO'),
    ('ATTESTAZIONE_ISEE', 'CONSEGNATO', 'ECONOMICO', true, 'NO')
  ) as k(code, section, doc_class, has_expiry, required);
$$;
revoke all on function public.scd_doc_kinds() from public, anon;
grant execute on function public.scd_doc_kinds() to authenticated;

-- In regola / in scadenza (<= 30 days) / scaduto, computed at query time on the Europe/Rome day (never stored).
create or replace function public.scd_doc_state(p_expires date)
returns text
language sql
stable
set search_path to 'public'
as $$
  select case
    when p_expires is null then 'IN_REGOLA'
    when p_expires < (now() at time zone 'Europe/Rome')::date then 'SCADUTO'
    when p_expires <= (now() at time zone 'Europe/Rome')::date + 30 then 'IN_SCADENZA'
    else 'IN_REGOLA' end;
$$;
revoke all on function public.scd_doc_state(date) from public, anon;
grant execute on function public.scd_doc_state(date) to authenticated;

-- Office access per document class, reusing the r95 office test (Direzione, Segreteria, Tesoreria).
create or replace function public.scd_doc_office_can(p_organization_id uuid, p_class text)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select case
    when p_class = 'ECONOMICO' then cardinality(public.scd_comm_offices(p_organization_id)) > 0
    when p_class in ('FIRMA','SANITARIO','IDENTITA') then public.scd_comm_offices(p_organization_id) && array['DIREZIONE','SEGRETERIA']
    else false end;
$$;
revoke all on function public.scd_doc_office_can(uuid, text) from public, anon;
grant execute on function public.scd_doc_office_can(uuid, text) to authenticated;

-- The caller's circle: themself, plus the minors (or unknown age) of the families where the caller is guardian.
create or replace function public.scd_doc_circle(p_organization_id uuid)
returns table (person_id uuid, relationship text)
language sql
stable
security definer
set search_path to 'public'
as $$
  with me as (select public.scd_my_person_ids(p_organization_id) as person_id)
  select distinct on (x.person_id) x.person_id, x.relationship
  from (
    select me.person_id, 'SELF'::text as relationship, 0 as rank from me
    union all
    select fm2.person_id, coalesce(fm2.relationship, 'FAMILY'), 1
    from me
    join public.scd_family_members fm on fm.person_id = me.person_id and fm.is_guardian
    join public.scd_families f on f.id = fm.family_id and f.organization_id = p_organization_id
    join public.scd_family_members fm2 on fm2.family_id = fm.family_id and fm2.person_id <> me.person_id
    join public.scd_people p on p.id = fm2.person_id and p.organization_id = p_organization_id
    where coalesce(public.scd_is_minor(p.birth_date), true)
  ) x
  join public.scd_people p on p.id = x.person_id and p.organization_id = p_organization_id and p.status <> 'ARCHIVED'
  order by x.person_id, x.rank;
$$;
revoke all on function public.scd_doc_circle(uuid) from public, anon, authenticated;

-- Expiring and expired documents of the whole club (internal): the certificate from scd_athletes (source of truth),
-- the other kinds from the latest APPROVATO row with an expiry.
create or replace function public.scd_doc_due(p_organization_id uuid)
returns table (person_id uuid, doc_kind text, expires_at date, state text)
language sql
stable
security definer
set search_path to 'public'
as $$
  select a.person_id, 'CERTIFICATO_MEDICO', a.medical_certificate_expires_at, public.scd_doc_state(a.medical_certificate_expires_at)
  from public.scd_athletes a
  join public.scd_people p on p.id = a.person_id and p.status = 'ACTIVE'
  where a.organization_id = p_organization_id and a.medical_certificate_expires_at is not null
    and public.scd_doc_state(a.medical_certificate_expires_at) <> 'IN_REGOLA'
  union all
  select d.person_id, d.document_type, d.expires_at, public.scd_doc_state(d.expires_at)
  from (
    select distinct on (d.person_id, d.document_type) d.*
    from public.scd_documents d
    where d.organization_id = p_organization_id and d.section = 'CONSEGNATO' and d.status = 'APPROVATO'
      and d.document_type <> 'CERTIFICATO_MEDICO' and d.person_id is not null
    order by d.person_id, d.document_type, d.verified_at desc nulls last, d.created_at desc
  ) d
  join public.scd_people p on p.id = d.person_id and p.status = 'ACTIVE'
  where d.expires_at is not null and public.scd_doc_state(d.expires_at) <> 'IN_REGOLA';
$$;
revoke all on function public.scd_doc_due(uuid) from public, anon, authenticated;

-- ------------------------------------------------------------------ 5. the drawer
-- One object for the caller: people of the circle with signed acceptances (A), delivered documents with status (B)
-- and open requests (C). No Drive ids, no file names of other people, no consents of other families.
create or replace function public.scd_my_documents(p_organization_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_import timestamptz;
  v_out jsonb;
begin
  if auth.uid() is null then return null; end if;
  select s.enrolment_import_at into v_import from public.scd_document_settings s where s.organization_id = p_organization_id;
  select coalesce(jsonb_agg(person order by (person->>'relationship') = 'SELF' desc, person->>'label'), '[]'::jsonb)
  into v_out
  from (
    select jsonb_build_object(
      'personId', p.id,
      'label', trim(p.first_name || ' ' || left(coalesce(p.last_name, ''), 1) || case when coalesce(p.last_name, '') <> '' then '.' else '' end),
      'relationship', c.relationship,
      'isMinor', public.scd_is_minor(p.birth_date),
      'isAthlete', a.id is not null,
      'signed', coalesce((
        select jsonb_agg(jsonb_build_object('kind', d.document_type, 'acceptedAt', d.accepted_at, 'source', d.source_id) order by d.document_type)
        from (select distinct on (d.document_type) d.* from public.scd_documents d
              where d.person_id = p.id and d.organization_id = p_organization_id and d.section = 'FIRMATO' and d.status = 'ACCETTATO'
              order by d.document_type, d.accepted_at desc nulls last) d), '[]'::jsonb),
      'consents', coalesce((
        select jsonb_agg(jsonb_build_object('type', pc.consent_type, 'granted', pc.granted, 'givenAt', pc.given_at) order by pc.consent_type)
        from (select distinct on (pc.consent_type) pc.* from public.scd_person_consents pc
              where pc.person_id = p.id and pc.revoked_at is null order by pc.consent_type, pc.given_at desc) pc), '[]'::jsonb),
      'delivered', coalesce((
        select jsonb_agg(x.item order by x.item->>'kind')
        from (
          select jsonb_build_object(
            'kind', k.code,
            'status', case
              when k.code = 'CERTIFICATO_MEDICO' and a.medical_certificate_expires_at is not null
                then public.scd_doc_state(a.medical_certificate_expires_at)
              when last_doc.status = 'CARICATO_IN_VERIFICA' and approved.id is null then 'IN_VERIFICA'
              when approved.id is not null then public.scd_doc_state(approved.expires_at)
              when last_doc.status = 'RIFIUTATO' then 'RIFIUTATO'
              when v_import is null then 'NON_COLLEGATO'
              else 'MANCANTE' end,
            'expiresAt', case when k.code = 'CERTIFICATO_MEDICO' then coalesce(a.medical_certificate_expires_at, approved.expires_at) else approved.expires_at end,
            'uploadedAt', last_doc.created_at,
            'pending', last_doc.status = 'CARICATO_IN_VERIFICA',
            'reviewNote', case when last_doc.status = 'RIFIUTATO' then last_doc.review_note end) as item
          from public.scd_doc_kinds() k
          left join lateral (select d.* from public.scd_documents d where d.person_id = p.id and d.organization_id = p_organization_id
                             and d.document_type = k.code and d.section = 'CONSEGNATO' and d.status <> 'SOSTITUITO'
                             order by d.created_at desc limit 1) last_doc on true
          left join lateral (select d.* from public.scd_documents d where d.person_id = p.id and d.organization_id = p_organization_id
                             and d.document_type = k.code and d.section = 'CONSEGNATO' and d.status = 'APPROVATO'
                             order by d.verified_at desc nulls last, d.created_at desc limit 1) approved on true
          where k.section = 'CONSEGNATO'
            and (last_doc.id is not null
                 or (k.code = 'CERTIFICATO_MEDICO' and a.medical_certificate_expires_at is not null)
                 or (k.required = 'ATLETA' and a.id is not null)
                 or (k.required = 'ATLETA_MINORE' and a.id is not null and coalesce(public.scd_is_minor(p.birth_date), true))
                 or exists (select 1 from public.scd_document_requests r where r.person_id = p.id and r.doc_kind = k.code
                            and r.status in ('APERTA','CARICATO_IN_VERIFICA','RIFIUTATO')))
        ) x), '[]'::jsonb),
      'requests', coalesce((
        select jsonb_agg(jsonb_build_object('id', r.id, 'kind', r.doc_kind, 'note', r.note, 'due', r.due_date, 'status', r.status,
                                            'createdAt', r.created_at) order by r.created_at desc)
        from public.scd_document_requests r
        where r.person_id = p.id and r.organization_id = p_organization_id
          and (r.status in ('APERTA','CARICATO_IN_VERIFICA','RIFIUTATO') or r.decided_at > now() - interval '30 days')), '[]'::jsonb)
    ) as person
    from public.scd_doc_circle(p_organization_id) c
    join public.scd_people p on p.id = c.person_id
    left join public.scd_athletes a on a.person_id = p.id and a.organization_id = p_organization_id
  ) s;
  return jsonb_build_object('importDone', v_import is not null, 'people', v_out);
end;
$$;
revoke all on function public.scd_my_documents(uuid) from public, anon;
grant execute on function public.scd_my_documents(uuid) to authenticated;

-- The «lampadina»: expired / expiring documents and open requests of the caller's circle.
create or replace function public.scd_doc_lamp(p_organization_id uuid)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  with c as (select person_id from public.scd_doc_circle(p_organization_id)),
  due as (select d.* from public.scd_doc_due(p_organization_id) d where d.person_id in (select person_id from c))
  select jsonb_build_object(
    'expired', (select count(*) from due where state = 'SCADUTO'),
    'expiring', (select count(*) from due where state = 'IN_SCADENZA'),
    'requests', (select count(*) from public.scd_document_requests r
                 where r.organization_id = p_organization_id and r.person_id in (select person_id from c)
                   and r.status in ('APERTA','RIFIUTATO')),
    'total', (select count(*) from due) + (select count(*) from public.scd_document_requests r
                 where r.organization_id = p_organization_id and r.person_id in (select person_id from c)
                   and r.status in ('APERTA','RIFIUTATO')))
  where auth.uid() is not null;
$$;
revoke all on function public.scd_doc_lamp(uuid) from public, anon;
grant execute on function public.scd_doc_lamp(uuid) to authenticated;

-- ------------------------------------------------------------------ 6. upload
-- Before the server sends a file to the Drive: may the caller upload this kind for this person? Returns the folder hint
-- (Cognome_Nome, as the Make scenarios name the folders) to the SERVER only (the UI never shows it).
create or replace function public.scd_doc_upload_target(p_organization_id uuid, p_person_id uuid, p_kind text, p_request_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_class text;
  v_section text;
  v_p public.scd_people%rowtype;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'code', 'NOT_ALLOWED'); end if;
  select k.doc_class, k.section into v_class, v_section from public.scd_doc_kinds() k where k.code = p_kind;
  if v_class is null or v_section <> 'CONSEGNATO' then return jsonb_build_object('ok', false, 'code', 'BAD_KIND'); end if;
  select * into v_p from public.scd_people p where p.id = p_person_id and p.organization_id = p_organization_id;
  if not found then return jsonb_build_object('ok', false, 'code', 'NOT_ALLOWED'); end if;
  if not (exists (select 1 from public.scd_doc_circle(p_organization_id) c where c.person_id = p_person_id)
          or public.scd_doc_office_can(p_organization_id, v_class)) then
    return jsonb_build_object('ok', false, 'code', 'NOT_ALLOWED');
  end if;
  if p_request_id is not null and not exists (select 1 from public.scd_document_requests r where r.id = p_request_id
       and r.person_id = p_person_id and r.doc_kind = p_kind and r.status in ('APERTA','RIFIUTATO')) then
    return jsonb_build_object('ok', false, 'code', 'REQUEST_CLOSED');
  end if;
  return jsonb_build_object('ok', true,
    'folderHint', regexp_replace(initcap(coalesce(v_p.last_name, '')) || '_' || initcap(coalesce(v_p.first_name, '')), '[^A-Za-zÀ-ÿ_''-]+', '', 'g'),
    'personRef', v_p.id);
end;
$$;
revoke all on function public.scd_doc_upload_target(uuid, uuid, text, uuid) from public, anon;
grant execute on function public.scd_doc_upload_target(uuid, uuid, text, uuid) to authenticated;

-- After the server stored the file on the Drive: index it (status CARICATO_IN_VERIFICA) and move the request.
create or replace function public.scd_doc_register_upload(
  p_organization_id uuid, p_person_id uuid, p_kind text, p_request_id uuid,
  p_drive_file_id text, p_file_name text, p_mime text, p_size integer, p_sha256 text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_target jsonb := public.scd_doc_upload_target(p_organization_id, p_person_id, p_kind, p_request_id);
  v_request uuid := p_request_id;
  v_id uuid;
  v_today_count integer;
begin
  if not coalesce((v_target->>'ok')::boolean, false) then return jsonb_build_object('ok', false, 'code', v_target->>'code'); end if;
  if p_drive_file_id is null or p_drive_file_id !~ '^[A-Za-z0-9_-]{10,200}$' then return jsonb_build_object('ok', false, 'code', 'BAD_FILE'); end if;
  if p_mime not in ('application/pdf','image/jpeg','image/png','image/heic') then return jsonb_build_object('ok', false, 'code', 'BAD_FILE'); end if;
  if p_size is null or p_size not between 1 and 10485760 then return jsonb_build_object('ok', false, 'code', 'BAD_FILE'); end if;
  if p_sha256 is not null and p_sha256 !~ '^[0-9a-f]{64}$' then return jsonb_build_object('ok', false, 'code', 'BAD_FILE'); end if;
  select count(*) into v_today_count from public.scd_documents d
  where d.uploaded_by = auth.uid() and d.created_at > now() - interval '1 day';
  if v_today_count >= 30 then return jsonb_build_object('ok', false, 'code', 'TOO_MANY'); end if;
  if v_request is null then
    select r.id into v_request from public.scd_document_requests r
    where r.person_id = p_person_id and r.organization_id = p_organization_id and r.doc_kind = p_kind and r.status in ('APERTA','RIFIUTATO')
    order by r.created_at desc limit 1;
  end if;
  insert into public.scd_documents (organization_id, person_id, document_type, title, visibility, source_id, source_record_id,
    section, status, drive_file_id, file_name, mime_type, size_bytes, sha256, request_id, uploaded_by)
  values (p_organization_id, p_person_id, p_kind, p_kind, 'FAMILY', 'APP_UPLOAD', null,
    'CONSEGNATO', 'CARICATO_IN_VERIFICA', p_drive_file_id, left(p_file_name, 160), p_mime, p_size, p_sha256, v_request, auth.uid())
  returning id into v_id;
  if v_request is not null then
    update public.scd_document_requests set status = 'CARICATO_IN_VERIFICA', document_id = v_id, updated_at = now() where id = v_request;
  end if;
  insert into public.scd_audit_events (organization_id, actor_user_id, action, entity_type, entity_id, payload)
  values (p_organization_id, auth.uid(), 'DOC_UPLOADED', 'scd_documents', v_id,
          jsonb_build_object('kind', p_kind, 'requestId', v_request, 'size', p_size));
  return jsonb_build_object('ok', true, 'documentId', v_id);
end;
$$;
revoke all on function public.scd_doc_register_upload(uuid, uuid, text, uuid, text, text, text, integer, text) from public, anon;
grant execute on function public.scd_doc_register_upload(uuid, uuid, text, uuid, text, text, text, integer, text) to authenticated;

-- ------------------------------------------------------------------ 7. Segreteria
-- Approve or reject an upload. Certificate approval writes the expiry through r66 scd_set_certificate.
create or replace function public.scd_doc_review(
  p_organization_id uuid, p_document_id uuid, p_decision text, p_expires_at date, p_cert_kind text, p_note text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_d public.scd_documents%rowtype;
  v_class text;
  v_expiry boolean;
  v_athlete uuid;
  v_note text := nullif(left(trim(coalesce(p_note, '')), 300), '');
begin
  select * into v_d from public.scd_documents d where d.id = p_document_id and d.organization_id = p_organization_id for update;
  if not found or v_d.section is distinct from 'CONSEGNATO' then return jsonb_build_object('ok', false, 'code', 'NOT_FOUND'); end if;
  select k.doc_class, k.has_expiry into v_class, v_expiry from public.scd_doc_kinds() k where k.code = v_d.document_type;
  if v_class is null or not public.scd_doc_office_can(p_organization_id, v_class) then
    return jsonb_build_object('ok', false, 'code', 'NOT_ALLOWED');
  end if;
  if v_d.status <> 'CARICATO_IN_VERIFICA' then return jsonb_build_object('ok', false, 'code', 'NOT_PENDING'); end if;
  if p_decision = 'RIFIUTA' then
    if v_note is null then return jsonb_build_object('ok', false, 'code', 'NOTE_REQUIRED'); end if;
    update public.scd_documents set status = 'RIFIUTATO', review_note = v_note, verified_by = auth.uid(), verified_at = now(), updated_at = now()
    where id = v_d.id;
    update public.scd_document_requests set status = 'RIFIUTATO', decided_by = auth.uid(), decided_at = now(), updated_at = now()
    where id = v_d.request_id;
  elsif p_decision = 'APPROVA' then
    if v_d.document_type = 'CERTIFICATO_MEDICO' and p_expires_at is null then
      return jsonb_build_object('ok', false, 'code', 'EXPIRY_REQUIRED');
    end if;
    if p_expires_at is not null and (p_expires_at < current_date - interval '3 years' or p_expires_at > current_date + interval '12 years') then
      return jsonb_build_object('ok', false, 'code', 'BAD_DATE');
    end if;
    if v_d.document_type = 'CERTIFICATO_MEDICO' then
      if p_cert_kind is not null and p_cert_kind not in ('AGONISTICO','NON_AGONISTICO') then
        return jsonb_build_object('ok', false, 'code', 'BAD_KIND');
      end if;
      select a.id into v_athlete from public.scd_athletes a where a.person_id = v_d.person_id and a.organization_id = p_organization_id;
      if v_athlete is not null then
        if not public.scd_has_org_role(p_organization_id, array['DIRECTION','SECRETARIAT']::public.scd_role[]) then
          return jsonb_build_object('ok', false, 'code', 'CERT_ROLE');
        end if;
        perform public.scd_set_certificate(p_organization_id, v_athlete, p_expires_at, p_cert_kind, true, 'r142 upload verified');
      end if;
    end if;
    update public.scd_documents set status = 'SOSTITUITO', updated_at = now()
    where person_id = v_d.person_id and organization_id = p_organization_id and document_type = v_d.document_type
      and section = 'CONSEGNATO' and status = 'APPROVATO' and id <> v_d.id;
    update public.scd_documents set status = 'APPROVATO', expires_at = case when v_expiry then p_expires_at end, review_note = v_note,
      verified_by = auth.uid(), verified_at = now(), updated_at = now()
    where id = v_d.id;
    update public.scd_document_requests set status = 'APPROVATO', decided_by = auth.uid(), decided_at = now(), updated_at = now()
    where id = v_d.request_id;
  else
    return jsonb_build_object('ok', false, 'code', 'BAD_DECISION');
  end if;
  insert into public.scd_audit_events (organization_id, actor_user_id, action, entity_type, entity_id, payload)
  values (p_organization_id, auth.uid(), case when p_decision = 'APPROVA' then 'DOC_APPROVED' else 'DOC_REJECTED' end, 'scd_documents', v_d.id,
          jsonb_build_object('kind', v_d.document_type, 'requestId', v_d.request_id, 'hasExpiry', p_expires_at is not null));
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.scd_doc_review(uuid, uuid, text, date, text, text) from public, anon;
grant execute on function public.scd_doc_review(uuid, uuid, text, date, text, text) to authenticated;

-- Ask a person (their family) for a document. One open request per person and kind.
create or replace function public.scd_doc_request_create(p_organization_id uuid, p_person_id uuid, p_kind text, p_note text, p_due date)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_class text;
  v_section text;
  v_id uuid;
begin
  select k.doc_class, k.section into v_class, v_section from public.scd_doc_kinds() k where k.code = p_kind;
  if v_class is null or v_section <> 'CONSEGNATO' then return jsonb_build_object('ok', false, 'code', 'BAD_KIND'); end if;
  if not public.scd_doc_office_can(p_organization_id, v_class) then return jsonb_build_object('ok', false, 'code', 'NOT_ALLOWED'); end if;
  if not exists (select 1 from public.scd_people p where p.id = p_person_id and p.organization_id = p_organization_id and p.status <> 'ARCHIVED') then
    return jsonb_build_object('ok', false, 'code', 'PERSON_NOT_FOUND');
  end if;
  if p_due is not null and (p_due < (now() at time zone 'Europe/Rome')::date or p_due > (now() at time zone 'Europe/Rome')::date + 365) then
    return jsonb_build_object('ok', false, 'code', 'BAD_DATE');
  end if;
  select r.id into v_id from public.scd_document_requests r
  where r.person_id = p_person_id and r.organization_id = p_organization_id and r.doc_kind = p_kind
    and r.status in ('APERTA','CARICATO_IN_VERIFICA','RIFIUTATO');
  if v_id is not null then return jsonb_build_object('ok', true, 'requestId', v_id, 'existing', true); end if;
  insert into public.scd_document_requests (organization_id, person_id, doc_kind, note, due_date, created_by)
  values (p_organization_id, p_person_id, p_kind, nullif(left(trim(coalesce(p_note, '')), 300), ''), p_due, auth.uid())
  returning id into v_id;
  insert into public.scd_audit_events (organization_id, actor_user_id, action, entity_type, entity_id, payload)
  values (p_organization_id, auth.uid(), 'DOC_REQUESTED', 'scd_document_requests', v_id, jsonb_build_object('kind', p_kind, 'due', p_due));
  return jsonb_build_object('ok', true, 'requestId', v_id, 'existing', false);
end;
$$;
revoke all on function public.scd_doc_request_create(uuid, uuid, text, text, date) from public, anon;
grant execute on function public.scd_doc_request_create(uuid, uuid, text, text, date) to authenticated;

-- Office board: uploads to verify, open requests, expiry counts and (with p_q of 2+ letters) people to ask.
-- Each row only for the classes the caller may handle (Tesoreria: ISEE only).
create or replace function public.scd_doc_office_board(p_organization_id uuid, p_q text)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_q text := nullif(trim(coalesce(p_q, '')), '');
  v_classes text[];
begin
  select array_agg(c) into v_classes from unnest(array['FIRMA','SANITARIO','IDENTITA','ECONOMICO']) c
  where public.scd_doc_office_can(p_organization_id, c);
  if v_classes is null then return null; end if;
  return jsonb_build_object(
    'classes', to_jsonb(v_classes),
    'expiryMail', (select jsonb_build_object('enabled', s.expiry_mail_enabled, 'enabledAt', s.enabled_at, 'importDone', s.enrolment_import_at is not null)
                   from public.scd_document_settings s where s.organization_id = p_organization_id),
    'canSwitchMail', 'DIREZIONE' = any(public.scd_comm_offices(p_organization_id)),
    'toVerify', coalesce((select jsonb_agg(jsonb_build_object('id', d.id, 'personId', d.person_id, 'label', p.display_name,
        'kind', d.document_type, 'uploadedAt', d.created_at, 'fileName', d.file_name, 'driveFileId', d.drive_file_id,
        'requestId', d.request_id, 'isAthlete', exists (select 1 from public.scd_athletes a where a.person_id = d.person_id)) order by d.created_at)
      from public.scd_documents d join public.scd_people p on p.id = d.person_id
      join public.scd_doc_kinds() k on k.code = d.document_type
      where d.organization_id = p_organization_id and d.status = 'CARICATO_IN_VERIFICA' and k.doc_class = any(v_classes)), '[]'::jsonb),
    'requests', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'personId', r.person_id, 'label', p.display_name, 'kind', r.doc_kind,
        'note', r.note, 'due', r.due_date, 'status', r.status, 'createdAt', r.created_at) order by r.created_at desc)
      from public.scd_document_requests r join public.scd_people p on p.id = r.person_id
      join public.scd_doc_kinds() k on k.code = r.doc_kind
      where r.organization_id = p_organization_id and r.status in ('APERTA','CARICATO_IN_VERIFICA','RIFIUTATO') and k.doc_class = any(v_classes)), '[]'::jsonb),
    'due', (select jsonb_build_object('expired', count(*) filter (where d.state = 'SCADUTO'), 'expiring', count(*) filter (where d.state = 'IN_SCADENZA'))
            from public.scd_doc_due(p_organization_id) d join public.scd_doc_kinds() k on k.code = d.doc_kind where k.doc_class = any(v_classes)),
    'people', case when v_q is null or length(v_q) < 2 then '[]'::jsonb else coalesce((select jsonb_agg(x order by x->>'label') from (
        select jsonb_build_object('id', p.id, 'label', p.display_name,
          'isAthlete', exists (select 1 from public.scd_athletes a where a.person_id = p.id)) as x
        from public.scd_people p
        where p.organization_id = p_organization_id and p.status in ('ACTIVE','PENDING') and p.display_name ilike '%' || v_q || '%'
        order by p.display_name limit 15) s), '[]'::jsonb) end
  );
end;
$$;
revoke all on function public.scd_doc_office_board(uuid, text) from public, anon;
grant execute on function public.scd_doc_office_board(uuid, text) to authenticated;

-- Mister and team staff: one boolean per athlete of their teams. Never kinds, dates or files; ISEE never counted.
-- in_regola is null while the enrolment import has not run (unknown is not "in regola" and not "missing").
create or replace function public.scd_team_documents_ok(p_organization_id uuid)
returns table (team_id uuid, person_id uuid, in_regola boolean)
language sql
stable
security definer
set search_path to 'public'
as $$
  select tm.team_id, a.person_id,
    case
      when public.scd_doc_state(a.medical_certificate_expires_at) = 'SCADUTO' then false
      when exists (select 1 from public.scd_doc_due(p_organization_id) d where d.person_id = a.person_id and d.state = 'SCADUTO'
                     and d.doc_kind <> 'ATTESTAZIONE_ISEE') then false
      when (select s.enrolment_import_at from public.scd_document_settings s where s.organization_id = p_organization_id) is null then null
      when a.medical_certificate_expires_at is null then false
      when exists (select 1 from public.scd_doc_kinds() k
                   where (k.required = 'ATLETA' or (k.required = 'ATLETA_MINORE' and coalesce(public.scd_is_minor(p.birth_date), true)))
                     and not exists (select 1 from public.scd_documents d where d.person_id = a.person_id and d.document_type = k.code
                                     and d.status = 'APPROVATO')
                     and k.code <> 'CERTIFICATO_MEDICO') then false
      else true end
  from public.scd_team_memberships tm
  join public.scd_athletes a on a.id = tm.athlete_id
  join public.scd_people p on p.id = a.person_id and p.status <> 'ARCHIVED'
  where tm.team_id in (select public.scd_my_team_ids(p_organization_id))
    and (tm.valid_to is null or tm.valid_to >= current_date);
$$;
revoke all on function public.scd_team_documents_ok(uuid) from public, anon;
grant execute on function public.scd_team_documents_ok(uuid) to authenticated;

-- Direzione switch of the expiry mails (default OFF). Mails leave only if the r95 switches are also on.
create or replace function public.scd_doc_set_expiry_mail(p_organization_id uuid, p_enabled boolean)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_before boolean;
begin
  if not ('DIREZIONE' = any(public.scd_comm_offices(p_organization_id))) then return jsonb_build_object('ok', false, 'code', 'NOT_ALLOWED'); end if;
  insert into public.scd_document_settings (organization_id) values (p_organization_id) on conflict (organization_id) do nothing;
  select s.expiry_mail_enabled into v_before from public.scd_document_settings s where s.organization_id = p_organization_id for update;
  update public.scd_document_settings set expiry_mail_enabled = coalesce(p_enabled, false),
    enabled_by = case when p_enabled then auth.uid() else enabled_by end,
    enabled_at = case when p_enabled then now() else enabled_at end, updated_at = now()
  where organization_id = p_organization_id;
  insert into public.scd_audit_events (organization_id, actor_user_id, action, entity_type, entity_id, payload)
  values (p_organization_id, auth.uid(), 'DOC_EXPIRY_MAIL_TOGGLED', 'scd_document_settings', null,
          jsonb_build_object('from', v_before, 'to', coalesce(p_enabled, false)));
  return jsonb_build_object('ok', true, 'enabled', coalesce(p_enabled, false));
end;
$$;
revoke all on function public.scd_doc_set_expiry_mail(uuid, boolean) from public, anon;
grant execute on function public.scd_doc_set_expiry_mail(uuid, boolean) to authenticated;

-- ------------------------------------------------------------------ 8. daily expiry notices (service / cron only)
-- One generic mail per person per run for documents not yet noticed in the same state. Queued in the r95 outbox only
-- when gmail_connected AND sending_enabled AND expiry_mail_enabled; the sender of record is the Direzione user who
-- turned the expiry mails on. Recipients from scd_comm_resolve_envelopes (no child under 14, guardians only).
create or replace function public.scd_doc_expiry_run()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_org record;
  v_person record;
  v_thread uuid;
  v_msg uuid;
  v_count integer;
  v_queued integer := 0;
  v_none integer := 0;
  v_pending integer;
  v_out jsonb := '[]'::jsonb;
  v_audience jsonb;
  v_name text;
begin
  for v_org in
    select o.id, coalesce(s.expiry_mail_enabled, false) and coalesce(cs.sending_enabled, false) and coalesce(cs.gmail_connected, false)
             and s.enabled_by is not null as can_send,
           s.enabled_by, cs.mailbox
    from public.scd_organizations o
    left join public.scd_document_settings s on s.organization_id = o.id
    left join public.scd_comm_settings cs on cs.organization_id = o.id
  loop
    select count(*) into v_pending from public.scd_doc_due(v_org.id) d
    where not exists (select 1 from public.scd_document_notices n where n.organization_id = v_org.id and n.person_id = d.person_id
                      and n.doc_kind = d.doc_kind and n.expires_at = d.expires_at and n.state = d.state);
    if not v_org.can_send or v_pending = 0 then
      insert into public.scd_audit_events (organization_id, actor_user_id, action, entity_type, entity_id, payload)
      values (v_org.id, null, 'DOC_EXPIRY_RUN', 'scd_document_notices', null,
              jsonb_build_object('pending', v_pending, 'sending', v_org.can_send, 'queued', 0));
      v_out := v_out || jsonb_build_object('org', v_org.id, 'pending', v_pending, 'sending', v_org.can_send, 'queued', 0);
      continue;
    end if;
    v_queued := 0; v_none := 0;
    for v_person in
      select d.person_id, count(*) as n
      from public.scd_doc_due(v_org.id) d
      where not exists (select 1 from public.scd_document_notices n where n.organization_id = v_org.id and n.person_id = d.person_id
                        and n.doc_kind = d.doc_kind and n.expires_at = d.expires_at and n.state = d.state)
      group by d.person_id
      order by d.person_id
      limit 200
    loop
      v_audience := jsonb_build_object('kind', 'PERSON', 'personId', v_person.person_id);
      select p.first_name into v_name from public.scd_people p where p.id = v_person.person_id;
      select count(*) into v_count from public.scd_comm_resolve_envelopes(v_org.id, v_audience) e where e.excluded_reason is null;
      if v_count = 0 then
        insert into public.scd_document_notices (organization_id, person_id, doc_kind, expires_at, state, outcome)
        select v_org.id, d.person_id, d.doc_kind, d.expires_at, d.state, 'NESSUN_DESTINATARIO'
        from public.scd_doc_due(v_org.id) d where d.person_id = v_person.person_id
        on conflict do nothing;
        v_none := v_none + 1;
        continue;
      end if;
      insert into public.scd_comm_threads (organization_id, channel, subject, confidentiality, office, counterpart_kind,
        counterpart_person_id, counterpart_label, audience, created_by)
      values (v_org.id, 'EMAIL', 'Documenti da rinnovare', 'ORDINARIO', 'SEGRETERIA', 'PERSON', v_person.person_id,
        'Avviso documenti', v_audience, v_org.enabled_by)
      returning id into v_thread;
      insert into public.scd_comm_messages (organization_id, thread_id, direction, sender_user_id, sender_office, subject, body_text,
        audience, delivery, queued_at, queued_by, from_address)
      values (v_org.id, v_thread, 'OUT', v_org.enabled_by, 'SEGRETERIA', 'Documenti da rinnovare',
        'Buongiorno,' || chr(10) || chr(10) || 'nell''area «I miei documenti» dell''app S.C.D. ColicoDerviese ci sono '
          || v_person.n || ' documenti scaduti o in scadenza' || coalesce(' per ' || nullif(trim(v_name), ''), '') || '.' || chr(10)
          || 'Apri l''app (La mia SCD, Documenti) per vedere quali e caricare quelli nuovi.' || chr(10) || chr(10)
          || 'Segreteria S.C.D. ColicoDerviese',
        v_audience, 'QUEUED', now(), v_org.enabled_by, v_org.mailbox)
      returning id into v_msg;
      insert into public.scd_comm_recipients (organization_id, message_id, seq, kind, email, cc_emails, label, person_id,
        family_id, contact_id, guardian_for_person_id, status)
      select v_org.id, v_msg, e.seq, e.kind, e.email, e.cc, e.label, e.person_id, e.family_id, e.contact_id, e.guardian_for_person_id, 'QUEUED'
      from public.scd_comm_resolve_envelopes(v_org.id, v_audience) e
      where e.excluded_reason is null
      on conflict (message_id, email) do nothing;
      get diagnostics v_count = row_count;
      update public.scd_comm_messages set recipients_count = v_count,
        to_addresses = (select coalesce(array_agg(r.email order by r.seq), '{}') from public.scd_comm_recipients r where r.message_id = v_msg)
      where id = v_msg;
      insert into public.scd_document_notices (organization_id, person_id, doc_kind, expires_at, state, outcome, message_id)
      select v_org.id, d.person_id, d.doc_kind, d.expires_at, d.state, 'IN_CODA', v_msg
      from public.scd_doc_due(v_org.id) d where d.person_id = v_person.person_id
      on conflict do nothing;
      v_queued := v_queued + 1;
    end loop;
    insert into public.scd_audit_events (organization_id, actor_user_id, action, entity_type, entity_id, payload)
    values (v_org.id, null, 'DOC_EXPIRY_RUN', 'scd_document_notices', null,
            jsonb_build_object('pending', v_pending, 'sending', true, 'queued', v_queued, 'noRecipient', v_none));
    v_out := v_out || jsonb_build_object('org', v_org.id, 'pending', v_pending, 'sending', true, 'queued', v_queued, 'noRecipient', v_none);
  end loop;
  return v_out;
end;
$$;
revoke all on function public.scd_doc_expiry_run() from public, anon, authenticated;

-- >>> r142 cron (PGlite tests skip this block: PGlite has no pg_cron)
do $$
begin
  if not exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    raise exception 'r142: pg_cron not available on this server';
  end if;
end;
$$;

create extension if not exists pg_cron with schema pg_catalog;

do $$
declare
  v_job record;
begin
  for v_job in select jobid from cron.job where jobname = 'scd_doc_expiry_notices' loop
    perform cron.unschedule(v_job.jobid);
  end loop;
  perform cron.schedule('scd_doc_expiry_notices', '5 6 * * *', 'select public.scd_doc_expiry_run();');
  if (select count(*) from cron.job where jobname = 'scd_doc_expiry_notices') <> 1 then
    raise exception 'r142: job scd_doc_expiry_notices not scheduled exactly once';
  end if;
end;
$$;
-- <<< r142 cron

comment on table public.scd_document_requests is 'r142: documents asked by the Segreteria to a person (family). Functions only.';
comment on table public.scd_document_notices is 'r142: one expiry notice per person/kind/expiry/state; mails only through the r95 outbox.';
comment on function public.scd_my_documents(uuid) is 'r142: «I miei documenti» of the caller and of the minors they are guardian of.';

commit;
