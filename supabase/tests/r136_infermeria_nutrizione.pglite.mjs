// r136 Infermeria and Nutrizionista — behaviour test on an in-memory Postgres (PGlite), no remote database touched.
// Run from the repository root (PGlite is not a dependency of the app, so it is installed in a throwaway folder):
//   npm install --prefix /tmp/scd-pglite @electric-sql/pglite@0.5.10
//   PGLITE_DIR=/tmp/scd-pglite node supabase/tests/r136_infermeria_nutrizione.pglite.mjs
// Optional first argument: another path of the migration file. Exit code 0 = every assertion passed.
// The r59/r61/r66/r74/r100 objects r136 depends on are created here in their minimal shape; r79 (work queue) is
// loaded from its real migration file.
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
const MIG = process.argv[2] ?? fileURLToPath(new URL("../migrations/20261016_r136_infermeria_nutrizione.sql", import.meta.url));
const R79 = fileURLToPath(new URL("../migrations/20261012_r79_proposals.sql", import.meta.url));
const db = new PGlite();

const ORG = "00000000-0000-0000-0000-000000000001";
const U = {
  dir: "10000000-0000-0000-0000-000000000001", // Direzione
  inf: "10000000-0000-0000-0000-000000000002", // responsabile infermeria (position)
  nut: "10000000-0000-0000-0000-000000000003", // nutrizionista (position)
  famA: "10000000-0000-0000-0000-000000000004", // guardian of kid A
  famB: "10000000-0000-0000-0000-000000000005", // guardian of kid B
  seg: "10000000-0000-0000-0000-000000000006", // Segreteria (no health access)
  grantAll: "10000000-0000-0000-0000-000000000007", // r100 grant infermeria ALL
  grantSite: "10000000-0000-0000-0000-000000000008", // r100 grant infermeria OWN_SITE Dervio
  mister: "10000000-0000-0000-0000-000000000009",
};
const P = {
  famA: "20000000-0000-0000-0000-00000000000a",
  kidA: "20000000-0000-0000-0000-00000000000b",
  famB: "20000000-0000-0000-0000-00000000000c",
  kidB: "20000000-0000-0000-0000-00000000000d",
  grantAll: "20000000-0000-0000-0000-00000000000e",
  grantSite: "20000000-0000-0000-0000-00000000000f",
};
const ATH = { kidA: "30000000-0000-0000-0000-00000000000b", kidB: "30000000-0000-0000-0000-00000000000d" };
const TEAM = "40000000-0000-0000-0000-000000000001";

