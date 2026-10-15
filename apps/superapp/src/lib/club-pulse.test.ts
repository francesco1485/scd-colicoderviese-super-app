import { describe, expect, test } from "vitest";

import { clubPulse, compactLeft } from "./club-pulse";
import type { PublicEvent, PublicGroup } from "./public-snapshots";

function ev(p: Partial<PublicEvent>): PublicEvent {
  return {
    id: p.id ?? "x", date: p.date ?? "2026-10-17", time: p.time ?? "15:00", group: p.group ?? "u15", category: "", type: p.type ?? "CAMPIONATO",
    homeAway: p.homeAway ?? "CASA", opponent: p.opponent ?? "Rivale", venue: "", round: "", source: "", status: "OFFICIAL_CALENDAR",
    isVariation: false, notice: [], timeConfirmed: true, venueConfirmed: true, facilityReview: false,
  };
}
const groups: PublicGroup[] = [
  { id: "prima", label: "Prima Squadra", color: "#000", logo: null, count: 0 } as PublicGroup,
  { id: "u15", label: "U15", color: "#000", logo: null, count: 0 } as PublicGroup,
];
// 17/10/2026 14:00 Rome = 12:00Z
const SAT_14 = Date.parse("2026-10-17T12:00:00Z");

describe("club pulse", () => {
  test("next important kick-off and no live game before the hour", () => {
    const p = clubPulse([ev({ id: "a", time: "15:00" }), ev({ id: "p", group: "prima", date: "2026-10-18", time: "15:30" })], groups, SAT_14);
    expect(p.live).toBe(0);
    expect(p.next?.id).toBe("p");
    expect(p.next?.category).toBe("Prima");
    expect(p.next?.startMs).toBe(Date.parse("2026-10-18T13:30:00Z"));
  });
  test("a game in its 90 minutes counts as live; the next is the one still to start", () => {
    const p = clubPulse([ev({ id: "a", time: "13:30" }), ev({ id: "b", time: "18:00" })], groups, SAT_14);
    expect(p.live).toBe(1);
    expect(p.next?.id).toBe("b");
  });
  test("empty week", () => {
    expect(clubPulse([], groups, SAT_14)).toEqual({ live: 0, next: null, serverNow: SAT_14 });
  });
  test("compact time left", () => {
    expect(compactLeft(2 * 86400_000 + 4 * 3600_000)).toBe("2g 4h");
    expect(compactLeft(4 * 3600_000 + 12 * 60_000)).toBe("4h 12m");
    expect(compactLeft(5 * 60_000)).toBe("5m");
  });
});
