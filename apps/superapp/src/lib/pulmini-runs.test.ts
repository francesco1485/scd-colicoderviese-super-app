import { describe, expect, it } from "vitest";

import { DEFAULT_PASSENGER_SEATS, parseRuns, ridersTotal, runsByEvent, runsByTraining, seatPlan, trainingKey } from "./pulmini-runs";
import { pulminiRunsData } from "./pulmini-runs.functions";

const raw = JSON.stringify({
  asOf: "2026-10-11",
  runs: [
    {
      eventId: "EVT-PUL-1",
      vehicle: "Pulmino 1",
      driver: "  Mario   R. ",
      departure: "13:45",
      meetingPoint: "Centro sportivo Colico",
      seats: 8,
      riders: { pulcini: 6, "BAD KEY": 3 },
      adults: 1,
      passengers: ["Luca Rossi", "Anna Bianchi"],
    },
    { eventId: "EVT-PUL-1", vehicle: "Pulmino 2", riders: { pulcini: 3 } },
    { vehicle: "senza evento" },
    { training: { day: "lunedì", start: 1040 }, vehicle: "Pulmino 1", driver: "Anna B.", departure: "16:45", riders: { u15: 4, "2015": 3 } },
    { training: { day: "lunedì", start: 2000 }, vehicle: "Pulmino 4" },
  ],
});

describe("pulmini runs parser", () => {
  it("keeps known fields, cleans text and drops children's names", () => {
    const p = parseRuns(raw);
    expect(p.asOf).toBe("2026-10-11");
    expect(p.runs).toHaveLength(3);
    const r = p.runs[0]!;
    expect(r).toMatchObject({ driver: "Mario R.", departure: "13:45", seats: 8, riders: { pulcini: 6 }, adults: 1 });
    expect(JSON.stringify(p)).not.toContain("Luca");
    expect(ridersTotal(r)).toBe(6);
  });

  it("tolerates bad input", () => {
    expect(parseRuns("{nope").runs).toEqual([]);
    expect(parseRuns(undefined)).toEqual({ asOf: null, runs: [] });
    expect(parseRuns(JSON.stringify({ runs: [{ eventId: "E", vehicle: "V", departure: "25:00", seats: 99 }] })).runs[0]).toMatchObject({ departure: null, seats: null, driver: null });
  });

  it("draws seats: teams first, then adults, then free; default 9-seat van", () => {
    const r = parseRuns(raw).runs[0]!;
    const plan = seatPlan(r);
    expect(plan).toMatchObject({ seats: 8, confirmed: true, overflow: 0 });
    expect(plan.occupancy).toEqual(["pulcini", "pulcini", "pulcini", "pulcini", "pulcini", "pulcini", "adult", null]);
    const empty = seatPlan(null);
    expect(empty).toMatchObject({ seats: DEFAULT_PASSENGER_SEATS, confirmed: false });
    expect(empty.occupancy.every((s) => s === null)).toBe(true);
    const full = seatPlan({ ...r, seats: 4 });
    expect(full.overflow).toBe(3);
  });

  it("groups vans by trip and by training slot", () => {
    const runs = parseRuns(raw).runs;
    expect(runsByEvent(runs).get("EVT-PUL-1")).toHaveLength(2);
    expect(runsByEvent(runs).has("")).toBe(false);
    const t = runsByTraining(runs);
    expect([...t.keys()]).toEqual([trainingKey("LUNEDÌ", 1040)]);
    expect(t.get("LUNEDÌ@1040")?.[0]).toMatchObject({ training: { day: "LUNEDÌ", start: 1040 }, driver: "Anna B.", riders: { u15: 4, "2015": 3 } });
  });
});

describe("pulmini runs on the server", () => {
  it("returns nothing while the area is closed", () => {
    const d = pulminiRunsData({ SCD_PULMINI_RUNS_JSON: raw }, true);
    expect(d.gate.view).toBe("access");
    expect(d.runs).toEqual([]);
    expect(d.configured).toBe(false);
  });

  it("returns the runs in the staging preview", () => {
    const d = pulminiRunsData({ SCD_PULMINI_RUNS_JSON: raw, SCD_STAGING_PREVIEW: "1", SCD_STAGING_PASSWORD: "x".repeat(24) }, true);
    expect(d.gate.view).toBe("page");
    expect(d.runs).toHaveLength(3);
    expect(d.configured).toBe(true);
  });
});
