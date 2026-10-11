import { describe, expect, it } from "vitest";

import { isStaffSession, landingFor, safeNext, sessionBadge, sessionRolesFrom } from "./session";

describe("session positions", () => {
  it("turns memberships into registry positions, ignoring inactive ones and unknown scope entries", () => {
    const roles = sessionRolesFrom([
      { organization_id: "o1", organization_slug: "scd", role: "DIRECTION", scope: {}, active: true },
      { organization_id: "o1", organization_slug: "scd", role: "MISTER", scope: { positions: ["responsabile-trasporti", "root", 3] }, active: true },
      { organization_id: "o2", organization_slug: "old", role: "SECRETARIAT", scope: {}, active: false },
    ]);
    expect([...roles].sort()).toEqual(["direzione", "dirigenza", "mister", "responsabile-trasporti"]);
    expect(sessionRolesFrom([{ organization_id: "o1", organization_slug: "scd", role: "WHATEVER", scope: null, active: true }]).size).toBe(0);
  });

  it("knows staff from families and names the badge", () => {
    expect(isStaffSession(new Set(["famiglia"]))).toBe(false);
    expect(isStaffSession(new Set(["famiglia", "autista"]))).toBe(true);
    expect(sessionBadge(new Set(["mister", "direzione"]))).toBe("Direzione");
    expect(sessionBadge(new Set(["famiglia"]))).toBe("Famiglia");
    expect(sessionBadge(new Set())).toBe("Senza ruolo");
  });

  it("routes each role to its own area after login", () => {
    expect(landingFor(new Set(["direzione", "mister"]))).toBe("/direzione");
    expect(landingFor(new Set(["autista"]))).toBe("/pulmini");
    expect(landingFor(new Set(["famiglia"]))).toBe("/famiglia");
    expect(landingFor(new Set())).toBe("/aree");
  });

  it("keeps the next path on our site", () => {
    expect(safeNext("/pulmini")).toBe("/pulmini");
    expect(safeNext("//evil.example")).toBe("/aree");
    expect(safeNext("https://evil.example")).toBe("/aree");
    expect(safeNext(undefined, "/x")).toBe("/x");
  });
});
