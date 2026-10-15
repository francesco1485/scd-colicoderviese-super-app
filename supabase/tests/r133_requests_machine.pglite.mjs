// r133 request machine — behaviour test on an in-memory Postgres (PGlite), no remote database touched.
// Run from the repository root (PGlite is not a dependency of the app, so it is installed in a throwaway folder):
//   npm install --prefix /tmp/scd-pglite @electric-sql/pglite@0.5.10
//   PGLITE_DIR=/tmp/scd-pglite node supabase/tests/r133_requests_machine.pglite.mjs
// Optional first argument: another path of the migration file. Exit code 0 = every assertion passed.
// The r33/r35/r74 objects r133 depends on are created here in their minimal shape.
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
const MIG = process.argv[2] ?? fileURLToPath(new URL("../migrations/20261015_r133_requests_machine.sql", import.meta.url));
const db = new PGlite();
const ORG = "00000000-0000-0000-0000-000000000001";
const SEG = "10000000-0000-0000-0000-000000000001";
const RAB = "10000000-0000-0000-0000-000000000002"; // responsabile attivita di base
const DG = "10000000-0000-0000-0000-000000000003"; // direttore generale
const DIR = "10000000-0000-0000-0000-000000000004"; // direzione
const FAM = "10000000-0000-0000-0000-000000000005"; // family
const MGR = "10000000-0000-0000-0000-000000000006"; // dirigente annata (no longer confirms)

await db.exec(`
create role anon; create role authenticated;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create type public.scd_role as enum ('USER_BASE','FAMILY','ATHLETE','MISTER','STAFF','MANAGER','SECRETARIAT','REGISTRATION','TOURNAMENTS','DIRECTION');
create type public.scd_event_status as enum ('PLANNED','CONFIRMED','CHANGED','POSTPONED','CANCELLED','COMPLETED');
create type public.scd_event_visibility as enum ('PUBLIC','TEAM','FAMILY','STAFF','DIRECTION');
create table public.scd_organizations (id uuid primary key, name text);
create table public.scd_memberships (organization_id uuid, user_id uuid, role public.scd_role, scope jsonb default '{}'::jsonb, active boolean default true);
create table public.scd_teams (id uuid primary key default gen_random_uuid(), organization_id uuid, code text, name text, created_at timestamptz default now());
create table public.scd_events (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.scd_organizations(id),
  season_id uuid, event_type text not null, title text not null, starts_at timestamptz not null, ends_at timestamptz,
  status public.scd_event_status not null default 'PLANNED', visibility public.scd_event_visibility not null default 'TEAM',
  location_text text, source_id text not null default 'UNVERIFIED', source_record_id text, source_verified_at timestamptz,
  source_confidence smallint, metadata jsonb not null default '{}'::jsonb, created_at timestamptz default now(), updated_at timestamptz default now());
create table public.scd_event_scopes (id uuid primary key default gen_random_uuid(), organization_id uuid, event_id uuid references public.scd_events(id),
  team_id uuid, family_id uuid, person_id uuid, role_scope public.scd_role, check (num_nonnulls(team_id, family_id, person_id, role_scope) = 1));
create function public.scd_has_org_role(p_organization_id uuid, p_roles public.scd_role[]) returns boolean language sql stable security invoker set search_path = public as $$
  select exists (select 1 from public.scd_memberships m where m.organization_id = p_organization_id and m.user_id = auth.uid() and m.active and m.role = any(p_roles)) $$;
create function public.scd_has_position(p_organization_id uuid, p_positions text[]) returns boolean language sql stable set search_path to 'public' as $$
  select exists (select 1 from public.scd_memberships m where m.organization_id = p_organization_id and m.user_id = (select auth.uid()) and m.active
    and jsonb_typeof(m.scope -> 'positions') = 'array'
    and exists (select 1 from jsonb_array_elements_text(m.scope -> 'positions') p where p = any(p_positions))) $$;
insert into public.scd_organizations values ('${ORG}', 'S.C.D. ColicoDerviese');
insert into public.scd_memberships (organization_id, user_id, role, scope) values
  ('${ORG}', '${SEG}', 'SECRETARIAT', '{}'),
  ('${ORG}', '${RAB}', 'STAFF', '{"positions":["responsabile-attivita-base"]}'),
  ('${ORG}', '${DG}', 'STAFF', '{"positions":["direttore-generale"]}'),
  ('${ORG}', '${DIR}', 'DIRECTION', '{}'),
  ('${ORG}', '${FAM}', 'FAMILY', '{}'),
  ('${ORG}', '${MGR}', 'MANAGER', '{"teams":["u15","2015"]}');
insert into public.scd_teams (organization_id, code, name) values ('${ORG}', '2015', 'Esordienti 2015');
`);
const sql = readFileSync(MIG, "utf8");
await db.exec(sql);
await db.exec(sql); // idempotent

