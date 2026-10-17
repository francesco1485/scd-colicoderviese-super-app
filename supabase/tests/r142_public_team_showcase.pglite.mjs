// r142 "Vetrina squadre" — behaviour test on an in-memory Postgres (PGlite), no remote database touched.
// Run from the repository root (PGlite is not a dependency of the app, so it is installed in a throwaway folder):
//   npm install --prefix /tmp/scd-pglite @electric-sql/pglite@0.5.10
//   PGLITE_DIR=/tmp/scd-pglite node supabase/tests/r142_public_team_showcase.pglite.mjs
// Exit code 0 = every assertion passed. The r33/r51/r59/r61/r62/r70/r92 objects are created in their minimal shape.
// Every person, phone, e-mail and fiscal code below is invented.
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
const R142 = readFileSync(fileURLToPath(new URL("../migrations/20261017_r142_public_team_showcase.sql", import.meta.url)), "utf8");

const ORG = "00000000-0000-0000-0000-000000000001";
const SEASON = "00000000-0000-0000-0000-0000000000a1";
const OLD_SEASON = "00000000-0000-0000-0000-0000000000a0";
const T = { prima: "20000000-0000-0000-0000-000000000001", u19: "20000000-0000-0000-0000-000000000002", u16: "20000000-0000-0000-0000-000000000003", u15: "20000000-0000-0000-0000-000000000004", oldPrima: "20000000-0000-0000-0000-000000000005" };
const P = (n) => `30000000-0000-0000-0000-0000000000${String(n).padStart(2, "0")}`;
const A = (n) => `40000000-0000-0000-0000-0000000000${String(n).padStart(2, "0")}`;
const U = (n) => `10000000-0000-0000-0000-0000000000${String(n).padStart(2, "0")}`;
const MIS = U(1), DIR = U(2), OTHER_MIS = U(3), FAM = U(4);

