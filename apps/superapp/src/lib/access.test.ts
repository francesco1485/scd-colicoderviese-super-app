import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { accessScreen, localizeNote, roleLabel, whoEnters } from "./access";
import { ACCESS_MENU, ACCESS_SCREEN_IDS, ALL_AREAS, CURRENT_HREF, areaLink, deferredOwner, findArea, hasAccessScreen } from "./areas";
import { R20_LOGIN_LIVE, findSatellite } from "./satellites";
import { marketingAllowed } from "./universe";

const routeTree = readFileSync(fileURLToPath(new URL("../routeTree.gen.ts", import.meta.url)), "utf8");
const routePaths = new Set([...routeTree.matchAll(/\bpath: '([^']+)'/g)].map((m) => (m[1]!.length > 1 ? m[1]!.replace(/\/$/, "") : m[1]!)));

/** Paths owned by branches built in parallel: no access screen may claim them. */
const PARALLEL_OWNED = ["/calendario/rotazione-campi", "/quadro", "/gestionale"];
const ownedByParallel = (p: string) => PARALLEL_OWNED.some((o) => p === o || p.startsWith(`${o}/`));

describe("access screens: one per reserved area without a page", () => {
  it("lists registry areas only, each once", () => {
    expect(new Set(ACCESS_SCREEN_IDS).size).toBe(ACCESS_SCREEN_IDS.length);
    for (const id of ACCESS_SCREEN_IDS) expect(findArea(id), id).toBeDefined();
  });

  it("gives every access screen a real route at the canonical path", () => {
    for (const id of ACCESS_SCREEN_IDS) expect(routePaths.has(findArea(id)!.path), id).toBe(true);
  });

  it("never claims a path owned by a parallel branch (rotazione campi, quadro, gestionale and their children)", () => {
    for (const id of ACCESS_SCREEN_IDS) expect(ownedByParallel(findArea(id)!.path), id).toBe(false);
    // /quadro and /gestionale are now real pages (item 4); access screens still never claim them.
    for (const id of ACCESS_SCREEN_IDS) expect(["/quadro", "/gestionale"]).not.toContain(findArea(id)!.path);
    // Item 3 is live: /gestionale/impianti and its two aliases are pages, no longer deferred.
    for (const p of ["/gestionale/impianti", "/calendario/rotazione-campi", "/quadro/rotazione-campi"]) {
      expect(deferredOwner(p), p).toBeNull();
      expect(routePaths.has(p), p).toBe(true);
    }
    expect(areaLink("impianti-campi")).toMatchObject({ href: "/gestionale/impianti", direct: true, access: false });
    expect(deferredOwner("/gestionale/mister")).toMatch(/item 4/);
  });

  it("resolves every registry area to a page, an access screen or a declared owner", () => {
    for (const a of ALL_AREAS) {
      const link = areaLink(a.id);
      const resolved = link.href !== null || hasAccessScreen(a.id) || deferredOwner(a.path) !== null;
      expect(resolved, `${a.id} ${a.path}`).toBe(true);
    }
  });

  it("leaves no reserved menu entry on 'In arrivo'", () => {
    for (const e of ACCESS_MENU.flatMap((g) => g.entries)) expect(areaLink(e.id).href, e.id).not.toBeNull();
  });

  it("never loads marketing pixels on an access screen (reserved areas)", () => {
    const yes = { v: 1 as const, stats: true, mkt: true, ts: "2026-10-11T00:00:00Z" };
    for (const id of ACCESS_SCREEN_IDS) expect(marketingAllowed(yes, findArea(id)!.path), id).toBe(false);
  });

  it("keeps explicit hosts and links access screens to their own path", () => {
    expect(CURRENT_HREF["quadro"]).toBe("/quadro");
    expect(CURRENT_HREF["iscrizioni"]).toBe("/entra");
    for (const id of ACCESS_SCREEN_IDS) expect(areaLink(id)).toMatchObject({ direct: true, access: true });
  });
});

describe("access screen content from the registry", () => {
  it("pulmini: board copy, registry roles and sources, Entra to the role landing", () => {
    const s = accessScreen("pulmini");
    expect(s).toMatchObject({ label: "Pulmini", path: "/pulmini", icon: "bus", blurb: "Mezzi, autisti, corse", parent: null });
    expect(whoEnters(s)).toBe("responsabile trasporti, autisti, Direzione");
    expect(s.sources).toEqual(["Master Flotta"]);
    expect(s.enter).toEqual({ href: "/aree/pulmini", via: "landing" });
    expect(s.insideFrom).toBe("landing");
    expect(s.inside).toEqual(findSatellite("pulmini")!.inside);
    expect(s.loginLive).toBe(R20_LOGIN_LIVE);
  });

  it("says 'ruoli da definire' when the registry has no roles", () => {
    const s = accessScreen("magazzino");
    expect(s.roles).toEqual([]);
    expect(whoEnters(s)).toBe("ruoli da definire");
    expect(s.sources).toEqual(["inventario kit (da caricare)"]);
    expect(s.enter).toEqual({ href: "/aree", via: "gateway" });
    expect(s.inside).toEqual([]);
    expect(s.insideFrom).toBe("none");
  });

  it("sub-areas inherit the parent landing and show registry blockers and flows in Italian", () => {
    const b = accessScreen("biglietteria");
    expect(b.parent).toEqual({ id: "tesoreria", label: "Tesoreria", path: "/tesoreria" });
    expect(b.blocker).toBe("fonte delle tariffe da confermare");
    expect(b.enter.href).toBe("/aree/tesoreria");
    expect(whoEnters(b)).toBe("addetti biglietteria");
    const a = accessScreen("acquisti");
    expect(a.inside).toEqual(["Percorso: richiesta → approvazione → ordine → fattura → pagamento"]);
    expect(a.enter.href).toBe("/aree/direzione");
    expect(accessScreen("magazzino-cassa").path).toBe("/tesoreria/magazzino");
  });

  it("partner and famiglia route to their existing role landings", () => {
    expect(accessScreen("partner").enter.href).toBe("/aree/sponsor");
    expect(accessScreen("famiglia").enter.href).toBe("/aree/famiglia");
    expect(whoEnters(accessScreen("famiglia"))).toBe("genitori e tutori registrati");
  });

  it("every Entra target is a real route or an existing role landing", () => {
    for (const id of ACCESS_SCREEN_IDS) {
      const { href } = accessScreen(id).enter;
      const m = /^\/aree\/([a-z-]+)$/.exec(href);
      if (m) expect(findSatellite(m[1]!), href).toBeDefined();
      else expect(routePaths.has(href), href).toBe(true);
    }
  });

  it("refuses areas without an access screen", () => {
    expect(() => accessScreen("quadro")).toThrow();
    expect(() => accessScreen("nope")).toThrow();
  });

  it("humanizes unknown roles and leaves unknown notes untouched", () => {
    expect(roleLabel("addetto-segreteria")).toBe("addetto segreteria");
    expect(localizeNote("Master Calendario")).toBe("Master Calendario");
    expect(localizeNote("Open-Meteo (to connect)")).toBe("Open-Meteo (da collegare)");
  });
});
