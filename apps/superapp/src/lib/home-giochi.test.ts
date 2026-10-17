import { describe, expect, it } from "vitest";

import { QUIZ, SFIDE, dayIndex, quizOfDay, romeDateOf, sfidaKey, sfidaOfWeek, weekIndex, weekMonday } from "./home-giochi";

describe("sfida della settimana and quiz del giorno", () => {
  it("has enough typed, unique content", () => {
    expect(SFIDE.length).toBeGreaterThanOrEqual(12);
    expect(QUIZ.length).toBeGreaterThanOrEqual(20);
    expect(new Set(SFIDE.map((s) => s.id)).size).toBe(SFIDE.length);
    expect(new Set(QUIZ.map((q) => q.id)).size).toBe(QUIZ.length);
    for (const q of QUIZ) {
      expect(new Set(q.answers).size, q.id).toBe(3);
      expect([0, 1, 2]).toContain(q.correct);
      expect(q.why.length, q.id).toBeGreaterThan(10);
    }
  });

  it("uses only the verified territory facts and never states a club founding year", () => {
    const text = QUIZ.map((q) => `${q.q} ${q.answers.join(" ")} ${q.why}`).join(" ");
    expect(text).not.toMatch(/fondat|fondazione|nata nel|nato nel/i);
    const years = new Set(QUIZ.filter((q) => q.topic === "territorio").flatMap((q) => `${q.q} ${q.answers[q.correct]} ${q.why}`.match(/\b\d{3,4}\b/g) ?? []));
    for (const y of years) expect(["814", "1138", "1603", "1604", "1912", "1914", "2012", "13"], y).toContain(y);
    expect(QUIZ.some((q) => q.topic === "territorio")).toBe(true);
    expect(QUIZ.some((q) => q.topic === "regole")).toBe(true);
  });

  it("finds the ISO week Monday", () => {
    expect(weekMonday("2026-10-12")).toBe("2026-10-12"); // lunedì
    expect(weekMonday("2026-10-17")).toBe("2026-10-12"); // sabato
    expect(weekMonday("2026-10-18")).toBe("2026-10-12"); // domenica
    expect(weekMonday("2026-10-19")).toBe("2026-10-19");
    expect(weekMonday("2027-01-01")).toBe("2026-12-28"); // across the year
  });

  it("keeps the same challenge Monday to Sunday and changes it the next Monday", () => {
    const week = ["2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16", "2026-10-17", "2026-10-18"];
    const ids = new Set(week.map((d) => sfidaOfWeek(d).id));
    expect(ids.size).toBe(1);
    expect(sfidaOfWeek("2026-10-19").id).not.toBe(sfidaOfWeek("2026-10-18").id);
    expect(weekIndex("2026-10-19", SFIDE.length)).toBe((weekIndex("2026-10-12", SFIDE.length) + 1) % SFIDE.length);
    expect(sfidaKey("2026-10-17", sfidaOfWeek("2026-10-17"))).toBe(`scd.sfida.v1.2026-10-12.${sfidaOfWeek("2026-10-17").id}`);
  });

  it("rotates the quiz once a day, deterministic and through the whole list", () => {
    expect(quizOfDay("2026-10-17").id).toBe(quizOfDay("2026-10-17").id);
    expect(dayIndex("2026-10-18", QUIZ.length)).toBe((dayIndex("2026-10-17", QUIZ.length) + 1) % QUIZ.length);
    const seen = new Set<string>();
    for (let i = 0; i < QUIZ.length; i++) seen.add(quizOfDay(new Date(Date.UTC(2026, 9, 17 + i)).toISOString().slice(0, 10)).id);
    expect(seen.size).toBe(QUIZ.length);
    expect(dayIndex("2026-10-17", 0)).toBe(0);
  });

  it("reads the day in Europe/Rome, not UTC", () => {
    // 23:30 UTC on 17/10 is already 18/10 in Rome (CEST, UTC+2).
    expect(romeDateOf(Date.parse("2026-10-17T23:30:00Z"))).toBe("2026-10-18");
    expect(romeDateOf(Date.parse("2026-10-17T21:30:00Z"))).toBe("2026-10-17");
    // Winter time (CET, UTC+1): 23:30 UTC on 31/12 is 01/01 in Rome.
    expect(romeDateOf(Date.parse("2026-12-31T23:30:00Z"))).toBe("2027-01-01");
  });
});