const as = async (uid, q, params = []) => {
  await db.exec(`select set_config('request.jwt.claim.sub', '${uid ?? ""}', false)`);
  const r = await db.query(q, params);
  return r.rows;
};
const one = async (uid, q, params) => (await as(uid, q, params))[0];
const future = (days) => new Date(Date.now() + days * 86400000).toISOString();

// RLS on, no policies
const rls = await db.query(`select relname, relrowsecurity from pg_class where relname in ('scd_requests','scd_request_events','scd_clubs')`);
assert.equal(rls.rows.length, 3);
for (const r of rls.rows) assert.equal(r.relrowsecurity, true, r.relname);
const pol = await db.query(`select count(*)::int n from pg_policies where tablename in ('scd_requests','scd_request_events','scd_clubs')`);
assert.equal(pol.rows[0].n, 0);
const anonExec = await db.query(`select p.proname from pg_proc p where p.proname like 'scd_request%' and has_function_privilege('anon', p.oid, 'execute')`);
assert.deepEqual(anonExec.rows, [], "anon can execute: " + JSON.stringify(anonExec.rows));

// clubs
let c = await one(FAM, `select public.scd_club_create($1, $2) r`, [ORG, { name: "Olginatese", city: "Olginate", province: "LC" }]);
assert.deepEqual(c.r, { ok: false, code: "forbidden" });
c = await one(SEG, `select public.scd_club_create($1, $2) r`, [ORG, { name: "Olginatese", city: "Olginate", province: "lc" }]);
assert.equal(c.r.ok, true); assert.equal(c.r.existing, false);
const clubId = c.r.id;
c = await one(RAB, `select public.scd_club_create($1, $2) r`, [ORG, { name: "  OLGINATESE ", city: "olginate" }]);
assert.equal(c.r.existing, true); assert.equal(c.r.id, clubId);
c = await one(SEG, `select public.scd_club_create($1, $2) r`, [ORG, { name: "X", city: "Olginate" }]);
assert.equal(c.r.code, "invalid");
c = await one(SEG, `select public.scd_club_create($1, $2) r`, [ORG, { name: "Pippo", figcMatricola: "12ab" }]);
assert.equal(c.r.code, "invalid");
let s = await one(RAB, `select public.scd_clubs_search($1, $2) r`, [ORG, "olgin"]);
assert.equal(s.r.length, 1);
s = await one(RAB, `select public.scd_clubs_search($1, $2) r`, [ORG, "%"]);
assert.deepEqual(s.r, []);
await assert.rejects(as(FAM, `select public.scd_clubs_search($1, $2)`, [ORG, "olg"]));