const schema = `
create role anon; create role authenticated; create role service_role;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create type public.scd_role as enum ('USER_BASE','FAMILY','ATHLETE','MISTER','STAFF','MANAGER','SECRETARIAT','REGISTRATION','TOURNAMENTS','DIRECTION');
create table public.scd_organizations (id uuid primary key, name text, slug text unique);
create table public.scd_memberships (organization_id uuid, user_id uuid, role public.scd_role, active boolean default true);
create table public.scd_seasons (id uuid primary key, organization_id uuid, code text, starts_on date, ends_on date, active boolean);
create table public.scd_teams (id uuid primary key, organization_id uuid, season_id uuid, code text, name text, status text default 'ACTIVE', created_at timestamptz default now());
create table public.scd_people (id uuid primary key, organization_id uuid, first_name text not null, last_name text not null, birth_date date,
  email text, phone text, fiscal_code text, status text default 'ACTIVE', left_at date);
create table public.scd_athletes (id uuid primary key, organization_id uuid, person_id uuid references public.scd_people(id), registration_status text default 'UNVERIFIED',
  fanta_role text check (fanta_role is null or fanta_role in ('P','D','C','A')), updated_at timestamptz default now());
create table public.scd_team_memberships (id uuid primary key default gen_random_uuid(), organization_id uuid, team_id uuid, athlete_id uuid, valid_from date, valid_to date);
create table public.scd_families (id uuid primary key, organization_id uuid, display_name text);
create table public.scd_family_members (family_id uuid, person_id uuid, relationship text, is_guardian boolean default false);
create table public.scd_person_consents (id uuid primary key default gen_random_uuid(), organization_id uuid, person_id uuid, consent_type text, granted boolean,
  given_by_person_id uuid, policy_version text default 'v1', given_at timestamptz default now(), revoked_at timestamptz);
create table public.scd_structure_roles (id uuid primary key default gen_random_uuid(), organization_id uuid, person_id uuid, role_label text, role_kind text,
  team_id uuid, show_in_app boolean default true, contact_phone text, contact_email text, valid_to date, active boolean default true);
create table public.scd_identity_links (organization_id uuid, user_id uuid, person_id uuid, link_state text);
create table public.scd_events (id uuid primary key default gen_random_uuid(), organization_id uuid, starts_at timestamptz, metadata jsonb default '{}'::jsonb);
create table public.scd_matches (id uuid primary key default gen_random_uuid(), organization_id uuid, event_id uuid unique);
create table public.scd_match_performance (id uuid primary key default gen_random_uuid(), organization_id uuid, match_id uuid, athlete_id uuid,
  starter boolean default false, minutes_played integer default 0, goals integer default 0, assists integer default 0, yellow_cards integer default 0,
  red_card boolean default false, unique (match_id, athlete_id));
create table public.scd_match_team_stats (id uuid primary key default gen_random_uuid(), organization_id uuid, match_id uuid, team_id uuid, is_scd_team boolean default true);
create table public.scd_match_sheets (id uuid primary key default gen_random_uuid(), organization_id uuid, match_id uuid unique, players jsonb default '[]'::jsonb, updated_at timestamptz default now());
create table public.scd_audit_events (id bigint generated always as identity primary key, organization_id uuid, actor_user_id uuid, action text, entity_type text, entity_id uuid, payload jsonb);
create function public.scd_has_org_role(p_organization_id uuid, p_roles public.scd_role[]) returns boolean language sql stable set search_path = public as $$
  select exists (select 1 from public.scd_memberships m where m.organization_id = p_organization_id and m.user_id = auth.uid() and m.active and m.role = any(p_roles)) $$;
create function public.scd_my_person_ids(p_organization_id uuid) returns setof uuid language sql stable security definer set search_path to 'public' as $$
  select l.person_id from public.scd_identity_links l join public.scd_memberships m on m.organization_id = l.organization_id and m.user_id = l.user_id and m.active
  where l.organization_id = p_organization_id and l.user_id = (select auth.uid()) and l.link_state in ('AUTO_VERIFIED','VERIFIED_BY_STAFF') $$;
create function public.scd_my_team_ids(p_organization_id uuid) returns setof uuid language sql stable security definer set search_path to 'public' as $$
  select t.id from public.scd_teams t where t.organization_id = p_organization_id and (
    public.scd_has_org_role(p_organization_id, array['DIRECTION','SECRETARIAT','REGISTRATION']::public.scd_role[])
    or exists (select 1 from public.scd_structure_roles r where r.team_id = t.id and r.active and r.role_kind in ('MISTER','DIRIGENTE','STAFF','RESPONSABILE')
      and (r.valid_to is null or r.valid_to >= current_date) and r.person_id in (select public.scd_my_person_ids(p_organization_id)))) $$;
`;

// birth date n years (and d extra days) before today, computed by Postgres
const ago = (years, days = 0) => `(current_date - interval '${years} years' - interval '${days} days')::date`;

