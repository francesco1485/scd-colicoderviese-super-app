/**
 * Planning annuale (season 2026/27 in one place) — pure aggregation logic.
 *
 * Engine: TEMPO (Direzione, segreteria and mister see the whole season without opening four masters).
 * Measured by: page opens of /gestionale/planning and "scadenze nei prossimi 30 giorni" closed before the date.
 *
 * Every row comes from a source the app already has; nothing is invented and nothing is stored:
 * - official matches: the public calendar (Drive mirror, else the bundled copy of the Master Calendario 2026/27);
 * - tournaments and events: src/lib/tournaments.ts (Master Tornei & Iniziative) and src/lib/club-events.ts;
 * - club deadlines: fee instalments decided by the Direzione Generale (src/lib/fees.ts FEE_DEADLINES) and the
 *   Cervellone deadlines (scd_kb_items.scadenza through scd_kb_search, role checked in the database);
 * - federal deadlines: C.U. n.18 SGS (config/sgs-quality-system.v1.json) for the club's target level.
 * A source that cannot be read is reported as "da collegare" with the master that will feed it, never as zero.
 */
import type { KbItem } from "./knowledge";
import type { PublicEvent, PublicGroup } from "./public-snapshots";
import type { DeadlineView } from "./sgs-quality";
import type { TournamentEdition } from "./tournaments";
import type { ClubEvent } from "./stories";
import { groupShort, matchTitle, titleCase, venueCase } from "./board-data";
import { opponentLabel } from "./crests";

/* ------------------------------------------------------------------ season */

export const SEASON = { label: "2026/27", from: "2026-07-01", to: "2027-06-30" } as const;

export interface SeasonMonth {
  /** "2026-10" */
  key: string;
  /** "Ottobre" */
  label: string;
  /** "ott" */
  short: string;
  year: number;
}

const MONTHS_IT = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"] as const;
const WEEKDAYS_IT = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"] as const;

