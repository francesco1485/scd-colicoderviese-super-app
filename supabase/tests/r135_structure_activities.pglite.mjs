// r135 structure activities — behaviour test on an in-memory Postgres (PGlite), no remote database touched.
// Run from the repository root (PGlite is not a dependency of the app, so it is installed in a throwaway folder):
//   npm install --prefix /tmp/scd-pglite @electric-sql/pglite@0.5.10
//   PGLITE_DIR=/tmp/scd-pglite node supabase/tests/r135_structure_activities.pglite.mjs
// Optional first argument: another path of the migration file. Exit code 0 = every assertion passed.
// The r33/r35/r74 objects r135 depends on are created here in their minimal shape.
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
const MIG = process.argv[2] ?? fileURLToPath(new URL("../migrations/20261016_r135_structure_activities.sql", import.meta.url));
const db = new PGlite();
const ORG = "00000000-0000-0000-0000-000000000001";
const OTHER = "00000000-0000-0000-0000-000000000002";
const DIR = "10000000-0000-0000-0000-000000000001"; // Direzione
const RSC = "10000000-0000-0000-0000-000000000002"; // responsabile struttura Colico
const FAM = "10000000-0000-0000-0000-000000000003"; // family
const MIS = "10000000-0000-0000-0000-000000000004"; // mister without structure position
const SEG = "10000000-0000-0000-0000-000000000005"; // segreteria
const RSD = "10000000-0000-0000-0000-000000000006"; // responsabile struttura Dervio (no Dervio rows, UD-156)
const CAM = "10000000-0000-0000-0000-000000000007"; // responsabile campi (no Dervio rows, UD-156)
const RAB = "10000000-0000-0000-0000-000000000008"; // responsabile attivita di base (Dervio rows, UD-156)

await db.exec(`
create role anon; create role authenticated;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create type public.scd_role as enum ('USER_BASE','FAMILY','ATHLETE','MISTER','STAFF','MANAGER','SECRETARIAT','REGISTRATION','TOURNAMENTS','DIRECTION');
create table public.scd_organizations (id uuid primary key, name text);
create table public.scd_memberships (organization_id uuid, user_id uuid, role public.scd_role, scope jsonb default '{}'::jsonb, active boolean default true);
create function public.scd_has_org_role(p_organization_id uuid, p_roles public.scd_role[]) returns boolean language sql stable security invoker set search_path = public as $$
  select exists (select 1 from public.scd_memberships m where m.organization_id = p_organization_id and m.user_id = auth.uid() and m.active and m.role = any(p_roles)) $$;
create function public.scd_has_position(p_organization_id uuid, p_positions text[]) returns boolean language sql stable set search_path to 'public' as $$
  select exists (select 1 from public.scd_memberships m where m.organization_id = p_organization_id and m.user_id = (select auth.uid()) and m.active
    and jsonb_typeof(m.scope -> 'positions') = 'array'
    and exists (select 1 from jsonb_array_elements_text(m.scope -> 'positions') p where p = any(p_positions))) $$;
insert into public.scd_organizations values ('${ORG}', 'S.C.D. ColicoDerviese'), ('${OTHER}', 'Other club');
insert into public.scd_memberships (organization_id, user_id, role, scope) values
  ('${ORG}', '${DIR}', 'DIRECTION', '{}'),
  ('${ORG}', '${RSC}', 'STAFF', '{"positions":["responsabile-struttura-colico"]}'),
  ('${ORG}', '${FAM}', 'FAMILY', '{}'),
  ('${ORG}', '${MIS}', 'MISTER', '{"teams":["u15"]}'),
  ('${ORG}', '${SEG}', 'SECRETARIAT', '{}'),
  ('${ORG}', '${RSD}', 'STAFF', '{"positions":["responsabile-struttura-dervio"]}'),
  ('${ORG}', '${CAM}', 'STAFF', '{"positions":["responsabile-campi"]}'),
  ('${ORG}', '${RAB}', 'STAFF', '{"positions":["responsabile-attivita-base"]}');
`);
const sql = readFileSync(MIG, "utf8");
await db.exec(sql);
await db.exec(sql); // idempotent

const as = async (uid, q, params = []) => {
  await db.exec(`select set_config('request.jwt.claim.sub', '${uid ?? ""}', false)`);
  return (await db.query(q, params)).rows;
};
const fails = async (uid, q, params, code) => {
  await assert.rejects(() => as(uid, q, params), (e) => (code ? e.code === code : true));
};

// RLS on, no policies, no table grants
const rls = await db.query(`select relrowsecurity from pg_class where relname = 'scd_structure_activities'`);
assert.equal(rls.rows[0].relrowsecurity, true);
const pol = await db.query(`select count(*)::int n from pg_policies where tablename = 'scd_structure_activities'`);
assert.equal(pol.rows[0].n, 0);

