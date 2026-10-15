import { loadQuadro } from "./quadro-data.server";
import { describe, expect, test } from "vitest";

import { loadCalendar, type PublicEvent } from "./public-snapshots";
import {
  contrastOnWhite,
  findOverlaps,
  fromMinutes,
  groupByDay,
  groupIdForText,
  groupOverlaps,
  joinDays,
  mainCategory,
  matchSplit,
  matchesInWeek,
  nextMatchByGroup,
  parseRange,
  quadroEntries,
  readableOnWhite,
  roomCount,
  roomsFor,
  rotationFor,
  rotationSplit,
  teamKey,
  teamSummaries,
  teamTag,
  toMinutes,
  zoneConflicts,
  type RotationRow,
} from "./quadro";

const quadro = loadQuadro();
const cal = loadCalendar();
const entries = quadroEntries(quadro.slots);
const overlaps = findOverlaps(entries);

describe("time helpers", () => {
  test("parse and format minutes", () => {
    expect(toMinutes("17:20")).toBe(1040);
    expect(toMinutes("25:00")).toBeNull();
    expect(fromMinutes(1210)).toBe("20:10");
    expect(parseRange("Lun/Mer 20:10–20:20")).toEqual({
      start: 1210,
      end: 1220,
    });
    expect(parseRange("senza orario")).toBeNull();
  });
});

describe("quadro grid", () => {
  test("one entry per occupied field: 18 trainings Monday to Friday (board)", () => {
    expect(entries).toHaveLength(18);
    expect(entries.every((e) => e.end > e.start)).toBe(true);
  });

  test("groups by day in master order, sorted by time then field", () => {
    const byDay = groupByDay(quadro.days, entries);
    expect(byDay.map((d) => d.day)).toEqual([
      "LUNEDÌ",
      "MARTEDÌ",
      "MERCOLEDÌ",
      "GIOVEDÌ",
      "VENERDÌ",
    ]);
    expect(byDay.map((d) => d.entries.length)).toEqual([4, 3, 4, 4, 3]);
    const mon = byDay[0]!.entries;
    expect(mon[0]).toMatchObject({
      timeLabel: "17:20–18:50",
      field: "C1",
      teams: "U15 + U12 + U11",
    });
    expect(mon[0]!.rooms.map((r) => r.id)).toEqual([
      "SP1",
      "SP2",
      "SP3",
      "SP4",
    ]);
    expect(mon[2]!.rooms.map((r) => r.id)).toEqual(["SP1"]); // "—" and empty cells are free
    expect(mon[1]!.text).toBe(
      "Primi Calci 2018-2019 + Piccoli Amici 2020-2021 · Due zone",
    );
  });

  test("team keys match quadro and rotation spellings", () => {
    expect(teamKey("Juniores Élite U19 (+ atleti ex U18 integrati)")).toBe(
      teamKey("Juniores U19 (+ ex U18)"),
    );
    expect(teamKey("U16 — attivazione")).toBe(teamKey("Under 16"));
    expect(teamKey("Prima Squadra fino 20:30")).toBe(
      teamKey("INTERO — Prima Squadra • Promozione"),
    );
    expect(teamKey("Piccoli Amici 2020/21")).toBe(teamKey("PICCOLI AMICI"));
    expect(teamKey("U15 2012/13")).toBe(teamKey("Under 15 2012/2013"));
  });
});

