import { describe, expect, it } from "vitest";

import {
  categoryColor,
  categoryShort,
  filterCounts,
  filterMatchday,
  groupByDay,
  homeTown,
  matchdayClass,
  matchdayDayLabel,
  matchdaySummary,
  matchdaySummaryLine,
} from "./home-matchday";
import { weekMatches } from "./home-today";
import { loadCalendar } from "./public-snapshots";

type Row = {
  id: string;
  date: string;
  group: string;
  homeAway: "CASA" | "FUORI" | "";
  place: string;
};
const r = (
  id: string,
  date: string,
  group: string,
  homeAway: Row["homeAway"],
  place = "",
): Row => ({
  id,
  date,
  group,
  homeAway,
  place,
});

const ROWS: Row[] = [
  r("a", "2026-10-17", "primicalci", "FUORI", "Vercurago - C.S. Comunale"),
  r("b", "2026-10-17", "2014", "CASA", "COLICO - CAMPO 1"),
  r("c", "2026-10-17", "u19", "CASA", "COLICO - CAMPO 1"),
  r("d", "2026-10-18", "u15", "CASA", "DERVIO - CAMPO"),
  r("e", "2026-10-18", "prima", "FUORI", "La Valletta Brianza"),
  r("f", "2026-10-19", "other", "", ""),
];

describe("home matchday (UD-132)", () => {
  it("classifies categories with the universe rule: agonistica, attività di base, other groups neither", () => {
    for (const g of ["prima", "u19", "u16", "u15"])
      expect(matchdayClass(g), g).toBe("agonistica");
    for (const g of [
      "2014",
      "2015",
      "pulcini",
      "primicalci",
      "piccoli",
      "esordienti",
    ])
      expect(matchdayClass(g), g).toBe("base");
    expect(matchdayClass("other")).toBe("altra");
    expect(matchdayClass("")).toBe("altra");
  });

  it("filters by chip and counts every chip", () => {
    expect(filterMatchday(ROWS, "tutte").map((x) => x.id)).toEqual([
      "a",
      "b",
      "c",
      "d",
      "e",
      "f",
    ]);
    expect(filterMatchday(ROWS, "casa").map((x) => x.id)).toEqual([
      "b",
      "c",
      "d",
    ]);
    expect(filterMatchday(ROWS, "agonistica").map((x) => x.id)).toEqual([
      "c",
      "d",
      "e",
    ]);
    expect(filterMatchday(ROWS, "base").map((x) => x.id)).toEqual(["a", "b"]);
    expect(filterCounts(ROWS)).toEqual({
      tutte: 6,
      seguite: 0,
      casa: 3,
      agonistica: 3,
      base: 2,
    });
    expect(filterCounts([])).toEqual({
      tutte: 0,
      seguite: 0,
      casa: 0,
      agonistica: 0,
      base: 0,
    });
  });

  it("'Le mie squadre' keeps only the followed groups (star on the row), counts follow", () => {
    expect(filterMatchday(ROWS, "seguite", ["u15", "2014"]).map((x) => x.id)).toEqual(["b", "d"]);
    expect(filterMatchday(ROWS, "seguite", [])).toEqual([]);
    expect(filterMatchday(ROWS, "seguite")).toEqual([]);
    expect(filterCounts(ROWS, ["prima"]).seguite).toBe(1);
    expect(filterCounts(ROWS, ["prima"]).tutte).toBe(6);
  });

  it("groups by day in calendar order, keeping the order of the games", () => {
    const shuffled = [ROWS[3]!, ROWS[0]!, ROWS[4]!, ROWS[1]!];
    expect(
      groupByDay(shuffled).map((d) => [d.date, d.entries.map((x) => x.id)]),
    ).toEqual([
      ["2026-10-17", ["a", "b"]],
      ["2026-10-18", ["d", "e"]],
    ]);
    expect(groupByDay([])).toEqual([]);
  });

  it("summarises the week from the venues only (no invented town)", () => {
    expect(homeTown("COLICO - CAMPO 1")).toBe("Colico");
    expect(homeTown("Dervio, campo comunale")).toBe("Dervio");
    expect(homeTown("La Valletta Brianza")).toBe("");
    const s = matchdaySummary(ROWS);
    expect(s).toEqual({ games: 6, home: 3, towns: ["Colico", "Dervio"] });
    expect(matchdaySummaryLine(s)).toBe("6 gare · 3 in casa a Colico e Dervio");
    expect(matchdaySummaryLine(matchdaySummary([ROWS[1]!]))).toBe(
      "1 gara · 1 in casa a Colico",
    );
    expect(matchdaySummaryLine(matchdaySummary([ROWS[0]!]))).toBe(
      "1 gara · nessuna in casa",
    );
    expect(
      matchdaySummaryLine(
        matchdaySummary([r("x", "2026-10-17", "u15", "CASA", "")]),
      ),
    ).toBe("1 gara · 1 in casa");
    expect(matchdaySummaryLine(matchdaySummary([]))).toBe("");
  });

  it("names the day as families read it", () => {
    expect(matchdayDayLabel("2026-10-17", "2026-10-14")).toBe("Sabato 17");
    expect(matchdayDayLabel("2026-10-18", "2026-10-14")).toBe("Domenica 18");
    expect(matchdayDayLabel("2026-10-14", "2026-10-14")).toBe(
      "Oggi · Mercoledì 14",
    );
    expect(matchdayDayLabel("2026-11-01", "2026-10-31")).toBe(
      "Domani · Domenica 1",
    );
  });

  it("takes pill name and colour from the master groups", () => {
    const groups = [
      { id: "u19", label: "Juniores U19 Elite", color: "#375B89" },
      { id: "2014", label: "Esordienti · 2014", color: "#7654B8" },
    ];
    expect(categoryShort("u19", groups, "")).toBe("U19");
    expect(categoryShort("2014", groups, "")).toBe("Esordienti 2014");
    expect(categoryShort("zzz", groups, "Allievi · B")).toBe("Allievi");
    expect(categoryColor("u19", groups)).toBe("#375B89");
    expect(categoryColor("zzz", groups)).toBe("#668196");
  });

  it("works on the real calendar snapshot (weekend of 17-18 October 2026)", () => {
    const cal = loadCalendar();
    const week = weekMatches(cal.events, cal.groups, "2026-10-14", null);
    const s = matchdaySummary(week);
    expect(s.games).toBe(week.length);
    expect(s.home).toBe(week.filter((e) => e.homeAway === "CASA").length);
    const counts = filterCounts(week);
    expect(counts.agonistica + counts.base).toBeLessThanOrEqual(counts.tutte);
    for (const d of groupByDay(week))
      expect(d.date >= "2026-10-14" && d.date <= "2026-10-20").toBe(true);
  });
});
