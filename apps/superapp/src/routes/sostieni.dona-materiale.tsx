import { createFileRoute } from "@tanstack/react-router";

import { NotActiveNote, OfferForm } from "@/components/giving/public";
import { ShareButton } from "@/components/scd/ShareButton";
import { PageHero, heroOverlapCls } from "@/components/ui-kit";
import { CAMPAIGN_COPY, type OfferCampaign } from "@/lib/giving";
import { getGivingPublic } from "@/lib/giving.functions";
import { SHARE_PAGES, pageMeta } from "@/lib/share";

type Search = { campagna?: "palestra" | "infermeria" | undefined };

/**
 * Dona materiale (UD-113): "Adotta la nuova palestra SCD" and "Adotta la nuova infermeria" — goods, not money. Staff
 * review every offer; medicines only sealed and not expired; medical items approved by the infermeria responsible.
 */
export const Route = createFileRoute("/sostieni/dona-materiale")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    campagna: s["campagna"] === "palestra" || s["campagna"] === "infermeria" ? s["campagna"] : undefined,
  }),
  loader: () => getGivingPublic(),
  head: () => ({ meta: pageMeta(SHARE_PAGES.donaMateriale) }),
  component: DonaMaterialePage,
});

function DonaMaterialePage() {
  const { engine } = Route.useLoaderData();
  const { campagna } = Route.useSearch();
  const campaign: OfferCampaign = campagna === "infermeria" ? "INFERMERIA" : campagna === "palestra" ? "PALESTRA" : "ALTRO";
  const active = engine === "applied";
  return (
    <main>
      <PageHero eyebrow="Donazioni di materiale" title={<>{campaign === "ALTRO" ? "Dona materiale" : CAMPAIGN_COPY[campaign].title}</>} clamp={false} action={<ShareButton page={SHARE_PAGES.donaMateriale} />}>
        Descrivi cosa vuoi donare: lo staff controlla, ti risponde e, se accetta, si organizza per la consegna. Farmaci aperti o scaduti non si accettano mai.
      </PageHero>
      <section className={`${heroOverlapCls} mx-auto mb-16 max-w-3xl px-4`}>
        <div className="card-premium space-y-5 p-5 sm:p-6">
          {!active && <NotActiveNote />}
          <OfferForm key={campaign} campaign={campaign} active={active} />
        </div>
      </section>
    </main>
  );
}
