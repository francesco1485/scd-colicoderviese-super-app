import { createFileRoute, Link } from "@tanstack/react-router";

import { SubAreaList } from "@/components/scd/tesoreria";
import { EmptyState, SourcesBox, WorkAreaGateView, WorkAreaShell, workAreaHead } from "@/components/scd/work-area-ui";
import { Card } from "@/components/scd/interior-ui";
import { getWorkAreaGate } from "@/lib/work-areas.functions";

/** Tesoreria · Magazzino: kit orders and payments, till not connected. No amounts. */
export const Route = createFileRoute("/tesoreria_/magazzino")({
  loader: async () => {
    const gate = await getWorkAreaGate({ data: { area: "magazzino-cassa" } });
    return { gate, interior: gate.view === "page" };
  },
  head: ({ loaderData }) => workAreaHead("magazzino-cassa", loaderData?.gate),
  component: MagazzinoCassaRoute,
});

function MagazzinoCassaRoute() {
  const { gate } = Route.useLoaderData();
  return (
    <WorkAreaGateView id="magazzino-cassa" gate={gate}>
      <WorkAreaShell
        id="magazzino-cassa"
        title="Magazzino · cassa"
        preview={gate.preview}
        highlights={[
          { value: null, label: "ordini kit: inventario da caricare" },
          { value: null, label: "incassi kit: cassa da collegare" },
        ]}
        note="Sottoarea di Tesoreria. Nessun importo mostrato."
      >
        <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="flex min-w-0 flex-col gap-[18px]">
            <Card id="mc-ordini" title="Ordini del kit" sub="Richieste delle famiglie e ordini al fornitore tecnico.">
              <div className="px-4 pb-4 sm:px-[18px]">
                <EmptyState title="Nessun ordine registrato">
                  Gli ordini partiranno dall'inventario del{" "}
                  <Link to={"/magazzino" as never} className="scd-focus rounded-sm font-semibold text-[var(--in-info)] underline underline-offset-4">Magazzino</Link>, quando sarà caricato.
                </EmptyState>
              </div>
            </Card>
            <Card id="mc-incassi" title="Incassi del kit">
              <div className="px-4 pb-4 sm:px-[18px]">
                <EmptyState title="Cassa da collegare">Pagamenti e ricevute compariranno quando la cassa sarà collegata al Gestionale economico.</EmptyState>
              </div>
            </Card>
          </div>
          <div className="flex min-w-0 flex-col gap-[18px]">
            <SubAreaList current="magazzino-cassa" />
            <SourcesBox id="magazzino-cassa" />
          </div>
        </div>
      </WorkAreaShell>
    </WorkAreaGateView>
  );
}
