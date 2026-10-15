/**
 * The club's pulse for the public chrome (study of 15/10/2026, block A action 1 and C11): is a game being played
 * now, and what is the next important kick-off? Shown as a thin "Prossimo appuntamento" strip under the header of
 * the public pages (not on the home or the calendar, which already show it) and as a LIVE badge on the Calendario
 * tab of the phone bar. Same data and rules as the home: weekMatches + boardRank + kickoffMs. Pure, tested.
 */
import { boardRank, kickoffMs, nextBoardMatch } from "./home-board";
import { categoryShort, matchdayClass } from "./home-matchday";
import { weekMatches } from "./home-today";
import type { PublicEvent, PublicGroup } from "./public-snapshots";
import { romeDay } from "./public-window";
import { itemState } from "./universe";

export interface ClubPulse {
  /** Games being played right now (public calendar). */
  live: number;
  /** The club's most important next game with a known kick-off, or null. */
  next: {
    id: string;
    group: string;
    category: string;
    opponent: string;
    homeAway: "CASA" | "FUORI" | "";
    startMs: number;
  } | null;
  serverNow: number;
}

export function clubPulse(
  events: readonly PublicEvent[],
  groups: readonly PublicGroup[],
  nowMs: number,
): ClubPulse {
  const week = weekMatches(events, groups, romeDay(nowMs), null);
  const live = week.filter(
    (e) => e.kind === "gara" && itemState(e, nowMs) === "live",
  ).length;
  // Only games still to start (a live one is on the badge, not in the countdown).
  const upcoming = week.filter(
    (e) => e.kind === "gara" && itemState(e, nowMs) !== "live",
  );
  const m = nextBoardMatch(upcoming, nowMs, (e) =>
    boardRank(e, (g) => matchdayClass(g) === "agonistica"),
  );
  const startMs = m ? kickoffMs(m) : null;
  return {
    live,
    next:
      m && startMs !== null && startMs > nowMs
        ? {
            id: m.id,
            group: m.group,
            category: categoryShort(m.group, groups, m.team),
            opponent: m.opponent,
            homeAway: m.homeAway,
            startMs,
          }
        : null,
    serverNow: nowMs,
  };
}

/** "2g 4h", "4h 12m", "12m": compact time left for the strip. */
export function compactLeft(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}g ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
