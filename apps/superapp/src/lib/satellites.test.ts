import { describe, expect, it } from "vitest";

import { R20_LOGIN_LIVE, SATELLITES, STATUS_LABEL, canEnter, findSatellite, loginSatellites } from "./satellites";

describe("satellites registry", () => {
  it("covers every access requested in the role matrix of 10/10/2026", () => {
    const slugs = SATELLITES.map((s) => s.slug);
    for (const required of ["atleta", "famiglia", "tifoso", "staff", "segreteria", "tesoreria", "pulmini", "direzione", "sponsor"]) {
      expect(slugs).toContain(required);
    }
  });

  it("has unique slugs and complete copy", () => {
    const slugs = SATELLITES.map((s) => s.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of SATELLITES) {
      expect(s.name.length).toBeGreaterThan(2);
      expect(s.who.length).toBeGreaterThan(5);
      expect(s.inside.length).toBeGreaterThanOrEqual(3);
      expect(s.source.length).toBeGreaterThan(3);
      expect(STATUS_LABEL[s.status]).toBeTruthy();
    }
  });

  it("maps only the four R20 access areas to a login", () => {
    expect(loginSatellites().map((s) => s.login).sort()).toEqual(["atleta", "direzione", "famiglia", "staff"]);
  });

  it("never lets anyone enter while the R20 login action is not live", () => {
    expect(R20_LOGIN_LIVE).toBe(false);
    for (const s of SATELLITES) expect(canEnter(s)).toBe(false);
    expect(SATELLITES.some((s) => s.status === "attivo")).toBe(false);
  });

  it("finds areas by slug and rejects unknown ones", () => {
    expect(findSatellite("tesoreria")?.name).toBe("Tesoreria");
    expect(findSatellite("nope")).toBeUndefined();
  });
});
