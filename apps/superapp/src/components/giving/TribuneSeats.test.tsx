import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, hash, className }: { children: React.ReactNode; to: string; hash?: string; className?: string }) => (
    <a href={`${to}${hash ? `#${hash}` : ""}`} className={className}>{children}</a>
  ),
}));

import { TribuneSeatsSection } from "./TribuneSeats";
import { tribuneDraftItem } from "@/lib/tribune-seats";
import type { PublicItem } from "@/lib/giving";

const noop = () => {};

describe("TribuneSeatsSection", () => {
  it("not active: 60 free seats, honest 0 di 60, no amount, donation vs sponsorship", () => {
    const html = renderToStaticMarkup(<TribuneSeatsSection item={null} active={false} onAdopt={noop} />);
    expect(html.match(/data-state="libero"/g)).toHaveLength(60);
    expect(html).not.toMatch(/data-state="(promesso|adottato)"/);
    expect(html).toContain("0 di 60 posti adottati");
    expect(html).toContain('aria-valuenow="0"');
    expect(html).toContain('aria-label="Posto 12, libero"');
    expect(html).toContain("Importo in aggiornamento");
    expect(html).not.toContain("€");
    expect(html).toContain("Disposizione indicativa");
    expect(html).toContain("erogazione liberale");
    expect(html).toContain("ricevuta");
    expect(html).toContain("fattura");
    expect(html).toContain('href="/sponsor#proposta"');
    expect(html).toContain("Un amico della ColicoDerviese");
    expect(html).toContain('data-testid="tribune-adopt"');
    expect(html).toContain("Adotta un seggiolino");
  });

  it("active but the tribune is not in the catalogue: no CTA to a missing item", () => {
    const html = renderToStaticMarkup(<TribuneSeatsSection item={null} active onAdopt={noop} />);
    expect(html).toContain('data-testid="tribune-waiting"');
    expect(html).not.toContain('data-testid="tribune-adopt"');
    expect(html).toContain("0 di 60 posti adottati");
  });

  it("real units drive the states and the plate; still no amount while unconfirmed", () => {
    const base = tribuneDraftItem();
    const item: PublicItem = {
      ...base,
      id: "uuid-1",
      units: base.units.map((u) =>
        u.n === 5 ? { ...u, adopted: true, plate: "Famiglia Rossi", adopters: 1, plates: ["Famiglia Rossi"] } : u.n === 6 ? { ...u, adopted: true, adopters: 1 } : u.n === 7 ? { ...u, pledges: 1 } : u,
      ),
    };
    const html = renderToStaticMarkup(<TribuneSeatsSection item={item} active onAdopt={noop} />);
    expect(html.match(/data-state="adottato"/g)).toHaveLength(2);
    expect(html.match(/data-state="promesso"/g)).toHaveLength(1);
    expect(html).toContain('aria-label="Posto 5, adottato: Famiglia Rossi"');
    expect(html).toContain('aria-label="Posto 6, adottato: Un amico della ColicoDerviese"');
    expect(html).toContain('aria-label="Posto 7, promesso"');
    expect(html).toContain("2 di 60 posti adottati · 1 promesso");
    expect(html).not.toContain("€");
  });
});
