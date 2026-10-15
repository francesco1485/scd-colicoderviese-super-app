import { describe, expect, it } from "vitest";

import { boardDate, gamesLeft, nextBoardMatch } from "./home-board";
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
