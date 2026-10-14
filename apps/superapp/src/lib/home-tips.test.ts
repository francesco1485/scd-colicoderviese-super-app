/** UD-116 tip of the day: Era, Dottor Acanfora and Genny in rotation, from their content modules. */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { ACANFORA_DAILY_TIPS } from "./first-aid-info";
import { ERA_TIPS, tipProblems } from "./era-nutrition-tips";
import { GENNY_TIPS, TIP_ORDER, dailyTip, tipPersonaOn } from "./home-tips";
import * as http from "./http-policy";

const APP = resolve(__dirname, "../..");
const routes = new Set(
  [
    ...readFileSync(resolve(APP, "src/routeTree.gen.ts"), "utf8").matchAll(
      /fullPath: '([^']+)'/g,
    ),
  ].map((m) => m[1]!.replace(/\/$/, "") || "/"),
);
const day = (n: number) =>
  new Date(Date.UTC(2026, 9, 14 + n)).toISOString().slice(0, 10);

describe("tip of the day (UD-116)", () => {
  it("rotates Era, Acanfora and Genny day by day, the same for everybody on a Rome day", () => {
    const seq = [0, 1, 2, 3, 4, 5].map((i) => tipPersonaOn(day(i)));
    expect(new Set(seq.slice(0, 3))).toEqual(new Set(TIP_ORDER));
    expect(seq.slice(3)).toEqual(seq.slice(0, 3));
    expect(dailyTip(day(0))).toEqual(dailyTip(day(0)));
  });

  it("uses the existing content of Era and Acanfora", () => {
    for (let i = 0; i < 30; i++) {
      const t = dailyTip(day(i));
      if (t.persona === "era")
        expect(ERA_TIPS.map((x) => x.title)).toContain(t.title);
      if (t.persona === "acanfora")
        expect(ACANFORA_DAILY_TIPS.map((x) => x.title)).toContain(t.title);
      if (t.persona === "genny")
        expect(GENNY_TIPS.map((x) => x.title)).toContain(t.title);
      expect(t.disclaimer.length).toBeGreaterThan(20);
    }
  });

  it("keeps Genny's reminders free of numbers and personal data, linked to existing pages, members pages flagged", () => {
    for (const t of GENNY_TIPS) {
      expect(
        tipProblems(`${t.title} ${t.text}`).filter(
          (p) => p === "contains digits",
        ),
        t.id,
      ).toEqual([]);
      expect(routes.has(t.to), t.to).toBe(true);
      if (!t.members && !["/entra", "/documenti"].includes(t.to))
        expect(http.isPublicPath(t.to), t.to).toBe(true);
      if (["/famiglia", "/infermeria"].includes(t.to))
        expect(t.members, t.id).toBe(true);
    }
  });
});
