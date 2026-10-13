import { describe, expect, it } from "vitest";

import { competitionBadge, dayChip, dayCount, sideTone } from "./week-style";

describe("week games presentation", () => {
  it("labels today and tomorrow, otherwise the weekday with the date", () => {
    expect(dayChip("2026-10-17", "2026-10-17")).toMatchObject({ tone: "today", label: "Oggi" });
    expect(dayChip("2026-10-18", "2026-10-17")).toMatchObject({ tone: "tomorrow", label: "Domani" });
    expect(dayChip("2026-10-18", "2026-10-13")).toEqual({ tone: "day", label: "Domenica", date: "18 ottobre" });
    expect(dayChip("2026-11-01", "2026-10-31").tone).toBe("tomorrow");
  });

  it("shows a competition badge only for a known calendar value", () => {
    expect(competitionBadge("CAMPIONATO")).toBe("Campionato");
    expect(competitionBadge("torneo")).toBe("Torneo");
    expect(competitionBadge("")).toBeNull();
    expect(competitionBadge(undefined)).toBeNull();
    expect(competitionBadge("FINALE MONDIALE")).toBeNull();
  });

  it("colour-codes home and away and counts the day", () => {
    expect(sideTone("CASA")).toBe("home");
    expect(sideTone("FUORI")).toBe("away");
    expect(sideTone("")).toBe("none");
    expect(dayCount([{ homeAway: "CASA" }, { homeAway: "FUORI" }, { homeAway: "CASA" }])).toBe("3 gare · 2 in casa");
    expect(dayCount([{ homeAway: "FUORI" }])).toBe("1 gara");
  });
});
