import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  VETTA_AUDIENCES,
  VETTA_CAST,
  VETTA_COUNTERS,
  VETTA_HISTORY_STATUS,
  VETTA_HERO,
  VETTA_RULES,
  VETTA_EPOCHS,
  VETTA_HISTORY_NOTE,
  VETTA_LEVELS,
  VETTA_MILESTONES,
  VETTA_NEEDS,
  VETTA_PATH,
  VETTA_SHARE,
  vettaAllText,
  vettaAudiences,
  vettaHistoryCta,
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
  "Ottavio", "Cervellone", "Super", "App", "V", "I", "B", "Direzione", "Leggende", "Leggenda", "SELECT",
  "Tornei", "Iniziative",
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
    expect(parent?.invite).toMatch(/lo fa lei/);
    expect(parent?.gets).toMatch(/privata/);
  });

  it("tells the 6 epochs: strong title, 1-2 lines of story and 1-3 highlights, each with its own source", () => {
    expect(VETTA_EPOCHS).toHaveLength(6);
    for (const e of VETTA_EPOCHS) {
      expect(e.title.length, e.id).toBeGreaterThan(5);
      const sentences = e.story.split(/[.!?](?:\s|$)/).filter((x) => x.trim()).length;
      expect(sentences, e.id).toBeGreaterThanOrEqual(1);
      expect(sentences, e.id).toBeLessThanOrEqual(2);
      expect(e.story.length, e.id).toBeLessThanOrEqual(170);
      expect(e.highlights.length, e.id).toBeGreaterThanOrEqual(1);
      expect(e.highlights.length, e.id).toBeLessThanOrEqual(3);
      for (const h of e.highlights) {
        expect(h.source, `${e.id}: ${h.result}`).toMatch(/Cervellone cartella 04|Calendario eventi del club/);
        expect(h.tag, h.result).toBe("VERIFIED");
        expect(h.when.trim().length && h.category.trim().length && h.result.trim().length, h.result).toBeTruthy();
      }
    }
    expect(joined).toMatch(/Finale di Coppa Italia di Promozione a Meda \(esito da verificare\)/);
    expect(joined).not.toMatch(/vinto|vittoria della finale|campioni|trionf|conquist/i);
  });

  it("«Le nostre tappe» carries the verified milestones, each with a source", () => {
    expect(VETTA_MILESTONES.map((m) => m.id)).toEqual(["coppa-2022", "nasazzi", "playoff-2526", "guattini"]);
    for (const m of VETTA_MILESTONES) {
      expect(m.source, m.id).toMatch(/Cervellone cartella 04|Calendario eventi del club/);
      expect(m.tag).toBe("VERIFIED");
    }
    const text = VETTA_MILESTONES.map((m) => `${m.title} ${m.detail}`).join(" ");
    expect(text).toMatch(/Finale di Coppa Italia di Promozione/);
    expect(text).toMatch(/esito da verificare/);
    expect(text).toMatch(/Play-off di Promozione/);
    expect(text).toMatch(/Memorial José Nasazzi/);
    expect(text).toMatch(/Memorial Sandro Guattini/);
  });

  it("2011/12 is the first documented season, never the founding year", () => {
    expect(VETTA_HISTORY_NOTE).toMatch(/la prima è il 2011\/12/);
    expect(VETTA_EPOCHS[0]?.story).toMatch(/prima stagione documentata è il 2011\/12/i);
    expect(joined).not.toMatch(/\b(1902|1913|1921|1928|2012\/13)\b/);
    expect(joined).not.toMatch(/anno di fondazione|fondat[aoi] (?!.*da ricostruire)/i);
    expect(joined).not.toMatch(/\bdal\s+(19|20)\d\d\b[^.]{0,30}(club|società|ColicoDerviese) (esiste|gioca)/i);
  });

  it("names no minors and no individual players: highlights speak of teams, categories and seasons", () => {
    const history = [...VETTA_EPOCHS.flatMap((e) => [e.title, e.story, ...e.highlights.flatMap((h) => [h.category, h.result])]), ...VETTA_MILESTONES.flatMap((m) => [m.title, m.detail])];
    const unknown = new Set<string>();
    for (const s of history) for (const w of innerCapitalisedWords(s)) if (!ALLOWED_PROPER_WORDS.has(w)) unknown.add(w);
    expect([...unknown]).toEqual([]);
    // «Nome C.» is how the app writes a minor: never in the public history.
    expect(history.join(" ")).not.toMatch(/\b[A-Z][a-zà-ù]+ [A-Z]\.(?!\w)/);
    expect(history.join(" ")).not.toMatch(/\b(capitano|bomber|portiere|attaccante|difensore|centrocampista|mister)\s+[A-Z]/);
  });

  it("the history closes on the visitor's next step, bound to PUBLIC_FORMS_LIVE", () => {
    expect(vettaHistoryCta(false)).toMatchObject({ line: "La prossima tappa la scrivi tu.", to: "/contatti" });
    expect(vettaHistoryCta(true)).toMatchObject({ line: "La prossima tappa la scrivi tu.", to: "/entra" });
    expect(vettaHistoryCta(false).hint).toMatch(/genitore/);
  });

  it("states needs honestly: roles by the mister, annata 2010 to be confirmed by the DS", () => {
    expect(VETTA_NEEDS.filter((n) => n.state === "da-indicare").every((n) => /dal mister/.test(n.status))).toBe(true);
    expect(VETTA_NEEDS.find((n) => n.team === "Annata 2010")?.status).toBe("Da confermare dal DS");
    expect(joined).not.toMatch(/senza una squadra propria/);
    expect(joined).not.toMatch(/cerchiamo (un|una|due) (portiere|difensore|centrocampista|attaccante)/i);
  });

  it("climbs from Riva to Vetta, and the summit is the last step", () => {
    expect(VETTA_LEVELS[0]?.name).toBe("Riva");
    expect(VETTA_LEVELS.at(-1)?.name).toBe("Vetta");
    expect(VETTA_LEVELS.map((l) => l.name)).not.toContain("Breva");
    expect(joined).not.toMatch(/Breva/);
  });

  it("public cast is Ottavio only: the DS does not speak here and Ottavio addresses adults", () => {
    expect(Object.keys(VETTA_CAST)).toEqual(["ottavio"]);
    expect(joined.replaceAll("Christmas Lario Cup", "")).not.toMatch(/Lario/);
    expect(VETTA_CAST.ottavio.lines[0]).toMatch(/^Sei maggiorenne/);
    expect(VETTA_CAST.ottavio.lines.join(" ")).toMatch(/per i minori parliamo con i genitori/i);
  });

  it("CTAs follow PUBLIC_FORMS_LIVE: with the forms paused nobody is sent to /entra or promised a callback", () => {
    const paused = vettaAudiences(false);
    const pausedText = paused.flatMap((a) => [a.invite, a.gets, a.cta.label, a.cta.hint]).join(" ");
    expect(paused.map((a) => a.cta.to)).not.toContain("/entra");
    expect(paused.find((a) => a.id === "calciatore")?.cta.to).toBe("/contatti");
    expect(paused.find((a) => a.id === "genitore")?.cta.to).toBe("/contatti");
    expect(pausedText).not.toMatch(/due minuti|ricontatt|funziona già oggi/i);
    expect(joined).not.toMatch(/due minuti|ricontatt|funziona già oggi/i);
    const live = vettaAudiences(true);
    expect(live.find((a) => a.id === "calciatore")?.cta.to).toBe("/entra");
    expect(live.find((a) => a.id === "genitore")?.cta.to).toBe("/entra");
  });

  it("the default audiences match the real state of the public forms", async () => {
    const { PUBLIC_FORMS_LIVE } = await import("./public-forms");
    expect(VETTA_AUDIENCES).toEqual(vettaAudiences(PUBLIC_FORMS_LIVE));
  });

  it("shows no team or tesserati count (UD-176: those cite the LND export), and no profile in the present tense", () => {
    expect(joined).not.toMatch(/\bsquadre in campo\b|\btesserati\b/);
    expect(VETTA_HERO.sub).toMatch(/si scriverà/);
    for (const c of VETTA_COUNTERS) expect(c.source).toMatch(/^Fonte: .+ al 17\/10\/2026$/);
  });

  it("history carries the Direzione approval (17/10/2026), the federal rule has no unsourced article and minors follow /top11", () => {
    expect(VETTA_HISTORY_STATUS).toBe("Storia approvata dalla Direzione · 17/10/2026");
    expect(joined).not.toMatch(/Storia in ricostruzione/);
    expect(joined).not.toMatch(/95\s*bis/i);
    expect(VETTA_RULES.map((r) => r.text).join(" ")).toMatch(/Nome e iniziale solo con il consenso della famiglia, mai volti/);
  });

  it("every hero counter has a source and none is an unknown shown as zero", () => {
    for (const c of VETTA_COUNTERS) {
      expect(c.source.length).toBeGreaterThan(10);
      expect(c.value).not.toBe("0");
    }
  });
});
