/**
 * Live lines of the cast presences (UD-114): one sentence from real data that makes a character "dynamic" in its
 * area. Pure: the page or the server passes the official calendar copy and the Rome day. Nothing is invented: no
 * match or tournament, no line.
 */
import { italianDate } from "./assistant";
import { ticketedHomeMatches } from "./match-extras";
import type { PublicEvent, PublicGroup } from "./public-snapshots";
import { TOURNAMENT_STATUS_LABEL, upcomingTournaments, type TournamentEdition } from "./tournaments";

/** Next ticketed home match in plain words, or null. */
export function nextHomeMatchText(groups: readonly PublicGroup[], events: readonly PublicEvent[], today: string): string | null {
  const next = ticketedHomeMatches(events, today)[0];
  if (!next) return null;
  const label = groups.find((g) => g.id === next.group)?.label ?? next.group;
  const time = next.time && next.timeConfirmed ? `ore ${next.time}` : "orario da confermare";
  return `${italianDate(next.date)} ${time}, ${label} contro ${next.opponent || "avversario da definire"}${next.venue ? ` (${next.venue})` : ""}`;
}

/** One tournament in plain words (date exactly as published, place, status). */
export function tournamentText(t: TournamentEdition): string {
  return `${t.name}${t.when ? `, ${t.when}` : ""}${t.place ? `, ${t.place}` : ""} (${TOURNAMENT_STATUS_LABEL[t.status].toLowerCase()})`;
}

/** Upcoming tournaments in plain words, nearest first. */
export function upcomingTournamentTexts(today: string, list?: readonly TournamentEdition[]): string[] {
  return upcomingTournaments(today, list).map(tournamentText);
}
