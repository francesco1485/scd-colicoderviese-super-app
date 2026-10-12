import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarClock, Receipt, Wallet } from "lucide-react";

import { Card } from "@/components/scd/interior-ui";

import { PurchaseSteps, SubAreaList, TariffWarning, TillPreview } from "@/components/scd/tesoreria";
import { SourcesBox, WorkAreaGateView, WorkAreaShell, workAreaHead } from "@/components/scd/work-area-ui";
import { getWorkAreaGate } from "@/lib/work-areas.functions";

/** Tesoreria (board Tesoreria-sottoaree.dc.html): sub-areas, purchases, Club House till. No amounts. */
export const Route = createFileRoute("/tesoreria")({
  loader: async () => {
    const gate = await getWorkAreaGate({ data: { area: "tesoreria" } });
    return { gate, interior: gate.view === "page" };
  },
  head: ({ loaderData }) => workAreaHead("tesoreria", loaderData?.gate),
  component: TesoreriaRoute,
});

function TesoreriaRoute() {
  const { gate } = Route.useLoaderData();
  return (
    <WorkAreaGateView id="tesoreria" gate={gate}>
      <WorkAreaShell
        id="tesoreria"
        title="Tesoreria · sottoaree"
        preview={gate.preview}
        highlights={[
          { value: 8, label: "sottoaree con accesso dedicato" },
          { value: 4, label: "con dati reali: compensi, quote, fornitori, movimenti" },
          { value: null, label: "incassi di oggi: casse da collegare" },
        ]}
        note="Compensi, quote e fornitori leggono i dati reali; casse e listini non sono ancora collegati. L'app non paga e non incassa."
      >
        <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="flex min-w-0 flex-col gap-[18px]">
            <Card id="tes-compensi" title="Compensi e stipendi" sub="Riservato a Direzione e Tesoreria: accordi, voci del mese, autorizzazione e pagamenti entro il 15.">
              <div className="px-4 pb-4 sm:px-[18px]">
                <Link to="/tesoreria/compensi" className="scd-focus inline-flex h-11 items-center gap-2 rounded-[10px] bg-[var(--in-info)] px-4 text-[15px] font-bold text-white" data-testid="tes-compensi-link">
                  <Wallet className="size-4" aria-hidden="true" /> Apri compensi del mese
                </Link>
              </div>
            </Card>
            <Card id="tes-quote" title="Quote e Fondo" sub="Direzione, Segreteria e Tesoreria: dovuto, pagato e scaduto della stagione, rate e lista di lavoro, copiati dal Gestionale.">
              <div className="px-4 pb-4 sm:px-[18px]">
                <Link to="/tesoreria/quote" className="scd-focus inline-flex h-11 items-center gap-2 rounded-[10px] bg-[var(--in-info)] px-4 text-[15px] font-bold text-white" data-testid="tes-quote-link">
                  <Receipt className="size-4" aria-hidden="true" /> Apri quote della stagione
                </Link>
              </div>
            </Card>
            <Card id="tes-fornitori" title="Fornitori e scadenze" sub="Direzione e Tesoreria: debiti, piani di rientro e agenda dei pagamenti, copiati da TESORERIA FORNITORI.">
              <div className="px-4 pb-4 sm:px-[18px]">
                <Link to="/tesoreria/fornitori" className="scd-focus inline-flex h-11 items-center gap-2 rounded-[10px] bg-[var(--in-info)] px-4 text-[15px] font-bold text-white" data-testid="tes-fornitori-link">
                  <CalendarClock className="size-4" aria-hidden="true" /> Apri agenda pagamenti
                </Link>
              </div>
            </Card>
            <Card id="tes-movimenti" title="Movimenti del conto" sub="Direzione e Tesoreria: registro del conto SumUp, riscontro dei bonifici delle famiglie con le quote del Gestionale.">
              <div className="px-4 pb-4 sm:px-[18px]">
                <Link to="/tesoreria/movimenti" className="scd-focus inline-flex h-11 items-center gap-2 rounded-[10px] bg-[var(--in-info)] px-4 text-[15px] font-bold text-white" data-testid="tes-movimenti-link">
                  <Wallet className="size-4" aria-hidden="true" /> Apri movimenti
                </Link>
              </div>
            </Card>
            <SubAreaList />
            <PurchaseSteps />
          </div>
          <div className="flex min-w-0 flex-col gap-[18px]">
            <TariffWarning />
            <TillPreview
              title="Cassa Club House"
              path="/tesoreria/club-house"
              tabs={["Bar", "Cucina", "Merchandising"]}
              emptyTitle="Listino non ancora caricato"
              emptyText="Prodotti e prezzi del Club House: i tasti della cassa si creeranno dal listino."
              loadLabel="Carica listino"
            />
            <SourcesBox id="tesoreria" />
          </div>
        </div>
      </WorkAreaShell>
    </WorkAreaGateView>
  );
}
