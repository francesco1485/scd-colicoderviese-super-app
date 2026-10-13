/**
 * Sections of the signed-in member home (UD-095, UD-100, Direzione 13/10/2026): why come, why enter, why sign up. One card system (white, radius 18, soft shadow), Big Shoulders only for section titles, Fira Sans
 * body, navy/blue/white with yellow only on the primary button and one highlight. Real data only: calendar
 * snapshot, sponsor list 2026/27, club profile. No crest, number or name is invented.
 */
import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

import { venueCase } from "@/lib/board-data";
import type { HallTeam } from "@/lib/club-profile";
import { romeParts, type WeekItem } from "@/lib/home-week";
import { sponsorLabel, type Sponsor } from "@/lib/sponsors";
import { itemState, type Team } from "@/lib/universe";
import {
  competitionBadge,
  dayChip,
  dayCount,
  sideTone,
} from "@/lib/week-style";

import { sides } from "./match-sides";
import { OpponentCrest } from "@/lib/crests";
import { publicTeamCrest } from "@/lib/team-crest";

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
          {/* The site header above already shows the official crest: no second copy here. */}
          <h1 className="m-0 flex items-center gap-3">
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
export function venueShort(v: string): string {
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
  highlightId,
  nowMs,
  lead,
}: {
  items: readonly WeekItem[];
  teamOf: (i: WeekItem) => Team | undefined;
  highlightId: string | null;
  nowMs: number;
  /** Optional lead panel (public home matchday card): above the list on phones, a sticky column beside it on desktop. */
  lead?: ReactNode;
}) {
  const days = [...new Set(items.map((i) => i.date))];
  const today =
    romeParts(new Date(nowMs).toISOString())?.date ??
    new Date(nowMs).toISOString().slice(0, 10);
  const list = (
    <Card className={`overflow-hidden ${lead ? "min-w-0" : ""}`}>
      {items.length === 0 ? (
        <p className="m-0 px-4 py-5 text-[15px] text-[#3e5272]">
          Nessuna gara nei prossimi sette giorni: è settimana di allenamenti.
        </p>
      ) : (
        days.map((d) => {
          const rows = items.filter((i) => i.date === d);
          const chip = dayChip(d, today);
          return (
            <div
              key={d}
              className="border-b border-[#e6edf6] last:border-b-0"
              data-day-tone={chip.tone}
            >
              <h3 className="m-0 flex items-center gap-2.5 bg-[linear-gradient(90deg,#f1f5fb,#fff)] px-4 py-2">
                <span
                  className={`inline-flex h-[26px] items-center rounded-[7px] px-2.5 font-title text-[16px] font-extrabold uppercase leading-none tracking-[0.04em] ${
                    chip.tone === "today"
                      ? "bg-[#ffd600] text-[#0b1e3a] shadow-[0_2px_0_#c9a800]"
                      : chip.tone === "tomorrow"
                        ? "bg-[#1556c4] text-white"
                        : "bg-[#0b2a5b] text-white"
                  }`}
                >
                  {chip.label}
                </span>
                <span className="min-w-0 flex-1 truncate text-[13.5px] font-bold uppercase tracking-[0.05em] text-[#0b2a5b]">
                  {chip.date}
                </span>
                <span className="shrink-0 text-[12.5px] font-semibold text-[#5a6b85]">
                  {dayCount(rows)}
                </span>
              </h3>
              <ul className="m-0 list-none p-0">
                {rows.map((i) => (
                  <GameRow
                    key={i.id}
                    item={i}
                    team={teamOf(i)}
                    highlight={i.id === highlightId}
                    live={itemState(i, nowMs) === "live"}
                  />
                ))}
              </ul>
            </div>
          );
        })
      )}
    </Card>
  );
  return (
    <section aria-labelledby="settimana-t" data-testid="week-games">
      <SectionTitle id="settimana-t" more="/calendario" moreLabel="Tutte">
        Si gioca questa settimana
      </SectionTitle>
      {lead ? (
        <div className="grid gap-3 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)] lg:items-start lg:gap-5">
          <div className="lg:sticky lg:top-[calc(var(--pub-header-h,64px)+16px)]">
            {lead}
          </div>
          {list}
        </div>
      ) : (
        list
      )}
    </section>
  );
}

