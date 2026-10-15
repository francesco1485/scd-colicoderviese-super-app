import { describe, expect, it } from "vitest";

import { parseRequestMessage } from "./request-parser";

// Thursday 15 October 2026, 15:07 in Rome.
const NOW = new Date("2026-10-15T13:07:00Z");
const p = (t: string, now = NOW) => parseRequestMessage(t, now);

describe("parseRequestMessage", () => {
  it("reads the full example message", () => {
    const r = p("amichevole U15 sabato 24 ore 15 a Colico con Olginatese");
    expect(r).toMatchObject({
      kind: "AMICHEVOLE",
      teamKey: "u15",
      date: "2026-10-24",
      time: "15:00",
      venue: "Colico",
      homeAway: "CASA",
      opponent: "Olginatese",
    });
    expect(r.warnings).toEqual([]);
  });

  it("never invents a date when weekday and day do not match", () => {
    // 25 October 2026 is a Sunday.
    const r = p("amichevole U15 sabato 25 ore 15 a Colico con Olginatese");
    expect(r.date).toBeNull();
    expect(r.warnings.join(" ")).toMatch(/sabato 25/);
    expect(r.time).toBe("15:00");
    expect(r.opponent).toBe("Olginatese");
  });

  it("resolves a bare weekday to the next one after today", () => {
    expect(p("amichevole pulcini sabato").date).toBe("2026-10-17");
    expect(p("amichevole pulcini giovedì").date).toBe("2026-10-22");
  });

  it("resolves dd/mm in the future, rolling to next year when already past", () => {
    expect(p("amichevole 2015 il 20/10 alle 10:30").date).toBe("2026-10-20");
    expect(p("amichevole 2015 il 20/10 alle 10:30").time).toBe("10:30");
    expect(p("amichevole 2015 10/01 ore 9").date).toBe("2027-01-10");
    expect(p("amichevole 2015 01/03/2027").date).toBe("2027-03-01");
  });

  it("refuses an explicit past date and an impossible date", () => {
    const past = p("amichevole 2015 01/03/2026");
    expect(past.date).toBeNull();
    expect(past.warnings.join(" ")).toMatch(/già passata/);
    expect(p("amichevole 2015 31/02").date).toBeNull();
  });

  it("reads month names, oggi, domani and dopodomani", () => {
    expect(p("amichevole juniores 7 novembre ore 18").date).toBe("2026-11-07");
    expect(p("amichevole juniores domani ore 18").date).toBe("2026-10-16");
    expect(p("amichevole juniores dopodomani").date).toBe("2026-10-17");
    expect(p("amichevole juniores il 3").date).toBe("2026-11-03");
  });

  it("uses Europe/Rome for 'today' around midnight", () => {
    // 23:30 UTC on 15/10 is already 16/10 in Rome.
    expect(p("amichevole u19 domani", new Date("2026-10-15T22:30:00Z")).date).toBe("2026-10-17");
  });

  it("reads times with 'e mezza', dots and bare HH:MM", () => {
    expect(p("amichevole u16 sabato alle 15 e mezza").time).toBe("15:30");
    expect(p("amichevole u16 sabato ore 15.45").time).toBe("15:45");
    expect(p("amichevole u16 sabato 17:30").time).toBe("17:30");
    expect(p("amichevole u16 sabato ore 25").time).toBeNull();
  });

  it("recognises every team and stays null when unsure", () => {
    expect(p("amichevole prima squadra").teamKey).toBe("prima");
    expect(p("amichevole under 19").teamKey).toBe("u19");
    expect(p("amichevole giovanissimi").teamKey).toBe("u15");
    expect(p("amichevole esordienti 2014").teamKey).toBe("2014");
    expect(p("amichevole primi calci").teamKey).toBe("primicalci");
    expect(p("amichevole piccoli amici").teamKey).toBe("piccoli");
    const es = p("amichevole esordienti");
    expect(es.teamKey).toBeNull();
    expect(es.warnings.join(" ")).toMatch(/annata/);
    expect(p("amichevole u15 e u16").teamKey).toBeNull();
    expect(p("amichevole sabato").teamKey).toBeNull();
  });

  it("reads away venues and home/away words", () => {
    const away = p("amichevole U16 sabato ore 16 a Olginate contro la Olginatese");
    expect(away.venue).toBe("Olginate");
    expect(away.homeAway).toBe("FUORI");
    expect(away.opponent).toBe("Olginatese");
    const dervio = p("amichevole pulcini domenica al campo di Dervio con Bellano");
    expect(dervio.venue).toBe("Dervio");
    expect(dervio.homeAway).toBe("CASA");
    expect(dervio.opponent).toBe("Bellano");
    const c2 = p("amichevole 2015 sabato a Colico campo 2 con Alto Lario Calcio");
    expect(c2.venue).toBe("Colico · Campo 2");
    expect(c2.opponent).toBe("Alto Lario Calcio");
    const trasf = p("amichevole 2015 sabato in trasferta con Dongo");
    expect(trasf.homeAway).toBe("FUORI");
    expect(trasf.venue).toBeNull();
  });

  it("leaves everything null on an unrelated message and says why", () => {
    const r = p("ciao, ci vediamo dopo");
    expect(r).toMatchObject({ kind: null, teamKey: null, date: null, time: null, venue: null, homeAway: null, opponent: null });
    expect(r.warnings.length).toBeGreaterThanOrEqual(5);
  });

  it("is bounded and total on hostile input", () => {
    const long = "amichevole ".repeat(500);
    expect(() => p(long)).not.toThrow();
    expect(p("").kind).toBeNull();
    expect(p("con ").opponent).toBeNull();
  });
});
