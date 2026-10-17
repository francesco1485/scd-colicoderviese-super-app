// r117 Area partite + r118 Area allenamenti e verifica mensile — behaviour test on an in-memory Postgres (PGlite),
// no remote database touched. Run from the repository root (PGlite is not a dependency of the app):
//   npm install --prefix /tmp/scd-pglite @electric-sql/pglite@0.5.10
//   PGLITE_DIR=/tmp/scd-pglite node supabase/tests/r117_area_partite.pglite.mjs
// Exit code 0 = every assertion passed. r117 and r118 are loaded from their real files; the r33/r51/r53/r61/r62/r68/
// r70/r92/r104 objects they need are created here in their minimal shape (scd_match_team_id is the real r62 body).
// Every id, organisation and name below is invented.
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
const R117 = file("../migrations/20261017_r117_area_partite.sql");
const R118 = file("../migrations/20261017_r118_area_allenamenti.sql");
const R119 = file("../migrations/20261017_r119_team_docs_retention_season.sql");

const ORG = "00000000-0000-0000-0000-000000000001";
const U = (n) => `10000000-0000-0000-0000-0000000000${String(n).padStart(2, "0")}`;
const P = (n) => `20000000-0000-0000-0000-0000000000${String(n).padStart(2, "0")}`;
const A = (n) => `30000000-0000-0000-0000-0000000000${String(n).padStart(2, "0")}`;
const T15 = "40000000-0000-0000-0000-000000000015";
const T16 = "40000000-0000-0000-0000-000000000016";
// 1 mister U15, 2 mister U16, 3 Segreteria, 4 parent of kid 1 (U15), 5 parent of kid 2 (U15), 6 base account
const MIS15 = U(1), MIS16 = U(2), SEG = U(3), FAM = U(4), FAM2 = U(5), BASE = U(6);
const KID1 = P(1), KID2 = P(2), KID3 = P(3);
const ATH1 = A(1), ATH2 = A(2), ATH3 = A(3);

