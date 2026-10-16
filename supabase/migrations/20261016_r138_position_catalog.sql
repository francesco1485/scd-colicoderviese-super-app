-- r138: catalogue of the organigram positions (FIGC / LND / SGS / RASD) + custom positions, 2026-10-16, chat PC.
-- STAGED: NOT APPLIED. Apply only after Francesco writes "applica r138". Never apply from an agent.
-- Target: SCD PULSE (ndevtxxijbcnskgysdit). Never on dfnwzwutvnwiitiffwvr.
-- Requires (APPLIED on SCD PULSE as of 16/10/2026 13:40): r59 (scd_structure_roles), r65/r100 (scd_access_audit),
-- r74 (scd_has_position), r87/r136 (scd_access_admin_guard), r111 (scd_is_role_creator, scd_section_platform),
-- r133 (scd_request_group_confirmers), r135 (scd_structure_reader_site). A guard below stops the migration when one
-- of them is missing.
--
-- Why (Francesco, DG):
--   * 16/10/2026 13:35 "entravi nel sito figc e rasd e nella parte organigramma o nei siti generali recuperavi tutti
--     quelli predefiniti che si possono ricoprire e renderli già pronti per inserire il tesserato ad occorrenza e
--     avere sempre la possibilità di creare un ruolo nuovo così da avere eventuali figure aggiuntive per altre cose".
--   * 16/10/2026 13:32: create the positions direttore-sportivo-agonistica and direttore-sportivo-generale and add
--     them (with the coordinatore attività sportiva, already there) to the Dervio readers (UD-156). The responsabile
--     struttura sees Colico; at Dervio there is no structure manager yet (keys held by the club, managed with the
--     responsabile attività di base): unchanged.
--   * r111 / UD-159: new roles are created only by the Presidente or the Direttore Generale.
--
-- What it adds (catalogue mirrored in config/scd-position-catalog.v1.json, kept equal by
-- apps/superapp/src/lib/position-catalog.test.ts):
--   1. scd_access_audit: actions CREATE_POSITION and POSITION_STATUS (every r100 / r111 value kept).
--   2. scd_section_platform: the r111 list plus {"code":"nutrizione","platform":"CORE"} (section of r136).
--   3. scd_coach_qualifications: the 24 Settore Tecnico qualifications (art. 16, current and "ad esaurimento"). A
--      qualification is an ATTRIBUTE of the holder of a coach position, never a separate position.
--   4. scd_position_catalog: one row per organigram position and organisation, seeded for every existing organisation
--      with the 83 positions of the catalogue (FIGC, LND, SGS, RASD, D.Lgs 36/2021 and the club positions already
--      used by the app), status ACTIVE, every position EMPTY (no person). Lavoratore sportivo (ls-*), RASD card type
--      (rasd-tessera-*) and socio are attributes of the relationship / registration: NOT seeded as positions.
--   5. scd_structure_roles (the existing organigram registry, r59) gains position_code (catalogue position held) and
--      qualification_code (coach qualification of the holder). Both null on every existing row: nothing is linked or
--      changed. A trigger accepts a new position_code only for an ACTIVE position of the same organisation and a
--      qualification only on a position that accepts it. The same row stays the only record of who holds what.
--   6. scd_position_catalog_board(org) -> {canCreate, positions[{..., holders}]}: catalogue for the organigram page,
--      holders as COUNTS only (never names; minors never listed). Readers: Direzione, Segreteria, Tesseramenti roles
--      and the positions of the organigram area (presidente, direttore-generale, responsabile-attivita-base,
--      coordinatore-attivita-sportiva).
--   7. scd_create_custom_position(org, label, group, role_kind, description) -> code "custom-<slug>", status PROPOSED:
--      only Presidente / Direttore Generale (r111 scd_is_role_creator), audited CREATE_POSITION.
--   8. scd_set_position_status(org, code, status, note): approval (PROPOSED -> ACTIVE), rejection or retirement, only
--      Presidente / Direttore Generale, audited POSITION_STATUS. A position with active holders is never retired.
--   9. Positions direttore-sportivo-agonistica / direttore-sportivo-generale: assignable in scd_access_admin_guard
--      (r136 text identical, two positions appended), Dervio and Colico readers in scd_structure_reader_site (r135
--      text identical, two positions appended per site), confirmers in scd_request_group_confirmers (r133: U16/U15 ->
--      agonistica, Prima/U19 -> generale; until now only the Direzione confirmed those groups).
--
-- Security: RLS on both new tables, no policies, no table grants (read only through the board function, written
-- only through the SECURITY DEFINER functions with fixed search_path and explicit guards); nothing executable by
-- anon. Labels refuse e-mail addresses and phone numbers. No personal data is stored or returned.
--
-- Engines: PERSONE (every role the club may need is ready to receive a tesserato; new figures without code changes)
-- and TEMPO (requests of U16/U15/Prima/U19 reach their direttore sportivo instead of waiting for the Direzione).
-- Measure: share of mandatory positions (mandatory_for_club) with at least one holder in scd_structure_roles;
-- custom positions created and approved per season (scd_access_audit CREATE_POSITION / POSITION_STATUS);
-- requests of U16/U15/Prima/U19 confirmed by a direttore sportivo instead of the Direzione fallback (scd_request_events).
--
-- Additive and idempotent (create if not exists / create or replace / on conflict do nothing). Existing rows are
-- never updated or deleted. Recreated functions keep their previous text except the lines named above.
--
-- Rollback (only on Francesco's explicit order; catalogue and custom positions are lost, structure roles keep their
-- other columns):
--   begin;
--   drop trigger if exists scd_structure_roles_position_check on public.scd_structure_roles;
--   drop function if exists public.scd_structure_roles_position_check();
--   alter table public.scd_structure_roles drop constraint if exists scd_structure_roles_position_fk;
--   alter table public.scd_structure_roles drop column if exists qualification_code;
--   alter table public.scd_structure_roles drop column if exists position_code;
--   drop function if exists public.scd_set_position_status(uuid, text, text, text);
--   drop function if exists public.scd_create_custom_position(uuid, text, text, text, text);
--   drop function if exists public.scd_position_catalog_board(uuid);
--   drop function if exists public.scd_position_catalog_reader(uuid);
--   drop function if exists public.scd_position_slug(text);
--   drop function if exists public.scd_position_label_ok(text);
--   drop table if exists public.scd_position_catalog;
--   drop table if exists public.scd_coach_qualifications;
--   -- then re-run the r136 scd_access_admin_guard, the r135 scd_structure_reader_site, the r133
--   -- scd_request_group_confirmers and the r111 scd_section_platform (the widened audit check can stay).
--   commit;

begin;

-- ---------------------------------------------------------------- 0. prerequisites (fail closed)
do $$
begin
  if to_regclass('public.scd_structure_roles') is null
     or to_regclass('public.scd_access_audit') is null
     or to_regclass('public.scd_organizations') is null
     or to_regclass('public.scd_structure_activities') is null
     or to_regprocedure('public.scd_has_org_role(uuid, public.scd_role[])') is null
     or to_regprocedure('public.scd_has_position(uuid, text[])') is null
     or to_regprocedure('public.scd_is_role_creator(uuid)') is null
     or to_regprocedure('public.scd_section_platform(text)') is null
     or to_regprocedure('public.scd_request_group_confirmers(text)') is null
     or to_regprocedure('public.scd_access_admin_guard(uuid, uuid, public.scd_role, text[])') is null then
    raise exception 'r138 prerequisites missing (r59, r65/r100, r74, r111, r133, r135, r136)';
  end if;
end;
$$;

-- ---------------------------------------------------------------- 1. audit actions (r100 + r111 values kept)
alter table public.scd_access_audit drop constraint if exists scd_access_audit_action_check;
alter table public.scd_access_audit add constraint scd_access_audit_action_check check (action in (
  'SET_ACCESS','GRANT_PERSON','REVOKE_LINK','APPROVE_REQUEST','REJECT_REQUEST',
  'GRANT_SECTION','CHANGE_SECTION','REVOKE_SECTION','COPY_GRANTS',
  'CREATE_ROLE','CHANGE_ROLE','ROLE_STATUS',
  'CREATE_POSITION','POSITION_STATUS'));

