-- r101: Fondo Solidale, "Adotta un oggetto", donations (money and goods) and improvement proposals
-- (Direzione 2026-10-14, UD-113). STAGED: written, NOT applied.
-- Apply only after the Direzione's explicit OK ("serve l'OK della Direzione per applicare r101"). Requires r100
-- (scd_person_grants, scd_can, scd_section_catalog) already applied.
--
-- What it adds (additive only, no existing table or row is changed, no row is inserted):
--   * four sections in the catalogue (config/scd-sections.v1.json): fondo-solidale (sensitive), adotta,
--     donazioni (sensitive), proposte; scd_section_catalog() is recreated with every r100 entry identical;
--   * Fondo Solidale: applications with confidential review (ISEE, names and contacts readable ONLY through
--     functions that check scd_can('fondo-solidale', ...)), decision with reduced fee, deadlines, Fund income
--     (donations, events, dedicated sponsors), outgoings (fees covered) and an aggregated report;
--     no double discount: an approved application must declare that no sibling discount applies or that the family
--     gives it up, checked by a table constraint AND against the Gestionale copy (scd_fee_positions.family_rule);
--   * "Adotta un oggetto": catalogue of things the club needs (category, supplier, product code and link, club photo,
--     total price or "da preventivo", status), partial adoption by many donors with progress, numbered units
--     (e.g. tribune seats) with an optional plate text;
--   * donations: money is RECORDED by the treasury (no payment processing in the app); goods are OFFERED by anyone
--     (campaigns "Adotta la nuova palestra SCD" and "Adotta la nuova infermeria"), reviewed by staff, checked,
--     received and inventoried; medicines only sealed and not expired, opened or expired medicines never accepted;
--     medical items are accepted only with the infermeria grant;
--   * donor visibility on every donation/adoption: NOME_PUBBLICO / ANONIMO_PUBBLICO (name kept only for the
--     treasury receipt, never shown) / COMPLETAMENTE_ANONIMO (no personal data at all, therefore no receipt);
--     no amount per person is ever public unless the donor consents (show_amount); aggregated amounts are public
--     only when at least 3 contributions are behind them or every contributor consented;
--   * improvement proposals from anyone (signed in or not), optionally anonymous, with "posso contribuire";
--     staff triage; never public until staff publish a text written by staff and free of contacts;
--   * audit of every change in scd_giving_events (statuses and codes only: never ISEE, names or contacts).
--
-- Access: tables have RLS on and NO policy (nobody reads or writes them directly); everything goes through the
-- SECURITY DEFINER functions below, which check scd_can (r100) for the back office and are rate limited for the
-- public entry points. The catalogue literal is kept equal to config/scd-sections.v1.json by
-- apps/superapp/src/lib/person-grants.test.ts; the pure rules are mirrored in apps/superapp/src/lib/giving.ts and
-- pinned by apps/superapp/src/lib/giving.test.ts.

-- 1. Section catalogue: r100 entries unchanged, UD-113 sections appended.
create or replace function public.scd_section_catalog()
returns table (code text, levels text[], perimeters text[], base boolean, hard_blocked boolean, direction_only boolean, sensitive boolean)
language sql
immutable
set search_path to 'public'
as $$
  select x.code,
         array(select jsonb_array_elements_text(x.levels)),
         array(select jsonb_array_elements_text(x.perimeters)),
         x.base, x.hard_blocked, x.direction_only, x.sensitive
  from jsonb_to_recordset($cat$
[
  {"code":"pubblico","levels":["READ"],"perimeters":["ALL"],"base":true,"hard_blocked":false,"direction_only":false,"sensitive":false},
  {"code":"profilo","levels":["WRITE"],"perimeters":["SELF"],"base":true,"hard_blocked":false,"direction_only":false,"sensitive":false},
  {"code":"tessera","levels":["READ"],"perimeters":["SELF"],"base":true,"hard_blocked":false,"direction_only":false,"sensitive":false},
  {"code":"mister","levels":["READ","WRITE","APPROVE"],"perimeters":["ALL","OWN_TEAMS"],"base":false,"hard_blocked":false,"direction_only":false,"sensitive":true},
  {"code":"quadro","levels":["READ","WRITE"],"perimeters":["ALL","OWN_TEAMS","OWN_SITE"],"base":false,"hard_blocked":false,"direction_only":false,"sensitive":false},
  {"code":"impianti-campi","levels":["READ","WRITE","APPROVE"],"perimeters":["ALL","OWN_SITE"],"base":false,"hard_blocked":false,"direction_only":false,"sensitive":false},
  {"code":"mappa","levels":["READ"],"perimeters":["ALL","OWN_SITE"],"base":false,"hard_blocked":false,"direction_only":false,"sensitive":false},
  {"code":"organigramma","levels":["READ","WRITE"],"perimeters":["ALL"],"base":false,"hard_blocked":false,"direction_only":false,"sensitive":false},
  {"code":"pulmini","levels":["READ","WRITE","APPROVE"],"perimeters":["ALL","OWN_TEAMS","SELF"],"base":false,"hard_blocked":false,"direction_only":false,"sensitive":true},
  {"code":"famiglia","levels":["READ","WRITE"],"perimeters":["OWN_CHILDREN","SELF"],"base":false,"hard_blocked":false,"direction_only":false,"sensitive":false},
  {"code":"infermeria","levels":["READ","WRITE"],"perimeters":["ALL","OWN_SITE","OWN_CHILDREN","SELF"],"base":false,"hard_blocked":false,"direction_only":false,"sensitive":true},
  {"code":"salute-minori","levels":[],"perimeters":[],"base":false,"hard_blocked":true,"direction_only":false,"sensitive":true},
  {"code":"safeguarding","levels":[],"perimeters":[],"base":false,"hard_blocked":true,"direction_only":false,"sensitive":true},
  {"code":"magazzino","levels":["READ","WRITE","APPROVE"],"perimeters":["ALL","OWN_SITE"],"base":false,"hard_blocked":false,"direction_only":false,"sensitive":false},
  {"code":"club-house","levels":["READ","WRITE"],"perimeters":["ALL","OWN_SITE"],"base":false,"hard_blocked":false,"direction_only":false,"sensitive":false},
  {"code":"biglietteria","levels":["READ","WRITE"],"perimeters":["ALL","OWN_SITE"],"base":false,"hard_blocked":false,"direction_only":false,"sensitive":false},
  {"code":"magazzino-cassa","levels":["READ","WRITE"],"perimeters":["ALL","OWN_SITE"],"base":false,"hard_blocked":false,"direction_only":false,"sensitive":false},
  {"code":"segreteria","levels":["READ","WRITE"],"perimeters":["ALL","OWN_TEAMS"],"base":false,"hard_blocked":false,"direction_only":false,"sensitive":false},
  {"code":"persone","levels":["READ","WRITE","APPROVE"],"perimeters":["ALL","OWN_TEAMS"],"base":false,"hard_blocked":false,"direction_only":false,"sensitive":true},
  {"code":"certificati","levels":["READ","WRITE"],"perimeters":["ALL","OWN_TEAMS"],"base":false,"hard_blocked":false,"direction_only":false,"sensitive":true},
  {"code":"coda","levels":["READ","WRITE","APPROVE"],"perimeters":["ALL"],"base":false,"hard_blocked":false,"direction_only":false,"sensitive":false},
  {"code":"posta","levels":["READ","WRITE","APPROVE"],"perimeters":["ALL"],"base":false,"hard_blocked":false,"direction_only":false,"sensitive":true},
  {"code":"crm","levels":["READ","WRITE","APPROVE"],"perimeters":["ALL"],"base":false,"hard_blocked":false,"direction_only":false,"sensitive":false},
  {"code":"crea","levels":["WRITE","APPROVE"],"perimeters":["ALL","OWN_TEAMS"],"base":false,"hard_blocked":false,"direction_only":false,"sensitive":false},
  {"code":"tesoreria","levels":["READ"],"perimeters":["ALL"],"base":false,"hard_blocked":false,"direction_only":false,"sensitive":true},
  {"code":"quote","levels":["READ","WRITE","APPROVE"],"perimeters":["ALL","OWN_TEAMS"],"base":false,"hard_blocked":false,"direction_only":false,"sensitive":true},
  {"code":"compensi","levels":["READ","WRITE","APPROVE"],"perimeters":["ALL","SELF"],"base":false,"hard_blocked":false,"direction_only":false,"sensitive":true},
  {"code":"scadenzario","levels":["READ","WRITE","APPROVE"],"perimeters":["ALL"],"base":false,"hard_blocked":false,"direction_only":false,"sensitive":false},
  {"code":"movimenti","levels":["READ","WRITE"],"perimeters":["ALL"],"base":false,"hard_blocked":false,"direction_only":false,"sensitive":true},
  {"code":"direzione","levels":["READ"],"perimeters":["ALL"],"base":false,"hard_blocked":false,"direction_only":false,"sensitive":false},
  {"code":"acquisti","levels":["READ","WRITE","APPROVE"],"perimeters":["ALL"],"base":false,"hard_blocked":false,"direction_only":false,"sensitive":false},
  {"code":"cervellone","levels":["READ","WRITE"],"perimeters":["ALL"],"base":false,"hard_blocked":false,"direction_only":false,"sensitive":true},
  {"code":"accessi","levels":["READ"],"perimeters":["ALL"],"base":false,"hard_blocked":false,"direction_only":false,"sensitive":true},
  {"code":"posta-collega","levels":[],"perimeters":[],"base":false,"hard_blocked":false,"direction_only":true,"sensitive":true},
  {"code":"partner","levels":["READ","WRITE"],"perimeters":["SELF"],"base":false,"hard_blocked":false,"direction_only":false,"sensitive":false},
  {"code":"fondo-solidale","levels":["READ","WRITE","APPROVE"],"perimeters":["ALL"],"base":false,"hard_blocked":false,"direction_only":false,"sensitive":true},
  {"code":"adotta","levels":["READ","WRITE","APPROVE"],"perimeters":["ALL"],"base":false,"hard_blocked":false,"direction_only":false,"sensitive":false},
  {"code":"donazioni","levels":["READ","WRITE","APPROVE"],"perimeters":["ALL"],"base":false,"hard_blocked":false,"direction_only":false,"sensitive":true},
  {"code":"proposte","levels":["READ","WRITE","APPROVE"],"perimeters":["ALL"],"base":false,"hard_blocked":false,"direction_only":false,"sensitive":false}
]
$cat$::jsonb) as x(code text, levels jsonb, perimeters jsonb, base boolean, hard_blocked boolean, direction_only boolean, sensitive boolean);
$$;

-- 2. Shared helpers.
-- Feature probe used by the app (apps/superapp/src/lib/giving.server.ts): until this exists the pages say
-- "Da attivare".
create or replace function public.scd_giving_engine()
returns text language sql immutable set search_path to 'public' as $$ select 'r101'::text; $$;

-- The club organisation for the public entry points (same rule as r64 scd_request_access).
create or replace function public.scd_giving_org()
returns uuid language sql stable security definer set search_path to 'public' as $$
  select id from public.scd_organizations order by created_at limit 1;
$$;

-- Raises 42501 unless scd_can(section, level, org) answers true for the caller.
create or replace function public.scd_giving_need(p_section text, p_level text, p_organization_id uuid)
returns void language plpgsql stable security definer set search_path to 'public' as $$
begin
  if not coalesce(public.scd_can(p_section, p_level, p_organization_id), false) then
    raise exception 'not enabled: % %', p_section, p_level using errcode = '42501';
  end if;
end;
$$;

-- True when a free text contains something that looks like a contact or an identifier (e-mail, phone number,
-- Italian fiscal code, IBAN). Used to keep anonymous texts anonymous and published texts free of personal data.
create or replace function public.scd_giving_has_contact(p_text text)
returns boolean language sql immutable set search_path to 'public' as $$
  select coalesce(p_text, '') ~* '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}'
      or regexp_replace(coalesce(p_text, ''), '[\s./-]', '', 'g') ~ '\+?[0-9]{8,}'
      or upper(coalesce(p_text, '')) ~ '[A-Z]{6}[0-9LMNPQRSTUV]{2}[A-EHLMPRST][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]'
      or upper(regexp_replace(coalesce(p_text, ''), '\s', '', 'g')) ~ 'IT[0-9]{2}[A-Z][0-9]{10}[0-9A-Z]{12}';
$$;

