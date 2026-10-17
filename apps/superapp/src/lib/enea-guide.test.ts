import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { eneaDismissKey, eneaLines, eneaStartIndex, nextEneaIndex, type EneaContext } from "./enea-guide";
import { confirmedCount } from "./events";
import { PARTNER_BENEFITS, PARTNER_SAMPLE } from "./partner-preview";
import { hypeWordsIn, parsePackageParam } from "./sponsor-packages";
import { REACH_TO_CONFIRM, reachFacts, reachValue } from "./sponsor-reach";
import { SPONSORS } from "./sponsors";

const APP = resolve(__dirname, "../..");
const exists = (to: string) => {
  const base = to.replace(/^\//, "").replace(/\//g, ".");
  for (const f of [`src/routes/${base}.tsx`, `src/routes/${base}.index.tsx`]) {
    try {
      readFileSync(resolve(APP, f));
      return true;
    } catch {
      /* try next */
    }
  }
  return false;
};

const CTX: EneaContext[] = ["tornei", "sponsor", "eventi"];

describe("Enea, master guide (UD-149)", () => {
  it.each(CTX)("%s: every line has one reason and one action to an existing page", (ctx) => {
    const lines = eneaLines(ctx, "2026-10-17");
    expect(lines.length).toBeGreaterThan(1);
    expect(new Set(lines.map((l) => l.id)).size).toBe(lines.length);
    for (const l of lines) {
      expect(l.reason.length, l.id).toBeGreaterThan(30);
      expect(l.action.label.length, l.id).toBeGreaterThan(3);
      expect(exists(l.action.to), `${l.id} → ${l.action.to}`).toBe(true);
      if (l.action.search) expect(parsePackageParam(l.action.search.pacchetto), l.id).toBe(l.action.search.pacchetto);
    }
  });

  it("never a price, a discount or a promise; no hype words", () => {
    for (const ctx of CTX)
      for (const l of eneaLines(ctx, "2026-10-17")) {
        expect(l.reason, l.id).not.toMatch(/€|euro|sconto|gratis|garantit|visualizzazion|impression/i);
        expect(hypeWordsIn(`${l.reason} ${l.action.label}`), l.id).toEqual([]);
      }
  });

  it("numbers only from the repo data (sponsors, confirmed guest teams, LED seconds)", () => {
    const text = eneaLines("sponsor", "2026-10-17").map((l) => l.reason).join(" ");
    expect(text).toContain(`${SPONSORS.length} le aziende partner`);
    expect(text).toContain(`${confirmedCount()} squadre già confermate`);
    expect(text).toContain("20 secondi");
  });

  it("after the Christmas Lario Cup Enea stops talking about it", () => {
    for (const ctx of CTX) {
      const text = eneaLines(ctx, "2026-12-20").map((l) => l.reason).join(" ");
      expect(text, ctx).not.toMatch(/Christmas Lario Cup|8 dicembre/);
    }
  });

  it("starts on a line that depends only on the Rome day, and wraps", () => {
    expect(eneaStartIndex("2026-10-17", 5)).toBe(eneaStartIndex("2026-10-17", 5));
    expect(eneaStartIndex("2026-10-17", 5)).not.toBe(eneaStartIndex("2026-10-18", 5));
    expect(eneaStartIndex("bad", 4)).toBe(0);
    expect(eneaStartIndex("2026-10-17", 0)).toBe(0);
    expect(nextEneaIndex(4, 5)).toBe(0);
    expect(nextEneaIndex(1, 5)).toBe(2);
    expect(nextEneaIndex(0, 0)).toBe(0);
    expect(eneaDismissKey("sponsor")).toBe("scd-enea-closed:sponsor");
  });

  it("the component respects reduced motion, pauses and can be closed", () => {
    const src = readFileSync(resolve(APP, "src/components/scd/EneaGuide.tsx"), "utf8");
    expect(src).toContain("prefers-reduced-motion: reduce");
    expect(src).toContain('data-testid="enea-close"');
    expect(src).toContain('data-testid="enea-pause"');
    expect(src).toContain("sessionStorage");
    expect(src).toContain('<CastBadge id="mentore-tornei"');
  });
});

describe("why it pays (/sponsor)", () => {
  it("documented numbers or «da confermare», never an invented audience", () => {
    const f = reachFacts();
    const by = Object.fromEntries(f.map((x) => [x.id, x]));
    expect(by["partner"]?.value).toBe(String(SPONSORS.length));
    expect(by["ospiti"]?.value).toBe(String(confirmedCount()));
    expect(by["territorio"]?.value).toBe("8.206 + 2.537");
    expect(by["pubblico"]?.value).toBeNull();
    expect(reachValue(by["pubblico"]!)).toBe(REACH_TO_CONFIRM);
    for (const x of f) expect(x.source.length, x.id).toBeGreaterThan(5);
  });
});

describe("/partner preview", () => {
  it("labelled as an example, with no price, number or real partner name", () => {
    const route = readFileSync(resolve(APP, "src/routes/partner.tsx"), "utf8");
    expect(route).toContain("Esempio · dati non reali");
    expect(route).toContain('accessHead("partner")');
    expect(route).toContain('<AccessScreenPage id="partner" />');
    const text = [
      ...PARTNER_BENEFITS.flatMap((b) => [b.title, b.text]),
      PARTNER_SAMPLE.company,
      PARTNER_SAMPLE.season,
      ...PARTNER_SAMPLE.spot.map((s) => s.label),
      ...PARTNER_SAMPLE.tiles.flatMap((t) => [t.label, t.value]),
    ].join(" ");
    expect(text.replace("2026/27", "")).not.toMatch(/€|\d/);
    for (const s of SPONSORS) if (s.name) expect(text).not.toContain(s.name);
    expect(hypeWordsIn(text)).toEqual([]);
  });
});

describe("/sponsor page", () => {
  const src = readFileSync(resolve(APP, "src/routes/sponsor.tsx"), "utf8");
  it("keeps the form anchor, the LED wall, the packages and Enea", () => {
    expect(src).toMatch(/id="proposta" tabIndex=\{-1\}/);
    expect(src).toContain("<SponsorLedwallLive />");
    expect(src).toContain("<PartnerPackages onChoose={choose} />");
    expect(src).toContain('<EneaGuide ctx="sponsor"');
    expect(src).toContain("<SponsorWall />");
    expect(src).toContain("<SponsorIdeas onChoose={choose} />");
    expect(src).not.toMatch(/€|grayscale/);
  });
});
