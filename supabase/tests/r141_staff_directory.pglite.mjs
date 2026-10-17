// r141 staff directory — behaviour test on an in-memory Postgres (PGlite), no remote database touched.
// Run from the repository root (PGlite is not a dependency of the app, so it is installed in a throwaway folder):
//   npm install --prefix /tmp/scd-pglite @electric-sql/pglite@0.5.10
//   PGLITE_DIR=/tmp/scd-pglite node supabase/tests/r141_staff_directory.pglite.mjs
// Exit code 0 = every assertion passed. The real r33, r35, r59, r61, r61_1, r63_1, r65_1 and r132 files are loaded
// (pgcrypto is built into Postgres 13+, so its "create extension" line is skipped); scd_has_position (r74) is created in
// its real shape. People, numbers and names are invented: phone values are placeholders ("TEL-..."), never numbers.
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
const mig = (f) => readFileSync(fileURLToPath(new URL(`../migrations/${f}`, import.meta.url)), "utf8").replace(/create extension[^;]*;/gi, "");
const BASE = [
  "20260929_r33_club_graph_foundation.sql",
  "20260929_r35_auth_context_rls_normalization.sql",
  "20261011_r59_people_lifecycle_and_consents.sql",
  "20261011_r61_team_and_family_scoped_access.sql",
  "20261011_r61_1_sports_coordinator_scope.sql",
  "20261011_r63_1_staff_directory_helper.sql",
  "20261011_r65_1_team_scope.sql",
];
const R132 = mig("20261015_r132_consents_fix.sql");
const R141 = mig("20261017_r141_staff_directory.sql");

const prelude = `
create role anon; create role authenticated;
create schema auth;
create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
`;
const r74 = `
create or replace function public.scd_has_position(p_organization_id uuid, p_positions text[]) returns boolean language sql stable set search_path to 'public' as $$
  select exists (select 1 from public.scd_memberships m where m.organization_id = p_organization_id and m.user_id = (select auth.uid()) and m.active
    and jsonb_typeof(m.scope -> 'positions') = 'array'
    and exists (select 1 from jsonb_array_elements_text(m.scope -> 'positions') p where p = any(p_positions))) $$;
grant usage on schema public, auth to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
`;

async function base(withR132 = true) {
  const db = new PGlite();
  await db.exec(prelude);
  for (const f of BASE) await db.exec(mig(f));
  await db.exec(r74);
  // The r35 signup trigger is not under test here (it needs the live organization setup).
  await db.exec("drop trigger if exists on_auth_user_created_scd on auth.users;");
  if (withR132) await db.exec(R132);
  return db;
}

// 0. Fail closed without r132: nothing of r141 is left behind.
{
  const bare = await base(false);
  await assert.rejects(() => bare.exec(R141), /r141 prerequisites missing/);
  await bare.exec("rollback");
  const left = await bare.query(`select to_regprocedure('public.scd_staff_directory(uuid)') f,
    (select count(*)::int from information_schema.columns where table_name = 'scd_structure_roles' and column_name = 'needs_review') c`);
  assert.deepEqual(left.rows[0], { f: null, c: 0 });
}

const db = await base(true);

