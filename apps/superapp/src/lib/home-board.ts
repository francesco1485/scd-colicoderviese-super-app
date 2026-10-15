/**
 * Pure helpers of the board-faithful public home (VR-009 "Home pubblica", Francesco 15/10/2026 06:30: "tutto deve
 * partire dallo studio di questa immagine"). No network, no invented data: everything comes from the same calendar
 * entries as /calendario. Tested in home-board.test.ts.
 */
import type { TodayEntry } from "./home-today";
import { itemState } from "./universe";

const WD = ["DOM", "LUN", "MAR", "MER", "GIO", "VEN", "SAB"] as const;
const MO = [
  "GEN",
  "FEB",
  "MAR",
  "APR",
  "MAG",
  "GIU",
  "LUG",
  "AGO",
  "SET",
  "OTT",
  "NOV",
  "DIC",
] as const;

/** "2026-10-18" → { wd: "DOM", day: "18", month: "OTT" }; invalid → null. */
export function boardDate(
  iso: string,
): { wd: string; day: string; month: string } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
  const d = new Date(t);
  if (Number.isNaN(t) || d.getUTCDate() !== Number(m[3])) return null;
  return {
    wd: WD[d.getUTCDay()] ?? "",
    day: String(d.getUTCDate()),
    month: MO[d.getUTCMonth()] ?? "",
  };
}

/**
 * The "Prossima gara" of the board: the first game of the week that is not over yet (live counts as next).
 * Entries are already in date/time order (weekMatches). Null when the week has no game left.
 */
export function nextBoardMatch(
  entries: readonly TodayEntry[],
  nowMs: number,
  rank: (e: TodayEntry) => number = () => 0,
): TodayEntry | null {
  const open = entries.filter(
    (e) => e.kind === "gara" && itemState(e, nowMs) !== "done",
  );
  if (open.length === 0) return null;
  // Most important first (lower rank), then earliest (entries are already in date/time order).
  let best = open[0] as TodayEntry;
  for (const e of open) if (rank(e) < rank(best)) best = e;
  return best;
}

/**
 * Importance of a game for the public home (Francesco 15/10/2026 07:04: "fuori ogni logica" — a Primi Calci away game
 * "da confermare" as the club's next match): Prima Squadra, then the other agonistica teams, then attività di base;
 * a confirmed time and venue beats a pending one inside the same level.
 */
export function boardRank(
  e: Pick<TodayEntry, "group" | "pending">,
  agonistica: (group: string) => boolean,
): number {
  const level = e.group === "prima" ? 0 : agonistica(e.group) ? 1 : 2;
  return level * 2 + (e.pending.length > 0 ? 1 : 0);
}

/** Games of the week still to play. Utility kept for other screens: the public home no longer shows a counter (cleanup 15/10/2026). */
export function gamesLeft(
  entries: readonly TodayEntry[],
  nowMs: number,
): number {
  return entries.filter(
    (e) => e.kind === "gara" && itemState(e, nowMs) !== "done",
  ).length;
}

/** Kick-off in ms of an entry with a time (Europe/Rome, DST-aware via the Intl offset of that day). */
export function kickoffMs(e: Pick<TodayEntry, "date" | "time">): number | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(e.date);
  const t = /^(\d{1,2}):(\d{2})$/.exec(e.time);
  if (!d || !t) return null;
  const guess = Date.UTC(
    Number(d[1]),
    Number(d[2]) - 1,
    Number(d[3]),
    Number(t[1]),
    Number(t[2]),
  );
  const rome = new Date(
    new Date(guess).toLocaleString("en-US", { timeZone: "Europe/Rome" }),
  );
  const utc = new Date(
    new Date(guess).toLocaleString("en-US", { timeZone: "UTC" }),
  );
  return guess - (rome.getTime() - utc.getTime());
}

/** The next home game of the week with a known time still to start. */
export function nextHomeKickoff(
  entries: readonly TodayEntry[],
  nowMs: number,
): { entry: TodayEntry; startMs: number } | null {
  for (const e of entries) {
    if (e.kind !== "gara" || e.homeAway !== "CASA") continue;
    const start = kickoffMs(e);
    if (start !== null && start > nowMs) return { entry: e, startMs: start };
  }
  return null;
}

/** Remaining ms → days and zero-padded hh:mm:ss (never negative). */
export function countdownParts(ms: number): {
  days: number;
  hh: string;
  mm: string;
  ss: string;
} {
  const s = Math.max(0, Math.floor(ms / 1000));
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    days: Math.floor(s / 86400),
    hh: pad(Math.floor((s % 86400) / 3600)),
    mm: pad(Math.floor((s % 3600) / 60)),
    ss: pad(s % 60),
  };
}
