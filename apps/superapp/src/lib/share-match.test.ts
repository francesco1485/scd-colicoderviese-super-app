import { describe, expect, it } from "vitest";

import { eventShare, matchShare, shortDay } from "./share-match";

describe("share a game on WhatsApp", () => {
  const base = { date: "2026-10-18", time: "15:30", group: "prima", opponent: "ARS Rovagnate", homeAway: "FUORI" as const, place: "La Valletta Brianza", pending: [] as string[] };
  it("short Italian day", () => {
    expect(shortDay("2026-10-18")).toBe("dom 18 ott");
    expect(shortDay("2026-02-30")).toBe("");
  });
  it("away game: opponent first, link to that team's calendar, no names of people", () => {
    const d = matchShare(base, "Prima");
    expect(d.text).toContain("ARS Rovagnate – ColicoDerviese Prima");
    expect(d.text).toContain("dom 18 ott ore 15:30");
    expect(d.text).toContain("a La Valletta Brianza");
    expect(d.url).toBe("https://app.colicoderviese.it/calendario?annata=prima");
    expect(d.text).not.toMatch(/\b[A-Z][a-z]+ [A-Z]\.\b/);
  });
  it("home game, missing time and venue, pending note", () => {
    const d = matchShare({ ...base, homeAway: "CASA", time: "", place: "", pending: ["Orario da confermare"] }, "U16");
    expect(d.text).toContain("ColicoDerviese U16 – ARS Rovagnate");
    expect(d.text).toContain("orario da definire");
    expect(d.text).toContain("campo da definire (Orario da confermare)");
  });
  it("event share links to the event page", () => {
    const d = eventShare({ title: "Christmas Lario Cup", when: "8 dicembre", href: "/eventi/christmas-lario-cup", text: "Torneo a Colico e Dervio." });
    expect(d.url).toBe("https://app.colicoderviese.it/eventi/christmas-lario-cup");
    expect(d.text).toContain("8 dicembre");
  });
});
