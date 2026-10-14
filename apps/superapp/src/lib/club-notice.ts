/**
 * "Comunicazione del club" on the home (UD-116, Direzione 14/10/2026): ONE important communication chosen by the
 * Direzione, always with an expiry date. Types and the pure pick only; the list lives in club-notice.server.ts and
 * reaches the page only through getClubNotice (club-notice.functions.ts), filtered on the server's Rome day, so a
 * communication is never in the browser bundle before its showFrom or after its showUntil.
 *
 * Rules (fail closed, public-window.ts): showUntil is mandatory (no communication stays forever), an invalid or
 * inverted window hides the entry, the first valid entry of the list wins (the Direzione orders the list).
 */
import { isInWindow, isIsoDay } from "./public-window";

export type ClubNoticeAudience = "tutti" | "soci";

export interface ClubNotice {
  id: string;
  /** Short headline in plain Italian. */
  title: string;
  /** One or two sentences. */
  text: string;
  /** Optional internal route for "Leggi" (must be a registered route). */
  href?: string;
  cta?: string;
  /** "urgente" shows the notice in the alert colour. */
  tone: "info" | "urgente";
  /** "soci" only for signed-in members. */
  audience: ClubNoticeAudience;
  /** Who decided it (always the Direzione) and when, for the audit trail. */
  decidedBy: "Direzione";
  decidedOn: string;
  showFrom: string;
  showUntil: string;
}

/** True when an entry is complete and public on `day` for this audience. */
export function noticeVisible(
  n: ClubNotice,
  day: string,
  signedIn: boolean,
): boolean {
  if (!n.title.trim() || !n.text.trim()) return false;
  if (!isIsoDay(n.showUntil) || !isIsoDay(n.showFrom)) return false;
  if (n.audience === "soci" && !signedIn) return false;
  return isInWindow(n, day);
}

/** The one communication of the day, or null. */
export function pickClubNotice(
  list: readonly ClubNotice[],
  day: string,
  signedIn: boolean,
): ClubNotice | null {
  return list.find((n) => noticeVisible(n, day, signedIn)) ?? null;
}
