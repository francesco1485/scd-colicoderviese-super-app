// r121 one card, many roles — behaviour test on an in-memory Postgres (PGlite), no remote database touched.
//   npm install --prefix /tmp/scd-pglite @electric-sql/pglite@0.5.10
//   PGLITE_DIR=/tmp/scd-pglite node supabase/tests/r121_people_merge_multi_role.pglite.mjs
// Exit code 0 = every assertion passed. Every id, name and organisation below is invented.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import assert from "node:assert/strict";

async function loadPGlite() {
  const dir = process.env.PGLITE_DIR;
  if (dir) {
    const entry = createRequire(`${dir.replace(/\/$/, "")}/package.json`).resolve("@electric-sql/pglite");
    return (await import(pathToFileURL(entry).href)).PGlite;
  }
  return (await import("@electric-sql/pglite")).PGlite;
}
const PGlite = await loadPGlite();
const read = (f) => readFileSync(fileURLToPath(new URL(`../migrations/${f}`, import.meta.url)), "utf8");
const R121 = read("20261017_r121_people_merge_multi_role.sql");
// The real r64 approval function, taken from its migration file (the one r121 builds on).
const R64 = read("20261011_r64_access_requests.sql");
const APPROVE_V1 = R64.slice(R64.indexOf("create or replace function public.scd_approve_access_request("), R64.indexOf("$$;", R64.indexOf("create or replace function public.scd_approve_access_request(")) + 3);
assert.ok(APPROVE_V1.length > 500, "r64 approval function found");

const ORG = "00000000-0000-0000-0000-000000000001";
const ORG2 = "00000000-0000-0000-0000-000000000002";
const DG = "10000000-0000-0000-0000-000000000001"; // Direzione + Direttore Generale card
const SEG = "10000000-0000-0000-0000-000000000002"; // Segreteria
const FAN = "10000000-0000-0000-0000-000000000003"; // plain account
const P_DG = "20000000-0000-0000-0000-000000000001";
const P_PRES = "20000000-0000-0000-0000-000000000002"; // Presidente card (tesserati master)
const P_PRES_PARENT = "20000000-0000-0000-0000-000000000003"; // same human, parent card (registrations)
const P_CHILD1 = "20000000-0000-0000-0000-000000000004";
const P_CHILD2 = "20000000-0000-0000-0000-000000000005";
const P_A = "20000000-0000-0000-0000-000000000006";
const P_B = "20000000-0000-0000-0000-000000000007";
const P_OTHER_ORG = "20000000-0000-0000-0000-000000000008";
const TEAM = "30000000-0000-0000-0000-000000000001";

