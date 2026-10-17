// r144 «I miei documenti» — behaviour test on an in-memory Postgres (PGlite), no remote database touched.
// Run from the repository root (PGlite is not a dependency of the app, so it is installed in a throwaway folder):
//   npm install --prefix /tmp/scd-pglite @electric-sql/pglite@0.5.10
//   PGLITE_DIR=/tmp/scd-pglite node supabase/tests/r144_my_documents.pglite.mjs
// Exit code 0 = every assertion passed. The real r33, r34, r35, r59, r61, r66, r74 and r95 files are loaded (pgcrypto
// line removed: gen_random_uuid is built in); the pg_cron block of r144 is cut (PGlite has no pg_cron) and checked
// statically in apps/superapp/src/lib/my-documents-migration.test.ts. All people are invented.
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
const mig = (f) =>
  readFileSync(fileURLToPath(new URL(`../migrations/${f}`, import.meta.url)), "utf8").replace(/create extension if not exists pgcrypto;/g, "");
const PRE = [
  "20260929_r33_club_graph_foundation.sql",
  "20260929_r34_rls_performance_hardening.sql",
  "20260929_r35_auth_context_rls_normalization.sql",
  "20261011_r59_people_lifecycle_and_consents.sql",
  "20261011_r61_team_and_family_scoped_access.sql",
  "20261011_r66_certificate_register.sql",
  "20261012_r74_transport.sql",
];
const R95 = mig("20261013_r95_comm_hub.sql");
const R142_FULL = mig("20261017_r144_my_documents.sql");
const cut = R142_FULL.match(/-- >>> r144 cron[\s\S]*?-- <<< r144 cron/);
assert.ok(cut, "cron markers present");
const R142 = R142_FULL.replace(cut[0], "");

const ORG = "00000000-0000-0000-0000-000000000001";
const U = (n) => `10000000-0000-0000-0000-0000000000${String(n).padStart(2, "0")}`;
const P = (n) => `20000000-0000-0000-0000-0000000000${String(n).padStart(2, "0")}`;
const DIR = U(1), SEG = U(2), TES = U(3), MIS = U(4), PAR = U(5), ADU = U(6), OTH = U(7);
// people: 1 parent (guardian), 2 child 10y athlete, 3 child 16y athlete, 4 adult sibling athlete, 5 other family child,
// 6 mister, 7 other parent
const PARENT = P(1), KID10 = P(2), KID16 = P(3), ADULT = P(4), OTHERKID = P(5), MISTER = P(6), OTHERPARENT = P(7);
// family 3: two guardians, both WITHOUT birth date (finding 1), a child without birth date, a grandparent (not a
// guardian, no birth date, not an athlete)
const G1 = P(8), G2 = P(9), NOBDKID = P(10), GRANNY = P(11);
const UG1 = U(8), UG2 = U(9);
const TEAM = "30000000-0000-0000-0000-000000000001";
const SEASON = "40000000-0000-0000-0000-000000000001";
const day = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const yearsAgo = (y) => day(-Math.round(y * 365.25));

const auth = `
create role anon; create role authenticated; create role service_role; create schema auth;
create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
`;
const prerequisitesOnly = async (withComm) => {
  const db = new PGlite();
  await db.exec(auth);
  for (const f of PRE) await db.exec(mig(f));
  // r35 signup trigger on auth.users (creates memberships for the real club slug): not part of this test.
  await db.exec(`do $$ declare t record; begin for t in select tgname from pg_trigger where tgrelid = 'auth.users'::regclass and not tgisinternal
    loop execute format('drop trigger %I on auth.users', t.tgname); end loop; end $$;`);
  if (withComm) {
    await db.exec(`insert into public.scd_organizations (id, slug, name) values ('${ORG}', 'prova', 'Club di prova')`);
    await db.exec(R95);
  }
  return db;
};

// 0. Fail closed without r95: nothing left behind.
{
  const bare = await prerequisitesOnly(false);
  await assert.rejects(() => bare.exec(R142), /r144 prerequisites missing/);
  await bare.exec("rollback");
  const left = await bare.query(`select to_regclass('public.scd_document_requests') t, to_regprocedure('public.scd_my_documents(uuid)') f`);
  assert.deepEqual(left.rows[0], { t: null, f: null });
}

