/**
 * Week board of the public home (Francesco 15/10/2026 21:35 «avevo detto che bisogna cambiare idea di grafica»;
 * 19:20 phone boards VR-025 «voglio questo, riprodurre questo e basta in tutto»).
 *
 * The home opens on the week of every team, in the style of the Calendario board: a week strip with the chosen day in
 * the blue circle, pill filters, games grouped by day as white rows with the coloured bar. Pure functions on the public
 * calendar only (no trainings for visitors, UD-100; no invented data): the component renders what these return.
 */
import { addDays } from "./board-data";
import { matchdayClass, type MatchdayFilter } from "./home-matchday";
import type { PublicEvent } from "./public-snapshots";

/** Days of the board: today and the next six. */
export const WEEK_BOARD_DAYS = 7;

/** Filters of the pill row (the board's "Tutti / Gare / …" made real on the data we have). */
export const WEEK_BOARD_FILTERS = ["tutte", "casa", "agonistica", "base"] as const satisfies readonly MatchdayFilter[];
export type WeekBoardFilter = (typeof WEEK_BOARD_FILTERS)[number];

export const WEEK_BOARD_FILTER_LABEL: Readonly<Record<WeekBoardFilter, string>> = {
  tutte: "Tutte",
  casa: "In casa",
  agonistica: "Agonistica",
  base: "Attività di base",
};

const WD_SHORT = ["DOM", "LUN", "MAR", "MER", "GIO", "VEN", "SAB"] as const;
const WD_LONG = ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"] as const;
const MONTHS = [
  "gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno",
  "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre",
] as const;

const parts = (iso: string) => {
  const d = new Date(`${iso}T12:00:00Z`);
  return { wd: d.getUTCDay(), day: d.getUTCDate(), month: d.getUTCMonth() };
};

const kick = (e: Pick<PublicEvent, "date" | "time">) => e.date + (e.time || "99:99");

/** Games from `today` for WEEK_BOARD_DAYS days, in kick-off order (no time = end of the day), then by group. */
export function weekBoardEvents(events: readonly PublicEvent[], today: string): PublicEvent[] {
  const last = addDays(today, WEEK_BOARD_DAYS - 1);
  return events
    .filter((e) => e.date >= today && e.date <= last)
    .sort((a, b) => kick(a).localeCompare(kick(b)) || a.group.localeCompare(b.group) || a.id.localeCompare(b.id));
}

export function matchesWeekFilter(e: Pick<PublicEvent, "group" | "homeAway">, f: WeekBoardFilter): boolean {
  if (f === "tutte") return true;
  if (f === "casa") return e.homeAway === "CASA";
  return matchdayClass(e.group) === f;
}

export interface WeekDay {
  date: string;
  /** "SAB" */
  short: string;
  /** 17 */
  day: number;
  /** Games of that day with the current filter. */
  count: number;
  today: boolean;
}

/** The seven cells of the week strip, with the number of games of each day under the given filter. */
export function weekStrip(events: readonly PublicEvent[], today: string, f: WeekBoardFilter): WeekDay[] {
  const out: WeekDay[] = [];
  for (let i = 0; i < WEEK_BOARD_DAYS; i++) {
    const date = addDays(today, i);
    const p = parts(date);
    out.push({
      date,
      short: WD_SHORT[p.wd]!,
      day: p.day,
      count: events.filter((e) => e.date === date && matchesWeekFilter(e, f)).length,
      today: i === 0,
    });
  }
  return out;
}

export interface WeekGroup {
  date: string;
  label: string;
  events: PublicEvent[];
}

/** Games grouped by day (only days with games), optionally one day only. */
export function weekGroups(
  events: readonly PublicEvent[],
  f: WeekBoardFilter,
  today: string,
  day: string | null = null,
): WeekGroup[] {
  const map = new Map<string, PublicEvent[]>();
  for (const e of events) {
    if (day && e.date !== day) continue;
    if (!matchesWeekFilter(e, f)) continue;
    const list = map.get(e.date);
    if (list) list.push(e);
    else map.set(e.date, [e]);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, list]) => ({ date, label: weekDayLabel(date, today), events: list }));
}

/** "Oggi · giovedì 15 ottobre", "Domani · venerdì 16 ottobre", "Sabato 17 ottobre". */
export function weekDayLabel(date: string, today: string): string {
  const p = parts(date);
  const base = `${WD_LONG[p.wd]} ${p.day} ${MONTHS[p.month]}`;
  if (date === today) return `Oggi · ${base}`;
  if (date === addDays(today, 1)) return `Domani · ${base}`;
  return base.charAt(0).toUpperCase() + base.slice(1);
}

/** "15 – 21 ottobre" or "29 ottobre – 4 novembre". */
export function weekRangeLabel(today: string): string {
  const a = parts(today);
  const b = parts(addDays(today, WEEK_BOARD_DAYS - 1));
  return a.month === b.month
    ? `${a.day} – ${b.day} ${MONTHS[b.month]}`
    : `${a.day} ${MONTHS[a.month]} – ${b.day} ${MONTHS[b.month]}`;
}

/** "1 gara", "6 gare". */
export function gamesLabel(n: number): string {
  return n === 1 ? "1 gara" : `${n} gare`;
}
