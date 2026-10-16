import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { workAreaView, type WorkAreaGate } from "./access";
import {
  BASE_PAGES,
  BASE_WORK_AREAS,
  GRANT_NAV_AREAS,
  NO_IDENTITY,
  OWN_GATE_AREAS,
  PERIMETER_SCOPED_PAGES,
  accessNavFor,
  autoEntries,
  basePagesFor,
  grantAreasFor,
  grantOpens,
  hasSomething,
  identityFromFamily,
  mergeNav,
  probesFromRows,
  resolveWorkAreaGate,
  sectionForArea,
  withContent,
  type IdentityFacts,
  type ResolverFacts,
} from "./access-resolver";
import { ALL_ONLY_SITE, gateWithGrants, grantAllAt, navFor, probesFor, readIdentity, type ResolverClient } from "./access-resolver.server";
import { ACCESS_MENU, WORK_AREA_IDS, menuFor } from "./areas";
import { SECTIONS, findSection, type Level, type Perimeter } from "./person-grants";
import { cacheControlFor } from "./http-policy";

const src = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");
const CLOSED: WorkAreaGate = { view: "access", preview: false };
const VERIFIED: IdentityFacts = { verified: true, childCount: 0, childTeamCodes: [], selfTeamCodes: [] };

type Row = { section_code: string; level: Level; perimeter: Perimeter };
const facts = (rows: Row[], identity: IdentityFacts = VERIFIED): ResolverFacts => ({ signedIn: true, identity, probes: probesFromRows(rows) });

/**
 * Example role templates (example data only: the real ones are created by the Presidente / DG in /direzione/ruoli and
 * loaded on each person with that person's teams or site). The six roles named by Francesco 16/10/2026 23:12.
 */
const ROLES: Record<string, Row[]> = {
  Mister: [
    { section_code: "mister", level: "WRITE", perimeter: "OWN_TEAMS" },
    { section_code: "quadro", level: "READ", perimeter: "OWN_TEAMS" },
    { section_code: "certificati", level: "READ", perimeter: "OWN_TEAMS" },
    { section_code: "pulmini", level: "READ", perimeter: "OWN_TEAMS" },
  ],
  "Dirigente di squadra": [
    { section_code: "mister", level: "READ", perimeter: "OWN_TEAMS" },
    { section_code: "pulmini", level: "READ", perimeter: "OWN_TEAMS" },
  ],
  Responsabile: [
    { section_code: "mister", level: "APPROVE", perimeter: "OWN_TEAMS" },
    { section_code: "quadro", level: "READ", perimeter: "OWN_TEAMS" },
    { section_code: "impianti-campi", level: "READ", perimeter: "ALL" },
    { section_code: "organigramma", level: "READ", perimeter: "ALL" },
  ],
  "Direttore sportivo": [
    { section_code: "mister", level: "APPROVE", perimeter: "ALL" },
    { section_code: "quadro", level: "WRITE", perimeter: "ALL" },
    { section_code: "impianti-campi", level: "APPROVE", perimeter: "ALL" },
    { section_code: "organigramma", level: "READ", perimeter: "ALL" },
    { section_code: "certificati", level: "READ", perimeter: "OWN_TEAMS" },
  ],
  Socio: [],
  Consigliere: [
    { section_code: "organigramma", level: "READ", perimeter: "ALL" },
    { section_code: "direzione", level: "READ", perimeter: "ALL" },
    { section_code: "tesoreria", level: "READ", perimeter: "ALL" },
  ],
};

describe("access resolver: one catalogue, no second registry", () => {
  it("base pages are backed by base sections of config/scd-sections.v1.json", () => {
    for (const p of BASE_PAGES) expect(findSection(p.section)?.base, p.id).toBe(true);
    // Statistics and games have no page yet: never shown (no empty pages).
    expect(basePagesFor(true).map((p) => p.id)).toEqual(["quadro", "la-mia-scd", "crea-avatar", "fantacalcio", "top11", "tessera"]);
    expect(basePagesFor(false)).toEqual([]);
  });

  it("every grant-nav area maps to exactly one catalogue section with the same area id", () => {
    for (const id of GRANT_NAV_AREAS) {
      const code = sectionForArea(id)!;
      expect(SECTIONS.filter((s) => s.area === id).length, id).toBe(1);
      expect(findSection(code)?.area, id).toBe(id);
      expect([...WORK_AREA_IDS, ...OWN_GATE_AREAS], id).toContain(id);
    }
    expect(sectionForArea("gestionale")).toBeNull();
    expect(sectionForArea("nutrizionista")).toBe("nutrizione");
    for (const s of PERIMETER_SCOPED_PAGES) expect(findSection(s), s).toBeDefined();
  });
});