describe("overlap detection", () => {
  test("finds the board's overlaps (U19/U16 Mon+Wed 20:10–20:20, U13/Prima Thu 19:00–19:30) plus Piccoli Amici/U13 Thu 18:00–18:50", () => {
    expect(overlaps).toHaveLength(4);
    const groups = groupOverlaps(overlaps, quadro.days);
    expect(groups).toHaveLength(3);
    expect(groups[0]).toMatchObject({
      days: ["LUNEDÌ", "MERCOLEDÌ"],
      field: "C1",
      teams: ["Juniores U19", "U16"],
      from: 1210,
      to: 1220,
      minutes: 10,
    });
    expect(groups[1]).toMatchObject({
      days: ["GIOVEDÌ"],
      field: "C1",
      teams: ["Piccoli Amici", "U13"],
      from: 1080,
      to: 1130,
      minutes: 50,
    });
    expect(groups[2]).toMatchObject({
      days: ["GIOVEDÌ"],
      field: "C1",
      teams: ["U13", "Prima Squadra"],
      from: 1140,
      to: 1170,
      minutes: 30,
    });
    expect(groups[0]!.entryIds).toHaveLength(4);
    expect(joinDays(groups[0]!.days)).toBe("lunedì e mercoledì");
    expect(joinDays(["LUNEDÌ", "MARTEDÌ", "GIOVEDÌ"])).toBe(
      "lunedì, martedì e giovedì",
    );
  });

  test("ignores different fields, the same group and touching times", () => {
    const base = { day: "LUNEDÌ", timeLabel: "", rooms: [], teams: "" };
    const list = [
      {
        ...base,
        id: "a",
        start: 1000,
        end: 1060,
        field: "C1" as const,
        text: "U15",
      },
      {
        ...base,
        id: "b",
        start: 1060,
        end: 1120,
        field: "C1" as const,
        text: "U16",
      },
      {
        ...base,
        id: "c",
        start: 1000,
        end: 1100,
        field: "C2" as const,
        text: "U13",
      },
      {
        ...base,
        id: "d",
        start: 1030,
        end: 1060,
        field: "C1" as const,
        text: "Under 15",
      },
    ];
    expect(findOverlaps(list)).toEqual([]);
  });
});

describe("rotation A/B", () => {
  test("A/B rows apply to both weeks; time label without the day prefix", () => {
    const a = rotationFor(quadro.rotations, "A", "LUNEDÌ", overlaps);
    const b = rotationFor(quadro.rotations, "B", "LUNEDÌ", overlaps);
    expect(a.map((r) => r.timeLabel)).toEqual([
      "17:20–18:50",
      "19:00–20:10",
      "20:10–20:20",
      "20:20–21:20",
    ]);
    expect(b.map((r) => r.timeLabel)).toEqual([
      "17:20–18:50",
      "20:10–20:20",
      "20:20–21:20",
    ]);
    expect(a[1]!.zones["C1_A"]).toBe("Juniores U19 (+ ex U18)");
  });

  test("marks the zones where an overlapping pair meets on the field", () => {
    const a = rotationFor(quadro.rotations, "A", "LUNEDÌ", overlaps);
    expect(a[2]!.conflictZones.sort()).toEqual(["C1_A", "C1_B", "C1_C"]);
    expect(a[0]!.conflictZones).toEqual([]);
    const thuB = rotationFor(quadro.rotations, "B", "GIOVEDÌ", overlaps);
    expect(
      thuB.find((r) => r.timeLabel === "19:00–19:30")!.conflictZones.sort(),
    ).toEqual(["C1_A", "C1_B", "C1_C"]);
    // Only the U13/Prima overlap: the 18:00–19:30 row has no Prima Squadra.
    const u13Prima = overlaps.filter((o) => o.from === 1140);
    expect(
      rotationFor(quadro.rotations, "B", "GIOVEDÌ", u13Prima).find(
        (r) => r.timeLabel === "18:00–19:30",
      )!.conflictZones,
    ).toEqual([]);
  });

  test("the rotation splits every overlapping pair into separate zones, in both weeks", () => {
    for (const g of groupOverlaps(overlaps, quadro.days)) {
      expect(rotationSplit(g, quadro.rotations, overlaps)).toEqual([
        { week: "A", split: true },
        { week: "B", split: true },
      ]);
    }
  });

  test("same-zone conflicts: only week B Thursday 19:00–19:30 (C1_B, C1_C); 'fino HH:MM' shortens a cell", () => {
    const found = (["A", "B"] as const).flatMap((w) =>
      quadro.days.flatMap((d) =>
        zoneConflicts(rotationFor(quadro.rotations, w, d)).map(
          (c) =>
            `${w} ${d} ${c.zone} ${c.a.zones[c.zone]} / ${c.b.zones[c.zone]}`,
        ),
      ),
    );
    expect(found).toEqual([
      "B GIOVEDÌ C1_B U13 / Prima Squadra",
      "B GIOVEDÌ C1_C Piccoli Amici / Prima Squadra",
    ]);
    const row = (
      id: string,
      start: number,
      end: number,
      c1a: string,
    ): RotationRow => ({
      id,
      week: "A",
      day: "LUNEDÌ",
      timeLabel: "",
      start,
      end,
      zones: { C1_A: c1a, C2_A: "—" },
      conflictZones: [],
    });
    const synthetic = zoneConflicts([
      row("x", 1000, 1100, "U15"),
      row("y", 1050, 1150, "U16"),
      row("z", 1050, 1150, "Under 15"),
      row("w", 950, 1150, "U13 fino 16:40"),
    ]);
    expect(synthetic.map((c) => [c.zone, c.a.id, c.b.id])).toEqual([
      ["C1_A", "x", "y"],
      ["C1_A", "y", "z"],
    ]);
  });

  test("changing rooms per week and day, deduplicated; 4 rooms at Colico", () => {
    const mon = roomsFor(quadro.rooms, "A", "LUNEDÌ");
    expect(mon.SP1.map((r) => r.group)).toEqual([
      "U15",
      "Juniores U19 / ex U18",
      "Juniores U19 / ex U18",
    ]);
    expect(mon.SP4.at(-1)).toMatchObject({
      start: 1220,
      end: 1280,
      group: "U16",
    });
    expect(roomCount(quadro.slots, quadro.rooms)).toBe(4);
    expect(roomCount([], [])).toBeNull();
  });
});

