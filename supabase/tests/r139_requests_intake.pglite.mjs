// r139 "Vetrina richieste" F1 — behaviour test on an in-memory Postgres (PGlite), no remote database touched.
// Run from the repository root (PGlite is not a dependency of the app, so it is installed in a throwaway folder):
//   npm install --prefix /tmp/scd-pglite @electric-sql/pglite@0.5.10
//   PGLITE_DIR=/tmp/scd-pglite node supabase/tests/r139_requests_intake.pglite.mjs
// Exit code 0 = every assertion passed. r133 is loaded from its real file; the r33/r35/r74 objects are created in
// their minimal shape. Every id, organisation and contact below is invented (example.org addresses, 0000 phones).
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
const file = (rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");
const R133 = file("../migrations/20261015_r133_requests_machine.sql");
const R139 = file("../migrations/20261017_r139_requests_intake.sql");

const ORG = "00000000-0000-0000-0000-000000000001";
const U = (n) => `10000000-0000-0000-0000-0000000000${String(n).padStart(2, "0")}`;
// 1 Direzione, 2 DG, 3 Segreteria, 4 responsabile tornei, 5 tesoreria, 6 responsabile campi, 7 family,
// 8 coordinatore, 9 responsabile attivita di base, 10 mister
const DIR = U(1), DG = U(2), SEG = U(3), RTO = U(4), TES = U(5), RCA = U(6), FAM = U(7), COO = U(8), RAB = U(9), MIS = U(10);

const base = `
create role anon; create role authenticated; create role service_role;
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
insert into public.scd_organizations values ('${ORG}', 'Club di prova');
insert into public.scd_memberships (organization_id, user_id, role, scope) values
  ('${ORG}', '${DIR}', 'DIRECTION', '{}'),
  ('${ORG}', '${DG}', 'STAFF', '{"positions":["direttore-generale"]}'),
  ('${ORG}', '${SEG}', 'SECRETARIAT', '{"positions":["segreteria"]}'),
  ('${ORG}', '${RTO}', 'STAFF', '{"positions":["responsabile-tornei"]}'),
  ('${ORG}', '${TES}', 'STAFF', '{"positions":["tesoreria"]}'),
  ('${ORG}', '${RCA}', 'STAFF', '{"positions":["responsabile-campi"]}'),
  ('${ORG}', '${FAM}', 'FAMILY', '{}'),
  ('${ORG}', '${COO}', 'STAFF', '{"positions":["coordinatore-attivita-sportiva"]}'),
  ('${ORG}', '${RAB}', 'STAFF', '{"positions":["responsabile-attivita-base"]}'),
  ('${ORG}', '${MIS}', 'MISTER', '{"positions":["mister"]}');
`;

// prerequisites guard: r139 alone refuses to run
{
  const bare = new PGlite();
  await bare.exec(base);
  await assert.rejects(bare.exec(R139), /r139 prerequisites missing/);
}

const db = new PGlite();
await db.exec(base);
await db.exec(R133);
// one friendly before r139, to prove existing rows survive and the friendlies page stays separate
await db.exec(`select set_config('request.jwt.claim.sub', '${SEG}', false)`);
const pre = (await db.query(`select public.scd_request_create($1, $2) r`, [ORG, { kind: "AMICHEVOLE", teamKey: "2015", opponentText: "Prova" }])).rows[0].r;
assert.equal(pre.ok, true);
await db.exec(R139);
await db.exec(R139); // idempotent

const as = async (uid, q, params = [], claimsRole = null) => {
  await db.exec(`select set_config('request.jwt.claim.sub', '${uid ?? ""}', false)`);
  await db.exec(`select set_config('request.jwt.claims', '${claimsRole ? JSON.stringify({ role: claimsRole }) : ""}', false)`);
  const r = await db.query(q, params);
  return r.rows;
};
const one = async (uid, q, params, claimsRole) => (await as(uid, q, params, claimsRole))[0];
const ingest = async (payload, claimsRole = "service_role") => (await one(null, `select public.scd_request_ingest($1, $2) r`, [ORG, payload], claimsRole)).r;
const day = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
let seq = 0;
const ref = () => `tally:sub${String(++seq).padStart(4, "0")}`;
const contact = { orgName: "Societa Esempio", name: "Referente Prova", role: "Dirigente", email: "referente@example.org", phone: "+39 000 0000000" };
const torneo = (over = {}) => ({ sourceRef: ref(), tipo: "torneo", orgKind: "SOCIETA", consentPrivacy: true, adultDeclared: true,
  fields: { tournament: "christmas-lario-cup-maschile", category: "Under 12", teams: 2, province: "lc" }, contact, ...over });

// ---------------------------------------------------------------- locks: RLS, grants, no anon
const rls = await db.query(`select relname, relrowsecurity from pg_class where relname in ('scd_requests','scd_request_events','scd_request_contacts')`);
assert.equal(rls.rows.length, 3);
for (const r of rls.rows) assert.equal(r.relrowsecurity, true, r.relname);
assert.equal((await db.query(`select count(*)::int n from pg_policies where tablename = 'scd_request_contacts'`)).rows[0].n, 0);
for (const role of ["anon", "authenticated"]) {
  const t = await db.query(`select has_table_privilege('${role}', 'public.scd_request_contacts', 'select') s`);
  assert.equal(t.rows[0].s, false, `${role} reads contacts`);
}
const anonExec = await db.query(`select p.proname from pg_proc p where (p.proname like 'scd_request%' or p.proname like 'scd_intake%') and has_function_privilege('anon', p.oid, 'execute')`);
assert.deepEqual(anonExec.rows, [], "anon can execute: " + JSON.stringify(anonExec.rows));
const authHelpers = await db.query(`select p.proname from pg_proc p where p.proname in ('scd_request_ingest','scd_request_contacts_purge','scd_request_kind_rules','scd_request_kind_positions','scd_request_can','scd_request_notify','scd_request_intake_text','scd_request_clean_intake','scd_request_contact_clean','scd_intake_row_json') and has_function_privilege('authenticated', p.oid, 'execute')`);
assert.deepEqual(authHelpers.rows, [], "authenticated can execute: " + JSON.stringify(authHelpers.rows));
const svc = await db.query(`select has_function_privilege('service_role', 'public.scd_request_ingest(uuid, jsonb)', 'execute') a, has_function_privilege('service_role', 'public.scd_request_contacts_purge()', 'execute') b`);
assert.deepEqual(svc.rows[0], { a: true, b: true });
const authUi = await db.query(`select count(*)::int n from pg_proc p where p.proname in ('scd_intake_board','scd_intake_decide','scd_intake_contact','scd_intake_payment_set','scd_intake_notices','scd_intake_kinds') and has_function_privilege('authenticated', p.oid, 'execute')`);
assert.equal(authUi.rows[0].n, 6);
assert.equal((await db.query(`select has_sequence_privilege('authenticated', 'public.scd_request_public_code_seq', 'usage') s`)).rows[0].s, false);

// probe
assert.deepEqual((await one(DG, `select public.scd_intake_kinds() k`)).k, ["ISCRIZIONE_TORNEO", "SPONSOR", "CONVENZIONE", "AFFITTO_CAMPO", "VISITA_CENTRO", "ALTRO"]);

// ---------------------------------------------------------------- ingest: only the service role, strict validation
assert.deepEqual(await ingest(torneo(), "authenticated"), { ok: false, code: "forbidden" });
assert.deepEqual(await ingest(torneo(), "anon"), { ok: false, code: "forbidden" });
let t1 = await ingest(torneo({ sourceRef: "tally:abc001" }));
assert.equal(t1.ok, true);
assert.match(t1.publicCode, /^V-\d{2}-\d{4}$/);
assert.equal(t1.duplicate, false);
const again = await ingest(torneo({ sourceRef: "tally:abc001" }));
assert.deepEqual(again, { ok: true, id: t1.id, publicCode: t1.publicCode, duplicate: true }, "idempotent on source_ref");

const bad = async (over, code) => assert.equal((await ingest(torneo(over))).code, code, JSON.stringify(over));
await bad({ extra: 1 }, "field");
await bad({ sourceRef: "make:1" }, "source");
await bad({ tipo: "pulmino" }, "kind");
await bad({ consentPrivacy: false }, "consent");
await bad({ consentPrivacy: "true" }, "consent");
await bad({ adultDeclared: null }, "adult");
await bad({ orgKind: "AZIENDA" }, "orgKind");
await bad({ fields: { tournament: "torneo-inventato", category: "Under 12", teams: 1 } }, "tournament");
await bad({ fields: { tournament: "memorial-jose-nasazzi", category: "Under 12", teams: 9 } }, "teams");
await bad({ fields: { tournament: "memorial-jose-nasazzi", category: "Under 12", teams: 1, birthDates: "x" } }, "field");
await bad({ fields: { tournament: "memorial-jose-nasazzi", category: "Under 12", teams: 1, province: "Lecco" } }, "province");
await bad({ fields: { tournament: "memorial-jose-nasazzi", category: "Under 12", teams: { n: 1 } } }, "invalid");
await bad({ contact: { ...contact, email: null, phone: null } }, "contact");
await bad({ contact: { ...contact, email: "non-una-mail" } }, "email");
await bad({ contact: { ...contact, phone: "12" } }, "phone");
await bad({ contact: { ...contact, orgName: null } }, "organization");
await bad({ contact: { ...contact, birthDate: "2014-01-01" } }, "field");
await bad({ site: "LECCO" }, "site");

// payload: whitelisted fields only, contacts never in the catalogue row
const row1 = await one(null, `select * from public.scd_requests where id = $1`, [t1.id]);
assert.equal(row1.kind, "ISCRIZIONE_TORNEO"); assert.equal(row1.status, "RICEVUTA"); assert.equal(row1.channel, "TALLY");
assert.equal(row1.area, "tornei"); assert.equal(row1.requester_kind, "ESTERNO");
assert.deepEqual(row1.payload, { tournament: "christmas-lario-cup-maschile", category: "Under 12", teams: 2, province: "LC", orgKind: "SOCIETA" });
assert.doesNotMatch(JSON.stringify(row1), /example\.org|Referente|390000/);
const c1 = await one(null, `select * from public.scd_request_contacts where request_id = $1`, [t1.id]);
assert.equal(c1.phone, "+390000000000"); assert.equal(c1.email, "referente@example.org"); assert.equal(c1.adult_declared, true);
assert.ok(new Date(c1.purge_after) > new Date(Date.now() + 360 * 86400000), "12 months");

// redaction of free text: contacts and health words
const sp = await ingest({ sourceRef: ref(), tipo: "sponsor", orgKind: "AZIENDA", consentPrivacy: true, adultDeclared: true,
  fields: { sector: "Edilizia", packages: ["ledwall", "tornei"], note: "chiamate 333 000 0000 o scrivete a info@example.org" }, contact });
assert.equal(sp.ok, true);
const spRow = await one(null, `select payload from public.scd_requests where id = $1`, [sp.id]);
assert.equal(spRow.payload.note, "chiamate [telefono] o scrivete a [email]");
assert.deepEqual(spRow.payload.packages, ["ledwall", "tornei"]);
const al = await ingest({ sourceRef: ref(), tipo: "altro", orgKind: "PRIVATO", consentPrivacy: true, adultDeclared: true,
  fields: { subject: "INFORMAZIONI", note: "mio figlio ha una allergia, si puo fare?" }, contact: { ...contact, orgName: "Non serve" } });
assert.equal(al.ok, true);
const alRow = await one(null, `select payload from public.scd_requests where id = $1`, [al.id]);
assert.equal(alRow.payload.note, "[testo rimosso: possibili dati di salute]", "health never stored");
assert.equal((await one(null, `select org_name from public.scd_request_contacts where request_id = $1`, [al.id])).org_name, null, "private person: no organisation");
assert.equal((await ingest({ sourceRef: ref(), tipo: "altro", orgKind: "PRIVATO", consentPrivacy: true, adultDeclared: true, fields: { subject: "ALTRO" }, contact })).code, "note");
assert.equal((await ingest({ sourceRef: ref(), tipo: "convenzione", orgKind: "AZIENDA", consentPrivacy: true, adultDeclared: true, fields: { proposal: "REGALO" }, contact })).code, "proposal");
const cv = await ingest({ sourceRef: ref(), tipo: "convenzione", orgKind: "ENTE", consentPrivacy: true, adultDeclared: true, fields: { proposal: "SCONTO_TESSERATI" }, contact });
assert.equal(cv.ok, true);

// site kinds
const aff = (site, over = {}) => ({ sourceRef: ref(), tipo: "affitto-campo", orgKind: "ENTE", site, consentPrivacy: true, adultDeclared: true,
  fields: { date: day(20), slot: "SERA", activity: "PARTITA", pitch: "CAMPO_7", people: 22 }, contact, ...over });
assert.equal((await ingest(aff(null))).code, "site");
assert.equal((await ingest(aff("COLICO", { fields: { date: day(-1), slot: "SERA", activity: "PARTITA" } }))).code, "date");
assert.equal((await ingest(aff("COLICO", { fields: { date: "2026-02-30", slot: "SERA", activity: "PARTITA" } }))).code, "invalid");
assert.equal((await ingest(aff("COLICO", { fields: { date: day(5), slot: "NOTTE", activity: "PARTITA" } }))).code, "slot");
const affC = await ingest(aff("COLICO"));
const affD = await ingest(aff("DERVIO"));
assert.equal(affC.ok && affD.ok, true);
const vis = await ingest({ sourceRef: ref(), tipo: "visita", orgKind: "SCUOLA", site: "COLICO", consentPrivacy: true, adultDeclared: true,
  fields: { date: day(30), date2: day(31), people: 25, ageBand: "BAMBINI" }, contact });
assert.equal(vis.ok, true);
assert.equal((await ingest({ sourceRef: ref(), tipo: "visita", orgKind: "SCUOLA", site: "COLICO", consentPrivacy: true, adultDeclared: true,
  fields: { date: day(30), people: 25, ageBand: "NEONATI" }, contact })).code, "ageBand");

// ---------------------------------------------------------------- board: each role sees only its kinds
const board = async (uid, filters = {}) => (await one(uid, `select public.scd_intake_board($1, $2) b`, [ORG, filters])).b;
const kindsOf = (b) => [...new Set(b.rows.map((r) => `${r.kind}${r.site ? ":" + r.site : ""}`))].sort();
assert.deepEqual(kindsOf(await board(RTO)), ["ISCRIZIONE_TORNEO"]);
assert.deepEqual(kindsOf(await board(TES)), ["AFFITTO_CAMPO:COLICO", "AFFITTO_CAMPO:DERVIO", "CONVENZIONE", "ISCRIZIONE_TORNEO", "SPONSOR"]);
assert.deepEqual(kindsOf(await board(RCA)), ["AFFITTO_CAMPO:COLICO", "VISITA_CENTRO:COLICO"], "UD-156: responsabile campi never sees Dervio");
assert.deepEqual(kindsOf(await board(RAB)), ["AFFITTO_CAMPO:DERVIO"], "UD-156: Dervio always informed");
assert.deepEqual(kindsOf(await board(SEG)), ["AFFITTO_CAMPO:DERVIO", "ALTRO", "ISCRIZIONE_TORNEO", "VISITA_CENTRO:COLICO"]);
assert.equal((await board(DIR)).rows.length, 7);
assert.equal((await board(DG)).rows.length, 7, "DG sees everything");
await assert.rejects(as(FAM, `select public.scd_intake_board($1, '{}')`, [ORG]), /forbidden/);
await assert.rejects(as(MIS, `select public.scd_intake_board($1, '{}')`, [ORG]), /forbidden/);
await assert.rejects(as(null, `select public.scd_intake_board($1, '{}')`, [ORG]), /forbidden/);
await assert.rejects(as(DG, `select public.scd_intake_board($1, $2)`, [ORG, { kind: "AMICHEVOLE" }]), /invalid filters/);
await assert.rejects(as(DG, `select public.scd_intake_board($1, $2)`, [ORG, { status: ["BOZZA"] }]), /invalid filters/);
assert.equal((await board(DG, { kind: "AFFITTO_CAMPO", site: "DERVIO" })).rows.length, 1);
assert.equal((await board(DG, { area: "crm" })).rows.length, 2);
assert.equal((await board(DG, { status: ["ACCETTATA"] })).rows.length, 0);
const rtoRow = (await board(RTO)).rows.find((r) => r.id === t1.id);
assert.deepEqual(rtoRow.can, { decide: true, prepare: true, contact: true, pay: false });
assert.equal(rtoRow.hasContact, true);
assert.doesNotMatch(JSON.stringify(await board(DG)), /example\.org|Referente|Societa Esempio/, "the board never carries contacts");
const tesRow = (await board(TES)).rows.find((r) => r.id === t1.id);
assert.deepEqual(tesRow.can, { decide: false, prepare: false, contact: false, pay: false }, "informed, payment only after acceptance");

// friendlies page stays separate
const fb = (await one(SEG, `select public.scd_requests_board($1) b`, [ORG])).b;
assert.deepEqual(fb.map((r) => r.kind), ["AMICHEVOLE"]);
assert.equal((await one(DG, `select public.scd_request_form($1, $2) f`, [ORG, t1.id])).f, null);
assert.ok((await one(DG, `select public.scd_request_notices($1) n`, [ORG])).n.every((x) => x.requestId === pre.id));
// r133 writes never move an intake row (disjoint states)
assert.equal((await one(SEG, `select public.scd_request_update($1, $2, $3) r`, [ORG, t1.id, { teamKey: "2015" }])).r.code, "state");
assert.equal((await one(SEG, `select public.scd_request_send($1, $2) r`, [ORG, t1.id])).r.code, "state");
assert.equal((await one(SEG, `select public.scd_request_cancel($1, $2, 'x') r`, [ORG, t1.id])).r.code, "state");
assert.equal((await one(DIR, `select public.scd_request_decide($1, $2, 'CONFERMA', null, null) r`, [ORG, t1.id])).r.code, "forbidden");
assert.equal((await one(SEG, `select status from public.scd_requests where id = $1`, [pre.id])).status, "BOZZA", "existing friendly untouched");

// ---------------------------------------------------------------- state machine
const act = async (uid, id, action, note = null, value = null) =>
  (await one(uid, `select public.scd_intake_decide($1, $2, $3, $4, $5) r`, [ORG, id, action, note, value])).r;
assert.equal((await act(FAM, t1.id, "take")).code, "forbidden");
assert.equal((await act(TES, t1.id, "take")).code, "forbidden", "informed cannot take");
assert.equal((await act(SEG, t1.id, "accept")).code, "forbidden", "preparer cannot accept");
assert.equal((await act(RTO, t1.id, "accept")).code, "state", "accept only from IN_VALUTAZIONE");
assert.equal((await act(SEG, t1.id, "fly")).code, "invalid");
assert.deepEqual(await act(SEG, t1.id, "take"), { ok: true, status: "IN_VALUTAZIONE" });
assert.equal((await act(SEG, t1.id, "take")).code, "state");
assert.equal((await act(RTO, t1.id, "reject")).code, "reason");
assert.equal((await act(RTO, t1.id, "reject", "ok", null)).code, "reason");
assert.equal((await act(RTO, t1.id, "accept", "la squadra ha un infortunio")).code, "health");
// payment before acceptance refused
assert.equal((await one(TES, `select public.scd_intake_payment_set($1, $2, $3) r`, [ORG, t1.id, { status: "DA_PAGARE", amountCents: 5000 }])).r.code, "state");
await assert.rejects(db.exec(`update public.scd_requests set payment_status = 'DA_PAGARE' where id = '${t1.id}'`), "constraint: payment only after acceptance");
assert.deepEqual(await act(DG, t1.id, "accept", "posto confermato, scrivere a x@example.org"), { ok: true, status: "ACCETTATA" });
assert.equal((await one(DG, `select decision_note from public.scd_requests where id = $1`, [t1.id])).decision_note, "posto confermato, scrivere a [email]");
assert.equal((await act(DG, t1.id, "assign", null, "tesoreria")).code, "owner", "owner must be among the kind's owners");
assert.deepEqual(await act(DG, t1.id, "assign", null, "segreteria"), { ok: true, status: "ACCETTATA", owner: "segreteria" });
assert.equal((await act(SEG, t1.id, "assign", null, "responsabile-tornei")).code, "forbidden", "preparer cannot assign");

// payment: Tesoreria only, not the Direzione
const pay = async (uid, id, p) => (await one(uid, `select public.scd_intake_payment_set($1, $2, $3) r`, [ORG, id, p])).r;
assert.equal((await pay(DIR, t1.id, { status: "DA_PAGARE", amountCents: 5000 })).code, "forbidden");
assert.equal((await pay(DG, t1.id, { status: "DA_PAGARE", amountCents: 5000 })).code, "forbidden");
assert.equal((await pay(TES, t1.id, { status: "LINK_INVIATO" })).code, "link");
assert.equal((await pay(TES, t1.id, { status: "LINK_INVIATO", link: "https://pay.example.org/abc" })).code, "amount");
assert.equal((await pay(TES, t1.id, { status: "LINK_INVIATO", amountCents: 5000, link: "http://pay.example.org/abc" })).code, "link");
assert.equal((await pay(TES, t1.id, { status: "LINK_INVIATO", amountCents: 5000, link: "javascript:alert(1)" })).code, "link");
assert.equal((await pay(TES, t1.id, { status: "LINK_INVIATO", amountCents: -1, link: "https://pay.example.org/abc" })).code, "amount");
assert.equal((await pay(TES, t1.id, { status: "PAGATO", amountCents: 1 })).code, "invalid");
assert.equal((await pay(TES, t1.id, { status: "DA_PAGARE", amountCents: 5000, iban: "x" })).code, "field");
assert.deepEqual(await pay(TES, t1.id, { status: "LINK_INVIATO", amountCents: 5000, link: "https://pay.example.org/abc" }), { ok: true, paymentStatus: "LINK_INVIATO" });
assert.equal((await board(TES)).rows.find((r) => r.id === t1.id).paymentAmountCents, 5000);
assert.equal((await board(TES)).rows.find((r) => r.id === t1.id).can.pay, true);
const rtoAfter = (await board(RTO)).rows.find((r) => r.id === t1.id);
assert.equal(rtoAfter.paymentStatus, "LINK_INVIATO");
assert.equal(rtoAfter.paymentAmountCents, undefined, "amount only for who handles money");
assert.equal(rtoAfter.paymentLink, undefined);

// start/close by the owner position; informed cannot
assert.equal((await act(TES, t1.id, "start")).code, "forbidden");
assert.deepEqual(await act(SEG, t1.id, "start"), { ok: true, status: "IN_GESTIONE" });
assert.equal((await act(SEG, t1.id, "accept")).code, "forbidden");
assert.deepEqual(await act(SEG, t1.id, "close"), { ok: true, status: "CHIUSA" });
assert.equal((await act(DG, t1.id, "cancel", "doppione")).code, "state", "a closed request stays closed");
assert.deepEqual(await pay(TES, t1.id, { status: "RISCONTRATO" }), { ok: true, paymentStatus: "RISCONTRATO" }, "reconciled after closing");
const events = (await db.query(`select action from public.scd_request_events where request_id = '${t1.id}' order by id`)).rows.map((x) => x.action);
assert.deepEqual(events, ["RICEVUTA", "IN_VALUTAZIONE", "ACCETTATA", "ASSEGNATA", "PAGAMENTO", "IN_GESTIONE", "CHIUSA", "PAGAMENTO"]);

// sponsor: board deciders only, no payment link (invoice by contract)
assert.equal((await act(SEG, sp.id, "take")).code, "forbidden", "Segreteria does not handle sponsors");
assert.deepEqual(await act(DG, sp.id, "take"), { ok: true, status: "IN_VALUTAZIONE" });
assert.deepEqual(await act(DIR, sp.id, "accept"), { ok: true, status: "ACCETTATA" });
assert.equal((await pay(TES, sp.id, { status: "LINK_INVIATO", amountCents: 100000, link: "https://pay.example.org/s" })).code, "link_not_allowed");
assert.deepEqual(await pay(TES, sp.id, { status: "DA_PAGARE", amountCents: 100000 }), { ok: true, paymentStatus: "DA_PAGARE" });
assert.deepEqual(await act(DG, sp.id, "cancel", "contratto non firmato"), { ok: true, status: "ANNULLATA" });
assert.equal((await one(DG, `select payment_status from public.scd_requests where id = $1`, [sp.id])).payment_status, null);

// reject: reason kept, contacts shortened to 6 months
assert.deepEqual(await act(RCA, affC.id, "take"), { ok: true, status: "IN_VALUTAZIONE" });
assert.equal((await act(RCA, affC.id, "reject", "campo occupato")).code, "forbidden", "responsabile campi prepares, the board decides");
assert.deepEqual(await act(DG, affC.id, "reject", "campo occupato quel giorno"), { ok: true, status: "RIFIUTATA" });
const pa = await one(null, `select purge_after from public.scd_request_contacts where request_id = $1`, [affC.id]);
assert.ok(new Date(pa.purge_after) < new Date(Date.now() + 190 * 86400000), "6 months after a refusal");
assert.equal((await act(RCA, affD.id, "take")).code, "forbidden", "Dervio: not for the responsabile campi");

// reclassify ALTRO
assert.equal((await act(RTO, al.id, "reclassify", null, "SPONSOR")).code, "forbidden");
assert.equal((await act(SEG, al.id, "reclassify", null, "AMICHEVOLE")).code, "kind");
assert.deepEqual(await act(SEG, al.id, "reclassify", null, "VISITA_CENTRO"), { ok: true, status: "RICEVUTA", kind: "VISITA_CENTRO" });
assert.equal((await one(DG, `select area from public.scd_requests where id = $1`, [al.id])).area, "impianti-campi");
assert.equal((await act(SEG, al.id, "reclassify", null, "ALTRO")).code, "forbidden", "now a visit: decided by the board");
assert.equal((await act(DG, al.id, "reclassify", null, "SPONSOR")).code, "state", "only ALTRO is reclassified");

// ---------------------------------------------------------------- contacts: who reads, logged, purged
const contactOf = async (uid, id) => (await one(uid, `select public.scd_intake_contact($1, $2) c`, [ORG, id])).c;
assert.equal((await contactOf(TES, t1.id)).code, "forbidden", "informed positions never read contacts");
assert.equal((await contactOf(FAM, t1.id)).code, "forbidden");
assert.equal((await contactOf(SEG, pre.id)).code, "not_found", "friendlies have no contacts here");
const cc = await contactOf(RTO, t1.id);
assert.equal(cc.ok, true); assert.equal(cc.contact.email, "referente@example.org");
assert.equal((await db.query(`select count(*)::int n from public.scd_request_events where request_id = '${t1.id}' and action = 'CONTATTO_LETTO'`)).rows[0].n, 1, "read logged");
await db.exec(`update public.scd_request_contacts set purge_after = now() - interval '1 minute' where request_id in ('${t1.id}', '${affC.id}')`);
assert.equal((await one(null, `select public.scd_request_contacts_purge() n`, [], "service_role")).n, 2);
assert.equal((await one(null, `select public.scd_request_contacts_purge() n`, [], "service_role")).n, 0);
assert.deepEqual(await contactOf(RTO, t1.id), { ok: true, purged: true });
assert.equal((await board(RTO)).rows.find((r) => r.id === t1.id).hasContact, false);
assert.equal((await db.query(`select count(*)::int n from public.scd_request_events where action = 'CONTATTI_CANCELLATI'`)).rows[0].n, 2);

// ---------------------------------------------------------------- notices: in app, per position, no amounts, no contacts
const notices = async (uid) => (await one(uid, `select public.scd_intake_notices($1) n`, [ORG])).n;
const nRca = await notices(RCA);
assert.ok(nRca.length > 0 && nRca.every((n) => n.site !== "DERVIO"), "UD-156");
assert.ok((await notices(RAB)).some((n) => n.requestId === affD.id), "Dervio always informed");
assert.deepEqual(await notices(FAM), []);
assert.deepEqual(await notices(MIS), []);
const nTes = await notices(TES);
assert.ok(nTes.some((n) => n.action === "PAGAMENTO"));
assert.ok(!nTes.some((n) => n.action === "RICEVUTA" && n.requestId === t1.id), "informed positions are told after acceptance");
assert.ok(nTes.some((n) => n.action === "ACCETTATA" && n.requestId === t1.id));
const allNotices = JSON.stringify(await notices(DIR));
assert.doesNotMatch(allNotices, /5000|example\.org|CONTATTO_LETTO|CONTATTI_CANCELLATI/);
assert.ok((await notices(DG)).some((n) => n.action === "RICEVUTA"));

// ---------------------------------------------------------------- append-only, constraints
await assert.rejects(db.exec(`update public.scd_request_events set note = 'x'`));
await assert.rejects(db.exec(`delete from public.scd_request_events`));
await assert.rejects(db.exec(`update public.scd_requests set status = 'BOZZA' where id = '${affD.id}'`), "intake rows never take friendly states");
await assert.rejects(db.exec(`update public.scd_requests set status = 'RICEVUTA' where id = '${pre.id}'`), "friendlies never take intake states");
await assert.rejects(db.exec(`insert into public.scd_requests (organization_id, kind, channel) values ('${ORG}', 'TORNEO', 'TALLY')`));

// hourly cap
await db.exec(`insert into public.scd_requests (organization_id, kind, channel, status, received_at)
  select '${ORG}', 'ALTRO', 'TALLY', 'RICEVUTA', now() from generate_series(1, 60)`);
assert.equal((await ingest(torneo())).code, "rate");

console.log("r139 PGlite: all assertions passed");
