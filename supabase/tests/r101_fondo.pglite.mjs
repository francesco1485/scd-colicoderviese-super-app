// r101 Fondo Solidale (corrected 16/10/2026) — behaviour test on an in-memory Postgres (PGlite), no remote database
// touched. Run from the repository root (PGlite is not a dependency of the app, so it is installed in a throwaway folder):
//   npm install --prefix /tmp/scd-pglite @electric-sql/pglite@0.5.10
//   PGLITE_DIR=/tmp/scd-pglite node supabase/tests/r101_fondo.pglite.mjs
// Exit code 0 = every assertion passed. r100 is applied first from its real file; the SCD PULSE objects both depend on
// are created here in their minimal shape. Every id, e-mail and amount is invented.
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
const db = new PGlite();

const ORG = "00000000-0000-0000-0000-0000000000a1";
const U = (n) => `10000000-0000-0000-0000-00000000000${n}`;
const P = (n) => `20000000-0000-0000-0000-00000000000${n}`;
// 1 Presidente (Direzione, Consiglio), 2 DG (Direzione, not in the Consiglio here), 3 and 4 consiglieri (STAFF, Fondo
// APPROVE), 5 office (STAFF, Fondo WRITE, not in the committee), 6 parent (FAMILY); person 7 = child of 6 (no account).
const PRES = 1, DG = 2, C3 = 3, C4 = 4, OFFICE = 5, PARENT = 6;

await db.exec(`
create role anon; create role authenticated;
create schema auth;
create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create type public.scd_role as enum ('USER_BASE','FAMILY','ATHLETE','MISTER','MANAGER','STAFF','SECRETARIAT','REGISTRATION','DIRECTION');
create table public.scd_organizations (id uuid primary key, created_at timestamptz default now());
create table public.scd_people (id uuid primary key, organization_id uuid not null, first_name text default 'X', last_name text default 'Y', display_name text, birth_date date, status text default 'ACTIVE');
create table public.scd_memberships (user_id uuid, organization_id uuid, role public.scd_role, active boolean, scope jsonb default '{}', created_at timestamptz default now());
create table public.scd_identity_links (id uuid primary key default gen_random_uuid(), organization_id uuid, user_id uuid, person_id uuid, link_state text default 'AUTO_VERIFIED');
create table public.scd_structure_roles (id uuid primary key default gen_random_uuid(), organization_id uuid, person_id uuid, role_label text, role_kind text, team_id uuid, active boolean default true, valid_to date);
create table public.scd_teams (id uuid primary key, organization_id uuid, code text, name text, status text);
create table public.scd_athletes (id uuid primary key default gen_random_uuid(), person_id uuid);
create table public.scd_team_memberships (athlete_id uuid, team_id uuid, valid_to date);
create table public.scd_family_members (family_id uuid, person_id uuid, is_guardian boolean);
create table public.scd_fee_positions (organization_id uuid, season text, source_record_id text, family_rule text, fund_benefit boolean, active boolean default true);
create table public.scd_access_audit (id bigserial primary key, organization_id uuid not null, actor_user_id uuid, target_user_id uuid, target_person_id uuid, action text not null, detail jsonb not null default '{}', created_at timestamptz not null default now());
create function public.scd_has_org_role(p_org uuid, p_roles public.scd_role[]) returns boolean language sql stable as
  $$ select exists (select 1 from public.scd_memberships m where m.user_id = auth.uid() and m.organization_id = p_org and m.active and m.role = any(p_roles)) $$;
insert into public.scd_organizations (id) values ('${ORG}');
insert into auth.users select ('10000000-0000-0000-0000-00000000000' || i)::uuid, 'user' || i || '@example.test' from generate_series(1, 6) i;
insert into public.scd_people (id, organization_id) select ('20000000-0000-0000-0000-00000000000' || i)::uuid, '${ORG}' from generate_series(1, 7) i;
update public.scd_people set birth_date = '2015-01-01' where id = '${P(7)}';
insert into public.scd_memberships (user_id, organization_id, role, active) values
  ('${U(PRES)}', '${ORG}', 'DIRECTION', true), ('${U(DG)}', '${ORG}', 'DIRECTION', true),
  ('${U(C3)}', '${ORG}', 'STAFF', true), ('${U(C4)}', '${ORG}', 'STAFF', true),
  ('${U(OFFICE)}', '${ORG}', 'STAFF', true), ('${U(PARENT)}', '${ORG}', 'FAMILY', true);
insert into public.scd_identity_links (organization_id, user_id, person_id)
  select '${ORG}', ('10000000-0000-0000-0000-00000000000' || i)::uuid, ('20000000-0000-0000-0000-00000000000' || i)::uuid from generate_series(1, 6) i;
insert into public.scd_structure_roles (organization_id, person_id, role_label, role_kind) values
  ('${ORG}', '${P(PRES)}', 'Presidente', 'ORGANO_SOCIETARIO'),
  ('${ORG}', '${P(DG)}', 'Direttore Generale', 'DIRIGENTE'),
  ('${ORG}', '${P(C3)}', 'Consigliere', 'ORGANO_SOCIETARIO'),
  ('${ORG}', '${P(C4)}', 'Consigliere', 'ORGANO_SOCIETARIO');
insert into public.scd_family_members values ('30000000-0000-0000-0000-000000000001', '${P(PARENT)}', true), ('30000000-0000-0000-0000-000000000001', '${P(7)}', false);
insert into public.scd_fee_positions values ('${ORG}', '2026/27', 'ATL-SIB', 'Fratelli -10%', false, true);
`);
await db.exec(mig("20261014_r100_person_grants.sql"));
await db.exec(mig("20261014_r101_fondo_adotta.sql"));
await db.exec(mig("20261014_r101_fondo_adotta.sql")); // re-runnable

