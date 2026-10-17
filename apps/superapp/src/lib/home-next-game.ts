/**
 * Next game of the club and the countdown to it, from the public calendar snapshot (the same events as the home
 * strip and the calendar page; no other source). Used by the home «Prossima gara» card (I-261017-04) and the desktop
 * side column. Times are Europe/Rome wall clock.
 */
import { romeToIso } from "@/lib/home-week";
import type { PublicEvent } from "@/lib/public-snapshots";

/** Rome wall-clock date + time → epoch ms (DST-safe, same helper as the calendar). */
export function romeMs(date: string, time: string): number {
  return Date.parse(romeToIso(date, time));
}

/** "tra 2 giorni e 3 ore" / "tra 4 ore e 10 minuti" / "tra 12 minuti". */
export function countdownLabel(ms: number): string {
  const min = Math.max(0, Math.floor(ms / 60_000));
  const d = Math.floor(min / 1440);
  const h = Math.floor((min % 1440) / 60);
  const m = min % 60;
  const n = (v: number, one: string, many: string) => `${v} ${v === 1 ? one : many}`;
  if (d > 0) return `tra ${n(d, "giorno", "giorni")}${h ? ` e ${n(h, "ora", "ore")}` : ""}`;
  if (h > 0) return `tra ${n(h, "ora", "ore")}${m ? ` e ${n(m, "minuto", "minuti")}` : ""}`;
  return `tra ${n(m, "minuto", "minuti")}`;
}

/** Countdown split for the digit tiles: whole days, hours and minutes left (never negative). */
export function countdownParts(ms: number): { d: number; h: number; m: number } {
  const min = Math.max(0, Math.floor(ms / 60_000));
  return { d: Math.floor(min / 1440), h: Math.floor((min % 1440) / 60), m: min % 60 };
}

/** Next home game with a time, from the public calendar. */
export function nextHome(events: readonly PublicEvent[], nowMs: number): { e: PublicEvent; at: number } | null {
  const n = nextGame(events, nowMs, { homeOnly: true, horizonDays: Infinity });
  return n && n.hasTime ? { e: n.e, at: n.at } : null;
}

export type NextGame = {
  e: PublicEvent;
  /** Kick-off in epoch ms (Rome wall clock); start of the day when the time is not known. */
  at: number;
  hasTime: boolean;
  /** Other games of the club at the same date and time. */
  sameSlot: number;
};

/**
 * Next game of the club (home or away) from the public calendar, within `horizonDays` (default 14).
 * Games without a time count until the end of their Rome day and sort at the start of it.
 * With `homeOnly` only games in casa with a time are considered (the old nextHome behaviour).
 */
export function nextGame(
  events: readonly PublicEvent[],
  nowMs: number,
  { homeOnly = false, horizonDays = 14 }: { homeOnly?: boolean; horizonDays?: number } = {},
): NextGame | null {
  const limit = nowMs + horizonDays * 86_400_000;
  let best: { e: PublicEvent; at: number; hasTime: boolean } | null = null;
  for (const e of events) {
    if (homeOnly && (e.homeAway !== "CASA" || !e.time)) continue;
    const hasTime = /^\d{2}:\d{2}$/.test(e.time);
    const at = romeMs(e.date, hasTime ? e.time : "00:00");
    const stillOn = hasTime ? at > nowMs : romeMs(e.date, "23:59") > nowMs;
    if (!stillOn || at > limit) continue;
    if (!best || at < best.at || (at === best.at && hasTime && !best.hasTime)) best = { e, at, hasTime };
  }
  if (!best) return null;
  const b = best;
  const sameSlot = events.filter((x) => x !== b.e && x.date === b.e.date && x.time === b.e.time && (!homeOnly || x.homeAway === "CASA")).length;
  return { ...b, sameSlot };
}
