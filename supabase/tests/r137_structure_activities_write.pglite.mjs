// r137 structure activities write path — behaviour test on an in-memory Postgres (PGlite), no remote database touched.
// Run from the repository root (PGlite is not a dependency of the app, so it is installed in a throwaway folder):
//   npm install --prefix /tmp/scd-pglite @electric-sql/pglite@0.5.10
//   PGLITE_DIR=/tmp/scd-pglite node supabase/tests/r137_structure_activities_write.pglite.mjs
// Exit code 0 = every assertion passed. r79 (work queue) and r135 (activities) are loaded from their real files; the
// r33/r35/r74/r78 objects they depend on are created here in their minimal shape.
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
const R79 = mig("20261012_r79_proposals.sql");
const R135 = mig("20261016_r135_structure_activities.sql");
const R137 = mig("20261016_r137_structure_activities_write.sql");

const ORG = "00000000-0000-0000-0000-000000000001";
const OTHER = "00000000-0000-0000-0000-000000000002";
const DIR = "10000000-0000-0000-0000-000000000001"; // Direzione role
const PRE = "10000000-0000-0000-0000-000000000002"; // presidente position (STAFF role)
const DG = "10000000-0000-0000-0000-000000000003"; // direttore-generale position
const SEG = "10000000-0000-0000-0000-000000000004"; // Segreteria: reads, never writes
const RAB = "10000000-0000-0000-0000-000000000005"; // responsabile attivita di base: reads Dervio, never writes
const RSC = "10000000-0000-0000-0000-000000000006"; // responsabile struttura Colico: never writes
const FAM = "10000000-0000-0000-0000-000000000007"; // family
const TES = "10000000-0000-0000-0000-000000000008"; // tesoreria: reads the work queue (scd_fee_office) but NOT Dervio rows

const setup = `
create role anon; create role authenticated;
create schema auth;
create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create type public.scd_role as enum ('USER_BASE','FAMILY','ATHLETE','MISTER','STAFF','MANAGER','SECRETARIAT','REGISTRATION','TOURNAMENTS','DIRECTION');
create table public.scd_organizations (id uuid primary key, name text, created_at timestamptz default now());
create table public.scd_memberships (organization_id uuid, user_id uuid, role public.scd_role, scope jsonb default '{}'::jsonb, active boolean default true);
create function public.scd_has_org_role(p_organization_id uuid, p_roles public.scd_role[]) returns boolean language sql stable security invoker set search_path = public as $$
  select exists (select 1 from public.scd_memberships m where m.organization_id = p_organization_id and m.user_id = auth.uid() and m.active and m.role = any(p_roles)) $$;
create function public.scd_has_position(p_organization_id uuid, p_positions text[]) returns boolean language sql stable set search_path to 'public' as $$
  select exists (select 1 from public.scd_memberships m where m.organization_id = p_organization_id and m.user_id = (select auth.uid()) and m.active
    and jsonb_typeof(m.scope -> 'positions') = 'array'
    and exists (select 1 from jsonb_array_elements_text(m.scope -> 'positions') p where p = any(p_positions))) $$;
create table public.scd_fee_positions (organization_id uuid, source_record_id text, active boolean, status_group text);
create function public.scd_fee_office(p_organization_id uuid) returns boolean language sql stable security definer set search_path to 'public' as $$
  select public.scd_has_org_role(p_organization_id, array['DIRECTION','SECRETARIAT']::public.scd_role[])
    or public.scd_has_position(p_organization_id, array['tesoreria','segreteria','segreteria-presenza','segreteria-remoto','direzione','presidente','direttore-generale']) $$;
insert into public.scd_organizations (id, name) values ('${ORG}', 'S.C.D. ColicoDerviese'), ('${OTHER}', 'Other club');
insert into auth.users (id) values ('${DIR}'), ('${PRE}'), ('${DG}'), ('${SEG}'), ('${RAB}'), ('${RSC}'), ('${FAM}'), ('${TES}');
insert into public.scd_memberships (organization_id, user_id, role, scope) values
  ('${ORG}', '${DIR}', 'DIRECTION', '{}'),
  ('${ORG}', '${PRE}', 'STAFF', '{"positions":["presidente"]}'),
  ('${ORG}', '${DG}', 'STAFF', '{"positions":["direttore-generale"]}'),
  ('${ORG}', '${SEG}', 'SECRETARIAT', '{}'),
  ('${ORG}', '${RAB}', 'STAFF', '{"positions":["responsabile-attivita-base"]}'),
  ('${ORG}', '${RSC}', 'STAFF', '{"positions":["responsabile-struttura-colico"]}'),
  ('${ORG}', '${FAM}', 'FAMILY', '{}'),
  ('${ORG}', '${TES}', 'STAFF', '{"positions":["tesoreria"]}');
`;

