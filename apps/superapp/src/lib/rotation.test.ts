import { describe, expect, it } from "vitest";

import snapshot from "@/data/calendario-snapshot-20261010.json";
import { spaceById } from "./facilities";
import {
  COMUNE_DERVIO_NOTE,
  DEFAULT_OPTIONS,
  RAIN_MOVE_NOTICE_TO,
  TEAM_NOTICE_DAYS,
  analyse,
  bookingToItem,
  checkSlot,
  daySlots,
  dervioAllowed,
  freeWindows,
  homeMatches,
  homePitchOf,
  layoutPitch,
  minusDays,
  overlaps,
  parseStoredBookings,
  pitchUnits,
  simulate,
  unitsToVerify,
  validateBooking,
  withBookings,
  GROUP_FORMAT,
  PITCHES,
  PRESETS,
  ROOMS,
  roomClashes,
  roomGuidance,
  type Booking,
  type MatchFormat,
  type ScenarioOptions,
  type SnapshotEvent,
} from "./rotation";

const REAL = homeMatches(snapshot.events as SnapshotEvent[]);
const TODAY = "2026-10-11";
const aOpts = (o: { startDate?: string; lightsVerified?: boolean } = {}) => ({
  today: TODAY,
  startDate: o.startDate ?? DEFAULT_OPTIONS.startDate,
  buffer: 15,
  maxDervioPerDay: 2,
  lightsVerified: o.lightsVerified ?? false,
});

let n = 0;
function ev(
  group: string,
  date: string,
  time: string,
  venue = "COLICO - CAMPO 1",
  end = "",
): SnapshotEvent {
  return {
    id: `T${++n}`,
    date,
    time,
    end,
    group,
    venue,
    opponent: "Avversario",
  };
}
const opts = (o: Partial<ScenarioOptions> = {}): ScenarioOptions => ({
  ...DEFAULT_OPTIONS,
  ...o,
  modes: { ...DEFAULT_OPTIONS.modes, ...(o.modes ?? {}) },
});
const U16_DERVIO = { u15: "colico", u16: "dervio", u19: "colico" } as const;

describe("formats and durations", () => {
  it("maps every group to its format", () => {
    expect(["prima", "u19", "u16", "u15"].map((g) => GROUP_FORMAT[g])).toEqual([
      11, 11, 11, 11,
    ]);
    expect(["2014", "2015", "esordienti"].map((g) => GROUP_FORMAT[g])).toEqual([
      9, 9, 9,
    ]);
    expect([
      GROUP_FORMAT["pulcini"],
      GROUP_FORMAT["primicalci"],
      GROUP_FORMAT["piccoli"],
    ]).toEqual([7, 5, 3]);
    expect(GROUP_FORMAT["other"]).toBeUndefined();
  });

  it("uses the default duration only when the calendar has no end", () => {
    const list = homeMatches([
      ev("u19", "2026-10-03", "15:00"),
      ev("2014", "2026-10-03", "15:00"),
      ev("pulcini", "2026-10-03", "15:00"),
      ev("primicalci", "2026-10-03", "15:00", "COLICO - CAMPO 2"),
      ev("piccoli", "2026-10-03", "15:00", "COLICO - CAMPO 2"),
    ]);
    const byGroup = Object.fromEntries(
      list.map((m) => [m.group, m.end - m.start]),
    );
    expect(byGroup).toEqual({
      u19: 105,
      "2014": 75,
      pulcini: 60,
      primicalci: 60,
      piccoli: 45,
    });
    const [known] = homeMatches([
      ev("u16", "2026-10-04", "18:00", "COLICO - CAMPO 1", "19:30"),
    ]);
    expect(known!.end).toBe(19 * 60 + 30);
    expect(known!.endKnown).toBe(true);
  });

  it("reads only home matches at Colico and skips unknown formats", () => {
    expect(homePitchOf("COLICO - CAMPO 1")).toBe("C1");
    expect(homePitchOf("COLICO - CAMPO 2 (sintetico)")).toBe("C2");
    expect(homePitchOf("Sondrio - CONI")).toBeNull();
    expect(
      homeMatches([
        ev("other", "2026-10-03", "15:00"),
        ev("u15", "2026-10-03", ""),
        ev("u15", "2026-10-03", "10:30", "Merate"),
      ]),
    ).toHaveLength(0);
    expect(REAL).toHaveLength(78);
    expect(new Set(REAL.map((m) => m.id)).size).toBe(REAL.length);
  });
});

