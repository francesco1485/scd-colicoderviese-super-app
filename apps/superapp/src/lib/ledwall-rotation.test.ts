import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import type { AssetRegistry } from "./asset-format";
import {
  LEDWALL_BOARD,
  LEDWALL_BOARD_PX,
  LEDWALL_CLUB_EVERY,
  LEDWALL_CLUB_TEXT,
  LEDWALL_HOME_DAYS,
  LEDWALL_SLOT_MS,
  LEDWALL_STILL,
  boardRect,
  dailyOrder,
  dayNumber,
  hasHomeMatch,
  isoWeekday,
  ledArt,
  ledwallSequence,
  msIntoRomeDay,
  showLedwallOnHome,
  slotIndexAt,
  stepIndex,
} from "./ledwall-rotation";
import { SPONSOR_ART } from "./logo-art.gen";
import { SPONSORS, sponsorLabel } from "./sponsors";

const APP = resolve(__dirname, "../..");
const REPO = resolve(APP, "../..");
const publicFile = (url: string) => resolve(APP, "public", url.slice(1));

const addDay = (day: string, n: number) => new Date(Date.parse(`${day}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

describe("LED wall · board geometry", () => {
  it("maps the 1920x1080 board rectangle to the agreed percentages", () => {
    expect(LEDWALL_BOARD_PX).toEqual({ x0: 246, y0: 422, x1: 1718, y1: 540 });
    expect(LEDWALL_BOARD.left).toBeCloseTo(12.8125, 3);
    expect(LEDWALL_BOARD.top).toBeCloseTo(39.074, 2);
    expect(LEDWALL_BOARD.width).toBeCloseTo(76.667, 2);
    expect(LEDWALL_BOARD.height).toBeCloseTo(10.926, 2);
    expect(boardRect({ x0: 0, y0: 0, x1: 960, y1: 540 }, { width: 1920, height: 1080 })).toEqual({ left: 0, top: 0, width: 50, height: 50 });
  });

  it("the CSS crop centre matches the board centre", () => {
    const css = readFileSync(resolve(APP, "src/styles.css"), "utf8");
    const cx = ((LEDWALL_BOARD_PX.x0 + LEDWALL_BOARD_PX.x1) / 2 / LEDWALL_STILL.width) * 100;
    const cy = ((LEDWALL_BOARD_PX.y0 + LEDWALL_BOARD_PX.y1) / 2 / LEDWALL_STILL.height) * 100;
    const num = (name: string) => Number(new RegExp(`${name}:\\s*([\\d.]+)%`).exec(css)?.[1]);
    expect(num("--ledrot-cx")).toBeCloseTo(cx, 3);
    expect(num("--ledrot-cy")).toBeCloseTo(cy, 2);
  });

  it("ships the still at 1280 and 1920 px, registered in the asset registry", () => {
    const registry = JSON.parse(readFileSync(resolve(REPO, "config/scd-assets.v1.json"), "utf8")) as AssetRegistry;
    for (const url of LEDWALL_STILL.srcSet.split(",").map((s) => s.trim().split(" ")[0]!)) {
      expect(existsSync(publicFile(url)), url).toBe(true);
      const e = registry.runtime_assets.find((a) => a.path === `apps/superapp/public${url}`);
      expect(e?.class, url).toBe("LED_BOARD_STILL");
    }
  });
});

describe("LED wall · daily order", () => {
  const day = "2026-10-13";

  it("is deterministic for a day and a permutation of all partners", () => {
    const a = dailyOrder(SPONSORS, day).map((s) => s.slug);
    const b = dailyOrder(SPONSORS, day).map((s) => s.slug);
    expect(a).toEqual(b);
    expect([...a].sort()).toEqual(SPONSORS.map((s) => s.slug).sort());
    expect(new Set(a).size).toBe(SPONSORS.length);
  });

  it("changes from one day to the next", () => {
    const a = dailyOrder(SPONSORS, day).map((s) => s.slug).join();
    const b = dailyOrder(SPONSORS, addDay(day, 1)).map((s) => s.slug).join();
    expect(a).not.toBe(b);
  });

  it("each partner opens the rotation exactly once over SPONSORS.length consecutive days", () => {
    const leads = new Map<string, number>();
    for (let i = 0; i < SPONSORS.length; i++) {
      const lead = dailyOrder(SPONSORS, addDay(day, i))[0]!.slug;
      leads.set(lead, (leads.get(lead) ?? 0) + 1);
    }
    expect(leads.size).toBe(SPONSORS.length);
    expect([...leads.values()].every((n) => n === 1)).toBe(true);
  });

  it("spreads positions fairly over many days (no partner stuck at the end)", () => {
    const n = SPONSORS.length;
    const sum = new Map<string, number>();
    const days = n * 20;
    for (let i = 0; i < days; i++) {
      dailyOrder(SPONSORS, addDay(day, i)).forEach((s, pos) => sum.set(s.slug, (sum.get(s.slug) ?? 0) + pos));
    }
    const mean = (n - 1) / 2;
    for (const [slug, total] of sum) expect(Math.abs(total / days - mean), slug).toBeLessThan(n * 0.2);
  });

  it("handles empty lists and invalid days without throwing", () => {
    expect(dailyOrder([], day)).toEqual([]);
    expect(dailyOrder(SPONSORS, "not-a-day")).toHaveLength(SPONSORS.length);
    expect(Number.isNaN(dayNumber("2026-13-40x"))).toBe(true);
    expect(dayNumber("1970-01-02")).toBe(1);
  });
});

describe("LED wall · slots", () => {
  const seq = ledwallSequence(SPONSORS, "2026-10-13");
  const partners = seq.filter((s) => s.kind === "partner");
  const clubs = seq.filter((s) => s.kind === "club");

  it("every partner exactly once per cycle (equal exposure), labels never invented", () => {
    expect(partners).toHaveLength(SPONSORS.length);
    for (const s of SPONSORS) {
      const slot = partners.find((p) => p.kind === "partner" && p.slug === s.slug);
      expect(slot, s.slug).toBeDefined();
      if (slot?.kind === "partner") {
        expect(slot.label).toBe(sponsorLabel(s));
        if (!s.nameVerified || !s.name) expect(slot.label).toBe("Sponsor della ColicoDerviese");
      }
    }
    expect(partners.map((p) => (p.kind === "partner" ? p.ordinal : 0))).toEqual(SPONSORS.map((_, i) => i + 1));
  });

  it("a club slot after every 6 partners", () => {
    expect(LEDWALL_CLUB_EVERY).toBe(6);
    expect(clubs).toHaveLength(Math.floor(SPONSORS.length / 6));
    let run = 0;
    for (const s of seq) {
      if (s.kind === "club") {
        expect(run).toBe(6);
        run = 0;
      } else run++;
    }
    expect(new Set(seq.map((s) => s.key)).size).toBe(seq.length);
    expect(`${LEDWALL_CLUB_TEXT.kicker} · ${LEDWALL_CLUB_TEXT.title}`).toBe("PARTNER UFFICIALE · S.C.D. COLICODERVIESE 2026/27");
  });

  it("uses the transparent cut-out when present, else the original file, and every file exists", () => {
    for (const s of SPONSORS) {
      const src = ledArt(s);
      expect(src).toBe(SPONSOR_ART[s.slug]?.src ?? s.src);
      expect(existsSync(publicFile(src)), src).toBe(true);
    }
    expect(ledArt({ slug: "nope", src: "/media/x.webp" })).toBe("/media/x.webp");
  });

  it("slot of the moment follows the Rome-day clock, 4 s per slot, wrapping", () => {
    expect(LEDWALL_SLOT_MS).toBe(4_000);
    expect(slotIndexAt(43, 0)).toBe(0);
    expect(slotIndexAt(43, 3_999)).toBe(0);
    expect(slotIndexAt(43, 4_000)).toBe(1);
    expect(slotIndexAt(43, 43 * 4_000)).toBe(0);
    expect(slotIndexAt(0, 10_000)).toBe(0);
    expect(slotIndexAt(5, Number.NaN)).toBe(0);
    expect(stepIndex(0, -1, 5)).toBe(4);
    expect(stepIndex(4, 1, 5)).toBe(0);
  });

  it("measures the time into the Rome day across summer and winter time", () => {
    // 13/10/2026 10:00:05.250 in Rome (CEST, UTC+2) = 08:00:05.250Z.
    expect(msIntoRomeDay(Date.parse("2026-10-13T08:00:05.250Z"))).toBe((10 * 3600 + 5) * 1000 + 250);
    // 15/01/2027 00:30 in Rome (CET, UTC+1) = 14/01 23:30Z.
    expect(msIntoRomeDay(Date.parse("2027-01-14T23:30:00Z"))).toBe(30 * 60 * 1000);
    expect(msIntoRomeDay(Number.NaN)).toBe(0);
  });
});

describe("LED wall · days on the home (single config constant)", () => {
  it("is on every day by default (UD-110: part of the single sponsor zone)", () => {
    expect(LEDWALL_HOME_DAYS.weekdays).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(isoWeekday("2026-10-12")).toBe(1);
    expect(isoWeekday("2026-10-13")).toBe(2);
    expect(isoWeekday("2026-10-15")).toBe(4);
    expect(isoWeekday("2026-10-18")).toBe(7);
    expect(showLedwallOnHome("2026-10-12")).toBe(true);
    expect(showLedwallOnHome("2026-10-15")).toBe(true);
    for (const d of ["2026-10-13", "2026-10-14", "2026-10-16", "2026-10-17", "2026-10-18"]) expect(showLedwallOnHome(d), d).toBe(true);
    // The constant still switches days off when the Direzione wants (e.g. only Monday and Thursday).
    expect(showLedwallOnHome("2026-10-13", {}, { weekdays: [1, 4], homeMatchDays: false })).toBe(false);
  });

  it("also on a day with a home game, and fails closed on an invalid day", () => {
    expect(showLedwallOnHome("2026-10-17", { homeMatch: true })).toBe(true);
    expect(showLedwallOnHome("2026-10-17", { homeMatch: true }, { weekdays: [1, 4], homeMatchDays: false })).toBe(false);
    expect(showLedwallOnHome("bad", { homeMatch: true })).toBe(false);
    expect(showLedwallOnHome("2026-10-13", {}, { weekdays: [2], homeMatchDays: false })).toBe(true);
  });

  it("detects home games of the day only", () => {
    const items = [
      { date: "2026-10-17", kind: "Gara", homeAway: "CASA" },
      { date: "2026-10-18", kind: "Gara", homeAway: "FUORI" },
      { date: "2026-10-19", kind: "Allenamento", homeAway: "CASA" },
    ];
    expect(hasHomeMatch(items, "2026-10-17")).toBe(true);
    expect(hasHomeMatch(items, "2026-10-18")).toBe(false);
    expect(hasHomeMatch(items, "2026-10-19")).toBe(false);
    expect(hasHomeMatch([], "2026-10-17")).toBe(false);
  });
});
