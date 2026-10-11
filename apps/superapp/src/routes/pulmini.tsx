import { createFileRoute } from "@tanstack/react-router";
import { CircleCheck, MapPin, ShieldCheck, TriangleAlert } from "lucide-react";
import { useMemo } from "react";

import { Card, Chip, SourceLine, TeamTag, useRomeNow } from "@/components/scd/interior-ui";
import { EmptyState, PendingButton, SourcesBox, StatTile, WorkAreaGateView, WorkAreaShell, workAreaHead } from "@/components/scd/work-area-ui";
import { dateParts, titleCase, venueCase } from "@/lib/board-data";
import { freshnessLabel, loadCalendar, type PublicEvent, type PublicGroup } from "@/lib/public-snapshots";
import { readableOnWhite, teamTag } from "@/lib/quadro";
import { getWorkAreaGate } from "@/lib/work-areas.functions";
import { PULMINI_FLEET, factStamp, nextWeekend, weekendMatches } from "@/lib/work-areas";

/** Pulmini (board Pulmini.dc.html): away trips of the coming weekend and the Master Flotta facts. */
export const Route = createFileRoute("/pulmini")({
  loader: async () => {
    const gate = await getWorkAreaGate({ data: { area: "pulmini" } });
    if (gate.view !== "page") return { gate, interior: false as const };
    const cal = loadCalendar();
    return { gate, interior: true as const, groups: cal.groups, events: cal.events, sourceModifiedAt: cal.sourceModifiedAt };
  },
  head: ({ loaderData }) => workAreaHead("pulmini", loaderData?.gate),
  component: PulminiRoute,
});

function PulminiRoute() {
  const data = Route.useLoaderData();
  return (
    <WorkAreaGateView id="pulmini" gate={data.gate}>
      {data.interior && <PulminiPage groups={data.groups} events={data.events} sourceModifiedAt={data.sourceModifiedAt} preview={data.gate.preview} />}
    </WorkAreaGateView>
  );
}

const F = PULMINI_FLEET;

function PulminiPage({ groups, events, sourceModifiedAt, preview }: { groups: PublicGroup[]; events: PublicEvent[]; sourceModifiedAt: string; preview: boolean }) {
  const now = useRomeNow();
  const trips = useMemo(() => weekendMatches(events, now.date, true), [events, now.date]);
  const { sat, sun } = nextWeekend(now.date);
  const byId = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups]);
  const weekendLabel = `sabato ${Number(sat.slice(8))} e domenica ${Number(sun.slice(8))}`;

  return (
    <WorkAreaShell
      id="pulmini"
      preview={preview}
      highlights={[
        { value: trips.length, label: `trasferte ${weekendLabel}` },
        { value: F.runsPlanned, label: "corse pianificate nel Master Pulmini" },
        { value: F.vehicles, label: "mezzi, posti da confermare" },
      ]}
      note={<>Calendario ufficiale: copia del {freshnessLabel(sourceModifiedAt)} · Flotta: {factStamp(F)}.</>}
    >
      <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[minmax(0,1fr)_360px]">
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
                <TripRow key={e.id} e={e} group={byId.get(e.group)} />
              ))}
            </ol>
          )}
          <SourceLine>Calendario ufficiale FIGC/LND, copia del {freshnessLabel(sourceModifiedAt)}. Le corse si salvano nel Master Pulmini: da qui non si crea nulla.</SourceLine>
        </Card>

        <div className="flex min-w-0 flex-col gap-[18px]">
          <Card id="pul-flotta" title="Flotta" sub="Dal Master Flotta e Trasporti: i posti non sono ancora confermati.">
            <div className="grid grid-cols-3 gap-2 px-4 pb-4 sm:px-[18px]" data-testid="fleet">
              <StatTile value={F.vehicles} label="mezzi" />
              <StatTile value={F.driversActive} of={F.driversRegistered} label="autisti attivi in anagrafica" />
              <StatTile value={F.membersActive} of={F.membersTotal} label="iscritti attivi" />
            </div>
            <dl className="m-0 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1.5 border-t border-[var(--in-line)] px-4 py-3 text-[14.5px] sm:px-[18px]">
              <dt className="text-[var(--in-sub)]">Posti per mezzo</dt>
              <dd className="m-0 font-semibold">— <Chip tone="warn" className="ml-1">da confermare</Chip></dd>
              <dt className="text-[var(--in-sub)]">Corse pianificate</dt>
              <dd className="m-0 font-semibold">nessuna</dd>
            </dl>
            <SourceLine>{factStamp(F)}. Nomi di autisti e ragazzi non compaiono qui.</SourceLine>
          </Card>

          <Card id="pul-corse" title="Corse e passeggeri">
            <div className="px-4 pb-4 sm:px-[18px]">
              <EmptyState title="Nessuna corsa registrata">
                I {F.membersActive} iscritti attivi non sono ancora legati a nessuna corsa. La corsa si crea nel Master Pulmini, partendo da una trasferta.
              </EmptyState>
            </div>
          </Card>

          <p className="m-0 flex gap-2.5 rounded-2xl border border-[var(--in-line)] bg-white px-4 py-3.5 text-[14.5px] leading-snug text-[var(--in-sub)] shadow-[var(--in-card-shadow)]">
            <ShieldCheck className="mt-[1px] size-5 flex-none text-[var(--in-info)]" strokeWidth={1.8} aria-hidden="true" />
            L'elenco passeggeri di una corsa lo vedranno solo l'autista assegnato e il responsabile trasporti, dopo la verifica dei posti e dei permessi privacy.
          </p>

          <SourcesBox id="pulmini" />
        </div>
      </div>
    </WorkAreaShell>
  );
}