-- Allowed status changes, one list per kind (mirrored by giving.ts TRANSITIONS).
create or replace function public.scd_giving_transition_ok(p_kind text, p_from text, p_to text)
returns boolean language sql immutable set search_path to 'public' as $$
  select exists (
    select 1 from jsonb_each($tr$
{
  "FUND_APPLICATION": {"INVIATA":["IN_ESAME","RITIRATA"],"IN_ESAME":["INTEGRAZIONE","APPROVATA","RESPINTA","RITIRATA"],"INTEGRAZIONE":["IN_ESAME","RITIRATA","SCADUTA"],"APPROVATA":["SCADUTA"]},
  "DONATION": {"PROMESSA":["RICEVUTA","ANNULLATA"],"RICEVUTA":["ANNULLATA"]},
  "ADOPT_ITEM": {"BOZZA":["DA_ADOTTARE","RITIRATO"],"DA_ADOTTARE":["IN_RACCOLTA","ADOTTATO","RITIRATO","BOZZA"],"IN_RACCOLTA":["ADOTTATO","DA_ADOTTARE","RITIRATO"],"ADOTTATO":["CONSEGNATO","IN_RACCOLTA"]},
  "INKIND_OFFER": {"NUOVA":["INFO_RICHIESTE","ACCETTATA","RIFIUTATA","ANNULLATA"],"INFO_RICHIESTE":["ACCETTATA","RIFIUTATA","ANNULLATA"],"ACCETTATA":["RICEVUTA","RIFIUTATA","ANNULLATA"],"RICEVUTA":["INVENTARIATA"]},
  "PROPOSAL": {"NUOVA":["IN_VALUTAZIONE","NON_FATTIBILE","SPAM"],"IN_VALUTAZIONE":["ACCETTATA","NON_FATTIBILE"]}
}
$tr$::jsonb -> p_kind) e(from_status, targets)
    where e.from_status = p_from and e.targets ? p_to);
$$;

-- 3. Tables. RLS on, no policy: only the functions below read or write.

-- Settings decided by the Direzione (one row per organisation; absent = everything off).
create table if not exists public.scd_giving_settings (
  organization_id uuid primary key references public.scd_organizations(id) on delete cascade,
  fund_public_totals boolean not null default false,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
comment on table public.scd_giving_settings is 'UD-113: Direzione switches (public aggregated Fund totals). Off until the Direzione decides.';

create table if not exists public.scd_fund_applications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  code text not null,
  season text not null default '2026/27' check (season ~ '^\d{4}/\d{2}$'),
  beneficiary_person_id uuid references public.scd_people(id) on delete set null,
  submitted_by uuid references auth.users(id) on delete set null,
  applicant_name text not null check (char_length(applicant_name) between 2 and 120),
  beneficiary_label text not null default '' check (char_length(beneficiary_label) <= 120),
  contact_email text check (contact_email is null or char_length(contact_email) <= 120),
  contact_phone text check (contact_phone is null or char_length(contact_phone) <= 30),
  fee_source_record_id text check (fee_source_record_id is null or char_length(fee_source_record_id) <= 60),
  isee_value numeric(10,2) check (isee_value is null or isee_value >= 0),
  isee_expires_on date,
  documents_ref text check (documents_ref is null or char_length(documents_ref) <= 200),
  household_note text not null default '' check (char_length(household_note) <= 1000),
  sibling_discount text not null default 'DA_VERIFICARE' check (sibling_discount in ('DA_VERIFICARE','NESSUNO','PRESENTE','PRESENTE_RINUNCIA')),
  status text not null default 'INVIATA' check (status in ('INVIATA','IN_ESAME','INTEGRAZIONE','APPROVATA','RESPINTA','RITIRATA','SCADUTA')),
  submitted_at timestamptz not null default now(),
  review_due date,
  documents_due date,
  decided_at timestamptz,
  decided_by uuid references auth.users(id) on delete set null,
  decision_reason text check (decision_reason is null or char_length(decision_reason) <= 500),
  base_fee numeric(10,2) check (base_fee is null or base_fee >= 0),
  reduced_fee numeric(10,2) check (reduced_fee is null or reduced_fee >= 0),
  valid_until date,
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  -- No double discount: an approved application never sits on top of the sibling discount.
  constraint scd_fund_no_double_discount check (status <> 'APPROVATA' or sibling_discount in ('NESSUNO','PRESENTE_RINUNCIA')),
  constraint scd_fund_decision_shape check (
    status <> 'APPROVATA'
    or (base_fee is not null and reduced_fee is not null and reduced_fee <= base_fee and decided_at is not null
        and char_length(coalesce(decision_reason, '')) >= 3)),
  constraint scd_fund_rejection_reason check (status <> 'RESPINTA' or char_length(coalesce(decision_reason, '')) >= 3)
);
create unique index if not exists scd_fund_one_approved_person_idx
  on public.scd_fund_applications(organization_id, season, beneficiary_person_id)
  where status = 'APPROVATA' and beneficiary_person_id is not null;
create unique index if not exists scd_fund_one_approved_fee_idx
  on public.scd_fund_applications(organization_id, season, fee_source_record_id)
  where status = 'APPROVATA' and fee_source_record_id is not null;
create index if not exists scd_fund_applications_status_idx on public.scd_fund_applications(organization_id, season, status);
create index if not exists scd_fund_applications_beneficiary_idx on public.scd_fund_applications(beneficiary_person_id);
create index if not exists scd_fund_applications_submitted_by_idx on public.scd_fund_applications(submitted_by);
create index if not exists scd_fund_applications_decided_by_idx on public.scd_fund_applications(decided_by);
comment on table public.scd_fund_applications is
  'UD-113 Fondo Solidale applications. CONFIDENTIAL: ISEE, names and contacts are readable only through functions that check scd_can(''fondo-solidale''). The fee itself stays in the Gestionale (UD-082): the decision says how much the family pays.';

create table if not exists public.scd_adopt_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  code text not null,
  title text not null check (char_length(title) between 3 and 120),
  category text not null check (category in ('ATTREZZATURA_CAMPO','AREA_FITNESS','AREA_GIOCHI_BAMBINI','TRIBUNA_IMPIANTO','PALESTRA','INFERMERIA','CLUB_HOUSE','MEZZI','ALTRO')),
  description text not null default '' check (char_length(description) <= 1500),
  supplier text check (supplier is null or char_length(supplier) <= 120),
  supplier_code text check (supplier_code is null or char_length(supplier_code) <= 60),
  product_url text check (product_url is null or (product_url ~ '^https://[^\s]+$' and char_length(product_url) <= 500)),
  -- Club-provided photo only (path in the club's own assets); supplier catalogue images are never copied.
  photo_path text check (photo_path is null or (photo_path ~ '^/[A-Za-z0-9/_.-]+\.(webp|jpg|jpeg|png)$' and char_length(photo_path) <= 200)),
  price_mode text not null default 'DA_PREVENTIVO' check (price_mode in ('PREZZO','DA_PREVENTIVO','DA_PREVENTIVO_AGGIORNATO')),
  price_total numeric(10,2),
  price_note text check (price_note is null or char_length(price_note) <= 200),
  quote_ref text check (quote_ref is null or char_length(quote_ref) <= 200),
  quote_valid_until date,
  unit_label text check (unit_label is null or char_length(unit_label) <= 30),
  units_total integer check (units_total is null or units_total between 1 and 2000),
  unit_price numeric(10,2) check (unit_price is null or unit_price > 0),
  campaign text check (campaign is null or campaign in ('PALESTRA','INFERMERIA')),
  proposal_id uuid,
  status text not null default 'BOZZA' check (status in ('BOZZA','DA_ADOTTARE','IN_RACCOLTA','ADOTTATO','CONSEGNATO','RITIRATO')),
  published boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  constraint scd_adopt_price_shape check (
    (price_mode = 'PREZZO' and price_total is not null and price_total > 0)
    or (price_mode <> 'PREZZO' and price_total is null)),
  constraint scd_adopt_units_shape check ((units_total is null) = (unit_label is null)),
  constraint scd_adopt_unit_price_needs_units check (unit_price is null or units_total is not null),
  constraint scd_adopt_published_not_draft check (not published or status not in ('BOZZA','RITIRATO'))
);
create index if not exists scd_adopt_items_public_idx on public.scd_adopt_items(organization_id, published, status);
create index if not exists scd_adopt_items_created_by_idx on public.scd_adopt_items(created_by);
comment on table public.scd_adopt_items is 'UD-113 "Adotta un oggetto": what the club needs. A price whose quote has expired is shown as "da preventivo aggiornato" (scd_adopt_effective_price_mode).';

create table if not exists public.scd_donations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  code text not null,
  purpose text not null check (purpose in ('FONDO_SOLIDALE','ADOTTA_OGGETTO','GENERALE')),
  item_id uuid references public.scd_adopt_items(id) on delete restrict,
  unit_number integer check (unit_number is null or unit_number >= 1),
  visibility text not null default 'ANONIMO_PUBBLICO' check (visibility in ('NOME_PUBBLICO','ANONIMO_PUBBLICO','COMPLETAMENTE_ANONIMO')),
  donor_name text check (donor_name is null or char_length(donor_name) between 2 and 120),
  donor_contact text check (donor_contact is null or char_length(donor_contact) <= 120),
  donor_fiscal_code text check (donor_fiscal_code is null or donor_fiscal_code ~ '^[A-Z0-9]{11,16}$'),
  public_name text check (public_name is null or char_length(public_name) between 2 and 60),
  plate_text text check (plate_text is null or char_length(plate_text) between 2 and 60),
  show_amount boolean not null default false,
  pledged_amount numeric(10,2) check (pledged_amount is null or pledged_amount > 0),
  amount numeric(10,2) check (amount is null or amount > 0),
  channel text check (channel is null or channel in ('BONIFICO','CONTANTI','POS','ASSEGNO','ALTRO')),
  received_on date,
  receipt_number text check (receipt_number is null or char_length(receipt_number) <= 40),
  receipt_issued_on date,
  status text not null default 'PROMESSA' check (status in ('PROMESSA','RICEVUTA','ANNULLATA')),
  void_reason text check (void_reason is null or char_length(void_reason) <= 300),
  source text not null default 'TESORERIA' check (source in ('PUBBLICO','TESORERIA')),
  recorded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  constraint scd_donation_item_shape check ((purpose = 'ADOTTA_OGGETTO') = (item_id is not null)),
  constraint scd_donation_unit_needs_item check (unit_number is null or item_id is not null),
  -- Completely anonymous: no personal data at all, therefore no receipt.
  constraint scd_donation_full_anonymity check (
    visibility <> 'COMPLETAMENTE_ANONIMO'
    or (donor_name is null and donor_contact is null and donor_fiscal_code is null and public_name is null
        and plate_text is null and receipt_number is null and receipt_issued_on is null and not show_amount)),
  -- Public name, plate and amount only with the donor's choice "nome pubblico".
  constraint scd_donation_public_only_named check (
    visibility = 'NOME_PUBBLICO' or (public_name is null and plate_text is null and not show_amount)),
  constraint scd_donation_named_has_name check (visibility <> 'NOME_PUBBLICO' or public_name is not null),
  constraint scd_donation_received_shape check (
    status <> 'RICEVUTA' or (amount is not null and channel is not null and received_on is not null)),
  constraint scd_donation_void_reason check (status <> 'ANNULLATA' or char_length(coalesce(void_reason, '')) >= 3),
  constraint scd_donation_receipt_needs_receipt check (receipt_number is null or status = 'RICEVUTA')
);
create unique index if not exists scd_donations_one_unit_idx
  on public.scd_donations(item_id, unit_number) where unit_number is not null and status = 'RICEVUTA';
create index if not exists scd_donations_item_idx on public.scd_donations(item_id, status);
create index if not exists scd_donations_status_idx on public.scd_donations(organization_id, status, created_at desc);
create index if not exists scd_donations_recorded_by_idx on public.scd_donations(recorded_by);
comment on table public.scd_donations is
  'UD-113 money donations and adoptions. The app never processes payments: a public pledge is PROMESSA, the treasury records RICEVUTA from the official channel. Donor data readable only with scd_can(''donazioni'').';

create table if not exists public.scd_adopt_units (
  item_id uuid not null references public.scd_adopt_items(id) on delete cascade,
  number integer not null check (number >= 1),
  status text not null default 'LIBERO' check (status in ('LIBERO','ADOTTATO')),
  donation_id uuid references public.scd_donations(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (item_id, number),
  constraint scd_adopt_unit_shape check ((status = 'ADOTTATO') = (donation_id is not null))
);
create index if not exists scd_adopt_units_donation_idx on public.scd_adopt_units(donation_id);

create table if not exists public.scd_fund_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  season text not null default '2026/27' check (season ~ '^\d{4}/\d{2}$'),
  direction text not null check (direction in ('ENTRATA','USCITA')),
  source text not null check (source in ('DONAZIONE','EVENTO','SPONSOR_DEDICATO','ALTRA_ENTRATA','QUOTA_COPERTA','ALTRA_USCITA')),
  amount numeric(10,2) not null check (amount > 0),
  occurred_on date not null,
  description text not null default '' check (char_length(description) <= 200),
  donation_id uuid references public.scd_donations(id) on delete restrict,
  application_id uuid references public.scd_fund_applications(id) on delete restrict,
  ledger_ref text check (ledger_ref is null or char_length(ledger_ref) <= 80),
  recorded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  voided_at timestamptz,
  voided_by uuid references auth.users(id) on delete set null,
  void_reason text check (void_reason is null or char_length(void_reason) <= 300),
  constraint scd_fund_movement_direction check (
    (direction = 'ENTRATA' and source in ('DONAZIONE','EVENTO','SPONSOR_DEDICATO','ALTRA_ENTRATA'))
    or (direction = 'USCITA' and source in ('QUOTA_COPERTA','ALTRA_USCITA'))),
  constraint scd_fund_movement_links check (
    (source = 'DONAZIONE') = (donation_id is not null)
    and (source = 'QUOTA_COPERTA') = (application_id is not null)),
  constraint scd_fund_movement_void check (voided_at is null or char_length(coalesce(void_reason, '')) >= 3)
);
create unique index if not exists scd_fund_movements_one_per_donation_idx
  on public.scd_fund_movements(donation_id) where donation_id is not null and voided_at is null;