/** The twelve months of the season, July to June. */
export function seasonMonths(season: { from: string; to: string } = SEASON): SeasonMonth[] {
  const out: SeasonMonth[] = [];
  let y = Number(season.from.slice(0, 4));
  let m = Number(season.from.slice(5, 7));
  const endKey = season.to.slice(0, 7);
  for (let guard = 0; guard < 24; guard++) {
    const key = `${y}-${String(m).padStart(2, "0")}`;
    const label = MONTHS_IT[m - 1]!;
    out.push({ key, label, short: label.slice(0, 3).toLowerCase(), year: y });
    if (key === endKey) break;
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export function inSeason(day: string, season: { from: string; to: string } = SEASON): boolean {
  return ISO_DAY.test(day) && day >= season.from && day <= season.to;
}

/** Month of the season to open first: the month of `today` inside the season, else its first or last month. */
export function defaultMonth(today: string, season: { from: string; to: string } = SEASON): string {
  if (today < season.from) return season.from.slice(0, 7);
  if (today > season.to) return season.to.slice(0, 7);
  return today.slice(0, 7);
}

/** Whole days from `from` to `to` (YYYY-MM-DD, calendar days). */
export function daysFrom(from: string, to: string): number {
  const a = Date.UTC(+from.slice(0, 4), +from.slice(5, 7) - 1, +from.slice(8, 10));
  const b = Date.UTC(+to.slice(0, 4), +to.slice(5, 7) - 1, +to.slice(8, 10));
  return Math.round((b - a) / 86_400_000);
}

/** "Sabato 17 ottobre" */
export function dayHeading(day: string): string {
  const d = new Date(Date.UTC(+day.slice(0, 4), +day.slice(5, 7) - 1, +day.slice(8, 10), 12));
  return `${WEEKDAYS_IT[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS_IT[d.getUTCMonth()]!.toLowerCase()}`;
}

/* ------------------------------------------------------------------ items */

export type PlanKind = "gara" | "evento" | "scadenza";
export type PlanOrigin = "calendario" | "tornei" | "quote" | "sgs" | "cervellone";

export interface PlanItem {
  id: string;
  kind: PlanKind;
  origin: PlanOrigin;
  /** YYYY-MM-DD, always inside the season. */
  date: string;
  /** "HH:MM" when the source gives it, else null. */
  time: string | null;
  /** False when the source says the time is not confirmed yet. */
  timeConfirmed: boolean;
  title: string;
  place: string | null;
  /** Second line: competition, plan, note. */
  detail: string | null;
  /** Left bar colour (team colour for matches). */
  color: string;
  /** Internal page with the details, or null. */
  href: string | null;
  /** True for federal deadlines (FIGC/LND/SGS). */
  federal: boolean;
}

export const KIND_COLOR: Readonly<Record<"evento" | "scadenza-club" | "scadenza-federale", string>> = {
  evento: "#c79a00",
  "scadenza-club": "#0860a8",
  "scadenza-federale": "#a3241b",
};

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Official matches of the season. `colorOf` gives the readable team colour. */
export function matchItems(
  events: readonly PublicEvent[],
  groups: readonly PublicGroup[],
  colorOf: (groupId: string) => string = () => "#0860a8",
  season: { from: string; to: string } = SEASON,
): PlanItem[] {
  const byId = new Map(groups.map((g) => [g.id, g]));
  return events
    .filter((e) => inSeason(e.date, season))
    .map((e) => {
      const g = byId.get(e.group);
      const team = `ColicoDerviese ${groupShort(g, e.category || "")}`.trim();
      const kindLabel = e.type ? titleCase(e.type) : "Gara";
      const round = e.round ? ` · ${e.round}` : "";
      return {
        id: `gara:${e.id || `${e.date}-${e.group}-${e.opponent}`}`,
        kind: "gara" as const,
        origin: "calendario" as const,
        date: e.date,
        time: HHMM.test(e.time) ? e.time : null,
        timeConfirmed: e.timeConfirmed,
        title: matchTitle({ homeAway: e.homeAway, opponent: opponentLabel(e.opponent) }, team),
        place: e.venue ? venueCase(e.venue) : null,
        detail: `${kindLabel}${round}`,
        color: colorOf(e.group),
        href: "/calendario",
        federal: false,
      };
    });
}

/** Tournaments and club events with a certain date; undated editions are returned apart. */
export function eventItems(
  tournaments: readonly TournamentEdition[],
  clubEvents: readonly ClubEvent[],
  season: { from: string; to: string } = SEASON,
): { dated: PlanItem[]; undated: TournamentEdition[] } {
  const dated: PlanItem[] = [];
  const undated: TournamentEdition[] = [];
  for (const t of tournaments) {
    if (!t.date || !ISO_DAY.test(t.date)) {
      undated.push(t);
      continue;
    }
    if (!inSeason(t.date, season)) continue;
    const confirm = t.status === "DATE_DA_CONFERMARE" ? " · date da confermare" : "";
    dated.push({
      id: `torneo:${t.id}`,
      kind: "evento",
      origin: "tornei",
      date: t.date,
      time: null,
      timeConfirmed: false,
      title: t.name,
      place: t.place,
      detail: `${t.section}${t.when ? ` · ${t.when}` : ""}${confirm}`,
      color: KIND_COLOR.evento,
      href: t.link ? t.link.to : "/eventi",
      federal: false,
    });
  }
  // Club events already listed as a tournament on the same day and page are the same thing: kept once.
  for (const e of clubEvents) {
    if (!inSeason(e.date, season)) continue;
    if (dated.some((d) => d.date === e.date && d.href === e.href)) continue;
    dated.push({
      id: `evento:${e.id}`,
      kind: "evento",
      origin: "tornei",
      date: e.date,
      time: null,
      timeConfirmed: false,
      title: e.title,
      place: null,
      detail: e.when,
      color: KIND_COLOR.evento,
      href: e.href,
      federal: false,
    });
  }
  return { dated, undated };
}

const PLAN_LABEL: Readonly<Record<string, string>> = { UNICA: "unica soluzione", "2 RATE": "2 rate", "3 RATE": "3 rate" };

/** Fee instalment days decided by the Direzione Generale: one row per day, with every plan that falls due. */
export function feeItems(
  deadlines: Readonly<Record<string, readonly string[]>> | undefined,
  season: { from: string; to: string } = SEASON,
): PlanItem[] {
  if (!deadlines) return [];
  const byDay = new Map<string, string[]>();
  for (const [plan, days] of Object.entries(deadlines)) {
    days.forEach((day, i) => {
      if (!inSeason(day, season)) return;
      const label = PLAN_LABEL[plan] ?? plan.toLowerCase();
      const part = days.length === 1 ? label : `${i + 1}ª rata di ${label}`;
      byDay.set(day, [...(byDay.get(day) ?? []), part]);
    });
  }
  return [...byDay.entries()].map(([day, parts]) => ({
    id: `quote:${day}`,
    kind: "scadenza" as const,
    origin: "quote" as const,
    date: day,
    time: null,
    timeConfirmed: false,
    title: "Quote stagione: scadenza",
    place: null,
    detail: parts.join(" · "),
    color: KIND_COLOR["scadenza-club"],
    href: "/tesoreria/quote",
    federal: false,
  }));
}

/** C.U. n.18 SGS deadlines for the club's target level. */
export function sgsItems(deadlines: readonly DeadlineView[], season: { from: string; to: string } = SEASON): PlanItem[] {
  return deadlines
    .filter((d) => inSeason(d.date, season))
    .map((d) => ({
      id: `sgs:${d.id}`,
      kind: "scadenza" as const,
      origin: "sgs" as const,
      date: d.date,
      time: null,
      timeConfirmed: false,
      title: d.label,
      place: null,
      detail: d.note ? `SGS · ${d.note}` : "SGS · C.U. n.18",
      color: KIND_COLOR["scadenza-federale"],
      href: "/gestionale/organigramma",
      federal: true,
    }));
}

const FEDERAL_ENTITY = /\b(FIGC|LND|SGS|CRL|C\.?R\.?L\.?|FEDERAZ)/i;

/** Cervellone deadlines (scd_kb_items.scadenza) inside the season. */
export function knowledgeItems(items: readonly KbItem[], season: { from: string; to: string } = SEASON): PlanItem[] {
  const out: PlanItem[] = [];
  for (const k of items) {
    const day = k.due?.slice(0, 10) ?? "";
    if (!inSeason(day, season)) continue;
    const federal = FEDERAL_ENTITY.test(k.entity ?? "");
    out.push({
      id: `kb:${k.id}`,
      kind: "scadenza",
      origin: "cervellone",
      date: day,
      time: null,
      timeConfirmed: false,
      title: k.title,
      place: null,
      detail: [k.entity, k.status].filter(Boolean).join(" · ") || null,
      color: federal ? KIND_COLOR["scadenza-federale"] : KIND_COLOR["scadenza-club"],
      href: "/direzione/cervellone",
      federal,
    });
  }
  return out;
}

/* ------------------------------------------------------------------ aggregation */

export const PLAN_FILTERS = ["tutto", "gare", "eventi", "scadenze"] as const;
export type PlanFilter = (typeof PLAN_FILTERS)[number];

export const FILTER_LABEL: Readonly<Record<PlanFilter, string>> = {
  tutto: "Tutto",
  gare: "Gare",
  eventi: "Tornei ed eventi",
  scadenze: "Scadenze",
};

const FILTER_KIND: Readonly<Record<Exclude<PlanFilter, "tutto">, PlanKind>> = { gare: "gara", eventi: "evento", scadenze: "scadenza" };

export function isPlanFilter(v: unknown): v is PlanFilter {
  return typeof v === "string" && (PLAN_FILTERS as readonly string[]).includes(v);
}

const KIND_ORDER: Readonly<Record<PlanKind, number>> = { scadenza: 0, evento: 1, gara: 2 };

/** One ordered list: by day, then deadlines and events before timed matches, then time, then title. Duplicate ids kept once. */
export function mergePlan(...lists: readonly (readonly PlanItem[])[]): PlanItem[] {
  const seen = new Set<string>();
  const out: PlanItem[] = [];
  for (const l of lists)
    for (const it of l) {
      if (seen.has(it.id)) continue;
      seen.add(it.id);
      out.push(it);
    }
  return out.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      KIND_ORDER[a.kind] - KIND_ORDER[b.kind] ||
      (a.time ?? "").localeCompare(b.time ?? "") ||
      a.title.localeCompare(b.title, "it"),
  );
}

export function filterPlan(items: readonly PlanItem[], filter: PlanFilter): PlanItem[] {
  if (filter === "tutto") return [...items];
  const kind = FILTER_KIND[filter];
  return items.filter((i) => i.kind === kind);
}

export interface MonthCounts {
  key: string;
  /** null: the official calendar does not cover this month yet (unpublished phase), unknown rather than zero. */
  gare: number | null;
  eventi: number;
  scadenze: number;
}

/** First and last month with an official match: outside it the calendar is not published (or not readable). */
export interface CalendarCoverage {
  from: string;
  to: string;
}

export function calendarCoverage(items: readonly PlanItem[]): CalendarCoverage | null {
  const months = items.filter((i) => i.kind === "gara").map((i) => i.date.slice(0, 7)).sort();
  return months.length ? { from: months[0]!, to: months[months.length - 1]! } : null;
}

export function coversMonth(coverage: CalendarCoverage | null, monthKey: string): boolean {
  return coverage !== null && monthKey >= coverage.from && monthKey <= coverage.to;
}

/** Per-month counts for the month strip. Matches outside the calendar coverage are unknown (null), never 0. */
export function monthCounts(
  items: readonly PlanItem[],
  months: readonly SeasonMonth[] = seasonMonths(),
  coverage: CalendarCoverage | null = calendarCoverage(items),
): MonthCounts[] {
  return months.map((m) => {
    const inMonth = items.filter((i) => i.date.startsWith(m.key));
    return {
      key: m.key,
      gare: coversMonth(coverage, m.key) ? inMonth.filter((i) => i.kind === "gara").length : null,
      eventi: inMonth.filter((i) => i.kind === "evento").length,
      scadenze: inMonth.filter((i) => i.kind === "scadenza").length,
    };
  });
}

export interface DayGroup {
  day: string;
  heading: string;
  items: PlanItem[];
}

/** Rows of one month grouped by day, in order. */
export function daysOfMonth(items: readonly PlanItem[], monthKey: string): DayGroup[] {
  const map = new Map<string, PlanItem[]>();
  for (const it of items) {
    if (!it.date.startsWith(monthKey)) continue;
    map.set(it.date, [...(map.get(it.date) ?? []), it]);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, list]) => ({ day, heading: dayHeading(day), items: list }));
}

