-- APPLIED to project ndevtxxijbcnskgysdit (SCD PULSE) on 2026-10-13 as two migrations with the same statements:
-- "r95_comm_hub_core" (tables, helpers, RLS, minors rule, drafts, queue, thread controls) and
-- "r95_comm_hub_service_and_verify" (contacts, reads, service-only functions, verification DO block: passed).
-- Locally tested on a PostgreSQL 16 stub of the live schema with invented data (69 functional checks).
--
-- r95: Club communication hub "Posta del club" (Direzione 13/10/2026 08:26, UD-101 CLUB_COMMUNICATION_HUB).
--
-- Direzione, Segreteria and Tesoreria work from the web app instead of Gmail: one message to a group becomes one
-- individual e-mail per recipient sent FROM the club mailbox (sportclubcolico@gmail.com, Reply-To the same), recorded
-- with the staff user who sent it; replies and new mails come back into the same thread, matched to the person or
-- contact by address. Unknown senders become "nuovo contatto" proposals that a person accepts, links or discards.
--
-- Scope and safety
--   * Additive only: five new tables and new functions. No existing table, role, permission or policy changes.
--   * No parallel CRM: people/families come from scd_people / scd_families / scd_family_members; the only new contact
--     table (scd_comm_external_contacts) holds addresses that are not people of the club (sponsors, suppliers,
--     institutions, anyone else), tagged with the counterpart kind and the key of the existing register
--     (supplier_key of scd_supplier_positions, sponsor_source_record_id of scd_social_sponsor_deals).
--   * Minors rule enforced here (scd_comm_resolve_core / scd_comm_resolve_envelopes): no recipient under 14; under 18
--     the e-mail goes to the family's guardians; a 14-17 athlete is written to only with the guardians in copy;
--     unknown birth date = treated as a minor (guardians only). Addresses that belong only to children under 14
--     are never used, whatever audience produced them.
--   * Sending is OFF until the Direzione connects Gmail (gmail_connected, set by the server sync after a verified
--     token exchange) AND turns on sending_enabled. scd_comm_queue refuses with SENDING_DISABLED otherwise.
--   * Readers: Direzione, Segreteria, Tesoreria (same office test as scd_fee_office). RISERVATO threads: Direzione +
--     the owning office only. Writes only through the SECURITY DEFINER functions below; every call is audited in
--     scd_audit_events (counts and ids only, never message bodies).
--   * Safeguarding never transits here: inbound mail whose subject mentions safeguarding is refused, and drafts with
--     such a subject are refused (it has its own isolated channel, manifest communications.safeguarding).
--   * Service-only functions (outbox claim, delivery marks, inbound record, sync checkpoint) are revoked from
--     anon/authenticated and called by the server sync with the service key.

create table if not exists public.scd_comm_settings (
  organization_id uuid primary key references public.scd_organizations(id),
  mailbox text not null default 'sportclubcolico@gmail.com',
  sending_enabled boolean not null default false,
  daily_cap integer not null default 400 check (daily_cap between 1 and 500),
  gmail_connected boolean not null default false,
  connected_at timestamptz,
  history_id text,
  last_sync_at timestamptz,
  last_sync_result jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
alter table public.scd_comm_settings enable row level security;

create table if not exists public.scd_comm_external_contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id),
  email text not null check (length(email) between 3 and 254 and position('@' in email) > 1),
  email_norm text generated always as (lower(trim(email))) stored,
  display_name text check (display_name is null or length(display_name) <= 160),
  counterpart_kind text not null default 'EXTERNAL'
    check (counterpart_kind in ('PERSON','ORGANIZATION','SUPPLIER','SPONSOR','EXTERNAL')),
  counterpart_ref text check (counterpart_ref is null or length(counterpart_ref) <= 160),
  org_name text check (org_name is null or length(org_name) <= 160),
  person_id uuid references public.scd_people(id),
  status text not null default 'PROPOSTO' check (status in ('PROPOSTO','COLLEGATO','SCARTATO')),
  first_seen_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  decided_by uuid references auth.users(id),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, email_norm)
);
create index if not exists scd_comm_contacts_status_idx on public.scd_comm_external_contacts (organization_id, status, counterpart_kind);
alter table public.scd_comm_external_contacts enable row level security;

create table if not exists public.scd_comm_threads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id),
  channel text not null default 'EMAIL' check (channel in ('EMAIL','APP','WHATSAPP')),
  subject text not null check (length(subject) between 1 and 250),
  confidentiality text not null default 'ORDINARIO' check (confidentiality in ('ORDINARIO','RISERVATO')),
  office text not null check (office in ('DIREZIONE','SEGRETERIA','TESORERIA')),
  counterpart_kind text not null default 'EXTERNAL'
    check (counterpart_kind in ('PERSON','FAMILY','ORGANIZATION','SUPPLIER','SPONSOR','EXTERNAL','AUDIENCE')),
  counterpart_person_id uuid references public.scd_people(id),
  counterpart_family_id uuid references public.scd_families(id),
  counterpart_contact_id uuid references public.scd_comm_external_contacts(id),
  counterpart_ref text,
  counterpart_label text check (counterpart_label is null or length(counterpart_label) <= 200),
  audience jsonb,
  gmail_thread_id text,
  status text not null default 'APERTO' check (status in ('APERTO','CHIUSO')),
  unread boolean not null default false,
  last_message_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists scd_comm_threads_gmail_idx on public.scd_comm_threads (organization_id, gmail_thread_id) where gmail_thread_id is not null;
create index if not exists scd_comm_threads_list_idx on public.scd_comm_threads (organization_id, last_message_at desc);
alter table public.scd_comm_threads enable row level security;

create table if not exists public.scd_comm_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id),
  thread_id uuid not null references public.scd_comm_threads(id),
  direction text not null check (direction in ('OUT','IN')),
  sender_user_id uuid references auth.users(id),
  sender_office text check (sender_office is null or sender_office in ('DIREZIONE','SEGRETERIA','TESORERIA')),
  from_address text,
  from_name text,
  to_addresses text[] not null default '{}',
  cc_addresses text[] not null default '{}',
  subject text not null check (length(subject) between 1 and 250),
  body_text text not null default '' check (length(body_text) <= 20000),
  audience jsonb,
  actor_copy_email text,
  gmail_message_id text unique,
  gmail_thread_id text,
  rfc_message_id text,
  in_reply_to text,
  attachments_count integer not null default 0 check (attachments_count >= 0),
  delivery text check (delivery in ('PENDING','QUEUED','SENT','FAILED','DRAFT')),
  recipients_count integer not null default 0,
  queued_at timestamptz,
  queued_by uuid references auth.users(id),
  sent_at timestamptz,
  received_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((direction = 'OUT' and sender_user_id is not null and delivery is not null)
      or (direction = 'IN' and delivery is null and received_at is not null))
);
create index if not exists scd_comm_messages_thread_idx on public.scd_comm_messages (thread_id, created_at);
create index if not exists scd_comm_messages_gthread_idx on public.scd_comm_messages (organization_id, gmail_thread_id) where gmail_thread_id is not null;
create index if not exists scd_comm_messages_queue_idx on public.scd_comm_messages (organization_id, delivery) where direction = 'OUT';
alter table public.scd_comm_messages enable row level security;

create table if not exists public.scd_comm_recipients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id),
  message_id uuid not null references public.scd_comm_messages(id),
  seq integer not null default 1,
  kind text not null check (kind in ('DIRECT','GUARDIAN','MINOR_WITH_GUARDIANS','CONTACT','FREE')),
  email text not null check (position('@' in email) > 1),
  cc_emails text[] not null default '{}',
  label text,
  person_id uuid references public.scd_people(id),
  family_id uuid references public.scd_families(id),
  contact_id uuid references public.scd_comm_external_contacts(id),
  guardian_for_person_id uuid references public.scd_people(id),
  status text not null default 'PENDING' check (status in ('PENDING','QUEUED','SENDING','SENT','FAILED','SKIPPED')),
  attempts integer not null default 0,
  claimed_at timestamptz,
  sent_at timestamptz,
  gmail_message_id text,
  gmail_thread_id text,
  rfc_message_id text,
  error text check (error is null or length(error) <= 300),
  created_at timestamptz not null default now(),
  unique (message_id, email)
);
create index if not exists scd_comm_recipients_status_idx on public.scd_comm_recipients (organization_id, status);
create index if not exists scd_comm_recipients_gthread_idx on public.scd_comm_recipients (organization_id, gmail_thread_id) where gmail_thread_id is not null;
create index if not exists scd_comm_recipients_sent_idx on public.scd_comm_recipients (organization_id, sent_at) where status in ('SENT','SENDING');
alter table public.scd_comm_recipients enable row level security;

-- Browser roles never write these tables directly; anon cannot even read them.
revoke all on table public.scd_comm_settings, public.scd_comm_external_contacts, public.scd_comm_threads,
  public.scd_comm_messages, public.scd_comm_recipients from anon;
revoke insert, update, delete, truncate on table public.scd_comm_settings, public.scd_comm_external_contacts,
  public.scd_comm_threads, public.scd_comm_messages, public.scd_comm_recipients from authenticated;

insert into public.scd_comm_settings (organization_id)
select id from public.scd_organizations
on conflict (organization_id) do nothing;

-- ------------------------------------------------------------------ office helpers
-- Offices of the caller: same positions as scd_fee_office / scd_proposal_reserved_reader.
create or replace function public.scd_comm_offices(p_organization_id uuid)
returns text[]
language sql
stable
security definer
set search_path to 'public'
as $$
  select array_remove(array[
    case when public.scd_has_org_role(p_organization_id, array['DIRECTION']::public.scd_role[])
           or public.scd_has_position(p_organization_id, array['direzione','presidente','direttore-generale'])
         then 'DIREZIONE' end,
    case when public.scd_has_org_role(p_organization_id, array['SECRETARIAT']::public.scd_role[])
           or public.scd_has_position(p_organization_id, array['segreteria','segreteria-presenza','segreteria-remoto'])
         then 'SEGRETERIA' end,
    case when public.scd_has_position(p_organization_id, array['tesoreria'])
         then 'TESORERIA' end
  ], null);
