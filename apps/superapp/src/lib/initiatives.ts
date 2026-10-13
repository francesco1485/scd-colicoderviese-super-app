/**
 * Time-limited public initiatives (Direzione 13/10/2026 15:57): promos of the club or done "in collaborazione con" the
 * club, shown on the public home ("In primo piano"), in /eventi and on their own page only inside their window.
 *
 * Types and pure helpers only. The list itself lives in initiatives.server.ts and reaches pages only through the
 * server functions in initiatives.functions.ts, filtered by the server's Rome day: an initiative is not in the browser
 * bundle and is invisible before its showFrom.
 */
import { isInWindow, type PublicWindow } from "./public-window";

export interface InitiativeContact {
  /** Visible label of the contact line. */
  label: string;
  /** Number as shown (selectable text). */
  display: string;
  /** Number for the tel: link (E.164). */
  tel: string;
}

export interface Initiative extends PublicWindow {
  id: string;
  /** Public page of the initiative (existing route). */
  href: string;
  title: string;
  subtitle: string;
  /** Who runs it, with titles exactly as the organiser states them. */
  organizer: { name: string; credentials: readonly string[] };
  text: string;
  contact: InitiativeContact;
  /** Promotional flyer: secondary visual, the HTML text is the primary content. */
  flyer: { src: string; alt: string; note: string };
  showFrom: string;
  showUntil: string;
}

/** Initiatives public on a Rome day, in list order. */
export function initiativesOn(list: readonly Initiative[], day: string): Initiative[] {
  return list.filter((i) => isInWindow(i, day));
}

/** "30 novembre" from a Rome day (YYYY-MM-DD). */
export function dayMonth(day: string): string {
  return new Intl.DateTimeFormat("it-IT", { timeZone: "UTC", day: "numeric", month: "long" }).format(
    new Date(`${day}T12:00:00Z`),
  );
}