-- ---------------------------------------------------------------- 2. platform of each section (r111 + nutrizione)
-- Kept equal to config/scd-sections.v1.json "platform" by apps/superapp/src/lib/position-catalog.test.ts.
create or replace function public.scd_section_platform(p_code text)
returns text
language sql
immutable
set search_path to 'public'
as $$
  select x.platform
  from jsonb_to_recordset($plat$
[
  {"code":"pubblico","platform":"ONE"},
  {"code":"profilo","platform":"ONE"},
  {"code":"tessera","platform":"ONE"},
  {"code":"mister","platform":"CORE"},
  {"code":"quadro","platform":"CORE"},
  {"code":"impianti-campi","platform":"CORE"},
  {"code":"mappa","platform":"CORE"},
  {"code":"organigramma","platform":"CORE"},
  {"code":"pulmini","platform":"CORE"},
  {"code":"famiglia","platform":"ONE"},
  {"code":"infermeria","platform":"CORE"},
  {"code":"salute-minori","platform":"CORE"},
  {"code":"safeguarding","platform":"CORE"},
  {"code":"magazzino","platform":"CORE"},
  {"code":"club-house","platform":"CORE"},
  {"code":"biglietteria","platform":"CORE"},
  {"code":"magazzino-cassa","platform":"CORE"},
  {"code":"segreteria","platform":"CORE"},
  {"code":"persone","platform":"CORE"},
  {"code":"certificati","platform":"CORE"},
  {"code":"coda","platform":"CORE"},
  {"code":"posta","platform":"CORE"},
  {"code":"crm","platform":"GROW"},
  {"code":"crea","platform":"CORE"},
  {"code":"tesoreria","platform":"CORE"},
  {"code":"quote","platform":"CORE"},
  {"code":"compensi","platform":"CORE"},
  {"code":"scadenzario","platform":"CORE"},
  {"code":"movimenti","platform":"CORE"},
  {"code":"direzione","platform":"CORE"},
  {"code":"acquisti","platform":"CORE"},
  {"code":"cervellone","platform":"CORE"},
  {"code":"accessi","platform":"CORE"},
  {"code":"posta-collega","platform":"CORE"},
  {"code":"partner","platform":"GROW"},
  {"code":"fondo-solidale","platform":"CORE"},
  {"code":"adotta","platform":"GROW"},
  {"code":"donazioni","platform":"CORE"},
  {"code":"proposte","platform":"CORE"},
  {"code":"nutrizione","platform":"CORE"}
]
$plat$::jsonb) as x(code text, platform text)
  where x.code = p_code;
$$;

-- ---------------------------------------------------------------- 3. coach qualifications (attribute, not positions)
create table if not exists public.scd_coach_qualifications (
  code text primary key check (code ~ '^[a-z0-9-]{2,60}$'),
  label text not null check (char_length(btrim(label)) between 2 and 120),
  legacy boolean not null default false,   -- "ad esaurimento": still valid for whoever holds it
  source_ref text,
  created_at timestamptz not null default now()
);
comment on table public.scd_coach_qualifications is
  'r138: Settore Tecnico FIGC qualifications (Reg. ST art. 16). Attribute of the holder of a coach position (scd_structure_roles.qualification_code), never a position. Read-only vocabulary.';
alter table public.scd_coach_qualifications enable row level security;
revoke all on table public.scd_coach_qualifications from anon, authenticated;

insert into public.scd_coach_qualifications (code, label, legacy, source_ref)
select x.code, x.label, x.legacy, x."sourceRef"
from jsonb_to_recordset($qual$
[
  {"code":"allenatore-uefa-pro","label":"Allenatore UEFA Pro","legacy":false,"sourceRef":"Reg. Settore Tecnico art. 16 lett. a"},
  {"code":"allenatore-uefa-a","label":"Allenatore UEFA A","legacy":false,"sourceRef":"Reg. Settore Tecnico art. 16 lett. b"},
  {"code":"allenatore-uefa-b","label":"Allenatore UEFA B","legacy":false,"sourceRef":"Reg. Settore Tecnico art. 16 lett. c"},
  {"code":"allenatore-licenza-d","label":"Allenatore Licenza D (Dilettanti Regionali)","legacy":false,"sourceRef":"Reg. Settore Tecnico art. 16 lett. d"},
  {"code":"allenatore-uefa-c","label":"Allenatore UEFA C","legacy":false,"sourceRef":"Reg. Settore Tecnico art. 16 lett. e"},
  {"code":"allenatore-responsabile-settore-giovanile","label":"Allenatore Responsabile di Settore Giovanile","legacy":false,"sourceRef":"Reg. Settore Tecnico art. 16 lett. f"},
  {"code":"allenatore-portieri-uefa-gk-a","label":"Allenatore portieri UEFA GK A","legacy":false,"sourceRef":"Reg. Settore Tecnico art. 16 lett. g"},
  {"code":"allenatore-portieri-uefa-gk-b","label":"Allenatore portieri UEFA GK B","legacy":false,"sourceRef":"Reg. Settore Tecnico art. 16 lett. h"},
  {"code":"allenatore-portieri-dilettanti-sg","label":"Allenatore portieri Dilettanti e Settore Giovanile","legacy":false,"sourceRef":"Reg. Settore Tecnico art. 16 lett. i"},
  {"code":"allenatore-c5-licenza-a","label":"Allenatore Calcio a 5 Licenza A","legacy":false,"sourceRef":"Reg. Settore Tecnico art. 16 lett. j"},
  {"code":"allenatore-uefa-futsal-b","label":"Allenatore UEFA Futsal B","legacy":false,"sourceRef":"Reg. Settore Tecnico art. 16 lett. k"},
  {"code":"allenatore-c5-licenza-d","label":"Allenatore Calcio a 5 Licenza D","legacy":false,"sourceRef":"Reg. Settore Tecnico art. 16 lett. l"},
  {"code":"allenatore-c5-licenza-c","label":"Allenatore Calcio a 5 Licenza C","legacy":false,"sourceRef":"Reg. Settore Tecnico art. 16 lett. m"},
  {"code":"allenatore-portieri-c5","label":"Allenatore portieri Calcio a 5","legacy":false,"sourceRef":"Reg. Settore Tecnico art. 16 lett. n"},
  {"code":"allenatore-beach-licenza-a","label":"Allenatore Beach Soccer Licenza A","legacy":false,"sourceRef":"Reg. Settore Tecnico art. 16 lett. o"},
  {"code":"allenatore-beach-licenza-b","label":"Allenatore Beach Soccer Licenza B","legacy":false,"sourceRef":"Reg. Settore Tecnico art. 16 lett. p"},
  {"code":"allenatore-paralimpico","label":"Allenatore calcio paralimpico","legacy":false,"sourceRef":"Reg. Settore Tecnico art. 16 lett. q"},
  {"code":"direttore-tecnico","label":"Direttore tecnico (ad esaurimento, = UEFA Pro)","legacy":true,"sourceRef":"Reg. Settore Tecnico art. 16 (qualifiche ad esaurimento)"},
  {"code":"allenatore-dilettanti-3-cat","label":"Allenatore Dilettanti di 3a categoria (ad esaurimento, = UEFA B)","legacy":true,"sourceRef":"Reg. Settore Tecnico art. 16 (qualifiche ad esaurimento)"},
  {"code":"istruttore-giovani-calciatori","label":"Istruttore di Giovani Calciatori (ad esaurimento, = UEFA C)","legacy":true,"sourceRef":"Reg. Settore Tecnico art. 16 (qualifiche ad esaurimento)"},
  {"code":"allenatore-giovani-calciatori-grassroots-c","label":"Allenatore Giovani Calciatori UEFA Grassroots C (ad esaurimento, = UEFA C)","legacy":true,"sourceRef":"Reg. Settore Tecnico art. 16 (qualifiche ad esaurimento)"},
  {"code":"allenatore-portieri-st","label":"Allenatore dei Portieri (ad esaurimento, = UEFA GK A)","legacy":true,"sourceRef":"Reg. Settore Tecnico art. 16 (qualifiche ad esaurimento)"},
  {"code":"allenatore-dilettante","label":"Allenatore Dilettante (ad esaurimento)","legacy":true,"sourceRef":"Reg. Settore Tecnico art. 16 (qualifiche ad esaurimento)"},
  {"code":"allenatore-c5","label":"Allenatore di Calcio a 5 (ad esaurimento, = UEFA Futsal B)","legacy":true,"sourceRef":"Reg. Settore Tecnico art. 16 (qualifiche ad esaurimento)"}
]
$qual$::jsonb) as x(code text, label text, legacy boolean, "sourceRef" text)
on conflict (code) do nothing;

-- ---------------------------------------------------------------- 4. position catalogue
create table if not exists public.scd_position_catalog (
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  code text not null check (code ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(code) between 2 and 60),
  label text not null check (char_length(btrim(label)) between 2 and 120),
  group_code text not null check (group_code in ('direzione','dirigenti','tecnici','sgs','sanitari','safeguarding','comunicazione','servizi','operativi')),
  role_kind text not null check (role_kind in ('DIRIGENTE','MISTER','AUTISTA','RESPONSABILE','STAFF','ORGANO_SOCIETARIO')),
  -- access position of the app (session.ts KNOWN_POSITIONS) this position stands for; opens nothing by itself
  app_position text check (app_position is null or app_position ~ '^[a-z0-9-]{2,60}$'),
  source text not null check (source in ('FIGC','LND','SGS','RASD','DLGS36','CLUB','CUSTOM')),
  source_url text check (source_url is null or source_url ~ '^https://'),
  source_ref text,
  evidence text not null check (evidence in ('VERIFIED','INFERRED','PROPOSED')),
  requires_licence boolean not null default false,
  mandatory_for_club boolean not null default false,
  accepts_qualification boolean not null default false,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','PROPOSED','RETIRED')),
  is_custom boolean not null default false,
  description text not null default '' check (char_length(description) <= 300),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  primary key (organization_id, code),
  check (is_custom = (code like 'custom-%')),
  check (is_custom = (source = 'CUSTOM'))
);
create index if not exists scd_position_catalog_status_idx on public.scd_position_catalog (organization_id, status, group_code);
create unique index if not exists scd_position_catalog_app_position_idx
  on public.scd_position_catalog (organization_id, app_position) where app_position is not null;