$$;
revoke all on function public.scd_comm_offices(uuid) from public, anon;
grant execute on function public.scd_comm_offices(uuid) to authenticated;

-- ORDINARIO: any of the three offices. RISERVATO: Direzione or the owning office.
create or replace function public.scd_comm_can_read(p_organization_id uuid, p_confidentiality text, p_office text)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select case
    when cardinality(public.scd_comm_offices(p_organization_id)) = 0 then false
    when p_confidentiality = 'ORDINARIO' then true
    else 'DIREZIONE' = any(public.scd_comm_offices(p_organization_id)) or p_office = any(public.scd_comm_offices(p_organization_id))
  end;
$$;
revoke all on function public.scd_comm_can_read(uuid, text, text) from public, anon;
grant execute on function public.scd_comm_can_read(uuid, text, text) to authenticated;

-- RLS: read-only policies for the offices; no insert/update/delete policy (writes go through the functions).
do $$ begin
  create policy scd_comm_threads_office_read on public.scd_comm_threads for select to authenticated
    using (public.scd_comm_can_read(organization_id, confidentiality, office));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy scd_comm_messages_office_read on public.scd_comm_messages for select to authenticated
    using (exists (select 1 from public.scd_comm_threads t where t.id = thread_id
                   and public.scd_comm_can_read(t.organization_id, t.confidentiality, t.office)));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy scd_comm_recipients_office_read on public.scd_comm_recipients for select to authenticated
    using (exists (select 1 from public.scd_comm_messages m join public.scd_comm_threads t on t.id = m.thread_id
                   where m.id = message_id and public.scd_comm_can_read(t.organization_id, t.confidentiality, t.office)));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy scd_comm_contacts_office_read on public.scd_comm_external_contacts for select to authenticated
    using (cardinality(public.scd_comm_offices(organization_id)) > 0);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy scd_comm_settings_office_read on public.scd_comm_settings for select to authenticated
    using (cardinality(public.scd_comm_offices(organization_id)) > 0);
exception when duplicate_object then null; end $$;

create or replace function public.scd_comm_audit(p_organization_id uuid, p_action text, p_entity_type text, p_entity_id uuid, p_payload jsonb)
returns void
language sql
security definer
set search_path to 'public'
as $$
  insert into public.scd_audit_events (organization_id, actor_user_id, action, entity_type, entity_id, payload)
  values (p_organization_id, auth.uid(), p_action, p_entity_type, p_entity_id, coalesce(p_payload, '{}'::jsonb));
$$;
revoke all on function public.scd_comm_audit(uuid, text, text, uuid, jsonb) from public, anon, authenticated;

-- ------------------------------------------------------------------ recipient resolution (minors rule)
-- Audience: {"kind": ALL_MEMBERS | TEAM(teamId) | BIRTH_YEAR(birthYear) | PERSON(personId) | FAMILY(familyId)
--            | SPONSORS | SUPPLIERS | CONTACT(contactId) | FREE(emails[])}.
-- One row per candidate envelope or per exclusion (excluded_reason not null). Internal: no grants.
create or replace function public.scd_comm_resolve_core(p_organization_id uuid, p_audience jsonb)
returns table (email text, cc text[], kind text, person_id uuid, family_id uuid, contact_id uuid,
               guardian_for_person_id uuid, label text, excluded_reason text)
language sql
stable
security definer
set search_path to 'public'
as $$
  with params as (
    select upper(coalesce(p_audience->>'kind', '')) as k,
           (now() at time zone 'Europe/Rome')::date as today,
           case when coalesce(p_audience->>'teamId', '') ~* '^[0-9a-f-]{36}$' then (p_audience->>'teamId')::uuid end as team_id,
           case when coalesce(p_audience->>'personId', '') ~* '^[0-9a-f-]{36}$' then (p_audience->>'personId')::uuid end as person_id,
           case when coalesce(p_audience->>'familyId', '') ~* '^[0-9a-f-]{36}$' then (p_audience->>'familyId')::uuid end as family_id,
           case when coalesce(p_audience->>'contactId', '') ~* '^[0-9a-f-]{36}$' then (p_audience->>'contactId')::uuid end as contact_id,
           case when coalesce(p_audience->>'birthYear', '') ~ '^(19|20)[0-9]{2}$' then (p_audience->>'birthYear')::int end as birth_year,
           (select s.mailbox from public.scd_comm_settings s where s.organization_id = p_organization_id) as mailbox
  ),
  free_emails as (
    select distinct lower(trim(e)) as e
    from params, jsonb_array_elements_text(case when params.k = 'FREE' and jsonb_typeof(p_audience->'emails') = 'array'
                                                then p_audience->'emails' else '[]'::jsonb end) e
    where trim(e) <> ''
  ),
  pick_contacts as (
    select c.* from public.scd_comm_external_contacts c, params
    where c.organization_id = p_organization_id and (
      (params.k = 'SPONSORS' and c.counterpart_kind = 'SPONSOR' and c.status = 'COLLEGATO')
      or (params.k = 'SUPPLIERS' and c.counterpart_kind = 'SUPPLIER' and c.status = 'COLLEGATO')
      or (params.k = 'CONTACT' and c.id = params.contact_id and c.status <> 'SCARTATO'))
  ),
  targets as (
    select p.id from public.scd_people p, params
    where p.organization_id = p_organization_id and (
      (params.k = 'ALL_MEMBERS' and p.status = 'ACTIVE'
         and exists (select 1 from public.scd_athletes a where a.person_id = p.id and a.organization_id = p_organization_id))
      or (params.k = 'TEAM' and p.status = 'ACTIVE'
         and exists (select 1 from public.scd_athletes a join public.scd_team_memberships tm on tm.athlete_id = a.id
                     where a.person_id = p.id and tm.team_id = params.team_id
                       and (tm.valid_to is null or tm.valid_to >= params.today)))
      or (params.k = 'BIRTH_YEAR' and p.status = 'ACTIVE' and extract(year from p.birth_date)::int = params.birth_year
         and exists (select 1 from public.scd_athletes a where a.person_id = p.id and a.organization_id = p_organization_id))
      or (params.k = 'PERSON' and p.id = params.person_id)
      or (params.k = 'FAMILY' and exists (select 1 from public.scd_family_members fm where fm.person_id = p.id and fm.family_id = params.family_id))
      or (params.k = 'FREE' and p.email is not null and lower(trim(p.email)) in (select e from free_emails))
      or (p.id in (select pc.person_id from pick_contacts pc where pc.person_id is not null)))
  ),
  t as (
    select p.id, p.display_name, p.status,
           case when p.email is not null and lower(trim(p.email)) ~ '^[^@\s<>",;]+@[^@\s<>",;]+\.[^@\s<>",;]+$' then lower(trim(p.email)) end as email,
           case when p.birth_date is null then null else date_part('year', age(params.today, p.birth_date))::int end as age,
           exists (select 1 from public.scd_person_consents c where c.person_id = p.id and c.consent_type = 'COMM_EMAIL'
                   and c.granted = false and c.revoked_at is null) as opted_out
    from public.scd_people p join targets x on x.id = p.id, params
  ),
  guardians as (
    select distinct on (t.id, g.id) t.id as minor_id, g.id as guardian_id, fm.family_id,
           lower(trim(g.email)) as email, g.display_name
    from t
    join public.scd_family_members fm on fm.person_id = t.id
    join public.scd_family_members gm on gm.family_id = fm.family_id and gm.is_guardian and gm.person_id <> t.id
    join public.scd_people g on g.id = gm.person_id and g.status in ('ACTIVE','PENDING')
    , params
    where (t.age is null or t.age < 18)
      and (g.birth_date is null or date_part('year', age(params.today, g.birth_date)) >= 18)
      and g.email is not null and lower(trim(g.email)) ~ '^[^@\s<>",;]+@[^@\s<>",;]+\.[^@\s<>",;]+$'
      and not exists (select 1 from public.scd_person_consents c where c.person_id = g.id and c.consent_type = 'COMM_EMAIL'
                      and c.granted = false and c.revoked_at is null)
  ),
  person_rows as (
    -- excluded people
    select null::text, null::text[], null::text, t.id, null::uuid, null::uuid, null::uuid, t.display_name,
           case when t.status not in ('ACTIVE','PENDING') then 'PERSON_NOT_ACTIVE'
                when t.opted_out then 'OPT_OUT'
                when t.age >= 18 and t.email is null then 'NO_EMAIL'
                when (t.age is null or t.age < 18) and not exists (select 1 from guardians g where g.minor_id = t.id)
                  then case when t.age is null then 'BIRTH_DATE_UNKNOWN_NO_GUARDIAN' else 'MINOR_NO_GUARDIAN' end
           end
    from t
    where t.status not in ('ACTIVE','PENDING') or t.opted_out
       or (t.age >= 18 and t.email is null)
       or ((t.age is null or t.age < 18) and not exists (select 1 from guardians g where g.minor_id = t.id))
    union all
    -- adults: direct
    select t.email, '{}'::text[], 'DIRECT', t.id, null::uuid, null::uuid, null::uuid, t.display_name, null::text
    from t where t.status in ('ACTIVE','PENDING') and not t.opted_out and t.age >= 18 and t.email is not null
    union all
    -- 14-17 with own address and at least one guardian: athlete with the guardians in copy
    select t.email, (select array_agg(distinct g.email order by g.email) from guardians g where g.minor_id = t.id),
           'MINOR_WITH_GUARDIANS', t.id, (select g.family_id from guardians g where g.minor_id = t.id limit 1), null::uuid, null::uuid,
           t.display_name, null::text
    from t where t.status in ('ACTIVE','PENDING') and not t.opted_out and t.age between 14 and 17 and t.email is not null
      and exists (select 1 from guardians g where g.minor_id = t.id)
    union all
    -- under 14, unknown age, or 14-17 without own address: the guardians
    select g.email, '{}'::text[], 'GUARDIAN', g.guardian_id, g.family_id, null::uuid, t.id, g.display_name, null::text
    from t join guardians g on g.minor_id = t.id
    where t.status in ('ACTIVE','PENDING') and not t.opted_out
      and (t.age is null or t.age < 14 or (t.age between 14 and 17 and t.email is null))
  ),
  contact_rows as (
    select lower(trim(c.email)), '{}'::text[], 'CONTACT', null::uuid, null::uuid, c.id, null::uuid,
           coalesce(c.display_name, c.org_name, c.email), null::text
    from pick_contacts c where c.person_id is null
  ),
  free_rows as (
    select case when f.e ~ '^[^@\s<>",;]+@[^@\s<>",;]+\.[^@\s<>",;]+$' and f.e <> lower(coalesce(params.mailbox, '')) then f.e end,
           '{}'::text[],
           case when c.id is not null then 'CONTACT' else 'FREE' end,
           null::uuid, null::uuid, c.id, null::uuid, coalesce(c.display_name, c.org_name, f.e),
           case when f.e !~ '^[^@\s<>",;]+@[^@\s<>",;]+\.[^@\s<>",;]+$' then 'INVALID_EMAIL'
                when f.e = lower(coalesce(params.mailbox, '')) then 'CLUB_MAILBOX' end
    from free_emails f cross join params
    left join public.scd_comm_external_contacts c on c.organization_id = p_organization_id and c.email_norm = f.e and c.status <> 'SCARTATO'
    where not exists (select 1 from public.scd_people p where p.organization_id = p_organization_id and lower(trim(p.email)) = f.e)
  )
  select * from person_rows
  union all select * from contact_rows
  union all select * from free_rows
  union all
  select null, null, null, null, null, null, null, null, 'UNKNOWN_AUDIENCE'
  from params where params.k not in ('ALL_MEMBERS','TEAM','BIRTH_YEAR','PERSON','FAMILY','SPONSORS','SUPPLIERS','CONTACT','FREE');
