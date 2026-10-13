import { createFileRoute, useRouter } from "@tanstack/react-router";
import { CircleCheck, MapPin, ShieldCheck, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";

import { Card, Chip, SourceLine, TeamTag, useRomeNow } from "@/components/scd/interior-ui";
import { EmptyState, PendingButton, SourcesBox, StatTile, WorkAreaGateView, WorkAreaShell, workAreaHead } from "@/components/scd/work-area-ui";
import { dateParts, titleCase, venueCase } from "@/lib/board-data";
import { freshnessLabel, loadCalendar, type PublicEvent, type PublicGroup } from "@/lib/public-snapshots";
import { readableOnWhite, teamTag } from "@/lib/quadro";
import { getWorkAreaGate } from "@/lib/work-areas.functions";
import { getPulminiRuns } from "@/lib/pulmini-runs.functions";
import { ridersTotal, runsByEvent, runsByTraining, trainingKey, type PulminoRun } from "@/lib/pulmini-runs";
import type { TrainingSlot } from "@/lib/public-snapshots";
import { getTrainingQuadro } from "@/lib/quadro.functions";
import { defaultDay, weekdayKey } from "@/lib/training-view";
import { VanSeatMap, type TeamColor } from "@/components/scd/VanSeatMap";
import { PeoplePins } from "@/components/scd/PeoplePins";
import { PULMINI_SERVICE, trainingServiceFor } from "@/lib/member-services";
import { PULMINI_DEMAND, itDate, sortedCounts } from "@/lib/roster-aggregates";
import { peopleForArea, type StaffPerson } from "@/lib/staff-roster";
import { getStaffEmails, getStaffRoster } from "@/lib/staff-roster.functions";
import { PULMINI_FLEET, factStamp, nextWeekend, weekendMatches } from "@/lib/work-areas";
import { TransportFleetCard, TransportPlanner, TransportQueueCard } from "@/components/scd/TransportDesk";
import { getTransportBoard, type TransportData } from "@/lib/transport.functions";
import { TransportRequestsOffice } from "@/components/scd/TransportRequestsOffice";
import { getTransportRequests } from "@/lib/transport-requests.functions";
import type { OfficeRequest } from "@/lib/transport-requests";
import { draftFromEvent, runsForEvent, type RunDraft, type TransportBoard, type TransportRun } from "@/lib/transport";

/** Pulmini (board Pulmini.dc.html): away trips of the coming weekend and the Master Flotta facts. */
export const Route = createFileRoute("/pulmini")({
  loader: async () => {
    const gate = await getWorkAreaGate({ data: { area: "pulmini" } });
    if (gate.view !== "page") return { gate, interior: false as const };
    const cal = loadCalendar();
    const runs = await getPulminiRuns();
    const { quadro } = await getTrainingQuadro();
    const [roster, emails, transport, requests] = await Promise.all([getStaffRoster(), getStaffEmails(), getTransportBoard(), getTransportRequests()]);
    return { gate, interior: true as const, transport, groups: cal.groups, events: cal.events, sourceModifiedAt: cal.sourceModifiedAt, runs: runs.runs, runsAsOf: runs.asOf, quadroDays: quadro.days, quadroSlots: quadro.slots, people: roster.people, emails, requests };
  },
  head: ({ loaderData }) => workAreaHead("pulmini", loaderData?.gate),
  component: PulminiRoute,
});

function PulminiRoute() {
  const data = Route.useLoaderData();
  return (
    <WorkAreaGateView id="pulmini" gate={data.gate}>
      {data.interior && <PulminiPage groups={data.groups} events={data.events} sourceModifiedAt={data.sourceModifiedAt} preview={data.gate.preview} runs={data.runs} runsAsOf={data.runsAsOf} quadroDays={data.quadroDays} quadroSlots={data.quadroSlots} people={data.people} emails={data.emails} transport={data.transport} requests={data.requests} />}
    </WorkAreaGateView>
  );
}

const F = PULMINI_FLEET;

function PulminiPage({ groups, events, sourceModifiedAt, preview, runs, runsAsOf, quadroDays, quadroSlots, people, emails, transport, requests }: { groups: PublicGroup[]; events: PublicEvent[]; sourceModifiedAt: string; preview: boolean; runs: PulminoRun[]; runsAsOf: string | null; quadroDays: string[]; quadroSlots: TrainingSlot[]; people: StaffPerson[]; emails: Record<string, string>; transport: TransportData; requests: OfficeRequest[] | null }) {
  const board: TransportBoard | null = transport.board;
  const [draft, setDraft] = useState<RunDraft | null>(null);
  const router = useRouter();
  const transportManagers = peopleForArea(people, "pulmini");
  const now = useRomeNow();
  const trips = useMemo(() => weekendMatches(events, now.date, true), [events, now.date]);
  const { sat, sun } = nextWeekend(now.date);
  const byId = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups]);
  const teamColors = useMemo(() => new Map<string, TeamColor>(groups.map((g) => [g.id, { label: g.label, color: readableOnWhite(g.color ?? "#3b5683") }])), [groups]);
  const vansByEvent = useMemo(() => runsByEvent(runs), [runs]);
  const weekendRuns = trips.reduce((n, e) => n + (vansByEvent.get(e.id)?.length ?? 0) + (board ? runsForEvent(board.runs, e.id).length : 0), 0);
  const organize = (e: PublicEvent, teamLabel: string, place: string) => {
    setDraft(draftFromEvent({ id: e.id, date: e.date, opponent: titleCase(e.opponent || ""), teamLabel, place }));
    requestAnimationFrame(() => document.getElementById("pul-organizza")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  const weekendKids = trips.reduce((n, e) => n + (vansByEvent.get(e.id) ?? []).reduce((a, r) => a + ridersTotal(r), 0), 0);
  const trainingRuns = useMemo(() => runsByTraining(runs), [runs]);
  const weekdayRuns = runs.filter((r) => r.training).length;
  const [trainDay, setTrainDay] = useState(() => defaultDay(quadroDays, now.date));
  const trainSlots = useMemo(() => quadroSlots.filter((s) => s.day === trainDay).sort((a, b) => a.start - b.start), [quadroSlots, trainDay]);
  const todayKey = weekdayKey(now.date);
  const weekendLabel = `sabato ${Number(sat.slice(8))} e domenica ${Number(sun.slice(8))}`;

  return (
    <WorkAreaShell
      id="pulmini"
      preview={preview}
      highlights={[
        { value: trips.length, label: `trasferte ${weekendLabel}` },
        { value: weekendRuns, label: "pulmini assegnati nel weekend" },
        { value: weekdayRuns, label: "corse di allenamento in settimana" },
        { value: PULMINI_SERVICE.vehiclesInService, label: "pulmini in servizio (comunicazione del 5/10)" },
      ]}
      note={<>Calendario ufficiale: copia del {freshnessLabel(sourceModifiedAt)} · Flotta: {factStamp(F)}.</>}
    >
      <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-[18px]">
        <Card
          id="pul-settimana"
          title="In settimana: i pulmini degli allenamenti"
          sub="Per ogni fascia del quadro, quanti pulmini si muovono e chi c'è a bordo. Le corse arrivano dal Master Pulmini."
          aside={<Chip tone="info">{weekdayRuns} {weekdayRuns === 1 ? "corsa" : "corse"}</Chip>}
          className="lg:self-start"
        >
          <div className="flex flex-wrap gap-1.5 px-4 pb-3 sm:px-[18px]" role="group" aria-label="Giorno">
            {quadroDays.map((d) => {
              const on = d === trainDay;
              const today = d === todayKey;
              return (
                <button key={d} type="button" onClick={() => setTrainDay(d)} aria-pressed={on} className={`h-9 rounded-full px-3.5 text-[14px] font-bold ${on ? "bg-[var(--in-ink)] text-white" : "bg-[var(--in-info-bg)] text-[var(--in-ink)]"}`}>
                  {d.charAt(0) + d.slice(1, 3).toLowerCase()}
                  {today && <span className="ml-1 text-[11px] font-extrabold opacity-80">oggi</span>}
                </button>
              );
            })}
          </div>
          {trainSlots.length === 0 ? (
            <div className="px-4 pb-4 sm:px-[18px]">
              <EmptyState title="Nessuna fascia nel quadro">Il quadro settimanale non ha allenamenti per questo giorno.</EmptyState>
            </div>
          ) : (
            <ol className="m-0 list-none p-0">
              {trainSlots.map((slot) => {
                const vans = trainingRuns.get(trainingKey(slot.day, slot.start)) ?? [];
                const kids = vans.reduce((a, r) => a + ridersTotal(r), 0);
                const who = [slot.fields.C1, slot.fields.C2].filter((t) => t && t.trim() && t.trim() !== "—").join(" · ");
                const served = trainingServiceFor(who);
                return (
                  <li key={slot.timeLabel + slot.start} className="grid gap-3 border-t border-[var(--in-line)] px-4 py-4 sm:px-[18px]" data-testid="training-run">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="font-title text-[24px] font-black leading-none tabular-nums">{slot.timeLabel.split(/[–-]/)[0]}</span>
                      <span className="text-[14px] text-[var(--in-sub)]">{slot.timeLabel}</span>
                      <span className="min-w-0 flex-1 truncate text-[14px] font-semibold" title={who}>{who || "Campi liberi"}</span>
                      {served === "no" ? (
                        <Chip tone="info">servizio non previsto per questa fascia</Chip>
                      ) : vans.length === 0 ? (
                        <Chip tone="warn">nessun pulmino registrato</Chip>
                      ) : (
                        <Chip tone="ok">{vans.length} {vans.length === 1 ? "pulmino" : "pulmini"} · {kids} ragazzi</Chip>
                      )}
                    </div>
                    {vans.length > 0 && (
                      <div className="grid gap-4 rounded-2xl bg-[#f5f9ff] p-3 md:grid-cols-2">
                        {vans.map((run, i) => (
                          <VanSeatMap key={`${run.vehicle}-${i}`} run={run} teams={teamColors} destination="Centro sportivo Colico" />
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
          <SourceLine>Fasce dal quadro settimanale; corse dal Master Pulmini{runsAsOf ? ` (dato al ${runsAsOf.split("-").reverse().join("/")})` : ""}. Aggiungere autisti, corse e variazioni d'orario dall'app arriverà con l'accesso del responsabile trasporti.</SourceLine>
        </Card>

        {requests && <TransportRequestsOffice initial={requests} />}

        <Card
          id="pul-trasferte"
          title="Trasferte del prossimo weekend"
          sub={`Partite fuori casa di ${weekendLabel}, dal calendario ufficiale. Decidi tu quali hanno bisogno del pulmino.`}
          aside={<Chip tone="info">{trips.length} {trips.length === 1 ? "trasferta" : "trasferte"}</Chip>}
          className="lg:self-start"
        >
          {trips.length === 0 ? (
            <div className="px-4 pb-4 sm:px-[18px]">
              <EmptyState title="Nessuna trasferta nel prossimo weekend">Il calendario ufficiale di questa copia non ha partite fuori casa per sabato e domenica.</EmptyState>
            </div>
          ) : (
            <ol className="m-0 list-none p-0">
              {trips.map((e) => (
                <TripRow key={e.id} e={e} group={byId.get(e.group)} vans={vansByEvent.get(e.id) ?? []} teams={teamColors} board={board} onOrganize={board?.canManage ? organize : null} />
              ))}
            </ol>
          )}
          <SourceLine>Calendario ufficiale FIGC/LND, copia del {freshnessLabel(sourceModifiedAt)}. {board?.canManage ? "\"Organizza\" apre la corsa già compilata con data, squadra e destinazione." : "Le corse le organizzano Direzione, Segreteria e responsabile trasporti."}</SourceLine>
        </Card>

        {board && <TransportPlanner board={board} today={now.date} draft={draft} setDraft={setDraft} onSaved={() => router.invalidate()} />}
        {transport.connected && !board && transport.error && (
          <EmptyState title="Corse non disponibili">{transport.error} Riprova tra poco.</EmptyState>
        )}

        </div>
        <div className="flex min-w-0 flex-col gap-[18px]">
          {board && <TransportQueueCard board={board} now={new Date(`${now.date}T12:00:00Z`)} />}
          <Card id="pul-domanda" title="Chi ha chiesto il servizio" sub={`Dal Master Pulmini, solo conteggi, dato al ${itDate(PULMINI_DEMAND.asOf)}.`}>
            <div className="grid grid-cols-3 gap-2 px-4 pb-3 sm:px-[18px]" data-testid="pulmini-demand">
              <StatTile value={PULMINI_DEMAND.byStatus["ATTIVO"] ?? 0} of={PULMINI_DEMAND.users} label="iscritti attivi" />
              <StatTile value={PULMINI_DEMAND.byMode["A/R"] ?? 0} label="andata e ritorno" />
              <StatTile value={PULMINI_DEMAND.byMode["SOLO ANDATA"] ?? 0} label="solo andata" />
            </div>
            <div className="border-t border-[var(--in-line)] px-4 py-3 sm:px-[18px]">
              <p className="m-0 mb-1.5 text-[12.5px] font-extrabold uppercase tracking-[0.05em] text-[var(--in-sub)]">Per squadra</p>
              <div className="flex flex-wrap gap-1.5">
                {sortedCounts(PULMINI_DEMAND.byGroup).map(([g, n]) => {
                  const off = /U16|U18|JUNIORES/.test(g);
                  return <Chip key={g} tone={off ? "warn" : "info"}>{g.replace(/ \d{4}(-\d{4})?$/, "")} · {n}{off ? " · allenamenti non previsti" : ""}</Chip>;
                })}
              </div>
              <p className="m-0 mb-1.5 mt-3 text-[12.5px] font-extrabold uppercase tracking-[0.05em] text-[var(--in-sub)]">Per linea</p>
              <div className="flex flex-wrap gap-1.5">
                {sortedCounts(PULMINI_DEMAND.byLine).map(([l, n]) => <Chip key={l} tone={l === "DA VERIFICARE" ? "warn" : "info"}>{l} · {n}</Chip>)}
              </div>
            </div>
            <SourceLine>{PULMINI_DEMAND.weekdayConfirmation.note} {PULMINI_DEMAND.stopsRegistered} fermate registrate su {PULMINI_DEMAND.lines.length} linee.</SourceLine>
          </Card>

          <Card id="pul-regole" title="Regole del servizio" sub={PULMINI_SERVICE.source}>
            <dl className="m-0 grid gap-2 px-4 pb-4 text-[14px] leading-snug sm:px-[18px]">
              <div><dt className="font-bold">Allenamenti: annate servite</dt><dd className="m-0 text-[var(--in-sub)]">{PULMINI_SERVICE.trainingAnnate.join(", ")}</dd></div>
              <div><dt className="font-bold">Allenamenti: non previsto</dt><dd className="m-0 text-[var(--in-sub)]">{PULMINI_SERVICE.trainingNotServed.join(", ")} · {PULMINI_SERVICE.evaluatedCaseByCase.join(" e ")}: valutate caso per caso</dd></div>
              <div><dt className="font-bold">Modalità</dt><dd className="m-0 text-[var(--in-sub)]">{PULMINI_SERVICE.modes.join(" · ")}; le richieste già definite restano valide</dd></div>
              <div><dt className="font-bold">Trasferte</dt><dd className="m-0 text-[var(--in-sub)]">{PULMINI_SERVICE.awayTrips}</dd></div>
              <div><dt className="font-bold">Richieste e variazioni</dt><dd className="m-0 text-[var(--in-sub)]">{PULMINI_SERVICE.requestFlow}</dd></div>
              <div><dt className="font-bold">Ai punti di raccolta</dt><dd className="m-0 text-[var(--in-sub)]">{PULMINI_SERVICE.pickupRules.join("; ")}</dd></div>
            </dl>
          </Card>

          {board ? (
            <TransportFleetCard
              board={board}
              today={now.date}
              managers={transportManagers.length > 0 ? (
                <div className="border-t border-[var(--in-line)] px-4 py-3 sm:px-[18px]">
                  <PeoplePins people={transportManagers} emails={emails} label="Responsabile trasporti" />
                </div>
              ) : null}
            />
          ) : (
          <Card id="pul-flotta" title="Flotta" sub="Dal Master Flotta e Trasporti: i posti non sono ancora confermati.">
            <div className="grid grid-cols-3 gap-2 px-4 pb-4 sm:px-[18px]" data-testid="fleet">
              <StatTile value={PULMINI_SERVICE.vehiclesInService} of={F.vehicles} label="in servizio su mezzi in flotta" />
              <StatTile value={F.driversActive} of={F.driversRegistered} label="autisti attivi in anagrafica" />
              <StatTile value={F.membersActive} of={F.membersTotal} label="iscritti attivi" />
            </div>
            <dl className="m-0 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1.5 border-t border-[var(--in-line)] px-4 py-3 text-[14.5px] sm:px-[18px]">
              <dt className="text-[var(--in-sub)]">Posti per mezzo</dt>
              <dd className="m-0 font-semibold">— <Chip tone="warn" className="ml-1">da confermare</Chip></dd>
              <dt className="text-[var(--in-sub)]">Corse registrate</dt>
              <dd className="m-0 font-semibold">{runs.length === 0 ? "nessuna" : `${runs.length} (${weekdayRuns} in settimana, ${runs.length - weekdayRuns} trasferte)`}</dd>
            </dl>
            {transportManagers.length > 0 && (
              <div className="border-t border-[var(--in-line)] px-4 py-3 sm:px-[18px]">
                <PeoplePins people={transportManagers} emails={emails} label="Responsabile trasporti" />
              </div>
            )}
            <SourceLine>{factStamp(F)}. Sul pulmino compare il nome dell'autista; i ragazzi sono figure senza nome.</SourceLine>
          </Card>
          )}

          <Card id="pul-corse" title="Corse e passeggeri" sub={runsAsOf ? `Dal Master Pulmini, dato al ${runsAsOf.split("-").reverse().join("/")}.` : undefined}>
            <div className="px-4 pb-4 sm:px-[18px]">
              {runs.length === 0 ? (
                <EmptyState title="Nessuna corsa registrata">
                  I {F.membersActive} iscritti attivi non sono ancora legati a nessuna corsa. Quando la corsa è nel Master Pulmini, qui compare il pulmino con autista e posti.
                </EmptyState>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <StatTile value={weekendRuns} label="pulmini nel weekend" />
                  <StatTile value={weekendKids} label="ragazzi a bordo" />
                </div>
              )}
            </div>
          </Card>

          <p className="m-0 flex gap-2.5 rounded-2xl border border-[var(--in-line)] bg-white px-4 py-3.5 text-[14.5px] leading-snug text-[var(--in-sub)] shadow-[var(--in-card-shadow)]">
            <ShieldCheck className="mt-[1px] size-5 flex-none text-[var(--in-info)]" strokeWidth={1.8} aria-hidden="true" />
            I ragazzi compaiono solo come figure senza nome e senza foto, con il colore della squadra. L'elenco nominativo lo vedranno solo l'autista assegnato e il responsabile trasporti, dopo la verifica dei permessi privacy.
          </p>

          <SourcesBox id="pulmini" />
        </div>
      </div>
    </WorkAreaShell>
  );
}

function TripRow({ e, group, vans, teams, board, onOrganize }: { e: PublicEvent; group: PublicGroup | undefined; vans: PulminoRun[]; teams: ReadonlyMap<string, TeamColor>; board: TransportBoard | null; onOrganize: ((e: PublicEvent, teamLabel: string, place: string) => void) | null }) {
  const planned: TransportRun[] = board ? runsForEvent(board.runs, e.id) : [];
  const first = planned[0];
  const vehicleOf = (id: string | null) => board?.vehicles.find((v) => v.id === id)?.label;
  const driverOf = (id: string | null) => board?.drivers.find((d) => d.id === id)?.name;
  const p = dateParts(e.date);
  const label = group?.label ?? "Squadra";
  const confirmed = e.timeConfirmed && e.venueConfirmed;
  const [town, ...rest] = e.venue.split(/\s+-\s+/);
  const place = [venueCase(titleCase(town ?? "")), rest.length ? venueCase(titleCase(rest.join(" - ").split(",")[0]!)) : ""].filter(Boolean).join(" · ");
  return (
    <li className="grid grid-cols-[56px_minmax(0,1fr)] gap-x-3 gap-y-3 border-t border-[var(--in-line)] px-4 py-4 sm:px-[18px] sm:grid-cols-[64px_minmax(0,1fr)_auto]">
      <div className="flex h-[72px] flex-col items-center justify-center rounded-xl bg-[var(--in-info-bg)]">
        <span className="text-[12px] font-bold text-[var(--in-info)]">{p.weekday.slice(0, 3)}</span>
        <span className="font-title text-[30px] font-black leading-none">{p.day}</span>
      </div>
      <div className="min-w-0">
        <div className="flex items-start gap-2">
          <TeamTag tag={group ? teamTag(group) : "—"} color={readableOnWhite(group?.color ?? "#3b5683")} title={label} />
          <h3 className="m-0 text-[17px] font-bold leading-tight">
            {label} a {titleCase(e.opponent || "avversario da definire")}
          </h3>
        </div>
        <p className="mt-1.5 flex items-start gap-1.5 text-[14px] leading-snug text-[var(--in-sub)]">
          <MapPin className="mt-[2px] size-4 flex-none" strokeWidth={1.8} aria-hidden="true" />
          {place || "Sede da verificare"}
        </p>
        <div className="mt-2">
          {confirmed ? (
            <Chip tone="ok"><CircleCheck className="size-3.5" strokeWidth={2} aria-hidden="true" />Confermata FIGC/LND</Chip>
          ) : (
            <Chip tone="warn"><TriangleAlert className="size-3.5" strokeWidth={2} aria-hidden="true" />Orario o sede da verificare</Chip>
          )}
        </div>
      </div>
      <dl className="col-span-2 m-0 grid grid-cols-2 gap-1.5 min-[420px]:grid-cols-4 sm:col-span-3">
        <div className="rounded-lg bg-[var(--in-info-bg)] px-2.5 py-1.5">
          <dt className="text-[12.5px] text-[var(--in-sub)]">Fischio</dt>
          <dd className="m-0 text-[15px] font-bold">{e.time || "—"}</dd>
        </div>
        {(
          [
            ["Partenza", vans[0]?.departure ?? first?.departure.slice(0, 5)],
            ["Autista", vans[0]?.driver ?? (first ? driverOf(first.driverId) : undefined)],
            ["Mezzo", vans.length + planned.length > 1 ? `${vans.length + planned.length} pulmini` : vans[0]?.vehicle ?? (first ? vehicleOf(first.vehicleId) : undefined)],
          ] as const
        ).map(([k, v]) => (
          <div key={k} className={`min-w-0 rounded-lg px-2.5 py-1.5 ${v ? "bg-[var(--in-info-bg)]" : "border border-dashed border-[#b9d5ef]"}`}>
            <dt className="text-[12.5px] text-[var(--in-sub)]">{k}</dt>
            <dd className={`m-0 truncate text-[15px] font-bold ${v ? "" : "text-[var(--in-sub)]"}`}>
              {v ?? (
                <>
                  —<span className="sr-only"> (da definire)</span>
                </>
              )}
            </dd>
          </div>
        ))}
      </dl>
      <div className="col-span-2 sm:col-span-1 sm:col-start-3 sm:row-start-1 sm:self-start">
        {onOrganize ? (
          <button type="button" onClick={() => onOrganize(e, label, place || titleCase(e.opponent || ""))} className="inline-flex h-11 items-center rounded-full bg-[var(--in-ink)] px-4 text-[14.5px] font-bold text-white" data-testid="organize-trip">
            {planned.length ? "Aggiungi pulmino" : "Organizza"}
          </button>
        ) : (
          <PendingButton reason="Le corse le organizzano Direzione, Segreteria e responsabile trasporti">Organizza</PendingButton>
        )}
      </div>
      <div className="col-span-2 grid gap-4 rounded-2xl bg-[#f5f9ff] p-3 sm:col-span-3 md:grid-cols-2" data-testid="van-seat-maps">
        {(vans.length ? vans : [null]).map((run, i) => (
          <VanSeatMap key={run ? `${run.vehicle}-${i}` : "empty"} run={run} teams={teams} destination={place || titleCase(e.opponent || "trasferta")} />
        ))}
      </div>
    </li>
  );
}
