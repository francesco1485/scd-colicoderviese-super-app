/**
 * 2026/27 structure in the field planner (Direzione 17/10/2026, VERIFIED): 9 active teams,
 * U18 Élite withdrawn, no separate U14, merged annate. Covers rotation.ts (labels, home
 * matches) and the Dervio season plan fed by the real Master Calendario copy.
 */
import { describe, expect, it } from "vitest";

import snapshot from "@/data/calendario-snapshot.json";
import {
  DERVIO_AGE_ORDER,
  DERVIO_START_DATE,
  candidatesFromHomeMatches,
  upcomingDervioWeeks,
} from "./dervio-rotation";
import { ANNATA_CATEGORY_2026_27 } from "./public-snapshots";
import {
  DEFAULT_OPTIONS,
  GROUP_FORMAT,
  GROUP_LABEL,
  SEASON_TEAMS_2026_27,
  WITHDRAWN_TEAMS,
  analyse,
  conflictSuggestions,
  homeMatches,
  isWithdrawnGroup,
  simulate,
  type RotationMatch,
  type SnapshotEvent,
} from "./rotation";

const events = snapshot.events as SnapshotEvent[];

describe("2026/27 teams of the planner", () => {
  it("lists exactly the 9 active teams in hall order", () => {
    expect(SEASON_TEAMS_2026_27.map((t) => t.label)).toEqual([
      "Prima Squadra",
      "Juniores U19 Élite",
      "U16 Élite",
      "U15 Giovanissimi",
      "Esordienti 2014",
      "Esordienti 2015",
      "Pulcini 2016-2017",
      "Primi Calci 2018-2019",
      "Piccoli Amici 2020-2021",
    ]);
  });

  it("has no U18 and no separate U14; U15 is 2012-2013 together", () => {
    const text = JSON.stringify(
      SEASON_TEAMS_2026_27.map((t) => [t.id, t.label, t.annate, t.category]),
    );
    expect(text).not.toMatch(/U18|U14/i);
    expect(SEASON_TEAMS_2026_27.find((t) => t.id === "u15")?.annate).toBe(
      "2012-2013",
    );
    expect(SEASON_TEAMS_2026_27.find((t) => t.id === "u16")?.annate).toBe(
      "2011",
    );
  });

  it("keeps U18 only as a withdrawn team, never with a match format or a label", () => {
    expect(WITHDRAWN_TEAMS.map((t) => t.id)).toEqual(["u18"]);
    expect(isWithdrawnGroup("U18")).toBe(true);
    expect(isWithdrawnGroup("u19")).toBe(false);
    expect(GROUP_FORMAT["u18"]).toBeUndefined();
    expect(GROUP_LABEL["u18"]).toBeUndefined();
  });

  it("every active team has a match format and a label", () => {
    for (const t of SEASON_TEAMS_2026_27) {
      expect(GROUP_FORMAT[t.id], t.id).toBeDefined();
      expect(GROUP_LABEL[t.id], t.id).toBe(t.label);
    }
  });

  it("drops calendar rows of a withdrawn team from the home matches", () => {
    const fake: SnapshotEvent = {
      id: "X-U18",
      date: "2026-11-07",
      time: "15:00",
      group: "u18",
      venue: "COLICO - CAMPO 1",
      home_away: "CASA",
    };
    expect(homeMatches([...events, fake]).some((m) => m.id === "X-U18")).toBe(
      false,
    );
    expect(
      homeMatches(events).every((m) => GROUP_LABEL[m.group] !== undefined),
    ).toBe(true);
  });

  it("maps the birth years of the Direzione table only (no 2010, no pre-2011)", () => {
    expect(ANNATA_CATEGORY_2026_27["2014"]).toBe("U13");
    expect(ANNATA_CATEGORY_2026_27["2015"]).toBe("U12");
    expect(ANNATA_CATEGORY_2026_27["2012"]).toBe(
      ANNATA_CATEGORY_2026_27["2013"],
    );
    expect(ANNATA_CATEGORY_2026_27["2010"]).toBeUndefined();
    expect(ANNATA_CATEGORY_2026_27["2008"]).toBeUndefined();
  });
});