const db = await prerequisitesOnly(true);
await db.exec(`
insert into auth.users (id, email) values ('${DIR}','d@example.org'),('${SEG}','s@example.org'),('${TES}','t@example.org'),
  ('${MIS}','m@example.org'),('${PAR}','genitore@example.org'),('${ADU}','adulto@example.org'),('${OTH}','altro@example.org'),
  ('${UG1}','g1@example.org'),('${UG2}','g2@example.org');
insert into public.scd_memberships (organization_id, user_id, role, scope) values
  ('${ORG}','${DIR}','DIRECTION','{}'), ('${ORG}','${SEG}','SECRETARIAT','{}'), ('${ORG}','${TES}','STAFF','{"positions":["tesoreria"]}'),
  ('${ORG}','${MIS}','MISTER','{}'), ('${ORG}','${PAR}','FAMILY','{}'), ('${ORG}','${ADU}','ATHLETE','{}'), ('${ORG}','${OTH}','FAMILY','{}'),
  ('${ORG}','${UG1}','FAMILY','{}'), ('${ORG}','${UG2}','FAMILY','{}');
insert into public.scd_people (id, organization_id, first_name, last_name, birth_date, email, status) values
  ('${PARENT}','${ORG}','Genitore','Prova','${yearsAgo(42)}','genitore@example.org','ACTIVE'),
  ('${KID10}','${ORG}','Bimbo','Prova','${yearsAgo(10)}','bimbo@example.org','ACTIVE'),
  ('${KID16}','${ORG}','Ragazzo','Prova','${yearsAgo(16)}','ragazzo@example.org','ACTIVE'),
  ('${ADULT}','${ORG}','Adulto','Prova','${yearsAgo(20)}','adulto@example.org','ACTIVE'),
  ('${OTHERKID}','${ORG}','Altro','Esempio','${yearsAgo(9)}',null,'ACTIVE'),
  ('${MISTER}','${ORG}','Mister','Esempio','${yearsAgo(50)}','m@example.org','ACTIVE'),
  ('${OTHERPARENT}','${ORG}','Altra','Esempio','${yearsAgo(40)}','altro@example.org','ACTIVE'),
  ('${G1}','${ORG}','Primo','Tutore',null,'g1@example.org','ACTIVE'),
  ('${G2}','${ORG}','Seconda','Tutore',null,'g2@example.org','ACTIVE'),
  ('${NOBDKID}','${ORG}','Piccolo','Tutore',null,null,'ACTIVE'),
  ('${GRANNY}','${ORG}','Nonna','Tutore',null,null,'ACTIVE');
insert into public.scd_families (id, organization_id, display_name) values
  ('50000000-0000-0000-0000-000000000001','${ORG}','Famiglia Prova'), ('50000000-0000-0000-0000-000000000002','${ORG}','Famiglia Esempio'),
  ('50000000-0000-0000-0000-000000000003','${ORG}','Famiglia Tutore');
insert into public.scd_family_members (family_id, person_id, relationship, is_guardian) values
  ('50000000-0000-0000-0000-000000000001','${PARENT}','GENITORE',true),
  ('50000000-0000-0000-0000-000000000001','${KID10}','FIGLIO',false),
  ('50000000-0000-0000-0000-000000000001','${KID16}','FIGLIO',false),
  ('50000000-0000-0000-0000-000000000001','${ADULT}','FIGLIO',false),
  ('50000000-0000-0000-0000-000000000002','${OTHERPARENT}','GENITORE',true),
  ('50000000-0000-0000-0000-000000000002','${OTHERKID}','FIGLIO',false),
  ('50000000-0000-0000-0000-000000000003','${G1}','GENITORE',true),
  ('50000000-0000-0000-0000-000000000003','${G2}','GENITORE',true),
  ('50000000-0000-0000-0000-000000000003','${NOBDKID}','FIGLIO',false),
  ('50000000-0000-0000-0000-000000000003','${GRANNY}','NONNA',false);
insert into public.scd_identity_links (organization_id, user_id, person_id, link_state, match_method, confidence) values
  ('${ORG}','${PAR}','${PARENT}','VERIFIED_BY_STAFF','MANUAL_STAFF',100),
  ('${ORG}','${ADU}','${ADULT}','VERIFIED_BY_STAFF','MANUAL_STAFF',100),
  ('${ORG}','${MIS}','${MISTER}','VERIFIED_BY_STAFF','MANUAL_STAFF',100),
  ('${ORG}','${OTH}','${OTHERPARENT}','VERIFIED_BY_STAFF','MANUAL_STAFF',100),
  ('${ORG}','${UG1}','${G1}','VERIFIED_BY_STAFF','MANUAL_STAFF',100),
  ('${ORG}','${UG2}','${G2}','VERIFIED_BY_STAFF','MANUAL_STAFF',100);
insert into public.scd_seasons (id, organization_id, code, starts_on, ends_on, active) values ('${SEASON}','${ORG}','2026-27','2026-07-01','2027-06-30',true);
insert into public.scd_teams (id, organization_id, season_id, code, name) values ('${TEAM}','${ORG}','${SEASON}','U12','Squadra di prova');
insert into public.scd_athletes (organization_id, person_id, medical_certificate_expires_at) values
  ('${ORG}','${KID10}','${day(10)}'), ('${ORG}','${KID16}','${day(-5)}'), ('${ORG}','${ADULT}','${day(200)}'), ('${ORG}','${OTHERKID}',null);
insert into public.scd_team_memberships (organization_id, team_id, athlete_id)
  select '${ORG}', '${TEAM}', a.id from public.scd_athletes a;
insert into public.scd_structure_roles (organization_id, person_id, role_label, role_kind, team_id) values
  ('${ORG}','${MISTER}','Mister U12','MISTER','${TEAM}');
`);

