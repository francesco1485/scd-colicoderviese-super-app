import { createFileRoute } from "@tanstack/react-router";

import { MemberHome } from "@/components/home/MemberHome";
import { PublicHome } from "@/components/home/PublicHome";
import { getPublicCalendarSnapshot } from "@/lib/calendar.functions";
import { getPublicFeed, getPublicSchedule } from "@/lib/club.functions";
import { romeParts } from "@/lib/home-week";
import { getPressReview, type PressReview } from "@/lib/press.functions";
import { getPublicSocial } from "@/lib/social.functions";

/** Longest wait for the press review on a cold cache: the home never hangs on Google News. */
const PRESS_BUDGET_MS = 1_200;
const NO_PRESS: PressReview = { items: [], fetchedAt: null };

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

/**
 * Home (UD-100, Direzione 13/10/2026). Two audiences, one address:
 * - signed out: the public home v4 — creative, communicative, commercial (events, news, games, partners, joining).
 *   No team list or roster (teams are inside); the games of the week of all teams are always shown (Direzione 09:03).
 * - signed in: the member home with the games of the week, the teams and the "Dal club" feed.
 * The loader only reads team calendars when the server has confirmed a session.
 */
export const Route = createFileRoute("/")({
  loader: async () => {
    const serverNow = Date.now();
    const today =
      romeParts(new Date(serverNow).toISOString())?.date ??
      new Date(serverNow).toISOString().slice(0, 10);
    const [social, press, calendar] = await Promise.all([
      getPublicSocial(),
      withBudget(getPressReview(), PRESS_BUDGET_MS, NO_PRESS),
      getPublicCalendarSnapshot(),
    ]);
    if (!social.signedIn) {
      return {
        kind: "public" as const,
        press: press.items,
        calendar,
        serverNow,
        today,
      };
    }
    const [feed, schedule] = await Promise.all([
      getPublicFeed(),
      getPublicSchedule(),
    ]);
    return {
      kind: "member" as const,
      feed,
      schedule,
      calendar,
      social,
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
      press={data.press}
      calendar={data.calendar}
      nowMs={data.serverNow}
      today={data.today}
    />
  );
}