describe("a) base and b) automatic layers", () => {
  it("a tifoso (signed in, no verified identity) gets the base pages only", () => {
    const nav = accessNavFor({ signedIn: true, identity: NO_IDENTITY, probes: null });
    expect(nav).toEqual({ grantAreas: [], auto: [] });
    expect(identityFromFamily(null)).toEqual(NO_IDENTITY);
    expect(identityFromFamily([])).toEqual(NO_IDENTITY);
    // Family rows without the SELF row are not a verified identity.
    expect(identityFromFamily([{ relationship: "FIGLIO", teamCodes: ["U12"] }]).verified).toBe(false);
  });

  it("a parent sees the family area and the children's teams automatically, nothing of other families", () => {
    const id = identityFromFamily([
      { relationship: "SELF", teamCodes: [] },
      { relationship: "FIGLIO", teamCodes: ["U12"] },
      { relationship: "FIGLIA", teamCodes: ["U10", "U12"] },
    ]);
    expect(id).toEqual({ verified: true, childCount: 2, childTeamCodes: ["U10", "U12"], selfTeamCodes: [] });
    expect(autoEntries(id).map((e) => [e.id, e.items])).toEqual([
      ["famiglia", 2],
      ["squadre", 2],
    ]);
    // Only counts and team codes leave the server: no names, no person ids.
    for (const e of autoEntries(id)) expect(Object.keys(e).sort()).toEqual(["blurb", "icon", "id", "items", "label"]);
  });

  it("an athlete sees their own team; no children means no family entry", () => {
    const id = identityFromFamily([{ relationship: "SELF", teamCodes: ["U17"] }]);
    expect(autoEntries(id)).toEqual([expect.objectContaining({ id: "squadre", label: "La mia squadra", items: 1 })]);
  });

  it("hides entries known to be empty with no create action, keeps unknown ones", () => {
    expect(hasSomething(undefined)).toBe(true);
    expect(hasSomething({ items: null, canCreate: false })).toBe(true);
    expect(hasSomething({ items: 0, canCreate: false })).toBe(false);
    expect(hasSomething({ items: 0, canCreate: true })).toBe(true);
    expect(withContent([{ id: "a" }, { id: "b" }], (id) => (id === "a" ? { items: 0, canCreate: false } : undefined))).toEqual([{ id: "b" }]);
    const groups = mergeNav([], { grantAreas: [], auto: [{ id: "famiglia", label: "x", blurb: "y", icon: "home", items: 0 }] });
    expect(groups).toEqual([]);
  });
});

