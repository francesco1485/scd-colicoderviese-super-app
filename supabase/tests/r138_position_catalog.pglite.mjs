// r138 position catalogue — behaviour test on an in-memory Postgres (PGlite), no remote database touched.
// Run from the repository root (PGlite is not a dependency of the app, so it is installed in a throwaway folder):
//   npm install --prefix /tmp/scd-pglite @electric-sql/pglite@0.5.10
//   PGLITE_DIR=/tmp/scd-pglite node supabase/tests/r138_position_catalog.pglite.mjs
// Exit code 0 = every assertion passed. r135 (structure activities) is loaded from its real file. The r111 objects
// r138 depends on (applied on SCD PULSE; the file lives on feat/cloud-deleghe) are created here with the same text
// of scd_is_role_creator; the r133 / r136 functions r138 recreates exist here as stubs. Every id is invented.
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
const R135 = file("../migrations/20261016_r135_structure_activities.sql");
const R138 = file("../migrations/20261016_r138_position_catalog.sql");
const CONFIG = JSON.parse(file("../../config/scd-position-catalog.v1.json"));

const ORG = "00000000-0000-0000-0000-000000000001";
const OTHER = "00000000-0000-0000-0000-000000000002";
const U = (n) => `10000000-0000-0000-0000-0000000000${String(n).padStart(2, "0")}`;
const P = (n) => `20000000-0000-0000-0000-0000000000${String(n).padStart(2, "0")}`;
// 1 Presidente (Direzione, creator), 2 DG (Direzione, creator), 3 consigliere (Direzione, NOT creator),
// 4 Segreteria, 5 responsabile attivita di base, 6 family, 7 DS agonistica, 8 responsabile struttura (Colico only)
const PRES = U(1), DG = U(2), CONS = U(3), SEG = U(4), RAB = U(5), FAM = U(6), DSA = U(7), RST = U(8);

