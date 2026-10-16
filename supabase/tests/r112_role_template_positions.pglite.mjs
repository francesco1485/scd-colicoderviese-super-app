// r112 role template ↔ organigram position link — behaviour test on an in-memory Postgres (PGlite), no remote database.
// Run from the repository root (PGlite is not a dependency of the app, so it is installed in a throwaway folder):
//   npm install --prefix /tmp/scd-pglite @electric-sql/pglite@0.5.10
//   PGLITE_DIR=/tmp/scd-pglite node supabase/tests/r112_role_template_positions.pglite.mjs
// Exit code 0 = every assertion passed. The real files of r100, r111, r135 and r138 are applied first (all four are
// applied on SCD PULSE); the r133 / r136 functions r138 recreates exist here as stubs. Every id and e-mail is invented.
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
const R112 = mig("20261016_r112_role_template_positions.sql");

const ORG = "00000000-0000-0000-0000-0000000000a1";
const OTHER = "00000000-0000-0000-0000-0000000000a2";
const U = (n) => `10000000-0000-0000-0000-00000000000${n}`; // 1 Presidente, 2 DG, 3 DS (Direzione, not creator), 4 Segreteria
const P = (n) => `20000000-0000-0000-0000-00000000000${n}`;

const base = `
create role anon; create role authenticated;
create schema auth;
create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create type public.scd_role as enum ('USER_BASE','FAMILY','ATHLETE','MISTER','MANAGER','STAFF','SECRETARIAT','REGISTRATION','TOURNAMENTS','DIRECTION');
create table public.scd_organizations (id uuid primary key, name text);
create table public.scd_people (id uuid primary key, organization_id uuid not null, first_name text default 'X', last_name text default 'Y', display_name text, birth_date date, status text default 'ACTIVE');
create table public.scd_memberships (user_id uuid, organization_id uuid, role public.scd_role, active boolean default true, scope jsonb default '{}', created_at timestamptz default now());
create table public.scd_identity_links (id uuid primary key default gen_random_uuid(), organization_id uuid, user_id uuid, person_id uuid, link_state text default 'AUTO_VERIFIED' check (link_state in ('AUTO_VERIFIED','VERIFIED_BY_STAFF','PENDING_REVIEW','REJECTED','REVOKED')));
create table public.scd_structure_roles (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.scd_organizations(id), person_id uuid not null references public.scd_people(id), role_label text not null,
  role_kind text not null check (role_kind in ('DIRIGENTE','MISTER','AUTISTA','RESPONSABILE','STAFF','ORGANO_SOCIETARIO')), team_id uuid, active boolean not null default true, valid_from date, valid_to date);
create table public.scd_teams (id uuid primary key, organization_id uuid, code text, name text, status text);
create table public.scd_athletes (id uuid primary key default gen_random_uuid(), person_id uuid);
create table public.scd_team_memberships (athlete_id uuid, team_id uuid, valid_to date);
create table public.scd_family_members (family_id uuid, person_id uuid, is_guardian boolean);
create table public.scd_access_audit (id bigserial primary key, organization_id uuid not null, actor_user_id uuid, target_user_id uuid, target_person_id uuid, action text not null, detail jsonb not null default '{}', created_at timestamptz not null default now(),
  constraint scd_access_audit_action_check check (action in ('SET_ACCESS','GRANT_PERSON','REVOKE_LINK','APPROVE_REQUEST','REJECT_REQUEST')));
create function public.scd_has_org_role(p_org uuid, p_roles public.scd_role[]) returns boolean language sql stable as
  $$ select exists (select 1 from public.scd_memberships m where m.user_id = auth.uid() and m.organization_id = p_org and m.active and m.role = any(p_roles)) $$;
create function public.scd_has_position(p_organization_id uuid, p_positions text[]) returns boolean language sql stable set search_path to 'public' as $$
  select exists (select 1 from public.scd_memberships m where m.organization_id = p_organization_id and m.user_id = (select auth.uid()) and m.active
    and jsonb_typeof(m.scope -> 'positions') = 'array'
    and exists (select 1 from jsonb_array_elements_text(m.scope -> 'positions') p where p = any(p_positions))) $$;
create function public.scd_request_group_confirmers(p_team_key text) returns text[] language sql immutable as $$ select null::text[] $$;
create function public.scd_access_admin_guard(p_organization_id uuid, p_target_user uuid, p_new_role public.scd_role, p_new_positions text[])
  returns public.scd_role language sql stable as $$ select null::public.scd_role $$;
insert into public.scd_organizations values ('${ORG}', 'Club'), ('${OTHER}', 'Other club');
insert into auth.users select ('10000000-0000-0000-0000-00000000000' || i)::uuid, 'user' || i || '@example.test' from generate_series(1, 4) i;
insert into public.scd_people (id, organization_id) select ('20000000-0000-0000-0000-00000000000' || i)::uuid, '${ORG}' from generate_series(1, 4) i;
insert into public.scd_memberships (user_id, organization_id, role) values
  ('${U(1)}', '${ORG}', 'DIRECTION'), ('${U(2)}', '${ORG}', 'DIRECTION'), ('${U(3)}', '${ORG}', 'DIRECTION'), ('${U(4)}', '${ORG}', 'SECRETARIAT');
insert into public.scd_identity_links (organization_id, user_id, person_id)
  select '${ORG}', ('10000000-0000-0000-0000-00000000000' || i)::uuid, ('20000000-0000-0000-0000-00000000000' || i)::uuid from generate_series(1, 4) i;
insert into public.scd_structure_roles (organization_id, person_id, role_label, role_kind) values
  ('${ORG}', '${P(1)}', 'Presidente', 'ORGANO_SOCIETARIO'),
  ('${ORG}', '${P(2)}', 'Direttore Generale', 'DIRIGENTE'),
  ('${ORG}', '${P(3)}', 'Direttore Sportivo', 'DIRIGENTE');
`;

