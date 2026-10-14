import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarDays,
  Handshake,
  MapPin,
  Trophy,
} from "lucide-react";

import {
  PUBLIC_WRAP,
  PublicPageHeader,
} from "@/components/home/PublicPageHeader";
import { CastPresence } from "@/components/scd/CastPresence";
import { ShareButton } from "@/components/scd/ShareButton";
import { tournamentText } from "@/lib/cast-live";
import { getActiveInitiatives } from "@/lib/initiatives.functions";
import { romeDay } from "@/lib/public-window";
import { SHARE_PAGES, pageMeta } from "@/lib/share";
import {
  TOURNAMENT_STATUS_LABEL,
  upcomingTournaments,
  type TournamentEdition,
} from "@/lib/tournaments";

/**
 * Tornei hub (UD-110): every club tournament on one public page, from lib/tournaments.ts (real data only). The
 * Christmas Lario Cup is listed twice on purpose (maschile at Colico, Female Edition at Dervio); tournaments whose
 * programme is not published show their status and no invented detail.
 */
export const Route = createFileRoute("/tornei")({
  // Server Rome day (never the visitor's clock) decides which tournaments are still to come.
  loader: async () => {
    const { today } = await getActiveInitiatives().catch(() => ({
      today: romeDay(Date.now()),
    }));
    return { today };
  },
  head: () => ({ meta: pageMeta(SHARE_PAGES.tornei) }),
  component: TorneiPage,
});

const STATUS_TONE: Record<TournamentEdition["status"], string> = {
  ISCRIZIONI_APERTE: "bg-[#ffd600] text-[#0b1e3a]",
  IN_PROGRAMMA: "bg-[#1556c4] text-white",
  DATE_DA_CONFERMARE: "bg-[#e6eefa] text-[#0b2a5b]",
  IN_PREPARAZIONE: "bg-[#e6eefa] text-[#0b2a5b]",
};