const ORG = "00000000-0000-0000-0000-000000000001";
const SEASON = "00000000-0000-0000-0000-0000000000a1";
const T = { u15: "00000000-0000-0000-0000-0000000000b1", u19: "00000000-0000-0000-0000-0000000000b2", u18: "00000000-0000-0000-0000-0000000000b3", prima: "00000000-0000-0000-0000-0000000000b4" };
const U = {
  dir: "10000000-0000-0000-0000-000000000001",
  seg: "10000000-0000-0000-0000-000000000002",
  mis: "10000000-0000-0000-0000-000000000003",
  fam: "10000000-0000-0000-0000-000000000004",
  kid: "10000000-0000-0000-0000-000000000005", // minor athlete with a login
  base: "10000000-0000-0000-0000-000000000006", // USER_BASE, not verified
  pre: "10000000-0000-0000-0000-000000000007", // presidente position (STAFF role)
};
const P = {
  mister: "20000000-0000-0000-0000-000000000001", // mister U15, agreed, has a number
  dirU19: "20000000-0000-0000-0000-000000000002", // dirigente U19, did not answer
  pulmini: "20000000-0000-0000-0000-000000000003", // responsabile pulmini, agreed
  segr: "20000000-0000-0000-0000-000000000004", // segreteria, agreed
  tes: "20000000-0000-0000-0000-000000000005", // tesoreria, agreed (not a club area for misters)
  helper: "20000000-0000-0000-0000-000000000006", // MINOR helper with a U15 role: never listed
  u18: "20000000-0000-0000-0000-000000000007", // staff of the withdrawn U18
  parent: "20000000-0000-0000-0000-000000000008",
  child: "20000000-0000-0000-0000-000000000009", // minor athlete, U15
  noNum: "20000000-0000-0000-0000-000000000010", // magazzino, agreed but no number
};

await db.exec(`
insert into auth.users (id) values ${Object.values(U).map((u) => `('${u}')`).join(", ")};
insert into public.scd_organizations (id, slug, name) values ('${ORG}', 'scd-colicoderviese', 'S.C.D. ColicoDerviese');
insert into public.scd_seasons (id, organization_id, code, starts_on, ends_on, active) values ('${SEASON}', '${ORG}', '2026-27', '2026-07-01', '2027-06-30', true);
insert into public.scd_teams (id, organization_id, season_id, code, name) values
  ('${T.u15}', '${ORG}', '${SEASON}', 'u15', 'U15'), ('${T.u19}', '${ORG}', '${SEASON}', 'u19', 'Juniores U19'),
  ('${T.u18}', '${ORG}', '${SEASON}', 'u18', 'U18'), ('${T.prima}', '${ORG}', '${SEASON}', 'prima', 'Prima Squadra');
insert into public.scd_memberships (organization_id, user_id, role, scope) values
  ('${ORG}', '${U.dir}', 'DIRECTION', '{}'), ('${ORG}', '${U.seg}', 'SECRETARIAT', '{}'), ('${ORG}', '${U.mis}', 'MISTER', '{}'),
  ('${ORG}', '${U.fam}', 'FAMILY', '{}'), ('${ORG}', '${U.kid}', 'ATHLETE', '{}'), ('${ORG}', '${U.base}', 'USER_BASE', '{}'),
  ('${ORG}', '${U.pre}', 'STAFF', '{"positions":["presidente"]}');
insert into public.scd_people (id, organization_id, first_name, last_name, birth_date, phone) values
  ('${P.mister}', '${ORG}', 'Mario', 'Allenatore', '1980-01-01', 'TEL-MISTER'),
  ('${P.dirU19}', '${ORG}', 'Dario', 'Dirigente', '1975-01-01', 'TEL-DIRIGENTE'),
  ('${P.pulmini}', '${ORG}', 'Paolo', 'Pulmini', '1970-01-01', 'TEL-PULMINI'),
  ('${P.segr}', '${ORG}', 'Sara', 'Segreteria', '1985-01-01', 'TEL-SEGRETERIA'),
  ('${P.tes}', '${ORG}', 'Tina', 'Tesoreria', '1982-01-01', 'TEL-TESORERIA'),
  ('${P.helper}', '${ORG}', 'Luca', 'Aiutante', '2011-05-01', 'TEL-MINORE'),
  ('${P.u18}', '${ORG}', 'Ugo', 'Diciotto', '1979-01-01', 'TEL-U18'),
  ('${P.parent}', '${ORG}', 'Gina', 'Genitore', '1984-01-01', 'TEL-GENITORE'),
  ('${P.child}', '${ORG}', 'Leo', 'Genitore', '2012-03-01', null),
  ('${P.noNum}', '${ORG}', 'Marta', 'Magazzino', '1990-01-01', null);
insert into public.scd_identity_links (organization_id, user_id, person_id, link_state, match_method, confidence) values
  ('${ORG}', '${U.mis}', '${P.mister}', 'VERIFIED_BY_STAFF', 'MANUAL_STAFF', 100),
  ('${ORG}', '${U.fam}', '${P.parent}', 'VERIFIED_BY_STAFF', 'MANUAL_STAFF', 100),
  ('${ORG}', '${U.kid}', '${P.child}', 'VERIFIED_BY_STAFF', 'MANUAL_STAFF', 100);
insert into public.scd_families (id, organization_id, display_name) values ('30000000-0000-0000-0000-000000000001', '${ORG}', 'Famiglia Genitore');
insert into public.scd_family_members (family_id, person_id, relationship, is_guardian) values
  ('30000000-0000-0000-0000-000000000001', '${P.parent}', 'GENITORE', true),
  ('30000000-0000-0000-0000-000000000001', '${P.child}', 'FIGLIO', false);
insert into public.scd_athletes (id, organization_id, person_id) values ('40000000-0000-0000-0000-000000000001', '${ORG}', '${P.child}');
insert into public.scd_team_memberships (organization_id, team_id, athlete_id) values ('${ORG}', '${T.u15}', '40000000-0000-0000-0000-000000000001');
insert into public.scd_structure_roles (organization_id, person_id, role_label, role_kind, team_id, area_id) values
  ('${ORG}', '${P.mister}', 'Mister', 'MISTER', '${T.u15}', null),
  ('${ORG}', '${P.dirU19}', 'Dirigente accompagnatore', 'DIRIGENTE', '${T.u19}', null),
  ('${ORG}', '${P.pulmini}', 'Responsabile servizio pulmini', 'RESPONSABILE', null, 'pulmini'),
  ('${ORG}', '${P.segr}', 'Segreteria front office', 'STAFF', null, 'segreteria'),
  ('${ORG}', '${P.tes}', 'Tesoreria', 'RESPONSABILE', null, 'tesoreria'),
  ('${ORG}', '${P.helper}', 'Aiuto allenatore', 'STAFF', '${T.u15}', null),
  ('${ORG}', '${P.u18}', 'Mister', 'MISTER', '${T.u18}', null),
  ('${ORG}', '${P.noNum}', 'Responsabile magazzino attrezzi', 'RESPONSABILE', null, 'magazzino');
`);