create index if not exists scd_position_catalog_created_by_idx on public.scd_position_catalog (created_by);
create index if not exists scd_position_catalog_updated_by_idx on public.scd_position_catalog (updated_by);
create index if not exists scd_position_catalog_approved_by_idx on public.scd_position_catalog (approved_by);
comment on table public.scd_position_catalog is
  'r138 (Francesco 16/10/2026 13:35): organigram positions the club may fill (FIGC/LND/SGS/RASD + club), every one empty until a scd_structure_roles row holds it. Custom positions custom-<slug> by Presidente/DG only, PROPOSED until approved. Written only by SECURITY DEFINER functions.';
alter table public.scd_position_catalog enable row level security;
revoke all on table public.scd_position_catalog from anon, authenticated;

-- Seed: every existing organisation gets every position, ACTIVE and empty. Existing rows are left as they are.
insert into public.scd_position_catalog (
  organization_id, code, label, group_code, role_kind, app_position, source, source_url, source_ref, evidence,
  requires_licence, mandatory_for_club, accepts_qualification, status, is_custom)
select o.id, x.code, x.label, x."group", x."roleKind", x."appPosition", x.source, x."sourceUrl", x."sourceRef", x.evidence,
       x."requiresLicence", x."mandatoryForClub", x."acceptsQualification", 'ACTIVE', false