const base = `
create role anon; create role authenticated; create role service_role;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create schema storage;
create table storage.buckets (id text primary key, name text not null, public boolean not null default false);
insert into storage.buckets (id, name, public) values ('scd-private', 'scd-private', false);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text);
alter table storage.objects enable row level security;
grant usage on schema storage to authenticated;
grant select, insert on storage.objects to authenticated;
create type public.scd_role as enum ('USER_BASE','FAMILY','ATHLETE','MISTER','STAFF','MANAGER','SECRETARIAT','REGISTRATION','TOURNAMENTS','DIRECTION');
create table public.scd_organizations (id uuid primary key, name text);
create table public.scd_memberships (organization_id uuid, user_id uuid, role public.scd_role, scope jsonb default '{}'::jsonb, active boolean default true);
create table public.scd_people (id uuid primary key, organization_id uuid, display_name text, first_name text, last_name text, birth_date date);
create table public.scd_athletes (id uuid primary key, organization_id uuid, person_id uuid, updated_at timestamptz default now());
create table public.scd_teams (id uuid primary key, organization_id uuid, season_id uuid, code text, name text, status text default 'ACTIVE', created_at timestamptz default now());
create table public.scd_team_memberships (id uuid primary key default gen_random_uuid(), organization_id uuid, team_id uuid references public.scd_teams(id),
  athlete_id uuid references public.scd_athletes(id), valid_from date, valid_to date);
create table public.scd_events (id uuid primary key default gen_random_uuid(), organization_id uuid references public.scd_organizations(id),
  title text, starts_at timestamptz not null, source_id text, source_record_id text, metadata jsonb not null default '{}'::jsonb);
create table public.scd_matches (id uuid primary key default gen_random_uuid(), organization_id uuid references public.scd_organizations(id),
  event_id uuid unique references public.scd_events(id), home_team text, away_team text);
create table public.scd_match_callups (id uuid primary key default gen_random_uuid(), organization_id uuid, match_id uuid references public.scd_matches(id),
  athlete_id uuid references public.scd_athletes(id), response_status text not null default 'PENDING', updated_at timestamptz default now(),
  withdrawn_at timestamptz, withdrawn_by uuid, unique (match_id, athlete_id));
create table public.scd_match_sheets (id uuid primary key default gen_random_uuid(), organization_id uuid, match_id uuid unique, status text);
create table public.scd_match_team_stats (id uuid primary key default gen_random_uuid(), organization_id uuid, match_id uuid, team_id uuid,
  is_scd_team boolean default true, goals_for integer, goals_against integer, updated_at timestamptz default now());
create table public.scd_audit_events (id bigint generated always as identity primary key, organization_id uuid, actor_user_id uuid, action text,
  entity_type text, entity_id uuid, payload jsonb not null default '{}'::jsonb, created_at timestamptz default now());
create table public.scd_training_sessions (id uuid primary key default gen_random_uuid(), organization_id uuid, team_id uuid not null references public.scd_teams(id),
  event_id uuid, starts_at timestamptz not null, duration_minutes integer not null default 90 check (duration_minutes between 1 and 360),
  technical_theme text, coach_notes text, created_by_user_id uuid, source_id text not null default 'SCD_STAFF', source_verified_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.scd_training_attendance (id uuid primary key default gen_random_uuid(), organization_id uuid,
  training_session_id uuid not null references public.scd_training_sessions(id), athlete_id uuid not null references public.scd_athletes(id),
  present boolean not null default true, absence_reason text, rpe smallint, recorded_by_user_id uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (training_session_id, athlete_id));
create table public.scd_notification_outbox (id uuid primary key default gen_random_uuid(), organization_id uuid not null,
  kind text not null check (kind in ('ROLE_DECLARED','REGISTRATION','AUTO_VERIFIED','DIGEST_ITEM')),
  recipient_email text, recipient_label text, subject text not null check (length(subject) between 3 and 200),
  body text not null check (length(body) <= 4000), ref_request_id uuid, digest boolean not null default false,
  status text not null default 'QUEUED', created_at timestamptz not null default now(), sent_at timestamptz);
create table public.scd_family_links (user_id uuid, person_id uuid, relationship text);
create function public.scd_has_org_role(p_organization_id uuid, p_roles public.scd_role[]) returns boolean language sql stable security invoker set search_path = public as $$
  select exists (select 1 from public.scd_memberships m where m.organization_id = p_organization_id and m.user_id = auth.uid() and m.active and m.role = any(p_roles)) $$;
-- minimal r61/r65_1: office roles see every team; others the team codes assigned on the account
create function public.scd_my_team_ids(p_organization_id uuid) returns setof uuid language sql stable security definer set search_path to 'public' as $$
  select t.id from public.scd_teams t where t.organization_id = p_organization_id and (
    public.scd_has_org_role(p_organization_id, array['DIRECTION','SECRETARIAT','REGISTRATION']::public.scd_role[])
    or exists (select 1 from public.scd_memberships m where m.organization_id = p_organization_id and m.user_id = auth.uid() and m.active
               and coalesce(m.scope->'teams', '[]'::jsonb) ? t.code)) $$;
create function public.scd_my_family(p_organization_id uuid) returns table (person_id uuid, display_name text, relationship text)
  language sql stable security definer set search_path to 'public' as $$
  select l.person_id, p.first_name || ' ' || p.last_name, l.relationship from public.scd_family_links l join public.scd_people p on p.id = l.person_id
  where l.user_id = auth.uid() $$;
-- real r62 body
create function public.scd_match_team_id(p_match_id uuid) returns uuid language sql stable security definer set search_path to 'public' as $$
  select nullif(e.metadata->>'team_id', '')::uuid from public.scd_matches m join public.scd_events e on e.id = m.event_id where m.id = p_match_id $$;

insert into public.scd_organizations values ('${ORG}', 'Club di prova');
insert into public.scd_memberships (organization_id, user_id, role, scope) values
  ('${ORG}', '${MIS15}', 'MISTER', '{"teams":["u15"]}'),
  ('${ORG}', '${MIS16}', 'MISTER', '{"teams":["u16"]}'),
  ('${ORG}', '${SEG}', 'SECRETARIAT', '{}'),
  ('${ORG}', '${FAM}', 'FAMILY', '{}'),
  ('${ORG}', '${FAM2}', 'FAMILY', '{}'),
  ('${ORG}', '${BASE}', 'USER_BASE', '{}');
insert into public.scd_teams (id, organization_id, code, name) values ('${T15}', '${ORG}', 'u15', 'Giovanissimi U15'), ('${T16}', '${ORG}', 'u16', 'Allievi U16');
insert into public.scd_people values
  ('${KID1}', '${ORG}', null, 'Primo', 'Esempio', '2011-03-01'),
  ('${KID2}', '${ORG}', null, 'Secondo', 'Esempio', '2011-05-01'),
  ('${KID3}', '${ORG}', null, 'Terzo', 'Esempio', '2010-05-01');
insert into public.scd_athletes (id, organization_id, person_id) values ('${ATH1}', '${ORG}', '${KID1}'), ('${ATH2}', '${ORG}', '${KID2}'), ('${ATH3}', '${ORG}', '${KID3}');
insert into public.scd_team_memberships (organization_id, team_id, athlete_id) values ('${ORG}', '${T15}', '${ATH1}'), ('${ORG}', '${T15}', '${ATH2}'), ('${ORG}', '${T16}', '${ATH3}');
insert into public.scd_family_links values ('${FAM}', '${KID1}', 'FIGLIO'), ('${FAM2}', '${KID2}', 'FIGLIO');
`;

// prerequisites guards: r117 and r118 refuse to run alone
{
  const bare = new PGlite();
  await bare.exec(`create schema auth; create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;`);
  await assert.rejects(bare.exec(R117), /r117 prerequisites missing/);
  await assert.rejects(bare.exec(R118), /r118 prerequisites missing/);
}

const db = new PGlite();
await db.exec(base);
{
  // r118 before r117 is refused too
  await assert.rejects(db.exec(R118), /r118 prerequisites missing/);
}
await db.exec(R117);
await db.exec(R117); // idempotent
await db.exec(R118);
await db.exec(R118); // idempotent