$$;
revoke all on function public.scd_comm_resolve_core(uuid, jsonb) from public, anon, authenticated;

-- Final envelopes: one per address (best kind wins), with the safety net that drops any address belonging only to
-- children under 14 (known age < 14, and no adult or guardian with the same address). Internal: no grants.
create or replace function public.scd_comm_resolve_envelopes(p_organization_id uuid, p_audience jsonb)
returns table (email text, cc text[], kind text, person_id uuid, family_id uuid, contact_id uuid,
               guardian_for_person_id uuid, label text, excluded_reason text, seq integer)
language sql
stable
security definer
set search_path to 'public'
as $$
  with c as (select * from public.scd_comm_resolve_core(p_organization_id, p_audience)),
  flags as (
    select lower(trim(p.email)) as e,
           (p.birth_date is not null and age((now() at time zone 'Europe/Rome')::date, p.birth_date) < interval '14 years') as child,
           ((p.birth_date is not null and age((now() at time zone 'Europe/Rome')::date, p.birth_date) >= interval '18 years')
             or exists (select 1 from public.scd_family_members gm where gm.person_id = p.id and gm.is_guardian)) as adult
    from public.scd_people p
    where p.organization_id = p_organization_id and p.email is not null
  ),
  u14 as (select e from flags group by e having bool_or(child) and not bool_or(adult)),
  ok as (
    select c.*, row_number() over (partition by c.email order by
             case c.kind when 'DIRECT' then 1 when 'MINOR_WITH_GUARDIANS' then 2 when 'GUARDIAN' then 3 when 'CONTACT' then 4 else 5 end,
             c.label nulls last) as rn
    from c where c.excluded_reason is null and c.email is not null and c.email not in (select e from u14)
  ),
  chosen as (
    select ok.email,
           coalesce((select array_agg(distinct x order by x) from unnest(ok.cc) x where x <> ok.email and x not in (select e from u14)), '{}') as cc,
           ok.kind, ok.person_id, ok.family_id, ok.contact_id, ok.guardian_for_person_id, ok.label
    from ok where ok.rn = 1
  )
  select ch.*, null::text, (row_number() over (order by ch.kind, ch.label nulls last, ch.email))::int
  from chosen ch
  -- a 14-17 athlete must never be written to without a guardian in copy
  where not (ch.kind = 'MINOR_WITH_GUARDIANS' and cardinality(ch.cc) = 0)
  union all
  select c.email, null, c.kind, c.person_id, null, null, null, c.label,
         case when c.email in (select e from u14) then 'UNDER_14_ADDRESS' else 'MINOR_WITHOUT_GUARDIAN_COPY' end, null
  from c
  where c.excluded_reason is null and c.email is not null
    and (c.email in (select e from u14)
         or (c.kind = 'MINOR_WITH_GUARDIANS'
             and not exists (select 1 from unnest(c.cc) x where x <> c.email and x not in (select e from u14))))
  union all
  select null, null, null, c.person_id, null, null, null, c.label, c.excluded_reason, null
  from c where c.excluded_reason is not null;
$$;
revoke all on function public.scd_comm_resolve_envelopes(uuid, jsonb) from public, anon, authenticated;