const base = `
create role anon; create role authenticated;
create schema auth;
create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create type public.scd_role as enum ('USER_BASE','FAMILY','ATHLETE','MISTER','STAFF','MANAGER','SECRETARIAT','REGISTRATION','TOURNAMENTS','DIRECTION');
create table public.scd_organizations (id uuid primary key, name text);
create table public.scd_people (id uuid primary key, organization_id uuid not null);
create table public.scd_memberships (organization_id uuid, user_id uuid, role public.scd_role, scope jsonb default '{}'::jsonb, active boolean default true);
create table public.scd_identity_links (id uuid primary key default gen_random_uuid(), organization_id uuid, user_id uuid, person_id uuid, link_state text default 'AUTO_VERIFIED');
create table public.scd_structure_roles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id),
  person_id uuid not null references public.scd_people(id),
  role_label text not null,
  role_kind text not null check (role_kind in ('DIRIGENTE','MISTER','AUTISTA','RESPONSABILE','STAFF','ORGANO_SOCIETARIO')),
  team_id uuid, active boolean not null default true, valid_from date, valid_to date);
create table public.scd_access_audit (id bigint generated always as identity primary key, organization_id uuid not null,
  actor_user_id uuid, target_user_id uuid, target_person_id uuid, action text not null, detail jsonb not null default '{}',
  created_at timestamptz not null default now(),
  constraint scd_access_audit_action_check check (action in ('SET_ACCESS','GRANT_PERSON','REVOKE_LINK','APPROVE_REQUEST','REJECT_REQUEST',
    'GRANT_SECTION','CHANGE_SECTION','REVOKE_SECTION','COPY_GRANTS','CREATE_ROLE','CHANGE_ROLE','ROLE_STATUS')));
create function public.scd_has_org_role(p_organization_id uuid, p_roles public.scd_role[]) returns boolean language sql stable set search_path = public as $$
  select exists (select 1 from public.scd_memberships m where m.organization_id = p_organization_id and m.user_id = auth.uid() and m.active and m.role = any(p_roles)) $$;
create function public.scd_has_position(p_organization_id uuid, p_positions text[]) returns boolean language sql stable set search_path to 'public' as $$
  select exists (select 1 from public.scd_memberships m where m.organization_id = p_organization_id and m.user_id = (select auth.uid()) and m.active
    and jsonb_typeof(m.scope -> 'positions') = 'array'
    and exists (select 1 from jsonb_array_elements_text(m.scope -> 'positions') p where p = any(p_positions))) $$;
`;
// r111 (applied on SCD PULSE): scd_is_role_creator with its real text; r111/r133/r136 functions r138 recreates as stubs.
const r111AndStubs = `
create or replace function public.scd_is_role_creator(p_organization_id uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select (select auth.uid()) is not null
    and public.scd_has_org_role(p_organization_id, array['DIRECTION']::public.scd_role[])
    and exists (
      select 1
      from public.scd_identity_links l
      join public.scd_structure_roles r on r.person_id = l.person_id and r.organization_id = l.organization_id
      where l.organization_id = p_organization_id and l.user_id = (select auth.uid())
        and l.link_state in ('AUTO_VERIFIED', 'VERIFIED_BY_STAFF')
        and r.active and (r.valid_to is null or r.valid_to >= current_date)
        and lower(btrim(r.role_label)) in ('presidente', 'direttore generale'));
$$;
create function public.scd_section_platform(p_code text) returns text language sql immutable as $$ select null::text $$;
create function public.scd_request_group_confirmers(p_team_key text) returns text[] language sql immutable as $$ select null::text[] $$;
create function public.scd_access_admin_guard(p_organization_id uuid, p_target_user uuid, p_new_role public.scd_role, p_new_positions text[])
  returns public.scd_role language sql stable as $$ select null::public.scd_role $$;
`;
const data = `
insert into public.scd_organizations values ('${ORG}', 'S.C.D. ColicoDerviese'), ('${OTHER}', 'Other club');
insert into auth.users (id) select ('10000000-0000-0000-0000-0000000000' || lpad(i::text, 2, '0'))::uuid from generate_series(1, 8) i;
insert into public.scd_people (id, organization_id) select ('20000000-0000-0000-0000-0000000000' || lpad(i::text, 2, '0'))::uuid, '${ORG}' from generate_series(1, 9) i;
insert into public.scd_memberships (organization_id, user_id, role, scope) values
  ('${ORG}', '${PRES}', 'DIRECTION', '{"positions":["presidente"]}'),
  ('${ORG}', '${DG}', 'DIRECTION', '{"positions":["direttore-generale"]}'),
  ('${ORG}', '${CONS}', 'DIRECTION', '{}'),
  ('${ORG}', '${SEG}', 'SECRETARIAT', '{}'),
  ('${ORG}', '${RAB}', 'STAFF', '{"positions":["responsabile-attivita-base"]}'),
  ('${ORG}', '${FAM}', 'FAMILY', '{}'),
  ('${ORG}', '${DSA}', 'STAFF', '{"positions":["direttore-sportivo-agonistica"]}'),
  ('${ORG}', '${RST}', 'STAFF', '{"positions":["responsabile-struttura"]}');
insert into public.scd_identity_links (organization_id, user_id, person_id)
  select '${ORG}', ('10000000-0000-0000-0000-0000000000' || lpad(i::text, 2, '0'))::uuid, ('20000000-0000-0000-0000-0000000000' || lpad(i::text, 2, '0'))::uuid
  from generate_series(1, 8) i;
insert into public.scd_structure_roles (organization_id, person_id, role_label, role_kind) values
  ('${ORG}', '${P(1)}', 'Presidente', 'ORGANO_SOCIETARIO'),
  ('${ORG}', '${P(2)}', 'Direttore Generale', 'DIRIGENTE'),
  ('${ORG}', '${P(3)}', 'Consigliere', 'ORGANO_SOCIETARIO');
`;

// 0. Fail closed without r111: the migration stops and leaves nothing behind.
{
  const bare = new PGlite();
  await bare.exec(base + data);
  await bare.exec(R135);
  await assert.rejects(() => bare.exec(R138), /r138 prerequisites missing/);
  await bare.exec("rollback");
  const left = await bare.query(
    `select to_regclass('public.scd_position_catalog') t, to_regclass('public.scd_coach_qualifications') q,
            (select count(*)::int from information_schema.columns where table_name = 'scd_structure_roles' and column_name = 'position_code') c`,
  );
  assert.deepEqual(left.rows[0], { t: null, q: null, c: 0 });
}

const db = new PGlite();
await db.exec(base + r111AndStubs + data);
await db.exec(R135);
await db.exec(R138);
await db.exec(R138); // idempotent

const as = async (uid, q, params = []) => {
  await db.exec(`select set_config('request.jwt.claim.sub', '${uid ?? ""}', false)`);
  return (await db.query(q, params)).rows;
};
const one = async (uid, q, params = []) => Object.values((await as(uid, q, params))[0] ?? {})[0];
const failsWith = (code, needle) => (e) => {
  assert.equal(e.code, code, `${e.code} ${e.message}`);
  if (needle) assert.match(String(e.message), needle);
  return true;
};

