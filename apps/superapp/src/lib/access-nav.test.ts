import { describe, expect, it } from "vitest";

import { canCreatePosts, sessionPositions } from "./access-nav";
import { ACCESS_MENU, canSeeMenuEntry, menuFor } from "./areas";
import { sessionRolesFrom, type Membership } from "./session";

const user = { email: "persona@example.org" };
const membership = (role: string, scope: unknown = null): Membership => ({
  organization_id: "org",
  organization_slug: "scd",
  role,
  scope,
  active: true,
});
const session = (role: string, scope: unknown = null) => {
  const m = membership(role, scope);
  return {
    user,
    roles: [...sessionRolesFrom([m])],
    memberships: [
      {
        organizationId: m.organization_id,
        organization: m.organization_slug,
        role,
      },
    ],
  };
};
const ids = (roles: ReadonlySet<string> | null) =>
  menuFor(roles).flatMap((g) => g.entries.map((e) => e.id));
const titles = (roles: ReadonlySet<string> | null) =>
  menuFor(roles).map((g) => g.title);

describe("public chrome: anonymous visitors (Direzione rule 2026-10-13)", () => {
  it("has no positions and no Crea", () => {
    expect(sessionPositions(undefined)).toBeNull();
    expect(sessionPositions(null)).toBeNull();
    expect(
      sessionPositions({ user: null, roles: [], memberships: [] }),
    ).toBeNull();
    expect(canCreatePosts(null)).toBe(false);
    expect(canCreatePosts({ user: null, roles: [], memberships: [] })).toBe(false);
  });

  it("sees only open entries in the areas menu, never a reserved one", () => {
    const seen = ids(null);
    expect(seen).toEqual(["calendario", "tornei", "sponsor"]);
    for (const e of ACCESS_MENU.flatMap((g) => g.entries))
      expect(canSeeMenuEntry(e, null), e.id).toBe(!e.reserved);
    expect(titles(null)).toEqual(["Per famiglie e tifosi", "Per le aziende"]);
  });
});

describe("public chrome: signed-in family", () => {
  const s = session("FAMILY");
  const roles = sessionPositions(s)!;

  it("cannot post", () => {
    expect(roles.has("famiglia")).toBe(true);
    expect(canCreatePosts(s)).toBe(false);
  });

  it("sees the family areas and the public ones, no staff or office group", () => {
    expect(ids(roles)).toEqual([
      "calendario",
      "tornei",
      "nutrizionista",
      "famiglia",
      "sponsor",
    ]);
    expect(titles(roles)).toEqual(["Per famiglie e tifosi", "Per le aziende"]);
  });

  it("base access (no position yet) sees the public entries and the family-audience ones only", () => {
    const base = session("USER_BASE");
    expect(canCreatePosts(base)).toBe(false);
    expect(ids(sessionPositions(base))).toEqual([
      "calendario",
      "tornei",
      "sponsor",
    ]);
  });
});

describe("public chrome: staff and Direzione", () => {
  it("Direzione can post and sees every area of the menu", () => {
    const s = session("DIRECTION");
    expect(canCreatePosts(s)).toBe(true);
    expect(ids(sessionPositions(s))).toEqual(
      ACCESS_MENU.flatMap((g) => g.entries.map((e) => e.id)),
    );
    expect(titles(sessionPositions(s))).toEqual(
      ACCESS_MENU.map((g) => g.title),
    );
  });

  it("a mister can post and sees the staff areas without roles, not pulmini or magazzino", () => {
    const s = session("MISTER");
    expect(canCreatePosts(s)).toBe(true);
    const seen = ids(sessionPositions(s));
    expect(seen).toContain("gestionale");
    expect(seen).toContain("quadro");
    expect(seen).toContain("segreteria");
    expect(seen).not.toContain("pulmini");
    expect(seen).not.toContain("magazzino");
    expect(seen).not.toContain("famiglia");
    expect(seen).not.toContain("partner");
  });

  it("an autista (STAFF with the position in scope) sees pulmini", () => {
    const s = session("STAFF", { positions: ["autista"] });
    expect(canCreatePosts(s)).toBe(true);
    expect(ids(sessionPositions(s))).toContain("pulmini");
  });

  it("an office position without an author membership still gets Crea", () => {
    const s = {
      user,
      roles: ["segreteria"],
      memberships: [
        { organizationId: "org", organization: "scd", role: "USER_BASE" },
      ],
    };
    expect(canCreatePosts(s)).toBe(true);
  });

  it("a partner sees the partner area and nothing internal", () => {
    const s = session("USER_BASE", { positions: ["partner"] });
    expect(canCreatePosts(s)).toBe(false);
    expect(ids(sessionPositions(s))).toEqual([
      "calendario",
      "tornei",
      "sponsor",
      "partner",
    ]);
  });
});