// 0. Fail closed without the work queue (r79): the migration stops and leaves nothing behind.
{
  const bare = new PGlite();
  await bare.exec(setup);
  await bare.exec(R135);
  await assert.rejects(() => bare.exec(R137), /r137 prerequisites missing/);
  await bare.exec("rollback");
  const left = await bare.query(`select to_regclass('public.scd_structure_activity_events') t, to_regprocedure('public.scd_structure_activity_create(uuid, jsonb)') f`);
  assert.deepEqual(left.rows[0], { t: null, f: null });
}

const db = new PGlite();
await db.exec(setup);
await db.exec(R79);
await db.exec(R135);
await db.exec(R137);
await db.exec(R137); // idempotent

const as = async (uid, q, params = []) => {
  await db.exec(`select set_config('request.jwt.claim.sub', '${uid ?? ""}', false)`);
  return (await db.query(q, params)).rows;
};
const today = (await db.query(`select to_char((now() at time zone 'Europe/Rome')::date, 'YYYY-MM-DD') d`)).rows[0].d;
const plusDays = (iso, n) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const day = plusDays(today, 2);
const draft = (over = {}) => ({
  site: "DERVIO",
  area: "CLUB_HOUSE",
  kind: "ATTIVITA_SERALE",
  title: "Serata soci",
  date: day,
  start: "19:00",
  end: "23:00",
  responsibleRole: "responsabile-club-house",
  covered: false,
  notes: null,
  ...over,
});
const create = async (uid, d, org = ORG) => (await as(uid, `select public.scd_structure_activity_create($1, $2::jsonb) r`, [org, JSON.stringify(d)]))[0].r;
const update = async (uid, id, d) => (await as(uid, `select public.scd_structure_activity_update($1, $2, $3::jsonb) r`, [ORG, id, JSON.stringify(d)]))[0].r;
const cancel = async (uid, id, reason = null) => (await as(uid, `select public.scd_structure_activity_cancel($1, $2, $3) r`, [ORG, id, reason]))[0].r;
const access = async (uid, org = ORG) => (await as(uid, `select public.scd_structure_write_access($1) r`, [org]))[0].r;
const denied = async (fn) => assert.rejects(fn, (e) => e.code === "42501");
const notices = async () =>
  (await db.query(`select * from public.scd_proposals where machine = 'G04' order by created_at, title`)).rows;
const events = async () => (await db.query(`select * from public.scd_structure_activity_events order by id`)).rows;

// 1. Access probe (UD-159): Direzione, presidente, DG yes; Segreteria, Dervio readers, structure staff, family, anon no.
for (const uid of [DIR, PRE, DG]) assert.deepEqual(await access(uid), { canWrite: true }, uid);
for (const uid of [SEG, RAB, RSC, FAM, null]) assert.deepEqual(await access(uid), { canWrite: false }, String(uid));
assert.deepEqual(await access(DIR, OTHER), { canWrite: false });

