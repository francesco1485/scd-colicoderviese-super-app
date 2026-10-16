import { describe, expect, it } from "vitest";

import { hasContent, isPlaceholderText, readyActions, withContent } from "./has-content";

describe("isPlaceholderText", () => {
  it.each([
    "",
    "   ",
    "—",
    "...",
    "Nessuna iniziativa in corso.",
    "Nessun voto la scorsa settimana",
    "nessuno",
    "Da attivare",
    "Non ancora aperto online",
    "In arrivo",
    "In preparazione",
    "Prossimamente",
    "n/d",
  ])("%j is a placeholder", (t) => {
    expect(isPlaceholderText(t)).toBe(true);
  });

  it.each([
    "Christmas Lario Cup",
    "Inarrivabile Prima Squadra",
    "Nessunoproblema",
    "Da confermare: 22–23 maggio 2027",
    "— Memorial José Nasazzi",
    "0",
  ])("%j is real text", (t) => {
    expect(isPlaceholderText(t)).toBe(false);
  });

  it("treats null and undefined as empty", () => {
    expect(isPlaceholderText(null)).toBe(true);
    expect(isPlaceholderText(undefined)).toBe(true);
  });
});

describe("hasContent", () => {
  it("rejects null, undefined, NaN, false, empty strings, lists and objects", () => {
    for (const v of [null, undefined, Number.NaN, Number.POSITIVE_INFINITY, false, "", [], {}, [null, ""], { a: null, b: [] }]) {
      expect(hasContent(v), JSON.stringify(v)).toBe(false);
    }
  });

  it("keeps zero as a real value and true as content", () => {
    expect(hasContent(0)).toBe(true);
    expect(hasContent(true)).toBe(true);
  });

  it("looks inside lists and objects", () => {
    expect(hasContent(["", "Memorial José Nasazzi"])).toBe(true);
    expect(hasContent({ title: "", items: [{ name: "U16" }] })).toBe(true);
    expect(hasContent({ title: "Da attivare", items: [] })).toBe(false);
  });

  it("ignores functions and symbols", () => {
    expect(hasContent(() => 1)).toBe(false);
    expect(hasContent(Symbol("x"))).toBe(false);
  });
});

describe("readyActions", () => {
  it("keeps only what works today, in order", () => {
    const actions = [
      { id: "adotta", ready: false },
      { id: "sponsor", ready: true },
      { id: "fondo", ready: true },
    ];
    expect(readyActions(actions).map((a) => a.id)).toEqual(["sponsor", "fondo"]);
    expect(readyActions([])).toEqual([]);
  });
});

describe("withContent", () => {
  it("filters list items by the field that carries their content", () => {
    const items = [{ t: "Tornei" }, { t: "" }, { t: "In arrivo" }, { t: "Club life" }];
    expect(withContent(items, (i) => i.t).map((i) => i.t)).toEqual(["Tornei", "Club life"]);
    expect(withContent(null, (i: { t: string }) => i.t)).toEqual([]);
  });
});
