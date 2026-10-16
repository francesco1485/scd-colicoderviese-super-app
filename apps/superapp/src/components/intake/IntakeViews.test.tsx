import { renderToStaticMarkup as render } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

/** Static markup without React's text separators, so sentences read as on screen. */
const renderToStaticMarkup = (el: React.ReactElement) => render(el).replace(/<!-- -->/g, "");

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, search, ...rest }: { children: React.ReactNode; to: string; search?: Record<string, string> } & Record<string, unknown>) => (
    <a {...rest} href={`${to}${search && Object.keys(search).length ? `?${new URLSearchParams(search).toString()}` : ""}`}>{children}</a>
  ),
  useRouter: () => ({ invalidate: async () => undefined }),
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (f: unknown) => f }));
vi.mock("@/lib/intake.functions", () => ({ decideIntake: vi.fn(), readIntakeContact: vi.fn(), setIntakePayment: vi.fn() }));

import { FilterPills, IntakeEntry, IntakeLinksCard, IntakeNoticesCard, IntakeRowCard } from "./IntakeViews";
import type { IntakeRow } from "@/lib/intake-kinds";
import { allIntakeLinks } from "@/lib/intake-links";

const row = (o: Partial<IntakeRow> = {}): IntakeRow => ({
  id: "00000000-0000-4000-8000-000000000001",
  publicCode: "V-26-0007",
  kind: "ISCRIZIONE_TORNEO",
  area: "tornei",
  site: null,
  status: "IN_VALUTAZIONE",
  phase: "IN_VALUTAZIONE",
  payload: { tournament: "christmas-lario-cup-maschile", category: "Under 12", teams: 2, orgKind: "SOCIETA" },
  ownerPosition: null,
  receivedAt: "2026-10-16T10:00:00Z",
  decidedAt: null,
  decisionNote: null,
  hasContact: true,
  paymentStatus: null,
  paymentAmountCents: null,
  paymentLink: null,
  can: { decide: true, prepare: true, contact: true, pay: false },
  owners: ["responsabile-tornei", "segreteria"],
  paymentLinkAllowed: true,
  events: [{ at: "2026-10-16T10:00:00Z", action: "RICEVUTA", note: "Dal modulo pubblico «Richieste alla SCD»" }],
  ...o,
});

describe("IntakeEntry (first block of /gestionale)", () => {
  it("says 'in preparazione' and shows unknown counters as — until r139 is applied", () => {
    const html = renderToStaticMarkup(<IntakeEntry summary={{ state: "off", formReady: false }} />);
    expect(html).toContain("Vetrina richieste");
    expect(html).toContain("Funzione in preparazione");
    expect(html).toContain("Modulo pubblico: in preparazione");
    expect(html).toContain('href="/gestionale/richieste"');
    expect(html).not.toMatch(/>0</);
    expect(html.match(/—/g)?.length).toBe(4);
  });

  it("tells a failed read apart from 'in preparazione'", () => {
    const html = renderToStaticMarkup(<IntakeEntry summary={{ state: "error", formReady: false }} />);
    expect(html).toContain("Lettura non riuscita");
    expect(html).not.toContain("Funzione in preparazione");
  });

  it("shows the counts and the last notice when live", () => {
    const html = renderToStaticMarkup(
      <IntakeEntry
        summary={{
          state: "ok",
          formReady: true,
          counts: { RICEVUTA: 3, IN_VALUTAZIONE: 1, ACCETTATA: 0, IN_GESTIONE: 2, CHIUSA: 0, NON_ACCOLTA: 0 },
          payments: 1,
          canPay: false,
          notices: [{ at: "2026-10-16T10:00:00Z", action: "RICEVUTA", requestId: "a", publicCode: "V-26-0001", kind: "SPONSOR", status: "RICEVUTA", site: null }],
        }}
      />,
    );
    expect(html).toContain(">3<");
    expect(html).toContain("Ultimo avviso: Ricevuta · Sponsor · V-26-0001");
    expect(html).toContain("Modulo pubblico: attivo");
  });
});

