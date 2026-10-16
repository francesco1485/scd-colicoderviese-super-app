import { describe, expect, it } from "vitest";
import {
  CHECKLIST_ORDER,
  DERVIO_AGE_ORDER,
  DERVIO_START_DATE,
  DERVIO_SURFACE,
  EXCLUSION_LABEL,
  MAX_LEAD_DAYS,
  addDays,
  checklistSummary,
  dervioChecklist,
  dervioPicks,
  eligibleCandidates,
  exclusionReason,
  isIsoDay,
  itemStatus,
  matchEndMin,
  planDervioRotation,
  rainDecision,
  rainMoveActive,
  resolveLeadDays,
  surfaceFromText,
  weekStartOf,
  weekdayOf,
  type ChecklistItem,
  type ChecklistItemId,
  type DervioCandidate,
} from "./dervio-rotation";

/**
 * Fixture derived from the 2026/27 Dervio planning draft: only day, kick-off and
 * calendar group of youth home matches (team names only, no opponents, no people).
 */
const PLAN_ROWS: ReadonlyArray<readonly [string, string, string]> = [
  ["2026-10-24", "10:00", "pulcini"],
  ["2026-10-24", "16:00", "primicalci"],
  ["2026-10-31", "15:00", "2014"],
  ["2026-10-31", "15:00", "pulcini"],
  ["2026-10-31", "16:00", "2015"],
  ["2026-11-07", "15:00", "u19"],
  ["2026-11-07", "18:00", "u16"],
  ["2026-11-14", "15:00", "pulcini"],
  ["2026-11-14", "16:00", "primicalci"],
  ["2026-11-21", "18:00", "2014"],
  ["2026-11-21", "18:00", "u16"],
  ["2026-11-28", "16:00", "2015"],
  ["2026-11-28", "16:00", "primicalci"],
  ["2026-11-29", "10:30", "u15"],
  ["2026-12-05", "15:00", "2014"],
  ["2026-12-05", "18:00", "u16"],
  ["2026-12-12", "15:30", "2015"],
  ["2026-12-13", "10:30", "u15"],
  ["2026-12-19", "15:00", "u19"],
  ["2026-12-19", "18:00", "u16"],
  ["2027-01-09", "15:00", "u19"],
  ["2027-01-09", "18:00", "u16"],
  ["2027-01-23", "15:00", "u19"],
  ["2027-01-23", "18:00", "u16"],
  ["2027-01-31", "10:30", "u15"],
  ["2027-02-06", "15:00", "u19"],
  ["2027-02-06", "18:00", "u16"],
  ["2027-02-16", "20:00", "u19"],
  ["2027-02-20", "18:00", "u16"],
  ["2027-02-21", "10:30", "u15"],
  ["2027-03-02", "20:00", "u19"],
  ["2027-03-07", "10:30", "u15"],
  ["2027-03-13", "15:00", "u19"],
  ["2027-03-13", "18:00", "u16"],
  ["2027-04-03", "15:00", "u19"],
  ["2027-04-03", "18:00", "u16"],
  ["2027-04-11", "10:30", "u15"],
  ["2027-04-17", "18:00", "u16"],
  ["2027-04-25", "10:30", "u15"],
  ["2027-05-09", "10:30", "u15"],
];

const PLAN: DervioCandidate[] = PLAN_ROWS.map(([date, time, group], i) => ({
  id: `m${String(i).padStart(2, "0")}`,
  date,
  time,
  group,
  home: true,
}));

/**
 * Expected picks with `lightsVerified: false` (lights constraint of `rotation.ts`: no match
 * ending after 17:00): 19 Dervio matches.
 */
const EXPECTED_LIGHTS_NOT_VERIFIED: ReadonlyArray<readonly [string, string]> = [
  ["2026-10-24", "primicalci"],
  ["2026-10-31", "pulcini"],
  ["2026-11-07", "u19"],
  ["2026-11-14", "primicalci"],
  ["2026-11-29", "u15"],
  ["2026-12-05", "2014"],
  ["2026-12-13", "u15"],
  ["2026-12-19", "u19"],
  ["2027-01-09", "u19"],
  ["2027-01-23", "u19"],
  ["2027-01-31", "u15"],
  ["2027-02-06", "u19"],
  ["2027-02-21", "u15"],
  ["2027-03-07", "u15"],
  ["2027-03-13", "u19"],
  ["2027-04-03", "u19"],
  ["2027-04-11", "u15"],
  ["2027-04-25", "u15"],
  ["2027-05-09", "u15"],
];

/**
 * Default plan (DG «luci Dervio ok», lights verified): reproduces the "Dervio 1" draft
 * exactly (21 matches).
 */
