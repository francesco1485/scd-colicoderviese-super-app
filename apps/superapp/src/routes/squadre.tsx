import { createFileRoute, Link } from "@tanstack/react-router";

import { HallDoors, HallHero } from "@/components/scd/hall";
import { JoinClubScreen } from "@/components/scd/JoinClub";
import { membersOnlyHead } from "@/components/scd/MembersOnly";
import { OfficialResults } from "@/components/scd/OfficialResults";
import { dateParts, venueCase } from "@/lib/board-data";
import { getSession } from "@/lib/auth.functions";
import { getPublicCalendarSnapshot } from "@/lib/calendar.functions";
import { CLUB_PROFILE, hallTeams, type HallTeam } from "@/lib/club-profile";
import { withContent } from "@/lib/has-content";
import { romeParts } from "@/lib/home-week";
import type { PublicEvent, PublicGroup } from "@/lib/public-snapshots";
import { BASE_ACTIVITY_TEAMS } from "@/lib/social";
import { publicTeamCrest } from "@/lib/team-crest";
import { isShowcaseTeam } from "@/lib/team-showcase";

/**
 * Teams are inside (UD-100, Direzione 13/10/2026): rosters, team pages, next matches and news stay for members.
 * Visitors (Francesco 16/10/2026 23:08 «non voglio pagine vuote») get a public page instead of a lock: the categories
 * of the season with championship (only where verified), birth years and the link to the public games calendar, plus
 * Registrati / Entra. Data comes from the anonymous calendar snapshot (fixtures only, no annata crests, no people)
 * reduced to the fields shown (on client-side navigation the loader sees the same anonymous snapshot that /calendario
 * already shows): no names, no rosters, no minors' data.
 */
export const Route = createFileRoute("/squadre")({
  loader: async () => {
    const session = await getSession();
    const calendar = await getPublicCalendarSnapshot();
    if (!session.user)
      return { signedIn: false as const, teams: publicTeams(hallTeams(calendar.groups)) };
    const now = new Date().toISOString();
    // "Today" in Europe/Rome, fixed by the server so SSR and hydration agree on the next match.
    const today = romeParts(now)?.date ?? now.slice(0, 10);
    return {
      signedIn: true as const,
      groups: calendar.groups,
      events: calendar.events,
      today,
    };
  },
  head: () => membersOnlyHead("Le squadre 2026/27"),
  component: SquadreRoute,
});