describe("c) grants: the six roles through example templates", () => {
  const open = (rows: Row[]) => grantAreasFor(facts(rows)).sort();

  it("Mister: mister (own teams); quadro is base for everyone; certificati and pulmini stay closed until their data filter by team", () => {
    expect(open(ROLES["Mister"]!)).toEqual(["mister"]);
  });
  it("Dirigente di squadra: mister (read, own teams) only", () => {
    expect(open(ROLES["Dirigente di squadra"]!)).toEqual(["mister"]);
  });
  it("Responsabile: mister, impianti e campi, organigramma (quadro already base)", () => {
    expect(open(ROLES["Responsabile"]!)).toEqual(["impianti-campi", "mister", "organigramma"]);
  });
  it("Direttore sportivo: everything granted with perimeter ALL plus the team-scoped pages", () => {
    expect(open(ROLES["Direttore sportivo"]!)).toEqual(["impianti-campi", "mister", "organigramma"]);
  });
  it("Socio: nothing beyond the base", () => {
    expect(open(ROLES["Socio"]!)).toEqual([]);
  });
  it("Consigliere: organigramma and tesoreria (read, ALL); /direzione keeps its own Direzione rule", () => {
    expect(open(ROLES["Consigliere"]!)).toEqual(["organigramma", "tesoreria"]);
    expect(GRANT_NAV_AREAS).not.toContain("direzione");
  });

  it("never opens hard-blocked, Direzione-only or base sections, nor above the granted level", () => {
    const p = { level: "APPROVE" as Level, allLevel: "APPROVE" as Level };
    expect(grantOpens("safeguarding", "READ", p)).toBe(false);
    expect(grantOpens("salute-minori", "READ", p)).toBe(false);
    expect(grantOpens("posta-collega", "READ", p)).toBe(false);
    expect(grantOpens("profilo", "READ", p)).toBe(false);
    expect(grantOpens("unknown", "READ", p)).toBe(false);
    expect(grantOpens("crm", "APPROVE", { level: "WRITE", allLevel: "WRITE" })).toBe(false);
    expect(grantOpens("crm", "READ", { level: "WRITE", allLevel: "WRITE" })).toBe(true);
    // Sensitive section with a narrow perimeter: closed (persone, certificati, quote…).
    expect(grantOpens("persone", "READ", { level: "APPROVE", allLevel: null })).toBe(false);
    // Narrow perimeter never opens a write / approve action.
    expect(grantOpens("mister", "WRITE", { level: "APPROVE", allLevel: null })).toBe(false);
    expect(grantOpens("mister", "READ", null)).toBe(false);
  });

  it("probesFromRows keeps the highest level and the ALL level apart and ignores junk", () => {
    const p = probesFromRows([
      { section_code: "mister", level: "READ", perimeter: "ALL" },
      { section_code: "mister", level: "APPROVE", perimeter: "OWN_TEAMS" },
      { section_code: "crm", level: "BOSS", perimeter: "ALL" },
      { section_code: 3, level: "READ", perimeter: "ALL" },
    ]);
    expect(p.get("mister")).toEqual({ level: "APPROVE", allLevel: "READ" });
    expect(p.has("crm")).toBe(false);
  });
});

describe("the gate: old rule OR grant, never narrower, fail-closed", () => {
  it("never closes what the old rule opens (Direzione, positions)", () => {
    for (const id of WORK_AREA_IDS) {
      const old = workAreaView(id, { preview: false, sessionRoles: new Set(["direzione"]) });
      expect(resolveWorkAreaGate(id, old, { signedIn: true, identity: NO_IDENTITY, probes: null }), id).toEqual(old);
    }
  });

  it("without verified identity or grants engine, nothing changes", () => {
    for (const id of WORK_AREA_IDS) {
      expect(resolveWorkAreaGate(id, CLOSED, { signedIn: false, identity: NO_IDENTITY, probes: probesFromRows(ROLES["Direttore sportivo"]!) }), id).toEqual(CLOSED);
      if (BASE_WORK_AREAS.includes(id)) continue;
      expect(resolveWorkAreaGate(id, CLOSED, { signedIn: true, identity: NO_IDENTITY, probes: probesFromRows(ROLES["Direttore sportivo"]!) }), id).toEqual(CLOSED);
      expect(resolveWorkAreaGate(id, CLOSED, { signedIn: true, identity: VERIFIED, probes: null }), id).toEqual(CLOSED);
    }
  });

  it("base: every signed-in account opens the weekly quadro (member-level data), nobody signed out does", () => {
    expect(BASE_WORK_AREAS).toEqual(["quadro"]);
    expect(resolveWorkAreaGate("quadro", CLOSED, { signedIn: true, identity: NO_IDENTITY, probes: null })).toEqual({ view: "page", preview: false, via: "base" });
    expect(resolveWorkAreaGate("quadro", CLOSED, { signedIn: false, identity: NO_IDENTITY, probes: null })).toEqual(CLOSED);
    // The Pulmini work area (drivers, contacts, seat plans) is NOT base.
    expect(resolveWorkAreaGate("pulmini", CLOSED, { signedIn: true, identity: VERIFIED, probes: null })).toEqual(CLOSED);
    // quadro reads only getTrainingQuadro (any signed-in member) and the public calendar.
    const q = src("../routes/quadro.index.tsx");
    expect(q).toMatch(/await getTrainingQuadro\(\)/);
    expect(q).not.toMatch(/getStaff|getTransport|getPulmini|scd_my_/);
  });

  it("impianti e campi asks the resolver through its own gate", () => {
    expect(resolveWorkAreaGate("impianti-campi", CLOSED, facts(ROLES["Responsabile"]!))).toMatchObject({ view: "page", via: "grant" });
    expect(resolveWorkAreaGate("impianti-campi", CLOSED, facts(ROLES["Mister"]!))).toEqual(CLOSED);
  });

  it("a grant turns access or preview-only into a real page, flagged via grant", () => {
    expect(resolveWorkAreaGate("mister", CLOSED, facts(ROLES["Mister"]!))).toEqual({ view: "page", preview: false, via: "grant" });
    expect(resolveWorkAreaGate("mister", { view: "page", preview: true }, facts(ROLES["Mister"]!))).toEqual({ view: "page", preview: false, via: "grant" });
    expect(resolveWorkAreaGate("pulmini", CLOSED, facts(ROLES["Mister"]!))).toEqual(CLOSED);
    expect(resolveWorkAreaGate("gestionale", CLOSED, facts(ROLES["Direttore sportivo"]!))).toEqual(CLOSED);
  });
});