create index if not exists scd_fund_movements_season_idx on public.scd_fund_movements(organization_id, season, occurred_on);
create index if not exists scd_fund_movements_application_idx on public.scd_fund_movements(application_id);
create index if not exists scd_fund_movements_recorded_by_idx on public.scd_fund_movements(recorded_by);
create index if not exists scd_fund_movements_voided_by_idx on public.scd_fund_movements(voided_by);
comment on table public.scd_fund_movements is 'UD-113 Fondo Solidale income and outgoings. Never deleted: a wrong row is voided with a reason.';

create table if not exists public.scd_inkind_offers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  code text not null,
  campaign text not null check (campaign in ('PALESTRA','INFERMERIA','ALTRO')),
  item_id uuid references public.scd_adopt_items(id) on delete set null,
  what text not null check (char_length(what) between 3 and 200),
  quantity integer not null default 1 check (quantity between 1 and 500),
  condition text not null check (condition in ('NUOVO_SIGILLATO','NUOVO','OTTIMO','BUONO','DA_VERIFICARE')),
  medical_kind text not null default 'NON_MEDICO' check (medical_kind in ('NON_MEDICO','FARMACO','DISPOSITIVO','MATERIALE_CONSUMO','ARREDO')),
  sealed boolean not null default false,
  expires_on date,
  professional_check boolean not null default false,
  has_photos boolean not null default false,
  handover text not null check (handover in ('RITIRO','CONSEGNA')),
  town text check (town is null or char_length(town) <= 60),
  note text not null default '' check (char_length(note) <= 500),
  visibility text not null default 'ANONIMO_PUBBLICO' check (visibility in ('NOME_PUBBLICO','ANONIMO_PUBBLICO','COMPLETAMENTE_ANONIMO')),
  donor_name text check (donor_name is null or char_length(donor_name) between 2 and 120),
  donor_contact text check (donor_contact is null or char_length(donor_contact) <= 120),
  public_name text check (public_name is null or char_length(public_name) between 2 and 60),
  status text not null default 'NUOVA' check (status in ('NUOVA','INFO_RICHIESTE','ACCETTATA','RIFIUTATA','RICEVUTA','INVENTARIATA','ANNULLATA')),
  decline_reason text check (decline_reason is null or char_length(decline_reason) <= 300),
  info_request text check (info_request is null or char_length(info_request) <= 300),
  condition_checked boolean not null default false,
  condition_note text check (condition_note is null or char_length(condition_note) <= 300),
  received_on date,
  inventory_ref text check (inventory_ref is null or char_length(inventory_ref) <= 80),
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  -- Opened or undated medicines are never accepted (expiry is checked against the day in the functions).
  constraint scd_inkind_medicine_sealed check (
    medical_kind <> 'FARMACO' or status in ('NUOVA','INFO_RICHIESTE','RIFIUTATA','ANNULLATA')
    or (sealed and expires_on is not null)),
  -- Other medical items: new and sealed, or verifiable by a professional.
  constraint scd_inkind_medical_verifiable check (
    medical_kind not in ('DISPOSITIVO','MATERIALE_CONSUMO') or status in ('NUOVA','INFO_RICHIESTE','RIFIUTATA','ANNULLATA')
    or condition = 'NUOVO_SIGILLATO' or professional_check),
  constraint scd_inkind_full_anonymity check (
    visibility <> 'COMPLETAMENTE_ANONIMO' or (donor_name is null and donor_contact is null and public_name is null)),
  constraint scd_inkind_public_only_named check (visibility = 'NOME_PUBBLICO' or public_name is null),
  -- Goods need someone to arrange pickup or delivery with: a completely anonymous offer must be delivered.
  constraint scd_inkind_anonymous_delivers check (visibility <> 'COMPLETAMENTE_ANONIMO' or handover = 'CONSEGNA'),
  constraint scd_inkind_decline_reason check (status <> 'RIFIUTATA' or char_length(coalesce(decline_reason, '')) >= 3),
  constraint scd_inkind_received_checked check (status not in ('RICEVUTA','INVENTARIATA') or (condition_checked and received_on is not null)),
  constraint scd_inkind_inventoried check (status <> 'INVENTARIATA' or inventory_ref is not null)
);
create index if not exists scd_inkind_offers_status_idx on public.scd_inkind_offers(organization_id, campaign, status);
create index if not exists scd_inkind_offers_item_idx on public.scd_inkind_offers(item_id);
create index if not exists scd_inkind_offers_reviewed_by_idx on public.scd_inkind_offers(reviewed_by);
comment on table public.scd_inkind_offers is 'UD-113 goods offered to the club (campaigns palestra / infermeria). Medicines: sealed and not expired only.';

create table if not exists public.scd_improvement_proposals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  code text not null,
  area text not null check (area in ('CAMPI','PALESTRA','INFERMERIA','CLUB_HOUSE','SICUREZZA','ALTRO')),
  title text not null check (char_length(title) between 5 and 80),
  body text not null check (char_length(body) between 10 and 1000),
  anonymous boolean not null default true,
  author_user_id uuid references auth.users(id) on delete set null,
  contact text check (contact is null or char_length(contact) <= 120),
  can_contribute text[] not null default '{}' check (can_contribute <@ array['TEMPO','BENI','DENARO']),
  status text not null default 'NUOVA' check (status in ('NUOVA','IN_VALUTAZIONE','ACCETTATA','NON_FATTIBILE','SPAM')),
  reason text check (reason is null or char_length(reason) <= 300),
  published boolean not null default false,
  public_title text check (public_title is null or char_length(public_title) between 5 and 80),
  public_text text check (public_text is null or char_length(public_text) between 10 and 600),
  item_id uuid references public.scd_adopt_items(id) on delete set null,
  triaged_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  constraint scd_proposal_anonymous check (not anonymous or (author_user_id is null and contact is null)),
  constraint scd_proposal_not_feasible_reason check (status <> 'NON_FATTIBILE' or char_length(coalesce(reason, '')) >= 3),
  -- Published only as a text written by staff, free of contacts, for accepted or feasible proposals.
  constraint scd_proposal_publish_shape check (
    not published or (status in ('IN_VALUTAZIONE','ACCETTATA') and public_title is not null and public_text is not null
                      and not public.scd_giving_has_contact(public_title || ' ' || public_text)))
);
alter table public.scd_adopt_items drop constraint if exists scd_adopt_items_proposal_fk;
alter table public.scd_adopt_items add constraint scd_adopt_items_proposal_fk
  foreign key (proposal_id) references public.scd_improvement_proposals(id) on delete set null;
create index if not exists scd_adopt_items_proposal_idx on public.scd_adopt_items(proposal_id);
create index if not exists scd_improvement_status_idx on public.scd_improvement_proposals(organization_id, status, created_at desc);
create index if not exists scd_improvement_item_idx on public.scd_improvement_proposals(item_id);
create index if not exists scd_improvement_author_idx on public.scd_improvement_proposals(author_user_id);
create index if not exists scd_improvement_triaged_by_idx on public.scd_improvement_proposals(triaged_by);
comment on table public.scd_improvement_proposals is 'UD-113 "Proponi un miglioramento". Never public: staff may publish a staff-written text only.';

create table if not exists public.scd_giving_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  entity text not null check (entity in ('FUND_APPLICATION','FUND_MOVEMENT','DONATION','ADOPT_ITEM','ADOPT_UNIT','INKIND_OFFER','PROPOSAL','SETTINGS')),
  entity_id uuid,
  entity_code text,
  action text not null check (char_length(action) <= 40),
  actor uuid references auth.users(id) on delete set null,
  at timestamptz not null default now(),
  detail jsonb not null default '{}'::jsonb
);
create index if not exists scd_giving_events_entity_idx on public.scd_giving_events(organization_id, entity, entity_id, at desc);
create index if not exists scd_giving_events_actor_idx on public.scd_giving_events(actor);
comment on table public.scd_giving_events is 'UD-113 audit: statuses, codes and amounts recorded by staff. Never ISEE, names or contacts.';

alter table public.scd_giving_settings enable row level security;
alter table public.scd_fund_applications enable row level security;
alter table public.scd_adopt_items enable row level security;
alter table public.scd_donations enable row level security;
alter table public.scd_adopt_units enable row level security;
alter table public.scd_fund_movements enable row level security;
alter table public.scd_inkind_offers enable row level security;
alter table public.scd_improvement_proposals enable row level security;
alter table public.scd_giving_events enable row level security;
revoke all on table public.scd_giving_settings, public.scd_fund_applications, public.scd_adopt_items, public.scd_donations,
  public.scd_adopt_units, public.scd_fund_movements, public.scd_inkind_offers, public.scd_improvement_proposals,
  public.scd_giving_events from anon, authenticated;

-- 4. Internal helpers on the tables.
create or replace function public.scd_giving_log(p_org uuid, p_entity text, p_id uuid, p_code text, p_action text, p_detail jsonb default '{}'::jsonb)
returns void language sql volatile security definer set search_path to 'public' as $$
  insert into public.scd_giving_events (organization_id, entity, entity_id, entity_code, action, actor, detail)
  values (p_org, p_entity, p_id, p_code, p_action, (select auth.uid()), coalesce(p_detail, '{}'::jsonb));
$$;

create or replace function public.scd_giving_code(p_prefix text)
returns text language sql volatile set search_path to 'public' as $$
  select p_prefix || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
$$;

-- Price shown for an item on a day: an expired quote becomes "da preventivo aggiornato".
create or replace function public.scd_adopt_effective_price_mode(p_mode text, p_valid_until date, p_day date)
returns text language sql immutable set search_path to 'public' as $$
  select case when p_mode = 'PREZZO' and p_valid_until is not null and p_valid_until < p_day then 'DA_PREVENTIVO_AGGIORNATO' else p_mode end;
$$;

-- Status of an item from what has been received (never moves CONSEGNATO, RITIRATO or BOZZA).
create or replace function public.scd_adopt_refresh(p_item_id uuid)
returns void language plpgsql volatile security definer set search_path to 'public' as $$
declare
  v public.scd_adopt_items%rowtype;
  v_collected numeric;
  v_count integer;
  v_units_done integer;
  v_next text;
begin
  select * into v from public.scd_adopt_items where id = p_item_id for update;
  if not found or v.status in ('BOZZA','CONSEGNATO','RITIRATO') then return; end if;
  select coalesce(sum(amount), 0), count(*) into v_collected, v_count
  from public.scd_donations where item_id = p_item_id and status = 'RICEVUTA';
  select count(*) into v_units_done from public.scd_adopt_units where item_id = p_item_id and status = 'ADOTTATO';
  v_next := case
    when (v.units_total is not null and v_units_done >= v.units_total)
      or (public.scd_adopt_effective_price_mode(v.price_mode, v.quote_valid_until, current_date) = 'PREZZO' and v_collected >= v.price_total)
      then 'ADOTTATO'
    when v_count > 0 then 'IN_RACCOLTA'
    else 'DA_ADOTTARE' end;
  if v_next <> v.status then
    update public.scd_adopt_items set status = v_next, updated_at = now() where id = p_item_id;
    perform public.scd_giving_log(v.organization_id, 'ADOPT_ITEM', v.id, v.code, 'AUTO_STATUS', jsonb_build_object('from', v.status, 'to', v_next));
  end if;
end;
$$;