describe("pitch capacity", () => {
  it("Colico campo 1 (100x60): 11=1, 9=1/2, 7=1/2, 5=1/3, 3=1/4", () => {
    expect(
      ([11, 9, 7, 5, 3] as MatchFormat[]).map((f) => pitchUnits("C1", f)),
    ).toEqual([1, 1 / 2, 1 / 2, 1 / 3, 1 / 4]);
  });
  it("Colico campo 2 (synthetic 96x48, master SEDI E IMPIANTI): like Dervio, 11v11 flagged to verify", () => {
    expect(
      ([11, 9, 7, 5, 3] as MatchFormat[]).map((f) => pitchUnits("C2", f)),
    ).toEqual([1, 1, 1 / 2, 1 / 3, 1 / 4]);
    expect(unitsToVerify("C2", 11)).toBe(true);
    expect(unitsToVerify("C2", 9)).toBe(false);
    expect(unitsToVerify("C2", 7)).toBe(false);
    expect(PITCHES.C2.size).toBe("96 × 48 m");
    expect(PITCHES.C2.spaceId).toBe("SPA-COL-C2");
  });
  it("Dervio campo 1 (96x48 grass): 11=1, 9=1 (to verify), 7=1/2, 5=1/3", () => {
    expect(
      ([11, 9, 7, 5] as MatchFormat[]).map((f) => pitchUnits("DV", f)),
    ).toEqual([1, 1, 1 / 2, 1 / 3]);
    expect(unitsToVerify("DV", 9)).toBe(true);
    expect(pitchUnits("DV", "full")).toBe(1);
  });
});

describe("over-capacity", () => {
  it("two 9v9 fit on campo 1, a third match does not", () => {
    const two = homeMatches([
      ev("2014", "2026-10-03", "15:00"),
      ev("2015", "2026-10-03", "15:00"),
    ]);
    expect(overlaps(two, "C1", 15).ids.size).toBe(0);
    const three = homeMatches([
      ev("2014", "2026-10-03", "15:00"),
      ev("2015", "2026-10-03", "15:00"),
      ev("pulcini", "2026-10-03", "15:30"),
    ]);
    const r = overlaps(three, "C1", 15);
    expect(r.ids.size).toBe(3);
    expect(r.peak).toBeCloseTo(1.5);
  });

  it("counts the changeover buffer", () => {
    // U19 15:00 + 105 = 16:45; the U16 at 17:00 collides only with a buffer above 15 minutes.
    const day = homeMatches([
      ev("u19", "2026-10-03", "15:00"),
      ev("u16", "2026-10-03", "17:00"),
    ]);
    expect(overlaps(day, "C1", 15).ids.size).toBe(0);
    expect(overlaps(day, "C1", 20).ids.size).toBe(2);
  });

  it("finds the real Saturday overlaps with everything at Colico (17/10, 31/10, 14/11)", () => {
    const res = analyse(simulate(REAL, opts()), aOpts());
    for (const d of ["2026-10-17", "2026-10-31", "2026-11-14"])
      expect(res.conflictDays, d).toContain(d);
    const groupsOver = (date: string) => {
      const day = res.days.find((d) => d.date === date)!;
      return day.matches
        .filter((m) => day.over.C1.has(m.id))
        .map((m) => m.group)
        .sort();
    };
    expect(groupsOver("2026-10-17")).toEqual(["2014", "u19"]);
    expect(groupsOver("2026-10-31")).toEqual(
      expect.arrayContaining(["2014", "pulcini", "u19"]),
    );
    expect(groupsOver("2026-11-14")).toEqual(
      expect.arrayContaining(["2014", "2015", "pulcini"]),
    );
  });

  it("splits conflict days before and after the Dervio start date", () => {
    const res = analyse(simulate(REAL, opts()), aOpts());
    expect(res.conflictDaysBefore).toEqual(
      expect.arrayContaining(["2026-10-17", "2026-10-31", "2026-11-14"]),
    );
    expect(res.conflictDaysBefore.every((d) => d < "2026-11-15")).toBe(true);
    expect(res.conflictDaysAfter.every((d) => d >= "2026-11-15")).toBe(true);
    expect(res.conflictDaysBefore.length + res.conflictDaysAfter.length).toBe(
      res.conflictDays.length,
    );
  });
});