from public.scd_organizations o
cross join jsonb_to_recordset($pos$
[
  {"code":"legale-rappresentante","label":"Legale rappresentante","group":"direzione","roleKind":"ORGANO_SOCIETARIO","appPosition":null,"source":"RASD","sourceUrl":"https://www.sport.governo.it/media/4260/decreto-e-regolamento-signed.pdf","sourceRef":"Regolamento RASD, all. dati A11","evidence":"VERIFIED","requiresLicence":false,"mandatoryForClub":true,"acceptsQualification":false},
  {"code":"delegato-rasd","label":"Delegato del legale rappresentante (RASD)","group":"direzione","roleKind":"ORGANO_SOCIETARIO","appPosition":null,"source":"RASD","sourceUrl":"https://www.sport.governo.it/media/4260/decreto-e-regolamento-signed.pdf","sourceRef":"Regolamento RASD, all. dati A12","evidence":"VERIFIED","requiresLicence":false,"mandatoryForClub":false,"acceptsQualification":false},
  {"code":"presidente","label":"Presidente","group":"direzione","roleKind":"ORGANO_SOCIETARIO","appPosition":"presidente","source":"RASD","sourceUrl":"https://www.sport.governo.it/media/4260/decreto-e-regolamento-signed.pdf","sourceRef":"Regolamento RASD, all. dati C2","evidence":"VERIFIED","requiresLicence":false,"mandatoryForClub":true,"acceptsQualification":false},
  {"code":"vice-presidente","label":"Vicepresidente","group":"direzione","roleKind":"ORGANO_SOCIETARIO","appPosition":null,"source":"RASD","sourceUrl":"https://www.sport.governo.it/media/4260/decreto-e-regolamento-signed.pdf","sourceRef":"Regolamento RASD, all. dati C2","evidence":"VERIFIED","requiresLicence":false,"mandatoryForClub":false,"acceptsQualification":false},
  {"code":"consigliere","label":"Consigliere (organo direttivo)","group":"direzione","roleKind":"ORGANO_SOCIETARIO","appPosition":"direzione","source":"RASD","sourceUrl":"https://www.sport.governo.it/media/4260/decreto-e-regolamento-signed.pdf","sourceRef":"Regolamento RASD, all. dati C1-C2","evidence":"VERIFIED","requiresLicence":false,"mandatoryForClub":true,"acceptsQualification":false},
  {"code":"commissario","label":"Commissario","group":"direzione","roleKind":"ORGANO_SOCIETARIO","appPosition":null,"source":"RASD","sourceUrl":"https://www.sport.governo.it/media/4260/decreto-e-regolamento-signed.pdf","sourceRef":"Regolamento RASD, all. dati C2","evidence":"VERIFIED","requiresLicence":false,"mandatoryForClub":false,"acceptsQualification":false},
  {"code":"amministratore-unico","label":"Amministratore unico","group":"direzione","roleKind":"ORGANO_SOCIETARIO","appPosition":null,"source":"RASD","sourceUrl":"https://www.sport.governo.it/media/4260/decreto-e-regolamento-signed.pdf","sourceRef":"Regolamento RASD, all. dati C2","evidence":"VERIFIED","requiresLicence":false,"mandatoryForClub":false,"acceptsQualification":false},
  {"code":"responsabile-rasd","label":"Responsabile (carica RASD)","group":"direzione","roleKind":"ORGANO_SOCIETARIO","appPosition":null,"source":"RASD","sourceUrl":"https://www.sport.governo.it/media/4260/decreto-e-regolamento-signed.pdf","sourceRef":"Regolamento RASD, all. dati C2","evidence":"VERIFIED","requiresLicence":false,"mandatoryForClub":false,"acceptsQualification":false},
  {"code":"proboviro","label":"Proboviro","group":"direzione","roleKind":"ORGANO_SOCIETARIO","appPosition":null,"source":"RASD","sourceUrl":"https://www.sport.governo.it/media/4260/decreto-e-regolamento-signed.pdf","sourceRef":"Regolamento RASD, all. dati C2","evidence":"VERIFIED","requiresLicence":false,"mandatoryForClub":false,"acceptsQualification":false},
  {"code":"revisore","label":"Revisore dei conti","group":"direzione","roleKind":"ORGANO_SOCIETARIO","appPosition":null,"source":"RASD","sourceUrl":"https://www.sport.governo.it/media/4260/decreto-e-regolamento-signed.pdf","sourceRef":"Regolamento RASD, all. dati C2","evidence":"VERIFIED","requiresLicence":false,"mandatoryForClub":false,"acceptsQualification":false},
  {"code":"segretario","label":"Segretario","group":"direzione","roleKind":"ORGANO_SOCIETARIO","appPosition":"segreteria","source":"LND","sourceUrl":"https://files.figc.it/view/acePublic/alias/contentid/1s5i1b2zydnpuhdxmyp/0/tit1_noif_art_da36a42_----------------aggiornato-al%20CU%20198A%20del%2027.04.2026.pdf","sourceRef":"NOIF art. 37 (generico)","evidence":"INFERRED","requiresLicence":false,"mandatoryForClub":false,"acceptsQualification":false},
  {"code":"tesoriere","label":"Tesoriere","group":"direzione","roleKind":"ORGANO_SOCIETARIO","appPosition":"tesoreria","source":"LND","sourceUrl":"https://files.figc.it/view/acePublic/alias/contentid/1s5i1b2zydnpuhdxmyp/0/tit1_noif_art_da36a42_----------------aggiornato-al%20CU%20198A%20del%2027.04.2026.pdf","sourceRef":"NOIF art. 37 (generico)","evidence":"INFERRED","requiresLicence":false,"mandatoryForClub":false,"acceptsQualification":false},
  {"code":"direttore-generale","label":"Direttore generale","group":"direzione","roleKind":"DIRIGENTE","appPosition":"direttore-generale","source":"LND","sourceUrl":"https://files.figc.it/view/acePublic/alias/contentid/1s5i1b2zydnpuhdxmyp/0/tit1_noif_art_da36a42_----------------aggiornato-al%20CU%20198A%20del%2027.04.2026.pdf","sourceRef":"NOIF art. 37 (generico)","evidence":"INFERRED","requiresLicence":false,"mandatoryForClub":false,"acceptsQualification":false},
  {"code":"dirigente","label":"Dirigente (generico)","group":"dirigenti","roleKind":"DIRIGENTE","appPosition":null,"source":"FIGC","sourceUrl":"https://files.figc.it/view/acePublic/alias/contentid/1s5i1b2zydnpuhdxmyp/0/tit1_noif_art_da36a42_----------------aggiornato-al%20CU%20198A%20del%2027.04.2026.pdf","sourceRef":"NOIF art. 36 c.1 lett. c, art. 37","evidence":"VERIFIED","requiresLicence":false,"mandatoryForClub":true,"acceptsQualification":false},
  {"code":"dirigente-accompagnatore","label":"Dirigente accompagnatore ufficiale","group":"dirigenti","roleKind":"DIRIGENTE","appPosition":"dirigente-annata","source":"FIGC","sourceUrl":"https://files.figc.it/view/acePublic/alias/contentid/1qzg5l96u12qfpnd689/0/tit3_noif_art_da47a70_------------aggiornato-al_CU209A_del_06-05-2026.pdf","sourceRef":"NOIF art. 61, art. 66 c.2bis lett. a, c.4","evidence":"VERIFIED","requiresLicence":false,"mandatoryForClub":true,"acceptsQualification":false},
  {"code":"dirigente-addetto-ufficiali-gara","label":"Dirigente addetto agli ufficiali di gara (addetto all'arbitro)","group":"dirigenti","roleKind":"DIRIGENTE","appPosition":null,"source":"FIGC","sourceUrl":"https://files.figc.it/view/acePublic/alias/contentid/1qzg5l96u12qfpnd689/0/tit3_noif_art_da47a70_------------aggiornato-al_CU209A_del_06-05-2026.pdf","sourceRef":"NOIF art. 61, art. 65 c.2, art. 66 c.2bis lett. g","evidence":"VERIFIED","requiresLicence":false,"mandatoryForClub":true,"acceptsQualification":false},
  {"code":"assistente-arbitro-parte","label":"Assistente dell'arbitro di parte (guardalinee di società)","group":"dirigenti","roleKind":"DIRIGENTE","appPosition":null,"source":"FIGC","sourceUrl":"https://files.figc.it/view/acePublic/alias/contentid/1qzg5l96u12qfpnd689/0/tit3_noif_art_da47a70_------------aggiornato-al_CU209A_del_06-05-2026.pdf","sourceRef":"NOIF art. 63 c.2-3","evidence":"VERIFIED","requiresLicence":false,"mandatoryForClub":true,"acceptsQualification":false},
  {"code":"dirigente-in-panchina","label":"Dirigente in panchina (campionati senza obbligo di allenatore abilitato)","group":"dirigenti","roleKind":"DIRIGENTE","appPosition":null,"source":"FIGC","sourceUrl":"https://files.figc.it/view/acePublic/alias/contentid/1qzg5l96u12qfpnd689/0/tit3_noif_art_da47a70_------------aggiornato-al_CU209A_del_06-05-2026.pdf","sourceRef":"NOIF art. 66 c.2bis lett. d","evidence":"VERIFIED","requiresLicence":false,"mandatoryForClub":false,"acceptsQualification":false},
  {"code":"direttore-sportivo","label":"Direttore sportivo","group":"dirigenti","roleKind":"DIRIGENTE","appPosition":null,"source":"FIGC","sourceUrl":"https://files.figc.it/view/acePublic/alias/contentid/1n9odtzu5wctv1955md/0/Regolamento-direttori-sportivi.pdf","sourceRef":"Regolamento Direttori Sportivi art. 1, 8","evidence":"VERIFIED","requiresLicence":true,"mandatoryForClub":false,"acceptsQualification":false},
  {"code":"collaboratore-gestione-sportiva","label":"Collaboratore della gestione sportiva","group":"dirigenti","roleKind":"DIRIGENTE","appPosition":null,"source":"FIGC","sourceUrl":"https://files.figc.it/view/acePublic/alias/contentid/1n9odtzu5wctv1955md/0/Regolamento-direttori-sportivi.pdf","sourceRef":"Regolamento Direttori Sportivi, norme transitorie I-III","evidence":"VERIFIED","requiresLicence":true,"mandatoryForClub":false,"acceptsQualification":false},
  {"code":"team-manager","label":"Team manager","group":"dirigenti","roleKind":"DIRIGENTE","appPosition":null,"source":"LND","sourceUrl":null,"sourceRef":null,"evidence":"INFERRED","requiresLicence":false,"mandatoryForClub":false,"acceptsQualification":false},
  {"code":"responsabile-prima-squadra","label":"Responsabile prima squadra","group":"dirigenti","roleKind":"DIRIGENTE","appPosition":null,"source":"LND","sourceUrl":null,"sourceRef":null,"evidence":"INFERRED","requiresLicence":false,"mandatoryForClub":false,"acceptsQualification":false},
  {"code":"coordinatore-attivita-sportiva","label":"Coordinatore attività sportiva","group":"dirigenti","roleKind":"RESPONSABILE","appPosition":"coordinatore-attivita-sportiva","source":"LND","sourceUrl":null,"sourceRef":null,"evidence":"INFERRED","requiresLicence":false,"mandatoryForClub":false,"acceptsQualification":false},
  {"code":"delegato-sicurezza","label":"Delegato alla sicurezza / responsabile ordine pubblico gara","group":"dirigenti","roleKind":"DIRIGENTE","appPosition":null,"source":"LND","sourceUrl":null,"sourceRef":null,"evidence":"INFERRED","requiresLicence":false,"mandatoryForClub":false,"acceptsQualification":false},
  {"code":"allenatore-responsabile","label":"Allenatore responsabile (tecnico responsabile della squadra)","group":"tecnici","roleKind":"MISTER","appPosition":"mister","source":"FIGC","sourceUrl":"https://files.figc.it/view/acePublic/alias/contentid/1qzg5l96u12qfpnd689/0/tit3_noif_art_da47a70_------------aggiornato-al_CU209A_del_06-05-2026.pdf","sourceRef":"NOIF art. 66 c.2bis lett. c; Reg. ST art. 16-24","evidence":"VERIFIED","requiresLicence":true,"mandatoryForClub":true,"acceptsQualification":true},
  {"code":"allenatore-in-seconda","label":"Allenatore in seconda","group":"tecnici","roleKind":"MISTER","appPosition":null,"source":"FIGC","sourceUrl":"https://files.figc.it/view/acePublic/alias/contentid/1qzg5l96u12qfpnd689/0/tit3_noif_art_da47a70_------------aggiornato-al_CU209A_del_06-05-2026.pdf","sourceRef":"NOIF art. 66 c.2bis lett. c","evidence":"VERIFIED","requiresLicence":true,"mandatoryForClub":false,"acceptsQualification":true},
  {"code":"preparatore-atletico","label":"Preparatore atletico","group":"tecnici","roleKind":"STAFF","appPosition":null,"source":"FIGC","sourceUrl":"https://www.figc.it/media/255310/parte2_settore_tecnico_art_16a40__________agg-26-11-2024.pdf","sourceRef":"Reg. ST art. 16, art. 29; NOIF art. 66 c.2ter","evidence":"VERIFIED","requiresLicence":true,"mandatoryForClub":false,"acceptsQualification":false},
  {"code":"collaboratore-tecnico","label":"Collaboratore tecnico / assistente allenatore","group":"tecnici","roleKind":"MISTER","appPosition":null,"source":"SGS","sourceUrl":"https://piemontevda.lnd.it/wp-content/uploads/2026/08/CU-18-SGS.pdf","sourceRef":"CU 18 SGS 2026, App. III","evidence":"VERIFIED","requiresLicence":false,"mandatoryForClub":false,"acceptsQualification":true},
  {"code":"match-analyst","label":"Match analyst","group":"tecnici","roleKind":"STAFF","appPosition":null,"source":"SGS","sourceUrl":"https://piemontevda.lnd.it/wp-content/uploads/2026/08/CU-18-SGS.pdf","sourceRef":"CU 18 SGS 2026, criteri organizzativi","evidence":"VERIFIED","requiresLicence":true,"mandatoryForClub":false,"acceptsQualification":false},
  {"code":"osservatore","label":"Osservatore / responsabile scouting","group":"tecnici","roleKind":"STAFF","appPosition":null,"source":"SGS","sourceUrl":"https://piemontevda.lnd.it/wp-content/uploads/2026/08/CU-18-SGS.pdf","sourceRef":"CU 18 SGS 2026; Reg. DS art. 8","evidence":"VERIFIED","requiresLicence":true,"mandatoryForClub":false,"acceptsQualification":false},
  {"code":"preparatore-motorio","label":"Preparatore motorio (Esordienti/Pulcini)","group":"tecnici","roleKind":"STAFF","appPosition":null,"source":"SGS","sourceUrl":"https://piemontevda.lnd.it/wp-content/uploads/2026/08/CU-18-SGS.pdf","sourceRef":"CU 18 SGS 2026, Preparatori atletici SG","evidence":"VERIFIED","requiresLicence":true,"mandatoryForClub":false,"acceptsQualification":false},
  {"code":"medico-sociale","label":"Medico sociale","group":"sanitari","roleKind":"STAFF","appPosition":null,"source":"FIGC","sourceUrl":"https://www.figc.it/media/255310/parte2_settore_tecnico_art_16a40__________agg-26-11-2024.pdf","sourceRef":"Reg. ST art. 31; NOIF art. 66 c.2, c.2bis lett. b","evidence":"VERIFIED","requiresLicence":true,"mandatoryForClub":false,"acceptsQualification":false},
  {"code":"operatore-sanitario","label":"Operatore sanitario ausiliario (fisioterapista/massaggiatore)","group":"sanitari","roleKind":"STAFF","appPosition":null,"source":"FIGC","sourceUrl":"https://www.figc.it/media/255310/parte2_settore_tecnico_art_16a40__________agg-26-11-2024.pdf","sourceRef":"Reg. ST art. 31 c.5; NOIF art. 66 c.2bis lett. e","evidence":"VERIFIED","requiresLicence":true,"mandatoryForClub":false,"acceptsQualification":false},
  {"code":"responsabile-sanitario","label":"Responsabile sanitario","group":"sanitari","roleKind":"STAFF","appPosition":null,"source":"SGS","sourceUrl":"https://piemontevda.lnd.it/wp-content/uploads/2026/08/CU-18-SGS.pdf","sourceRef":"Reg. ST art. 31; CU 18 SGS 2026","evidence":"VERIFIED","requiresLicence":true,"mandatoryForClub":false,"acceptsQualification":false},
  {"code":"medico-settore-giovanile","label":"Medico del Settore Giovanile (medico di riferimento)","group":"sanitari","roleKind":"STAFF","appPosition":null,"source":"SGS","sourceUrl":"https://piemontevda.lnd.it/wp-content/uploads/2026/08/CU-18-SGS.pdf","sourceRef":"CU 18 SGS 2026","evidence":"VERIFIED","requiresLicence":false,"mandatoryForClub":true,"acceptsQualification":false},
  {"code":"psicologo","label":"Psicologo/a","group":"sanitari","roleKind":"STAFF","appPosition":null,"source":"SGS","sourceUrl":"https://piemontevda.lnd.it/wp-content/uploads/2026/08/CU-18-SGS.pdf","sourceRef":"CU 18 SGS 2026","evidence":"VERIFIED","requiresLicence":true,"mandatoryForClub":false,"acceptsQualification":false},
  {"code":"addetto-defibrillatore-blsd","label":"Addetto DAE / BLSD","group":"sanitari","roleKind":"STAFF","appPosition":null,"source":"SGS","sourceUrl":"https://piemontevda.lnd.it/wp-content/uploads/2026/08/CU-18-SGS.pdf","sourceRef":"CU 18 SGS 2026, App. II","evidence":"VERIFIED","requiresLicence":true,"mandatoryForClub":true,"acceptsQualification":false},
  {"code":"responsabile-settore-giovanile","label":"Responsabile Settore Giovanile","group":"sgs","roleKind":"RESPONSABILE","appPosition":null,"source":"SGS","sourceUrl":"https://piemontevda.lnd.it/wp-content/uploads/2026/08/CU-18-SGS.pdf","sourceRef":"CU 18 SGS 2026, criteri organizzativi / App. III","evidence":"VERIFIED","requiresLicence":true,"mandatoryForClub":true,"acceptsQualification":true},
  {"code":"dirigente-responsabile-settore-giovanile","label":"Dirigente responsabile Settore Giovanile","group":"sgs","roleKind":"RESPONSABILE","appPosition":null,"source":"SGS","sourceUrl":"https://piemontevda.lnd.it/wp-content/uploads/2026/08/CU-18-SGS.pdf","sourceRef":"CU 18 SGS 2026, criteri organizzativi / App. III","evidence":"VERIFIED","requiresLicence":false,"mandatoryForClub":true,"acceptsQualification":false},
  {"code":"responsabile-tecnico-settore-giovanile","label":"Responsabile tecnico Settore Giovanile","group":"sgs","roleKind":"RESPONSABILE","appPosition":null,"source":"SGS","sourceUrl":"https://piemontevda.lnd.it/wp-content/uploads/2026/08/CU-18-SGS.pdf","sourceRef":"CU 18 SGS 2026, criteri organizzativi / App. III","evidence":"VERIFIED","requiresLicence":false,"mandatoryForClub":false,"acceptsQualification":true},
  {"code":"responsabile-organizzativo-settore-giovanile","label":"Responsabile organizzativo Settore Giovanile","group":"sgs","roleKind":"RESPONSABILE","appPosition":null,"source":"SGS","sourceUrl":"https://piemontevda.lnd.it/wp-content/uploads/2026/08/CU-18-SGS.pdf","sourceRef":"CU 18 SGS 2026, criteri organizzativi / App. III","evidence":"VERIFIED","requiresLicence":false,"mandatoryForClub":true,"acceptsQualification":false},
  {"code":"segretario-settore-giovanile","label":"Segretario/a generale/sportivo/a Settore Giovanile","group":"sgs","roleKind":"STAFF","appPosition":null,"source":"SGS","sourceUrl":"https://piemontevda.lnd.it/wp-content/uploads/2026/08/CU-18-SGS.pdf","sourceRef":"CU 18 SGS 2026, criteri organizzativi / App. III","evidence":"VERIFIED","requiresLicence":false,"mandatoryForClub":true,"acceptsQualification":false},
  {"code":"referente-sistema-qualita","label":"Referente Sistema di Qualita' Club Giovanili SGS","group":"sgs","roleKind":"RESPONSABILE","appPosition":null,"source":"SGS","sourceUrl":"https://piemontevda.lnd.it/wp-content/uploads/2026/08/CU-18-SGS.pdf","sourceRef":"CU 18 SGS 2026, criteri organizzativi / App. III","evidence":"VERIFIED","requiresLicence":false,"mandatoryForClub":true,"acceptsQualification":false},
  {"code":"referente-club-affiliati","label":"Referente Progetto Club Affiliati","group":"sgs","roleKind":"RESPONSABILE","appPosition":null,"source":"SGS","sourceUrl":"https://piemontevda.lnd.it/wp-content/uploads/2026/08/CU-18-SGS.pdf","sourceRef":"CU 18 SGS 2026, criteri organizzativi / App. III","evidence":"VERIFIED","requiresLicence":false,"mandatoryForClub":false,"acceptsQualification":false},
  {"code":"responsabile-attivita-di-base","label":"Responsabile (tecnico) Attivita' di Base","group":"sgs","roleKind":"RESPONSABILE","appPosition":"responsabile-attivita-base","source":"SGS","sourceUrl":"https://piemontevda.lnd.it/wp-content/uploads/2026/08/CU-18-SGS.pdf","sourceRef":"CU 18 SGS 2026, criteri organizzativi / App. III","evidence":"VERIFIED","requiresLicence":true,"mandatoryForClub":false,"acceptsQualification":true},
  {"code":"dirigente-responsabile-attivita-di-base","label":"Dirigente responsabile / Responsabile organizzativo Attivita' di Base","group":"sgs","roleKind":"RESPONSABILE","appPosition":null,"source":"SGS","sourceUrl":"https://piemontevda.lnd.it/wp-content/uploads/2026/08/CU-18-SGS.pdf","sourceRef":"CU 18 SGS 2026, criteri organizzativi / App. III","evidence":"VERIFIED","requiresLicence":false,"mandatoryForClub":false,"acceptsQualification":false},
  {"code":"segretario-attivita-di-base","label":"Segretario/a Attivita' di Base","group":"sgs","roleKind":"STAFF","appPosition":null,"source":"SGS","sourceUrl":"https://piemontevda.lnd.it/wp-content/uploads/2026/08/CU-18-SGS.pdf","sourceRef":"CU 18 SGS 2026, criteri organizzativi / App. III","evidence":"VERIFIED","requiresLicence":false,"mandatoryForClub":false,"acceptsQualification":false},
  {"code":"allenatore-settore-giovanile","label":"Allenatore/istruttore di squadra giovanile o scuola calcio","group":"sgs","roleKind":"MISTER","appPosition":null,"source":"SGS","sourceUrl":"https://piemontevda.lnd.it/wp-content/uploads/2026/08/CU-18-SGS.pdf","sourceRef":"CU 18 SGS 2026, criteri organizzativi / App. III","evidence":"VERIFIED","requiresLicence":true,"mandatoryForClub":true,"acceptsQualification":true},
  {"code":"responsabile-formazione-interna","label":"Responsabile formazione interna","group":"sgs","roleKind":"RESPONSABILE","appPosition":null,"source":"SGS","sourceUrl":"https://piemontevda.lnd.it/wp-content/uploads/2026/08/CU-18-SGS.pdf","sourceRef":"CU 18 SGS 2026, criteri organizzativi / App. III","evidence":"VERIFIED","requiresLicence":false,"mandatoryForClub":false,"acceptsQualification":false},
  {"code":"coordinatore-attivita-educative","label":"Coordinatore attivita' educative / tutor","group":"sgs","roleKind":"RESPONSABILE","appPosition":null,"source":"SGS","sourceUrl":"https://piemontevda.lnd.it/wp-content/uploads/2026/08/CU-18-SGS.pdf","sourceRef":"CU 18 SGS 2026, criteri organizzativi / App. III","evidence":"VERIFIED","requiresLicence":false,"mandatoryForClub":false,"acceptsQualification":false},
  {"code":"tutor-insegnante","label":"Tutor / insegnante","group":"sgs","roleKind":"STAFF","appPosition":null,"source":"SGS","sourceUrl":"https://piemontevda.lnd.it/wp-content/uploads/2026/08/CU-18-SGS.pdf","sourceRef":"CU 18 SGS 2026, criteri organizzativi / App. III","evidence":"VERIFIED","requiresLicence":false,"mandatoryForClub":false,"acceptsQualification":false},
  {"code":"referente-inclusione","label":"Referente inclusione / diversity officer","group":"sgs","roleKind":"RESPONSABILE","appPosition":null,"source":"SGS","sourceUrl":"https://piemontevda.lnd.it/wp-content/uploads/2026/08/CU-18-SGS.pdf","sourceRef":"CU 18 SGS 2026, criteri organizzativi / App. III","evidence":"VERIFIED","requiresLicence":false,"mandatoryForClub":false,"acceptsQualification":false},
  {"code":"referente-progetti-territorio","label":"Referente progetti nel territorio","group":"sgs","roleKind":"RESPONSABILE","appPosition":null,"source":"SGS","sourceUrl":"https://piemontevda.lnd.it/wp-content/uploads/2026/08/CU-18-SGS.pdf","sourceRef":"CU 18 SGS 2026, criteri organizzativi / App. III","evidence":"VERIFIED","requiresLicence":false,"mandatoryForClub":false,"acceptsQualification":false},
  {"code":"responsabile-attivita-promozionali","label":"Responsabile attivita' promozionali","group":"sgs","roleKind":"RESPONSABILE","appPosition":null,"source":"SGS","sourceUrl":"https://piemontevda.lnd.it/wp-content/uploads/2026/08/CU-18-SGS.pdf","sourceRef":"CU 18 SGS 2026, criteri organizzativi / App. III","evidence":"VERIFIED","requiresLicence":false,"mandatoryForClub":false,"acceptsQualification":false},
  {"code":"responsabile-gestionale-impianto","label":"Responsabile gestionale dell'impianto","group":"sgs","roleKind":"RESPONSABILE","appPosition":"responsabile-struttura","source":"SGS","sourceUrl":"https://piemontevda.lnd.it/wp-content/uploads/2026/08/CU-18-SGS.pdf","sourceRef":"CU 18 SGS 2026, criteri organizzativi / App. III","evidence":"VERIFIED","requiresLicence":false,"mandatoryForClub":true,"acceptsQualification":false},
  {"code":"responsabile-safeguarding","label":"Responsabile contro abusi, violenze e discriminazioni (safeguarding)","group":"safeguarding","roleKind":"RESPONSABILE","appPosition":null,"source":"FIGC","sourceUrl":"https://www.figc.it/media/256277/regolamento-safeguarding-figc-aggiornato-al-10-dicembre-2024.pdf","sourceRef":"Regolamento Safeguarding FIGC art. 10 c.7, art. 11","evidence":"VERIFIED","requiresLicence":false,"mandatoryForClub":true,"acceptsQualification":false},
  {"code":"delegato-tutela-minori","label":"Delegato/a Tutela e Benessere dei Minori","group":"safeguarding","roleKind":"RESPONSABILE","appPosition":null,"source":"SGS","sourceUrl":"https://piemontevda.lnd.it/wp-content/uploads/2026/08/CU-18-SGS.pdf","sourceRef":"CU 18 SGS 2026","evidence":"VERIFIED","requiresLicence":true,"mandatoryForClub":false,"acceptsQualification":false},
  {"code":"addetto-stampa","label":"Addetto stampa / comunicazione","group":"comunicazione","roleKind":"STAFF","appPosition":null,"source":"LND","sourceUrl":null,"sourceRef":null,"evidence":"INFERRED","requiresLicence":false,"mandatoryForClub":false,"acceptsQualification":false},
  {"code":"social-media-fotografo","label":"Social media manager / fotografo","group":"comunicazione","roleKind":"STAFF","appPosition":null,"source":"LND","sourceUrl":"https://files.figc.it/view/acePublic/alias/contentid/1qzg5l96u12qfpnd689/0/tit3_noif_art_da47a70_------------aggiornato-al_CU209A_del_06-05-2026.pdf","sourceRef":"NOIF art. 66 c.2quater (parziale)","evidence":"INFERRED","requiresLicence":false,"mandatoryForClub":false,"acceptsQualification":false},
  {"code":"speaker","label":"Speaker","group":"comunicazione","roleKind":"STAFF","appPosition":null,"source":"LND","sourceUrl":null,"sourceRef":null,"evidence":"INFERRED","requiresLicence":false,"mandatoryForClub":false,"acceptsQualification":false},
  {"code":"magazziniere","label":"Magazziniere / addetto materiali","group":"operativi","roleKind":"STAFF","appPosition":"collaboratore-magazzino","source":"LND","sourceUrl":null,"sourceRef":null,"evidence":"INFERRED","requiresLicence":false,"mandatoryForClub":false,"acceptsQualification":false},
  {"code":"autista-pulmino","label":"Autista pulmino","group":"operativi","roleKind":"AUTISTA","appPosition":"autista","source":"LND","sourceUrl":null,"sourceRef":null,"evidence":"INFERRED","requiresLicence":false,"mandatoryForClub":false,"acceptsQualification":false},
  {"code":"volontario","label":"Volontario","group":"operativi","roleKind":"STAFF","appPosition":null,"source":"DLGS36","sourceUrl":"https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2021-02-28;36","sourceRef":"D.Lgs 36/2021 art. 29 (non letto in sessione)","evidence":"INFERRED","requiresLicence":false,"mandatoryForClub":false,"acceptsQualification":false},
  {"code":"addetto-pulizie","label":"Addetto pulizie impianto","group":"operativi","roleKind":"STAFF","appPosition":null,"source":"SGS","sourceUrl":"https://piemontevda.lnd.it/wp-content/uploads/2026/08/CU-18-SGS.pdf","sourceRef":"CU 18 SGS 2026, App. II","evidence":"INFERRED","requiresLicence":false,"mandatoryForClub":false,"acceptsQualification":false},
  {"code":"raccattapalle-barelliere","label":"Raccattapalle / barelliere","group":"operativi","roleKind":"STAFF","appPosition":null,"source":"FIGC","sourceUrl":"https://files.figc.it/view/acePublic/alias/contentid/1qzg5l96u12qfpnd689/0/tit3_noif_art_da47a70_------------aggiornato-al_CU209A_del_06-05-2026.pdf","sourceRef":"NOIF art. 66 c.2quater","evidence":"VERIFIED","requiresLicence":false,"mandatoryForClub":false,"acceptsQualification":false},
  {"code":"direttore-sportivo-agonistica","label":"Direttore sportivo agonistica","group":"dirigenti","roleKind":"DIRIGENTE","appPosition":"direttore-sportivo-agonistica","source":"CLUB","sourceUrl":null,"sourceRef":"Decisione della Direzione 16/10/2026","evidence":"VERIFIED","requiresLicence":false,"mandatoryForClub":false,"acceptsQualification":false},
  {"code":"direttore-sportivo-generale","label":"Direttore sportivo generale","group":"dirigenti","roleKind":"DIRIGENTE","appPosition":"direttore-sportivo-generale","source":"CLUB","sourceUrl":null,"sourceRef":"Decisione della Direzione 16/10/2026","evidence":"VERIFIED","requiresLicence":false,"mandatoryForClub":false,"acceptsQualification":false},
  {"code":"responsabile-trasporti","label":"Responsabile trasporti (pulmini)","group":"servizi","roleKind":"RESPONSABILE","appPosition":"responsabile-trasporti","source":"CLUB","sourceUrl":null,"sourceRef":"Ruolo già in uso nel club","evidence":"VERIFIED","requiresLicence":false,"mandatoryForClub":false,"acceptsQualification":false},
  {"code":"responsabile-campi","label":"Responsabile campi e impianti","group":"servizi","roleKind":"RESPONSABILE","appPosition":"responsabile-campi","source":"CLUB","sourceUrl":null,"sourceRef":"Ruolo già in uso nel club","evidence":"VERIFIED","requiresLicence":false,"mandatoryForClub":false,"acceptsQualification":false},
  {"code":"responsabile-struttura-colico","label":"Responsabile struttura Colico","group":"servizi","roleKind":"RESPONSABILE","appPosition":"responsabile-struttura-colico","source":"CLUB","sourceUrl":null,"sourceRef":"Ruolo già in uso nel club","evidence":"VERIFIED","requiresLicence":false,"mandatoryForClub":false,"acceptsQualification":false},
  {"code":"responsabile-struttura-dervio","label":"Responsabile struttura Dervio","group":"servizi","roleKind":"RESPONSABILE","appPosition":"responsabile-struttura-dervio","source":"CLUB","sourceUrl":null,"sourceRef":"Ruolo già in uso nel club","evidence":"VERIFIED","requiresLicence":false,"mandatoryForClub":false,"acceptsQualification":false},
  {"code":"responsabile-club-house","label":"Responsabile Club House","group":"servizi","roleKind":"RESPONSABILE","appPosition":"responsabile-club-house","source":"CLUB","sourceUrl":null,"sourceRef":"Ruolo già in uso nel club","evidence":"VERIFIED","requiresLicence":false,"mandatoryForClub":false,"acceptsQualification":false},
  {"code":"addetto-biglietteria","label":"Addetto biglietteria","group":"servizi","roleKind":"STAFF","appPosition":"addetto-biglietteria","source":"CLUB","sourceUrl":null,"sourceRef":"Ruolo già in uso nel club","evidence":"VERIFIED","requiresLicence":false,"mandatoryForClub":false,"acceptsQualification":false},
  {"code":"responsabile-magazzino","label":"Responsabile magazzino","group":"servizi","roleKind":"RESPONSABILE","appPosition":"responsabile-magazzino","source":"CLUB","sourceUrl":null,"sourceRef":"Ruolo già in uso nel club","evidence":"VERIFIED","requiresLicence":false,"mandatoryForClub":false,"acceptsQualification":false},
  {"code":"responsabile-tornei","label":"Responsabile tornei","group":"servizi","roleKind":"RESPONSABILE","appPosition":"responsabile-tornei","source":"CLUB","sourceUrl":null,"sourceRef":"Ruolo già in uso nel club","evidence":"VERIFIED","requiresLicence":false,"mandatoryForClub":false,"acceptsQualification":false},
  {"code":"responsabile-lavanderia","label":"Responsabile lavanderia","group":"servizi","roleKind":"RESPONSABILE","appPosition":"responsabile-lavanderia","source":"CLUB","sourceUrl":null,"sourceRef":"Ruolo già in uso nel club","evidence":"VERIFIED","requiresLicence":false,"mandatoryForClub":false,"acceptsQualification":false},
  {"code":"collaboratore-lavanderia-pulizia","label":"Collaboratore lavanderia e pulizia","group":"servizi","roleKind":"STAFF","appPosition":"collaboratore-lavanderia-pulizia","source":"CLUB","sourceUrl":null,"sourceRef":"Ruolo già in uso nel club","evidence":"VERIFIED","requiresLicence":false,"mandatoryForClub":false,"acceptsQualification":false},
  {"code":"segreteria-presenza","label":"Segreteria in presenza","group":"servizi","roleKind":"STAFF","appPosition":"segreteria-presenza","source":"CLUB","sourceUrl":null,"sourceRef":"Ruolo già in uso nel club","evidence":"VERIFIED","requiresLicence":false,"mandatoryForClub":false,"acceptsQualification":false},
  {"code":"segreteria-remoto","label":"Segreteria da remoto","group":"servizi","roleKind":"STAFF","appPosition":"segreteria-remoto","source":"CLUB","sourceUrl":null,"sourceRef":"Ruolo già in uso nel club","evidence":"VERIFIED","requiresLicence":false,"mandatoryForClub":false,"acceptsQualification":false},
  {"code":"responsabile-infermeria","label":"Responsabile infermeria","group":"sanitari","roleKind":"RESPONSABILE","appPosition":"responsabile-infermeria","source":"CLUB","sourceUrl":null,"sourceRef":"Ruolo già in uso nel club","evidence":"VERIFIED","requiresLicence":false,"mandatoryForClub":false,"acceptsQualification":false},
  {"code":"nutrizionista","label":"Nutrizionista","group":"sanitari","roleKind":"STAFF","appPosition":"nutrizionista","source":"CLUB","sourceUrl":null,"sourceRef":"Ruolo già in uso nel club","evidence":"VERIFIED","requiresLicence":false,"mandatoryForClub":false,"acceptsQualification":false},
  {"code":"moderatore","label":"Moderatore contenuti","group":"comunicazione","roleKind":"STAFF","appPosition":"moderatore","source":"CLUB","sourceUrl":null,"sourceRef":"Ruolo già in uso nel club","evidence":"VERIFIED","requiresLicence":false,"mandatoryForClub":false,"acceptsQualification":false},
  {"code":"dirigente-collaboratore","label":"Dirigente collaboratore","group":"dirigenti","roleKind":"DIRIGENTE","appPosition":"dirigente-collaboratore","source":"CLUB","sourceUrl":null,"sourceRef":"Ruolo già in uso nel club","evidence":"VERIFIED","requiresLicence":false,"mandatoryForClub":false,"acceptsQualification":false}
]
$pos$::jsonb) as x(code text, label text, "group" text, "roleKind" text, "appPosition" text, source text, "sourceUrl" text,
                          "sourceRef" text, evidence text, "requiresLicence" boolean, "mandatoryForClub" boolean,
                          "acceptsQualification" boolean)
