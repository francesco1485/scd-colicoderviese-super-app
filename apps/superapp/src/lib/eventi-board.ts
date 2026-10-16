/**
 * Pure helpers of the public "Eventi e tornei" page (SCD METAL "via di mezzo", 16/10/2026).
 * One club colour per kind of event, with purpose (Francesco 16/10/2026 21:54 «cerca di mettere anche altri colori»):
 *   tornei = sole (yellow), iniziative = azzurro, eventi del club = navy.
 * Dates come only from lib/events.ts and lib/tournaments.ts (VERIFIED facts); nothing is invented here.
 */
import type { Tone } from "@/components/home/tones";
import { CHRISTMAS_LARIO_CUP } from "./events";
import { upcomingTournaments, type TournamentEdition } from "./tournaments";

export type EventKind = "torneo" | "iniziativa" | "club";

export interface EventKindStyle {
  tone: Tone;
  label: string;
  /** Left bar of a row on the white page. */
  bar: string;
  /** Kicker text on white (contrast >= 4.5:1). */
  ink: string;
  /** Small dot for the legend and the section pills. */
  dot: string;
}

export const EVENT_KINDS: Readonly<Record<EventKind, EventKindStyle>> = {
  torneo: { tone: "sole", label: "Tornei", bar: "bg-[#ffd23f]", ink: "text-[#7a5800]", dot: "bg-[#ffd23f] ring-1 ring-[#c99600]" },
  iniziativa: { tone: "azzurro", label: "Iniziative", bar: "bg-[#1266b8]", ink: "text-[#0457af]", dot: "bg-[#1266b8]" },
  club: { tone: "navy", label: "Dal club", bar: "bg-[#13254d]", ink: "text-[#13254d]", dot: "bg-[#13254d]" },
};

/** Rome day (YYYY-MM-DD) of the Christmas Lario Cup, from lib/events.ts. */
export const CLC_DAY = CHRISTMAS_LARIO_CUP.start.slice(0, 10);

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Whole days from `from` to `to` (both YYYY-MM-DD); null for a malformed day. */
export function daysBetween(from: string, to: string): number | null {
  if (!ISO.test(from) || !ISO.test(to)) return null;
  const a = Date.parse(`${from}T12:00:00Z`);
  const b = Date.parse(`${to}T12:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((b - a) / 86_400_000);
}

/** "tra 53 giorni" · "domani" · "oggi"; null once the day has passed or when the day is unknown. */
export function countdownWords(today: string, day: string): string | null {
  const n = daysBetween(today, day);
  if (n === null || n < 0) return null;
  if (n === 0) return "oggi";
  if (n === 1) return "domani";
  return `tra ${n} giorni`;
}

const WD = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"] as const;
const MON = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"] as const;

/** Calendar block of a row: { day: "8", month: "dic", weekday: "mar", year: "2026" }; null when the date is unknown. */
export function dateBlock(day: string | null): { day: string; month: string; weekday: string; year: string } | null {
  if (!day || !ISO.test(day)) return null;
  const d = new Date(`${day}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return { day: String(d.getUTCDate()), month: MON[d.getUTCMonth()]!, weekday: WD[d.getUTCDay()]!, year: String(d.getUTCFullYear()) };
}

/** Upcoming tournaments other than the Christmas Lario Cup (which has its own featured row on /eventi). */
export function otherTournaments(today: string, list?: readonly TournamentEdition[]): TournamentEdition[] {
  return upcomingTournaments(today, list).filter((t) => !t.id.startsWith("christmas-lario-cup"));
}

/** Whether the Christmas Lario Cup is still ahead (or today) on a Rome day. */
export function clcAhead(today: string): boolean {
  const n = daysBetween(today, CLC_DAY);
  return n !== null && n >= 0;
}