// calendar matches (official calendar copy ids): E1 U15 played 2 days ago, E2 U16 played, E3 U15 in 3 days
await db.exec(`
insert into public.scd_events (id, organization_id, title, starts_at, source_id, source_record_id, metadata) values
  ('50000000-0000-0000-0000-000000000001', '${ORG}', 'U15 - Avversario A', now() - interval '2 days', 'MASTER_CALENDARIO_2026_27', 'ev-1', '{"team_id":"${T15}","team_code":"u15"}'),
  ('50000000-0000-0000-0000-000000000002', '${ORG}', 'U16 - Avversario B', now() - interval '2 days', 'MASTER_CALENDARIO_2026_27', 'ev-2', '{"team_id":"${T16}","team_code":"u16"}'),
  ('50000000-0000-0000-0000-000000000003', '${ORG}', 'U15 - Avversario C', now() + interval '3 days', 'MASTER_CALENDARIO_2026_27', 'ev-3', '{"team_id":"${T15}","team_code":"u15"}');
insert into public.scd_matches (id, organization_id, event_id) values
  ('60000000-0000-0000-0000-000000000001', '${ORG}', '50000000-0000-0000-0000-000000000001'),
  ('60000000-0000-0000-0000-000000000002', '${ORG}', '50000000-0000-0000-0000-000000000002'),
  ('60000000-0000-0000-0000-000000000003', '${ORG}', '50000000-0000-0000-0000-000000000003');
insert into public.scd_match_callups (id, organization_id, match_id, athlete_id) values
  ('70000000-0000-0000-0000-000000000001', '${ORG}', '60000000-0000-0000-0000-000000000003', '${ATH1}'),
  ('70000000-0000-0000-0000-000000000002', '${ORG}', '60000000-0000-0000-0000-000000000001', '${ATH1}');
insert into public.scd_match_team_stats (organization_id, match_id, team_id, goals_for, goals_against) values ('${ORG}', '60000000-0000-0000-0000-000000000001', '${T15}', 2, 1);
`);
const M1 = "60000000-0000-0000-0000-000000000001", M2 = "60000000-0000-0000-0000-000000000002";
const C_FUTURE = "70000000-0000-0000-0000-000000000001", C_PAST = "70000000-0000-0000-0000-000000000002";

const as = async (uid, sql, params = []) => {
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [uid ?? ""]);
  return (await db.query(sql, params)).rows;
};
const one = async (uid, sql, params = []) => Object.values((await as(uid, sql, params))[0])[0];
const denied = async (uid, sql, params = []) => {
  await assert.rejects(as(uid, sql, params), (e) => e.code === "42501" || /not allowed/.test(e.message));
};

// ================================================================ r117
// 1. new tables: RLS on, nothing granted to anon/authenticated
for (const t of ["scd_match_reports", "scd_match_documents", "scd_training_drills", "scd_team_gap_requests"]) {
  const r = (await db.query(`select relrowsecurity from pg_class where relname = $1`, [t])).rows[0];
  assert.equal(r.relrowsecurity, true, `${t} RLS`);
  const g = (await db.query(`select has_table_privilege('authenticated', 'public.${t}', 'select') as a, has_table_privilege('anon', 'public.${t}', 'select') as b`)).rows[0];
  assert.deepEqual(g, { a: false, b: false }, `${t} grants`);
}

// 2. match area: own team yes; other team's mister, family, base account, anon: denied
const area = (uid, ev) => one(uid, `select public.scd_staff_match_area($1, $2)`, [ORG, ev]);
const a1 = await area(MIS15, "ev-1");
assert.equal(a1.exists, true);
assert.equal(a1.team_code, "u15");
assert.equal(a1.played, true);
assert.equal(a1.callups.sent, 1);
assert.deepEqual(a1.tabellino.goals_for, 2);
await denied(MIS16, `select public.scd_staff_match_area($1, $2)`, [ORG, "ev-1"]);
await denied(FAM, `select public.scd_staff_match_area($1, $2)`, [ORG, "ev-1"]);
await denied(BASE, `select public.scd_staff_match_area($1, $2)`, [ORG, "ev-1"]);
await denied(null, `select public.scd_staff_match_area($1, $2)`, [ORG, "ev-1"]);
assert.deepEqual(await area(MIS15, "ev-nessuno"), { exists: false });
assert.equal((await area(SEG, "ev-2")).team_code, "u16", "Segreteria sees every team");

// 3. resoconto and opponent text: own team only, contacts stripped, unknown keys refused
const notes = (uid, m, p) => one(uid, `select public.scd_staff_save_match_notes($1, $2, $3::jsonb)`, [ORG, m, JSON.stringify(p)]);
assert.equal((await notes(MIS15, M1, { summary: "Buona gara, chiamare 333 123 4567 o scrivere a prova@example.org", opponentLineup: "1 Rossi, 2 Bianchi" })).ok, true);
assert.deepEqual(await notes(MIS16, M1, { summary: "x" }), { ok: false, code: "forbidden" });
assert.deepEqual(await notes(FAM, M1, { summary: "x" }), { ok: false, code: "forbidden" });
assert.deepEqual(await notes(null, M1, { summary: "x" }), { ok: false, code: "forbidden" });
assert.deepEqual(await notes(MIS15, M1, { altro: "x" }), { ok: false, code: "invalid" });
assert.deepEqual(await notes(MIS15, M1, { summary: "x".repeat(2001) }), { ok: false, code: "invalid" });
let rep = (await area(MIS15, "ev-1")).report;
assert.equal(rep.summary, "Buona gara, chiamare [telefono] o scrivere a [email]");
assert.equal(rep.opponent_lineup, "1 Rossi, 2 Bianchi");
assert.equal((await notes(MIS15, M1, { opponentScorers: "10 Verdi" })).ok, true);
rep = (await area(MIS15, "ev-1")).report;
assert.equal(rep.summary, "Buona gara, chiamare [telefono] o scrivere a [email]", "keys not sent are kept");
assert.equal(rep.opponent_scorers, "10 Verdi");
const audit = (await db.query(`select payload from public.scd_audit_events where action = 'MATCH_NOTES_SAVED' order by id limit 1`)).rows[0].payload;
assert.deepEqual(audit, { fields: ["opponentLineup", "summary"] }, "audit carries field names only");

