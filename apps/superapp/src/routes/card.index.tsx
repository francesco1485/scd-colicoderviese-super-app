import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Store } from "lucide-react";

import { ClubCardFace, ClubCardRules } from "@/components/scd/ClubCards";
import { CLUB_CARDS, activationText } from "@/lib/club-cards";

/** /card — the three club cards 2026/27 (Direzione 13/10/2026). Public, no personal data. */
export const Route = createFileRoute("/card/")({
  head: () => ({
    meta: [
      { title: "Le card 2026/27 — S.C.D. ColicoDerviese" },
      { name: "description", content: "Card Tesserato, Sostenitore e Partner: credito alla Club House, listino dedicato, biglietteria e attività convenzionate." },
      { property: "og:title", content: "Le card ColicoDerviese 2026/27" },
      { property: "og:description", content: "Tesserato, Sostenitore e Partner: si attivano alla Club House." },
    ],
  }),
  component: CardIndexPage,
});

function CardIndexPage() {
  return (
    <main className="scd-interior min-h-screen bg-[var(--in-ground)] pb-24 lg:pb-12">
      <section className="relative isolate overflow-hidden bg-[var(--scd-navy)] text-white">
        <div aria-hidden="true" data-motif="forte" className="scd-kit-stripes absolute inset-0 -z-10" />
        <div className="mx-auto max-w-[1280px] px-4 pb-10 pt-6 sm:px-6 lg:pb-12 lg:pt-10">
          <p className="m-0 text-[15px] font-semibold text-[var(--out-text-soft)]">{CLUB_CARDS.validity.label}</p>
          <h1 className="m-0 mt-1 font-title text-[44px] font-black leading-[0.95] sm:text-[56px]">
            Le <span className="scd-brush">card</span>
          </h1>
          <p className="m-0 mt-3 max-w-[60ch] text-[16px] leading-snug text-[#e6f3fc]">
            Tre card per vivere la società: credito da spendere alla Club House, listino dedicato, biglietteria e vantaggi nelle attività convenzionate.
          </p>
          <p className="m-0 mt-4 inline-flex min-h-12 items-center gap-2 rounded-[12px] border border-white/40 px-4 text-[15px] font-semibold">
            <Store className="size-5" strokeWidth={1.8} aria-hidden="true" />
            Si attivano alla Club House del Centro Sportivo Colico
          </p>
        </div>
      </section>

      <div className="mx-auto -mt-5 grid max-w-[1280px] gap-5 px-4 sm:px-6">
        <ul className="m-0 grid list-none gap-4 p-0 md:grid-cols-3" data-testid="club-cards-list">
          {CLUB_CARDS.tiers.map((t) => (
            <li key={t.id} className="scd-card grid content-start gap-3 p-3 sm:p-4">
              <ClubCardFace tier={t} />
              <p className="m-0 text-[14.5px] leading-snug text-[#3e5272]">{t.who}</p>
              <p className="m-0 text-[14.5px] font-semibold leading-snug text-[#0b2a5b]">{activationText(t)}</p>
              <Link
                to="/card/$tipo"
                params={{ tipo: t.id }}
                className="scd-action scd-focus inline-flex h-12 items-center justify-center gap-2 rounded-[12px] px-5 text-[16px] font-bold"
              >
                Scopri la card {t.label}
                <ChevronRight className="size-5" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
        <ClubCardRules />
        <p className="m-0 text-[13px] leading-snug text-[var(--in-sub)]">
          Fonte: policy card della Direzione e regole di biglietteria confermate. La data di scadenza della card è da confermare. Nessun dato personale in questa
          pagina.
        </p>
      </div>
    </main>
  );
}