await db.exec(R142);
await db.exec(R142); // idempotent

const as = async (uid, q, params = []) => {
  await db.exec(`select set_config('request.jwt.claim.sub', '${uid ?? ""}', false)`);
  return (await db.query(q, params)).rows;
};
const one = async (uid, q, params) => (await as(uid, q, params))[0];
const rpc = async (uid, fn, args) => {
  const ph = args.map((_, i) => `$${i + 1}`).join(", ");
  return (await one(uid, `select public.${fn}(${ph}) r`, args)).r;
};
const drawer = (uid) => rpc(uid, "scd_my_documents", [ORG]);
// scd_doc_register_upload is service_role only: the server passes the verified user id (no caller JWT here).
const reg = (uid, args) => rpc(null, "scd_doc_register_upload", [uid, ...args]);
const personOf = (d, id) => d.people.find((p) => p.personId === id);
const kindOf = (p, k) => p.delivered.find((x) => x.kind === k);

// ---------------------------------------------------------------- locks
for (const t of ["scd_document_requests", "scd_document_settings", "scd_document_notices", "scd_documents"]) {
  const r = (await db.query(`select relrowsecurity from pg_class where relname = $1`, [t])).rows[0];
  assert.equal(r.relrowsecurity, true, t);
}
for (const t of ["scd_document_requests", "scd_document_settings", "scd_document_notices"]) {
  assert.equal((await db.query(`select count(*)::int n from pg_policies where tablename = $1`, [t])).rows[0].n, 0, t);
  for (const role of ["anon", "authenticated"])
    assert.equal((await db.query(`select has_table_privilege('${role}', 'public.${t}', 'select') s`)).rows[0].s, false, `${role} ${t}`);
}
const pol = (await db.query(`select policyname from pg_policies where tablename = 'scd_documents' and cmd = 'SELECT' order by 1`)).rows.map((r) => r.policyname);
assert.ok(!pol.includes("scd_documents_select_member"), "r33 member-wide read removed");
assert.ok(pol.includes("scd_documents_select_office"));
const anonExec = await db.query(`select proname from pg_proc where (proname like 'scd_doc%' or proname in ('scd_my_documents','scd_team_documents_ok')) and has_function_privilege('anon', oid, 'execute')`);
assert.deepEqual(anonExec.rows, [], JSON.stringify(anonExec.rows));
const internal = await db.query(`select proname from pg_proc where proname in ('scd_doc_circle','scd_doc_due','scd_doc_expiry_run','scd_doc_register_upload','scd_doc_user_is_direzione') and has_function_privilege('authenticated', oid, 'execute')`);
assert.deepEqual(internal.rows, [], JSON.stringify(internal.rows));
const definers = await db.query(`select proname, prosecdef, proconfig from pg_proc where proname like 'scd_doc%' or proname in ('scd_my_documents','scd_team_documents_ok')`);
// finding 3: register_upload only for the server (service_role), never for a signed-in browser session
assert.equal((await db.query(`select has_function_privilege('service_role', 'public.scd_doc_register_upload(uuid, uuid, uuid, text, uuid, text, text, text, integer, text)', 'execute') e`)).rows[0].e, true);
assert.equal((await db.query(`select count(*)::int n from pg_proc where proname = 'scd_doc_register_upload'`)).rows[0].n, 1, "old signature dropped");
for (const f of definers.rows) assert.ok((f.proconfig ?? []).some((c) => c.startsWith("search_path=")), `${f.proname} search_path`);

// mister reading the table directly as an authenticated user sees nothing (office-only policy)
await db.exec(`insert into public.scd_documents (organization_id, person_id, document_type, title, section, status, source_id)
  values ('${ORG}', '${KID10}', 'INFORMATIVA_PRIVACY', 'INFORMATIVA_PRIVACY', 'FIRMATO', 'ACCETTATO', 'TALLY_VLAJNY')`);
