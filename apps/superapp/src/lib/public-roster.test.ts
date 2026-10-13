import { describe, expect, it } from "vitest";

import {
  EMPTY_ROSTER,
  initialsOf,
  parsePublicRoster,
  roleLabel,
  rosterCountLabel,
  rosterSections,
  type RosterPlayer,
} from "./public-roster";

const p = (
  id: string,
  name: string,
  role: RosterPlayer["role"] = null,
  adult = false,
): RosterPlayer => ({
  id,
  name,
  role,
  adult,
});

describe("public roster", () => {
  it("parses what the database function returns and drops malformed rows", () => {
    const r = parsePublicRoster({
      team: "u15",
      count: 3,
      players: [
        { id: "a", name: "Christian B.", role: null, adult: false },
        { id: "b", name: "Marco Rossi", role: "D", adult: true },
        { id: "", name: "no id" },
        { id: "c", name: "", role: "P" },
        { id: "d", name: "Luca V.", role: "X", adult: "yes" },
        "junk",
      ],
    });
    expect(r.team).toBe("u15");
    expect(r.count).toBe(3);
    expect(r.players).toEqual([
      p("a", "Christian B."),
      p("b", "Marco Rossi", "D", true),
      p("d", "Luca V."),
    ]);
  });

  it("keeps the count without names for base activity", () => {
    const r = parsePublicRoster({ team: "2014", count: 24, players: [] });
    expect(r.count).toBe(24);
    expect(r.players).toEqual([]);
    expect(rosterCountLabel(r.count, true)).toBe("24 bambini iscritti");
    expect(rosterCountLabel(1, true)).toBe("1 bambino iscritto");
    expect(rosterCountLabel(27, false)).toBe("27 giocatori in rosa");
    expect(rosterCountLabel(0, false)).toBe("Rosa non ancora disponibile");
  });

  it("returns the empty roster on garbage", () => {
    expect(parsePublicRoster(null)).toBe(EMPTY_ROSTER);
    expect(parsePublicRoster([1])).toBe(EMPTY_ROSTER);
    expect(parsePublicRoster({ players: "x", count: "NaN" })).toEqual({
      team: "",
      count: 0,
      players: [],
    });
  });

  it("groups by role only when roles exist", () => {
    const flat = rosterSections([p("a", "A B"), p("b", "C D")]);
    expect(flat).toHaveLength(1);
    expect(flat[0]!.label).toBeNull();
    expect(flat[0]!.players).toHaveLength(2);
    const grouped = rosterSections([
      p("a", "A B", "A"),
      p("b", "C D", "P"),
      p("c", "E F"),
      p("d", "G H", "D"),
    ]);
    expect(grouped.map((s) => s.label)).toEqual([
      "Portiere",
      "Difensore",
      "Attaccante",
      "Ruolo da definire",
    ]);
    expect(rosterSections([])).toEqual([]);
  });

  it("labels roles and initials", () => {
    expect(roleLabel("C")).toBe("Centrocampista");
    expect(roleLabel(null)).toBeNull();
    expect(initialsOf("Christian B.")).toBe("CB");
    expect(initialsOf("Giovanni Adamoli")).toBe("GA");
    expect(initialsOf("Mario")).toBe("M");
    expect(initialsOf("  ")).toBe("?");
  });
});