on conflict (organization_id, code) do nothing;

-- ---------------------------------------------------------------- 5. who holds a position: the existing registry
alter table public.scd_structure_roles add column if not exists position_code text;
alter table public.scd_structure_roles add column if not exists qualification_code text
  references public.scd_coach_qualifications(code);
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'scd_structure_roles_position_fk') then
    alter table public.scd_structure_roles add constraint scd_structure_roles_position_fk
      foreign key (organization_id, position_code) references public.scd_position_catalog (organization_id, code);
  end if;
end;
$$;
create index if not exists scd_structure_roles_position_idx
  on public.scd_structure_roles (organization_id, position_code) where position_code is not null;

-- A new or changed position must be ACTIVE (a custom position waits for the Direzione); a qualification only on a
-- position that accepts it. Rows without position_code are untouched (the club keeps writing them as today).
create or replace function public.scd_structure_roles_position_check()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_status text;
  v_accepts boolean;
begin
  if new.position_code is null then
    if new.qualification_code is not null then
      raise exception 'qualification needs a position' using errcode = '22023';
    end if;
    return new;
  end if;
  select c.status, c.accepts_qualification into v_status, v_accepts
  from public.scd_position_catalog c
  where c.organization_id = new.organization_id and c.code = new.position_code;
  if not found then raise exception 'unknown position' using errcode = '22023'; end if;
  if (tg_op = 'INSERT' or new.position_code is distinct from old.position_code
      or new.organization_id is distinct from old.organization_id) and v_status <> 'ACTIVE' then
    raise exception 'position not active' using errcode = '22023';
  end if;
  if new.qualification_code is not null and not v_accepts then
    raise exception 'position takes no qualification' using errcode = '22023';
  end if;
  return new;
