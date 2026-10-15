import { createFileRoute } from "@tanstack/react-router";

import { MemberHome } from "@/components/home/MemberHome";
import { PublicHome } from "@/components/home/PublicHome";
import { getPublicCalendarSnapshot } from "@/lib/calendar.functions";
import { getPublicFeed, getPublicSchedule } from "@/lib/club.functions";
import type { PublicFeed } from "@/lib/club.types";
import { getClubNotice } from "@/lib/club-notice.functions";
import {
  getMyHomeScope,
  type HomePreview,
  type HomeScope,
} from "@/lib/home-scope.functions";
import { romeParts } from "@/lib/home-week";
import { getHomeNews, type HomeNews } from "@/lib/news.functions";
import { getPublicSocial } from "@/lib/social.functions";
import { EMPTY_WORLDS } from "@/lib/vetrina";
import { getVetrina, type VetrinaDay } from "@/lib/vetrina.functions";

/** Longest wait for the news sources on a cold cache: the home never hangs on Google News or the club site. */
const NEWS_BUDGET_MS = 1_500;
const NO_NEWS: HomeNews = { items: [], pressCount: 0 };
/** Longest wait for the R20 feed (alerts and weekend results) on the public home. */
const FEED_BUDGET_MS = 1_500;

function withBudget<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(fallback), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      () => {
        clearTimeout(t);
        resolve(fallback);
      },
    );
  });
}

/** Staging preview of the signed-in compositions (`/?anteprima=famiglia|staff`); ignored outside staging. */
type HomeSearch = { anteprima?: HomePreview | undefined };

/**
 * Home (UD-100, Direzione 13/10/2026; UD-116, 14/10/2026: what really matters at the top). Two audiences, one address:
 * - signed out: the public home v4 / vetrina (UD-110) — creative, communicative, commercial (rotating vetrina,
 *   games of the week, joining, one sponsor zone).
 *   No team list or roster (teams are inside); the games of the week of all teams are always shown (Direzione 09:03).
 * - signed in: the member home with the games of the week, the teams and the "Dal club" feed.
 * The loader only reads team calendars when the server has confirmed a session.
 */
export const Route = createFileRoute("/")({
  validateSearch: (s: Record<string, unknown>): HomeSearch =>
    s["anteprima"] === "famiglia" || s["anteprima"] === "staff"
      ? { anteprima: s["anteprima"] }
      : {},
  loaderDeps: ({ search }) => ({ anteprima: search.anteprima }),
  loader: async ({ deps }) => {
    const serverNow = Date.now();
    const today =
      romeParts(new Date(serverNow).toISOString())?.date ??
      new Date(serverNow).toISOString().slice(0, 10);
    // Started in parallel with the session and calendar reads (as before): it never delays the home beyond the budget.
    const newsP = withBudget(getHomeNews(), NEWS_BUDGET_MS, NO_NEWS);
    const [social, calendar] = await Promise.all([
      getPublicSocial(),
      getPublicCalendarSnapshot(),
    ]);
    // Staging only: the server decides whether the preview is allowed (stagingPreviewEnabled); otherwise "none".
    const previewScope: HomeScope | null =
      !social.signedIn && deps.anteprima
        ? await getMyHomeScope({ data: { preview: deps.anteprima } })
            .then((x) => (x.preview ? x : null))
            .catch(() => null)
        : null;
    if (!social.signedIn && !previewScope) {
      // Mixed news highlight (press of every age group, club site, club feed; negative headlines filtered, UD-110).
      // The full press list lives on /rassegna-stampa; the home never waits more than NEWS_BUDGET_MS for it.
      const feedP = withBudget<PublicFeed | null>(
        getPublicFeed(),
        FEED_BUDGET_MS,
        null,
      );
      const noticeP = getClubNotice({ data: { signedIn: false } }).catch(
        () => null,
      );
      // Board home (VR-009, 15/10): "Mondo Colico" is the vetrina of the day; news are not shown (no waiting for them).
      // getVetrina also gives the server Rome day (QA day honoured outside production) that seeds the LED wall.
      void newsP.catch(() => NO_NEWS);
      const vetrina: VetrinaDay = await getVetrina({
        data: { pressRecent: false },
      }).catch((): VetrinaDay => ({ today, worlds: EMPTY_WORLDS }));
      return {
        kind: "public" as const,
        calendar,
        news: [],
        vetrina: vetrina.worlds,
        feed: await feedP,
        notice: await noticeP,
        serverNow,
        today,
      };
    }
    const [feed, schedule, vetrina, scope, notice] = await Promise.all([
      getPublicFeed(),
      getPublicSchedule(),
      // "Soci e staff" world of the palinsesto: derived from the confirmed session, no new data.
      getVetrina({ data: { members: true } }).catch((): VetrinaDay => ({
        today,
        worlds: EMPTY_WORLDS,
      })),
      previewScope
        ? Promise.resolve(previewScope)
        : getMyHomeScope({ data: {} }).catch((): HomeScope => ({
            audience: "visitatore",
            preview: null,
            state: "error",
            groups: [],
            children: [],
            trainings: [],
            today,
          })),
      getClubNotice({ data: { signedIn: social.signedIn } }).catch(() => null),
    ]);
    return {
      kind: "member" as const,
      feed,
      schedule,
      calendar,
      social,
      vetrina: vetrina.worlds,
      scope,
      notice,
      serverNow,
      today,
    };
  },
  head: () => ({
    meta: [
      { title: "S.C.D. ColicoDerviese — Calcio a Colico e Dervio" },
      {
        name: "description",
        content:
          "La S.C.D. ColicoDerviese, il club di calcio di Colico e Dervio sull'Alto Lago di Como: eventi e tornei, notizie, Fantacalcio SCD, iscrizioni 2026/27 e partner del territorio.",
      },
      {
        property: "og:title",
        content: "S.C.D. ColicoDerviese — Calcio a Colico e Dervio",
      },
      {
        property: "og:description",
        content:
          "Eventi, notizie, giochi, iscrizioni e partner della S.C.D. ColicoDerviese.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const data = Route.useLoaderData();
  if (data.kind === "member") return <MemberHome {...data} />;
  return (
    <PublicHome
      calendar={data.calendar}
      news={data.news}
      vetrina={data.vetrina}
      feed={data.feed}
      notice={data.notice}
      nowMs={data.serverNow}
      today={data.today}
    />
  );
}