-- Preview for the composer (offices only): envelopes plus exclusion counts. Audited with counts only.
create or replace function public.scd_comm_resolve_recipients(p_organization_id uuid, p_audience jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_out jsonb;
begin
  if cardinality(public.scd_comm_offices(p_organization_id)) = 0 then
    return jsonb_build_object('ok', false, 'code', 'NOT_ALLOWED');
  end if;
  select jsonb_build_object(
    'ok', true,
    'recipients', coalesce(jsonb_agg(jsonb_build_object('email', r.email, 'cc', to_jsonb(r.cc), 'kind', r.kind, 'label', r.label,
                     'personId', r.person_id, 'familyId', r.family_id, 'contactId', r.contact_id,
                     'guardianForPersonId', r.guardian_for_person_id) order by r.seq)
                   filter (where r.excluded_reason is null), '[]'::jsonb),
    'excluded', coalesce((select jsonb_object_agg(x.reason, x.n) from (
                   select e.excluded_reason as reason, count(*) as n
                   from public.scd_comm_resolve_envelopes(p_organization_id, p_audience) e
                   where e.excluded_reason is not null group by e.excluded_reason) x), '{}'::jsonb))
  into v_out
  from public.scd_comm_resolve_envelopes(p_organization_id, p_audience) r;
  v_out := v_out || jsonb_build_object('total', jsonb_array_length(v_out->'recipients'));
  perform public.scd_comm_audit(p_organization_id, 'COMM_AUDIENCE_PREVIEW', 'scd_comm_audience', null,
    jsonb_build_object('kind', p_audience->>'kind', 'total', v_out->'total', 'excluded', v_out->'excluded'));
  return v_out;
end;
$$;
revoke all on function public.scd_comm_resolve_recipients(uuid, jsonb) from public, anon;
grant execute on function public.scd_comm_resolve_recipients(uuid, jsonb) to authenticated;

-- ------------------------------------------------------------------ drafts, queue, thread controls
create or replace function public.scd_comm_counterpart_label(p_organization_id uuid, p_audience jsonb)
returns table (kind text, person_id uuid, family_id uuid, contact_id uuid, label text)
language sql
stable
security definer
set search_path to 'public'
as $$
  select
    case upper(coalesce(p_audience->>'kind', ''))
      when 'PERSON' then 'PERSON' when 'FAMILY' then 'FAMILY'
      when 'CONTACT' then coalesce((select case c.counterpart_kind when 'PERSON' then 'EXTERNAL' else c.counterpart_kind end
                                    from public.scd_comm_external_contacts c
                                    where c.organization_id = p_organization_id and c.id::text = p_audience->>'contactId'), 'EXTERNAL')
      when 'FREE' then case when jsonb_array_length(coalesce(p_audience->'emails', '[]')) = 1 then 'EXTERNAL' else 'AUDIENCE' end
      else 'AUDIENCE' end,
    (select p.id from public.scd_people p where p.organization_id = p_organization_id and upper(p_audience->>'kind') = 'PERSON' and p.id::text = p_audience->>'personId'),
    (select f.id from public.scd_families f where f.organization_id = p_organization_id and upper(p_audience->>'kind') = 'FAMILY' and f.id::text = p_audience->>'familyId'),
    (select c.id from public.scd_comm_external_contacts c where c.organization_id = p_organization_id and upper(p_audience->>'kind') = 'CONTACT' and c.id::text = p_audience->>'contactId'),
    left(case upper(coalesce(p_audience->>'kind', ''))
      when 'ALL_MEMBERS' then 'Tutti i tesserati'
      when 'TEAM' then 'Squadra ' || coalesce((select t.name from public.scd_teams t where t.organization_id = p_organization_id and t.id::text = p_audience->>'teamId'), '')
      when 'BIRTH_YEAR' then 'Famiglie annata ' || coalesce(p_audience->>'birthYear', '')
      when 'SPONSORS' then 'Sponsor collegati'
      when 'SUPPLIERS' then 'Fornitori collegati'
      when 'PERSON' then coalesce((select p.display_name from public.scd_people p where p.organization_id = p_organization_id and p.id::text = p_audience->>'personId'), 'Persona')
      when 'FAMILY' then coalesce((select f.display_name from public.scd_families f where f.organization_id = p_organization_id and f.id::text = p_audience->>'familyId'), 'Famiglia')
      when 'CONTACT' then coalesce((select coalesce(c.display_name, c.org_name, c.email) from public.scd_comm_external_contacts c where c.organization_id = p_organization_id and c.id::text = p_audience->>'contactId'), 'Contatto')
      when 'FREE' then (select string_agg(e, ', ') from jsonb_array_elements_text(coalesce(p_audience->'emails', '[]')) e)
      else 'Destinatari' end, 200);
$$;
revoke all on function public.scd_comm_counterpart_label(uuid, jsonb) from public, anon, authenticated;

-- Save a draft (new thread, reply in a thread, or update of an own draft). Office must be one of the caller's
-- offices (Direzione may write for any office). Returns {ok, threadId, messageId} or {ok:false, code}.
create or replace function public.scd_comm_create_draft(
  p_organization_id uuid,
  p_thread_id uuid,
  p_message_id uuid,
  p_office text,
  p_confidentiality text,
  p_subject text,
  p_body text,
  p_audience jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_offices text[] := public.scd_comm_offices(p_organization_id);
  v_thread public.scd_comm_threads%rowtype;
  v_msg public.scd_comm_messages%rowtype;
  v_cp record;
  v_subject text := left(trim(coalesce(p_subject, '')), 250);
  v_body text := coalesce(p_body, '');
begin
  if cardinality(v_offices) = 0 then return jsonb_build_object('ok', false, 'code', 'NOT_ALLOWED'); end if;
  if p_office not in ('DIREZIONE','SEGRETERIA','TESORERIA') or not ('DIREZIONE' = any(v_offices) or p_office = any(v_offices)) then
    return jsonb_build_object('ok', false, 'code', 'OFFICE_NOT_ALLOWED');
  end if;
  if coalesce(p_confidentiality, 'ORDINARIO') not in ('ORDINARIO','RISERVATO') then
    return jsonb_build_object('ok', false, 'code', 'BAD_CONFIDENTIALITY');
  end if;
  if v_subject = '' then return jsonb_build_object('ok', false, 'code', 'SUBJECT_REQUIRED'); end if;
  if length(v_body) > 20000 then return jsonb_build_object('ok', false, 'code', 'BODY_TOO_LONG'); end if;
  if v_subject ~* 'safeguarding' then return jsonb_build_object('ok', false, 'code', 'SAFEGUARDING_EXCLUDED'); end if;
  if p_audience is null or jsonb_typeof(p_audience) <> 'object' or coalesce(p_audience->>'kind', '') = '' then
    return jsonb_build_object('ok', false, 'code', 'AUDIENCE_REQUIRED');
  end if;

  if p_message_id is not null then
    select * into v_msg from public.scd_comm_messages m where m.id = p_message_id and m.organization_id = p_organization_id for update;
    if not found or v_msg.direction <> 'OUT' or v_msg.delivery <> 'DRAFT' then
      return jsonb_build_object('ok', false, 'code', 'NOT_A_DRAFT');
    end if;
    select * into v_thread from public.scd_comm_threads t where t.id = v_msg.thread_id;
    if not public.scd_comm_can_read(p_organization_id, v_thread.confidentiality, v_thread.office) then
      return jsonb_build_object('ok', false, 'code', 'NOT_ALLOWED');
    end if;
    update public.scd_comm_messages set subject = v_subject, body_text = v_body, audience = p_audience,
      sender_user_id = auth.uid(), sender_office = p_office, updated_at = now()
    where id = v_msg.id;
    perform public.scd_comm_audit(p_organization_id, 'COMM_DRAFT_UPDATED', 'scd_comm_message', v_msg.id,
      jsonb_build_object('threadId', v_thread.id, 'kind', p_audience->>'kind'));
    return jsonb_build_object('ok', true, 'threadId', v_thread.id, 'messageId', v_msg.id);
  end if;

  if p_thread_id is not null then
    select * into v_thread from public.scd_comm_threads t where t.id = p_thread_id and t.organization_id = p_organization_id;
    if not found or not public.scd_comm_can_read(p_organization_id, v_thread.confidentiality, v_thread.office) then
      return jsonb_build_object('ok', false, 'code', 'NOT_ALLOWED');
    end if;
  else
    select * into v_cp from public.scd_comm_counterpart_label(p_organization_id, p_audience);
    insert into public.scd_comm_threads (organization_id, channel, subject, confidentiality, office, counterpart_kind,
      counterpart_person_id, counterpart_family_id, counterpart_contact_id, counterpart_label, audience, created_by)
    values (p_organization_id, 'EMAIL', v_subject, coalesce(p_confidentiality, 'ORDINARIO'), p_office, v_cp.kind,
      v_cp.person_id, v_cp.family_id, v_cp.contact_id, v_cp.label, p_audience, auth.uid())
    returning * into v_thread;
  end if;

  insert into public.scd_comm_messages (organization_id, thread_id, direction, sender_user_id, sender_office, subject,
    body_text, audience, delivery)
  values (p_organization_id, v_thread.id, 'OUT', auth.uid(), p_office, v_subject, v_body, p_audience, 'DRAFT')
  returning * into v_msg;
  update public.scd_comm_threads set last_message_at = now(), updated_at = now() where id = v_thread.id;
  perform public.scd_comm_audit(p_organization_id, 'COMM_DRAFT_SAVED', 'scd_comm_message', v_msg.id,
    jsonb_build_object('threadId', v_thread.id, 'office', p_office, 'confidentiality', v_thread.confidentiality,
                       'kind', p_audience->>'kind', 'newThread', p_thread_id is null));
  return jsonb_build_object('ok', true, 'threadId', v_thread.id, 'messageId', v_msg.id);
end;
$$;
revoke all on function public.scd_comm_create_draft(uuid, uuid, uuid, text, text, text, text, jsonb) from public, anon;
grant execute on function public.scd_comm_create_draft(uuid, uuid, uuid, text, text, text, text, jsonb) to authenticated;

-- Put a draft in the outbox: only when Gmail is connected AND sending is enabled, else 'SENDING_DISABLED'.
-- Recipients are resolved now (minors rule) and frozen on the message.
create or replace function public.scd_comm_queue(p_message_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_msg public.scd_comm_messages%rowtype;
  v_thread public.scd_comm_threads%rowtype;
  v_set public.scd_comm_settings%rowtype;
  v_offices text[];
  v_count integer;
  v_actor_email text;
begin
  select * into v_msg from public.scd_comm_messages m where m.id = p_message_id for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'NOT_FOUND'); end if;
  v_offices := public.scd_comm_offices(v_msg.organization_id);
  select * into v_thread from public.scd_comm_threads t where t.id = v_msg.thread_id;
  if cardinality(v_offices) = 0 or not public.scd_comm_can_read(v_msg.organization_id, v_thread.confidentiality, v_thread.office)
     or not ('DIREZIONE' = any(v_offices) or v_msg.sender_office = any(v_offices)) then
    return jsonb_build_object('ok', false, 'code', 'NOT_ALLOWED');
  end if;
  if v_msg.direction <> 'OUT' or v_msg.delivery <> 'DRAFT' then return jsonb_build_object('ok', false, 'code', 'NOT_A_DRAFT'); end if;
  select * into v_set from public.scd_comm_settings s where s.organization_id = v_msg.organization_id;
  if not found or not v_set.sending_enabled or not v_set.gmail_connected then
    perform public.scd_comm_audit(v_msg.organization_id, 'COMM_QUEUE_REFUSED', 'scd_comm_message', v_msg.id,
      jsonb_build_object('code', 'SENDING_DISABLED'));
    return jsonb_build_object('ok', false, 'code', 'SENDING_DISABLED');
  end if;

  insert into public.scd_comm_recipients (organization_id, message_id, seq, kind, email, cc_emails, label, person_id,
    family_id, contact_id, guardian_for_person_id, status)
  select v_msg.organization_id, v_msg.id, e.seq, e.kind, e.email, e.cc, e.label, e.person_id, e.family_id, e.contact_id,
    e.guardian_for_person_id, 'QUEUED'
  from public.scd_comm_resolve_envelopes(v_msg.organization_id, v_msg.audience) e
  where e.excluded_reason is null
  on conflict (message_id, email) do nothing;
  get diagnostics v_count = row_count;
  if v_count = 0 then
    perform public.scd_comm_audit(v_msg.organization_id, 'COMM_QUEUE_REFUSED', 'scd_comm_message', v_msg.id,
      jsonb_build_object('code', 'NO_RECIPIENTS'));
    return jsonb_build_object('ok', false, 'code', 'NO_RECIPIENTS');
  end if;

  select lower(u.email) into v_actor_email from auth.users u where u.id = auth.uid();
  update public.scd_comm_messages set delivery = 'QUEUED', queued_at = now(), queued_by = auth.uid(),
    recipients_count = v_count, from_address = v_set.mailbox,
    to_addresses = (select coalesce(array_agg(r.email order by r.seq), '{}') from public.scd_comm_recipients r where r.message_id = v_msg.id),
    actor_copy_email = case when v_actor_email is not null and v_actor_email <> lower(v_set.mailbox) then v_actor_email end,
    updated_at = now()
  where id = v_msg.id;
  update public.scd_comm_threads set status = 'APERTO', last_message_at = now(), updated_at = now() where id = v_thread.id;
  perform public.scd_comm_audit(v_msg.organization_id, 'COMM_QUEUED', 'scd_comm_message', v_msg.id,
    jsonb_build_object('threadId', v_thread.id, 'recipients', v_count, 'kind', v_msg.audience->>'kind'));
  return jsonb_build_object('ok', true, 'recipients', v_count);
end;
$$;
revoke all on function public.scd_comm_queue(uuid) from public, anon;
grant execute on function public.scd_comm_queue(uuid) to authenticated;

create or replace function public.scd_comm_set_confidentiality(p_thread_id uuid, p_level text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_thread public.scd_comm_threads%rowtype;
  v_offices text[];
begin
  select * into v_thread from public.scd_comm_threads t where t.id = p_thread_id for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'NOT_FOUND'); end if;
  v_offices := public.scd_comm_offices(v_thread.organization_id);
  if not ('DIREZIONE' = any(v_offices) or v_thread.office = any(v_offices)) then
    return jsonb_build_object('ok', false, 'code', 'NOT_ALLOWED');
  end if;
  if p_level not in ('ORDINARIO','RISERVATO') then return jsonb_build_object('ok', false, 'code', 'BAD_CONFIDENTIALITY'); end if;
  if v_thread.confidentiality = p_level then return jsonb_build_object('ok', true, 'unchanged', true); end if;
  update public.scd_comm_threads set confidentiality = p_level, updated_at = now() where id = v_thread.id;
  perform public.scd_comm_audit(v_thread.organization_id, 'COMM_CONFIDENTIALITY', 'scd_comm_thread', v_thread.id,
    jsonb_build_object('from', v_thread.confidentiality, 'to', p_level));
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.scd_comm_set_confidentiality(uuid, text) from public, anon;
grant execute on function public.scd_comm_set_confidentiality(uuid, text) to authenticated;

create or replace function public.scd_comm_set_thread_status(p_thread_id uuid, p_status text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_thread public.scd_comm_threads%rowtype;
begin
  select * into v_thread from public.scd_comm_threads t where t.id = p_thread_id for update;
  if not found or not public.scd_comm_can_read(v_thread.organization_id, v_thread.confidentiality, v_thread.office) then
    return jsonb_build_object('ok', false, 'code', 'NOT_ALLOWED');
  end if;
  if p_status not in ('APERTO','CHIUSO') then return jsonb_build_object('ok', false, 'code', 'BAD_STATUS'); end if;
  update public.scd_comm_threads set status = p_status, unread = case when p_status = 'CHIUSO' then false else unread end,
    updated_at = now() where id = v_thread.id;
  perform public.scd_comm_audit(v_thread.organization_id, 'COMM_THREAD_STATUS', 'scd_comm_thread', v_thread.id,
    jsonb_build_object('from', v_thread.status, 'to', p_status));
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.scd_comm_set_thread_status(uuid, text) from public, anon;
grant execute on function public.scd_comm_set_thread_status(uuid, text) to authenticated;

-- Direzione test used by the sending switch.
create or replace function public.scd_comm_is_direction(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$ select 'DIREZIONE' = any(public.scd_comm_offices(p_organization_id)); $$;
revoke all on function public.scd_comm_is_direction(uuid) from public, anon;
grant execute on function public.scd_comm_is_direction(uuid) to authenticated;

create or replace function public.scd_comm_set_sending(p_organization_id uuid, p_enabled boolean)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_set public.scd_comm_settings%rowtype;
begin
  if not public.scd_comm_is_direction(p_organization_id) then return jsonb_build_object('ok', false, 'code', 'NOT_ALLOWED'); end if;
  select * into v_set from public.scd_comm_settings s where s.organization_id = p_organization_id for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'NOT_FOUND'); end if;
  if p_enabled and not v_set.gmail_connected then return jsonb_build_object('ok', false, 'code', 'GMAIL_NOT_CONNECTED'); end if;
  update public.scd_comm_settings set sending_enabled = p_enabled, updated_at = now(), updated_by = auth.uid()
  where organization_id = p_organization_id;
  perform public.scd_comm_audit(p_organization_id, 'COMM_SENDING_TOGGLED', 'scd_comm_settings', null,
    jsonb_build_object('from', v_set.sending_enabled, 'to', p_enabled));
  return jsonb_build_object('ok', true, 'sendingEnabled', p_enabled);
end;
$$;
revoke all on function public.scd_comm_set_sending(uuid, boolean) from public, anon;
grant execute on function public.scd_comm_set_sending(uuid, boolean) to authenticated;

-- ------------------------------------------------------------------ contacts
-- Accept a proposal (ACCEPT with kind/ref/org name), link it to a person of the club (LINK_PERSON) or discard it.
create or replace function public.scd_comm_link_contact(
  p_organization_id uuid,
  p_contact_id uuid,
  p_action text,
  p_person_id uuid,
  p_counterpart_kind text,
  p_counterpart_ref text,
  p_org_name text,
  p_display_name text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_c public.scd_comm_external_contacts%rowtype;
begin
  if cardinality(public.scd_comm_offices(p_organization_id)) = 0 then return jsonb_build_object('ok', false, 'code', 'NOT_ALLOWED'); end if;
  select * into v_c from public.scd_comm_external_contacts c where c.id = p_contact_id and c.organization_id = p_organization_id for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'NOT_FOUND'); end if;
  if p_action = 'LINK_PERSON' then
    if not exists (select 1 from public.scd_people p where p.id = p_person_id and p.organization_id = p_organization_id) then
      return jsonb_build_object('ok', false, 'code', 'PERSON_NOT_FOUND');
    end if;
    update public.scd_comm_external_contacts set person_id = p_person_id, counterpart_kind = 'PERSON', status = 'COLLEGATO',
      display_name = coalesce(nullif(trim(p_display_name), ''), display_name), decided_by = auth.uid(), decided_at = now(), updated_at = now()
    where id = v_c.id;
    update public.scd_comm_threads set counterpart_kind = 'PERSON', counterpart_person_id = p_person_id,
      counterpart_label = coalesce((select p.display_name from public.scd_people p where p.id = p_person_id), counterpart_label), updated_at = now()
    where organization_id = p_organization_id and counterpart_contact_id = v_c.id and counterpart_kind in ('EXTERNAL','PERSON');
  elsif p_action = 'ACCEPT' then
    if coalesce(p_counterpart_kind, 'EXTERNAL') not in ('ORGANIZATION','SUPPLIER','SPONSOR','EXTERNAL') then
      return jsonb_build_object('ok', false, 'code', 'BAD_KIND');
    end if;
    update public.scd_comm_external_contacts set counterpart_kind = coalesce(p_counterpart_kind, 'EXTERNAL'),
      counterpart_ref = left(nullif(trim(p_counterpart_ref), ''), 160), org_name = left(nullif(trim(p_org_name), ''), 160),
      display_name = coalesce(left(nullif(trim(p_display_name), ''), 160), display_name), status = 'COLLEGATO',
      decided_by = auth.uid(), decided_at = now(), updated_at = now()
    where id = v_c.id;
    update public.scd_comm_threads set counterpart_kind = coalesce(p_counterpart_kind, 'EXTERNAL'),
      counterpart_ref = left(nullif(trim(p_counterpart_ref), ''), 160),
      counterpart_label = left(coalesce(nullif(trim(p_display_name), ''), nullif(trim(p_org_name), ''), counterpart_label), 200), updated_at = now()
    where organization_id = p_organization_id and counterpart_contact_id = v_c.id;
  elsif p_action = 'DISCARD' then
    update public.scd_comm_external_contacts set status = 'SCARTATO', decided_by = auth.uid(), decided_at = now(), updated_at = now()
    where id = v_c.id;
  else
    return jsonb_build_object('ok', false, 'code', 'BAD_ACTION');
  end if;
  perform public.scd_comm_audit(p_organization_id, 'COMM_CONTACT_' || p_action, 'scd_comm_external_contact', v_c.id,
    jsonb_build_object('from', v_c.status, 'kind', p_counterpart_kind, 'personLinked', p_person_id is not null));
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.scd_comm_link_contact(uuid, uuid, text, uuid, text, text, text, text) from public, anon;
grant execute on function public.scd_comm_link_contact(uuid, uuid, text, uuid, text, text, text, text) to authenticated;

-- Add or update a contact by hand (e.g. the sponsor's administration address). Never for people of the club.
create or replace function public.scd_comm_upsert_contact(
  p_organization_id uuid,
  p_email text,
  p_display_name text,
  p_counterpart_kind text,
  p_counterpart_ref text,
  p_org_name text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_id uuid;
begin
  if cardinality(public.scd_comm_offices(p_organization_id)) = 0 then return jsonb_build_object('ok', false, 'code', 'NOT_ALLOWED'); end if;
  if v_email !~ '^[^@\s<>",;]+@[^@\s<>",;]+\.[^@\s<>",;]+$' then return jsonb_build_object('ok', false, 'code', 'INVALID_EMAIL'); end if;
  if coalesce(p_counterpart_kind, 'EXTERNAL') not in ('ORGANIZATION','SUPPLIER','SPONSOR','EXTERNAL') then
    return jsonb_build_object('ok', false, 'code', 'BAD_KIND');
  end if;
  if exists (select 1 from public.scd_people p where p.organization_id = p_organization_id and lower(trim(p.email)) = v_email) then
    return jsonb_build_object('ok', false, 'code', 'IS_CLUB_PERSON');
  end if;
  insert into public.scd_comm_external_contacts as c (organization_id, email, display_name, counterpart_kind, counterpart_ref,
    org_name, status, created_by, decided_by, decided_at)
  values (p_organization_id, v_email, left(nullif(trim(p_display_name), ''), 160), coalesce(p_counterpart_kind, 'EXTERNAL'),
    left(nullif(trim(p_counterpart_ref), ''), 160), left(nullif(trim(p_org_name), ''), 160), 'COLLEGATO', auth.uid(), auth.uid(), now())
  on conflict (organization_id, email_norm) do update set
    display_name = coalesce(excluded.display_name, c.display_name), counterpart_kind = excluded.counterpart_kind,
    counterpart_ref = coalesce(excluded.counterpart_ref, c.counterpart_ref), org_name = coalesce(excluded.org_name, c.org_name),
    status = 'COLLEGATO', decided_by = auth.uid(), decided_at = now(), updated_at = now()
  returning id into v_id;
  perform public.scd_comm_audit(p_organization_id, 'COMM_CONTACT_UPSERT', 'scd_comm_external_contact', v_id,
    jsonb_build_object('kind', coalesce(p_counterpart_kind, 'EXTERNAL')));
  return jsonb_build_object('ok', true, 'contactId', v_id);
end;
$$;
revoke all on function public.scd_comm_upsert_contact(uuid, text, text, text, text, text) from public, anon;
grant execute on function public.scd_comm_upsert_contact(uuid, text, text, text, text, text) to authenticated;

-- ------------------------------------------------------------------ reads for the UI
create or replace function public.scd_comm_inbox(p_organization_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_offices text[] := public.scd_comm_offices(p_organization_id);
  v_day_start timestamptz := (date_trunc('day', now() at time zone 'Europe/Rome')) at time zone 'Europe/Rome';
begin
  if cardinality(v_offices) = 0 then return null; end if;
  return jsonb_build_object(
    'me', auth.uid(),
    'offices', to_jsonb(v_offices),
    'settings', (select jsonb_build_object('mailbox', s.mailbox, 'sendingEnabled', s.sending_enabled, 'gmailConnected', s.gmail_connected,
        'connectedAt', s.connected_at, 'dailyCap', s.daily_cap, 'lastSyncAt', s.last_sync_at,
        'sentToday', (select count(*) from public.scd_comm_recipients r where r.organization_id = p_organization_id
                        and r.status in ('SENT','SENDING') and coalesce(r.sent_at, r.claimed_at) >= v_day_start),
        'queued', (select count(*) from public.scd_comm_recipients r where r.organization_id = p_organization_id and r.status = 'QUEUED'),
        'failedToday', (select count(*) from public.scd_comm_recipients r where r.organization_id = p_organization_id
                        and r.status = 'FAILED' and r.claimed_at >= v_day_start))
      from public.scd_comm_settings s where s.organization_id = p_organization_id),
    'threads', coalesce((select jsonb_agg(row_to_json(x)::jsonb order by x."lastMessageAt" desc) from (
        select t.id, t.channel, t.subject, t.confidentiality, t.office, t.counterpart_kind as "counterpartKind",
          t.counterpart_label as "counterpartLabel", t.status, t.unread, t.last_message_at as "lastMessageAt",
          t.counterpart_contact_id as "contactId",
          (select count(*) from public.scd_comm_messages m where m.thread_id = t.id) as messages,
          (select count(*) from public.scd_comm_messages m where m.thread_id = t.id and m.delivery = 'DRAFT') as drafts,
          (select count(*) from public.scd_comm_messages m where m.thread_id = t.id and m.delivery = 'QUEUED') as queued,
          (select jsonb_build_object('direction', m.direction, 'snippet', left(regexp_replace(m.body_text, '\s+', ' ', 'g'), 160),
                    'from', coalesce(m.from_name, m.from_address), 'at', coalesce(m.received_at, m.sent_at, m.queued_at, m.created_at),
                    'delivery', m.delivery,
                    'senderName', (select coalesce(pr.display_name, split_part(u.email, '@', 1)) from auth.users u
                                   left join public.scd_profiles pr on pr.user_id = u.id where u.id = m.sender_user_id))
           from public.scd_comm_messages m where m.thread_id = t.id order by m.created_at desc limit 1) as last
        from public.scd_comm_threads t
        where t.organization_id = p_organization_id and public.scd_comm_can_read(p_organization_id, t.confidentiality, t.office)
        order by t.last_message_at desc
        limit 300) x), '[]'::jsonb),
    'proposals', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'email', c.email, 'displayName', c.display_name,
        'firstSeenAt', c.first_seen_at,
        'messages', (select count(*) from public.scd_comm_threads t join public.scd_comm_messages m on m.thread_id = t.id
                     where t.counterpart_contact_id = c.id and m.direction = 'IN'),
        'lastSubject', (select t.subject from public.scd_comm_threads t where t.counterpart_contact_id = c.id order by t.last_message_at desc limit 1))
        order by c.first_seen_at desc)
      from public.scd_comm_external_contacts c where c.organization_id = p_organization_id and c.status = 'PROPOSTO'), '[]'::jsonb)
  );
end;
$$;
revoke all on function public.scd_comm_inbox(uuid) from public, anon;
grant execute on function public.scd_comm_inbox(uuid) to authenticated;

-- One thread with its messages; opening it marks it read.
create or replace function public.scd_comm_thread(p_thread_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_thread public.scd_comm_threads%rowtype;
begin
  select * into v_thread from public.scd_comm_threads t where t.id = p_thread_id;
  if not found or not public.scd_comm_can_read(v_thread.organization_id, v_thread.confidentiality, v_thread.office) then
    return null;
  end if;
  if v_thread.unread then
    update public.scd_comm_threads set unread = false where id = v_thread.id;
  end if;
  return jsonb_build_object(
    'id', v_thread.id, 'subject', v_thread.subject, 'confidentiality', v_thread.confidentiality, 'office', v_thread.office,
    'channel', v_thread.channel, 'status', v_thread.status, 'counterpartKind', v_thread.counterpart_kind,
    'counterpartLabel', v_thread.counterpart_label, 'audience', v_thread.audience, 'contactId', v_thread.counterpart_contact_id,
    'canManage', 'DIREZIONE' = any(public.scd_comm_offices(v_thread.organization_id)) or v_thread.office = any(public.scd_comm_offices(v_thread.organization_id)),
    'messages', coalesce((select jsonb_agg(jsonb_build_object(
        'id', m.id, 'direction', m.direction, 'office', m.sender_office, 'subject', m.subject, 'body', m.body_text,
        'from', m.from_address, 'fromName', m.from_name, 'to', to_jsonb(m.to_addresses), 'cc', to_jsonb(m.cc_addresses),
        'delivery', m.delivery, 'audience', m.audience, 'recipients', m.recipients_count, 'attachments', m.attachments_count,
        'queuedAt', m.queued_at, 'sentAt', m.sent_at, 'receivedAt', m.received_at, 'createdAt', m.created_at,
        'mine', m.sender_user_id = auth.uid(),
        'senderName', (select coalesce(pr.display_name, split_part(u.email, '@', 1)) from auth.users u
                       left join public.scd_profiles pr on pr.user_id = u.id where u.id = m.sender_user_id),
        'status', (select jsonb_object_agg(s.status, s.n) from (select r.status, count(*) as n from public.scd_comm_recipients r
                    where r.message_id = m.id group by r.status) s)) order by m.created_at)
      from public.scd_comm_messages m where m.thread_id = v_thread.id), '[]'::jsonb)
  );
end;
$$;
revoke all on function public.scd_comm_thread(uuid) from public, anon;
grant execute on function public.scd_comm_thread(uuid) to authenticated;

-- Picker data for the composer: people and contacts matching the search, teams of the active season, birth years.
create or replace function public.scd_comm_directory(p_organization_id uuid, p_q text)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_q text := nullif(trim(coalesce(p_q, '')), '');
  v_today date := (now() at time zone 'Europe/Rome')::date;
begin
  if cardinality(public.scd_comm_offices(p_organization_id)) = 0 then return null; end if;
  return jsonb_build_object(
    'people', case when v_q is null or length(v_q) < 2 then '[]'::jsonb else coalesce((select jsonb_agg(x order by x->>'label') from (
        select jsonb_build_object('id', p.id, 'label', p.display_name, 'hasEmail', p.email is not null,
          'band', case when p.birth_date is null then 'UNKNOWN'
                       when age(v_today, p.birth_date) < interval '14 years' then 'U14'
                       when age(v_today, p.birth_date) < interval '18 years' then 'U18'
                       else 'ADULT' end) as x
        from public.scd_people p
        where p.organization_id = p_organization_id and p.status in ('ACTIVE','PENDING')
          and (p.display_name ilike '%' || v_q || '%' or lower(coalesce(p.email, '')) = lower(v_q))
        order by p.display_name limit 15) s), '[]'::jsonb) end,
    'families', case when v_q is null or length(v_q) < 2 then '[]'::jsonb else coalesce((select jsonb_agg(jsonb_build_object('id', f.id, 'label', f.display_name) order by f.display_name)
        from (select * from public.scd_families f where f.organization_id = p_organization_id and f.display_name ilike '%' || v_q || '%'
              order by f.display_name limit 10) f), '[]'::jsonb) end,
    'contacts', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'label', coalesce(c.display_name, c.org_name, c.email),
        'email', c.email, 'kind', c.counterpart_kind, 'orgName', c.org_name) order by coalesce(c.display_name, c.org_name, c.email))
      from (select * from public.scd_comm_external_contacts c where c.organization_id = p_organization_id and c.status = 'COLLEGATO'
              and (v_q is null or coalesce(c.display_name, '') ilike '%' || v_q || '%' or coalesce(c.org_name, '') ilike '%' || v_q || '%'
                   or c.email_norm like '%' || lower(v_q) || '%')
            order by coalesce(c.display_name, c.org_name, c.email) limit 30) c), '[]'::jsonb),
    'teams', coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'label', t.name, 'athletes', t.n) order by t.name) from (
        select tm_t.id, tm_t.name, (select count(*) from public.scd_team_memberships tm where tm.team_id = tm_t.id
                                       and (tm.valid_to is null or tm.valid_to >= v_today)) as n
        from public.scd_teams tm_t join public.scd_seasons s on s.id = tm_t.season_id and s.active
        where tm_t.organization_id = p_organization_id) t), '[]'::jsonb),
    'birthYears', coalesce((select jsonb_agg(jsonb_build_object('year', y.year, 'athletes', y.n) order by y.year desc) from (
        select extract(year from p.birth_date)::int as year, count(*) as n
        from public.scd_people p join public.scd_athletes a on a.person_id = p.id
        where p.organization_id = p_organization_id and p.status = 'ACTIVE' and p.birth_date is not null
        group by 1) y), '[]'::jsonb),
    'counts', jsonb_build_object(
      'sponsors', (select count(*) from public.scd_comm_external_contacts c where c.organization_id = p_organization_id and c.status = 'COLLEGATO' and c.counterpart_kind = 'SPONSOR'),
      'suppliers', (select count(*) from public.scd_comm_external_contacts c where c.organization_id = p_organization_id and c.status = 'COLLEGATO' and c.counterpart_kind = 'SUPPLIER'))
  );
