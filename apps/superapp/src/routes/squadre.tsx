import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, ExternalLink } from "lucide-react";

import { ClubCrestOfficial } from "@/components/SiteChrome";
import { HallDoors, HallHero } from "@/components/scd/hall";
import { OfficialResults } from "@/components/scd/OfficialResults";
import { getPublicCalendarSnapshot } from "@/lib/calendar.functions";
import { CLUB_PROFILE, hallTeams, type HallTeam } from "@/lib/club-profile";
import { resultLinkFor } from "@/lib/official-links";
import { loadQuadro, trainingKeyFor } from "@/lib/public-snapshots";

const SLOTS = loadQuadro().slots;

export const Route = createFileRoute("/squadre")({
  loader: () => getPublicCalendarSnapshot(),
  head: () => ({
    meta: [
      { title: "Le squadre 2026/27 — S.C.D. ColicoDerviese" },
      {
        name: "description",
        content: "Tutte le squadre della S.C.D. ColicoDerviese nella stagione 2026/27: Prima Squadra in Promozione girone D, Juniores Regionale U19 Élite e settore giovanile, con calendario e risultati ufficiali.",
      },
      { property: "og:title", content: "Le squadre 2026/27 — S.C.D. ColicoDerviese" },
      { property: "og:description", content: "Dalla Prima Squadra ai Piccoli Amici: calendario e risultati di ogni squadra." },
    ],
  }),
  component: SquadrePage,
});

function SquadrePage() {
  const { groups } = Route.useLoaderData();
  const teams = hallTeams(groups);
  return (
    <main data-screen="squadre" className="scd-pub min-h-screen bg-[var(--out-night)] pb-24 font-text text-white lg:pb-12">
      <HallHero kicker={`Stagione ${CLUB_PROFILE.season}`} title="Le nostre squadre">
        {teams.length} squadre tra Colico e Dervio, dalla Prima Squadra ai più piccoli. Tocca una squadra per il suo calendario.
      </HallHero>
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <ul className="relative z-10 m-0 -mt-6 grid list-none gap-3 p-0 md:grid-cols-2" data-testid="team-list">
          {teams.map((t) => (
            <TeamCard key={t.id} t={t} />
          ))}
        </ul>
        <p className="m-0 mt-3 text-[13px] leading-snug text-[var(--out-text-soft)]">
          Squadre e numero di gare dal calendario SCD della stagione. Il campionato è indicato solo dove è verificato sul sito della LND; per le altre squadre
          mostriamo la categoria. Niente nomi di atleti né foto dei ragazzi.
        </p>
        <div className="mt-8 rounded-[18px] bg-white p-4 sm:p-5">
          <OfficialResults />
        </div>
        <HallDoors exclude="/squadre" title="Il resto del club" className="mt-10" />
      </div>
    </main>
  );
}

function TeamCard({ t }: { t: HallTeam }) {
  const training = trainingKeyFor(t, SLOTS);
  const results = resultLinkFor(t.id);
  return (
    <li id={`squadra-${t.id}`} className="relative scroll-mt-24 overflow-hidden rounded-[16px] bg-white text-[var(--scd-ink)] shadow-[0_14px_28px_rgb(0_10_40/0.3)]" data-team={t.id}>
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[6px]" style={{ background: t.color }} />
      <div className="flex items-start gap-3 py-4 pl-5 pr-4">
        <ClubCrestOfficial size={52} />
        <div className="min-w-0 flex-1">
          <h2 className="m-0 font-title text-[26px] font-black uppercase leading-[0.95]">{t.label.replace(/\s·\s/g, " ")}</h2>
          <p className="m-0 mt-1 text-[15px] font-semibold leading-snug">
            {t.championship ? (
              <>
                {t.championship.name} · {t.championship.group}
              </>
            ) : (
              <span className="text-[var(--scd-sub)]">Categoria: {categoryOf(t)}</span>
            )}
          </p>
          <p className="m-0 mt-0.5 text-[13px] text-[var(--scd-sub)]">
            {t.matches > 0 ? `${t.matches} ${t.matches === 1 ? "gara" : "gare"} nel calendario della stagione` : "Nessuna gara nel calendario pubblico"}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 border-t border-[var(--scd-line)] px-4 py-3 pl-5">
        {t.annata ? (
          <Link
            to="/calendario"
            search={{ annata: t.annata, vista: "prossime" }}
            className="scd-action inline-flex h-11 items-center gap-2 rounded-[10px] px-4 text-[15px] font-bold"
            aria-label={`Calendario ${t.label}`}
          >
            <CalendarDays className="size-[18px]" strokeWidth={2.2} aria-hidden="true" />
            Calendario
          </Link>
        ) : null}
        {training && (
          <Link
            to="/allenamenti"
            search={{ annata: training }}
            className="scd-focus inline-flex h-11 items-center rounded-[10px] border-2 border-[var(--scd-blue)] px-4 text-[15px] font-bold text-[var(--scd-blue)]"
          >
            Allenamenti
          </Link>
        )}
        {results && (
          <a
            href={results.url}
            target="_blank"
            rel="noopener noreferrer"
            className="scd-focus inline-flex h-11 items-center gap-1.5 rounded-[10px] border-2 border-[var(--scd-blue)] px-4 text-[15px] font-bold text-[var(--scd-blue)]"
          >
            Risultati ufficiali <ExternalLink className="size-4" aria-hidden="true" />
            <span className="sr-only">(gare.lnd.it, nuova scheda)</span>
          </a>
        )}
      </div>
    </li>
  );
}

/** Category as the master names it, without the year list already shown in the title. */
function categoryOf(t: HallTeam) {
  const base = t.label.split(" · ")[0]!.trim();
  return t.years.length ? `${base} (annata ${t.years.join("/")})` : base;
}
