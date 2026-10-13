import { describe, expect, it } from "vitest";

import { deskHeadline, deskLines, parseDeskCounts, type DeskCounts } from "./secretariat-desk";

const zero: DeskCounts = {
  as_of: "2026-10-12T06:00:00Z",
  access_requests_pending: 0,
  people_pending: 0,
  athletes_without_team: 0,
  registration_unverified: 0,
  cert_missing: 0,
  cert_expired: 0,
  cert_expiring_30: 0,
  cert_declared: 0,
  callups_pending_72h: 0,
  callups_total_72h: 0,
  accounts_never_signed_in: 0,
};

describe("parseDeskCounts", () => {
  it("accepts the jsonb payload, numbers or numeric strings", () => {
    const c = parseDeskCounts({ ...zero, people_pending: "3", cert_expired: 2 });
    expect(c?.people_pending).toBe(3);
    expect(c?.cert_expired).toBe(2);
    expect(c?.as_of).toBe(zero.as_of);
  });
  it("rejects null, missing or negative counters", () => {
    expect(parseDeskCounts(null)).toBeNull();
    expect(parseDeskCounts({ ...zero, cert_missing: undefined })).toBeNull();
    expect(parseDeskCounts({ ...zero, cert_missing: -1 })).toBeNull();
  });
});

describe("deskLines", () => {
  it("is empty when nothing is pending", () => {
    expect(deskLines(zero)).toEqual([]);
    expect(deskHeadline([])).toBe("Tutto in ordine: nessuna coda aperta.");
  });
  it("orders urgent first and singular/plural correctly", () => {
    const lines = deskLines({ ...zero, cert_expired: 1, athletes_without_team: 4, accounts_never_signed_in: 2 });
    expect(lines.map((l) => l.id)).toEqual(["cert_expired", "no_team", "never_signed_in"]);
    expect(lines[0]?.label).toBe("1 certificato scaduto");
    expect(lines[0]?.tone).toBe("urgent");
    expect(lines[1]?.label).toBe("4 atleti senza squadra");
    expect(lines[1]?.href).toBe("/segreteria/persone?squadra=nessuna");
    expect(deskHeadline(lines)).toBe("3 cose da fare, 1 urgente.");
  });
  it("counts call-ups only when pending", () => {
    expect(deskLines({ ...zero, callups_total_72h: 12 })).toEqual([]);
    expect(deskLines({ ...zero, callups_total_72h: 12, callups_pending_72h: 5 })[0]?.label).toContain("5 convocazioni non ancora viste");
  });
});