end;
$$;
revoke all on function public.scd_comm_directory(uuid, text) from public, anon;
grant execute on function public.scd_comm_directory(uuid, text) to authenticated;

-- ------------------------------------------------------------------ service-only: outbox, delivery, inbound, checkpoint
-- Claim up to p_max queued envelopes within today's cap (Europe/Rome day). Claimed rows go to SENDING so that two
-- runs never send the same e-mail; a row stuck in SENDING is never retried automatically (no double sending).
create or replace function public.scd_comm_outbox_claim(p_organization_id uuid, p_max integer)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_set public.scd_comm_settings%rowtype;
  v_day_start timestamptz := (date_trunc('day', now() at time zone 'Europe/Rome')) at time zone 'Europe/Rome';
  v_sent integer;
  v_room integer;
  v_items jsonb;
begin
  select * into v_set from public.scd_comm_settings s where s.organization_id = p_organization_id;
  if not found or not v_set.sending_enabled or not v_set.gmail_connected then
    return jsonb_build_object('enabled', false, 'items', '[]'::jsonb);
  end if;
  select count(*) into v_sent from public.scd_comm_recipients r
  where r.organization_id = p_organization_id and r.status in ('SENT','SENDING') and coalesce(r.sent_at, r.claimed_at) >= v_day_start;
  v_room := greatest(0, least(coalesce(p_max, 50), v_set.daily_cap - v_sent));
  with picked as (
    select r.id from public.scd_comm_recipients r join public.scd_comm_messages m on m.id = r.message_id
    where r.organization_id = p_organization_id and r.status = 'QUEUED' and m.delivery = 'QUEUED'
    order by m.queued_at, r.seq
    limit v_room
    for update of r skip locked
  ), claimed as (
    update public.scd_comm_recipients r set status = 'SENDING', claimed_at = now(), attempts = r.attempts + 1
    from picked where r.id = picked.id
    returning r.*
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'recipientId', c.id, 'messageId', m.id, 'threadId', m.thread_id, 'to', c.email, 'cc', to_jsonb(c.cc_emails),
      'bcc', case when c.seq = 1 and m.actor_copy_email is not null then jsonb_build_array(m.actor_copy_email) else '[]'::jsonb end,
      'subject', m.subject, 'body', m.body_text, 'office', m.sender_office,
      'senderName', (select coalesce(pr.display_name, split_part(u.email, '@', 1)) from auth.users u
                     left join public.scd_profiles pr on pr.user_id = u.id where u.id = m.sender_user_id),
      'gmailThreadId', coalesce(
         (select r2.gmail_thread_id from public.scd_comm_recipients r2 join public.scd_comm_messages m2 on m2.id = r2.message_id
          where m2.thread_id = m.thread_id and r2.email = c.email and r2.gmail_thread_id is not null order by r2.sent_at desc limit 1),
         (select m3.gmail_thread_id from public.scd_comm_messages m3 where m3.thread_id = m.thread_id and m3.direction = 'IN'
            and lower(m3.from_address) = c.email and m3.gmail_thread_id is not null order by m3.received_at desc limit 1)),
      'inReplyTo', (select m3.rfc_message_id from public.scd_comm_messages m3 where m3.thread_id = m.thread_id and m3.direction = 'IN'
            and lower(m3.from_address) = c.email and m3.rfc_message_id is not null order by m3.received_at desc limit 1)
    ) order by m.queued_at, c.seq), '[]'::jsonb)
  into v_items
  from claimed c join public.scd_comm_messages m on m.id = c.message_id;
  return jsonb_build_object('enabled', true, 'mailbox', v_set.mailbox, 'dailyCap', v_set.daily_cap, 'sentToday', v_sent,
    'room', v_room, 'items', v_items,
    'stillQueued', (select count(*) from public.scd_comm_recipients r where r.organization_id = p_organization_id and r.status = 'QUEUED'));
