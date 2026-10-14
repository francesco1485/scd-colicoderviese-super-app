import { describe, expect, it } from "vitest";

import {
  ADOPT_CATEGORY_LABEL,
  ADOPT_ITEMS,
  adoptMailto,
  catalogueTotals,
  effectiveState,
  priceLabel,
  progressPct,
  remaining,
  sortForCatalogue,
  type AdoptItem,
} from "./adopt-items";

const base: AdoptItem = {
  id: "x",
  name: "Oggetto",
  category: "campo",
  purpose: "Prova.",
  priceEur: null,
  needed: 2,
  adopted: 0,
  state: "DA_ADOTTARE",
  shareable: true,
  publicName: null,
};

describe("adopt-items catalogue", () => {
  it("has unique ids, known categories and no invented prices or adopters", () => {
    const ids = ADOPT_ITEMS.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const i of ADOPT_ITEMS) {
      expect(Object.keys(ADOPT_CATEGORY_LABEL)).toContain(i.category);
      expect(i.priceEur).toBeNull();
      expect(i.publicName).toBeNull();
      expect(i.adopted).toBe(0);
      expect(i.needed).toBeGreaterThan(0);
    }
  });

  it("covers every object named by the Direzione", () => {
    const ids = ADOPT_ITEMS.map((i) => i.id);
    for (const id of [
      "porta-11",
      "palloni",
      "materiale-tecnico",
      "panchina",
      "defibrillatore",
      "kit-squadra",
      "pulmino",
      "club-house",
    ]) {
      expect(ids).toContain(id);
    }
  });
});

describe("priceLabel", () => {
  it("never guesses a missing price", () => {
    expect(priceLabel(null)).toBe("Valore indicato dalla società");
    expect(priceLabel(0)).toBe("Valore indicato dalla società");
    expect(priceLabel(Number.NaN)).toBe("Valore indicato dalla società");
  });
  it("formats euro in Italian", () => {
    expect(priceLabel(1250)).toBe("1.250 €");
    expect(priceLabel(89.6)).toBe("90 €");
  });
});

describe("progress and state", () => {
  it("computes remaining and progress without going out of range", () => {
    expect(remaining({ needed: 4, adopted: 1 })).toBe(3);
    expect(remaining({ needed: 2, adopted: 5 })).toBe(0);
    expect(remaining({ needed: 2, adopted: -3 })).toBe(2);
    expect(progressPct({ needed: 4, adopted: 1 })).toBe(25);
    expect(progressPct({ needed: 2, adopted: 5 })).toBe(100);
    expect(progressPct({ needed: 0, adopted: 0 })).toBe(100);
  });

  it("derives the badge from the counters, delivered always wins", () => {
    expect(effectiveState(base)).toBe("DA_ADOTTARE");
    expect(effectiveState({ ...base, adopted: 1 })).toBe("IN_ADOZIONE");
    expect(effectiveState({ ...base, adopted: 2 })).toBe("ADOTTATO");
    expect(effectiveState({ ...base, state: "ADOTTATO" })).toBe("ADOTTATO");
    expect(effectiveState({ ...base, state: "CONSEGNATO" })).toBe("CONSEGNATO");
    expect(effectiveState({ ...base, state: "IN_ADOZIONE" })).toBe(
      "IN_ADOZIONE",
    );
  });

  it("sorts open items first and counts totals", () => {
    const items: AdoptItem[] = [
      { ...base, id: "d", name: "Delta", state: "CONSEGNATO" },
      { ...base, id: "a", name: "Alfa", adopted: 2 },
      { ...base, id: "b", name: "Beta", category: "sicurezza" },
      { ...base, id: "c", name: "Charlie" },
    ];
    expect(sortForCatalogue(items).map((i) => i.id)).toEqual([
      "c",
      "b",
      "a",
      "d",
    ]);
    expect(catalogueTotals(items)).toEqual({
      items: 4,
      open: 2,
      adopted: 1,
      delivered: 1,
    });
  });
});

describe("adoptMailto", () => {
  it("prefills subject and blanks only, addressed to the club mailbox", () => {
    const url = adoptMailto(
      { id: "palloni", name: "Set di palloni" },
      "azienda",
      "club@example.org",
    );
    expect(url.startsWith("mailto:club@example.org?subject=")).toBe(true);
    const params = new URLSearchParams(url.split("?")[1]);
    expect(params.get("subject")).toBe("Adotta un oggetto · Set di palloni");
    const body = params.get("body") ?? "";
    expect(body).toContain("vorrei adottare: Set di palloni (rif. palloni)");
    expect(body).toContain("Adotto come: Azienda");
    expect(body).toContain("Ragione sociale:");
    expect(body).toContain("Posso essere ringraziato sui social (sì/no):");
  });

  it("asks a family for name, not company", () => {
    const body =
      new URLSearchParams(
        adoptMailto(
          { id: "porta-7", name: "Porta" },
          "famiglia",
          "a@b.it",
        ).split("?")[1],
      ).get("body") ?? "";
    expect(body).toContain("Nome e cognome:");
    expect(body).not.toContain("Ragione sociale");
  });
});
