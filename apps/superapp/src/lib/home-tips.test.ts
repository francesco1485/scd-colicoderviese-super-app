/** UD-116 tip of the day, since UD-118 the only place of the tip-only characters (plus Vera's reminders). */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { CAST_PERSONAS, TIP_ONLY_IDS, castCopyProblems } from "./cast-personas";
import { detectDistress } from "./cast-safety";
import { ACANFORA_DAILY_TIPS } from "./first-aid-info";
import { ERA_TIPS, tipProblems } from "./era-nutrition-tips";
import { TIP_ORDER, TIP_PERSONA, VERA_TIPS, dailyTip, tipPersonaOn } from "./home-tips";
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

describe("tip of the day (UD-116, UD-118)", () => {
  it("rotates the five tip-only characters and Vera day by day, the same for everybody on a Rome day", () => {
    expect([...TIP_ORDER].sort()).toEqual([...TIP_ONLY_IDS, "vera"].sort());
    const n = TIP_ORDER.length;
    const seq = Array.from({ length: n * 2 }, (_, i) => tipPersonaOn(day(i)));
    expect(new Set(seq.slice(0, n))).toEqual(new Set(TIP_ORDER));
    expect(seq.slice(n)).toEqual(seq.slice(0, n));
    expect(dailyTip(day(0))).toEqual(dailyTip(day(0)));
  });

  it("uses the existing content of every character", () => {
    for (let i = 0; i < 60; i++) {
      const t = dailyTip(day(i));
      if (t.persona === "era") expect(ERA_TIPS.map((x) => x.title)).toContain(t.title);
      else if (t.persona === "acanfora") expect(ACANFORA_DAILY_TIPS.map((x) => x.title)).toContain(t.title);
      else if (t.persona === "vera") expect(VERA_TIPS.map((x) => x.title)).toContain(t.title);
      else expect(CAST_PERSONAS[t.persona].tips.map((x) => x.title)).toContain(t.title);
      expect(t.disclaimer.length).toBeGreaterThan(20);
      expect(TIP_PERSONA[t.persona].name.length).toBeGreaterThan(2);
    }
  });

  it("keeps every rotating tip short, general and safe for minors: no digits, no plans, no therapy, no distress patterns", () => {
    for (let i = 0; i < 60; i++) {
      const t = dailyTip(day(i));
      const text = `${t.title} ${t.text}`;
      expect(text.length, t.title).toBeLessThan(260);
      expect(detectDistress(text), t.title).toBeNull();
      if (t.persona !== "vera") expect(castCopyProblems(t.persona, text), t.title).toEqual([]);
      if (t.link) {
        expect(routes.has(t.link.to), t.link.to).toBe(true);
        if (!t.link.members) expect(http.isPublicPath(t.link.to), t.link.to).toBe(true);
      }
    }
  });

  it("keeps Vera's reminders free of numbers and personal data, linked to existing pages, members pages flagged", () => {
    for (const t of VERA_TIPS) {
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
