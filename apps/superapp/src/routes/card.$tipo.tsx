import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ChevronLeft, Store } from "lucide-react";

import { ClubCardDetails, ClubCardFace, ClubCardLinks, ClubCardRules } from "@/components/scd/ClubCards";
import { CLUB_CARDS, clubCard, isClubCardId } from "@/lib/club-cards";
import { CREST_SHARE_IMAGE, PUBLIC_PAGES, pageHead } from "@/lib/share";

/**
 * /card/$tipo — the web link of one club card (tesserato, sostenitore, partner). The Club House shares it and prints
 * it as a QR code; it explains the card and sends people to the Club House. No sign-up form, no payment, no personal data.
 */
export const Route = createFileRoute("/card/$tipo")({
  loader: ({ params }) => {
    if (!isClubCardId(params.tipo)) throw notFound();
    return { id: params.tipo };
  },
  head: ({ loaderData }) => {
    const t = loaderData ? clubCard(loaderData.id) : null;
    if (!t) return pageHead(PUBLIC_PAGES.card, { extraMeta: [{ name: "robots", content: "noindex" }], canonical: false });
    const title = `Card ${t.label} 2026/27 — S.C.D. ColicoDerviese`;
    return pageHead({
      path: `/card/${t.id}`,
      title,
      description: `${t.who} Si attiva alla Club House.`,
      ogDescription: "Si attiva alla Club House del Centro Sportivo Colico.",
      image: CREST_SHARE_IMAGE,
    });
  },
  component: CardPage,
});

function CardPage() {
  const { id } = Route.useLoaderData();
  const tier = clubCard(id);
  return (
    <main className="scd-interior min-h-screen bg-[var(--in-ground)] pb-24 lg:pb-12" data-testid={`club-card-page-${id}`}>
      <section className="relative isolate overflow-hidden bg-[var(--scd-navy)] text-white">
        <div aria-hidden="true" data-motif="forte" className="scd-kit-stripes absolute inset-0 -z-10" />
        <div className="mx-auto max-w-[1280px] px-4 pb-10 pt-6 sm:px-6 lg:pb-12 lg:pt-10">
          <Link to="/card" className="scd-focus inline-flex min-h-11 items-center gap-1 text-[15px] font-semibold text-[var(--out-text-soft)] hover:text-white">
            <ChevronLeft className="size-5" aria-hidden="true" />
            Tutte le card
          </Link>
          <h1 className="m-0 mt-1 font-title text-[44px] font-black leading-[0.95] sm:text-[56px]">
            Card <span className="scd-brush">{tier.label}</span>
          </h1>
          <p className="m-0 mt-3 max-w-[60ch] text-[16px] leading-snug text-[#e6f3fc]">{tier.who}</p>
        </div>
      </section>

      <div className="mx-auto -mt-5 grid max-w-[1280px] gap-5 px-4 sm:px-6 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)] lg:items-start">
        <div className="grid gap-4">
          <ClubCardFace tier={tier} />
          <p className="scd-card m-0 flex items-start gap-3 p-4 text-[15px] leading-snug text-[#24364f]">
            <Store className="mt-0.5 size-5 shrink-0 text-[#1556c4]" aria-hidden="true" />
            <span>
              <b className="text-[#0b1e3a]">Come averla.</b> Passa alla Club House del Centro Sportivo Colico: la card si attiva lì, con il badge QR. {CLUB_CARDS.rules.topUp}
            </span>
          </p>
        </div>
        <div className="grid gap-5">
          <ClubCardDetails tier={tier} />
          <ClubCardRules />
          <ClubCardLinks current={tier.id} />
        </div>
      </div>
    </main>
  );
}
