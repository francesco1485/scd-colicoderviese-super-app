import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Newspaper } from "lucide-react";

import {
  PUBLIC_WRAP,
  PublicPageHeader,
} from "@/components/home/PublicPageHeader";
import { getSiteNews } from "@/lib/news.functions";
import { getPressReview } from "@/lib/press.functions";
import { timeAgo } from "@/lib/social";

/**
 * Rassegna stampa (UD-094, moved off the home by UD-110): the press list lives here, the home keeps only the compact
 * "Dicono di noi" slot of the vetrina. Titles, source and link to the original article only: no copied text, no
 * scanned pages. Source: Google News searches on the club and the two towns (lib/press.ts), cached 30 minutes.
 * /rassegna redirects here.
 */
export const Route = createFileRoute("/rassegna-stampa")({
  loader: async () => {
    const [press, site] = await Promise.all([
      getPressReview(),
      getSiteNews().catch(() => ({ items: [] })),
    ]);
    return { press, site, now: Date.now() };
  },
  head: () => ({
    meta: [
      { title: "Rassegna stampa · Dicono di noi — S.C.D. ColicoDerviese" },
      {
        name: "description",
        content:
          "Rassegna stampa della S.C.D. ColicoDerviese: i titoli delle testate che parlano della società, di Colico e di Dervio, con il link all'articolo originale.",
      },
      {
        property: "og:title",
        content: "Dicono di noi — S.C.D. ColicoDerviese",
      },
    ],
  }),
  component: RassegnaStampaPage,
});

function RassegnaStampaPage() {
  const { press, site, now } = Route.useLoaderData();
  return (
    <main
      data-screen="rassegna-stampa"
      className="min-h-dvh bg-[#eef3f9] pb-10 text-[#0b1e3a]"
    >
      <PublicPageHeader
        eyebrow="Rassegna stampa"
        title="Dicono"
        accent="di noi"
      >
        I titoli delle testate su società, Colico e Dervio. Tocca un titolo per
        leggere l'articolo sul sito del giornale.
      </PublicPageHeader>
      <div
        className={`${PUBLIC_WRAP} grid gap-4 pt-5 lg:grid-cols-[minmax(0,8fr)_minmax(0,4fr)] lg:gap-6 lg:pt-8`}
      >
        <section aria-labelledby="titoli-t" className="min-w-0">
          <h2 id="titoli-t" className="sr-only">
            Ultimi titoli
          </h2>
          {press.items.length === 0 ? (
            <p className="m-0 rounded-[16px] bg-white p-5 text-[15px] text-[#3e5272] shadow-[0_1px_2px_rgb(11_42_91/0.06),0_8px_24px_-12px_rgb(11_42_91/0.25)]">
              Nessun articolo recente trovato. La rassegna si aggiorna da sola
              ogni mezz'ora.
            </p>
          ) : (
            <ul
              className="m-0 list-none divide-y divide-[#e6edf6] overflow-hidden rounded-[16px] bg-white p-0 shadow-[0_1px_2px_rgb(11_42_91/0.06),0_8px_24px_-12px_rgb(11_42_91/0.25)]"
              data-testid="press-list"
            >
              {press.items.map((p) => (
                <li key={p.url}>
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="scd-focus group flex items-start gap-3 px-4 py-4 hover:bg-[#f4f7fb] lg:px-5"
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-[10px] bg-[#e6eefa] text-[#1556c4]">
                      <Newspaper className="size-5" aria-hidden="true" />
                    </span>
                    <span className="grid min-w-0 flex-1 gap-1">
                      <span className="text-[12px] font-semibold uppercase tracking-[0.05em] text-[#5a6b85]">
                        {p.source || "Testata"}
                        {p.publishedAt
                          ? ` · ${timeAgo(p.publishedAt, now)}`
                          : ""}
                      </span>
                      <span className="text-[16px] font-semibold leading-snug text-[#0b1e3a] group-hover:underline">
                        {p.title}
                      </span>
                    </span>
                    <ArrowUpRight
                      className="mt-1 size-4 shrink-0 text-[#9fb0c8]"
                      aria-hidden="true"
                    />
                    <span className="sr-only">
                      (apre il sito della testata)
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
          {site.items.length > 0 && (
            <section
              aria-labelledby="sito-t"
              className="pt-6"
              data-testid="site-news"
            >
              <h2
                id="sito-t"
                className="m-0 pb-3 font-uv text-[22px] uppercase leading-none text-[#0b2a5b] lg:text-[26px]"
              >
                Dal sito della società
              </h2>
              <ul className="m-0 list-none divide-y divide-[#e6edf6] overflow-hidden rounded-[16px] bg-white p-0 shadow-[0_1px_2px_rgb(11_42_91/0.06),0_8px_24px_-12px_rgb(11_42_91/0.25)]">
                {site.items.slice(0, 8).map((p) => (
                  <li key={p.url}>
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="scd-focus group flex items-start gap-3 px-4 py-4 hover:bg-[#f4f7fb] lg:px-5"
                    >
                      <span className="grid min-w-0 flex-1 gap-1">
                        <span className="text-[12px] font-semibold uppercase tracking-[0.05em] text-[#5a6b85]">
                          {p.source}
                          {p.publishedAt
                            ? ` · ${timeAgo(p.publishedAt, now)}`
                            : ""}
                        </span>
                        <span className="text-[16px] font-semibold leading-snug text-[#0b1e3a] group-hover:underline">
                          {p.title}
                        </span>
                      </span>
                      <ArrowUpRight
                        className="mt-1 size-4 shrink-0 text-[#9fb0c8]"
                        aria-hidden="true"
                      />
                      <span className="sr-only">
                        (apre il sito della società)
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </section>
        <aside className="grid content-start gap-3">
          <div className="rounded-[16px] bg-white p-5 shadow-[0_1px_2px_rgb(11_42_91/0.06),0_8px_24px_-12px_rgb(11_42_91/0.25)]">
            <h2 className="m-0 text-[12px] font-bold uppercase tracking-[0.1em] text-[#1556c4]">
              Come funziona
            </h2>
            <p className="m-0 mt-2 text-[14.5px] leading-snug text-[#4a5d7a]">
              Raccogliamo in automatico i titoli che nominano la società, Colico
              o Dervio (prima squadra e tutte le annate), escludendo cronaca
              nera e meteo, e gli ultimi articoli del sito della società. I
              testi restano sui siti originali.
            </p>
          </div>
          <div className="rounded-[16px] bg-[#0b2a5b] p-5 text-white">
            <h2 className="m-0 font-uv text-[24px] uppercase leading-none">
              Hai una notizia<span className="text-[#ffd600]">?</span>
            </h2>
            <p className="m-0 mt-2 text-[14.5px] leading-snug text-white/85">
              Segnala un articolo o una notizia sulla ColicoDerviese: la società
              la verifica e la pubblica.
            </p>
            <Link
              to="/contatti"
              className="scd-focus mt-3 inline-flex h-11 items-center rounded-[12px] bg-[#ffd600] px-4 text-[15px] font-bold text-[#0b1e3a] hover:brightness-95"
            >
              Segnala una notizia
            </Link>
          </div>
          <p className="m-0 px-1 text-[12.5px] text-[#5a6b85]">
            Titoli e link dalle testate originali tramite Google News.
          </p>
        </aside>
      </div>
    </main>
  );
}
