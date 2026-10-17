/** UD-172 / UD-173: the guide and FAQ module is truthful, safe and short. */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  FAQ_ENTRIES,
  GUIDE_CARDS,
  GUIDE_ROLES,
  cardsFor,
  guideActionRoutes,
  isFederal,
  itDay,
  searchCards,
  searchFaq,
  tourPortalPaths,
  tourRoleForPath,
} from "./guide-content";

const APP = resolve(__dirname, "../..");
const routes = new Set(
  [...readFileSync(resolve(APP, "src/routeTree.gen.ts"), "utf8").matchAll(/fullPath: '([^']+)'/g)].map(
    (m) => m[1]!.replace(/\/$/, "") || "/",
  ),
);

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const sentences = (s: string) => s.split(/(?<=[.!?:;])\s+/).filter((x) => x.trim() !== "");

/** Every user-facing text of the module. */
const TEXTS: string[] = [
  ...GUIDE_CARDS.flatMap((c) => [c.title, c.body, c.action?.label ?? ""]),
  ...FAQ_ENTRIES.flatMap((e) => [e.q, e.a, e.action?.label ?? ""]),
];

describe("guide cards (UD-172)", () => {
  it("has 3 to 6 cards for each role, with unique ids and anchors", () => {
    for (const r of GUIDE_ROLES) {
      const list = cardsFor(r);
      expect(list.length, r).toBeGreaterThanOrEqual(3);
      expect(list.length, r).toBeLessThanOrEqual(6);
    }
    const ids = GUIDE_CARDS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of GUIDE_CARDS) expect(c.id.startsWith(`${c.role}-`), c.id).toBe(true);
  });

  it("respects the length limits: title max 6 words, body max 35, sentences under 20", () => {
    for (const c of GUIDE_CARDS) {
      expect(words(c.title), c.id).toBeLessThanOrEqual(6);
      expect(words(c.body), c.id).toBeLessThanOrEqual(35);
      for (const s of sentences(c.body)) expect(words(s), `${c.id}: ${s}`).toBeLessThan(20);
    }
  });

  it("links live cards to existing routes and gives no link to cards in arrivo", () => {
    for (const c of GUIDE_CARDS) {
      if (c.status === "in-arrivo") expect(c.action, c.id).toBeUndefined();
      else expect(c.action, c.id).toBeDefined();
    }
  });
});

