import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { parseRuns, serviceView } from "./pulmini-runs";
import { pulminiServiceFor } from "./pulmini-runs.functions";
import { serviceRunsForDay } from "./pulmini-service-view";

// Example data only (invented driver, invented times).
const RAW = JSON.stringify({
  asOf: "2026-10-16",
  runs: [
    { eventId: "", training: { day: "MARTEDÌ", start: 1040 }, vehicle: "Pulmino 1", driver: "Mario R.", departure: "16:45", meetingPoint: "Piazza esempio", seats: 8, riders: { u12: 3, u10: 2 }, adults: 0, children: ["Luca R."] },
    { eventId: "", training: { day: "MARTEDÌ", start: 960 }, vehicle: "Pulmino 2", driver: null, departure: null, meetingPoint: null, seats: null, riders: {}, adults: 0 },
    { eventId: "EVT-1", training: null, vehicle: "Pulmino 1", driver: "Mario R.", departure: "08:00", meetingPoint: "Centro", seats: 8, riders: { u15: 6 }, adults: 1 },
  ],
});

describe("pulmini service for every member (Francesco 16/10/2026 23:34)", () => {
  it("keeps times, meeting points, seats and a total count; drops driver names, teams and any child field", () => {
    const view = serviceView(parseRuns(RAW).runs);
    const text = JSON.stringify(view);
    expect(text).not.toContain("Mario");
    expect(text).not.toContain("Luca");
    expect(text).not.toMatch(/u12|u10|u15|driver"|children/);
    expect(view[0]).toEqual({ eventId: "", training: { day: "MARTEDÌ", start: 1040 }, vehicle: "Pulmino 1", departure: "16:45", meetingPoint: "Piazza esempio", seats: 8, riders: 5, driverAssigned: true });
    expect(view[1]!.driverAssigned).toBe(false);
  });

  it("is given to signed-in accounts only, and says when the programme is not connected", () => {
    expect(pulminiServiceFor({ SCD_PULMINI_RUNS_JSON: RAW }, false)).toEqual({ state: "signed-out", asOf: null, runs: [] });
    expect(pulminiServiceFor({}, true)).toEqual({ state: "not-configured", asOf: null, runs: [] });
    const ok = pulminiServiceFor({ SCD_PULMINI_RUNS_JSON: RAW }, true);
    expect(ok.state).toBe("ok");
    expect(ok.runs).toHaveLength(3);
  });

  it("lists the training runs of the chosen day by slot time", () => {
    const runs = serviceView(parseRuns(RAW).runs);
    expect(serviceRunsForDay(runs, "martedì").map((r) => r.vehicle)).toEqual(["Pulmino 2", "Pulmino 1"]);
    expect(serviceRunsForDay(runs, "LUNEDÌ")).toEqual([]);
  });

  it("the trainings board shows it without names and points parents to their own child's run in the family area", () => {
    const page = readFileSync(fileURLToPath(new URL("../routes/allenamenti.tsx", import.meta.url)), "utf8");
    expect(page).toMatch(/getPulminiService\(\)/);
    expect(page).toMatch(/I nomi dei ragazzi non compaiono mai/);
    expect(page).toMatch(/da confermare/);
    const family = readFileSync(fileURLToPath(new URL("../routes/famiglia.tsx", import.meta.url)), "utf8");
    // Own child's run: family area, read through the caller's own family (DB-scoped functions).
    expect(family).toMatch(/getFamilyTransport\(\)/);
    expect(family).toMatch(/getFamilyLive\(\)/);
  });
});
