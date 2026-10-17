import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  VETTA_AUDIENCES,
  VETTA_CAST,
  VETTA_COUNTERS,
  VETTA_EPOCHS,
  VETTA_LEVELS,
  VETTA_NEEDS,
  VETTA_PATH,
  VETTA_SHARE,
  vettaAllText,
  vettaRoutes,
} from "./vetta-legnone";

const APP = resolve(__dirname, "../..");
const routeTree = readFileSync(resolve(APP, "src/routeTree.gen.ts"), "utf8");
const all = vettaAllText();
const joined = all.join("\n");

/**
 * Capitalised words the page may carry outside the start of a sentence: club, competitions, events, places,
 * institutions, levels and the cast. Any other capitalised word fails the test, so a person's name cannot slip in.
 * «José» and «Sandro» are allowed only inside the official tournament names (events registry).
 */
const ALLOWED_PROPER_WORDS = new Set([
  "Vetta", "Legnone", "ColicoDerviese", "S.C.D.", "SCD", "PULSE", "STORIA", "QR", "Top", "Settore", "Giovanile",
  "Scolastico", "Fair", "Play", "Piccoli", "Amici", "Olginatese", "Cup", "Vis", "Nova", "Primavera", "Scuola", "Calcio",
  "Élite", "Coppa", "Italia", "Promozione", "Memorial", "José", "Nasazzi", "Sandro", "Guattini", "Torneo", "Città",
  "Colico", "Lido", "Meda", "Atalanta", "Football", "Camp", "Sampdoria", "FIGC", "Covid", "AC", "Monza", "Prima", "Squadra",
  "Christmas", "Lario", "Juniores", "Under", "DS", "Riva", "Molo", "Largo", "Rifugio", "NOIF", "GDPR", "Segreteria",
  "Ottavio", "Cervellone", "V", "I", "B", "Direzione", "Leggende", "Leggenda", "SELECT",
]);

/** Capitalised words that do not open a sentence (after «.», «:», «;», «·», «—», ««», «(» or a line start). */
function innerCapitalisedWords(text: string): string[] {
  const out: string[] = [];
  for (const sentence of text.replaceAll("S.C.D.", "SCD").split(/(?:[.:;·—«(?!]\s*)|\n/)) {
    const words = sentence.trim().split(/[\s,»)]+/).filter(Boolean);
    for (const w of words.slice(1)) if (/^[A-ZÀ-Ý]/u.test(w)) out.push(w.replace(/[^\p{L}.]/gu, ""));
  }
  return out;
}

