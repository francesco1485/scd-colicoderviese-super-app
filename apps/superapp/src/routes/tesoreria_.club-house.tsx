import { createFileRoute } from "@tanstack/react-router";

import { ClubCardsDesk } from "@/components/scd/ClubCardsDesk";
import { SubAreaList, TillPreview } from "@/components/scd/tesoreria";
import { EmptyState, SourcesBox, WorkAreaGateView, WorkAreaShell, workAreaHead } from "@/components/scd/work-area-ui";
import { Card } from "@/components/scd/interior-ui";
import { getWorkAreaGate } from "@/lib/work-areas.functions";

/** Tesoreria · Club House: bar till with an unloaded price list, and the card desk (web links + SQUBY). No amounts. */
export const Route = createFileRoute("/tesoreria_/club-house")({
  loader: async () => {
    const gate = await getWorkAreaGate({ data: { area: "club-house" } });
    return { gate, interior: gate.view === "page" };
  },
  head: ({ loaderData }) => workAreaHead("club-house", loaderData?.gate),
  component: ClubHouseRoute,
});

function ClubHouseRoute() {
  const { gate } = Route.useLoaderData();
  return (
    <WorkAreaGateView id="club-house" gate={gate}>
      <WorkAreaShell
        id="club-house"
        title="Club House"
        preview={gate.preview}
        highlights={[
          { value: null, label: "incassi di oggi: cassa da collegare" },
          { value: null, label: "prodotti: listino da caricare" },
        ]}
        note="Sottoarea di Tesoreria. Nessun importo mostrato."
      >
        <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="flex min-w-0 flex-col gap-[18px]">
            <TillPreview
              title="Cassa del bar"
              path="/tesoreria/club-house"
              tabs={["Bar", "Cucina", "Merchandising"]}
              emptyTitle="Listino non ancora caricato"
              emptyText="Prodotti e prezzi del Club House: i tasti della cassa si creeranno dal listino."
              loadLabel="Carica listino"
            />
            <Card id="ch-chiusure" title="Chiusure di cassa">
              <div className="px-4 pb-4 sm:px-[18px]">
                <EmptyState title="Nessuna chiusura registrata">Le chiusure compariranno quando la cassa sarà collegata al Gestionale economico.</EmptyState>
              </div>
            </Card>
          </div>
          <div className="flex min-w-0 flex-col gap-[18px]">
            <ClubCardsDesk />
            <SubAreaList current="club-house" />
            <SourcesBox id="club-house" />
          </div>
        </div>
      </WorkAreaShell>
    </WorkAreaGateView>
  );
}