-- 5. Public reads (anon and signed in): published items with honest progress, published proposals, campaign counts
-- and, only when the Direzione switched it on, aggregated Fund totals. No personal data, no per-person amounts.
create or replace function public.scd_giving_public()
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  with org as (select public.scd_giving_org() as id),
  items as (
    select i.*, public.scd_adopt_effective_price_mode(i.price_mode, i.quote_valid_until, current_date) as eff_mode,
      (select count(*) from public.scd_donations d where d.item_id = i.id and d.status = 'RICEVUTA') as n_received,
      (select coalesce(sum(d.amount), 0) from public.scd_donations d where d.item_id = i.id and d.status = 'RICEVUTA') as collected,
      (select bool_and(d.show_amount) from public.scd_donations d where d.item_id = i.id and d.status = 'RICEVUTA') as all_consent
    from public.scd_adopt_items i, org
    where i.organization_id = org.id and i.published and i.status not in ('BOZZA','RITIRATO')
  )
  select jsonb_build_object(
    'engine', 'r101',
    'asOf', now(),
    'items', coalesce((select jsonb_agg(jsonb_build_object(
        'id', it.id, 'code', it.code, 'title', it.title, 'category', it.category, 'description', it.description,
        'supplier', it.supplier, 'supplierCode', it.supplier_code, 'productUrl', it.product_url, 'photoPath', it.photo_path,
        'priceMode', it.eff_mode,
        'priceTotal', case when it.eff_mode = 'PREZZO' then it.price_total end,
        'priceNote', case when it.eff_mode = 'PREZZO' then it.price_note end,
        'quoteExpired', it.eff_mode <> it.price_mode,
        'status', it.status, 'campaign', it.campaign,
        'unitLabel', it.unit_label, 'unitsTotal', it.units_total,
        'unitPrice', case when it.eff_mode = 'PREZZO' then coalesce(it.unit_price, round(it.price_total / nullif(it.units_total, 0), 2)) end,
        'contributions', it.n_received,
        -- Aggregates only when they cannot reveal one person's amount: >= 3 contributions or everybody consented.
        'collected', case when it.n_received >= 3 or (it.n_received > 0 and it.all_consent) then it.collected end,
        'units', case when it.units_total is null then '[]'::jsonb else coalesce((
          select jsonb_agg(jsonb_build_object('n', u.number, 'status', u.status,
                   'plate', case when d.visibility = 'NOME_PUBBLICO' then d.plate_text end) order by u.number)
          from public.scd_adopt_units u left join public.scd_donations d on d.id = u.donation_id and d.status = 'RICEVUTA'
          where u.item_id = it.id), '[]'::jsonb) end,
        'adopters', coalesce((
          select jsonb_agg(jsonb_build_object('name', d.public_name, 'amount', case when d.show_amount then d.amount end) order by d.received_on, d.created_at)
          from public.scd_donations d
          where d.item_id = it.id and d.status = 'RICEVUTA' and d.visibility = 'NOME_PUBBLICO'), '[]'::jsonb),
        'anonymousAdopters', (select count(*) from public.scd_donations d
          where d.item_id = it.id and d.status = 'RICEVUTA' and d.visibility <> 'NOME_PUBBLICO'))
      order by it.status = 'CONSEGNATO', it.category, it.title) from items it), '[]'::jsonb),
    'proposals', coalesce((select jsonb_agg(jsonb_build_object('code', p.code, 'area', p.area, 'title', p.public_title,
        'text', p.public_text, 'status', p.status, 'itemId', p.item_id) order by p.updated_at desc)
      from public.scd_improvement_proposals p, org where p.organization_id = org.id and p.published), '[]'::jsonb),
    'campaigns', (select jsonb_build_object(
        'PALESTRA', jsonb_build_object('received', count(*) filter (where o.campaign = 'PALESTRA' and o.status in ('RICEVUTA','INVENTARIATA'))),
        'INFERMERIA', jsonb_build_object('received', count(*) filter (where o.campaign = 'INFERMERIA' and o.status in ('RICEVUTA','INVENTARIATA'))))
      from public.scd_inkind_offers o, org where o.organization_id = org.id),
    'fund', (select case when coalesce(s.fund_public_totals, false) then jsonb_build_object(
        'confirmed', coalesce(sum(m.amount) filter (where m.direction = 'ENTRATA'), 0),
        'allocated', coalesce(sum(m.amount) filter (where m.direction = 'USCITA'), 0),
        'available', coalesce(sum(case when m.direction = 'ENTRATA' then m.amount else -m.amount end), 0),
        'asOf', now(), 'source', 'Registro del Fondo Solidale (Tesoreria)')
      else null end
      from org left join public.scd_giving_settings s on s.organization_id = org.id
      left join public.scd_fund_movements m on m.organization_id = org.id and m.voided_at is null
      group by s.fund_public_totals));
$$;

-- 6. Public entry points (anon and signed in). The app adds a honeypot and a per-IP limiter; here: validation and a
-- global hourly limit. They return a code: RECEIVED:<ref> or a refusal (INVALID, BUSY, CONTACT_IN_ANONYMOUS,
-- MEDICINE_REFUSED, MEDICAL_NOT_VERIFIABLE, NOT_AVAILABLE).

-- Adoption pledge (money still to be paid through the official channel; the treasury records it).
create or replace function public.scd_adopt_pledge(
  p_item_id uuid, p_unit_number integer, p_visibility text, p_donor_name text, p_donor_contact text,
  p_public_name text, p_plate_text text, p_show_amount boolean, p_pledged_amount numeric
)
returns text
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v_org uuid := public.scd_giving_org();
  v_item public.scd_adopt_items%rowtype;
  v_vis text := coalesce(p_visibility, 'ANONIMO_PUBBLICO');
  v_name text := nullif(regexp_replace(trim(coalesce(p_donor_name, '')), '\s+', ' ', 'g'), '');
  v_contact text := nullif(trim(coalesce(p_donor_contact, '')), '');
  v_public text := nullif(regexp_replace(trim(coalesce(p_public_name, '')), '\s+', ' ', 'g'), '');
  v_plate text := nullif(regexp_replace(trim(coalesce(p_plate_text, '')), '\s+', ' ', 'g'), '');
  v_code text := public.scd_giving_code('AD');
begin
  if v_vis not in ('NOME_PUBBLICO','ANONIMO_PUBBLICO','COMPLETAMENTE_ANONIMO') then return 'INVALID'; end if;
  select * into v_item from public.scd_adopt_items where id = p_item_id and organization_id = v_org;
  if not found or not v_item.published or v_item.status not in ('DA_ADOTTARE','IN_RACCOLTA') then return 'NOT_AVAILABLE'; end if;
  if p_unit_number is not null and (v_item.units_total is null or p_unit_number > v_item.units_total
     or exists (select 1 from public.scd_adopt_units u where u.item_id = p_item_id and u.number = p_unit_number and u.status = 'ADOTTATO')) then
    return 'NOT_AVAILABLE';
  end if;
  if v_vis = 'COMPLETAMENTE_ANONIMO' then
    if v_name is not null or v_contact is not null or v_public is not null or v_plate is not null then return 'INVALID'; end if;
  else
    if v_name is null or char_length(v_name) not between 2 and 120 or v_contact is null or char_length(v_contact) > 120 then return 'INVALID'; end if;
  end if;
  if v_vis <> 'NOME_PUBBLICO' and (v_public is not null or v_plate is not null or coalesce(p_show_amount, false)) then return 'INVALID'; end if;
  if v_vis = 'NOME_PUBBLICO' and (v_public is null or char_length(v_public) not between 2 and 60) then return 'INVALID'; end if;
  if v_plate is not null and (char_length(v_plate) not between 2 and 60 or p_unit_number is null) then return 'INVALID'; end if;
  if public.scd_giving_has_contact(coalesce(v_public, '') || ' ' || coalesce(v_plate, '')) then return 'INVALID'; end if;
  if p_pledged_amount is not null and (p_pledged_amount <= 0 or p_pledged_amount > 100000) then return 'INVALID'; end if;
  if (select count(*) from public.scd_donations where source = 'PUBBLICO' and created_at > now() - interval '1 hour') >= 60 then return 'BUSY'; end if;

  insert into public.scd_donations (organization_id, code, purpose, item_id, unit_number, visibility, donor_name, donor_contact,
    public_name, plate_text, show_amount, pledged_amount, status, source)
  values (v_org, v_code, 'ADOTTA_OGGETTO', p_item_id, p_unit_number, v_vis,
    case when v_vis = 'COMPLETAMENTE_ANONIMO' then null else v_name end,
    case when v_vis = 'COMPLETAMENTE_ANONIMO' then null else v_contact end,
    case when v_vis = 'NOME_PUBBLICO' then v_public end,
    case when v_vis = 'NOME_PUBBLICO' then v_plate end,
    v_vis = 'NOME_PUBBLICO' and coalesce(p_show_amount, false),
    p_pledged_amount, 'PROMESSA', 'PUBBLICO');
  perform public.scd_giving_log(v_org, 'DONATION', null, v_code, 'PLEDGE', jsonb_build_object('item', v_item.code, 'unit', p_unit_number, 'visibility', v_vis));
  return 'RECEIVED:' || v_code;
end;
$$;

-- Goods offer ("Adotta la nuova palestra SCD" / "Adotta la nuova infermeria").
create or replace function public.scd_inkind_offer_submit(
  p_campaign text, p_item_id uuid, p_what text, p_quantity integer, p_condition text, p_medical_kind text,
  p_sealed boolean, p_expires_on date, p_professional_check boolean, p_has_photos boolean, p_handover text,
  p_town text, p_note text, p_visibility text, p_donor_name text, p_donor_contact text, p_public_name text
)
returns text
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v_org uuid := public.scd_giving_org();
  v_vis text := coalesce(p_visibility, 'ANONIMO_PUBBLICO');
  v_kind text := coalesce(p_medical_kind, 'NON_MEDICO');
  v_what text := regexp_replace(trim(coalesce(p_what, '')), '\s+', ' ', 'g');
  v_note text := left(trim(coalesce(p_note, '')), 500);
  v_name text := nullif(regexp_replace(trim(coalesce(p_donor_name, '')), '\s+', ' ', 'g'), '');
  v_contact text := nullif(trim(coalesce(p_donor_contact, '')), '');
  v_public text := nullif(regexp_replace(trim(coalesce(p_public_name, '')), '\s+', ' ', 'g'), '');
  v_code text := public.scd_giving_code('MAT');
begin
  if coalesce(p_campaign, '') not in ('PALESTRA','INFERMERIA','ALTRO')
     or v_vis not in ('NOME_PUBBLICO','ANONIMO_PUBBLICO','COMPLETAMENTE_ANONIMO')
     or v_kind not in ('NON_MEDICO','FARMACO','DISPOSITIVO','MATERIALE_CONSUMO','ARREDO')
     or coalesce(p_condition, '') not in ('NUOVO_SIGILLATO','NUOVO','OTTIMO','BUONO','DA_VERIFICARE')
     or coalesce(p_handover, '') not in ('RITIRO','CONSEGNA')
     or char_length(v_what) not between 3 and 200 or coalesce(p_quantity, 0) not between 1 and 500
     or char_length(coalesce(p_town, '')) > 60 then
    return 'INVALID';
  end if;
  -- Medicines: only sealed and not expired; opened or expired medicines are never accepted.
  if v_kind = 'FARMACO' and (not coalesce(p_sealed, false) or p_expires_on is null or p_expires_on < current_date) then
    return 'MEDICINE_REFUSED';
  end if;
  if v_kind in ('DISPOSITIVO','MATERIALE_CONSUMO') and p_condition <> 'NUOVO_SIGILLATO' and not coalesce(p_professional_check, false) then
    return 'MEDICAL_NOT_VERIFIABLE';
  end if;
  if v_vis = 'COMPLETAMENTE_ANONIMO' then
    if v_name is not null or v_contact is not null or v_public is not null then return 'INVALID'; end if;
    if p_handover <> 'CONSEGNA' then return 'INVALID'; end if;
    if public.scd_giving_has_contact(v_what || ' ' || v_note) then return 'CONTACT_IN_ANONYMOUS'; end if;
  else
    if v_name is null or char_length(v_name) not between 2 and 120 or v_contact is null or char_length(v_contact) > 120 then return 'INVALID'; end if;
  end if;
  if v_vis <> 'NOME_PUBBLICO' and v_public is not null then return 'INVALID'; end if;
  if v_vis = 'NOME_PUBBLICO' and (v_public is null or char_length(v_public) not between 2 and 60 or public.scd_giving_has_contact(v_public)) then return 'INVALID'; end if;
  if p_item_id is not null and not exists (select 1 from public.scd_adopt_items where id = p_item_id and organization_id = v_org and published) then
    return 'NOT_AVAILABLE';
  end if;
  if (select count(*) from public.scd_inkind_offers where created_at > now() - interval '1 hour') >= 60 then return 'BUSY'; end if;

  insert into public.scd_inkind_offers (organization_id, code, campaign, item_id, what, quantity, condition, medical_kind, sealed,
    expires_on, professional_check, has_photos, handover, town, note, visibility, donor_name, donor_contact, public_name)
  values (v_org, v_code, p_campaign, p_item_id, v_what, p_quantity, p_condition, v_kind, coalesce(p_sealed, false),
    p_expires_on, coalesce(p_professional_check, false), coalesce(p_has_photos, false), p_handover,
    nullif(trim(coalesce(p_town, '')), ''), v_note, v_vis, v_name, v_contact, case when v_vis = 'NOME_PUBBLICO' then v_public end);
  perform public.scd_giving_log(v_org, 'INKIND_OFFER', null, v_code, 'OFFER', jsonb_build_object('campaign', p_campaign, 'kind', v_kind));
  return 'RECEIVED:' || v_code;
end;
$$;

-- Improvement proposal. Signed-in authors may stay anonymous (then nothing links the proposal to them).
create or replace function public.scd_improvement_submit(
  p_area text, p_title text, p_body text, p_anonymous boolean, p_contact text, p_can_contribute text[]
)
returns text
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v_org uuid := public.scd_giving_org();
  v_anon boolean := coalesce(p_anonymous, true);
  v_title text := regexp_replace(trim(coalesce(p_title, '')), '\s+', ' ', 'g');
  v_body text := trim(coalesce(p_body, ''));
  v_contact text := nullif(trim(coalesce(p_contact, '')), '');
  v_contrib text[] := coalesce((select array_agg(distinct c order by c) from unnest(coalesce(p_can_contribute, '{}')) c), '{}');
  v_code text := public.scd_giving_code('PR');