function TripRow({ e, group }: { e: PublicEvent; group: PublicGroup | undefined }) {
  const p = dateParts(e.date);
  const label = group?.label ?? "Squadra";
  const confirmed = e.timeConfirmed && e.venueConfirmed;
  const [town, ...rest] = e.venue.split(/\s+-\s+/);
  const place = [venueCase(titleCase(town ?? "")), rest.length ? venueCase(titleCase(rest.join(" - ").split(",")[0]!)) : ""].filter(Boolean).join(" · ");
  return (
    <li className="grid grid-cols-[56px_minmax(0,1fr)] gap-x-3 gap-y-3 border-t border-[var(--in-line)] px-4 py-4 sm:px-[18px] xl:grid-cols-[64px_minmax(0,1fr)_auto_auto]">
      <div className="flex h-[72px] flex-col items-center justify-center rounded-xl bg-[var(--in-info-bg)] xl:h-auto xl:min-h-[96px]">
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
      <dl className="col-span-2 m-0 grid grid-cols-4 gap-1.5 xl:col-span-1 xl:self-center">
        <div className="rounded-lg bg-[var(--in-info-bg)] px-2.5 py-1.5">
          <dt className="text-[12.5px] text-[var(--in-sub)]">Fischio</dt>
          <dd className="m-0 text-[15px] font-bold">{e.time || "—"}</dd>
        </div>
        {["Partenza", "Autista", "Mezzo"].map((k) => (
          <div key={k} className="rounded-lg border border-dashed border-[#b9d5ef] px-2.5 py-1.5">
            <dt className="text-[12.5px] text-[var(--in-sub)]">{k}</dt>
            <dd className="m-0 text-[15px] font-bold text-[var(--in-sub)]">—<span className="sr-only"> (da definire)</span></dd>
          </div>
        ))}
      </dl>
      <div className="col-span-2 xl:col-span-1 xl:self-center">
        <PendingButton reason="Le corse si creano nel Master Pulmini: collegamento in arrivo">Organizza</PendingButton>
      </div>
    </li>
  );
}
