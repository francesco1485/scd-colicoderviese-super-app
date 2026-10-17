// r143 "Numeri dell'app" page-view counters — behaviour test on an in-memory Postgres (PGlite), no remote database
// touched. Run from the repository root (PGlite is not a dependency of the app, so it is installed in a throwaway folder):
//   npm install --prefix /tmp/scd-pglite @electric-sql/pglite@0.5.10
//   PGLITE_DIR=/tmp/scd-pglite node supabase/tests/r143_app_page_views.pglite.mjs
// Exit code 0 = every assertion passed. PGlite has no pg_cron: section 5 (the daily purge job) is cut here and checked
// on its text by apps/superapp/src/lib/page-views-migration.test.ts; the purge function itself is exercised below.
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
const FULL = readFileSync(fileURLToPath(new URL("../migrations/20261017_r143_app_page_views.sql", import.meta.url)), "utf8");
const CUT = "-- ---------------------------------------------------------------- 5.";
assert.ok(FULL.includes(CUT), "section 5 marker present");
const R143 = `${FULL.slice(0, FULL.indexOf(CUT))}\ncommit;\n`;

const ORG = "00000000-0000-0000-0000-000000000001";
const DIR = "10000000-0000-0000-0000-000000000001"; // Direzione role
const PRE = "10000000-0000-0000-0000-000000000002"; // presidente position
const DG = "10000000-0000-0000-0000-000000000003"; // direttore-generale position
const SEG = "10000000-0000-0000-0000-000000000004"; // Segreteria: no
const FAM = "10000000-0000-0000-0000-000000000005"; // family: no
const OFF = "10000000-0000-0000-0000-000000000006"; // former Direzione, membership inactive: no

const setup = `
create role anon; create role authenticated; create role service_role;
create schema auth;
create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated, service_role;
create type public.scd_role as enum ('USER_BASE','FAMILY','ATHLETE','MISTER','STAFF','MANAGER','SECRETARIAT','REGISTRATION','TOURNAMENTS','DIRECTION');
create table public.scd_organizations (id uuid primary key, name text);
create table public.scd_memberships (organization_id uuid, user_id uuid, role public.scd_role, scope jsonb default '{}'::jsonb, active boolean default true);
create function public.scd_has_org_role(p_organization_id uuid, p_roles public.scd_role[]) returns boolean language sql stable security invoker set search_path = public as $$
  select exists (select 1 from public.scd_memberships m where m.organization_id = p_organization_id and m.user_id = auth.uid() and m.active and m.role = any(p_roles)) $$;
create function public.scd_has_position(p_organization_id uuid, p_positions text[]) returns boolean language sql stable set search_path to 'public' as $$
  select exists (select 1 from public.scd_memberships m where m.organization_id = p_organization_id and m.user_id = (select auth.uid()) and m.active
    and jsonb_typeof(m.scope -> 'positions') = 'array'
    and exists (select 1 from jsonb_array_elements_text(m.scope -> 'positions') p where p = any(p_positions))) $$;
insert into public.scd_organizations (id, name) values ('${ORG}', 'S.C.D. ColicoDerviese');
insert into public.scd_memberships (organization_id, user_id, role, scope, active) values
  ('${ORG}', '${DIR}', 'DIRECTION', '{}', true),
  ('${ORG}', '${PRE}', 'STAFF', '{"positions":["presidente"]}', true),
  ('${ORG}', '${DG}', 'STAFF', '{"positions":["direttore-generale"]}', true),
  ('${ORG}', '${SEG}', 'SECRETARIAT', '{"positions":["segreteria"]}', true),
  ('${ORG}', '${FAM}', 'FAMILY', '{}', true),
  ('${ORG}', '${OFF}', 'DIRECTION', '{}', false);
`;

// 0. Fail closed without the prerequisites: nothing is left behind.
{
  const bare = new PGlite();
  await bare.exec(`create role anon; create role authenticated; create role service_role;`);
  await assert.rejects(() => bare.exec(R143), /r143 prerequisites missing/);
  await bare.exec("rollback");
  const left = await bare.query(`select to_regclass('public.scd_app_page_views_daily') t`);
  assert.equal(left.rows[0].t, null);
}

const db = new PGlite();
await db.exec(setup);
await db.exec(R143);
await db.exec(R143); // idempotent

