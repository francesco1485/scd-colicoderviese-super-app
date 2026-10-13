import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { isPublicPath } from "@/lib/http-policy";

import { HALL_DOORS } from "./hall";

const routeTree = readFileSync(fileURLToPath(new URL("../../routeTree.gen.ts", import.meta.url)), "utf8");
const routePaths = new Set([...routeTree.matchAll(/\b(?:path|fullPath): '([^']+)'/g)].map((m) => (m[1]!.length > 1 ? m[1]!.replace(/\/$/, "") : m[1]!)));

describe("hall doors", () => {
  it("covers the ground floor: chi siamo, partner, calendario, campi, eventi, contatti (teams are inside, UD-100)", () => {
    expect(HALL_DOORS.map((d) => d.to)).toEqual(["/societa", "/sponsor", "/calendario", "/impianti", "/eventi", "/contatti"]);
  });

  it("points every door to a real public route (no 404, no reserved area)", () => {
    for (const d of HALL_DOORS) {
      expect(routePaths.has(d.to), d.to).toBe(true);
      expect(d.to, d.to).not.toMatch(/^\/(gestionale|quadro|core|aree|direzione|tesoreria|segreteria)/);
      expect(isPublicPath(d.to), d.to).toBe(true);
    }
  });
});
