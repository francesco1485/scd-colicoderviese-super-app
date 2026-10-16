/**
 * Week board of the public home ("In campo questa settimana"): the games of every team in the next seven days, grouped
 * by day. Pure functions on the public
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