// Seed (as table owner, i.e. the Direzione in the SQL editor)
const ins = `insert into public.scd_structure_activities (organization_id, site, area, kind, title, starts_at, ends_at, responsible_role, covered, status, notes)
  values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`;
await db.query(ins, [ORG, "COLICO", "CLUB_HOUSE", "ATTIVITA_SERALE", "Serata Club House", "2026-10-16T19:00:00+02:00", "2026-10-16T23:00:00+02:00", "responsabile-club-house", true, "PREVISTA", null]);
await db.query(ins, [ORG, "COLICO", "CAMPO", "APERTURA", "Apertura cancelli", "2026-10-17T07:30:00+02:00", "2026-10-17T08:00:00+02:00", "responsabile-struttura-colico", false, "PREVISTA", "chiavi in segreteria"]);
await db.query(ins, [ORG, "DERVIO", "SPOGLIATOI", "CHIUSURA", "Chiusura spogliatoi", "2026-10-18T22:00:00+02:00", "2026-10-18T22:30:00+02:00", null, false, "ANNULLATA", null]);
await db.query(ins, [ORG, "COLICO", "PALESTRA", "EVENTO", "Fuori settimana", "2026-11-30T19:00:00+01:00", "2026-11-30T20:00:00+01:00", null, false, "PREVISTA", null]);
await db.query(ins, [OTHER, "COLICO", "CAMPO", "EVENTO", "Altro club", "2026-10-16T19:00:00+02:00", "2026-10-16T20:00:00+02:00", null, false, "PREVISTA", null]);

// No personal data in title/notes, valid vocabularies and times
const bad = async (params) => assert.rejects(() => db.query(ins, params));
const base = [ORG, "COLICO", "CAMPO", "EVENTO", "Evento", "2026-10-16T19:00:00+02:00", "2026-10-16T20:00:00+02:00", null, false, "PREVISTA", null];
const w = (i, v) => base.map((x, j) => (j === i ? v : x));
await bad(w(10, "chiamare mario.rossi@example.com"));
await bad(w(10, "tel 333 123 4567"));
await bad(w(4, "Chiama 3331234567"));
await bad(w(10, "tel 333.123.4567"));
await bad(w(10, "tel 333/123/4567"));
await bad(w(4, "Chiama 0341-93.12.34"));
await bad(w(1, "LECCO"));
await bad(w(2, "BAR"));
await bad(w(3, "PARTITA"));
await bad(w(7, "Mario Rossi"));
await bad(w(6, "2026-10-16T18:00:00+02:00")); // ends before start
await bad(w(6, "2026-10-18T20:00:00+02:00")); // longer than 24 hours

// Read function: staff only, own organization, bounded range, no created_by
const call = `select public.scd_structure_week($1, $2::date, $3::date) as r`;
const week = async (uid, from = "2026-10-12", to = "2026-10-18") => (await as(uid, call, [ORG, from, to]))[0].r;
const dirWeek = await week(DIR);
assert.deepEqual(Object.keys(dirWeek).sort(), ["activities", "readableSites"]);
assert.deepEqual(dirWeek.readableSites, ["COLICO", "DERVIO"]);
assert.equal(dirWeek.activities.length, 3);
assert.deepEqual(dirWeek.activities.map((x) => x.title), ["Serata Club House", "Apertura cancelli", "Chiusura spogliatoi"]);
for (const x of dirWeek.activities) {
  assert.equal("created_by" in x || "createdBy" in x, false);
  assert.deepEqual(Object.keys(x).sort(), ["area", "covered", "endsAt", "id", "kind", "notes", "responsibleRole", "site", "startsAt", "status", "title"]);
}
// Per site (UD-156): Dervio only for DIRECTION/SECRETARIAT roles and presidente, DG, coordinatore, responsabile attivita base
const sitesOf = (w) => [...new Set(w.activities.map((x) => x.site))].sort();
const segWeek = await week(SEG);
assert.deepEqual(segWeek.readableSites, ["COLICO", "DERVIO"]);
assert.equal(segWeek.activities.length, 3);
const rabWeek = await week(RAB);
assert.deepEqual(rabWeek.readableSites, ["COLICO", "DERVIO"]);
assert.equal(rabWeek.activities.length, 3);
assert.deepEqual(sitesOf(rabWeek), ["COLICO", "DERVIO"]);
for (const [who, uid] of [["responsabile-struttura-colico", RSC], ["responsabile-struttura-dervio", RSD], ["responsabile-campi", CAM]]) {
  const w = await week(uid);
  assert.deepEqual(w.readableSites, ["COLICO"], who);
  assert.equal(w.activities.length, 2, who);
  assert.deepEqual(sitesOf(w), ["COLICO"], who);
  assert.equal(w.activities.some((x) => x.site === "DERVIO"), false, who);
}
assert.equal((await week(DIR, "2026-11-01", "2026-11-07")).activities.length, 0);
// Per-site check called by the owner for each user (the function itself)
const site = async (uid, s) => (await as(uid, `select public.scd_structure_reader_site($1, $2) as ok`, [ORG, s]))[0].ok;
assert.equal(await site(DIR, "DERVIO"), true);
assert.equal(await site(SEG, "DERVIO"), true);
assert.equal(await site(RAB, "DERVIO"), true);
assert.equal(await site(RSD, "DERVIO"), false);
assert.equal(await site(CAM, "DERVIO"), false);
assert.equal(await site(RSD, "COLICO"), true);
assert.equal(await site(DIR, "LECCO"), false);
assert.equal(await site(DIR, null), false);
assert.equal(await site(FAM, "COLICO"), false);
await fails(FAM, call, [ORG, "2026-10-12", "2026-10-18"], "42501");
await fails(MIS, call, [ORG, "2026-10-12", "2026-10-18"], "42501");
await fails(null, call, [ORG, "2026-10-12", "2026-10-18"], "42501");
await fails(DIR, call, [OTHER, "2026-10-12", "2026-10-18"], "42501");
await fails(DIR, call, [ORG, "2026-10-01", "2026-12-31"], "22023");
await fails(DIR, call, [ORG, "2026-10-18", "2026-10-12"], "22023");