/** Fake user-scoped client: answers by function name; records calls. */
function fake(answers: Record<string, (args: Record<string, unknown>) => { data: unknown; error: { code?: string; message: string } | null }>) {
  const calls: Array<{ fn: string; args: Record<string, unknown> }> = [];
  const sb: ResolverClient = {
    rpc(fn, args) {
      calls.push({ fn, args });
      const a = answers[fn];
      if (!a) return Promise.resolve({ data: null, error: { code: "PGRST202", message: "Could not find the function" } });
      return Promise.resolve(a(args));
    },
  };
  return { sb, calls };
}
const ORG = "00000000-0000-0000-0000-0000000000a1";
const FAMILY_SELF = { scd_my_family: () => ({ data: [{ relationship: "SELF", team_codes: [] }], error: null }) };
const MISSING = { code: "PGRST202", message: "Could not find the function public.scd_my_section_access" };

describe("server side (fake client): r113 first, scd_can fallback, fail-closed", () => {
  const ctx = (sb: ResolverClient | null) => ({ sb, organizationId: ORG, signedIn: true });

  it("uses r113 rows when present", async () => {
    const { sb, calls } = fake({ ...FAMILY_SELF, scd_my_section_access: () => ({ data: ROLES["Mister"], error: null }) });
    expect(await gateWithGrants("mister", CLOSED, ctx(sb))).toEqual({ view: "page", preview: false, via: "grant" });
    expect(calls.some((c) => c.fn === "scd_can")).toBe(false);
  });

  it("falls back to two scd_can calls (any, ALL only) when r113 is not applied", async () => {
    const { sb, calls } = fake({
      ...FAMILY_SELF,
      scd_my_section_access: () => ({ data: null, error: MISSING }),
      scd_can: (a) => ({ data: a["p_section_code"] === "organigramma", error: null }),
    });
    expect(await gateWithGrants("organigramma", CLOSED, ctx(sb))).toMatchObject({ view: "page", via: "grant" });
    const sites = calls.filter((c) => c.fn === "scd_can").map((c) => c.args["p_site"]);
    expect(sites).toEqual([null, ALL_ONLY_SITE]);
    // OWN_TEAMS-like answer (true without context, false with the ALL-only site) on a sensitive section: closed.
    const own = fake({
      ...FAMILY_SELF,
      scd_my_section_access: () => ({ data: null, error: MISSING }),
      scd_can: (a) => ({ data: a["p_site"] === null, error: null }),
    });
    expect(await gateWithGrants("persone", CLOSED, ctx(own.sb))).toEqual(CLOSED);
    expect(await gateWithGrants("mister", CLOSED, ctx(own.sb))).toMatchObject({ view: "page" });
  });

  it("any error, a missing identity, no session or no organisation keeps the old answer", async () => {
    const boom = fake({ ...FAMILY_SELF, scd_my_section_access: () => ({ data: null, error: { code: "57014", message: "timeout" } }) });
    expect(await gateWithGrants("mister", CLOSED, ctx(boom.sb))).toEqual(CLOSED);
    const canErr = fake({ ...FAMILY_SELF, scd_my_section_access: () => ({ data: null, error: MISSING }), scd_can: () => ({ data: null, error: { message: "x" } }) });
    expect(await gateWithGrants("mister", CLOSED, ctx(canErr.sb))).toEqual(CLOSED);
    const noId = fake({ scd_my_family: () => ({ data: [], error: null }), scd_my_section_access: () => ({ data: ROLES["Mister"], error: null }) });
    expect(await gateWithGrants("mister", CLOSED, ctx(noId.sb))).toEqual(CLOSED);
    const throws: ResolverClient = { rpc: () => Promise.reject(new Error("network")) };
    expect(await gateWithGrants("mister", CLOSED, ctx(throws))).toEqual(CLOSED);
    expect(await gateWithGrants("mister", CLOSED, { sb: null, organizationId: ORG, signedIn: true })).toEqual(CLOSED);
    expect(await gateWithGrants("mister", CLOSED, { sb: noId.sb, organizationId: null, signedIn: true })).toEqual(CLOSED);
    expect(await gateWithGrants("mister", CLOSED, { sb: noId.sb, organizationId: ORG, signedIn: false })).toEqual(CLOSED);
    expect(await gateWithGrants("quadro", CLOSED, { sb: null, organizationId: null, signedIn: false })).toEqual(CLOSED);
    // Base needs an active membership (same rule as getTrainingQuadro), not just a login.
    expect(await gateWithGrants("quadro", CLOSED, { sb: null, organizationId: null, signedIn: true })).toEqual(CLOSED);
    expect(await gateWithGrants("quadro", CLOSED, { sb: null, organizationId: ORG, signedIn: true })).toMatchObject({ view: "page", via: "base" });
    expect(await readIdentity(throws, ORG)).toEqual(NO_IDENTITY);
    expect((await probesFor(boom.sb, ORG, ["mister"])).probes).toBeNull();
  });

  it("approvals need the APPROVE level with perimeter ALL", async () => {
    const narrow = fake({ ...FAMILY_SELF, scd_my_section_access: () => ({ data: [{ section_code: "impianti-campi", level: "APPROVE", perimeter: "OWN_SITE" }], error: null }) });
    expect(await grantAllAt("impianti-campi", "APPROVE", ctx(narrow.sb))).toBe(false);
    const wide = fake({ ...FAMILY_SELF, scd_my_section_access: () => ({ data: [{ section_code: "impianti-campi", level: "APPROVE", perimeter: "ALL" }], error: null }) });
    expect(await grantAllAt("impianti-campi", "APPROVE", ctx(wide.sb))).toBe(true);
    const read = fake({ ...FAMILY_SELF, scd_my_section_access: () => ({ data: [{ section_code: "impianti-campi", level: "READ", perimeter: "ALL" }], error: null }) });
    expect(await grantAllAt("impianti-campi", "APPROVE", ctx(read.sb))).toBe(false);
  });

  it("navigation lists grant areas only with r113; auto entries always come from the verified family", async () => {
    const parent = { scd_my_family: () => ({ data: [{ relationship: "SELF", team_codes: [] }, { relationship: "FIGLIO", team_codes: ["U12"] }], error: null }) };
    const without = fake({ ...parent, scd_my_section_access: () => ({ data: null, error: MISSING }) });
    const n1 = await navFor(ctx(without.sb));
    expect(n1.grantAreas).toEqual([]);
    expect(n1.auto.map((a) => a.id)).toEqual(["famiglia", "squadre"]);
    expect(without.calls.some((c) => c.fn === "scd_can")).toBe(false);
    const withR113 = fake({ ...parent, scd_my_section_access: () => ({ data: ROLES["Responsabile"], error: null }) });
    expect((await navFor(ctx(withR113.sb))).grantAreas.sort()).toEqual(["impianti-campi", "mister", "organigramma"]);
  });
});