const sub = async (uid) => db.exec(`select set_config('request.jwt.claim.sub', '${uid ?? ""}', false)`);
const asRole = async (role, uid, q, params = []) => {
  await sub(uid);
  await db.exec(`set role ${role}`);
  try {
    return (await db.query(q, params)).rows;
  } finally {
    await db.exec("reset role");
  }
};
const track = (path, source = "direct", device = "phone", role = "service_role") =>
  asRole(role, null, `select public.scd_track_page_view($1, $2, $3)`, [path, source, device]);
const rows = async () =>
  (await db.query(`select path, source, device, views from public.scd_app_page_views_daily order by path, source, device`)).rows;
const views = async (path, source = "direct", device = "phone") =>
  (await db.query(`select coalesce(sum(views), 0)::int n from public.scd_app_page_views_daily where path = $1 and source = $2 and device = $3`, [path, source, device])).rows[0].n;

// 1. Table locked: RLS on, no policies, anon and authenticated cannot read or write it directly.
const rls = (await db.query(`select relrowsecurity r from pg_class where oid = 'public.scd_app_page_views_daily'::regclass`)).rows[0].r;
assert.equal(rls, true);
assert.equal((await db.query(`select count(*)::int n from pg_policies where tablename = 'scd_app_page_views_daily'`)).rows[0].n, 0);
for (const role of ["anon", "authenticated"]) {
  await assert.rejects(() => asRole(role, null, `select * from public.scd_app_page_views_daily`), /permission denied/);
  await assert.rejects(
    () => asRole(role, null, `insert into public.scd_app_page_views_daily (day, path, source, device, views) values (current_date, '/x', 'direct', 'phone', 9)`),
    /permission denied/,
  );
}

// 2. Only the service role (the app server) counts; anon and authenticated cannot call the RPC with the public key.
for (const role of ["anon", "authenticated"]) {
  await assert.rejects(() => track("/", "direct", "phone", role), /permission denied/);
}
await track("/");
await track("/");
await track("/calendario", "instagram", "phone");
await track("/calendario", "instagram", "phone");
assert.equal(await views("/"), 2);
assert.equal(await views("/calendario", "instagram"), 2);

// 3. Normalisation: query/hash cut, lower case, slashes merged, trailing slash dropped, ids collapsed.
await track("/Calendario/?utm_source=ig#oggi", "instagram");
await track("//eventi//123", "whatsapp", "desktop");
await track("/eventi/5d7c2b2e-1c1a-4f3e-9a51-2b2f8c0d1e3f", "whatsapp", "desktop");
await track("/eventi/Christmas-Lario-Cup-2026", "qr", "tablet");
await track("/eventi/mario%20rossi", "qr", "tablet");
assert.equal(await views("/calendario", "instagram"), 3);
assert.equal(await views("/eventi/:id", "whatsapp", "desktop"), 2);
assert.equal(await views("/eventi/christmas-lario-cup-2026", "qr", "tablet"), 1);
assert.equal(await views("/eventi/:id", "qr", "tablet"), 1);

// 4. Never counted: anything outside the public allowlist (internal, reserved, /entra, /grow, unknown), bad input.
const before = await rows();
for (const p of ["/gestionale", "/gestionale/numeri", "/GESTIONALE/richieste", "/direzione/accessi", "/core", "/accedi", "/quadro",
  "/segreteria/persone", "/tesoreria", "/famiglia", "/pulmini", "/infermeria", "/la-mia-scd", "/aree/x", "/ledwall/player",
  "//gestionale", "/gestionale?x=1", "/entra", "/grow", "/sostieni", "/qualcosa", "/:id"]) await track(p);
await track(`/calendario?${"x".repeat(2100)}`);
await track("calendario");
await track("");
await track(`/${"a".repeat(120)}`);
await track("/a/b/c/d/e/f/g/h/i");
await track("/calendario", "newsletter");
await track("/calendario", "direct", "watch");
await asRole("service_role", null, `select public.scd_track_page_view(null, 'direct', 'phone')`);
assert.deepEqual(await rows(), before);

