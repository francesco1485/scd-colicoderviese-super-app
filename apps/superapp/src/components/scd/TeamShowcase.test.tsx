/** «Vetrina squadre» rendering (UD-168): fixtures only, invented names. Unknown values read «da confermare». */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { TeamShowcaseSection } from "./TeamShowcase";
import { emptyShowcase, parseShowcase } from "@/lib/team-showcase";

const fixture = parseShowcase("prima", {
  team: "prima",
  available: true,
  season: "2026/2027",
  count: 2,
  matchesRecorded: 1,
  players: [
    { key: "p1", name: "Andrea Esempio", role: "A", shirt: 9, stats: { matches: 1, appearances: 1, goals: 2, yellow: 1, red: 0 } },
    { key: "p2", name: "Luca R.", role: null, shirt: null, stats: null },
  ],
  staff: [{ name: "Mario Misterprova", role: "Allenatore" }],
});

describe("TeamShowcaseSection", () => {
  it("shows adult full name with shirt and stats, minor short name with «da confermare»", () => {
    const html = renderToStaticMarkup(<TeamShowcaseSection showcase={fixture} color="#1e7fd8" />);
    expect(html).toContain("Andrea Esempio");
    expect(html).toContain("Maglia numero 9");
    expect(html).toContain("Luca R.");
    expect(html).toContain("ruolo da confermare");
    expect(html).toContain("Presenze, gol e cartellini: da confermare");
    expect(html).toContain("Mario Misterprova");
    expect(html).toContain("Aperta a tutti, senza registrazione.");
    expect(html).not.toMatch(/<img/);
  });

  it("an unavailable roster says «da confermare», never zero players", () => {
    const html = renderToStaticMarkup(<TeamShowcaseSection showcase={emptyShowcase("u16", "pending")} color="#1e7fd8" />);
    expect(html).toContain("Rosa da confermare");
    expect(html).toContain("Staff da confermare");
    expect(html).not.toMatch(/>0 giocatori/);
  });
});
