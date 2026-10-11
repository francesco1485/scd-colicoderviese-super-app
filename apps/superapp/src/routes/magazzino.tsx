import { createFileRoute } from "@tanstack/react-router";

import { Card, SourceLine, TeamTag } from "@/components/scd/interior-ui";
import { EmptyState, PendingButton, SourcesBox, WorkAreaGateView, WorkAreaShell, workAreaHead } from "@/components/scd/work-area-ui";
import { freshnessLabel, loadCalendar, type PublicGroup } from "@/lib/public-snapshots";
import { readableOnWhite, teamTag } from "@/lib/quadro";
import { getWorkAreaGate } from "@/lib/work-areas.functions";

/** Magazzino (board Magazzino.dc.html): inventory to load, teams to dress from the calendar. */
export const Route = createFileRoute("/magazzino")({
  loader: async () => {
    const gate = await getWorkAreaGate({ data: { area: "magazzino" } });
    if (gate.view !== "page") return { gate, interior: false as const };
    const cal = loadCalendar();
    // Teams to dress: calendar groups that have matches (the catch-all "other" excluded).
    const teams = cal.groups.filter((g) => g.count > 0 && g.id !== "other");
    return { gate, interior: true as const, teams, sourceModifiedAt: cal.sourceModifiedAt };
  },
  head: ({ loaderData }) => workAreaHead("magazzino", loaderData?.gate),
  component: MagazzinoRoute,
});

function MagazzinoRoute() {
  const data = Route.useLoaderData();
  return (
    <WorkAreaGateView id="magazzino" gate={data.gate}>
      {data.interior && <MagazzinoPage teams={data.teams} sourceModifiedAt={data.sourceModifiedAt} preview={data.gate.preview} />}
    </WorkAreaGateView>
  );
}

function MagazzinoPage({ teams, sourceModifiedAt, preview }: { teams: PublicGroup[]; sourceModifiedAt: string; preview: boolean }) {
  return (
    <WorkAreaShell
      id="magazzino"
      preview={preview}
      highlights={[
        { value: null, label: "articoli: inventario non caricato" },
        { value: null, label: "richieste kit: modulo da attivare" },
        { value: teams.length || null, label: "squadre da vestire" },
      ]}
      note={<>Squadre dal calendario ufficiale, copia del {freshnessLabel(sourceModifiedAt)}. Nessuna quantità inventata.</>}
    >
      <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-[18px]">
          <Card id="mag-inventario" title="Inventario" sub="Articoli, taglie e quantità per squadra.">
            <div className="px-4 pb-4 sm:px-[18px]">
              <EmptyState
                title="Inventario non ancora caricato"
                action={<PendingButton reason="Il caricamento dell'inventario si attiva con il login">Carica inventario</PendingButton>}
              >
                Serve il listino del fornitore tecnico con le quantità: le taglie e le colonne per squadra si creano da lì, senza inventarle.
              </EmptyState>
            </div>
          </Card>

          <Card id="mag-annate" title="Squadre da vestire" sub="Dal calendario ufficiale: una colonna per squadra quando l'inventario c'è.">
            <ul className="m-0 flex list-none flex-wrap gap-2 px-4 pb-4 sm:px-[18px]">
              {teams.map((g) => (
                <li key={g.id} className="flex items-center gap-2 rounded-full border border-[var(--in-line)] bg-white py-1 pl-1 pr-3 text-[14.5px] font-semibold">
                  <TeamTag tag={teamTag(g)} color={readableOnWhite(g.color)} title={g.label} />
                  <span aria-hidden="true">{g.label}</span>
                </li>
              ))}
            </ul>
            <SourceLine>Calendario ufficiale FIGC/LND e SCD, copia del {freshnessLabel(sourceModifiedAt)}.</SourceLine>
          </Card>

          <div className="grid grid-cols-1 gap-[18px] md:grid-cols-2">
            <Card id="mag-richieste" title="Richieste delle famiglie">
              <div className="px-4 pb-4 sm:px-[18px]">
                <EmptyState title="Nessuna richiesta">Le famiglie chiederanno taglia e articolo dalla loro area. Il pagamento lo segue la Tesoreria.</EmptyState>
              </div>
            </Card>
            <Card id="mag-consegne" title="Consegne">
              <div className="px-4 pb-4 sm:px-[18px]">
                <EmptyState title="Nessuna consegna registrata">Qui si segnerà cosa è stato consegnato, per squadra, senza nomi dei ragazzi.</EmptyState>
              </div>
            </Card>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-[18px]">
          <Card id="mag-kit" title="Kit ufficiale" sub="Articoli e listino dal fornitore tecnico.">
            <div className="px-4 pb-4 sm:px-[18px]">
              <EmptyState title="Ordine kit: file da indicare">
                L'ordine al fornitore tecnico non è ancora collegato. Gli incassi del kit passano dalla Tesoreria (sottoarea Magazzino), con il Gestionale economico.
              </EmptyState>
            </div>
          </Card>
          <SourcesBox id="magazzino" />
        </div>
      </div>
    </WorkAreaShell>
  );
}