await db.exec(`
create role anon; create role authenticated;
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create type public.scd_role as enum ('USER_BASE','FAMILY','ATHLETE','MISTER','STAFF','MANAGER','SECRETARIAT','REGISTRATION','TOURNAMENTS','DIRECTION');
create table public.scd_organizations (id uuid primary key, name text);
create table public.scd_memberships (organization_id uuid, user_id uuid, role public.scd_role, scope jsonb default '{}'::jsonb, active boolean default true, created_at timestamptz default now());
create table public.scd_people (id uuid primary key, organization_id uuid, first_name text, last_name text, display_name text, birth_date date, status text default 'ACTIVE', left_at date);
create table public.scd_athletes (id uuid primary key, organization_id uuid, person_id uuid references public.scd_people(id), registration_status text,
  medical_certificate_expires_at date, medical_certificate_status text, medical_certificate_kind text, medical_certificate_checked_at timestamptz);
create table public.scd_teams (id uuid primary key, organization_id uuid, code text, name text);
create table public.scd_team_memberships (athlete_id uuid, team_id uuid, valid_to date);
create table public.scd_identity_links (organization_id uuid, user_id uuid, person_id uuid, link_state text);
create table public.scd_families (id uuid primary key, organization_id uuid);
create table public.scd_family_members (family_id uuid, person_id uuid, is_guardian boolean, relationship text);
create table public.scd_person_grants (id uuid primary key default gen_random_uuid(), organization_id uuid, person_id uuid, section_code text, level text, perimeter text,
  team_ids uuid[] default '{}', site text, revoked_at timestamptz);
create table public.scd_fee_positions (organization_id uuid, person_id uuid, source_record_id text, status_group text, active boolean);
create function public.scd_has_org_role(p_organization_id uuid, p_roles public.scd_role[]) returns boolean language sql stable set search_path = public as $$
  select exists (select 1 from public.scd_memberships m where m.organization_id = p_organization_id and m.user_id = auth.uid() and m.active and m.role = any(p_roles)) $$;
create function public.scd_has_position(p_organization_id uuid, p_positions text[]) returns boolean language sql stable set search_path to 'public' as $$
  select exists (select 1 from public.scd_memberships m where m.organization_id = p_organization_id and m.user_id = (select auth.uid()) and m.active
    and jsonb_typeof(m.scope -> 'positions') = 'array'
    and exists (select 1 from jsonb_array_elements_text(m.scope -> 'positions') p where p = any(p_positions))) $$;
create function public.scd_fee_office(p_organization_id uuid) returns boolean language sql stable set search_path to 'public' as $$
  select public.scd_has_org_role(p_organization_id, array['DIRECTION','SECRETARIAT']::public.scd_role[]) $$;
create function public.scd_is_minor(p_birth_date date) returns boolean language sql stable set search_path = public as $$
  select case when p_birth_date is null then null else p_birth_date > (current_date - interval '18 years') end $$;
create function public.scd_my_person_ids(p_organization_id uuid) returns setof uuid language sql stable security definer set search_path to 'public' as $$
  select l.person_id from public.scd_identity_links l
  join public.scd_memberships m on m.organization_id = l.organization_id and m.user_id = l.user_id and m.active
  where l.organization_id = p_organization_id and l.user_id = (select auth.uid()) and l.link_state in ('AUTO_VERIFIED','VERIFIED_BY_STAFF') $$;
create function public.scd_level_rank(p_level text) returns integer language sql immutable set search_path to 'public' as $$
  select coalesce(array_position(array['READ','WRITE','APPROVE'], p_level), 0); $$;
create function public.scd_certificate_register(p_organization_id uuid) returns setof uuid language sql as $$ select null::uuid where false $$;

insert into public.scd_organizations values ('${ORG}', 'S.C.D. ColicoDerviese');
insert into auth.users (id) values ${Object.values(U).map((u) => `('${u}')`).join(", ")};
insert into public.scd_memberships (organization_id, user_id, role, scope) values
  ('${ORG}', '${U.dir}', 'DIRECTION', '{}'),
  ('${ORG}', '${U.inf}', 'STAFF', '{"positions":["responsabile-infermeria"]}'),
  ('${ORG}', '${U.nut}', 'STAFF', '{"positions":["nutrizionista"]}'),
  ('${ORG}', '${U.famA}', 'FAMILY', '{}'),
  ('${ORG}', '${U.famB}', 'FAMILY', '{}'),
  ('${ORG}', '${U.seg}', 'SECRETARIAT', '{}'),
  ('${ORG}', '${U.grantAll}', 'STAFF', '{}'),
  ('${ORG}', '${U.grantSite}', 'STAFF', '{}'),
  ('${ORG}', '${U.mister}', 'MISTER', '{}');
insert into public.scd_people (id, organization_id, first_name, last_name, birth_date) values
  ('${P.famA}', '${ORG}', 'Anna', 'Verdi', '1985-03-01'),
  ('${P.kidA}', '${ORG}', 'Luca', 'Verdi', '2014-05-01'),
  ('${P.famB}', '${ORG}', 'Bruno', 'Neri', '1982-03-01'),
  ('${P.kidB}', '${ORG}', 'Marco', 'Neri', '2012-05-01'),
  ('${P.grantAll}', '${ORG}', 'Carla', 'Blu', '1980-01-01'),
  ('${P.grantSite}', '${ORG}', 'Dario', 'Gialli', '1979-01-01');
insert into public.scd_athletes (id, organization_id, person_id, medical_certificate_expires_at) values
  ('${ATH.kidA}', '${ORG}', '${P.kidA}', current_date + 10),
  ('${ATH.kidB}', '${ORG}', '${P.kidB}', null);
insert into public.scd_teams values ('${TEAM}', '${ORG}', '2014', 'Esordienti 2014');
insert into public.scd_team_memberships values ('${ATH.kidA}', '${TEAM}', null), ('${ATH.kidB}', '${TEAM}', null);
insert into public.scd_identity_links values
  ('${ORG}', '${U.famA}', '${P.famA}', 'AUTO_VERIFIED'),
  ('${ORG}', '${U.famB}', '${P.famB}', 'AUTO_VERIFIED'),
  ('${ORG}', '${U.grantAll}', '${P.grantAll}', 'VERIFIED_BY_STAFF'),
  ('${ORG}', '${U.grantSite}', '${P.grantSite}', 'VERIFIED_BY_STAFF');
insert into public.scd_families values ('50000000-0000-0000-0000-00000000000a', '${ORG}'), ('50000000-0000-0000-0000-00000000000b', '${ORG}');
insert into public.scd_family_members values
  ('50000000-0000-0000-0000-00000000000a', '${P.famA}', true, 'GENITORE'),
  ('50000000-0000-0000-0000-00000000000a', '${P.kidA}', false, 'FIGLIO'),
  ('50000000-0000-0000-0000-00000000000b', '${P.famB}', true, 'GENITORE'),
  ('50000000-0000-0000-0000-00000000000b', '${P.kidB}', false, 'FIGLIO');
insert into public.scd_person_grants (organization_id, person_id, section_code, level, perimeter, site) values
  ('${ORG}', '${P.grantAll}', 'infermeria', 'WRITE', 'ALL', null),
  ('${ORG}', '${P.grantSite}', 'infermeria', 'WRITE', 'OWN_SITE', 'DERVIO'),
  ('${ORG}', '${P.famA}', 'infermeria', 'READ', 'OWN_CHILDREN', null);
`);
await db.exec(readFileSync(R79, "utf8"));
const sql = readFileSync(MIG, "utf8");
await db.exec(sql);
await db.exec(sql); // idempotent

