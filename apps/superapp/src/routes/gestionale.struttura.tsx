import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  DoorClosed,
  DoorOpen,
  Dumbbell,
  Moon,
  Sparkles,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Card, Chip, SourceLine } from "@/components/scd/interior-ui";
import { EmptyState, SourcesBox, WorkAreaGateView, WorkAreaShell, workAreaHead } from "@/components/scd/work-area-ui";
import { roleLabel } from "@/lib/access";
import { dateParts } from "@/lib/board-data";
import { freshnessLabel } from "@/lib/public-snapshots";
import { emptyStructureBoard, structureOffMessage, getStructureBoard, type StructureBoard } from "@/lib/structure-activities.functions";
import { getWorkAreaGate } from "@/lib/work-areas.functions";
import {
  KIND_LABEL,
  SITE_LABEL,
  SITES_WITHOUT_TRAININGS,
  STRUCTURE_SITES,
  WEEK_OFFSET_MAX,
  WEEK_OFFSET_MIN,
  buildStructureWeek,
  siteBadge,
  viewableSites,
  type StructureSite,
  type WeekItem,
  type WeekItemKind,
} from "@/lib/structure-activities";

/**
 * Attività in struttura (Francesco 15/10/2026 14:33, 16/10/2026 06:23): the week of the centres of Colico and Dervio
 * besides official matches. Trainings (Quadro settimanale) and home matches (Master Calendario) already known are
 * shown as they are; shifts, openings, closings, evening activities and Club House evenings come from r135 (applied
 * on SCD PULSE 16/10/2026). When the registry is not read the page says why (not reachable, or access not linked to
 * the club profile) and the shift KPIs stay unknown; a read error is announced by one role="alert" only. Roles only,
 * never names; no minors' data. Read-only.
 * Desktop: VR-026 (KPI tiles, 7-day grid). Phone: VR-025 (site pills, week strip, day list with coloured bar).
 */
export const Route = createFileRoute("/gestionale/struttura")({
  loader: async (): Promise<StructureBoard> => {
    const gate = await getWorkAreaGate({ data: { area: "struttura" } });
    // Closed gate: nothing of the board is read or serialised, only the access screen renders.
    if (gate.view !== "page") return emptyStructureBoard(gate);
    // The board checks the same gate again on the server (it can be called on its own).
    return getStructureBoard();
  },
  head: ({ loaderData }) => workAreaHead("struttura", loaderData?.gate),
  component: StrutturaRoute,
});

function StrutturaRoute() {
  const data = Route.useLoaderData();
  return (
    <WorkAreaGateView id="struttura" gate={data.gate}>
      {data.gate.view === "page" && <StrutturaPage data={data} />}
    </WorkAreaGateView>
  );
}

const KIND_STYLE: Readonly<Record<WeekItemKind, { bar: string; icon: LucideIcon }>> = {
  ALLENAMENTO: { bar: "#1f6fd1", icon: Activity },
  GARA: { bar: "#f2c200", icon: Trophy },
  TURNO_VOLONTARIO: { bar: "#5bb8f5", icon: Users },
  APERTURA: { bar: "#5bb8f5", icon: DoorOpen },
  CHIUSURA: { bar: "#5bb8f5", icon: DoorClosed },
  ATTIVITA_SERALE: { bar: "#0b2f6b", icon: Moon },
  EVENTO: { bar: "#8a6d00", icon: Sparkles },
};

const dayTitle = (iso: string) => {
  const p = dateParts(iso);
  return `${p.weekday.charAt(0)}${p.weekday.slice(1).toLowerCase()} ${p.day} ${p.month.toLowerCase()}`;
};
const timeRange = (i: WeekItem) => (i.start ? (i.end ? `${i.start}–${i.end}` : i.start) : "ora —");
/** Day count; a site without Quadro trainings (Dervio) never says "0 attività": with nothing known it is "—". */
const count = (n: number, site: StructureSite) =>
  n === 0 && SITES_WITHOUT_TRAININGS.includes(site) ? "attività non note" : n === 1 ? "1 attività" : `${n} attività`;

