// r116 Risultati & Classifiche (official LND data) — behaviour test on an in-memory Postgres (PGlite), no remote
// database touched. Run from the repository root (PGlite is not a dependency of the app):
//   npm install --prefix /tmp/scd-pglite @electric-sql/pglite@0.5.10
//   PGLITE_DIR=/tmp/scd-pglite node supabase/tests/r116_lnd_standings.pglite.mjs
// Exit code 0 = every assertion passed. The r33/r35/r51 objects r116 needs are created in their minimal shape.
// Every id, organisation and club name below is invented.
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
const R115 = readFileSync(fileURLToPath(new URL("../migrations/20261017_r116_lnd_standings.sql", import.meta.url)), "utf8");

const ORG = "00000000-0000-0000-0000-000000000001";
const U = (n) => `10000000-0000-0000-0000-0000000000${String(n).padStart(2, "0")}`;
const MISTER = U(1), FAM = U(2), SEG = U(3);
const KID = "20000000-0000-0000-0000-000000000001";
const EV = "30000000-0000-0000-0000-000000000001";
const MATCH = "40000000-0000-0000-0000-000000000001";

const base = `
create role anon; create role authenticated; create role service_role;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create type public.scd_role as enum ('USER_BASE','FAMILY','ATHLETE','MISTER','STAFF','MANAGER','SECRETARIAT','REGISTRATION','TOURNAMENTS','DIRECTION');
create table public.scd_organizations (id uuid primary key, name text);
create table public.scd_memberships (organization_id uuid, user_id uuid, role public.scd_role, active boolean default true);
create table public.scd_people (id uuid primary key, organization_id uuid, first_name text not null, last_name text not null);
create table public.scd_events (id uuid primary key default gen_random_uuid(), organization_id uuid, event_type text, title text, starts_at timestamptz not null);
create table public.scd_matches (id uuid primary key default gen_random_uuid(), organization_id uuid not null, event_id uuid not null unique references public.scd_events(id),
  campionato_name text not null, home_team text not null, away_team text not null, venue_name text not null,
  convocazioni_status text not null default 'DA_COMPILARE', source_id text not null default 'UNVERIFIED');
alter table public.scd_matches enable row level security;
revoke all on table public.scd_matches from anon, authenticated;
create function public.scd_has_org_role(p_organization_id uuid, p_roles public.scd_role[]) returns boolean language sql stable security invoker set search_path = public as $$
  select exists (select 1 from public.scd_memberships m where m.organization_id = p_organization_id and m.user_id = auth.uid() and m.active and m.role = any(p_roles)) $$;
grant execute on function public.scd_has_org_role(uuid, public.scd_role[]) to anon, authenticated;
grant select on public.scd_memberships to anon, authenticated;
grant usage on schema auth to anon, authenticated;
insert into public.scd_organizations values ('${ORG}', 'Club di prova');
insert into public.scd_memberships values ('${ORG}', '${MISTER}', 'MISTER', true), ('${ORG}', '${FAM}', 'FAMILY', true), ('${ORG}', '${SEG}', 'SECRETARIAT', true);
insert into public.scd_people values ('${KID}', '${ORG}', 'Atleta', 'Esempio');
insert into public.scd_events values ('${EV}', '${ORG}', 'MATCH', 'Gara di prova', '2026-10-11 13:30:00+00');
insert into public.scd_matches (id, organization_id, event_id, campionato_name, home_team, away_team, venue_name, convocazioni_status)
  values ('${MATCH}', '${ORG}', '${EV}', 'Promozione', 'CLUB CASA', 'CLUB OSPITE', 'Campo di prova', 'INVIATE');
`;

// prerequisites guard: r116 alone refuses to run
{
  const bare = new PGlite();
  await bare.exec(`create role anon; create role authenticated; create role service_role;`);
  await assert.rejects(bare.exec(R115), /r116 prerequisites missing/);
}

const db = new PGlite();
await db.exec(base);
await db.exec(R115);
await db.exec(R115); // idempotent

