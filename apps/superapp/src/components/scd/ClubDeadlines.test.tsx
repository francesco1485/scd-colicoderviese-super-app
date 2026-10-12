import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({ Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a> }));

import { ClubDeadlinesCard } from "./ClubDeadlines";
import { ShareLink } from "./ShareLink";
import type { KbData } from "@/lib/knowledge.functions";
import type { KbItem } from "@/lib/knowledge";

const item = (o: Partial<KbItem>): KbItem => ({
  id: "1", kind: "REGOLA", area: "FEDERAZIONE", season: "2026/27", title: "Delegato tutela minori", summary: null, entity: null,
  date: null, due: "2026-11-15", status: "APERTA", amount: null, source: "app", link: null, tags: [], ...o,
});

describe("ClubDeadlinesCard", () => {
  it("lists dated items with days left and the area, skipping undated ones", () => {
    const due: KbData = { connected: true, error: null, result: { level: "INTERNO", counts: {}, items: [
      item({ id: "a", title: "Bando Area Sportiva Giovani", area: "IMPIANTI_COMUNI", due: "2026-10-29", link: "https://drive.google.com/x" }),
      item({ id: "b" }),
      item({ id: "c", title: "Senza data", due: null }),
    ] } };
    const html = renderToStaticMarkup(<ClubDeadlinesCard id="t" due={due} today="2026-10-12" />);
    expect(html).toContain("Bando Area Sportiva Giovani");
    expect(html).toContain("tra 17 giorni");
    expect(html).toContain("29/10/2026");
    expect(html).toContain('href="https://drive.google.com/x"');
    expect(html).toContain("tra 34 giorni");
    expect(html).not.toContain("Senza data");
    expect(html).toContain('href="/direzione/cervellone"');
  });

  it("asks to sign in when not connected and explains an empty list", () => {
    expect(renderToStaticMarkup(<ClubDeadlinesCard id="t" due={{ connected: false, result: null, error: null }} today="2026-10-12" />)).toContain("Entra con il tuo account");
    expect(renderToStaticMarkup(<ClubDeadlinesCard id="t" due={{ connected: true, result: { level: "INTERNO", counts: {}, items: [] }, error: null }} today="2026-10-12" />)).toContain("Nessuna scadenza in vista");
  });
});

describe("ShareLink", () => {
  it("renders an accessible copy button for the page path", () => {
    const html = renderToStaticMarkup(<ShareLink path="/pulmini" />);
    expect(html).toContain('aria-label="Copia link: /pulmini"');
    expect(html).toContain("Copia link");
  });
});
