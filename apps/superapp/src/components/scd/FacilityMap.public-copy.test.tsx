// @vitest-environment jsdom
/**
 * B11 public copy sweep: the public facility map (/impianti) never shows internal to-dos, board names or repository
 * paths. Every space of both sites is opened as a visitor would, and the visible text is checked. Staff keep the
 * internal wording ("da inserire", "da board", the source file) because they fix the master from it.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, className }: { children: React.ReactNode; to: string; className?: string }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}));

import { FacilityMap } from "./FacilityMap";
import { FACILITIES, PUBLIC_INDICATIVE, PUBLIC_PENDING, publicRuleSource } from "@/lib/facilities";

const INTERNAL = /da inserire|da board|\bboard\b|\bmaster\b|navigatore|rapporto tecnico|config\/|\.json|PRODUCT\.md|\bblocker\b/i;

beforeAll(() => {
  // jsdom has no matchMedia; the map asks for it to pick the phone layout.
  if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
  }
});
afterEach(() => cleanup());

/** Opens each space from the index list and returns the visible text collected along the way. */
function visibleTextAfterOpeningEverySpace(siteId: string, mode: "public" | "staff"): string {
  const { container } = render(<FacilityMap mode={mode} initialSiteId={siteId} now={new Date("2026-10-19T15:30:00Z")} />);
  const chunks = [container.textContent ?? ""];
  const names = FACILITIES.spaces.filter((s) => s.site === siteId).map((s) => s.name);
  for (const name of names) {
    const buttons = screen.queryAllByRole("button", { name: new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") });
    const pressable = buttons.find((b) => b.hasAttribute("aria-pressed")) ?? buttons[0];
    if (!pressable) continue;
    fireEvent.click(pressable);
    chunks.push(container.textContent ?? "");
  }
  return chunks.join("\n");
}

describe("public facility map copy (B11)", () => {
  for (const site of FACILITIES.sites) {
    it(`${site.id}: no internal to-do, board name or file path in public mode`, () => {
      const text = visibleTextAfterOpeningEverySpace(site.id, "public");
      const hit = text.match(INTERNAL);
      expect(hit?.[0] ?? null).toBeNull();
    });
  }

  it("opens space details in public mode (the sweep really reaches the detail panel)", () => {
    const text = visibleTextAfterOpeningEverySpace("SED-COL", "public");
    expect(text).toMatch(/Chi può entrare/);
    expect(text).toMatch(/Regole d'uso/);
  });

  it("staff mode keeps the internal wording used to fix the master", () => {
    const text = visibleTextAfterOpeningEverySpace("SED-COL", "staff");
    expect(text).toMatch(/da inserire|da board|Dal master impianti/);
  });

  it("public rule sources never expose a repository path or a board name", () => {
    expect(publicRuleSource("config/superapp-areas.v1.json (biglietteria, blocker)")).toBe("la società, da confermare");
    expect(publicRuleSource("board Rotazione-Dervio (da verificare)")).toBe("la società, da confermare");
    expect(publicRuleSource("PRODUCT.md (Infermeria)")).toBe("la società");
    expect(publicRuleSource("master 16 - SEDI E IMPIANTI (nota)")).toBe("la società");
    expect(PUBLIC_PENDING).toBe("in aggiornamento");
    expect(PUBLIC_INDICATIVE).toBe("indicativo");
  });

  it("the /impianti and /societa pages do not name the internal master", () => {
    for (const route of ["impianti.tsx", "societa.tsx"]) {
      const src = readFileSync(resolve(process.cwd(), "src/routes", route), "utf8");
      expect(src).not.toMatch(/master impianti|indirizzo da verificare|"da inserire" o "da verificare"/);
    }
  });
});
