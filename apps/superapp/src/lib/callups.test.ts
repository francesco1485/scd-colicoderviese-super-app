import { describe, expect, it } from "vitest";

import { asOutcome, asResponse, matchTitle, meetingAtLiteral, outcomeCounts, responseCounts, romeDay, romeTime, validateCallupInput } from "./callups";

describe("callups", () => {
  it("builds the title from SCD's side", () => {
    expect(matchTitle("ARS ROVAGNATE", "FUORI")).toEqual({ title: "ARS ROVAGNATE - ColicoDerviese", home: "ARS ROVAGNATE", away: "ColicoDerviese" });
    expect(matchTitle("", "CASA").title).toBe("ColicoDerviese - Avversario da definire");
  });

  it("maps unknown database values to safe states", () => {
    expect(asResponse("CONFIRMED")).toBe("CONFIRMED");
    expect(asResponse("anything")).toBe("PENDING");
    expect(asOutcome("CERTIFICATE")).toBe("CERTIFICATE");
    expect(asOutcome("boom")).toBe("ERROR");
  });

  it("counts answers and outcomes", () => {
    expect(responseCounts([{ response: "CONFIRMED" }, { response: "DECLINED" }, { response: "PENDING" }, { response: "CONFIRMED" }])).toEqual({ total: 4, confirmed: 2, declined: 1, pending: 1 });
    expect(outcomeCounts([{ outcome: "SENT" }, { outcome: "SENT" }, { outcome: "CERTIFICATE" }])).toMatchObject({ SENT: 2, CERTIFICATE: 1, REGISTRATION: 0 });
  });

  it("validates the call-up form", () => {
    const ok = { date: "2026-10-18", meetingTime: "13:45", meetingPlace: "Campo di Colico", kitNote: "", athleteIds: ["a"] };
    expect(validateCallupInput(ok)).toEqual([]);
    expect(validateCallupInput({ ...ok, athleteIds: [] })).toContain("Scegli almeno un ragazzo.");
    expect(validateCallupInput({ ...ok, meetingTime: "25:00" })).toHaveLength(1);
    expect(validateCallupInput({ ...ok, athleteIds: Array.from({ length: 41 }, (_, i) => String(i)) })).toContain("Al massimo 40 convocati per gara.");
  });

  it("writes the meeting time in Rome time for the database", () => {
    expect(meetingAtLiteral("2026-10-18", "13:45")).toBe("2026-10-18 13:45:00 Europe/Rome");
    expect(meetingAtLiteral("2026-10-18", "")).toBeNull();
  });

  it("formats times in Rome", () => {
    expect(romeTime("2026-10-18T11:45:00Z")).toBe("13:45");
    expect(romeTime(null)).toBe("");
    expect(romeDay("2026-10-18T11:45:00Z")).toBe("domenica 18 ottobre");
  });
});
