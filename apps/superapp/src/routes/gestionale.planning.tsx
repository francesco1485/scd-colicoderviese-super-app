import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlarmClock, CalendarDays, ChevronLeft, ChevronRight, Link2Off, Trophy } from "lucide-react";
import { useMemo } from "react";

import { Card, Chip, SourceLine, useRomeNow } from "@/components/scd/interior-ui";
import { BallIcon } from "@/components/scd/icons";
import { EmptyState, WorkAreaGateView, WorkAreaShell, workAreaHead } from "@/components/scd/work-area-ui";
import { getPublicCalendarSnapshot } from "@/lib/calendar.functions";
import { CLUB_EVENTS } from "@/lib/club-events";
import { FEE_DEADLINES } from "@/lib/fees";
import type { KbItem } from "@/lib/knowledge";
import { searchKnowledge } from "@/lib/knowledge.functions";
import { freshnessLabel, type PublicEvent, type PublicGroup } from "@/lib/public-snapshots";
import { readableOnWhite } from "@/lib/quadro";
import {
  DUE_WINDOW_DAYS,
  FILTER_LABEL,
  PLAN_FILTERS,
  SEASON,
  buildSeasonPlan,
  coversMonth,
  dayHeading,
  daysFrom,
  daysOfMonth,
  defaultMonth,
  filterPlan,
  isPlanFilter,
  monthLabel,
  stepMonth,
  upcomingDeadlines,
  type PlanFilter,
  type PlanItem,
  type SeasonPlan,
} from "@/lib/season-planning";
import { SGS_RULES, deadlinesFor, type Level } from "@/lib/sgs-quality";
import { TOURNAMENTS } from "@/lib/tournaments";
import { getWorkAreaGate } from "@/lib/work-areas.functions";

/*
 * Planning annuale (Francesco 15/10/2026 14:33 and 16/10/2026 06:23, gestionali mancanti; UD-038 "analizzare il
 * calendario annuale"). Engine: TEMPO. The whole season 01/07/2026-30/06/2027 on one page: official matches,
 * tournaments and events, club and federal deadlines. Read-only, behind the same staff gate as /gestionale.
 * Desktop follows VR-026 (rail of the shell, KPI tiles on top), phone follows VR-025 (month header with arrows,
 * pill tabs, day groups, rows with coloured left bar, time, title, place, chevron). Pure logic and tests:
 * src/lib/season-planning.ts.
 */

type Search = { mese?: string | undefined; vista?: PlanFilter | undefined };

/** A source that fails to load is shown as "da collegare", never as an empty truth. */
async function soft<T>(p: Promise<T>): Promise<T | null> {
  try {
    return await p;
  } catch (err) {
    console.error("[gestionale/planning] source failed to load", err);
    return null;
  }
}

const KB_LIMIT = 200;

/** Distinguishes "no role" (not connected) from "read failed" and "row limit reached". */
function kbStatus(kb: Awaited<ReturnType<typeof searchKnowledge>> | null): "ok" | "error" | "truncated" | undefined {
  if (!kb || !kb.connected) return undefined;
  if (kb.error || !kb.result) {
    if (kb.error) console.error("[gestionale/planning] Cervellone read failed", kb.error);
    return "error";
  }
  return kb.result.items.length >= KB_LIMIT ? "truncated" : "ok";
}