const fixtures = `
insert into public.scd_organizations values ('${ORG}', 'Club di prova', 'scd-colicoderviese');
insert into public.scd_seasons values ('${SEASON}', '${ORG}', '2026/2027', current_date - 100, current_date + 200, true),
  ('${OLD_SEASON}', '${ORG}', '2025/2026', current_date - 500, current_date - 101, false);
insert into public.scd_teams (id, organization_id, season_id, code, name) values
  ('${T.prima}', '${ORG}', '${SEASON}', 'prima', 'Prima Squadra'), ('${T.u19}', '${ORG}', '${SEASON}', 'u19', 'Juniores'),
  ('${T.u16}', '${ORG}', '${SEASON}', 'u16', 'Allievi U16'), ('${T.u15}', '${ORG}', '${SEASON}', 'u15', 'Giovanissimi'),
  ('${T.oldPrima}', '${ORG}', '${OLD_SEASON}', 'prima', 'Prima vecchia');
insert into public.scd_people (id, organization_id, first_name, last_name, birth_date, email, phone, fiscal_code, status, left_at) values
  ('${P(1)}', '${ORG}', 'Andrea', 'Adultissimo', ${ago(25)}, 'andrea@example.org', '+39 000 1111111', 'XXXAAA00A00X000A', 'ACTIVE', null),
  ('${P(2)}', '${ORG}', 'Bruno', 'Bianchetti', ${ago(18)}, null, '+39 000 2222222', null, 'ACTIVE', null),
  ('${P(3)}', '${ORG}', 'Luca', 'Zetaminore', ${ago(17, 300)}, 'luca@example.org', '+39 000 3333333', 'XXXLLL00A00X000A', 'ACTIVE', null),
  ('${P(4)}', '${ORG}', 'Carlo', 'Consensato', ${ago(13)}, null, null, null, 'ACTIVE', null),
  ('${P(5)}', '${ORG}', 'Ettore', 'Quindicenne', ${ago(15)}, null, null, null, 'ACTIVE', null),
  ('${P(6)}', '${ORG}', 'Fabio', 'Doppiafirma', ${ago(16)}, null, null, null, 'ACTIVE', null),
  ('${P(7)}', '${ORG}', 'Dario', 'Ignotissimo', null, null, null, null, 'ACTIVE', null),
  ('${P(8)}', '${ORG}', 'Gino', 'Nonguardiano', ${ago(13)}, null, null, null, 'ACTIVE', null),
  ('${P(9)}', '${ORG}', 'Ivo', 'Revocatissimo', ${ago(13)}, null, null, null, 'ACTIVE', null),
  ('${P(10)}', '${ORG}', 'Leo', 'Partitissimo', ${ago(22)}, null, null, null, 'LEFT', current_date - 10),
  ('${P(11)}', '${ORG}', 'Mario', 'Misterone', ${ago(45)}, 'mister@example.org', '+39 000 4444444', null, 'ACTIVE', null),
  ('${P(12)}', '${ORG}', 'Nino', 'Vicestaffminore', ${ago(17)}, null, null, null, 'ACTIVE', null),
  ('${P(13)}', '${ORG}', 'Oscar', 'Senzadata', null, null, null, null, 'ACTIVE', null),
  ('${P(14)}', '${ORG}', 'Paola', 'Genitrice', ${ago(44)}, null, '+39 000 5555555', null, 'ACTIVE', null),
  ('${P(15)}', '${ORG}', 'Rita', 'Estranea', ${ago(50)}, null, null, null, 'ACTIVE', null),
  ('${P(16)}', '${ORG}', 'Sara', 'Dirigentona', ${ago(40)}, null, null, null, 'ACTIVE', null),
  ('${P(17)}', '${ORG}', 'Ugo', 'Altromister', ${ago(41)}, null, null, null, 'ACTIVE', null);
insert into public.scd_athletes (id, organization_id, person_id, fanta_role) values
  ('${A(1)}', '${ORG}', '${P(1)}', 'A'), ('${A(2)}', '${ORG}', '${P(2)}', null), ('${A(3)}', '${ORG}', '${P(3)}', 'D'),
  ('${A(4)}', '${ORG}', '${P(4)}', null), ('${A(5)}', '${ORG}', '${P(5)}', null), ('${A(6)}', '${ORG}', '${P(6)}', null),
  ('${A(7)}', '${ORG}', '${P(7)}', 'P'), ('${A(8)}', '${ORG}', '${P(8)}', null), ('${A(9)}', '${ORG}', '${P(9)}', null),
  ('${A(10)}', '${ORG}', '${P(10)}', null);
insert into public.scd_team_memberships (organization_id, team_id, athlete_id, valid_to) values
  ('${ORG}', '${T.prima}', '${A(1)}', null), ('${ORG}', '${T.prima}', '${A(2)}', null), ('${ORG}', '${T.prima}', '${A(3)}', null),
  ('${ORG}', '${T.prima}', '${A(7)}', null), ('${ORG}', '${T.prima}', '${A(10)}', null),
  ('${ORG}', '${T.u16}', '${A(4)}', null), ('${ORG}', '${T.u16}', '${A(5)}', null), ('${ORG}', '${T.u16}', '${A(6)}', null),
  ('${ORG}', '${T.u16}', '${A(8)}', null), ('${ORG}', '${T.u16}', '${A(9)}', null), ('${ORG}', '${T.u16}', '${A(3)}', current_date - 30),
  ('${ORG}', '${T.u15}', '${A(4)}', null);
insert into public.scd_families values ('50000000-0000-0000-0000-000000000001', '${ORG}', 'Famiglia di prova');
insert into public.scd_family_members values
  ('50000000-0000-0000-0000-000000000001', '${P(14)}', 'GENITORE', true),
  ('50000000-0000-0000-0000-000000000001', '${P(4)}', 'FIGLIO', false),
  ('50000000-0000-0000-0000-000000000001', '${P(5)}', 'FIGLIO', false),
  ('50000000-0000-0000-0000-000000000001', '${P(6)}', 'FIGLIO', false),
  ('50000000-0000-0000-0000-000000000001', '${P(8)}', 'FIGLIO', false),
  ('50000000-0000-0000-0000-000000000001', '${P(9)}', 'FIGLIO', false),
  ('50000000-0000-0000-0000-000000000001', '${P(15)}', 'ZIA', false);
insert into public.scd_person_consents (organization_id, person_id, consent_type, granted, given_by_person_id, policy_version, revoked_at) values
  ('${ORG}', '${P(4)}', 'IMMAGINE_NOME', true, '${P(14)}', 'v1', null),
  ('${ORG}', '${P(5)}', 'IMMAGINE_NOME', true, '${P(14)}', 'v1', null),
  ('${ORG}', '${P(6)}', 'IMMAGINE_NOME', true, '${P(14)}', 'v1', null),
  ('${ORG}', '${P(6)}', 'IMMAGINE_NOME', true, '${P(6)}', 'v1-atleta', null),
  ('${ORG}', '${P(8)}', 'IMMAGINE_NOME', true, '${P(15)}', 'v1', null),
  ('${ORG}', '${P(9)}', 'IMMAGINE_NOME', true, '${P(14)}', 'v1', now()),
  ('${ORG}', '${P(3)}', 'FOTO_PARTITA_APP', true, '${P(14)}', 'v1', null);
insert into public.scd_structure_roles (organization_id, person_id, role_label, role_kind, team_id, active, valid_to, contact_phone, contact_email) values
  ('${ORG}', '${P(11)}', 'Allenatore', 'MISTER', '${T.prima}', true, null, '+39 000 4444444', 'mister@example.org'),
  ('${ORG}', '${P(12)}', 'Vice allenatore', 'STAFF', '${T.prima}', true, null, null, null),
  ('${ORG}', '${P(13)}', 'Preparatore', 'STAFF', '${T.prima}', true, null, null, null),
  ('${ORG}', '${P(16)}', 'Dirigente', 'DIRIGENTE', '${T.prima}', true, null, null, null),
  ('${ORG}', '${P(16)}', 'Dirigente 333 1234567', 'DIRIGENTE', '${T.prima}', true, null, null, null),
  ('${ORG}', '${P(15)}', 'Dirigente', 'DIRIGENTE', '${T.prima}', false, null, null, null),
  ('${ORG}', '${P(17)}', 'Allenatore', 'MISTER', '${T.u16}', true, null, null, null);
insert into public.scd_memberships values ('${ORG}', '${MIS}', 'MISTER', true), ('${ORG}', '${DIR}', 'DIRECTION', true),
  ('${ORG}', '${OTHER_MIS}', 'MISTER', true), ('${ORG}', '${FAM}', 'FAMILY', true);
insert into public.scd_identity_links values ('${ORG}', '${MIS}', '${P(11)}', 'VERIFIED_BY_STAFF'), ('${ORG}', '${OTHER_MIS}', '${P(17)}', 'VERIFIED_BY_STAFF'),
  ('${ORG}', '${FAM}', '${P(14)}', 'VERIFIED_BY_STAFF');
-- matches of the Prima: one recorded (tabellino saved), one with a sheet only, one of the old season
insert into public.scd_events (id, organization_id, starts_at, metadata) values
  ('60000000-0000-0000-0000-000000000001', '${ORG}', now() - interval '7 days', '{"team_id":"${T.prima}"}'),
  ('60000000-0000-0000-0000-000000000002', '${ORG}', now() - interval '2 days', '{"team_id":"${T.prima}"}'),
  ('60000000-0000-0000-0000-000000000003', '${ORG}', now() - interval '300 days', '{"team_id":"${T.prima}"}');
insert into public.scd_matches (id, organization_id, event_id) values
  ('70000000-0000-0000-0000-000000000001', '${ORG}', '60000000-0000-0000-0000-000000000001'),
  ('70000000-0000-0000-0000-000000000002', '${ORG}', '60000000-0000-0000-0000-000000000002'),
  ('70000000-0000-0000-0000-000000000003', '${ORG}', '60000000-0000-0000-0000-000000000003');
insert into public.scd_match_team_stats (organization_id, match_id, team_id) values
  ('${ORG}', '70000000-0000-0000-0000-000000000001', '${T.prima}'), ('${ORG}', '70000000-0000-0000-0000-000000000003', '${T.prima}');
insert into public.scd_match_performance (organization_id, match_id, athlete_id, minutes_played, goals, yellow_cards, red_card) values
  ('${ORG}', '70000000-0000-0000-0000-000000000001', '${A(1)}', 90, 1, 1, false),
  ('${ORG}', '70000000-0000-0000-0000-000000000001', '${A(3)}', 0, 0, 0, false),
  ('${ORG}', '70000000-0000-0000-0000-000000000003', '${A(1)}', 90, 5, 2, true),
  ('${ORG}', '70000000-0000-0000-0000-000000000002', '${A(2)}', 90, 3, 0, false);
insert into public.scd_match_sheets (organization_id, match_id, players) values
  ('${ORG}', '70000000-0000-0000-0000-000000000001', '[{"athlete_id":"${A(1)}","shirt":10},{"athlete_id":"${A(3)}","shirt":4}]'),
  ('${ORG}', '70000000-0000-0000-0000-000000000002', '[{"athlete_id":"${A(1)}","shirt":9},{"athlete_id":"${A(3)}","shirt":5}]');
`;

