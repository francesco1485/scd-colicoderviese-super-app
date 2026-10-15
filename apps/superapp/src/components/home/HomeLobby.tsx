/**
 * Public home, premium dark lobby on the Eurobet structure (Francesco 15/10/2026 22:04 «riprogettare da zero
 * completamente partendo dallo stile Eurobet»; 22:29 «non va bene»; 22:30 «sembra un disegno di neonato»: the light
 * white-card version and the drawn hero read as childish). Direction: a top club app at night — deep navy page, glass
 * panels, big condensed type, the club's official 2026/27 kit render (Drive "ASSET UFFICIALI", KIT_BLU_VISUAL) and the
 * kit line art (lake and mountains, Colico fort, C monogram) as imagery; yellow only for actions.
 *
 *   Eurobet                       → S.C.D. ColicoDerviese
 *   hero banner                   → "Prossima gara": match ticket over the official kit render (static, one CTA)
 *   pill quick links              → teams that play this week (real calendar groups)
 *   event tiles                   → "In programma": dark match cards of every team, filters
 *   game tiles with artwork       → club tiles (Calendario, Il club, Kit 2026/27, Eventi e tornei, Impianti, Sostieni)
 *   right rail                    → "Entra nel club" (Accedi / Registrati), Iride, app
 *
 * Data: public calendar only (games; trainings stay for members, UD-100); opponent crests only from the verified
 * registry (crestFor), otherwise an empty disc. No minor, no mascot, no carousel or rotating content.
 */
import { Link } from "@tanstack/react-router";
import { ArrowRight, ChevronRight, Download, LogIn, MapPin, MessageCircle, UserPlus, type LucideIcon } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { ClubCrestOfficial } from "@/components/SiteChrome";
import { useMinuteClock } from "@/components/home/HomeBoard";
import { venueShort } from "@/components/home/HomeSections";
import { groupShort } from "@/lib/board-data";
import type { getPublicCalendarSnapshot } from "@/lib/calendar.functions";
import { crestFor } from "@/lib/crests";
import { boardDate, boardRank, nextBoardMatch } from "@/lib/home-board";
import { categoryShort, matchdayClass } from "@/lib/home-matchday";
import { weekMatches } from "@/lib/home-today";
import { WEEK_BOARD_FILTERS, WEEK_BOARD_FILTER_LABEL, matchesWeekFilter, weekBoardEvents, type WeekBoardFilter } from "@/lib/home-week-board";
import { SEGRETERIA_WHATSAPP } from "@/lib/install-link";
import type { PublicEvent, PublicGroup } from "@/lib/public-snapshots";

type PublicCalendar = Awaited<ReturnType<typeof getPublicCalendarSnapshot>>;

const WRAP = "mx-auto w-full max-w-[1240px] px-4 lg:px-8";
/** Glass panel on the night page. */
const GLASS = "rounded-[16px] border border-[#e3eaf4] bg-white shadow-[0_10px_26px_-18px_rgb(11_42_91/0.35)]";
const SHOWN_CARDS = 10;

const KIT_FRONT = "/media/kit/kit-2026-27-blu-fronte.webp";
const KIT_FULL = "/media/kit/kit-2026-27-blu.webp";
const ART_LAKE = "/media/brand/tex/mountains-lake.png";
const ART_FORTE = "/media/brand/tex/forte-colico.png";
const ART_C = "/media/brand/tex/monogram-white.svg";

const WD = ["DOM", "LUN", "MAR", "MER", "GIO", "VEN", "SAB"] as const;
const MON = ["GEN", "FEB", "MAR", "APR", "MAG", "GIU", "LUG", "AGO", "SET", "OTT", "NOV", "DIC"] as const;
const dayParts = (iso: string) => {
  const d = new Date(`${iso}T12:00:00Z`);
  return { wd: WD[d.getUTCDay()]!, day: d.getUTCDate(), month: MON[d.getUTCMonth()]! };
};

