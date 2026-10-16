import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { findArea } from "./areas";
import {
  BASE_SECTIONS,
  GRANTABLE_SECTIONS,
  LEVELS,
  PERIMETERS,
  SECTIONS,
  SECTIONS_FILE,
  applyProposals,
  can,
  copyPlan,
  defaultRow,
  diffGrants,
  discardProposals,
  draftFromGrants,
  editRefusal,
  findSection,
  grantAuditSummary,
  grantProblem,
  grantsToSave,
  levelCovers,
  pendingProposals,
  suggestGrants,
  willSee,
  type CallerFacts,
  type Grant,
  type GrantRow,
} from "./person-grants";
import { grantsEngineState, isMissingObjectError, sectionCheck, type GrantsClient } from "./person-grants.server";
import { KNOWN_POSITIONS, ROLE_POSITIONS } from "./session";

const repo = (p: string) => fileURLToPath(new URL(`../../../../${p}`, import.meta.url));
const SQL = readFileSync(repo("supabase/migrations/20261014_r100_person_grants.sql"), "utf8");
/** r101 (UD-113, corrected 16/10/2026) recreates scd_section_catalog() with the live entries (r100 + r136) unchanged plus the new sections. */
const SQL101 = readFileSync(repo("supabase/migrations/20261014_r101_fondo_adotta.sql"), "utf8");
/** r136 (Infermeria and Nutrizionista) recreates it again with every r101 entry unchanged plus "nutrizione". */
const SQL136 = readFileSync(repo("supabase/migrations/20261016_r136_infermeria_nutrizione.sql"), "utf8");
const routeTree = readFileSync(fileURLToPath(new URL("../routeTree.gen.ts", import.meta.url)), "utf8");

function literal(tag: string, sql: string = SQL): unknown {
  const m = sql.match(new RegExp(`\\$${tag}\\$([\\s\\S]*?)\\$${tag}\\$`));
  if (!m) throw new Error(`literal $${tag}$ not found`);
  return JSON.parse(m[1]!);
}

const T1 = "00000000-0000-0000-0000-0000000007a1";
const T2 = "00000000-0000-0000-0000-0000000007a2";
const ME = "00000000-0000-0000-0000-0000000000e0";
const KID = "00000000-0000-0000-0000-0000000000b0";
const OTHER = "00000000-0000-0000-0000-0000000000f2";

function row(g: Partial<GrantRow> & Pick<Grant, "sectionCode" | "level" | "perimeter">): GrantRow {
  return { id: `id-${g.sectionCode}`, teamIds: [], site: null, grantedBy: null, grantedAt: "2026-10-14T10:00:00Z", revokedAt: null, note: null, ...g };
}
const caller = (over: Partial<CallerFacts> = {}): CallerFacts => ({ active: true, isDirection: false, personIds: [ME], childPersonIds: [], ...over });

