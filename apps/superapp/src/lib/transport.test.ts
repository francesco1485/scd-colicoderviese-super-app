import { describe, expect, it } from "vitest";

import { dayCode, demandSummary, driverWarnings, parseBoard, planErrorMessage, runClash, runsForEvent, workQueue, type DriverRule, type TransportBoard, type TransportRun } from "./transport";

const rules: DriverRule[] = [
  { code: "DISP-001", driver: "DRV-001", days: "TUTTI", from: null, to: "20:00", status: "DISPONIBILE FINO A", kind: "ORDINARIA", reason: "Limite massimo indicato", validFrom: "2026-09-26", validTo: "2027-07-30" },
  { code: "DISP-003", driver: "DRV-003", days: "MAR", from: "18:30", to: "22:00", status: "NON DISPONIBILE", kind: "BLOCCO", reason: "Prima Squadra", validFrom: "2026-09-26", validTo: "2027-07-30" },
  { code: "DISP-007", driver: "DRV-003", days: "LUN/MER/VEN", from: "17:30", to: null, status: "DA VERIFICARE", kind: "VINCOLO", reason: "Impegno tecnico dalle 17:30", validFrom: "2026-09-26", validTo: "2027-07-30" },
];

const run = (o: Partial<TransportRun>): TransportRun => ({
  id: "r1", date: "2026-10-17", departure: "08:00", returnEstimate: "13:00", kind: "TRASFERTA", eventId: "EVT-1", title: "U16", destination: null,
  meetingPoint: null, vehicleId: "v1", driverId: "d1", passengers: 8, status: "PIANIFICATA", note: null, updatedAt: null, ...o,
});

describe("dayCode", () => {
  it("maps ISO dates to Italian weekday codes", () => {
    expect(dayCode("2026-10-12")).toBe("LUN");
    expect(dayCode("2026-10-13")).toBe("MAR");
    expect(dayCode("2026-10-17")).toBe("SAB");
  });
});

describe("driverWarnings", () => {
  it("warns when the return is after the driver's latest time", () => {
    expect(driverWarnings(rules, "DRV-001", "2026-10-17", "17:00", "21:00")[0]).toContain("fino alle 20:00");
    expect(driverWarnings(rules, "DRV-001", "2026-10-17", "08:00", "13:00")).toEqual([]);
  });
  it("uses 4 hours when no return time is written", () => {
    expect(driverWarnings(rules, "DRV-001", "2026-10-17", "17:00", null)).toHaveLength(1);
  });
  it("flags blocks and checks only on the right weekday and window", () => {
    expect(driverWarnings(rules, "DRV-003", "2026-10-13", "19:00", "21:00")[0]).toContain("Non disponibile 18:30–22:00 (Prima Squadra)");
    expect(driverWarnings(rules, "DRV-003", "2026-10-13", "09:00", "12:00")).toEqual([]);
    expect(driverWarnings(rules, "DRV-003", "2026-10-12", "18:00", "20:00")[0]).toContain("Da verificare");
    expect(driverWarnings(rules, "DRV-003", "2026-10-17", "18:00", "20:00")).toEqual([]);
  });
  it("ignores rules outside their validity", () => {
    expect(driverWarnings(rules, "DRV-001", "2027-08-10", "17:00", "22:00")).toEqual([]);
  });
});

describe("runClash", () => {
  const runs = [run({})];
  it("finds the same van or driver on overlapping windows of the same day", () => {
    expect(runClash(runs, { date: "2026-10-17", departure: "10:00", returnEstimate: null, vehicleId: "v1", driverId: null })).toBe("vehicle");
    expect(runClash(runs, { date: "2026-10-17", departure: "12:30", returnEstimate: "15:00", vehicleId: "v2", driverId: "d1" })).toBe("driver");
  });
  it("ignores other days, cancelled trips, the trip itself and non-overlapping windows", () => {
    expect(runClash(runs, { date: "2026-10-18", departure: "10:00", returnEstimate: null, vehicleId: "v1", driverId: "d1" })).toBeNull();
    expect(runClash([run({ status: "ANNULLATA" })], { date: "2026-10-17", departure: "10:00", returnEstimate: null, vehicleId: "v1", driverId: null })).toBeNull();
    expect(runClash(runs, { id: "r1", date: "2026-10-17", departure: "10:00", returnEstimate: null, vehicleId: "v1", driverId: null })).toBeNull();
    expect(runClash(runs, { date: "2026-10-17", departure: "13:00", returnEstimate: "16:00", vehicleId: "v1", driverId: null })).toBeNull();
  });
});

