/**
 * Public home rebuilt from scratch on the Eurobet structure (Francesco 15/10/2026 22:04: «la devi riprogettare da zero
 * completamente partendo dallo stile Eurobet»; VR-023 layout only, never betting content; UD-152 no vetrina; 16:09 no
 * big bars, professional club of 100 years). Eurobet home, translated for the club:
 *
 *   Eurobet                         → S.C.D. ColicoDerviese
 *   pill quick links ("Serie A"…)   → chips of the teams that play this week (real calendar groups) + Calendario
 *   rounded hero with white card    → ONE static match banner (kit monogram texture, white ticket card, one CTA):
 *                                     the club's most important game of the week, never a rotating slider
 *   event tiles                     → "In programma" cards of every team (category, date, two sides with crests,
 *                                     place, home/away), filter pills, link to the full calendar
 *   horizontal promo cards          → "Dal club": torneo and kit cards with the official posters (static, two only)
 *   "Scarica le app" / service tiles→ horizontal service cards (icon left, CTA right): iscrizione, prova, Iride, app
 *   "Perché scegliere Eurobet"      → "Perché la ColicoDerviese": verified credentials, the two centres, the teams
 *   right rail (betslip)            → desktop rail: "Entra nel club" (Accedi / Registrati), Iride, Dove ci alleniamo
 *
 * Data: public calendar only (games; trainings stay for members, UD-100); opponent crests only from the verified
 * registry (crestFor), otherwise an empty disc; credentials from lib/club-credentials. No minor named, no mascot.
 */
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarDays,
  ChevronRight,
  Download,
  LogIn,
  MapPin,
  MapPinned,
  MessageCircle,
  ShieldCheck,
  UserPlus,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { ClubCrestOfficial } from "@/components/SiteChrome";
import { BrushStroke } from "@/components/home/BrushStroke";
import { useMinuteClock } from "@/components/home/HomeBoard";
import { venueShort } from "@/components/home/HomeSections";
import { KitTexture } from "@/components/scd/kit-texture";
import { groupShort } from "@/lib/board-data";
import type { getPublicCalendarSnapshot } from "@/lib/calendar.functions";
import { CLUB_CREDENTIALS } from "@/lib/club-credentials";
import { crestFor } from "@/lib/crests";
import { boardDate, boardRank, nextBoardMatch } from "@/lib/home-board";
import { categoryShort, matchdayClass } from "@/lib/home-matchday";
import { weekMatches } from "@/lib/home-today";
import { smallTiles } from "@/lib/home-tiles";
import {
  WEEK_BOARD_FILTERS,
  WEEK_BOARD_FILTER_LABEL,
  matchesWeekFilter,
  weekBoardEvents,
  type WeekBoardFilter,
} from "@/lib/home-week-board";
import { SEGRETERIA_WHATSAPP } from "@/lib/install-link";
import type { PublicEvent, PublicGroup } from "@/lib/public-snapshots";

type PublicCalendar = Awaited<ReturnType<typeof getPublicCalendarSnapshot>>;

const WRAP = "mx-auto w-full max-w-[1240px] px-4 lg:px-8";
/** Eurobet-like tile: white, small radius, hairline border, no heavy shadow. */
const TILE = "rounded-[12px] border border-[#dfe7f2] bg-white";
const SHOWN_CARDS = 9;

const WD = ["DOM", "LUN", "MAR", "MER", "GIO", "VEN", "SAB"] as const;
const MON = ["GEN", "FEB", "MAR", "APR", "MAG", "GIU", "LUG", "AGO", "SET", "OTT", "NOV", "DIC"] as const;
const shortDate = (iso: string) => {
  const d = new Date(`${iso}T12:00:00Z`);
  return `${WD[d.getUTCDay()]} ${d.getUTCDate()} ${MON[d.getUTCMonth()]}`;
};

function SectionTitle({ id, children, action }: { id: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3 pb-2.5">
      <h2 id={id} className="m-0 text-[19px] font-extrabold leading-tight text-[#0b1e3a] lg:text-[22px]">
        {children}
      </h2>
      {action}
    </div>
  );
}