describe("navigation merge", () => {
  it("adds the identity and grant groups without repeating an entry", () => {
    const base = menuFor(new Set(["famiglia"]));
    const merged = mergeNav(base, { grantAreas: ["mister", "quadro"], auto: autoEntries({ verified: true, childCount: 1, childTeamCodes: ["U12"], selfTeamCodes: [] }) });
    const ids = merged.flatMap((g) => g.entries.map((e) => e.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(merged.at(-1)).toMatchObject({ title: "Abilitate dalla Direzione" });
    expect(merged.at(-1)!.entries.map((e) => e.id)).toEqual(["mister", "quadro"]);
    // famiglia already in the position menu: not repeated in the identity group.
    expect(merged.find((g) => g.title === "Per te e la tua famiglia")!.entries.map((e) => e.id)).toEqual(["squadre"]);
    expect(mergeNav(base, { grantAreas: [], auto: [] })).toEqual(base);
    for (const g of ACCESS_MENU) expect(g.title).not.toBe("Abilitate dalla Direzione");
  });
});

describe("wiring and security (source assertions)", () => {
  it("the work-area gate is OLD rule OR grant on the server", () => {
    const fn = src("./work-areas.functions.ts");
    expect(fn).toMatch(/const old = workAreaView\(data\.area/);
    expect(fn).toMatch(/return gateWithGrants\(data\.area, old, callerContext\(s\)\)/);
    expect(src("./impianti.functions.ts")).toMatch(/gateWithGrants\("impianti-campi"/);
    expect(src("./impianti.functions.ts")).toMatch(/grantAllAt\("impianti-campi", "APPROVE"/);
  });

  it("reads only through the user's session: no service-role key in the resolver, the hook or the chrome", () => {
    for (const f of ["./access-resolver.ts", "./access-resolver.server.ts", "./use-access-nav.ts", "./work-areas.functions.ts", "../components/SiteChrome.tsx", "../components/scd/AccessMenu.tsx"])
      expect(src(f), f).not.toMatch(/SERVICE_ROLE_KEY|SUPABASE_SECRET|serviceRole(Key)?\b|createClient\(/);
    // Client code never imports a .server module directly.
    const clientFiles: string[] = [];
    const walk = (d: string) => {
      for (const n of readdirSync(d)) {
        const p = join(d, n);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.tsx$/.test(n)) clientFiles.push(p);
      }
    };
    walk(fileURLToPath(new URL("../components", import.meta.url)));
    for (const f of clientFiles) expect(readFileSync(f, "utf8"), f).not.toMatch(/from "@\/lib\/access-resolver\.server"/);
  });

  it("personal pages and server functions are private, no-store", () => {
    for (const p of ["/famiglia", "/gestionale/mister", "/quadro", "/la-mia-scd", "/la-mia-scd/campione", "/_serverFn/abc", "/tesoreria", "/direzione/accessi"])
      expect(cacheControlFor(p), p).toBe("private, no-store, max-age=0");
  });

  it("r113 is staged, not applied, and only reads the caller's own grants", () => {
    const sql = src("../../../../supabase/migrations/20261017_r113_my_section_access.sql");
    expect(sql).toMatch(/APPLIED on SCD PULSE .* «ok ruoli - applica r112 - applica r113»/);
    const body = sql.split("\n").filter((l) => !l.trimStart().startsWith("--")).join("\n");
    expect(body).toMatch(/security definer/);
    expect(body).toMatch(/set search_path to 'public'/);
    expect(body).toMatch(/l\.link_state in \('AUTO_VERIFIED', 'VERIFIED_BY_STAFF'\)/);
    expect(body).toMatch(/revoke all on function public\.scd_my_section_access\(uuid\) from public, anon/);
    expect(body).not.toMatch(/\b(insert|update|delete)\b\s+(into\s+)?public\./i);
    expect(body).not.toMatch(/p_person_id|p_user_id/);
  });
});