// prerequisites guard: r142 on an empty database refuses to run
{
  const bare = new PGlite();
  await bare.exec(`create role anon; create role authenticated; create schema auth;`);
  await assert.rejects(bare.exec(R142), /r142 prerequisites missing/);
}

const db = new PGlite();
await db.exec(schema);
await db.exec(fixtures);
await db.exec(R142);
await db.exec(R142); // idempotent

const as = async (uid, q, params = []) => {
  await db.exec(`select set_config('request.jwt.claim.sub', '${uid ?? ""}', false)`);
  return (await db.query(q, params)).rows;
};
const showcase = async (team, uid = null) =>
  (await as(uid, `select public.scd_public_team_showcase('scd-colicoderviese', $1) r`, [team]))[0].r;

// ---------------------------------------------------------------- grants
const anonExec = await db.query(`select p.proname from pg_proc p where p.proname like any (array['scd_showcase%','scd_public_team_showcase','scd_staff_team_roles','scd_staff_set_team_roles']) and has_function_privilege('anon', p.oid, 'execute') order by 1`);
assert.deepEqual(anonExec.rows.map((r) => r.proname), ["scd_public_team_showcase"], "anon executes only the showcase");
const authHelper = await db.query(`select has_function_privilege('authenticated', 'public.scd_showcase_full_name(uuid, date)', 'execute') e`);
assert.equal(authHelper.rows[0].e, false, "name helper is internal");

