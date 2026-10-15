/**
 * "Condividi su WhatsApp" for a game or a club event (study of 15/10/2026, block A actions 4 and 11: the real channel
 * of families is WhatsApp; every share carries a direct link to the page). The text repeats only what the public page
 * already shows: category, opponent, day, time, venue. Never a person's name: entries of the public calendar carry
 * teams, not players, so no minor can appear in a shared message. Pure functions, tested in share-match.test.ts.
 */
import type { TodayEntry } from "./home-today";
import { absoluteUrl, type ShareData } from "./share";

const WD = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"] as const;
const MO = [
  "gen",
  "feb",
  "mar",
  "apr",
  "mag",
  "giu",
  "lug",
  "ago",
  "set",
  "ott",
  "nov",
  "dic",
] as const;

/** "2026-10-18" → "dom 18 ott"; invalid → "". */
export function shortDay(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return "";
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12));
  if (Number.isNaN(d.getTime()) || d.getUTCDate() !== Number(m[3])) return "";
  return `${WD[d.getUTCDay()]} ${d.getUTCDate()} ${MO[d.getUTCMonth()]}`;
}

/** Share data of a game: title, one-line text with the facts of the row, link to the calendar of that team. */
export function matchShare(
  e: Pick<
    TodayEntry,
    "date" | "time" | "group" | "opponent" | "homeAway" | "place" | "pending"
  >,
  category: string,
  siteUrl?: string | null,
): ShareData {
  const us = `ColicoDerviese ${category}`.trim();
  const them = e.opponent || "avversario da definire";
  const pair = e.homeAway === "FUORI" ? `${them} – ${us}` : `${us} – ${them}`;
  const when = [shortDay(e.date), e.time || "orario da definire"]
    .filter(Boolean)
    .join(" ore ");
  const where = e.place ? `a ${e.place}` : "campo da definire";
  const note = e.pending.length > 0 ? ` (${e.pending[0]})` : "";
  return {
    title: `${pair} · S.C.D. ColicoDerviese`,
    text: `⚽ ${pair}\n📅 ${when}\n📍 ${where}${note}\nTutte le gare della settimana:`,
    url: absoluteUrl(`/calendario?annata=${encodeURIComponent(e.group)}`, siteUrl),
  };
}
