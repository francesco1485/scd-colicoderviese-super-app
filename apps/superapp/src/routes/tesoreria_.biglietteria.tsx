import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";

import { SubAreaList, TariffWarning } from "@/components/scd/tesoreria";
import { EmptyState, SourcesBox, WorkAreaGateView, WorkAreaShell, workAreaHead } from "@/components/scd/work-area-ui";
import { Card, Chip, SourceLine, useRomeNow } from "@/components/scd/interior-ui";
import { dateParts, titleCase } from "@/lib/board-data";
import { TICKETING, euro, ticketedHomeMatches, ticketingFor } from "@/lib/match-extras";
import { loadCalendar, type PublicEvent, type PublicGroup } from "@/lib/public-snapshots";
import { getWorkAreaGate } from "@/lib/work-areas.functions";

/**
 * Tesoreria · Biglietteria (process 9): the confirmed ticket rules (config/scd-ticketing.v1.json, UD-055/UD-079)
 * and the home matches that need the ticket office. The app shows rules only: tickets are paid in cash at the gate.
 * Takings per match arrive with the till register (process 9, next step); no amounts are invented here.
 */
export const Route = createFileRoute("/tesoreria_/biglietteria")({
  loader: async () => {
    const gate = await getWorkAreaGate({ data: { area: "biglietteria" } });
    if (gate.view !== "page") return { gate, interior: false as const };
    const cal = loadCalendar();
    return { gate, interior: true as const, groups: cal.groups, events: cal.events };
  },
  head: ({ loaderData }) => workAreaHead("biglietteria", loaderData?.gate),
  component: BiglietteriaRoute,
});

function BiglietteriaRoute() {
  const data = Route.useLoaderData();
  return (
    <WorkAreaGateView id="biglietteria" gate={data.gate}>
      {data.interior && <BiglietteriaPage preview={data.gate.preview} groups={data.groups} events={data.events} />}
    </WorkAreaGateView>
  );
}

function BiglietteriaPage({ preview, groups, events }: { preview: boolean; groups: PublicGroup[]; events: PublicEvent[] }) {
  const now = useRomeNow();
  const matches = useMemo(() => ticketedHomeMatches(events, now.date), [events, now.date]);
  const byId = useMemo(() => new Map(groups.map((g) => [g.id, g.label])), [groups]);
  const tariffs = Object.values(TICKETING.tariffs);
  return (
    <WorkAreaShell
      id="biglietteria"
      title="Biglietteria"
      preview={preview}
      highlights={[
        { value: tariffs.length, label: "campionati con biglietto" },
        { value: matches.length, label: "partite in casa con biglietteria" },
        { value: null, label: "incassi: registro di cassa da collegare" },
      ]}
      note={`Regole confermate il ${TICKETING.asOf.split("-").reverse().join("/")}. L'app non vende biglietti.`}
    >
      <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="flex min-w-0 flex-col gap-[18px]">
          <TariffWarning />
          <Card id="big-tariffe" title="Tariffe e gratuità 2026/27" sub={TICKETING.where}>
            <div className="overflow-x-auto px-4 sm:px-[18px]">
              <table className="w-full min-w-[320px] border-collapse text-[15px]" data-testid="ticket-tariffs">
                <thead>
                  <tr className="text-left text-[12.5px] text-[var(--in-sub)]">
                    <th className="py-2 font-semibold">Campionato</th>
                    <th className="py-2 text-right font-semibold">Intero</th>
                    <th className="py-2 text-right font-semibold">Ridotto</th>
                  </tr>
                </thead>
                <tbody>
                  {tariffs.map((t) => (
                    <tr key={t.label} className="border-t border-[var(--in-line)]">
                      <td className="py-2 font-semibold">{t.label}</td>
                      <td className="py-2 text-right tabular-nums">{euro(t.intero)}</td>
                      <td className="py-2 text-right tabular-nums">{euro(t.ridotto)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="m-0 mt-3 grid list-none gap-2 px-4 pb-4 text-[14.5px] leading-snug sm:px-[18px]">
              <li><b>Ridotto:</b> {TICKETING.ridottoNote}.</li>
              <li>{TICKETING.bambiniNote}.</li>
              <li>{TICKETING.freeCompetitions}.</li>
              <li className="rounded-lg bg-[#fff3c4] px-3 py-2 text-[#5a4500]">{TICKETING.members}.</li>
              <li className="rounded-lg bg-[#fff3c4] px-3 py-2 text-[#5a4500]">{TICKETING.cup}.</li>
              <li><b>Pagamento:</b> {TICKETING.howToPay.join(", ")}. {TICKETING.opensBefore}</li>
            </ul>
            <SourceLine>{TICKETING.source}.</SourceLine>
          </Card>
          <Card id="big-incassi" title="Incassi delle partite">
            <div className="px-4 pb-4 sm:px-[18px]">
              <EmptyState title="Registro di cassa da collegare">
                Biglietti venduti, omaggi e chiusura di cassa per partita arrivano con il registro della biglietteria (processo 9 della mappa). Finché non c'è, nessun importo viene mostrato.
              </EmptyState>
            </div>
          </Card>
        </div>
        <div className="flex min-w-0 flex-col gap-[18px]">
          <Card id="big-partite" title="Partite in casa con biglietteria" sub="Dal calendario ufficiale: campionati a pagamento e coppe.">
            {matches.length === 0 ? (
              <div className="px-4 pb-4 sm:px-[18px]">
                <EmptyState title="Nessuna partita in programma">Il calendario non ha partite in casa a pagamento nei prossimi giorni.</EmptyState>
              </div>
            ) : (
              <ol className="m-0 list-none p-0" data-testid="ticket-matches">
                {matches.slice(0, 8).map((e) => {
                  const p = dateParts(e.date);
                  const t = ticketingFor({ homeAway: e.homeAway, group: e.group, competition: e.type });
                  const cup = t?.kind === "office" && t.cup;
                  return (
                    <li key={e.id} className="flex items-center gap-3 border-t border-[var(--in-line)] px-4 py-3 sm:px-[18px]">
                      <span className="w-14 flex-none text-center">
                        <span className="block text-[12px] font-bold text-[var(--in-info)]">{p.weekday.slice(0, 3)}</span>
                        <span className="font-title text-[24px] font-black leading-none">{p.day}</span>
                      </span>
                      <span className="min-w-0 flex-1 text-[14.5px] leading-snug">
                        <b>{byId.get(e.group) ?? "Squadra"}</b> – {titleCase(e.opponent || "avversario da definire")}
                        <small className="block text-[12.5px] text-[var(--in-sub)]">{e.time || "orario da confermare"}</small>
                      </span>
                      <Chip tone={cup ? "warn" : "info"}>{cup ? "coppa: paga chi non è tesserato" : "campionato"}</Chip>
                    </li>
                  );
                })}
              </ol>
            )}
          </Card>
          <SubAreaList current="biglietteria" />
          <SourcesBox id="biglietteria" />
        </div>
      </div>
    </WorkAreaShell>
  );
}
