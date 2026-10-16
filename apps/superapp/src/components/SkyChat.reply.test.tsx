// @vitest-environment jsdom
/**
 * Regression (live 16/10/2026, commit a8ef84d): after a reply the whole page fell to the error boundary with
 * "TypeError: destroy is not a function". The scroll effect returned the value of scrollIntoView, and recent Chromium
 * returns a Promise from it, so React called that Promise as the effect cleanup on the next message.
 * Here scrollIntoView returns a Promise like that browser does; the chat must send, receive both reply shapes
 * (AI answer and rules-engine fallback) and keep rendering.
 */
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SkyReply } from "@/lib/sky.functions";

const state = vi.hoisted(() => ({
  reply: null as null | { text: string; mood: "info" | "success" | "alert"; links?: { label: string; to: string }[]; ai?: boolean },
  calls: 0,
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, className }: { children: React.ReactNode; to: string; className?: string }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
  useRouterState: ({ select }: { select: (s: { location: { pathname: string } }) => unknown }) =>
    select({ location: { pathname: "/" } }),
}));
vi.mock("@tanstack/react-start", () => ({
  useServerFn: (fn: unknown) => fn,
}));
vi.mock("@/lib/assistant.functions", () => {
  const answer = async () => {
    state.calls += 1;
    if (!state.reply) throw new Error("no reply configured");
    return state.reply;
  };
  return { askAssistant: answer, askStaffAssistant: answer };
});
vi.mock("@/lib/use-session", () => ({
  useSession: () => ({ session: null, loading: false, refresh: () => undefined }),
}));

import { SkyChat } from "@/components/SkyChat";
import { AI_NOTICE } from "@/lib/assistant";

const QUESTION = "Ciao, che differenza c'è tra Pulcini ed Esordienti nel calcio giovanile?";

async function openAndAsk(reply: SkyReply) {
  state.reply = reply;
  render(<SkyChat />);
  fireEvent.click(screen.getByRole("button", { name: /aiuto rapido/ }));
  const dialog = await screen.findByRole("dialog");
  const input = dialog.querySelector("input");
  if (!input) throw new Error("chat input missing");
  fireEvent.change(input, { target: { value: QUESTION } });
  await act(async () => {
    fireEvent.keyDown(input, { key: "Enter" });
  });
  return dialog;
}

describe("SkyChat reply rendering", () => {
  const scrollIntoView = vi.fn(() => Promise.resolve());
  const errors: unknown[] = [];
  const onError = (e: ErrorEvent) => errors.push(e.error);

  beforeEach(() => {
    state.reply = null;
    state.calls = 0;
    errors.length = 0;
    scrollIntoView.mockClear();
    // Recent Chromium: scroll methods return a Promise. jsdom has no scrollIntoView at all.
    Object.defineProperty(Element.prototype, "scrollIntoView", { value: scrollIntoView, configurable: true, writable: true });
    window.addEventListener("error", onError);
  });
  afterEach(() => {
    cleanup();
    window.removeEventListener("error", onError);
  });

  it("shows an AI answer with its notice and keeps the chat on screen", async () => {
    const dialog = await openAndAsk({
      text: "I Pulcini sono la categoria più giovane; gli Esordienti vengono subito dopo.",
      mood: "info",
      links: [{ label: "Calendario", to: "/calendario" }],
      ai: true,
    });
    expect(state.calls).toBe(1);
    expect(await screen.findByText(/gli Esordienti vengono subito dopo/)).toBeTruthy();
    expect(screen.getByText(AI_NOTICE)).toBeTruthy();
    expect(screen.getByText(QUESTION)).toBeTruthy();
    expect(dialog.isConnected).toBe(true);
    expect(scrollIntoView).toHaveBeenCalled();
    expect(errors).toEqual([]);
  });

  it("shows a rules-engine fallback answer (no ai flag) and accepts a second question", async () => {
    const dialog = await openAndAsk({ text: "Trovi le categorie nella pagina Squadre.", mood: "info" });
    expect(await screen.findByText("Trovi le categorie nella pagina Squadre.")).toBeTruthy();
    expect(screen.queryByText(AI_NOTICE)).toBeNull();

    const input = dialog.querySelector("input");
    if (!input) throw new Error("chat input missing");
    fireEvent.change(input, { target: { value: "E gli orari?" } });
    await act(async () => {
      fireEvent.keyDown(input, { key: "Enter" });
    });
    expect(state.calls).toBe(2);
    expect(screen.getAllByText("Trovi le categorie nella pagina Squadre.")).toHaveLength(2);
    expect(screen.getByRole("dialog").isConnected).toBe(true);
    expect(errors).toEqual([]);
  });
});