const db = new PGlite();
await db.exec(`
create role anon; create role authenticated; create role service_role;
create schema auth;
create table auth.users (id uuid primary key, instance_id uuid, aud text, role text, email text, encrypted_password text,
  email_confirmed_at timestamptz, raw_app_meta_data jsonb, raw_user_meta_data jsonb, created_at timestamptz, updated_at timestamptz,
  confirmation_token text, recovery_token text, email_change text, email_change_token_new text);
create table auth.identities (id uuid primary key, user_id uuid, provider_id text, identity_data jsonb, provider text, created_at timestamptz, updated_at timestamptz);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create type public.scd_role as enum ('USER_BASE','FAMILY','ATHLETE','MISTER','STAFF','MANAGER','SECRETARIAT','REGISTRATION','TOURNAMENTS','DIRECTION');
create table public.scd_organizations (id uuid primary key, slug text unique);
create table public.scd_memberships (organization_id uuid, user_id uuid, role public.scd_role, scope jsonb default '{}', active boolean default true,
  updated_at timestamptz, unique (organization_id, user_id));
create function public.scd_has_org_role(p_organization_id uuid, p_roles public.scd_role[]) returns boolean language sql stable set search_path = public as $$
  select exists (select 1 from public.scd_memberships m where m.organization_id = p_organization_id and m.user_id = auth.uid() and m.active and m.role = any(p_roles)) $$;
create table public.scd_people (id uuid primary key default gen_random_uuid(), organization_id uuid not null, first_name text, last_name text,
  birth_date date, email text, phone text, status text, fiscal_code text, display_name text, source_id text, source_record_id text,
  updated_at timestamptz default now());
create table public.scd_teams (id uuid primary key, organization_id uuid);
create table public.scd_structure_roles (id uuid primary key default gen_random_uuid(), organization_id uuid not null,
  person_id uuid not null references public.scd_people(id) on delete cascade, role_label text not null, role_kind text not null,
  team_id uuid, show_in_app boolean not null default true, active boolean not null default true, valid_to date,
  source_id text not null default 'UNVERIFIED', source_record_id text, position_code text);
create table public.scd_position_catalog (organization_id uuid, code text, label text, role_kind text, status text, primary key (organization_id, code));
create table public.scd_families (id uuid primary key default gen_random_uuid(), organization_id uuid, display_name text);
create table public.scd_family_members (family_id uuid references public.scd_families(id), person_id uuid references public.scd_people(id) on delete cascade,
  relationship text, is_guardian boolean, primary key (family_id, person_id));
create table public.scd_identity_links (organization_id uuid, user_id uuid, person_id uuid references public.scd_people(id) on delete cascade,
  link_state text, match_method text, confidence int, verified_by_user_id uuid, verified_at timestamptz, updated_at timestamptz,
  unique (organization_id, user_id, person_id));
create table public.scd_athletes (id uuid primary key default gen_random_uuid(), organization_id uuid, person_id uuid references public.scd_people(id) on delete cascade, unique (organization_id, person_id));
create table public.scd_person_roles (id uuid primary key default gen_random_uuid(), organization_id uuid, person_id uuid references public.scd_people(id) on delete cascade, role text, active boolean);
create unique index scd_person_roles_active_uq on public.scd_person_roles (organization_id, person_id, role) where active;
create table public.scd_person_grants (id uuid primary key default gen_random_uuid(), organization_id uuid, person_id uuid references public.scd_people(id) on delete cascade, section_code text, revoked_at timestamptz);
create table public.scd_person_consents (id uuid primary key default gen_random_uuid(), person_id uuid references public.scd_people(id) on delete cascade,
  given_by_person_id uuid references public.scd_people(id) on delete set null, consent_type text, revoked_at timestamptz);
create table public.scd_tesseramenti (id uuid primary key default gen_random_uuid(), organization_id uuid, season_id uuid, person_id uuid references public.scd_people(id) on delete cascade, team_id uuid);
create table public.scd_transport_requests (id uuid primary key default gen_random_uuid(), organization_id uuid, event_source_id text, person_id uuid references public.scd_people(id));
create table public.scd_documents (id uuid primary key default gen_random_uuid(), person_id uuid references public.scd_people(id) on delete set null);
create table public.scd_access_requests (id uuid primary key default gen_random_uuid(), organization_id uuid, first_name text, last_name text,
  birth_date date, email text, phone text, is_minor boolean default false, status text default 'PENDING',
  person_id uuid references public.scd_people(id) on delete set null, granted_role public.scd_role, review_note text,
  reviewed_by_user_id uuid, reviewed_at timestamptz);
create table public.scd_access_audit (id bigint generated always as identity primary key, organization_id uuid not null, actor_user_id uuid,
  target_user_id uuid, target_person_id uuid references public.scd_people(id) on delete set null, action text not null, detail jsonb not null default '{}');
alter table public.scd_access_audit add constraint scd_access_audit_action_check check (action in ('SET_ACCESS','APPROVE_REQUEST'));
create function public.scd_is_creator_label(p text) returns boolean language sql immutable as $$ select lower(btrim(coalesce(p,''))) in ('presidente','direttore generale') $$;
create function public.scd_is_creator_position(p text) returns boolean language sql immutable as $$ select coalesce(p,'') in ('presidente','direttore-generale') $$;
create function public.scd_is_role_creator(p_organization_id uuid) returns boolean language sql stable set search_path = public as $$
  select auth.uid() is not null and public.scd_has_org_role(p_organization_id, array['DIRECTION']::public.scd_role[])
    and exists (select 1 from public.scd_identity_links l join public.scd_structure_roles r on r.person_id = l.person_id
                where l.user_id = auth.uid() and r.active and public.scd_is_creator_label(r.role_label)) $$;
insert into public.scd_organizations values ('${ORG}', 'scd-colicoderviese'), ('${ORG2}', 'altro');
insert into public.scd_memberships (organization_id, user_id, role) values ('${ORG}', '${DG}', 'DIRECTION'), ('${ORG}', '${SEG}', 'SECRETARIAT'), ('${ORG}', '${FAN}', 'USER_BASE');
insert into public.scd_teams values ('${TEAM}', '${ORG}');
insert into public.scd_position_catalog values
  ('${ORG}', 'presidente', 'Presidente', 'ORGANO_SOCIETARIO', 'ACTIVE'),
  ('${ORG}', 'consigliere', 'Consigliere', 'ORGANO_SOCIETARIO', 'ACTIVE'),
  ('${ORG}', 'dirigente-accompagnatore', 'Dirigente accompagnatore', 'DIRIGENTE', 'ACTIVE'),
  ('${ORG}', 'vecchio', 'Ritirato', 'STAFF', 'RETIRED');
insert into public.scd_people (id, organization_id, first_name, last_name, birth_date, email, source_id) values
  ('${P_DG}', '${ORG}', 'Dario', 'Guida', '1980-01-01', null, 'MASTER'),
  ('${P_PRES}', '${ORG}', 'Piero', 'Rossi', '1969-02-10', null, 'TESSERATI_MASTER'),
  ('${P_PRES_PARENT}', '${ORG}', 'Piero', 'Rossi', null, 'piero@example.org', 'ISCRIZIONI'),
  ('${P_CHILD1}', '${ORG}', 'Uno', 'Rossi', '2013-05-05', null, 'ISCRIZIONI'),
  ('${P_CHILD2}', '${ORG}', 'Due', 'Rossi', '2016-05-05', null, 'ISCRIZIONI'),
  ('${P_A}', '${ORG}', 'Anna', 'Bianchi', '1990-03-03', null, 'X'),
  ('${P_B}', '${ORG}', 'Anna', 'Bianchi', '1991-03-03', 'anna@example.org', 'Y'),
  ('${P_OTHER_ORG}', '${ORG2}', 'Piero', 'Rossi', null, null, 'Z');
insert into public.scd_structure_roles (organization_id, person_id, role_label, role_kind, position_code) values
  ('${ORG}', '${P_DG}', 'Direttore Generale', 'DIRIGENTE', 'direttore-generale'),
  ('${ORG}', '${P_PRES}', 'Presidente', 'ORGANO_SOCIETARIO', 'presidente');
insert into public.scd_identity_links (organization_id, user_id, person_id, link_state) values ('${ORG}', '${DG}', '${P_DG}', 'AUTO_VERIFIED');
insert into public.scd_families (id, organization_id) values ('40000000-0000-0000-0000-000000000001', '${ORG}');
insert into public.scd_family_members values ('40000000-0000-0000-0000-000000000001', '${P_CHILD1}', 'FIGLIO', false),
  ('40000000-0000-0000-0000-000000000001', '${P_PRES_PARENT}', 'PADRE', true);
insert into public.scd_documents (person_id) values ('${P_PRES_PARENT}');
insert into public.scd_access_audit (organization_id, target_person_id, action) values ('${ORG}', '${P_PRES_PARENT}', 'APPROVE_REQUEST');
`);
await db.exec(APPROVE_V1);
await db.exec(R121);
await db.exec(R121); // idempotent

