/**
 * Pure logic of the public "Calendario live" page (board VR-009, screen 2 "CALENDARIO LIVE", improved with the store
 * app patterns: IERI / OGGI / DOMANI strip, followed teams first, live minute during a game, stacked crests).
 * No network, no invented data: every value comes from the validated public calendar (PublicEvent / PublicGroup).
 * Tested in calendario-live.test.ts.
 */
import { addDays } from "./board-data";
import type { PublicEvent, PublicGroup } from "./public-snapshots";
import { MATCH_MINUTES, startMs } from "./universe";

/* ------------------------------------------------------------------ IERI / OGGI / DOMANI */

export const DAY_VIEWS = ["ieri", "oggi", "domani"] as const;
export type DayView = (typeof DAY_VIEWS)[number];

const DAY_OFFSET: Record<DayView, number> = { ieri: -1, oggi: 0, domani: 1 };
const DAY_LABEL: Record<DayView, string> = {
  ieri: "Ieri",
  oggi: "Oggi",
  domani: "Domani",
};

export const isDayView = (v: unknown): v is DayView =>
  (DAY_VIEWS as readonly unknown[]).includes(v);

/** The three day tabs around `today` (Europe/Rome date), each with its ISO date. */
export function dayStrip(
  today: string,
): { key: DayView; label: string; date: string }[] {
  return DAY_VIEWS.map((key) => ({
    key,
    label: DAY_LABEL[key],
    date: addDays(today, DAY_OFFSET[key]),
  }));
}

/** ISO date of a day tab. */
export function dayOf(view: DayView, today: string): string {
  return addDays(today, DAY_OFFSET[view]);
}

/** Games on one date, in kick-off order (events without time last). */
export function gamesOn(
  events: readonly PublicEvent[],
  date: string,
): PublicEvent[] {
  return events
    .filter((e) => e.date === date)
    .sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99"));
}

/** First date strictly after `from` with at least one game (for the empty-day hint); null when none is left. */
export function nextGameDay(
  events: readonly PublicEvent[],
  from: string,
): string | null {
  let best: string | null = null;
  for (const e of events)
    if (e.date > from && (best === null || e.date < best)) best = e.date;
  return best;
}

/** Last date strictly before `from` with at least one game; null when none. */
export function previousGameDay(
  events: readonly PublicEvent[],
  from: string,
): string | null {
  let best: string | null = null;
  for (const e of events)
    if (e.date < from && (best === null || e.date > best)) best = e.date;
  return best;
}

/* ------------------------------------------------------------------ live minute */

export type MatchClock =
  | { state: "unknown"; minute: null; label: string }
  | { state: "next"; minute: null; label: string }
  | { state: "live"; minute: number; label: string }
  | { state: "done"; minute: null; label: string };

/**
 * Where a game stands now, from its calendar kick-off (Europe/Rome). The live minute counts the minutes since the
 * scheduled kick-off (1' in the first minute) and stops at "90'+": it is a clock, not a match feed, so no score
 * and no half-time are ever implied. Without a time the state is unknown (never "live").
 */
export function matchClock(
  e: Pick<PublicEvent, "date" | "time">,
  nowMs: number,
): MatchClock {
  const s = startMs(e);
  if (s === null)
    return { state: "unknown", minute: null, label: "Orario da definire" };
  if (nowMs < s) return { state: "next", minute: null, label: e.time };
  const elapsed = nowMs - s;
  if (elapsed >= MATCH_MINUTES * 60_000)
    return { state: "done", minute: null, label: "Terminata" };
  const minute = Math.floor(elapsed / 60_000) + 1;
  return { state: "live", minute, label: minute > 90 ? "90'+" : `${minute}'` };
}

/** True when at least one game is being played now (drives the red "In campo ora" banner). */
export function liveGames(
  events: readonly PublicEvent[],
  nowMs: number,
): PublicEvent[] {
  return events.filter((e) => matchClock(e, nowMs).state === "live");
}

/** The next game still to start (kick-off known, after now), for the countdown. */
export function nextKickoff(
  events: readonly PublicEvent[],
  nowMs: number,
  rank: (e: PublicEvent) => number = () => 0,
): { e: PublicEvent; startMs: number } | null {
  // Most important first (Francesco 15/10 07:04: Prima Squadra before a Primi Calci game "da confermare"), then
  // the earliest kick-off.
  let best: { e: PublicEvent; startMs: number } | null = null;
  for (const e of events) {
    const s = startMs(e);
    if (s === null || s <= nowMs) continue;
    if (
      best === null ||
      rank(e) < rank(best.e) ||
      (rank(e) === rank(best.e) && s < best.startMs)
    )
      best = { e, startMs: s };
  }
  return best;
}

