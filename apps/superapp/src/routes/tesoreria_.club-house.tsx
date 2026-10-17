import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";

import { CastPresence } from "@/components/scd/CastPresence";
import { ClubCardsDesk } from "@/components/scd/ClubCardsDesk";
import { ClubHouseBoardCard } from "@/components/scd/ClubHouseBoardCard";
import { SubAreaList, TillPreview } from "@/components/scd/tesoreria";
import { EmptyState, SourcesBox, WorkAreaGateView, WorkAreaShell, workAreaHead } from "@/components/scd/work-area-ui";
import { Card } from "@/components/scd/interior-ui";
import { ClubCatalogEditor } from "@/features/club-catalog/ClubCatalogEditor";
import { getClubHouseBoard } from "@/lib/area-requests.functions";
import { LISTINO_TAB_LABELS, catalogCounts } from "@/lib/club-catalog";
import { getClubCatalogDesk, saveClubCatalogEntry } from "@/lib/club-catalog.functions";
import { getWorkAreaGate } from "@/lib/work-areas.functions";

/**
 * Tesoreria · Club House: bar till with an unloaded price list, the card desk (web links + SQUBY), the order requests
 * of the families with "Lo chef" (UD-114, staged r103: fail-closed until applied) and the chef's presence. No amounts.
 * Data entry (Francesco 17/10/2026 12:22): opening hours of Colico and Dervio, price list and group menus in the r115
 * register (STAGED until "applica r115"), written by the Direzione and the Responsabile Club House; evening events stay
 * in Attività in struttura (r135/r137).
 */
export const Route = createFileRoute("/tesoreria_/club-house")({
  loader: async () => {
    const gate = await getWorkAreaGate({ data: { area: "club-house" } });
    const open = gate.view === "page";
    const [board, desk] = open
      ? await Promise.all([getClubHouseBoard().catch(() => null), getClubCatalogDesk({ data: { platforms: ["CLUB_HOUSE"] } }).catch(() => null)])
      : [null, null];
    return { gate, interior: open, board, catalog: desk?.platforms[0] ?? null };
  },
  head: ({ loaderData }) => workAreaHead("club-house", loaderData?.gate),
  component: ClubHouseRoute,
});

function ClubHouseRoute() {
  const { gate, board, catalog } = Route.useLoaderData();
  const router = useRouter();
  const save = useServerFn(saveClubCatalogEntry);
  const listino = catalog?.entries ? catalogCounts(catalog.entries).LISTINO : null;
  return (
    <WorkAreaGateView id="club-house" gate={gate}>
      <WorkAreaShell
        id="club-house"
        title="Club House"
        preview={gate.preview}
        highlights={[
          { value: null, label: "incassi di oggi: cassa da collegare" },
          listino
            ? { value: listino.published, label: `prodotti pubblicati nel listino (${listino.total} inseriti)` }
            : { value: null, label: "prodotti: listino da caricare" },
        ]}
        note="Sottoarea di Tesoreria. Nessun incasso mostrato: la cassa resta il registratore fiscale."
      >
        <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="flex min-w-0 flex-col gap-[18px]">
            <TillPreview
              title="Cassa del bar"
              path="/tesoreria/club-house"
              tabs={LISTINO_TAB_LABELS}
              emptyTitle="Listino non ancora caricato"
              emptyText="Prodotti e prezzi del Club House: i tasti della cassa si creeranno dal listino."
              loadLabel="Carica listino"
            />
            <ClubCatalogEditor
              platform="CLUB_HOUSE"
              state={catalog?.state ?? "unavailable"}
              entries={catalog?.entries ?? null}
              onSave={(input) => save({ data: input })}
              onDone={() => void router.invalidate()}
            />
            <ClubHouseBoardCard board={board} />
            <Card id="ch-chiusure" title="Chiusure di cassa">
              <div className="px-4 pb-4 sm:px-[18px]">
                <EmptyState title="Nessuna chiusura registrata">Le chiusure compariranno quando la cassa sarà collegata al Gestionale economico.</EmptyState>
              </div>
            </Card>
          </div>
          <div className="flex min-w-0 flex-col gap-[18px]">
            <CastPresence id="accoglienza-chef" />
            <ClubCardsDesk />
            <SubAreaList current="club-house" />
            <SourcesBox id="club-house" />
          </div>
        </div>
      </WorkAreaShell>
    </WorkAreaGateView>
  );
}