await db.exec(`update public.scd_documents set accepted_at = now() - interval '40 days' where document_type = 'INFORMATIVA_PRIVACY'`);
await db.exec(`grant usage on schema public, auth to authenticated; grant select on public.scd_documents, public.scd_memberships to authenticated; grant execute on all functions in schema auth to authenticated`);
// finding 7: the policy uses the r95 offices per class: Tesoreria (position) does not read signatures/health/identity
for (const [uid, expected] of [[MIS, 0], [PAR, 0], [TES, 0], [SEG, 1], [DIR, 1]]) {
  await db.exec(`select set_config('request.jwt.claim.sub', '${uid}', false)`);
  await db.exec("set role authenticated");
  const n = (await db.query(`select count(*)::int n from public.scd_documents`)).rows[0].n;
  await db.exec("reset role");
  assert.equal(n, expected, `direct read as ${uid}`);
}

// ---------------------------------------------------------------- the drawer
{
  const d = await drawer(PAR);
  assert.equal(d.importDone, false);
  const ids = d.people.map((p) => p.personId).sort();
  assert.deepEqual(ids, [PARENT, KID10, KID16].sort(), "guardian sees self + minors only (no adult child, no other family)");
  assert.equal(d.people[0].personId, PARENT, "self first");
  assert.equal(personOf(d, KID10).label, "Bimbo P.");
  assert.equal(personOf(d, KID10).signed[0].kind, "INFORMATIVA_PRIVACY");
  const k10 = personOf(d, KID10);
  assert.equal(kindOf(k10, "CERTIFICATO_MEDICO").status, "IN_SCADENZA");
  assert.equal(kindOf(k10, "FOTOTESSERA").status, "NON_COLLEGATO", "unknown before the import, never 'mancante'");
  assert.equal(kindOf(k10, "DOC_IDENTITA_GENITORE").status, "NON_COLLEGATO");
  assert.equal(kindOf(k10, "ATTESTAZIONE_ISEE"), undefined, "optional kinds only when present or requested");
  assert.equal(kindOf(personOf(d, KID16), "CERTIFICATO_MEDICO").status, "SCADUTO");
  assert.deepEqual(personOf(d, PARENT).delivered, [], "a non-athlete adult has no required documents");
  assert.ok(!JSON.stringify(d).match(/driveFileId|drive_file_id|@example\.org/), "no Drive ids or e-mails in the drawer");

  const a = await drawer(ADU);
  assert.deepEqual(a.people.map((p) => p.personId), [ADULT], "adult athlete sees only themself");
  assert.equal(kindOf(a.people[0], "DOC_IDENTITA_GENITORE"), undefined, "no parent ID for adults");
  assert.equal(await drawer(null), null);

  // finding 1: two guardians without birth date never see each other; the child without birth date is a minor;
  // the grandparent (not guardian, no birth date, not athlete) is not.
  for (const [uid, self, other] of [[UG1, G1, G2], [UG2, G2, G1]]) {
    const g = await drawer(uid);
    assert.deepEqual(g.people.map((p) => p.personId).sort(), [self, NOBDKID].sort(), `guardian ${self} circle`);
    assert.equal((await rpc(uid, "scd_doc_upload_target", [ORG, other, "FOTOTESSERA", null])).code, "NOT_ALLOWED", "no upload for the other adult");
    assert.equal((await rpc(uid, "scd_doc_upload_target", [ORG, GRANNY, "FOTOTESSERA", null])).code, "NOT_ALLOWED", "no upload for a non-child adult");
    assert.equal((await rpc(uid, "scd_doc_upload_target", [ORG, NOBDKID, "FOTOTESSERA", null])).ok, true);
  }

  const lamp = await rpc(PAR, "scd_doc_lamp", [ORG]);
  assert.equal(Number(lamp.expired), 1);
  assert.equal(Number(lamp.expiring), 1);
  assert.equal(Number(lamp.total), 2);
  const lampOther = await rpc(OTH, "scd_doc_lamp", [ORG]);
  assert.equal(Number(lampOther.total), 0);
}

// ---------------------------------------------------------------- import mark: missing becomes «mancante»
await db.exec(`update public.scd_document_settings set enrolment_import_at = now() where organization_id = '${ORG}'`);
assert.equal(kindOf(personOf(await drawer(PAR), KID10), "FOTOTESSERA").status, "MANCANTE");

