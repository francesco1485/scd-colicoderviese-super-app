import { renderToStaticMarkup } from "react-dom/server";
import { createMemoryHistory, createRootRoute, createRouter, RouterProvider } from "@tanstack/react-router";
import { describe, expect, it, vi } from "vitest";

import { CATALOG_NOT_APPLIED, type CatalogEntry, type CatalogWriteState } from "@/lib/club-catalog";

import { ClubCatalogEditor, entrySummary, type ClubCatalogEditorProps } from "./ClubCatalogEditor";
import { CardAdditionsCard, ClubHousePublicCard, ConvenzioniPublicCard } from "@/components/scd/ClubCatalogPublic";

const html = (s: string) => s.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");

/** Renders inside a minimal router (the editor has a Link to Attività in struttura). */
async function render(node: React.ReactNode): Promise<string> {
  const rootRoute = createRootRoute({ component: () => <>{node}</> });
  const router = createRouter({ routeTree: rootRoute, history: createMemoryHistory({ initialEntries: ["/"] }) });
  await router.load();
  return html(renderToStaticMarkup(<RouterProvider router={router} />));
}

const entry = (over: Partial<CatalogEntry>): CatalogEntry => ({
  id: "e1",
  platform: "CLUB_HOUSE",
  kind: "LISTINO",
  site: null,
  category: "BAR",
  title: "Caffè",
  body: null,
  howTo: null,
  cards: [],
  linkUrl: null,
  priceCents: null,
  days: null,
  opens: null,
  closes: null,
  validFrom: null,
  validUntil: null,
  status: "BOZZA",
  sort: 100,
  updatedAt: null,
  ...over,
});

const props = (over: Partial<ClubCatalogEditorProps> = {}): ClubCatalogEditorProps => ({
  platform: "CLUB_HOUSE",
  state: "on",
  entries: [],
  onSave: vi.fn(),
  onDone: vi.fn(),
  ...over,
});

describe("ClubCatalogEditor (fail closed)", () => {
  it("offers Aggiungi only when the database opened writing", async () => {
    for (const state of ["off", "not-applied", "unavailable"] as CatalogWriteState[]) {
      const out = await render(<ClubCatalogEditor {...props({ state, entries: null })} />);
      expect(out, state).not.toContain(">Aggiungi<");
      expect(out, state).toContain("Sola lettura");
    }
    expect(await render(<ClubCatalogEditor {...props()} />)).toContain("Aggiungi");
  });

  it("explains why writing is off, and who writes", async () => {
    expect(await render(<ClubCatalogEditor {...props({ state: "not-applied", entries: null })} />)).toContain(CATALOG_NOT_APPLIED);
    expect(await render(<ClubCatalogEditor {...props({ platform: "CONVENZIONI", state: "off", entries: null })} />)).toContain("Inseriscono: Direzione.");
    expect(await render(<ClubCatalogEditor {...props({ platform: "TESSERE", state: "off", entries: null })} />)).toContain("Direzione e Segreteria");
  });

  it("lists what to enter first, empty kinds say da confermare, Club House links the evening events", async () => {
    const out = await render(<ClubCatalogEditor {...props()} />);
    expect(out).toContain("Da inserire per primo");
    expect(out).toContain("Orari di apertura di Colico e di Dervio");
    expect(out).toContain("da confermare");
    expect(out).toContain('href="/gestionale/struttura"');
  });

  it("rows show status and the price to be confirmed", async () => {
    const out = await render(<ClubCatalogEditor {...props({ entries: [entry({})] })} />);
    expect(out).toContain("Caffè");
    expect(out).toContain("Bozza");
    expect(out).toContain("prezzo da confermare");
    expect(out).toContain("Modifica Caffè");
  });

  it("summaries", () => {
    expect(entrySummary(entry({ kind: "ORARIO", site: "DERVIO", days: "Sabato", opens: "15:00", closes: "19:00", category: null }))).toBe("Dervio · Sabato 15:00–19:00");
    expect(entrySummary(entry({ platform: "CONVENZIONI", kind: "CONVENZIONE", category: "NEGOZI", cards: [] }))).toBe("Negozi · nessuna card richiesta · validità da confermare");
  });
});

describe("public cards", () => {
  it("nothing entered: everything is da confermare, no price, no invented partner", () => {
    const ch = html(renderToStaticMarkup(<ClubHousePublicCard entries={[]} />));
    expect(ch).toContain("Orari da confermare");
    expect(ch).toContain("Listino da confermare");
    expect(ch).toContain("Menu per gruppi da confermare");
    expect(ch).not.toMatch(/\d+,\d{2}\s€/);
    const cv = html(renderToStaticMarkup(<ConvenzioniPublicCard entries={[]} />));
    expect(cv).toContain("Convenzioni da confermare");
    expect(renderToStaticMarkup(<CardAdditionsCard entries={[]} />)).toBe("");
  });

  it("entered rows show what was entered", () => {
    const rows = [
      entry({ status: "PUBBLICATA", priceCents: 120 }),
      entry({ id: "h", kind: "ORARIO", site: "COLICO", category: null, title: "Sera", days: "Lunedì–venerdì", opens: "17:00", closes: "21:00", status: "PUBBLICATA" }),
      entry({ id: "c", platform: "CONVENZIONI", kind: "CONVENZIONE", category: "NEGOZI", title: "Negozio", body: "Sconto", cards: ["sostenitore"], linkUrl: "https://example.com", status: "PUBBLICATA" }),
    ];
    const ch = html(renderToStaticMarkup(<ClubHousePublicCard entries={rows} />));
    expect(ch).toContain("1,20 €");
    expect(ch).toContain("17:00–21:00");
    expect(ch).toContain("Orari da confermare"); // Dervio
    const cv = html(renderToStaticMarkup(<ConvenzioniPublicCard entries={rows} card="sostenitore" />));
    expect(cv).toContain("Negozio");
    expect(cv).toContain('rel="noopener noreferrer"');
    expect(html(renderToStaticMarkup(<ConvenzioniPublicCard entries={rows} card="partner" />))).toContain("Convenzioni da confermare");
  });
});
