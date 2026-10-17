// r115 Club House, Convenzioni and club cards register — behaviour test on an in-memory Postgres (PGlite), no remote
// database touched. Run from the repository root (PGlite is not a dependency of the app):
//   npm install --prefix /tmp/scd-pglite @electric-sql/pglite@0.5.10
//   PGLITE_DIR=/tmp/scd-pglite node supabase/tests/r115_club_catalog.pglite.mjs
// Exit code 0 = every assertion passed. The r35/r74 objects it needs are created in their minimal shape. Every id,
// organisation and entry below is invented.
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
const R115 = readFileSync(fileURLToPath(new URL("../migrations/20261017_r115_club_catalog.sql", import.meta.url)), "utf8");

const ORG = "00000000-0000-0000-0000-000000000001";
const ORG2 = "00000000-0000-0000-0000-000000000002";
const U = (n) => `10000000-0000-0000-0000-0000000000${String(n).padStart(2, "0")}`;
// 1 Direzione, 2 responsabile Club House, 3 Segreteria (role), 4 family, 5 presidente (position), 6 Direzione of ORG2
const DIR = U(1), CH = U(2), SEG = U(3), FAM = U(4), PRES = U(5), DIR2 = U(6);

const base = `
create role anon; create role authenticated; create role service_role;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create type public.scd_role as enum ('USER_BASE','FAMILY','ATHLETE','MISTER','STAFF','MANAGER','SECRETARIAT','REGISTRATION','TOURNAMENTS','DIRECTION');
create table public.scd_organizations (id uuid primary key, slug text unique, name text);
create table public.scd_memberships (organization_id uuid, user_id uuid, role public.scd_role, scope jsonb default '{}'::jsonb, active boolean default true);
create function public.scd_has_org_role(p_organization_id uuid, p_roles public.scd_role[]) returns boolean language sql stable security invoker set search_path = public as $$
  select exists (select 1 from public.scd_memberships m where m.organization_id = p_organization_id and m.user_id = auth.uid() and m.active and m.role = any(p_roles)) $$;
create function public.scd_has_position(p_organization_id uuid, p_positions text[]) returns boolean language sql stable set search_path to 'public' as $$
  select exists (select 1 from public.scd_memberships m where m.organization_id = p_organization_id and m.user_id = (select auth.uid()) and m.active
    and jsonb_typeof(m.scope -> 'positions') = 'array'
    and exists (select 1 from jsonb_array_elements_text(m.scope -> 'positions') p where p = any(p_positions))) $$;
insert into public.scd_organizations values ('${ORG}', 'club-prova', 'Club di prova'), ('${ORG2}', 'altro-club', 'Altro club');
insert into public.scd_memberships (organization_id, user_id, role, scope) values
  ('${ORG}', '${DIR}', 'DIRECTION', '{}'),
  ('${ORG}', '${CH}', 'STAFF', '{"positions":["responsabile-club-house"]}'),
  ('${ORG}', '${SEG}', 'SECRETARIAT', '{}'),
  ('${ORG}', '${FAM}', 'FAMILY', '{}'),
  ('${ORG}', '${PRES}', 'STAFF', '{"positions":["presidente"]}'),
  ('${ORG2}', '${DIR2}', 'DIRECTION', '{}');
`;

// prerequisites guard
{
  const bare = new PGlite();
  await bare.exec(`create type public.scd_role as enum ('DIRECTION'); create table public.scd_organizations (id uuid primary key, slug text);`);
  await assert.rejects(bare.exec(R115), /r115 prerequisites missing/);
}

const db = new PGlite();
await db.exec(base);
await db.exec(R115);
await db.exec(R115); // idempotent

const as = async (uid, sql, params = []) => {
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [uid ?? ""]);
  return (await db.query(sql, params)).rows;
};
const one = async (uid, sql, params = []) => Object.values((await as(uid, sql, params))[0])[0];
const save = (uid, id, entry, org = ORG) => one(uid, `select public.scd_club_catalog_save($1, $2, $3::jsonb)`, [org, id, JSON.stringify(entry)]);
const denied = (p) => assert.rejects(p, (e) => e.code === "42501" || /not allowed/.test(String(e.message)));