describe("scenarios", () => {
  const sat = (d: string) => [
    ev("u15", d, "15:00"),
    ev("u16", d, "15:00"),
    ev("prima", d, "15:30"),
  ];

  it("never moves the Prima Squadra or matches before the start date, and never mutates input", () => {
    const list = homeMatches([...sat("2026-11-07"), ...sat("2026-11-21")]);
    const out = simulate(
      list,
      opts({ modes: { u15: "dervio", u16: "dervio", u19: "dervio" } }),
    );
    expect(
      out.filter((m) => m.group === "prima").every((m) => m.pitch === "C1"),
    ).toBe(true);
    expect(
      out.filter((m) => m.date === "2026-11-07").every((m) => !m.moved),
    ).toBe(true);
    expect(
      out
        .filter((m) => m.date === "2026-11-21" && m.group !== "prima")
        .every((m) => m.pitch === "DV"),
    ).toBe(true);
    expect(list.every((m) => m.pitch === m.homePitch && !m.moved)).toBe(true);
  });

  it("alternate moves every other home match from the start date", () => {
    const list = homeMatches(
      [
        "2026-11-01",
        "2026-11-15",
        "2026-11-22",
        "2026-11-29",
        "2026-12-06",
      ].map((d) => ev("u15", d, "10:30")),
    );
    const out = simulate(
      list,
      opts({ modes: { u15: "alternate", u16: "colico", u19: "colico" } }),
    );
    expect(out.map((m) => m.pitch)).toEqual(["C1", "DV", "C1", "DV", "C1"]);
  });

  it("closes Dervio from December to February when asked", () => {
    const list = homeMatches(
      ["2026-11-29", "2026-12-06", "2027-01-17", "2027-03-07"].map((d) =>
        ev("u16", d, "18:00"),
      ),
    );
    const out = simulate(
      list,
      opts({ modes: U16_DERVIO, dervioClosedInWinter: true }),
    );
    expect(out.map((m) => m.pitch)).toEqual(["DV", "C1", "C1", "DV"]);
    expect(
      dervioAllowed(out[1]!, {
        startDate: "2026-11-15",
        dervioClosedInWinter: true,
      }),
    ).toBe(false);
  });

  it("auto moves only the conflicting youth match, U15 first", () => {
    const list = homeMatches([
      ev("u19", "2026-11-21", "15:00"),
      ev("u15", "2026-11-21", "15:00"),
      ev("u16", "2026-11-21", "18:00"),
    ]);
    const out = simulate(list, opts({ auto: true }));
    expect(out.filter((m) => m.moved).map((m) => m.group)).toEqual(["u15"]);
    expect(out.find((m) => m.group === "u16")!.pitch).toBe("C1");
    expect(overlaps(out, "C1", 15).ids.size).toBe(0);
  });

  it("auto respects the start date and does not create overlaps at Dervio", () => {
    const before = simulate(
      homeMatches([
        ev("u19", "2026-11-14", "15:00"),
        ev("u15", "2026-11-14", "15:00"),
      ]),
      opts({ auto: true }),
    );
    expect(before.some((m) => m.moved)).toBe(false);
    // Three 11v11 at 15:00: one can go to Dervio, a second would overlap there.
    const three = simulate(
      homeMatches([
        ev("u19", "2026-11-21", "15:00"),
        ev("u15", "2026-11-21", "15:00"),
        ev("u16", "2026-11-21", "15:00"),
      ]),
      opts({ auto: true }),
    );
    expect(three.filter((m) => m.moved)).toHaveLength(1);
    expect(overlaps(three, "DV", 15).ids.size).toBe(0);
  });

  it("auto stops at the max matches per day at Dervio", () => {
    const list = homeMatches([
      ev("u19", "2026-11-21", "10:00"),
      ev("u15", "2026-11-21", "10:00"),
      ev("u19", "2026-11-21", "15:00"),
      ev("u16", "2026-11-21", "15:00"),
    ]);
    expect(
      simulate(list, opts({ auto: true, maxDervioPerDay: 1 })).filter(
        (m) => m.moved,
      ),
    ).toHaveLength(1);
    expect(
      simulate(list, opts({ auto: true, maxDervioPerDay: 2 })).filter(
        (m) => m.moved,
      ),
    ).toHaveLength(2);
  });

  it("auto on the real snapshot only moves youth 11v11 from the start date, with no overlap at Dervio", () => {
    const now = analyse(simulate(REAL, opts()), aOpts());
    const res = analyse(simulate(REAL, opts({ auto: true })), aOpts());
    expect(res.conflictDaysAfter.length).toBeLessThanOrEqual(
      now.conflictDaysAfter.length,
    );
    expect(res.conflictDaysBefore).toEqual(now.conflictDaysBefore);
    expect(res.dervioOverlapDays).toEqual([]);
    expect(
      res.dervio.every(
        (d) =>
          ["u15", "u16", "u19"].includes(d.match.group) &&
          d.match.date >= "2026-11-15",
      ),
    ).toBe(true);
    expect(PRESETS.find((p) => p.id === "auto")!.auto).toBe(true);
  });
});