end;
$$;
revoke all on function public.scd_comm_outbox_claim(uuid, integer) from public, anon, authenticated;

create or replace function public.scd_comm_mark_delivery(
  p_recipient_id uuid,
  p_ok boolean,
  p_gmail_message_id text,
  p_gmail_thread_id text,
  p_rfc_message_id text,
  p_error text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_r public.scd_comm_recipients%rowtype;
  v_open integer;
  v_sent integer;
begin
  select * into v_r from public.scd_comm_recipients r where r.id = p_recipient_id for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'NOT_FOUND'); end if;
  if v_r.status <> 'SENDING' then return jsonb_build_object('ok', false, 'code', 'NOT_SENDING'); end if;
  update public.scd_comm_recipients set status = case when p_ok then 'SENT' else 'FAILED' end,
    sent_at = case when p_ok then now() end, gmail_message_id = p_gmail_message_id, gmail_thread_id = p_gmail_thread_id,
    rfc_message_id = p_rfc_message_id, error = left(p_error, 300)
  where id = v_r.id;
  select count(*) filter (where status in ('QUEUED','SENDING','PENDING')), count(*) filter (where status = 'SENT')
    into v_open, v_sent from public.scd_comm_recipients where message_id = v_r.message_id;
  if v_open = 0 then
    update public.scd_comm_messages set delivery = case when v_sent > 0 then 'SENT' else 'FAILED' end, sent_at = now(),
      gmail_thread_id = case when recipients_count = 1 then p_gmail_thread_id else gmail_thread_id end,
      gmail_message_id = case when recipients_count = 1 then p_gmail_message_id else gmail_message_id end,
      updated_at = now()
    where id = v_r.message_id;
    update public.scd_comm_threads t set gmail_thread_id = coalesce(t.gmail_thread_id, p_gmail_thread_id), updated_at = now()
    from public.scd_comm_messages m
    where m.id = v_r.message_id and t.id = m.thread_id and m.recipients_count = 1 and p_ok
      and not exists (select 1 from public.scd_comm_threads o where o.organization_id = t.organization_id and o.gmail_thread_id = p_gmail_thread_id);
  end if;
  perform public.scd_comm_audit(v_r.organization_id, case when p_ok then 'COMM_SENT' else 'COMM_SEND_FAILED' end,
    'scd_comm_recipient', v_r.id, jsonb_build_object('messageId', v_r.message_id, 'kind', v_r.kind, 'error', left(p_error, 120)));
  return jsonb_build_object('ok', true, 'messageClosed', v_open = 0);