const EXPECTED: ReadonlyArray<readonly [string, string]> = [
  ["2026-10-24", "primicalci"],
  ["2026-10-31", "pulcini"],
  ["2026-11-07", "u16"],
  ["2026-11-14", "primicalci"],
  ["2026-11-21", "2014"],
  ["2026-11-29", "u15"],
  ["2026-12-05", "u16"],
  ["2026-12-12", "2015"],
  ["2026-12-19", "u16"],
  ["2027-01-09", "u19"],
  ["2027-01-23", "u16"],
  ["2027-01-31", "u15"],
  ["2027-02-06", "u16"],
  ["2027-02-16", "u19"],
  ["2027-03-07", "u15"],
  ["2027-03-13", "u16"],
  ["2027-04-03", "u19"],
  ["2027-04-11", "u15"],
  ["2027-04-17", "u16"],
  ["2027-04-25", "u15"],
  ["2027-05-09", "u15"],
];

const m = (
  id: string,
  date: string,
  group: string,
  extra: Partial<DervioCandidate> = {},
): DervioCandidate => ({ id, date, group, time: "15:00", home: true, ...extra });

const byId = (items: readonly ChecklistItem[], id: ChecklistItemId): ChecklistItem => {
  const item = items.find((i) => i.id === id);
  if (!item) throw new Error(`missing ${id}`);
  return item;
};

