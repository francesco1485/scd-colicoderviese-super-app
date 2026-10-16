import { describe, expect, it } from "vitest";

import type { PublicEvent } from "@/lib/public-snapshots";

import { countdownLabel, monthGrid, nextHome, romeMs, sessionRunning, splitLive, weekOf } from "./HomeLobby";

describe("home lobby helpers", () => {
  it("moves a game being played out of the strip into the In corso box and drops finished games", () => {
    const ev = (id: string, time: string) => ({ id, date: "2026-10-17", time, homeAway: "CASA" }) as PublicEvent;
    const now = Date.parse("2026-10-17T13:30:00Z"); // sabato 15:30 a Roma
    const { live, strip } = splitLive([ev("done", "09:00"), ev("live", "15:00"), ev("next", "17:00"), ev("notime", "")], now);
    expect(live.map((e) => e.id)).toEqual(["live"]);
    expect(strip.map((e) => e.id)).toEqual(["next", "notime"]);
  });

  it("marks a training session as running only between start and end", () => {
    const r = { time: "17:20", end: "18:50" };
    expect(sessionRunning(r, "17:19")).toBe(false);
    expect(sessionRunning(r, "17:20")).toBe(true);
    expect(sessionRunning(r, "18:49")).toBe(true);
    expect(sessionRunning(r, "18:50")).toBe(false);
    expect(sessionRunning({ time: "17:20", end: "" }, "17:30")).toBe(false);
  });

  it("builds a Monday-first month and week", () => {
    const oct = monthGrid("2026-10"); // 1 ottobre 2026 è giovedì
    expect(oct.slice(0, 4)).toEqual([null, null, null, 1]);
    expect(oct.at(-1)).toBe(31);
    expect(weekOf("2026-10-16")).toEqual(["2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16", "2026-10-17", "2026-10-18"]);
    expect(weekOf("2026-10-18")[0]).toBe("2026-10-12");
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

describe("home slides", () => {
  it("wraps the slide index both ways and shows only back-view avatar bases", async () => {
    const { nextIndex, publicAvatarBases } = await import("./HomeSlides");
    expect(nextIndex(0, 5)).toBe(1);
    expect(nextIndex(4, 5)).toBe(0);
    expect(nextIndex(0, 5, -1)).toBe(4);
    expect(nextIndex(3, 0)).toBe(0);
    const b = publicAvatarBases();
    expect(b.length).toBeGreaterThan(0);
    expect(b.every((x) => x.view === "BACK")).toBe(true);
  });
});
