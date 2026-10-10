import { describe, expect, it } from "vitest";

import {
  CHRISTMAS_LARIO_CUP,
  confirmedCount,
  eventCountdown,
  eventPhase,
} from "./events";

describe("Christmas Lario Cup", () => {
  it("riporta i dati delle locandine ufficiali", () => {
    expect(CHRISTMAS_LARIO_CUP.dateLabel).toBe("Martedì 8 dicembre 2026");
    expect(CHRISTMAS_LARIO_CUP.cups.map((c) => c.city)).toEqual([
      "Colico (LC)",
      "Dervio (LC)",
    ]);
    expect(confirmedCount()).toBe(9);
    expect(CHRISTMAS_LARIO_CUP.goal).toEqual({ min: 32, max: 48 });
  });

  it("calcola fase e conto alla rovescia sull'orario ufficiale (ora solare)", () => {
    expect(eventPhase(Date.parse("2026-12-08T09:29:00Z"))).toBe("pre");
    expect(eventPhase(Date.parse("2026-12-08T09:30:00Z"))).toBe("live");
    expect(eventPhase(Date.parse("2026-12-08T18:00:00Z"))).toBe("post");
    expect(eventCountdown(Date.parse("2026-12-07T09:30:00Z"))).toEqual({
      d: 1,
      h: 0,
      m: 0,
      s: 0,
    });
    expect(eventCountdown(Date.parse("2026-12-08T10:00:00Z"))).toBeNull();
  });
});