end;
$$;
revoke all on function public.scd_comm_mark_delivery(uuid, boolean, text, text, text, text) from public, anon, authenticated;

-- Inbound mail from the sync. Idempotent on gmailMessageId. Matches the thread (Gmail thread of a sent envelope, of a
-- previous inbound message, or of the thread) and the counterpart (person by address, then contact; unknown address
-- -> PROPOSTO contact). Own messages and safeguarding subjects are not stored.
create or replace function public.scd_comm_record_inbound(p_organization_id uuid, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_set public.scd_comm_settings%rowtype;
  v_gid text := nullif(p_payload->>'gmailMessageId', '');
  v_gthread text := nullif(p_payload->>'gmailThreadId', '');
  v_from text := lower(trim(coalesce(p_payload->>'from', '')));
  v_from_name text := left(nullif(trim(p_payload->>'fromName'), ''), 160);
  v_subject text := left(coalesce(nullif(trim(p_payload->>'subject'), ''), '(senza oggetto)'), 250);
  v_thread_id uuid;
  v_person record;
  v_contact public.scd_comm_external_contacts%rowtype;
  v_match text;
  v_office text := 'SEGRETERIA';
  v_kind text := 'EXTERNAL';
  v_msg_id uuid;
begin
  select * into v_set from public.scd_comm_settings s where s.organization_id = p_organization_id;
  if not found then return jsonb_build_object('ok', false, 'code', 'NOT_CONFIGURED'); end if;
  if v_gid is null or v_from !~ '^[^@\s<>",;]+@[^@\s<>",;]+$' then return jsonb_build_object('ok', false, 'code', 'BAD_PAYLOAD'); end if;
  if exists (select 1 from public.scd_comm_messages m where m.gmail_message_id = v_gid) then
    return jsonb_build_object('ok', true, 'duplicate', true);
  end if;
  if v_from = lower(v_set.mailbox) then return jsonb_build_object('ok', true, 'skipped', 'OWN_MESSAGE'); end if;
  if v_subject ~* 'safeguarding' then return jsonb_build_object('ok', true, 'skipped', 'SAFEGUARDING_EXCLUDED'); end if;

  if v_gthread is not null then
    select m.thread_id into v_thread_id from public.scd_comm_recipients r join public.scd_comm_messages m on m.id = r.message_id
      where r.organization_id = p_organization_id and r.gmail_thread_id = v_gthread order by r.sent_at desc limit 1;
    if v_thread_id is null then
      select m.thread_id into v_thread_id from public.scd_comm_messages m
        where m.organization_id = p_organization_id and m.gmail_thread_id = v_gthread order by m.created_at desc limit 1;
    end if;
    if v_thread_id is null then
      select t.id into v_thread_id from public.scd_comm_threads t where t.organization_id = p_organization_id and t.gmail_thread_id = v_gthread;
    end if;
  end if;
  if v_thread_id is null and nullif(p_payload->>'inReplyTo', '') is not null then
    select m.thread_id into v_thread_id from public.scd_comm_recipients r join public.scd_comm_messages m on m.id = r.message_id
      where r.organization_id = p_organization_id and r.rfc_message_id = p_payload->>'inReplyTo' limit 1;
  end if;

  select p.id, p.display_name into v_person from public.scd_people p
  where p.organization_id = p_organization_id and lower(trim(p.email)) = v_from and p.status in ('ACTIVE','PENDING')
  order by (p.birth_date is not null and age(p.birth_date) >= interval '18 years') desc, p.created_at
  limit 1;
  if v_person.id is not null then
    v_match := 'PERSON'; v_kind := 'PERSON';
  else
    select * into v_contact from public.scd_comm_external_contacts c where c.organization_id = p_organization_id and c.email_norm = v_from;
    if not found then
      insert into public.scd_comm_external_contacts (organization_id, email, display_name, status)
      values (p_organization_id, v_from, v_from_name, 'PROPOSTO')
      on conflict (organization_id, email_norm) do nothing;
      select * into v_contact from public.scd_comm_external_contacts c where c.organization_id = p_organization_id and c.email_norm = v_from;
      v_match := 'PROPOSED';
    elsif v_contact.status = 'SCARTATO' then
      v_match := 'DISCARDED';
    else
      v_match := case when v_contact.status = 'PROPOSTO' then 'PROPOSED' else 'CONTACT' end;
      v_kind := case when v_contact.counterpart_kind = 'PERSON' then 'EXTERNAL' else v_contact.counterpart_kind end;
      if v_contact.counterpart_kind = 'SUPPLIER' then v_office := 'TESORERIA';
      elsif v_contact.counterpart_kind = 'SPONSOR' then v_office := 'DIREZIONE'; end if;
    end if;
  end if;

  if v_thread_id is null then
    insert into public.scd_comm_threads (organization_id, channel, subject, confidentiality, office, counterpart_kind,
      counterpart_person_id, counterpart_contact_id, counterpart_ref, counterpart_label, gmail_thread_id, unread, last_message_at)
    values (p_organization_id, 'EMAIL', v_subject, 'ORDINARIO', v_office, v_kind, v_person.id,
      case when v_person.id is null then v_contact.id end, case when v_person.id is null then v_contact.counterpart_ref end,
      left(coalesce(v_person.display_name, v_contact.display_name, v_contact.org_name, v_from_name, v_from), 200), v_gthread, true, now())
    returning id into v_thread_id;
  end if;

  insert into public.scd_comm_messages (organization_id, thread_id, direction, from_address, from_name, to_addresses, cc_addresses,
    subject, body_text, gmail_message_id, gmail_thread_id, rfc_message_id, in_reply_to, attachments_count, received_at)
  values (p_organization_id, v_thread_id, 'IN', v_from, v_from_name,
    coalesce((select array_agg(lower(trim(x))) from jsonb_array_elements_text(coalesce(p_payload->'to', '[]')) x), '{}'),
    coalesce((select array_agg(lower(trim(x))) from jsonb_array_elements_text(coalesce(p_payload->'cc', '[]')) x), '{}'),
    v_subject, left(coalesce(p_payload->>'bodyText', ''), 20000), v_gid, v_gthread, nullif(p_payload->>'rfcMessageId', ''),
    nullif(p_payload->>'inReplyTo', ''), greatest(0, coalesce(nullif(p_payload->>'attachments', '')::int, 0)),
    coalesce(nullif(p_payload->>'receivedAt', '')::timestamptz, now()))
  returning id into v_msg_id;
  update public.scd_comm_threads set unread = true, status = 'APERTO', last_message_at = now(), updated_at = now() where id = v_thread_id;
  perform public.scd_comm_audit(p_organization_id, 'COMM_INBOUND', 'scd_comm_message', v_msg_id,
    jsonb_build_object('threadId', v_thread_id, 'match', v_match, 'attachments', coalesce(nullif(p_payload->>'attachments', '')::int, 0)));
  return jsonb_build_object('ok', true, 'threadId', v_thread_id, 'messageId', v_msg_id, 'match', v_match);
end;
$$;
revoke all on function public.scd_comm_record_inbound(uuid, jsonb) from public, anon, authenticated;

-- Sync checkpoint: connection state after a verified token exchange, Gmail history cursor and last result.
create or replace function public.scd_comm_sync_checkpoint(p_organization_id uuid, p_connected boolean, p_history_id text, p_result jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_set public.scd_comm_settings%rowtype;
begin
  select * into v_set from public.scd_comm_settings s where s.organization_id = p_organization_id for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'NOT_FOUND'); end if;
  update public.scd_comm_settings set
    gmail_connected = p_connected,
    connected_at = case when p_connected and not v_set.gmail_connected then now() when not p_connected then null else connected_at end,
    sending_enabled = case when p_connected then sending_enabled else false end,
    history_id = coalesce(nullif(p_history_id, ''), history_id),
    last_sync_at = now(), last_sync_result = coalesce(p_result, '{}'::jsonb), updated_at = now()
  where organization_id = p_organization_id;
  if p_connected is distinct from v_set.gmail_connected then
    perform public.scd_comm_audit(p_organization_id, case when p_connected then 'COMM_GMAIL_CONNECTED' else 'COMM_GMAIL_DISCONNECTED' end,
      'scd_comm_settings', null, jsonb_build_object('sendingWasEnabled', v_set.sending_enabled));
  end if;
  return jsonb_build_object('ok', true, 'historyId', coalesce(nullif(p_history_id, ''), v_set.history_id));
end;
$$;
revoke all on function public.scd_comm_sync_checkpoint(uuid, boolean, text, jsonb) from public, anon, authenticated;

create or replace function public.scd_comm_sync_state(p_organization_id uuid)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  select jsonb_build_object('mailbox', s.mailbox, 'historyId', s.history_id, 'gmailConnected', s.gmail_connected,
    'sendingEnabled', s.sending_enabled, 'dailyCap', s.daily_cap)
  from public.scd_comm_settings s where s.organization_id = p_organization_id;
$$;
revoke all on function public.scd_comm_sync_state(uuid) from public, anon, authenticated;

-- ------------------------------------------------------------------ verification (raises on failure)
do $$
declare
  v_org uuid;
  v_bad integer;
  v_t text;
  v_f text;
begin
  foreach v_t in array array['scd_comm_settings','scd_comm_external_contacts','scd_comm_threads','scd_comm_messages','scd_comm_recipients'] loop
    if not exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
                   where n.nspname = 'public' and c.relname = v_t and c.relrowsecurity) then
      raise exception 'r95 verification: % missing or RLS disabled', v_t;
    end if;
  end loop;
  foreach v_f in array array['scd_comm_outbox_claim(uuid,integer)','scd_comm_mark_delivery(uuid,boolean,text,text,text,text)',
                             'scd_comm_record_inbound(uuid,jsonb)','scd_comm_sync_checkpoint(uuid,boolean,text,jsonb)',
                             'scd_comm_sync_state(uuid)','scd_comm_resolve_core(uuid,jsonb)','scd_comm_resolve_envelopes(uuid,jsonb)',
                             'scd_comm_audit(uuid,text,text,uuid,jsonb)'] loop
    if has_function_privilege('anon', 'public.' || v_f, 'execute') or has_function_privilege('authenticated', 'public.' || v_f, 'execute') then
      raise exception 'r95 verification: % must be service-only', v_f;
    end if;
  end loop;
  foreach v_f in array array['scd_comm_create_draft(uuid,uuid,uuid,text,text,text,text,jsonb)','scd_comm_queue(uuid)',
                             'scd_comm_resolve_recipients(uuid,jsonb)','scd_comm_inbox(uuid)'] loop
    if has_function_privilege('anon', 'public.' || v_f, 'execute') then
      raise exception 'r95 verification: % must not be executable by anon', v_f;
    end if;
  end loop;
  if exists (select 1 from public.scd_comm_settings where sending_enabled and not gmail_connected) then
    raise exception 'r95 verification: sending cannot be enabled without a connected mailbox';
  end if;

  for v_org in select id from public.scd_organizations loop
    -- no envelope (To or Cc) may use an address that belongs only to children under 14
    select count(*) into v_bad
    from public.scd_comm_resolve_envelopes(v_org, '{"kind":"ALL_MEMBERS"}'::jsonb) e
    where e.excluded_reason is null and exists (
      select 1 from public.scd_people p
      where p.organization_id = v_org and p.email is not null
        and (lower(trim(p.email)) = e.email or lower(trim(p.email)) = any(e.cc))
        and p.birth_date is not null and age(current_date, p.birth_date) < interval '14 years'
        and not exists (select 1 from public.scd_people q where q.organization_id = v_org and lower(trim(q.email)) = lower(trim(p.email))
                          and ((q.birth_date is not null and age(current_date, q.birth_date) >= interval '18 years')
                               or exists (select 1 from public.scd_family_members gm where gm.person_id = q.id and gm.is_guardian))));
    if v_bad > 0 then raise exception 'r95 verification: % envelopes reach an under-14 address', v_bad; end if;
    -- a 14-17 athlete is never written to without a guardian in copy
    select count(*) into v_bad from public.scd_comm_resolve_envelopes(v_org, '{"kind":"ALL_MEMBERS"}'::jsonb) e
    where e.excluded_reason is null and e.kind = 'MINOR_WITH_GUARDIANS' and cardinality(e.cc) = 0;
    if v_bad > 0 then raise exception 'r95 verification: % minor envelopes without guardian copy', v_bad; end if;
    -- a direct envelope is only for a known adult
    select count(*) into v_bad from public.scd_comm_resolve_envelopes(v_org, '{"kind":"ALL_MEMBERS"}'::jsonb) e
    join public.scd_people p on p.id = e.person_id
    where e.excluded_reason is null and e.kind = 'DIRECT' and (p.birth_date is null or age(current_date, p.birth_date) < interval '18 years');
    if v_bad > 0 then raise exception 'r95 verification: % direct envelopes to non-adults', v_bad; end if;
    -- unknown audiences resolve to nothing
    select count(*) into v_bad from public.scd_comm_resolve_envelopes(v_org, '{"kind":"EVERYONE"}'::jsonb) e where e.excluded_reason is null;
    if v_bad > 0 then raise exception 'r95 verification: unknown audience produced envelopes'; end if;
  end loop;
end $$;