// 1. Seed: every organisation gets every catalogue position, ACTIVE and EMPTY; 24 qualifications; nothing linked.
{
  const n = CONFIG.positions.length;
  assert.equal(n, 118);
  const counts = (await db.query(`select organization_id::text o, count(*)::int n, count(*) filter (where status = 'ACTIVE')::int a,
      count(*) filter (where is_custom)::int c from public.scd_position_catalog group by 1 order by 1`)).rows;
  assert.deepEqual(counts, [{ o: ORG, n, a: n, c: 0 }, { o: OTHER, n, a: n, c: 0 }]);
  assert.equal((await db.query(`select count(*)::int n from public.scd_coach_qualifications`)).rows[0].n, 24);
  assert.equal((await db.query(`select count(*)::int n from public.scd_structure_roles where position_code is not null or qualification_code is not null`)).rows[0].n, 0);
  // Attributes are not positions.
  const attr = (await db.query(`select count(*)::int n from public.scd_position_catalog where code ~ '^(ls-|rasd-tessera-|socio$|custom$|allenatore-uefa)'`)).rows[0].n;
  assert.equal(attr, 0);
  const ds = (await db.query(`select code, app_position, role_kind from public.scd_position_catalog where organization_id = $1 and code like 'direttore-sportivo-%' order by code`, [ORG])).rows;
  assert.deepEqual(ds.map((r) => r.code), ["direttore-sportivo-agonistica", "direttore-sportivo-generale"]);
  for (const r of ds) assert.equal(r.app_position, r.code);
}

// 2. Audit actions: every r100/r111 value kept, two new ones, nothing else.
{
  for (const a of ["SET_ACCESS", "COPY_GRANTS", "CREATE_ROLE", "ROLE_STATUS", "CREATE_POSITION", "POSITION_STATUS"])
    await db.query(`insert into public.scd_access_audit (organization_id, action) values ($1, $2)`, [ORG, a]);
  await assert.rejects(db.query(`insert into public.scd_access_audit (organization_id, action) values ($1, 'BOGUS')`, [ORG]), /scd_access_audit_action_check/);
  await db.query(`delete from public.scd_access_audit`);
}

// 3. Section platform: r111 list plus nutrizione.
{
  const p = async (c) => (await db.query(`select public.scd_section_platform($1) p`, [c])).rows[0].p;
  assert.equal(await p("nutrizione"), "CORE");
  assert.equal(await p("crm"), "GROW");
  assert.equal(await p("famiglia"), "ONE");
  assert.equal(await p("nope"), null);
}

// 4. Board: organigram readers only, counts only, canCreate only for Presidente / DG.
const BOARD = `select public.scd_position_catalog_board($1) b`;
{
  const b = await one(PRES, BOARD, [ORG]);
  assert.equal(b.canCreate, true);
  assert.equal(b.positions.length, 118);
  assert.deepEqual(b.positions.find((x) => x.code === "direttore-sportivo").figcLabels, ["Direttore sportivo", "Direttore Sportivo"]);
  assert.deepEqual(b.positions.find((x) => x.code === "presidente").figcLabels, ["Presidente"]);
  assert.equal(b.positions.find((x) => x.code === "tesoriere").lndLabel, "Cassiere");
  assert.ok(b.positions.every((x) => x.holders === 0 && x.status === "ACTIVE"));
  assert.ok(b.positions.every((x) => !("created_by" in x) && !("createdBy" in x)));
  assert.equal((await one(DG, BOARD, [ORG])).canCreate, true);
  assert.equal((await one(CONS, BOARD, [ORG])).canCreate, false); // Direzione but not Presidente / DG
  assert.equal((await one(SEG, BOARD, [ORG])).canCreate, false);
  assert.equal((await one(RAB, BOARD, [ORG])).canCreate, false);
  for (const uid of [FAM, DSA, RST, null]) await assert.rejects(as(uid, BOARD, [ORG]), failsWith("42501"));
  await assert.rejects(as(PRES, BOARD, [OTHER]), failsWith("42501"));
}

