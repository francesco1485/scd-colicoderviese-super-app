import { describe, expect, it } from "vitest";

import { cameoLine } from "@/lib/crovi-cameo";
import { PUBLIC_PREFIXES } from "@/lib/http-policy";

import {
  CROVI_AVATAR_SRC,
  PERSONA_COPY,
  SKY_HANDOFF,
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

  it("puts the club assistant in the reserved areas (until Era exists), never Crovi or Sky", () => {
    for (const p of ["/famiglia", "/la-mia-scd", "/direzione", "/segreteria/persone", "/tesoreria", "/gestionale/organigramma", "/squadre", "/squadre/u16", "/squadre/u15", "/aree", "/core", "/quadro", "/crm"]) {
      expect(isReservedPath(p)).toBe(true);
      expect(personaFor(p)).toBe("club");
      expect(launcherFaceFor(p)).toBe("club");
    }
  });

  it("keeps Sky only for the under-14 team pages (Direzione 13/10/2026)", () => {
    for (const id of KIDS_TEAM_IDS) {
      expect(isKidsPath(`/squadre/${id}`)).toBe(true);
      expect(personaFor(`/squadre/${id}`)).toBe("sky");
      expect(launcherFaceFor(`/squadre/${id}/`)).toBe("sky");
    }
    for (const p of ["/", "/fantacalcio", "/top11", "/squadre", "/squadre/prima", "/squadre/u19", "/squadre/u15", "/squadre/pulcini/extra", "/la-mia-scd"]) {
      expect(isKidsPath(p)).toBe(false);
      expect(personaFor(p)).not.toBe("sky");
    }
  });

  it("does not mistake look-alike paths for public ones", () => {
    expect(personaFor("/calendariox")).toBe("club");
    expect(personaFor("/partners")).toBe("club");
  });

  it("shows on the launcher the same figure that answers", () => {
    for (const p of ["/", "/fantacalcio", "/top11", "/top11/settimana", "/calendario", "/contatti", "/partner", "/sponsor", "/societa", "/eventi", "/comunicazioni", "/rassegna", "/impianti", "/privacy"]) {
      expect(launcherFaceFor(p)).toBe("crovi");
    }
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
    for (const persona of ["sky", "crovi", "club"] as const) {
      const c = PERSONA_COPY[persona];
      const all = [c.title, c.subtitle, c.greeting, ...c.quick].join(" ");
      expect(all).not.toMatch(/\d{1,2}[:.]\d{2}|\d+\s*-\s*\d+/);
      expect(all).not.toMatch(/Banfi|Trinità|sosia|somiglia/i);
    }
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