// drafts
let r = await one(RAB, `select public.scd_request_create($1, $2) r`, [ORG, { kind: "AMICHEVOLE", teamKey: "2015" }]);
assert.equal(r.r.code, "forbidden", "confirmer cannot create drafts");
r = await one(SEG, `select public.scd_request_create($1, $2) r`, [ORG, { kind: "TORNEO" }]);
assert.equal(r.r.code, "kind");
r = await one(SEG, `select public.scd_request_create($1, $2) r`, [ORG, { kind: "AMICHEVOLE", teamKey: "u99" }]);
assert.equal(r.r.code, "team");
r = await one(SEG, `select public.scd_request_create($1, $2) r`, [ORG, { kind: "AMICHEVOLE", teamKey: "2015", startsAt: "2020-01-01T10:00:00Z" }]);
assert.equal(r.r.code, "date");
r = await one(SEG, `select public.scd_request_create($1, $2) r`, [ORG, { kind: "AMICHEVOLE", venue: "palestra di Luca B." }]);
assert.equal(r.r.code, "venue", "only known facilities");
const cols = await db.query(`select column_name from information_schema.columns where table_name = 'scd_requests' and column_name = 'raw_text'`);
assert.equal(cols.rows.length, 0, "the team's message is never stored");
r = await one(SEG, `select public.scd_request_create($1, $2) r`, [ORG, { kind: "AMICHEVOLE", channel: "WHATSAPP", rawText: "ignored 333 0000000", teamKey: "2015", opponentText: "Olginatese", venue: "Colico", homeAway: "CASA" }]);
assert.equal(r.r.ok, true);
const req1 = r.r.id;
r = await one(SEG, `select public.scd_request_send($1, $2) r`, [ORG, req1]);
assert.equal(r.r.code, "incomplete", "no date yet");
r = await one(SEG, `select public.scd_request_update($1, $2, $3) r`, [ORG, req1, { teamKey: "2015", startsAt: future(30), opponentText: "Olginatese", venue: "Colico", homeAway: "CASA" }]);
assert.equal(r.r.ok, true);
r = await one(SEG, `select public.scd_request_send($1, $2) r`, [ORG, req1]);
assert.equal(r.r.ok, true);
const exp = await one(SEG, `select extract(epoch from (expires_at - sent_at))/86400 d from public.scd_requests where id = $1`, [req1]);
assert.ok(Math.abs(exp.d - 15) < 0.01, "15 days");
r = await one(SEG, `select public.scd_request_send($1, $2) r`, [ORG, req1]);
assert.equal(r.r.code, "state");

// to-confirm visibility by group
let tc = await one(RAB, `select public.scd_requests_to_confirm($1) r`, [ORG]);
assert.equal(tc.r.length, 1);
tc = await one(MGR, `select public.scd_requests_to_confirm($1) r`, [ORG]);
assert.equal(tc.r.length, 0, "dirigente annata no longer confirms");
tc = await one(DG, `select public.scd_requests_to_confirm($1) r`, [ORG]);
assert.equal(tc.r.length, 0, "DG sees, does not confirm");
tc = await one(DIR, `select public.scd_requests_to_confirm($1) r`, [ORG]);
assert.equal(tc.r.length, 1, "Direzione confirms on behalf");

// board
let b = await one(DG, `select public.scd_requests_board($1) r`, [ORG]);
assert.equal(b.r.length, 1);
await assert.rejects(as(RAB, `select public.scd_requests_board($1)`, [ORG]));
await assert.rejects(as(FAM, `select public.scd_requests_board($1)`, [ORG]));

// notices: DG sees CREATA, MODIFICATA, INVIATA; RAB sees INVIATA only
let n = await one(DG, `select public.scd_request_notices($1) r`, [ORG]);
assert.deepEqual(n.r.map((x) => x.action).sort(), ["CREATA", "INVIATA", "MODIFICATA"]);
n = await one(RAB, `select public.scd_request_notices($1) r`, [ORG]);
assert.deepEqual(n.r.map((x) => x.action), ["INVIATA"]);
n = await one(FAM, `select public.scd_request_notices($1) r`, [ORG]);
assert.deepEqual(n.r, []);

// decide
r = await one(FAM, `select public.scd_request_decide($1, $2, 'CONFERMA', null, $3) r`, [ORG, req1, clubId]);
assert.equal(r.r.code, "forbidden");
r = await one(DG, `select public.scd_request_decide($1, $2, 'CONFERMA', null, $3) r`, [ORG, req1, clubId]);
assert.equal(r.r.code, "forbidden");
r = await one(RAB, `select public.scd_request_decide($1, $2, 'CONFERMA', null, null) r`, [ORG, req1]);
assert.equal(r.r.code, "club", "a registered club is needed");
r = await one(RAB, `select public.scd_request_decide($1, $2, 'CONFERMA', 'ok', $3) r`, [ORG, req1, clubId]);
assert.equal(r.r.ok, true);
const ev = await one(SEG, `select e.*, (select count(*)::int from public.scd_event_scopes s where s.event_id = e.id) scopes from public.scd_events e where e.id = $1`, [r.r.eventId]);
assert.equal(ev.event_type, "AMICHEVOLE"); assert.equal(ev.source_id, "SCD_RICHIESTE"); assert.equal(ev.status, "PLANNED");
assert.equal(ev.visibility, "STAFF", "the Master Calendario stays the only public source"); assert.equal(ev.metadata.opponent, "Olginatese"); assert.equal(ev.scopes, 1);
const st = await one(SEG, `select status, form_status from public.scd_requests where id = $1`, [req1]);
assert.deepEqual(st, { status: "CONFERMATA", form_status: "DA_PREPARARE" });
r = await one(RAB, `select public.scd_request_decide($1, $2, 'CONFERMA', null, $3) r`, [ORG, req1, clubId]);
assert.equal(r.r.code, "state", "no double confirm");