// ---------------------------------------------------------------- only the three teams of the active season
assert.deepEqual(await showcase("u15"), { team: "u15", available: false });
assert.deepEqual(await showcase("2015"), { team: "2015", available: false });
assert.deepEqual(await showcase("u19"), { team: "u19", available: true, season: "2026/2027", count: 0, matchesRecorded: 0, players: [], staff: [] });

const prima = await showcase("prima");
assert.equal(prima.available, true);
assert.equal(prima.season, "2026/2027");
assert.equal(prima.count, 4, "left player excluded");
assert.equal(prima.matchesRecorded, 1, "only recorded matches of the active season");
const byName = Object.fromEntries(prima.players.map((p) => [p.name, p]));
// adult: full name, role, last recorded shirt in the season, stats of the recorded match only
assert.deepEqual(byName["Andrea Adultissimo"], { key: byName["Andrea Adultissimo"].key, name: "Andrea Adultissimo", role: "A", shirt: 9,
  stats: { matches: 1, appearances: 1, goals: 1, yellow: 1, red: 0 } });
// adult without any recorded row (the sheet-only match is not a tabellino): stats unknown, role unknown, no shirt
assert.deepEqual(byName["Bruno Bianchetti"], { key: byName["Bruno Bianchetti"].key, name: "Bruno Bianchetti", role: null, shirt: null, stats: null });
// minor (17 and 300 days): first name + initial, no shirt, stats recorded as zero minutes = known 0 appearances
assert.deepEqual(byName["Luca Z."], { key: byName["Luca Z."].key, name: "Luca Z.", role: "D", shirt: null,
  stats: { matches: 1, appearances: 0, goals: 0, yellow: 0, red: 0 } });
