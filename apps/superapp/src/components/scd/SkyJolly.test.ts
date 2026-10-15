import { describe, expect, it } from "vitest";

import { insidePersonaFor } from "@/lib/assistant";
import { ASSISTANT_OPEN_EVENT, VERA_OPEN_EVENTS, openedArea } from "@/lib/assistant-open";
import { CAST_PERSONAS } from "@/lib/cast-personas";
import { PUBLIC_PREFIXES } from "@/lib/http-policy";

import {
  PERSONA_COPY,
  KIDS_TEAM_IDS,
  chatAreaFor,
  chatCopyFor,
  greetingFor,
  isHelperHiddenPath,
  isKidsPath,
  isReservedPath,
  launcherFaceFor,
  personaFor,
  veraEligible,
} from "./SkyJolly";

describe("helper persona (UD-121: one chat, Iride; Sky only for the younger members)", () => {
  it("puts Iride in the chat on every public page", () => {
    expect(personaFor("/")).toBe("vera");
    for (const p of PUBLIC_PREFIXES) expect(personaFor(p)).toBe("vera");
    expect(personaFor("/eventi/christmas-lario-cup")).toBe("vera");
    expect(personaFor("/calendario/rotazione-campi")).toBe("vera");
    // /sostieni is open to everyone (out of PUBLIC_PREFIXES only for caching): Vera, never Sky (cleanup 15/10/2026).
    for (const p of ["/sostieni", "/sostieni/dona-materiale", "/sostieni/proponi", "/sostieni/fondo-solidale"]) {
      expect(isReservedPath(p)).toBe(false);
      expect(personaFor(p)).toBe("vera");
      expect(launcherFaceFor(p)).toBe("vera");
    }
    expect(personaFor("/sostienix")).toBe("sky");
  });

  it("puts Sky in the reserved areas by page until the session says otherwise (SkyChat upgrades to Iride)", () => {
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

  it("never fronts the public pages with Sky (Direzione 13/10/2026): Iride everywhere outside", () => {
    for (const p of ["/", "/fantacalcio", "/top11", "/top11/settimana", "/calendario", "/contatti", "/partner", "/sponsor", "/societa", "/eventi", "/comunicazioni", "/rassegna-stampa", "/tornei", "/kit", "/impianti", "/privacy"]) {
      expect(launcherFaceFor(p)).toBe("vera");
      expect(personaFor(p)).toBe("vera");
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

  it("titles the chat 'Chiedi a Iride', the club reception, and has only two personas", () => {
    expect(Object.keys(PERSONA_COPY).sort()).toEqual(["sky", "vera"]);
    expect(PERSONA_COPY.vera.title).toBe("Chiedi a Iride");
    expect(PERSONA_COPY.vera.name).toBe("Iride");
    expect(PERSONA_COPY.vera.placeholder).toMatch(/Iride/);
    expect(PERSONA_COPY.vera.greeting).toMatch(/assistente AI della segreteria/);
    expect(PERSONA_COPY.vera.greeting).toMatch(/dati veri/);
    expect(PERSONA_COPY.vera.greeting).toMatch(/richiesta alla segreteria/);
  });

  it("keeps the copy free of invented facts, real-person likeness claims and the old names", () => {
    for (const persona of ["sky", "vera"] as const) {
      const c = PERSONA_COPY[persona];
      const all = [c.title, c.subtitle, c.greeting, ...c.quick].join(" ");
      expect(all).not.toMatch(/\d{1,2}[:.]\d{2}|\d+\s*-\s*\d+/);
      expect(all).not.toMatch(/Banfi|Trinità|sosia|somiglia|Genny|Vera|\bSky\b/i);
    }
  });
});

describe("Iride opened from a face card (UD-121)", () => {
  const staff = { roles: ["mister"], age15plus: null };

  it("hands over to the face of the area and shows its action buttons", () => {
    const g = greetingFor("vera", "accoglienza-chef");
    expect(g.text).toMatch(/^Ciao, sono Iride/);
    expect(g.text).toContain("Per la Club House ti aiuta Garrison, lo Chef");
    expect(g.links?.map((l) => l.to)).toEqual(["/famiglia#richiesta-ordine", "/famiglia#sondaggi-piatti", "/eventi"]);
    expect(greetingFor("vera").text).toBe(PERSONA_COPY.vera.greeting);
    expect(greetingFor("sky", "accoglienza-chef").text).toBe(PERSONA_COPY.sky.greeting);
  });

  it("keeps Iride's name and takes the area's questions", () => {
    const c = chatCopyFor("vera", "volto-sponsor");
    expect(c.title).toBe("Chiedi a Iride");
    expect(c.quick).toEqual(CAST_PERSONAS["volto-sponsor"].chatQuick);
    expect(chatCopyFor("vera", null)).toBe(PERSONA_COPY.vera);
  });

  it("resolves the area per page and viewer: public areas outside, the Club House only inside for adults", () => {
    expect(chatAreaFor("/sponsor", null, "volto-sponsor")).toBe("volto-sponsor");
    expect(chatAreaFor("/tornei", null, "accoglienza-chef")).toBeNull();
    expect(chatAreaFor("/tesoreria/club-house", staff, "accoglienza-chef")).toBe("accoglienza-chef");
    expect(chatAreaFor("/tesoreria/club-house", null, "accoglienza-chef")).toBeNull();
    expect(personaFor("/tesoreria/club-house", staff, "accoglienza-chef")).toBe("vera");
  });

  it("reads the open event, including the legacy persona ids (alias genny -> Vera's general chat)", () => {
    const ev = (detail: unknown) => new CustomEvent(ASSISTANT_OPEN_EVENT, { detail });
    expect(openedArea(ev({ area: "accoglienza-chef" }))).toBe("accoglienza-chef");
    expect(openedArea(ev({ persona: "mentore-tornei" }))).toBe("mentore-tornei");
    expect(openedArea(ev({ persona: "genny" }))).toBeNull();
    expect(openedArea(ev({ persona: "era" }))).toBeNull();
    expect(openedArea(ev({ area: "admin" }))).toBeNull();
    expect(openedArea(ev(null))).toBeNull();
    expect(VERA_OPEN_EVENTS).toEqual(["vera:open", "genny:open", "crovi:open"]);
  });
});

describe("Iride in the reserved areas (Direzione 'Vai A B C' 13/10/2026, UD-121)", () => {
  const staff = { roles: ["mister"], age15plus: null };
  const member15 = { roles: ["atleta"], age15plus: true };
  const minor = { roles: ["atleta"], age15plus: false };
  const unknownAge = { roles: ["atleta"], age15plus: null };
  const family = { roles: ["famiglia"], age15plus: null };
  const inside = ["/famiglia", "/la-mia-scd", "/direzione", "/segreteria/persone", "/infermeria", "/gestionale/organigramma"];

  it("gives Iride to staff and to members known to be 15+ inside", () => {
    for (const p of inside) {
      expect(personaFor(p, staff)).toBe("vera");
      expect(personaFor(p, member15)).toBe("vera");
      expect(personaFor(p, family)).toBe("vera");
      expect(launcherFaceFor(p, staff)).toBe("vera");
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

  it("a viewer known to be under 15 never gets Iride inside, even with a staff position", () => {
    expect(veraEligible({ roles: ["mister"], age15plus: false })).toBe(false);
    expect(personaFor("/famiglia", { roles: ["mister"], age15plus: false })).toBe("sky");
  });

  it("uses the one rule of lib/assistant.ts for chat persona, face and server voice", () => {
    const viewers = [staff, member15, minor, unknownAge, family, { roles: [], age15plus: null }];
    for (const v of viewers) {
      const expected = insidePersonaFor(v.roles, v.age15plus);
      expect(personaFor("/famiglia", v)).toBe(expected);
      expect(launcherFaceFor("/famiglia", v)).toBe(expected);
      expect(veraEligible(v)).toBe(expected === "vera");
    }
  });

  it("never opens a tip-only character's chat: asking for Era gives Iride's general chat", () => {
    expect(personaFor("/famiglia", { roles: ["famiglia"] }, "era")).toBe("vera");
    expect(chatAreaFor("/famiglia", { roles: ["famiglia"] }, "era")).toBeNull();
  });
});
