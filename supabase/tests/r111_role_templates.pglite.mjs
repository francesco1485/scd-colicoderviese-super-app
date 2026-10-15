// r111 role templates — behaviour test on an in-memory Postgres (PGlite), no remote database touched.
// Run from the repository root (PGlite is not a dependency of the app, so it is installed in a throwaway folder):
//   npm install --prefix /tmp/scd-pglite @electric-sql/pglite@0.5.10
//   PGLITE_DIR=/tmp/scd-pglite node supabase/tests/r111_role_templates.pglite.mjs
// Exit code 0 = every assertion passed. r100 is applied first (r111 builds on it); the SCD PULSE objects both depend
// on are created here in their minimal shape. Every id and e-mail is invented.
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
const mig = (f) => readFileSync(fileURLToPath(new URL(`../migrations/${f}`, import.meta.url)), "utf8");
const db = new PGlite();

const ORG = "00000000-0000-0000-0000-0000000000a1";
const U = (n) => `10000000-0000-0000-0000-00000000000${n}`; // 1 Presidente, 2 DG, 3 DS (Direzione), 4 Segreteria, 5 mister
const P = (n) => `20000000-0000-0000-0000-00000000000${n}`; // person of user n; 6 = person without account
const T1 = "30000000-0000-0000-0000-000000000001";
const T2 = "30000000-0000-0000-0000-000000000002";

await db.exec(`
create role anon; create role authenticated;
create schema auth;
create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create type public.scd_role as enum ('USER_BASE','FAMILY','ATHLETE','MISTER','MANAGER','STAFF','SECRETARIAT','REGISTRATION','DIRECTION');
create table public.scd_organizations (id uuid primary key);
create table public.scd_people (id uuid primary key, organization_id uuid not null, first_name text default 'X', last_name text default 'Y', display_name text, birth_date date, status text default 'ACTIVE');
create table public.scd_memberships (user_id uuid, organization_id uuid, role public.scd_role, active boolean, scope jsonb default '{}', created_at timestamptz default now());
create table public.scd_identity_links (id uuid primary key default gen_random_uuid(), organization_id uuid, user_id uuid, person_id uuid, link_state text default 'AUTO_VERIFIED' check (link_state in ('AUTO_VERIFIED','VERIFIED_BY_STAFF','PENDING_REVIEW','REJECTED','REVOKED')));
create table public.scd_structure_roles (id uuid primary key default gen_random_uuid(), organization_id uuid, person_id uuid, role_label text, role_kind text, team_id uuid, active boolean default true, valid_to date);
create table public.scd_teams (id uuid primary key, organization_id uuid, code text, name text, status text);
create table public.scd_athletes (id uuid primary key default gen_random_uuid(), person_id uuid);
create table public.scd_team_memberships (athlete_id uuid, team_id uuid, valid_to date);
create table public.scd_family_members (family_id uuid, person_id uuid, is_guardian boolean);
create table public.scd_access_audit (id bigserial primary key, organization_id uuid not null, actor_user_id uuid, target_user_id uuid, target_person_id uuid, action text not null, detail jsonb not null default '{}', created_at timestamptz not null default now(),
  constraint scd_access_audit_action_check check (action in ('SET_ACCESS','GRANT_PERSON','REVOKE_LINK','APPROVE_REQUEST','REJECT_REQUEST')));
create function public.scd_has_org_role(p_org uuid, p_roles public.scd_role[]) returns boolean language sql stable as
  $$ select exists (select 1 from public.scd_memberships m where m.user_id = auth.uid() and m.organization_id = p_org and m.active and m.role = any(p_roles)) $$;
insert into public.scd_organizations values ('${ORG}');
insert into auth.users select ('10000000-0000-0000-0000-00000000000' || i)::uuid, 'user' || i || '@example.test' from generate_series(1, 5) i;
insert into public.scd_people (id, organization_id) select ('20000000-0000-0000-0000-00000000000' || i)::uuid, '${ORG}' from generate_series(1, 6) i;
insert into public.scd_memberships (user_id, organization_id, role, active) values
  ('${U(1)}', '${ORG}', 'DIRECTION', true), ('${U(2)}', '${ORG}', 'DIRECTION', true), ('${U(3)}', '${ORG}', 'DIRECTION', true),
  ('${U(4)}', '${ORG}', 'SECRETARIAT', true), ('${U(5)}', '${ORG}', 'MISTER', true);
insert into public.scd_identity_links (organization_id, user_id, person_id)
  select '${ORG}', ('10000000-0000-0000-0000-00000000000' || i)::uuid, ('20000000-0000-0000-0000-00000000000' || i)::uuid from generate_series(1, 5) i;
insert into public.scd_structure_roles (organization_id, person_id, role_label, role_kind) values
  ('${ORG}', '${P(1)}', 'Presidente', 'ORGANO_SOCIETARIO'),
  ('${ORG}', '${P(2)}', 'Direttore Generale', 'DIRIGENTE'),
  ('${ORG}', '${P(3)}', 'Direttore Sportivo', 'DIRIGENTE');
insert into public.scd_teams values ('${T1}', '${ORG}', 'T1', 'Team 1', 'ACTIVE'), ('${T2}', '${ORG}', 'T2', 'Team 2', 'ACTIVE');
`);
await db.exec(mig("20261014_r100_person_grants.sql"));
await db.exec(mig("20261015_r111_role_templates.sql"));
await db.exec(mig("20261015_r111_role_templates.sql")); // re-runnable