describe("analysis outputs", () => {
  const moveU16 = (d: string, t: string) =>
    analyse(
      simulate(homeMatches([ev("u16", d, t)]), opts({ modes: U16_DERVIO })),
      aOpts(),
    );

  it("gives the team notice date 14 days before (no Comune notice) and flags it late against today", () => {
    expect(TEAM_NOTICE_DAYS).toBe(14);
    const r = moveU16("2026-11-15", "10:30");
    expect(r.dervio[0]!.noticeBy).toBe("2026-11-01");
    expect(r.dervio[0]!.late).toBe(false);
    expect(r.dervio[0]!.daysToNotice).toBe(21);
    expect(r.firstNotice).toBe("2026-11-01");
    expect(minusDays("2026-11-15", 14)).toBe("2026-11-01");
    const late = analyse(
      simulate(
        homeMatches([ev("u16", "2026-10-18", "10:30")]),
        opts({ startDate: "2026-10-12", modes: U16_DERVIO }),
      ),
      aOpts({ startDate: "2026-10-12" }),
    );
    expect(late.lateNotices).toBe(1);
    const issue = late.days[0]!.issues.find((i) => i.code === "dv-notice-late");
    expect(issue).toMatchObject({ severity: "warn" });
    expect(issue!.text).toMatch(/avviso alla squadra/);
    expect(late.days.flatMap((d) => d.issues).map((i) => i.text).join(" ")).not.toMatch(/Comune/);
  });

  it("states the DG 2026-10-16 notice rules: Comune informed by the season programme, rain move to FIGC and opponent", () => {
    expect(COMUNE_DERVIO_NOTE).toMatch(/programma stagionale/);
    expect(COMUNE_DERVIO_NOTE).toMatch(/nessun avviso gara per gara/);
    expect(RAIN_MOVE_NOTICE_TO).toBe("FIGC (LND/SGS) e squadra avversaria");
  });

  it("flags evening matches at Dervio unless lights are verified", () => {
    expect(moveU16("2026-11-21", "16:00").lightsNeeded).toBe(1);
    expect(moveU16("2026-11-21", "10:30").lightsNeeded).toBe(0);
    const lit = analyse(
      simulate(
        homeMatches([ev("u16", "2026-11-21", "18:00")]),
        opts({ modes: U16_DERVIO }),
      ),
      aOpts({ lightsVerified: true }),
    );
    expect(lit.lightsNeeded).toBe(0);
  });

  it("flags winter matches on grass", () => {
    expect(moveU16("2026-12-06", "10:30").winterGrass).toBe(1);
    expect(moveU16("2026-11-29", "10:30").winterGrass).toBe(0);
  });

  it("warns only about 11v11 on campo 2 (96x48); 9v9 fits there", () => {
    const r = analyse(
      simulate(
        homeMatches([
          ev("2015", "2026-09-19", "15:00", "COLICO - CAMPO 2"),
          ev("u15", "2026-09-20", "10:00", "COLICO - CAMPO 2"),
        ]),
        opts(),
      ),
      aOpts(),
    );
    expect(r.c2FormatDays).toEqual(["2026-09-20"]);
    expect(r.days[1]!.issues[0]!.text).toMatch(/misure da verificare per l'11/);
    // The real snapshot has only 9v9 and smaller formats on campo 2.
    expect(analyse(simulate(REAL, opts()), aOpts()).c2FormatDays).toEqual([]);
  });

  it("warns when Dervio gets more matches than the daily max", () => {
    const list = homeMatches([
      ev("u15", "2026-11-21", "09:00"),
      ev("u16", "2026-11-21", "11:00"),
      ev("u19", "2026-11-21", "13:00"),
    ]);
    const r = analyse(
      simulate(
        list,
        opts({ modes: { u15: "dervio", u16: "dervio", u19: "dervio" } }),
      ),
      aOpts(),
    );
    expect(r.dervioTooManyDays).toEqual(["2026-11-21"]);
  });
});

describe("hypothetical bookings", () => {
  const base: Omit<Booking, "id"> = {
    kind: "affitto",
    pitch: "C2",
    date: "2026-10-18",
    start: "18:00",
    duration: 90,
    format: "full",
    title: "ASD Esempio",
  };

  it("validates fields and refuses personal data", () => {
    expect(validateBooking(base)).toEqual([]);
    expect(validateBooking({ ...base, title: "" }).join()).toMatch(
      /nome dell'ente/,
    );
    expect(
      validateBooking({ ...base, title: "info@example.com" }).join(),
    ).toMatch(/email/);
    expect(
      validateBooking({ ...base, title: "Chiamare 333 123 4567" }).join(),
    ).toMatch(/telefono/);
    expect(validateBooking({ ...base, start: "25:00" }).length).toBeGreaterThan(
      0,
    );
    expect(validateBooking({ ...base, duration: 5 }).length).toBeGreaterThan(0);
    expect(
      validateBooking({ ...base, start: "23:30", duration: 60 }).join(),
    ).toMatch(/mezzanotte/);
    expect(
      validateBooking({ ...base, date: "2026-02-30" }).length,
    ).toBeGreaterThan(0);
    expect(
      validateBooking({ ...base, date: "2026-13-45" }).length,
    ).toBeGreaterThan(0);
    expect(
      validateBooking({ ...base, kind: "manutenzione", title: "" }),
    ).toEqual([]);
  });

  it("is checked by the same capacity engine as the matches", () => {
    const morning: Booking = {
      ...base,
      id: "a",
      kind: "torneo",
      pitch: "C1",
      date: "2026-10-17",
      start: "09:00",
      duration: 240,
      title: "",
    };
    const res = analyse(
      simulate(withBookings(REAL, [morning]), opts()),
      aOpts(),
    );
    expect(res.bookingConflicts).toEqual([]);
    expect(
      res.days
        .find((d) => d.date === "2026-10-17")!
        .matches.some((m) => m.id === "ipotesi-a"),
    ).toBe(true);
    const clash: Booking = { ...morning, id: "b", start: "14:00" };
    const res2 = analyse(
      simulate(withBookings(REAL, [clash]), opts()),
      aOpts(),
    );
    expect(res2.bookingConflicts).toEqual(["ipotesi-b"]);
    expect(
      res2.days
        .find((d) => d.date === "2026-10-17")!
        .issues.some((i) => i.code === "booking-conflict"),
    ).toBe(true);
  });

  it("two bookings can clash with each other", () => {
    const a: Booking = {
      ...base,
      id: "x",
      pitch: "DV",
      date: "2026-12-01",
      start: "10:00",
      kind: "manutenzione",
      title: "",
    };
    const b: Booking = {
      ...base,
      id: "y",
      pitch: "DV",
      date: "2026-12-01",
      start: "11:00",
      kind: "allenamento",
      format: 7,
      title: "U15",
    };
    expect(
      analyse(
        simulate(withBookings([], [a, b]), opts()),
        aOpts(),
      ).bookingConflicts.sort(),
    ).toEqual(["ipotesi-x", "ipotesi-y"]);
  });

  it("never moves a booking and skips invalid ones", () => {
    const ok: Booking = {
      ...base,
      id: "k",
      pitch: "C1",
      date: "2026-11-21",
      kind: "gara",
      format: 11,
      title: "Amichevole",
    };
    const bad: Booking = { ...base, id: "z", duration: 0 };
    const out = simulate(
      withBookings([], [ok, bad]),
      opts({
        auto: true,
        modes: { u15: "dervio", u16: "dervio", u19: "dervio" },
      }),
    );
    expect(out).toHaveLength(1);
    expect(out[0]!.pitch).toBe("C1");
    expect(bookingToItem(ok).kind).toBe("gara");
  });

  it("parses stored bookings defensively", () => {
    const good: Booking = { ...base, id: "s1" };
    expect(
      parseStoredBookings(JSON.stringify([good, { id: 3 }, null])),
    ).toEqual([good]);
    expect(parseStoredBookings("not json")).toEqual([]);
    expect(parseStoredBookings(null)).toEqual([]);
  });

  it("finds free windows and checks a slot", () => {
    const day = homeMatches([
      ev("u19", "2026-10-17", "15:00", "COLICO - CAMPO 1", "16:45"),
      ev("u16", "2026-10-17", "18:00", "COLICO - CAMPO 1", "19:45"),
    ]);
    expect(
      freeWindows(day, "C1", {
        from: 9 * 60,
        to: 22 * 60,
        minLength: 180,
        buffer: 15,
      }),
    ).toEqual([{ pitch: "C1", start: 540, end: 885 }]);
    expect(checkSlot(day, "C1", 15 * 60, 90, 9, 15).fits).toBe(false);
    expect(checkSlot(day, "C1", 10 * 60, 90, "full", 15).fits).toBe(true);
    expect(checkSlot(day, "C2", 10 * 60, 90, 11, 15).fits).toBe(false);
    expect(
      checkSlot(day, "C1", 14 * 60, 90, 9, 15).sharing.map((m) => m.group),
    ).toEqual(["u19"]);
  });
});

describe("pitch layout for the map", () => {
  it("places the biggest formats first and marks what does not fit", () => {
    const day = homeMatches([
      ev("2014", "2026-10-17", "15:00"),
      ev("u19", "2026-10-17", "15:00"),
    ]);
    const slots = layoutPitch(day, "C1");
    expect(slots[0]!.match.group).toBe("u19");
    expect(slots[0]!.overflow).toBe(false);
    expect(slots[1]!.overflow).toBe(true);
    const halves = layoutPitch(
      homeMatches([
        ev("2014", "2026-10-17", "15:00"),
        ev("pulcini", "2026-10-17", "15:00"),
      ]),
      "C1",
    );
    expect(halves.map((s) => [s.x, s.w, s.overflow])).toEqual([
      [0, 0.5, false],
      [0.5, 0.5, false],
    ]);
    expect(daySlots(day)).toEqual([900]);
  });
});

describe("changing rooms and the bookings register", () => {
  const quadroRooms = [
    {
      week: "A",
      day: "LUNEDÌ",
      id: "SP1",
      start: 1040,
      end: 1130,
      group: "U15",
    },
    { week: "B", day: "LUNEDÌ", id: "SP2", start: 1040, end: 1130, group: "—" },
  ];
  const draft = {
    kind: "allenamento" as const,
    pitch: "C1" as const,
    date: "2026-10-12", // Monday
    start: "17:00",
    duration: 60,
    format: 7 as const,
    title: "U16",
    rooms: ["SP1", "SP2"] as const,
  };

  it("finds rooms already assigned by the training board, ignoring empty cells", () => {
    const c = roomClashes(draft, [], quadroRooms, 15);
    expect(c).toEqual([
      {
        room: "SP1",
        by: "U15",
        start: 1040,
        end: 1130,
        source: "quadro",
        week: "A",
      },
    ]);
    expect(
      roomClashes({ ...draft, date: "2026-10-13" }, [], quadroRooms, 15),
    ).toEqual([]);
    expect(
      roomClashes({ ...draft, start: "09:00" }, [], quadroRooms, 15),
    ).toEqual([]);
  });

  it("finds rooms taken by another ipotesi on the same day, buffer included", () => {
    const other: Booking = {
      ...draft,
      id: "o",
      start: "18:10",
      rooms: ["SP2"],
      title: "Torneo",
    };
    expect(
      roomClashes(draft, [other], [], 15).map((c) => [c.room, c.source, c.by]),
    ).toEqual([["SP2", "ipotesi", "Torneo"]]);
    expect(roomClashes(draft, [other], [], 5)).toEqual([]);
  });

  it("refuses rooms at Dervio and unknown room ids", () => {
    expect(validateBooking({ ...draft, pitch: "DV" }).join()).toMatch(/Dervio/);
    expect(
      validateBooking({ ...draft, rooms: ["SP9" as "SP1"] }).join(),
    ).toMatch(/Spogliatoio non valido/);
    expect(validateBooking(draft)).toEqual([]);
  });

  it("labels room rules: referees' room from the master, the rest proposed", () => {
    const g = roomGuidance("gara");
    expect(g.find((x) => /arbitri/i.test(x.text))!.basis).toBe("fonte");
    expect(
      g.some((x) => x.basis === "regola proposta" && /15 minuti/.test(x.text)),
    ).toBe(true);
    for (const k of [
      "allenamento",
      "gara",
      "torneo",
      "affitto",
      "manutenzione",
    ] as const)
      expect(roomGuidance(k).length).toBeGreaterThan(0);
  });
});

describe("facility register ids", () => {
  it("takes changing rooms and pitch space ids from config/scd-facilities.v1.json", () => {
    expect(ROOMS.map((r) => [r.id, r.spaceId])).toEqual([
      ["SP1", "SPA-COL-SP1"],
      ["SP2", "SPA-COL-SP2"],
      ["SP3", "SPA-COL-SP3"],
      ["SP4", "SPA-COL-SP4"],
      ["ARB", "SPA-COL-ARB"],
    ]);
    for (const p of Object.values(PITCHES)) {
      const sp = spaceById(p.spaceId);
      expect(sp, p.spaceId).toBeDefined();
      expect(sp!.site).toBe(p.siteId);
    }
  });
});
