import { createFileRoute } from "@tanstack/react-router";

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
          { value: 4, label: "sottoaree con accesso dedicato" },
          { value: null, label: "incassi di oggi: casse da collegare" },
          { value: 1, label: "tariffario da confermare" },
        ]}
        note="Nessun importo mostrato: casse e listini non sono ancora collegati."
      >
        <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="flex min-w-0 flex-col gap-[18px]">
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