// 2. Non-writers are refused with 42501 and nothing is written.
for (const uid of [SEG, RAB, RSC, FAM, null]) await denied(() => create(uid, draft()));
await denied(() => create(DIR, draft(), OTHER));
assert.equal((await db.query(`select count(*)::int n from public.scd_structure_activities`)).rows[0].n, 0);
assert.equal((await notices()).length, 0);

// 3. Create by the DG: row, audit, Segreteria notice in the existing queue.
const c1 = await create(DG, draft());
assert.equal(c1.ok, true);
assert.equal(c1.noticed, true);
const row = (await db.query(`select *, to_char(starts_at at time zone 'Europe/Rome', 'YYYY-MM-DD HH24:MI') s,
  to_char(ends_at at time zone 'Europe/Rome', 'YYYY-MM-DD HH24:MI') e from public.scd_structure_activities where id = $1`, [c1.id])).rows[0];
assert.equal(row.s, `${day} 19:00`);
assert.equal(row.e, `${day} 23:00`);
assert.equal(row.status, "PREVISTA");
assert.equal(row.created_by, DG);
let ns = await notices();
assert.equal(ns.length, 1);
assert.equal(ns[0].area, "segreteria");
assert.equal(ns[0].kind, "ALTRO");
assert.equal(ns[0].status, "NEW");
assert.equal(ns[0].sensitivity, "INTERNO");
assert.equal(ns[0].source_kind, "MANUAL");
assert.equal(ns[0].target_ref, c1.id);
assert.equal(ns[0].title, "Struttura Dervio: nuova attività — apri Attività in struttura");
// Dervio notice is generic (UD-156): no title, time or kind anywhere in the queue row.
assert.deepEqual(Object.keys(ns[0].suggested).sort(), ["action", "activityId", "change", "site"]);
assert.equal(JSON.stringify(ns[0]).includes("Serata soci"), false);
assert.equal(ns[0].suggested.action, "structure_activity_notice");
assert.equal(ns[0].suggested.change, "CREATE");
const pev = (await db.query(`select actor, action from public.scd_proposal_events where proposal_id = $1`, [ns[0].id])).rows;
assert.deepEqual(pev, [{ actor: DG, action: "CREATED" }]);
let ev = await events();
assert.equal(ev.length, 1);
assert.equal(ev[0].action, "CREATE");
assert.equal(ev[0].actor, DG);
assert.equal(ev[0].before, null);
assert.equal(ev[0].notice_id, ns[0].id);
assert.equal("created_by" in ev[0].after, false);

// The Segreteria sees the notice in /gestionale/coda (scd_proposal_queue) and the activity in the week (r135).
const queue = (await as(SEG, `select public.scd_proposal_queue($1) r`, [ORG]))[0].r;
assert.equal(queue.items.filter((i) => i.machine === "G04").length, 1);
const segWeek = (await as(SEG, `select public.scd_structure_week($1, $2::date, $3::date) r`, [ORG, today, plusDays(today, 6)]))[0].r;
assert.equal(segWeek.activities.length, 1);

// 4. Validation (no contact data, vocabularies, Rome times, range): nothing written, plain codes.
const bad = [
  [{ site: "LECCO" }, "site"],
  [{ area: "BAR" }, "area"],
  [{ kind: "PARTITA" }, "kind"],
  [{ title: "x" }, "title"],
  [{ title: "Chiamare mario.rossi@example.com" }, "contact"],
  [{ title: "Chiama 333 123 4567" }, "contact"],
  [{ notes: "tel 333.123.4567" }, "contact"],
  [{ notes: "x".repeat(301) }, "notes"],
  [{ responsibleRole: "Mario Rossi" }, "role"],
  [{ date: "2026-02-30" }, "date"],
  [{ date: "16/10/2026" }, "date"],
  [{ date: plusDays(today, -30) }, "date_range"],
  [{ date: plusDays(today, 400) }, "date_range"],
  [{ start: "25:00" }, "time"],
  [{ start: "19:00", end: "19:00" }, "time"],
  [{ covered: "si" }, "input"],
];
for (const [over, code] of bad) assert.deepEqual(await create(DIR, draft(over)), { ok: false, code }, JSON.stringify(over));
assert.equal((await db.query(`select count(*)::int n from public.scd_structure_activities`)).rows[0].n, 1);
assert.equal((await notices()).length, 1);

