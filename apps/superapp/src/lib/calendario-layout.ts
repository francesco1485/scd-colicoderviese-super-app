/**
 * Presentation helpers of the public "Partite" page (/calendario) in the SCD METAL design (Francesco 16/10/2026: the
 * home look «in modo definitivo», then "the same design on the Partite page"). Pure functions, no React, no network:
 * the data still comes from the calendar pipeline (lib/public-snapshots, calendar.functions) unchanged.
 *
 * Colour with purpose (Francesco 16/10/2026 21:54 «cerca di mettere anche altri colori»): one tone per meaning.
 *   home game  → sole (polished gold bar, "In casa" pill with navy text)
 *   away game  → azzurro (brushed blue bar, "Trasferta" pill with white text)
 *   live       → red (the only red on the page)
 */
import { addDays } from "./board-data";
import { romeToIso } from "./home-week";
import type { PublicEvent } from "./public-snapshots";

export type PlaceTone = "casa" | "fuori" | "neutro";

/** Tone of a game row from the calendar home/away flag; an unknown flag stays neutral (never guessed). */
export function placeTone(homeAway: string): PlaceTone {
  if (homeAway === "CASA") return "casa";
  if (homeAway === "FUORI") return "fuori";
  return "neutro";
}

/** Classes per tone: left bar, pill and pill label. Contrast: navy #13254d on sole ≥ 9:1, white on azzurro ≥ 4.9:1. */
export const PLACE_STYLE: Readonly<Record<PlaceTone, { bar: string; pill: string; label: string }>> = {
  casa: {
    bar: "bg-[linear-gradient(180deg,#ffe27a,#e0ab17)]",
    pill: "scd-band-sole text-[#13254d] ring-1 ring-inset ring-[#c99600]/50",
    label: "In casa",
  },
  fuori: {
    bar: "bg-[linear-gradient(180deg,#1f78c8,#0b4f9e)]",
    pill: "scd-band-azzurro text-white",
    label: "Trasferta",
  },
  neutro: {
    bar: "bg-[#c3cee0]",
    pill: "bg-[#eef1f6] text-[#4a5a78]",
    label: "Sede da definire",
  },
};

export interface DayGroup<R> {
  date: string;
  rows: R[];
}

/** Rows already sorted by date+time → consecutive day groups, order kept. */
export function groupByDay<R extends { date: string }>(rows: readonly R[]): DayGroup<R>[] {
  const out: DayGroup<R>[] = [];
  for (const r of rows) {
    const last = out[out.length - 1];
    if (last && last.date === r.date) last.rows.push(r);
    else out.push({ date: r.date, rows: [r] });
  }
  return out;
}

const WD_LONG = ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"] as const;
const MONTHS = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"] as const;

/** Day heading of a group: "Oggi · sabato 17 ottobre", "Domani · …", "Ieri · …" or "Sabato 17 ottobre". */
export function dayHeading(date: string, today: string): { lead: string | null; text: string } {
  const d = new Date(`${date}T12:00:00Z`);
  const text = `${WD_LONG[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
  const lead = date === today ? "Oggi" : date === addDays(today, 1) ? "Domani" : date === addDays(today, -1) ? "Ieri" : null;
  return { lead, text: lead ? text : text.charAt(0).toUpperCase() + text.slice(1) };
}

/** Anchor id of a day group (the week strip scrolls to it). */
export const dayAnchor = (date: string) => `cal-day-${date}`;

export interface WeekCell {
  date: string;
  letter: string;
  day: number;
  games: number;
  home: number;
  isToday: boolean;
}

/** Seven cells (Monday first) from `from`, with the games of each day among `events` and how many are at home. */
export function weekCells(from: string, today: string, events: readonly Pick<PublicEvent, "date" | "homeAway">[]): WeekCell[] {
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(from, i);
    const d = new Date(`${date}T12:00:00Z`);
    const day = events.filter((e) => e.date === date);
    return {
      date,
      letter: "DLMMGVS"[d.getUTCDay()]!,
      day: d.getUTCDate(),
      games: day.length,
      home: day.filter((e) => e.homeAway === "CASA").length,
      isToday: date === today,
    };
  });
}

/** Next home game with a known kick-off after `nowMs` (Rome wall clock, DST-safe). */
export function nextHomeGame<E extends Pick<PublicEvent, "date" | "time" | "homeAway">>(events: readonly E[], nowMs: number): { e: E; at: number } | null {
  let best: { e: E; at: number } | null = null;
  for (const e of events) {
    if (e.homeAway !== "CASA" || !e.time) continue;
    const at = Date.parse(romeToIso(e.date, e.time));
    if (at > nowMs && (!best || at < best.at)) best = { e, at };
  }
  return best;
}

/** "tra 2 giorni e 3 ore" / "tra 4 ore e 10 minuti" / "tra 12 minuti" (calculated from the calendar kick-off). */
export function countdownText(ms: number): string {
  const min = Math.max(0, Math.floor(ms / 60_000));
  const d = Math.floor(min / 1440);
  const h = Math.floor((min % 1440) / 60);
  const m = min % 60;
  const n = (v: number, one: string, many: string) => `${v} ${v === 1 ? one : many}`;
  if (d > 0) return `tra ${n(d, "giorno", "giorni")}${h ? ` e ${n(h, "ora", "ore")}` : ""}`;
  if (h > 0) return `tra ${n(h, "ora", "ore")}${m ? ` e ${n(m, "minuto", "minuti")}` : ""}`;
  return `tra ${n(m, "minuto", "minuti")}`;
}
