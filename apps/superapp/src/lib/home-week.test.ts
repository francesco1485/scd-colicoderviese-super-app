import { describe, expect, test } from "vitest";

import type { Match } from "./club.types";
import { calendarToWeekItems, countdownLabel, itemsOn, mergeWeekItems, nextMatchItem, r20MatchToWeekItem, romeToIso, todayAtCentre, weekItemToMatch } from "./home-week";
import { loadCalendar } from "./public-snapshots";

const { events, groups } = loadCalendar();
const items = calendarToWeekItems(events, groups);
const week = ["2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-10", "2026-10-11"];

describe("Home: settimana dal calendario validato", () => {
  test("settimana 5–11 ottobre 2026: 10 gare", () => {
    expect(week.flatMap((d) => itemsOn(items, d)).length).toBe(10);
  });
  test("sabato 10/10: 3 gare (Meda 14:30, Missaglia 15:00, Mandello 16:00)", () => {
    const today = itemsOn(items, "2026-10-10");
    expect(today.map((i) => `${i.time} ${i.title}`)).toEqual([
      "14:30 MEDA 1913 – SCD",
      "15:00 SCD – G.S.O. MISSAGLIA A.S.D.",
      "16:00 SCD – POL. MANDELLO DEL LARIO",
    ]);
  });
  test("stato di verifica onesto: Missaglia e Mandello con orario/sede da confermare", () => {
    const today = itemsOn(items, "2026-10-10");
    expect(today.filter((i) => !i.certain).map((i) => i.time)).toEqual(["15:00", "16:00"]);
  });
  test("oggi al centro sportivo: solo gare in casa a Colico/Dervio", () => {
    expect(todayAtCentre(items, "2026-10-10").map((i) => i.time)).toEqual(["15:00", "16:00"]);
  });
  test("prossima partita in base all'ora (Europe/Rome)", () => {
    expect(nextMatchItem(items, "2026-10-10", "13:00")?.title).toBe("MEDA 1913 – SCD");
    expect(nextMatchItem(items, "2026-10-10", "15:30")?.title).toBe("SCD – POL. MANDELLO DEL LARIO");
    expect(nextMatchItem(items, "2026-10-10", "18:00")?.date).toBe("2026-10-11");
  });
  test("countdown per giorni di calendario, non per 24 ore", () => {
    expect(countdownLabel("2026-10-10", "2026-10-10")).toBe("Oggi");
    expect(countdownLabel("2026-10-10", "2026-10-11")).toBe("Domani");
    expect(countdownLabel("2026-10-10", "2026-10-14")).toBe("Tra 4 giorni");
    expect(countdownLabel("2026-10-10", "2026-10-09")).toBeNull();
  });
});

describe("Home: unione con R20 senza doppioni", () => {
  const r20Meda: Match = { id: "x1", competizione: "", squadra: "Juniores", casa: "Meda 1913", ospite: "S.C.D. ColicoDerviese", startAt: "2026-10-10T12:30:00.000Z", dataLabel: "", golCasa: null, golOspite: null };
  const r20Other: Match = { id: "x2", competizione: "", squadra: "Prima Squadra", casa: "ColicoDerviese", ospite: "Squadra Nuova", startAt: "2026-10-09T18:00:00.000Z", dataLabel: "", golCasa: null, golOspite: null };
  test("stessa data e avversario: resta la voce del calendario", () => {
    const merged = mergeWeekItems(items, [r20MatchToWeekItem(r20Meda)!]);
    expect(merged.length).toBe(items.length);
  });
  test("gara solo R20: aggiunta e ordinata", () => {
    const merged = mergeWeekItems(items, [r20MatchToWeekItem(r20Other)!]);
    expect(merged.length).toBe(items.length + 1);
    expect(itemsOn(merged, "2026-10-09").map((i) => i.origin)).toContain("r20");
  });
});

describe("Home: conversione per il Match center", () => {
  test("ora locale Europe/Rome -> ISO (ora legale e solare)", () => {
    expect(romeToIso("2026-10-10", "14:30")).toBe("2026-10-10T12:30:00.000Z");
    expect(romeToIso("2026-11-15", "14:30")).toBe("2026-11-15T13:30:00.000Z");
  });
  test("gara in casa con orario da confermare", () => {
    const i = itemsOn(items, "2026-10-10").find((x) => x.time === "15:00")!;
    const m = weekItemToMatch(i, "G.S.O. MISSAGLIA A.S.D.");
    expect(m.casa).toBe("S.C.D. ColicoDerviese");
    expect(m.dataLabel).toContain("orario da confermare");
    expect(m.campo).toBe("COLICO - CAMPO 1");
  });
});
