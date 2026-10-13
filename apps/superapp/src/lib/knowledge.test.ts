import { describe, expect, it } from "vitest";

import {
  areaLabel,
  dueIn,
  dueText,
  dueTone,
  foldText,
  hasSearchText,
  highlightParts,
  kbSearchTerms,
  parseKb,
  safeLink,
  seasonsUntil,
  splitByMatch,
  topAreas,
} from "./knowledge";

describe("parseKb", () => {
  it("returns null without an office level and keeps only valid items", () => {
    expect(parseKb(null)).toBeNull();
    expect(parseKb({ level: "FAMIGLIA", items: [] })).toBeNull();
    const r = parseKb({
      level: "INTERNO",
      items: [
        { id: "1", kind: "DOCUMENTO", area: "IMPIANTI_COMUNI", stagione: "2024/25", titolo: "Omologazione 0865", scadenza: "2028-09-28", importo: "12.50", link: "https://drive.google.com/open?id=abc", tags: ["omologazione", 3] },
        { id: "2", titolo: "Link non sicuro", link: "javascript:alert(1)" },
        { titolo: "senza id" },
      ],
      counts: { IMPIANTI_COMUNI: 4, BAD: "x" },
    })!;
    expect(r.items).toHaveLength(2);
    expect(r.items[0]).toMatchObject({ kind: "DOCUMENTO", season: "2024/25", due: "2028-09-28", amount: 12.5, tags: ["omologazione"] });
    expect(r.items[1]!.link).toBeNull();
    expect(r.counts).toEqual({ IMPIANTI_COMUNI: 4 });
  });
});

describe("helpers", () => {
  it("labels areas, accepts only https links and builds the season list back to the mailbox opening", () => {
    expect(areaLabel("TESSERAMENTI_ISCRIZIONI")).toBe("Tesseramenti iscrizioni");
    expect(safeLink("http://x.it")).toBeNull();
    expect(safeLink("https://mail.google.com/mail/u/0/#search/abc")).not.toBeNull();
    const s = seasonsUntil("2026-10-12");
    expect(s[0]).toBe("2026/27");
    expect(s.at(-1)).toBe("2011/12");
    expect(seasonsUntil("2026-06-30")[0]).toBe("2025/26");
  });
  it("describes deadlines", () => {
    expect(dueIn("2026-10-12", "2026-10-29")).toBe(17);
    expect(dueTone(-3)).toBe("crit");
    expect(dueTone(10)).toBe("crit");
    expect(dueTone(40)).toBe("warn");
    expect(dueTone(400)).toBe("info");
    expect(dueText(200)).toBe("tra 7 mesi");
    expect(dueText(717)).toBe("tra 2 anni");
    expect(dueText(0)).toBe("scade oggi");
    expect(dueText(-5)).toBe("scaduto da 5 giorni");
    expect(dueText(17)).toBe("tra 17 giorni");
  });
});

describe("r98 match field", () => {
  const base = { id: "a", kind: "DOCUMENTO", area: "PULMINI_TRASPORTI", titolo: "Revisione pulmino" };
  it("keeps parseKb backwards compatible: match is optional and only fts/fuzzy are accepted", () => {
    const r = parseKb({
      level: "RISERVATO",
      items: [
        base,
        { ...base, id: "b", match: "fts" },
        { ...base, id: "c", match: "fuzzy" },
        { ...base, id: "d", match: "boh" },
        { ...base, id: "e", match: null },
      ],
    })!;
    expect(r.items.map((i) => i.match)).toEqual([undefined, "fts", "fuzzy", undefined, undefined]);
    expect("match" in r.items[0]!).toBe(false);
    expect(r.counts).toEqual({});
  });
  it("splits exact and similar results keeping the server order", () => {
    const r = parseKb({
      level: "INTERNO",
      items: [
        { ...base, id: "1", match: "fts" },
        { ...base, id: "2", match: "fuzzy" },
        { ...base, id: "3" },
        { ...base, id: "4", match: "fuzzy" },
      ],
    })!;
    const { exact, similar } = splitByMatch(r.items);
    expect(exact.map((i) => i.id)).toEqual(["1", "3"]);
    expect(similar.map((i) => i.id)).toEqual(["2", "4"]);
  });
});