end;
$$;
drop trigger if exists scd_structure_roles_position_check on public.scd_structure_roles;
create trigger scd_structure_roles_position_check
  before insert or update of position_code, qualification_code, organization_id on public.scd_structure_roles
  for each row execute function public.scd_structure_roles_position_check();

-- ---------------------------------------------------------------- 6. who reads the catalogue (organigram area)
create or replace function public.scd_position_catalog_reader(p_organization_id uuid)
returns boolean
language sql
stable
set search_path to 'public'
as $$
  select (select auth.uid()) is not null and (
    public.scd_has_org_role(p_organization_id, array['DIRECTION','SECRETARIAT','REGISTRATION']::public.scd_role[])
    or public.scd_has_position(p_organization_id, array['presidente','direttore-generale','responsabile-attivita-base','coordinatore-attivita-sportiva']));
$$;

-- Catalogue with the number of current holders per position (counts only, never names).
create or replace function public.scd_position_catalog_board(p_organization_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
begin
  if not public.scd_position_catalog_reader(p_organization_id) then
    raise exception 'catalogue: organigram readers only' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'canCreate', public.scd_is_role_creator(p_organization_id),
    'positions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'code', c.code, 'label', c.label, 'group', c.group_code, 'roleKind', c.role_kind,
        'appPosition', c.app_position, 'source', c.source, 'sourceUrl', c.source_url, 'sourceRef', c.source_ref,
        'evidence', c.evidence, 'requiresLicence', c.requires_licence, 'mandatoryForClub', c.mandatory_for_club,
        'acceptsQualification', c.accepts_qualification, 'status', c.status, 'isCustom', c.is_custom,
        'description', c.description,
        'holders', (select count(*) from public.scd_structure_roles r
                    where r.organization_id = c.organization_id and r.position_code = c.code and r.active
                      and (r.valid_to is null or r.valid_to >= current_date)))
        order by c.group_code, c.is_custom, c.label)
      from public.scd_position_catalog c
      where c.organization_id = p_organization_id), '[]'::jsonb));
