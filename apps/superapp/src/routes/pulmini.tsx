import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Bus, CircleCheck, MapPin, ShieldCheck, TriangleAlert } from "lucide-react";
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
import { InternalBadgeImage } from "@/components/scd/InternalBadge";
import { lineBadgeFor } from "@/lib/internal-badges";
import { PULMINI_SERVICE, trainingServiceFor } from "@/lib/member-services";
import { PULMINI_DEMAND, itDate, sortedCounts } from "@/lib/roster-aggregates";
import type { StaffPerson } from "@/lib/staff-roster";
import { getStaffEmails, getStaffRoster } from "@/lib/staff-roster.functions";
import { PULMINI_FLEET, factStamp } from "@/lib/work-areas";
import { TransportFleetCard, TransportPlanner, TransportQueueCard } from "@/components/scd/TransportDesk";
import { getTransportBoard, type TransportData } from "@/lib/transport.functions";
import { TransportRequestsOffice } from "@/components/scd/TransportRequestsOffice";
import { getTransportRequests } from "@/lib/transport-requests.functions";
import { TRANSPORT_ACK_LIVE, type OfficeRequest } from "@/lib/transport-requests";
import { FLEET_2026_27, TRANSPORT_OFFICE, TRANSPORT_OFFICE_BACKUP, demandBySeasonTeam, draftFromEvent, runsForEvent, serviceWeekend, serviceWeekendTrips, type RunDraft, type TransportBoard, type TransportRun } from "@/lib/transport";
import { TransportCrewCard } from "@/components/scd/TransportCrewCard";
import { getPulminiVans } from "@/lib/pulmini-vans.functions";
import type { VanId, VanPlan } from "@/lib/pulmini-vans";
import { SlotVans, VanDetailPanel, VanLines } from "@/components/scd/PulminiVans";
import { Dialog } from "@/components/scd/Dialog";
import { TransportLiveDriverPanel } from "@/components/scd/TransportLiveDriverPanel";
import { getLiveDriverPanel, type DriverPanel } from "@/lib/transport-live.functions";
import { VanPlan2D } from "@/components/scd/VanPlan2D";
import { fleetFromBoard } from "@/lib/van-plan";

/** Pulmini (board Pulmini.dc.html): away trips of the coming weekend and the Master Flotta facts. */
export const Route = createFileRoute("/pulmini")({
  loader: async () => {
    const gate = await getWorkAreaGate({ data: { area: "pulmini" } });
    if (gate.view !== "page") return { gate, interior: false as const };
    const cal = loadCalendar();
    const runs = await getPulminiRuns();
    const { quadro } = await getTrainingQuadro();
    const [roster, emails, transport, requests, vans, live] = await Promise.all([getStaffRoster(), getStaffEmails(), getTransportBoard(), getTransportRequests(), getPulminiVans(), getLiveDriverPanel().catch((): DriverPanel => ({ state: "unavailable", preview: false, acknowledged: false, runs: [], arrivals: [] }))]);
    return { gate, interior: true as const, transport, vans, groups: cal.groups, events: cal.events, sourceModifiedAt: cal.sourceModifiedAt, runs: runs.runs, runsAsOf: runs.asOf, quadroDays: quadro.days, quadroSlots: quadro.slots, people: roster.people, emails, requests, live };
  },
  head: ({ loaderData }) => workAreaHead("pulmini", loaderData?.gate),
  component: PulminiRoute,
});

function PulminiRoute() {
  const data = Route.useLoaderData();
  return (
    <WorkAreaGateView id="pulmini" gate={data.gate}>
      {data.interior && <PulminiPage groups={data.groups} events={data.events} sourceModifiedAt={data.sourceModifiedAt} preview={data.gate.preview} runs={data.runs} runsAsOf={data.runsAsOf} quadroDays={data.quadroDays} quadroSlots={data.quadroSlots} people={data.people} emails={data.emails} transport={data.transport} requests={data.requests} vans={data.vans} live={data.live} />}
    </WorkAreaGateView>
  );
}