// --- access per person
assert.deepEqual(await one(DIR, `select public.scd_club_catalog_access($1)`, [ORG]), { platforms: ["CLUB_HOUSE", "CONVENZIONI", "TESSERE"] });
assert.deepEqual(await one(PRES, `select public.scd_club_catalog_access($1)`, [ORG]), { platforms: ["CLUB_HOUSE", "CONVENZIONI", "TESSERE"] });
assert.deepEqual(await one(CH, `select public.scd_club_catalog_access($1)`, [ORG]), { platforms: ["CLUB_HOUSE"] });
assert.deepEqual(await one(SEG, `select public.scd_club_catalog_access($1)`, [ORG]), { platforms: ["TESSERE"] });
assert.deepEqual(await one(FAM, `select public.scd_club_catalog_access($1)`, [ORG]), { platforms: [] });
assert.deepEqual(await one(null, `select public.scd_club_catalog_access($1)`, [ORG]), { platforms: [] });
assert.deepEqual(await one(DIR2, `select public.scd_club_catalog_access($1)`, [ORG]), { platforms: [] }, "other club's Direzione writes nothing here");

// --- Club House: the responsible enters hours, a price list item without price, a group menu
const hours = await save(CH, null, { platform: "CLUB_HOUSE", kind: "ORARIO", site: "COLICO", title: "Apertura serale", days: "Lunedì–venerdì", opens: "17:00", closes: "21:00", status: "PUBBLICATA" });
assert.equal(hours.ok, true);
const coffee = await save(CH, null, { platform: "CLUB_HOUSE", kind: "LISTINO", category: "BAR", title: "Caffè", priceCents: null, status: "PUBBLICATA" });
assert.equal(coffee.ok, true);
const menu = await save(CH, null, { platform: "CLUB_HOUSE", kind: "MENU_GRUPPI", title: "Menu squadra", body: "Pasta, secondo, acqua.", priceCents: 1200, status: "BOZZA" });
assert.equal(menu.ok, true);
// validation codes
assert.deepEqual(await save(CH, null, { platform: "CLUB_HOUSE", kind: "ORARIO", title: "Senza sede", days: "Sabato", opens: "10:00", closes: "12:00" }), { ok: false, code: "site" });
assert.deepEqual(await save(CH, null, { platform: "CLUB_HOUSE", kind: "ORARIO", site: "DERVIO", title: "Ore", days: "Sabato", opens: "10:00", closes: "10:00" }), { ok: false, code: "time" });
assert.deepEqual(await save(CH, null, { platform: "CLUB_HOUSE", kind: "LISTINO", category: "VINI", title: "Rosso" }), { ok: false, code: "category" });
assert.deepEqual(await save(CH, null, { platform: "CLUB_HOUSE", kind: "LISTINO", category: "BAR", title: "Panino", priceCents: 2.5 }), { ok: false, code: "price" });
assert.deepEqual(await save(CH, null, { platform: "CLUB_HOUSE", kind: "LISTINO", category: "BAR", title: "Panino", priceCents: -1 }), { ok: false, code: "price" });
assert.deepEqual(await save(CH, null, { platform: "CLUB_HOUSE", kind: "MENU_GRUPPI", title: "Chiama 333 123 4567", body: "x" }), { ok: false, code: "contact" });
assert.deepEqual(await save(CH, null, { platform: "CLUB_HOUSE", kind: "MENU_GRUPPI", title: "Menu", body: "scrivi a chef@example.com" }), { ok: false, code: "contact" });
assert.deepEqual(await save(CH, null, { platform: "CLUB_HOUSE", kind: "CONVENZIONE", title: "x", body: "y" }), { ok: false, code: "kind" });
// the responsible cannot touch the other platforms
await denied(save(CH, null, { platform: "CONVENZIONI", kind: "CONVENZIONE", category: "NEGOZI", title: "Negozio", body: "10%" }));
await denied(save(CH, null, { platform: "TESSERE", kind: "CARD_REGOLA", title: "Regola", body: "Testo" }));
await denied(save(FAM, null, { platform: "CLUB_HOUSE", kind: "LISTINO", category: "BAR", title: "Caffè" }));
await denied(save(null, null, { platform: "CLUB_HOUSE", kind: "LISTINO", category: "BAR", title: "Caffè" }));
await denied(save(DIR2, null, { platform: "CLUB_HOUSE", kind: "LISTINO", category: "BAR", title: "Caffè" }));