function SquadreRoute() {
  const data = Route.useLoaderData();
  if (!data.signedIn) return <PublicTeamsScreen teams={data.teams} />;
  return (
    <SquadrePage groups={data.groups} events={data.events} today={data.today} />
  );
}

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
function SquadrePage({
  groups,
  events,
  today,
}: {
  groups: readonly PublicGroup[];
  events: readonly PublicEvent[];
  today: string;
}) {
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
        <Link
          to="/squadre/carte"
          className="scd-focus mt-4 flex items-center gap-3 rounded-[18px] bg-[#0b2a5b] p-3.5 text-white shadow-[0_2px_10px_rgb(11_42_91/0.08)] hover:bg-[#123a78]"
          data-testid="carte-link"
        >
          <span
            aria-hidden="true"
            className="grid h-[52px] w-[38px] shrink-0 place-items-center rounded-[8px] border-2 border-white bg-[#ffd600] font-uv text-[24px] leading-none text-[#0b2a5b]"
          >
            P
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-uv text-[20px] uppercase leading-none">
              Carte della rosa
            </span>
            <span className="mt-1 block text-[13px] leading-snug text-white/85">
              Calciatori della Prima Squadra e staff di ogni annata: tocca e
              gira le carte.
            </span>
          </span>
          <span aria-hidden="true" className="text-[22px] text-[#ffd600]">
            ›
          </span>
        </Link>
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

/** What a visitor may see of a team: category, championship (verified only), birth years, calendar link. */
interface PublicTeam {
  id: string;
  name: string;
  line: string;
  years: string | null;
  color: string;
  /** /calendario?annata=… value; null when the team has no game in the public calendar. */
  annata: string | null;
}

function publicTeams(teams: readonly HallTeam[]): PublicTeam[] {
  return withContent(teams, (t) => t.label).map((t) => ({
    id: t.id,
    name: t.label.replace(/\s·\s/g, " "),
    line: t.championship
      ? `${t.championship.name} · ${t.championship.group}`
      : BASE_ACTIVITY_TEAMS.has(t.id)
        ? "Attività di base"
        : "Settore giovanile",
    years: t.years.length ? `${t.years.length === 1 ? "Annata" : "Annate"} ${t.years.join("–")}` : null,
    color: t.color,
    annata: t.annata,
  }));
}

/** Signed-out /squadre: the season's categories and how to join, never an empty lock. */
function PublicTeamsScreen({ teams }: { teams: readonly PublicTeam[] }) {
  return (
    <JoinClubScreen
      screen="squadre"
      kicker={`ColicoDerviese · Stagione ${CLUB_PROFILE.season}`}
      title="Le nostre squadre"
      intro={
        teams.length > 0
          ? `${teams.length} squadre tra Colico e Dervio, dalla Prima Squadra ai più piccoli. Le gare sono nel calendario pubblico; le rose di Prima Squadra, Juniores U19 Élite e Allievi U16 Élite sono aperte a tutti. Convocazioni e notizie di ogni squadra sono nell'area soci.`
          : "Dalla Prima Squadra ai più piccoli, tra Colico e Dervio. Convocazioni e notizie di ogni squadra sono nell'area soci."
      }
      next="/squadre"
      lead={
        teams.length > 0 && (
        <section
          aria-labelledby="squadre-pub-t"
          className="relative rounded-[20px] bg-white p-4 shadow-[0_2px_10px_rgb(11_42_91/0.08)] sm:p-5"
          data-testid="public-team-list"
        >
          <h2 id="squadre-pub-t" className="m-0 font-uv text-[26px] uppercase leading-none text-[#13254d]">
            Le categorie della stagione
          </h2>
          <ul className="m-0 mt-3 grid list-none grid-cols-1 gap-2.5 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {teams.map((t) => (
              <li key={t.id} data-team={t.id}>
                <PublicTeamRow t={t} />
              </li>
            ))}
          </ul>
          <p className="m-0 mt-3 text-[13px] leading-snug text-[#3e5272]">
            Squadre dal calendario SCD della stagione. Il campionato è indicato solo dove è verificato sul sito della
            LND; per le altre squadre mostriamo la categoria.
          </p>
        </section>
        )
      }
    />
  );
}

function PublicTeamRow({ t }: { t: PublicTeam }) {
  const body = (
    <>
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[5px]" style={{ background: t.color }} />
      <span className="min-w-0 flex-1">
        <span className="block font-title text-[19px] font-black uppercase leading-[1.05]">{t.name}</span>
        <span className="mt-1 block text-[13.5px] font-semibold leading-snug text-[#3e5272]">{t.line}</span>
        {t.years && <span className="block text-[13px] text-[#4a5d7a]">{t.years}</span>}
      </span>
      {(t.annata || isShowcaseTeam(t.id)) && (
        <span className="inline-flex shrink-0 items-center gap-1 text-[13.5px] font-bold text-[#0457af]">
          {isShowcaseTeam(t.id) ? "Rosa" : "Gare"}
          <span aria-hidden="true">›</span>
        </span>
      )}
    </>
  );
  const cls =
    "relative flex min-h-[72px] items-center gap-3 overflow-hidden rounded-[16px] bg-white py-3 pl-4 pr-3.5 text-[#13254d] shadow-[0_2px_10px_rgb(11_42_91/0.08)]";
  // Vetrina squadre (UD-168): the three showcase teams open their public page (roster, staff, stats).
  if (isShowcaseTeam(t.id))
    return (
      <Link
        to="/squadre/$team"
        params={{ team: t.id }}
        className={`scd-focus ${cls} transition-colors hover:border-[#9fbde4] hover:bg-white`}
        aria-label={`ColicoDerviese ${t.name}: ${t.line}. Apri la rosa, aperta a tutti`}
      >
        {body}
      </Link>
    );
  return t.annata ? (
    <Link
      to="/calendario"
      search={{ annata: t.annata }}
      className={`scd-focus ${cls} transition-colors hover:border-[#9fbde4] hover:bg-white`}
      aria-label={`ColicoDerviese ${t.name}: ${t.line}${t.years ? `, ${t.years}` : ""}. Apri le gare nel calendario`}
    >
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
