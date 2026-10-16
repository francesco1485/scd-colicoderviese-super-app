/**
 * Signed-out public home on board VR-009 (UD-133, then UD-134 Francesco 15/10/2026 09:18).
 *
 * Rebuilt from scratch on the Eurobet structure (Francesco 15/10/2026 22:04): urgent notices (R20 alerts, only when
 * there are) → the one club communication chosen by the Direzione → HomeLobby (team chips, one static match banner,
 * "In programma" event cards, "Dal club", services, "Perché la ColicoDerviese"; desktop right rail "Entra nel club")
 * → weekend results (only with a real source;
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
import type { PublicTrainingDay } from "@/lib/public-training";

import { HomeLobby } from "@/components/home/HomeLobby";
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
  vetrina,
  feed = null,
  notice = null,
  training = null,
  nowMs,
  today,
}: {
  calendar: PublicCalendar;
  /** Palinsesto of the day (lib/vetrina): "Dal club" magazine (Francesco 16/10 05:59 «la pagina iniziale è una vetrina di bellezza e notizie e iniziative e idee e giochi»), static, changes daily, never a carousel. */
  vetrina?: Readonly<Record<VetrinaWorld, readonly VetrinaSlot[]>>;
  /** R20 public feed (alerts and weekend results); null when R20 did not answer in time. */
  feed?: PublicFeed | null;
  /** The one club communication of the day (getClubNotice), or null. */
  notice?: ClubNotice | null;
  /** Public training evening (UD-140): timetable only, from getPublicTrainings. */
  training?: PublicTrainingDay | null;
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
      className="min-h-dvh bg-[#f3f6fb] pb-8 font-sans text-[#0b1e3a] shadow-[0_0_0_100vmax_#f3f6fb] [clip-path:inset(0_-100vmax_0_0)]"
    >
      <h1 className="sr-only">
        S.C.D. ColicoDerviese, il club di calcio di Colico e Dervio
      </h1>
      <UrgentNotices items={alerts} />
      <ClubNoticeCard notice={notice} />
      <HomeLobby calendar={calendar} vetrina={vetrina} training={training} nowMs={nowMs} today={today} />
      <WeekendResults rows={results} />
    </main>
  );
}