async function as(n) {
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [U(n)]);
}
async function one(sql, params = []) {
  const r = await db.query(sql, params);
  return Object.values(r.rows[0] ?? {})[0];
}
async function fails(sql, params, needle) {
  await assert.rejects(db.query(sql, params), (e) => {
    assert.match(String(e.message), new RegExp(needle));
    return true;
  });
}
const CREATE = `select public.scd_create_role_template($1, $2, $3, $4)`;
const CREATE_WITH = `select public.scd_create_role_template($1, $2, $3, $4, $5::jsonb)`;
const SET = `select public.scd_set_role_template($1, $2, $3, $4, $5::jsonb, $6)`;
const ACTIVE = `select public.scd_set_role_template_active($1, $2, $3, $4)`;
const GRANTS = `select public.scd_set_person_grants($1, $2, $3::jsonb, $4)`;
const CAN = `select public.scd_can($1, $2, $3, $4)`;
const NOT_CREATOR = "Presidente or Direttore Generale only";

// 1. Only Presidente and Direttore Generale create; a new template is always empty, on every platform.
await as(1);
assert.equal(await one(`select public.scd_is_role_creator($1)`, [ORG]), true);
const core = await one(CREATE, [ORG, "CORE", "Mister annata", "Squadra"]);
assert.equal(Number(await one(`select count(*) from public.scd_role_template_grants where template_id = $1`, [core])), 0);
await as(2);
assert.equal(await one(`select public.scd_is_role_creator($1)`, [ORG]), true);
for (const platform of ["ONE", "GROW"]) assert.ok(await one(CREATE, [ORG, platform, `Vuoto ${platform}`, ""]));
await as(3);
assert.equal(await one(`select public.scd_is_role_creator($1)`, [ORG]), false);
await fails(CREATE, [ORG, "CORE", "Da DS", ""], NOT_CREATOR);
await fails(SET, [ORG, core, "Mister annata", "", "[]", ""], NOT_CREATOR);
await fails(ACTIVE, [ORG, core, false, ""], NOT_CREATOR);
await as(4);
await fails(CREATE, [ORG, "CORE", "Da segreteria", ""], NOT_CREATOR);
await fails(CREATE, [ORG, "ALTRO", "Piattaforma sconosciuta", ""], NOT_CREATOR);

