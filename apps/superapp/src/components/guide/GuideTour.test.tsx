// @vitest-environment jsdom
/** UD-172: the first-access tour opens once per device and role, is skippable and never needs localStorage. */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ pathname: "/famiglia" }));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, className, onClick }: { children: React.ReactNode; to: string; className?: string; onClick?: () => void }) => (
    <a href={to} className={className} onClick={onClick}>
      {children}
    </a>
  ),
  useRouterState: ({ select }: { select: (s: { location: { pathname: string } }) => unknown }) =>
    select({ location: { pathname: state.pathname } }),
}));

import { GuideTourHost } from "./GuideTour";
import { cardsFor } from "@/lib/guide-content";
import { TOUR_STORAGE_PREFIX, hasSeenTour, markTourSeen, requestTour, resetTourMemory, type TourStorage } from "@/lib/guide-tour";

beforeEach(() => {
  resetTourMemory();
  window.localStorage.clear();
  state.pathname = "/famiglia";
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("GuideTourHost", () => {
  it("opens on the portal home the first time and «Salta» closes it for good", () => {
    render(<GuideTourHost />);
    const tour = screen.getByTestId("guide-tour");
    expect(tour.getAttribute("data-role")).toBe("famiglie");
    expect(screen.getByRole("dialog").getAttribute("aria-modal")).toBe("false");
    fireEvent.click(screen.getByTestId("guide-tour-skip"));
    expect(screen.queryByTestId("guide-tour")).toBeNull();
    expect(window.localStorage.getItem(`${TOUR_STORAGE_PREFIX}famiglie`)).toBe("1");
    cleanup();
    render(<GuideTourHost />);
    expect(screen.queryByTestId("guide-tour")).toBeNull();
  });

  it("walks through the cards, ends with «Rivedi quando vuoi da Guida» and closes with Fatto", () => {
    render(<GuideTourHost />);
    const n = cardsFor("famiglie").length;
    for (let i = 0; i < n; i++) fireEvent.click(screen.getByTestId("guide-tour-next"));
    expect(screen.getByTestId("guide-tour").textContent).toMatch(/Rivedi quando vuoi da Guida/);
    fireEvent.click(screen.getByTestId("guide-tour-done"));
    expect(screen.queryByTestId("guide-tour")).toBeNull();
    expect(hasSeenTour("famiglie")).toBe(true);
  });

  it("Esc closes the tour", () => {
    render(<GuideTourHost />);
    act(() => {
      fireEvent.keyDown(window, { key: "Escape" });
    });
    expect(screen.queryByTestId("guide-tour")).toBeNull();
  });

  it("does not open on pages that are not a portal home", () => {
    state.pathname = "/calendario";
    render(<GuideTourHost />);
    expect(screen.queryByTestId("guide-tour")).toBeNull();
  });

  it("opens any role on request, even after it was seen (Rivedi il tour)", () => {
    state.pathname = "/guida";
    markTourSeen("mister");
    render(<GuideTourHost />);
    expect(screen.queryByTestId("guide-tour")).toBeNull();
    act(() => requestTour("mister"));
    expect(screen.getByTestId("guide-tour").getAttribute("data-role")).toBe("mister");
  });

  it("works without localStorage: shown once per visit, no crash", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    render(<GuideTourHost />);
    fireEvent.click(screen.getByTestId("guide-tour-skip"));
    cleanup();
    render(<GuideTourHost />);
    expect(screen.queryByTestId("guide-tour")).toBeNull();
  });
});

describe("guide-tour storage", () => {
  it("treats a null storage as unseen and remembers in memory", () => {
    expect(hasSeenTour("tifosi", null)).toBe(false);
    markTourSeen("tifosi", null);
    expect(hasSeenTour("tifosi", null)).toBe(true);
  });

  it("reads the per-role flag", () => {
    const map = new Map<string, string>();
    const s: TourStorage = { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v) };
    markTourSeen("dirigenti", s);
    resetTourMemory();
    expect(hasSeenTour("dirigenti", s)).toBe(true);
    expect(hasSeenTour("mister", s)).toBe(false);
  });
});

describe("reduced motion", () => {
  it("animates only under motion-safe", () => {
    const src = readFileSync(resolve(__dirname, "GuideTour.tsx"), "utf8");
    const anims = [...src.matchAll(/(\S*)(animate-in|slide-in-from|fade-in|transition)\S*/g)].map((m) => m[0]);
    expect(anims.length).toBeGreaterThan(0);
    for (const a of anims) expect(a.startsWith("motion-safe:"), a).toBe(true);
  });
});