const as = async (uid) => db.exec(`select set_config('request.jwt.claim.sub', '${uid ?? ""}', false)`);
const one = async (sql) => (await db.query(sql)).rows[0];
const fails = async (sql, re) => {
  await assert.rejects(db.query(sql), (e) => re.test(String(e.message)), `expected ${re} from: ${sql}`);
};

// Audit check keeps the old values and gains MERGE_PEOPLE.
assert.match((await one(`select pg_get_constraintdef(oid) d from pg_constraint where conname = 'scd_access_audit_action_check'`)).d, /CREATE_POSITION.*MERGE_PEOPLE/s);

// Who may merge.
await as(FAN);
await fails(`select public.scd_merge_people('${P_A}', '${P_B}', 'x')`, /not allowed/);
await as(SEG);
await fails(`select public.scd_merge_people('${P_PRES}', '${P_PRES_PARENT}', 'x')`, /only Presidente or Direttore Generale/);
await fails(`select public.scd_merge_people('${P_A}', '${P_A}', 'x')`, /two different cards/);
await fails(`select public.scd_merge_people('${P_A}', '${P_OTHER_ORG}', 'x')`, /not allowed/);
await fails(`select public.scd_merge_people('${P_A}', '${P_B}', 'x')`, /different birth dates/);

// Fail closed on two athlete records; nothing changes.
await db.exec(`update public.scd_people set birth_date = null where id = '${P_B}';
  insert into public.scd_athletes (organization_id, person_id) values ('${ORG}', '${P_A}'), ('${ORG}', '${P_B}');`);
