import { describe, expect, it } from "vitest";

import { LOTTERY_ACTION, SEAT_ACTION, SUPPORT_ACTIONS, supportActions } from "./home-support";
import { INTERNAL_ONLY } from "./internal-initiatives";

const HYPE = /straordinari|incredibil|epic|unic[oa]\b|rivoluzionari|imperdibil/i;
const NUMBER_OR_PRICE = /\d|€/;

describe("home support strip", () => {
  it("has two standing public actions with exactly one primary", () => {
    expect(SUPPORT_ACTIONS.map((a) => a.id)).toEqual(["partner", "materiale"]);
    expect(SUPPORT_ACTIONS.filter((a) => a.primary)).toHaveLength(1);
  });

  it("targets only public routes and never shows prices, counts or hype words", () => {
    for (const a of [...SUPPORT_ACTIONS, SEAT_ACTION, LOTTERY_ACTION]) {
      expect(a.to.startsWith("/")).toBe(true);
      expect(a.to).not.toMatch(/^\/(gestionale|tesoreria|direzione|segreteria)/);
      expect(`${a.label} ${a.hint}`).not.toMatch(NUMBER_OR_PRICE);
      expect(`${a.label} ${a.hint}`).not.toMatch(HYPE);
    }
  });

  it("keeps seat adoption and lottery internal (UD-132), even when the lottery is published", () => {
    expect(INTERNAL_ONLY.seatAdoption).toBe(true);
    expect(INTERNAL_ONLY.lottery).toBe(true);
    for (const pub of [false, true]) {
      const ids = supportActions({ lotteryPublic: pub }).map((a) => a.id);
      expect(ids).not.toContain("lotteria");
      expect(ids).not.toContain("seggiolino");
    }
  });

  it("keeps sponsorship and donation apart", () => {
    expect(SUPPORT_ACTIONS.find((a) => a.id === "partner")?.engine).toBe("SPONSOR");
    expect(SUPPORT_ACTIONS.find((a) => a.id === "materiale")?.engine).toBe("DONAZIONE");
    expect(SEAT_ACTION.engine).toBe("DONAZIONE");
  });
});