describe("FAQ (UD-173)", () => {
  it("every action route exists in the route tree", () => {
    for (const to of guideActionRoutes()) expect(routes.has(to), to).toBe(true);
    expect(routes.has("/guida")).toBe(true);
  });

  it("answers are short: max 60 words, sentences under 20 words", () => {
    const ids = FAQ_ENTRIES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const e of FAQ_ENTRIES) {
      expect(words(e.a), e.id).toBeLessThanOrEqual(60);
      for (const s of sentences(e.a)) expect(words(s), `${e.id}: ${s}`).toBeLessThan(20);
      expect(e.roles.length, e.id).toBeGreaterThan(0);
    }
  });

  it("every FIGC / LND / SGS / Tutela Minori entry has an opened source or is da confermare", () => {
    const federal = FAQ_ENTRIES.filter(isFederal);
    expect(federal.length).toBeGreaterThanOrEqual(8);
    for (const e of federal) {
      if (e.status === "verificato") {
        expect(e.source, e.id).toBeDefined();
        expect(e.source!.url, e.id).toMatch(/^https:\/\//);
        expect(e.source!.label.trim(), e.id).not.toBe("");
        expect(e.source!.checkedAt, e.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(Number.isNaN(Date.parse(e.source!.checkedAt)), e.id).toBe(false);
      } else {
        expect(e.status, e.id).toBe("da-confermare");
        expect(e.source, e.id).toBeUndefined();
      }
    }
    // Both kinds exist: the unverified topics are never left out or invented.
    expect(federal.some((e) => e.status === "da-confermare")).toBe(true);
  });

  it("every da-confermare answer sends to the Segreteria", () => {
    for (const e of FAQ_ENTRIES.filter((x) => x.status === "da-confermare")) {
      expect(e.a, e.id).toMatch(/chiedi alla Segreteria/);
    }
  });
});

describe("safety of the texts", () => {
  it("contains no phone number, e-mail, IBAN or codice fiscale", () => {
    for (const t of TEXTS) {
      expect(t, t).not.toMatch(/[\w.+-]+@[\w-]+\.[a-z]{2,}/i);
      expect(t, t).not.toMatch(/\+\d{2}|\d(?:[\s.]?\d){8,}/);
      expect(t, t).not.toMatch(/\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/);
      expect(t, t).not.toMatch(/\b[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]\b/i);
    }
  });

  it("names no person: no first name + surname or first name + initial", () => {
    // Capitalised word pairs are allowed only for places, categories, offices and features.
    const allowed = new Set([
      "Prima Squadra",
      "Piccoli Amici",
      "Primi Calci",
      "Codice di",
      "Comitato Regionale",
      "Regionale Lombardia",
      "Giudice Sportivo",
      "Sportivo Territoriale",
      "Comunicati Ufficiali",
      "Linee Guida",
      "Guida FIGC",
      "Tutela e",
      "Benessere dei",
      "Colico 1",
      "Programma Tutela",
      "Tutela dei",
      "Delegato Tutela",
      "Sistema di",
      "Responsabile contro",
      "Modello organizzativo",
      "Settore Giovanile",
      "Giovanile e",
      "Lombardia LND",
      "Top 11",
      "Fantacalcio del",
      "Calendario, aperto",
    ]);
    const pairs = TEXTS.flatMap((t) => [...t.matchAll(/(?<![.!?]\s|^)\b([A-ZÀ-Ú][a-zà-ú]+) ([A-ZÀ-Ú][a-zà-ú]+)\b/g)].map((m) => `${m[1]} ${m[2]}`));
    const unknown = pairs.filter((p) => !allowed.has(p) && !/^(La|Le|Il|In|Per|Su|Dal|Nel|Nella|Da|Se|Ogni|Senza|No|Sotto|Usa|Solo|Chiedi|Durata|Vincolo|Dipende|Stagione|Tornei|Rispetto|Compila|Segnala|Prima|Convoca|Prenota|Ti|Tocca|Crea|Giorno|Avvisi|Scorciatoie|Ruolo|Filtra|Colico|Nei|Un|Una|Il|I|Ne|Ruoli|Cambio|Mio|Posso|Dove|Cosa|Come|Chi|Quali|Quanto|Serve|Sono|Ho|Da)\b/.test(p));
    expect(unknown).toEqual([]);
    for (const t of TEXTS) expect(t, t).not.toMatch(/\b[A-Z][a-zà-ú]+ [A-Z]\.(?![A-Z])/);
  });

  it("uses the official club name and states no founding year", () => {
    const src = readFileSync(resolve(APP, "src/lib/guide-content.ts"), "utf8");
    expect(src).toContain('"S.C.D. ColicoDerviese"');
    for (const t of TEXTS) {
      expect(t, t).not.toMatch(/fondat|\b19\d\d\b/i);
      expect(t, t).not.toMatch(/Colico Derviese|Colicoderviese/);
    }
  });
});

describe("helpers", () => {
  it("search matches every word, accents folded", () => {
    expect(searchFaq("").length).toBe(FAQ_ENTRIES.length);
    expect(searchFaq("pulmino posto").map((e) => e.id)).toContain("pulmini-posto");
    expect(searchFaq("citta inesistentexyz")).toEqual([]);
    expect(searchCards("convoca").some((c) => c.id === "mister-convocazioni")).toBe(true);
  });

  it("maps only portal homes to a tour role, and those routes exist", () => {
    expect(tourRoleForPath("/famiglia")).toBe("famiglie");
    expect(tourRoleForPath("/famiglia/")).toBe("famiglie");
    expect(tourRoleForPath("/gestionale/mister")).toBe("mister");
    expect(tourRoleForPath("/gestionale/impianti")).toBeNull();
    expect(tourRoleForPath("/guida")).toBeNull();
    expect(tourRoleForPath("/")).toBeNull();
    for (const p of tourPortalPaths()) expect(routes.has(p), p).toBe(true);
  });

  it("formats the verification day", () => {
    expect(itDay("2026-10-17")).toBe("17/10/2026");
  });
});