// 4. documents: path must be under <org>/match/<match>/, team scope only, removal keeps the row
const path1 = `${ORG}/match/${M1}/1700000000-referto.pdf`;
const reg = (uid, m, p) => one(uid, `select public.scd_staff_register_match_document($1, $2, $3::jsonb)`, [ORG, m, JSON.stringify(p)]);
const doc = { path: path1, kind: "REFERTO", fileName: "referto.pdf", mime: "application/pdf", size: 1200 };
assert.deepEqual(await reg(MIS15, M1, { ...doc, path: `${ORG}/match/${M2}/x.pdf` }), { ok: false, code: "path" });
assert.deepEqual(await reg(MIS15, M1, { ...doc, path: `${ORG}/comp/${M1}/x.pdf` }), { ok: false, code: "path" });
assert.deepEqual(await reg(MIS15, M1, { ...doc, mime: "text/html" }), { ok: false, code: "invalid" });
assert.deepEqual(await reg(MIS15, M1, { ...doc, size: 20000000 }), { ok: false, code: "invalid" });
assert.deepEqual(await reg(MIS16, M1, doc), { ok: false, code: "forbidden" });
assert.deepEqual(await reg(FAM, M1, doc), { ok: false, code: "forbidden" });
const r1 = await reg(MIS15, M1, doc);
assert.equal(r1.ok, true);
assert.deepEqual(await reg(MIS15, M1, doc), { ok: false, code: "duplicate" });
const docPath = (uid, id) => one(uid, `select public.scd_staff_match_document_path($1, $2)`, [ORG, id]);
assert.equal(await docPath(MIS15, r1.id), path1);
assert.equal(await docPath(SEG, r1.id), path1, "Segreteria reads");
assert.equal(await docPath(MIS16, r1.id), null);
assert.equal(await docPath(FAM, r1.id), null, "families never read referti");
assert.equal(await docPath(null, r1.id), null);
assert.equal((await area(MIS15, "ev-1")).documents.length, 1);
const rm = (uid, id) => one(uid, `select public.scd_staff_remove_match_document($1, $2)`, [ORG, id]);
assert.deepEqual(await rm(MIS16, r1.id), { ok: false, code: "forbidden" });
assert.deepEqual(await rm(MIS15, r1.id), { ok: true });
assert.equal(await docPath(MIS15, r1.id), null);
assert.equal((await area(MIS15, "ev-1")).documents.length, 0);
assert.equal((await db.query(`select count(*)::int as n from public.scd_match_documents`)).rows[0].n, 1, "row kept");
const r2 = await reg(MIS15, M1, { ...doc, path: `${ORG}/match/${M1}/1700000001-referto.pdf` });
assert.equal(r2.ok, true);

// 5. official LND score: office only; the app compares it with the tabellino
const off = (uid, m, f, a) => one(uid, `select public.scd_office_set_official_result($1, $2, $3, $4)`, [ORG, m, f, a]);
assert.deepEqual(await off(MIS15, M1, 2, 1), { ok: false, code: "forbidden" });
assert.deepEqual(await off(FAM, M1, 2, 1), { ok: false, code: "forbidden" });
assert.deepEqual(await off(SEG, M1, 2, null), { ok: false, code: "invalid" });
assert.deepEqual(await off(SEG, M1, 2, 1), { ok: true });
rep = (await area(MIS15, "ev-1")).report;
assert.equal(rep.official_goals_for, 2);
assert.equal(rep.official_goals_against, 1);
assert.equal(rep.summary, "Buona gara, chiamare [telefono] o scrivere a [email]", "office write keeps the mister's text");

// 6. status of many matches: team scope; families nothing
const status = (uid) => as(uid, `select * from public.scd_staff_match_status($1, $2::text[])`, [ORG, ["ev-1", "ev-2", "ev-3"]]);
const s15 = await status(MIS15);
assert.deepEqual(s15.map((r) => r.source_record_id).sort(), ["ev-1", "ev-3"]);
const sEv1 = s15.find((r) => r.source_record_id === "ev-1");
assert.equal(sEv1.has_referto, true);
assert.equal(sEv1.has_summary, true);
assert.equal(sEv1.has_opponent_sheet, true);
assert.equal(sEv1.tabellino, true);
assert.equal(sEv1.sheet_status, "NONE");
assert.equal((await status(SEG)).length, 3);
assert.equal((await status(FAM)).length, 0);
assert.equal((await status(null)).length, 0);

// 7. impediment with a reason category: family circle only, before kick-off, note stripped
const imp = (uid, c, code, note) => one(uid, `select public.scd_report_callup_impediment($1, $2, $3, $4)`, [ORG, c, code, note]);
assert.deepEqual(await imp(FAM2, C_FUTURE, "SCUOLA", null), { ok: false, code: "forbidden" }, "other family");
assert.deepEqual(await imp(MIS15, C_FUTURE, "SCUOLA", null), { ok: false, code: "forbidden" });
assert.deepEqual(await imp(FAM, C_FUTURE, "MALATTIA", null), { ok: false, code: "invalid" }, "no health category");
assert.deepEqual(await imp(FAM, C_FUTURE, "SCUOLA", "x".repeat(141)), { ok: false, code: "invalid" });
assert.deepEqual(await imp(FAM, C_PAST, "SCUOLA", null), { ok: false, code: "started" });
assert.deepEqual(await imp(FAM, C_FUTURE, "SCUOLA", "verifica, info 0341 123456"), { ok: true });
const cu = (await db.query(`select response_status, impediment_code, impediment_note from public.scd_match_callups where id = $1`, [C_FUTURE])).rows[0];
assert.deepEqual(cu, { response_status: "DECLINED", impediment_code: "SCUOLA", impediment_note: "verifica, info [telefono]" });
const a3 = await area(MIS15, "ev-3");
assert.equal(a3.impediments.length, 1);
assert.equal(a3.impediments[0].code, "SCUOLA");

