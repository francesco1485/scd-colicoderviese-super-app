import { createFileRoute, Link } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";

import { ClubCrestOfficial } from "@/components/SiteChrome";
import { HallDoors, HallHero } from "@/components/scd/hall";
import { OfficialResults } from "@/components/scd/OfficialResults";
import { getPublicCalendarSnapshot } from "@/lib/calendar.functions";
import { CLUB_PROFILE, hallTeams, type HallTeam } from "@/lib/club-profile";
import { BASE_ACTIVITY_TEAMS } from "@/lib/social";
import { teamCrest } from "@/lib/team-crest";

export const Route = createFileRoute("/squadre")({
  loader: () => getPublicCalendarSnapshot(),
  head: () => ({
    meta: [
      { title: "Le squadre 2026/27 — S.C.D. ColicoDerviese" },
      {
        name: "description",
        content:
          "Tutte le squadre della S.C.D. ColicoDerviese nella stagione 2026/27: Prima Squadra in Promozione girone D, Juniores Regionale U19 Élite e settore giovanile, con rosa, calendario e risultati ufficiali.",
      },
      {
        property: "og:title",
        content: "Le squadre 2026/27 — S.C.D. ColicoDerviese",
      },
      {
        property: "og:description",
        content:
          "Dalla Prima Squadra ai Piccoli Amici: rosa, calendario e risultati di ogni squadra.",
      },
    ],
  }),
  component: SquadrePage,
});

function SquadrePage() {
  const { groups } = Route.useLoaderData();
  const teams = hallTeams(groups);
  return (
    <main
      data-screen="squadre"
      className="scd-pub min-h-screen bg-[#eef3f9] pb-24 font-text text-[#0b1e3a] lg:pb-12"
    >
      <HallHero
        kicker={`Stagione ${CLUB_PROFILE.season}`}
        title="Le nostre squadre"
      >
        {teams.length} squadre tra Colico e Dervio, dalla Prima Squadra ai più
        piccoli. Tocca una squadra per rosa, gare e notizie.
      </HallHero>
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <ul
          className="relative z-10 m-0 -mt-6 grid list-none grid-cols-2 gap-3 p-0 md:grid-cols-3 xl:grid-cols-4"
          data-testid="team-list"
        >
          {teams.map((t) => (
            <TeamTile key={t.id} t={t} />
          ))}
        </ul>
        <p className="m-0 mt-3 text-[13px] leading-snug text-[#5a6b85]">
          Squadre e numero di gare dal calendario SCD della stagione. Il
          campionato è indicato solo dove è verificato sul sito della LND; per
          le altre squadre mostriamo la categoria.
        </p>
        <div className="mt-6 rounded-[20px] bg-white p-4 shadow-[0_2px_10px_rgb(11_42_91/0.08)] sm:p-5">
          <OfficialResults />
        </div>
        <div className="mt-8 rounded-[20px] bg-[var(--out-night)] p-4 sm:p-5">
          <HallDoors exclude="/squadre" title="Il resto del club" />
        </div>
      </div>
    </main>
  );
}

function TeamTile({ t }: { t: HallTeam }) {
  const crest = teamCrest(t);
  const base = BASE_ACTIVITY_TEAMS.has(t.id);
  const line = t.championship
    ? `${t.championship.name} · ${t.championship.group}`
    : base
      ? "Attività di base"
      : "Settore giovanile";
  const games =
    t.matches > 0
      ? `${t.matches} ${t.matches === 1 ? "gara" : "gare"}`
      : "Calendario in arrivo";
  return (
    <li id={`squadra-${t.id}`} className="scroll-mt-24" data-team={t.id}>
      <Link
        to="/squadre/$team"
        params={{ team: t.id }}
        className="scd-focus flex h-full flex-col gap-2.5 rounded-[18px] bg-white p-3.5 text-[#0b1e3a] shadow-[0_2px_10px_rgb(11_42_91/0.08)] transition-shadow hover:shadow-[0_8px_22px_rgb(11_42_91/0.16)]"
        aria-label={`${t.label.replace(/\s·\s/g, " ")}: ${line}, ${games}`}
      >
        <span className="flex items-center justify-between gap-2">
          {crest ? (
            <img
              src={crest}
              alt=""
              width={56}
              height={56}
              loading="lazy"
              className="size-14 rounded-full bg-white object-contain"
            />
          ) : (
            <ClubCrestOfficial size={56} />
          )}
          <span
            aria-hidden="true"
            className="size-3 rounded-full"
            style={{ background: t.color }}
          />
        </span>
        <span className="min-w-0">
          <span className="block font-title text-[20px] font-black uppercase leading-[1] sm:text-[22px]">
            {t.label.replace(/\s·\s/g, " ")}
          </span>
          <span className="mt-1.5 block text-[13px] font-semibold leading-snug text-[#3e5272]">
            {line}
          </span>
          <span className="mt-0.5 block text-[13px] text-[#5a6b85]">
            {games}
          </span>
        </span>
      </Link>
    </li>
  );
}
