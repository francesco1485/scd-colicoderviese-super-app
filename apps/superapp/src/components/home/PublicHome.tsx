/**
 * Signed-out public home on board VR-009 (UD-133, then UD-134 Francesco 15/10/2026 09:18).
 *
 * New idea (Francesco 15/10/2026 21:35 «avevo detto che bisogna cambiare idea di grafica», boards VR-025): urgent
 * notices (R20 alerts, only when there are) → the one club communication chosen by the Direzione → HomeWeek (thin
 * title band, week strip with the chosen day in the blue circle, pill filters, every team's games by day as board
 * rows; desktop right column with the next big game, practical cards and Iride) → weekend results (only with a real source;
 * "Vittoria" and confetti only on a ColicoDerviese win) → footer ("Chi sei?" removed, UD-152). Partners scroll in the fixed SponsorBand on every
 * page; the LED spot, the partner of the month and partner news live on /sponsor (PartnerBand). No stories.
 * Palette: navy #0b2a5b, blue #1556c4, light #eef3f9, white; yellow #ffd600 for changes and the main CTA.
 * Real assets only (public/media); no minor is named.
 */
import { useMemo } from "react";

import type { ClubNotice } from "@/lib/club-notice";
import type { PublicFeed } from "@/lib/club.types";
import { weekendResults } from "@/lib/home-results";
import { urgentNotices } from "@/lib/home-today";
import type { VetrinaSlot, VetrinaWorld } from "@/lib/vetrina";

import { HomeWeek } from "@/components/home/HomeWeek";
import {
  ClubNoticeCard,
  UrgentNotices,
  WeekendResults,
} from "@/components/home/HomePractical";
import type { getPublicCalendarSnapshot } from "@/lib/calendar.functions";

type PublicCalendar = Awaited<ReturnType<typeof getPublicCalendarSnapshot>>;

/* ---------------------------------------------------------------- page */

export function PublicHome({
  calendar,
  feed = null,
  notice = null,
  nowMs,
  today,
}: {
  calendar: PublicCalendar;
  /** Vetrina picks of the day: still loaded for the LED wall day, never rendered on the home (UD-152, 15/10 13:54). */
  vetrina?: Readonly<Record<VetrinaWorld, readonly VetrinaSlot[]>>;
  /** R20 public feed (alerts and weekend results); null when R20 did not answer in time. */
  feed?: PublicFeed | null;
  /** The one club communication of the day (getClubNotice), or null. */
  notice?: ClubNotice | null;
  nowMs: number;
  today: string;
}) {
  const alerts = useMemo(
    () => urgentNotices(feed?.items ?? [], nowMs, false),
    [feed, nowMs],
  );
  const results = useMemo(() => weekendResults(feed, today), [feed, today]);
  // Board order (VR-009 screen 1) made logical (Francesco 15/10/2026 07:04 "fuori ogni logica"): every block once.
  // urgent → communication → hero, tiles, the club's most important next game with its countdown, trainings + event
  // → all the games of the week → results (only with a source, confetti only on a win) →
  // footer. No stories and no partner band since UD-134 (15/10 09:18): partners scroll in the fixed sponsor bar, the
  // LED spot and partner news live on /sponsor. The join banner and
  // the second credential strip are gone: "Entra" is in the header and in the bottom bar, the credentials in the footer.
  return (
    <main
      data-screen="home"
      data-variant="public"
      className="min-h-dvh bg-[#eef3f9] pb-6 font-sans text-[#0b1e3a]"
    >
      <h1 className="sr-only">
        S.C.D. ColicoDerviese, il club di calcio di Colico e Dervio
      </h1>
      <UrgentNotices items={alerts} />
      <ClubNoticeCard notice={notice} />
      <HomeWeek calendar={calendar} nowMs={nowMs} today={today} />
      <WeekendResults rows={results} />
    </main>
  );
}
