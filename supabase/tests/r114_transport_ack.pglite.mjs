// r114 Pulmini «presa visione» — behaviour test on an in-memory Postgres (PGlite), no remote database touched.
// Run from the repository root (PGlite is not a dependency of the app, so it is installed in a throwaway folder):
//   npm install --prefix /tmp/scd-pglite @electric-sql/pglite@0.5.10
//   PGLITE_DIR=/tmp/scd-pglite node supabase/tests/r114_transport_ack.pglite.mjs
// Exit code 0 = every assertion passed. r84 is loaded from its real file; the r33/r61/r74 objects it needs are created
// in their minimal shape. Every id, organisation and name below is invented.
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
const R84 = file("../migrations/20261012_r84_transport_requests.sql");
const R113 = file("../migrations/20261017_r114_transport_ack.sql");

const ORG = "00000000-0000-0000-0000-000000000001";
const U = (n) => `10000000-0000-0000-0000-0000000000${String(n).padStart(2, "0")}`;
const P = (n) => `20000000-0000-0000-0000-0000000000${String(n).padStart(2, "0")}`;
// 1 Responsabile servizio pulmini, 2 parent of P1, 3 another parent (P2), 4 Segreteria, 5 autista
const RESP = U(1), FAM = U(2), OTHER = U(3), SEG = U(4), AUT = U(5);
const KID = P(1), KID2 = P(2);

const base = `
create role anon; create role authenticated; create role service_role;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create type public.scd_role as enum ('USER_BASE','FAMILY','ATHLETE','MISTER','STAFF','MANAGER','SECRETARIAT','REGISTRATION','TOURNAMENTS','DIRECTION');
create table public.scd_organizations (id uuid primary key, name text);
create table public.scd_memberships (organization_id uuid, user_id uuid, role public.scd_role, scope jsonb default '{}'::jsonb, active boolean default true);
create table public.scd_people (id uuid primary key, organization_id uuid, display_name text, first_name text, last_name text);
create table public.scd_family_links (user_id uuid, person_id uuid);
create function public.scd_my_family(p_organization_id uuid) returns table (person_id uuid) language sql stable as $$
  select l.person_id from public.scd_family_links l where l.user_id = auth.uid() $$;
create function public.scd_has_org_role(p_organization_id uuid, p_roles public.scd_role[]) returns boolean language sql stable security invoker set search_path = public as $$
  select exists (select 1 from public.scd_memberships m where m.organization_id = p_organization_id and m.user_id = auth.uid() and m.active and m.role = any(p_roles)) $$;
create function public.scd_has_position(p_organization_id uuid, p_positions text[]) returns boolean language sql stable set search_path to 'public' as $$
  select exists (select 1 from public.scd_memberships m where m.organization_id = p_organization_id and m.user_id = (select auth.uid()) and m.active
    and jsonb_typeof(m.scope -> 'positions') = 'array'
    and exists (select 1 from jsonb_array_elements_text(m.scope -> 'positions') p where p = any(p_positions))) $$;
create table public.scd_transport_stops (id uuid primary key default gen_random_uuid(), organization_id uuid, source_record_id text,
  line_id text, line_label text, position integer, town text, place text, status text, eta text, active boolean default true);
insert into public.scd_organizations values ('${ORG}', 'Club di prova');
insert into public.scd_memberships (organization_id, user_id, role, scope) values
  ('${ORG}', '${RESP}', 'STAFF', '{"positions":["responsabile-trasporti","autista"]}'),
  ('${ORG}', '${FAM}', 'FAMILY', '{}'),
  ('${ORG}', '${OTHER}', 'FAMILY', '{}'),
  ('${ORG}', '${SEG}', 'SECRETARIAT', '{}'),
  ('${ORG}', '${AUT}', 'STAFF', '{"positions":["autista"]}');
insert into public.scd_people values ('${KID}', '${ORG}', null, 'Atleta', 'Esempio'), ('${KID2}', '${ORG}', null, 'Altro', 'Esempio');
insert into public.scd_family_links values ('${FAM}', '${KID}'), ('${OTHER}', '${KID2}');
insert into public.scd_transport_stops (organization_id, source_record_id, line_label, town, place) values ('${ORG}', 'F-1', 'VALTELLINA', 'Paese', 'Piazza');
`;

// prerequisites guard: r114 alone refuses to run
{
  const bare = new PGlite();
  await bare.exec(base);
  await assert.rejects(bare.exec(R113), /r114 prerequisites missing/);
}

const db = new PGlite();
await db.exec(base);
await db.exec(R84);
await db.exec(R113);
// idempotent
await db.exec(R113);

const as = async (uid, sql, params = []) => {
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [uid]);
  return (await db.query(sql, params)).rows;
};
const one = async (uid, sql, params = []) => Object.values((await as(uid, sql, params))[0])[0];