end;
$$;

-- ---------------------------------------------------------------- 7. custom positions (Presidente / DG only)
-- "Allenatore Portieri U12" -> "allenatore-portieri-u12" (accents folded, at most 50 characters).
create or replace function public.scd_position_slug(p_label text)
returns text
language sql
immutable
set search_path to 'public'
as $$
  select left(btrim(regexp_replace(
           translate(lower(btrim(coalesce(p_label, ''))), 'àáâäèéêëìíîïòóôöùúûüç''’', 'aaaaeeeeiiiioooouuuuc  '),
           '[^a-z0-9]+', '-', 'g'), '-'), 50);
$$;

-- Labels are names of a job: no e-mail address, no phone number.
create or replace function public.scd_position_label_ok(p_label text)
returns boolean
language sql
immutable
set search_path to 'public'
as $$
  select char_length(coalesce(p_label, '')) between 3 and 80
    and p_label !~ '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+'
    and p_label !~ '(\+|00)?[0-9]([ ./-]?[0-9]){8,}';
$$;

create or replace function public.scd_create_custom_position(
  p_organization_id uuid, p_label text, p_group text, p_role_kind text, p_description text
)
returns text
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v_label text := regexp_replace(btrim(coalesce(p_label, '')), '\s+', ' ', 'g');
  v_desc text := left(btrim(coalesce(p_description, '')), 300);
  v_slug text;
  v_code text;
begin
  if not public.scd_is_role_creator(p_organization_id) then
    raise exception 'positions: Presidente or Direttore Generale only' using errcode = '42501';
  end if;
  if not public.scd_position_label_ok(v_label) then raise exception 'label not valid' using errcode = '22023'; end if;
  if v_desc <> '' and not (v_desc !~ '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+' and v_desc !~ '(\+|00)?[0-9]([ ./-]?[0-9]){8,}') then
    raise exception 'description not valid' using errcode = '22023';
  end if;
  if p_group is null or p_group not in ('direzione','dirigenti','tecnici','sgs','sanitari','safeguarding','comunicazione','servizi','operativi') then
    raise exception 'unknown group' using errcode = '22023';
  end if;
  if p_role_kind is null or p_role_kind not in ('DIRIGENTE','MISTER','AUTISTA','RESPONSABILE','STAFF','ORGANO_SOCIETARIO') then
    raise exception 'unknown role kind' using errcode = '22023';
  end if;
  v_slug := public.scd_position_slug(v_label);
  if char_length(v_slug) < 2 then raise exception 'label not valid' using errcode = '22023'; end if;
  v_code := 'custom-' || v_slug;
  if exists (select 1 from public.scd_position_catalog
             where organization_id = p_organization_id
               and (code = v_code or lower(regexp_replace(btrim(label), '\s+', ' ', 'g')) = lower(v_label))) then
    raise exception 'position already exists' using errcode = '23505';
  end if;
  insert into public.scd_position_catalog (
    organization_id, code, label, group_code, role_kind, app_position, source, evidence, status, is_custom,
    description, created_by, updated_by)
  values (p_organization_id, v_code, v_label, p_group, p_role_kind, null, 'CUSTOM', 'PROPOSED', 'PROPOSED', true,
    v_desc, (select auth.uid()), (select auth.uid()));
  insert into public.scd_access_audit (organization_id, actor_user_id, action, detail)
  values (p_organization_id, (select auth.uid()), 'CREATE_POSITION', jsonb_build_object(
    'code', v_code, 'label', v_label, 'group', p_group, 'roleKind', p_role_kind, 'status', 'PROPOSED'));
  return v_code;
