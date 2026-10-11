import { describe, expect, it } from "vitest";

import { KITS, euro, itemsTotal, supplierOf } from "./kit-catalog";

describe("kit catalog", () => {
  it("every kit's items add up to the printed total", () => {
    for (const k of KITS) expect(itemsTotal(k), k.id).toBe(k.total);
  });
  it("has a supplier, a board and an audience for every kit", () => {
    for (const k of KITS) {
      expect(supplierOf(k)?.name).toBeTruthy();
      expect(k.board).toMatch(/^\/media\/kit\/.+\.webp$/);
      expect(k.audience.length).toBeGreaterThan(3);
    }
    expect(KITS.filter((k) => k.mandatory).map((k) => k.total)).toEqual([60, 60]);
  });
  it("formats euro the Italian way", () => {
    expect(euro(235.55)).toBe("235,55 €");
    expect(euro(60)).toBe("60,00 €");
  });
});
