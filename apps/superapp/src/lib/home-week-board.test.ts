import { describe, expect, it } from "vitest";

import {
  gamesLabel,
  matchesWeekFilter,
  weekBoardEvents,
  weekDayLabel,
  weekGroups,
  weekRangeLabel,
  weekStrip,
} from "./home-week-board";
import type { PublicEvent } from "./public-snapshots";

const ev = (id: string, date: string, time: string, group: string, homeAway = "CASA"): PublicEvent => ({
  id, date, time, group, category: group, type: "Campionato", homeAway, opponent: "Avversario", venue: "Colico · Campo 1",
  round: "", source: "", status: "OFFICIAL_CALENDAR", isVariation: false, notice: [], timeConfirmed: true,
  venueConfirmed: true, facilityReview: false,
});

const TODAY = "2026-10-15"; // giovedì
const EVENTS = [
  ev("past", "2026-10-14", "18:00", "u15"),
  ev("a", "2026-10-17", "15:00", "u19"),
  ev("b", "2026-10-17", "10:30", "primicalci", "FUORI"),
  ev("c", "2026-10-18", "", "prima", "FUORI"),
  ev("d", "2026-10-18", "10:30", "u15"),
  ev("late", "2026-10-22", "10:00", "u16"),
];

describe("home week board", () => {
  it("keeps today and the next six days, in kick-off order, games without time last", () => {
    expect(weekBoardEvents(EVENTS, TODAY).map((e) => e.id)).toEqual(["b", "a", "d", "c"]);
  });

  it("draws seven days from today with the games of each day", () => {
    const strip = weekStrip(weekBoardEvents(EVENTS, TODAY), TODAY, "tutte");
    expect(strip).toHaveLength(7);
    expect(strip[0]).toMatchObject({ date: "2026-10-15", short: "GIO", day: 15, count: 0, today: true });
    expect(strip[2]).toMatchObject({ date: "2026-10-17", short: "SAB", day: 17, count: 2, today: false });
    expect(strip[6]!.date).toBe("2026-10-21");
  });

  it("filters on real data only: home games, agonistica, attività di base", () => {
    expect(matchesWeekFilter({ group: "u19", homeAway: "CASA" }, "casa")).toBe(true);
    expect(matchesWeekFilter({ group: "u19", homeAway: "FUORI" }, "casa")).toBe(false);
    const week = weekBoardEvents(EVENTS, TODAY);
    expect(weekStrip(week, TODAY, "casa")[2]!.count).toBe(1);
    expect(weekGroups(week, "base", TODAY).flatMap((g) => g.events.map((e) => e.id))).toEqual(["b"]);
  });

  it("groups by day with family-readable labels, and can show one day only", () => {
    const week = weekBoardEvents(EVENTS, TODAY);
    const groups = weekGroups(week, "tutte", TODAY);
    expect(groups.map((g) => g.label)).toEqual(["Sabato 17 ottobre", "Domenica 18 ottobre"]);
    expect(weekGroups(week, "tutte", TODAY, "2026-10-18").map((g) => g.date)).toEqual(["2026-10-18"]);
    expect(weekGroups(week, "tutte", TODAY, "2026-10-16")).toEqual([]);
  });

  it("names today, tomorrow and the week range", () => {
    expect(weekDayLabel("2026-10-15", TODAY)).toBe("Oggi · giovedì 15 ottobre");
    expect(weekDayLabel("2026-10-16", TODAY)).toBe("Domani · venerdì 16 ottobre");
    expect(weekRangeLabel(TODAY)).toBe("15 – 21 ottobre");
    expect(weekRangeLabel("2026-10-29")).toBe("29 ottobre – 4 novembre");
    expect(gamesLabel(1)).toBe("1 gara");
    expect(gamesLabel(6)).toBe("6 gare");
  });
});

describe("home mode", () => {
  it("is the club's week Monday–Thursday and match time Friday–Sunday", async () => {
    const { homeMode } = await import("./home-week-board");
    expect(homeMode("2026-10-12")).toBe("settimana"); // lunedì
    expect(homeMode("2026-10-15")).toBe("settimana"); // giovedì
    expect(homeMode("2026-10-16")).toBe("partite"); // venerdì
    expect(homeMode("2026-10-18")).toBe("partite"); // domenica
  });
});