// unknown birth date: treated as a minor
assert.ok(byName["Dario I."], "unknown birth date -> short name");
// order: role P, D, C, A, then unknown
assert.deepEqual(prima.players.map((p) => p.role), ["P", "D", "A", null]);
assert.deepEqual(prima.players.map((p) => p.key), ["p1", "p2", "p3", "p4"]);
// staff: adults with a known birth date, active roles, no label with a phone
assert.deepEqual(prima.staff, [{ name: "Mario Misterone", role: "Allenatore" }, { name: "Sara Dirigentona", role: "Dirigente" }]);

const u16 = await showcase("u16");
const names16 = u16.players.map((p) => p.name).sort();
// minors are ALWAYS first name + initial in r142, whatever consent rows exist (guardian, own, revoked, non-guardian);
// membership ended -> not listed
assert.deepEqual(names16, ["Carlo C.", "Ettore Q.", "Fabio D.", "Gino N.", "Ivo R."]);
assert.deepEqual(u16.staff, [{ name: "Ugo Altromister", role: "Allenatore" }]);
assert.ok(u16.players.every((p) => p.shirt === null && p.stats === null));

// ---------------------------------------------------------------- nothing private in any public payload
const keysOk = (o) => {
  for (const p of o.players ?? []) assert.deepEqual(Object.keys(p).sort(), ["key", "name", "role", "shirt", "stats"]);
  for (const s of o.staff ?? []) assert.deepEqual(Object.keys(s).sort(), ["name", "role"]);
};
for (const team of ["prima", "u19", "u16", "u15"]) {
  for (const uid of [null, MIS, DIR, FAM]) {
    const out = await showcase(team, uid);
    keysOk(out);
    const s = JSON.stringify(out);
    for (const secret of ["Consensato", "Doppiafirma", "Zetaminore", "Quindicenne", "Ignotissimo", "Nonguardiano", "Revocatissimo", "Vicestaffminore", "Senzadata", "Partitissimo",
      "example.org", "000 ", "XXX", "Genitrice", "Estranea", "333 1234567", "40000000-", "30000000-", "birth", "phone", "email", "fiscal"]) {
      assert.ok(!s.includes(secret), `${team} as ${uid ?? "anon"} leaks ${secret}`);
    }
    assert.ok(!/\d{4}-\d{2}-\d{2}/.test(s), `${team} leaks a date`);
  }
}

// ---------------------------------------------------------------- adults only, exactly at 18; malformed team ids
{
  const r = (await db.query(`select public.scd_showcase_full_name(null, ${ago(18)}) a, public.scd_showcase_full_name(null, (current_date - interval '18 years' + interval '1 day')::date) b,
    public.scd_showcase_full_name(null, null) c`)).rows[0];
  assert.deepEqual(r, { a: true, b: false, c: false });
  // an event whose metadata team_id is not a uuid must not break the public read
  await db.exec(`insert into public.scd_events (organization_id, starts_at, metadata) values ('${ORG}', now(), '{"team_id":"not-a-uuid"}'), ('${ORG}', now(), '{"team_id":""}')`);
  await db.exec(`insert into public.scd_matches (organization_id, event_id) select '${ORG}', id from public.scd_events where metadata->>'team_id' in ('not-a-uuid', '')`);
  assert.equal((await showcase("prima")).available, true);
}

