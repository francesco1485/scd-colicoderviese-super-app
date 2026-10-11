import { describe, expect, it } from "vitest";

import { cameoDelayMs, cameoLine, isInterior } from "./crovi-cameo";

describe("Crovi cameo", () => {
  it("speaks on public pages with a page-specific line", () => {
    expect(cameoLine("/calendario")?.ask).toBe("Prossima partita");
    expect(cameoLine("/impianti")?.text).toMatch(/mappa/);
    expect(cameoLine("/")?.text).toMatch(/Crovi/);
    expect(cameoLine("/eventi/christmas-lario-cup")?.ask).toBe("Eventi");
  });

  it("stays silent in the reserved areas", () => {
    expect(isInterior("/gestionale/organigramma")).toBe(true);
    expect(cameoLine("/quadro")).toBeNull();
    expect(cameoLine("/tesoreria/biglietteria")).toBeNull();
    expect(isInterior("/gestionalex")).toBe(false);
  });

  it("waits between 18 and 32 seconds", () => {
    expect(cameoDelayMs(0)).toBe(18_000);
    expect(cameoDelayMs(1)).toBe(32_000);
    expect(cameoDelayMs(5)).toBe(32_000);
  });

  it("never states scores, times or names", () => {
    for (const p of ["/", "/calendario", "/squadre", "/impianti", "/eventi", "/sponsor", "/contatti"]) {
      expect(cameoLine(p)!.text).not.toMatch(/\d{1,2}[:.]\d{2}|\d+\s*-\s*\d+/);
    }
  });
});
