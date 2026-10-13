import { describe, expect, it } from "vitest";

import { cameoLine } from "@/lib/crovi-cameo";
import { insidePersonaFor } from "@/lib/assistant";
import { PUBLIC_PREFIXES } from "@/lib/http-policy";

import {
  CROVI_AVATAR_SRC,
  PERSONA_COPY,
  SKY_HANDOFF,
  eraEligible,
  KIDS_TEAM_IDS,
  greetingFor,
  isHelperHiddenPath,
  isKidsPath,
  isReservedPath,
  launcherFaceFor,
  personaFor,
} from "./SkyJolly";

describe("helper persona (Direzione 12/10/2026: Crovi outside, Sky inside)", () => {
  it("puts Crovi in the chat on every public page", () => {
    expect(personaFor("/")).toBe("crovi");
    for (const p of PUBLIC_PREFIXES) expect(personaFor(p)).toBe("crovi");
    expect(personaFor("/eventi/christmas-lario-cup")).toBe("crovi");
    expect(personaFor("/calendario/rotazione-campi")).toBe("crovi");
  });

  it("puts Sky in the reserved areas by page (SkyChat upgrades to Era by session) and never Crovi", () => {
    for (const p of ["/famiglia", "/la-mia-scd", "/direzione", "/segreteria/persone", "/tesoreria", "/gestionale/organigramma", "/squadre", "/squadre/u16", "/aree", "/core", "/quadro", "/crm"]) {
      expect(isReservedPath(p)).toBe(true);
      expect(personaFor(p)).toBe("sky");
      expect(launcherFaceFor(p)).toBe("sky");
    }
  });

  it("does not mistake look-alike paths for public ones", () => {
    expect(personaFor("/calendariox")).toBe("sky");
    expect(personaFor("/partners")).toBe("sky");
  });

  it("never fronts the public pages with Sky (Direzione 13/10/2026): Crovi everywhere outside", () => {
    for (const p of ["/", "/fantacalcio", "/top11", "/top11/settimana", "/calendario", "/contatti", "/partner", "/sponsor", "/societa", "/eventi", "/comunicazioni", "/rassegna", "/impianti", "/privacy"]) {
      expect(launcherFaceFor(p)).toBe("crovi");
      expect(personaFor(p)).toBe("crovi");
    }
  });

  it("marks only the under-14 team pages as Sky's place", () => {
    for (const id of KIDS_TEAM_IDS) expect(isKidsPath(`/squadre/${id}`)).toBe(true);
    for (const p of ["/", "/squadre", "/squadre/prima", "/squadre/u19", "/squadre/u15", "/squadre/pulcini/extra"]) expect(isKidsPath(p)).toBe(false);
  });

  it("hides the helper in the access flows", () => {
    expect(isHelperHiddenPath("/accedi")).toBe(true);
    expect(isHelperHiddenPath("/accedi/conferma")).toBe(true);
    expect(isHelperHiddenPath("/entra")).toBe(true);
    expect(isHelperHiddenPath("/registrati")).toBe(true);
    expect(isHelperHiddenPath("/")).toBe(false);
    expect(isHelperHiddenPath("/entrata")).toBe(false);
  });

  it("titles the public chat 'Chiedi a Crovi' with the realistic v3 avatar", () => {
    expect(PERSONA_COPY.crovi.title).toBe("Chiedi a Crovi");
    expect(PERSONA_COPY.crovi.name).toBe("Crovi");
    expect(PERSONA_COPY.crovi.placeholder).toMatch(/Crovi/);
    expect(CROVI_AVATAR_SRC).toMatch(/^\/media\/crovi\/v3\//);
  });

  it("keeps the copy free of invented facts and real-person likeness claims", () => {
    for (const persona of ["sky", "crovi", "era"] as const) {
      const c = PERSONA_COPY[persona];
      const all = [c.title, c.subtitle, c.greeting, ...c.quick].join(" ");
      expect(all).not.toMatch(/\d{1,2}[:.]\d{2}|\d+\s*-\s*\d+/);
      expect(all).not.toMatch(/Banfi|Trinità|sosia|somiglia/i);
    }
  });

  it("titles the internal chat 'Chiedi a Era' (UD-091, UD-104)", () => {
    expect(PERSONA_COPY.era.title).toBe("Chiedi a Era");
    expect(PERSONA_COPY.era.placeholder).toMatch(/Era/);
    expect(PERSONA_COPY.era.greeting).toMatch(/Cervellone/);
  });

  it("lets Crovi say Sky called him when Sky's face opened the chat", () => {
    expect(greetingFor("crovi", "sky").startsWith(SKY_HANDOFF)).toBe(true);
    expect(greetingFor("crovi", "crovi")).toBe(PERSONA_COPY.crovi.greeting);
    expect(greetingFor("sky")).toBe(PERSONA_COPY.sky.greeting);
  });

  it("lets the Crovi cameo play on public pages but never inside or on quiet pages", () => {
    expect(cameoLine("/partner")?.ask).toBe("Diventare sponsor");
    expect(cameoLine("/societa")).not.toBeNull();
    expect(cameoLine("/fantacalcio")).not.toBeNull();
    expect(cameoLine("/privacy")).toBeNull();
    expect(cameoLine("/elimina-account")).toBeNull();
    expect(cameoLine("/safeguarding")).toBeNull();
    expect(cameoLine("/gestionale")).toBeNull();
  });
});

describe("Era in the reserved areas (Direzione 'Vai A B C' 13/10/2026)", () => {
  const staff = { roles: ["mister"], age15plus: null };
  const member15 = { roles: ["atleta"], age15plus: true };
  const minor = { roles: ["atleta"], age15plus: false };
  const unknownAge = { roles: ["atleta"], age15plus: null };
  const family = { roles: ["famiglia"], age15plus: null };
  const inside = ["/famiglia", "/la-mia-scd", "/direzione", "/segreteria/persone", "/infermeria", "/gestionale/organigramma"];

  it("gives Era to staff and to members known to be 15+, only inside", () => {
    for (const p of inside) {
      expect(personaFor(p, staff)).toBe("era");
      expect(personaFor(p, member15)).toBe("era");
      expect(personaFor(p, family)).toBe("era");
      expect(launcherFaceFor(p, staff)).toBe("era");
    }
  });

  it("never shows Era on public pages: Crovi stays the public helper", () => {
    for (const p of ["/", ...PUBLIC_PREFIXES]) {
      expect(personaFor(p, staff)).toBe("crovi");
      expect(launcherFaceFor(p, staff)).not.toBe("era");
    }
  });

  it("keeps Sky for minors, unknown age, anonymous viewers", () => {
    for (const p of inside) {
      expect(personaFor(p, minor)).toBe("sky");
      expect(personaFor(p, unknownAge)).toBe("sky");
      expect(personaFor(p, null)).toBe("sky");
      expect(personaFor(p, undefined)).toBe("sky");
    }
  });

  it("a viewer known to be under 15 never gets Era, even with a staff position", () => {
    expect(eraEligible({ roles: ["mister"], age15plus: false })).toBe(false);
    expect(personaFor("/famiglia", { roles: ["mister"], age15plus: false })).toBe("sky");
  });

  it("uses the one rule of lib/assistant.ts for chat persona, face and server voice", () => {
    const viewers = [staff, member15, minor, unknownAge, family, { roles: [], age15plus: null }];
    for (const v of viewers) {
      const expected = insidePersonaFor(v.roles, v.age15plus);
      expect(personaFor("/famiglia", v)).toBe(expected);
      expect(launcherFaceFor("/famiglia", v)).toBe(expected);
      expect(eraEligible(v)).toBe(expected === "era");
    }
  });

  it("gives Era her own Italian copy", () => {
    expect(PERSONA_COPY.era.name).toBe("Era");
    expect(PERSONA_COPY.era.placeholder).toMatch(/Era/);
    expect(greetingFor("era")).toBe(PERSONA_COPY.era.greeting);
  });
});