// 5. Abuse caps: a row stops at 100000; at most 5000 distinct rows per day (existing rows still count).
await db.exec(`update public.scd_app_page_views_daily set views = 100000 where path = '/'`);
await track("/");
assert.equal(await views("/"), 100000);
await db.exec(`insert into public.scd_app_page_views_daily (day, path, source, device, views)
  select (now() at time zone 'Europe/Rome')::date, '/fill/' || g, 'other', 'desktop', 1 from generate_series(1, 5000 - (select count(*) from public.scd_app_page_views_daily)) g`);
await track("/tornei/nuova-pagina");
assert.equal(await views("/tornei/nuova-pagina"), 0);
await track("/calendario", "instagram", "phone");
assert.equal(await views("/calendario", "instagram"), 4);
await db.exec(`delete from public.scd_app_page_views_daily where path like '/fill/%'`);

// 6. Stats: Direzione (role or position) only; others and anon refused; days validated.
const stats = (uid, days) => asRole("authenticated", uid, `select * from public.scd_app_stats($1)`, [days]);
for (const uid of [DIR, PRE, DG]) {
  const r = await stats(uid, 7);
  assert.ok(r.length >= 4, uid);
  assert.deepEqual(Object.keys(r[0]).sort(), ["day", "device", "path", "source", "views"]);
}
for (const uid of [SEG, FAM, OFF, null]) await assert.rejects(() => stats(uid, 7), (e) => e.code === "42501", String(uid));
await assert.rejects(() => asRole("anon", DIR, `select * from public.scd_app_stats(7)`), /permission denied/);
for (const d of [0, 367, -1]) await assert.rejects(() => stats(DIR, d), (e) => e.code === "22023", String(d));
// window: yesterday is inside 2 days, outside 1 day
await db.exec(`insert into public.scd_app_page_views_daily (day, path, source, device, views)
  values ((now() at time zone 'Europe/Rome')::date - 1, '/ieri', 'direct', 'phone', 5)`);
assert.equal((await stats(DIR, 1)).some((r) => r.path === "/ieri"), false);
assert.equal((await stats(DIR, 2)).some((r) => r.path === "/ieri"), true);

// 7. Purge: service role only; deletes rows older than 25 months, keeps the rest.
await db.exec(`insert into public.scd_app_page_views_daily (day, path, source, device, views) values
  (((now() at time zone 'Europe/Rome')::date - interval '25 months' - interval '1 day')::date, '/vecchia', 'direct', 'phone', 3),
  (((now() at time zone 'Europe/Rome')::date - interval '24 months')::date, '/recente', 'direct', 'phone', 3)`);
for (const role of ["anon", "authenticated"]) {
  await assert.rejects(() => asRole(role, DIR, `select public.scd_app_page_views_purge()`), /permission denied/);
}
const purged = await asRole("service_role", null, `select public.scd_app_page_views_purge() n`);
assert.equal(purged[0].n, 1);
assert.equal(await views("/vecchia"), 0);
assert.equal(await views("/recente"), 3);

// 8. Function settings: SECURITY DEFINER with empty search_path; grants as designed.
const fns = (await db.query(`select p.proname, p.prosecdef, p.proconfig from pg_proc p where p.proname in
  ('scd_track_page_view','scd_app_stats','scd_app_page_views_purge') order by p.proname`)).rows;
assert.equal(fns.length, 3);
for (const f of fns) {
  assert.equal(f.prosecdef, true, f.proname);
  assert.deepEqual(f.proconfig, ['search_path=""'], f.proname);
}
const can = async (role, sig) => (await db.query(`select has_function_privilege($1, $2, 'execute') ok`, [role, sig])).rows[0].ok;
assert.equal(await can("anon", "public.scd_track_page_view(text, text, text)"), false);
assert.equal(await can("authenticated", "public.scd_track_page_view(text, text, text)"), false);
assert.equal(await can("service_role", "public.scd_track_page_view(text, text, text)"), true);
assert.equal(await can("anon", "public.scd_app_stats(integer)"), false);
assert.equal(await can("authenticated", "public.scd_app_stats(integer)"), true);
assert.equal(await can("anon", "public.scd_app_page_views_purge()"), false);
assert.equal(await can("authenticated", "public.scd_app_page_views_purge()"), false);
assert.equal(await can("service_role", "public.scd_app_page_views_purge()"), true);

console.log("r143 app page views: all assertions passed");
