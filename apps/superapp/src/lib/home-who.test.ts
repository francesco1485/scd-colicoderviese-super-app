import { describe, expect, it } from "vitest";

import { WHO_ROWS } from "./home-who";
import { PUBLIC_FORMS_LIVE } from "./public-forms";

const GUIDE_SECTIONS = new Set(["tifosi", "soci", "famiglie", "mister", "segreteria"]);
/** Pages open to a signed-out visitor (members-only pages such as /squadre would bounce to the login). */
const PUBLIC_PAGES = new Set([
  "/calendario",
  "/accedi",
  "/contatti",
  "/registrati",
  "/sponsor",
  "/allenamenti",
  "/guida",
]);

describe("home 'Chi sei → cosa trovi' (study 15/10 action 3)", () => {
  it("has the five profiles, each with three things to find and public destinations", () => {
    expect(WHO_ROWS.map((r) => r.id)).toEqual(["tifoso", "famiglia", "atleta", "staff", "sponsor"]);
    for (const r of WHO_ROWS) {
      expect(r.finds).toHaveLength(3);
      expect(PUBLIC_PAGES.has(r.href), r.href).toBe(true);
      expect(r.cta.length).toBeGreaterThan(3);
      if (r.more) {
        expect(PUBLIC_PAGES.has(r.more.to), r.more.to).toBe(true);
        if (r.more.to === "/guida") expect(GUIDE_SECTIONS.has(r.more.hash ?? ""), r.id).toBe(true);
        else expect(r.more.hash).toBeUndefined();
      }
    }
  });

  it("the join row never promises a form while the public forms are paused", () => {
    const join = WHO_ROWS.find((r) => r.id === "atleta")!;
    if (PUBLIC_FORMS_LIVE) expect(join.href).toBe("/registrati");
    else {
      expect(join.href).toBe("/contatti");
      expect(join.cta).not.toMatch(/registrati/i);
      for (const f of join.finds) expect(f).not.toMatch(/modulo|richiam|in un minuto/i);
    }
    expect(join.more?.to).toBe("/allenamenti");
  });

  it("names no person: profiles only", () => {
    for (const r of WHO_ROWS)
      for (const s of [r.who, r.claim, ...r.finds]) expect(s).not.toMatch(/\b[A-Z][a-z]+ [A-Z]\./);
  });
});
