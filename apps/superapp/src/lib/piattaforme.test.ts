import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  AGENT_LABEL,
  AUDIENCES,
  agentLabel,
  PLATFORMS,
  SECTORS,
  STARTER_BASE,
  UNKNOWN,
  bySector,
  filterPlatforms,
  platformBySlug,
  statusCounts,
} from "./piattaforme";

const repo = (p: string) => fileURLToPath(new URL(`../../../../${p}`, import.meta.url));
const routeTree = readFileSync(fileURLToPath(new URL("../routeTree.gen.ts", import.meta.url)), "utf8");
const routePaths = new Set(
  [...routeTree.matchAll(/\b(?:path|fullPath): '([^']+)'/g)].map((m) => (m[1]!.length > 1 ? m[1]!.replace(/\/$/, "") : m[1]!)),
);
const pipeline = readFileSync(repo(".claude/agents/PIPELINE.md"), "utf8");
const ideas = readFileSync(repo("docs/piattaforme/IDEE.md"), "utf8");

describe("the 26 platforms map", () => {
  it("has the 26 platforms 01-26 once each, with unique slugs", () => {
    expect(PLATFORMS.map((p) => p.id)).toEqual(Array.from({ length: 26 }, (_, i) => String(i + 1).padStart(2, "0")));
    expect(new Set(PLATFORMS.map((p) => p.slug)).size).toBe(26);
  });

  it("matches every dossier: file exists and the name is the dossier title", () => {
    for (const p of PLATFORMS) {
      const file = repo(`docs/piattaforme/${p.dossier}`);
      expect(existsSync(file), p.dossier).toBe(true);
      expect(p.dossier.startsWith(`${p.id}-`)).toBe(true);
      const title = readFileSync(file, "utf8").split("\n")[0]!;
      // 17 carries the name decided by Francesco on 17/10/2026 («Vetta Legnone»), the dossier keeps its title.
      if (p.id !== "17") expect(title, p.dossier).toBe(`# ${p.id} · ${p.name}`);
    }
  });

  it("takes the sector and the responsible agent from PIPELINE.md §0", () => {
    for (const p of PLATFORMS) {
      const row = pipeline.split("\n").find((l) => l.startsWith(`| ${Number(p.id)} | `));
      expect(row, `row ${p.id}`).toBeTruthy();
      const cells = row!.split("|").map((c) => c.trim());
      expect(cells[3], `sector ${p.id}`).toBe(SECTORS.find((s) => s.id === p.sector)!.label);
      expect(cells[4], `responsible ${p.id}`).toBe(p.responsible);
    }
    for (const s of SECTORS) expect(pipeline).toContain(`${s.label}: ${s.director}`);
  });

  it("points every live or partial platform, and every action, to a real route", () => {
    for (const p of PLATFORMS) {
      if (p.status !== "in-costruzione") expect(routePaths.has(p.route), `${p.id} ${p.route}`).toBe(true);
      expect(p.today.length, p.id).toBeGreaterThanOrEqual(2);
      expect(p.today.length, p.id).toBeLessThanOrEqual(3);
      for (const a of p.today) expect(routePaths.has(a.to), `${p.id} ${a.to}`).toBe(true);
    }
    expect(routePaths.has("/gestionale/piattaforme")).toBe(true);
  });

  it("gives every platform without a page a starter route under the gestionale", () => {
    for (const p of PLATFORMS.filter((x) => x.status === "in-costruzione")) {
      expect(p.route).toBe(`${STARTER_BASE}/${p.slug}`);
      expect(routePaths.has(p.route), p.route).toBe(true);
      const file = readFileSync(fileURLToPath(new URL(`../routes/gestionale.piattaforme.${p.slug}.tsx`, import.meta.url)), "utf8");
      // Same staff gate as the other gestionale pages.
      expect(file).toContain('getWorkAreaGate({ data: { area: "gestionale" } })');
      expect(file).toContain('<WorkAreaGateView id="gestionale" gate={gate}>');
      expect(p.starter, p.id).toBeDefined();
      expect(p.starter!.sources.length).toBeGreaterThan(0);
      expect(p.starter!.person).toBe(UNKNOWN);
      for (const n of p.starter!.next) expect(ideas, n.idea).toContain(`| ${n.idea} |`);
    }
  });

  it("compares every path of the map with routeTree.gen.ts (routes, actions, planned routes)", () => {
    const all = PLATFORMS.flatMap((p) => [p.route, ...p.today.map((a) => a.to)]);
    const missing = [...new Set(all)].filter((r) => !routePaths.has(r));
    expect(missing).toEqual([]);
  });

  it("shows plain Italian names for every agent, never the technical id", () => {
    const ids = new Set([...PLATFORMS.flatMap((p) => [p.responsible, ...p.support]), ...SECTORS.map((s) => s.director)]);
    for (const id of ids) {
      expect(AGENT_LABEL[id], id).toBeTruthy();
      expect(agentLabel(id)).not.toMatch(/scd-/);
    }
    expect(agentLabel("scd-segreteria")).toBe("Assistente Segreteria");
    expect(agentLabel("scd-sconosciuto")).toBe("Assistente da confermare");
  });

  it("counts statuses (17/10/2026: 17 live, 4 partial, 5 in construction)", () => {
    expect(statusCounts()).toEqual({ live: 17, parziale: 4, "in-costruzione": 5 });
  });

  it("filters by text (accents and case ignored, number too) and by role", () => {
    expect(filterPlatforms("bandi", null).map((p) => p.id)).toEqual(["23"]);
    expect(filterPlatforms("CLUB house", null).map((p) => p.id)).toContain("07");
    expect(filterPlatforms("attività", null).map((p) => p.id)).toEqual(filterPlatforms("ATTIVITA", null).map((p) => p.id));
    expect(filterPlatforms("22", null).map((p) => p.id)).toContain("22");
    expect(filterPlatforms("", "direzione").length).toBeGreaterThan(20);
    for (const a of AUDIENCES) for (const p of filterPlatforms("", a.id)) expect(p.audiences).toContain(a.id);
    expect(filterPlatforms("nessunaparolacosi", null)).toEqual([]);
  });

  it("groups by sector in the order of the directors and drops empty sectors", () => {
    expect(bySector(PLATFORMS).map((g) => g.sector.id)).toEqual(SECTORS.map((s) => s.id));
    expect(bySector(filterPlatforms("bandi", null)).map((g) => g.sector.id)).toEqual(["soldi"]);
    expect(bySector(PLATFORMS).reduce((n, g) => n + g.items.length, 0)).toBe(26);
  });

  it("throws on an unknown slug", () => {
    expect(platformBySlug("palestra").id).toBe("08");
    expect(() => platformBySlug("nope")).toThrow();
  });
});