// 8. storage helper and policies
const allowed = (uid, name) => one(uid, `select public.scd_storage_team_file_allowed($1)`, [name]);
assert.equal(await allowed(MIS15, `${ORG}/match/${M1}/a.pdf`), true);
assert.equal(await allowed(MIS16, `${ORG}/match/${M1}/a.pdf`), false);
assert.equal(await allowed(FAM, `${ORG}/match/${M1}/a.pdf`), false);
assert.equal(await allowed(null, `${ORG}/match/${M1}/a.pdf`), false);
assert.equal(await allowed(MIS15, `${ORG}/match/${M1}/../x.pdf`), false);
assert.equal(await allowed(MIS15, `${ORG}/comp/${M1}/a.pdf`), false);
assert.equal(await allowed(MIS15, `${ORG}/drill/${T15}/a.png`), true);
assert.equal(await allowed(MIS15, `${ORG}/drill/${T16}/a.png`), false);
const pol = (await db.query(`select policyname from pg_policies where schemaname = 'storage' and tablename = 'objects' order by 1`)).rows.map((r) => r.policyname);
assert.deepEqual(pol, ["scd_private_team_files_insert", "scd_private_team_files_select"]);
// a removed document is closed for everyone, staff and office included; the live one stays readable
const path2 = `${ORG}/match/${M1}/1700000001-referto.pdf`;
assert.equal(await allowed(MIS15, path1), false, "removed referto: mister denied");
assert.equal(await allowed(SEG, path1), false, "removed referto: Segreteria denied");
assert.equal(await allowed(MIS15, path2), true);
// the policy itself, evaluated as the authenticated role with RLS on
await db.query(`insert into storage.objects (bucket_id, name) values ('scd-private', $1), ('scd-private', $2)`, [path1, path2]);
const objs = async (uid) => {
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [uid ?? ""]);
  await db.query(`set role authenticated`);
  try { return (await db.query(`select name from storage.objects order by name`)).rows.map((r) => r.name); }
  finally { await db.query(`reset role`); }
};
assert.deepEqual(await objs(MIS15), [path2], "storage policy hides the removed file");
assert.deepEqual(await objs(MIS16), []);
assert.deepEqual(await objs(FAM), []);
// retention (r117 placeholder, r119 season rule): service only, deletes nothing
const ret = async () => (await db.query(`select document_id, storage_path from public.scd_team_docs_retention_candidates()`)).rows;
assert.deepEqual(await ret(), [], "removed today: not yet a candidate");
await db.query(`update public.scd_match_documents set removed_at = now() - interval '31 days' where id = $1`, [r1.id]);
assert.deepEqual(await ret(), [{ document_id: r1.id, storage_path: path1 }], "r117: 30 days");
await db.exec(R119);
await db.exec(R119); // idempotent
const end = async (t) => (await db.query(`select public.scd_team_docs_season_end($1::timestamptz)::text as d`, [t])).rows[0].d;
assert.equal(await end("2026-10-17T12:00:00+02:00"), "2027-06-30");
assert.equal(await end("2027-03-01T12:00:00+01:00"), "2027-06-30");
assert.equal(await end("2027-07-01T12:00:00+02:00"), "2028-06-30");
assert.deepEqual(await ret(), [], "r119: removed 31 days ago in this season, kept until 30 June");
await db.query(`update public.scd_match_documents set removed_at = now() - interval '2 years' where id = $1`, [r1.id]);
assert.deepEqual(await ret(), [{ document_id: r1.id, storage_path: path1 }], "r119: season ended, candidate");
assert.equal((await db.query(`select count(*)::int as n from public.scd_match_documents`)).rows[0].n, 2, "nothing deleted");
const rg = (await db.query(`select has_function_privilege('authenticated', 'public.scd_team_docs_retention_candidates()', 'execute') as auth,
  has_function_privilege('anon', 'public.scd_team_docs_retention_candidates()', 'execute') as anon,
  has_function_privilege('service_role', 'public.scd_team_docs_retention_candidates()', 'execute') as svc`)).rows[0];
assert.deepEqual(rg, { auth: false, anon: false, svc: true });

// ================================================================ r118
const save = (uid, p) => one(uid, `select public.scd_staff_training_save($1, $2::jsonb)`, [ORG, JSON.stringify(p)]);
const past = (await db.query(`select (now() - interval '1 day')::text as t`)).rows[0].t;
const soon = (await db.query(`select (now() + interval '2 days')::text as t`)).rows[0].t;

