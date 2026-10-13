/**
 * Public home (UD-095, Direzione 13/10/2026): a reasoned first page that answers, in order, why come, why enter,
 * why sign up. One card system (white, radius 18, soft shadow), Big Shoulders only for section titles, Fira Sans
 * body, navy/blue/white with yellow only on the primary button and one highlight. Real data only: calendar
 * snapshot, sponsor list 2026/27, club profile. No crest, number or name is invented.
 */
import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

import { ClubCrestOfficial } from "@/components/SiteChrome";
import { venueCase } from "@/lib/board-data";
import type { HallTeam } from "@/lib/club-profile";
import type { WeekItem } from "@/lib/home-week";
import { sponsorLabel, type Sponsor } from "@/lib/sponsors";
import { itemState, type Team } from "@/lib/universe";

import { sides } from "./match-sides";
import { OpponentCrest } from "@/lib/crests";
import { teamCrestSrc } from "./team-crest";

const LARIO = "/media/scd/lario-header.webp";

/* ------------------------------------------------------------ scaffolding */

export function Card({
  children,
  className = "",
  ...rest
}: { children: ReactNode; className?: string } & Record<string, unknown>) {
  return (
    <section
      className={`rounded-[18px] bg-white shadow-[0_2px_12px_rgb(11_42_91/0.08)] ${className}`}
      {...rest}
    >
      {children}
    </section>
  );
}

