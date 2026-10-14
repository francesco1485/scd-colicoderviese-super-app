import { describe, expect, it } from "vitest";

import { CHRISTMAS_LARIO_CUP as E } from "./events";
import { LARIO_LANGS, LARIO_TEXT, parseLarioLang } from "./lario-cup-i18n";

describe("Christmas Lario Cup page in three languages", () => {
  it("falls back to Italian for anything that is not de or en", () => {
    expect(parseLarioLang("de")).toBe("de");
    expect(parseLarioLang("en")).toBe("en");
    expect(parseLarioLang("fr")).toBe("it");
    expect(parseLarioLang(undefined)).toBe("it");
  });

  it("translates every item the page shows, one to one with the official data", () => {
    for (const l of LARIO_LANGS) {
      const T = LARIO_TEXT[l];
      expect(T.cups).toHaveLength(E.cups.length);
      E.cups.forEach((c, i) => expect(T.cups[i]!.categories).toHaveLength(c.categories.length));
      expect(T.village).toHaveLength(E.village.length);
      expect(T.partners).toHaveLength(E.partnerSlots.length);
      expect(T.posters).toHaveLength(E.posters.length);
      expect(T.units).toHaveLength(4);
    }
  });

  it("keeps Italian identical to the official event data", () => {
    const T = LARIO_TEXT.it;
    expect(T.tagline).toBe(E.tagline);
    expect(T.claim).toBe(E.claim);
    expect(T.cups.map((c) => c.badge)).toEqual(E.cups.map((c) => c.badge));
    expect(T.cups[0]!.categories.map((k) => k.title)).toEqual(E.cups[0]!.categories.map((k) => k.title));
  });

  it("keeps the minors' protection promise in every language", () => {
    expect(LARIO_TEXT.de.privacy).toMatch(/keine Namen/);
    expect(LARIO_TEXT.en.privacy).toMatch(/No names/);
    expect(LARIO_TEXT.de.confirmedNote(9)).toContain("9");
    expect(LARIO_TEXT.en.confirmedNote(9)).toContain("9");
  });
});