function Heading({ id, children, action }: { id: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3 pb-3">
      <h2 id={id} className="m-0 font-title text-[24px] font-black uppercase leading-none tracking-[0.02em] text-[#0b1e3a] lg:text-[30px]">
        {children}
      </h2>
      {action}
    </div>
  );
}

function More({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to as never} className="scd-focus inline-flex min-h-11 shrink-0 items-center gap-0.5 rounded-md text-[14px] font-bold text-[#1556c4] hover:underline">
      {children}
      <ChevronRight className="size-4" aria-hidden="true" />
    </Link>
  );
}

function OpponentCrest({ name, size }: { name: string; size: number }) {
  const { src, label } = crestFor(name);
  if (!src) return <span aria-hidden="true" className="block rounded-full bg-[#eef3f9] ring-1 ring-[#dfe7f2]" style={{ width: size, height: size }} />;
  return <img src={src} alt={`Stemma ${label}`} width={size} height={size} loading="lazy" decoding="async" className="object-contain" style={{ width: size, height: size }} />;
}

/* ------------------------------------------------------------------ hero */

function Hero({ calendar, nowMs, today }: { calendar: PublicCalendar; nowMs: number; today: string }) {
  const week = useMemo(() => weekMatches(calendar.events, calendar.groups, today, null), [calendar, today]);
  const m = nextBoardMatch(week, nowMs, (e) => boardRank(e, (g) => matchdayClass(g) === "agonistica"));
  const date = m ? boardDate(m.date) : null;
  const opp = m?.opponent ? crestFor(m.opponent).label : "Avversario da definire";
  const cat = m ? categoryShort(m.group, calendar.groups, m.team) : "";
  const weFirst = m?.homeAway !== "FUORI";
  const side = (crest: ReactNode, name: string) => (
    <span className="grid min-w-0 justify-items-center gap-1.5 text-center">
      <span className="grid h-[56px] place-items-center lg:h-[72px]">{crest}</span>
      <span className="line-clamp-2 text-[13.5px] font-bold leading-tight text-white lg:text-[15px]">{name}</span>
    </span>
  );
  const usCrest = (
    <>
      <ClubCrestOfficial size={58} className="drop-shadow-[0_6px_16px_rgb(0_0_0/0.5)] lg:hidden" />
      <ClubCrestOfficial size={72} className="hidden drop-shadow-[0_6px_16px_rgb(0_0_0/0.5)] lg:block" />
    </>
  );
  const us = side(usCrest, "ColicoDerviese");
  return (
    <section
      aria-label="Prossima gara"
      className="relative isolate overflow-hidden rounded-[22px] border-0 bg-[radial-gradient(120%_100%_at_85%_15%,#3b82f6_0%,#1d5fd0_40%,#0f45a6_80%)] shadow-[0_18px_40px_-24px_rgb(11_42_91/0.6)]"
      data-testid="home-hero"
    >
      <img src={ART_C} alt="" aria-hidden="true" className="pointer-events-none absolute -left-10 -top-10 -z-10 w-[420px] max-w-none opacity-[0.06]" />
      <img
        src={KIT_FRONT}
        alt="Maglia ufficiale ColicoDerviese 2026/27"
        width={452}
        height={900}
        decoding="async"
        className="pointer-events-none absolute -right-6 -top-4 -z-10 h-[112%] w-auto max-w-none opacity-50 lg:opacity-95 drop-shadow-[0_30px_40px_rgb(0_0_0/0.55)] [mask-image:linear-gradient(90deg,transparent,black_35%)] lg:right-6 lg:h-[125%]"
      />
      <div className="grid gap-4 p-4 pr-[34%] lg:grid-cols-[minmax(0,1fr)] lg:p-8 lg:pr-[36%]">
        <div className="flex items-center gap-2">
          <span className="rounded-[6px] bg-[#ffd600] px-2 py-[3px] text-[11.5px] font-extrabold uppercase tracking-[0.08em] text-[#061a3d]">Prossima gara</span>
          {cat && <span className="truncate text-[12.5px] font-bold uppercase tracking-[0.08em] text-[#dbe8ff]">{cat}</span>}
        </div>
        {m && date ? (
          <>
            <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 lg:max-w-[520px] lg:gap-4">
              {weFirst ? us : side(<OpponentCrest name={m.opponent} size={54} />, opp)}
              <span className="grid justify-items-center leading-none">
                <span className="font-uv text-[44px] text-white lg:text-[64px]">{date.day}</span>
                <span className="text-[12px] font-extrabold uppercase tracking-[0.1em] text-[#dbe8ff]">
                  {date.wd} · {date.month}
                </span>
                <span className="mt-1.5 rounded-[6px] bg-white/10 px-2 py-[3px] text-[14px] font-extrabold tabular-nums text-white">{m.time || "--:--"}</span>
              </span>
              {weFirst ? side(<OpponentCrest name={m.opponent} size={54} />, opp) : us}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="flex min-w-0 items-center gap-1 text-[13px] text-white/90">
                <MapPin className="size-4 shrink-0 text-[#ffd600]" aria-hidden="true" />
                <span className="truncate">
                  {m.homeAway === "FUORI" ? "Trasferta · " : m.homeAway === "CASA" ? "In casa · " : ""}
                  {m.place ? venueShort(m.place) : "Campo da definire"}
                </span>
              </span>
              <Link
                to="/calendario"
                search={{ annata: m.group }}
                className="scd-focus inline-flex min-h-11 items-center gap-1.5 rounded-[10px] bg-[#ffd600] px-4 text-[14.5px] font-extrabold text-[#061a3d] transition-[filter] duration-150 hover:brightness-95"
              >
                Vedi la gara
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
            {(m.changes.length > 0 || m.pending.length > 0) && (
              <p className="m-0 w-fit rounded-[8px] bg-[#ffd600]/15 px-2.5 py-1 text-[12.5px] font-bold text-[#ffe766]">{[...m.changes, ...m.pending][0]}</p>
            )}
          </>
        ) : (
          <p className="m-0 text-[15px] text-white/90" data-testid="home-hero-empty">
            Nessuna gara nei prossimi 7 giorni. Trovi tutte le gare nel calendario.
          </p>
        )}
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- chips */

function TeamChips({ events, groups }: { events: readonly PublicEvent[]; groups: readonly PublicGroup[] }) {
  const chips = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of events) if (e.group && e.group !== "other") counts.set(e.group, (counts.get(e.group) ?? 0) + 1);
    return groups.filter((g) => counts.has(g.id)).map((g) => ({ id: g.id, label: groupShort(g, g.label), color: g.color, n: counts.get(g.id)! }));
  }, [events, groups]);
  if (chips.length === 0) return null;
  return (
    <nav aria-label="Squadre in campo questa settimana" className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0" data-testid="home-chips">
      <ul className="m-0 flex w-max list-none gap-2 p-0 lg:w-auto lg:flex-wrap">
        {chips.map((c) => (
          <li key={c.id}>
            <Link
              to="/calendario"
              search={{ annata: c.id }}
              className="scd-focus inline-flex min-h-11 items-center gap-2 rounded-full border border-[#dfe7f2] bg-white px-3.5 text-[14px] font-bold text-[#0b2a5b] shadow-[0_2px_6px_-4px_rgb(11_42_91/0.3)] hover:border-[#1556c4]"
              aria-label={`${c.label}: ${c.n === 1 ? "1 gara" : `${c.n} gare`} questa settimana`}
            >
              <span aria-hidden="true" className="size-2.5 rounded-full" style={{ background: c.color }} />
              {c.label}
              <span className="text-[12px] font-semibold tabular-nums text-[#5a6b85]">{c.n}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/* --------------------------------------------------------------- matches */

function MatchCard({ e, g }: { e: PublicEvent; g: PublicGroup | undefined }) {
  const team = groupShort(g, e.category);
  const opp = e.opponent ? crestFor(e.opponent).label : "Avversario da definire";
  const home = e.homeAway === "CASA";
  const certain = e.timeConfirmed && e.venueConfirmed;
  const d = dayParts(e.date);
  const rows: [ReactNode, string, boolean][] = [
    [<ClubCrestOfficial key="us" size={30} />, `ColicoDerviese ${team}`, true],
    [<OpponentCrest key="them" name={e.opponent} size={28} />, opp, false],
  ];
  if (!home) rows.reverse();
  return (
    <li className="w-[80vw] max-w-[300px] shrink-0 snap-start lg:w-auto lg:max-w-none">
      <Link
        to="/calendario"
        search={{ annata: e.group }}
        className={`${GLASS} scd-focus relative grid h-full grid-cols-[58px_minmax(0,1fr)] overflow-hidden transition-colors duration-150 hover:border-[#1556c4]`}
        aria-label={`${rows.map((r) => r[1]).join(" contro ")}, ${d.wd} ${d.day} ${d.month}, ${e.time ? `ore ${e.time}` : "orario da definire"}, ${home ? "in casa" : "in trasferta"}${certain ? "" : ", da confermare"}`}
      >
        <span className="grid content-center justify-items-center gap-0.5 border-r border-[#eef2f8] bg-[#f6f9fd] py-3 leading-none" style={{ boxShadow: `inset 3px 0 0 ${g?.color ?? "#668196"}` }}>
          <span className="text-[11px] font-extrabold tracking-[0.08em] text-[#1556c4]">{d.wd}</span>
          <span className="font-uv text-[28px] text-[#0b1e3a]">{d.day}</span>
          <span className="text-[13px] font-extrabold tabular-nums text-[#1556c4]">{e.time || "--:--"}</span>
        </span>
        <span className="grid min-w-0 gap-1.5 p-3">
          <span className="flex items-center justify-between gap-2">
            <span className="truncate text-[11.5px] font-extrabold uppercase tracking-[0.08em] text-[#1556c4]">{team}</span>
            <span className={`shrink-0 rounded-[5px] px-1.5 py-[2px] text-[10.5px] font-extrabold uppercase ${home ? "bg-[#ffd600] text-[#061a3d]" : "bg-[#eef2f8] text-[#4a5d7a]"}`}>
              {home ? "Casa" : "Trasferta"}
            </span>
          </span>
          {rows.map(([crest, name, ours]) => (
            <span key={name} className="flex min-w-0 items-center gap-2">
              <span className="grid size-[30px] shrink-0 place-items-center">{crest}</span>
              <span className={`truncate text-[14.5px] leading-tight ${ours ? "font-extrabold text-[#0b1e3a]" : "font-semibold text-[#23406e]"}`}>{name}</span>
            </span>
          ))}
          <span className="flex min-w-0 items-center gap-1 text-[12.5px] text-[#5a6b85]">
            <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{e.venue ? venueShort(e.venue) : "Campo da definire"}</span>
            {!certain && <span className="ml-auto shrink-0 text-[11px] font-bold text-[#8a6d00]">da confermare</span>}
          </span>
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
      <Heading id="home-prog-t" action={<More to="/calendario">Calendario</More>}>
        In programma
      </Heading>
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
                  on ? "bg-[#0b2a5b] text-white" : "bg-[#e9eff7] text-[#0b2a5b] hover:bg-[#dde6f2]"
                }`}
              >
                {WEEK_BOARD_FILTER_LABEL[f]}
                <span className={`text-[12px] tabular-nums ${on ? "text-white/75" : "text-[#5a6b85]"}`}>{counts[f]}</span>
              </button>
            );
          })}
        </div>
      </div>
      {list.length === 0 ? (
        <p className={`${GLASS} m-0 px-4 py-5 text-[15px] text-[#c9d7ee]`} data-testid="home-programme-empty">
          {events.length === 0 ? "Nessuna gara nei prossimi 7 giorni. Trovi tutte le gare nel calendario." : "Nessuna gara con questo filtro questa settimana."}
        </p>
      ) : (
        <ul className="-mx-4 m-0 flex list-none snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 lg:mx-0 lg:grid lg:grid-cols-2 lg:overflow-visible lg:px-0">
          {list.slice(0, SHOWN_CARDS).map((e) => (
            <MatchCard key={e.id} e={e} g={groupOf.get(e.group)} />
          ))}
        </ul>
      )}
      {list.length > SHOWN_CARDS && (
        <Link to="/calendario" className="scd-focus mt-3 flex min-h-11 items-center justify-center gap-1.5 rounded-[12px] border border-[#dfe7f2] bg-white text-[14.5px] font-bold text-[#1556c4] hover:border-[#1556c4]">
          Tutte le {list.length} gare della settimana
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      )}
    </section>
  );
}

/* ----------------------------------------------------------------- tiles */

type Tile = { id: string; to: string; title: string; sub: string; art: ReactNode; tone: string };

const TILES: readonly Tile[] = [
  {
    id: "calendario",
    to: "/calendario",
    title: "Calendario",
    sub: "Tutte le gare della stagione",
    tone: "bg-[linear-gradient(150deg,#3b82f6,#1d5fd0)]",
    art: <img src={ART_LAKE} alt="" aria-hidden="true" className="absolute -bottom-2 right-[-12%] w-[90%] max-w-none opacity-45" />,
  },
  {
    id: "kit",
    to: "/kit",
    title: "Kit 2026/27",
    sub: "La maglia ufficiale",
    tone: "bg-[linear-gradient(150deg,#2563eb,#123e8c)]",
    art: <img src={KIT_FULL} alt="" aria-hidden="true" className="absolute -bottom-[18%] right-[-20%] w-[95%] max-w-none drop-shadow-[0_14px_20px_rgb(0_0_0/0.5)]" />,
  },
  {
    id: "societa",
    to: "/societa",
    title: "Il club",
    sub: "Storia, valori, persone",
    tone: "bg-[linear-gradient(150deg,#1556c4,#0b3a8c)]",
    art: <img src={ART_FORTE} alt="" aria-hidden="true" className="absolute -bottom-[6%] right-[-14%] w-[92%] max-w-none opacity-45" />,
  },
  {
    id: "eventi",
    to: "/eventi",
    title: "Eventi e tornei",
    sub: "Christmas Lario Cup e altro",
    tone: "bg-[linear-gradient(150deg,#ffd600,#f2b600)]",
    art: <img src={ART_C} alt="" aria-hidden="true" className="absolute -bottom-6 -right-6 w-[70%] max-w-none opacity-25 invert" />,
  },
  {
    id: "impianti",
    to: "/impianti",
    title: "I nostri campi",
    sub: "Colico e Dervio",
    tone: "bg-[linear-gradient(150deg,#1d5fd0,#0b3a8c)]",
    art: <img src={ART_LAKE} alt="" aria-hidden="true" className="absolute -bottom-3 left-[-10%] w-[95%] max-w-none opacity-30 [transform:scaleX(-1)]" />,
  },
  {
    id: "sostieni",
    to: "/sostieni",
    title: "Sostieni il club",
    sub: "Fondo solidale e donazioni",
    tone: "bg-[linear-gradient(150deg,#3b82f6,#1556c4)]",
    art: <img src={ART_C} alt="" aria-hidden="true" className="absolute -bottom-8 -right-8 w-[75%] max-w-none opacity-15" />,
  },
];

function ClubTiles() {
  return (
    <section aria-labelledby="home-tiles-t" data-testid="home-tiles">
      <Heading id="home-tiles-t">Il mondo ColicoDerviese</Heading>
      <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 lg:grid-cols-3">
        {TILES.map((t) => {
          const dark = t.id !== "eventi";
          return (
            <li key={t.id}>
              <Link
                to={t.to as never}
                className={`scd-focus relative isolate flex aspect-[4/3] flex-col justify-end overflow-hidden rounded-[16px] p-3.5 shadow-[0_10px_24px_-16px_rgb(11_42_91/0.5)] transition-transform duration-200 hover:-translate-y-0.5 lg:aspect-[16/10] lg:p-5 ${t.tone}`}
                data-tile={t.id}
              >
                <span className="absolute inset-0 -z-10">{t.art}</span>
                <span className={`font-title text-[21px] font-black uppercase leading-none tracking-[0.02em] lg:text-[26px] ${dark ? "text-white" : "text-[#061a3d]"}`}>{t.title}</span>
                <span className={`mt-1 text-[12.5px] font-semibold leading-snug lg:text-[14px] ${dark ? "text-white/75" : "text-[#061a3d]/75"}`}>{t.sub}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------- services */

type Service = { id: string; icon: LucideIcon; title: string; text: string; cta: string; to?: string; href?: string };

const SERVICES: readonly Service[] = [
  { id: "iride", icon: MessageCircle, title: "Iride, segreteria AI", text: "Risponde su WhatsApp 24 ore su 24.", cta: "Scrivi", href: SEGRETERIA_WHATSAPP.chatUrl },
  { id: "app", icon: Download, title: "Installa l'app", text: "Gare e comunicazioni sul telefono.", cta: "Installa", to: "/installa" },
];

function ServiceRow({ s }: { s: Service }) {
  const body = (
    <>
      <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-[12px] bg-[#e8f0fd] text-[#1556c4]">
        <s.icon className="size-[22px]" strokeWidth={2.1} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-extrabold leading-tight text-[#0b1e3a]">{s.title}</span>
        <span className="mt-0.5 block text-[13px] leading-snug text-[#4a5d7a]">{s.text}</span>
      </span>
      <span className="inline-flex min-h-10 shrink-0 items-center rounded-[10px] bg-[#eef3f9] px-3.5 text-[14px] font-bold text-[#1556c4]">{s.cta}</span>
    </>
  );
  const cls = `${GLASS} scd-focus flex items-center gap-3 p-3 transition-colors duration-150 hover:border-[#1556c4]`;
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

function JoinPanel({ className = "" }: { className?: string }) {
  return (
    <section aria-labelledby="home-join-t" className={`${GLASS} grid gap-3 p-4 ${className}`} data-testid="home-join-panel">
      <div className="flex items-center gap-3">
        <ClubCrestOfficial size={44} />
        <div className="min-w-0">
          <h2 id="home-join-t" className="m-0 font-title text-[22px] font-black uppercase leading-none text-[#0b1e3a]">
            Entra nel club
          </h2>
          <p className="m-0 mt-1 text-[13px] leading-snug text-[#4a5d7a]">Allenamenti, convocazioni e la tua area con un solo account.</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Link to="/accedi" className="scd-focus inline-flex min-h-11 items-center justify-center gap-1.5 rounded-[10px] border-2 border-[#0b2a5b] text-[14.5px] font-bold text-[#0b2a5b] hover:bg-[#eef3f9]">
          <LogIn className="size-4" aria-hidden="true" />
          Accedi
        </Link>
        <Link to="/registrati" className="scd-focus inline-flex min-h-11 items-center justify-center gap-1.5 rounded-[10px] bg-[#ffd600] text-[14.5px] font-extrabold text-[#061a3d] hover:brightness-95" data-testid="home-join">
          <UserPlus className="size-4" aria-hidden="true" />
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
  return (
    <div className={`${WRAP} grid grid-cols-[minmax(0,1fr)] gap-7 pt-4 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:gap-7 lg:pt-6`} data-testid="home-lobby">
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-7 lg:gap-9">
        <Hero calendar={calendar} nowMs={nowMs} today={today} />
        <TeamChips events={week} groups={calendar.groups} />
        <Programme events={week} groups={calendar.groups} />
        <ClubTiles />
        <div className="grid gap-3 lg:hidden">
          <JoinPanel />
          <ul className="m-0 grid list-none gap-2.5 p-0">
            {SERVICES.map((s) => (
              <ServiceRow key={s.id} s={s} />
            ))}
          </ul>
        </div>
      </div>
      <aside className="hidden min-w-0 gap-3 lg:sticky lg:top-[calc(var(--pub-header-h)+20px)] lg:grid" aria-label="Il tuo club" data-testid="home-rail">
        <JoinPanel />
        <ul className="m-0 grid list-none gap-2.5 p-0">
          {SERVICES.map((s) => (
            <ServiceRow key={s.id} s={s} />
          ))}
        </ul>
      </aside>
    </div>
  );
}