function StrutturaPage({ data }: { data: StructureBoard }) {
  const [site, setSite] = useState<StructureSite>("COLICO");
  const [offset, setOffset] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);

  const viewable = useMemo(() => viewableSites(data.readableSites), [data.readableSites]);
  const week = useMemo(
    () =>
      buildStructureWeek({ today: data.today, offset, slots: data.slots, events: data.events, activities: data.ready ? data.activities : null, viewable }),
    [data, offset, viewable],
  );
  const selected = picked && week.days.includes(picked) ? picked : week.days.includes(data.today) ? data.today : week.days[0]!;
  const days = week.sites[site];
  const selectedDay = days.find((d) => d.date === selected) ?? days[0]!;
  const moveWeek = (n: number) => {
    setOffset((o) => Math.min(WEEK_OFFSET_MAX, Math.max(WEEK_OFFSET_MIN, o + n)));
    setPicked(null);
  };

  const notReady = !data.ready;
  return (
    <WorkAreaShell
      id="struttura"
      title="Attività in struttura"
      preview={data.gate.preview}
      note={
        <>
          Quadro allenamenti del {data.quadroUTC ? freshnessLabel(data.quadroUTC) : "—"} · Calendario del{" "}
          {freshnessLabel(data.calendarModifiedAt)}
        </>
      }
    >
      {notReady && (
        <div role="status" className="flex items-start gap-3 rounded-2xl border border-[#f1dc7a] bg-[#fffbe6] px-4 py-3 sm:px-[18px]">
          <CircleAlert className="mt-0.5 size-5 flex-none text-[var(--in-warn)]" strokeWidth={2} aria-hidden="true" />
          <p className="m-0 text-[14.5px] leading-snug">
            <b className="block text-[15.5px]">{structureOffMessage(data.offReason) ?? structureOffMessage("unreachable")}</b>
            Turni volontari, aperture, chiusure, attività serali e serate Club House non sono stati letti. Ora vedi solo
            allenamenti e gare in casa già noti.
          </p>
        </div>
      )}
      {data.ready && data.error && (
        <div role="alert" className="rounded-2xl border border-[var(--in-crit)] bg-[var(--in-crit-bg)] px-4 py-3 text-[14.5px] font-semibold text-[var(--in-crit)]">
          {data.error}
        </div>
      )}

      <section aria-label="Numeri della settimana" className="grid grid-cols-3 gap-2 lg:gap-[18px]">
        <KpiTile icon={CalendarDays} value={week.kpi.activities} label="attività note in settimana" sub="allenamenti solo Colico" />
        <KpiTile icon={Users} value={week.kpi.uncoveredShifts} label="turni scoperti" sub={notReady ? "registro non letto" : "senza nessuno"} warn />
        <KpiTile icon={Moon} value={week.kpi.clubHouseEvenings} label="serate Club House" sub={notReady ? "registro non letto" : "in settimana"} />
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Sede" className="inline-flex rounded-full border border-[#b9d5ef] bg-white p-1">
          {STRUCTURE_SITES.map((s) => {
            const open = viewable.includes(s);
            const on = open && s === site;
            const badge = siteBadge(week, s);
            return (
              <button
                key={s}
                type="button"
                aria-pressed={on}
                disabled={!open}
                title={open ? undefined : "Sede riservata: Direzione, Segreteria, presidente, coordinatore attività sportiva, responsabile attività di base"}
                onClick={() => open && setSite(s)}
                className={`scd-focus inline-flex h-10 items-center gap-2 rounded-full px-4 text-[15px] font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:text-[var(--in-sub)] ${on ? "bg-[var(--in-info)] text-white" : open ? "text-[var(--in-info)] hover:bg-[var(--in-info-bg)]" : ""}`}
              >
                {SITE_LABEL[s]}
                <span className={`rounded-full px-1.5 text-[12.5px] ${on ? "bg-white/20" : open ? "bg-[var(--in-info-bg)]" : "bg-[#eef1f5] font-medium"}`}>
                  {badge.value}
                  {badge.note && <span className="ml-1 font-medium">{badge.note}</span>}
                  {badge.srText && <span className="sr-only"> ({badge.srText})</span>}
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => moveWeek(-1)}
            disabled={offset <= WEEK_OFFSET_MIN}
            aria-label="Settimana precedente"
            className="scd-focus flex size-10 items-center justify-center rounded-[10px] border border-[#b9d5ef] bg-white text-[var(--in-info)] hover:bg-[var(--in-info-bg)] disabled:opacity-50"
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => {
              setOffset(0);
              setPicked(null);
            }}
            disabled={offset === 0}
            className="scd-focus h-10 rounded-[10px] border border-[#b9d5ef] bg-white px-3 text-[15px] font-semibold text-[var(--in-info)] hover:bg-[var(--in-info-bg)] disabled:opacity-60"
          >
            Oggi
          </button>
          <button
            type="button"
            onClick={() => moveWeek(1)}
            disabled={offset >= WEEK_OFFSET_MAX}
            aria-label="Settimana successiva"
            className="scd-focus flex size-10 items-center justify-center rounded-[10px] border border-[#b9d5ef] bg-white text-[var(--in-info)] hover:bg-[var(--in-info-bg)] disabled:opacity-50"
          >
            <ChevronRight className="size-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-[18px]">
          {/* Phone (VR-025): week strip, selected day in a blue circle, rows with a coloured bar. */}
          <Card id="str-giorno" title={<WeekTitle site={site} label={week.label} />} className="lg:hidden">
            <ol className="m-0 grid list-none grid-cols-7 gap-1 px-3 pb-3 pt-1" aria-label="Giorni della settimana">
              {days.map((d) => {
                const p = dateParts(d.date);
                const on = d.date === selectedDay.date;
                const live = d.items.filter((i) => !i.cancelled).length;
                return (
                  <li key={d.date} className="flex justify-center">
                    <button
                      type="button"
                      onClick={() => setPicked(d.date)}
                      aria-pressed={on}
                      aria-label={`${dayTitle(d.date)}: ${count(live, site)}`}
                      className="scd-focus flex w-full flex-col items-center gap-1 rounded-xl py-1"
                    >
                      <span className="text-[12px] font-semibold uppercase text-[var(--in-sub)]">{p.weekday.slice(0, 3)}</span>
                      <span
                        className={`flex size-9 items-center justify-center rounded-full text-[16px] font-bold ${on ? "bg-[var(--in-info)] text-white" : d.date === data.today ? "border-2 border-[var(--in-info)] text-[var(--in-info)]" : "text-[var(--in-ink)]"}`}
                      >
                        {p.day}
                      </span>
                      <span aria-hidden="true" className={`size-1.5 rounded-full ${live ? "bg-[var(--in-action)]" : "bg-transparent"}`} />
                    </button>
                  </li>
                );
              })}
            </ol>
            <div className="flex items-baseline justify-between border-t border-[var(--in-line)] px-4 pb-1 pt-3">
              <h3 className="m-0 text-[16px] font-bold">{dayTitle(selectedDay.date)}</h3>
              <span className="text-[13.5px] text-[var(--in-sub)]">{count(selectedDay.items.filter((i) => !i.cancelled).length, site)}</span>
            </div>
            <DayList items={selectedDay.items} site={site} notReady={notReady} />
          </Card>

          {/* Desktop (VR-026): seven columns for the chosen site. */}
          <Card id="str-settimana" title={<WeekTitle site={site} label={week.label} />} sub="Barra blu: allenamento · gialla: gara in casa · azzurra: turno, apertura, chiusura · blu notte: attività serale" className="hidden lg:block">
            <ol className="m-0 grid list-none grid-cols-7 gap-2 px-4 pb-4 pt-1" aria-label="Giorni della settimana">
              {days.map((d) => (
                <li key={d.date} className="flex min-w-0 flex-col gap-1.5">
                  <h3 className={`m-0 flex items-center gap-1 px-0.5 pb-1 text-[14px] font-bold ${d.date === data.today ? "text-[var(--in-info)]" : ""}`}>
                    {dayTitle(d.date)}
                    {d.date === data.today && (
                      <span className="rounded-full bg-[var(--in-action)] px-1.5 text-[11px] font-bold text-[var(--in-ink)]">oggi</span>
                    )}
                  </h3>
                  {d.items.map((i) => (
                    <GridItem key={i.id} item={i} />
                  ))}
                  {d.items.length === 0 && <p className="m-0 px-0.5 text-[13px] text-[var(--in-sub)]">—</p>}
                </li>
              ))}
            </ol>
            <WeekSourceLine site={site} data={data} />
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-[18px]">
          <Card id="str-turni" title="Turni e aperture" sub="Volontari, staff e tesserati in struttura: il responsabile è un ruolo, mai un nome.">
            <div className="px-4 pb-4 sm:px-[18px]">
              {data.ready && data.activities === null ? (
                <EmptyState title="Turni non leggibili">Nessun turno è mostrato al posto di quelli veri.</EmptyState>
              ) : notReady ? (
                <EmptyState title="Turni non letti">
                  Il registro dei turni non è stato letto. Nessun turno è stato inventato:
                  quando il registro risponde, qui compaiono turni volontari, aperture, chiusure e chi è di turno per ruolo.
                </EmptyState>
              ) : (
                <ShiftSummary items={week.sites.COLICO.concat(week.sites.DERVIO).flatMap((d) => d.items).filter((i) => i.source === "STRUTTURA")} />
              )}
            </div>
          </Card>
          <Card id="str-legenda" title="Cosa conta" className="hidden lg:block">
            <ul className="m-0 list-none px-4 pb-4 text-[14px] leading-snug sm:px-[18px]">
              <li className="py-1"><b>Attività note in settimana</b>: allenamenti (solo Colico: il quadro non ha Dervio), gare in casa e attività registrate nelle due sedi, annullate escluse. Per Dervio il numero non è completo: "—" se non c'è nulla di noto, "solo gare" se ci sono solo gare in casa.</li>
              <li className="py-1"><b>Turni scoperti</b>: turni volontari, aperture e chiusure senza nessuno.</li>
              <li className="py-1"><b>Serate Club House</b>: sere con un'attività al Club House dalle 18:00.</li>
              <li className="py-1"><b>Dervio riservato</b>: la sede di Dervio la vedono Direzione, Segreteria, presidente, coordinatore attività sportiva e responsabile attività di base. Per gli altri i numeri contano solo Colico.</li>
            </ul>
          </Card>
          <SourcesBox id="struttura" />
        </div>
      </div>
    </WorkAreaShell>
  );
}

/** Card title: the week label is the only live region, so changing week or site is announced once, not the whole grid. */
function WeekTitle({ site, label }: { site: StructureSite; label: string }) {
  return (
    <span aria-live="polite" aria-atomic="true">
      {SITE_LABEL[site]} · settimana {label}
    </span>
  );
}

function KpiTile({ icon: Icon, value, label, sub, warn = false }: { icon: LucideIcon; value: number | null; label: string; sub: string; warn?: boolean }) {
  const known = value !== null;
  return (
    <div className="flex min-w-0 flex-col gap-1.5 rounded-2xl border border-[var(--in-line)] bg-white px-3 py-3 shadow-[var(--in-card-shadow)] lg:flex-row lg:items-center lg:gap-4 lg:px-5 lg:py-4">
      <span className={`flex size-9 flex-none items-center justify-center rounded-xl lg:size-12 ${warn && known && value > 0 ? "bg-[var(--in-warn-bg)] text-[var(--in-warn)]" : "bg-[var(--in-info-bg)] text-[var(--in-info)]"}`}>
        <Icon className="size-5 lg:size-6" strokeWidth={1.8} aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className={`block font-title text-[26px] font-extrabold leading-none lg:text-[34px] ${known ? "" : "text-[var(--in-sub)]"}`}>
          {known ? value : "—"}
          {!known && <span className="sr-only"> (dato non disponibile)</span>}
        </span>
        <span className="mt-1 block text-[13px] font-semibold leading-tight lg:text-[14.5px]">{label}</span>
        <span className="block text-[12px] leading-tight text-[var(--in-sub)] lg:text-[13px]">{sub}</span>
      </span>
    </div>
  );
}

function StatusChip({ item: i }: { item: WeekItem }) {
  if (i.cancelled) return <Chip tone="mute">annullata</Chip>;
  if (i.covered === false) return <Chip tone="warn">scoperto</Chip>;
  if (i.covered === true) return <Chip tone="ok">coperto</Chip>;
  return null;
}

function DayList({ items, site, notReady }: { items: WeekItem[]; site: StructureSite; notReady: boolean }) {
  if (items.length === 0) {
    return (
      <div className="px-4 pb-4 pt-2">
        <EmptyState title="Nessuna attività nota">
          {site === "DERVIO"
            ? "Il quadro allenamenti copre solo i campi di Colico e a Dervio non ci sono gare in casa in calendario per questo giorno."
            : "Nessun allenamento o gara in casa per questo giorno."}
          {notReady && " I turni del registro della struttura non sono stati letti."}
        </EmptyState>
      </div>
    );
  }
  return (
    <ul className="m-0 list-none px-3 pb-3 pt-1">
      {items.map((i) => {
        const st = KIND_STYLE[i.kind];
        const Icon = st.icon;
        return (
          <li key={i.id} className={`mt-2 flex items-stretch gap-3 overflow-hidden rounded-xl border border-[var(--in-line)] bg-white ${i.cancelled ? "opacity-60" : ""}`}>
            <span aria-hidden="true" className="w-1.5 flex-none" style={{ background: st.bar }} />
            <span className="flex w-[52px] flex-none flex-col justify-center py-2.5 text-[14px] font-bold leading-tight">
              {i.start || "—"}
              {i.end && <span className="text-[12px] font-medium text-[var(--in-sub)]">{i.end}</span>}
            </span>
            <span className="flex size-9 flex-none items-center justify-center self-center rounded-full bg-[var(--in-info-bg)] text-[var(--in-info)]">
              <Icon className="size-[18px]" strokeWidth={1.9} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1 py-2.5 pr-3">
              <b className={`block text-[15px] leading-snug ${i.cancelled ? "line-through" : ""}`}>{i.title}</b>
              <span className="block text-[13px] leading-snug text-[var(--in-sub)]">
                {KIND_LABEL[i.kind]} · {i.place}
                {i.responsibleRole && <> · {roleLabel(i.responsibleRole)}</>}
              </span>
              {(i.covered !== null || i.cancelled) && (
                <span className="mt-1 flex">
                  <StatusChip item={i} />
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function GridItem({ item: i }: { item: WeekItem }) {
  const st = KIND_STYLE[i.kind];
  return (
    <div className={`flex overflow-hidden rounded-[9px] border border-[var(--in-line)] bg-white ${i.cancelled ? "opacity-60" : ""}`}>
      <span aria-hidden="true" className="w-1 flex-none" style={{ background: st.bar }} />
      <div className="min-w-0 flex-1 px-2 py-[7px]">
        <div className="text-[12px] text-[var(--in-sub)]">
          {timeRange(i)} · {i.place}
        </div>
        <div className={`text-[13.5px] font-semibold leading-tight ${i.cancelled ? "line-through" : ""}`}>{i.title}</div>
        <div className="text-[12px] text-[var(--in-sub)]">{KIND_LABEL[i.kind]}</div>
        {(i.covered !== null || i.cancelled) && (
          <div className="mt-1">
            <StatusChip item={i} />
          </div>
        )}
      </div>
    </div>
  );
}

function ShiftSummary({ items }: { items: WeekItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState title="Nessun turno registrato in questa settimana">
        Il registro è attivo ma per questa settimana non ci sono turni, aperture o attività serali.
      </EmptyState>
    );
  }
  return (
    <ul className="m-0 list-none p-0">
      {items.map((i) => (
        <li key={i.id} className="flex items-start justify-between gap-2 border-t border-[var(--in-line)] py-2 first:border-t-0">
          <span className="min-w-0">
            <b className="block text-[14.5px] leading-snug">{i.title}</b>
            <span className="block text-[13px] text-[var(--in-sub)]">
              {SITE_LABEL[i.site]} · {dayTitle(i.date)} · {timeRange(i)}
              {i.responsibleRole && <> · {roleLabel(i.responsibleRole)}</>}
            </span>
          </span>
          <StatusChip item={i} />
        </li>
      ))}
    </ul>
  );
}

function WeekSourceLine({ site, data }: { site: StructureSite; data: StructureBoard }) {
  return (
    <SourceLine>
      Allenamenti: Quadro settimanale (copia del {data.quadroUTC ? freshnessLabel(data.quadroUTC) : "—"}, solo campi di Colico) ·
      Gare in casa: Calendario FIGC/LND (copia del {freshnessLabel(data.calendarModifiedAt)}) · Turni e attività: registro
      della struttura {data.ready ? "(r135)" : "(r135, non letto)"}.
      {site === "DERVIO" && " Per Dervio il quadro non ha orari di allenamento."}
    </SourceLine>
  );
}