// 1. Apply r141 (real seed: invented people, so nothing matches) and apply it again (idempotent).
await db.exec(R141);
await db.exec(R141);

// U18: the withdrawn team's staff role is closed with a history row; nothing else closed.
{
  const r = await db.query(`select active, valid_to::text v from public.scd_structure_roles where person_id = '${P.u18}'`);
  assert.deepEqual(r.rows, [{ active: false, v: "2026-10-17" }]);
  const e = await db.query(`select count(*)::int n from public.scd_person_events where person_id = '${P.u18}' and event_type = 'CAMBIO_RUOLO'`);
  assert.equal(e.rows[0].n, 1, "one history row even after the second run");
  const open = await db.query(`select count(*)::int n from public.scd_structure_roles where active`);
  assert.equal(open.rows[0].n, 7);
  const seeded = await db.query(`select count(*)::int n from public.scd_structure_roles where source_record_id like 'r141:%'`);
  assert.equal(seeded.rows[0].n, 0, "invented people never match the declared organigram");
}

// Consents of the test people (rule 3): the U19 dirigente never answered.
await db.exec(`
insert into public.scd_person_consents (organization_id, person_id, consent_type, granted, policy_version) values
  ('${ORG}', '${P.mister}', 'TELEFONO_STAFF_CONDIVISO', true, 'test'),
  ('${ORG}', '${P.pulmini}', 'TELEFONO_STAFF_CONDIVISO', true, 'test'),
  ('${ORG}', '${P.segr}', 'TELEFONO_STAFF_CONDIVISO', true, 'test'),
  ('${ORG}', '${P.tes}', 'TELEFONO_STAFF_CONDIVISO', true, 'test'),
  ('${ORG}', '${P.helper}', 'TELEFONO_STAFF_CONDIVISO', true, 'test'),
  ('${ORG}', '${P.noNum}', 'TELEFONO_STAFF_CONDIVISO', true, 'test');
`);

