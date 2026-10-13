import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { dayMonth, initiativesOn } from "./initiatives";
import { INITIATIVES } from "./initiatives.server";
import { isIsoDay } from "./public-window";

const APP = resolve(__dirname, "../..");
const REPO = resolve(APP, "../..");
const perico = INITIATIVES.find((i) => i.id === "lezioni-tecnico-coordinative-perico");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

describe("time-limited initiatives", () => {
  it("every initiative has a valid, ordered window and an existing route and flyer", () => {
    const tree = readFileSync(resolve(APP, "src/routeTree.gen.ts"), "utf8");
    const registry = JSON.parse(readFileSync(resolve(REPO, "config/scd-assets.v1.json"), "utf8")) as {
      runtime_assets: { path: string; note?: string }[];
    };
    expect(new Set(INITIATIVES.map((i) => i.id)).size).toBe(INITIATIVES.length);
    for (const i of INITIATIVES) {
      expect(isIsoDay(i.showFrom) && isIsoDay(i.showUntil)).toBe(true);
      expect(i.showFrom <= i.showUntil).toBe(true);
      expect(tree).toContain(`'${i.href}'`);
      expect(existsSync(resolve(APP, "public", i.flyer.src.slice(1)))).toBe(true);
      expect(registry.runtime_assets.some((a) => a.path === `apps/superapp/public${i.flyer.src}`)).toBe(true);
    }
  });

  it("Perico lessons: content as given by the Direzione and the coach's flyer", () => {
    expect(perico).toBeDefined();
    if (!perico) return;
    expect(perico.title).toBe("Lezioni tecnico-coordinative");
    expect(perico.subtitle).toBe("con il mister Alessandro Perico (UEFA C, laurea in Scienze motorie)");
    expect(perico.organizer.credentials).toEqual(["Laurea in Scienza, Tecnica e didattica dello Sport", "Tecnico UEFA C"]);
    expect(perico.contact).toEqual({ label: "Info e iscrizioni: mister Perico", display: "348 520 0579", tel: "+393485200579" });
    expect(perico.href).toBe("/eventi/lezioni-tecnico-coordinative");
    expect(perico.flyer.note).toMatch(/non atleti SCD/);
    expect([perico.showFrom, perico.showUntil]).toEqual(["2026-10-18", "2026-11-30"]);
    expect(dayMonth(perico.showUntil)).toBe("30 novembre");
  });

  it("is invisible before the start, visible inside, gone after the end", () => {
    expect(initiativesOn(INITIATIVES, "2026-10-13").map((i) => i.id)).not.toContain(perico?.id);
    expect(initiativesOn(INITIATIVES, "2026-10-17").map((i) => i.id)).not.toContain(perico?.id);
    expect(initiativesOn(INITIATIVES, "2026-10-18").map((i) => i.id)).toContain(perico?.id);
    expect(initiativesOn(INITIATIVES, "2026-11-30").map((i) => i.id)).toContain(perico?.id);
    expect(initiativesOn(INITIATIVES, "2026-12-01").map((i) => i.id)).not.toContain(perico?.id);
  });

  it("the list module is never statically imported by app code (stays out of the browser bundle)", () => {
    const offenders = walk(resolve(APP, "src"))
      .filter((f) => /\.(tsx?)$/.test(f) && !/\.test\.tsx?$/.test(f))
      .filter((f) => /^\s*import\s[^;]*from\s+["'][^"']*initiatives\.server["']/m.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });
});
