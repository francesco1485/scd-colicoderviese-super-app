/** Club events already published in the app (real pages only): channels to follow and cards of the feed. */
import { visibleOn } from "./public-window";
import type { ClubEvent } from "./stories";

export const CLUB_EVENTS: readonly ClubEvent[] = [
  {
    id: "christmas-lario-cup-2026",
    title: "Christmas Lario Cup",
    when: "8 dicembre",
    date: "2026-12-08",
    text: "1ª edizione a Colico e Dervio: iscrizioni aperte, squadre di prestigio, villaggio di Natale.",
    href: "/eventi/christmas-lario-cup",
    image: "/media/eventi/christmas-lario-cup-2026-maschile.webp",
  },
];

/** Club events public on a Rome day (honours showFrom/showUntil; events without a window are always listed). */
export function clubEventsOn(day: string): ClubEvent[] {
  return visibleOn(CLUB_EVENTS, day);
}
