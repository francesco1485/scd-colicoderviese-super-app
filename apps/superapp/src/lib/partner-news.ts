/**
 * "Notizie dai partner" (UD-110, Direzione 13/10/2026: "si può studiare qualcosa come news per sponsor").
 *
 * News published by or about a current club partner (SPONSORS), shown in the single sponsor zone of the public home.
 * Rules:
 * - never invented: every item needs a real source (partner's own post/site, club communication) and a date;
 * - the partner is referenced by slug and shown with sponsorLabel (neutral label when the name is unverified);
 * - optional publication window (showFrom/showUntil, Rome days) like every time-limited public content;
 * - external links only https, opened in a new tab.
 * The list starts EMPTY (no partner news exists in the repo or in the catalogued sources yet): the zone shows the
 * "Raccontaci la tua novità" card inviting partners to send theirs through the contact centre.
 * TO ADD A NEWS ITEM: append an entry below (newest first is not required; the view sorts by date).
 */
import { isInWindow, isIsoDay, type PublicWindow } from "./public-window";
import { SPONSORS, sponsorLabel, type Sponsor } from "./sponsors";

export interface PartnerNews extends PublicWindow {
  id: string;
  /** Slug of a partner in SPONSORS. */
  sponsorSlug: string;
  title: string;
  text: string;
  /** Rome day of publication (YYYY-MM-DD). */
  publishedAt: string;
  /** Where the news comes from (e.g. "Post Instagram del partner", "Comunicazione della società"). */
  source: string;
  /** Optional https link to the original. */
  url?: string;
}

export const PARTNER_NEWS: readonly PartnerNews[] = [];

export interface PartnerNewsView extends PartnerNews {
  sponsor: Sponsor;
  label: string;
}

/** Valid news public on a Rome day, newest first; items with an unknown partner, bad date or non-https link are dropped. */
export function partnerNewsOn(
  day: string,
  list: readonly PartnerNews[] = PARTNER_NEWS,
  sponsors: readonly Sponsor[] = SPONSORS,
  limit = 3,
): PartnerNewsView[] {
  const bySlug = new Map(sponsors.map((s) => [s.slug, s]));
  return list
    .filter(
      (n) =>
        isIsoDay(n.publishedAt) && n.publishedAt <= day && isInWindow(n, day),
    )
    .filter((n) => !n.url || /^https:\/\//.test(n.url))
    .flatMap((n) => {
      const sponsor = bySlug.get(n.sponsorSlug);
      return sponsor ? [{ ...n, sponsor, label: sponsorLabel(sponsor) }] : [];
    })
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, Math.max(0, limit));
}