// 0. Fail closed without r138: the migration stops and leaves nothing behind.
{
  const bare = new PGlite();
  await bare.exec(base);
  await bare.exec(mig("20261014_r100_person_grants.sql"));
  await bare.exec(mig("20261015_r111_role_templates.sql"));
  await assert.rejects(() => bare.exec(R112), /r112 prerequisites missing/);
  await bare.exec("rollback");
  const left = await bare.query(`select count(*)::int c from information_schema.columns where table_name = 'scd_role_templates' and column_name = 'position_code'`);
  assert.equal(left.rows[0].c, 0);
}

const db = new PGlite();
await db.exec(base);
await db.exec(mig("20261014_r100_person_grants.sql"));
await db.exec(mig("20261015_r111_role_templates.sql"));
await db.exec(mig("20261016_r135_structure_activities.sql"));
await db.exec(mig("20261016_r138_position_catalog.sql"));
await db.exec(R112);
await db.exec(R112); // idempotent

async function as(n) {
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [n ? U(n) : ""]);
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
const LINK = `select public.scd_set_role_template_position($1, $2, $3, $4)`;
const ACTIVE = `select public.scd_set_role_template_active($1, $2, $3, $4)`;
const NOT_CREATOR = "Presidente or Direttore Generale only";

// 1. A new template has no position; the catalogue is there (r138 seeded every position ACTIVE and empty).
await as(1);
const tpl = await one(CREATE, [ORG, "CORE", "Mister annata", ""]);
assert.equal(await one(`select position_code from public.scd_role_templates where id = $1`, [tpl]), null);
assert.equal(await one(`select status from public.scd_position_catalog where organization_id = $1 and code = 'allenatore-responsabile'`, [ORG]), "ACTIVE");

// 2. Only Presidente and Direttore Generale link; anybody else is refused, also the Direzione and the Segreteria.
for (const n of [3, 4, null]) {
  await as(n);
  await fails(LINK, [ORG, tpl, "allenatore-responsabile", ""], NOT_CREATOR);
}
await as(2);
assert.equal(await one(LINK, [ORG, tpl, "allenatore-responsabile", "per i mister"]), true);
assert.equal(await one(`select position_code from public.scd_role_templates where id = $1`, [tpl]), "allenatore-responsabile");
assert.equal(await one(LINK, [ORG, tpl, " allenatore-responsabile ", ""]), false, "same position: no change, no audit row");

// 3. Only an existing, ACTIVE position of the same club; a PROPOSED custom position waits for approval.
await fails(LINK, [ORG, tpl, "non-esiste", ""], "unknown position");
const custom = await one(`select public.scd_create_custom_position($1, 'Addetto ai palloni', 'operativi', 'STAFF', '')`, [ORG]);
assert.match(custom, /^custom-/);
await fails(LINK, [ORG, tpl, custom, ""], "position not active");
await db.query(`select public.scd_set_position_status($1, $2, 'ACTIVE', 'ok')`, [ORG, custom]);
assert.equal(await one(LINK, [ORG, tpl, custom, ""]), true);
// The composite FK keeps every link inside the club, also for writes that bypass the function.
await fails(`update public.scd_role_templates set organization_id = $1 where id = $2`, [OTHER, tpl], "scd_role_templates_position_fk");