const F = PULMINI_FLEET;

function PulminiPage({ groups, events, sourceModifiedAt, preview, runs, runsAsOf, quadroDays, quadroSlots, people, emails, transport, requests, vans: vanPlan, live }: { live: DriverPanel; groups: PublicGroup[]; events: PublicEvent[]; sourceModifiedAt: string; preview: boolean; runs: PulminoRun[]; runsAsOf: string | null; quadroDays: string[]; quadroSlots: TrainingSlot[]; people: StaffPerson[]; emails: Record<string, string>; transport: TransportData; requests: OfficeRequest[] | null; vans: VanPlan | null }) {
  const board: TransportBoard | null = transport.board;
  const [openVan, setOpenVan] = useState<VanId | null>(null);
  const openDetail = vanPlan && openVan ? vanPlan.vans.find((v) => v.id === openVan) ?? null : null;
  const planSlot = (day: string, start: number) => vanPlan?.slots.find((p) => p.day === day && p.start === start) ?? null;
  const vanMoves = vanPlan ? vanPlan.slots.reduce((n, p) => n + p.vans.length, 0) : 0;
  const [draft, setDraft] = useState<RunDraft | null>(null);
  const router = useRouter();
  const now = useRomeNow();
  // The weekend in progress on Saturday and Sunday (today's trips first), otherwise the coming one.
  const trips = useMemo(() => serviceWeekendTrips(events, now.date), [events, now.date]);
  const { sat, sun } = serviceWeekend(now.date);
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
  const fleet = useMemo(() => fleetFromBoard(board), [board]);
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
      {live.state === "open" && <TransportLiveDriverPanel panel={live} />}
      <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-[18px]">
        <Card
          id="pul-settimana"
          title="In settimana: i pulmini degli allenamenti"
          sub="Sotto ogni allenamento i pulmini che lo servono, andata e ritorno, con i nomi dei ragazzi. Premi un pulmino per vedere chi c'è sempre, dove va e che percorso fa."
          aside={vanPlan?.mode === "locked" && weekdayRuns === 0 ? <Chip tone="mute">nomi riservati</Chip> : <Chip tone="info">{weekdayRuns + vanMoves} {weekdayRuns + vanMoves === 1 ? "pulmino in fascia" : "pulmini in fascia"}</Chip>}
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
                const ps = planSlot(slot.day, slot.start);
                const planVans = ps?.vans.length ?? 0;
                const kids = vans.reduce((a, r) => a + ridersTotal(r), 0) + (ps ? new Set(ps.vans.flatMap((v) => [...v.out, ...v.back].map((r) => r.key))).size : 0);
                const who = [slot.fields.C1, slot.fields.C2].filter((t) => t && t.trim() && t.trim() !== "—").join(" · ");
                const served = trainingServiceFor(who);
                return (
                  <li key={slot.timeLabel + slot.start} className="grid gap-3 border-t border-[var(--in-line)] px-4 py-4 sm:px-[18px]" data-testid="training-run">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="font-title text-[24px] font-black leading-none tabular-nums">{slot.timeLabel.split(/[–-]/)[0]}</span>
                      <span className="text-[14px] text-[var(--in-sub)]">{slot.timeLabel}</span>
                      <span className="min-w-0 flex-1 truncate text-[14px] font-semibold" title={who}>{who || "Campi liberi"}</span>
                      {served === "no" ? (
                        <Chip tone="info">servizio non previsto per questa fascia{ps && ps.notServed > 0 ? ` · ${ps.notServed} richieste nel Master` : ""}</Chip>
                      ) : vans.length + planVans === 0 ? (
                        vanPlan?.mode === "locked" ? null : ps && ps.unplaced.length > 0 ? (
                          <Chip tone="warn">ragazzi da collocare</Chip>
                        ) : (
                          <Chip tone="warn">nessun pulmino registrato</Chip>
                        )
                      ) : (
                        <Chip tone="ok">{vans.length + planVans} {vans.length + planVans === 1 ? "pulmino" : "pulmini"} · {kids} ragazzi</Chip>
                      )}
                    </div>
                    {ps && vanPlan && served !== "no" && <SlotVans slot={ps} plan={vanPlan} onOpen={setOpenVan} />}
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
          {vanPlan && (
            <section className="border-t border-[var(--in-line)] px-4 py-4 sm:px-[18px]" aria-labelledby="pul-2d" id="pul-pianta">
              <h3 id="pul-2d" className="m-0 text-[17px] font-bold">I pulmini visti dall'alto · {trainDay.charAt(0) + trainDay.slice(1).toLowerCase()}</h3>
              <p className="m-0 mb-3 mt-0.5 text-[14px] leading-snug text-[var(--in-sub)]">Come i campi e gli spogliatoi: chi siede dove, e nel giro chi sale e chi scende a ogni fermata.</p>
              <VanPlan2D plan={vanPlan} fleet={fleet} day={trainDay} today={now.date} />
            </section>
          )}
          <SourceLine>
            Fasce dal quadro settimanale; ragazzi, linee e giorni dal Master Pulmini{vanPlan?.asOf ? ` (copia del ${vanPlan.asOf.split("-").reverse().join("/")})` : runsAsOf ? ` (dato al ${runsAsOf.split("-").reverse().join("/")})` : ""}. Un ragazzo va sul pulmino scritto nel Master, altrimenti su quello della sua linea; la linea LAGO/LECCO resta da dividere tra Pulmino 1 e 2.{vanPlan && vanPlan.mode !== "locked" ? ` Collocati ${vanPlan.counts.placed} su ${vanPlan.counts.active} iscritti attivi.` : ""}
          </SourceLine>
        </Card>
        {openDetail && vanPlan && (
          <Dialog title={`${openDetail.label} · ${openDetail.line}`} onClose={() => setOpenVan(null)} testId="van-dialog">
            <VanDetailPanel van={openDetail} plan={vanPlan} />
          </Dialog>
        )}

        {requests && <TransportRequestsOffice initial={requests} />}

        <Card
          id="pul-trasferte"
          title={now.date === sat || now.date === sun ? "Trasferte di questo weekend" : "Trasferte del prossimo weekend"}
          sub={`Partite fuori casa di ${weekendLabel}, dal calendario ufficiale. Decidi tu quali hanno bisogno del pulmino.`}
          aside={<Chip tone="info">{trips.length} {trips.length === 1 ? "trasferta" : "trasferte"}</Chip>}
          className="lg:self-start"
        >
          {trips.length === 0 ? (
            <div className="px-4 pb-4 sm:px-[18px]">
              <EmptyState title="Nessuna trasferta da servire">Il calendario ufficiale di questa copia non ha partite fuori casa per {weekendLabel}{now.date === sun ? " ancora da giocare" : ""}.</EmptyState>
            </div>
          ) : (
            <ol className="m-0 list-none p-0">
              {trips.map((e) => (
                <TripRow key={e.id} e={e} group={byId.get(e.group)} vans={vansByEvent.get(e.id) ?? []} teams={teamColors} board={board} onOrganize={board?.canManage ? organize : null} />
              ))}
            </ol>
          )}
          <SourceLine>Calendario ufficiale FIGC/LND, copia del {freshnessLabel(sourceModifiedAt)}. {board?.canManage ? "\"Organizza\" apre la corsa già compilata con data, squadra e destinazione." : `Le corse le organizza il ${TRANSPORT_OFFICE} (in sua assenza ${TRANSPORT_OFFICE_BACKUP}).`}</SourceLine>
        </Card>

        {board && <TransportPlanner board={board} today={now.date} draft={draft} setDraft={setDraft} onSaved={() => router.invalidate()} />}
        {transport.connected && !board && transport.error && (
          <EmptyState title="Corse non disponibili">{transport.error} Riprova tra poco.</EmptyState>
        )}

        </div>
        <div className="flex min-w-0 flex-col gap-[18px]">
          <TransportCrewCard people={people} emails={emails} board={board} ackLive={TRANSPORT_ACK_LIVE} />
          {board && <TransportQueueCard board={board} now={new Date(`${now.date}T12:00:00Z`)} />}
          {vanPlan && (
            <Card id="pul-mezzi" title="Le quattro linee" sub={`Ogni linea resta un pulmino a sé. Premi per chi c'è sempre, dove va e il percorso. Il quarto mezzo è dell'${FLEET_2026_27.partnerOwner}, usato all'occorrenza: su quale linea, da confermare.`}>
              <div className="px-4 pb-3 sm:px-[18px]">
                <VanLines plan={vanPlan} onOpen={setOpenVan} />
              </div>
              {vanPlan.mode !== "locked" && vanPlan.unplaced.length > 0 && (
                <div className="border-t border-[var(--in-line)] px-4 py-3 sm:px-[18px]" data-testid="unplaced-summary">
                  <p className="m-0 mb-1.5 text-[12.5px] font-extrabold uppercase tracking-[0.05em] text-[var(--in-sub)]">Da collocare · {vanPlan.counts.unplaced}</p>
                  <ul className="m-0 grid list-none gap-1 p-0 text-[14px] leading-snug">
                    {vanPlan.unplaced.map((u) => (
                      <li key={u.reason} className="flex items-start justify-between gap-3">
                        <span className="text-[var(--in-sub)]">{u.reason}</span>
                        <Chip tone="warn">{u.riders.length}</Chip>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <SourceLine>{vanPlan.mode === "names" ? "Nomi dal Master Pulmini, mostrati come nome e iniziale del cognome." : vanPlan.namesNote}</SourceLine>
            </Card>
          )}
          <Card id="pul-domanda" title="Chi ha chiesto il servizio" sub={`Dal Master Pulmini, solo conteggi, dato al ${itDate(PULMINI_DEMAND.asOf)}.`}>
            <div className="grid grid-cols-3 gap-2 px-4 pb-3 sm:px-[18px]" data-testid="pulmini-demand">
              <StatTile value={PULMINI_DEMAND.byStatus["ATTIVO"] ?? 0} of={PULMINI_DEMAND.users} label="iscritti attivi" />
              <StatTile value={PULMINI_DEMAND.byMode["A/R"] ?? 0} label="andata e ritorno" />
              <StatTile value={PULMINI_DEMAND.byMode["SOLO ANDATA"] ?? 0} label="solo andata" />
            </div>
            <div className="border-t border-[var(--in-line)] px-4 py-3 sm:px-[18px]">
              <p className="m-0 mb-1.5 text-[12.5px] font-extrabold uppercase tracking-[0.05em] text-[var(--in-sub)]">Per squadra</p>
              <div className="flex flex-wrap gap-1.5" data-testid="pulmini-demand-teams">
                {demandBySeasonTeam(PULMINI_DEMAND.byGroup).map((t) => {
                  const note = t.status === "withdrawn" ? " · da ricollocare nel Master" : t.status === "unknown" ? " · da verificare" : t.trainingServed === false ? " · allenamenti non previsti" : "";
                  return <Chip key={t.key ?? t.label} tone={t.status === "withdrawn" ? "crit" : note ? "warn" : "info"}>{t.label} · {t.count}{note}</Chip>;
                })}
              </div>
              <p className="m-0 mt-1.5 text-[13px] leading-snug text-[var(--in-sub)]">Nomi delle squadre 2026/27; il Master usa ancora le vecchie sigle (U12, U13, U18).</p>
              <p className="m-0 mb-1.5 mt-3 text-[12.5px] font-extrabold uppercase tracking-[0.05em] text-[var(--in-sub)]" id="pul-linee">Per linea</p>
              <LineList counts={sortedCounts(PULMINI_DEMAND.byLine)} />
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
            <TransportFleetCard board={board} today={now.date} />
          ) : (
          <Card id="pul-flotta" title="Flotta" sub={`${FLEET_2026_27.clubVans} ${FLEET_2026_27.model} del club + ${FLEET_2026_27.partnerVans} dell'${FLEET_2026_27.partnerOwner} usato all'occorrenza (Direzione, 17/10/2026). Copia del Master non leggibile da questa sessione.`}>
            <div className="grid grid-cols-3 gap-2 px-4 pb-4 sm:px-[18px]" data-testid="fleet">
              <StatTile value={FLEET_2026_27.clubVans} of={FLEET_2026_27.clubVans + FLEET_2026_27.partnerVans} label="pulmini del club sui mezzi disponibili" />
              <StatTile value={FLEET_2026_27.drivers} label="autisti volontari indicati dalla Direzione" />
              <StatTile value={F.membersActive} of={F.membersTotal} label={`iscritti attivi al ${itDate(F.asOf)}`} />
            </div>
            <dl className="m-0 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1.5 border-t border-[var(--in-line)] px-4 py-3 text-[14.5px] sm:px-[18px]">
              <dt className="text-[var(--in-sub)]">Posti per mezzo</dt>
              <dd className="m-0 font-semibold">— <Chip tone="warn" className="ml-1">da confermare</Chip></dd>
              <dt className="text-[var(--in-sub)]">Corse registrate</dt>
              <dd className="m-0 font-semibold">{runs.length === 0 ? "nessuna" : `${runs.length} (${weekdayRuns} in settimana, ${runs.length - weekdayRuns} trasferte)`}</dd>
            </dl>
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
            Sotto gli allenamenti i ragazzi compaiono con nome e iniziale del cognome solo per il {TRANSPORT_OFFICE}, Direzione, Segreteria e autisti, verificati dal server. Mai telefoni, genitori o indirizzi; nelle trasferte restano figure senza nome.
          </p>

          {live.state !== "open" && <TransportLiveDriverPanel panel={live} />}
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
          <PendingButton reason={`Le corse le organizza il ${TRANSPORT_OFFICE}`}>Organizza</PendingButton>
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

/**
 * "Per linea": each line of the Master Pulmini with its count and, when the line name matches exactly,
 * the club-made minibus badge (src/lib/internal-badges.ts). Lines without a badge keep a neutral bus mark.
 */
function LineList({ counts }: { counts: Array<[string, number]> }) {
  return (
    <ul className="m-0 grid list-none gap-1.5 p-0 sm:grid-cols-2 lg:grid-cols-1" aria-labelledby="pul-linee" data-testid="pulmini-lines">
      {counts.map(([line, n]) => {
        const badge = lineBadgeFor(line);
        const toCheck = line === "DA VERIFICARE";
        return (
          <li key={line} className="flex min-h-[52px] items-center gap-3 rounded-xl border border-[var(--in-line)] bg-white px-2.5 py-1.5" data-line={line}>
            {badge ? (
              <InternalBadgeImage badge={badge} size={44} />
            ) : (
              <span aria-hidden="true" className={`flex size-11 flex-none items-center justify-center rounded-full ${toCheck ? "bg-[var(--in-warn-bg)] text-[var(--in-warn)]" : "bg-[var(--in-info-bg)] text-[var(--in-info)]"}`}>
                <Bus className="size-5" strokeWidth={1.8} />
              </span>
            )}
            <span className="min-w-0 flex-1 text-[14.5px] font-semibold leading-tight">{line}</span>
            <Chip tone={toCheck ? "warn" : "info"}>{n} {n === 1 ? "utente" : "utenti"}</Chip>
          </li>
        );
      })}
    </ul>
  );
}