// 5. Custom positions: Presidente / DG only, PROPOSED, audited; validation.
const CREATE = `select public.scd_create_custom_position($1, $2, $3, $4, $5) c`;
{
  const code = await one(PRES, CREATE, [ORG, "  Allenatore   Portieri U12 ", "tecnici", "MISTER", "Supporto ai portieri dei Pulcini"]);
  assert.equal(code, "custom-allenatore-portieri-u12");
  const row = (await db.query(`select * from public.scd_position_catalog where organization_id = $1 and code = $2`, [ORG, code])).rows[0];
  assert.equal(row.status, "PROPOSED");
  assert.equal(row.is_custom, true);
  assert.equal(row.source, "CUSTOM");
  assert.equal(row.label, "Allenatore Portieri U12");
  assert.equal(row.created_by, PRES);
  const audit = (await db.query(`select action, actor_user_id, detail from public.scd_access_audit order by id`)).rows;
  assert.equal(audit.length, 1);
  assert.equal(audit[0].action, "CREATE_POSITION");
  assert.equal(audit[0].actor_user_id, PRES);
  assert.equal(audit[0].detail.code, code);
  assert.equal(await one(DG, CREATE, [ORG, "Responsabile Lotteria", "servizi", "STAFF", null]), "custom-responsabile-lotteria");
  assert.equal(await one(DG, CREATE, [ORG, "Addetto àccoglienza ospiti", "operativi", "STAFF", ""]), "custom-addetto-accoglienza-ospiti");
  // Cut at 50 characters on a hyphen: no trailing hyphen in the code (review R3).
  const long = `${"a".repeat(49)} bcd`;
  assert.equal((await db.query(`select public.scd_position_slug($1) s`, [long])).rows[0].s, "a".repeat(49));
  assert.equal(await one(DG, CREATE, [ORG, long, "operativi", "STAFF", null]), `custom-${"a".repeat(49)}`);
  for (const uid of [CONS, SEG, RAB, FAM, DSA, null])
    await assert.rejects(as(uid, CREATE, [ORG, "Ruolo di prova", "operativi", "STAFF", null]), failsWith("42501"), uid);
  await assert.rejects(as(PRES, CREATE, [OTHER, "Ruolo di prova", "operativi", "STAFF", null]), failsWith("42501"));
  await assert.rejects(as(PRES, CREATE, [ORG, "allenatore portieri u12", "tecnici", "MISTER", null]), failsWith("23505"));
  await assert.rejects(as(PRES, CREATE, [ORG, "Presidente", "direzione", "ORGANO_SOCIETARIO", null]), failsWith("23505"));
  await assert.rejects(as(PRES, CREATE, [ORG, "Chiama 333 123 4567", "operativi", "STAFF", null]), failsWith("22023"));
  await assert.rejects(as(PRES, CREATE, [ORG, "Scrivi a x@y.it", "operativi", "STAFF", null]), failsWith("22023"));
  await assert.rejects(as(PRES, CREATE, [ORG, "Ok ruolo", "operativi", "STAFF", "chiama 3331234567"]), failsWith("22023"));
  await assert.rejects(as(PRES, CREATE, [ORG, "ab", "operativi", "STAFF", null]), failsWith("22023"));
  await assert.rejects(as(PRES, CREATE, [ORG, "!!!", "operativi", "STAFF", null]), failsWith("22023"));
  await assert.rejects(as(PRES, CREATE, [ORG, "Ruolo valido", "famiglie", "STAFF", null]), failsWith("22023"));
  await assert.rejects(as(PRES, CREATE, [ORG, "Ruolo valido", "operativi", "ATLETA", null]), failsWith("22023"));
  // Direct writes are closed: no table grant for the API roles.
  for (const role of ["anon", "authenticated"])
    for (const t of ["scd_position_catalog", "scd_coach_qualifications"])
      for (const priv of ["SELECT", "INSERT", "UPDATE", "DELETE"])
        assert.equal((await db.query(`select has_table_privilege($1, $2, $3) ok`, [role, `public.${t}`, priv])).rows[0].ok, false, `${role} ${t} ${priv}`);
  for (const fn of ["scd_position_catalog_board(uuid)", "scd_create_custom_position(uuid, text, text, text, text)", "scd_set_position_status(uuid, text, text, text)"]) {
    assert.equal((await db.query(`select has_function_privilege('anon', $1, 'EXECUTE') ok`, [`public.${fn}`])).rows[0].ok, false, fn);
    assert.equal((await db.query(`select has_function_privilege('authenticated', $1, 'EXECUTE') ok`, [`public.${fn}`])).rows[0].ok, true, fn);
  }
  for (const fn of ["scd_position_catalog_reader(uuid)", "scd_structure_roles_position_check()"])
    assert.equal((await db.query(`select has_function_privilege('authenticated', $1, 'EXECUTE') ok`, [`public.${fn}`])).rows[0].ok, false, fn);
}