const as = async (uid, q, params = []) => {
  await db.exec(`select set_config('request.jwt.claim.sub', '${uid ?? ""}', false)`);
  const r = await db.query(q, params);
  return r.rows;
};
const one = async (uid, q, params) => (await as(uid, q, params))[0];
const fails = async (uid, q, params, re) => {
  await assert.rejects(() => as(uid, q, params), re);
};
let checks = 0;
const ok = (cond, msg) => {
  assert.ok(cond, msg);
  checks += 1;
};

// Catalogue: nutrizione appended, r101 sections kept.
const cat = await db.query(`select code, sensitive from public.scd_section_catalog()`);
ok(cat.rows.some((r) => r.code === "nutrizione" && r.sensitive), "nutrizione in catalogue, sensitive");
ok(cat.rows.some((r) => r.code === "proposte"), "r101 entries kept");
ok(cat.rows.some((r) => r.code === "salute-minori"), "hard block kept");

// RLS on the new tables, no policies, no table grants to app roles.
const rls = await db.query(`select relname, relrowsecurity from pg_class where relname in ('scd_health_injuries','scd_first_aid_kits','scd_aed_devices')`);
ok(rls.rows.length === 3 && rls.rows.every((r) => r.relrowsecurity), "RLS on");
const pol = await db.query(`select count(*)::int n from pg_policies where tablename in ('scd_health_injuries','scd_first_aid_kits','scd_aed_devices')`);
ok(pol.rows[0].n === 0, "no policies");
const tg = await db.query(`select count(*)::int n from information_schema.role_table_grants where table_name in ('scd_health_injuries','scd_first_aid_kits','scd_aed_devices') and grantee in ('anon','authenticated')`);
ok(tg.rows[0].n === 0, "no table grants");

// Access helper.
const staff = async (uid, section, level = "READ", site = null) =>
  (await one(uid, `select public.scd_health_staff($1, $2, $3, $4) as v`, [ORG, section, level, site])).v;
ok(await staff(U.dir, "infermeria", "WRITE"), "Direzione infermeria");
ok(await staff(U.inf, "infermeria", "WRITE"), "position responsabile-infermeria");
ok(await staff(U.grantAll, "infermeria", "WRITE"), "grant ALL");
ok(!(await staff(U.grantSite, "infermeria")), "OWN_SITE grant without site");
ok(await staff(U.grantSite, "infermeria", "WRITE", "DERVIO"), "OWN_SITE grant on its site");
ok(!(await staff(U.grantSite, "infermeria", "READ", "COLICO")), "OWN_SITE grant not on the other site");
ok(!(await staff(U.famA, "infermeria")), "family OWN_CHILDREN grant is not staff");
ok(!(await staff(U.seg, "infermeria")), "Segreteria has no infermeria access");
ok(!(await staff(U.mister, "infermeria")), "mister has no infermeria access");
ok(!(await staff(null, "infermeria")), "anonymous has nothing");
ok(!(await staff(U.inf, "nutrizione")), "infermeria position does not open nutrizione");
ok(await staff(U.nut, "nutrizione", "WRITE"), "nutrizionista position");
ok(!(await staff(U.dir, "salute-minori")), "unknown / protected section");

// Certificate board: staff only, names shortened.
const certs = await as(U.inf, `select * from public.scd_infermeria_certificate_board($1)`, [ORG]);
ok(certs.length === 2, "two athletes");
ok(certs.every((r) => /^\S+ [A-Z]\.$/.test(r.display_name)), "first name + initial");
for (const u of [U.famA, U.seg, U.mister, null]) ok((await as(u, `select * from public.scd_infermeria_certificate_board($1)`, [ORG])).length === 0, `no certificates for ${u}`);

