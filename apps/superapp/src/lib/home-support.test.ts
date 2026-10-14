import { describe, expect, it } from "vitest";

import { LOTTERY_ACTION, SUPPORT_ACTIONS, supportActions } from "./home-support";

const HYPE = /straordinari|incredibil|epic|unic[oa]\b|rivoluzionari|imperdibil/i;
const NUMBER_OR_PRICE = /\d|€/;

describe("home support strip", () => {
  it("has three standing actions with exactly one primary", () => {
    expect(SUPPORT_ACTIONS).toHaveLength(3);
    expect(SUPPORT_ACTIONS.filter((a) => a.primary)).toHaveLength(1);
    expect(new Set(SUPPORT_ACTIONS.map((a) => a.id)).size).toBe(3);
  });

  it("targets only public routes and never shows prices, counts or hype words", () => {
    for (const a of [...SUPPORT_ACTIONS, LOTTERY_ACTION]) {
      expect(a.to.startsWith("/")).toBe(true);
      expect(a.to).not.toMatch(/^\/(gestionale|tesoreria|direzione|segreteria)/);
      expect(`${a.label} ${a.hint}`).not.toMatch(NUMBER_OR_PRICE);
      expect(`${a.label} ${a.hint}`).not.toMatch(HYPE);
    }
  });

  it("adds the lottery only when it is public", () => {
    expect(supportActions({ lotteryPublic: false }).map((a) => a.id)).not.toContain("lotteria");
    expect(supportActions({ lotteryPublic: true }).map((a) => a.id)).toContain("lotteria");
  });

  it("keeps sponsorship and donation apart", () => {
    expect(SUPPORT_ACTIONS.find((a) => a.id === "partner")?.engine).toBe("SPONSOR");
    expect(SUPPORT_ACTIONS.find((a) => a.id === "seggiolino")?.engine).toBe("DONAZIONE");
  });
});