describe("gestionale", () => {
  test("next match per team from Sunday 11/10 morning", () => {
    const next = nextMatchByGroup(cal.events, "2026-10-11", "08:00");
    expect(next.get("prima")).toMatchObject({
      date: "2026-10-11",
      time: "15:30",
      homeAway: "CASA",
      opponent: "ALTA BRIANZA TAVERNERIO",
    });
    expect(next.get("primicalci")).toMatchObject({
      date: "2026-10-17",
      time: "10:30",
      homeAway: "FUORI",
    });
    // After the match has started, the next one is the following week.
    expect(
      nextMatchByGroup(cal.events, "2026-10-11", "16:00").get("prima"),
    ).toMatchObject({ date: "2026-10-18" });
    expect(
      nextMatchByGroup(cal.events, "2027-12-01", "00:00").get("prima"),
    ).toBeNull();
  });

  test("team cards: only groups with matches, real counts, sessions only when verified in the quadro", () => {
    const teams = teamSummaries(
      cal.groups,
      cal.events,
      quadro.slots,
      "2026-10-11",
      "08:00",
    );
    expect(teams.map((t) => t.id)).toEqual([
      "2014",
      "u15",
      "u16",
      "2015",
      "prima",
      "primicalci",
      "u19",
      "pulcini",
      "piccoli",
    ]);
    const u15 = teams.find((t) => t.id === "u15")!;
    expect(u15).toMatchObject({
      tag: "U15",
      category: "Giovanissimi U15",
      weeklySessions: 3,
    });
    expect(u15.split.total).toBe(27);
    expect(u15.split.home + u15.split.away).toBe(27);
    // Esordienti 2014: no verified link to the quadro -> unknown, never 0.
    expect(teams.find((t) => t.id === "2014")!.weeklySessions).toBeNull();
    for (const t of teams)
      expect(contrastOnWhite(t.color)).toBeGreaterThanOrEqual(4.5);
  });

  test("season split from the snapshot: 171 matches, 92 home and 79 away", () => {
    expect(matchSplit(cal.events)).toEqual({
      total: 171,
      home: 92,
      away: 79,
      other: 0,
    });
    expect(matchSplit([])).toEqual({ total: 0, home: 0, away: 0, other: 0 });
  });

  test("week of matches and main category", () => {
    const w = matchesInWeek(cal.events, "2026-10-14");
    expect(w.label).toBe("12 – 18 ottobre 2026");
    expect(w.events).toHaveLength(9);
    expect(mainCategory([])).toBeNull();
    expect(
      mainCategory([
        { category: "A" },
        { category: "B" },
        { category: "B" },
      ] as PublicEvent[]),
    ).toBe("B");
  });

  test("tags, colour mapping and readable team colours", () => {
    expect(cal.groups.map(teamTag)).toEqual([
      "E14",
      "E15",
      "1ª",
      "U19",
      "U16",
      "U15",
      "PUL",
      "PC",
      "PA",
      "ESO",
      "AC",
    ]);
    expect(groupIdForText("U15 2012/2013 + U12 2015")).toBe("u15");
    expect(groupIdForText("Under 13")).toBeNull();
    expect(readableOnWhite("#2A9CB7")).not.toBe("#2a9cb7");
    expect(contrastOnWhite(readableOnWhite("#2A9CB7"))).toBeGreaterThanOrEqual(
      4.5,
    );
    expect(readableOnWhite("#062a52")).toBe("#062a52");
    expect(readableOnWhite("nope")).toBe("#3b5683");
  });
});
