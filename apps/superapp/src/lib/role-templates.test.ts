import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { SECTIONS, applyProposals, draftFromGrants, grantsToSave, pendingProposals, type Grant } from "./person-grants";
import {
  PLATFORMS,
  ROLE_CREATOR_LABELS,
  ROLE_PRESETS,
  ROLE_RULES,
  ROLE_RULES_IT,
  applyPlan,
  byPlatform,
  explainRoleError,
  isRoleCreatorByRoles,
  labelProblem,
  needsSite,
  narrowestPerimeter,
  needsTeams,
  platformSections,
  presetGrants,
  sectionPlatform,
  templateProblem,
  type RoleTemplate,
} from "./role-templates";

const repo = (p: string) => fileURLToPath(new URL(`../../../../${p}`, import.meta.url));
const SQL100 = readFileSync(repo("supabase/migrations/20261014_r100_person_grants.sql"), "utf8");
const SQL111 = readFileSync(repo("supabase/migrations/20261015_r111_role_templates.sql"), "utf8");
const SQL138 = readFileSync(repo("supabase/migrations/20261016_r138_position_catalog.sql"), "utf8");
const routeTree = readFileSync(fileURLToPath(new URL("../routeTree.gen.ts", import.meta.url)), "utf8");

function literal(tag: string, sql: string): unknown {
  const m = sql.match(new RegExp(`\\$${tag}\\$([\\s\\S]*?)\\$${tag}\\$`));
  if (!m) throw new Error(`literal $${tag}$ not found`);
  return JSON.parse(m[1]!);
}

const T1 = "00000000-0000-0000-0000-0000000007a1";
const T2 = "00000000-0000-0000-0000-0000000007a2";

function tpl(over: Partial<RoleTemplate> = {}): RoleTemplate {
  return { id: "t1", platform: "CORE", label: "Mister annata", description: "", active: true, grants: [], updatedAt: "2026-10-15T18:00:00Z", ...over };
}

describe("platforms (Francesco 15/10: a role can always be created empty on every platform)", () => {
  it("every section of the catalogue belongs to exactly one platform", () => {
    for (const s of SECTIONS) expect(PLATFORMS).toContain(sectionPlatform(s.code));
  });

  it("the live platform list (r111, widened by r138 with nutrizione) keeps the same platform for every section", () => {
    const r111 = literal("plat", SQL111) as Array<{ code: string; platform: string }>;
    const r138 = literal("plat", SQL138) as Array<{ code: string; platform: string }>;
    expect(r138).toEqual(SECTIONS.map((s) => ({ code: s.code, platform: s.platform })));
    // r138 only adds: every r111 entry is still there with the same platform.
    for (const e of r111) expect(r138).toContainEqual(e);
  });

  it("each platform offers sections to put in a role, and the empty role is valid everywhere", () => {
    for (const p of PLATFORMS) {
      expect(platformSections(p).length).toBeGreaterThan(0);
      expect(templateProblem(p, [])).toBeNull();
      expect(presetGrants(p, null)).toEqual([]);
    }
  });

  it("family and sponsor sections live on ONE and GROW, management on CORE", () => {
    expect(sectionPlatform("famiglia")).toBe("ONE");
    expect(sectionPlatform("crm")).toBe("GROW");
    expect(sectionPlatform("mister")).toBe("CORE");
    expect(sectionPlatform("nessuna")).toBeNull();
  });
});

describe("models (\"Parti da un modello\")", () => {
  const r100 = literal("cat", SQL100) as Array<{ code: string; levels: string[]; perimeters: string[]; base: boolean; hard_blocked: boolean; direction_only: boolean }>;
  const liveGrantable = (section: string, level: string, perimeter: string) =>
    r100.some((c) => c.code === section && !c.base && !c.hard_blocked && !c.direction_only && c.levels.includes(level) && c.perimeters.includes(perimeter));

  it("every model is valid for its platform", () => {
    for (const p of PLATFORMS) for (const m of ROLE_PRESETS[p]) expect(templateProblem(p, presetGrants(p, m.code)), `${p}/${m.code}`).toBeNull();
  });

  it("every model section is grantable on the database as it is today (r100 catalogue)", () => {
    for (const p of PLATFORMS) for (const m of ROLE_PRESETS[p]) for (const g of m.grants) expect(liveGrantable(g.section, g.level, g.perimeter), `${m.code}:${g.section}`).toBe(true);
  });

  it("the team model uses only 'Sue annate', so a team role sees only the teams chosen for the person", () => {
    const squadra = presetGrants("CORE", "squadra");
    expect(squadra.length).toBeGreaterThan(0);
    expect(squadra.every((g) => g.perimeter === "OWN_TEAMS")).toBe(true);
  });
});

