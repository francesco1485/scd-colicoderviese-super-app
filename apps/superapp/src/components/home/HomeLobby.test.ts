import { describe, expect, it } from "vitest";

import { birthYears, countdownLabel } from "./HomeLobby";

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
});