const board: TransportBoard = parseBoard({
  canManage: true,
  sync: { synced_at: "2026-10-12T07:40:00Z", source_modified_at: "2026-09-26T05:38:02Z", counts: {} },
  vehicles: [
    { id: "v1", code: "BUS-01", label: "BUS-01", plate: null, seatsPassengers: null, insuranceDue: null, inspectionDue: null, roadTaxDue: null },
    { id: "v2", code: "BUS-02", label: "BUS-02", plate: "AB123CD", seatsPassengers: 8, insuranceDue: "2026-10-01", inspectionDue: "2026-10-30", roadTaxDue: "2027-01-31" },
  ],
  drivers: [
    { id: "d1", code: "DRV-001", name: "Mario R.", status: "ATTIVO", licenceDue: null, phone: null },
    { id: "d2", code: "DRV-EXT-01", name: "Autista Esterno 1", status: "DA ANAGRAFARE" },
  ],
  rules: [],
  stops: [{ code: "FER-1", status: "VALIDATA" }, { code: "FER-2", status: "DA CONFERMARE" }],
  riders: [
    { teamGroup: "U15 2012-2013", serviceStatus: "ATTIVO", baseType: "A/R", line: "LAGO/LECCO", stopStatus: "VALIDATA", days: { LUN_A: "DA CONFERMARE" } },
    { teamGroup: "U18 2009-2010", serviceStatus: "ATTIVO", baseType: "SOLO ANDATA", line: "DA VERIFICARE", stopStatus: "DA UNIFORMARE", days: { LUN_A: "NO" } },
    { teamGroup: "U12 2015", serviceStatus: "NON ATTIVO", baseType: "NON ATTIVO", line: "VALTELLINA", days: {} },
    { teamGroup: "U15 2012-2013", serviceStatus: "PROVVISORIO", baseType: "PROVVISORIO SOLO ANDATA", line: "COLICO", stopStatus: "PROPOSTA", days: {} },
  ],
  runs: [{ id: "r1", date: "2026-10-17", departure: "08:00", kind: "TRASFERTA", eventId: "EVT-1", title: "U16", status: "PIANIFICATA" }, { id: "x", date: "", departure: "" }],
})!;

describe("parseBoard", () => {
  it("returns null for a caller without access and keeps only valid rows", () => {
    expect(parseBoard(null)).toBeNull();
    expect(board.canManage).toBe(true);
    expect(board.vehicles).toHaveLength(2);
    expect(board.runs).toHaveLength(1);
    expect(board.syncedAt).toBe("2026-10-12T07:40:00Z");
  });
});

describe("demandSummary", () => {
  it("counts active users only, folds provisional modes, flags days to confirm", () => {
    const d = demandSummary(board.riders);
    expect(d.total).toBe(4);
    expect(d.active).toBe(3);
    expect(d.byMode).toEqual({ "A/R": 1, "SOLO ANDATA": 2 });
    expect(d.byGroup["U15 2012-2013"]).toBe(2);
    expect(d.weekdaysToConfirm).toBe(1);
  });
});

describe("workQueue", () => {
  it("lists what to fix in the Master, urgent first, with the tab to open", () => {
    const q = workQueue(board, new Date("2026-10-12T08:00:00Z"));
    const ids = q.map((i) => i.id);
    expect(ids[0]).toBe("vehicle-expired");
    expect(ids).toContain("withdrawn-team");
    expect(q.find((i) => i.id === "vehicle-expiring")?.count).toBe(1);
    expect(q.find((i) => i.id === "vehicle-seats")?.label).toBe("1 pulmino senza posti confermati");
    expect(q.find((i) => i.id === "driver-check")?.where).toBe("05 AUTISTI");
    expect(q.find((i) => i.id === "licence-missing")?.count).toBe(1);
    expect(q.find((i) => i.id === "rider-line")?.count).toBe(1);
    expect(q.find((i) => i.id === "stops-confirm")?.count).toBe(1);
    expect(q.every((i) => i.count > 0)).toBe(true);
  });
});

describe("runsForEvent and messages", () => {
  it("returns live trips of an event in departure order", () => {
    const rs = [run({ id: "a", departure: "09:00" }), run({ id: "b", departure: "07:30" }), run({ id: "c", status: "ANNULLATA" }), run({ id: "d", eventId: "EVT-2" })];
    expect(runsForEvent(rs, "EVT-1").map((r) => r.id)).toEqual(["b", "a"]);
  });
  it("speaks Italian for every refusal", () => {
    expect(planErrorMessage("vehicle_busy")).toContain("già su un'altra corsa");
    expect(planErrorMessage("forbidden")).toContain("responsabile trasporti");
    expect(planErrorMessage(undefined)).toContain("Riprova");
  });
});