// 4. Null or blank removes the link; another club's template is never found.
assert.equal(await one(LINK, [ORG, tpl, "", "tolto"]), true);
assert.equal(await one(`select position_code from public.scd_role_templates where id = $1`, [tpl]), null);
await fails(LINK, [OTHER, tpl, "allenatore-responsabile", ""], NOT_CREATOR);

// 5. A deactivated role is frozen.
assert.equal(await one(ACTIVE, [ORG, tpl, false, "non serve"]), true);
await fails(LINK, [ORG, tpl, "allenatore-responsabile", ""], "role is not active");

// 5b. Hardening: the r138 position_code of Presidente / DG is protected like the role_label (r111 guard).
await as(3);
await fails(`insert into public.scd_structure_roles (organization_id, person_id, role_label, role_kind, position_code) values ($1, $2, 'Consigliere', 'DIRIGENTE', 'presidente')`, [ORG, P(3)], "only Presidente or Direttore Generale change these roles");
await fails(`update public.scd_structure_roles set position_code = 'direttore-generale' where person_id = $1`, [P(3)], "only Presidente or Direttore Generale change these roles");
await db.query(`update public.scd_structure_roles set position_code = 'allenatore-responsabile' where person_id = $1`, [P(3)]); // other positions stay free
await as(4);
await fails(`update public.scd_structure_roles set position_code = 'presidente' where person_id = $1`, [P(3)], "only Presidente or Direttore Generale change these roles");
await as(1);
await db.query(`update public.scd_structure_roles set position_code = 'presidente' where person_id = $1`, [P(1)]); // a creator may
await as(3);
await fails(`update public.scd_structure_roles set active = false where person_id = $1`, [P(1)], "only Presidente or Direttore Generale change these roles");
// A second login of the DS cannot be linked to a person holding the Presidente position by code only.
await as(1);
await db.query(`insert into public.scd_people (id, organization_id) values ('20000000-0000-0000-0000-000000000009', $1)`, [ORG]);
await db.query(`insert into public.scd_structure_roles (organization_id, person_id, role_label, role_kind, position_code) values ($1, '20000000-0000-0000-0000-000000000009', 'Vice', 'DIRIGENTE', 'presidente')`, [ORG]);
await db.query(`insert into auth.users values ('10000000-0000-0000-0000-000000000009', 'nuovo@example.test')`);
await as(3);
await fails(`insert into public.scd_identity_links (organization_id, user_id, person_id, link_state) values ($1, '10000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000009', 'VERIFIED_BY_STAFF')`, [ORG], "only Presidente or Direttore Generale link accounts");
// The creator rule is unchanged: the position code alone never makes a creator.
await as(1);
assert.equal(await one(`select public.scd_is_role_creator($1)`, [ORG]), true);

// 6. Audit, no new write paths, nothing executable by anon; the link grants nothing.
const audit = (await db.query(`select detail from public.scd_access_audit where action = 'CHANGE_ROLE' and detail ? 'position' order by id`)).rows.map((r) => r.detail);
assert.equal(audit.length, 3);
assert.deepEqual([audit[0].position_before, audit[0].position], [null, "allenatore-responsabile"]);
assert.deepEqual([audit[2].position_before, audit[2].position], [custom, null]);
assert.equal(Number(await one(`select count(*) from pg_policies where tablename = 'scd_role_templates' and cmd <> 'SELECT'`)), 0);
assert.equal(await one(`select has_function_privilege('authenticated', 'public.scd_structure_roles_creator_guard()', 'execute')`), false);
assert.equal(await one(`select has_function_privilege('anon', 'public.scd_set_role_template_position(uuid, uuid, text, text)', 'execute')`), false);
assert.equal(await one(`select has_function_privilege('authenticated', 'public.scd_set_role_template_position(uuid, uuid, text, text)', 'execute')`), true);
assert.equal(Number(await one(`select count(*) from public.scd_person_grants`)), 0, "linking a position never grants a section");

console.log("r112 role template positions: all assertions passed");