describe("who creates roles (Francesco 15/10: \"a creare puo essere presidente e direttore generale\")", () => {
  it("Presidente and Direttore Generale only", () => {
    expect(isRoleCreatorByRoles(["Presidente"])).toBe(true);
    expect(isRoleCreatorByRoles([" direttore generale "])).toBe(true);
    expect(isRoleCreatorByRoles(["Vice Presidente", "Direttore Sportivo", "Segreteria"])).toBe(false);
    expect(isRoleCreatorByRoles([])).toBe(false);
  });

  it("the database checks the same two roles", () => {
    expect(SQL111).toContain(`lower(btrim(r.role_label)) in (${ROLE_CREATOR_LABELS.map((l) => `'${l}'`).join(", ")})`);
    for (const fn of ["scd_create_role_template", "scd_set_role_template", "scd_set_role_template_active"]) {
      const body = SQL111.slice(SQL111.indexOf(`function public.${fn}(`));
      expect(body.slice(0, body.indexOf("$$;")), fn).toContain("if not public.scd_is_role_creator(p_organization_id) then");
    }
  });
});

describe("role content", () => {
  it("refuses sections of another platform, protected sections and wrong perimeters", () => {
    expect(templateProblem("CORE", [{ sectionCode: "crm", level: "READ", perimeter: "ALL" }])).toMatch(/GROW/);
    expect(templateProblem("CORE", [{ sectionCode: "safeguarding", level: "READ", perimeter: "ALL" }])).toMatch(/non si mette/);
    expect(templateProblem("CORE", [{ sectionCode: "mister", level: "READ", perimeter: "OWN_CHILDREN" }])).toMatch(/perimetro/);
    expect(templateProblem("CORE", [{ sectionCode: "mister", level: "READ", perimeter: "ALL" }, { sectionCode: "mister", level: "WRITE", perimeter: "ALL" }])).toMatch(/due volte/);
  });

  it("names are unique per platform, case and spaces ignored", () => {
    const others = [tpl({ id: "a", label: "Mister annata" }), tpl({ id: "b", label: "Vecchio", active: false })];
    expect(labelProblem("  mister   ANNATA", "CORE", others)).toMatch(/Esiste già/);
    expect(labelProblem("Mister annata", "ONE", others)).toBeNull();
    expect(labelProblem("Mister annata", "CORE", others, "a")).toBeNull();
    expect(labelProblem("Vecchio", "CORE", others)).toBeNull();
    expect(labelProblem("x", "CORE", [])).toMatch(/almeno 2/);
  });

  it("a section switched on starts from the narrowest perimeter, never 'Tutto' first", () => {
    expect(narrowestPerimeter({ perimeters: ["ALL", "OWN_TEAMS"] })).toBe("OWN_TEAMS");
    expect(narrowestPerimeter({ perimeters: ["ALL", "OWN_SITE"] })).toBe("OWN_SITE");
    expect(narrowestPerimeter({ perimeters: ["ALL"] })).toBe("ALL");
  });

  it("names are compared like the database does (trim, inner spaces, case)", () => {
    expect(SQL111).toContain("lower(regexp_replace(btrim(coalesce(p_label, '')), '\\s+', ' ', 'g'))");
    expect(SQL111).toContain("public.scd_role_label_key(label)) where active");
  });

  it("nobody can make himself Presidente or DG: triggers guard the organigramma and the account links", () => {
    expect(SQL111).toMatch(/create trigger scd_structure_roles_creator_guard\s+before insert or update or delete on public\.scd_structure_roles/);
    expect(SQL111).toMatch(/create trigger scd_identity_links_creator_guard\s+before insert or update on public\.scd_identity_links/);
    expect(SQL111).toMatch(/link_state in \('AUTO_VERIFIED', 'VERIFIED_BY_STAFF'\)/);
  });

  it("groups by platform, active first", () => {
    const g = byPlatform([tpl({ id: "z", label: "Zeta", active: false }), tpl({ id: "a", label: "Alfa" }), tpl({ id: "o", platform: "ONE", label: "Genitore" })]);
    expect(g.CORE.map((t) => t.id)).toEqual(["a", "z"]);
    expect(g.ONE.map((t) => t.id)).toEqual(["o"]);
    expect(g.GROW).toEqual([]);
  });
});

