import { describe, expect, it } from "vitest";

import type { PublicEvent } from "./public-snapshots";
import { countdownParts, nextGame, nextHome } from "./home-next-game";

const ev = (id: string, date: string, time: string, homeAway = "CASA") => ({ id, date, time, homeAway }) as PublicEvent;
const NOW = Date.parse("2026-10-17T13:30:00Z"); // sabato 15:30 a Roma

describe("prossima gara (I-261017-04)", () => {
  it("splits the countdown into days, hours and minutes", () => {
    const M = 60_000;
    expect(countdownParts(0)).toEqual({ d: 0, h: 0, m: 0 });
    expect(countdownParts(-5 * M)).toEqual({ d: 0, h: 0, m: 0 });
    expect(countdownParts(59_999)).toEqual({ d: 0, h: 0, m: 0 });
    expect(countdownParts(12 * M)).toEqual({ d: 0, h: 0, m: 12 });
    expect(countdownParts((2 * 1440 + 3 * 60 + 7) * M)).toEqual({ d: 2, h: 3, m: 7 });
    expect(countdownParts(1440 * M)).toEqual({ d: 1, h: 0, m: 0 });
  });

  it("takes the next game of the club, home or away, skipping games already started", () => {
    const list = [ev("started", "2026-10-17", "15:00"), ev("away", "2026-10-17", "17:00", "FUORI"), ev("home", "2026-10-18", "10:30")];
    const n = nextGame(list, NOW);
    expect(n?.e.id).toBe("away");
    expect(n?.hasTime).toBe(true);
    expect(n?.at).toBe(Date.parse("2026-10-17T15:00:00Z"));
    // The desktop helper keeps its home-only meaning.
    expect(nextHome(list, NOW)?.e.id).toBe("home");
  });

  it("returns null when no game falls in the next 14 days", () => {
    expect(nextGame([], NOW)).toBeNull();
    expect(nextGame([ev("far", "2026-11-05", "15:00"), ev("past", "2026-10-10", "15:00")], NOW)).toBeNull();
    // Exactly 14 days later: 31/10 is in CET (UTC+1) after the change of hour on 25/10, so 14:30 Rome = 13:30Z.
    expect(nextGame([ev("edge", "2026-10-31", "14:30")], NOW)?.e.id).toBe("edge");
    expect(nextGame([ev("edge", "2026-10-31", "14:31")], NOW)).toBeNull();
  });

  it("keeps a game without time for the whole day and counts the games at the same time", () => {
    const n = nextGame([ev("notime", "2026-10-17", ""), ev("later", "2026-10-18", "10:30")], NOW);
    expect(n?.e.id).toBe("notime");
    expect(n?.hasTime).toBe(false);
    const s = nextGame([ev("a", "2026-10-18", "10:30"), ev("b", "2026-10-18", "10:30", "FUORI"), ev("c", "2026-10-18", "11:00")], NOW);
    expect(s?.sameSlot).toBe(1);
  });
});
