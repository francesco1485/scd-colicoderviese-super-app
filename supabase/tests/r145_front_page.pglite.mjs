// r145 «Prima pagina» — behaviour test on an in-memory Postgres (PGlite), no remote database touched.
// Run from the repository root (PGlite is not a dependency of the app):
//   npm install --prefix /tmp/scd-pglite @electric-sql/pglite@0.5.10
//   PGLITE_DIR=/tmp/scd-pglite node supabase/tests/r145_front_page.pglite.mjs
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
const R145 = readFileSync(fileURLToPath(new URL("../migrations/20261017_r145_front_page.sql", import.meta.url)), "utf8");

const ORG = "00000000-0000-0000-0000-000000000001";
const DIR = "10000000-0000-0000-0000-000000000001";
const FAM = "10000000-0000-0000-0000-000000000002";

const schema = `
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
`;

const db = new PGlite();
await db.exec(schema);
await db.exec(R145);
await db.exec(R145); // idempotent

const as = async (uid, q, params = []) => {
  await db.exec(`select set_config('request.jwt.claim.sub', '${uid ?? ""}', false)`);
  return (await db.query(q, params)).rows;
};
const today = (await db.query(`select current_date::text d`)).rows[0].d;
const publish = (items, day = today) =>
  db.query(`select public.scd_front_page_publish('scd-colicoderviese', $1::date, $2::jsonb) n`, [day, JSON.stringify(items)]);
const read = async (day = today) => (await as(null, `select public.scd_public_front_page('scd-colicoderviese', $1::date) r`, [day]))[0].r;
const rejects = async (p, re, msg) => {
  await assert.rejects(p, (e) => re.test(String(e?.message ?? e)), msg);
};

// ---------------------------------------------------------------- grants
const anonExec = await db.query(`select p.proname from pg_proc p where p.proname like 'scd_%front_page%' and has_function_privilege('anon', p.oid, 'execute') order by 1`);
assert.deepEqual(anonExec.rows.map((r) => r.proname), ["scd_public_front_page"], "anon executes only the public read");
const authExec = await db.query(`select p.proname from pg_proc p where p.proname like 'scd_%front_page%' and has_function_privilege('authenticated', p.oid, 'execute') order by 1`);
assert.deepEqual(authExec.rows.map((r) => r.proname), ["scd_front_page_hide", "scd_public_front_page"], "authenticated never publishes");
const tablePriv = await db.query(`select has_table_privilege('anon', 'public.scd_front_page_items', 'select') a, has_table_privilege('authenticated', 'public.scd_front_page_items', 'insert') b`);
assert.deepEqual(tablePriv.rows[0], { a: false, b: false }, "no direct table access");

// ---------------------------------------------------------------- publish and read
const items = [
  { id: "breve-u15", slot: "breve", title: "Domani U15 a Colico", body: "Alle 10:30 con Piantedo.", href: "/calendario", cta: "Vedi", verified: true, source: "calendario pubblico" },
  { id: "apertura-sabato", slot: "apertura", kicker: "Oggi a Colico", title: "Oggi si gioca a Colico", body: "U19 alle 15, U16 alle 18.", href: "/calendario", cta: "Vedi le gare", verified: true, source: "calendario pubblico FIGC/LND" },
  { id: "domanda-sabato", slot: "domanda", title: "Chi vieni a vedere?", options: ["U19", "U16", "U15", "Dall'app"], verified: true, source: "calendario pubblico" },
];
assert.equal((await publish(items)).rows[0].n, 3, "three items stored");
const page = await read();
assert.deepEqual(page.map((i) => i.id), ["apertura-sabato", "breve-u15", "domanda-sabato"], "ordered by slot");
assert.deepEqual(Object.keys(page[0]).sort(), ["body", "cta", "href", "id", "kicker", "options", "slot", "title"], "whitelisted fields only, no source");
assert.deepEqual(page[2].options, ["U19", "U16", "U15", "Dall'app"]);
assert.deepEqual(await read("2000-01-01"), [], "another day is empty");

// ---------------------------------------------------------------- refusals (fail closed)
await rejects(publish([{ ...items[0], verified: false }]), /not verified/, "DA CONFERMARE refused");
await rejects(publish([{ ...items[0], verified: undefined }]), /not verified/, "missing verified refused");
await rejects(publish([{ ...items[0], href: "https://evil.example" }]), /check constraint|violates/, "external link refused");
await rejects(publish([{ ...items[0], href: "//evil.example" }]), /check constraint|violates/, "protocol-relative link refused");
await rejects(publish([{ ...items[0], slot: "banner" }]), /check constraint|violates/, "unknown slot refused");
await rejects(publish([{ ...items[0], title: "t".repeat(81) }]), /check constraint|violates/, "title too long refused");
await rejects(publish([{ ...items[0], source: "" }]), /check constraint|violates/, "source required");
await rejects(publish(items, "2000-01-01"), /out of range/, "old day refused");
await rejects(db.query(`select public.scd_front_page_publish('altro-club', current_date, '[]'::jsonb)`), /unknown organization/);
assert.deepEqual((await read()).map((i) => i.id), ["apertura-sabato", "breve-u15", "domanda-sabato"], "a refused publish leaves the day unchanged");

// ---------------------------------------------------------------- Direzione hides a story; republish keeps it hidden
await rejects(as(FAM, `select public.scd_front_page_hide('scd-colicoderviese', 'breve-u15', current_date, true)`), /not allowed/, "family cannot hide");
await rejects(as(null, `select public.scd_front_page_hide('scd-colicoderviese', 'breve-u15', current_date, true)`), /not allowed/, "anonymous cannot hide");
assert.equal((await as(DIR, `select public.scd_front_page_hide('scd-colicoderviese', 'breve-u15', current_date, true) ok`))[0].ok, true);
assert.deepEqual((await read()).map((i) => i.id), ["apertura-sabato", "domanda-sabato"], "hidden story off the page");
await publish(items);
assert.deepEqual((await read()).map((i) => i.id), ["apertura-sabato", "domanda-sabato"], "stays hidden after the agent republishes");
assert.equal((await as(DIR, `select public.scd_front_page_hide('scd-colicoderviese', 'breve-u15', current_date, false) ok`))[0].ok, true);
assert.equal((await read()).length, 3, "switched on again");
const audit = (await db.query(`select action, payload from public.scd_audit_events order by id`)).rows;
assert.deepEqual(audit.map((a) => a.action), ["FRONT_PAGE_HIDE", "FRONT_PAGE_SHOW"]);
assert.deepEqual(Object.keys(audit[0].payload).sort(), ["day", "item_id"], "audit carries the item id and day only");

// ---------------------------------------------------------------- replace semantics
await publish([items[1]]);
assert.deepEqual((await read()).map((i) => i.id), ["apertura-sabato"], "a new publish replaces the day");

console.log("r145 front page: all assertions passed");