await fails(`select public.scd_merge_people('${P_A}', '${P_B}', 'x')`, /both cards are athletes/);
assert.equal((await one(`select count(*)::int n from public.scd_people where id = '${P_B}'`)).n, 1);
await db.exec(`delete from public.scd_athletes where person_id = '${P_B}'`);

// Same consent active on both: refused.
await db.exec(`insert into public.scd_person_consents (person_id, consent_type) values ('${P_A}', 'PRIVACY'), ('${P_B}', 'PRIVACY')`);
await fails(`select public.scd_merge_people('${P_A}', '${P_B}', 'x')`, /same active consent/);
await db.exec(`update public.scd_person_consents set revoked_at = now() where person_id = '${P_B}'`);

// Segreteria merges two plain cards: fields filled, references moved, drop gone, one audit row.
await as(SEG);
await db.query(`select public.scd_merge_people('${P_A}', '${P_B}', 'stessa persona')`);
const a = await one(`select email, birth_date::text b from public.scd_people where id = '${P_A}'`);
assert.equal(a.email, "anna@example.org");
assert.equal(a.b, "1990-03-03");
assert.equal((await one(`select count(*)::int n from public.scd_people where id = '${P_B}'`)).n, 0);
assert.equal((await one(`select count(*)::int n from public.scd_person_consents where person_id = '${P_A}'`)).n, 2);
const audit = await one(`select actor_user_id::text actor, detail from public.scd_access_audit where action = 'MERGE_PEOPLE'`);
assert.equal(audit.actor, SEG);
assert.equal(audit.detail.merged_person_id, P_B);

// The DG (role creator) merges the Presidente's parent card into the Presidente card through the multi approval.
await db.exec(`insert into public.scd_access_requests (id, organization_id, first_name, last_name, birth_date, email, phone)
  values ('50000000-0000-0000-0000-000000000001', '${ORG}', 'Piero', 'Rossi', '1969-02-10', 'piero@example.org', '333 1234567'),
         ('50000000-0000-0000-0000-000000000002', '${ORG}', 'Minore', 'Verdi', '2010-01-01', 'm@example.org', '333 7654321')`);
await db.exec(`update public.scd_access_requests set is_minor = true where id = '50000000-0000-0000-0000-000000000002'`);

await as(SEG);
await fails(`select public.scd_approve_access_request_multi('50000000-0000-0000-0000-000000000001', '${P_PRES}', array['${P_PRES_PARENT}']::uuid[],
  'MANAGER', '[{"code":"consigliere"}]', array['${P_CHILD1}','${P_CHILD2}']::uuid[], 'verificato')`, /only Presidente or Direttore Generale/);
