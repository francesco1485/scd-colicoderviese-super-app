import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarClock, HandCoins, Mail, Package, Receipt, Wallet } from "lucide-react";

import { CONTABILITA_PAGES } from "@/components/scd/contabilita";

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
            <Card id="tes-fondo" title="Fondo Solidale e donazioni" sub="Abilitazione per persona: domande riservate al Fondo, donazioni registrate con ricevuta, materiale offerto. Da attivare con r101.">
              <div className="flex flex-wrap gap-2 px-4 pb-4 sm:px-[18px]">
                <Link to="/tesoreria/fondo-solidale" className="scd-focus inline-flex h-11 items-center gap-2 rounded-[10px] bg-[var(--in-info)] px-4 text-[15px] font-bold text-white" data-testid="tes-fondo-link">
                  <HandCoins className="size-4" aria-hidden="true" /> Apri Fondo Solidale
                </Link>
                <Link to="/tesoreria/donazioni" className="scd-focus inline-flex h-11 items-center gap-2 rounded-[10px] border border-[var(--in-line)] bg-white px-4 text-[15px] font-semibold" data-testid="tes-donazioni-link">
                  <Package className="size-4" aria-hidden="true" /> Apri donazioni
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
            <Card id="tes-contabilita" title="Contabilità ordinaria (ASD, regime 398/91)" sub="Direzione e Tesoreria: prima nota dai movimenti del conto, calendario degli incassi e chiusura del mese per il commercialista entro il 15.">
              <ul className="m-0 grid list-none grid-cols-1 gap-2 px-4 pb-4 sm:grid-cols-3 sm:px-[18px]" data-testid="tes-contabilita">
                {CONTABILITA_PAGES.filter((p) => p.id !== "movimenti").map((p) => {
                  const Icon = p.icon;
                  return (
                    <li key={p.id} className="min-w-0">
                      <Link to={p.path as never} className="scd-focus flex h-full min-h-11 flex-col gap-1 rounded-xl border border-[#b9d5ef] bg-[var(--in-info-bg)] px-3 py-2.5 hover:bg-white">
                        <span className="inline-flex items-center gap-2 text-[15px] font-bold text-[var(--in-info)]"><Icon className="size-4" aria-hidden="true" />{p.label}</span>
                        <span className="text-[13px] leading-snug text-[var(--in-sub)]">{p.what}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Card>
            <Card id="tes-posta" title="Posta del club" sub="Richieste e solleciti a famiglie e fornitori da sportclubcolico@gmail.com, con il tuo nome; le risposte tornano qui. Le conversazioni riservate le vedono solo Direzione e Tesoreria.">
              <div className="px-4 pb-4 sm:px-[18px]">
                <Link to="/gestionale/posta" className="scd-focus inline-flex h-11 items-center gap-2 rounded-[10px] bg-[var(--in-info)] px-4 text-[15px] font-bold text-white" data-testid="tes-posta-link">
                  <Mail className="size-4" aria-hidden="true" /> Apri la posta
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