export const DUE_WINDOW_DAYS = 30;

/** Deadlines from today to today + window (inclusive), nearest first. */
export function upcomingDeadlines(items: readonly PlanItem[], today: string, windowDays = DUE_WINDOW_DAYS): PlanItem[] {
  return items.filter((i) => {
    if (i.kind !== "scadenza") return false;
    const d = daysFrom(today, i.date);
    return d >= 0 && d <= windowDays;
  });
}

export interface SourceState {
  id: PlanOrigin | "lnd";
  label: string;
  /** "collegato": rows come from it; "da collegare": not readable here, the master is named. */
  state: "collegato" | "da collegare";
  /** Master or document that feeds (or will feed) the rows. */
  master: string;
  note: string | null;
}

export interface PlanKpis {
  /** Official matches of the season in the connected calendar; null when the calendar is not readable. */
  matches: number | null;
  events: number;
  /** Deadlines in the next 30 days from the connected sources. */
  dueSoon: number;
  /** True when at least one deadline source is "da collegare": the count is partial. */
  duePartial: boolean;
}

export interface PlanInput {
  today: string;
  calendar: { events: readonly PublicEvent[]; groups: readonly PublicGroup[]; sourceModifiedAt: string; origin: string } | null;
  colorOf?: (groupId: string) => string;
  tournaments: readonly TournamentEdition[];
  clubEvents: readonly ClubEvent[];
  feeDeadlines: Readonly<Record<string, readonly string[]>> | undefined;
  sgs: { deadlines: readonly DeadlineView[]; level: number } | null;
  /** null: Cervellone not connected for this session. */
  knowledge: readonly KbItem[] | null;
}