// An end not after the start is the next day (e.g. 22:00-01:00), at most 24 hours.
const night = await create(PRE, draft({ site: "COLICO", area: "CAMPO", kind: "CHIUSURA", title: "Chiusura notte", start: "22:00", end: "01:00", responsibleRole: null }));
assert.equal(night.ok, true);
const n2 = (await db.query(`select to_char(ends_at at time zone 'Europe/Rome', 'YYYY-MM-DD HH24:MI') e from public.scd_structure_activities where id = $1`, [night.id])).rows[0];
assert.equal(n2.e, `${plusDays(day, 1)} 01:00`);
// A Colico notice names the activity (Colico readers include the whole office).
const colicoNotice = (await notices()).find((n) => n.target_ref === night.id);
assert.match(colicoNotice.title, /^Struttura Colico: nuova attività «Chiusura notte» \d{2}\/\d{2} 22:00$/);
assert.equal(colicoNotice.suggested.kind, "CHIUSURA");
assert.equal((await notices()).length, 2);

// 5. Update: only by writers; nothing changed = nothing written; a real change = audit + notice.
await denied(() => update(SEG, c1.id, draft({ covered: true })));
await denied(() => update(RAB, c1.id, draft({ covered: true })));
const same = await update(DIR, c1.id, draft());
assert.deepEqual(same, { ok: true, id: c1.id, unchanged: true, noticed: false });
assert.equal((await notices()).length, 2);
const u1 = await update(DIR, c1.id, draft({ covered: true, start: "20:00" }));
assert.deepEqual(u1, { ok: true, id: c1.id, noticed: true });
ns = await notices();
assert.equal(ns.length, 3);
assert.ok(ns.some((n) => n.title === "Struttura Dervio: attività modificata — apri Attività in struttura"));
ev = await events();
const upd = ev.find((e) => e.action === "UPDATE");
assert.equal(upd.before.covered, false);
assert.equal(upd.after.covered, true);
assert.equal(upd.actor, DIR);
assert.deepEqual(await update(DIR, "20000000-0000-0000-0000-000000000009", draft()), { ok: false, code: "not_found" });
assert.deepEqual(await update(DIR, c1.id, draft({ title: "a@b.it" })), { ok: false, code: "contact" });

// 6. Cancel: reason checked, audit + notice with the reason, never edited again, never deleted.
await denied(() => cancel(SEG, c1.id));
assert.deepEqual(await cancel(DG, c1.id, "chiamare 333 123 4567"), { ok: false, code: "contact" });
assert.deepEqual(await cancel(DG, c1.id, "Pioggia prevista"), { ok: true, id: c1.id, noticed: true });
assert.deepEqual(await cancel(DG, c1.id), { ok: false, code: "cancelled" });
assert.deepEqual(await update(DG, c1.id, draft()), { ok: false, code: "cancelled" });
ns = await notices();
assert.equal(ns.length, 4);
const cn = ns.find((n) => n.suggested.change === "CANCEL");
assert.equal(cn.title, "Struttura Dervio: attività annullata — apri Attività in struttura");
assert.equal(cn.reason.includes("Pioggia"), false);
assert.equal((await events()).find((e) => e.action === "CANCEL").reason, "Pioggia prevista");
assert.equal((await db.query(`select status from public.scd_structure_activities where id = $1`, [c1.id])).rows[0].status, "ANNULLATA");