// 9. sessions: own team only, Google Meet link only
const sess = { teamCode: "u15", startsAt: past, duration: 90, field: "Campo 2", theme: "Possesso", coachNotes: "privato staff", sharedNote: "Portare la pettorina" };
assert.deepEqual(await save(MIS16, sess), { ok: false, code: "forbidden" });
assert.deepEqual(await save(FAM, sess), { ok: false, code: "forbidden" });
assert.deepEqual(await save(null, sess), { ok: false, code: "forbidden" });
assert.deepEqual(await save(MIS15, { ...sess, meetingUrl: "https://example.org/live" }), { ok: false, code: "invalid" });
assert.deepEqual(await save(MIS15, { ...sess, duration: 500 }), { ok: false, code: "invalid" });
assert.deepEqual(await save(MIS15, { ...sess, extra: 1 }), { ok: false, code: "invalid" });
const sPast = await save(MIS15, sess);
assert.equal(sPast.ok, true);
const sSoon = await save(MIS15, { ...sess, startsAt: soon, meetingUrl: "https://meet.google.com/abc-defg-hij", liveNote: "Video sul pressing alle 21" });
assert.equal(sSoon.ok, true);
assert.deepEqual(await save(MIS16, { id: sPast.id, startsAt: past }), { ok: false, code: "forbidden" }, "update needs the team scope");
const list = (uid, code) => one(uid, `select public.scd_staff_training_list($1, $2, current_date - 7, current_date + 7)`, [ORG, code]);
const l15 = await list(MIS15, "u15");
assert.equal(l15.ok, true);
assert.equal(l15.sessions.length, 2);
assert.equal(l15.sessions[0].coach_notes, "privato staff");
assert.deepEqual(await list(MIS16, "u15"), { ok: false, code: "forbidden" });
assert.deepEqual(await list(FAM, "u15"), { ok: false, code: "forbidden" });

// 10. attendance: from the session day on, team roster only
const rec = (uid, s, rows) => one(uid, `select public.scd_staff_training_record($1, $2, $3::jsonb)`, [ORG, s, JSON.stringify(rows)]);
assert.deepEqual(await rec(MIS15, sSoon.id, [{ athlete_id: ATH1, status: "PRESENTE" }]), { ok: false, code: "future" });
assert.deepEqual(await rec(MIS15, sPast.id, [{ athlete_id: ATH3, status: "PRESENTE" }]), { ok: false, code: "not_in_team" });
assert.deepEqual(await rec(MIS16, sPast.id, [{ athlete_id: ATH1, status: "PRESENTE" }]), { ok: false, code: "forbidden" });
assert.deepEqual(await rec(FAM, sPast.id, [{ athlete_id: ATH1, status: "PRESENTE" }]), { ok: false, code: "forbidden" });
assert.deepEqual(await rec(MIS15, sPast.id, [{ athlete_id: ATH1, status: "FORSE" }]), { ok: false, code: "invalid" });
assert.deepEqual(await rec(MIS15, sPast.id, [{ athlete_id: ATH1, status: "PRESENTE" }, { athlete_id: ATH2, status: "GIUSTIFICATO", reason: "scuola, tel 333 1234567" }]), { ok: true, rows: 2 });
const att = await one(MIS15, `select public.scd_staff_training_attendance($1, $2)`, [ORG, sPast.id]);
assert.equal(att.rows.length, 2);
assert.equal(att.rows.find((r) => r.athlete_id === ATH2).reason, "scuola, tel [telefono]");
assert.deepEqual(await one(MIS16, `select public.scd_staff_training_attendance($1, $2)`, [ORG, sPast.id]), { ok: false, code: "forbidden" });
assert.equal((await list(MIS15, "u15")).sessions.find((s) => s.id === sPast.id).status, "DONE");
const presentFlag = (await db.query(`select present from public.scd_training_attendance where athlete_id = $1 and training_session_id = $2`, [ATH2, sPast.id])).rows[0].present;
assert.equal(presentFlag, false, "r53 present column kept equal to status");

// 11. families: own child only, shared note and Meet link yes, coach notes never
const mine = (uid) => one(uid, `select public.scd_my_trainings($1, current_date - 7, current_date + 7)`, [ORG]);
const f1 = await mine(FAM);
assert.equal(f1.length, 1);
assert.equal(f1[0].person_id, KID1);
assert.equal(f1[0].sessions.length, 2);
assert.equal(JSON.stringify(f1).includes("privato staff"), false, "coach notes never reach families");
assert.equal(f1[0].sessions.find((s) => s.id === sSoon.id).meeting_url, "https://meet.google.com/abc-defg-hij");
assert.deepEqual(f1[0].season, { recorded: 1, present: 1, absent: 0, justified: 0 });
const f2 = await mine(FAM2);
assert.equal(f2.length, 1);
assert.equal(f2[0].person_id, KID2, "the other family sees only its own child");
assert.equal(JSON.stringify(f2).includes(KID1), false);
assert.deepEqual(await mine(null), []);
assert.deepEqual(await mine(BASE), []);

// 12. advance notice: before the session, own circle only
const notice = (uid, s, person, code, note = null) => one(uid, `select public.scd_my_training_notice($1, $2, $3, $4, $5)`, [ORG, s, person, code, note]);
assert.deepEqual(await notice(FAM, sSoon.id, KID2, "SCUOLA"), { ok: false, code: "forbidden" });
assert.deepEqual(await notice(FAM, sPast.id, KID1, "SCUOLA"), { ok: false, code: "started" });
assert.deepEqual(await notice(FAM, sSoon.id, KID1, "INFORTUNIO"), { ok: false, code: "invalid" });
assert.deepEqual(await notice(MIS15, sSoon.id, KID1, "SCUOLA"), { ok: false, code: "forbidden" });
assert.deepEqual(await notice(FAM, sSoon.id, KID1, "FAMIGLIA", "matrimonio"), { ok: true });
// the notice does not pre-record an absence: status stays null (authoritative), legacy present is not written
const nr = (await db.query(`select status, notice_code from public.scd_training_attendance where training_session_id = $1`, [sSoon.id])).rows;
assert.deepEqual(nr, [{ status: null, notice_code: "FAMIGLIA" }]);
assert.equal((await mine(FAM))[0].sessions.find((s) => s.id === sSoon.id).my_notice, "FAMIGLIA");
assert.equal((await list(MIS15, "u15")).sessions.find((s) => s.id === sSoon.id).notices, 1);
assert.deepEqual(await notice(FAM, sSoon.id, KID1, null), { ok: true });
assert.equal((await mine(FAM))[0].sessions.find((s) => s.id === sSoon.id).my_notice, null);