describe("Dervio season plan from the Master Calendario copy", () => {
  const candidates = candidatesFromHomeMatches(homeMatches(events));

  it("turns home matches into candidates, never hypothetical bookings", () => {
    expect(candidates.length).toBeGreaterThan(0);
    expect(
      candidates.every((c) => c.home && /^\d{2}:\d{2}$/.test(c.time ?? "")),
    ).toBe(true);
    const booking = {
      id: "b1",
      group: "ipotesi",
      date: "2026-11-07",
      start: 900,
      end: 960,
      endKnown: true,
      kind: "affitto" as const,
    };
    expect(candidatesFromHomeMatches([booking])).toEqual([]);
  });

  it("plans one youth team per week from 24/10, Prima Squadra never", () => {
    const weeks = upcomingDervioWeeks(candidates, "2026-10-17", 6);
    expect(weeks.length).toBeGreaterThan(0);
    expect(weeks[0]!.weekStart <= DERVIO_START_DATE).toBe(true);
    for (const w of weeks) {
      if (!w.pick) continue;
      expect(w.pick.group).not.toBe("prima");
      expect(
        (DERVIO_AGE_ORDER as readonly string[]).includes(w.pick.group),
      ).toBe(true);
      expect(w.pick.match.date >= DERVIO_START_DATE).toBe(true);
      expect(
        w.pick.match.date >= w.weekStart && w.pick.match.date <= w.weekEnd,
      ).toBe(true);
    }
  });

  it("keeps the rotation order independent of the day the page is opened", () => {
    const later = upcomingDervioWeeks(candidates, "2026-11-02", 3);
    const all = upcomingDervioWeeks(candidates, "2026-10-17", 20);
    const same = all.filter((w) => w.weekEnd >= "2026-11-02").slice(0, 3);
    expect(later).toEqual(same);
  });

  it("returns nothing for a limit of 0 and rejects an invalid day", () => {
    expect(upcomingDervioWeeks(candidates, "2026-10-17", 0)).toEqual([]);
    expect(() => upcomingDervioWeeks(candidates, "17/10/2026")).toThrow(
      RangeError,
    );
  });
});

describe("conflict suggestions on Colico campo 1", () => {
  const mk = (
    id: string,
    group: string,
    start: number,
    format: 11 | 9 = 11,
  ): RotationMatch => ({
    id,
    date: "2026-11-21",
    start,
    end: start + 105,
    endKnown: false,
    group,
    label: GROUP_LABEL[group] ?? group,
    short: group,
    format,
    opponent: "",
    kind: "match",
    homePitch: "C1",
    pitch: "C1",
    moved: false,
  });
  const opts = { ...DEFAULT_OPTIONS, startDate: "2026-10-24" };

  it("proposes a free slot for each youth match in conflict, never for the Prima Squadra", () => {
    const items = simulate([mk("a", "prima", 870), mk("b", "u15", 900)], opts);
    const a = analyse(items, {
      today: "2026-10-17",
      startDate: opts.startDate,
      buffer: opts.buffer,
      maxDervioPerDay: 2,
      lightsVerified: true,
    });
    const day = a.days.find((d) => d.date === "2026-11-21")!;
    expect(day.over.C1.size).toBeGreaterThan(0);
    const s = conflictSuggestions(day, opts);
    expect(s.length).toBeGreaterThan(0);
    expect(s.every((x) => x.matchId === "b")).toBe(true);
    expect(s.some((x) => x.pitch === "DV" && x.kind === "same-time")).toBe(
      true,
    );
  });

  it("returns nothing when campo 1 has no conflict", () => {
    const items = simulate([mk("a", "prima", 870)], opts);
    const a = analyse(items, {
      today: "2026-10-17",
      startDate: opts.startDate,
      buffer: opts.buffer,
      maxDervioPerDay: 2,
      lightsVerified: true,
    });
    expect(conflictSuggestions(a.days[0]!, opts)).toEqual([]);
  });
});
