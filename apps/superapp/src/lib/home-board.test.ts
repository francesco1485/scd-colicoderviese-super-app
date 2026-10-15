import { describe, expect, it } from "vitest";

import { boardDate, boardRank, countdownParts, gamesLeft, kickoffMs, nextBoardMatch, nextHomeKickoff } from "./home-board";
import type { TodayEntry } from "./home-today";

const entry = (over: Partial<TodayEntry>): TodayEntry => ({
  id: "x",
  kind: "gara",
  date: "2026-10-18",
  time: "15:30",
  end: "",
  group: "prima",
  groups: ["prima"],
  team: "Prima Squadra",
  opponent: "Ars Rovagnate",
  homeAway: "FUORI",
  place: "La Valletta Brianza",
  changes: [],
  pending: [],
  forNames: [],
  ...over,
});

// 17/10/2026 16:00 Europe/Rome (UTC+2).
const SAT_16 = Date.UTC(2026, 9, 17, 14, 0);

describe("boardDate", () => {
  it("formats the board date block in Italian", () => {
    expect(boardDate("2026-10-18")).toEqual({ wd: "DOM", day: "18", month: "OTT" });
    expect(boardDate("2026-11-10")).toEqual({ wd: "MAR", day: "10", month: "NOV" });
  });
  it("rejects invalid dates", () => {
    expect(boardDate("2026-02-31")).toBeNull();
    expect(boardDate("18/10/2026")).toBeNull();
  });
});

describe("nextBoardMatch and gamesLeft", () => {
  const done = entry({ id: "a", date: "2026-10-17", time: "10:00", group: "u15" });
  const next = entry({ id: "b", date: "2026-10-17", time: "18:00", group: "u16", homeAway: "CASA" });
  const later = entry({ id: "c" });
  const training = entry({ id: "t", kind: "allenamento", date: "2026-10-17", time: "17:00" });

  it("skips finished games and trainings", () => {
    expect(nextBoardMatch([done, training, next, later], SAT_16)?.id).toBe("b");
    expect(gamesLeft([done, training, next, later], SAT_16)).toBe(2);
  });
  it("is null and zero when nothing is left", () => {
    expect(nextBoardMatch([done], SAT_16)).toBeNull();
    expect(gamesLeft([], SAT_16)).toBe(0);
  });
  it("keeps a game without time (unknown is not over)", () => {
    expect(nextBoardMatch([entry({ id: "u", date: "2026-10-17", time: "" })], SAT_16)?.id).toBe("u");
  });
});

describe("countdown to the next home game", () => {
  it("converts Rome time to UTC in summer and winter", () => {
    expect(kickoffMs({ date: "2026-10-17", time: "18:00" })).toBe(Date.UTC(2026, 9, 17, 16, 0));
    expect(kickoffMs({ date: "2026-11-08", time: "15:00" })).toBe(Date.UTC(2026, 10, 8, 14, 0));
    expect(kickoffMs({ date: "2026-10-17", time: "" })).toBeNull();
  });
  it("picks the next home game with a time, skipping away and started games", () => {
    const away = entry({ id: "a", date: "2026-10-17", time: "17:00", homeAway: "FUORI" });
    const started = entry({ id: "s", date: "2026-10-17", time: "15:00", homeAway: "CASA" });
    const home = entry({ id: "h", date: "2026-10-17", time: "18:00", homeAway: "CASA" });
    expect(nextHomeKickoff([started, away, home], SAT_16)?.entry.id).toBe("h");
    expect(nextHomeKickoff([started, away], SAT_16)).toBeNull();
  });
  it("formats days and hh:mm:ss", () => {
    expect(countdownParts(((26 * 60 + 3) * 60 + 9) * 1000)).toEqual({ days: 1, hh: "02", mm: "03", ss: "09" });
    expect(countdownParts(-5)).toEqual({ days: 0, hh: "00", mm: "00", ss: "00" });
  });
});

describe("boardRank: the club's most important next game", () => {
  const ago = (g: string) => ["prima", "u16", "u19"].includes(g);
  const rank = (e: TodayEntry) => boardRank(e, ago);
  it("prefers Prima Squadra, then agonistica, then base; confirmed before pending", () => {
    const base = entry({ id: "base", date: "2026-10-17", time: "10:30", group: "primi", pending: ["Orario da confermare"] });
    const u16 = entry({ id: "u16", date: "2026-10-17", time: "18:00", group: "u16" });
    const prima = entry({ id: "prima" });
    expect(nextBoardMatch([base, u16, prima], SAT_16 - 6 * 3600_000, rank)?.id).toBe("prima");
    expect(nextBoardMatch([base, u16], SAT_16 - 6 * 3600_000, rank)?.id).toBe("u16");
    expect(nextBoardMatch([base], SAT_16 - 6 * 3600_000, rank)?.id).toBe("base");
  });
});