/** One game of the week. Our side: official club crest + "ColicoDerviese" and the team chip (annata crests stay internal). */
function GameRow({
  item,
  team,
  highlight,
  live,
}: {
  item: WeekItem;
  team: Team | undefined;
  highlight: boolean;
  live: boolean;
}) {
  const { opponent: rawOpponent, weHome } = sides(item);
  const opponent = rawOpponent
    ? venueCase(rawOpponent)
    : "Avversario da definire";
  const us = team?.short ?? item.groupLabel.split("·")[0]!.trim();
  const tone = sideTone(item.homeAway);
  const comp = competitionBadge(item.competition);
  const bar = live
    ? "bg-[#e5243b]"
    : highlight
      ? "bg-[#ffd600]"
      : tone === "home"
        ? "bg-[#1556c4]"
        : tone === "away"
          ? "bg-[#9cc3ea]"
          : "bg-[#dbe5f1]";
  const ours = (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <span className="font-title text-[18px] font-extrabold uppercase leading-none text-[#0b2a5b]">
        ColicoDerviese
      </span>
      <span className="inline-flex h-[20px] shrink-0 items-center rounded-full bg-[#e7effa] px-2 text-[11.5px] font-bold leading-none text-[#1556c4]">
        {us}
      </span>
    </span>
  );
  const theirs = (
    <span className="font-title text-[18px] font-bold uppercase leading-none text-[#0b1e3a]">
      {opponent}
    </span>
  );
  return (
    <li className="border-t border-[#eef2f8] first:border-t-0">
      <Link
        to="/calendario"
        search={{ annata: item.group }}
        className={`scd-focus group relative flex items-center gap-3 py-2.5 pl-[18px] pr-3 transition-colors duration-150 hover:bg-[#f4f7fb] lg:pr-4 ${highlight || live ? "bg-[#fffbe6]" : ""}`}
        aria-current={highlight ? "true" : undefined}
        data-side={tone}
      >
        <span
          aria-hidden="true"
          className={`absolute inset-y-1.5 left-1.5 w-[4px] rounded-full ${bar}`}
        />
        <span className="flex w-[50px] shrink-0 flex-col items-start gap-1">
          <span className="font-title text-[24px] font-black tabular-nums leading-none text-[#0b2a5b]">
            {item.time || "—"}
          </span>
          {tone !== "none" && (
            <span
              className={`inline-flex h-[17px] items-center rounded-[5px] px-1.5 text-[10px] font-extrabold uppercase leading-none tracking-[0.08em] ${
                tone === "home"
                  ? "bg-[#1556c4] text-white"
                  : "border border-[#9cc3ea] bg-white text-[#1556c4]"
              }`}
            >
              {tone === "home" ? "Casa" : "Fuori"}
            </span>
          )}
        </span>
        <span className="flex shrink-0 items-center -space-x-1">
          <span className="relative z-[1] grid size-[32px] place-items-center rounded-full bg-white shadow-[0_1px_4px_rgb(11_42_91/0.18)]">
            <img
              src={publicTeamCrest()}
              alt=""
              width={20}
              height={26}
              loading="lazy"
              className="h-[24px] w-auto object-contain"
            />
          </span>
          <OpponentCrest name={rawOpponent} size={32} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
            {weHome ? ours : theirs}
            <span className="text-[12px] font-semibold uppercase text-[#8a9ab3]">
              vs
            </span>
            {weHome ? theirs : ours}
          </span>
          <span className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] leading-none text-[#5a6b85]">
            {live ? (
              <span className="inline-flex h-[18px] items-center gap-1.5 rounded-full bg-[#e5243b] px-2 text-[10.5px] font-extrabold uppercase tracking-[0.08em] text-white">
                <span
                  aria-hidden="true"
                  className="scd-live-dot size-1.5 rounded-full bg-white"
                />
                Live
              </span>
            ) : highlight ? (
              <span className="inline-flex h-[18px] items-center rounded-full bg-[#0b2a5b] px-2 text-[10.5px] font-extrabold uppercase tracking-[0.08em] text-[#ffd600]">
                Prossima
              </span>
            ) : null}
            {comp && (
              <span className="inline-flex h-[18px] items-center rounded-full border border-[#c9d6e8] px-2 text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#0b2a5b]">
                {comp}
              </span>
            )}
            {item.venue && (
              <span className="truncate">{venueShort(item.venue)}</span>
            )}
            {!item.certain && (
              <span className="inline-flex h-[18px] items-center rounded-full bg-[#fff4c2] px-2 text-[10.5px] font-bold uppercase tracking-[0.04em] text-[#7a5c00]">
                da confermare
              </span>
            )}
          </span>
        </span>
        <ChevronRight
          className="hidden size-5 shrink-0 text-[#c3cfe0] transition-transform duration-150 group-hover:translate-x-0.5 lg:block"
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
    text: "Convocazioni da prendere in visione, impegni della settimana, pulmini, documenti e certificato medico in un posto solo.",
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
          Matricola FIGC {matricola} · Club Giovanile di 3° livello FIGC SGS ·
          iscritta FIGC con LND Lombardia · {affiliation}
        </p>
      </Card>
    </section>
  );
}