// 13. drills: team library, shared with the team as text, club library for every staff
const dsave = (uid, p) => one(uid, `select public.scd_staff_drill_save($1, $2::jsonb)`, [ORG, JSON.stringify(p)]);
const d1 = await dsave(MIS15, { teamCode: "u15", title: "Rondo 4 contro 2", description: "Due tocchi", audience: "SQUADRA" });
assert.equal(d1.ok, true);
const d2 = await dsave(MIS15, { teamCode: "u15", title: "Uscita dal basso", audience: "STAFF_SQUADRA", imagePath: `${ORG}/drill/${T15}/1-uscita.png` });
assert.equal(d2.ok, true);
const d3 = await dsave(MIS15, { teamCode: "u15", title: "Riscaldamento comune", audience: "STAFF_CLUB" });
assert.equal(d3.ok, true);
assert.deepEqual(await dsave(MIS15, { teamCode: "u15", title: "x", audience: "SQUADRA" }), { ok: false, code: "invalid" });
assert.deepEqual(await dsave(MIS15, { teamCode: "u15", title: "Immagine altrui", imagePath: `${ORG}/drill/${T16}/1.png` }), { ok: false, code: "path" });
assert.deepEqual(await dsave(MIS16, { teamCode: "u15", title: "Non mia" }), { ok: false, code: "forbidden" });
assert.deepEqual(await dsave(MIS16, { id: d1.id, title: "Cambio" }), { ok: false, code: "forbidden" }, "only the author or the office edits");
const dl16 = await one(MIS16, `select public.scd_staff_drills($1, 'u16')`, [ORG]);
assert.deepEqual(dl16.drills.map((d) => d.title), ["Riscaldamento comune"], "club library visible to every staff");
assert.deepEqual(await one(MIS16, `select public.scd_staff_drills($1, 'u15')`, [ORG]), { ok: false, code: "forbidden" });
assert.equal((await one(MIS15, `select public.scd_staff_drills($1, 'u15')`, [ORG])).drills.length, 3);
const fd = await one(FAM, `select public.scd_my_team_drills($1)`, [ORG]);
assert.deepEqual(fd.map((d) => d.title), ["Rondo 4 contro 2"], "families see only drills shared with the team");
assert.equal(await one(FAM, `select public.scd_staff_drill_image_path($1, $2)`, [ORG, d2.id]), null);
assert.equal(await one(MIS15, `select public.scd_staff_drill_image_path($1, $2)`, [ORG, d2.id]), `${ORG}/drill/${T15}/1-uscita.png`);
assert.deepEqual(await one(MIS16, `select public.scd_staff_drill_archive($1, $2)`, [ORG, d1.id]), { ok: false, code: "forbidden" });
assert.deepEqual(await one(MIS15, `select public.scd_staff_drill_archive($1, $2)`, [ORG, d1.id]), { ok: true });
assert.deepEqual(await one(FAM, `select public.scd_my_team_drills($1)`, [ORG]), []);

