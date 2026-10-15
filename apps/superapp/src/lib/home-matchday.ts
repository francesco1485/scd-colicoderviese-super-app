/**
 * "Questa settimana" — the Matchday block of the public home (UD-132, Francesco 14/10/2026: a short home that pushes
 * ragazzi and families to live the app). Pure functions over the games the home already loads (weekMatches of
 * lib/home-today.ts, same Calendario SCD source as /calendario). No network, no DOM, nothing invented:
 * - the agonistica / attività di base split is the one of lib/universe.ts (teamFromGroup), never guessed from names;
 * - the "in casa a Colico/Dervio" towns come only from the venue the master writes;
 * - an unknown or technical group ("other") is neither agonistica nor base: it shows under "Tutte" only.
 */
import { addDays } from "./board-data";
import type { TodayEntry } from "./home-today";
import type { PublicGroup } from "./public-snapshots";
import { teamFromGroup } from "./universe";

export type MatchdayFilter = "tutte" | "seguite" | "casa" | "agonistica" | "base";

export const MATCHDAY_FILTERS: readonly MatchdayFilter[] = [
  "tutte",
  "seguite",
  "casa",
  "agonistica",
  "base",
];

export const MATCHDAY_FILTER_LABEL: Readonly<Record<MatchdayFilter, string>> = {
  tutte: "Tutte",
  seguite: "Le mie squadre",
  casa: "In casa",
  agonistica: "Agonistica",
  base: "Attività di base",
};

export type MatchdayClass = "agonistica" | "base" | "altra";

/** Technical calendar groups that are not a team of a category. */
const NOT_A_CATEGORY = new Set(["other", ""]);

/** Agonistica or attività di base, from the calendar group id (lib/universe.ts rule). */
export function matchdayClass(groupId: string): MatchdayClass {
  if (NOT_A_CATEGORY.has(groupId)) return "altra";
  return teamFromGroup({ id: groupId, label: groupId, color: "" }).group;
}

export function matchesFilter(
  e: Pick<TodayEntry, "group" | "homeAway">,
  f: MatchdayFilter,
  followed: readonly string[] = [],
): boolean {
  if (f === "tutte") return true;
  if (f === "seguite") return followed.includes(e.group);
  if (f === "casa") return e.homeAway === "CASA";
  return matchdayClass(e.group) === f;
}

export function filterMatchday<
  T extends Pick<TodayEntry, "group" | "homeAway">,
>(entries: readonly T[], f: MatchdayFilter, followed: readonly string[] = []): T[] {
  return entries.filter((e) => matchesFilter(e, f, followed));
}

/** How many games each chip would show (a chip with 0 stays visible and says so). */
export function filterCounts(
  entries: readonly Pick<TodayEntry, "group" | "homeAway">[],
  followed: readonly string[] = [],
): Record<MatchdayFilter, number> {
  const out = { tutte: 0, seguite: 0, casa: 0, agonistica: 0, base: 0 } as Record<
    MatchdayFilter,
    number
  >;
  for (const f of MATCHDAY_FILTERS) out[f] = filterMatchday(entries, f, followed).length;
  return out;
}

export interface MatchdayDay<T> {
  date: string;
  entries: T[];
}

/** Games grouped by Rome day, days in calendar order, games in the order given (weekMatches sorts by time). */
export function groupByDay<T extends Pick<TodayEntry, "date">>(
  entries: readonly T[],
): MatchdayDay<T>[] {
  const map = new Map<string, T[]>();
  for (const e of entries) {
    const list = map.get(e.date);
    if (list) list.push(e);
    else map.set(e.date, [e]);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, list]) => ({ date, entries: list }));
}

const TOWN = /\b(colico|dervio)\b/i;

/** "Colico" / "Dervio" when the venue names one of our two towns, otherwise "". */
export function homeTown(venue: string): string {
  const m = venue.match(TOWN);
  if (!m) return "";
  const t = m[1]!.toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export interface MatchdaySummary {
  games: number;
  home: number;
  /** Our towns named by the venues of the home games, Colico first. */
  towns: string[];
}

export function matchdaySummary(
  entries: readonly Pick<TodayEntry, "homeAway" | "place">[],
): MatchdaySummary {
  const homeGames = entries.filter((e) => e.homeAway === "CASA");
  const towns = [
    ...new Set(homeGames.map((e) => homeTown(e.place)).filter(Boolean)),
  ].sort((a, b) =>
    a === "Colico" ? -1 : b === "Colico" ? 1 : a.localeCompare(b),
  );
  return { games: entries.length, home: homeGames.length, towns };
}

/** "8 gare · 4 in casa a Colico", "1 gara · nessuna in casa", "" with no games. */
export function matchdaySummaryLine(s: MatchdaySummary): string {
  if (s.games === 0) return "";
  const games = s.games === 1 ? "1 gara" : `${s.games} gare`;
  if (s.home === 0) return `${games} · nessuna in casa`;
  const where = s.towns.length ? ` a ${s.towns.join(" e ")}` : "";
  return `${games} · ${s.home} in casa${where}`;
}

const WEEKDAY = new Intl.DateTimeFormat("it-IT", {
  timeZone: "UTC",
  weekday: "long",
});

/** "Sabato 17"; today and tomorrow are named first: "Oggi · Giovedì 15", "Domani · Venerdì 16". */
export function matchdayDayLabel(date: string, today: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  const wd = WEEKDAY.format(d);
  const base = `${wd.charAt(0).toUpperCase()}${wd.slice(1)} ${d.getUTCDate()}`;
  if (date === today) return `Oggi · ${base}`;
  if (date === addDays(today, 1)) return `Domani · ${base}`;
  return base;
}

/** Short category name for the pill ("U19", "Esordienti 2014", "Primi Calci"), from the master label. */
export function categoryShort(
  groupId: string,
  groups: readonly Pick<PublicGroup, "id" | "label" | "color">[],
  fallback: string,
): string {
  const g = groups.find((x) => x.id === groupId);
  if (!g) return fallback.split("·")[0]!.trim() || "Gara";
  return teamFromGroup(g).short;
}

/** Category colour from the master (same colour on every row of the same team); neutral when unknown. */
export function categoryColor(
  groupId: string,
  groups: readonly Pick<PublicGroup, "id" | "color">[],
): string {
  return groups.find((x) => x.id === groupId)?.color ?? "#668196";
}
