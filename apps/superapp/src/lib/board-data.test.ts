import { describe, expect, test } from "vitest";

import {
  addDays, dateParts, groupShort, homeMatchesOn, matchTitle, monthRange, quadroDay, recentlyUpdated, shortTeams,
  staffCounters, titleCase, trainingRowsFor, upcomingMatches, venueCase, weekRange,
} from "./board-data";
import { loadCalendar, loadQuadro } from "./public-snapshots";

const cal = loadCalendar();
const quadro = loadQuadro();

describe("date helpers (tavole)", () => {
  test("blocco data in italiano maiuscolo", () => {
    expect(dateParts("2026-10-11")).toEqual({ weekday: "DOM", day: "11", month: "OTT" });
    expect(dateParts("2026-11-10")).toEqual({ weekday: "MAR", day: "10", month: "NOV" });
  });
  test("settimana lunedì–domenica con etichetta della tavola", () => {
    expect(weekRange("2026-10-10")).toEqual({ from: "2026-10-05", to: "2026-10-11", label: "5 – 11 ottobre 2026" });
    expect(weekRange("2026-10-10", -2).label).toBe("21 – 27 settembre 2026");
    expect(weekRange("2026-10-01").label).toBe("28 settembre – 4 ottobre 2026");
    expect(weekRange("2026-12-31").label).toBe("28 dicembre 2026 – 3 gennaio 2027");
  });
  test("mese e somma giorni", () => {
    expect(monthRange("2026-10-10")).toEqual({ from: "2026-10-01", to: "2026-10-31", label: "ottobre 2026" });
    expect(monthRange("2026-10-10", 4).label).toBe("febbraio 2027");
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
  });
});

describe("quadro allenamenti -> righe della giornata", () => {
  test("solo lun–ven: sabato e domenica senza righe (stato vuoto onesto)", () => {
    expect(quadroDay("2026-10-10")).toBeNull();
    expect(quadroDay("2026-10-11")).toBeNull();
    expect(trainingRowsFor("2026-10-10", quadro.slots)).toEqual([]);
    expect(quadroDay("2026-10-05")).toBe("LUNEDÌ");
  });
  test("lunedì: una riga per campo occupato, ordinate per orario", () => {
    const rows = trainingRowsFor("2026-10-05", quadro.slots);
    expect(rows.length).toBe(4);
    expect(rows[0]).toMatchObject({ time: "17:20", end: "18:50", field: "C1", teams: "U15 + U12 + U11" });
    expect(rows.map((r) => r.time)).toEqual([...rows.map((r) => r.time)].sort());
  });
  test("filtro annata usa solo i campi del quadro", () => {
    const rows = trainingRowsFor("2026-10-09", quadro.slots, "U15");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ field: "C2", teams: "U15" });
  });
  test("etichette brevi dei gruppi", () => {
    expect(shortTeams("Primi Calci 2018-2019 + Piccoli Amici 2020-2021\nDue zone")).toBe("Primi Calci + Piccoli Amici");
    expect(shortTeams("INTERO — Prima Squadra • Promozione")).toBe("Prima Squadra");
    expect(shortTeams("Juniores Élite U19 (+ atleti ex U18 integrati)")).toBe("Juniores U19");
    expect(shortTeams("Under 15 2012/2013")).toBe("U15");
  });
});

describe("calendario validato -> tavole", () => {
  test("sabato 10/10: due gare in casa al centro sportivo (Missaglia, Mandello), Meda è in trasferta", () => {
    const home = homeMatchesOn(cal.events, "2026-10-10");
    expect(home.map((e) => e.opponent).join(" ")).toMatch(/MISSAGLIA.*MANDELLO/);
    expect(home.some((e) => /MEDA/.test(e.opponent))).toBe(false);
  });
  test("prossime gare da adesso", () => {
    const next = upcomingMatches(cal.events, "2026-10-10", "15:30");
    expect(next[0]!.opponent).toMatch(/MANDELLO/);
    expect(next.every((e) => e.date >= "2026-10-10")).toBe(true);
  });
  test("contatori Staff: solo numeri derivabili (squadre, gare), mai inventati", () => {
    const c = staffCounters(cal.groups, cal.events);
    expect(c.seasonMatches).toBe(156);
    expect(c.teams).toBe(cal.groups.filter((g) => g.count > 0 && g.id !== "other").length);
    expect(staffCounters([], [])).toEqual({ teams: null, seasonMatches: null });
  });
  test("titoli partita e nomi leggibili", () => {
    const g = cal.groups.find((x) => x.id === "prima");
    expect(groupShort(g)).toBe("Prima Squadra");
    expect(groupShort(cal.groups.find((x) => x.id === "u19"))).toBe("Juniores");
    expect(groupShort(cal.groups.find((x) => x.id === "primicalci"))).toBe("Primi Calci");
    expect(groupShort(cal.groups.find((x) => x.id === "2014"))).toBe("Esordienti 2014");
    expect(matchTitle({ homeAway: "CASA", opponent: "ALTA BRIANZA TAVERNERIO" }, "Prima Squadra")).toBe("Prima Squadra vs Alta Brianza Tavernerio");
    expect(matchTitle({ homeAway: "FUORI", opponent: "MEDA 1913" }, "Juniores")).toBe("Meda 1913 vs Juniores");
    expect(titleCase("G.S.O. MISSAGLIA A.S.D.")).toBe("G.S.O. Missaglia A.S.D.");
    expect(titleCase("Già scritto Bene")).toBe("Già scritto Bene");
  });
  test("sedi leggibili senza alterare sigle", () => {
    expect(venueCase('Meda - COMUNALE "BUSNELLI"')).toBe('Meda - Comunale "Busnelli"');
    expect(venueCase("COLICO - CAMPO 1")).toBe("Colico - Campo\u00a01");
    expect(venueCase('Sondrio - CONI "CASTELLINA 3" (E.A.)')).toBe('Sondrio - CONI "Castellina\u00a03" (E.A.)');
  });
  test("pallino campanella solo se il calendario è aggiornato da poco", () => {
    expect(recentlyUpdated("2026-10-09T20:36:32.903Z", new Date("2026-10-10T12:00:00Z"))).toBe(true);
    expect(recentlyUpdated("2026-10-09T20:36:32.903Z", new Date("2026-10-20T12:00:00Z"))).toBe(false);
    expect(recentlyUpdated("non-una-data", new Date())).toBe(false);
  });
});
