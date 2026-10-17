// r120 «Spegni notizia» — behaviour test on an in-memory Postgres (PGlite), no remote database touched.
//   npm install --prefix /tmp/scd-pglite @electric-sql/pglite@0.5.10
//   PGLITE_DIR=/tmp/scd-pglite node supabase/tests/r120_front_page_switch.pglite.mjs
// Exit code 0 = every assertion passed. Every id and organisation below is invented.
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
const R120 = readFileSync(fileURLToPath(new URL("../migrations/20261017_r120_front_page_switch.sql", import.meta.url)), "utf8");

const ORG = "00000000-0000-0000-0000-000000000001";
const DIR = "10000000-0000-0000-0000-000000000001";
const FAM = "10000000-0000-0000-0000-000000000002";

const db = new PGlite();
await db.exec(`
create role anon; create role authenticated; create role service_role;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create type public.scd_role as enum ('USER_BASE','FAMILY','ATHLETE','MISTER','STAFF','MANAGER','SECRETARIAT','REGISTRATION','TOURNAMENTS','DIRECTION');
create table public.scd_organizations (id uuid primary key, name text, slug text unique);
create table public.scd_memberships (organization_id uuid, user_id uuid, role public.scd_role, active boolean default true);
create table public.scd_audit_events (id bigint generated always as identity primary key, organization_id uuid, actor_user_id uuid, action text, entity_type text, entity_id uuid, payload jsonb not null default '{}'::jsonb);
create function public.scd_has_org_role(p_organization_id uuid, p_roles public.scd_role[]) returns boolean language sql stable set search_path = public as $$
  select exists (select 1 from public.scd_memberships m where m.organization_id = p_organization_id and m.user_id = auth.uid() and m.active and m.role = any(p_roles)) $$;
insert into public.scd_organizations values ('${ORG}', 'Club di prova', 'scd-colicoderviese');
insert into public.scd_memberships values ('${ORG}', '${DIR}', 'DIRECTION', true), ('${ORG}', '${FAM}', 'FAMILY', true);
`);
await db.exec(R120);
await db.exec(R120); // idempotent

const as = async (uid, q, params = []) => {
  await db.exec(`select set_config('request.jwt.claim.sub', '${uid ?? ""}', false)`);
  return (await db.query(q, params)).rows;
};
const set = (uid, item, hidden, day = "current_date") =>
  as(uid, `select public.scd_front_page_set_hidden('scd-colicoderviese', ${day}, $1, $2) ok`, [item, hidden]);
const hidden = async (day = "current_date") => (await as(null, `select public.scd_public_front_page_hidden('scd-colicoderviese', ${day}) r`))[0].r;
const rejects = (p, re, msg) => assert.rejects(p, (e) => re.test(String(e?.message ?? e)), msg);

// grants
const exec = async (role) => (await db.query(`select p.proname from pg_proc p where p.proname like 'scd_%front_page%' and has_function_privilege('${role}', p.oid, 'execute') order by 1`)).rows.map((r) => r.proname);
assert.deepEqual(await exec("anon"), ["scd_public_front_page_hidden"], "anon reads only");
assert.deepEqual(await exec("authenticated"), ["scd_front_page_set_hidden", "scd_public_front_page_hidden"]);
const priv = (await db.query(`select has_table_privilege('anon', 'public.scd_front_page_switch', 'select') a, has_table_privilege('authenticated', 'public.scd_front_page_switch', 'insert') b`)).rows[0];
assert.deepEqual(priv, { a: false, b: false }, "no direct table access");

// only the Direzione switches
await rejects(set(FAM, "breve-u15", true), /not allowed/, "family cannot");
await rejects(set(null, "breve-u15", true), /not allowed/, "anonymous cannot");
assert.deepEqual(await hidden(), []);
assert.equal((await set(DIR, "breve-u15", true))[0].ok, true);
assert.equal((await set(DIR, "breve-u15", true))[0].ok, true, "idempotent");
assert.equal((await set(DIR, "*", true))[0].ok, true, "whole page");
assert.deepEqual(await hidden(), ["*", "breve-u15"]);
assert.deepEqual(await hidden("current_date + 1"), [], "other day untouched");
assert.equal((await set(DIR, "*", false))[0].ok, true, "switch on again");
assert.deepEqual(await hidden(), ["breve-u15"]);

// validation
await rejects(set(DIR, "Bad Id", true), /bad item/);
await rejects(set(DIR, "x", true, "current_date - 30"), /out of range/);

// audit: ids and day only
const audit = (await db.query(`select action, payload from public.scd_audit_events order by id`)).rows;
assert.deepEqual(audit.map((a) => a.action), ["FRONT_PAGE_HIDE", "FRONT_PAGE_HIDE", "FRONT_PAGE_HIDE", "FRONT_PAGE_SHOW"]);
assert.deepEqual(Object.keys(audit[0].payload).sort(), ["day", "item_id"]);

console.log("r120 front page switch: all assertions passed");
