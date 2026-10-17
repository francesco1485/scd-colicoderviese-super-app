import { describe, expect, it } from "vitest";

import { loadQuadro } from "./quadro-data.server";
import { findSessions } from "./public-snapshots";
import { defaultDay, isFree, minutesOf, pitchZones, slotEnd, slotStates, trainingKids, weekdayKey } from "./training-view";

const q = loadQuadro();

describe("training view", () => {
  it("maps dates to the board's weekday keys", () => {
    expect(weekdayKey("2026-10-12")).toBe("LUNEDÌ");
    expect(weekdayKey("2026-10-16")).toBe("VENERDÌ");
    expect(weekdayKey("2026-10-11")).toBe("DOMENICA");
    expect(weekdayKey("boh")).toBeNull();
    expect(defaultDay(q.days, "2026-10-14")).toBe("MERCOLEDÌ");
    expect(defaultDay(q.days, "2026-10-11")).toBe("LUNEDÌ");
  });

  it("reads times and slot ends", () => {
    expect(minutesOf("17:20")).toBe(1040);
    expect(minutesOf("25:00")).toBeNaN();
    expect(slotEnd({ start: 1040, timeLabel: "17:20–18:50" })).toBe(1130);
    expect(slotEnd({ start: 1040, timeLabel: "boh" })).toBe(1130);
    expect(slotEnd({ start: 1040, end: 1100, timeLabel: "17:20–18:50" })).toBe(1100);
  });

  it("marks live, next and done only for today", () => {
    const slots = [
      { start: 1040, timeLabel: "17:20–18:50" },
      { start: 1140, timeLabel: "19:00–20:20" },
      { start: 1210, timeLabel: "20:10–21:20" },
    ];
    expect(slotStates(slots, true, 1100)).toEqual(["live", "next", "later"]);
    expect(slotStates(slots, true, 1135)).toEqual(["done", "next", "later"]);
    expect(slotStates(slots, true, 1215)).toEqual(["done", "live", "live"]);
    expect(slotStates(slots, true, 1300)).toEqual(["done", "done", "done"]);
    expect(slotStates(slots, false, 1100)).toEqual(["later", "later", "later"]);
  });

  it("finds the zone split of a slot from the rotations", () => {
    const z = pitchZones(q.rotations, "LUNEDÌ", "A", 1040, "C1");
    expect(z?.map((x) => x.key)).toEqual(["A", "B", "C"]);
    expect(z?.[0]?.label).toBe("U15 2012/13");
    const b = pitchZones(q.rotations, "LUNEDÌ", "B", 1040, "C2");
    expect(b?.[0]?.label).toBe("Piccoli Amici 2020/21");
    expect(pitchZones(q.rotations, "LUNEDÌ", "A", 999, "C1")).toBeNull();
  });

  it("treats empty and dash as a free pitch", () => {
    expect(isFree("")).toBe(true);
    expect(isFree(" — ")).toBe(true);
    expect(isFree("U16")).toBe(false);
  });
});

describe("trainingKids", () => {
  const m = (displayName: string, birthYear: number | null, minor: boolean | null, relationship = "FIGLIO", teamCodes: string[] = []) => ({ displayName, birthYear, minor, relationship, teamCodes });

  it("uses the birth year when the board names it", () => {
    expect(trainingKids([m("Anna Rossi", 2015, true)], q.slots)).toEqual([{ firstName: "Anna", key: "2015" }]);
  });

  it("finds the board sessions from the birth year through the verified annata table (2011 = U16)", () => {
    const out = trainingKids([m("Marco Rossi", 2011, true, "FIGLIO", ["u16"])], q.slots);
    expect(out).toEqual([{ firstName: "Marco", key: "2011" }]);
    expect(findSessions(q.slots, "2011")).toEqual(findSessions(q.slots, "U16"));
  });

  it("falls back to the team category when the year is outside the 2026/27 table", () => {
    const out = trainingKids([m("Marco Rossi", 2007, true, "FIGLIO", ["u16"])], q.slots);
    expect(out).toEqual([{ firstName: "Marco", key: "U16" }]);
  });

  it("a child whose year and team are not on the board gets no key (no empty week)", () => {
    const slots = q.slots.filter((s) => !/2014|u13|under 13/i.test(`${s.fields.C1} ${s.fields.C2}`));
    expect(trainingKids([m("Luca Rossi", 2014, true, "FIGLIO", ["2014"])], slots)).toEqual([{ firstName: "Luca", key: null }]);
  });

  it("drops parents, adults and duplicates and never exposes surname or team code", () => {
    const out = trainingKids([
      m("Maria Rossi", 1980, false, "MADRE"),
      m("Paolo Rossi", 1978, true, "PADRE"),
      m("Gianni Rossi", 2005, false),
      m("Anna Rossi Bianchi", 2015, true, "FIGLIO", ["u16"]),
      m("Anna  Rossi", 2015, true),
    ], q.slots);
    expect(out).toEqual([{ firstName: "Anna", key: "2015" }]);
    expect(JSON.stringify(out)).not.toMatch(/Rossi|Bianchi|u16/);
  });
});