describe("calendar helpers", () => {
  it("weekdayOf: Monday = 0, Sunday = 6", () => {
    expect(weekdayOf("2026-10-19")).toBe(0);
    expect(weekdayOf("2026-10-24")).toBe(5);
    expect(weekdayOf("2026-10-25")).toBe(6);
  });

  it("weekStartOf returns the Monday, also across the DST change of 25/10/2026", () => {
    expect(weekStartOf("2026-10-24")).toBe("2026-10-19");
    expect(weekStartOf("2026-10-25")).toBe("2026-10-19");
    expect(weekStartOf("2026-10-26")).toBe("2026-10-26");
    expect(weekStartOf("2027-03-28")).toBe("2027-03-22");
  });

  it("addDays is DST safe in both directions", () => {
    expect(addDays("2026-10-24", 1)).toBe("2026-10-25");
    expect(addDays("2026-10-25", 1)).toBe("2026-10-26");
    expect(addDays("2026-10-26", -2)).toBe("2026-10-24");
    expect(addDays("2027-03-27", 2)).toBe("2027-03-29");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("eligibleCandidates", () => {
  it("keeps only home matches of Dervio groups from the start date, sorted by day and time", () => {
    const list = eligibleCandidates(
      [
        m("a", "2026-10-31", "u16", { time: "18:00" }),
        m("b", "2026-10-31", "pulcini", { time: "10:00" }),
        m("away", "2026-10-31", "u15", { home: false }),
        m("prima", "2026-10-31", "prima"),
        m("before", "2026-10-21", "piccoli"),
        m("bad-date", "31/10/2026", "u19"),
      ],
      DERVIO_START_DATE,
    );
    expect(list.map((c) => c.id)).toEqual(["b", "a"]);
  });

  it("unknown kick-off times sort after known ones on the same day", () => {
    const list = eligibleCandidates(
      [m("x", "2026-10-24", "u15", { time: null }), m("y", "2026-10-24", "u16", { time: "9:30" })],
      DERVIO_START_DATE,
    );
    expect(list.map((c) => c.id)).toEqual(["y", "x"]);
  });
});

describe("planDervioRotation", () => {
  it("age order goes from Piccoli Amici up to Juniores", () => {
    expect(DERVIO_AGE_ORDER[0]).toBe("piccoli");
    expect(DERVIO_AGE_ORDER.at(-1)).toBe("u19");
    expect(DERVIO_AGE_ORDER).not.toContain("prima");
  });

  it("starts on Saturday 24/10/2026 with the youngest team that plays at home that week", () => {
    const weeks = planDervioRotation(PLAN);
    expect(DERVIO_START_DATE).toBe("2026-10-24");
    expect(weekdayOf(DERVIO_START_DATE)).toBe(5);
    expect(weeks[0]?.weekStart).toBe("2026-10-19");
    expect(weeks[0]?.pick?.match.date).toBe("2026-10-24");
    // Primi Calci (younger) before Pulcini, even if Pulcini kick off earlier.
    expect(weeks[0]?.pick?.group).toBe("primicalci");
    expect(weeks[0]?.pick?.label).toBe("Primi Calci");
  });

  it("default (lights ok): reproduces the Dervio 1 draft, 21 matches, evening matches included", () => {
    const picks = dervioPicks(planDervioRotation(PLAN));
    expect(picks.map((p) => [p.match.date, p.group])).toEqual(EXPECTED);
    expect(picks).toHaveLength(21);
    expect(picks.some((p) => (p.endMin ?? 0) > 17 * 60)).toBe(true);
    expect(planDervioRotation(PLAN).every((w) => w.excluded.length === 0)).toBe(true);
  });

  it("with lightsVerified: false the lights rule gives 19 matches, none ending after 17:00", () => {
    const picks = dervioPicks(planDervioRotation(PLAN, { lightsVerified: false }));
    expect(picks.map((p) => [p.match.date, p.group])).toEqual(EXPECTED_LIGHTS_NOT_VERIFIED);
    expect(picks).toHaveLength(19);
    for (const p of picks) {
      expect(p.endMin).not.toBeNull();
      expect(p.endMin as number).toBeLessThanOrEqual(17 * 60);
    }
  });

  it("U16 Élite gets its Dervio turns (7 Saturdays) now that the lights are ok", () => {
    const u16 = dervioPicks(planDervioRotation(PLAN)).filter((p) => p.group === "u16");
    expect(u16).toHaveLength(7);
    expect(u16.every((p) => weekdayOf(p.match.date) === 5)).toBe(true);
  });

  it("lights not verified: U16 07/11 18:00 and U19 Tue 16/02 20:00 excluded with a visible reason", () => {
    const weeks = planDervioRotation(PLAN, { lightsVerified: false });
    const nov = weeks.find((w) => w.weekStart === "2026-11-02");
    expect(nov?.pick?.group).toBe("u19");
    expect(nov?.excluded).toEqual([
      { matchId: "m06", group: "u16", date: "2026-11-07", reason: "needs-lights" },
    ]);
    const feb = weeks.find((w) => w.weekStart === "2027-02-15");
    expect(feb?.pick?.match.date).toBe("2027-02-21");
    expect(feb?.pick?.group).toBe("u15");
    expect(feb?.excluded.map((e) => [e.date, e.group, e.reason])).toEqual([
      ["2027-02-16", "u19", "needs-lights"],
      ["2027-02-20", "u16", "needs-lights"],
    ]);
    expect(EXCLUSION_LABEL["needs-lights"]).toContain("17:00");
  });

  it("winter grass picks are kept and only flagged by default (inverno sì)", () => {
    const picks = dervioPicks(planDervioRotation(PLAN));
    const winter = picks.filter((p) => p.winterGrass).map((p) => p.match.date);
    expect(winter).toEqual([
      "2026-12-05",
      "2026-12-12",
      "2026-12-19",
      "2027-01-09",
      "2027-01-23",
      "2027-01-31",
      "2027-02-06",
      "2027-02-16",
    ]);
  });

  it("winter policy 'skip' excludes Dec–Feb with reason winter-grass", () => {
    const weeks = planDervioRotation(PLAN, { winterPolicy: "skip" });
    const picks = dervioPicks(weeks);
    expect(picks.some((p) => ["12", "01", "02"].includes(p.match.date.slice(5, 7)))).toBe(false);
    const dec = weeks.find((w) => w.weekStart === "2026-11-30");
    expect(dec?.pick).toBeNull();
    expect(dec?.skipReason).toBe("all-excluded");
    expect(dec?.excluded.every((e) => e.reason === "winter-grass")).toBe(true);
    // The rotation resumes in March from where it stopped.
    expect(picks.map((p) => p.match.date).filter((d) => d >= "2027-03-01")[0]).toBe("2027-03-02");
  });

  it("never schedules two Dervio matches in the same week", () => {
    const weeks = planDervioRotation(PLAN);
    const starts = weeks.map((w) => w.weekStart);
    expect(new Set(starts).size).toBe(starts.length);
    for (const w of weeks) {
      expect(weekdayOf(w.weekStart)).toBe(0);
      expect(w.weekEnd).toBe(addDays(w.weekStart, 6));
      if (w.pick) {
        expect(w.pick.match.date >= w.weekStart && w.pick.match.date <= w.weekEnd).toBe(true);
      }
    }
    // Consecutive weeks, 7 days apart.
    for (let i = 1; i < weeks.length; i++) {
      expect(weeks[i]?.weekStart).toBe(addDays(weeks[i - 1]?.weekStart ?? "", 7));
    }
  });

  it("skips weeks without eligible home matches (Christmas break) and keeps them visible", () => {
    const weeks = planDervioRotation(PLAN);
    expect(weeks).toHaveLength(29);
    expect(weeks.filter((w) => !w.pick).map((w) => [w.weekStart, w.skipReason])).toEqual([
      ["2026-12-21", "no-eligible-home-match"],
      ["2026-12-28", "no-eligible-home-match"],
      ["2027-01-11", "no-eligible-home-match"],
      ["2027-02-08", "no-eligible-home-match"],
      ["2027-02-22", "no-eligible-home-match"],
      ["2027-03-15", "no-eligible-home-match"],
      ["2027-03-22", "no-eligible-home-match"],
      ["2027-04-26", "no-eligible-home-match"],
    ]);
  });

  it("lights not verified: two more weeks become all-excluded", () => {
    const weeks = planDervioRotation(PLAN, { lightsVerified: false });
    const gaps = weeks.filter((w) => !w.pick).map((w) => [w.weekStart, w.skipReason]);
    expect(gaps).toEqual([
      ["2026-11-16", "all-excluded"],
      ["2026-12-21", "no-eligible-home-match"],
      ["2026-12-28", "no-eligible-home-match"],
      ["2027-01-11", "no-eligible-home-match"],
      ["2027-02-08", "no-eligible-home-match"],
      ["2027-02-22", "no-eligible-home-match"],
      ["2027-03-15", "no-eligible-home-match"],
      ["2027-03-22", "no-eligible-home-match"],
      ["2027-04-12", "all-excluded"],
      ["2027-04-26", "no-eligible-home-match"],
    ]);
    expect(weeks).toHaveLength(29);
  });

  it("when the next team's match is excluded, the following team in age order plays", () => {
    const weeks = planDervioRotation(
      [
        m("late", "2026-10-24", "piccoli", { time: "16:30" }), // 3v3 ends 17:15 → lights
        m("ok", "2026-10-24", "pulcini", { time: "10:00" }),
      ],
      { lightsVerified: false },
    );
    expect(weeks[0]?.pick?.match.id).toBe("ok");
    expect(weeks[0]?.excluded).toEqual([
      { matchId: "late", group: "piccoli", date: "2026-10-24", reason: "needs-lights" },
    ]);
  });

  it("unknown kick-off is excluded while the lights are not verified (fail-closed)", () => {
    const weeks = planDervioRotation([m("x", "2026-10-24", "u15", { time: null })], {
      lightsVerified: false,
    });
    expect(weeks[0]?.pick).toBeNull();
    expect(weeks[0]?.excluded[0]?.reason).toBe("kickoff-unknown");
    const verified = planDervioRotation([m("x", "2026-10-24", "u15", { time: null })]);
    expect(verified[0]?.pick?.match.id).toBe("x");
    expect(verified[0]?.pick?.endMin).toBeNull();
  });

  it("calendar end time wins over the default duration", () => {
    expect(matchEndMin(m("a", "2026-10-24", "u16", { time: "15:30" }))).toBe(17 * 60 + 15);
    expect(matchEndMin(m("b", "2026-10-24", "u16", { time: "15:30", end: "16:55" }))).toBe(
      16 * 60 + 55,
    );
    expect(matchEndMin(m("c", "2026-10-24", "u16", { time: "15:30", end: "15:00" }))).toBe(
      17 * 60 + 15,
    );
    const off = { lightsVerified: false };
    expect(
      exclusionReason(m("b", "2026-10-24", "u16", { time: "15:30", end: "16:55" }), off),
    ).toBeNull();
    expect(exclusionReason(m("a", "2026-10-24", "u16", { time: "15:30" }), off)).toBe(
      "needs-lights",
    );
    expect(exclusionReason(m("a", "2026-10-24", "u16", { time: "15:30" }))).toBeNull();
  });

  it("esordienti (annata da verificare) and Prima Squadra are excluded with a visible reason", () => {
    const weeks = planDervioRotation([
      m("es", "2026-10-24", "esordienti"),
      m("prima", "2026-10-25", "prima"),
    ]);
    expect(weeks[0]?.pick).toBeNull();
    expect(weeks[0]?.skipReason).toBe("all-excluded");
    expect(weeks[0]?.excluded.map((e) => [e.group, e.reason])).toEqual([
      ["esordienti", "group-year-unverified"],
      ["prima", "group-not-in-rotation"],
    ]);
    expect(EXCLUSION_LABEL["group-year-unverified"]).toMatch(/Annata da verificare/);
  });

  it("rejects invalid start or end dates", () => {
    expect(() => planDervioRotation(PLAN, { startDate: "24/10/2026" })).toThrow(RangeError);
    expect(() => planDervioRotation(PLAN, { endDate: "2026-02-30" })).toThrow(RangeError);
  });

  it("a skipped week does not advance the rotation", () => {
    const weeks = planDervioRotation([
      m("1", "2026-10-24", "piccoli"),
      // week of 26/10 empty
      m("2", "2026-11-07", "u19"),
      m("3", "2026-11-07", "primicalci"),
    ]);
    expect(weeks.map((w) => w.pick?.group ?? null)).toEqual(["piccoli", null, "primicalci"]);
  });

  it("rotates upward in strict age order when every team plays at home every week", () => {
    const all: DervioCandidate[] = [];
    for (let week = 0; week < 10; week++) {
      const sat = addDays(DERVIO_START_DATE, week * 7);
      DERVIO_AGE_ORDER.forEach((g) => all.push(m(`${g}-${week}`, sat, g)));
    }
    const groups = dervioPicks(planDervioRotation(all)).map((p) => p.group);
    expect(groups).toEqual([...DERVIO_AGE_ORDER, "piccoli", "primicalci"]);
  });

  it("takes the next team in age order that has a home match, wrapping around after Juniores", () => {
    const groups = dervioPicks(
      planDervioRotation([
        m("a", "2026-10-24", "u19"),
        m("b", "2026-10-31", "u16"),
        m("c", "2026-10-31", "u19"),
        m("d", "2026-11-07", "u15"),
        m("e", "2026-11-07", "2015"),
      ]),
    ).map((p) => p.group);
    // u19 (only one) → next after u19 wraps to piccoli…: u16 first in cyclic order → then 2015.
    expect(groups).toEqual(["u19", "u16", "2015"]);
  });

  it("with two matches of the same team in a week, picks the earliest", () => {
    const weeks = planDervioRotation([
      m("late", "2026-10-25", "piccoli", { time: "10:00" }),
      m("early", "2026-10-24", "piccoli", { time: "16:00" }),
    ]);
    expect(weeks).toHaveLength(1);
    expect(weeks[0]?.pick?.match.id).toBe("early");
  });

  it("ignores away matches, other groups and matches before the start date", () => {
    const weeks = planDervioRotation([
      m("before", "2026-10-21", "piccoli"),
      m("away", "2026-10-24", "piccoli", { home: false }),
      m("prima", "2026-10-24", "prima"),
      m("ok", "2026-10-24", "u15"),
    ]);
    expect(weeks).toHaveLength(1);
    expect(weeks[0]?.pick?.match.id).toBe("ok");
  });

  it("resumes after a given last group", () => {
    const weeks = planDervioRotation(
      [m("a", "2026-10-24", "piccoli"), m("b", "2026-10-24", "u16")],
      { lastGroup: "u15" },
    );
    expect(weeks[0]?.pick?.group).toBe("u16");
  });

  it("plans empty weeks until endDate and returns nothing without candidates", () => {
    expect(planDervioRotation([])).toEqual([]);
    const weeks = planDervioRotation([], { endDate: "2026-11-08" });
    expect(weeks.map((w) => w.weekStart)).toEqual(["2026-10-19", "2026-10-26", "2026-11-02"]);
    expect(weeks.every((w) => w.pick === null)).toBe(true);
  });

  it("endDate cuts later matches", () => {
    const picks = dervioPicks(planDervioRotation(PLAN, { endDate: "2026-11-08" }));
    expect(picks.map((p) => p.group)).toEqual(["primicalci", "pulcini", "u16"]);
  });

  it("does not mutate the input", () => {
    const copy = JSON.parse(JSON.stringify(PLAN));
    planDervioRotation(PLAN);
    expect(PLAN).toEqual(copy);
  });
});

describe("dervioChecklist", () => {
  const RAIN = { date: "2026-11-07", precipitationProbability: 90 };

  it("weekly list: tasks plus the Comune note, no Comune task, no rain-move items", () => {
    const items = dervioChecklist({ matchDate: "2026-11-07", today: "2026-10-16" });
    expect(items.map((i) => i.id)).toEqual([
      "team-notice",
      "weather-check",
      "all-notice",
      "club-page",
      "weather-decision",
      "comune-season-note",
    ]);
    expect(byId(items, "comune-season-note")).toMatchObject({
      kind: "note",
      status: "info",
      dueDate: null,
      daysLeft: null,
      label: "Comune di Dervio informato con il programma stagionale",
    });
    expect(items.every((i) => i.kind !== "conditional")).toBe(true);
  });

  it("order follows CHECKLIST_ORDER when every item is present", () => {
    const items = dervioChecklist({
      matchDate: "2026-11-07",
      today: "2026-10-16",
      group: "u16",
      movedToColico: true,
    });
    expect(items.map((i) => i.id)).toEqual(CHECKLIST_ORDER);
    expect(items).toHaveLength(9);
  });

  it("first match 24/10: team notice already overdue on 16/10, all notice on 21/10", () => {
    const items = dervioChecklist({ matchDate: "2026-10-24", today: "2026-10-16" });
    expect(byId(items, "team-notice")).toMatchObject({
      kind: "task",
      dueDate: "2026-10-10",
      status: "overdue",
      daysLeft: -6,
    });
    expect(byId(items, "all-notice")).toMatchObject({
      dueDate: "2026-10-21",
      status: "upcoming",
      daysLeft: 5,
    });
    expect(byId(items, "club-page").dueDate).toBe("2026-10-21");
    expect(byId(items, "weather-check").dueDate).toBe("2026-10-21");
    expect(byId(items, "weather-decision").dueDate).toBe("2026-10-23");
  });

  it("T-14 and T-3 are calendar days across the DST change of 25/10/2026", () => {
    // 07/11 → T-14 = 24/10 (before DST end), T-3 = 04/11.
    let items = dervioChecklist({ matchDate: "2026-11-07", today: "2026-10-16" });
    expect(byId(items, "team-notice").dueDate).toBe("2026-10-24");
    expect(byId(items, "all-notice").dueDate).toBe("2026-11-04");
    // 27/10 → T-3 = 24/10, T-1 = 26/10.
    items = dervioChecklist({ matchDate: "2026-10-27", today: "2026-10-16" });
    expect(byId(items, "all-notice").dueDate).toBe("2026-10-24");
    expect(byId(items, "weather-decision").dueDate).toBe("2026-10-26");
    // 26/10 → T-1 = 25/10 (the DST day itself).
    items = dervioChecklist({ matchDate: "2026-10-26", today: "2026-10-16" });
    expect(byId(items, "weather-decision").dueDate).toBe("2026-10-25");
    // Spring DST (28/03/2027): 09/04 → T-14 = 26/03.
    items = dervioChecklist({ matchDate: "2027-04-09", today: "2026-10-16" });
    expect(byId(items, "team-notice").dueDate).toBe("2027-03-26");
  });

  it("daysLeft counts calendar days across DST", () => {
    const items = dervioChecklist({ matchDate: "2026-11-07", today: "2026-10-24" });
    expect(byId(items, "team-notice")).toMatchObject({ status: "due-today", daysLeft: 0 });
    expect(byId(items, "all-notice").daysLeft).toBe(11);
  });

  it("U16 at Dervio carries the note 'anticipare orario U16 (sabato)', other teams do not", () => {
    const u16 = dervioChecklist({ matchDate: "2026-11-07", today: "2026-10-16", group: "u16" });
    expect(byId(u16, "u16-time-note")).toMatchObject({
      kind: "note",
      status: "info",
      dueDate: null,
      owner: "direzione",
    });
    expect(byId(u16, "u16-time-note").label).toMatch(/^Anticipare orario U16 \(sabato\)/);
    const u15 = dervioChecklist({ matchDate: "2026-11-07", today: "2026-10-16", group: "u15" });
    expect(u15.some((i) => i.id === "u16-time-note")).toBe(false);
    const done = dervioChecklist({
      matchDate: "2026-11-07",
      today: "2026-10-16",
      group: "u16",
      done: ["u16-time-note"],
    });
    expect(byId(done, "u16-time-note").status).toBe("done");
  });

  it("rain move back to Colico adds FIGC (LND/SGS) and opponent + referee items on T-1", () => {
    const items = dervioChecklist({
      matchDate: "2026-11-07",
      today: "2026-11-06",
      movedToColico: true,
    });
    expect(byId(items, "lnd-sgs-field-change")).toMatchObject({
      kind: "conditional",
      dueDate: "2026-11-06",
      status: "due-today",
      owner: "segreteria",
    });
    expect(byId(items, "lnd-sgs-field-change").label).toContain("FIGC");
    expect(byId(items, "opponent-referee-notice")).toMatchObject({
      kind: "conditional",
      dueDate: "2026-11-06",
      status: "due-today",
    });
    expect(byId(items, "opponent-referee-notice").label).toContain("avversaria");
  });

  it("rain rule saying 'valuta cambio giorno' shows the rain-move items; dry or missing does not", () => {
    const wet = rainDecision("2026-11-07", RAIN);
    expect(rainMoveActive({ rain: wet })).toBe(true);
    const withRain = dervioChecklist({ matchDate: "2026-11-07", today: "2026-11-04", rain: wet });
    expect(withRain.filter((i) => i.kind === "conditional").map((i) => i.id)).toEqual([
      "lnd-sgs-field-change",
      "opponent-referee-notice",
    ]);
    const dry = rainDecision("2026-11-07", { date: "2026-11-07", precipitationProbability: 5 });
    const missing = rainDecision("2026-11-07", null);
    for (const rain of [dry, missing]) {
      const items = dervioChecklist({ matchDate: "2026-11-07", today: "2026-11-04", rain });
      expect(items.some((i) => i.kind === "conditional")).toBe(false);
    }
    expect(rainMoveActive({})).toBe(false);
    expect(rainMoveActive({ movedToColico: false, rain: null })).toBe(false);
  });

  it("winter alone never adds rain-move items (inverno sì, se piove no)", () => {
    const items = dervioChecklist({ matchDate: "2027-01-09", today: "2027-01-01" });
    expect(items.some((i) => i.kind === "conditional")).toBe(false);
  });

  it("lead days can be injected", () => {
    const items = dervioChecklist({
      matchDate: "2026-11-07",
      today: "2026-10-16",
      movedToColico: true,
      leadDays: { teamNotice: 10, rainMoveNotice: 0 },
    });
    expect(byId(items, "team-notice").dueDate).toBe("2026-10-28");
    expect(byId(items, "lnd-sgs-field-change").dueDate).toBe("2026-11-07");
  });

  it("done items are done, also when late (set or array)", () => {
    const items = dervioChecklist({
      matchDate: "2026-10-24",
      today: "2026-10-16",
      done: ["team-notice"],
    });
    expect(byId(items, "team-notice").status).toBe("done");
    const viaSet = dervioChecklist({
      matchDate: "2026-10-24",
      today: "2026-10-25",
      movedToColico: true,
      done: new Set<ChecklistItemId>(["lnd-sgs-field-change"]),
    });
    expect(byId(viaSet, "lnd-sgs-field-change").status).toBe("done");
    expect(byId(viaSet, "opponent-referee-notice").status).toBe("overdue");
  });

  it("weather decision is not applicable on a synthetic pitch, kept when surface is unknown", () => {
    const synth = dervioChecklist({
      matchDate: "2026-11-07",
      today: "2026-10-16",
      surface: "synthetic",
    });
    expect(byId(synth, "weather-decision").status).toBe("not-applicable");
    expect(byId(synth, "weather-check").status).toBe("upcoming");
    const unknown = dervioChecklist({
      matchDate: "2026-11-07",
      today: "2026-10-16",
      surface: "unknown",
    });
    expect(byId(unknown, "weather-decision").status).toBe("upcoming");
  });

  it("surface comes from the facility registry (PITCHES.DV: erba naturale)", () => {
    expect(DERVIO_SURFACE).toBe("grass");
    expect(surfaceFromText("erba naturale")).toBe("grass");
    expect(surfaceFromText("sintetico")).toBe("synthetic");
    expect(surfaceFromText("")).toBe("unknown");
    expect(surfaceFromText(null)).toBe("unknown");
    const items = dervioChecklist({ matchDate: "2026-11-07", today: "2026-10-16" });
    expect(byId(items, "weather-decision").status).toBe("upcoming");
  });

  it("rejects invalid matchDate or today", () => {
    expect(() => dervioChecklist({ matchDate: "2026-13-01", today: "2026-10-16" })).toThrow(
      RangeError,
    );
    expect(() => dervioChecklist({ matchDate: "2026-11-07", today: "16/10/2026" })).toThrow(
      RangeError,
    );
    expect(isIsoDay("2027-02-29")).toBe(false);
    expect(isIsoDay("2028-02-29")).toBe(true);
    expect(isIsoDay(20261016)).toBe(false);
  });

  it("lead days are clamped to integers 0–60", () => {
    expect(MAX_LEAD_DAYS).toBe(60);
    const lead = resolveLeadDays({
      teamNotice: 400,
      allNotice: -5,
      weatherCheck: 2.6,
      weatherDecision: Number.NaN,
      rainMoveNotice: Number.POSITIVE_INFINITY,
    });
    expect(lead).toEqual({
      teamNotice: 60,
      allNotice: 0,
      weatherCheck: 3,
      weatherDecision: 1,
      rainMoveNotice: 1,
    });
    expect(resolveLeadDays()).toEqual({
      teamNotice: 14,
      allNotice: 3,
      weatherCheck: 3,
      weatherDecision: 1,
      rainMoveNotice: 1,
    });
  });

  it("summary counts every status", () => {
    const items = dervioChecklist({
      matchDate: "2026-10-24",
      today: "2026-10-21",
      group: "u16",
      done: ["u16-time-note"],
    });
    expect(checklistSummary(items)).toEqual({
      done: 1, // U16 note
      overdue: 1, // team notice (10/10)
      "due-today": 3, // all notice, club page, weather check (21/10)
      upcoming: 1, // weather decision (23/10)
      "no-deadline": 0,
      "not-applicable": 0,
      info: 1, // Comune note
    });
  });

  it("itemStatus precedence: not applicable > done > no deadline > dates", () => {
    expect(itemStatus("2026-10-01", "2026-10-16", true, false)).toBe("not-applicable");
    expect(itemStatus("2026-10-01", "2026-10-16", true)).toBe("done");
    expect(itemStatus(null, "2026-10-16", false)).toBe("no-deadline");
    expect(itemStatus("2026-10-15", "2026-10-16", false)).toBe("overdue");
    expect(itemStatus("2026-10-16", "2026-10-16", false)).toBe("due-today");
    expect(itemStatus("2026-10-17", "2026-10-16", false)).toBe("upcoming");
  });

  it("labels and owners contain roles only, no personal names", () => {
    const items = dervioChecklist({
      matchDate: "2026-11-07",
      today: "2026-10-16",
      group: "u16",
      movedToColico: true,
    });
    for (const i of items) {
      expect(["segreteria", "responsabile-impianti", "direzione"]).toContain(i.owner);
      expect(i.label.length).toBeGreaterThan(0);
    }
  });
});


describe("rainDecision", () => {
  it("rain forecast on grass → valuta cambio giorno, decided the day before", () => {
    const d = rainDecision("2026-10-24", { date: "2026-10-24", precipitationProbability: 80 });
    expect(d).toEqual({
      verdict: "valuta-cambio-giorno",
      evaluateDayChange: true,
      checkOn: "2026-10-21",
      decideOn: "2026-10-23",
    });
  });

  it("decision day across DST: match 26/10 → decide 25/10, check 23/10", () => {
    const d = rainDecision("2026-10-26", { date: "2026-10-26", precipitationMm: 4 });
    expect(d.decideOn).toBe("2026-10-25");
    expect(d.checkOn).toBe("2026-10-23");
    expect(d.evaluateDayChange).toBe(true);
  });

  it("mm alone is enough, probability alone is enough", () => {
    expect(rainDecision("2026-10-24", { date: "2026-10-24", precipitationMm: 1 }).verdict).toBe(
      "valuta-cambio-giorno",
    );
    expect(
      rainDecision("2026-10-24", { date: "2026-10-24", precipitationProbability: 50 }).verdict,
    ).toBe("valuta-cambio-giorno");
  });

  it("dry forecast → nessuna pioggia", () => {
    const d = rainDecision("2026-10-24", {
      date: "2026-10-24",
      precipitationProbability: 20,
      precipitationMm: 0,
    });
    expect(d.verdict).toBe("nessuna-pioggia");
    expect(d.evaluateDayChange).toBe(false);
  });

  it("missing or mismatched forecast is never 'no rain'", () => {
    expect(rainDecision("2026-10-24", null).verdict).toBe("previsione-mancante");
    expect(rainDecision("2026-10-24", undefined).verdict).toBe("previsione-mancante");
    expect(
      rainDecision("2026-10-24", { date: "2026-10-23", precipitationProbability: 90 }).verdict,
    ).toBe("previsione-mancante");
    expect(
      rainDecision("2026-10-24", {
        date: "2026-10-24",
        precipitationProbability: null,
        precipitationMm: Number.NaN,
      }).verdict,
    ).toBe("previsione-mancante");
  });

  it("synthetic pitch → rule does not apply", () => {
    const d = rainDecision(
      "2026-10-24",
      { date: "2026-10-24", precipitationProbability: 100 },
      { surface: "synthetic" },
    );
    expect(d.verdict).toBe("non-erba");
    expect(d.evaluateDayChange).toBe(false);
  });

  it("thresholds can be injected", () => {
    const f = { date: "2026-10-24", precipitationProbability: 60 };
    expect(rainDecision("2026-10-24", f, { thresholds: { minProbability: 70 } }).verdict).toBe(
      "nessuna-pioggia",
    );
  });

  it("thresholds are clamped to 0–100 and non-numbers fall back to defaults", () => {
    const f = { date: "2026-10-24", precipitationProbability: 100 };
    // 500% would never trigger; clamped to 100 it does.
    expect(rainDecision("2026-10-24", f, { thresholds: { minProbability: 500 } }).verdict).toBe(
      "valuta-cambio-giorno",
    );
    const dry = { date: "2026-10-24", precipitationProbability: 10, precipitationMm: 0 };
    // -20 clamped to 0: any forecast counts as rain.
    expect(rainDecision("2026-10-24", dry, { thresholds: { minMm: -20 } }).verdict).toBe(
      "valuta-cambio-giorno",
    );
    expect(
      rainDecision("2026-10-24", dry, { thresholds: { minProbability: Number.NaN } }).verdict,
    ).toBe("nessuna-pioggia");
  });

  it("rejects an invalid match date", () => {
    expect(() => rainDecision("2026-10-32", null)).toThrow(RangeError);
  });

  it("uses the checklist dates for every pick of the draft plan", () => {
    for (const p of dervioPicks(planDervioRotation(PLAN))) {
      const d = rainDecision(p.match.date, null);
      expect(d.checkOn).toBe(addDays(p.match.date, -3));
      expect(d.decideOn).toBe(addDays(p.match.date, -1));
    }
  });
});
