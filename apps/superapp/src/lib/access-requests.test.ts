import { describe, expect, it } from "vitest";

import { ageOn, asOutcome, cleanPhone, createRateLimiter, validateAccessRequest } from "./access-requests";

const ok = { firstName: "Mario", lastName: "Rossi", birthDate: "1985-03-04", email: "mario@example.it", phone: "+39 333 1234567", consent: true };

describe("access requests", () => {
  it("computes age on a given day", () => {
    expect(ageOn("2012-10-12", "2026-10-11")).toBe(13);
    expect(ageOn("2012-10-11", "2026-10-11")).toBe(14);
    expect(ageOn("bad", "2026-10-11")).toBeNull();
  });

  it("accepts a complete request", () => {
    expect(validateAccessRequest(ok, "2026-10-11")).toEqual({});
  });

  it("asks a parent to register children under 14", () => {
    expect(validateAccessRequest({ ...ok, birthDate: "2015-01-01" }, "2026-10-11").birthDate).toMatch(/genitore/);
    expect(validateAccessRequest({ ...ok, birthDate: "2010-01-01" }, "2026-10-11").birthDate).toBeUndefined();
  });

  it("flags every missing or wrong field", () => {
    const e = validateAccessRequest({ firstName: "", lastName: "R", birthDate: "2030-01-01", email: "x", phone: "12", consent: false }, "2026-10-11");
    expect(Object.keys(e).sort()).toEqual(["birthDate", "consent", "email", "firstName", "lastName", "phone"]);
  });

  it("cleans phones like the database", () => {
    expect(cleanPhone(" +39 (333) 123-4567 ")).toBe("+39 333 1234567");
  });

  it("maps unknown outcomes to an error", () => {
    expect(asOutcome("RECEIVED")).toBe("RECEIVED");
    expect(asOutcome("whatever")).toBe("ERROR");
  });

  it("limits requests per key in a window", () => {
    const allow = createRateLimiter(2, 1000);
    expect(allow("ip", 0)).toBe(true);
    expect(allow("ip", 10)).toBe(true);
    expect(allow("ip", 20)).toBe(false);
    expect(allow("ip", 1500)).toBe(true);
    expect(allow("other", 20)).toBe(true);
  });
});
