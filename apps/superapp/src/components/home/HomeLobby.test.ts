import { describe, expect, it } from "vitest";

import type { PublicEvent } from "@/lib/public-snapshots";

import { birthYears, countdownLabel, nextHome, romeMs } from "./HomeLobby";

describe("home lobby helpers", () => {
  it("writes birth years only from the master", () => {
    expect(birthYears({ years: ["2013", "2012"] })).toBe("Nati 2012–2013");
    expect(birthYears({ years: ["2014"] })).toBe("Nati 2014");
    expect(birthYears({ years: [] })).toBe("");
    expect(birthYears(undefined)).toBe("");
  });

  it("counts down to the next home game in plain Italian", () => {
    const M = 60_000;
    expect(countdownLabel(12 * M)).toBe("tra 12 minuti");
    expect(countdownLabel(1 * M)).toBe("tra 1 minuto");
    expect(countdownLabel(4 * 60 * M + 10 * M)).toBe("tra 4 ore e 10 minuti");
    expect(countdownLabel(60 * M)).toBe("tra 1 ora");
    expect(countdownLabel(31 * 60 * M)).toBe("tra 1 giorno e 7 ore");
    expect(countdownLabel(48 * 60 * M)).toBe("tra 2 giorni");
    expect(countdownLabel(-5 * M)).toBe("tra 0 minuti");
  });

  it("reads match times as Rome wall clock, across the change of hour on 25/10", () => {
    expect(new Date(romeMs("2026-10-17", "15:00")).toISOString()).toBe("2026-10-17T13:00:00.000Z"); // CEST
    expect(new Date(romeMs("2026-10-31", "15:00")).toISOString()).toBe("2026-10-31T14:00:00.000Z"); // CET
  });

  it("finds the next home game with a time, skipping away games, games without time and games already started", () => {
    const ev = (id: string, date: string, time: string, homeAway: string) => ({ id, date, time, homeAway }) as PublicEvent;
    const now = Date.parse("2026-10-17T13:30:00Z"); // sabato 15:30 a Roma
    const list = [
      ev("started", "2026-10-17", "15:00", "CASA"),
      ev("away", "2026-10-17", "17:00", "FUORI"),
      ev("notime", "2026-10-18", "", "CASA"),
      ev("next", "2026-10-18", "10:30", "CASA"),
      ev("later", "2026-10-18", "15:00", "CASA"),
    ];
    expect(nextHome(list, now)?.e.id).toBe("next");
    expect(nextHome([], now)).toBeNull();
  });
});