const future = (await db.query(`select (current_date + 3)::text as d`)).rows[0].d;
const ask = (uid, person) => one(uid, `select public.scd_request_transport($1, $2::jsonb)`, [ORG, JSON.stringify({ personId: person, eventId: "ev-1", date: future, teamCode: "u15", direction: "ANDATA_RITORNO" })]);
const ack = (uid, id) => one(uid, `select public.scd_ack_transport_request($1, $2)`, [ORG, id]);
const decide = (uid, id, d, note = null) => one(uid, `select public.scd_decide_transport_request($1, $2, $3, $4)`, [ORG, id, d, note]);
const mine = async (uid) => one(uid, `select public.scd_my_transport_requests($1)`, [ORG]);
const board = async (uid) => one(uid, `select public.scd_transport_requests_board($1, current_date - 1, current_date + 30)`, [ORG]);

const r = await ask(FAM, KID);
assert.equal(r.ok, true);
const id = r.id;

// 1. no presa visione before the confirmation
assert.deepEqual(await ack(FAM, id), { ok: false, code: "not_confirmed" });
assert.equal((await mine(FAM))[0].acknowledged, false);

// 2. the Responsabile servizio pulmini confirms (owner), the plain autista may not, the family may not
assert.deepEqual(await decide(AUT, id, "CONFERMATA"), { ok: false, code: "forbidden" });
assert.deepEqual(await decide(FAM, id, "CONFERMATA"), { ok: false, code: "forbidden" });
assert.equal((await decide(RESP, id, "CONFERMATA")).ok, true);
assert.equal(await board(AUT), null, "drivers do not read the office list");

// 3. only the family circle takes presa visione
assert.deepEqual(await ack(OTHER, id), { ok: false, code: "forbidden" });
assert.deepEqual(await ack(RESP, id), { ok: false, code: "forbidden" });
assert.deepEqual(await ack(null, id).catch(() => ({ ok: false, code: "forbidden" })), { ok: false, code: "forbidden" });
assert.deepEqual(await ack(FAM, "30000000-0000-0000-0000-000000000000"), { ok: false, code: "not_found" });
assert.deepEqual(await ack(FAM, id), { ok: true });
assert.deepEqual(await ack(FAM, id), { ok: true, already: true }, "idempotent");
assert.equal((await mine(FAM))[0].acknowledged, true);
const office = await board(RESP);
assert.equal(office[0].acknowledged, true);
assert.equal(office[0].name, "Atleta Esempio", "r84 output kept (the app shortens the name)");
assert.equal((await board(SEG))[0].acknowledged, true, "Segreteria stands in");
const events = (await db.query(`select action from public.scd_transport_request_events where request_id = $1 order by id`, [id])).rows.map((x) => x.action);
assert.deepEqual(events, ["RICHIESTA", "CONFERMATA", "PRESA_VISIONE"], "one PRESA_VISIONE logged");

// 4. a new decision makes the presa visione stale by itself
await db.query(`update public.scd_transport_requests set decided_at = now() + interval '1 minute' where id = $1`, [id]);
assert.equal((await mine(FAM))[0].acknowledged, false);
await db.query(`update public.scd_transport_requests set decided_at = now() - interval '1 minute' where id = $1`, [id]);
assert.equal((await mine(FAM))[0].acknowledged, true);

// 5. a family that changes the request goes back to RICHIESTA: blocked while confirmed (r84), and NON_POSSIBILE never acknowledgeable
const r2 = await ask(OTHER, KID2);
assert.equal((await decide(RESP, r2.id, "NON_POSSIBILE", "posti finiti")).ok, true);
assert.deepEqual(await ack(OTHER, r2.id), { ok: false, code: "not_confirmed" });
assert.equal((await mine(OTHER))[0].acknowledged, false);

// 6. past matches are refused
await db.query(`update public.scd_transport_requests set event_date = current_date - 1 where id = $1`, [id]);
await db.query(`update public.scd_transport_requests set ack_at = null where id = $1`, [id]);
assert.deepEqual(await ack(FAM, id), { ok: false, code: "past" });

// 7. the widened check keeps every r84 action and still refuses unknown ones
await assert.rejects(db.query(`insert into public.scd_transport_request_events (organization_id, request_id, action) values ($1, $2, 'ALTRO')`, [ORG, id]));

// 8. grants: anon cannot run the new function
const grants = (await db.query(`select has_function_privilege('anon', 'public.scd_ack_transport_request(uuid, uuid)', 'execute') as anon,
  has_function_privilege('authenticated', 'public.scd_ack_transport_request(uuid, uuid)', 'execute') as auth`)).rows[0];
assert.deepEqual(grants, { anon: false, auth: true });

console.log("r114 transport ack: all assertions passed");