// --- Convenzioni: only the Direzione
const conv = await save(DIR, null, {
  platform: "CONVENZIONI", kind: "CONVENZIONE", category: "NEGOZI", title: "Negozio di prova", body: "Sconto sugli articoli sportivi",
  howTo: "Mostra la card in cassa", cards: ["sostenitore", "tesserato", "tesserato"], linkUrl: "https://example.com/negozio",
  validFrom: "2026-01-01", validUntil: "2099-12-31", status: "PUBBLICATA",
});
assert.equal(conv.ok, true);
assert.deepEqual(await save(DIR, null, { platform: "CONVENZIONI", kind: "CONVENZIONE", category: "NEGOZI", title: "X", body: "Y" }), { ok: false, code: "title" });
assert.deepEqual(await save(DIR, null, { platform: "CONVENZIONI", kind: "CONVENZIONE", category: "NEGOZI", title: "Negozio", body: "Y", cards: ["oro"] }), { ok: false, code: "cards" });
assert.deepEqual(await save(DIR, null, { platform: "CONVENZIONI", kind: "CONVENZIONE", category: "NEGOZI", title: "Negozio", body: "Y", linkUrl: "http://x.it" }), { ok: false, code: "link" });
assert.deepEqual(await save(DIR, null, { platform: "CONVENZIONI", kind: "CONVENZIONE", category: "NEGOZI", title: "Negozio", body: "Y", validFrom: "2026-05-01", validUntil: "2026-04-01" }), { ok: false, code: "date" });
assert.deepEqual(await save(DIR, null, { platform: "CONVENZIONI", kind: "CONVENZIONE", category: "NEGOZI", title: "Negozio", body: "Y", validFrom: "2026-02-31" }), { ok: false, code: "date" });
const expired = await save(DIR, null, { platform: "CONVENZIONI", kind: "CONVENZIONE", category: "ALTRO", title: "Scaduta", body: "Vecchia offerta", validUntil: "2020-01-01", status: "PUBBLICATA" });
assert.equal(expired.ok, true);
await denied(save(SEG, null, { platform: "CONVENZIONI", kind: "CONVENZIONE", category: "NEGOZI", title: "Negozio", body: "Y" }));

// --- Tessere: Segreteria writes; benefit needs a card
const benefit = await save(SEG, null, { platform: "TESSERE", kind: "CARD_VANTAGGIO", title: "Sconto al bar", cards: ["partner"], status: "PUBBLICATA" });
assert.equal(benefit.ok, true);
assert.deepEqual(await save(SEG, null, { platform: "TESSERE", kind: "CARD_VANTAGGIO", title: "Senza card" }), { ok: false, code: "cards" });
assert.deepEqual(await save(SEG, null, { platform: "TESSERE", kind: "CARD_TIPO", title: "Tessera socio" }), { ok: false, code: "body" });
const tipo = await save(PRES, null, { platform: "TESSERE", kind: "CARD_TIPO", title: "Tessera socio", body: "Soci dell'associazione", status: "BOZZA" });
assert.equal(tipo.ok, true);

// --- list: writers only, own platform only
const chList = await one(CH, `select public.scd_club_catalog_list($1, 'CLUB_HOUSE')`, [ORG]);
assert.equal(chList.length, 3);
assert.ok(chList.every((r) => !("created_by" in r) && !("createdBy" in r) && !("updatedBy" in r)));
const h = chList.find((r) => r.kind === "ORARIO");
assert.equal(h.opens, "17:00");
assert.equal(h.closes, "21:00");
assert.equal(chList.find((r) => r.kind === "LISTINO").priceCents, null);
await denied(one(CH, `select public.scd_club_catalog_list($1, 'TESSERE')`, [ORG]));
await denied(one(FAM, `select public.scd_club_catalog_list($1, 'CLUB_HOUSE')`, [ORG]));
await denied(one(DIR, `select public.scd_club_catalog_list($1, 'ALTRO')`, [ORG]));
const convList = await one(DIR, `select public.scd_club_catalog_list($1, 'CONVENZIONI')`, [ORG]);
assert.deepEqual(convList.find((r) => r.title === "Negozio di prova").cards, ["sostenitore", "tesserato"]);