// ---------------------------------------------------------------- upload
{
  const ok = await rpc(PAR, "scd_doc_upload_target", [ORG, KID10, "FOTOTESSERA", null]);
  assert.equal(ok.ok, true);
  assert.equal(ok.folderHint, "Prova_Bimbo");
  for (const target of [OTHERKID, ADULT]) assert.equal((await rpc(PAR, "scd_doc_upload_target", [ORG, target, "FOTOTESSERA", null])).code, "NOT_ALLOWED");
  assert.equal((await rpc(PAR, "scd_doc_upload_target", [ORG, KID10, "INFORMATIVA_PRIVACY", null])).code, "BAD_KIND");
  assert.equal((await rpc(MIS, "scd_doc_upload_target", [ORG, KID10, "FOTOTESSERA", null])).code, "NOT_ALLOWED");
  assert.equal((await rpc(SEG, "scd_doc_upload_target", [ORG, KID10, "FOTOTESSERA", null])).ok, true, "Segreteria uploads on behalf");

  const bad = await reg(PAR, [ORG, KID10, "FOTOTESSERA", null, "../etc", "f.jpg", "image/jpeg", 1000, null]);
  assert.equal(bad.code, "BAD_FILE");
  const big = await reg(PAR, [ORG, KID10, "FOTOTESSERA", null, "1AbCdEfGhIjKlMnOp", "f.jpg", "image/jpeg", 10485761, null]);
  assert.equal(big.code, "BAD_FILE");
  const exe = await reg(PAR, [ORG, KID10, "FOTOTESSERA", null, "1AbCdEfGhIjKlMnOp", "f.exe", "application/x-msdownload", 1000, null]);
  assert.equal(exe.code, "BAD_FILE");
  const up = await reg(PAR, [ORG, KID10, "FOTOTESSERA", null, "1AbCdEfGhIjKlMnOp", "foto.jpg", "image/jpeg", 2000, "a".repeat(64)]);
  assert.equal(up.ok, true);
  assert.equal(kindOf(personOf(await drawer(PAR), KID10), "FOTOTESSERA").status, "IN_VERIFICA");
  // finding 3: the server's verified user id decides; an unknown user or a person outside the circle is refused
  assert.equal((await reg(U(99), [ORG, KID10, "FOTOTESSERA", null, "1AbCdEfGhIjKlMnXx", "f.jpg", "image/jpeg", 1000, null])).code, "NOT_ALLOWED");
  assert.equal((await reg(null, [ORG, KID10, "FOTOTESSERA", null, "1AbCdEfGhIjKlMnXx", "f.jpg", "image/jpeg", 1000, null])).code, "NOT_ALLOWED");
  assert.equal((await reg(PAR, [ORG, OTHERKID, "FOTOTESSERA", null, "1AbCdEfGhIjKlMnXx", "f.jpg", "image/jpeg", 1000, null])).code, "NOT_ALLOWED");
  const uploader = await one(SEG, `select uploaded_by from public.scd_documents where drive_file_id = '1AbCdEfGhIjKlMnOp'`);
  assert.equal(uploader.uploaded_by, PAR, "indexed as the verified user, not as the service");
  // finding 4: the daily cap answers BEFORE the Drive (upload target), and again at registration
  assert.equal((await rpc(OTH, "scd_doc_upload_target", [ORG, OTHERKID, "FOTOTESSERA", null])).ok, true);
  await db.exec(`insert into public.scd_documents (organization_id, person_id, document_type, title, section, status, uploaded_by, source_id)
    select '${ORG}', '${OTHERKID}', 'FOTOTESSERA', 'FOTOTESSERA', 'CONSEGNATO', 'CARICATO_IN_VERIFICA', '${OTH}', 'CAP_TEST' from generate_series(1, 30)`);
  assert.equal((await rpc(OTH, "scd_doc_upload_target", [ORG, OTHERKID, "FOTOTESSERA", null])).code, "TOO_MANY");
  assert.equal((await reg(OTH, [ORG, OTHERKID, "FOTOTESSERA", null, "1AbCdEfGhIjKlMnYy", "f.jpg", "image/jpeg", 1000, null])).code, "TOO_MANY");
  await db.exec(`delete from public.scd_documents where source_id = 'CAP_TEST'`);
  const audit = await db.query(`select payload from public.scd_audit_events where action = 'DOC_UPLOADED'`);
  assert.equal(audit.rows.length, 1);
  assert.ok(!JSON.stringify(audit.rows[0].payload).match(/Bimbo|Prova|foto\.jpg/), "audit has no names or file names");
}