// Board: null for everybody without access.
for (const u of [U.famA, U.famB, U.seg, U.mister, U.nut, null]) ok((await one(u, `select public.scd_infermeria_board($1) as b`, [ORG])).b === null, `no board for ${u}`);

// Injuries: write by staff, validation, return to play.
const save = `select public.scd_infermeria_injury_save($1, $2, $3, $4::date, $5, $6, $7::text[]) as id`;
const today = new Date().toISOString().slice(0, 10);
const inj = (await one(U.inf, save, [ORG, null, ATH.kidA, today, "GINOCCHIO", "FERMO", "{STOP}"])).id;
ok(Boolean(inj), "injury saved");
await fails(U.famA, save, [ORG, null, ATH.kidA, today, "GINOCCHIO", "FERMO", "{}"], /forbidden/);
await fails(U.seg, save, [ORG, null, ATH.kidA, today, "GINOCCHIO", "FERMO", "{}"], /forbidden/);
await fails(U.grantSite, save, [ORG, null, ATH.kidA, today, "GINOCCHIO", "FERMO", "{}"], /forbidden/);
await fails(U.inf, save, [ORG, null, ATH.kidA, today, "distorsione al crociato", "FERMO", "{}"], /invalid entry/);
await fails(U.inf, save, [ORG, null, ATH.kidA, "2099-01-01", "PIEDE", "FERMO", "{}"], /date out of range/);
await fails(U.inf, save, [ORG, inj, ATH.kidA, today, "GINOCCHIO", "RIENTRATO", "{STOP,VIA_LIBERA_MEDICO}"], /return to play incomplete/);
await fails(U.inf, save, [ORG, null, ATH.kidA, today, "PIEDE", "FERMO", "{ANTIDOLORIFICO}"], /invalid entry/);
await as(U.inf, save, [ORG, inj, ATH.kidA, today, "GINOCCHIO", "RIENTRATO", "{OK_STAFF_MISTER,STOP,VIA_LIBERA_MEDICO,LAVORO_DIFFERENZIATO,ALLENAMENTO_SQUADRA}"]);
const board = (await one(U.inf, `select public.scd_infermeria_board($1) as b`, [ORG])).b;
ok(board.seesInjuries && board.injuries.length === 1, "board lists the injury");
ok(board.injuries[0].short_name === "Luca V.", "short name only");
ok(board.injuries[0].status === "RIENTRATO" && board.injuries[0].rtp_steps.length === 5, "rientrato with all steps");
ok(!JSON.stringify(board).includes("Verdi"), "no surname in the board");
// Error messages never carry values.
try {
  await as(U.inf, save, [ORG, null, ATH.kidA, today, "Luca ha la febbre", "FERMO", "{}"]);
} catch (e) {
  ok(!String(e.message).includes("febbre") && !String(e.detail ?? "").includes("febbre"), "no value echoed in errors");
}

// Kits and defibrillators: site perimeter.
const kit = `select public.scd_infermeria_kit_save($1, $2, $3, $4::date, $5::date) as id`;
const aed = `select public.scd_infermeria_aed_save($1, $2, $3, $4::date, $5::date, $6::date) as id`;
ok(Boolean((await one(U.inf, kit, [ORG, "COLICO", "Borsa campo A", today, "2026-12-01"])).id), "kit Colico");
ok(Boolean((await one(U.grantSite, kit, [ORG, "DERVIO", "Borsa campo Dervio", today, "2026-12-01"])).id), "kit Dervio by site grant");
await fails(U.grantSite, kit, [ORG, "COLICO", "Borsa campo B", today, null], /forbidden/);
await fails(U.inf, kit, [ORG, "COLICO", "Borsa campo A", "2026-12-01", "2026-11-01"], /invalid entry/);
ok(Boolean((await one(U.inf, aed, [ORG, "COLICO", "DAE spogliatoi", "2027-03-01", "2028-01-01", today])).id), "AED Colico");
await fails(U.famA, aed, [ORG, "COLICO", "DAE spogliatoi", null, null, null], /forbidden/);
const siteBoard = (await one(U.grantSite, `select public.scd_infermeria_board($1) as b`, [ORG])).b;
ok(siteBoard && !siteBoard.seesInjuries && siteBoard.injuries.length === 0, "site grant sees no injuries");
ok(siteBoard.kits.length === 1 && siteBoard.kits[0].site === "DERVIO", "site grant sees only its site kits");
ok(siteBoard.aeds.length === 0, "site grant sees only its site AEDs");
ok(JSON.stringify(siteBoard.canWriteSites) === JSON.stringify(["DERVIO"]), "writes only its site");

