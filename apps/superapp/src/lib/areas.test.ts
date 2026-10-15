import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  ACCESS_MENU,
  ALL_AREAS,
  AREA_REGISTRY,
  CURRENT_HREF,
  INTERIOR_RAIL,
  MANIFEST_ROLES,
  areaLink,
  canSeeArea,
  findArea,
  findAreaByPath,
  flattenAreas,
  formatClubDay,
  railFor,
  searchAreas,
  stripValue,
  validateAreas,
  type AreaNode,
} from "./areas";
import { SATELLITES, findSatellite } from "./satellites";

const repo = (p: string) => fileURLToPath(new URL(`../../../../${p}`, import.meta.url));
const boards = readdirSync(repo("docs/design/visual-master")).filter((f) => f.endsWith(".dc.html"));
const routeTree = readFileSync(fileURLToPath(new URL("../routeTree.gen.ts", import.meta.url)), "utf8");
const routePaths = new Set([...routeTree.matchAll(/\b(?:path|fullPath): '([^']+)'/g)].map((m) => (m[1]!.length > 1 ? m[1]!.replace(/\/$/, "") : m[1]!)));

describe("area registry (config/superapp-areas.v1.json)", () => {
  it("is the file at the repository root, not a copy", () => {
    const onDisk = JSON.parse(readFileSync(repo("config/superapp-areas.v1.json"), "utf8"));
    expect(AREA_REGISTRY).toEqual(onDisk);
    expect(AREA_REGISTRY.schema).toBe("scd.superapp-areas.v1");
  });

  it("is structurally valid: unique ids and paths, every child has a parent, boards exist", () => {
    expect(validateAreas(AREA_REGISTRY.areas, boards)).toEqual([]);
  });

  it("flattens parents before their children", () => {
    const ids = ALL_AREAS.map((a) => a.id);
    for (const a of ALL_AREAS) {
      if (a.parentId) {
        expect(ids.indexOf(a.parentId)).toBeLessThan(ids.indexOf(a.id));
        expect(a.depth).toBe(findArea(a.parentId)!.depth + 1);
      } else expect(a.depth).toBe(0);
    }
    expect(findArea("rotazione-campi")?.parentId).toBe("calendario");
    expect(findArea("club-house")?.parentId).toBe("tesoreria");
  });

  it("detects broken registries", () => {
    const broken: AreaNode[] = [
      { id: "a", path: "/a", status: "design", children: [{ id: "a", path: "/a", status: "design" }] },
      { id: "Bad_Id", path: "b/", status: "design", alias_of: "ghost" },
      { id: "c", path: "/c", status: "design", board: "Nope.dc.html", used_by: ["ghost"] },
    ];
    const problems = validateAreas(broken, boards);
    expect(problems.some((p) => p.includes('id "a" is used 2 times'))).toBe(true);
    expect(problems.some((p) => p.includes('path "/a" is used 2 times'))).toBe(true);
    expect(problems.some((p) => p.includes("kebab-case"))).toBe(true);
    expect(problems.some((p) => p.includes("clean absolute path"))).toBe(true);
    expect(problems.some((p) => p.includes("alias of a missing area"))).toBe(true);
    expect(problems.some((p) => p.includes("not in the Visual Master"))).toBe(true);
    expect(problems.some((p) => p.includes("used by a missing area"))).toBe(true);
    expect(flattenAreas(broken)).toHaveLength(4);
  });

  it("finds areas by path, tolerating a trailing slash", () => {
    expect(findAreaByPath("/quadro")?.id).toBe("quadro");
    expect(findAreaByPath("/calendario/rotazione-campi/")?.id).toBe("rotazione-campi");
    expect(findAreaByPath("/nope")).toBeUndefined();
  });
});

describe("impianti: club positions mapped to manifest roles", () => {
  const manifest = JSON.parse(readFileSync(repo("SCD_SYSTEM_MANIFEST.json"), "utf8")) as { identity_and_access: { roles: string[] } };

  it("keeps MANIFEST_ROLES equal to the manifest roles (no new roles)", () => {
    expect([...MANIFEST_ROLES]).toEqual(manifest.identity_and_access.roles);
  });

  it("lists the four positions decided on 2026-10-11, each mapped to an existing role", () => {
    const imp = findArea("impianti-campi")!;
    expect(imp.path).toBe("/gestionale/impianti");
    expect(imp.parentId).toBe("gestionale");
    expect(imp.roles).toEqual(["presidente", "direttore-generale", "responsabile-attivita-base", "coordinatore-attivita-sportiva"]);
    expect(imp.role_map).toEqual({ presidente: "DIRECTION", "direttore-generale": "DIRECTION", "responsabile-attivita-base": "MANAGER", "coordinatore-attivita-sportiva": "MANAGER" });
    expect(imp.access_note).toMatch(/R20 login is live/);
    expect(findArea("rotazione-campi")?.alias_of).toBe("impianti-campi");
    expect(findArea("quadro-rotazione-campi")?.alias_of).toBe("impianti-campi");
  });

  it("rejects unmapped positions and unknown manifest roles", () => {
    const bad: AreaNode[] = [{ id: "x", path: "/x", status: "design", roles: ["a", "b"], role_map: { a: "BOSS", c: "MANAGER" } }];
    const problems = validateAreas(bad);
    expect(problems.some((p) => p.includes('not a manifest role'))).toBe(true);
    expect(problems.some((p) => p.includes('"c" that is not in its roles'))).toBe(true);
    expect(problems.some((p) => p.includes('role "b" without a manifest mapping'))).toBe(true);
  });
});

describe("links that work today", () => {
  it("points every current link to a real route (no 404 from the menu)", () => {
    for (const [id, href] of Object.entries(CURRENT_HREF)) {
      expect(findArea(id), id).toBeDefined();
      const m = /^\/aree\/([a-z-]+)$/.exec(href);
      if (m) expect(findSatellite(m[1]!), href).toBeDefined();
      else expect(routePaths.has(href), href).toBe(true);
    }
  });

  it("maps satellites only to registry areas", () => {
    for (const s of SATELLITES) if (s.areaId) expect(findArea(s.areaId), s.slug).toBeDefined();
  });

  it("marks a link direct only when the canonical path is the live route", () => {
    expect(areaLink("calendario")).toEqual({ id: "calendario", path: "/calendario", href: "/calendario", direct: true, access: false, page: false });
    expect(areaLink("pulmini")).toEqual({ id: "pulmini", path: "/pulmini", href: "/pulmini", direct: true, access: false, page: true });
    expect(areaLink("crm")).toEqual({ id: "crm", path: "/crm", href: "/crm", direct: true, access: false, page: true });
    expect(areaLink("mister")).toEqual({ id: "mister", path: "/gestionale/mister", href: "/gestionale/mister", direct: true, access: false, page: true });
    expect(areaLink("direzione")).toEqual({ id: "direzione", path: "/direzione", href: "/direzione", direct: true, access: true, page: false });
    expect(areaLink("gestionale")).toEqual({ id: "gestionale", path: "/gestionale", href: "/gestionale", direct: true, access: false, page: true });
    expect(areaLink("sky-club")).toEqual({ id: "sky-club", path: "/sky-club", href: "/aree/tifoso", direct: false, access: false, page: false });
    expect(areaLink("gioca")).toEqual({ id: "gioca", path: "/gioca", href: null, direct: false, access: false, page: false });
    expect(() => areaLink("nope")).toThrow();
  });
});

describe("Accesso aree menu (board Accesso-aree)", () => {
  it("has the four groups of the board in order", () => {
    expect(ACCESS_MENU.map((g) => g.title)).toEqual(["Per famiglie e tifosi", "Per lo staff tecnico", "Per l'ufficio", "Per le aziende"]);
    expect(ACCESS_MENU.flatMap((g) => g.entries)).toHaveLength(14);
  });

  it("lists only registry areas, each once", () => {
    const ids = ACCESS_MENU.flatMap((g) => g.entries.map((e) => e.id));
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(findArea(id), id).toBeDefined();
  });

  it("marks staff and office areas as reserved, public ones as open", () => {
    const e = Object.fromEntries(ACCESS_MENU.flatMap((g) => g.entries).map((x) => [x.id, x]));
    expect(e["calendario"]!.reserved).toBe(false);
    expect(e["sponsor"]!.reserved).toBe(false);
    for (const id of ["gestionale", "quadro", "pulmini", "tesoreria", "crm", "direzione", "famiglia"]) expect(e[id]!.reserved, id).toBe(true);
  });
});

describe("interior rail filtered by role", () => {
  it("references registry areas only", () => {
    for (const g of INTERIOR_RAIL) for (const it of g.items) expect(findArea(it.id), it.id).toBeDefined();
  });

  it("shows everything to Direzione", () => {
    const all = INTERIOR_RAIL.flatMap((g) => g.items.map((i) => i.id));
    expect(railFor(new Set(["direzione"])).flatMap((g) => g.items.map((i) => i.id))).toEqual(all);
  });

  it("hides role-restricted areas from other roles and drops empty groups", () => {
    const mister = railFor(new Set(["mister"])).flatMap((g) => g.items.map((i) => i.id));
    expect(mister).toContain("quadro");
    expect(mister).not.toContain("pulmini");
    expect(mister).not.toContain("rotazione-campi");
    expect(mister).not.toContain("impianti-campi");
    const autista = railFor(new Set(["autista"]));
    expect(autista.flatMap((g) => g.items.map((i) => i.id))).toContain("pulmini");
    expect(railFor(new Set(), [{ title: "Solo", items: [{ id: "pulmini", label: "Pulmini", icon: "bus" }] }])).toEqual([]);
  });

  it("treats areas without roles as open to every staff role", () => {
    expect(canSeeArea({}, new Set())).toBe(true);
    expect(canSeeArea({ roles: ["autista"] }, new Set(["mister"]))).toBe(false);
    expect(canSeeArea({ roles: ["autista"] }, new Set(["direzione"]))).toBe(true);
  });
});

describe("search", () => {
  it("finds areas by name, path or partial word, ignoring accents and case", () => {
    expect(searchAreas("pulm")[0]?.id).toBe("pulmini");
    expect(searchAreas("/quadro")[0]?.id).toBe("quadro");
    expect(searchAreas("SEGRETERÌA")[0]?.id).toBe("segreteria");
    expect(searchAreas("teso").map((h) => h.id)).toContain("tesoreria");
    expect(searchAreas("x")).toEqual([]);
    expect(searchAreas("zzzz")).toEqual([]);
  });

  it("ranks prefix matches first and respects the limit", () => {
    const hits = searchAreas("ca", 3);
    expect(hits.length).toBeLessThanOrEqual(3);
    expect(hits[0]?.label.toLowerCase().startsWith("ca") || hits[0]?.path.startsWith("/ca")).toBe(true);
  });
});

describe("Oggi strip (InteriorShell HighlightStrip)", () => {
  it("never renders unknown as zero", () => {
    expect(stripValue(null)).toEqual({ text: "—", muted: true, known: false });
    expect(stripValue(undefined)).toEqual({ text: "—", muted: true, known: false });
    expect(stripValue(Number.NaN)).toEqual({ text: "—", muted: true, known: false });
  });

  it("mutes zero and highlights real counts", () => {
    expect(stripValue(0)).toEqual({ text: "0", muted: true, known: true });
    expect(stripValue(18)).toEqual({ text: "18", muted: false, known: true });
    expect(stripValue(12560).text).toBe("12.560");
  });

  it('is labelled "Oggi", never "In evidenza" (no vetrine, Francesco 15/10/2026)', () => {
    const shell = readFileSync(fileURLToPath(new URL("../components/scd/InteriorShell.tsx", import.meta.url)), "utf8");
    expect(shell).toContain('aria-label="Oggi"');
    expect(shell).not.toMatch(/in evidenza/i);
  });
});

describe("club date", () => {
  it("formats the day in Europe/Rome, capitalised", () => {
    expect(formatClubDay(new Date("2026-10-10T10:00:00Z"))).toBe("Sabato 10 ottobre");
    // 23:30 UTC on 10/10 is already Sunday in Rome.
    expect(formatClubDay(new Date("2026-10-10T23:30:00Z"))).toBe("Domenica 11 ottobre");
  });
});