export const Route = createFileRoute("/gestionale/planning")({
  validateSearch: (s: Record<string, unknown>): Search => {
    const out: Search = {};
    const m = s["mese"];
    if (typeof m === "string" && /^\d{4}-\d{2}$/.test(m) && m >= SEASON.from.slice(0, 7) && m <= SEASON.to.slice(0, 7)) out.mese = m;
    if (isPlanFilter(s["vista"])) out.vista = s["vista"];
    return out;
  },
  loader: async () => {
    const gate = await getWorkAreaGate({ data: { area: "planning" } });
    // Closed gate: nothing of the plan is read or serialised, only the access screen renders.
    if (gate.view !== "page") return { gate, interior: false as const };
    const [cal, kb] = await Promise.all([
      soft(getPublicCalendarSnapshot()),
      soft(searchKnowledge({ data: { onlyDue: true, limit: KB_LIMIT } })),
    ]);
    return {
      gate,
      interior: true as const,
      calendar: cal ? { events: cal.events, groups: cal.groups, sourceModifiedAt: cal.sourceModifiedAt, origin: cal.origin } : null,
      knowledge: kb?.connected && kb.result ? kb.result.items : null,
      knowledgeStatus: kbStatus(kb),
    };
  },
  head: ({ loaderData }) => workAreaHead("planning", loaderData?.gate),
  component: PlanningRoute,
});

interface Loaded {
  calendar: { events: PublicEvent[]; groups: PublicGroup[]; sourceModifiedAt: string; origin: string } | null;
  knowledge: KbItem[] | null;
  knowledgeStatus: "ok" | "error" | "truncated" | undefined;
  preview: boolean;
}

function PlanningRoute() {
  const data = Route.useLoaderData();
  return (
    <WorkAreaGateView id="planning" gate={data.gate}>
      {data.interior && <PlanningPage data={{ calendar: data.calendar, knowledge: data.knowledge, knowledgeStatus: data.knowledgeStatus, preview: data.gate.preview }} />}
    </WorkAreaGateView>
  );
}

