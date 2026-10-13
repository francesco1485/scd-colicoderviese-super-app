import { describe, expect, it } from "vitest";

import { isInWindow, isIsoDay, romeDay, serverRomeDay, visibleOn } from "./public-window";

const W = { showFrom: "2026-10-18", showUntil: "2026-11-30" };

describe("public window (Rome days, inclusive)", () => {
  it("hides before, shows at the bounds and inside, hides after", () => {
    expect(isInWindow(W, "2026-10-17")).toBe(false);
    expect(isInWindow(W, "2026-10-18")).toBe(true);
    expect(isInWindow(W, "2026-11-05")).toBe(true);
    expect(isInWindow(W, "2026-11-30")).toBe(true);
    expect(isInWindow(W, "2026-12-01")).toBe(false);
  });

  it("treats a missing bound as open", () => {
    expect(isInWindow({}, "2030-01-01")).toBe(true);
    expect(isInWindow({ showFrom: "2026-10-18" }, "2099-12-31")).toBe(true);
    expect(isInWindow({ showUntil: "2026-11-30" }, "2000-01-01")).toBe(true);
  });

  it("fails closed on invalid or inverted bounds and invalid days", () => {
    expect(isInWindow({ showFrom: "2026-13-01" }, "2026-12-01")).toBe(false);
    expect(isInWindow({ showUntil: "30/11/2026" }, "2026-10-20")).toBe(false);
    expect(isInWindow({ showFrom: "2026-12-01", showUntil: "2026-11-01" }, "2026-11-15")).toBe(false);
    expect(isInWindow(W, "")).toBe(false);
    expect(isIsoDay("2026-02-29")).toBe(false);
    expect(isIsoDay("2028-02-29")).toBe(true);
  });

  it("keeps order when filtering", () => {
    const list = [{ id: "a" }, { id: "b", ...W }, { id: "c", showUntil: "2026-10-01" }];
    expect(visibleOn(list, "2026-10-20").map((x) => x.id)).toEqual(["a", "b"]);
  });
});

describe("Rome day at midnight (summer time, CEST = UTC+2)", () => {
  it("2026-10-17 23:59:59 Rome is still the day before the start", () => {
    const ms = Date.parse("2026-10-17T21:59:59Z");
    expect(romeDay(ms)).toBe("2026-10-17");
    expect(isInWindow(W, romeDay(ms))).toBe(false);
  });

  it("2026-10-18 00:00 Rome (22:00 UTC the day before) is the start day", () => {
    const ms = Date.parse("2026-10-17T22:00:00Z");
    expect(romeDay(ms)).toBe("2026-10-18");
    expect(isInWindow(W, romeDay(ms))).toBe(true);
  });
});

describe("Rome day at midnight (winter time, CET = UTC+1)", () => {
  it("2026-11-30 23:59 Rome is the last day, 2026-12-01 00:00 Rome is out", () => {
    expect(romeDay(Date.parse("2026-11-30T22:59:00Z"))).toBe("2026-11-30");
    expect(isInWindow(W, romeDay(Date.parse("2026-11-30T22:59:00Z")))).toBe(true);
    expect(romeDay(Date.parse("2026-11-30T23:00:00Z"))).toBe("2026-12-01");
    expect(isInWindow(W, romeDay(Date.parse("2026-11-30T23:00:00Z")))).toBe(false);
  });
});

describe("serverRomeDay QA override", () => {
  const now = Date.parse("2026-10-13T10:00:00Z");

  it("uses the real Rome day by default", () => {
    expect(serverRomeDay({}, now)).toBe("2026-10-13");
  });

  it("honours SCD_QA_TODAY only on a local, non-production server", () => {
    expect(serverRomeDay({ SCD_QA_TODAY: "2026-10-18" }, now)).toBe("2026-10-18");
    expect(serverRomeDay({ SCD_QA_TODAY: "2026-10-18", SCD_ENV: "production" }, now)).toBe("2026-10-13");
    expect(serverRomeDay({ SCD_QA_TODAY: "2026-10-18", RENDER: "true" }, now)).toBe("2026-10-13");
    expect(serverRomeDay({ SCD_QA_TODAY: "18/10/2026" }, now)).toBe("2026-10-13");
  });
});