describe("loading a role on a person (Francesco 15/10: team role = own team, responsabile = what the Direzione gives)", () => {
  const role = tpl({ grants: [{ sectionCode: "mister", level: "WRITE", perimeter: "OWN_TEAMS" }, { sectionCode: "magazzino", level: "READ", perimeter: "OWN_SITE" }] });

  it("needs the person's teams and site before loading", () => {
    expect(needsTeams(role)).toBe(true);
    expect(needsSite(role)).toBe(true);
    expect(applyPlan(role, { teamIds: [], site: "COLICO", minor: false }).missing).toMatch(/squadra/);
    expect(applyPlan(role, { teamIds: [T1], site: null, minor: false }).missing).toMatch(/sede/);
  });

  it("a team role gets only the chosen team; a responsabile gets the teams chosen for him", () => {
    const one = applyPlan(role, { teamIds: [T1], site: "DERVIO", minor: false });
    expect(one.missing).toBeNull();
    expect(one.proposals.find((p) => p.sectionCode === "mister")?.teamIds).toEqual([T1]);
    expect(one.proposals.find((p) => p.sectionCode === "magazzino")).toMatchObject({ site: "DERVIO", teamIds: [] });
    const lead = applyPlan(role, { teamIds: [T2, T1, T1], site: "DERVIO", minor: false });
    expect(lead.proposals.find((p) => p.sectionCode === "mister")?.teamIds).toEqual([T1, T2]);
  });

  it("a minor receives nothing but 'Solo sé' sections; a disabled role loads nothing", () => {
    const kid = applyPlan(role, { teamIds: [T1], site: "COLICO", minor: true });
    expect(kid.proposals).toEqual([]);
    expect(kid.skipped).toHaveLength(2);
    expect(applyPlan({ ...role, active: false }, { teamIds: [T1], site: "COLICO", minor: false }).missing).toMatch(/disattivato/);
  });

  it("the role arrives as yellow proposals: nothing is saved until each row is confirmed", () => {
    const plan = applyPlan(role, { teamIds: [T1], site: "COLICO", minor: false });
    const draft = applyProposals(draftFromGrants([]), plan.proposals, "role");
    expect(pendingProposals(draft)).toHaveLength(2);
    expect(Object.values(draft).every((r) => r.origin === "role" && !r.confirmed)).toBe(true);
    expect(grantsToSave(draft)).toEqual([]);
    const confirmed = Object.fromEntries(Object.entries(draft).map(([k, r]) => [k, { ...r, confirmed: true }]));
    expect(grantsToSave(confirmed).map((g: Grant) => g.sectionCode)).toEqual(["magazzino", "mister"]);
  });
});

describe("base access first and wiring", () => {
  it("a new or wider grant needs an active account; revoking and narrowing are never blocked", () => {
    expect(SQL111).toMatch(/before insert on public\.scd_person_grants/);
    expect(SQL111).toMatch(/o\.revoked_at = now\(\)/);
    expect(SQL111).not.toMatch(/before (update|delete)[^;]*scd_person_grants/);
  });

  it("r111 is marked applied on SCD PULSE (16/10), additive and never touches the forbidden project", () => {
    expect(SQL111.split("\n")[0]).toMatch(/APPLIED 16\/10\/2026 on SCD PULSE/);
    expect(SQL111).toMatch(/applica r111/);
    expect(SQL111).toMatch(/never on project dfnwzwutvnwiitiffwvr/);
    expect(SQL111.replace(/^--.*$/gm, "")).not.toMatch(/drop table|truncate|delete from public\.scd_person_grants/i);
  });

  it("plain Italian for database errors", () => {
    const na = "Da attivare";
    expect(explainRoleError({ code: "42P01", message: "relation does not exist" }, na)).toBe(na);
    expect(explainRoleError({ code: "42501", message: "roles: Presidente or Direttore Generale only" }, na)).toMatch(/Presidente e il Direttore Generale/);
    expect(explainRoleError({ code: "23505", message: "role label already used" }, na)).toMatch(/Esiste già/);
    expect(explainRoleError({ message: "boom" }, na)).toMatch(/riprova/);
  });

  it("the page rules match the configured rules one by one", () => {
    expect(ROLE_RULES_IT).toHaveLength(ROLE_RULES.length);
  });

  it("the /direzione/ruoli route exists", () => {
    expect(routeTree).toContain("/direzione_/ruoli");
  });
});