function PlanningPage({ data }: { data: Loaded }) {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/gestionale/planning" });
  const now = useRomeNow();
  const filter: PlanFilter = search.vista ?? "tutto";

  const plan = useMemo<SeasonPlan>(() => {
    const colors = new Map((data.calendar?.groups ?? []).map((g) => [g.id, readableOnWhite(g.color)]));
    const level = SGS_RULES.targetLevel as Level;
    return buildSeasonPlan({
      today: now.date,
      calendar: data.calendar,
      colorOf: (id) => colors.get(id) ?? "#0860a8",
      tournaments: TOURNAMENTS,
      clubEvents: CLUB_EVENTS,
      feeDeadlines: FEE_DEADLINES[SEASON.label],
      sgs: { deadlines: deadlinesFor(level, now.date), level },
      knowledge: data.knowledge,
      knowledgeStatus: data.knowledgeStatus,
    });
  }, [data.calendar, data.knowledge, data.knowledgeStatus, now.date]);

  const month = search.mese ?? defaultMonth(now.date);
  const visible = useMemo(() => filterPlan(plan.items, filter), [plan.items, filter]);
  const days = useMemo(() => daysOfMonth(visible, month), [visible, month]);
  const due = useMemo(() => upcomingDeadlines(plan.items, now.date), [plan.items, now.date]);
  const matchesUnknown = !coversMonth(plan.coverage, month) && (filter === "tutto" || filter === "gare");
  const prev = stepMonth(month, -1, plan.months);
  const next = stepMonth(month, 1, plan.months);

  const go = (patch: Partial<Search>) =>
    void navigate({ search: (s: Search) => ({ ...s, ...patch }), replace: true, resetScroll: false });

  const calNote = data.calendar
    ? `Calendario ufficiale: copia del ${freshnessLabel(data.calendar.sourceModifiedAt)}.`
    : "Calendario ufficiale da collegare (Master Calendario 2026/27).";

  return (
    <WorkAreaShell id="planning" preview={data.preview} note={`Stagione ${SEASON.label}, dal 01/07/2026 al 30/06/2027. ${calNote}`}>
      <section aria-label="Numeri della stagione" className="grid grid-cols-3 gap-2 lg:gap-[18px]">
        <Kpi icon="gara" value={plan.kpis.matches} label="gare ufficiali in stagione" />
        <Kpi icon="evento" value={plan.kpis.events} label="tornei ed eventi con data" />
        <Kpi
          icon="scadenza"
          value={plan.kpis.dueSoon}
          label={`scadenze nei prossimi ${DUE_WINDOW_DAYS} giorni`}
          note={plan.kpis.duePartial ? "parziale" : null}
        />
      </section>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-[18px]">
        <div className="flex min-w-0 flex-col gap-3 lg:gap-[18px]">
          <FilterPills value={filter} onChange={(v) => go({ vista: v === "tutto" ? undefined : v })} />
          <MonthStrip plan={plan} month={month} today={now.date} onPick={(m) => go({ mese: m })} />

          <Card as="section" id="pl-mese">
            <header className="flex items-center justify-between gap-2 px-3 pb-2 pt-3 sm:px-[18px] sm:pt-4">
              <MonthArrow dir="prev" target={prev} onGo={(m) => go({ mese: m })} />
              <h2 id="pl-mese-title" className="in-card-title m-0 text-center text-[19px] font-bold leading-tight" aria-live="polite">
                {monthLabel(month, plan.months)}
              </h2>
              <MonthArrow dir="next" target={next} onGo={(m) => go({ mese: m })} />
            </header>
            {matchesUnknown && (
              <p role="note" className="m-0 mx-3 mb-2.5 flex items-start gap-2 rounded-xl border border-[#f1dc7a] bg-[#fffbe6] px-3 py-2 text-[13.5px] leading-snug sm:mx-[18px]">
                <Link2Off className="mt-0.5 size-4 flex-none text-[var(--in-warn)]" strokeWidth={2} aria-hidden="true" />
                <span>
                  Gare di questo mese: non note. {data.calendar ? "Il Master Calendario 2026/27 non ha ancora gare pubblicate in questo mese." : "Calendario da collegare (Master Calendario 2026/27)."}
                </span>
              </p>
            )}
            {days.length === 0 ? (
              <div className="px-3 pb-4 sm:px-[18px]">
                <EmptyState title="Nessuna voce nelle fonti collegate per questo mese">
                  {filter === "tutto"
                    ? "Le fonti da collegare sono elencate in Fonti del planning."
                    : `Filtro attivo: ${FILTER_LABEL[filter]}.`}
                </EmptyState>
              </div>
            ) : (
              <ol className="m-0 list-none p-0" aria-labelledby="pl-mese-title">
                {days.map((d) => (
                  <li key={d.day} className="border-t border-[var(--in-line)]">
                    <div className="flex items-baseline justify-between gap-2 bg-[#f4f8fd] px-3 py-2 sm:px-[18px]">
                      <h3 className="m-0 text-[15px] font-bold leading-tight">
                        {d.heading}
                        {d.day === now.date && <span className="ml-2 align-middle"><Chip tone="info">oggi</Chip></span>}
                      </h3>
                      <span className="text-[13px] font-semibold text-[var(--in-sub)]">
                        {d.items.length} {d.items.length === 1 ? "voce" : "voci"}
                      </span>
                    </div>
                    <ul className="m-0 flex list-none flex-col gap-2 px-3 py-2.5 sm:px-[18px]">
                      {d.items.map((it) => (
                        <PlanRow key={it.id} item={it} today={now.date} />
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
            )}
            <SourceLine>
              Gare: Calendario FIGC/LND e SCD (Master Calendario 2026/27). Tornei: Master Tornei & Iniziative. Scadenze: quote
              decise dalla Direzione Generale, C.U. n.18 SGS livello {SGS_RULES.targetLevel}, Cervellone. Sola lettura: le date si
              cambiano nei master.
            </SourceLine>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-3 lg:gap-[18px]">
          <DueCard items={due} today={now.date} partial={plan.kpis.duePartial} />
          <SourcesCard plan={plan} />
        </div>
      </div>
    </WorkAreaShell>
  );
}

/* ------------------------------------------------------------------ pieces */

function KindIcon({ kind, className = "" }: { kind: PlanItem["kind"]; className?: string }) {
  if (kind === "gara") return <BallIcon size={22} className={`text-[var(--in-ink)] ${className}`} />;
  if (kind === "evento") return <Trophy className={`size-[22px] text-[#8a6a00] ${className}`} strokeWidth={1.9} aria-hidden="true" />;
  return <AlarmClock className={`size-[22px] text-[var(--in-info)] ${className}`} strokeWidth={1.9} aria-hidden="true" />;
}

function Kpi({ icon, value, label, note = null }: { icon: PlanItem["kind"]; value: number | null; label: string; note?: string | null }) {
  const known = value !== null;
  return (
    <div className="in-card flex min-w-0 flex-col gap-1 rounded-[var(--in-radius,16px)] border border-[var(--in-line)] bg-[var(--in-surface,#fff)] px-3 py-2.5 shadow-[var(--in-card-shadow)] sm:flex-row sm:items-center sm:gap-3 sm:px-[18px] sm:py-4">
      <span className="hidden size-12 flex-none items-center justify-center rounded-xl bg-[var(--in-info-bg)] sm:flex">
        <KindIcon kind={icon} />
      </span>
      <span className="min-w-0">
        <span className="ex-num block font-title text-[28px] font-extrabold leading-none sm:text-[34px]">
          {known ? value : "—"}
          {!known && <span className="sr-only"> (dato non disponibile)</span>}
        </span>
        <span className="mt-1 block text-[12.5px] leading-tight text-[var(--in-sub)] sm:text-[14px]">{label}</span>
        {note && <span className="mt-0.5 block text-[11.5px] font-semibold leading-tight text-[var(--in-warn)] sm:text-[12.5px]">{note}</span>}
      </span>
    </div>
  );
}

function FilterPills({ value, onChange }: { value: PlanFilter; onChange: (v: PlanFilter) => void }) {
  return (
    <div role="group" aria-label="Filtra le voci" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5">
      {PLAN_FILTERS.map((f) => {
        const on = f === value;
        return (
          <button
            key={f}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(f)}
            className={`scd-focus h-9 flex-none rounded-full px-3 text-[13.5px] font-semibold sm:h-10 sm:px-4 sm:text-[14.5px] transition-colors duration-150 ${
              on ? "bg-[var(--in-info)] text-white shadow-[var(--in-card-shadow)]" : "border border-[#b9d5ef] bg-white text-[var(--in-info)] hover:bg-[var(--in-info-bg)]"
            }`}
          >
            {FILTER_LABEL[f]}
          </button>
        );
      })}
    </div>
  );
}

/** Desktop and tablet: the twelve months with their counts. The phone uses the month header arrows. */
function MonthStrip({ plan, month, today, onPick }: { plan: SeasonPlan; month: string; today: string; onPick: (m: string) => void }) {
  return (
    <nav aria-label="Mesi della stagione" className="hidden md:block">
      <ol className="m-0 grid list-none grid-cols-12 gap-1.5 p-0">
        {plan.months.map((m, i) => {
          const c = plan.counts[i]!;
          const on = m.key === month;
          const current = today.startsWith(m.key);
          return (
            <li key={m.key}>
              <button
                type="button"
                onClick={() => onPick(m.key)}
                aria-current={on ? "date" : undefined}
                aria-label={`${m.label} ${m.year}: ${c.gare === null ? "gare non note" : `${c.gare} gare`}, ${c.eventi} tra tornei ed eventi, ${c.scadenze} scadenze`}
                className={`scd-focus flex w-full flex-col items-center gap-1 rounded-xl border px-1 py-2 transition-colors duration-150 ${
                  on ? "border-[var(--in-info)] bg-[var(--in-info)] text-white" : "border-[var(--in-line)] bg-white text-[var(--in-ink)] hover:bg-[var(--in-info-bg)]"
                }`}
              >
                <span className="text-[13px] font-bold uppercase leading-none tracking-[0.03em]">{m.short}</span>
                <span className={`text-[11px] leading-none ${on ? "text-white/80" : "text-[var(--in-sub)]"}`}>{m.year}</span>
                <span className="mt-0.5 flex items-center gap-1 text-[11.5px] font-semibold leading-none">
                  <span title={c.gare === null ? "gare: calendario non pubblicato" : "gare"} className="ex-num">{c.gare ?? "—"}</span>
                  <Dot color={on ? "#ffffff" : "#0860a8"} />
                  <span title="tornei ed eventi" className="ex-num">{c.eventi}</span>
                  <Dot color={on ? "#f8d000" : "#c79a00"} />
                  <span title="scadenze" className="ex-num">{c.scadenze}</span>
                </span>
                {current && <span className={`h-1 w-5 rounded-full ${on ? "bg-[var(--in-action)]" : "bg-[var(--in-info)]"}`} aria-hidden="true" />}
              </button>
            </li>
          );
        })}
      </ol>
      <p className="m-0 mt-1.5 text-[12.5px] text-[var(--in-sub)]">
        Per mese: gare · tornei ed eventi · scadenze. "—" = gare non ancora pubblicate nel Master Calendario 2026/27.
      </p>
    </nav>
  );
}

function Dot({ color }: { color: string }) {
  return <span aria-hidden="true" className="block size-1 rounded-full" style={{ background: color }} />;
}

function MonthArrow({ dir, target, onGo }: { dir: "prev" | "next"; target: string | null; onGo: (m: string) => void }) {
  const Icon = dir === "prev" ? ChevronLeft : ChevronRight;
  const label = dir === "prev" ? "Mese precedente" : "Mese successivo";
  return (
    <button
      type="button"
      onClick={() => target && onGo(target)}
      disabled={!target}
      aria-label={label}
      className="scd-focus flex size-10 flex-none items-center justify-center rounded-full border border-[#b9d5ef] bg-white text-[var(--in-info)] hover:bg-[var(--in-info-bg)] disabled:cursor-default disabled:opacity-40"
    >
      <Icon className="size-5" aria-hidden="true" />
    </button>
  );
}

function RowBody({ item, today }: { item: PlanItem; today: string }) {
  const left = item.kind === "scadenza" ? daysFrom(today, item.date) : null;
  return (
    <>
      <span className="absolute inset-y-0 left-0 w-[5px]" style={{ background: item.color }} aria-hidden="true" />
      <span className="flex w-[52px] flex-none flex-col items-start leading-tight">
        {item.kind === "scadenza" ? (
          <span className="text-[13px] font-bold uppercase text-[var(--in-sub)]">entro</span>
        ) : item.time ? (
          <span className="ex-num text-[16px] font-bold">{item.time}</span>
        ) : (
          <span className="text-[13px] font-semibold text-[var(--in-sub)]">{item.kind === "evento" ? "giorno" : "ora —"}</span>
        )}
        {item.kind === "gara" && item.time && !item.timeConfirmed && (
          <span className="text-[11px] font-semibold text-[var(--in-warn)]">da conf.</span>
        )}
      </span>
      <KindIcon kind={item.kind} className="flex-none" />
      <span className="min-w-0 flex-1">
        <b className="block text-[15px] font-bold leading-snug">{item.title}</b>
        {item.detail && <span className="block text-[13px] leading-snug text-[var(--in-sub)]">{item.detail}</span>}
        {item.place && <span className="block text-[13px] leading-snug text-[var(--in-sub)]">{item.place}</span>}
        {(item.federal || left !== null) && (
          <span className="mt-1 flex flex-wrap gap-1.5">
            {item.federal && <Chip tone="crit">federale</Chip>}
            {left !== null && <Chip tone={left < 0 ? "mute" : left <= 7 ? "crit" : left <= DUE_WINDOW_DAYS ? "warn" : "info"}>{dueText(left)}</Chip>}
          </span>
        )}
      </span>
      {item.href && <ChevronRight className="size-5 flex-none text-[var(--in-sub)]" aria-hidden="true" />}
    </>
  );
}

function PlanRow({ item, today }: { item: PlanItem; today: string }) {
  const cls = "relative flex items-center gap-2.5 overflow-hidden rounded-xl border border-[var(--in-line)] bg-white py-2.5 pl-4 pr-2.5 sm:gap-3.5 sm:pl-5 sm:pr-3.5";
  return (
    <li data-kind={item.kind} data-origin={item.origin}>
      {item.href ? (
        <Link to={item.href as never} className={`scd-focus ${cls} transition-colors duration-150 hover:bg-[#f7fbff]`}>
          <RowBody item={item} today={today} />
        </Link>
      ) : (
        <div className={cls}>
          <RowBody item={item} today={today} />
        </div>
      )}
    </li>
  );
}

function dueText(days: number): string {
  if (days < 0) return days === -1 ? "scaduta ieri" : `scaduta da ${-days} giorni`;
  if (days === 0) return "oggi";
  if (days === 1) return "domani";
  return `tra ${days} giorni`;
}

function DueCard({ items, today, partial }: { items: PlanItem[]; today: string; partial: boolean }) {
  return (
    <Card id="pl-scadenze" title={`Scadenze nei prossimi ${DUE_WINDOW_DAYS} giorni`} sub={partial ? "Dalle fonti collegate: il conteggio è parziale." : "Dalle fonti collegate."}>
      {items.length === 0 ? (
        <div className="px-4 pb-4 sm:px-[18px]">
          <EmptyState title="Nessuna scadenza nelle fonti collegate" />
        </div>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 px-3 pb-3 sm:px-[18px]">
          {items.map((it) => (
            <li key={it.id} className="relative overflow-hidden rounded-xl border border-[var(--in-line)] bg-white py-2 pl-4 pr-3">
              <span className="absolute inset-y-0 left-0 w-[5px]" style={{ background: it.color }} aria-hidden="true" />
              <span className="block text-[12.5px] font-semibold text-[var(--in-sub)]">
                {dayHeading(it.date)} · {dueText(daysFrom(today, it.date))}
              </span>
              <b className="block text-[14.5px] font-bold leading-snug">{it.title}</b>
              {it.detail && <span className="block text-[12.5px] leading-snug text-[var(--in-sub)]">{it.detail}</span>}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function SourcesCard({ plan }: { plan: SeasonPlan }) {
  return (
    <Card id="pl-fonti" title="Fonti del planning" sub="Da dove arriva ogni voce. Nessun registro parallelo.">
      <ul className="m-0 list-none p-0" data-testid="planning-sources">
        {plan.sources.map((s) => (
          <li key={s.id} className="flex items-start gap-2.5 border-t border-[var(--in-line)] px-4 py-2.5 sm:px-[18px]">
            {s.state === "collegato" ? (
              <CalendarDays className="mt-0.5 size-[18px] flex-none text-[var(--in-ok)]" strokeWidth={1.9} aria-hidden="true" />
            ) : (
              <Link2Off className="mt-0.5 size-[18px] flex-none text-[var(--in-warn)]" strokeWidth={1.9} aria-hidden="true" />
            )}
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <b className="text-[14.5px] font-semibold leading-snug">{s.label}</b>
                <Chip tone={s.state === "collegato" ? "ok" : "warn"}>{s.state}</Chip>
              </span>
              <span className="block text-[12.5px] leading-snug text-[var(--in-sub)]">
                {s.master}
                {s.note ? ` · ${s.note}` : ""}
              </span>
            </span>
          </li>
        ))}
        {plan.undatedEvents.map((t) => (
          <li key={t.id} className="flex items-start gap-2.5 border-t border-[var(--in-line)] px-4 py-2.5 sm:px-[18px]">
            <Trophy className="mt-0.5 size-[18px] flex-none text-[#8a6a00]" strokeWidth={1.9} aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <b className="block text-[14.5px] font-semibold leading-snug">{t.name}</b>
              <span className="block text-[12.5px] leading-snug text-[var(--in-sub)]">senza data: {t.source}</span>
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