async function as(n) {
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [U(n)]);
}
async function one(sql, params = []) {
  const r = await db.query(sql, params);
  return Object.values(r.rows[0] ?? {})[0];
}
async function fails(sql, params, needle) {
  await assert.rejects(db.query(sql, params), (e) => {
    assert.match(String(e.message), new RegExp(needle));
    return true;
  });
}
const SUBMIT = `select public.scd_fund_submit_application($1, '2026/27', $2, $3, 'Richiedente Esempio', '', '', $4, $5, null, '', '', $6)`;
const STATUS = `select public.scd_fund_set_status($1, $2, $3, null, null, '')`;
const DECIDE = `select public.scd_fund_decide($1, $2, $3, $4, $5, $6, null, $7)`;
const SEAT = `select public.scd_fund_committee_set($1, $2, $3)`;
const MOVE = `select public.scd_fund_record_movement($1, '2026/27', $2, $3, current_date, '', $4, '')`;
const appStatus = (id) => one(`select status from public.scd_fund_applications where id = $1`, [id]);

// 1. The catalogue keeps the live entries (r100 + r136 "nutrizione") and appends the four UD-113 sections.
const codes = (await db.query(`select code from public.scd_section_catalog()`)).rows.map((r) => r.code);
assert.ok(codes.includes("nutrizione"), "nutrizione kept");
assert.deepEqual(codes.slice(-5), ["nutrizione", "fondo-solidale", "adotta", "donazioni", "proposte"]);
const nut = (await db.query(`select levels, perimeters, sensitive from public.scd_section_catalog() where code = 'nutrizione'`)).rows[0];
assert.deepEqual(nut, { levels: ["READ", "WRITE"], perimeters: ["ALL"], sensitive: true });

// 2. ISEE only as a band: no value column anywhere; RLS on, no policy, no table privilege for the API roles.
const cols = (await db.query(`select column_name from information_schema.columns where table_schema = 'public' and table_name = 'scd_fund_applications'`)).rows.map((r) => r.column_name);
assert.ok(!cols.some((c) => /isee_value|isee_amount/.test(c)), "no ISEE value column");
for (const c of ["isee_band", "isee_checked_by", "isee_checked_on", "benefit", "dual_required"]) assert.ok(cols.includes(c), c);
for (const t of ["scd_fund_applications", "scd_fund_committee", "scd_fund_movements", "scd_giving_settings", "scd_donations"]) {
  assert.equal(await one(`select relrowsecurity from pg_class where relname = $1`, [t]), true, `${t} RLS`);
  assert.equal(Number(await one(`select count(*) from pg_policies where tablename = $1`, [t])), 0, `${t} no policy`);
  assert.equal(await one(`select has_table_privilege('authenticated', 'public.' || $1, 'select')`, [t]), false, `${t} no select`);
}
assert.equal(await one(`select public.scd_fund_dual_over($1)`, [ORG]), "10000");