// form status forward only, office only
r = await one(RAB, `select public.scd_request_set_form_status($1, $2, 'PRONTO') r`, [ORG, req1]);
assert.equal(r.r.code, "forbidden");
r = await one(SEG, `select public.scd_request_set_form_status($1, $2, 'FIRMATO') r`, [ORG, req1]);
assert.equal(r.r.code, "state");
r = await one(SEG, `select public.scd_request_set_form_status($1, $2, 'PRONTO') r`, [ORG, req1]);
assert.equal(r.r.ok, true);
let f = await one(DG, `select public.scd_request_form($1, $2) r`, [ORG, req1]);
assert.equal(f.r.club.name, "Olginatese"); assert.equal(f.r.organization, "S.C.D. ColicoDerviese");
await assert.rejects(as(RAB, `select public.scd_request_form($1, $2)`, [ORG, req1]));

// esordienti without birth year and missing home/away are never sent
r = await one(SEG, `select public.scd_request_create($1, $2) r`, [ORG, { kind: "AMICHEVOLE", teamKey: "esordienti", homeAway: "CASA", startsAt: future(9), opponentClubId: clubId }]);
assert.equal((await one(SEG, `select public.scd_request_send($1, $2) r`, [ORG, r.r.id])).r.code, "team_year");
r = await one(SEG, `select public.scd_request_create($1, $2) r`, [ORG, { kind: "AMICHEVOLE", teamKey: "2014", startsAt: future(9), opponentClubId: clubId }]);
assert.equal((await one(SEG, `select public.scd_request_send($1, $2) r`, [ORG, r.r.id])).r.code, "incomplete");

// u15: confirmer position missing -> only Direzione
r = await one(SEG, `select public.scd_request_create($1, $2) r`, [ORG, { kind: "AMICHEVOLE", teamKey: "u15", homeAway: "CASA", startsAt: future(3), opponentClubId: clubId }]);
const req2 = r.r.id;
r = await one(SEG, `select public.scd_request_send($1, $2) r`, [ORG, req2]);
assert.equal(r.r.ok, true);
const exp2 = await one(SEG, `select extract(epoch from (expires_at - sent_at))/86400 d from public.scd_requests where id = $1`, [req2]);
assert.ok(exp2.d < 3.01, "deadline never after the match");
r = await one(RAB, `select public.scd_request_decide($1, $2, 'CONFERMA', null, null) r`, [ORG, req2]);
assert.equal(r.r.code, "forbidden");
r = await one(DIR, `select public.scd_request_decide($1, $2, 'RIFIUTA', 'campo occupato', null) r`, [ORG, req2]);
assert.equal(r.r.ok, true);

// expiry
r = await one(SEG, `select public.scd_request_create($1, $2) r`, [ORG, { kind: "AMICHEVOLE", teamKey: "pulcini", homeAway: "CASA", startsAt: future(20), opponentText: "Bellano" }]);
const req3 = r.r.id;
await one(SEG, `select public.scd_request_send($1, $2) r`, [ORG, req3]);
await db.exec(`update public.scd_requests set expires_at = now() - interval '1 minute' where id = '${req3}'`);
r = await one(RAB, `select public.scd_request_decide($1, $2, 'CONFERMA', null, $3) r`, [ORG, req3, clubId]);
assert.equal(r.r.code, "expired");
assert.equal((await one(SEG, `select status from public.scd_requests where id = $1`, [req3])).status, "SCADUTA");
r = await one(SEG, `select public.scd_request_create($1, $2) r`, [ORG, { kind: "AMICHEVOLE", teamKey: "piccoli", homeAway: "CASA", startsAt: future(20), opponentText: "Dongo" }]);
const req4 = r.r.id;
await one(SEG, `select public.scd_request_send($1, $2) r`, [ORG, req4]);
await db.exec(`update public.scd_requests set expires_at = now() - interval '1 minute' where id = '${req4}'`);
assert.equal((await one(FAM, `select public.scd_requests_expire($1) n`, [ORG])).n, 0, "family cannot trigger");
assert.equal((await one(SEG, `select public.scd_requests_expire($1) n`, [ORG])).n, 1);
assert.equal((await one(SEG, `select public.scd_requests_expire($1) n`, [ORG])).n, 0);

