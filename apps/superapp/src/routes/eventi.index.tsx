import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { PageHero, heroOverlapCls } from "@/components/ui-kit";
import { getPublicFeed } from "@/lib/club.functions";
import { dayMonth, type Initiative } from "@/lib/initiatives";
import { getActiveInitiatives } from "@/lib/initiatives.functions";
import { KIND_LABEL, longDay, type PublicLottery } from "@/lib/lottery";
import { getPublicLottery } from "@/lib/lottery.functions";
import { PUBLIC_PAGES, pageHead } from "@/lib/share";
import { hasContent } from "@/lib/has-content";
import { TOURNAMENTS, TOURNAMENT_STATUS_LABEL } from "@/lib/tournaments";

export const Route = createFileRoute("/eventi/")({
  loader: async () => {
    const [feed, initiatives, lottery] = await Promise.all([
      getPublicFeed(),
      // Server-side window (Rome day): an initiative is listed only from showFrom to showUntil.
      getActiveInitiatives().catch(() => ({ today: "", items: [] as Initiative[] })),
      // Lotteria dello sport (UD-115): listed only once the Direzione publishes it, inside its window.
      getPublicLottery()
        .then((r) => r.lottery)
        .catch(() => null as PublicLottery | null),
    ]);
    return { feed, initiatives: initiatives.items, lottery };
  },
  head: () => pageHead(PUBLIC_PAGES.eventi),
  component: Eventi,
});