// 3. Grants (r100): two consiglieri APPROVE, the office WRITE. Direzione (r100) can do everything except decide.
await as(DG);
for (const [n, level] of [[C3, "APPROVE"], [C4, "APPROVE"], [OFFICE, "WRITE"]]) {
  await db.query(`select public.scd_set_person_grants($1, $2, $3::jsonb, 'Fondo Solidale')`, [ORG, P(n), JSON.stringify([{ section: "fondo-solidale", level, perimeter: "ALL" }])]);
}

// 4. Committee: Direzione only, Consiglio Direttivo only, three seats, one seat per person.
await as(C3);
await fails(SEAT, [ORG, 1, P(C3)], "Direzione only");
await as(DG);
await fails(SEAT, [ORG, 1, P(DG)], "Consiglio Direttivo members only");
await fails(SEAT, [ORG, 4, P(C3)], "seat 1-3");
assert.equal(await one(SEAT, [ORG, 1, P(C3)]), 1);
assert.equal(await one(SEAT, [ORG, 2, P(C4)]), 2);
await fails(SEAT, [ORG, 3, P(C4)], "already holds a seat");
assert.equal(await one(SEAT, [ORG, 3, P(PRES)]), 3);

// 5. Applications with the band only: the guardian applies for the child; a wrong band is refused.
await as(PARENT);
await fails(SUBMIT, [ORG, P(7), "Luca R.", "", "12345", "NESSUNO"], "invalid application");
const famCode = await one(SUBMIT, [ORG, P(7), "Luca R.", "", "SOTTO_SOGLIA", "NESSUNO"]);
assert.match(famCode, /^FS-/);
await as(OFFICE);
const mk = async (label, fee = "", sib = "NESSUNO") => {
  const code = await one(SUBMIT, [ORG, null, label, fee, "NON_PRESENTATO", sib]);
  const id = await one(`select id from public.scd_fund_applications where code = $1`, [code]);
  await db.query(STATUS, [ORG, id, "IN_ESAME"]);
  return id;
};
const small = await mk("Esempio A.");
const exact = await mk("Esempio B.");
const big = await mk("Esempio C.");
const sib = await mk("Esempio D.", "ATL-SIB");
const famId = await one(`select id from public.scd_fund_applications where code = $1`, [famCode]);

// ISEE check by a committee member only; the board shows the band, never a value.
await fails(`select public.scd_fund_check_isee($1, $2, 'SOTTO_SOGLIA', null)`, [ORG, famId], "committee members only");
await as(C3);
await fails(`select public.scd_fund_check_isee($1, $2, 'NON_PRESENTATO', null)`, [ORG, famId], "isee band");
await db.query(`select public.scd_fund_check_isee($1, $2, 'SOTTO_SOGLIA', '2027-01-15')`, [ORG, famId]);
const board = await one(`select public.scd_fund_board($1, '2026/27')`, [ORG]);
const fam = board.applications.find((a) => a.code === famCode);
assert.equal(fam.iseeBand, "SOTTO_SOGLIA");
assert.equal(fam.iseeChecked, true);
assert.ok(!JSON.stringify(board).match(/iseeValue|isee_value/), "board never carries an ISEE value");
assert.equal(board.isCommittee, true);
assert.deepEqual(board.committee.map((s) => [s.seat, s.filled, s.mine]), [[1, true, true], [2, true, false], [3, true, false]]);
assert.ok(!JSON.stringify(board.committee).includes(P(C3)), "no person ids of the committee on the board");
assert.equal(Number(await one(`select count(*) from public.scd_giving_events where detail::text ilike '%SOTTO%'`)), 0, "audit without the band");
assert.deepEqual(board.committeeCandidates, [], "candidates only for the Direzione");
await as(DG);
const dirBoard = await one(`select public.scd_fund_board($1, '2026/27')`, [ORG]);
assert.equal(dirBoard.canAssignCommittee, true);
assert.equal(dirBoard.isCommittee, false, "Direzione without a seat is not the committee");
assert.deepEqual(dirBoard.committeeCandidates.map((c) => c.personId).sort(), [P(PRES), P(C3), P(C4)].sort());
assert.equal(dirBoard.committee[0].personId, P(C3));
await as(C3);