// 6. Holding a position: the existing registry row; only ACTIVE positions; qualification only where accepted.
const HOLD = `insert into public.scd_structure_roles (organization_id, person_id, role_label, role_kind, position_code, qualification_code)
  values ($1, $2, $3, $4, $5, $6) returning id`;
const STATUS = `select public.scd_set_position_status($1, $2, $3, $4) s`;
{
  const custom = "custom-allenatore-portieri-u12";
  await assert.rejects(db.query(HOLD, [ORG, P(9), "Allenatore portieri U12", "MISTER", custom, null]), /position not active/);
  await assert.rejects(db.query(HOLD, [ORG, P(9), "X", "STAFF", "non-esiste", null]), /unknown position/);
  await assert.rejects(db.query(HOLD, [ORG, P(9), "X", "STAFF", null, "allenatore-uefa-c"]), /qualification needs a position/);
  await assert.rejects(db.query(HOLD, [ORG, P(9), "X", "DIRIGENTE", "dirigente-accompagnatore", "allenatore-uefa-c"]), /takes no qualification/);
  await assert.rejects(db.query(HOLD, [ORG, P(9), "X", "MISTER", "allenatore-responsabile", "patentino-inventato"]), /foreign key|violates/);
  const mister = (await db.query(HOLD, [ORG, P(9), "Mister U15", "MISTER", "allenatore-responsabile", "allenatore-uefa-c"])).rows[0].id;
  assert.ok(mister);
  // Not creators: no approval.
  for (const uid of [CONS, SEG, RAB, FAM, null]) await assert.rejects(as(uid, STATUS, [ORG, custom, "ACTIVE", null]), failsWith("42501"));
  await assert.rejects(as(PRES, STATUS, [ORG, custom, "PROPOSED", null]), failsWith("22023"));
  await assert.rejects(as(PRES, STATUS, [ORG, "non-esiste", "ACTIVE", null]), failsWith("P0002"));
  assert.equal(await one(DG, STATUS, [ORG, custom, "ACTIVE", "approvato dalla Direzione"]), true);
  assert.equal(await one(DG, STATUS, [ORG, custom, "ACTIVE", null]), false);
  const approved = (await db.query(`select status, approved_by from public.scd_position_catalog where organization_id = $1 and code = $2`, [ORG, custom])).rows[0];
  assert.deepEqual(approved, { status: "ACTIVE", approved_by: DG });
  await db.query(`select set_config('request.jwt.claim.sub', '', false)`);
  // Custom positions accept no qualification (accepts_qualification stays false).
  await assert.rejects(db.query(HOLD, [ORG, P(9), "Allenatore portieri U12", "MISTER", custom, "allenatore-portieri-dilettanti-sg"]), /takes no qualification/);
  await db.query(HOLD, [ORG, P(9), "Allenatore portieri U12", "MISTER", custom, null]);
  const board = await one(PRES, BOARD, [ORG]);
  const holders = Object.fromEntries(board.positions.map((x) => [x.code, x.holders]));
  assert.equal(holders[custom], 1);
  assert.equal(holders["allenatore-responsabile"], 1);
  assert.equal(holders["presidente"], 0); // existing rows are not linked by the migration
  // A position with holders is never retired; without holders it is, and then nobody new can hold it.
  await assert.rejects(as(PRES, STATUS, [ORG, custom, "RETIRED", null]), failsWith("22023", /holders/));
  assert.equal(await one(PRES, STATUS, [ORG, "speaker", "RETIRED", "non serve"]), true);
  await db.query(`select set_config('request.jwt.claim.sub', '', false)`);
  await assert.rejects(db.query(HOLD, [ORG, P(9), "Speaker", "STAFF", "speaker", null]), /position not active/);
  assert.equal(await one(PRES, STATUS, [ORG, "speaker", "ACTIVE", null]), true);
  // D1 (Francesco 16/10/2026 "Chi lo crea"): the same Presidente creates and approves; approved_by and audit recorded.
  const d1 = await one(PRES, CREATE, [ORG, "Referente progetto scuole", "sgs", "RESPONSABILE", null]);
  assert.equal(await one(PRES, STATUS, [ORG, d1, "ACTIVE", "approvo io"]), true);
  const d1row = (await db.query(`select status, created_by, approved_by, approved_at is not null as stamped from public.scd_position_catalog where organization_id = $1 and code = $2`, [ORG, d1])).rows[0];
  assert.deepEqual(d1row, { status: "ACTIVE", created_by: PRES, approved_by: PRES, stamped: true });
  const d1audit = (await db.query(`select action, actor_user_id, detail from public.scd_access_audit where detail->>'code' = $1 order by id`, [d1])).rows;
  assert.deepEqual(d1audit.map((a) => [a.action, a.actor_user_id]), [["CREATE_POSITION", PRES], ["POSITION_STATUS", PRES]]);
  assert.deepEqual([d1audit[1].detail.from, d1audit[1].detail.to], ["PROPOSED", "ACTIVE"]);
  // An existing holder keeps its row when only the qualification changes.
  await db.query(`update public.scd_structure_roles set qualification_code = 'allenatore-uefa-b' where id = $1`, [mister]);
  const actions = (await db.query(`select action from public.scd_access_audit order by id`)).rows.map((r) => r.action);
  assert.deepEqual(actions, ["CREATE_POSITION", "CREATE_POSITION", "CREATE_POSITION", "CREATE_POSITION", "POSITION_STATUS", "POSITION_STATUS", "POSITION_STATUS", "CREATE_POSITION", "POSITION_STATUS"]);
}

