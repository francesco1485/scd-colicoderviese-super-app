import { createFileRoute, redirect } from "@tanstack/react-router";

import { CampioneStudio } from "@/components/scd/campione/CampioneStudio";
import { CAMPIONE_PATH } from "@/lib/avatar-studio";
import { getAvatarStudio } from "@/lib/avatar-studio.functions";
import { getSession } from "@/lib/auth.functions";

/**
 * "Crea il tuo campione" + Le mie card (UD-102, Direzione 13/10/2026 "ok procedi"): members only, never published.
 * The server checks the session first; anonymous visitors are sent to sign in and come back here. The page is
 * private and no-store (src/lib/http-policy.ts) and stays out of robots/sitemap.
 */
export const Route = createFileRoute("/la-mia-scd_/campione")({
  loader: async () => {
    const session = await getSession();
    if (!session.user) throw redirect({ to: "/accedi", search: { next: CAMPIONE_PATH } });
    return { studio: await getAvatarStudio() };
  },
  head: () => ({
    meta: [
      { title: "Crea il tuo campione — S.C.D. ColicoDerviese" },
      { name: "description", content: "Area soci: il tuo avatar realistico e le tue card digitali." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: CampionePage,
});

function CampionePage() {
  const { studio } = Route.useLoaderData();
  return <CampioneStudio data={studio} />;
}