// 6. Decide rules: committee seat + APPROVE; WRITE alone or Direzione without a seat cannot decide.
await as(OFFICE);
await fails(DECIDE, [ORG, small, "APPROVATA", 300, 0, "NESSUNO", "Quota coperta"], "not enabled: fondo-solidale APPROVE");
await as(DG);
await fails(DECIDE, [ORG, small, "APPROVATA", 300, 0, "NESSUNO", "Quota coperta"], "committee members only");
await as(C3);
await fails(DECIDE, [ORG, sib, "APPROVATA", 300, 150, "NESSUNO", "Sconto"], "double discount");
await fails(DECIDE, [ORG, small, "APPROVATA", 300, 400, "NESSUNO", "Sbagliata"], "fees");
await fails(DECIDE, [ORG, small, "APPROVATA", 300, 0, "NESSUNO", ""], "reason needed");
let r = await one(DECIDE, [ORG, small, "APPROVATA", 300, 0, "NESSUNO", "Quota coperta dal Fondo"]);
assert.equal(r.status, "APPROVATA", "one committee decision is enough below the threshold");
assert.equal(await one(`select benefit from public.scd_fund_applications where id = $1`, [small]), "QUOTA_COPERTA");
// Exactly 10.000 € is not "above": one signature.
r = await one(DECIDE, [ORG, exact, "APPROVATA", 10500, 500, "NESSUNO", "Riduzione"]);
assert.equal(r.status, "APPROVATA");
assert.equal(await one(`select benefit from public.scd_fund_applications where id = $1`, [exact]), "QUOTA_RIDOTTA");

// 7. Above 10.000 € two different committee members, same amounts.
r = await one(DECIDE, [ORG, big, "APPROVATA", 12000, 1000, "NESSUNO", "Prima firma"]);
assert.equal(r.status, "SECONDA_FIRMA");
await fails(DECIDE, [ORG, big, "APPROVATA", 12000, 1000, "NESSUNO", "Ancora io"], "another committee member");
await fails(MOVE, [ORG, "QUOTA_COPERTA", 100, big], "approved application");
await as(C4);
await fails(DECIDE, [ORG, big, "APPROVATA", 12000, 500, "NESSUNO", "Cambio importo"], "same amounts");
r = await one(DECIDE, [ORG, big, "APPROVATA", 12000, 1000, "NESSUNO", "Seconda firma"]);
assert.equal(r.status, "APPROVATA");
const row = (await db.query(`select dual_required, first_approved_by, second_approved_by from public.scd_fund_applications where id = $1`, [big])).rows[0];
assert.deepEqual(row, { dual_required: true, first_approved_by: U(C3), second_approved_by: U(C4) });
// The table refuses an approval above the threshold that skipped the second signature.
await fails(`update public.scd_fund_applications set second_approved_at = null where id = $1`, [big], "scd_fund_dual_complete");
// A first signature can be sent back to review only by the committee, and then nothing of it remains.
await as(C3);
const back = await mk("Esempio E.");
await as(C3);
await db.query(DECIDE, [ORG, back, "APPROVATA", 20000, 0, "NESSUNO", "Prima firma"]);
await as(OFFICE);
await fails(STATUS, [ORG, back, "IN_ESAME"], "committee members only");
await as(C4);
await db.query(STATUS, [ORG, back, "IN_ESAME"]);
assert.equal(await appStatus(back), "IN_ESAME");
assert.equal(await one(`select first_approved_by is null and base_fee is null from public.scd_fund_applications where id = $1`, [back]), true);

// 8. «Fondo solo quota»: outgoings are covered fees of approved applications, up to the decided reduction; nothing else.
await as(OFFICE);
await fails(MOVE, [ORG, "ALTRA_USCITA", 50, null], "only membership fees");
assert.ok(await one(MOVE, [ORG, "EVENTO", 500, null]));
assert.ok(await one(MOVE, [ORG, "QUOTA_COPERTA", 200, small]));
await fails(MOVE, [ORG, "QUOTA_COPERTA", 101, small], "more than the decided reduction");
await fails(`insert into public.scd_fund_movements (organization_id, direction, source, amount, occurred_on) values ($1, 'USCITA', 'EVENTO', 10, current_date)`, [ORG], "scd_fund_movement_direction|check");
const rep = await one(`select public.scd_fund_report($1, '2026/27')`, [ORG]);
assert.deepEqual(rep.outgoings, { QUOTA_COPERTA: 200 });
assert.equal(rep.benefits.QUOTA_COPERTA, 1);
assert.ok(!JSON.stringify(rep).match(/SOTTO_SOGLIA|SOPRA_SOGLIA|Esempio|Richiedente/), "report has no band and no names");

// 9. The public entry point exposes no Fund data while totals are off.
await db.query(`select set_config('request.jwt.claim.sub', '', false)`);
const pub = await one(`select public.scd_giving_public()`);
assert.equal(pub.fund, null);

console.log("r101 Fondo Solidale: all assertions passed");