// Rome day boundaries: an activity at 00:30 Rome on Monday belongs to Monday, not to the previous Sunday
await db.query(ins, [ORG, "DERVIO", "CAMPO", "TURNO_VOLONTARIO", "Turno notte", "2026-10-19T00:30:00+02:00", "2026-10-19T01:30:00+02:00", null, false, "PREVISTA", null]);
assert.equal((await week(DIR)).activities.length, 3);
assert.equal((await week(DIR, "2026-10-19", "2026-10-25")).activities.length, 1);
assert.equal((await week(RSD, "2026-10-19", "2026-10-25")).activities.length, 0);
assert.deepEqual((await week(RSD, "2026-10-19", "2026-10-25")).readableSites, ["COLICO"]);

// Grants: anon cannot execute, authenticated can
const g = await db.query(`select has_function_privilege('anon', 'public.scd_structure_week(uuid, date, date)', 'execute') a,
  has_function_privilege('authenticated', 'public.scd_structure_week(uuid, date, date)', 'execute') b,
  has_table_privilege('authenticated', 'public.scd_structure_activities', 'select') c,
  has_table_privilege('anon', 'public.scd_structure_activities', 'select') d`);
assert.deepEqual(g.rows[0], { a: false, b: true, c: false, d: false });

// The reader check is internal: neither anon nor authenticated may call it directly (only scd_structure_week does)
const r = await db.query(`select has_function_privilege('anon', 'public.scd_structure_reader(uuid)', 'execute') a,
  has_function_privilege('authenticated', 'public.scd_structure_reader(uuid)', 'execute') b,
  has_function_privilege('anon', 'public.scd_structure_reader_site(uuid, text)', 'execute') c,
  has_function_privilege('authenticated', 'public.scd_structure_reader_site(uuid, text)', 'execute') d`);
assert.deepEqual(r.rows[0], { a: false, b: false, c: false, d: false });

// As the real authenticated role: the week still answers (SECURITY DEFINER), the reader is refused
await db.exec(`select set_config('request.jwt.claim.sub', '${DIR}', false); set role authenticated;`);
assert.equal((await db.query(call, [ORG, "2026-10-12", "2026-10-18"])).rows[0].r.activities.length, 3);
await assert.rejects(() => db.query(`select public.scd_structure_reader($1) as ok`, [ORG]), (e) => e.code === "42501");
await assert.rejects(() => db.query(`select public.scd_structure_reader_site($1, 'DERVIO') as ok`, [ORG]), (e) => e.code === "42501");
await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${RSD}', false); set role authenticated;`);
const rsdAuth = (await db.query(call, [ORG, "2026-10-12", "2026-10-18"])).rows[0].r;
assert.deepEqual(rsdAuth.readableSites, ["COLICO"]);
assert.equal(rsdAuth.activities.some((x) => x.site === "DERVIO"), false);
await assert.rejects(() => db.query(`select count(*) from public.scd_structure_activities`), (e) => e.code === "42501");
await db.exec(`reset role;`);

console.log("r135 structure activities: all assertions passed");
