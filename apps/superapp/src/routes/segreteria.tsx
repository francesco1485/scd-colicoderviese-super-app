import { createFileRoute } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { useMemo } from "react";

import { Card, Chip, SourceLine, TeamTag, useRomeNow } from "@/components/scd/interior-ui";
import { EmptyState, PendingButton, SourcesBox, WorkAreaGateView, WorkAreaShell, workAreaHead } from "@/components/scd/work-area-ui";
import { dateParts, titleCase } from "@/lib/board-data";
import { freshnessLabel, loadCalendar, type PublicEvent, type PublicGroup } from "@/lib/public-snapshots";
import { readableOnWhite, teamTag } from "@/lib/quadro";
import { getWorkAreaGate } from "@/lib/work-areas.functions";
import { weekendMatches } from "@/lib/work-areas";

/** Segreteria (board Segreteria.dc.html): work queues as honest empty states, weekend matches, masters. */
export const Route = createFileRoute("/segreteria")({
  loader: async () => {
    const gate = await getWorkAreaGate({ data: { area: "segreteria" } });
    if (gate.view !== "page") return { gate, interior: false as const };
    const cal = loadCalendar();
    return { gate, interior: true as const, groups: cal.groups, events: cal.events, sourceModifiedAt: cal.sourceModifiedAt };
  },
  head: ({ loaderData }) => workAreaHead("segreteria", loaderData?.gate),
  component: SegreteriaRoute,
});

function SegreteriaRoute() {
  const data = Route.useLoaderData();
  return (
    <WorkAreaGateView id="segreteria" gate={data.gate}>
      {data.interior && <SegreteriaPage groups={data.groups} events={data.events} sourceModifiedAt={data.sourceModifiedAt} preview={data.gate.preview} />}
    </WorkAreaGateView>
  );
}

const FORMS = ["Lettera di preavviso al Comune", "Richiesta variazione gara LND", "Distinta di gara"];

function SegreteriaPage({ groups, events, sourceModifiedAt, preview }: { groups: PublicGroup[]; events: PublicEvent[]; sourceModifiedAt: string; preview: boolean }) {
  const now = useRomeNow();
  const matches = useMemo(() => weekendMatches(events, now.date), [events, now.date]);
  const byId = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups]);

  return (
    <WorkAreaShell
      id="segreteria"
      preview={preview}
      highlights={[
        { value: null, label: "scadenze: collegare a R20" },
        { value: matches.length, label: "distinte per il weekend" },
        { value: null, label: "tesseramenti: Database Iscrizioni da collegare" },
      ]}
      note={<>Partite: calendario ufficiale, copia del {freshnessLabel(sourceModifiedAt)}. Scadenze e tesseramenti in attesa delle fonti.</>}
    >
      <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_340px]">
        <Card id="seg-scadenze" title="Scadenze" sub="In ordine di data. Urgente sotto i 7 giorni." className="lg:self-start">
          <div className="px-4 pb-4 sm:px-[18px]">
            <EmptyState title="Scadenze da collegare a R20">
              Preavvisi al Comune, autorizzazioni FIGC-SGS e delibere arriveranno da R20 e dal Database Iscrizioni, con la loro data: niente scadenze scritte a mano qui.
            </EmptyState>
          </div>
          <SourceLine>Fonte: R20 · gestionale operativo (da collegare). Per segnalare una scadenza usa «Inserisci».</SourceLine>
        </Card>

        <Card id="seg-weekend" title="Partite del weekend" sub={`${matches.length} ${matches.length === 1 ? "gara" : "gare"} tra sabato e domenica. La distinta si prepara in R20.`} className="lg:self-start">
          {matches.length === 0 ? (
            <div className="px-4 pb-4 sm:px-[18px]">
              <EmptyState title="Nessuna gara nel prossimo weekend">Il calendario ufficiale di questa copia non ha gare per sabato e domenica.</EmptyState>
            </div>
          ) : (
            <ul className="m-0 list-none p-0">
              {matches.map((e) => {
                const g = byId.get(e.group);
                const p = dateParts(e.date);
                return (
                  <li key={e.id} className="grid grid-cols-[86px_minmax(0,1fr)_auto] items-center gap-x-3 border-t border-[var(--in-line)] px-4 py-3 sm:px-[18px]">
                    <span className="text-[14px] text-[var(--in-sub)]">
                      {p.weekday.charAt(0)}{p.weekday.slice(1, 3).toLowerCase()} {p.day} · <b className="text-[var(--in-ink)]">{e.time || "—"}</b>
                    </span>
                    <span className="flex min-w-0 items-center gap-2">
                      <TeamTag tag={g ? teamTag(g) : "—"} color={readableOnWhite(g?.color ?? "#3b5683")} title={g?.label ?? "Squadra"} />
                      <span className="min-w-0">
                        <b className="block truncate text-[15px]">{titleCase(e.opponent || "Avversario da definire")}</b>
                        <span className="block text-[13px] text-[var(--in-sub)]">{e.homeAway === "CASA" ? "In casa" : e.homeAway === "FUORI" ? "Trasferta" : "—"}</span>
                      </span>
                    </span>
                    <PendingButton reason="La distinta si prepara in R20: collegamento in arrivo">Distinta</PendingButton>
                  </li>
                );
              })}
            </ul>
          )}
          <SourceLine>Calendario ufficiale FIGC/LND, copia del {freshnessLabel(sourceModifiedAt)}.</SourceLine>
        </Card>

        <div className="flex min-w-0 flex-col gap-[18px] lg:col-span-2 xl:col-span-1">
          <Card id="seg-certificati" title="Certificati medici">
            <div className="px-4 pb-4 sm:px-[18px]">
              <EmptyState title="Registro non collegato">
                Finché il registro certificati non è collegato non mostriamo scadenze. Sconosciuto non vuol dire zero. Qui compariranno solo le date di scadenza, mai dati sanitari.
              </EmptyState>
            </div>
          </Card>
          <Card id="seg-tesseramenti" title="Tesseramenti">
            <div className="px-4 pb-4 sm:px-[18px]">
              <EmptyState title="Database Iscrizioni da collegare">Matricole e stati arriveranno dal foglio esistente, senza copiarli altrove.</EmptyState>
            </div>
          </Card>
          <Card id="seg-moduli" title="Modulistica">
            <ul className="m-0 list-none p-0">
              {FORMS.map((f) => (
                <li key={f} className="flex items-center gap-3 border-t border-[var(--in-line)] px-4 py-3 text-[15px] sm:px-[18px]">
                  <FileText className="size-[18px] flex-none text-[var(--in-sub)]" strokeWidth={1.8} aria-hidden="true" />
                  <span className="min-w-0 flex-1">{f}</span>
                  <Chip tone="mute">in arrivo</Chip>
                </li>
              ))}
            </ul>
          </Card>
          <SourcesBox id="segreteria" />
        </div>
      </div>
    </WorkAreaShell>
  );
}