describe("sections catalogue (config/scd-sections.v1.json)", () => {
  it("is the canonical file and has unique codes", () => {
    expect(SECTIONS_FILE.schema).toBe("scd.sections.v1");
    const codes = SECTIONS.map((s) => s.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const s of SECTIONS) expect(s.code).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("uses only known levels, perimeters and groups", () => {
    const groups = SECTIONS_FILE.groups.map((g) => g.code);
    for (const s of SECTIONS) {
      expect(groups).toContain(s.group);
      for (const l of s.levels) expect(LEVELS).toContain(l);
      for (const p of s.perimeters) expect(PERIMETERS).toContain(p);
    }
  });

  it("base = public pages, own profile, own card; nothing else", () => {
    expect(BASE_SECTIONS.map((s) => s.code)).toEqual(["pubblico", "profilo", "tessera"]);
  });

  it("keeps minors' health data and Safeguarding hard-blocked and not grantable", () => {
    for (const code of ["salute-minori", "safeguarding"]) {
      const s = findSection(code)!;
      expect(s.hardBlocked).toBe(true);
      expect(s.levels).toEqual([]);
      expect(GRANTABLE_SECTIONS.some((g) => g.code === code)).toBe(false);
    }
  });

  it("maps area sections onto the area registry and live routes", () => {
    const paths = new Set([...routeTree.matchAll(/\bfullPath: '([^']+)'/g)].map((m) => (m[1]!.length > 1 ? m[1]!.replace(/\/$/, "") : m[1]!)));
    for (const s of SECTIONS) {
      if (s.area) expect(findArea(s.area), `area ${s.area}`).toBeDefined();
      if (s.path) expect(paths.has(s.path), `route ${s.path}`).toBe(true);
    }
  });

  it("role suggestions use known positions and grantable, allowed choices", () => {
    for (const [pos, rules] of Object.entries(SECTIONS_FILE.roleSuggestions.positions)) {
      expect(KNOWN_POSITIONS, pos).toContain(pos);
      for (const r of rules) {
        const s = findSection(r.section)!;
        expect(GRANTABLE_SECTIONS).toContain(s);
        expect(s.levels).toContain(r.level);
        expect(s.perimeters).toContain(r.perimeter);
        if (r.perimeter === "OWN_SITE") expect(["COLICO", "DERVIO"]).toContain(r.site);
      }
    }
    for (const pos of Object.values(SECTIONS_FILE.roleSuggestions.roleKindPositions)) expect(KNOWN_POSITIONS).toContain(pos);
  });
});

describe("migration r100 stays in sync with the catalogue", () => {
  const asSql = (s: (typeof SECTIONS)[number]) => ({ code: s.code, levels: s.levels, perimeters: s.perimeters, base: !!s.base, hard_blocked: !!s.hardBlocked, direction_only: !!s.directionOnly, sensitive: !!s.sensitive });
  const R101_SECTIONS = ["fondo-solidale", "adotta", "donazioni", "proposte"];

  const R136_SECTIONS = ["nutrizione"];

  it("the config file is r136 (live r100 + nutrizione) plus the r101 sections (CLOUD, not applied)", () => {
    const r136 = literal("cat", SQL136) as Array<{ code: string }>;
    expect([...r136, ...(literal("cat", SQL101) as Array<{ code: string }>).filter((x) => R101_SECTIONS.includes(x.code))]
      .map((x) => x.code).sort()).toEqual(SECTIONS.map((s) => s.code).sort());
    expect(r136).toEqual(SECTIONS.filter((s) => !R101_SECTIONS.includes(s.code)).map(asSql));
  });

  it("r101 keeps every live entry (r100 + r136 nutrizione) identical and only appends the UD-113 sections", () => {
    const r100 = literal("cat") as unknown[];
    const r136 = literal("cat", SQL136) as unknown[];
    const r101 = literal("cat", SQL101) as Array<{ code: string }>;
    // Applying r101 after r136 must never drop "nutrizione" (correction C1, Francesco 16/10/2026).
    expect(r101.slice(0, r136.length)).toEqual(r136);
    expect(r101.map((x) => x.code)).toContain("nutrizione");
    expect(r101.slice(r136.length).map((x) => x.code)).toEqual(R101_SECTIONS);
    const byCode = (a: { code: string }, b: { code: string }) => a.code.localeCompare(b.code);
    expect([...r101].sort(byCode)).toEqual(SECTIONS.map(asSql).sort(byCode));
    expect(SECTIONS.filter((s) => ![...R101_SECTIONS, ...R136_SECTIONS].includes(s.code)).map(asSql)).toEqual(r100);
  });

  it("r136 keeps every live r100 entry identical, only appends nutrizione and never introduces r101 sections", () => {
    const r100 = literal("cat") as unknown[];
    const r136 = literal("cat", SQL136) as Array<{ code: string }>;
    expect(r136.slice(0, r100.length)).toEqual(r100);
    expect(r136.slice(r100.length).map((x) => x.code)).toEqual(R136_SECTIONS);
    expect(r136.some((x) => R101_SECTIONS.includes(x.code))).toBe(false);
  });

  it("embeds the same role suggestions, role baselines and role kinds", () => {
    const rules = Object.entries(SECTIONS_FILE.roleSuggestions.positions).flatMap(([position, rs]) =>
      rs.map((r) => ({ position, section: r.section, level: r.level, perimeter: r.perimeter, site: r.site ?? null })),
    );
    expect(literal("sug")).toEqual(rules);
    const baseline = Object.entries(ROLE_POSITIONS).flatMap(([role, ps]) => ps.map((position) => ({ role, position })));
    expect(literal("rp")).toEqual(baseline);
    expect(literal("kp")).toEqual(SECTIONS_FILE.roleSuggestions.roleKindPositions);
  });

  it("is written, not applied, and keeps the database rules", () => {
    expect(SQL).toMatch(/STAGED: written, NOT applied/);
    expect(SQL).toMatch(/raise exception 'cannot edit own access'/);
    expect(SQL).toMatch(/raise exception 'club account is protected'/);
    expect(SQL).toMatch(/raise exception 'minor: SELF only'/);
    expect(SQL).toMatch(/'GRANT_SECTION','CHANGE_SECTION','REVOKE_SECTION','COPY_GRANTS'/);
    expect(SQL).toMatch(/security definer\s+set search_path to 'public'/);
    expect(SQL).not.toMatch(/insert into public\.scd_person_grants[^;]*values\s*\('/i); // no seeded grants
    expect(SQL).not.toMatch(/dfnwzwutvnwiitiffwvr/);
  });
});

describe("can(): only active grants plus hard blocks", () => {
  const mister = row({ sectionCode: "mister", level: "WRITE", perimeter: "OWN_TEAMS", teamIds: [T1] });

  it("level hierarchy READ < WRITE < APPROVE", () => {
    expect(levelCovers("APPROVE", "READ")).toBe(true);
    expect(levelCovers("WRITE", "APPROVE")).toBe(false);
    expect(can([mister], "mister", "READ", {}, caller())).toBe(true);
    expect(can([mister], "mister", "WRITE", {}, caller())).toBe(true);
    expect(can([mister], "mister", "APPROVE", {}, caller())).toBe(false);
  });

  it("a role opens nothing: without a grant the answer is no", () => {
    expect(can([], "mister", "READ", {}, caller())).toBe(false);
    expect(can([mister], "certificati", "READ", {}, caller())).toBe(false);
  });

  it("evaluates every perimeter", () => {
    expect(can([mister], "mister", "WRITE", { teamId: T1 }, caller())).toBe(true);
    expect(can([mister], "mister", "WRITE", { teamId: T2 }, caller())).toBe(false);
    expect(can([mister], "mister", "READ", { personId: KID, subjectTeamIds: [T1] }, caller())).toBe(true);
    const site = row({ sectionCode: "impianti-campi", level: "WRITE", perimeter: "OWN_SITE", site: "COLICO" });
    expect(can([site], "impianti-campi", "WRITE", { site: "COLICO" }, caller())).toBe(true);
    expect(can([site], "impianti-campi", "WRITE", { site: "DERVIO" }, caller())).toBe(false);
    const fam = row({ sectionCode: "famiglia", level: "READ", perimeter: "OWN_CHILDREN" });
    expect(can([fam], "famiglia", "READ", { personId: KID }, caller({ childPersonIds: [KID] }))).toBe(true);
    expect(can([fam], "famiglia", "READ", { personId: OTHER }, caller({ childPersonIds: [KID] }))).toBe(false);
    const self = row({ sectionCode: "compensi", level: "READ", perimeter: "SELF" });
    expect(can([self], "compensi", "READ", { personId: ME }, caller())).toBe(true);
    expect(can([self], "compensi", "READ", { personId: OTHER }, caller())).toBe(false);
    const all = row({ sectionCode: "crm", level: "READ", perimeter: "ALL" });
    expect(can([all], "crm", "READ", { personId: OTHER, teamId: T2 }, caller())).toBe(true);
  });

  it("ignores revoked grants", () => {
    expect(can([{ ...mister, revokedAt: "2026-10-14T11:00:00Z" }], "mister", "READ", {}, caller())).toBe(false);
  });

  it("hard blocks win over everything, Direzione included", () => {
    const fake = row({ sectionCode: "safeguarding", level: "READ", perimeter: "ALL" });
    expect(can([fake], "safeguarding", "READ", {}, caller())).toBe(false);
    expect(can([], "safeguarding", "READ", {}, caller({ isDirection: true }))).toBe(false);
    expect(can([], "salute-minori", "READ", {}, caller({ isDirection: true }))).toBe(false);
    expect(can([], "posta-collega", "READ", {}, caller({ isDirection: true }))).toBe(true);
    expect(can([], "posta-collega", "READ", {}, caller())).toBe(false);
  });

  it("base for every active account, nothing for a suspended one", () => {
    expect(can([], "profilo", "WRITE", {}, caller())).toBe(true);
    expect(can([], "pubblico", "WRITE", {}, caller())).toBe(false);
    expect(can([mister], "mister", "READ", {}, caller({ active: false }))).toBe(false);
    expect(can([], "profilo", "READ", {}, caller({ active: false }))).toBe(false);
  });
});

describe("who may edit", () => {
  const dir = { isDirection: true, personIds: ["dir-person"] };
  it("refuses self-edit, the club account and non-Direzione", () => {
    expect(editRefusal(dir, { personId: "dir-person", isClubAccount: false })).toMatch(/tue abilitazioni/);
    expect(editRefusal(dir, { personId: "club", isClubAccount: true })).toMatch(/Account del club/);
    expect(editRefusal({ isDirection: false, personIds: [] }, { personId: ME, isClubAccount: false })).toMatch(/Solo la Direzione/);
    expect(editRefusal(dir, { personId: ME, isClubAccount: false })).toBeNull();
  });
});

describe("grantProblem mirrors the database checks", () => {
  const adult = { minor: false };
  it("accepts a valid grant and refuses protected ones", () => {
    expect(grantProblem({ sectionCode: "crm", level: "READ", perimeter: "ALL", teamIds: [], site: null }, adult)).toBeNull();
    expect(grantProblem({ sectionCode: "safeguarding", level: "READ", perimeter: "ALL", teamIds: [], site: null }, adult)).toMatch(/protetta/);
    expect(grantProblem({ sectionCode: "posta-collega", level: "READ", perimeter: "ALL", teamIds: [], site: null }, adult)).toMatch(/solo la Direzione/);
    expect(grantProblem({ sectionCode: "profilo", level: "WRITE", perimeter: "SELF", teamIds: [], site: null }, adult)).toMatch(/base/);
  });
  it("checks level, perimeter, teams, site, minors and reasons", () => {
    expect(grantProblem({ sectionCode: "tesoreria", level: "WRITE", perimeter: "ALL", teamIds: [], site: null }, adult, "motivo")).toMatch(/livello/);
    expect(grantProblem({ sectionCode: "crm", level: "READ", perimeter: "SELF", teamIds: [], site: null }, adult)).toMatch(/perimetro/);
    expect(grantProblem({ sectionCode: "quadro", level: "READ", perimeter: "OWN_TEAMS", teamIds: [], site: null }, adult)).toMatch(/squadra/);
    expect(grantProblem({ sectionCode: "quadro", level: "READ", perimeter: "OWN_SITE", teamIds: [], site: null }, adult)).toMatch(/sede/);
    expect(grantProblem({ sectionCode: "famiglia", level: "READ", perimeter: "OWN_CHILDREN", teamIds: [], site: null }, { minor: true })).toMatch(/minorenne/);
    expect(grantProblem({ sectionCode: "famiglia", level: "READ", perimeter: "SELF", teamIds: [], site: null }, { minor: true })).toBeNull();
    expect(grantProblem({ sectionCode: "mister", level: "READ", perimeter: "ALL", teamIds: [], site: null }, adult, "")).toMatch(/motivo/);
    expect(grantProblem({ sectionCode: "mister", level: "READ", perimeter: "ALL", teamIds: [], site: null }, adult, "nuovo mister")).toBeNull();
  });
  it("defaults a minor to SELF when the section allows it", () => {
    expect(defaultRow(findSection("famiglia")!, { minor: true }).perimeter).toBe("SELF");
    expect(defaultRow(findSection("famiglia")!, { minor: false }).perimeter).toBe("OWN_CHILDREN");
  });
});

describe("suggestions are proposals, never applied by themselves", () => {
  const facts = { positions: ["mister"], structureRoles: [{ kind: "MISTER", teamId: T1, label: "Mister U15" }], isGuardian: true, isAthlete: false };

  it("derives suggestions from roles with the role's teams", () => {
    const s = suggestGrants(facts);
    const mister = s.find((x) => x.sectionCode === "mister")!;
    expect(mister).toMatchObject({ level: "WRITE", perimeter: "OWN_TEAMS", teamIds: [T1] });
    expect(s.find((x) => x.sectionCode === "famiglia")).toMatchObject({ perimeter: "OWN_CHILDREN" });
  });

  it("merges two roles: higher level and broader perimeter win", () => {
    const s = suggestGrants({ positions: ["mister", "coordinatore-attivita-sportiva"], structureRoles: [], isGuardian: false, isAthlete: false });
    expect(s.find((x) => x.sectionCode === "mister")).toMatchObject({ level: "WRITE", perimeter: "ALL", teamIds: [] });
  });

  it("does not save proposals until each one is confirmed", () => {
    const saved: GrantRow[] = [row({ sectionCode: "crm", level: "READ", perimeter: "ALL" })];
    let draft = draftFromGrants(saved);
    draft = applyProposals(draft, suggestGrants(facts), "suggested");
    expect(pendingProposals(draft).length).toBeGreaterThan(0);
    expect(grantsToSave(draft).map((g) => g.sectionCode)).toEqual(["crm"]);
    draft = { ...draft, mister: { ...draft["mister"]!, confirmed: true } };
    expect(grantsToSave(draft).map((g) => g.sectionCode)).toEqual(["crm", "mister"]);
    const back = discardProposals(draft, saved);
    expect(pendingProposals(back)).toEqual([]);
    expect(grantsToSave(back).map((g) => g.sectionCode)).toEqual(["crm", "mister"]);
  });

  it("never overwrites a row already confirmed and never proposes protected sections", () => {
    const saved: GrantRow[] = [row({ sectionCode: "mister", level: "READ", perimeter: "ALL" })];
    const draft = applyProposals(draftFromGrants(saved), [{ sectionCode: "mister", level: "APPROVE", perimeter: "ALL", teamIds: [], site: null }, { sectionCode: "safeguarding", level: "READ", perimeter: "ALL", teamIds: [], site: null }], "suggested");
    expect(draft["mister"]).toMatchObject({ level: "READ", confirmed: true });
    expect(draft["safeguarding"]).toBeUndefined();
  });
});

describe("copy and diff", () => {
  const source: GrantRow[] = [
    row({ sectionCode: "mister", level: "WRITE", perimeter: "OWN_TEAMS", teamIds: [T1] }),
    row({ sectionCode: "compensi", level: "READ", perimeter: "SELF" }),
    row({ sectionCode: "safeguarding", level: "READ", perimeter: "ALL" }),
    row({ sectionCode: "crm", level: "READ", perimeter: "ALL", revokedAt: "2026-10-14T12:00:00Z" }),
  ];
  it("copies valid active grants and skips protected, revoked and (for minors) non-SELF ones", () => {
    const adult = copyPlan(source, { minor: false });
    expect(adult.apply.map((g) => g.sectionCode)).toEqual(["mister", "compensi"]);
    expect(adult.skipped.map((s) => s.grant.sectionCode)).toEqual(["safeguarding"]);
    const minor = copyPlan(source, { minor: true });
    expect(minor.apply.map((g) => g.sectionCode)).toEqual(["compensi"]);
  });
  it("lists added, changed and removed sections", () => {
    const d = diffGrants(
      [source[0]!, row({ sectionCode: "crm", level: "READ", perimeter: "ALL" })],
      [{ ...source[0]!, level: "READ" }, { sectionCode: "quadro", level: "READ", perimeter: "ALL", teamIds: [], site: null }],
    );
    expect(d.added.map((g) => g.sectionCode)).toEqual(["quadro"]);
    expect(d.changed.map((c) => c.after.level)).toEqual(["READ"]);
    expect(d.removed.map((g) => g.sectionCode)).toEqual(["crm"]);
    expect(diffGrants([source[0]!], [{ ...source[0]!, teamIds: [T1, T1] }]).changed).toEqual([]);
  });
});

describe("plain words", () => {
  it("'Vedrà' starts with the base and never lists protected parts", () => {
    const lines = willSee([{ sectionCode: "quadro", level: "READ", perimeter: "OWN_TEAMS", teamIds: [T1], site: null }, { sectionCode: "safeguarding", level: "READ", perimeter: "ALL", teamIds: [], site: null }], () => "U15");
    expect(lines.slice(0, 3).every((l) => l.base)).toBe(true);
    expect(lines.map((l) => l.code)).toEqual(["pubblico", "profilo", "tessera", "quadro"]);
    expect(lines[3]!.text).toBe("vede il quadro degli allenamenti · squadre U15");
  });
  it("summarises audit rows", () => {
    expect(grantAuditSummary("GRANT_SECTION", { section: "crm", after: { level: "WRITE", perimeter: "ALL", team_ids: [], site: null } })).toBe("CRM contatti e sponsor: Modifica · tutta la società");
    expect(grantAuditSummary("REVOKE_SECTION", { section: "crm", before: { level: "READ", perimeter: "ALL" } })).toMatch(/tolta/);
    expect(grantAuditSummary("COPY_GRANTS", { sections: ["crm", "quadro"] })).toBe("2 sezioni copiate da un'altra persona");
  });
});

describe("fail-closed engine detection (no behaviour change before r100)", () => {
  function client(result: { error: { code?: string; message: string } | null }, rpc?: { data: unknown; error: null }): GrantsClient {
    const p = Promise.resolve(result);
    return {
      from: () => ({ select: () => Object.assign(p, { limit: () => p }) }),
      rpc: () => Promise.resolve(rpc ?? { data: null, error: null }),
    };
  }
  it("reads the state of migration r100", async () => {
    expect(await grantsEngineState(null)).toBe("unknown");
    expect(await grantsEngineState(client({ error: null }))).toBe("applied");
    expect(await grantsEngineState(client({ error: { code: "PGRST205", message: "Could not find the table 'public.scd_person_grants'" } }))).toBe("not-applied");
    expect(await grantsEngineState(client({ error: { code: "42P01", message: 'relation "scd_person_grants" does not exist' } }))).toBe("not-applied");
    expect(await grantsEngineState(client({ error: { code: "08006", message: "connection failure" } }))).toBe("unknown");
    expect(isMissingObjectError({ code: "42501", message: "permission denied" })).toBe(false);
  });
  it("gives no answer (caller keeps today's rule) until r100 is applied", async () => {
    expect(await sectionCheck(client({ error: { code: "PGRST205", message: "Could not find the table" } }), "org", "mister", "READ")).toEqual({ engine: "not-applied" });
    expect(await sectionCheck(client({ error: null }, { data: true, error: null }), "org", "mister", "READ")).toEqual({ engine: "applied", allowed: true });
  });

  it("no existing guard calls scd_can yet", () => {
    const src = fileURLToPath(new URL("..", import.meta.url));
    const files: string[] = [];
    const walk = (d: string) => {
      for (const n of readdirSync(d)) {
        const p = join(d, n);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.(ts|tsx)$/.test(n) && !/\.test\.tsx?$/.test(n)) files.push(p);
      }
    };
    walk(src);
    const users = files.filter((f) => readFileSync(f, "utf8").includes('"scd_can"')).map((f) => f.slice(src.length));
    expect(users).toEqual(["lib/person-grants.server.ts"]);
  });
});