// 2. Content: sections of the template's platform only, grantable only, labels unique per platform.
await as(1);
await fails(CREATE, [ORG, "ALTRO", "Piattaforma sconosciuta", ""], "unknown platform");
await fails(SET, [ORG, core, "Mister annata", "", '[{"section":"crm","level":"READ","perimeter":"ALL"}]', ""], "section of another platform");
await fails(SET, [ORG, core, "Mister annata", "", '[{"section":"safeguarding","level":"READ","perimeter":"ALL"}]', ""], "section not grantable");
await fails(SET, [ORG, core, "Mister annata", "", '[{"section":"mister","level":"READ","perimeter":"OWN_CHILDREN"}]', ""], "section not grantable");
await fails(SET, [ORG, core, "Mister annata", "", '[{"section":"mister","level":"READ","perimeter":"ALL"},{"section":"mister","level":"WRITE","perimeter":"ALL"}]', ""], "duplicate or missing section");
const tpl = '[{"section":"mister","level":"WRITE","perimeter":"OWN_TEAMS"},{"section":"quadro","level":"READ","perimeter":"OWN_TEAMS"}]';
assert.equal(await one(SET, [ORG, core, "Mister annata", "Squadra", tpl, "prima versione"]), 2);
await fails(CREATE, [ORG, "CORE", "  mister   ANNATA ", ""], "role label already used");
// A model is saved in the same call (atomic); a bad model leaves nothing behind.
const fromModel = await one(CREATE_WITH, [ORG, "GROW", "Commerciale", "", '[{"section":"crm","level":"WRITE","perimeter":"ALL"}]']);
assert.equal(Number(await one(`select count(*) from public.scd_role_template_grants where template_id = $1`, [fromModel])), 1);
await fails(CREATE_WITH, [ORG, "GROW", "Sbagliato", "", '[{"section":"mister","level":"READ","perimeter":"ALL"}]'], "section of another platform");
assert.equal(Number(await one(`select count(*) from public.scd_role_templates where label = 'Sbagliato'`)), 0);
await fails(CREATE, [ORG, null, "Senza piattaforma", ""], "unknown platform");
assert.ok(await one(CREATE, [ORG, "ONE", "Mister annata", ""]), "same label on another platform");
assert.equal(await one(SET, [ORG, core, "Mister annata", "Squadra", "[]", "torna vuoto"]), 0);
assert.equal(await one(SET, [ORG, core, "Mister annata", "Squadra", tpl, "di nuovo"]), 2);

// 2b. Nobody can make himself Presidente or DG to become a creator (r59 lets Direzione/Segreteria write the organigramma).
await as(3);
await fails(`insert into public.scd_structure_roles (organization_id, person_id, role_label, role_kind) values ($1, $2, 'Presidente', 'ORGANO_SOCIETARIO')`, [ORG, P(3)], "only Presidente or Direttore Generale change these roles");
await fails(`update public.scd_structure_roles set role_label = 'Direttore Generale' where person_id = $1`, [P(3)], "only Presidente or Direttore Generale change these roles");
await fails(`update public.scd_structure_roles set active = false where person_id = $1`, [P(1)], "only Presidente or Direttore Generale change these roles");
await db.query(`update public.scd_structure_roles set role_label = 'Direttore Sportivo agonistica' where person_id = $1`, [P(3)]); // other labels stay free
// ...nor link a second login of his own to the Presidente's person (r65 path).
await db.query(`insert into auth.users values ('10000000-0000-0000-0000-000000000009', 'nuovo@example.test')`);
await fails(`insert into public.scd_identity_links (organization_id, user_id, person_id, link_state) values ($1, '10000000-0000-0000-0000-000000000009', $2, 'VERIFIED_BY_STAFF')`, [ORG, P(1)], "only Presidente or Direttore Generale link accounts");
// An unverified link does not make a creator.
await db.query(`insert into public.scd_identity_links (organization_id, user_id, person_id, link_state) values ($1, '10000000-0000-0000-0000-000000000009', $2, 'PENDING_REVIEW')`, [ORG, P(1)]);
await db.query(`insert into public.scd_memberships (user_id, organization_id, role, active) values ('10000000-0000-0000-0000-000000000009', $1, 'DIRECTION', true)`, [ORG]);
await db.query(`select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000009', false)`);
assert.equal(await one(`select public.scd_is_role_creator($1)`, [ORG]), false);
await as(2);
await db.query(`update public.scd_structure_roles set valid_to = null where person_id = $1`, [P(2)]); // a creator may edit them