/** Importance of a calendar game for the countdown: Prima Squadra, agonistica, base; confirmed before pending. */
export function eventRank(
  e: Pick<PublicEvent, "group" | "timeConfirmed" | "venueConfirmed">,
  agonistica: (g: string) => boolean,
): number {
  const level = e.group === "prima" ? 0 : agonistica(e.group) ? 1 : 2;
  return level * 2 + (e.timeConfirmed && e.venueConfirmed ? 0 : 1);
}

/* ------------------------------------------------------------------ type icon */

export type GameIcon = "ball" | "trophy";

/** Round icon of a row: the ball for a match (campionato, amichevole), the trophy for cups and tournaments. */
export function gameIcon(type: string): GameIcon {
  return /^(TORNEO|COPPA)$/i.test(type.trim()) ? "trophy" : "ball";
}

/** Short label of the game type shown before the title ("Coppa · …"); empty for the league. */
export function typePrefix(type: string): string {
  const t = type.trim();
  if (!t || /^CAMPIONATO$/i.test(t)) return "";
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

/* ------------------------------------------------------------------ followed teams ("Le mie squadre") */

export const FOLLOW_KEY = "scd.calendario.seguite.v1";
const ID_RE = /^[a-z0-9_-]{1,40}$/i;
const MAX_FOLLOWED = 12;

/** Followed group ids from the stored JSON: only short ids, no duplicates, at most 12. Anything else → []. */
export function parseFollowed(raw: string | null | undefined): string[] {
  if (!raw) return [];
  let v: unknown;
  try {
    v = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const x of v)
    if (typeof x === "string" && ID_RE.test(x) && !out.includes(x)) out.push(x);
  return out.slice(0, MAX_FOLLOWED);
}

type ReadStore = Pick<Storage, "getItem">;
type WriteStore = Pick<Storage, "setItem">;

/** Reads the followed teams; a blocked or missing storage (private window, preview) gives []. */
export function readFollowed(store: ReadStore | null | undefined): string[] {
  try {
    return parseFollowed(store?.getItem(FOLLOW_KEY));
  } catch {
    return [];
  }
}

/** Saves the followed teams; false when the storage refuses (the choice then lives only in memory). */
export function writeFollowed(
  store: WriteStore | null | undefined,
  ids: readonly string[],
): boolean {
  if (!store) return false;
  try {
    store.setItem(
      FOLLOW_KEY,
      JSON.stringify(parseFollowed(JSON.stringify(ids))),
    );
    return true;
  } catch {
    return false;
  }
}

/** Adds or removes a team (newly followed teams go last, so the order is the order of choice). */
export function toggleFollowed(ids: readonly string[], id: string): string[] {
  if (!ID_RE.test(id)) return [...ids];
  return ids.includes(id)
    ? ids.filter((x) => x !== id)
    : [...ids, id].slice(0, MAX_FOLLOWED);
}

/** Groups with games, followed teams first (in the order chosen), then the others in calendar order. */
export function followedFirst<G extends Pick<PublicGroup, "id" | "count">>(
  groups: readonly G[],
  followed: readonly string[],
): G[] {
  const withGames = groups.filter((g) => g.count > 0);
  const mine = followed
    .map((id) => withGames.find((g) => g.id === id))
    .filter((g): g is G => !!g);
  return [...mine, ...withGames.filter((g) => !followed.includes(g.id))];
}

/** Next game of each followed team (game not over yet), sorted by date and time; teams without games are left out. */
export function nextForFollowed(
  events: readonly PublicEvent[],
  followed: readonly string[],
  nowMs: number,
): PublicEvent[] {
  const today = todayOf(nowMs);
  const ahead = (x: PublicEvent) => {
    const s = matchClock(x, nowMs).state;
    return s === "next" || s === "live" || (s === "unknown" && x.date >= today);
  };
  const out: PublicEvent[] = [];
  for (const id of followed) {
    const e = events.find((x) => x.group === id && ahead(x));
    if (e) out.push(e);
  }
  return out.sort((a, b) =>
    (a.date + (a.time || "99:99")).localeCompare(b.date + (b.time || "99:99")),
  );
}

/** Europe/Rome calendar date of an instant. */
export function todayOf(nowMs: number): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(nowMs));
}