describe("IntakeLinksCard", () => {
  it("shows 'Modulo in preparazione' for every kind while the Tally form is not set", () => {
    const html = renderToStaticMarkup(<IntakeLinksCard links={allIntakeLinks()} />);
    expect(html.match(/Modulo in preparazione/g)?.length).toBe(6);
    expect(html).not.toContain("tally.so");
  });
  it("offers open and copy when the form exists", () => {
    const html = renderToStaticMarkup(<IntakeLinksCard links={allIntakeLinks("https://tally.so/r/abcd12")} />);
    expect(html).toContain('href="https://tally.so/r/abcd12?tipo=torneo"');
    expect(html).toContain('aria-label="Copia il link: Sponsor"');
  });
});

describe("IntakeRowCard", () => {
  it("shows phase, receipt code, fields and the actions the database allows", () => {
    const html = renderToStaticMarkup(<IntakeRowCard row={row()} canPay={false} />);
    expect(html).toContain("Christmas Lario Cup · Under 12");
    expect(html).toContain("In valutazione");
    expect(html).toContain("V-26-0007");
    expect(html).toContain("Società sportiva");
    for (const a of ["Accetta", "Non accogliere", "Annulla", "Assegna", "Mostra il recapito"]) expect(html).toContain(a);
    expect(html).not.toContain("Prendi in valutazione");
    expect(html).not.toContain("Pagamento · solo Tesoreria");
    expect(html).toContain("Registro (1)");
  });

  it("shows no action to an informed position and the payment form only to the Tesoreria after acceptance", () => {
    const informed = renderToStaticMarkup(<IntakeRowCard row={row({ can: { decide: false, prepare: false, contact: false, pay: false } })} canPay={false} />);
    expect(informed).not.toContain("Accetta");
    expect(informed).not.toContain("Mostra il recapito");
    const tes = renderToStaticMarkup(
      <IntakeRowCard row={row({ status: "ACCETTATA", phase: "ACCETTATA", can: { decide: false, prepare: false, contact: false, pay: true }, paymentAmountCents: 5000 })} canPay />,
    );
    expect(tes).toContain("Pagamento · solo Tesoreria");
    expect(tes).toContain("Link di pagamento");
    expect(tes).toContain("50,00");
    const sponsor = renderToStaticMarkup(
      <IntakeRowCard row={row({ kind: "SPONSOR", status: "ACCETTATA", phase: "ACCETTATA", paymentLinkAllowed: false, can: { decide: false, prepare: false, contact: false, pay: true } })} canPay />,
    );
    expect(sponsor).toContain("contratto e fattura, niente link");
    expect(sponsor).not.toContain("Link di pagamento");
  });

  it("shows a visit to the centre as free, never «da definire» (Francesco 17:10 «Tutte e due gratis»)", () => {
    const html = renderToStaticMarkup(
      <IntakeRowCard row={row({ kind: "VISITA_CENTRO", status: "ACCETTATA", phase: "ACCETTATA", paymentLinkAllowed: false, payload: { date: "2026-11-20", people: 25, ageBand: "BAMBINI" } })} canPay />,
    );
    expect(html).toContain("nessuno (gratis)");
    expect(html).not.toContain("da definire");
    expect(html).not.toContain("Pagamento · solo Tesoreria");
  });

  it("says when the contact has been purged", () => {
    expect(renderToStaticMarkup(<IntakeRowCard row={row({ hasContact: false })} canPay={false} />)).toContain("Recapito cancellato alla scadenza");
  });
});

describe("filters and notices", () => {
  it("renders filter pills as links with the search", () => {
    const html = renderToStaticMarkup(
      <FilterPills label="Fase" current={null} options={[{ value: null, text: "Tutte" }, { value: "RICEVUTA", text: "Ricevuta" }]} hrefFor={(v) => (v ? { phase: v } : {})} />,
    );
    expect(html).toContain('href="/gestionale/richieste?phase=RICEVUTA"');
    expect(html).toContain('aria-current="true"');
  });
  it("lists notices without contacts or amounts", () => {
    const html = renderToStaticMarkup(
      <IntakeNoticesCard notices={[{ at: "2026-10-16T10:00:00Z", action: "PAGAMENTO", requestId: "a", publicCode: "V-26-0002", kind: "AFFITTO_CAMPO", status: "ACCETTATA", site: "DERVIO" }]} />,
    );
    expect(html.replace(/<[^>]+>/g, "")).toContain("Pagamento aggiornato · Affitto di un campo · V-26-0002 · Dervio");
    expect(renderToStaticMarkup(<IntakeNoticesCard notices={[]} />)).toContain("Nessun avviso");
  });
});
