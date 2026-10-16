import { describe, expect, it } from "vitest";
import {
  CHECKLIST_ORDER,
  DERVIO_AGE_ORDER,
  DERVIO_START_DATE,
  addDays,
  checklistSummary,
  dervioChecklist,
  dervioPicks,
  eligibleCandidates,
  itemStatus,
  planDervioRotation,
  rainDecision,
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

/** Expected picks of the "Dervio 1" draft (one per week, youngest first, round robin). */
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

  it("reproduces the Dervio 1 draft on the 2026/27 plan", () => {
    const picks = dervioPicks(planDervioRotation(PLAN));
    expect(picks.map((p) => [p.match.date, p.group])).toEqual(EXPECTED);
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
    const gaps = weeks.filter((w) => !w.pick).map((w) => w.weekStart);
    expect(gaps).toEqual([
      "2026-12-21",
      "2026-12-28",
      "2027-01-11",
      "2027-02-08",
      "2027-02-22",
      "2027-03-15",
      "2027-03-22",
      "2027-04-26",
    ]);
    for (const w of weeks.filter((x) => !x.pick)) {
      expect(w.skipReason).toBe("no-eligible-home-match");
    }
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
      m("early", "2026-10-24", "piccoli", { time: "17:00" }),
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
  it("has the eight items in a fixed order", () => {
    const items = dervioChecklist({ matchDate: "2026-11-07", today: "2026-10-16" });
    expect(items.map((i) => i.id)).toEqual(CHECKLIST_ORDER);
    expect(items).toHaveLength(8);
  });

  it("first match 24/10: team notice already overdue on 16/10, all notice on 21/10", () => {
    const items = dervioChecklist({ matchDate: "2026-10-24", today: "2026-10-16" });
    expect(byId(items, "team-notice")).toMatchObject({
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
    expect(byId(items, "comune-notice")).toMatchObject({ dueDate: "2026-09-24", status: "overdue" });
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

  it("LND/SGS and guests+referee have no invented deadline", () => {
    const items = dervioChecklist({ matchDate: "2026-11-07", today: "2026-10-16" });
    expect(byId(items, "lnd-sgs-field-change")).toMatchObject({
      dueDate: null,
      daysLeft: null,
      status: "no-deadline",
    });
    expect(byId(items, "guests-referee-notice").status).toBe("no-deadline");
  });

  it("lead days can be injected", () => {
    const items = dervioChecklist({
      matchDate: "2026-11-07",
      today: "2026-10-16",
      leadDays: { lndSgsFieldChange: 10, guestsRefereeNotice: 5, comuneNotice: null },
    });
    expect(byId(items, "lnd-sgs-field-change").dueDate).toBe("2026-10-28");
    expect(byId(items, "guests-referee-notice").dueDate).toBe("2026-11-02");
    expect(byId(items, "comune-notice").status).toBe("no-deadline");
  });

  it("done items are done, also when late (set or array)", () => {
    const items = dervioChecklist({
      matchDate: "2026-10-24",
      today: "2026-10-16",
      done: ["team-notice", "lnd-sgs-field-change"],
    });
    expect(byId(items, "team-notice").status).toBe("done");
    expect(byId(items, "lnd-sgs-field-change").status).toBe("done");
    const viaSet = dervioChecklist({
      matchDate: "2026-10-24",
      today: "2026-10-16",
      done: new Set<ChecklistItemId>(["comune-notice"]),
    });
    expect(byId(viaSet, "comune-notice").status).toBe("done");
  });

  it("weather decision is not applicable on a synthetic pitch, kept when surface is unknown", () => {
    const synth = dervioChecklist({ matchDate: "2026-11-07", today: "2026-10-16", surface: "synthetic" });
    expect(byId(synth, "weather-decision").status).toBe("not-applicable");
    expect(byId(synth, "weather-check").status).toBe("upcoming");
    const unknown = dervioChecklist({ matchDate: "2026-11-07", today: "2026-10-16", surface: "unknown" });
    expect(byId(unknown, "weather-decision").status).toBe("upcoming");
  });

  it("summary counts every status", () => {
    const items = dervioChecklist({
      matchDate: "2026-10-24",
      today: "2026-10-21",
      done: ["comune-notice"],
    });
    const s = checklistSummary(items);
    expect(s).toEqual({
      done: 1,
      overdue: 1, // team notice (10/10)
      "due-today": 3, // all notice, club page, weather check (21/10)
      upcoming: 1, // weather decision (23/10)
      "no-deadline": 2,
      "not-applicable": 0,
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
    const items = dervioChecklist({ matchDate: "2026-11-07", today: "2026-10-16" });
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

  it("uses the checklist dates for every pick of the draft plan", () => {
    for (const p of dervioPicks(planDervioRotation(PLAN))) {
      const d = rainDecision(p.match.date, null);
      expect(d.checkOn).toBe(addDays(p.match.date, -3));
      expect(d.decideOn).toBe(addDays(p.match.date, -1));
    }
  });
});
