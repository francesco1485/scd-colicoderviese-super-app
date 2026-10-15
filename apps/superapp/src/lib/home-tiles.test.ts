import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { bigTiles, smallTiles, tileRoutes, TRAINING_AFTER_SIGN_IN } from "./home-tiles";
import { MEMBERS_ONLY_PREFIXES, isPublicPath } from "./http-policy";

const membersOnly = (to: string) => MEMBERS_ONLY_PREFIXES.some((p) => to === p || to.startsWith(`${p}/`));
/** Source without comments: what can reach the page. */
const code = (f: string) =>
  readFileSync(resolve(__dirname, f), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

describe("home tiles (Francesco's home board, 15/10/2026)", () => {
  it("four big tiles in the board order and two small tiles", () => {
    expect(bigTiles().map((t) => t.label)).toEqual(["Gare", "Allenamenti", "Eventi", "Iniziative"]);
    expect(smallTiles(false).map((t) => t.id)).toEqual(["campi", "gioca"]);
    for (const t of smallTiles(true)) expect(t.hint?.length ?? 0).toBeGreaterThan(5);
  });

  it("Allenamenti says it is for members and opens the sign-in, which then opens the trainings", () => {
    const t = bigTiles().find((x) => x.id === "allenamenti")!;
    expect(t.members).toBe(true);
    expect(t.hint).toMatch(/soci/);
    expect(t.to).toBe("/accedi");
    expect(t.search).toEqual({ next: TRAINING_AFTER_SIGN_IN });
  });

  it("Gioca con noi never promises a form while the public forms are paused", () => {
    const paused = smallTiles(false).find((t) => t.id === "gioca")!;
    expect(paused.to).toBe("/contatti");
    expect(paused.hint).not.toMatch(/modulo|ricontatta|gratuit/i);
    expect(smallTiles(true).find((t) => t.id === "gioca")!.to).toBe("/entra");
  });
});

/**
 * The public home is rendered for visitors only (routes/index.tsx): none of its tiles or links may open a page that
 * answers a visitor with the access screen or a redirect to /accedi (members-only prefixes of http-policy.ts).
 */
describe("guest home never links to members-only pages", () => {
  it("tiles", () => {
    for (const to of [...tileRoutes(false), ...tileRoutes(true)]) {
      expect(membersOnly(to), to).toBe(false);
      if (to !== "/accedi") expect(isPublicPath(to), to).toBe(true);
    }
  });
  it("every link written in the home components", () => {
    for (const f of ["../components/home/HomeBoard.tsx", "../components/home/PublicHome.tsx"])
      for (const m of code(f).matchAll(/to="([^"]+)"/g)) expect(membersOnly(m[1] ?? ""), `${f}: ${m[1]}`).toBe(false);
  });
});

describe("every tile link is a real route", () => {
  const tree = readFileSync(resolve(__dirname, "../routeTree.gen.ts"), "utf8");
  const routes = new Set([...tree.matchAll(/fullPath: '([^']+)'/g)].map((m) => (m[1] ?? "").replace(/\/$/, "") || "/"));
  it("tiles and the page reached after sign-in", () => {
    for (const to of [...tileRoutes(false), ...tileRoutes(true), TRAINING_AFTER_SIGN_IN]) expect(routes.has(to), to).toBe(true);
  });
  it("Iniziative scrolls to the initiatives section of /eventi", () => {
    expect(bigTiles().find((t) => t.id === "iniziative")?.hash).toBe("iniziative");
    expect(code("../routes/eventi.index.tsx")).toMatch(/id="iniziative"/);
  });
});
