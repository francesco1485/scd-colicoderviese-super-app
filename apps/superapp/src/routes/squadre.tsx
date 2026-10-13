import { createFileRoute, Link } from "@tanstack/react-router";

import { HallDoors, HallHero } from "@/components/scd/hall";
import { OfficialResults } from "@/components/scd/OfficialResults";
import { dateParts, venueCase } from "@/lib/board-data";
import { getPublicCalendarSnapshot } from "@/lib/calendar.functions";
import { CLUB_PROFILE, hallTeams, type HallTeam } from "@/lib/club-profile";
import { romeParts } from "@/lib/home-week";
import type { PublicEvent } from "@/lib/public-snapshots";
import { BASE_ACTIVITY_TEAMS } from "@/lib/social";
import { publicTeamCrest } from "@/lib/team-crest";

export const Route = createFileRoute("/squadre")({
  loader: async () => {
    const calendar = await getPublicCalendarSnapshot();
    const now = new Date().toISOString();
    // "Today" in Europe/Rome, fixed by the server so SSR and hydration agree on the next match.
    const today = romeParts(now)?.date ?? now.slice(0, 10);
    return { groups: calendar.groups, events: calendar.events, today };
  },
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

/** First match of the team from today on (calendar snapshot, already sorted by date and time). */
function nextMatchOf(
  events: readonly PublicEvent[],
  team: string,
  today: string,
): PublicEvent | null {
  return events.find((e) => e.group === team && e.date >= today) ?? null;
}

/**
 * Public teams page. Direzione rule (13/10/2026): annata crests stay internal, so the official club crest appears
 * once in the header and every team is a clean text tile (category, birth years, next match).
 */
function SquadrePage() {
  const { groups, events, today } = Route.useLoaderData();
  const teams = hallTeams(groups);
  return (
    <main
      data-screen="squadre"
      className="scd-pub min-h-screen bg-[#eef3f9] pb-24 font-text text-[#0b1e3a] lg:pb-12"
    >
      <HallHero
        kicker={`ColicoDerviese · Stagione ${CLUB_PROFILE.season}`}
        title={
          <span className="flex items-center gap-3 sm:gap-4">
            <img
              src={publicTeamCrest()}
              alt="Stemma ufficiale S.C.D. ColicoDerviese"
              width={55}
              height={72}
              className="h-[60px] w-auto shrink-0 object-contain drop-shadow-[0_2px_6px_rgb(0_0_0/0.35)] sm:h-[78px]"
            />
            <span>Le nostre squadre</span>
          </span>
        }
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
            <TeamTile
              key={t.id}
              t={t}
              next={nextMatchOf(events, t.id, today)}
            />
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

function TeamTile({ t, next }: { t: HallTeam; next: PublicEvent | null }) {
  const base = BASE_ACTIVITY_TEAMS.has(t.id);
  const name = t.label.replace(/\s·\s/g, " ");
  const line = t.championship
    ? `${t.championship.name} · ${t.championship.group}`
    : base
      ? "Attività di base"
      : "Settore giovanile";
  const years = t.years.length
    ? `${t.years.length === 1 ? "Annata" : "Annate"} ${t.years.join("–")}`
    : null;
  const d = next ? dateParts(next.date) : null;
  const when =
    next && d
      ? `${d.weekday} ${d.day} ${d.month}${next.time ? ` · ${next.time}` : ""}`
      : null;
  const where =
    next?.homeAway === "CASA"
      ? "Casa"
      : next?.homeAway === "FUORI"
        ? "Fuori"
        : null;
  const opponent = next
    ? venueCase(next.opponent || "Avversario da definire")
    : null;
  const summary = next
    ? `prossima gara ${when}${opponent ? ` contro ${opponent}` : ""}`
    : t.matches > 0
      ? "nessuna altra gara in calendario"
      : "calendario in arrivo";
  return (
    <li id={`squadra-${t.id}`} className="scroll-mt-24" data-team={t.id}>
      <Link
        to="/squadre/$team"
        params={{ team: t.id }}
        className="scd-focus relative flex h-full flex-col overflow-hidden rounded-[18px] bg-white p-3.5 pl-4 text-[#0b1e3a] shadow-[0_2px_10px_rgb(11_42_91/0.08)] transition-shadow hover:shadow-[0_8px_22px_rgb(11_42_91/0.16)]"
        aria-label={`ColicoDerviese · ${name}: ${line}${years ? `, ${years}` : ""}, ${summary}`}
      >
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-[5px]"
          style={{ background: t.color }}
        />
        <span className="block font-title text-[20px] font-black uppercase leading-[1] sm:text-[22px]">
          {name}
        </span>
        <span className="mt-1.5 block text-[13px] font-semibold leading-snug text-[#3e5272]">
          {line}
        </span>
        {years && (
          <span className="mt-0.5 block text-[13px] text-[#5a6b85]">
            {years}
          </span>
        )}
        <span aria-hidden="true" className="block min-h-2.5 flex-1" />
        <span className="block border-t border-[#e6edf6] pt-2.5 text-[12.5px] leading-snug text-[#3e5272]">
          {next ? (
            <>
              <span className="block text-[11px] font-bold uppercase tracking-[0.06em] text-[#5a6b85]">
                Prossima gara
              </span>
              <span className="block font-semibold capitalize text-[#0b1e3a]">
                {when}
              </span>
              <span className="line-clamp-2 block">
                vs {opponent}
                {where ? ` · ${where}` : ""}
              </span>
            </>
          ) : (
            <span className="block text-[#5a6b85]">
              {t.matches > 0
                ? "Nessuna altra gara in calendario"
                : "Calendario in arrivo"}
            </span>
          )}
        </span>
      </Link>
    </li>
  );
}
