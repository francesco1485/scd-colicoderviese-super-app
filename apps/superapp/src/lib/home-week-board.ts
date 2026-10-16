/**
 * Games of the next seven days for the public home's games bar (public calendar only, no invented data).
 */
import { addDays } from "./board-data";
import type { PublicEvent } from "./public-snapshots";

/** Days covered: today and the next six. */
export const WEEK_BOARD_DAYS = 7;

const kick = (e: Pick<PublicEvent, "date" | "time">) => e.date + (e.time || "99:99");

/** Games from `today` for WEEK_BOARD_DAYS days, in kick-off order (no time = end of the day), then by group. */
export function weekBoardEvents(events: readonly PublicEvent[], today: string): PublicEvent[] {
  const last = addDays(today, WEEK_BOARD_DAYS - 1);
  return events
    .filter((e) => e.date >= today && e.date <= last)
    .sort((a, b) => kick(a).localeCompare(kick(b)) || a.group.localeCompare(b.group) || a.id.localeCompare(b.id));
}