// cancel
r = await one(SEG, `select public.scd_request_create($1, $2) r`, [ORG, { kind: "AMICHEVOLE" }]);
assert.equal((await one(SEG, `select public.scd_request_cancel($1, $2, 'doppione') r`, [ORG, r.r.id])).r.ok, true);
assert.deepEqual((await one(SEG, `select public.scd_request_cancel($1, $2, null) r`, [ORG, req1])).r, { ok: true, wasConfirmed: true, wasCopied: false });
assert.equal((await one(SEG, `select status from public.scd_events where id = $1`, [ev.id])).status, "CANCELLED");
assert.equal((await one(SEG, `select public.scd_request_cancel($1, $2, null) r`, [ORG, req2])).r.code, "state", "RIFIUTATA cannot be cancelled");

// scope
r = await one(SEG, `select public.scd_request_create($1, $2) r`, [ORG, { kind: "AMICHEVOLE", teamKey: "piccoli", scope: "NAZIONALE" }]);
assert.equal(r.r.code, "scope");
r = await one(SEG, `select public.scd_request_create($1, $2) r`, [ORG, { kind: "AMICHEVOLE", teamKey: "u15", scope: "MONDIALE" }]);
assert.equal(r.r.code, "invalid");
r = await one(SEG, `select public.scd_request_create($1, $2) r`, [ORG, { kind: "AMICHEVOLE", teamKey: "u15", scope: "REGIONALE", homeAway: "CASA" }]);
assert.equal((await one(SEG, `select payload from public.scd_requests where id = $1`, [r.r.id])).payload.scope, "REGIONALE");

// redaction, null payload, helpers closed
r = await one(SEG, `select public.scd_request_create($1, $2) r`, [ORG, { kind: "AMICHEVOLE", note: "chiama 333 123 4567 o x.y@example.it il 24/10/2026, tel +39 0000-000000" }]);
const red = await one(SEG, `select payload from public.scd_requests where id = $1`, [r.r.id]);
assert.equal(red.payload.note, "chiama [telefono] o [email] il 24/10/2026, tel [telefono]");
r = await one(SEG, `select public.scd_request_create($1, null) r`, [ORG]);
assert.equal(r.r.code, "kind");
r = await one(SEG, `select public.scd_club_create($1, null) r`, [ORG]);
assert.equal(r.r.code, "invalid");
const authExec = await db.query(`select p.proname from pg_proc p where p.proname in ('scd_request_office','scd_request_viewer','scd_request_actor','scd_request_can_confirm','scd_request_clean','scd_request_group_confirmers','scd_request_redact','scd_request_json','scd_request_events_block_change') and has_function_privilege('authenticated', p.oid, 'execute')`);
assert.deepEqual(authExec.rows, []);

// public location
assert.equal(ev.location_text, "Colico");
r = await one(SEG, `select public.scd_request_create($1, $2) r`, [ORG, { kind: "AMICHEVOLE", teamKey: "2014", startsAt: future(10), homeAway: "CASA", opponentClubId: clubId }]);
const rq5 = r.r.id;
await one(SEG, `select public.scd_request_send($1, $2) r`, [ORG, rq5]);
r = await one(RAB, `select public.scd_request_decide($1, $2, 'CONFERMA', 'chiama 333 0000000', null) r`, [ORG, rq5]);
assert.equal(r.r.ok, true);
let loc = await one(SEG, `select location_text from public.scd_events where id = $1`, [r.r.eventId]);
assert.equal(loc.location_text, null);
assert.equal((await one(SEG, `select decision_note from public.scd_requests where id = $1`, [rq5])).decision_note, "chiama [telefono]");
r = await one(SEG, `select public.scd_request_create($1, $2) r`, [ORG, { kind: "AMICHEVOLE", teamKey: "2014", startsAt: future(10), venue: "Olginate", homeAway: "FUORI", opponentClubId: clubId }]);
await one(SEG, `select public.scd_request_send($1, $2) r`, [ORG, r.r.id]);
r = await one(RAB, `select public.scd_request_decide($1, $2, 'CONFERMA', null, null) r`, [ORG, r.r.id]);
loc = await one(SEG, `select location_text from public.scd_events where id = $1`, [r.r.eventId]);
assert.equal(loc.location_text, "Trasferta · Olginate");
r = await one(SEG, `select public.scd_request_create($1, $2) r`, [ORG, { kind: "AMICHEVOLE", teamKey: "2014", startsAt: future(11), venue: "Colico · Campo 2", homeAway: "CASA", opponentClubId: clubId }]);
await one(SEG, `select public.scd_request_send($1, $2) r`, [ORG, r.r.id]);
r = await one(RAB, `select public.scd_request_decide($1, $2, 'CONFERMA', null, null) r`, [ORG, r.r.id]);
assert.equal((await one(SEG, `select location_text from public.scd_events where id = $1`, [r.r.eventId])).location_text, "Colico · Campo 2");

