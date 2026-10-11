import { createFileRoute } from "@tanstack/react-router";

import { SubAreaList, TariffWarning } from "@/components/scd/tesoreria";
import { EmptyState, PendingButton, SourcesBox, WorkAreaGateView, WorkAreaShell, workAreaHead } from "@/components/scd/work-area-ui";
import { Card } from "@/components/scd/interior-ui";
import { getWorkAreaGate } from "@/lib/work-areas.functions";

/** Tesoreria · Biglietteria: ticket desk blocked until the tariff source is confirmed. No amounts. */
export const Route = createFileRoute("/tesoreria_/biglietteria")({
  loader: async () => {
    const gate = await getWorkAreaGate({ data: { area: "biglietteria" } });
    return { gate, interior: gate.view === "page" };
  },
  head: ({ loaderData }) => workAreaHead("biglietteria", loaderData?.gate),
  component: BiglietteriaRoute,
});

function BiglietteriaRoute() {
  const { gate } = Route.useLoaderData();
  return (
    <WorkAreaGateView id="biglietteria" gate={gate}>
      <WorkAreaShell
        id="biglietteria"
        title="Biglietteria"
        preview={gate.preview}
        highlights={[
          { value: 1, label: "tariffario da confermare" },
          { value: null, label: "incassi di oggi: cassa da collegare" },
          { value: null, label: "abbonamenti: registro da collegare" },
        ]}
        note="Sottoarea di Tesoreria. Nessuna tariffa e nessun importo mostrati."
      >
        <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="flex min-w-0 flex-col gap-[18px]">
            <TariffWarning />
            <Card id="big-tariffe" title="Tariffe e abbonamenti">
              <div className="px-4 pb-4 sm:px-[18px]">
                <EmptyState title="Tariffario da confermare" action={<PendingButton reason="La vendita si attiva dopo la conferma delle tariffe">Vendi biglietto</PendingButton>}>
                  Prezzi di ingresso e abbonamenti compariranno solo dopo la conferma della Direzione: finché la fonte non è unica, qui non si vende nulla.
                </EmptyState>
              </div>
            </Card>
            <Card id="big-incassi" title="Incassi delle partite">
              <div className="px-4 pb-4 sm:px-[18px]">
                <EmptyState title="Cassa da collegare">Gli incassi per partita compariranno quando la cassa sarà collegata al Gestionale economico.</EmptyState>
              </div>
            </Card>
          </div>
          <div className="flex min-w-0 flex-col gap-[18px]">
            <SubAreaList current="biglietteria" />
            <SourcesBox id="biglietteria" />
          </div>
        </div>
      </WorkAreaShell>
    </WorkAreaGateView>
  );
}