const SRC = "https://gare.lnd.it/competizione/lombardia?campionato=PR&girone=D";
const ROWS = JSON.stringify([
  { team: "club casa", pos: 1, pt: 3, g: 1, v: 1, n: 0, p: 0, gf: 2, gs: 0 },
  { team: "club ospite", pos: 2, pt: 0, g: 1, v: 0, n: 0, p: 1, gf: 0, gs: 2 },
]);

// writes: service role only (superuser here plays the job runner)
const comp = (await db.query(
  `insert into public.scd_competitions (organization_id, season, team_code, kind, lnd_championship_code, lnd_group_code, name, group_name, source_url)
   values ($1, '2026/27', 'prima', 'CAMPIONATO', 'PR', 'D', 'Promozione', 'Girone D', $2) returning id`, [ORG, SRC])).rows[0].id;
const cup = (await db.query(
  `insert into public.scd_competitions (organization_id, season, team_code, kind, lnd_championship_code, lnd_group_code, name, group_name, source_url, has_standings)
   values ($1, '2026/27', 'prima', 'COPPA', 'CR', '11', 'Coppa Italia Promozione', 'Girone 11', $2, false) returning id`, [ORG, SRC.replace("PR&girone=D", "CR&girone=11")])).rows[0].id;
assert.ok(cup);
await db.query(`insert into public.scd_standings_snapshots (organization_id, competition_id, fetched_at, source_url, matchday, rows)
  values ($1, $2, '2026-10-17 10:40:00+00', $3, 5, $4::jsonb)`, [ORG, comp, SRC, ROWS]);
await db.query(`update public.scd_matches set lnd_match_id = 10385703, lnd_competition_id = $1, lnd_home_goals = 2, lnd_away_goals = 0,
  lnd_result_label = 'Da Giudice sportivo', lnd_result_source_url = $2, lnd_result_fetched_at = now() where id = $3`, [comp, SRC, MATCH]);
const notice = (await db.query(`insert into public.scd_official_notices (organization_id, issuer, season, number, published_on, url)
  values ($1, 'CR_LOMBARDIA', '2026/27', '25', '2026-10-15', 'https://www.crlombardia.it/comunicati') returning id`, [ORG])).rows[0].id;
await db.query(`insert into public.scd_disciplinary_items (organization_id, notice_id, competition_id, match_id, subject_kind, person_id, measure, matches_count)
  values ($1, $2, $3, $4, 'CALCIATORE', $5, 'SQUALIFICA', 1)`, [ORG, notice, comp, MATCH, KID]);

// SGS rule: no competition (so no standings) for the attività di base
for (const team of ["pulcini", "primicalci", "piccoli", "esordienti", "2014", "2015", "esordienti-2014"]) {
  await assert.rejects(
    db.query(`insert into public.scd_competitions (organization_id, season, team_code, kind, lnd_championship_code, lnd_group_code, name, group_name, source_url)
      values ($1, '2026/27', $2, 'CAMPIONATO', 'XX', 'A', 'Torneo', 'Girone A', $3)`, [ORG, team, SRC]),
    /scd_competitions_no_base_activity/, team);
}
// sources: gare.lnd.it only; rows must be a non-empty array; a score always carries source and time
await assert.rejects(db.query(`insert into public.scd_standings_snapshots (organization_id, competition_id, fetched_at, source_url, rows)
  values ($1, $2, now(), 'https://www.tuttocampo.it/x', $3::jsonb)`, [ORG, comp, ROWS]));
await assert.rejects(db.query(`insert into public.scd_standings_snapshots (organization_id, competition_id, fetched_at, source_url, rows)
  values ($1, $2, now(), $3, '{}'::jsonb)`, [ORG, comp, SRC]));
await assert.rejects(db.query(`insert into public.scd_standings_snapshots (organization_id, competition_id, fetched_at, source_url, rows)
  values ($1, $2, now(), $3, '[]'::jsonb)`, [ORG, comp, SRC]));
await assert.rejects(db.query(`update public.scd_matches set lnd_result_source_url = null where id = $1`, [MATCH]));
await assert.rejects(db.query(`update public.scd_matches set lnd_home_goals = -1 where id = $1`, [MATCH]));
await assert.rejects(db.query(`update public.scd_matches set lnd_away_goals = null where id = $1`, [MATCH]));