async function as(user, sql) {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${user}', false);`);
  try {
    return await db.query(sql);
  } finally {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`);
  }
}
async function dir(user) {
  const r = await as(user, `select public.scd_staff_directory('${ORG}') d`);
  return r.rows[0].d;
}
const byName = (d) => Object.fromEntries(d.people.map((p) => [p.name, p]));

// 2. Direzione: everybody (adults, active roles), never the minor helper nor the closed U18 role.
{
  const d = await dir(U.dir);
  assert.equal(d.viewer, "OFFICE");
  const n = byName(d);
  assert.deepEqual(Object.keys(n).sort(), ["Dario Dirigente", "Mario Allenatore", "Marta Magazzino", "Paolo Pulmini", "Sara Segreteria", "Tina Tesoreria"]);
  assert.equal(n["Mario Allenatore"].phone, "TEL-MISTER");
  assert.equal(n["Mario Allenatore"].phoneState, "SHARED");
  assert.equal(n["Dario Dirigente"].phone, null, "no consent: no number, even for the Direzione");
  assert.equal(n["Dario Dirigente"].phoneState, "NOT_SHARED");
  assert.equal(n["Marta Magazzino"].phoneState, "NO_NUMBER");
  assert.equal(n["Mario Allenatore"].roles[0].teamCode, "u15");
  assert.equal(JSON.stringify(d).includes("TEL-MINORE"), false);
  assert.equal(JSON.stringify(d).includes("Aiutante"), false);
  assert.equal(JSON.stringify(d).includes("birth"), false);
}
// Presidente position (STAFF role) is office too.
assert.equal((await dir(U.pre)).viewer, "OFFICE");

// 3. Mister U15: own team + club areas (pulmini, campi, magazzino, palestra, segreteria); not U19, not Tesoreria.
{
  const d = await dir(U.mis);
  assert.equal(d.viewer, "STAFF");
  const n = byName(d);
  assert.deepEqual(Object.keys(n).sort(), ["Mario Allenatore", "Marta Magazzino", "Paolo Pulmini", "Sara Segreteria"]);
  assert.equal(n["Paolo Pulmini"].phone, "TEL-PULMINI");
  assert.deepEqual(d.clubAreas, ["pulmini", "campi", "magazzino", "palestra", "segreteria"]);
  assert.equal(d.me.personId, P.mister);
  assert.equal(d.me.consent, true);
  assert.equal(d.me.hasPhone, true);
  assert.equal(JSON.stringify(d.me).includes("TEL-"), false, "own number never sent back");
}

// 4. Family (guardian of a U15 athlete): the U15 staff + the Segreteria only.
{
  const d = await dir(U.fam);
  assert.equal(d.viewer, "FAMILY");
  const n = byName(d);
  assert.deepEqual(Object.keys(n).sort(), ["Mario Allenatore", "Sara Segreteria"]);
  assert.equal(n["Mario Allenatore"].phone, "TEL-MISTER");
  assert.equal(d.me, null);
}

// 5. Minor athlete: names of the own team staff and the Segreteria, never a number.
{
  const d = await dir(U.kid);
  assert.equal(d.callerAdult, false);
  assert.deepEqual(d.people.map((p) => p.name).sort(), ["Mario Allenatore", "Sara Segreteria"]);
  for (const p of d.people) {
    assert.equal(p.phone, null);
    assert.equal(p.phoneState, "NOT_SHARED");
  }
}

// 6. USER_BASE (not verified) and anon: nothing.
assert.equal(await dir(U.base), null);
await db.exec("set role anon");
await assert.rejects(() => db.query(`select public.scd_staff_directory('${ORG}')`), /permission denied/);
await db.exec("reset role");

// 7. RLS rule 1 on scd_people + phone column out of direct reads.
{
  const r = await as(U.mis, `select display_name from public.scd_people order by 1`);
  assert.deepEqual(r.rows.map((x) => x.display_name), ["Mario Allenatore", "Marta Magazzino", "Paolo Pulmini", "Sara Segreteria"]);
  await assert.rejects(() => as(U.mis, `select phone from public.scd_people`), /permission denied/);
  await assert.rejects(() => as(U.dir, `select phone from public.scd_people`), /permission denied/);
  const office = await as(U.dir, `select public.scd_person_phone('${ORG}', '${P.dirU19}') p`);
  assert.equal(office.rows[0].p, "TEL-DIRIGENTE", "office keeps reading numbers through the audited path");
  const notOffice = await as(U.mis, `select public.scd_person_phone('${ORG}', '${P.dirU19}') p`);
  assert.equal(notOffice.rows[0].p, null);
  const all = await as(U.dir, `select count(*)::int n from public.scd_people`);
  assert.equal(all.rows[0].n, 10, "office still reads every row");
}

// 8. Own answer: history kept, only one active choice, default false until answered.
{
  await as(U.mis, `select public.scd_set_my_phone_share('${ORG}', false)`);
  assert.equal((await dir(U.mis)).me.consent, false);
  assert.equal(byName(await dir(U.fam))["Mario Allenatore"].phone, null, "after NO the family gets no number");
  await as(U.mis, `select public.scd_set_my_phone_share('${ORG}', true)`);
  const h = await db.query(`select count(*)::int n, count(*) filter (where revoked_at is null)::int a from public.scd_person_consents
    where person_id = '${P.mister}' and consent_type = 'TELEFONO_STAFF_CONDIVISO'`);
  assert.deepEqual(h.rows[0], { n: 3, a: 1 });
  const src = await db.query(`select given_by_role, channel from public.scd_person_consents where person_id = '${P.mister}' and revoked_at is null`);
  assert.deepEqual(src.rows[0], { given_by_role: "SELF", channel: "APP" });
  await assert.rejects(() => as(U.fam, `select public.scd_set_my_phone_share('${ORG}', true)`), /not a staff member/);
  await assert.rejects(() => as(U.kid, `select public.scd_set_my_phone_share('${ORG}', true)`), /not a staff member/);
}

// 9. Seed mechanics with invented rows (the session-only helpers of the migration, same text). Rows declared with a
//    doubt (review, surname only) are stored INACTIVE: they grant no roster access.
{
  const fns = [...R141.matchAll(/create or replace function pg_temp\.scd_r141_\w+\([\s\S]*?\n\$\$;/g)].map((m) => m[0]);
  assert.equal(fns.length, 3);
  for (const f of fns) await db.exec(f);
  await db.exec(`
    insert into auth.users (id) values ('10000000-0000-0000-0000-000000000009');
    insert into public.scd_memberships (organization_id, user_id, role, scope) values ('${ORG}', '10000000-0000-0000-0000-000000000009', 'STAFF', '{}');
    insert into public.scd_people (id, organization_id, first_name, last_name, birth_date) values
      ('50000000-0000-0000-0000-000000000001', '${ORG}', 'Anna Maria', 'Nuova', '1988-01-01'),
      ('50000000-0000-0000-0000-000000000002', '${ORG}', 'Ugo', 'Doppio', '1960-01-01'),
      ('50000000-0000-0000-0000-000000000003', '${ORG}', 'Ugo', 'Doppio', '2010-01-01'),
      ('50000000-0000-0000-0000-000000000004', '${ORG}', 'Ivo', 'Omonimo', '1980-01-01'),
      ('50000000-0000-0000-0000-000000000005', '${ORG}', 'Ivo', 'Omonimo', '1985-01-01'),
      ('50000000-0000-0000-0000-000000000006', '${ORG}', 'Zeno', 'Senzaruolo', '1985-01-01');
    insert into public.scd_identity_links (organization_id, user_id, person_id, link_state, match_method, confidence) values
      ('${ORG}', '10000000-0000-0000-0000-000000000009', '50000000-0000-0000-0000-000000000001', 'VERIFIED_BY_STAFF', 'MANUAL_STAFF', 100);`);
  const rows = [
    { n: 1, team: "prima", label: "Secondo allenatore", kind: "MISTER", area: null, mode: "FULL", person: "Nuova Anna Maria Seconda", review: false },
    { n: 2, team: null, label: "Responsabile palestra", kind: "RESPONSABILE", area: "palestra", mode: "FULL", person: "Doppio Ugo", review: true },
    { n: 3, team: null, label: "Biglietteria", kind: "STAFF", area: "biglietteria", mode: "FULL", person: "Omonimo Ivo", review: false },
    { n: 4, team: "u15", label: "Mister", kind: "MISTER", area: null, mode: "SURNAME", person: "Allenatore", review: true },
    { n: 5, team: "u17", label: "Mister", kind: "MISTER", area: null, mode: "FULL", person: "Nuova Anna Maria", review: false },
    { n: 6, team: null, label: "Tesoreria", kind: "RESPONSABILE", area: "tesoreria", mode: "SURNAME", person: "Senzaruolo", review: true },
    { n: 7, team: null, label: "Tuttofare", kind: "STAFF", area: "campi", mode: "FULL", person: "Assente Persona", review: false },
    { n: 8, team: "u15", label: "Dirigente accompagnatore", kind: "DIRIGENTE", area: null, mode: "SURNAME", person: "Nuova", review: false },
  ];
  const run = async () => (await db.query(`select pg_temp.scd_r141_seed('${ORG}', $1::jsonb, 'TEST') s`, [JSON.stringify(rows)])).rows[0].s;
  const s1 = await run();
  assert.equal(s1.inserted, 3, JSON.stringify(s1));
  assert.equal(s1.insertedInactive, 2, "review row and surname-only row are inactive");
  assert.equal(s1.alreadyPresent, 1, "surname-only Mister U15 already holds the role");
  const reasons = Object.fromEntries(s1.skipped.map((x) => [x.n, x.reason]));
  assert.deepEqual(reasons, { 3: "PERSON_AMBIGUOUS", 5: "TEAM_NOT_FOUND", 6: "PERSON_NOT_FOUND", 7: "PERSON_NOT_FOUND" });
  const ins = await db.query(`select person_id::text p, role_label, active, needs_review, season_id::text s, source_record_id from public.scd_structure_roles where source_id = 'TEST' order by source_record_id`);
  assert.deepEqual(ins.rows, [
    { p: "50000000-0000-0000-0000-000000000001", role_label: "Secondo allenatore", active: true, needs_review: false, s: SEASON, source_record_id: "r141:1" },
    { p: "50000000-0000-0000-0000-000000000002", role_label: "Responsabile palestra", active: false, needs_review: true, s: SEASON, source_record_id: "r141:2" },
    { p: "50000000-0000-0000-0000-000000000001", role_label: "Dirigente accompagnatore", active: false, needs_review: true, s: SEASON, source_record_id: "r141:8" },
  ]);
  const s2 = await run();
  assert.equal(s2.inserted, 0, "second run inserts nothing (also the inactive rows)");
  // A doubtful role never opens a roster: the inactive U15 row and even an ACTIVE needs_review row are ignored.
  await db.exec(`insert into public.scd_structure_roles (organization_id, person_id, role_label, role_kind, team_id, needs_review)
    values ('${ORG}', '50000000-0000-0000-0000-000000000001', 'Mister', 'MISTER', '${T.u19}', true);`);
  const teams = await as("10000000-0000-0000-0000-000000000009", `select array_agg(x.id::text order by x.id) t from public.scd_my_team_ids('${ORG}') x(id)`);
  assert.deepEqual(teams.rows[0].t, [T.prima]);
  const pub = await as(U.dir, `select count(*)::int n from public.scd_v_structure_public where team_code = 'u19' and display_name = 'Anna Maria Nuova'`);
  assert.equal(pub.rows[0].n, 0, "roles da confermare are not in the public staff view");
  const misDir = await dir(U.mis);
  assert.equal(JSON.stringify(misDir).includes("Anna Maria Nuova"), false);
  // SQL key: accents folded, punctuation dropped.
  const k = await db.query(`select pg_temp.scd_r141_key('Dell''Àquila  Bruno') k`);
  assert.equal(k.rows[0].k, "dellaquilabruno");
}

// 9b. Full migration path with the PRIVATE seed table (invented row): read, applied, table dropped.
{
  await db.exec(`
    insert into public.scd_people (id, organization_id, first_name, last_name, birth_date) values
      ('50000000-0000-0000-0000-000000000007', '${ORG}', 'Pia', 'Privata', '1977-01-01');
    create temp table r141_seed (n integer primary key, team text, label text not null, kind text not null, area text, mode text not null, person text not null, review boolean not null);
    insert into pg_temp.r141_seed values (901, null, 'Responsabile palestra', 'RESPONSABILE', 'palestra', 'FULL', 'Privata Pia', false);`);
  await db.exec(R141);
  const r = await db.query(`select active, source_record_id from public.scd_structure_roles where person_id = '50000000-0000-0000-0000-000000000007'`);
  assert.deepEqual(r.rows, [{ active: true, source_record_id: "r141:901" }]);
  const gone = await db.query(`select to_regclass('pg_temp.r141_seed') t`);
  assert.equal(gone.rows[0].t, null, "the private seed table does not survive the migration");
}

// 9c. Unknown age = minor: a family account bound to a person without birth date gets no numbers.
{
  await db.exec(`
    insert into auth.users (id) values ('10000000-0000-0000-0000-000000000010');
    insert into public.scd_memberships (organization_id, user_id, role, scope) values ('${ORG}', '10000000-0000-0000-0000-000000000010', 'FAMILY', '{}');
    insert into public.scd_people (id, organization_id, first_name, last_name, birth_date) values ('50000000-0000-0000-0000-000000000008', '${ORG}', 'Nina', 'Senzadata', null);
    insert into public.scd_identity_links (organization_id, user_id, person_id, link_state, match_method, confidence) values
      ('${ORG}', '10000000-0000-0000-0000-000000000010', '50000000-0000-0000-0000-000000000008', 'VERIFIED_BY_STAFF', 'MANUAL_STAFF', 100);
    insert into public.scd_family_members (family_id, person_id, relationship, is_guardian) values
      ('30000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000008', 'GENITORE', true);`);
  const d = await dir("10000000-0000-0000-0000-000000000010");
  assert.equal(d.callerAdult, false);
  assert.ok(d.people.some((p) => p.name === "Mario Allenatore"));
  for (const p of d.people) assert.equal(p.phone, null);
}

// 9d. Office phone reads are audited (ids only); contact_phone of the structure roles is not readable.
{
  const a = await db.query(`select count(*)::int n, bool_or(payload::text like '%TEL-%') leak from public.scd_audit_events where action = 'PHONE_READ'`);
  assert.equal(a.rows[0].n, 1);
  assert.equal(a.rows[0].leak, false);
  await assert.rejects(() => as(U.dir, `select contact_phone from public.scd_structure_roles`), /permission denied/);
  const ok = await as(U.dir, `select count(*)::int n from public.scd_structure_roles`);
  assert.ok(ok.rows[0].n > 0);
  const anon = await db.query(`select has_table_privilege('anon', 'public.scd_people', 'select') a`);
  assert.equal(anon.rows[0].a, false);
}

// 10. No anon grant on any r141 function; the internal consent helper is not callable by members.
{
  const r = await db.query(`select p.proname, has_function_privilege('anon', p.oid, 'execute') a, has_function_privilege('authenticated', p.oid, 'execute') u
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname in
    ('scd_staff_office','scd_staff_club_areas','scd_staff_phone_shared','scd_staff_visible_role_ids','scd_staff_visible_person_ids','scd_staff_directory','scd_set_my_phone_share','scd_person_phone')
    order by 1`);
  assert.equal(r.rows.length, 8);
  for (const x of r.rows) {
    assert.equal(x.a, false, `${x.proname} must not be executable by anon`);
    assert.equal(x.u, x.proname !== "scd_staff_phone_shared", x.proname);
  }
}

console.log("r141 staff directory: all assertions passed");
