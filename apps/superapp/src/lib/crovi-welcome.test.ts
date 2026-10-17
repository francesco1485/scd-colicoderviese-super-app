import { describe, expect, it } from "vitest";

import {
  CROVI_CHIPS,
  CROVI_LINES,
  RESULT_REPORT_REPLY,
  croviLine,
  croviPose,
  croviPoseSrc,
  croviSlot,
  isResultReport,
  romeClock,
} from "./crovi-welcome";

/** Instant of a Rome local date and time (October 2026 is CEST, UTC+2 until 25/10). */
const rome = (date: string, time: string) => Date.parse(`${date}T${time}:00+02:00`);

describe("croviPose (UD-184)", () => {
  it("waves on weekdays, points Friday to Sunday, thumbs up on Monday", () => {
    expect(croviPose(rome("2026-10-19", "10:00"))).toBe("thumbs"); // Monday
    expect(croviPose(rome("2026-10-20", "10:00"))).toBe("wave"); // Tuesday
    expect(croviPose(rome("2026-10-21", "10:00"))).toBe("wave");
    expect(croviPose(rome("2026-10-22", "10:00"))).toBe("wave");
    expect(croviPose(rome("2026-10-23", "10:00"))).toBe("point"); // Friday
    expect(croviPose(rome("2026-10-17", "14:08"))).toBe("point"); // Saturday
    expect(croviPose(rome("2026-10-18", "10:00"))).toBe("point"); // Sunday
  });

  it("uses the Rome clock, not UTC: Sunday 23:30 UTC is already Monday in Rome", () => {
    expect(croviPose(Date.parse("2026-10-18T23:30:00Z"))).toBe("thumbs");
    expect(romeClock(Date.parse("2026-10-18T23:30:00Z"))).toEqual({ date: "2026-10-19", weekday: 1, hour: 1 });
  });

  it("points to the approved Crovi v3 cut-outs", () => {
    expect(croviPoseSrc("wave")).toBe("/media/crovi/v3/crovi-wave-440.webp");
    expect(croviPoseSrc("thumbs", 900)).toBe("/media/crovi/v3/crovi-thumbs-900.webp");
  });
});

describe("croviLine (UD-184)", () => {
  it("picks a line of the moment of the day, changing by date", () => {
    expect(croviSlot(7)).toBe("mattina");
    expect(croviSlot(15)).toBe("pomeriggio");
    expect(croviSlot(20)).toBe("sera");
    expect(croviSlot(2)).toBe("notte");
    expect(CROVI_LINES.mattina).toContain(croviLine(rome("2026-10-20", "08:00")));
    expect(CROVI_LINES.sera).toContain(croviLine(rome("2026-10-20", "20:00")));
    expect(CROVI_LINES.notte).toContain(croviLine(rome("2026-10-20", "01:00")));
    const days = new Set(["2026-10-20", "2026-10-21", "2026-10-22"].map((d) => croviLine(rome(d, "15:00"))));
    expect(days.size).toBe(3);
  });

  it("has twelve short lines, no digits (no invented facts) and no exclamation spam", () => {
    const all = Object.values(CROVI_LINES).flat();
    expect(all).toHaveLength(12);
    for (const l of all) {
      expect(l.length).toBeLessThanOrEqual(110);
      expect(l).not.toMatch(/\d/);
    }
  });

  it("names a home game only from the calendar, within three days, with its confirmed time", () => {
    const now = rome("2026-10-17", "14:08");
    expect(croviLine(now, { date: "2026-10-17", time: "15:30", opponent: "Mandello" })).toBe(
      "Oggi alle 15:30 si gioca in casa contro Mandello. Io il posto in tribuna l'ho già scaldato!",
    );
    expect(croviLine(now, { date: "2026-10-18", time: "10:00", opponent: "" })).toMatch(/^Domani alle 10:00 si gioca in casa\./);
    expect(croviLine(now, { date: "2026-10-20", time: "20:30", opponent: "Bellano" })).toMatch(/^Segnatevelo: martedì alle 20:30/);
    // Too far or malformed: the line of the moment.
    expect(CROVI_LINES.pomeriggio).toContain(croviLine(now, { date: "2026-10-25", time: "15:00", opponent: "X" }));
    expect(CROVI_LINES.pomeriggio).toContain(croviLine(now, { date: "2026-10-18", time: "", opponent: "X" }));
  });
});

describe("result reports (UD-182 / UD-184)", () => {
  it("recognises «Segnala un risultato» and similar", () => {
    expect(CROVI_CHIPS).toEqual(["Quando si gioca?", "Allenamenti di stasera", "Pulmini", "Segnala un risultato"]);
    for (const m of ["Segnala un risultato", "voglio segnalare il risultato", "ho il risultato della partita", "Risultato: 2-1"]) expect(isResultReport(m), m).toBe(true);
    for (const m of ["Quando si gioca?", "risultati ufficiali della prima squadra", "Pulmini"]) expect(isResultReport(m), m).toBe(false);
  });

  it("never writes a score and sends to the Segreteria and the official LND source", () => {
    expect(RESULT_REPORT_REPLY.text).not.toMatch(/\d/);
    expect(RESULT_REPORT_REPLY.text).toMatch(/fonte ufficiale LND/);
  });
});