// ---------------------------------------------------------------- requests, Segreteria, Tesoreria
{
  assert.equal((await rpc(MIS, "scd_doc_request_create", [ORG, KID10, "CERTIFICATO_MEDICO", "", null])).code, "NOT_ALLOWED");
  const req = await rpc(SEG, "scd_doc_request_create", [ORG, KID10, "CERTIFICATO_MEDICO", "Serve il nuovo certificato", day(20)]);
  assert.equal(req.ok, true);
  const again = await rpc(SEG, "scd_doc_request_create", [ORG, KID10, "CERTIFICATO_MEDICO", "doppia", null]);
  assert.equal(again.requestId, req.requestId);
  assert.equal(again.existing, true);
  assert.equal((await rpc(TES, "scd_doc_request_create", [ORG, KID10, "CERTIFICATO_MEDICO", "", null])).code, "NOT_ALLOWED", "Tesoreria: no health");
  const isee = await rpc(TES, "scd_doc_request_create", [ORG, KID10, "ATTESTAZIONE_ISEE", "Per il Fondo", null]);
  assert.equal(isee.ok, true);

  const d = await drawer(PAR);
  const k10 = personOf(d, KID10);
  assert.equal(k10.requests.length, 2);
  assert.equal(kindOf(k10, "ATTESTAZIONE_ISEE").status, "MANCANTE", "requested optional kind appears");
  assert.equal(Number((await rpc(PAR, "scd_doc_lamp", [ORG])).requests), 2);

  // family uploads the certificate for the request
  const cert = await reg(PAR, [ORG, KID10, "CERTIFICATO_MEDICO", req.requestId, "1CeRtIfIcAtO_000", "cert.pdf", "application/pdf", 5000, null]);
  assert.equal(cert.ok, true);
  const iseeUp = await reg(PAR, [ORG, KID10, "ATTESTAZIONE_ISEE", null, "1IsEe_0000000000", "isee.pdf", "application/pdf", 5000, null]);
  assert.equal(iseeUp.ok, true);
  const reqRow = await one(SEG, `select status, document_id from public.scd_document_requests where id = $1`, [req.requestId]);
  assert.deepEqual(reqRow, { status: "CARICATO_IN_VERIFICA", document_id: cert.documentId });
  const iseeReq = await one(SEG, `select status from public.scd_document_requests where id = $1`, [isee.requestId]);
  assert.equal(iseeReq.status, "CARICATO_IN_VERIFICA", "upload without request id links the open request of the same kind");

  // boards: Segreteria sees health + identity, Tesoreria only ISEE, mister nothing
  const seg = await rpc(SEG, "scd_doc_office_board", [ORG, "Bim"]);
  assert.deepEqual(seg.classes, ["FIRMA", "SANITARIO", "IDENTITA", "ECONOMICO"]);
  assert.deepEqual(seg.toVerify.map((x) => x.kind).sort(), ["ATTESTAZIONE_ISEE", "CERTIFICATO_MEDICO", "FOTOTESSERA"]);
  assert.equal(seg.people.length, 1);
  assert.equal(seg.canSwitchMail, false);
  const tes = await rpc(TES, "scd_doc_office_board", [ORG, ""]);
  assert.deepEqual(tes.classes, ["ECONOMICO"]);
  assert.deepEqual(tes.toVerify.map((x) => x.kind), ["ATTESTAZIONE_ISEE"]);
  assert.deepEqual(tes.requests.map((x) => x.kind), ["ATTESTAZIONE_ISEE"]);
  assert.equal(await rpc(MIS, "scd_doc_office_board", [ORG, ""]), null);
  assert.equal(await rpc(PAR, "scd_doc_office_board", [ORG, ""]), null);

  // review
  assert.equal((await rpc(MIS, "scd_doc_review", [ORG, cert.documentId, "APPROVA", day(365), "AGONISTICO", null])).code, "NOT_ALLOWED");
  assert.equal((await rpc(TES, "scd_doc_review", [ORG, cert.documentId, "APPROVA", day(365), "AGONISTICO", null])).code, "NOT_ALLOWED");
  assert.equal((await rpc(SEG, "scd_doc_review", [ORG, cert.documentId, "APPROVA", null, "AGONISTICO", null])).code, "EXPIRY_REQUIRED");
  assert.equal((await rpc(SEG, "scd_doc_review", [ORG, cert.documentId, "RIFIUTA", null, null, ""])).code, "NOTE_REQUIRED");
  assert.equal((await rpc(SEG, "scd_doc_review", [ORG, cert.documentId, "APPROVA", day(365), "AGONISTICO", null])).ok, true);
  const ath = await one(SEG, `select medical_certificate_expires_at::text e, medical_certificate_status s from public.scd_athletes where person_id = $1`, [KID10]);
  assert.deepEqual(ath, { e: day(365), s: "VERIFIED" }, "certificate written through r66 (single source of truth)");
  assert.equal((await one(SEG, `select status from public.scd_document_requests where id = $1`, [req.requestId])).status, "APPROVATO");
  assert.equal(kindOf(personOf(await drawer(PAR), KID10), "CERTIFICATO_MEDICO").status, "IN_REGOLA");
  assert.equal((await rpc(TES, "scd_doc_review", [ORG, iseeUp.documentId, "RIFIUTA", null, null, "Attestazione non leggibile"])).ok, true);
  const k10b = personOf(await drawer(PAR), KID10);
  assert.equal(kindOf(k10b, "ATTESTAZIONE_ISEE").status, "RIFIUTATO");
  assert.equal(kindOf(k10b, "ATTESTAZIONE_ISEE").reviewNote, "Attestazione non leggibile");
  assert.equal((await rpc(SEG, "scd_doc_review", [ORG, cert.documentId, "APPROVA", day(365), null, null])).code, "NOT_PENDING");

  // second approved photo supersedes the first
  const photo = (await one(SEG, `select id from public.scd_documents where document_type = 'FOTOTESSERA'`)).id;
  assert.equal((await rpc(SEG, "scd_doc_review", [ORG, photo, "APPROVA", null, null, null])).ok, true);
  const photo2 = await reg(PAR, [ORG, KID10, "FOTOTESSERA", null, "1AbCdEfGhIjKlMnOq", "foto2.jpg", "image/jpeg", 2000, null]);
  assert.equal((await rpc(SEG, "scd_doc_review", [ORG, photo2.documentId, "APPROVA", null, null, null])).ok, true);
  const statuses = (await db.query(`select status from public.scd_documents where document_type = 'FOTOTESSERA' order by created_at`)).rows.map((r) => r.status);
  assert.deepEqual(statuses, ["SOSTITUITO", "APPROVATO"]);
  assert.equal(kindOf(personOf(await drawer(PAR), KID10), "FOTOTESSERA").status, "IN_REGOLA", "kind without expiry: approved = in regola");

  // finding 2: unknown expiry is never «in regola»
  assert.equal((await db.query(`select public.scd_doc_state(null) s`)).rows[0].s, "DA_VERIFICARE");
  const idUp = await reg(PAR, [ORG, KID10, "DOC_IDENTITA_ATLETA_FRONTE", null, "1IdEnTiTa_0000000", "id.jpg", "image/jpeg", 2000, null]);
  assert.equal((await rpc(SEG, "scd_doc_review", [ORG, idUp.documentId, "APPROVA", null, null, null])).ok, true);
  const idItem = kindOf(personOf(await drawer(PAR), KID10), "DOC_IDENTITA_ATLETA_FRONTE");
  assert.equal(idItem.status, "DA_VERIFICARE", "approved ID without expiry date");
  assert.equal(idItem.expiresAt, null);
  // certificate: state only from scd_athletes; an approved row with a date in scd_documents is not a second source
  await db.exec(`insert into public.scd_documents (organization_id, person_id, document_type, title, section, status, expires_at, verified_at, source_id)
    values ('${ORG}', '${OTHERKID}', 'CERTIFICATO_MEDICO', 'CERTIFICATO_MEDICO', 'CONSEGNATO', 'APPROVATO', '${day(300)}', now(), 'DRIVE_IMPORT')`);
  const oc = kindOf(personOf(await drawer(OTH), OTHERKID), "CERTIFICATO_MEDICO");
  assert.equal(oc.status, "DA_VERIFICARE", "no fallback to scd_documents.expires_at");
  assert.equal(oc.expiresAt, null);
  await db.exec(`delete from public.scd_documents where person_id = '${OTHERKID}' and document_type = 'CERTIFICATO_MEDICO'`);
  // nothing is APPROVATO without a review
  await assert.rejects(() => db.exec(`insert into public.scd_documents (organization_id, person_id, document_type, title, section, status, source_id)
    values ('${ORG}', '${KID16}', 'FOTOTESSERA', 'FOTOTESSERA', 'CONSEGNATO', 'APPROVATO', 'TALLY_VLAJNY')`), /scd_documents_r144_approved_check/);

  // finding 7: % and _ are literal in the people search
  assert.deepEqual((await rpc(SEG, "scd_doc_office_board", [ORG, "%%"])).people, []);
  assert.deepEqual((await rpc(SEG, "scd_doc_office_board", [ORG, "__"])).people, []);
  assert.equal((await rpc(SEG, "scd_doc_office_board", [ORG, "imb"])).people.length, 1);
  // Tesoreria reads the table directly only for ISEE rows
  await db.exec(`select set_config('request.jwt.claim.sub', '${TES}', false)`);
  await db.exec("set role authenticated");
  const tesRows = (await db.query(`select distinct document_type from public.scd_documents`)).rows.map((r) => r.document_type);
  await db.exec("reset role");
  assert.deepEqual(tesRows, ["ATTESTAZIONE_ISEE"]);
}