/* ---------------------------------------------------------------- teams */

/**
 * Our teams as clean text tiles. The club crest appears once in the card header: annata crests are internal only
 * (Direzione, 13/10/2026) and nine copies of the same club crest would only repeat themselves.
 */
export function TeamsGrid({ teams }: { teams: readonly HallTeam[] }) {
  return (
    <section aria-labelledby="squadre-t" data-testid="teams-grid">
      <SectionTitle id="squadre-t" more="/squadre" moreLabel="Tutte">
        Le nostre squadre
      </SectionTitle>
      <Card className="p-2">
        <p className="m-0 flex items-center gap-2.5 px-2 pb-2.5 pt-1.5">
          <img
            src={publicTeamCrest()}
            alt="Stemma ufficiale S.C.D. ColicoDerviese"
            width={26}
            height={34}
            loading="lazy"
            className="h-[34px] w-auto object-contain"
          />
          <span className="grid leading-tight">
            <b className="text-[15px] text-[#0b1e3a]">ColicoDerviese</b>
            <span className="text-[12.5px] text-[#5a6b85]">
              {teams.length} squadre tra Colico e Dervio
            </span>
          </span>
        </p>
        <ul className="m-0 grid list-none grid-cols-2 gap-1.5 p-0 sm:grid-cols-3 lg:grid-cols-5">
          {teams.map((t) => {
            const title = t.label.split("·")[0]!.trim();
            const sub = t.label.includes("·")
              ? t.label.split("·").slice(1).join("·").trim()
              : t.years.join("/");
            return (
              <li key={t.id}>
                <Link
                  to="/squadre/$team"
                  params={{ team: t.id }}
                  aria-label={`ColicoDerviese · ${t.label.replace(/\s·\s/g, " ")}`}
                  className="scd-focus flex h-full min-h-[64px] items-stretch gap-2.5 rounded-[12px] bg-[#f4f7fb] px-2.5 py-2 hover:bg-[#e9f0f8]"
                >
                  <span
                    aria-hidden="true"
                    className="w-[4px] shrink-0 rounded-full"
                    style={{ background: t.color }}
                  />
                  <span className="grid min-w-0 content-center gap-0.5">
                    <b className="text-[14px] leading-tight text-[#0b1e3a]">
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