// --- update: unchanged, real change with audit, platform never changes, other org cannot edit
const coffeeEntry = { platform: "CLUB_HOUSE", kind: "LISTINO", category: "BAR", title: "Caffè", priceCents: null, status: "PUBBLICATA" };
assert.deepEqual(await save(CH, coffee.id, coffeeEntry), { ok: true, id: coffee.id, unchanged: true });
assert.deepEqual(await save(CH, coffee.id, { ...coffeeEntry, priceCents: 120 }), { ok: true, id: coffee.id });
assert.deepEqual(await save(CH, coffee.id, { ...coffeeEntry, platform: "TESSERE", kind: "CARD_REGOLA", body: "x" }), { ok: false, code: "kind" });
await denied(save(SEG, coffee.id, { ...coffeeEntry, platform: "TESSERE" }));
assert.deepEqual(await save(DIR2, coffee.id, coffeeEntry, ORG2), { ok: false, code: "not_found" }, "a row of another club is not found");
assert.deepEqual(await save(CH, "30000000-0000-0000-0000-000000000099", coffeeEntry), { ok: false, code: "not_found" });

// audit: 1 CREATE per row + 1 UPDATE (unchanged writes nothing), append-only, not readable from the app
await db.query(`select set_config('request.jwt.claim.sub', '', false)`);
const ev = (await db.query(`select action, before, after from public.scd_club_catalog_events where entry_id = $1 order by id`, [coffee.id])).rows;
assert.deepEqual(ev.map((e) => e.action), ["CREATE", "UPDATE"]);
assert.equal(ev[1].before.priceCents, null);
assert.equal(ev[1].after.priceCents, 120);
await assert.rejects(db.query(`delete from public.scd_club_catalog_events`), /append-only/);
await assert.rejects(db.query(`update public.scd_club_catalog_events set action = 'CREATE'`), /append-only/);
const grants = (await db.query(`select grantee, privilege_type from information_schema.role_table_grants
  where table_name in ('scd_club_catalog','scd_club_catalog_events') and grantee in ('anon','authenticated')`)).rows;
assert.deepEqual(grants, []);

// --- public: only published and inside validity; no status, no author; other org nothing
const pub = await one(null, `select public.scd_public_club_catalog('club-prova')`);
const titles = pub.map((r) => r.title).sort();
assert.deepEqual(titles, ["Apertura serale", "Caffè", "Negozio di prova", "Sconto al bar"]);
assert.ok(pub.every((r) => !("status" in r) && !("createdBy" in r)));
assert.deepEqual(await one(null, `select public.scd_public_club_catalog('altro-club')`), []);
assert.deepEqual(await one(null, `select public.scd_public_club_catalog('inesistente')`), []);
// archiving takes a row off the public read, never deletes it
assert.equal((await save(CH, hours.id, { platform: "CLUB_HOUSE", kind: "ORARIO", site: "COLICO", title: "Apertura serale", days: "Lunedì–venerdì", opens: "17:00", closes: "21:00", status: "ARCHIVIATA" })).ok, true);
assert.ok(!(await one(null, `select public.scd_public_club_catalog('club-prova')`)).some((r) => r.title === "Apertura serale"));
assert.equal((await db.query(`select count(*)::int as n from public.scd_club_catalog`)).rows[0].n, 7);

// --- function privileges: internal helpers not executable by app roles
const execs = (await db.query(`select p.proname, has_function_privilege('anon', p.oid, 'execute') as anon,
  has_function_privilege('authenticated', p.oid, 'execute') as auth
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname like 'scd_%club_catalog%'`)).rows;
const priv = Object.fromEntries(execs.map((r) => [r.proname, [r.anon, r.auth]]));
assert.deepEqual(priv.scd_club_catalog_writer, [false, false]);
assert.deepEqual(priv.scd_club_catalog_clean, [false, false]);
assert.deepEqual(priv.scd_club_catalog_json, [false, false]);
assert.deepEqual(priv.scd_club_catalog_access, [false, true]);
assert.deepEqual(priv.scd_club_catalog_list, [false, true]);
assert.deepEqual(priv.scd_club_catalog_save, [false, true]);
assert.deepEqual(priv.scd_public_club_catalog, [true, true]);

console.log("r115 club catalog: all assertions passed");
