// r113 own section access — behaviour test on an in-memory Postgres (PGlite), no remote database touched.
// Run from the repository root (PGlite is not a dependency of the app, so it is installed in a throwaway folder):
//   npm install --prefix /tmp/scd-pglite @electric-sql/pglite@0.5.10
//   PGLITE_DIR=/tmp/scd-pglite node supabase/tests/r113_my_section_access.pglite.mjs
// Exit code 0 = every assertion passed. r100 is loaded from its real file; the SCD PULSE objects it depends on are
// created here in their minimal shape. Every id and e-mail is invented. Also pins the "ALL only" probe of scd_can that
// the app uses while r113 is not applied (a site no grant holds: only perimeter ALL answers true).
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
const R100 = mig("20261014_r100_person_grants.sql");
const R113 = mig("20261017_r113_my_section_access.sql");

const ORG = "00000000-0000-0000-0000-0000000000a1";
const OTHER = "00000000-0000-0000-0000-0000000000a2";
const U = (n) => `10000000-0000-0000-0000-00000000000${n}`; // 1 Direzione, 2 consigliere, 3 suspended, 4 pending link, 5 mister, 6 tifoso
const P = (n) => `20000000-0000-0000-0000-00000000000${n}`;
const T1 = "30000000-0000-0000-0000-000000000001";
const ALL_ONLY_SITE = "__ALL_ONLY__"; // same constant as apps/superapp/src/lib/access-resolver.server.ts

const setup = `
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
insert into public.scd_organizations values ('${ORG}'), ('${OTHER}');
insert into auth.users select ('10000000-0000-0000-0000-00000000000' || i)::uuid, 'user' || i || '@example.test' from generate_series(1, 6) i;
insert into public.scd_people (id, organization_id) select ('20000000-0000-0000-0000-00000000000' || i)::uuid, '${ORG}' from generate_series(1, 6) i;
insert into public.scd_memberships (user_id, organization_id, role, active) values
  ('${U(1)}', '${ORG}', 'DIRECTION', true), ('${U(2)}', '${ORG}', 'STAFF', true), ('${U(3)}', '${ORG}', 'STAFF', true),
  ('${U(4)}', '${ORG}', 'STAFF', true), ('${U(5)}', '${ORG}', 'MISTER', true), ('${U(6)}', '${ORG}', 'USER_BASE', true);
insert into public.scd_identity_links (organization_id, user_id, person_id)
  select '${ORG}', ('10000000-0000-0000-0000-00000000000' || i)::uuid, ('20000000-0000-0000-0000-00000000000' || i)::uuid from generate_series(1, 6) i;
insert into public.scd_teams values ('${T1}', '${ORG}', 'T1', 'Team 1', 'ACTIVE');
`;

// 0. Fail closed without r100: the migration stops and leaves nothing behind.
{
  const bare = new PGlite();
  await bare.exec(setup);
  await assert.rejects(() => bare.exec(R113), /r113 prerequisites missing/);
  await bare.exec("rollback");
  const left = await bare.query(`select to_regprocedure('public.scd_my_section_access(uuid)') f`);
  assert.equal(left.rows[0].f, null);
}

const db = new PGlite();
await db.exec(setup);
await db.exec(R100);
await db.exec(R113);
await db.exec(R113); // re-runnable

async function as(n) {
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [n === null ? "" : U(n)]);
}
async function mine(org = ORG) {
  const r = await db.query(`select section_code, level, perimeter from public.scd_my_section_access($1)`, [org]);
  return r.rows.map((x) => `${x.section_code}:${x.level}:${x.perimeter}`);
}
async function can(section, level, site = null) {
  const r = await db.query(`select public.scd_can($1, $2, $3, null, $4, null) v`, [section, level, ORG, site]);
  return r.rows[0].v;
}
const GRANTS = `select public.scd_set_person_grants($1, $2, $3::jsonb, $4)`;

// Example grants saved by the Direzione (role templates loaded on people; example data only).
await as(1);
await db.query(GRANTS, [ORG, P(2), JSON.stringify([{ section: "organigramma", level: "READ", perimeter: "ALL" }]), "consigliere"]);
await db.query(GRANTS, [ORG, P(3), JSON.stringify([{ section: "magazzino", level: "READ", perimeter: "ALL" }]), "poi sospeso"]);
await db.query(GRANTS, [ORG, P(4), JSON.stringify([{ section: "crm", level: "READ", perimeter: "ALL" }]), "collegamento poi in revisione"]);
await db.query(GRANTS, [ORG, P(5), JSON.stringify([
  { section: "mister", level: "WRITE", perimeter: "OWN_TEAMS", team_ids: [T1] },
  { section: "quadro", level: "READ", perimeter: "OWN_TEAMS", team_ids: [T1] },
]), "ruolo Mister"]);
await db.exec(`update public.scd_memberships set active = false where user_id = '${U(3)}'`);
await db.exec(`update public.scd_identity_links set link_state = 'PENDING_REVIEW' where user_id = '${U(4)}'`);

// 1. Each caller sees ONLY their own active grants.
await as(5);
assert.deepEqual(await mine(), ["mister:WRITE:OWN_TEAMS", "quadro:READ:OWN_TEAMS"]);
await as(2);
assert.deepEqual(await mine(), ["organigramma:READ:ALL"]);
await as(6);
assert.deepEqual(await mine(), [], "a tifoso without grants gets nothing");
await as(null);
assert.deepEqual(await mine(), [], "no session, nothing");

// 2. Another organisation: nothing (no membership there).
await as(5);
assert.deepEqual(await mine(OTHER), []);

// 3. Suspended membership and non-verified link: nothing (stricter than scd_can, which still answers for a pending link).
await as(3);
assert.deepEqual(await mine(), []);
await as(4);
assert.deepEqual(await mine(), []);
assert.equal(await can("crm", "READ"), true, "documented gap: scd_can accepts a PENDING_REVIEW link; the app requires a verified identity first");

// 4. Revoked grants disappear.
await as(1);
await db.query(GRANTS, [ORG, P(2), "[]", "tolta"]);
await as(2);
assert.deepEqual(await mine(), []);

// 5. The "ALL only" probe of scd_can (fallback without r113): OWN_TEAMS is true without context, false with the site.
await as(5);
assert.equal(await can("mister", "READ"), true);
assert.equal(await can("mister", "READ", ALL_ONLY_SITE), false);
assert.equal(await can("mister", "APPROVE"), false, "never above the granted level");
await as(1);
await db.query(GRANTS, [ORG, P(2), JSON.stringify([{ section: "organigramma", level: "READ", perimeter: "ALL" }]), "di nuovo"]);
await as(2);
assert.equal(await can("organigramma", "READ", ALL_ONLY_SITE), true);
assert.equal(await can("organigramma", "WRITE", ALL_ONLY_SITE), false);
assert.equal(await can("safeguarding", "READ"), false, "hard-blocked, always false");

// 6. Execute rights: anon cannot run it, authenticated can.
const acl = await db.query(`select has_function_privilege('anon', 'public.scd_my_section_access(uuid)', 'execute') a, has_function_privilege('authenticated', 'public.scd_my_section_access(uuid)', 'execute') b`);
assert.deepEqual(acl.rows[0], { a: false, b: true });

console.log("r113 scd_my_section_access: all assertions passed");
