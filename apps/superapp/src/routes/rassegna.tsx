import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink, Newspaper } from "lucide-react";

import { getPressReview } from "@/lib/press.functions";
import { timeAgo } from "@/lib/social";

/**
 * Rassegna stampa (UD-094): le testate che parlano di noi e del territorio. Solo titoli, testata e link all'articolo
 * originale: niente testi copiati né pagine scansionate. Fonte: Google News (ricerche sul nome del club e dei paesi).
 */
export const Route = createFileRoute("/rassegna")({
  loader: async () => ({ press: await getPressReview(), now: Date.now() }),
  head: () => ({
    meta: [
      { title: "Dicono di noi — S.C.D. ColicoDerviese" },
      {
        name: "description",
        content:
          "Rassegna stampa della S.C.D. ColicoDerviese: i titoli delle testate che parlano della società, di Colico e di Dervio.",
      },
    ],
  }),
  component: RassegnaPage,
});

function RassegnaPage() {
  const { press, now } = Route.useLoaderData();
  return (
    <main
      data-screen="rassegna"
      className="min-h-dvh bg-[#f2f6fb] pb-28 text-[#0b1e3a]"
    >
      <div className="relative overflow-hidden bg-[#06306f] text-white">
        <img
          src="/media/scd/lario-header.webp"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 size-full object-cover object-[center_55%] opacity-60"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(180deg,rgb(7_29_66/0.55),#0b2a5b_90%)]"
        />
        <div className="relative mx-auto max-w-[720px] px-4 pb-6 pt-4">
          <h1 className="m-0 font-uv text-[40px] leading-none">
            DICONO <span className="text-[var(--uv-gold)]">DI NOI</span>
          </h1>
          <p className="mb-0 mt-2 text-[15px] text-[#dce8f7]">
            I titoli delle testate su società, Colico e Dervio. Tocca per
            leggere l'articolo sul sito del giornale.
          </p>
        </div>
      </div>
      <div className="mx-auto grid max-w-[720px] gap-3 px-3 pt-3.5">
        {press.items.length === 0 ? (
          <p className="m-0 rounded-[20px] bg-white p-4 text-[15px] text-[#3e5272] shadow-[0_2px_10px_rgb(11_42_91/0.08)]">
            Nessun articolo recente trovato. La rassegna si aggiorna da sola
            ogni mezz'ora.
          </p>
        ) : (
          <ul className="m-0 grid list-none gap-2.5 p-0">
            {press.items.map((i) => (
              <li key={i.url}>
                <a
                  href={i.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="scd-focus flex items-start gap-3 rounded-[18px] bg-white p-3.5 shadow-[0_2px_10px_rgb(11_42_91/0.08)]"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-[#e3eefb] text-[#0b2a5b]">
                    <Newspaper className="size-5" aria-hidden="true" />
                  </span>
                  <span className="grid min-w-0 flex-1 gap-1">
                    <b className="text-[15px] leading-[1.3]">{i.title}</b>
                    <span className="flex items-center gap-1.5 text-[13px] text-[#5a6b85]">
                      {i.source || "Testata"}
                      {i.publishedAt ? ` · ${timeAgo(i.publishedAt, now)}` : ""}
                      <ExternalLink className="size-3.5" aria-hidden="true" />
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
        <p className="m-0 px-1 text-[12.5px] text-[#5a6b85]">
          Titoli e link dalle testate originali tramite Google News. I testi
          restano sui siti dei giornali.
        </p>
      </div>
    </main>
  );
}
