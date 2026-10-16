import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import type { TrainingSlot } from "./public-snapshots";
import { CLUB_HOUSE_HOURS, PULMINO_ZONES, publicTrainingDay } from "./public-training";

const slot = (day: string, timeLabel: string, C1: string, C2 = ""): TrainingSlot => ({
  day, timeLabel, start: 0, fields: { C1, C2 }, rooms: { SP1: "", SP2: "", SP3: "", SP4: "" },
});

const SLOTS = [
  slot("LUNEDÌ", "18:30–20:00", "Under 16", "U15 2012/2013 + U12 2015"),
  slot("LUNEDÌ", "17:00–18:15", "PICCOLI AMICI"),
  slot("MERCOLEDÌ", "20:00–21:30", "INTERO — Prima Squadra • Promozione"),
];

describe("public training evening (UD-140)", () => {
  it("shows today's evening when it has sessions, ordered by time, with pitch and short team labels only", () => {
    const day = publicTrainingDay(SLOTS, "2026-10-19"); // lunedì
    expect(day?.date).toBe("2026-10-19");
    expect(day?.rows.map((r) => [r.time, r.end, r.field, r.teams])).toEqual([
      ["17:00", "18:15", "Campo 1", "Piccoli Amici"],
      ["18:30", "20:00", "Campo 1", "U16"],
      ["18:30", "20:00", "Campo 2", "U15 + U12"],
    ]);
    expect(Object.keys(day!.rows[0]!).sort()).toEqual(["end", "field", "id", "teams", "time"]);
  });

  it("jumps to the next training evening on days without sessions and on the weekend", () => {
    expect(publicTrainingDay(SLOTS, "2026-10-20")?.date).toBe("2026-10-21"); // martedì → mercoledì
    expect(publicTrainingDay(SLOTS, "2026-10-17")?.date).toBe("2026-10-19"); // sabato → lunedì
    expect(publicTrainingDay([], "2026-10-19")).toBeNull();
  });

  it("states the Club House hours and the four minibus zones given by Francesco", () => {
    expect(CLUB_HOUSE_HOURS).toEqual({ days: "Lunedì–venerdì", from: "17:00", to: "21:00" });
    expect(PULMINO_ZONES.map((z) => z.label)).toEqual(["Lago", "Lecco", "Valtellina", "Chiavenna"]);
  });

  it("the public server function returns one evening only, never the full quadro", () => {
    const src = readFileSync(resolve(__dirname, "quadro.functions.ts"), "utf8");
    const pub = src.slice(src.indexOf("export const getPublicTrainings"));
    expect(pub).toMatch(/return publicTrainingDay\(loadQuadro\(\)\.slots, data\.today\)/);
    expect(pub).not.toMatch(/QUADRO_SNAPSHOT|rotations|rooms/);
  });
});