export interface SeasonPlan {
  items: PlanItem[];
  undatedEvents: TournamentEdition[];
  months: SeasonMonth[];
  counts: MonthCounts[];
  /** Months covered by the official calendar; null when no match could be read. */
  coverage: CalendarCoverage | null;
  kpis: PlanKpis;
  sources: SourceState[];
}

const CALENDAR_ORIGIN_NOTE: Readonly<Record<string, string>> = {
  mirror: "copia validata dal Drive",
  stale: "ultima copia validata dal Drive",
  fallback: "copia di sicurezza inclusa nell'app",
};

/** Whole season plan from the sources the page could read. */
export function buildSeasonPlan(input: PlanInput): SeasonPlan {
  const matches = input.calendar ? matchItems(input.calendar.events, input.calendar.groups, input.colorOf) : [];
  const { dated, undated } = eventItems(input.tournaments, input.clubEvents);
  const fees = feeItems(input.feeDeadlines);
  const sgs = input.sgs ? sgsItems(input.sgs.deadlines) : [];
  const kb = input.knowledge ? knowledgeItems(input.knowledge) : [];
  const items = mergePlan(matches, dated, fees, sgs, kb);
  const months = seasonMonths();
  const coverage = calendarCoverage(matches);

  const sources: SourceState[] = [
    {
      id: "calendario",
      label: "Gare ufficiali",
      state: input.calendar ? "collegato" : "da collegare",
      master: "Master Calendario 2026/27",
      note: input.calendar ? CALENDAR_ORIGIN_NOTE[input.calendar.origin] ?? null : null,
    },
    { id: "tornei", label: "Tornei ed eventi", state: "collegato", master: "Master Tornei & Iniziative", note: "solo tornei ed eventi già pubblicati nell'app" },
    { id: "quote", label: "Scadenze quote", state: fees.length ? "collegato" : "da collegare", master: "Decisione Direzione Generale 08/10/2026 (quote 2026/27)", note: null },
    {
      id: "sgs",
      label: "Scadenze federali SGS",
      state: input.sgs ? "collegato" : "da collegare",
      master: "C.U. n.18 SGS · Manuale Sistema di Qualità 2026",
      note: input.sgs ? `livello ${input.sgs.level}` : null,
    },
    {
      id: "cervellone",
      label: "Scadenze del club (Cervellone)",
      state: input.knowledge ? "collegato" : "da collegare",
      master: "SCD CERVELLONE · Catalogo e Memoria (Drive)",
      note: input.knowledge ? "da 30 giorni fa in poi" : "serve l'accesso con un ruolo d'ufficio",
    },
    {
      id: "lnd",
      label: "Scadenze LND / CRL (iscrizioni, tesseramenti)",
      state: "da collegare",
      master: "Comunicati Ufficiali CRL Lombardia",
      note: "non ancora riportate nell'app",
    },
  ];

  return {
    items,
    undatedEvents: undated,
    months,
    counts: monthCounts(items, months, coverage),
    coverage,
    kpis: {
      matches: input.calendar ? matches.length : null,
      events: dated.length,
      dueSoon: upcomingDeadlines(items, input.today).length,
      duePartial: !input.knowledge || !input.sgs,
    },
    sources,
  };
}

/** Previous / next month key inside the season, or null at the edges. */
export function stepMonth(key: string, delta: -1 | 1, months: readonly SeasonMonth[] = seasonMonths()): string | null {
  const i = months.findIndex((m) => m.key === key);
  if (i < 0) return null;
  return months[i + delta]?.key ?? null;
}

export function monthLabel(key: string, months: readonly SeasonMonth[] = seasonMonths()): string {
  const m = months.find((x) => x.key === key);
  return m ? `${m.label} ${m.year}` : key;
}