// ---------------------------------------------------------------- mister: one boolean per athlete
{
  const rows = await as(MIS, `select * from public.scd_team_documents_ok($1)`, [ORG]);
  assert.equal(rows.length, 4);
  assert.deepEqual(Object.keys(rows[0]).sort(), ["in_regola", "person_id", "team_id"]);
  const by = Object.fromEntries(rows.map((r) => [r.person_id, r.in_regola]));
  assert.equal(by[KID16], false, "expired certificate");
  assert.equal(by[OTHERKID], false, "no certificate");
  assert.equal(by[KID10], false, "IDs still missing");
  // delivered but not verified yet: unknown (null), never «in regola» and never «missing»
  await db.exec(`insert into public.scd_documents (organization_id, person_id, document_type, title, section, status, source_id)
    select '${ORG}', '${ADULT}', k.code, k.code, 'CONSEGNATO', 'CARICATO_IN_VERIFICA', 'TALLY_VLAJNY'
    from public.scd_doc_kinds() k where k.required = 'ATLETA' and k.code <> 'CERTIFICATO_MEDICO'`);
  const adult = (await as(MIS, `select in_regola from public.scd_team_documents_ok($1) where person_id = $2`, [ORG, ADULT]))[0];
  assert.equal(adult.in_regola, null, "only in verification = da verificare");
  await db.exec(`delete from public.scd_documents where person_id = '${ADULT}' and source_id = 'TALLY_VLAJNY'`);
  assert.equal((await as(PAR, `select * from public.scd_team_documents_ok($1)`, [ORG])).length, 0, "families get no team list");
}