function TournamentCard({ t }: { t: TournamentEdition }) {
  return (
    <article
      id={t.id}
      aria-labelledby={`${t.id}-t`}
      className="grid scroll-mt-24 overflow-hidden rounded-[16px] bg-white shadow-[0_1px_2px_rgb(11_42_91/0.06),0_8px_24px_-12px_rgb(11_42_91/0.25)] sm:grid-cols-[180px_minmax(0,1fr)] lg:grid-cols-[220px_minmax(0,1fr)]"
      data-testid="tournament"
      data-status={t.status}
    >
      {t.poster ? (
        <img
          src={t.poster.src}
          alt={t.poster.alt}
          loading="lazy"
          decoding="async"
          className="aspect-[4/3] h-full w-full bg-[#0b2a5b] object-cover object-top sm:aspect-auto sm:min-h-[220px]"
        />
      ) : (
        <div
          aria-hidden="true"
          className="relative grid aspect-[4/3] place-items-center overflow-hidden bg-[radial-gradient(120%_120%_at_90%_10%,#1556c4_0%,#0b2a5b_58%)] sm:aspect-auto sm:min-h-[220px]"
        >
          <Trophy className="size-14 text-[#ffd600]" strokeWidth={1.4} />
        </div>
      )}
      <div className="flex flex-col gap-2 p-4 lg:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[#0b2a5b] px-2.5 py-1 text-[11px] font-extrabold uppercase leading-none tracking-[0.06em] text-white">
            {t.section}
          </span>
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase leading-none tracking-[0.06em] ${STATUS_TONE[t.status]}`}
          >
            {TOURNAMENT_STATUS_LABEL[t.status]}
          </span>
        </div>
        <h3
          id={`${t.id}-t`}
          className="m-0 font-uv text-[26px] uppercase leading-[0.95] text-[#0b2a5b] lg:text-[30px]"
        >
          {t.name}
        </h3>
        <p className="m-0 text-[14.5px] leading-snug text-[#4a5d7a]">
          {t.text}
        </p>
        <ul className="m-0 grid list-none gap-1.5 p-0 text-[14px] text-[#24385a]">
          <li className="flex items-start gap-2">
            <CalendarDays
              className="mt-[2px] size-4 shrink-0 text-[#1556c4]"
              aria-hidden="true"
            />
            <span>{t.when ?? "Date in arrivo"}</span>
          </li>
          {t.place && (
            <li className="flex items-start gap-2">
              <MapPin
                className="mt-[2px] size-4 shrink-0 text-[#1556c4]"
                aria-hidden="true"
              />
              <span>{t.place}</span>
            </li>
          )}
        </ul>
        {t.categories.length > 0 && (
          <p className="m-0 text-[13.5px] leading-snug text-[#4a5d7a]">
            <b className="font-semibold text-[#0b1e3a]">Categorie:</b>{" "}
            {t.categories.join(" · ")}
          </p>
        )}
        {t.confirmedTeams.length > 0 && (
          <p className="m-0 text-[13.5px] leading-snug text-[#4a5d7a]">
            <b className="font-semibold text-[#0b1e3a]">Squadre confermate:</b>{" "}
            {t.confirmedTeams.join(", ")}
          </p>
        )}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
          {t.link ? (
            <Link
              to={t.link.to as never}
              {...(t.link.hash ? { hash: t.link.hash } : {})}
              className="scd-focus inline-flex h-11 items-center gap-1.5 rounded-[12px] bg-[#ffd600] px-4 text-[15px] font-bold text-[#0b1e3a] hover:brightness-95"
            >
              {t.link.label}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          ) : (
            <span className="text-[13.5px] font-semibold text-[#5a6b85]">
              Programma e iscrizioni appena pubblicati
            </span>
          )}
          <span className="text-[11.5px] text-[#7a8aa3]">
            Fonte: {t.source}
          </span>
        </div>
      </div>
    </article>
  );
}

function TorneiPage() {
  const { today } = Route.useLoaderData();
  const list = upcomingTournaments(today);
  return (
    <main
      data-screen="tornei"
      className="min-h-dvh bg-[#eef3f9] pb-10 text-[#0b1e3a]"
    >
      <PublicPageHeader
        eyebrow="Eventi e tornei"
        title="I nostri"
        accent="tornei"
        action={<ShareButton page={SHARE_PAGES.tornei} />}
      >
        Tornei giovanili maschili e femminili organizzati dalla ColicoDerviese a
        Colico e Dervio, con vivai professionistici e club del territorio.
      </PublicPageHeader>
      <section
        aria-labelledby="calendario-tornei-t"
        className={`${PUBLIC_WRAP} pt-5 lg:pt-8`}
      >
        <h2
          id="calendario-tornei-t"
          className="m-0 pb-3 font-uv text-[24px] uppercase leading-none text-[#0b2a5b] lg:text-[30px]"
        >
          Calendario tornei
        </h2>
        <div className="grid gap-4 xl:grid-cols-2">
          {list.map((t) => (
            <TournamentCard key={t.id} t={t} />
          ))}
        </div>
      </section>
      <section
        id="personaggi-tornei"
        aria-label="I personaggi dei tornei"
        className={`${PUBLIC_WRAP} scroll-mt-24 pt-6 lg:pt-10`}
        data-testid="tornei-personaggi"
      >
        <div className="max-w-3xl">
          <CastPresence
            id="mentore-tornei"
            day={today}
            live={list[0] ? { label: "Il prossimo", text: tournamentText(list[0]) } : null}
          />
        </div>
      </section>
      <section
        aria-labelledby="partecipa-t"
        className={`${PUBLIC_WRAP} pt-6 lg:pt-10`}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[16px] bg-white p-5 shadow-[0_1px_2px_rgb(11_42_91/0.06),0_8px_24px_-12px_rgb(11_42_91/0.25)]">
            <h2
              id="partecipa-t"
              className="m-0 font-uv text-[24px] uppercase leading-none text-[#0b2a5b]"
            >
              Vuoi partecipare<span className="text-[#1556c4]">?</span>
            </h2>
            <p className="m-0 mt-2 text-[14.5px] leading-snug text-[#4a5d7a]">
              Società e squadre interessate ai nostri tornei possono scriverci:
              la società risponde con programma e condizioni.
            </p>
            <Link
              to="/contatti"
              className="scd-focus mt-3 inline-flex min-h-11 items-center gap-1 rounded-md text-[15px] font-bold text-[#1556c4]"
            >
              Scrivi alla società
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="relative isolate overflow-hidden rounded-[16px] bg-[#0b2a5b] p-5 text-white">
            <Handshake
              className="absolute -right-3 -top-3 -z-10 size-28 text-white/10"
              aria-hidden="true"
            />
            <h2 className="m-0 font-uv text-[24px] uppercase leading-none">
              Il tuo marchio sui <span className="text-[#ffd600]">tornei</span>
            </h2>
            <p className="m-0 mt-2 text-[14.5px] leading-snug text-white/85">
              Title partner, naming di un campo, premio fair play e spazi nel
              villaggio: proposte su misura.
            </p>
            <Link
              to="/sponsor"
              hash="proposta"
              className="scd-focus mt-3 inline-flex h-11 items-center rounded-[12px] bg-[#ffd600] px-4 text-[15px] font-bold text-[#0b1e3a] hover:brightness-95"
            >
              Richiedi una proposta
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