// 14. monthly check: office reads the month, creates requests once, staff answer for their team only
const month = (await db.query(`select date_trunc('month', (now() - interval '1 day') at time zone 'Europe/Rome')::date::text as m`)).rows[0].m;
const tm = await one(SEG, `select public.scd_office_training_month($1, $2::date)`, [ORG, month]);
assert.equal(tm.ok, true);
assert.equal(tm.sessions.some((s) => s.id === sPast.id && s.recorded === 2), true);
assert.deepEqual(await one(MIS15, `select public.scd_office_training_month($1, $2::date)`, [ORG, month]), { ok: false, code: "forbidden" });
const items = [
  { teamCode: "u15", kind: "DISTINTA", ref: "ev-1", label: "U15 contro Avversario A: distinta" },
  { teamCode: "u16", kind: "REFERTO", ref: "ev-2", label: "U16 contro Avversario B: referto" },
];
const create = (uid, m, it) => one(uid, `select public.scd_office_create_gap_requests($1, $2::date, $3::jsonb)`, [ORG, m, JSON.stringify(it)]);
assert.deepEqual(await create(MIS15, month, items), { ok: false, code: "forbidden" });
assert.deepEqual(await create(SEG, month, [{ ...items[0], teamCode: "nessuna" }]), { ok: false, code: "invalid" });
assert.deepEqual(await create(SEG, month, [{ ...items[0], kind: "ALTRO" }]), { ok: false, code: "invalid" });
const future = (await db.query(`select (date_trunc('month', now() at time zone 'Europe/Rome') + interval '1 month')::date::text as m`)).rows[0].m;
assert.deepEqual(await create(SEG, future, items), { ok: false, code: "invalid" }, "no requests for months not started");
assert.deepEqual(await create(SEG, month, items), { ok: true, created: 2 });
assert.deepEqual(await create(SEG, month, items), { ok: true, created: 0 }, "idempotent");
const ob = (await db.query(`select kind, recipient_email, digest, subject from public.scd_notification_outbox order by subject`)).rows;
assert.equal(ob.length, 2, "one outbox row per team");
assert.equal(ob.every((r) => r.kind === "INTEGRATION_REQUEST" && r.recipient_email === null && r.digest === true), true);
const g15 = await one(MIS15, `select public.scd_staff_gap_requests($1)`, [ORG]);
assert.deepEqual(g15.map((g) => g.team_code), ["u15"]);
assert.deepEqual(await one(FAM, `select public.scd_staff_gap_requests($1)`, [ORG]), []);
const ans = (uid, id, st, note) => one(uid, `select public.scd_staff_answer_gap_request($1, $2, $3, $4)`, [ORG, id, st, note]);
assert.deepEqual(await ans(MIS15, g15[0].id, "JUSTIFIED", ""), { ok: false, code: "invalid" }, "a justification needs a reason");
assert.deepEqual(await ans(MIS16, g15[0].id, "INTEGRATED", null), { ok: false, code: "forbidden" });
assert.deepEqual(await ans(FAM, g15[0].id, "INTEGRATED", null), { ok: false, code: "forbidden" });
assert.deepEqual(await ans(MIS15, g15[0].id, "CLOSED", null), { ok: false, code: "forbidden" }, "only the office closes");
assert.deepEqual(await ans(MIS15, g15[0].id, "JUSTIFIED", "Distinta cartacea consegnata all'arbitro"), { ok: true });
assert.deepEqual(await ans(MIS15, g15[0].id, "INTEGRATED", null), { ok: false, code: "closed" }, "an answered request is not rewritten by staff");
assert.deepEqual(await ans(SEG, g15[0].id, "CLOSED", null), { ok: true });
assert.deepEqual(await ans(MIS15, g15[0].id, "JUSTIFIED", "riscrivo dopo la chiusura"), { ok: false, code: "closed" }, "a closed request is not rewritten by staff");
const og = await one(SEG, `select public.scd_office_gap_requests($1, $2::date)`, [ORG, month]);
assert.deepEqual(og.map((g) => [g.team_code, g.status]), [["u15", "CLOSED"], ["u16", "OPEN"]]);
assert.equal(await one(MIS15, `select public.scd_office_gap_requests($1, $2::date)`, [ORG, month]), null);

// 15. the widened outbox constraint keeps every r104 kind and still refuses unknown ones
await db.query(`insert into public.scd_notification_outbox (organization_id, kind, subject, body) values ($1, 'ROLE_DECLARED', 'Prova', 'x')`, [ORG]);
await assert.rejects(db.query(`insert into public.scd_notification_outbox (organization_id, kind, subject, body) values ($1, 'ALTRO', 'Prova', 'x')`, [ORG]));

// 16. anon executes nothing new; authenticated executes the client functions; helpers closed to clients
const fns = [
  "scd_staff_match_area(uuid, text)", "scd_staff_save_match_notes(uuid, uuid, jsonb)", "scd_staff_register_match_document(uuid, uuid, jsonb)",
  "scd_staff_match_document_path(uuid, uuid)", "scd_staff_remove_match_document(uuid, uuid)", "scd_office_set_official_result(uuid, uuid, integer, integer)",
  "scd_staff_match_status(uuid, text[])", "scd_report_callup_impediment(uuid, uuid, text, text)", "scd_storage_team_file_allowed(text)",
  "scd_staff_training_list(uuid, text, date, date)", "scd_staff_training_save(uuid, jsonb)", "scd_staff_training_attendance(uuid, uuid)",
  "scd_staff_training_record(uuid, uuid, jsonb)", "scd_staff_drills(uuid, text)", "scd_staff_drill_save(uuid, jsonb)", "scd_staff_drill_archive(uuid, uuid)",
  "scd_staff_drill_image_path(uuid, uuid)", "scd_my_trainings(uuid, date, date)", "scd_my_training_notice(uuid, uuid, uuid, text, text)",
  "scd_my_team_drills(uuid)", "scd_office_training_month(uuid, date)", "scd_office_create_gap_requests(uuid, date, jsonb)",
  "scd_office_gap_requests(uuid, date)", "scd_staff_gap_requests(uuid)", "scd_staff_answer_gap_request(uuid, uuid, text, text)",
];
for (const f of fns) {
  const g = (await db.query(`select has_function_privilege('anon', 'public.${f}', 'execute') as anon, has_function_privilege('authenticated', 'public.${f}', 'execute') as auth`)).rows[0];
  assert.deepEqual(g, { anon: false, auth: true }, f);
}
for (const f of ["scd_team_text_clean(text, integer)", "scd_team_area_scope(uuid, uuid)", "scd_team_scope_by_id(uuid, uuid)"]) {
  const g = (await db.query(`select has_function_privilege('authenticated', 'public.${f}', 'execute') as auth, has_function_privilege('anon', 'public.${f}', 'execute') as anon`)).rows[0];
  assert.deepEqual(g, { auth: false, anon: false }, f);
}
// every new SECURITY DEFINER function has a fixed search_path
const loose = (await db.query(`select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prosecdef and (p.proconfig is null or not exists (select 1 from unnest(p.proconfig) c where c like 'search_path=%'))`)).rows;
assert.deepEqual(loose, []);

console.log("r117 area partite + r118 area allenamenti: all assertions passed");
