import { renderToStaticMarkup as render } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const html = (el: React.ReactElement) => render(el).replace(/<!-- -->/g, "");

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (opts: unknown) => opts,
  Link: ({
    children,
    to,
    ...rest
  }: { children: React.ReactNode; to: string } & Record<string, unknown>) => (
    <a {...rest} href={to}>
      {children}
    </a>
  ),
  useRouter: () => ({ invalidate: async () => undefined }),
}));
vi.mock("@tanstack/react-start", () => ({
  useServerFn: (f: unknown) => f,
  createServerFn: () => {
    const chain = {
      inputValidator: () => chain,
      validator: () => chain,
      handler: () => vi.fn(),
    };
    return chain;
  },
}));
vi.mock("@/lib/page-views.server", () => ({
  readAppStats: vi.fn(),
  recordPageView: vi.fn(),
}));
vi.mock("@/lib/work-areas.functions", () => ({ getWorkAreaGate: vi.fn() }));

import {
  NUMERI_NOTE,
  NUMERI_PRIVACY_NOTE,
  NumeriBoards,
} from "@/routes/gestionale.numeri";
import { summarizeStats } from "./page-views";

describe("Numeri dell'app boards", () => {
  const s = summarizeStats(
    [
      {
        day: "2026-10-16",
        path: "/",
        source: "instagram",
        device: "phone",
        views: 12,
      },
      {
        day: "2026-10-17",
        path: "/calendario",
        source: "google",
        device: "desktop",
        views: 3,
      },
    ],
    "2026-10-17",
    7,
  );

  it("shows top pages, sources, devices and the daily bars in plain Italian", () => {
    const out = html(<NumeriBoards s={s} />);
    expect(out).toContain("Pagine più aperte");
    expect(out).toContain("Home");
    expect(out).toContain("/calendario");
    expect(out).toContain("Instagram");
    expect(out).toContain("12 · 80%");
    expect(out).toContain("3 · 20%");
    expect(out).toContain("Telefono");
    expect(out).toContain("Computer");
    expect(out).toContain("ven 16/10");
    expect(out).toContain("sab 17/10");
    expect(out).toContain('aria-label="Visite giorno per giorno"');
    expect(out).toContain("Pagine aperte, non persone · dato calcolato");
  });

  it("states the privacy promise verbatim", () => {
    expect(NUMERI_PRIVACY_NOTE).toBe(
      "Contiamo solo numeri totali: niente cookie, niente dati delle persone, niente dati dei minori. Non contiamo i visitatori unici.",
    );
  });

  it("names Do Not Track and Global Privacy Control in the page note", () => {
    expect(NUMERI_NOTE).toContain(NUMERI_PRIVACY_NOTE);
    expect(NUMERI_NOTE).toContain("Global Privacy Control");
    expect(NUMERI_NOTE).toContain("Do Not Track");
    expect(NUMERI_NOTE).toContain(
      "Pagine aperte, non persone · dato calcolato",
    );
  });
});