function Eventi() {
  const { feed, initiatives, lottery } = Route.useLoaderData();
  const eventi = feed.items.filter((i) => i.kind === "event");
  return (
    <main>
      <PageHero motif="mountains-lake" eyebrow="Vivere il club" title="Eventi">
        Iscrizioni gratuite oggi; eventuali quote future saranno indicate su
        ogni evento.
      </PageHero>
      <section className={`${heroOverlapCls} mx-auto max-w-6xl px-4 pb-5`}>
        <Link
          to="/eventi/christmas-lario-cup"
          className="relative flex min-h-[220px] items-end overflow-hidden rounded-[20px] bg-[#021f4f] text-white shadow-premium"
          data-testid="eventi-clc"
        >
          <img
            src="/media/eventi/christmas-lario-cup-2026-maschile.webp"
            alt=""
            className="absolute inset-0 size-full object-cover object-top opacity-75"
            loading="lazy"
          />
          <span
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-b from-transparent to-[rgb(2_31_79/0.95)]"
          />
          <span className="relative grid gap-1 p-5">
            <span className="text-sm font-bold uppercase tracking-wider text-[#ffd21f]">
              Torneo protetto · 8 dicembre 2026
            </span>
            <b className="font-uv text-[34px] uppercase leading-[0.92]">
              Christmas Lario Cup
            </b>
            <span className="text-[15px] text-[#dbe7ff]">
              1ª edizione a Colico e Dervio, iscrizioni aperte.
            </span>
          </span>
        </Link>
      </section>
      {lottery && <LotteryCard lottery={lottery} />}
      {/* Rendered only with something to show ("pagine piene", 16/10/2026): no empty "Nessuna iniziativa" block. */}
      {hasContent(initiatives) && (
        <section
          id="iniziative"
          aria-label="Iniziative"
          className="scroll-mt-20 mx-auto grid max-w-6xl gap-4 px-4 pb-5 md:grid-cols-2"
          data-testid="eventi-iniziative"
        >
          {initiatives.map((i) => <InitiativeCard key={i.id} item={i} />)}
        </section>
      )}
      <section className="mx-auto grid max-w-6xl gap-5 px-4 md:grid-cols-3">
        {eventi.length === 0 ? (
          // No club event published: lead with the tournaments that exist (lib/tournaments.ts), not with an absence.
          <SeasonTournaments />
        ) : (
          eventi.map((e) => (
            <article key={e.id} className="overflow-hidden card-premium">
              {e.image && (
                <img
                  src={e.image}
                  alt={e.title}
                  loading="lazy"
                  className="h-44 w-full object-cover"
                />
              )}
              <div className="space-y-2 p-5">
                {e.startAt && (
                  <p className="eyebrow">
                    {new Date(e.startAt).toLocaleDateString("it-IT", {
                      day: "numeric",
                      month: "long",
                    })}
                  </p>
                )}
                <h2 className="text-xl font-bold">{e.title}</h2>
                {e.body && (
                  <p className="text-sm text-muted-foreground">{e.body}</p>
                )}
                {e.link && (
                  <a
                    href={e.link}
                    className="surface-sun inline-block rounded-lg px-4 py-2 text-sm font-bold uppercase"
                  >
                    Partecipa
                  </a>
                )}
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}

function InitiativeCard({ item }: { item: Initiative }) {
  return (
    <Link
      to={item.href as never}
      className="group grid grid-cols-[104px_minmax(0,1fr)] overflow-hidden rounded-[20px] bg-white shadow-premium sm:grid-cols-[150px_minmax(0,1fr)]"
      data-testid={`eventi-initiative-${item.id}`}
    >
      <img
        src={item.flyer.src}
        alt=""
        loading="lazy"
        decoding="async"
        className="h-full min-h-[150px] w-full object-cover object-top"
      />
      <span className="grid content-start gap-1.5 p-4">
        <span className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[#ffd21f] px-2 py-[3px] text-[11px] font-extrabold uppercase leading-none tracking-[0.06em] text-[#0b1e3a]">
            Iniziativa
          </span>
          <span className="text-[12px] font-semibold uppercase tracking-[0.05em] text-[#5a6b85]">
            Fino al {dayMonth(item.showUntil)}
          </span>
        </span>
        <b className="text-[19px] leading-tight text-[#0b1e3a]">{item.title}</b>
        <span className="text-[14px] leading-snug text-[#4a5d7a]">
          {item.subtitle}
        </span>
        <span className="mt-1 inline-flex items-center gap-1 text-[14px] font-semibold text-[#1556c4]">
          Dettagli e contatti
          <ArrowRight
            className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </span>
      </span>
    </Link>
  );
}

function LotteryCard({ lottery }: { lottery: PublicLottery }) {
  return (
    <section aria-label="Iniziativa benefica" className="mx-auto max-w-6xl px-4 pb-5">
      <Link
        to="/eventi/lotteria-dello-sport"
        className="group grid gap-1.5 rounded-[20px] bg-white p-5 shadow-premium"
        data-testid="eventi-lotteria"
      >
        <span className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[#ffd21f] px-2 py-[3px] text-[11px] font-extrabold uppercase leading-none tracking-[0.06em] text-[#0b1e3a]">
            Iniziativa benefica
          </span>
          {lottery.sportDay && (
            <span className="text-[12px] font-semibold uppercase tracking-[0.05em] text-[#5a6b85]">
              Giornata dello sport · {longDay(lottery.sportDay)}
            </span>
          )}
        </span>
        <b className="text-[19px] leading-tight text-[#0b1e3a]">{lottery.title || `${KIND_LABEL[lottery.kind]} dello sport`}</b>
        <span className="text-[14px] leading-snug text-[#4a5d7a]">{lottery.beneficiary}</span>
        <span className="mt-1 inline-flex items-center gap-1 text-[14px] font-semibold text-[#1556c4]">
          Premi, biglietti e regole
          <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
        </span>
      </Link>
    </section>
  );
}

/** Tournaments of the season after the hero (Christmas Lario Cup maschile is the hero): one row each, to /tornei. */
function SeasonTournaments() {
  const rows = TOURNAMENTS.filter((t) => t.id !== "christmas-lario-cup-maschile");
  return (
    <div className="pb-10 md:col-span-3" data-testid="eventi-tornei">
      <h2 className="m-0 font-uv text-[26px] uppercase leading-none text-[#13254d]">Tornei della stagione</h2>
      <ul className="m-0 mt-3 grid list-none gap-2.5 p-0 md:grid-cols-3">
        {rows.map((t) => (
          <li key={t.id}>
            <Link
              to="/tornei"
              hash={t.id}
              className="scd-focus relative flex h-full flex-col overflow-hidden rounded-[18px] bg-white py-3.5 pl-5 pr-4 text-[#13254d] shadow-premium"
              data-testid={`eventi-torneo-${t.id}`}
            >
              <span aria-hidden="true" className="scd-band-sole absolute inset-y-0 left-0 w-[6px]" />
              <span className="text-[12px] font-bold uppercase tracking-[0.06em] text-[#034a96]">
                {t.section} · {TOURNAMENT_STATUS_LABEL[t.status]}
              </span>
              <b className="mt-1 block text-[18px] leading-tight">{t.name}</b>
              {t.when && <span className="mt-0.5 block text-[14px] font-semibold text-[#3e5272]">{t.when}</span>}
              <span className="mt-1 block flex-1 text-[14px] leading-snug text-[#3e5272]">{t.text}</span>
              <span className="mt-2 inline-flex items-center gap-1 text-[14px] font-bold text-[#0457af]">
                Scheda del torneo
                <ArrowRight className="size-4" aria-hidden="true" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          to="/calendario"
          className="scd-gold scd-focus inline-flex h-11 items-center rounded-[12px] px-4 text-sm font-bold uppercase"
        >
          Gare nel calendario
        </Link>
        <Link
          to="/tornei"
          className="scd-focus inline-flex h-11 items-center rounded-[12px] border border-[#c9d6e6] bg-white px-4 text-sm font-bold uppercase text-[#13254d]"
        >
          Tutti i tornei
        </Link>
      </div>
    </div>
  );
}