/** Section title: Big Shoulders, sentence case, one per section. */
export function SectionTitle({
  id,
  children,
  more,
  moreLabel = "Vedi tutto",
}: {
  id: string;
  children: ReactNode;
  more?: string;
  moreLabel?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-3 px-1 pb-2.5">
      <h2
        id={id}
        className="m-0 font-uv text-[24px] leading-none text-[#0b2a5b] lg:text-[26px]"
      >
        {children}
      </h2>
      {more && (
        <Link
          to={more}
          className="scd-focus inline-flex min-h-9 items-center gap-0.5 whitespace-nowrap rounded-md text-[14px] font-semibold text-[#1556c4]"
        >
          {moreLabel}
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------- hero */

/**
 * Compact hero: crest and wordmark on one line, what the app is in two lines, Iscriviti / Entra, the Lario as the
 * only picture. Under 45% of a 390×844 phone.
 */
export function HomeHero({
  signedIn,
  onArea,
}: {
  signedIn: boolean;
  onArea: () => void;
}) {
  return (
    <header className="bg-[#0b2a5b] text-white" data-testid="home-hero">
      <div className="mx-auto grid max-w-[1200px] items-center gap-4 px-4 pb-0 pt-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-10 lg:px-6 lg:py-8">
        <div className="grid gap-3.5 lg:gap-5">
          <h1 className="m-0 flex items-center gap-3">
            <ClubCrestOfficial size={46} className="lg:hidden" />
            <ClubCrestOfficial size={64} className="hidden lg:block" />
            <span className="whitespace-nowrap font-uv text-[clamp(26px,7.4vw,30px)] leading-none lg:text-[40px]">
              S.C.D. ColicoDerviese
            </span>
          </h1>
          <p className="m-0 text-[15.5px] leading-[1.4] text-white/90 lg:max-w-[44ch] lg:text-[19px]">
            L'app del club: partite, allenamenti, convocazioni e vita della
            società di Colico e Dervio.
          </p>
          <div className="flex gap-2.5">
            {signedIn ? (
              <>
                <button
                  type="button"
                  onClick={onArea}
                  className="scd-focus inline-flex h-11 items-center rounded-[12px] bg-[#ffd600] px-5 text-[15px] font-bold text-[#0b1e3a] lg:h-12 lg:px-6 lg:text-[16px]"
                  data-testid="home-area"
                >
                  La mia area
                </button>
                <Link
                  to="/calendario"
                  className="scd-focus inline-flex h-11 items-center rounded-[12px] border border-white/60 px-5 text-[15px] font-semibold text-white hover:bg-white/10 lg:h-12 lg:px-6 lg:text-[16px]"
                >
                  Calendario
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/registrati"
                  className="scd-focus inline-flex h-11 items-center rounded-[12px] bg-[#ffd600] px-5 text-[15px] font-bold text-[#0b1e3a] lg:h-12 lg:px-6 lg:text-[16px]"
                  data-testid="home-signup"
                >
                  Iscriviti
                </Link>
                <Link
                  to="/accedi"
                  search={{ next: undefined }}
                  className="scd-focus inline-flex h-11 items-center rounded-[12px] border border-white/60 px-5 text-[15px] font-semibold text-white hover:bg-white/10 lg:h-12 lg:px-6 lg:text-[16px]"
                  data-testid="home-enter"
                >
                  Entra
                </Link>
              </>
            )}
          </div>
        </div>
        <img
          src={LARIO}
          alt="Il centro sportivo di Colico sul Lago di Como"
          width={1600}
          height={600}
          className="-mx-4 mt-1 h-[96px] w-[calc(100%+2rem)] max-w-none object-cover object-[center_55%] lg:mx-0 lg:mt-0 lg:h-[200px] lg:w-full lg:rounded-[18px]"
          fetchPriority="high"
        />
      </div>
    </header>
  );
}

/* ------------------------------------------------------------ this week */

const dayLong = (d: string) =>
  new Intl.DateTimeFormat("it-IT", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${d}T12:00:00Z`));

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Short venue: "Colico · Campo 1" or the town of an away ground. */
function venueShort(v: string): string {
  const t = venueCase(v.trim());
  const m = t.match(/^([^-–,]+?)\s*[-–]\s*(.+)$/);
  if (!m) return t;
  const place = m[1]!.trim();
  const rest = m[2]!.replace(/,.*$/, "").trim();
  return /^colico$/i.test(place) ? `${place} · ${rest}` : place;
}

/**
 * Every game of the week, every team, grouped by day. One row only is highlighted: the game in play, or the next
 * one to start.
 */
export function WeekGames({
  items,
  teamOf,
  teamById,
  highlightId,
  nowMs,
}: {
  items: readonly WeekItem[];
  teamOf: (i: WeekItem) => Team | undefined;
  teamById: (
    id: string,
  ) => { id: string; label: string; logo: string | null } | undefined;
  highlightId: string | null;
  nowMs: number;
}) {
  const days = [...new Set(items.map((i) => i.date))];
  return (
    <section aria-labelledby="settimana-t" data-testid="week-games">
      <SectionTitle id="settimana-t" more="/calendario" moreLabel="Tutte">
        Si gioca questa settimana
      </SectionTitle>
      <Card>
        {items.length === 0 ? (
          <p className="m-0 px-4 py-5 text-[15px] text-[#3e5272]">
            Nessuna gara nei prossimi sette giorni: è settimana di allenamenti.
          </p>
        ) : (
          days.map((d) => (
            <div key={d} className="border-b border-[#e6edf6] last:border-b-0">
              <h3 className="m-0 px-4 pb-1 pt-3 text-[13px] font-bold uppercase tracking-[0.06em] text-[#5a6b85]">
                {cap(dayLong(d))}
              </h3>
              <ul className="m-0 list-none p-0 pb-1.5">
                {items
                  .filter((i) => i.date === d)
                  .map((i) => (
                    <GameRow
                      key={i.id}
                      item={i}
                      team={teamOf(i)}
                      crest={teamCrestSrc(teamById(i.group))}
                      highlight={i.id === highlightId}
                      live={itemState(i, nowMs) === "live"}
                    />
                  ))}
              </ul>
            </div>
          ))
        )}
      </Card>
    </section>
  );
}

function GameRow({
  item,
  team,
  crest,
  highlight,
  live,
}: {
  item: WeekItem;
  team: Team | undefined;
  crest: string | null;
  highlight: boolean;
  live: boolean;
}) {
  const { opponent: rawOpponent, weHome } = sides(item);
  const opponent = rawOpponent
    ? venueCase(rawOpponent)
    : "Avversario da definire";
  const us = team?.short ?? item.groupLabel.split("·")[0]!.trim();
  const label = `SCD ${us}`;
  const home = item.homeAway === "CASA";
  const meta: ReactNode[] = [];
  if (live)
    meta.push(
      <b key="live" className="text-[#c8102e]">
        In campo ora
      </b>,
    );
  else if (highlight)
    meta.push(
      <b key="next" className="text-[#0b2a5b]">
        Prossima
      </b>,
    );
  if (item.homeAway)
    meta.push(
      <span key="ha" className={home ? "font-semibold text-[#0b2a5b]" : ""}>
        {home ? "Casa" : "Fuori"}
      </span>,
    );
  if (item.venue) meta.push(<span key="venue">{venueShort(item.venue)}</span>);
  if (!item.certain)
    meta.push(
      <span key="tbc" className="text-[#8a6a00]">
        da confermare
      </span>,
    );
  return (
    <li>
      <Link
        to="/calendario"
        search={{ annata: item.group }}
        className={`scd-focus relative flex items-center gap-3 px-4 py-2.5 hover:bg-[#f4f7fb] ${highlight ? "bg-[#f7f9fc]" : ""}`}
        aria-current={highlight ? "true" : undefined}
      >
        {highlight && (
          <span
            aria-hidden="true"
            className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-[#ffd600]"
          />
        )}
        <span className="w-[42px] shrink-0 text-[15px] font-bold tabular-nums leading-none text-[#0b1e3a]">
          {item.time || "—"}
        </span>
        <span className="flex shrink-0 items-center gap-1">
          {crest ? (
            <img
              src={crest}
              alt=""
              width={30}
              height={30}
              loading="lazy"
              className="size-[30px] object-contain"
            />
          ) : (
            <span className="inline-block size-[30px] rounded-full bg-[#e6edf6]" />
          )}
          <OpponentCrest name={rawOpponent} size={30} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 text-[15px] font-semibold leading-tight text-[#0b1e3a]">
            {weHome ? (
              <>
                {label} <span className="font-normal text-[#5a6b85]">vs</span>{" "}
                {opponent}
              </>
            ) : (
              <>
                {opponent}{" "}
                <span className="font-normal text-[#5a6b85]">vs</span> {label}
              </>
            )}
          </span>
          <span className="mt-0.5 block truncate text-[13px] text-[#5a6b85]">
            {meta.map((m, i) => (
              <span key={i}>
                {i > 0 && <span aria-hidden="true"> · </span>}
                {m}
              </span>
            ))}
          </span>
        </span>
        <ChevronRight
          className="hidden size-5 shrink-0 text-[#c3cfe0] lg:block"
          aria-hidden="true"
        />
      </Link>
    </li>
  );
}

/* --------------------------------------------------------- why sign up */

const WHY: ReadonlyArray<{
  who: string;
  text: string;
  to: string;
}> = [
  {
    who: "Famiglia",
    text: "Convocazioni con conferma, impegni della settimana, pulmini, documenti e certificato medico in un posto solo.",
    to: "/registrati",
  },
  {
    who: "Atleta",
    text: "La tua squadra, gli orari e i giochi del club: Fantacalcio SCD e Top 11.",
    to: "/fantacalcio",
  },
  {
    who: "Tifoso",
    text: "Segui le squadre che vuoi e pubblica nel feed del club.",
    to: "/squadre",
  },
  {
    who: "Sponsor",
    text: "Il tuo marchio nell'app, sui campi e negli eventi di Colico e Dervio.",
    to: "/sponsor",
  },
];

export function WhyJoin() {
  return (
    <section aria-labelledby="perche-t" data-testid="why-join">
      <SectionTitle id="perche-t">Perché iscriversi</SectionTitle>
      <Card>
        <ul className="m-0 list-none divide-y divide-[#e6edf6] p-0">
          {WHY.map((w) => (
            <li key={w.who}>
              <Link
                to={w.to}
                className="scd-focus flex items-center gap-3 px-4 py-3 hover:bg-[#f4f7fb]"
              >
                <span className="w-[76px] shrink-0 text-[15px] font-bold text-[#0b2a5b]">
                  {w.who}
                </span>
                <span className="min-w-0 flex-1 text-[14.5px] leading-snug text-[#3e5272]">
                  {w.text}
                </span>
                <ChevronRight
                  className="size-5 shrink-0 text-[#9fb0c8]"
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}

/* ------------------------------------------------------ club in numbers */

export function ClubFacts({
  teams,
  towns,
  games,
  sponsors,
  season,
  matricola,
  affiliation,
}: {
  teams: number;
  towns: readonly string[];
  games: number;
  sponsors: number;
  season: string;
  matricola: string;
  affiliation: string;
}) {
  const facts: Array<{ n: string; k: string }> = [
    { n: String(teams), k: "squadre, dalla Prima ai Piccoli Amici" },
    { n: String(towns.length), k: `paesi: ${towns.join(" e ")}` },
    { n: String(games), k: `gare in calendario ${season}` },
    { n: String(sponsors), k: "sponsor e partner della stagione" },
  ];
  return (
    <section aria-labelledby="numeri-t" data-testid="club-facts">
      <SectionTitle id="numeri-t" more="/societa" moreLabel="La società">
        La società in numeri
      </SectionTitle>
      <Card className="px-4 py-3.5">
        <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-3">
          {facts.map((f) => (
            <div key={f.k} className="grid gap-0.5">
              <dt className="order-2 text-[13px] leading-snug text-[#5a6b85]">
                {f.k}
              </dt>
              <dd className="order-1 m-0 font-uv text-[30px] leading-none text-[#0b2a5b]">
                {f.n}
              </dd>
            </div>
          ))}
        </dl>
        <p className="m-0 mt-3.5 border-t border-[#e6edf6] pt-3 text-[13px] leading-snug text-[#5a6b85]">
          Matricola FIGC {matricola} · {affiliation} · Club FIGC SGS di 3°
          livello, iscritto LND
        </p>
      </Card>
    </section>
  );
}

/* ---------------------------------------------------------------- teams */

export function TeamsGrid({ teams }: { teams: readonly HallTeam[] }) {
  return (
    <section aria-labelledby="squadre-t" data-testid="teams-grid">
      <SectionTitle id="squadre-t" more="/squadre" moreLabel="Tutte">
        Le nostre squadre
      </SectionTitle>
      <Card className="p-2">
        <ul className="m-0 grid list-none grid-cols-3 gap-1 p-0 sm:grid-cols-5">
          {teams.map((t) => {
            const crest = teamCrestSrc(t);
            const title = t.label.split("·")[0]!.trim();
            const sub = t.label.includes("·")
              ? t.label.split("·").slice(1).join("·").trim()
              : t.years.join("/");
            return (
              <li key={t.id}>
                <Link
                  to="/squadre/$team"
                  params={{ team: t.id }}
                  className="scd-focus flex min-h-[112px] flex-col items-center justify-start gap-1.5 rounded-[12px] px-1 pb-2 pt-2.5 text-center hover:bg-[#f4f7fb]"
                >
                  {crest ? (
                    <img
                      src={crest}
                      alt=""
                      width={56}
                      height={56}
                      loading="lazy"
                      className="size-14 object-contain"
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="grid size-14 place-items-center rounded-full bg-[#e6edf6] text-[14px] font-bold text-[#3e5272]"
                    >
                      {title.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                  <span className="grid gap-0.5">
                    <b className="text-[13.5px] leading-tight text-[#0b1e3a]">
                      {title}
                    </b>
                    {sub && (
                      <span className="text-[12px] leading-tight text-[#5a6b85]">
                        {sub}
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Card>
    </section>
  );
}

/* ---------------------------------------------------------------- games */

export function ClubGames() {
  const games = [
    {
      to: "/fantacalcio",
      title: "Fantacalcio SCD",
      text: "Scegli i tuoi 11 tra i giocatori del club e sfida gli altri tifosi. Gratis.",
    },
    {
      to: "/top11",
      title: "Top 11",
      text: "Ogni settimana vota i migliori in campo di tutte le squadre.",
    },
  ] as const;
  return (
    <section aria-labelledby="giochi-t" data-testid="club-games">
      <SectionTitle id="giochi-t">Giochi del club</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        {games.map((g) => (
          <Link
            key={g.to}
            to={g.to}
            className="scd-focus grid content-start gap-1 rounded-[18px] bg-white px-4 py-3.5 shadow-[0_2px_12px_rgb(11_42_91/0.08)] hover:bg-[#f4f7fb]"
          >
            <b className="text-[16px] leading-tight text-[#0b2a5b]">
              {g.title}
            </b>
            <span className="text-[13.5px] leading-snug text-[#3e5272]">
              {g.text}
            </span>
            <span className="mt-1 inline-flex items-center gap-0.5 text-[14px] font-semibold text-[#1556c4]">
              Gioca
              <ChevronRight className="size-4" aria-hidden="true" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- sponsors */

export function SponsorRow({
  sponsors,
  total,
}: {
  sponsors: readonly Sponsor[];
  total: number;
}) {
  return (
    <section aria-labelledby="sponsor-t" data-testid="sponsor-row">
      <SectionTitle
        id="sponsor-t"
        more="/sponsor"
        moreLabel={`Tutti (${total})`}
      >
        Sponsor e partner
      </SectionTitle>
      <Card className="p-3">
        <ul className="m-0 grid list-none grid-cols-3 gap-2 p-0">
          {sponsors.map((s) => (
            <li key={s.slug}>
              <span className="grid h-[64px] place-items-center rounded-[12px] border border-[#e6edf6] bg-white p-2">
                <img
                  src={s.src}
                  alt={sponsorLabel(s)}
                  className="max-h-full max-w-full object-contain"
                  loading="lazy"
                />
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}