begin
  if coalesce(p_area, '') not in ('CAMPI','PALESTRA','INFERMERIA','CLUB_HOUSE','SICUREZZA','ALTRO')
     or char_length(v_title) not between 5 and 80 or char_length(v_body) not between 10 and 1000
     or not (v_contrib <@ array['TEMPO','BENI','DENARO']) or char_length(coalesce(v_contact, '')) > 120 then
    return 'INVALID';
  end if;
  if v_anon and (v_contact is not null or public.scd_giving_has_contact(v_title || ' ' || v_body)) then
    return 'CONTACT_IN_ANONYMOUS';
  end if;
  if not v_anon and v_contact is null and (select auth.uid()) is null then return 'INVALID'; end if;
  if (select count(*) from public.scd_improvement_proposals where created_at > now() - interval '1 hour') >= 60 then return 'BUSY'; end if;

  insert into public.scd_improvement_proposals (organization_id, code, area, title, body, anonymous, author_user_id, contact, can_contribute)
  values (v_org, v_code, p_area, v_title, v_body, v_anon, case when v_anon then null else (select auth.uid()) end,
    case when v_anon then null else v_contact end, v_contrib);
  perform public.scd_giving_log(v_org, 'PROPOSAL', null, v_code, 'SUBMIT', jsonb_build_object('area', p_area, 'anonymous', v_anon));
  return 'RECEIVED:' || v_code;
end;
$$;

-- 7. Fondo Solidale (section fondo-solidale).
-- Application: the Fund office records it (WRITE), or a parent/guardian signed in applies for their own child.
create or replace function public.scd_fund_submit_application(
  p_organization_id uuid, p_season text, p_beneficiary_person_id uuid, p_beneficiary_label text,
  p_applicant_name text, p_contact_email text, p_contact_phone text, p_fee_source_record_id text,
  p_isee_value numeric, p_isee_expires_on date, p_documents_ref text, p_household_note text, p_sibling_discount text
)
returns text
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v_office boolean := coalesce(public.scd_can('fondo-solidale', 'WRITE', p_organization_id), false);
  v_guardian boolean;
  v_id uuid;
  v_code text := public.scd_giving_code('FS');
  v_name text := regexp_replace(trim(coalesce(p_applicant_name, '')), '\s+', ' ', 'g');
begin
  if (select auth.uid()) is null then raise exception 'sign in' using errcode = '42501'; end if;
  v_guardian := p_beneficiary_person_id is not null and exists (
    select 1 from public.scd_family_members child
    join public.scd_family_members guardian on guardian.family_id = child.family_id and guardian.is_guardian
    join public.scd_identity_links l on l.person_id = guardian.person_id and l.user_id = (select auth.uid()) and l.link_state <> 'REVOKED'
    where child.person_id = p_beneficiary_person_id);
  if not v_office and not v_guardian then raise exception 'fund: office or guardian only' using errcode = '42501'; end if;
  if coalesce(p_season, '') !~ '^\d{4}/\d{2}$' or char_length(v_name) not between 2 and 120
     or coalesce(p_sibling_discount, 'DA_VERIFICARE') not in ('DA_VERIFICARE','NESSUNO','PRESENTE','PRESENTE_RINUNCIA') then
    raise exception 'invalid application' using errcode = '22023';
  end if;
  if p_beneficiary_person_id is not null and not exists (
       select 1 from public.scd_people where id = p_beneficiary_person_id and organization_id = p_organization_id) then
    raise exception 'person not found' using errcode = 'P0002';
  end if;
  insert into public.scd_fund_applications (organization_id, code, season, beneficiary_person_id, submitted_by, applicant_name,
    beneficiary_label, contact_email, contact_phone, fee_source_record_id, isee_value, isee_expires_on, documents_ref,
    household_note, sibling_discount, status)
  values (p_organization_id, v_code, p_season, p_beneficiary_person_id, (select auth.uid()), v_name,
    left(trim(coalesce(p_beneficiary_label, '')), 120), nullif(lower(trim(coalesce(p_contact_email, ''))), ''),
    nullif(trim(coalesce(p_contact_phone, '')), ''), nullif(trim(coalesce(p_fee_source_record_id, '')), ''),
    p_isee_value, p_isee_expires_on, nullif(trim(coalesce(p_documents_ref, '')), ''),
    left(trim(coalesce(p_household_note, '')), 1000), coalesce(p_sibling_discount, 'DA_VERIFICARE'), 'INVIATA')
  returning id into v_id;
  perform public.scd_giving_log(p_organization_id, 'FUND_APPLICATION', v_id, v_code, 'SUBMIT',
    jsonb_build_object('by', case when v_office then 'office' else 'guardian' end));
  return v_code;
end;
$$;

-- Review steps that are not the decision: IN_ESAME, INTEGRAZIONE (with documents deadline), RITIRATA, SCADUTA;
-- and the review deadline.
create or replace function public.scd_fund_set_status(
  p_organization_id uuid, p_application_id uuid, p_status text, p_review_due date, p_documents_due date, p_note text
)
returns void
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v public.scd_fund_applications%rowtype;
begin
  perform public.scd_giving_need('fondo-solidale', 'WRITE', p_organization_id);
  select * into v from public.scd_fund_applications where id = p_application_id and organization_id = p_organization_id for update;
  if not found then raise exception 'application not found' using errcode = 'P0002'; end if;
  if p_status in ('APPROVATA','RESPINTA') then raise exception 'use scd_fund_decide' using errcode = '22023'; end if;
  if p_status is not null and p_status <> v.status and not public.scd_giving_transition_ok('FUND_APPLICATION', v.status, p_status) then
    raise exception 'transition % -> % not allowed', v.status, p_status using errcode = '22023';
  end if;
  if p_status = 'INTEGRAZIONE' and p_documents_due is null then raise exception 'documents deadline needed' using errcode = '22023'; end if;
  update public.scd_fund_applications set
    status = coalesce(p_status, status),
    review_due = coalesce(p_review_due, review_due),
    documents_due = case when coalesce(p_status, status) = 'INTEGRAZIONE' then coalesce(p_documents_due, documents_due) else documents_due end,
    updated_at = now()
  where id = v.id;
  perform public.scd_giving_log(p_organization_id, 'FUND_APPLICATION', v.id, v.code, 'STATUS',
    jsonb_build_object('from', v.status, 'to', coalesce(p_status, v.status), 'review_due', p_review_due, 'documents_due', p_documents_due,
                       'note', left(coalesce(p_note, ''), 200)));
end;
$$;