describe("kbSearchTerms (mirror of scd_kb_query_terms)", () => {
  it("folds accents and case, keeps only [a-z0-9] tokens, drops single letters but not single digits", () => {
    expect(kbSearchTerms('  Società, "Pulmini"!! a 3 livello SGS società  ')).toEqual(["societa", "pulmini", "3", "livello", "sgs"]);
    expect(kbSearchTerms("x' or 1=1; drop table")).toEqual(["or", "1", "drop", "table"]);
    expect(kbSearchTerms("Perché è già così")).toEqual(["perche", "gia", "cosi"]);
    expect(kbSearchTerms("CAFÉ naïve Ærø")).toEqual(["cafe", "naive", "aero"]);
  });
  it("handles empty input, caps terms at 8 and length at 40", () => {
    expect(kbSearchTerms(null)).toEqual([]);
    expect(kbSearchTerms(" -- ")).toEqual([]);
    expect(kbSearchTerms("a b c")).toEqual([]);
    expect(kbSearchTerms("uno due tre quattro cinque sei sette otto nove dieci")).toHaveLength(8);
    expect(kbSearchTerms("x".repeat(60))[0]).toHaveLength(40);
    expect(hasSearchText("  ")).toBe(false);
    expect(hasSearchText("a")).toBe(false);
    expect(hasSearchText("pulm")).toBe(true);
  });
  it("folds text the same way for highlighting", () => {
    expect(foldText("Società Olginatese È")).toBe("societa olginatese e");
  });
});

describe("highlightParts", () => {
  const join = (parts: { text: string; hit: boolean }[]) => parts.map((p) => (p.hit ? `[${p.text}]` : p.text)).join("");
  it("marks word prefixes ignoring case and accents and keeps the original text", () => {
    expect(join(highlightParts("Manutenzione Pulmini 9 posti", ["pulm"]))).toBe("Manutenzione [Pulm]ini 9 posti");
    expect(join(highlightParts("Società ospite, SOCIETÀ", ["societa"]))).toBe("[Società] ospite, [SOCIETÀ]");
    expect(join(highlightParts("Comune di Colico", ["comune", "colico"]))).toBe("[Comune] di [Colico]");
  });
  it("does not mark inside words and merges overlapping terms", () => {
    expect(join(highlightParts("Sportclub rapporto", ["port"]))).toBe("Sportclub rapporto");
    expect(join(highlightParts("Lario Cup", ["lar", "lario"]))).toBe("[Lario] Cup");
    expect(join(highlightParts("3° livello SGS", ["3", "sgs"]))).toBe("[3]° livello [SGS]");
  });
  it("returns plain text without terms and nothing for empty text; markup in data stays text", () => {
    expect(highlightParts("<b>x</b>", [])).toEqual([{ text: "<b>x</b>", hit: false }]);
    expect(highlightParts("", ["x"])).toEqual([]);
    expect(join(highlightParts("<img onerror=alert(1)> pulmino", ["pulmino"]))).toBe("<img onerror=alert(1)> [pulmino]");
  });
});

describe("topAreas", () => {
  it("orders known areas by count, ties alphabetical, ignores unknown or empty areas", () => {
    expect(topAreas({ PULMINI_TRASPORTI: 41, FEDERAZIONE: 120, BOH: 999, ALTRO: 0, TORNEI_EVENTI: 41 }, 3)).toEqual([
      "FEDERAZIONE",
      "PULMINI_TRASPORTI",
      "TORNEI_EVENTI",
    ]);
  });
});