function MoreLink({ to, search, children }: { to: string; search?: Record<string, string>; children: ReactNode }) {
  return (
    <Link
      to={to as never}
      search={search as never}
      className="scd-focus inline-flex min-h-11 shrink-0 items-center gap-0.5 rounded-md text-[14px] font-bold text-[#1556c4] hover:underline"
    >
      {children}
      <ChevronRight className="size-4" aria-hidden="true" />
    </Link>
  );
}

/* --------------------------------------------------------------- 1. chips */

function TeamChips({ events, groups }: { events: readonly PublicEvent[]; groups: readonly PublicGroup[] }) {
  const chips = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of events) if (e.group && e.group !== "other") counts.set(e.group, (counts.get(e.group) ?? 0) + 1);
    return groups
      .filter((g) => counts.has(g.id))
      .map((g) => ({ id: g.id, label: groupShort(g, g.label), color: g.color, n: counts.get(g.id)! }));
  }, [events, groups]);
  return (
    <nav aria-label="Squadre in campo questa settimana" className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0" data-testid="home-chips">
      <ul className="m-0 flex w-max list-none gap-2 p-0 lg:w-auto lg:flex-wrap">
        <li>
          <Link
            to="/calendario"
            className="scd-focus inline-flex min-h-11 items-center gap-1.5 rounded-full bg-[#0b2a5b] px-4 text-[14px] font-bold text-white hover:bg-[#123a78]"
          >
            <CalendarDays className="size-4" aria-hidden="true" />
            Calendario
          </Link>
        </li>
        {chips.map((c) => (
          <li key={c.id}>
            <Link
              to="/calendario"
              search={{ annata: c.id }}
              className="scd-focus inline-flex min-h-11 items-center gap-2 rounded-full border border-[#dfe7f2] bg-white px-3.5 text-[14px] font-bold text-[#0b2a5b] hover:border-[#1556c4]"
              aria-label={`${c.label}: ${c.n === 1 ? "1 gara" : `${c.n} gare`} questa settimana`}
            >
              <span aria-hidden="true" className="size-2.5 rounded-full" style={{ background: c.color }} />
              {c.label}
              <span className="text-[12px] font-semibold tabular-nums text-[#5a6b85]">{c.n}</span>
            </Link>
          </li>
        ))}
        <li>
          <Link
            to="/eventi"
            className="scd-focus inline-flex min-h-11 items-center rounded-full border border-[#dfe7f2] bg-white px-3.5 text-[14px] font-bold text-[#0b2a5b] hover:border-[#1556c4]"
          >
            Eventi e tornei
          </Link>
        </li>
      </ul>
    </nav>
  );
}

/* -------------------------------------------------------------- 2. banner */

function OpponentCrest({ name, size }: { name: string; size: number }) {
  const { src, label } = crestFor(name);
  if (!src) return <span aria-hidden="true" className="block rounded-full bg-[#eef3f9]" style={{ width: size, height: size }} />;
  return (
    <img src={src} alt={`Stemma ${label}`} width={size} height={size} loading="lazy" decoding="async" className="object-contain" style={{ width: size, height: size }} />
  );
}