// 3. The Direzione applies it to one person through r100, with that person's team: a team role sees its team only.
await as(3);
const rows = await db.query(`select section_code, level, perimeter from public.scd_role_template_grants where template_id = $1`, [core]);
const applied = rows.rows.map((r) => ({ section: r.section_code, level: r.level, perimeter: r.perimeter, team_ids: [T1] }));
assert.equal(await one(GRANTS, [ORG, P(5), JSON.stringify(applied), "ruolo Mister annata"]), 2);
await as(5);
assert.equal(await one(CAN, ["mister", "WRITE", ORG, T1]), true);
assert.equal(await one(CAN, ["mister", "WRITE", ORG, T2]), false);

// 4. Responsabile: more teams only when the Direzione grants them explicitly.
await as(3);
await db.query(GRANTS, [ORG, P(5), JSON.stringify([{ section: "mister", level: "WRITE", perimeter: "OWN_TEAMS", team_ids: [T1, T2] }]), "responsabile due squadre"]);
await as(5);
assert.equal(await one(CAN, ["mister", "WRITE", ORG, T2]), true);
assert.equal(await one(CAN, ["quadro", "READ", ORG, T1]), false, "sections left out of the new set are revoked");

// 5. Base access first; revoking and narrowing always work, even after the account is closed.
await as(3);
await fails(GRANTS, [ORG, P(6), '[{"section":"magazzino","level":"READ","perimeter":"ALL"}]', ""], "base access missing");
await db.query(GRANTS, [ORG, P(5), JSON.stringify([
  { section: "mister", level: "WRITE", perimeter: "OWN_TEAMS", team_ids: [T1, T2] },
  { section: "magazzino", level: "WRITE", perimeter: "ALL" }]), "prima della chiusura"]);
await db.query(`update public.scd_memberships set active = false where user_id = $1`, [U(5)]);
await fails(GRANTS, [ORG, P(5), JSON.stringify([
  { section: "mister", level: "WRITE", perimeter: "OWN_TEAMS", team_ids: [T1, T2] },
  { section: "magazzino", level: "WRITE", perimeter: "ALL" },
  { section: "quadro", level: "READ", perimeter: "ALL" }]), "nuova sezione"], "base access missing");
await fails(GRANTS, [ORG, P(5), JSON.stringify([
  { section: "mister", level: "APPROVE", perimeter: "OWN_TEAMS", team_ids: [T1, T2] },
  { section: "magazzino", level: "WRITE", perimeter: "ALL" }]), "allarga"], "base access missing");
assert.equal(await one(GRANTS, [ORG, P(5), JSON.stringify([
  { section: "mister", level: "READ", perimeter: "OWN_TEAMS", team_ids: [T1] },
  { section: "magazzino", level: "READ", perimeter: "OWN_SITE", site: "COLICO" }]), "riduzione"]), 2);
assert.equal(await one(GRANTS, [ORG, P(5), "[]", "account chiuso"]), 2);

// 6. Deactivate / reactivate: creators only, labels stay unique, inactive templates are frozen.
await as(2);
assert.equal(await one(ACTIVE, [ORG, core, false, "non serve"]), true);
assert.equal(await one(ACTIVE, [ORG, core, false, "di nuovo"]), false);
assert.ok(await one(CREATE, [ORG, "CORE", "Mister annata", ""]));
await fails(ACTIVE, [ORG, core, true, ""], "role label already used");
await fails(SET, [ORG, core, "Altro nome", "", "[]", ""], "role is not active");

// 7. Audit trail and table shape.
const actions = (await db.query(`select action from public.scd_access_audit order by id`)).rows.map((r) => r.action);
assert.equal(await one(`select public.scd_section_platform('proposte')`), "CORE");
for (const a of ["CREATE_ROLE", "CHANGE_ROLE", "ROLE_STATUS", "GRANT_SECTION", "REVOKE_SECTION"]) assert.ok(actions.includes(a), a);
assert.equal(Number(await one(`select count(*) from pg_policies where tablename in ('scd_role_templates','scd_role_template_grants') and cmd <> 'SELECT'`)), 0);
assert.equal(await one(`select public.scd_section_platform('crm')`), "GROW");
assert.equal(await one(`select public.scd_section_platform('famiglia')`), "ONE");
assert.equal(await one(`select public.scd_section_platform('nessuna')`), null);

console.log("r111 role templates: all assertions passed");
