import { describe, expect, it } from "vitest";

import {
  fantaError,
  fmtPoints,
  parseFantaMe,
  parseReport,
  parseStandings,
  performancePoints,
  reportProblems,
  rosterProblems,
  type FantaCandidate,
  type ReportPlayer,
} from "./fanta";

const cand = (
  id: string,
  team: string,
  role: FantaCandidate["role"] = "C",
): FantaCandidate => ({
  athleteId: id,
  team,
  name: `N ${id}`,
  adult: true,
  role,
  lastPoints: null,
});

describe("fanta rules", () => {
  it("limits the roster to 11 and to 4 per team", () => {
    const cands = [
      ...Array.from({ length: 6 }, (_, i) => cand(`p${i}`, "prima")),
      ...Array.from({ length: 6 }, (_, i) => cand(`j${i}`, "u19")),
    ];
    expect(rosterProblems(["p0", "p1", "p2", "p3", "j0"], cands)).toEqual([]);
    expect(rosterProblems(["p0", "p1", "p2", "p3", "p4"], cands)[0]).toContain(
      "Prima Squadra: 5",
    );
    expect(
      rosterProblems(
        cands.map((c) => c.athleteId),
        cands,
      ),
    ).toHaveLength(3);
  });

  it("scores a performance like the database", () => {
    expect(
      performancePoints(
        { role: "A", minutes: 90, goals: 2, assists: 1, yellow: 1, red: false },
        1,
      ),
    ).toBe(1 + 6 + 1 - 0.5);
    expect(
      performancePoints(
        { role: "D", minutes: 70, goals: 1, assists: 0, yellow: 0, red: true },
        0,
      ),
    ).toBe(1 + 4 - 1);
    expect(
      performancePoints(
        { role: "P", minutes: 90, goals: 0, assists: 0, yellow: 0, red: false },
        0,
      ),
    ).toBe(2);
    expect(
      performancePoints(
        { role: "P", minutes: 45, goals: 0, assists: 0, yellow: 0, red: false },
        0,
      ),
    ).toBe(1);
    expect(
      performancePoints(
        { role: null, minutes: 0, goals: 0, assists: 0, yellow: 0, red: false },
        3,
      ),
    ).toBe(0);
  });

  it("flags an inconsistent report", () => {
    const row = (minutes: number, goals: number): ReportPlayer => ({
      athleteId: "a",
      displayName: "A",
      birthYear: 2000,
      role: "A",
      minutes,
      goals,
      assists: 0,
      yellow: 0,
      red: false,
      recorded: false,
    });
    expect(
      reportProblems(2, 1, [row(90, 1), { ...row(80, 1), athleteId: "b" }]),
    ).toEqual([]);
    expect(reportProblems(1, 0, [row(90, 2)])[0]).toContain("più dei gol");
    expect(reportProblems(1, 0, [row(0, 1)])[0]).toContain("0 minuti");
    expect(reportProblems(-1, 0, [])[0]).toContain("risultato");
  });

  it("parses the database shapes defensively", () => {
    const me = parseFantaMe({
      joined: true,
      displayName: "Lario",
      editWeek: "2026-10-12",
      lockAt: "2026-10-16T18:00:00+00:00",
      roster: ["x", 3],
      monthPoints: "4.5",
      seasonPoints: null,
      candidates: [
        {
          athleteId: "x",
          team: "u16",
          name: "Mario R.",
          adult: false,
          role: "D",
          lastPoints: 5,
        },
        { bad: true },
      ],
      lastDay: null,
    });
    expect(me?.roster).toEqual(["x"]);
    expect(me?.monthPoints).toBe(4.5);
    expect(me?.seasonPoints).toBe(0);
    expect(me?.candidates).toHaveLength(1);
    expect(me?.candidates[0]?.role).toBe("D");
    expect(parseFantaMe(null)).toBeNull();
    const st = parseStandings({
      month: "2026-10-01",
      players: 2,
      monthTop: [{ entryId: "e", name: "", points: 3 }],
      seasonTop: "no",
    });
    expect(st.monthTop[0]?.name).toBe("Squadra");
    expect(st.seasonTop).toEqual([]);
    const rep = parseReport({
      match_id: "m",
      team_code: "u16",
      starts_at: "2026-10-11T13:00:00+00:00",
      open: true,
      home_team: "A",
      away_team: "B",
      goals_for: null,
      goals_against: null,
      recorded_at: null,
      players: [
        {
          athlete_id: "a",
          display_name: " ",
          birth_year: 2011,
          role: "Q",
          minutes: "90",
          goals: 1,
          assists: 0,
          yellow: 0,
          red: false,
          recorded: true,
        },
      ],
    });
    expect(rep?.players[0]).toMatchObject({
      displayName: "Nome non indicato",
      role: null,
      minutes: 90,
      recorded: true,
    });
    expect(parseReport({})).toBeNull();
  });

  it("formats points and explains errors", () => {
    expect(fmtPoints(7)).toBe("7");
    expect(fmtPoints(6.5)).toBe("6,5");
    expect(fantaError("perTeam")).toContain("4");
    expect(fantaError("zzz")).toContain("riprova");
  });
});