// ---------------------------------------------------------------- staff flagged needs_review (r141 column) is left out
// r142 was created above without the column (r141 not applied); adding it later needs no re-creation of r142.
await db.exec(`alter table public.scd_structure_roles add column needs_review boolean not null default false`);
await db.exec(`update public.scd_structure_roles set needs_review = true where person_id = '${P(16)}'`);
assert.deepEqual((await showcase("prima")).staff, [{ name: "Mario Misterone", role: "Allenatore" }]);
await db.exec(`update public.scd_structure_roles set needs_review = false where person_id = '${P(16)}'`);
await db.exec(R142); // re-applies after r141 too

// ---------------------------------------------------------------- mister desk: read and write roles
await assert.rejects(as(null, `select public.scd_staff_team_roles($1, $2)`, [ORG, T.prima]), /not allowed/);
await assert.rejects(as(OTHER_MIS, `select public.scd_staff_team_roles($1, $2)`, [ORG, T.prima]), /not allowed/);
const roles = (await as(MIS, `select public.scd_staff_team_roles($1, $2) r`, [ORG, T.prima]))[0].r;
assert.equal(roles.length, 5, "current memberships of the team (left people included: the desk filters them)");
assert.deepEqual(Object.keys(roles[0]).sort(), ["athleteId", "role"]);

const set = (uid, team, rows) => as(uid, `select public.scd_staff_set_team_roles($1, $2, $3) n`, [ORG, team, JSON.stringify(rows)]);
await assert.rejects(set(null, T.prima, [{ athlete_id: A(2), role: "C" }]), /not allowed/);
await assert.rejects(set(FAM, T.prima, [{ athlete_id: A(2), role: "C" }]), /not allowed/);
await assert.rejects(set(OTHER_MIS, T.prima, [{ athlete_id: A(2), role: "C" }]), /not allowed/, "mister of another team");
await assert.rejects(set(MIS, T.prima, [{ athlete_id: A(4), role: "C" }]), /athlete not in team/);
await assert.rejects(set(MIS, T.prima, [{ athlete_id: A(2), role: "X" }]), /invalid row/);
await assert.rejects(set(MIS, T.prima, [{ athlete_id: A(2) }]), /invalid row/, "role key is mandatory");
await assert.rejects(set(MIS, T.prima, [{ athlete_id: A(2), role: "C" }, { athlete_id: A(2), role: "D" }]), /duplicate athlete/);
await assert.rejects(set(MIS, T.prima, []), /invalid rows/);
assert.equal((await set(MIS, T.prima, [{ athlete_id: A(2), role: "C" }, { athlete_id: A(1), role: "A" }, { athlete_id: A(7), role: null }]))[0].n, 2);
assert.equal((await set(MIS, T.prima, [{ athlete_id: A(2), role: "C" }]))[0].n, 0, "no change = 0");
assert.equal((await set(DIR, T.u16, [{ athlete_id: A(4), role: "P" }]))[0].n, 1, "Direzione on any team");
const after = await showcase("prima");
assert.equal(after.players.find((p) => p.name === "Bruno Bianchetti").role, "C");
assert.equal(after.players.find((p) => p.name === "Dario I.").role, null);
const audit = await db.query(`select action, payload from public.scd_audit_events order by id`);
assert.deepEqual(audit.rows.map((r) => r.action), ["ROSTER_ROLES_SET", "ROSTER_ROLES_SET", "ROSTER_ROLES_SET"]);
assert.deepEqual(audit.rows[0].payload, { rows: 3, changed: 2 }, "audit carries counts only");

console.log("r142 public team showcase: all assertions passed");