-- The decision (APPROVE level): approve with the reduced fee, or reject with a reason.
-- No double discount: approval needs sibling_discount NESSUNO or PRESENTE_RINUNCIA (the family gives up the sibling
-- discount, which the office removes in the Gestionale), and the Gestionale copy must not show a sibling discount on
-- the linked fee position unless the family gave it up.
create or replace function public.scd_fund_decide(
  p_organization_id uuid, p_application_id uuid, p_decision text, p_base_fee numeric, p_reduced_fee numeric,
  p_sibling_discount text, p_valid_until date, p_reason text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v public.scd_fund_applications%rowtype;
  v_reason text := trim(coalesce(p_reason, ''));
  v_sib text := coalesce(p_sibling_discount, 'DA_VERIFICARE');
  v_rule text;
  v_fund_in_sheet boolean;
begin
  perform public.scd_giving_need('fondo-solidale', 'APPROVE', p_organization_id);
  select * into v from public.scd_fund_applications where id = p_application_id and organization_id = p_organization_id for update;
  if not found then raise exception 'application not found' using errcode = 'P0002'; end if;
  if p_decision not in ('APPROVATA','RESPINTA') or not public.scd_giving_transition_ok('FUND_APPLICATION', v.status, p_decision) then
    raise exception 'decision % not allowed from %', p_decision, v.status using errcode = '22023';
  end if;
  if char_length(v_reason) < 3 then raise exception 'reason needed' using errcode = '22023'; end if;

  if p_decision = 'APPROVATA' then
    if p_base_fee is null or p_reduced_fee is null or p_base_fee <= 0 or p_reduced_fee < 0 or p_reduced_fee > p_base_fee then
      raise exception 'fees: 0 <= reduced <= base' using errcode = '22023';
    end if;
    if v_sib not in ('NESSUNO','PRESENTE_RINUNCIA') then
      raise exception 'double discount: Fondo and sibling discount are not cumulative' using errcode = '22023';
    end if;
    if v.fee_source_record_id is not null then
      select f.family_rule, f.fund_benefit into v_rule, v_fund_in_sheet
      from public.scd_fee_positions f
      where f.organization_id = p_organization_id and f.season = v.season and f.source_record_id = v.fee_source_record_id and f.active;
      if v_rule ~* 'fratell' and v_sib <> 'PRESENTE_RINUNCIA' then
        raise exception 'double discount: the Gestionale shows a sibling discount on this fee' using errcode = '22023';
      end if;
    end if;
  end if;

  update public.scd_fund_applications set
    status = p_decision,
    sibling_discount = case when p_decision = 'APPROVATA' then v_sib else sibling_discount end,
    base_fee = case when p_decision = 'APPROVATA' then p_base_fee end,
    reduced_fee = case when p_decision = 'APPROVATA' then p_reduced_fee end,
    valid_until = case when p_decision = 'APPROVATA' then p_valid_until end,
    decision_reason = left(v_reason, 500),
    decided_at = now(), decided_by = (select auth.uid()), updated_at = now()
  where id = v.id;
  perform public.scd_giving_log(p_organization_id, 'FUND_APPLICATION', v.id, v.code, 'DECIDE',
    jsonb_build_object('from', v.status, 'to', p_decision, 'covered', case when p_decision = 'APPROVATA' then p_base_fee - p_reduced_fee end,
                       'sibling_discount', v_sib));
  return jsonb_build_object('code', v.code, 'status', p_decision,
    'gestionale_todo', case
      when p_decision = 'APPROVATA' and v_sib = 'PRESENTE_RINUNCIA' then 'Togliere lo sconto fratelli e segnare il Fondo nel Gestionale'
      when p_decision = 'APPROVATA' and not coalesce(v_fund_in_sheet, false) then 'Segnare il Fondo nel Gestionale'
      else null end);
end;
$$;

-- Fund income (events, dedicated sponsors, other) and outgoings (fees covered, other). Donations to the Fund enter
-- automatically when the treasury records them (scd_donation_record).
create or replace function public.scd_fund_record_movement(
  p_organization_id uuid, p_season text, p_source text, p_amount numeric, p_occurred_on date, p_description text,
  p_application_id uuid, p_ledger_ref text
)
returns uuid
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v_id uuid;
  v_dir text;
  v_app public.scd_fund_applications%rowtype;
  v_covered numeric;
begin
  perform public.scd_giving_need('fondo-solidale', 'WRITE', p_organization_id);
  if p_source not in ('EVENTO','SPONSOR_DEDICATO','ALTRA_ENTRATA','QUOTA_COPERTA','ALTRA_USCITA') then
    raise exception 'source not allowed here' using errcode = '22023';
  end if;
  if p_amount is null or p_amount <= 0 or p_occurred_on is null or coalesce(p_season, '') !~ '^\d{4}/\d{2}$' then
    raise exception 'invalid movement' using errcode = '22023';
  end if;
  v_dir := case when p_source in ('QUOTA_COPERTA','ALTRA_USCITA') then 'USCITA' else 'ENTRATA' end;
  if p_source = 'QUOTA_COPERTA' then
    select * into v_app from public.scd_fund_applications where id = p_application_id and organization_id = p_organization_id;
    if not found or v_app.status <> 'APPROVATA' then raise exception 'fee covered only for an approved application' using errcode = '22023'; end if;
    select coalesce(sum(amount), 0) into v_covered from public.scd_fund_movements
      where application_id = v_app.id and voided_at is null;
    if v_covered + p_amount > v_app.base_fee - v_app.reduced_fee then
      raise exception 'more than the decided reduction' using errcode = '22023';
    end if;
  elsif p_application_id is not null then
    raise exception 'application only for fees covered' using errcode = '22023';
  end if;
  insert into public.scd_fund_movements (organization_id, season, direction, source, amount, occurred_on, description, application_id, ledger_ref, recorded_by)
  values (p_organization_id, p_season, v_dir, p_source, p_amount, p_occurred_on, left(trim(coalesce(p_description, '')), 200),
    case when p_source = 'QUOTA_COPERTA' then p_application_id end, nullif(trim(coalesce(p_ledger_ref, '')), ''), (select auth.uid()))
  returning id into v_id;
  perform public.scd_giving_log(p_organization_id, 'FUND_MOVEMENT', v_id, null, 'RECORD',
    jsonb_build_object('direction', v_dir, 'source', p_source, 'amount', p_amount, 'application', v_app.code));
  return v_id;
end;
$$;

create or replace function public.scd_fund_void_movement(p_organization_id uuid, p_movement_id uuid, p_reason text)
returns void
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare v public.scd_fund_movements%rowtype;
begin
  perform public.scd_giving_need('fondo-solidale', 'APPROVE', p_organization_id);
  select * into v from public.scd_fund_movements where id = p_movement_id and organization_id = p_organization_id for update;
  if not found or v.voided_at is not null then raise exception 'movement not found' using errcode = 'P0002'; end if;
  if v.donation_id is not null then raise exception 'void the donation instead' using errcode = '22023'; end if;
  if char_length(trim(coalesce(p_reason, ''))) < 3 then raise exception 'reason needed' using errcode = '22023'; end if;
  update public.scd_fund_movements set voided_at = now(), voided_by = (select auth.uid()), void_reason = left(trim(p_reason), 300) where id = v.id;
  perform public.scd_giving_log(p_organization_id, 'FUND_MOVEMENT', v.id, null, 'VOID', jsonb_build_object('amount', v.amount, 'source', v.source));
end;
$$;

-- Everything the Fund page needs (READ). Confidential: names, contacts and ISEE are here and nowhere else.
create or replace function public.scd_fund_board(p_organization_id uuid, p_season text)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
begin
  perform public.scd_giving_need('fondo-solidale', 'READ', p_organization_id);
  return jsonb_build_object(
    'season', p_season,
    'canWrite', coalesce(public.scd_can('fondo-solidale', 'WRITE', p_organization_id), false),
    'canApprove', coalesce(public.scd_can('fondo-solidale', 'APPROVE', p_organization_id), false),
    'applications', coalesce((select jsonb_agg(jsonb_build_object(
        'id', a.id, 'code', a.code, 'status', a.status, 'applicantName', a.applicant_name, 'beneficiaryLabel', a.beneficiary_label,
        'beneficiaryPersonId', a.beneficiary_person_id, 'contactEmail', a.contact_email, 'contactPhone', a.contact_phone,
        'feeSourceRecordId', a.fee_source_record_id, 'iseeValue', a.isee_value, 'iseeExpiresOn', a.isee_expires_on,
        'documentsRef', a.documents_ref, 'householdNote', a.household_note, 'siblingDiscount', a.sibling_discount,
        'submittedAt', a.submitted_at, 'reviewDue', a.review_due, 'documentsDue', a.documents_due,
        'decidedAt', a.decided_at, 'decisionReason', a.decision_reason, 'baseFee', a.base_fee, 'reducedFee', a.reduced_fee,
        'validUntil', a.valid_until,
        'covered', (select coalesce(sum(m.amount), 0) from public.scd_fund_movements m where m.application_id = a.id and m.voided_at is null),
        'feeFamilyRule', f.family_rule, 'feeFundInSheet', f.fund_benefit)
      order by a.submitted_at desc)
      from public.scd_fund_applications a
      left join public.scd_fee_positions f on f.organization_id = a.organization_id and f.season = a.season
        and f.source_record_id = a.fee_source_record_id and f.active
      where a.organization_id = p_organization_id and a.season = p_season), '[]'::jsonb),
    'movements', coalesce((select jsonb_agg(jsonb_build_object(
        'id', m.id, 'direction', m.direction, 'source', m.source, 'amount', m.amount, 'occurredOn', m.occurred_on,
        'description', m.description, 'donationCode', d.code, 'applicationCode', a.code, 'ledgerRef', m.ledger_ref,
        'voided', m.voided_at is not null, 'voidReason', m.void_reason)
      order by m.occurred_on desc, m.created_at desc)
      from public.scd_fund_movements m
      left join public.scd_donations d on d.id = m.donation_id
      left join public.scd_fund_applications a on a.id = m.application_id
      where m.organization_id = p_organization_id and m.season = p_season), '[]'::jsonb),
    'publicTotals', coalesce((select s.fund_public_totals from public.scd_giving_settings s where s.organization_id = p_organization_id), false));
end;
$$;

-- Aggregated report (READ): counts and totals only, no names, no ISEE.
create or replace function public.scd_fund_report(p_organization_id uuid, p_season text)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
begin
  perform public.scd_giving_need('fondo-solidale', 'READ', p_organization_id);
  return (
    select jsonb_build_object(
      'season', p_season,
      'applications', (select jsonb_object_agg(status, n) from (
          select status, count(*) as n from public.scd_fund_applications
          where organization_id = p_organization_id and season = p_season group by status) s),
      'reductionDecided', (select coalesce(sum(base_fee - reduced_fee), 0) from public.scd_fund_applications
          where organization_id = p_organization_id and season = p_season and status = 'APPROVATA'),
      'income', (select coalesce(jsonb_object_agg(source, total), '{}'::jsonb) from (
          select source, sum(amount) as total from public.scd_fund_movements
          where organization_id = p_organization_id and season = p_season and voided_at is null and direction = 'ENTRATA' group by source) i),
      'outgoings', (select coalesce(jsonb_object_agg(source, total), '{}'::jsonb) from (
          select source, sum(amount) as total from public.scd_fund_movements
          where organization_id = p_organization_id and season = p_season and voided_at is null and direction = 'USCITA' group by source) o),
      'asOf', now()));
end;
$$;

-- Direzione switch: show aggregated Fund totals on the public page (APPROVE).
create or replace function public.scd_giving_set_public_totals(p_organization_id uuid, p_on boolean)
returns void
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
begin
  perform public.scd_giving_need('fondo-solidale', 'APPROVE', p_organization_id);
  insert into public.scd_giving_settings (organization_id, fund_public_totals, updated_by, updated_at)
  values (p_organization_id, coalesce(p_on, false), (select auth.uid()), now())
  on conflict (organization_id) do update set fund_public_totals = excluded.fund_public_totals, updated_by = excluded.updated_by, updated_at = now();
  perform public.scd_giving_log(p_organization_id, 'SETTINGS', null, null, 'FUND_PUBLIC_TOTALS', jsonb_build_object('on', coalesce(p_on, false)));
end;
$$;

-- 8. Donations (section donazioni). Money is recorded by the treasury from the official channel.
-- p_donation_id null = new donation recorded at the desk; otherwise a pledge (PROMESSA) becomes RICEVUTA.
create or replace function public.scd_donation_record(
  p_organization_id uuid, p_donation_id uuid, p_purpose text, p_item_id uuid, p_unit_number integer, p_visibility text,
  p_donor_name text, p_donor_contact text, p_donor_fiscal_code text, p_public_name text, p_plate_text text, p_show_amount boolean,
  p_amount numeric, p_channel text, p_received_on date, p_season text
)
returns text
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v public.scd_donations%rowtype;
  v_id uuid;
  v_code text;
  v_vis text := coalesce(p_visibility, 'ANONIMO_PUBBLICO');
  v_item public.scd_adopt_items%rowtype;
begin
  perform public.scd_giving_need('donazioni', 'WRITE', p_organization_id);
  if p_amount is null or p_amount <= 0 or p_amount > 1000000 or coalesce(p_channel, '') not in ('BONIFICO','CONTANTI','POS','ASSEGNO','ALTRO')
     or p_received_on is null or p_received_on > current_date then
    raise exception 'invalid donation' using errcode = '22023';
  end if;
  if p_donation_id is not null then
    select * into v from public.scd_donations where id = p_donation_id and organization_id = p_organization_id for update;
    if not found then raise exception 'donation not found' using errcode = 'P0002'; end if;
    if not public.scd_giving_transition_ok('DONATION', v.status, 'RICEVUTA') then
      raise exception 'transition % -> RICEVUTA not allowed', v.status using errcode = '22023';
    end if;
    update public.scd_donations set amount = p_amount, channel = p_channel, received_on = p_received_on, status = 'RICEVUTA',
      recorded_by = (select auth.uid()), updated_at = now()
    where id = v.id returning * into v;
  else
    if coalesce(p_purpose, '') not in ('FONDO_SOLIDALE','ADOTTA_OGGETTO','GENERALE') then raise exception 'purpose' using errcode = '22023'; end if;
    v_code := public.scd_giving_code('DN');
    insert into public.scd_donations (organization_id, code, purpose, item_id, unit_number, visibility, donor_name, donor_contact,
      donor_fiscal_code, public_name, plate_text, show_amount, amount, channel, received_on, status, source, recorded_by)
    values (p_organization_id, v_code, p_purpose, case when p_purpose = 'ADOTTA_OGGETTO' then p_item_id end,
      case when p_purpose = 'ADOTTA_OGGETTO' then p_unit_number end, v_vis,
      nullif(trim(coalesce(p_donor_name, '')), ''), nullif(trim(coalesce(p_donor_contact, '')), ''),
      nullif(upper(regexp_replace(coalesce(p_donor_fiscal_code, ''), '\s', '', 'g')), ''),
      nullif(trim(coalesce(p_public_name, '')), ''), nullif(trim(coalesce(p_plate_text, '')), ''), coalesce(p_show_amount, false),
      p_amount, p_channel, p_received_on, 'RICEVUTA', 'TESORERIA', (select auth.uid()))
    returning * into v;
  end if;
  if public.scd_giving_has_contact(coalesce(v.public_name, '') || ' ' || coalesce(v.plate_text, '')) then
    raise exception 'public name or plate contains a contact' using errcode = '22023';
  end if;

  if v.purpose = 'ADOTTA_OGGETTO' then
    select * into v_item from public.scd_adopt_items where id = v.item_id and organization_id = p_organization_id for update;
    if not found or v_item.status in ('BOZZA','RITIRATO','CONSEGNATO') then raise exception 'item not adoptable' using errcode = '22023'; end if;
    if v.unit_number is not null then
      if v_item.units_total is null or v.unit_number > v_item.units_total then raise exception 'unknown unit' using errcode = '22023'; end if;
      insert into public.scd_adopt_units (item_id, number, status, donation_id, updated_at)
      values (v.item_id, v.unit_number, 'ADOTTATO', v.id, now())
      on conflict (item_id, number) do update set status = 'ADOTTATO', donation_id = excluded.donation_id, updated_at = now()
        where public.scd_adopt_units.status = 'LIBERO';
      if not exists (select 1 from public.scd_adopt_units where item_id = v.item_id and number = v.unit_number and donation_id = v.id) then
        raise exception 'unit already adopted' using errcode = '23505';
      end if;
    end if;
    perform public.scd_adopt_refresh(v.item_id);
  elsif v.purpose = 'FONDO_SOLIDALE' then
    insert into public.scd_fund_movements (organization_id, season, direction, source, amount, occurred_on, description, donation_id, recorded_by)
    values (p_organization_id, coalesce(nullif(p_season, ''), '2026/27'), 'ENTRATA', 'DONAZIONE', v.amount, v.received_on,
      'Donazione ' || v.code, v.id, (select auth.uid()));
  end if;
  perform public.scd_giving_log(p_organization_id, 'DONATION', v.id, v.code, 'RECEIVED',
    jsonb_build_object('purpose', v.purpose, 'amount', v.amount, 'channel', v.channel, 'visibility', v.visibility, 'unit', v.unit_number));
  return v.code;
end;
$$;

-- Receipt number and date (never for completely anonymous donations: the table refuses it too).
create or replace function public.scd_donation_set_receipt(p_organization_id uuid, p_donation_id uuid, p_receipt_number text, p_issued_on date)
returns void
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare v public.scd_donations%rowtype;
begin
  perform public.scd_giving_need('donazioni', 'WRITE', p_organization_id);
  select * into v from public.scd_donations where id = p_donation_id and organization_id = p_organization_id for update;
  if not found then raise exception 'donation not found' using errcode = 'P0002'; end if;
  if v.visibility = 'COMPLETAMENTE_ANONIMO' then raise exception 'no receipt for a completely anonymous donation' using errcode = '22023'; end if;
  if v.status <> 'RICEVUTA' then raise exception 'receipt only for received donations' using errcode = '22023'; end if;
  if char_length(trim(coalesce(p_receipt_number, ''))) not between 1 and 40 or p_issued_on is null then
    raise exception 'receipt number and date needed' using errcode = '22023';
  end if;
  update public.scd_donations set receipt_number = trim(p_receipt_number), receipt_issued_on = p_issued_on, updated_at = now() where id = v.id;
  perform public.scd_giving_log(p_organization_id, 'DONATION', v.id, v.code, 'RECEIPT', jsonb_build_object('issued_on', p_issued_on));
end;
$$;

-- Cancel a pledge or void a recorded donation (APPROVE for recorded money): frees its unit, voids its Fund entry.
create or replace function public.scd_donation_void(p_organization_id uuid, p_donation_id uuid, p_reason text)
returns void
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare v public.scd_donations%rowtype;
begin
  select * into v from public.scd_donations where id = p_donation_id and organization_id = p_organization_id for update;
  if not found then raise exception 'donation not found' using errcode = 'P0002'; end if;
  perform public.scd_giving_need('donazioni', case when v.status = 'RICEVUTA' then 'APPROVE' else 'WRITE' end, p_organization_id);
  if not public.scd_giving_transition_ok('DONATION', v.status, 'ANNULLATA') then raise exception 'already cancelled' using errcode = '22023'; end if;
  if char_length(trim(coalesce(p_reason, ''))) < 3 then raise exception 'reason needed' using errcode = '22023'; end if;
  update public.scd_donations set status = 'ANNULLATA', void_reason = left(trim(p_reason), 300), updated_at = now() where id = v.id;
  update public.scd_adopt_units set status = 'LIBERO', donation_id = null, updated_at = now() where donation_id = v.id;
  update public.scd_fund_movements set voided_at = now(), voided_by = (select auth.uid()), void_reason = 'Donazione annullata: ' || left(trim(p_reason), 270)
    where donation_id = v.id and voided_at is null;
  if v.item_id is not null then perform public.scd_adopt_refresh(v.item_id); end if;
  perform public.scd_giving_log(p_organization_id, 'DONATION', v.id, v.code, 'VOID', jsonb_build_object('from', v.status));
end;
$$;

-- Treasury board (READ): donations with donor data (none for completely anonymous ones) and goods offers.
create or replace function public.scd_donation_board(p_organization_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
begin
  perform public.scd_giving_need('donazioni', 'READ', p_organization_id);
  return jsonb_build_object(
    'canWrite', coalesce(public.scd_can('donazioni', 'WRITE', p_organization_id), false),
    'canApprove', coalesce(public.scd_can('donazioni', 'APPROVE', p_organization_id), false),
    'canInfermeria', coalesce(public.scd_can('infermeria', 'WRITE', p_organization_id), false),
    'donations', coalesce((select jsonb_agg(jsonb_build_object(
        'id', d.id, 'code', d.code, 'purpose', d.purpose, 'itemCode', i.code, 'itemTitle', i.title, 'unitNumber', d.unit_number,
        'visibility', d.visibility, 'donorName', d.donor_name, 'donorContact', d.donor_contact, 'donorFiscalCode', d.donor_fiscal_code,
        'publicName', d.public_name, 'plateText', d.plate_text, 'showAmount', d.show_amount, 'pledgedAmount', d.pledged_amount,
        'amount', d.amount, 'channel', d.channel, 'receivedOn', d.received_on, 'receiptNumber', d.receipt_number,
        'receiptIssuedOn', d.receipt_issued_on, 'status', d.status, 'voidReason', d.void_reason, 'source', d.source, 'createdAt', d.created_at)
      order by d.created_at desc)
      from public.scd_donations d left join public.scd_adopt_items i on i.id = d.item_id
      where d.organization_id = p_organization_id), '[]'::jsonb),
    'offers', coalesce((select jsonb_agg(jsonb_build_object(
        'id', o.id, 'code', o.code, 'campaign', o.campaign, 'itemCode', i.code, 'what', o.what, 'quantity', o.quantity,
        'condition', o.condition, 'medicalKind', o.medical_kind, 'sealed', o.sealed, 'expiresOn', o.expires_on,
        'professionalCheck', o.professional_check, 'hasPhotos', o.has_photos, 'handover', o.handover, 'town', o.town, 'note', o.note,
        'visibility', o.visibility, 'donorName', o.donor_name, 'donorContact', o.donor_contact, 'publicName', o.public_name,
        'status', o.status, 'declineReason', o.decline_reason, 'infoRequest', o.info_request, 'conditionChecked', o.condition_checked,
        'conditionNote', o.condition_note, 'receivedOn', o.received_on, 'inventoryRef', o.inventory_ref, 'createdAt', o.created_at)
      order by o.created_at desc)
      from public.scd_inkind_offers o left join public.scd_adopt_items i on i.id = o.item_id
      where o.organization_id = p_organization_id), '[]'::jsonb));
end;
$$;

-- Goods review: ACCETTATA / RIFIUTATA (reason) / INFO_RICHIESTE (question) / ANNULLATA; RICEVUTA after the condition
-- check; INVENTARIATA with the warehouse reference. Medical items (campaign INFERMERIA or a medical kind) are accepted
-- only by someone who also holds the infermeria grant.
create or replace function public.scd_inkind_review(
  p_organization_id uuid, p_offer_id uuid, p_status text, p_text text, p_condition_ok boolean, p_received_on date, p_inventory_ref text
)
returns void
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v public.scd_inkind_offers%rowtype;
  v_text text := trim(coalesce(p_text, ''));
  v_medical boolean;
begin
  perform public.scd_giving_need('donazioni', 'WRITE', p_organization_id);
  select * into v from public.scd_inkind_offers where id = p_offer_id and organization_id = p_organization_id for update;
  if not found then raise exception 'offer not found' using errcode = 'P0002'; end if;
  if not public.scd_giving_transition_ok('INKIND_OFFER', v.status, p_status) then
    raise exception 'transition % -> % not allowed', v.status, p_status using errcode = '22023';
  end if;
  v_medical := v.campaign = 'INFERMERIA' or v.medical_kind <> 'NON_MEDICO';
  if p_status in ('ACCETTATA','RICEVUTA') and v_medical and not coalesce(public.scd_can('infermeria', 'WRITE', p_organization_id), false) then
    raise exception 'medical items: the infermeria responsible approves' using errcode = '42501';
  end if;
  if p_status in ('ACCETTATA','RICEVUTA') and v.medical_kind = 'FARMACO'
     and (not v.sealed or v.expires_on is null or v.expires_on < coalesce(p_received_on, current_date)) then
    raise exception 'medicines: sealed and not expired only' using errcode = '22023';
  end if;
  if p_status = 'RIFIUTATA' and char_length(v_text) < 3 then raise exception 'reason needed' using errcode = '22023'; end if;
  if p_status = 'INFO_RICHIESTE' and char_length(v_text) < 3 then raise exception 'question needed' using errcode = '22023'; end if;
  if p_status = 'RICEVUTA' and (not coalesce(p_condition_ok, false) or p_received_on is null or p_received_on > current_date) then
    raise exception 'condition check and date needed' using errcode = '22023';
  end if;
  if p_status = 'INVENTARIATA' and char_length(trim(coalesce(p_inventory_ref, ''))) not between 1 and 80 then
    raise exception 'inventory reference needed' using errcode = '22023';
  end if;
  update public.scd_inkind_offers set
    status = p_status,
    decline_reason = case when p_status = 'RIFIUTATA' then left(v_text, 300) else decline_reason end,
    info_request = case when p_status = 'INFO_RICHIESTE' then left(v_text, 300) else info_request end,
    condition_checked = case when p_status = 'RICEVUTA' then true else condition_checked end,
    condition_note = case when p_status = 'RICEVUTA' and v_text <> '' then left(v_text, 300) else condition_note end,
    received_on = case when p_status = 'RICEVUTA' then p_received_on else received_on end,
    inventory_ref = case when p_status = 'INVENTARIATA' then trim(p_inventory_ref) else inventory_ref end,
    reviewed_by = (select auth.uid()), updated_at = now()
  where id = v.id;
  perform public.scd_giving_log(p_organization_id, 'INKIND_OFFER', v.id, v.code, 'STATUS', jsonb_build_object('from', v.status, 'to', p_status));
end;
$$;

-- 9. "Adotta un oggetto" (section adotta).
-- Create (p_item_id null) or edit an item. Publishing needs APPROVE.
create or replace function public.scd_adopt_item_save(p_organization_id uuid, p_item_id uuid, p_item jsonb)
returns uuid
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v public.scd_adopt_items%rowtype;
  v_id uuid;
  v_code text;
  v_publish boolean := coalesce((p_item->>'published')::boolean, false);
  v_units integer := nullif(p_item->>'unitsTotal', '')::integer;
begin
  perform public.scd_giving_need('adotta', 'WRITE', p_organization_id);
  if p_item is null or jsonb_typeof(p_item) <> 'object' then raise exception 'item must be an object' using errcode = '22023'; end if;
  if p_item_id is not null then
    select * into v from public.scd_adopt_items where id = p_item_id and organization_id = p_organization_id for update;
    if not found then raise exception 'item not found' using errcode = 'P0002'; end if;
    if v_publish is distinct from v.published then perform public.scd_giving_need('adotta', 'APPROVE', p_organization_id); end if;
    if v_units is distinct from v.units_total and exists (select 1 from public.scd_adopt_units u where u.item_id = v.id and u.status = 'ADOTTATO') then
      raise exception 'units already adopted: number of units is locked' using errcode = '22023';
    end if;
    update public.scd_adopt_items set
      title = trim(p_item->>'title'), category = p_item->>'category', description = coalesce(trim(p_item->>'description'), ''),
      supplier = nullif(trim(coalesce(p_item->>'supplier', '')), ''), supplier_code = nullif(trim(coalesce(p_item->>'supplierCode', '')), ''),
      product_url = nullif(trim(coalesce(p_item->>'productUrl', '')), ''), photo_path = nullif(trim(coalesce(p_item->>'photoPath', '')), ''),
      price_mode = p_item->>'priceMode', price_total = nullif(p_item->>'priceTotal', '')::numeric,
      price_note = nullif(trim(coalesce(p_item->>'priceNote', '')), ''), quote_ref = nullif(trim(coalesce(p_item->>'quoteRef', '')), ''),
      quote_valid_until = nullif(p_item->>'quoteValidUntil', '')::date, unit_label = nullif(trim(coalesce(p_item->>'unitLabel', '')), ''),
      units_total = v_units, unit_price = nullif(p_item->>'unitPrice', '')::numeric, campaign = nullif(p_item->>'campaign', ''),
      published = v_publish, updated_at = now()
    where id = v.id;
    v_id := v.id; v_code := v.code;
  else
    if v_publish then perform public.scd_giving_need('adotta', 'APPROVE', p_organization_id); end if;
    v_code := public.scd_giving_code('OG');
    insert into public.scd_adopt_items (organization_id, code, title, category, description, supplier, supplier_code, product_url,
      photo_path, price_mode, price_total, price_note, quote_ref, quote_valid_until, unit_label, units_total, unit_price, campaign,
      proposal_id, status, published, created_by)
    values (p_organization_id, v_code, trim(p_item->>'title'), p_item->>'category', coalesce(trim(p_item->>'description'), ''),
      nullif(trim(coalesce(p_item->>'supplier', '')), ''), nullif(trim(coalesce(p_item->>'supplierCode', '')), ''),
      nullif(trim(coalesce(p_item->>'productUrl', '')), ''), nullif(trim(coalesce(p_item->>'photoPath', '')), ''),
      coalesce(p_item->>'priceMode', 'DA_PREVENTIVO'), nullif(p_item->>'priceTotal', '')::numeric,
      nullif(trim(coalesce(p_item->>'priceNote', '')), ''), nullif(trim(coalesce(p_item->>'quoteRef', '')), ''),
      nullif(p_item->>'quoteValidUntil', '')::date, nullif(trim(coalesce(p_item->>'unitLabel', '')), ''), v_units,
      nullif(p_item->>'unitPrice', '')::numeric, nullif(p_item->>'campaign', ''), nullif(p_item->>'proposalId', '')::uuid,
      case when v_publish then 'DA_ADOTTARE' else 'BOZZA' end, v_publish, (select auth.uid()))
    returning id into v_id;
  end if;
  -- Units (e.g. numbered seats) exist one row per number.
  if v_units is not null then
    insert into public.scd_adopt_units (item_id, number)
    select v_id, n from generate_series(1, v_units) n
    on conflict (item_id, number) do nothing;
    delete from public.scd_adopt_units where item_id = v_id and number > v_units and status = 'LIBERO';
  else
    delete from public.scd_adopt_units where item_id = v_id and status = 'LIBERO';
  end if;
  perform public.scd_giving_log(p_organization_id, 'ADOPT_ITEM', v_id, v_code, case when p_item_id is null then 'CREATE' else 'EDIT' end,
    jsonb_build_object('published', v_publish, 'price_mode', p_item->>'priceMode'));
  return v_id;
end;
$$;

-- Manual status (WRITE): DA_ADOTTARE after a draft, CONSEGNATO when delivered, RITIRATO, back to BOZZA.
create or replace function public.scd_adopt_item_set_status(p_organization_id uuid, p_item_id uuid, p_status text)
returns void
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare v public.scd_adopt_items%rowtype;
begin
  perform public.scd_giving_need('adotta', 'WRITE', p_organization_id);
  select * into v from public.scd_adopt_items where id = p_item_id and organization_id = p_organization_id for update;
  if not found then raise exception 'item not found' using errcode = 'P0002'; end if;
  if not public.scd_giving_transition_ok('ADOPT_ITEM', v.status, p_status) then
    raise exception 'transition % -> % not allowed', v.status, p_status using errcode = '22023';
  end if;
  if p_status in ('BOZZA','RITIRATO') and exists (select 1 from public.scd_donations d where d.item_id = v.id and d.status = 'RICEVUTA') then
    raise exception 'money already received for this item' using errcode = '22023';
  end if;
  update public.scd_adopt_items set status = p_status, published = case when p_status in ('BOZZA','RITIRATO') then false else published end,
    updated_at = now() where id = v.id;
  perform public.scd_giving_log(p_organization_id, 'ADOPT_ITEM', v.id, v.code, 'STATUS', jsonb_build_object('from', v.status, 'to', p_status));
end;
$$;

-- Catalogue board (READ): every item with progress and units; public names of adopters only (donor data stay in
-- the treasury).
create or replace function public.scd_adopt_board(p_organization_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
begin
  perform public.scd_giving_need('adotta', 'READ', p_organization_id);
  return jsonb_build_object(
    'canWrite', coalesce(public.scd_can('adotta', 'WRITE', p_organization_id), false),
    'canApprove', coalesce(public.scd_can('adotta', 'APPROVE', p_organization_id), false),
    'items', coalesce((select jsonb_agg(jsonb_build_object(
        'id', i.id, 'code', i.code, 'title', i.title, 'category', i.category, 'description', i.description,
        'supplier', i.supplier, 'supplierCode', i.supplier_code, 'productUrl', i.product_url, 'photoPath', i.photo_path,
        'priceMode', i.price_mode, 'effectivePriceMode', public.scd_adopt_effective_price_mode(i.price_mode, i.quote_valid_until, current_date),
        'priceTotal', i.price_total, 'priceNote', i.price_note, 'quoteRef', i.quote_ref, 'quoteValidUntil', i.quote_valid_until,
        'unitLabel', i.unit_label, 'unitsTotal', i.units_total, 'unitPrice', i.unit_price, 'campaign', i.campaign,
        'proposalId', i.proposal_id, 'status', i.status, 'published', i.published, 'updatedAt', i.updated_at,
        'received', (select coalesce(sum(d.amount), 0) from public.scd_donations d where d.item_id = i.id and d.status = 'RICEVUTA'),
        'contributions', (select count(*) from public.scd_donations d where d.item_id = i.id and d.status = 'RICEVUTA'),
        'pledges', (select count(*) from public.scd_donations d where d.item_id = i.id and d.status = 'PROMESSA'),
        'unitsAdopted', (select count(*) from public.scd_adopt_units u where u.item_id = i.id and u.status = 'ADOTTATO'),
        'units', coalesce((select jsonb_agg(jsonb_build_object('n', u.number, 'status', u.status,
            'plate', case when d.visibility = 'NOME_PUBBLICO' then d.plate_text end) order by u.number)
          from public.scd_adopt_units u left join public.scd_donations d on d.id = u.donation_id where u.item_id = i.id), '[]'::jsonb))
      order by i.updated_at desc)
      from public.scd_adopt_items i where i.organization_id = p_organization_id), '[]'::jsonb));
end;
$$;

-- 10. Improvement proposals (section proposte).
create or replace function public.scd_improvement_board(p_organization_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
begin
  perform public.scd_giving_need('proposte', 'READ', p_organization_id);
  return jsonb_build_object(
    'canWrite', coalesce(public.scd_can('proposte', 'WRITE', p_organization_id), false),
    'canApprove', coalesce(public.scd_can('proposte', 'APPROVE', p_organization_id), false),
    'canAdopt', coalesce(public.scd_can('adotta', 'WRITE', p_organization_id), false),
    'proposals', coalesce((select jsonb_agg(jsonb_build_object(
        'id', p.id, 'code', p.code, 'area', p.area, 'title', p.title, 'body', p.body, 'anonymous', p.anonymous,
        'contact', p.contact, 'canContribute', to_jsonb(p.can_contribute), 'status', p.status, 'reason', p.reason,
        'published', p.published, 'publicTitle', p.public_title, 'publicText', p.public_text, 'itemId', p.item_id,
        'createdAt', p.created_at)
      order by (p.status = 'NUOVA') desc, p.created_at desc)
      from public.scd_improvement_proposals p where p.organization_id = p_organization_id and p.status <> 'SPAM'), '[]'::jsonb),
    'spam', (select count(*) from public.scd_improvement_proposals p where p.organization_id = p_organization_id and p.status = 'SPAM'));
end;
$$;

-- Triage (WRITE): IN_VALUTAZIONE, ACCETTATA, NON_FATTIBILE (reason), SPAM.
create or replace function public.scd_improvement_triage(p_organization_id uuid, p_proposal_id uuid, p_status text, p_reason text)
returns void
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare v public.scd_improvement_proposals%rowtype;
begin
  perform public.scd_giving_need('proposte', 'WRITE', p_organization_id);
  select * into v from public.scd_improvement_proposals where id = p_proposal_id and organization_id = p_organization_id for update;
  if not found then raise exception 'proposal not found' using errcode = 'P0002'; end if;
  if not public.scd_giving_transition_ok('PROPOSAL', v.status, p_status) then
    raise exception 'transition % -> % not allowed', v.status, p_status using errcode = '22023';
  end if;
  if p_status = 'NON_FATTIBILE' and char_length(trim(coalesce(p_reason, ''))) < 3 then raise exception 'reason needed' using errcode = '22023'; end if;
  update public.scd_improvement_proposals set status = p_status, reason = nullif(left(trim(coalesce(p_reason, '')), 300), ''),
    published = case when p_status in ('NON_FATTIBILE','SPAM') then false else published end,
    triaged_by = (select auth.uid()), updated_at = now()
  where id = v.id;
  perform public.scd_giving_log(p_organization_id, 'PROPOSAL', v.id, v.code, 'TRIAGE', jsonb_build_object('from', v.status, 'to', p_status));
end;
$$;

-- Publish or hide (APPROVE) with a text written by staff; contacts are refused (the table checks it too).
create or replace function public.scd_improvement_publish(p_organization_id uuid, p_proposal_id uuid, p_publish boolean, p_title text, p_text text)
returns void
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare v public.scd_improvement_proposals%rowtype;
begin
  perform public.scd_giving_need('proposte', 'APPROVE', p_organization_id);
  select * into v from public.scd_improvement_proposals where id = p_proposal_id and organization_id = p_organization_id for update;
  if not found then raise exception 'proposal not found' using errcode = 'P0002'; end if;
  if coalesce(p_publish, false) and public.scd_giving_has_contact(coalesce(p_title, '') || ' ' || coalesce(p_text, '')) then
    raise exception 'published text contains a contact' using errcode = '22023';
  end if;
  update public.scd_improvement_proposals set published = coalesce(p_publish, false),
    public_title = nullif(trim(coalesce(p_title, '')), ''), public_text = nullif(trim(coalesce(p_text, '')), ''), updated_at = now()
  where id = v.id;
  perform public.scd_giving_log(p_organization_id, 'PROPOSAL', v.id, v.code, case when coalesce(p_publish, false) then 'PUBLISH' else 'HIDE' end);
end;
$$;

-- An accepted proposal becomes an adoptable item (draft): needs proposte WRITE and adotta WRITE.
create or replace function public.scd_improvement_to_item(p_organization_id uuid, p_proposal_id uuid, p_title text, p_category text)
returns uuid
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v public.scd_improvement_proposals%rowtype;
  v_item uuid;
begin
  perform public.scd_giving_need('proposte', 'WRITE', p_organization_id);
  select * into v from public.scd_improvement_proposals where id = p_proposal_id and organization_id = p_organization_id for update;
  if not found then raise exception 'proposal not found' using errcode = 'P0002'; end if;
  if v.status <> 'ACCETTATA' or v.item_id is not null then raise exception 'only an accepted proposal without item' using errcode = '22023'; end if;
  v_item := public.scd_adopt_item_save(p_organization_id, null, jsonb_build_object('title', p_title, 'category', p_category,
    'priceMode', 'DA_PREVENTIVO', 'published', false, 'proposalId', v.id));
  update public.scd_improvement_proposals set item_id = v_item, updated_at = now() where id = v.id;
  perform public.scd_giving_log(p_organization_id, 'PROPOSAL', v.id, v.code, 'TO_ITEM');
  return v_item;
end;
$$;

-- 11. Execute rights. Helpers private; public entry points for anon and signed in; the back office for signed-in
-- users (each function checks scd_can).
revoke all on function public.scd_giving_engine() from public;
revoke all on function public.scd_giving_org() from public, anon, authenticated;
revoke all on function public.scd_giving_need(text, text, uuid) from public, anon, authenticated;
revoke all on function public.scd_giving_has_contact(text) from public, anon;
revoke all on function public.scd_giving_transition_ok(text, text, text) from public, anon;
revoke all on function public.scd_giving_log(uuid, text, uuid, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.scd_giving_code(text) from public, anon, authenticated;
revoke all on function public.scd_adopt_effective_price_mode(text, date, date) from public, anon;
revoke all on function public.scd_adopt_refresh(uuid) from public, anon, authenticated;
revoke all on function public.scd_giving_public() from public;
revoke all on function public.scd_adopt_pledge(uuid, integer, text, text, text, text, text, boolean, numeric) from public;
revoke all on function public.scd_inkind_offer_submit(text, uuid, text, integer, text, text, boolean, date, boolean, boolean, text, text, text, text, text, text, text) from public;
revoke all on function public.scd_improvement_submit(text, text, text, boolean, text, text[]) from public;
revoke all on function public.scd_fund_submit_application(uuid, text, uuid, text, text, text, text, text, numeric, date, text, text, text) from public, anon;
revoke all on function public.scd_fund_set_status(uuid, uuid, text, date, date, text) from public, anon;
revoke all on function public.scd_fund_decide(uuid, uuid, text, numeric, numeric, text, date, text) from public, anon;
revoke all on function public.scd_fund_record_movement(uuid, text, text, numeric, date, text, uuid, text) from public, anon;
revoke all on function public.scd_fund_void_movement(uuid, uuid, text) from public, anon;
revoke all on function public.scd_fund_board(uuid, text) from public, anon;
revoke all on function public.scd_fund_report(uuid, text) from public, anon;
revoke all on function public.scd_giving_set_public_totals(uuid, boolean) from public, anon;
revoke all on function public.scd_donation_record(uuid, uuid, text, uuid, integer, text, text, text, text, text, text, boolean, numeric, text, date, text) from public, anon;
revoke all on function public.scd_donation_set_receipt(uuid, uuid, text, date) from public, anon;
revoke all on function public.scd_donation_void(uuid, uuid, text) from public, anon;
revoke all on function public.scd_donation_board(uuid) from public, anon;
revoke all on function public.scd_inkind_review(uuid, uuid, text, text, boolean, date, text) from public, anon;
revoke all on function public.scd_adopt_item_save(uuid, uuid, jsonb) from public, anon;
revoke all on function public.scd_adopt_item_set_status(uuid, uuid, text) from public, anon;
revoke all on function public.scd_adopt_board(uuid) from public, anon;
revoke all on function public.scd_improvement_board(uuid) from public, anon;
revoke all on function public.scd_improvement_triage(uuid, uuid, text, text) from public, anon;
revoke all on function public.scd_improvement_publish(uuid, uuid, boolean, text, text) from public, anon;
revoke all on function public.scd_improvement_to_item(uuid, uuid, text, text) from public, anon;

grant execute on function public.scd_giving_engine() to anon, authenticated;
grant execute on function public.scd_giving_public() to anon, authenticated;
grant execute on function public.scd_adopt_pledge(uuid, integer, text, text, text, text, text, boolean, numeric) to anon, authenticated;
grant execute on function public.scd_inkind_offer_submit(text, uuid, text, integer, text, text, boolean, date, boolean, boolean, text, text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.scd_improvement_submit(text, text, text, boolean, text, text[]) to anon, authenticated;
grant execute on function public.scd_giving_has_contact(text) to authenticated;
grant execute on function public.scd_giving_transition_ok(text, text, text) to authenticated;
grant execute on function public.scd_adopt_effective_price_mode(text, date, date) to authenticated;
grant execute on function public.scd_fund_submit_application(uuid, text, uuid, text, text, text, text, text, numeric, date, text, text, text) to authenticated;
grant execute on function public.scd_fund_set_status(uuid, uuid, text, date, date, text) to authenticated;
grant execute on function public.scd_fund_decide(uuid, uuid, text, numeric, numeric, text, date, text) to authenticated;
grant execute on function public.scd_fund_record_movement(uuid, text, text, numeric, date, text, uuid, text) to authenticated;
grant execute on function public.scd_fund_void_movement(uuid, uuid, text) to authenticated;
grant execute on function public.scd_fund_board(uuid, text) to authenticated;
grant execute on function public.scd_fund_report(uuid, text) to authenticated;
grant execute on function public.scd_giving_set_public_totals(uuid, boolean) to authenticated;
grant execute on function public.scd_donation_record(uuid, uuid, text, uuid, integer, text, text, text, text, text, text, boolean, numeric, text, date, text) to authenticated;
grant execute on function public.scd_donation_set_receipt(uuid, uuid, text, date) to authenticated;
grant execute on function public.scd_donation_void(uuid, uuid, text) to authenticated;
grant execute on function public.scd_donation_board(uuid) to authenticated;
grant execute on function public.scd_inkind_review(uuid, uuid, text, text, boolean, date, text) to authenticated;
grant execute on function public.scd_adopt_item_save(uuid, uuid, jsonb) to authenticated;
grant execute on function public.scd_adopt_item_set_status(uuid, uuid, text) to authenticated;
grant execute on function public.scd_adopt_board(uuid) to authenticated;
grant execute on function public.scd_improvement_board(uuid) to authenticated;
grant execute on function public.scd_improvement_triage(uuid, uuid, text, text) to authenticated;
grant execute on function public.scd_improvement_publish(uuid, uuid, boolean, text, text) to authenticated;
grant execute on function public.scd_improvement_to_item(uuid, uuid, text, text) to authenticated;