// Nutrition requests: own circle only, queue title without names or health detail.
const req = `select public.scd_nutrition_request($1, $2) as r`;
ok((await one(null, req, [ORG, P.kidA])).r === "NOT_SIGNED_IN", "anonymous");
ok((await one(U.famB, req, [ORG, P.kidA])).r === "NOT_ALLOWED", "a family cannot ask for another child");
ok((await one(U.mister, req, [ORG, P.kidA])).r === "NOT_ALLOWED", "a mister cannot ask for an athlete");
ok((await one(U.famA, req, [ORG, P.kidA])).r === "RECEIVED", "own child");
ok((await one(U.famA, req, [ORG, P.kidA])).r === "ALREADY", "one open request per child");
const q = await db.query(`select title, area, kind, reason, suggested from public.scd_proposals where area = 'nutrizione'`);
ok(q.rows.length === 1, "one queue item");
ok(q.rows[0].title === "Richiesta consulenza nutrizionista · Esordienti 2014", "title is team only");
ok(!/Luca|Verdi|Anna/.test(JSON.stringify(q.rows[0])), "no names in the queue item");
ok((await one(U.famB, req, [ORG, P.kidB])).r === "RECEIVED", "other family, own child");

// Staff list: nutrition staff only, contact is the adult requester.
for (const u of [U.famA, U.famB, U.seg, U.inf, U.mister, null]) ok((await one(u, `select public.scd_nutrition_requests($1) as l`, [ORG])).l === null, `no request list for ${u}`);
const list = (await one(U.nut, `select public.scd_nutrition_requests($1) as l`, [ORG])).l;
ok(list.items.length === 2, "two open requests");
ok(list.items.some((i) => i.contact === "Anna V.") && !JSON.stringify(list).includes("Luca"), "adult contact, never the child");
const id = list.items[0].id;
await fails(U.famA, `select public.scd_nutrition_request_update($1, $2, 'close')`, [ORG, id], /forbidden/);
ok((await one(U.nut, `select public.scd_nutrition_request_update($1, $2, 'take') as v`, [ORG, id])).v === true, "take");
ok((await one(U.nut, `select public.scd_nutrition_request_update($1, $2, 'close') as v`, [ORG, id])).v === true, "close");
ok((await one(U.nut, `select public.scd_nutrition_requests($1) as l`, [ORG])).l.items.length === 1, "closed request leaves the list");
const ev = await db.query(`select action, note from public.scd_proposal_events where proposal_id = $1 order by id`, [id]);
ok(ev.rows.map((r) => r.action).join(",") === "CREATED,TAKE,ACCEPT", "decisions logged");
ok(ev.rows.slice(1).every((r) => r.note === null), "no note on decisions");

// Per-day limit per requester.
await db.exec(`update public.scd_proposals set status = 'ACCEPTED' where area = 'nutrizione'`);
ok((await one(U.famA, req, [ORG, P.kidA])).r === "RECEIVED", "second after close");
await db.exec(`update public.scd_proposals set status = 'ACCEPTED' where area = 'nutrizione'`);
ok((await one(U.famA, req, [ORG, P.kidA])).r === "RECEIVED", "third after close");
await db.exec(`update public.scd_proposals set status = 'ACCEPTED' where area = 'nutrizione'`);
ok((await one(U.famA, req, [ORG, P.kidA])).r === "LIMIT", "limit per day");

// Access guard (r87 copy): the new position is assignable, unknown ones are still refused, nobody edits themself.
const guard = `select public.scd_access_admin_guard($1, $2, null, $3::text[]) as r`;
ok((await one(U.dir, guard, [ORG, U.famA, "{nutrizionista}"])).r === "DIRECTION", "Direzione assigns nutrizionista");
ok((await one(U.seg, guard, [ORG, U.famA, "{nutrizionista}"])).r === "SECRETARIAT", "Segreteria assigns nutrizionista");
await fails(U.dir, guard, [ORG, U.famA, "{dietologo}"], /unknown position/);
await fails(U.dir, guard, [ORG, U.dir, "{nutrizionista}"], /cannot edit own access/);
await fails(U.famA, guard, [ORG, U.famB, "{nutrizionista}"], /not allowed/);

// Function grants: nothing for anon.
const anonExec = await db.query(`select p.proname from pg_proc p where p.proname like any(array['scd_infermeria_%','scd_nutrition_%','scd_health_%'])
  and has_function_privilege('anon', p.oid, 'execute')`);
ok(anonExec.rows.length === 0, `anon executes nothing: ${anonExec.rows.map((r) => r.proname)}`);

console.log(`r136 PGlite: ${checks} checks passed`);
