/**
 * Public page of the Lotteria dello sport (UD-115). Ready, but not linked from the home: it shows the initiative only
 * after the Direzione publishes it (r102, scd_lottery_public) and inside its window (server Rome day). Before that it
 * answers "in preparazione" and is not indexed; on the staging preview it shows the page structure with every value
 * "da definire" (no invented data). No online sale, no payment, no gambling mechanic, no photos of minors.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { PublicLotteryView } from "@/components/lottery/PublicLotteryView";
import { ShareButton } from "@/components/scd/ShareButton";
import { PageHero, heroOverlapCls } from "@/components/ui-kit";
import {
  BENEFICIARY_DEFAULT_PURPOSE,
  KIND_LABEL,
  longDay,
  type PublicLottery,
} from "@/lib/lottery";
import { getPublicLottery } from "@/lib/lottery.functions";
import { SHARE_PAGES, pageHead } from "@/lib/share";

/** Staging-only structure preview: every value empty ("da definire"). */
const STRUCTURE_PREVIEW: PublicLottery = {
  kind: "LOTTERIA",
  title: "",
  beneficiary: BENEFICIARY_DEFAULT_PURPOSE,
  saleFrom: null,
  saleUntil: null,
  drawDate: null,
  drawTime: null,
  drawPlace: "",
  sportDay: null,
  sportDayPlace: "",
  ticketPriceCents: null,
  salePoints: "",
  prizesDisplayPlace: "",
  prizeDeliveryPlace: "",
  prizeDeliveryUntil: null,
  prizes: [],
  winners: null,
  funds: { netCents: 0, goalCents: null, goalPercent: null },
  publishedOn: "2026-10-14",
};

export const Route = createFileRoute("/eventi/lotteria-dello-sport")({
  loader: async () => getPublicLottery(),
  head: ({ loaderData }) => {
    const l = loaderData?.lottery;
    const title = l
      ? `${l.title || `${KIND_LABEL[l.kind]} dello sport`} — S.C.D. ColicoDerviese`
      : "Lotteria dello sport — S.C.D. ColicoDerviese";
    // Open Graph is always present (a forwarded link shows the club crest); before publication the page stays noindex.
    const page = l
      ? {
          ...SHARE_PAGES.lotteria,
          title,
          ogTitle: title,
          description: `${l.beneficiary} Giornata dello sport: ${l.sportDay ? longDay(l.sportDay) : "data da definire"}.`,
        }
      : SHARE_PAGES.lotteria;
    return pageHead(page, l ? {} : { extraMeta: [{ name: "robots", content: "noindex" }], canonical: false });
  },
  component: LotteriaPublic,
});

function LotteriaPublic() {
  const { lottery, today, preview } = Route.useLoaderData();
  if (!lottery && !preview) {
    return (
      <main
        className="mx-auto max-w-3xl px-4 py-16"
        data-testid="lottery-not-published"
      >
        <h1 className="text-2xl font-bold">Iniziativa in preparazione</h1>
        <p className="mt-2 text-muted-foreground">
          La S.C.D. ColicoDerviese pubblicherà qui tutti i dettagli quando
          saranno pronti.
        </p>
        <Link
          to="/eventi"
          className="mt-4 inline-flex h-11 items-center gap-1 rounded-lg border border-border px-4 text-sm font-bold uppercase"
        >
          <ArrowLeft className="size-4" aria-hidden="true" /> Tutti gli eventi
        </Link>
      </main>
    );
  }
  const data = lottery ?? STRUCTURE_PREVIEW;
  return (
    <main data-screen="lottery" data-testid="lottery-page">
      <PageHero
        eyebrow={`Iniziativa benefica · ${KIND_LABEL[data.kind]}`}
        title={data.title || `${KIND_LABEL[data.kind]} dello sport`}
        clamp={false}
        action={<ShareButton page={SHARE_PAGES.lotteria} />}
      >
        {data.beneficiary}
      </PageHero>
      <section className={`${heroOverlapCls} mx-auto max-w-6xl px-4 pb-10`}>
        {!lottery && (
          <p
            className="mb-4 rounded-xl border border-dashed border-[#b9d5ef] bg-[#f7fbff] px-4 py-3 text-[14px] font-semibold text-[#0b2a5b]"
            role="note"
            data-testid="lottery-structure-preview"
          >
            Anteprima staging della struttura: nessuna iniziativa pubblicata, i
            valori restano «da definire».
          </p>
        )}
        <PublicLotteryView lottery={data} today={today} />
      </section>
    </main>
  );
}