end;
$$;

-- Approve (PROPOSED -> ACTIVE), reject (PROPOSED -> RETIRED), retire (ACTIVE -> RETIRED) or reactivate
-- (RETIRED -> ACTIVE). Nothing goes back to PROPOSED. Positions with current holders are never retired.
-- Returns false when the status is already the requested one.
create or replace function public.scd_set_position_status(
  p_organization_id uuid, p_code text, p_status text, p_note text
)
returns boolean
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v_row public.scd_position_catalog%rowtype;
begin
  if not public.scd_is_role_creator(p_organization_id) then
    raise exception 'positions: Presidente or Direttore Generale only' using errcode = '42501';
  end if;
  if p_status is null or p_status not in ('ACTIVE','RETIRED') then
    raise exception 'status not valid' using errcode = '22023';
  end if;
  select * into v_row from public.scd_position_catalog
  where organization_id = p_organization_id and code = p_code for update;
  if not found then raise exception 'position not found' using errcode = 'P0002'; end if;
  if v_row.status = p_status then return false; end if;
  if p_status = 'RETIRED' and exists (
       select 1 from public.scd_structure_roles r
       where r.organization_id = p_organization_id and r.position_code = p_code and r.active
         and (r.valid_to is null or r.valid_to >= current_date)) then
    raise exception 'position has holders' using errcode = '22023';
  end if;
  update public.scd_position_catalog
  set status = p_status,
      updated_by = (select auth.uid()), updated_at = now(),
      approved_by = case when v_row.status = 'PROPOSED' and p_status = 'ACTIVE' then (select auth.uid()) else approved_by end,
      approved_at = case when v_row.status = 'PROPOSED' and p_status = 'ACTIVE' then now() else approved_at end
  where organization_id = p_organization_id and code = p_code;
  insert into public.scd_access_audit (organization_id, actor_user_id, action, detail)
  values (p_organization_id, (select auth.uid()), 'POSITION_STATUS', jsonb_build_object(
    'code', p_code, 'label', v_row.label, 'from', v_row.status, 'to', p_status,
    'note', left(btrim(coalesce(p_note, '')), 300)));
  return true;
end;
$$;

-- ---------------------------------------------------------------- 8. direttori sportivi (Francesco 16/10/2026 13:32)
-- 8a. Assignable positions: scd_access_admin_guard recreated IDENTICAL to r136 except the two appended positions.
create or replace function public.scd_access_admin_guard(
  p_organization_id uuid, p_target_user uuid, p_new_role public.scd_role, p_new_positions text[]
)
returns public.scd_role
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_actor public.scd_role;
  v_target public.scd_role;
  office_roles text[] := array['DIRECTION','SECRETARIAT','REGISTRATION','TOURNAMENTS'];
  office_pos text[] := array['direzione','presidente','direttore-generale','dirigenza','segreteria','tesoreria'];
  assignable text[] := array['direzione','presidente','direttore-generale','dirigenza','responsabile-attivita-base',
    'coordinatore-attivita-sportiva','dirigente-annata','mister','responsabile-trasporti','autista','responsabile-club-house',
    'addetto-biglietteria','responsabile-magazzino','responsabile-campi','segreteria','partner',
    'tesoreria','segreteria-presenza','segreteria-remoto','responsabile-tornei','responsabile-struttura','responsabile-struttura-colico',
    'responsabile-struttura-dervio','responsabile-lavanderia','collaboratore-lavanderia-pulizia','responsabile-infermeria','collaboratore-magazzino',
    'dirigente-collaboratore','moderatore','nutrizionista',
    'direttore-sportivo-agonistica','direttore-sportivo-generale'];
  p text;
begin
  select role into v_actor from public.scd_memberships
  where organization_id = p_organization_id and user_id = (select auth.uid()) and active;
  if v_actor is null or v_actor not in ('DIRECTION','SECRETARIAT') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_target_user is not null and p_target_user = (select auth.uid()) then
    raise exception 'cannot edit own access' using errcode = '42501';
  end if;
  if p_target_user is not null then
    select role into v_target from public.scd_memberships where organization_id = p_organization_id and user_id = p_target_user;
    if v_actor <> 'DIRECTION' and v_target::text = any(office_roles) then
      raise exception 'office account: Direzione only' using errcode = '42501';
    end if;
  end if;
  if p_new_role is not null and v_actor <> 'DIRECTION' and p_new_role::text = any(office_roles) then
    raise exception 'office role: Direzione only' using errcode = '42501';
  end if;
  foreach p in array coalesce(p_new_positions, '{}') loop
    if not (p = any(assignable)) then raise exception 'unknown position %', p using errcode = '22023'; end if;
    if v_actor <> 'DIRECTION' and p = any(office_pos) then
      raise exception 'office position: Direzione only' using errcode = '42501';
    end if;
  end loop;
  return v_actor;
end;
$$;

-- 8b. Readers per site: scd_structure_reader_site recreated IDENTICAL to r135 except the two positions appended to
-- each site (UD-156 + 13:32: the direttori sportivi see Dervio; whoever sees Dervio sees Colico).
create or replace function public.scd_structure_reader_site(p_organization_id uuid, p_site text)
returns boolean
language sql
stable
set search_path to 'public'
as $$
  select case p_site
    when 'COLICO' then
      public.scd_has_org_role(p_organization_id, array['DIRECTION','SECRETARIAT']::public.scd_role[])
      or public.scd_has_position(p_organization_id, array['presidente','direttore-generale','coordinatore-attivita-sportiva','responsabile-attivita-base','responsabile-struttura','responsabile-struttura-colico','responsabile-struttura-dervio','responsabile-campi','responsabile-club-house','direttore-sportivo-agonistica','direttore-sportivo-generale'])
    when 'DERVIO' then
      public.scd_has_org_role(p_organization_id, array['DIRECTION','SECRETARIAT']::public.scd_role[])
      or public.scd_has_position(p_organization_id, array['presidente','direttore-generale','coordinatore-attivita-sportiva','responsabile-attivita-base','direttore-sportivo-agonistica','direttore-sportivo-generale'])
    else false
  end;
$$;

-- 8c. Who confirms requests (UD-154): scd_request_group_confirmers recreated IDENTICAL to r133 except that U16/U15 go
-- to the Direttore sportivo agonistica and Prima/U19 to the Direttore sportivo generale (the Direzione still confirms
-- every group on behalf).
create or replace function public.scd_request_group_confirmers(p_team_key text)
returns text[] language sql immutable set search_path to 'public' as $$
  select case
    when p_team_key in ('2014','2015','esordienti','pulcini','primicalci','piccoli') then array['responsabile-attivita-base']
    when p_team_key in ('u16','u15') then array['direttore-sportivo-agonistica']
    when p_team_key in ('prima','u19') then array['direttore-sportivo-generale']
    else null
  end;
$$;

-- ---------------------------------------------------------------- 9. execute rights
revoke all on function public.scd_structure_roles_position_check() from public, anon, authenticated;
revoke all on function public.scd_position_catalog_reader(uuid) from public, anon, authenticated;
revoke all on function public.scd_position_slug(text) from public, anon;
revoke all on function public.scd_position_label_ok(text) from public, anon;
revoke all on function public.scd_position_catalog_board(uuid) from public, anon;
revoke all on function public.scd_create_custom_position(uuid, text, text, text, text) from public, anon;
revoke all on function public.scd_set_position_status(uuid, text, text, text) from public, anon;
revoke all on function public.scd_section_platform(text) from public, anon;
-- Recreated functions keep the privileges of their first version (r65, r133, r135): internal, not callable by API roles.
revoke all on function public.scd_access_admin_guard(uuid, uuid, public.scd_role, text[]) from public, anon, authenticated;
revoke all on function public.scd_structure_reader_site(uuid, text) from public, anon, authenticated;
revoke all on function public.scd_request_group_confirmers(text) from public, anon, authenticated;
grant execute on function public.scd_section_platform(text) to authenticated;
grant execute on function public.scd_position_slug(text) to authenticated;
grant execute on function public.scd_position_label_ok(text) to authenticated;
grant execute on function public.scd_position_catalog_board(uuid) to authenticated;
grant execute on function public.scd_create_custom_position(uuid, text, text, text, text) to authenticated;
grant execute on function public.scd_set_position_status(uuid, text, text, text) to authenticated;

commit;