// 6b. Tesoreria reads the queue but not Dervio: no Dervio title, day or reason reaches it; Colico still does.
const tesQueue = JSON.stringify((await as(TES, `select public.scd_proposal_queue($1) r`, [ORG]))[0].r);
assert.ok(tesQueue.includes("Struttura Dervio"));
for (const leak of ["Serata soci", "Pioggia", "ATTIVITA_SERALE"]) assert.equal(tesQueue.includes(leak), false, leak);
assert.ok(tesQueue.includes("Chiusura notte"));
assert.equal((await as(TES, `select public.scd_structure_write_access($1) r`, [ORG]))[0].r.canWrite, false);

// 7. Audit is append-only, even for the owner.
await assert.rejects(() => db.query(`update public.scd_structure_activity_events set actor = null`), /append-only/);
await assert.rejects(() => db.query(`delete from public.scd_structure_activity_events`), /append-only/);

// 8. Grants: the write functions and the probe for authenticated only; internals for nobody; tables closed.
const fn = async (role, sig) => (await db.query(`select has_function_privilege($1, $2, 'execute') ok`, [role, sig])).rows[0].ok;
for (const sig of [
  "public.scd_structure_activity_create(uuid, jsonb)",
  "public.scd_structure_activity_update(uuid, uuid, jsonb)",
  "public.scd_structure_activity_cancel(uuid, uuid, text)",
  "public.scd_structure_write_access(uuid)",
]) {
  assert.equal(await fn("anon", sig), false, sig);
  assert.equal(await fn("authenticated", sig), true, sig);
}
for (const sig of [
  "public.scd_structure_writer(uuid)",
  "public.scd_structure_activity_clean(jsonb)",
  "public.scd_structure_activity_json(public.scd_structure_activities)",
  "public.scd_structure_notify(public.scd_structure_activities, text, text)",
  "public.scd_structure_activity_events_block_change()",
]) {
  assert.equal(await fn("anon", sig), false, sig);
  assert.equal(await fn("authenticated", sig), false, sig);
}
const t = await db.query(`select has_table_privilege('authenticated', 'public.scd_structure_activity_events', 'select') a,
  has_table_privilege('authenticated', 'public.scd_structure_activities', 'insert') b,
  has_table_privilege('anon', 'public.scd_structure_activity_events', 'select') c,
  (select relrowsecurity from pg_class where relname = 'scd_structure_activity_events') rls,
  (select count(*)::int from pg_policies where tablename = 'scd_structure_activity_events') pol`);
assert.deepEqual(t.rows[0], { a: false, b: false, c: false, rls: true, pol: 0 });

// 9. As the real authenticated role: the writer creates through the function (SECURITY DEFINER), the tables stay closed,
//    a non-writer is refused.
await db.exec(`select set_config('request.jwt.claim.sub', '${PRE}', false); set role authenticated;`);
const viaRole = (await db.query(`select public.scd_structure_activity_create($1, $2::jsonb) r`, [ORG, JSON.stringify(draft({ site: "COLICO", area: "PALESTRA", kind: "EVENTO", title: "Palestra aperta" }))])).rows[0].r;
assert.equal(viaRole.ok, true);
await assert.rejects(() => db.query(`select count(*) from public.scd_structure_activity_events`), (e) => e.code === "42501");
await assert.rejects(() => db.query(`insert into public.scd_structure_activities (organization_id, site, area, kind, title, starts_at, ends_at) values ($1, 'COLICO', 'CAMPO', 'EVENTO', 'Diretto', now(), now() + interval '1 hour')`, [ORG]), (e) => e.code === "42501");
await assert.rejects(() => db.query(`select public.scd_structure_writer($1)`, [ORG]), (e) => e.code === "42501");
await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${RAB}', false); set role authenticated;`);
await assert.rejects(() => db.query(`select public.scd_structure_activity_create($1, $2::jsonb) r`, [ORG, JSON.stringify(draft())]), (e) => e.code === "42501");
assert.deepEqual((await db.query(`select public.scd_structure_write_access($1) r`, [ORG])).rows[0].r, { canWrite: false });
await db.exec(`reset role;`);
assert.equal((await notices()).length, 5);

console.log("r137 structure activities write: all assertions passed");