const as = async (role, uid, sql, params = []) => {
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [uid ?? ""]);
  await db.exec(`set role ${role}`);
  try {
    return (await db.query(sql, params)).rows;
  } finally {
    await db.exec(`reset role`);
  }
};

// public read: anon and any signed-in person see competitions, standings, notices
assert.equal((await as("anon", null, `select id from public.scd_competitions`)).length, 2);
const snap = await as("anon", null, `select rows, source_url, fetched_at from public.scd_standings_snapshots`);
assert.equal(snap.length, 1);
assert.equal(snap[0].rows[0].team, "club casa");
assert.equal(snap[0].source_url, SRC);
assert.equal((await as("anon", null, `select number from public.scd_official_notices`)).length, 1);
assert.equal((await as("authenticated", FAM, `select id from public.scd_standings_snapshots`)).length, 1);

// no writes for anon or authenticated, staff included
for (const [role, uid] of [["anon", null], ["authenticated", FAM], ["authenticated", MISTER], ["authenticated", SEG]]) {
  await assert.rejects(as(role, uid, `insert into public.scd_standings_snapshots (organization_id, competition_id, fetched_at, source_url, rows)
    values ('${ORG}', '${comp}', now(), '${SRC}', '${ROWS}'::jsonb)`), /permission denied/, `${role} ${uid} insert standings`);
  await assert.rejects(as(role, uid, `update public.scd_competitions set name = 'x'`), /permission denied/);
  await assert.rejects(as(role, uid, `delete from public.scd_official_notices`), /permission denied/);
  await assert.rejects(as(role, uid, `insert into public.scd_disciplinary_items (organization_id, notice_id, subject_kind, measure)
    values ('${ORG}', '${notice}', 'SOCIETA', 'AMMENDA')`), /permission denied/);
}

// disciplinary items: never public, never families; staff only
await assert.rejects(as("anon", null, `select id from public.scd_disciplinary_items`), /permission denied/);
assert.equal((await as("authenticated", FAM, `select id from public.scd_disciplinary_items`)).length, 0);
assert.equal((await as("authenticated", MISTER, `select id from public.scd_disciplinary_items`)).length, 1);
assert.equal((await as("authenticated", SEG, `select id from public.scd_disciplinary_items`)).length, 1);
// the item stores no name
const cols = (await db.query(`select column_name from information_schema.columns where table_name = 'scd_disciplinary_items'`)).rows.map((r) => r.column_name);
assert.ok(!cols.some((c) => /name|nome|cognome|birth/.test(c)), cols.join(","));

// scd_matches stays member-only; the public sees official result fields through the function only
await assert.rejects(as("anon", null, `select id from public.scd_matches`), /permission denied/);
const res = (await as("anon", null, `select public.scd_public_lnd_results($1, 5) as r`, [comp]))[0].r;
assert.equal(res.length, 1);
assert.deepEqual(Object.keys(res[0]).sort(), ["away", "awayGoals", "date", "fetchedAt", "home", "homeGoals", "label", "lndMatchId", "sourceUrl", "time"]);
assert.equal(res[0].homeGoals, 2);
assert.equal(res[0].date, "2026-10-11");
assert.equal(res[0].time, "15:30");
assert.ok(!JSON.stringify(res).includes("INVIATE"), "no convocation status in the public read");
assert.deepEqual((await as("anon", null, `select public.scd_public_lnd_results($1, 5) as r`, [cup]))[0].r, []);

// same LND match cannot be linked twice
await db.query(`insert into public.scd_events values ('30000000-0000-0000-0000-000000000002', '${ORG}', 'MATCH', 'Altra', now())`);
await assert.rejects(db.query(`insert into public.scd_matches (organization_id, event_id, campionato_name, home_team, away_team, venue_name, lnd_match_id)
  values ('${ORG}', '30000000-0000-0000-0000-000000000002', 'x', 'a', 'b', 'c', 10385703)`));

console.log("r116 lnd standings: all assertions passed");