// 7. Direttori sportivi: assignable, Dervio + Colico readers, confirmers of their groups.
{
  const guardSql = R138.match(/create or replace function public\.scd_access_admin_guard\([\s\S]*?\n\$\$;/)[0];
  assert.match(guardSql, /'direttore-sportivo-agonistica','direttore-sportivo-generale','responsabile-safeguarding','fisioterapista'\];/);
  const reads = async (uid, site) => one(uid, `select public.scd_structure_reader_site($1, $2) r`, [ORG, site]);
  assert.equal(await reads(DSA, "DERVIO"), true);
  assert.equal(await reads(DSA, "COLICO"), true);
  assert.equal(await reads(RST, "COLICO"), true); // responsabile struttura sees Colico
  assert.equal(await reads(RST, "DERVIO"), false); // no structure manager at Dervio
  assert.equal(await reads(RAB, "DERVIO"), true);
  assert.equal(await reads(FAM, "COLICO"), false);
  const conf = async (k) => (await db.query(`select public.scd_request_group_confirmers($1) c`, [k])).rows[0].c;
  assert.deepEqual(await conf("u16"), ["direttore-sportivo-agonistica"]);
  assert.deepEqual(await conf("u15"), ["direttore-sportivo-agonistica"]);
  assert.deepEqual(await conf("prima"), ["direttore-sportivo-generale"]);
  assert.deepEqual(await conf("u19"), ["direttore-sportivo-generale"]);
  assert.deepEqual(await conf("2015"), ["responsabile-attivita-base"]);
  assert.equal(await conf("boh"), null);
}

// 8. The access guard itself (recreated r136 text + 4 positions, Direzione only): unknown positions refused.
{
  await db.exec(`insert into public.scd_memberships (organization_id, user_id, role) values ('${ORG}', '${U(9)}', 'STAFF')`);
  assert.equal(await one(PRES, `select public.scd_access_admin_guard($1, null, null, $2) g`, [ORG, ["direttore-sportivo-generale"]]), "DIRECTION");
  for (const p of ["direttore-sportivo-agonistica", "direttore-sportivo-generale", "responsabile-safeguarding", "fisioterapista"]) {
    assert.equal(await one(PRES, `select public.scd_access_admin_guard($1, null, null, $2) g`, [ORG, [p]]), "DIRECTION", p);
    // Review R2: only the Direzione assigns them.
    await assert.rejects(as(SEG, `select public.scd_access_admin_guard($1, null, null, $2) g`, [ORG, [p]]), failsWith("42501", /office position/), p);
  }
  assert.equal(await one(SEG, `select public.scd_access_admin_guard($1, null, null, $2) g`, [ORG, ["autista"]]), "SECRETARIAT");
  await assert.rejects(as(PRES, `select public.scd_access_admin_guard($1, null, null, $2) g`, [ORG, ["direttore-sportivo"]]), failsWith("22023"));
  await assert.rejects(as(FAM, `select public.scd_access_admin_guard($1, null, null, $2) g`, [ORG, ["direttore-sportivo-generale"]]), failsWith("42501"));
}

console.log("r138 position catalogue: all assertions passed");