// M5: editing a waiting request sends it back to BOZZA
r = await one(SEG, `select public.scd_request_create($1, $2) r`, [ORG, { kind: "AMICHEVOLE", teamKey: "pulcini", homeAway: "CASA", startsAt: future(12), venue: "Dervio", opponentClubId: clubId }]);
const rq6 = r.r.id;
await one(SEG, `select public.scd_request_send($1, $2) r`, [ORG, rq6]);
r = await one(SEG, `select public.scd_request_update($1, $2, $3) r`, [ORG, rq6, { teamKey: "primicalci", homeAway: "CASA", startsAt: future(12), venue: "Dervio", opponentClubId: clubId }]);
assert.equal(r.r.status, "BOZZA");
let st6 = await one(SEG, `select status, sent_at, team_key from public.scd_requests where id = $1`, [rq6]);
assert.deepEqual([st6.status, st6.sent_at, st6.team_key], ["BOZZA", null, "primicalci"]);
r = await one(RAB, `select public.scd_request_decide($1, $2, 'CONFERMA', null, null) r`, [ORG, rq6]);
assert.equal(r.r.code, "state", "cannot confirm a request back in draft");

// A3/A4: Master Calendario task and cancel after confirmation
await one(SEG, `select public.scd_request_send($1, $2) r`, [ORG, rq6]);
r = await one(RAB, `select public.scd_request_decide($1, $2, 'CONFERMA', null, null) r`, [ORG, rq6]);
const ev6 = r.r.eventId;
assert.equal((await one(RAB, `select public.scd_request_mark_copied($1, $2) r`, [ORG, rq6])).r.code, "forbidden");
assert.equal((await one(SEG, `select public.scd_request_mark_copied($1, $2) r`, [ORG, rq6])).r.ok, true);
assert.equal((await one(SEG, `select public.scd_request_mark_copied($1, $2) r`, [ORG, rq6])).r.code, "state");
assert.equal((await one(RAB, `select public.scd_request_cancel($1, $2, null) r`, [ORG, rq6])).r.code, "forbidden");
r = await one(SEG, `select public.scd_request_cancel($1, $2, 'campo chiuso, tel 333 0000000') r`, [ORG, rq6]);
assert.deepEqual(r.r, { ok: true, wasConfirmed: true, wasCopied: true });
assert.equal((await one(SEG, `select status from public.scd_events where id = $1`, [ev6])).status, "CANCELLED");
st6 = await one(SEG, `select status, decision_note from public.scd_requests where id = $1`, [rq6]);
assert.deepEqual([st6.status, st6.decision_note], ["ANNULLATA", "campo chiuso, tel [telefono]"]);
const acts = (await db.query(`select action from public.scd_request_events where request_id = '${rq6}' order by id`)).rows.map((x) => x.action);
assert.deepEqual(acts, ["CREATA", "INVIATA", "MODIFICATA", "INVIATA", "CONFERMATA", "CALENDARIO", "ANNULLATA"]);
assert.equal((await one(SEG, `select public.scd_request_cancel($1, $2, null) r`, [ORG, rq6])).r.code, "state");

// append-only log
await assert.rejects(db.exec(`update public.scd_request_events set note = 'x'`));
await assert.rejects(db.exec(`delete from public.scd_request_events`));

// constraint: confirmed needs event
await assert.rejects(db.exec(`update public.scd_requests set event_id = null where id = '${rq5}'`));

console.log("r133 PGlite: all assertions passed");