// Rolled back as a whole: both cards still there, request still pending.
assert.equal((await one(`select count(*)::int n from public.scd_people where id in ('${P_PRES}', '${P_PRES_PARENT}')`)).n, 2);
assert.equal((await one(`select status from public.scd_access_requests where id = '50000000-0000-0000-0000-000000000001'`)).status, "PENDING");

await as(DG);
await fails(`select public.scd_approve_access_request_multi('50000000-0000-0000-0000-000000000001', '${P_PRES}', null, 'MANAGER',
  '[{"code":"vecchio"}]', null, 'x')`, /unknown position/);
await fails(`select public.scd_approve_access_request_multi('50000000-0000-0000-0000-000000000002', null, null, 'ATHLETE',
  '[{"code":"consigliere"}]', null, 'x')`, /minor holds no organigram position/);
await fails(`select public.scd_approve_access_request_multi('50000000-0000-0000-0000-000000000001', null, array['${P_PRES_PARENT}']::uuid[], 'MANAGER',
  null, null, 'x')`, /merge needs the card to keep/);

const kept = await one(`select public.scd_approve_access_request_multi('50000000-0000-0000-0000-000000000001', '${P_PRES}',
  array['${P_PRES_PARENT}']::uuid[], 'MANAGER',
  '[{"code":"presidente"},{"code":"consigliere"},{"code":"dirigente-accompagnatore","teamId":"${TEAM}"}]',
  array['${P_CHILD1}','${P_CHILD2}']::uuid[], 'verificato al telefono') id`);
assert.equal(kept.id, P_PRES);
assert.equal((await one(`select count(*)::int n from public.scd_people where id = '${P_PRES_PARENT}'`)).n, 0, "parent card merged");
const roles = (await db.query(`select position_code, team_id::text t from public.scd_structure_roles where person_id = '${P_PRES}' and active order by 1`)).rows;
assert.deepEqual(roles.map((r) => r.position_code), ["consigliere", "dirigente-accompagnatore", "presidente"], "Presidente kept once, two roles added");
assert.equal(roles.find((r) => r.position_code === "dirigente-accompagnatore").t, TEAM);
const kids = (await db.query(`select c.person_id::text p from public.scd_family_members g join public.scd_family_members c on c.family_id = g.family_id and not c.is_guardian
  where g.person_id = '${P_PRES}' and g.is_guardian order by 1`)).rows.map((r) => r.p);
assert.deepEqual(kids, [P_CHILD1, P_CHILD2], "guardian of both children on the single card");
assert.equal((await one(`select person_id::text p from public.scd_documents`)).p, P_PRES, "documents follow the person");
assert.equal((await one(`select count(*)::int n from public.scd_access_audit where target_person_id = '${P_PRES}' and action = 'APPROVE_REQUEST'`)).n, 2,
  "old audit row re-pointed + new approval row");
const req = await one(`select status, person_id::text p, granted_role::text r from public.scd_access_requests where id = '50000000-0000-0000-0000-000000000001'`);
assert.deepEqual([req.status, req.p, req.r], ["APPROVED", P_PRES, "MANAGER"]);
assert.equal((await one(`select email from public.scd_people where id = '${P_PRES}'`)).email, "piero@example.org");

// Reviewed twice: refused.
await fails(`select public.scd_approve_access_request_multi('50000000-0000-0000-0000-000000000001', '${P_PRES}', null, 'MANAGER', null, null, 'x')`, /already reviewed/);

// Anonymous caller (e.g. an agent without a session) merges nothing through the RPC path that checks the office role.
await as(null);
await fails(`select public.scd_approve_access_request_multi('50000000-0000-0000-0000-000000000002', null, null, 'ATHLETE', null, null, 'x')`, /not allowed/);

console.log("r121 people merge + multi-role approval: all assertions passed");
