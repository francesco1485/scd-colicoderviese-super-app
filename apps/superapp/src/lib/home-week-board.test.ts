import { describe, expect, it } from "vitest";

import { weekBoardEvents } from "./home-week-board";
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

});