function MatchBanner({ calendar, nowMs, today }: { calendar: PublicCalendar; nowMs: number; today: string }) {
  const week = useMemo(() => weekMatches(calendar.events, calendar.groups, today, null), [calendar, today]);
  const m = nextBoardMatch(week, nowMs, (e) => boardRank(e, (g) => matchdayClass(g) === "agonistica"));
  const date = m ? boardDate(m.date) : null;
  const opp = m?.opponent ? crestFor(m.opponent).label : "Avversario da definire";
  const cat = m ? categoryShort(m.group, calendar.groups, m.team) : "";
  const weFirst = m?.homeAway !== "FUORI";
  const side = (crest: ReactNode, name: string, sub = "") => (
    <span className="grid min-w-0 justify-items-center gap-1 text-center">
      <span className="grid h-[52px] place-items-center lg:h-[64px]">{crest}</span>
      <span className="text-[13.5px] font-extrabold leading-tight text-[#0b1e3a] lg:text-[15px]">
        {name}
        {sub && <span className="block font-bold text-[#1556c4]">{sub}</span>}
      </span>
    </span>
  );
  return (
    <section
      aria-labelledby="home-banner-t"
      className="relative isolate overflow-hidden rounded-[18px] bg-[linear-gradient(115deg,#1556c4_0%,#0f45a6_40%,#0b2a5b_100%)] text-white"
      data-testid="home-banner"
    >
      <KitTexture motif="monogram" overlay />
      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center lg:gap-8 lg:p-7">
        <div className="min-w-0">
          <p className="m-0 text-[12.5px] font-extrabold uppercase tracking-[0.12em] text-[#ffd600]">Stagione 2026/27</p>
          <h2 id="home-banner-t" className="m-0 mt-1 font-uv text-[30px] leading-[0.95] lg:text-[46px]">
            La gara della settimana
          </h2>
          <BrushStroke className="mt-1.5 block h-[8px] w-[120px] lg:h-[10px] lg:w-[180px]" />
          <p className="m-0 mt-2 hidden max-w-[34ch] text-[15px] leading-snug text-white/85 lg:block">
            Tutte le squadre della S.C.D. ColicoDerviese, da Colico e Dervio. Orari e campi dal calendario del club.
          </p>
        </div>
        {m && date ? (
          <div className="rounded-[14px] bg-white p-3.5 text-[#0b1e3a] shadow-[0_18px_40px_-20px_rgb(2_20_51/0.7)] lg:p-5" data-testid="home-banner-match">
            <div className="flex items-center justify-between gap-2 border-b border-[#e6edf6] pb-2">
              <span className="text-[12.5px] font-extrabold uppercase tracking-[0.06em] text-[#1556c4]">{cat}</span>
              <span className="text-[13px] font-extrabold tabular-nums text-[#0b2a5b]">
                {date.wd} {date.day} {date.month} · {m.time || "orario da definire"}
              </span>
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 py-3">
              {weFirst ? side(<ClubCrestOfficial size={52} />, "ColicoDerviese") : side(<OpponentCrest name={m.opponent} size={50} />, opp)}
              <span className="font-uv text-[22px] leading-none text-[#0b2a5b] lg:text-[26px]">VS</span>
              {weFirst ? side(<OpponentCrest name={m.opponent} size={50} />, opp) : side(<ClubCrestOfficial size={52} />, "ColicoDerviese")}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-1 text-[13px] text-[#4a5d7a]">
                <MapPin className="size-4 shrink-0 text-[#1556c4]" aria-hidden="true" />
                <span className="truncate">
                  {m.homeAway === "FUORI" ? "Trasferta · " : m.homeAway === "CASA" ? "In casa · " : ""}
                  {m.place ? venueShort(m.place) : "Campo da definire"}
                </span>
              </span>
              <Link
                to="/calendario"
                search={{ annata: m.group }}
                className="scd-focus inline-flex min-h-11 items-center gap-1.5 rounded-[10px] bg-[#ffd600] px-4 text-[14.5px] font-extrabold text-[#0b1e3a] transition-[filter] duration-150 hover:brightness-95"
              >
                Vedi la gara
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
            {(m.changes.length > 0 || m.pending.length > 0) && (
              <p className="m-0 mt-2 rounded-[8px] bg-[#fff6c2] px-2.5 py-1.5 text-[12.5px] font-bold text-[#5a4600]">
                {[...m.changes, ...m.pending][0]}
              </p>
            )}
          </div>
        ) : (
          <p className="m-0 rounded-[14px] bg-white p-4 text-[15px] text-[#4a5d7a]" data-testid="home-banner-empty">
            Nessuna gara nei prossimi 7 giorni. Trovi tutte le gare nel calendario.
          </p>
        )}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- 3. cards */

function EventCard({ e, g }: { e: PublicEvent; g: PublicGroup | undefined }) {
  const team = `ColicoDerviese ${groupShort(g, e.category)}`;
  const opp = e.opponent ? crestFor(e.opponent).label : "Avversario da definire";
  const home = e.homeAway === "CASA";
  const certain = e.timeConfirmed && e.venueConfirmed;
  const rows: [ReactNode, string, boolean][] = [
    [<ClubCrestOfficial key="us" size={26} />, team, true],
    [<OpponentCrest key="them" name={e.opponent} size={24} />, opp, false],
  ];
  if (!home) rows.reverse();
  return (
    <li className="w-[78vw] max-w-[300px] shrink-0 snap-start lg:w-auto lg:max-w-none">
      <Link
        to="/calendario"
        search={{ annata: e.group }}
        className={`${TILE} scd-focus relative grid h-full gap-2.5 overflow-hidden p-3.5 pl-4 transition-colors duration-150 hover:border-[#1556c4]`}
        aria-label={`${rows.map((r) => r[1]).join(" contro ")}, ${shortDate(e.date)}, ${e.time ? `ore ${e.time}` : "orario da definire"}, ${home ? "in casa" : "in trasferta"}${certain ? "" : ", da confermare"}`}
      >
        <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[4px]" style={{ background: g?.color ?? "#668196" }} />
        <span className="flex items-center justify-between gap-2 text-[12px] font-extrabold uppercase tracking-[0.04em]">
          <span className="truncate text-[#1556c4]">{groupShort(g, e.category)}</span>
          <span className="shrink-0 tabular-nums text-[#0b2a5b]">
            {shortDate(e.date)} · {e.time || "--:--"}
          </span>
        </span>
        <span className="grid gap-1.5">
          {rows.map(([crest, name, ours]) => (
            <span key={name} className="flex min-w-0 items-center gap-2">
              <span className="grid size-[26px] shrink-0 place-items-center">{crest}</span>
              <span className={`truncate text-[14.5px] leading-tight ${ours ? "font-extrabold text-[#0b1e3a]" : "font-semibold text-[#23406e]"}`}>{name}</span>
            </span>
          ))}
        </span>
        <span className="flex min-w-0 items-center gap-1.5 border-t border-[#eef2f8] pt-2 text-[12.5px] text-[#4a5d7a]">
          <MapPin className="size-3.5 shrink-0 text-[#1556c4]" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate">{e.venue ? venueShort(e.venue) : "Campo da definire"}</span>
          <span className={`shrink-0 rounded-[5px] px-1.5 py-[2px] text-[10.5px] font-extrabold uppercase ${home ? "bg-[#e7f0fd] text-[#1556c4]" : "bg-[#eef2f8] text-[#4a5d7a]"}`}>
            {home ? "Casa" : "Trasferta"}
          </span>
          {!certain && (
            <span className="shrink-0 rounded-[5px] bg-[#fff6c2] px-1.5 py-[2px] text-[10.5px] font-extrabold uppercase text-[#5a4600]">Da conf.</span>
          )}
        </span>
      </Link>
    </li>
  );
}

function Programme({ events, groups }: { events: readonly PublicEvent[]; groups: readonly PublicGroup[] }) {
  const [filter, setFilter] = useState<WeekBoardFilter>("tutte");
  const groupOf = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups]);
  const counts = useMemo(() => {
    const out = {} as Record<WeekBoardFilter, number>;
    for (const f of WEEK_BOARD_FILTERS) out[f] = events.filter((e) => matchesWeekFilter(e, f)).length;
    return out;
  }, [events]);
  const list = events.filter((e) => matchesWeekFilter(e, filter));
  return (
    <section aria-labelledby="home-prog-t" data-testid="home-programme">
      <SectionTitle id="home-prog-t" action={<MoreLink to="/calendario">Tutto il calendario</MoreLink>}>
        In programma questa settimana
      </SectionTitle>
      <div className="-mx-4 overflow-x-auto px-4 pb-3 lg:mx-0 lg:px-0">
        <div role="group" aria-label="Filtra le gare" className="flex w-max gap-2">
          {WEEK_BOARD_FILTERS.map((f) => {
            const on = filter === f;
            return (
              <button
                key={f}
                type="button"
                aria-pressed={on}
                onClick={() => setFilter(f)}
                className={`scd-focus inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 text-[14px] font-bold transition-colors ${
                  on ? "bg-[#1556c4] text-white" : "bg-[#e9eff7] text-[#0b2a5b] hover:bg-[#dde6f2]"
                }`}
              >
                {WEEK_BOARD_FILTER_LABEL[f]}
                <span className={`text-[12px] tabular-nums ${on ? "text-white/80" : "text-[#5a6b85]"}`}>{counts[f]}</span>
              </button>
            );
          })}
        </div>
      </div>
      {list.length === 0 ? (
        <p className={`${TILE} m-0 px-4 py-5 text-[15px] text-[#4a5d7a]`} data-testid="home-programme-empty">
          {events.length === 0
            ? "Nessuna gara nei prossimi 7 giorni. Trovi tutte le gare nel calendario."
            : "Nessuna gara con questo filtro questa settimana."}
        </p>
      ) : (
        <ul className="-mx-4 m-0 flex list-none snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0">
          {list.slice(0, SHOWN_CARDS).map((e) => (
            <EventCard key={e.id} e={e} g={groupOf.get(e.group)} />
          ))}
        </ul>
      )}
      {list.length > SHOWN_CARDS && (
        <Link
          to="/calendario"
          className="scd-focus mt-3 flex min-h-11 items-center justify-center gap-1.5 rounded-[10px] border border-[#dfe7f2] bg-white text-[14.5px] font-bold text-[#1556c4] hover:border-[#1556c4]"
        >
          Vedi tutte le {list.length} gare della settimana
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      )}
    </section>
  );
}

/* -------------------------------------------------------------- 3b. club */

/** Eurobet horizontal cards (image left, CTA right) with the club's own official images only. */
const CLUB_CARDS = [
  {
    id: "clc",
    to: "/eventi/christmas-lario-cup",
    img: "/media/eventi/christmas-lario-cup-2026-maschile.webp",
    alt: "Locandina ufficiale Christmas Lario Cup 2026",
    kicker: "Torneo",
    title: "Christmas Lario Cup 2026",
    cta: "Scopri il torneo",
  },
  {
    id: "kit",
    to: "/kit",
    img: "/media/kit/kit-legea-atleti.webp",
    alt: "Kit ufficiale ColicoDerviese 2026/27 per gli atleti",
    kicker: "Divise",
    title: "Il kit ufficiale 2026/27",
    cta: "Vedi il kit",
  },
] as const;

function ClubCards() {
  return (
    <section aria-labelledby="home-club-t" data-testid="home-club-cards">
      <SectionTitle id="home-club-t" action={<MoreLink to="/eventi">Eventi e tornei</MoreLink>}>
        Dal club
      </SectionTitle>
      <ul className="m-0 grid list-none gap-3 p-0 lg:grid-cols-2">
        {CLUB_CARDS.map((c) => (
          <li key={c.id}>
            <Link
              to={c.to as never}
              className={`${TILE} scd-focus grid grid-cols-[116px_minmax(0,1fr)] overflow-hidden transition-colors duration-150 hover:border-[#1556c4] lg:grid-cols-[150px_minmax(0,1fr)]`}
            >
              <img
                src={c.img}
                alt={c.alt}
                width={150}
                height={120}
                loading="lazy"
                decoding="async"
                className="h-full min-h-[104px] w-full object-cover object-[center_30%]"
              />
              <span className="flex min-w-0 flex-col justify-center gap-1 p-3.5">
                <span className="text-[11.5px] font-extrabold uppercase tracking-[0.1em] text-[#1556c4]">{c.kicker}</span>
                <span className="text-[16px] font-extrabold leading-tight text-[#0b1e3a]">{c.title}</span>
                <span className="mt-1 inline-flex items-center gap-1 text-[14px] font-bold text-[#1556c4]">
                  {c.cta}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------- 4. services */

type Service = { id: string; icon: LucideIcon; tone: string; title: string; text: string; cta: string } & (
  | { to: string; href?: undefined }
  | { href: string; to?: undefined }
);

function services(): Service[] {
  const gioca = smallTiles().find((t) => t.id === "gioca");
  return [
    { id: "iscriviti", icon: UserPlus, tone: "bg-[#ffd600] text-[#0b1e3a]", title: "Iscriviti al club", text: "Crea il tuo account in un minuto.", cta: "Registrati", to: "/registrati" },
    { id: "gioca", icon: UsersRound, tone: "bg-[#1556c4] text-white", title: "Gioca con noi", text: gioca?.hint ?? "Scrivi alla segreteria", cta: "Scopri", to: gioca?.to ?? "/contatti" },
    { id: "iride", icon: MessageCircle, tone: "bg-[#0f7a3d] text-white", title: "Iride, segreteria AI", text: "Risponde su WhatsApp 24 ore su 24.", cta: "Scrivi", href: SEGRETERIA_WHATSAPP.chatUrl },
    { id: "app", icon: Download, tone: "bg-[#0b2a5b] text-white", title: "Installa l'app", text: "Sempre a portata di mano sul telefono.", cta: "Installa", to: "/installa" },
  ];
}

function ServiceCard({ s }: { s: Service }) {
  const btn = "inline-flex min-h-11 shrink-0 items-center rounded-[10px] bg-[#eef3f9] px-3.5 text-[14px] font-bold text-[#1556c4]";
  const body = (
    <>
      <span aria-hidden="true" className={`grid size-12 shrink-0 place-items-center rounded-[12px] ${s.tone}`}>
        <s.icon className="size-6" strokeWidth={2.1} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15.5px] font-extrabold leading-tight text-[#0b1e3a]">{s.title}</span>
        <span className="mt-0.5 block text-[13px] leading-snug text-[#4a5d7a]">{s.text}</span>
      </span>
      <span className={btn}>{s.cta}</span>
    </>
  );
  const cls = `${TILE} scd-focus flex items-center gap-3 p-3 transition-colors duration-150 hover:border-[#1556c4]`;
  return (
    <li>
      {s.href ? (
        <a href={s.href} target="_blank" rel="noopener noreferrer" className={cls} aria-label={`${s.title}: ${s.cta} (apre WhatsApp in una nuova scheda)`} data-service={s.id}>
          {body}
        </a>
      ) : (
        <Link to={s.to as never} className={cls} data-service={s.id}>
          {body}
        </Link>
      )}
    </li>
  );
}

/* ---------------------------------------------------------------- 5. trust */

function WhyClub({ teams }: { teams: number }) {
  const facts: { key: string; head: ReactNode; title: string; text: string; to?: string }[] = [
    ...CLUB_CREDENTIALS.map((c) => ({
      key: c.id,
      head: <ShieldCheck className="size-6 text-[#1556c4]" strokeWidth={2} aria-hidden="true" />,
      title: c.title,
      text: c.issuer,
    })),
    {
      key: "centri",
      head: <MapPinned className="size-6 text-[#1556c4]" strokeWidth={2} aria-hidden="true" />,
      title: "Colico e Dervio",
      text: "I campi del club e come arrivare",
      to: "/impianti",
    },
  ];
  if (teams > 0)
    facts.splice(3, 0, {
      key: "squadre",
      head: <span className="font-uv text-[26px] leading-none text-[#1556c4]">{teams}</span>,
      title: teams === 1 ? "squadra in calendario" : "squadre in calendario",
      text: "Dalla scuola calcio alla Prima Squadra",
    });
  return (
    <section aria-labelledby="home-why-t" data-testid="home-why">
      <SectionTitle id="home-why-t" action={<MoreLink to="/societa">La società</MoreLink>}>
        Perché la ColicoDerviese
      </SectionTitle>
      <ul className="m-0 grid list-none grid-cols-2 gap-2.5 p-0 lg:grid-cols-5 lg:gap-3">
        {facts.map((f) => {
          const inner = (
            <>
              <span className="grid h-8 place-items-start">{f.head}</span>
              <span className="block text-[14px] font-extrabold leading-tight text-[#0b1e3a]">{f.title}</span>
              <span className="block text-[12.5px] leading-snug text-[#4a5d7a]">{f.text}</span>
            </>
          );
          return (
            <li key={f.key} className={f.to ? "col-span-2 lg:col-span-1" : undefined}>
              {f.to ? (
                <Link to={f.to as never} className={`${TILE} scd-focus grid h-full content-start gap-1.5 p-3.5 hover:border-[#1556c4]`}>
                  {inner}
                </Link>
              ) : (
                <div className={`${TILE} grid h-full content-start gap-1.5 p-3.5`}>{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ----------------------------------------------------------------- 6. rail */

function JoinPanel() {
  return (
    <section aria-labelledby="home-join-t" className={`${TILE} overflow-hidden`} data-testid="home-join-panel">
      <div className="bg-[#0b2a5b] px-4 py-3 text-white">
        <h2 id="home-join-t" className="m-0 text-[17px] font-extrabold">
          Entra nel club
        </h2>
        <p className="m-0 mt-0.5 text-[13px] text-white/80">Un solo account per famiglie, atleti, staff e tifosi.</p>
      </div>
      <ul className="m-0 grid list-none gap-1.5 px-4 py-3 text-[13.5px] text-[#23406e]">
        <li>· Allenamenti e convocazioni della tua squadra</li>
        <li>· Le comunicazioni del club in un posto solo</li>
        <li>· La tua area personale</li>
      </ul>
      <div className="grid grid-cols-2 gap-2 px-4 pb-4">
        <Link
          to="/accedi"
          className="scd-focus inline-flex min-h-11 items-center justify-center gap-1.5 rounded-[10px] border-2 border-[#0b2a5b] text-[14.5px] font-bold text-[#0b2a5b] hover:bg-[#eef3f9]"
        >
          <LogIn className="size-4" aria-hidden="true" />
          Accedi
        </Link>
        <Link
          to="/registrati"
          className="scd-focus inline-flex min-h-11 items-center justify-center rounded-[10px] bg-[#ffd600] text-[14.5px] font-extrabold text-[#0b1e3a] hover:brightness-95"
          data-testid="home-join"
        >
          Registrati
        </Link>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- lobby */

export function HomeLobby({ calendar, nowMs: serverNow, today }: { calendar: PublicCalendar; nowMs: number; today: string }) {
  const nowMs = useMinuteClock(serverNow);
  const week = useMemo(() => weekBoardEvents(calendar.events, today), [calendar.events, today]);
  const teams = useMemo(
    () => new Set(calendar.events.map((e) => e.group).filter((g) => g && g !== "other")).size,
    [calendar.events],
  );
  const list = services();
  return (
    <div className={`${WRAP} grid grid-cols-[minmax(0,1fr)] gap-6 pt-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-7 lg:pt-6`} data-testid="home-lobby">
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6 lg:gap-8">
        <TeamChips events={week} groups={calendar.groups} />
        <MatchBanner calendar={calendar} nowMs={nowMs} today={today} />
        <Programme events={week} groups={calendar.groups} />
        <ClubCards />
        <section aria-labelledby="home-serv-t" className="lg:hidden">
          <SectionTitle id="home-serv-t">Per te</SectionTitle>
          <ul className="m-0 grid list-none gap-2.5 p-0">
            {list.map((s) => (
              <ServiceCard key={s.id} s={s} />
            ))}
          </ul>
        </section>
        <WhyClub teams={teams} />
      </div>
      <aside className="hidden min-w-0 gap-4 lg:sticky lg:top-[calc(var(--pub-header-h)+20px)] lg:grid" aria-label="Il tuo club" data-testid="home-rail">
        <JoinPanel />
        <ul className="m-0 grid list-none gap-2.5 p-0">
          {list
            .filter((s) => s.id !== "iscriviti")
            .map((s) => (
              <ServiceCard key={s.id} s={s} />
            ))}
        </ul>
      </aside>
    </div>
  );
}