// ---------------------------------------------------------------- expiry notices through the r95 outbox
{
  const run = async () => (await db.query(`select public.scd_doc_expiry_run() r`)).rows[0].r;
  const msgs = async () => (await db.query(`select count(*)::int n from public.scd_comm_messages`)).rows[0].n;
  // OFF: nothing queued, counts audited
  let r = await run();
  assert.equal(r[0].sending, false);
  assert.ok(r[0].pending >= 1);
  assert.equal(await msgs(), 0);
  // only the Direzione switches the expiry mails
  assert.equal((await rpc(SEG, "scd_doc_set_expiry_mail", [ORG, true])).code, "NOT_ALLOWED");
  assert.equal((await rpc(DIR, "scd_doc_set_expiry_mail", [ORG, true])).ok, true);
  r = await run();
  assert.equal(r[0].sending, false, "r95 sending still off");
  assert.equal(await msgs(), 0);
  await db.exec(`update public.scd_comm_settings set gmail_connected = true, sending_enabled = true where organization_id = '${ORG}'`);
  // an under-14 child with own address: never written to
  r = await run();
  assert.equal(r[0].sending, true);
  assert.ok(r[0].queued >= 1);
  const rec = (await db.query(`select r.email, r.kind, r.cc_emails, m.sender_user_id, m.delivery, m.body_text
    from public.scd_comm_recipients r join public.scd_comm_messages m on m.id = r.message_id order by r.email`)).rows;
  const emails = rec.map((x) => x.email);
  assert.ok(!emails.includes("bimbo@example.org"), "never a child under 14");
  assert.ok(emails.includes("ragazzo@example.org"), "14-17 written to with guardian in copy");
  assert.deepEqual(rec.find((x) => x.email === "ragazzo@example.org").cc_emails, ["genitore@example.org"]);
  for (const x of rec) {
    assert.equal(x.delivery, "QUEUED");
    assert.equal(x.sender_user_id, DIR);
    assert.ok(!/certificat|sanitari|ISEE/i.test(x.body_text), "generic body");
  }
  // finding 7: singular for one document
  assert.match(rec.find((x) => x.email === "ragazzo@example.org").body_text, /ci sono 1 documento scaduto o in scadenza/);
  const n1 = await msgs();
  r = await run();
  assert.equal(r[0].queued, 0, "one notice per person/kind/expiry/state");
  assert.equal(await msgs(), n1);
  // finding 7: the Direzione user who switched the mails on must still hold the office at every run
  await db.exec(`update public.scd_memberships set active = false where user_id = '${DIR}'`);
  await db.exec(`update public.scd_athletes set medical_certificate_expires_at = '${day(-1)}' where person_id = '${ADULT}'`);
  r = await run();
  assert.equal(r[0].sending, false, "enabler lost the Direzione office: nothing queued");
  assert.equal(r[0].enablerLost, true);
  assert.ok(r[0].pending >= 1);
  assert.equal(await msgs(), n1);
  await db.exec(`update public.scd_memberships set active = true where user_id = '${DIR}'`);
  r = await run();
  assert.equal(r[0].sending, true);
  assert.equal(await msgs(), n1 + 1);
}

console.log("r144 my documents: all assertions passed");
