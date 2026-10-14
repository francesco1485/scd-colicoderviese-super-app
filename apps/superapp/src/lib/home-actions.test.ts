/** UD-116 quick actions: at most six, different per person type, only existing routes. */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  MAX_QUICK_ACTIONS,
  audienceFor,
  quickActionRoutes,
  quickActions,
  type HomeAudience,
} from "./home-actions";
import * as http from "./http-policy";

const APP = resolve(__dirname, "../..");
const routes = new Set(
  [
    ...readFileSync(resolve(APP, "src/routeTree.gen.ts"), "utf8").matchAll(
      /fullPath: '([^']+)'/g,
    ),
  ].map((m) => m[1]!.replace(/\/$/, "") || "/"),
);
const AUDIENCES: readonly HomeAudience[] = ["visitatore", "famiglia", "staff"];

describe("home quick actions (UD-116)", () => {
  it("every target route exists", () => {
    for (const to of quickActionRoutes()) expect(routes.has(to), to).toBe(true);
  });

  it("gives each audience at most six buttons, all different, with a label and a hint", () => {
    for (const a of AUDIENCES) {
      const list = quickActions(a);
      expect(list.length, a).toBeGreaterThan(0);
      expect(list.length, a).toBeLessThanOrEqual(MAX_QUICK_ACTIONS);
      expect(new Set(list.map((x) => x.id)).size).toBe(list.length);
      for (const x of list) {
        expect(x.label.trim()).not.toBe("");
        expect(x.hint.trim()).not.toBe("");
      }
    }
  });

  it("matches the Direzione's lists for each kind of person", () => {
    expect(quickActions("visitatore").map((a) => a.id)).toEqual([
      "prova",
      "partita",
      "dove",
      "card",
      "installa",
      "segreteria",
    ]);
    expect(quickActions("famiglia").map((a) => a.id)).toEqual([
      "convocazioni",
      "pulmino",
      "calendario-figlio",
      "quote",
      "documenti",
      "segreteria",
    ]);
    expect(quickActions("staff").map((a) => a.id)).toEqual([
      "squadre",
      "presenze",
      "distinta",
      "campo",
      "compiti",
      "comunicazioni",
    ]);
  });

  it("sends visitors only to public pages (the sign-up form is open but never cached)", () => {
    for (const a of quickActions("visitatore")) {
      if (a.to === "/entra") continue;
      expect(http.isPublicPath(a.to), a.to).toBe(true);
    }
  });

  it("marks the entries that use the closest existing page instead of a missing one", () => {
    const closest = AUDIENCES.flatMap((a) => quickActions(a)).filter(
      (a) => a.closest,
    );
    expect(closest.map((a) => a.id).sort()).toEqual([
      "compiti",
      "partita",
      "presenze",
    ]);
  });

  it("decides the audience from the verified roles: staff first, then family/athlete, else visitor", () => {
    expect(audienceFor([], false)).toBe("visitatore");
    expect(audienceFor(["mister"], false)).toBe("visitatore");
    expect(audienceFor([], true)).toBe("visitatore");
    expect(audienceFor(["famiglia"], true)).toBe("famiglia");
    expect(audienceFor(["atleta"], true)).toBe("famiglia");
    expect(audienceFor(["partner"], true)).toBe("visitatore");
    expect(audienceFor(["famiglia", "mister"], true)).toBe("staff");
    expect(audienceFor(["segreteria"], true)).toBe("staff");
  });

  it("opens the child's own team calendar when the family has exactly one team", () => {
    const one = quickActions("famiglia", { childGroups: ["u15", "u15"] }).find(
      (a) => a.id === "calendario-figlio",
    );
    expect(one?.search).toEqual({ annata: "u15" });
    const two = quickActions("famiglia", {
      childGroups: ["u15", "pulcini"],
    }).find((a) => a.id === "calendario-figlio");
    expect(two?.search).toEqual({ vista: "prossime" });
    const none = quickActions("famiglia").find(
      (a) => a.id === "calendario-figlio",
    );
    expect(none?.search).toEqual({ vista: "prossime" });
  });

  it("points family hashes at sections that exist on /famiglia", () => {
    const src =
      readFileSync(resolve(APP, "src/routes/famiglia.tsx"), "utf8") +
      readFileSync(
        resolve(APP, "src/components/scd/TransportRequestCard.tsx"),
        "utf8",
      );
    for (const a of quickActions("famiglia").filter(
      (x) => x.to === "/famiglia" && x.hash,
    ))
      expect(src, a.hash).toContain(`id="${a.hash}"`);
    const mister = readFileSync(
      resolve(APP, "src/routes/gestionale.mister.tsx"),
      "utf8",
    );
    for (const a of quickActions("staff").filter(
      (x) => x.to === "/gestionale/mister" && x.hash,
    ))
      expect(mister, a.hash).toContain(`id="${a.hash}"`);
  });
});