describe("Vetta Legnone content", () => {
  it("has no individual names: every inner capitalised word is a club, event, place or cast name", () => {
    const unknown = new Set<string>();
    for (const s of all) for (const w of innerCapitalisedWords(s)) if (!ALLOWED_PROPER_WORDS.has(w)) unknown.add(w);
    expect([...unknown]).toEqual([]);
    expect(joined.match(/José\s[\p{L}]+/gu) ?? []).toEqual((joined.match(/José Nasazzi/g) ?? []));
    expect(joined.match(/Sandro\s[\p{L}]+/gu) ?? []).toEqual((joined.match(/Sandro Guattini/g) ?? []));
  });

  it("the name check would catch a person's name", () => {
    const flagged = innerCapitalisedWords("Ha giocato con noi Mario Rossi, poi è tornato.").filter((w) => !ALLOWED_PROPER_WORDS.has(w));
    expect(flagged).toEqual(["Mario", "Rossi"]);
  });

  it("carries no phone number, e-mail address or web link", () => {
    expect(joined).not.toMatch(/@/);
    for (const s of all) expect(s).not.toMatch(/\+?\d[\d ]{7,}\d/);
    expect(joined).not.toMatch(/https?:\/\//);
    expect(joined).not.toMatch(/mailto:|tel:/i);
  });

  it("never claims a founding year", () => {
    expect(joined).not.toMatch(/fondat[aoi]\s+(nel|il)\s/i);
    expect(joined).not.toMatch(/(nasce|nata|nato|nacque)\s+(nel|il)\s+\d{4}/i);
    expect(joined).not.toMatch(/(dal|nel)\s+\d{4}[^.]{0,40}fondazion/i);
    expect(joined).not.toMatch(/fondazion[ei][^.]{0,20}\d{4}/i);
    expect(joined).toMatch(/fondazione resta da ricostruire/);
  });

  it("shows no market value, price or vote on people", () => {
    expect(joined).not.toMatch(/€|\beuro\b|valore di mercato:|quotazione:/i);
    expect(joined).not.toMatch(/\b\d{1,2}([.,]\d)?\/10\b(?!\/)/);
    expect(joined).not.toMatch(/\bvoto\s*\d/i);
  });

  it("every CTA points to an existing route", () => {
    for (const to of vettaRoutes()) expect(routeTree, to).toContain(`'${to}'`);
    expect(routeTree).toContain(`'${VETTA_PATH}'`);
    expect(VETTA_SHARE.path).toBe(VETTA_PATH);
  });

  it("has one CTA per audience, and the parent goes through the parent", () => {
    expect(VETTA_AUDIENCES.map((a) => a.id)).toEqual(["calciatore", "genitore", "leggenda", "mister", "tifoso"]);
    const parent = VETTA_AUDIENCES.find((a) => a.id === "genitore");
    expect(parent?.invite).toMatch(/la fa lei/);
    expect(parent?.gets).toMatch(/privata/);
  });

  it("tells the 6 epochs, each with a source, and keeps unverified outcomes open", () => {
    expect(VETTA_EPOCHS).toHaveLength(6);
    for (const e of VETTA_EPOCHS) {
      expect(e.source.length, e.id).toBeGreaterThan(10);
      expect(e.facts.length, e.id).toBeGreaterThan(0);
    }
    expect(joined).toMatch(/Coppa Italia di Promozione, 14\/05\/2022 a Meda \(esito da verificare\)/);
    expect(joined).toMatch(/play-off di Promozione/);
    expect(joined).toMatch(/Memorial José Nasazzi/);
    expect(joined).toMatch(/Memorial Sandro Guattini/);
    expect(joined).not.toMatch(/vinto|vittoria della finale|campioni/i);
  });

  it("states needs honestly: roles by the mister, annata 2010 to be confirmed by the DS", () => {
    expect(VETTA_NEEDS.filter((n) => n.state === "da-indicare").every((n) => /dal mister/.test(n.status))).toBe(true);
    expect(VETTA_NEEDS.find((n) => n.team === "Annata 2010")?.status).toMatch(/da confermare dal DS/);
    expect(joined).not.toMatch(/cerchiamo (un|una|due) (portiere|difensore|centrocampista|attaccante)/i);
  });

  it("climbs from Riva to Vetta, and the summit is the last step", () => {
    expect(VETTA_LEVELS[0]?.name).toBe("Riva");
    expect(VETTA_LEVELS.at(-1)?.name).toBe("Vetta");
    expect(VETTA_LEVELS.map((l) => l.name)).not.toContain("Breva");
    expect(joined).not.toMatch(/Breva/);
  });

  it("Lario shows only his initial and Ottavio talks to parents about minors", () => {
    expect(VETTA_CAST.lario.initials).toBe("L");
    expect(VETTA_CAST.lario.role).toBe("Direttore sportivo");
    expect(VETTA_CAST.ottavio.lines.join(" ")).toMatch(/per i minori parliamo con i genitori/i);
  });

  it("every hero counter has a source and none is an unknown shown as zero", () => {
    for (const c of VETTA_COUNTERS) {
      expect(c.source.length).toBeGreaterThan(10);
      expect(c.value).not.toBe("0");
    }
  });
});
