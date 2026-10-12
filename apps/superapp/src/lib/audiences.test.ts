import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { AUDIENCES, DOORS, doorOfSatellite, validateAudiences } from "./audiences";
import { SATELLITES } from "./satellites";

/** File-based routes → URL paths ("gestionale_.impianti.index.tsx" → "/gestionale/impianti"). */
function routePaths(): Set<string> {
  const dir = fileURLToPath(new URL("../routes", import.meta.url));
  const out = new Set<string>();
  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".tsx") || f.startsWith("__")) continue;
    const segs = f.replace(/\.tsx$/, "").split(".").map((s) => s.replace(/_$/, "")).filter((s) => s !== "index");
    out.add("/" + segs.join("/"));
  }
  out.add("/");
  return out;
}

describe("four doors (UD-078)", () => {
  const routes = routePaths();
  const slugs = SATELLITES.map((s) => s.slug);

  it("is a valid contract: every satellite in exactly one door, every task on an existing route", () => {
    expect(routes.has("/gestionale/impianti")).toBe(true);
    expect(validateAudiences(AUDIENCES, slugs, routes)).toEqual([]);
  });

  it("orders the doors fans, members, work, partners and keeps fans account-free", () => {
    expect(DOORS.map((d) => d.id)).toEqual(["tifosi", "associati", "lavoro", "partner"]);
    const fans = DOORS[0]!;
    expect(fans.login).toBe("none");
    expect(fans.tasks.some((t) => t.login)).toBe(false);
    expect(doorOfSatellite("famiglia")?.id).toBe("associati");
    expect(doorOfSatellite("tesoreria")?.id).toBe("lavoro");
  });

  it("reports broken contracts", () => {
    const bad = structuredClone(AUDIENCES);
    bad.doors[0]!.tasks.push({ label: "x", to: "/non-esiste", hint: "" });
    bad.doors[1]!.satellites.push("tifoso");
    const p = validateAudiences(bad, slugs, routes);
    expect(p.some((x) => x.includes("/non-esiste"))).toBe(true);
    expect(p.some((x) => x.includes('satellite "tifoso" is in'))).toBe(true);
  });
});
