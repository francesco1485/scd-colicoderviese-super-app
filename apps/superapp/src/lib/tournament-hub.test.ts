import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { CHRISTMAS_LARIO_CUP } from "./events";
import { hypeWordsIn } from "./sponsor-packages";
import {
  LAKE_FACTS,
  TOURNAMENT_SERVICE_IDS,
  TO_CONFIRM,
  countdownView,
  isPublished,
  sameDayEditions,
  serviceFacts,
  tournamentBoard,
} from "./tournament-hub";
import { TOURNAMENTS, type TournamentEdition } from "./tournaments";

const read = (p: string) => readFileSync(resolve(__dirname, "../..", p), "utf8");

describe("tournament board (/tornei)", () => {
  it("before the Christmas Lario Cup: hero = CLC, both editions as full cards, the rest «In arrivo»", () => {
    const b = tournamentBoard("2026-10-17");
    expect(b.hero?.id).toBe("christmas-lario-cup-maschile");
    expect(b.published.map((t) => t.id)).toEqual(["christmas-lario-cup-maschile", "christmas-lario-cup-female"]);
    expect(b.coming.map((t) => t.id)).toEqual(["memorial-jose-nasazzi", "memorial-sandro-guattini"]);
    expect(sameDayEditions(b.hero, b.published)).toHaveLength(2);
  });

  it("after the Christmas Lario Cup: no hero invented, unpublished tournaments stay compact", () => {
    const b = tournamentBoard("2026-12-09");
    expect(b.hero).toBeNull();
    expect(b.published).toEqual([]);
    expect(b.coming.length).toBeGreaterThan(0);
    expect(sameDayEditions(b.hero, b.published)).toEqual([]);
  });

  it("a tournament needs date, place and a page to get a full card", () => {
    for (const t of TOURNAMENTS) expect(isPublished(t), t.id).toBe(Boolean(t.date && t.when && t.place && t.link));
    const noPlace: TournamentEdition = { ...TOURNAMENTS[0]!, place: null };
    expect(isPublished(noPlace)).toBe(false);
  });

  it("annate chips come from the official cup categories", () => {
    const male = TOURNAMENTS.find((t) => t.id === "christmas-lario-cup-maschile")!;
    expect(male.annate?.map((a) => a.big)).toEqual(CHRISTMAS_LARIO_CUP.cups[0]!.categories.map((c) => c.big));
  });
});

describe("services of a tournament", () => {
  it("always six, in poster order; unknown ones read «da confermare»", () => {
    const empty = serviceFacts({});
    expect(empty.map((s) => s.id)).toEqual([...TOURNAMENT_SERVICE_IDS]);
    expect(empty.every((s) => !s.confirmed && s.text === TO_CONFIRM)).toBe(true);
  });

  it("Christmas Lario Cup: only published services are confirmed (no guaranteed matches or lodging invented)", () => {
    const clc = TOURNAMENTS.find((t) => t.id === "christmas-lario-cup-maschile")!;
    const by = Object.fromEntries(serviceFacts(clc).map((s) => [s.id, s]));
    expect(by["partite"]?.confirmed).toBe(false);
    expect(by["ospitalita"]?.confirmed).toBe(false);
    expect(by["ristorazione"]?.confirmed).toBe(true);
    expect(by["organizzazione"]?.text).toContain(CHRISTMAS_LARIO_CUP.coOrganizer);
    expect(serviceFacts({ services: { partite: "   " } })[0]?.confirmed).toBe(false);
  });
});

describe("countdown", () => {
  const start = CHRISTMAS_LARIO_CUP.start;
  it("counts to the official start and stops once it began", () => {
    const before = Date.parse(start) - (2 * 86_400_000 + 3 * 3_600_000 + 4 * 60_000 + 5_000);
    expect(countdownView(before, start)).toEqual({ parts: { d: 2, h: 3, m: 4, s: 5 }, words: "Mancano 2 giorni" });
    expect(countdownView(Date.parse(start) - 86_400_000 - 1000, start)?.words).toBe("Manca 1 giorno");
    expect(countdownView(Date.parse(start) - 30_000, start)?.words).toBe("Manca 1 minuto");
    expect(countdownView(Date.parse(start) + 1, start)).toEqual({ parts: null, words: "Si gioca" });
  });
  it("no start, no countdown", () => {
    expect(countdownView(Date.now(), undefined)).toBeNull();
    expect(countdownView(Date.now(), "not a date")).toBeNull();
  });
});

describe("«Vivi il Lago»", () => {
  it("names Colico, Forte Montecchio, Dervio and the lake, each with a source, no hype, no prices", () => {
    expect(LAKE_FACTS.map((f) => f.id)).toEqual(["colico", "montecchio", "dervio", "lago"]);
    for (const f of LAKE_FACTS) {
      expect(f.source.length, f.id).toBeGreaterThan(5);
      expect(hypeWordsIn(`${f.title} ${f.text}`), f.id).toEqual([]);
      expect(f.text, f.id).not.toMatch(/€|euro|orari|aperto/i);
    }
  });
});

describe("/tornei page", () => {
  const src = read("src/routes/tornei.tsx");
  it("one card per published tournament, compact rows otherwise, posters once and enlargeable", () => {
    expect(src).toContain("tournamentBoard(today)");
    expect(src).toContain("<ComingList list={coming} />");
    expect(src).not.toMatch(/<Trophy/);
    expect(src.match(/<PosterZoom/g)).toHaveLength(1);
    expect(src).toContain("<EneaGuide ctx=\"tornei\"");
    expect(src).toContain("pageHead(SHARE_PAGES.tornei)");
  });
});
