/**
 * Top of the public home drawn from the six-screen board VR-009, screen 1 "Home pubblica" (Francesco 15/10/2026
 * 06:30: "tutto deve partire dallo studio di questa immagine… solo migliorare"). Board order, improved:
 *   1. "Questa settimana" hero: the real lake photo with a slow zoom, the official crest, a live countdown to the
 *      next home game (Sky removed: Francesco 15/10 06:46);
 *   2. four white tiles over the hero edge: Gare (games left this week), Allenamenti, Eventi, Iniziative;
 *   3. "Prossima gara" card with the folder tab, big date block, our crest VS the verified opponent crest;
 *   4. two small cards: Allenamenti della settimana (green) and the next club event (yellow, from clubEventsOn).
 * The partner box and "Mondo Colico" (vetrina) follow in PublicHome. Data: the public calendar only (weekMatches,
 * same source as /calendario); no score, no invented crest, no minor named. Assets: official crest and Sky.
 */
import { Link } from "@tanstack/react-router";
import { CalendarDays, ChevronRight, MapPin, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { ClubCrestOfficial } from "@/components/SiteChrome";
import { venueShort } from "@/components/home/HomeSections";
import type { getPublicCalendarSnapshot } from "@/lib/calendar.functions";
import { crestFor } from "@/lib/crests";
import { boardDate, countdownParts, gamesLeft, nextBoardMatch, nextHomeKickoff } from "@/lib/home-board";
import { categoryShort } from "@/lib/home-matchday";
import { clubEventsOn } from "@/lib/club-events";
import { weekMatches } from "@/lib/home-today";

type PublicCalendar = Awaited<ReturnType<typeof getPublicCalendarSnapshot>>;

const WRAP = "mx-auto w-full max-w-[1280px] px-4 lg:px-8";
const CARD = "rounded-[16px] bg-white shadow-[0_1px_2px_rgb(11_42_91/0.06),0_10px_24px_-14px_rgb(11_42_91/0.35)]";

/** Minute clock: server time on the first render (no hydration mismatch), then the device clock. */
function useMinuteClock(serverNow: number): number {
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

/* Tile icons in the board style: filled, two colours, no stock line icons. */
function BallIcon() {
  return (
    <svg viewBox="0 0 32 32" className="size-8" aria-hidden="true">
      <circle cx="16" cy="16" r="13" fill="#fff" stroke="#0b1e3a" strokeWidth="2" />
      <path d="m16 9.5 5.5 4-2 6.5h-7l-2-6.5z" fill="#0b1e3a" />
      <path d="M16 9.5V3.5M21.5 13.5l5.5-2M19.5 20l3.5 5M12.5 20 9 25M10.5 13.5l-5.5-2" stroke="#0b1e3a" strokeWidth="1.6" />
    </svg>
  );
}
function ConeIcon() {
  return (
    <svg viewBox="0 0 32 32" className="size-8" aria-hidden="true">
      <path d="M13 4h6l6 20H7z" fill="#ff6a1a" />
      <path d="M11.2 12h9.6M9.6 18h12.8" stroke="#fff" strokeWidth="2.4" />
      <rect x="4" y="24" width="24" height="4" rx="1.5" fill="#ff6a1a" />
    </svg>
  );
}
function CalendarIcon() {
  return (
    <svg viewBox="0 0 32 32" className="size-8" fill="none" aria-hidden="true">
      <rect x="4.5" y="6.5" width="23" height="21" rx="3.5" stroke="#0b2a5b" strokeWidth="2.4" />
      <path d="M4.5 13h23M11 4v5M21 4v5" stroke="#0b2a5b" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M10 18h3M15 18h3M20 18h3M10 22.5h3M15 22.5h3" stroke="#1556c4" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
function PeopleIcon() {
  return (
    <svg viewBox="0 0 34 32" className="size-8" aria-hidden="true">
      <circle cx="17" cy="9" r="4.6" fill="#1f9d55" />
      <circle cx="7" cy="11.5" r="3.6" fill="#1f9d55" />
      <circle cx="27" cy="11.5" r="3.6" fill="#1f9d55" />
      <path d="M8.5 28c0-5.4 3.8-9.4 8.5-9.4s8.5 4 8.5 9.4zM1 26.5c0-4 2.6-6.9 6.4-6.9 1.3 0 2.4.3 3.3.8-1.6 1.8-2.5 4-2.6 6.1zM33 26.5c0-4-2.6-6.9-6.4-6.9-1.3 0-2.4.3-3.3.8 1.6 1.8 2.5 4 2.6 6.1z" fill="#1f9d55" />
    </svg>
  );
}

function Tile({
  to,
  label,
  icon,
  count,
  testId,
}: {
  to: "/calendario" | "/allenamenti" | "/eventi" | "/tornei";
  label: string;
  icon: React.ReactNode;
  count?: number;
  testId: string;
}) {
  return (
    <Link
      to={to}
      data-testid={testId}
      aria-label={count ? `${label}, ${count} questa settimana` : label}
      className={`${CARD} scd-focus relative flex h-[92px] flex-col items-center justify-center gap-1.5 text-[13px] font-bold text-[#0b1e3a] transition-transform duration-150 hover:-translate-y-0.5 lg:h-[112px] lg:text-[15px]`}
    >
      {icon}
      {label}
      {count ? (
        <span className="absolute right-2 top-2 grid h-[22px] min-w-[22px] place-items-center rounded-full bg-[#ffd600] px-1.5 text-[12px] font-extrabold leading-none text-[#0b1e3a] tabular-nums">
          {count}
        </span>
      ) : null}
    </Link>
  );
}

function NextMatch({ calendar, nowMs, today }: { calendar: PublicCalendar; nowMs: number; today: string }) {
  const week = useMemo(() => weekMatches(calendar.events, calendar.groups, today, null), [calendar, today]);
  const m = nextBoardMatch(week, nowMs);
  const date = m ? boardDate(m.date) : null;
  const opp = m?.opponent ? crestFor(m.opponent) : null;
  const weFirst = m?.homeAway !== "FUORI";
  const cat = m ? categoryShort(m.group, calendar.groups, m.team) : "";
  const us = (
    <span className="grid justify-items-center gap-1 text-center">
      <ClubCrestOfficial size={52} />
      <span className="text-[12.5px] font-bold leading-tight text-[#0b1e3a]">
        ColicoDerviese
        <span className="block font-medium text-[#4a5d7a]">{cat}</span>
      </span>
    </span>
  );
  const them = (
    <span className="grid justify-items-center gap-1 text-center">
      {opp?.src ? (
        <img src={opp.src} alt={`Stemma ${opp.label}`} width={52} height={52} loading="lazy" decoding="async" className="size-[52px] rounded-full bg-white object-contain" />
      ) : (
        <span aria-hidden="true" className="size-[52px]" />
      )}
      <span className="text-[12.5px] font-bold leading-tight text-[#0b1e3a]">{opp?.label ?? "Avversario da definire"}</span>
    </span>
  );
  return (
    <section aria-labelledby="board-next-t" data-testid="board-next-match">
      <div className="flex items-end justify-between">
        <h2
          id="board-next-t"
          className="m-0 inline-flex items-center gap-1.5 rounded-t-[12px] bg-[#1556c4] py-[7px] pl-3 pr-7 font-uv text-[15px] uppercase leading-none tracking-[0.03em] text-white [clip-path:polygon(0_0,88%_0,100%_100%,0_100%)]"
        >
          <Trophy className="size-4" aria-hidden="true" />
          Prossima gara
        </h2>
        <Link to="/calendario" className="scd-focus inline-flex items-center gap-0.5 pb-1.5 text-[13.5px] font-bold text-[#1556c4] hover:underline">
          Vedi tutte
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
      {m && date ? (
        <Link
          to="/calendario"
          search={{ annata: m.group }}
          className={`${CARD} scd-focus grid grid-cols-[78px_minmax(0,1fr)] rounded-tl-none border-l-4 border-[#1556c4] py-3 pl-2 pr-3 hover:bg-[#fbfcfe]`}
          aria-label={[
            cat,
            weFirst ? `ColicoDerviese contro ${opp?.label ?? "avversario da definire"}` : `${opp?.label ?? "Avversario da definire"} contro ColicoDerviese`,
            `${date.wd} ${date.day} ${date.month}`,
            m.time ? `ore ${m.time}` : "orario da definire",
            m.homeAway === "CASA" ? "in casa" : m.homeAway === "FUORI" ? "in trasferta" : "",
            m.place ? venueShort(m.place) : "",
          ]
            .filter(Boolean)
            .join(", ")}
        >
          <span className="grid content-center justify-items-center border-r border-[#e3eaf4] pr-2 leading-none text-[#0b1e3a]">
            <span className="text-[13px] font-extrabold">{date.wd}</span>
            <span className="font-uv text-[42px] leading-[0.95]">{date.day}</span>
            <span className="text-[13px] font-extrabold">{date.month}</span>
            <span className="mt-1.5 text-[15px] font-extrabold tabular-nums">{m.time || "—"}</span>
          </span>
          <span className="grid min-w-0 gap-2 pl-2">
            <span className="grid grid-cols-[1fr_auto_1fr] items-center">
              {weFirst ? us : them}
              <span className="px-1 font-uv text-[22px] leading-none text-[#0b2a5b]">
                VS
                <span aria-hidden="true" className="mt-1 block h-[3px] rounded-full bg-[#ffd600]" />
              </span>
              {weFirst ? them : us}
            </span>
            <span className="flex min-w-0 items-center justify-center gap-1 text-[12.5px] text-[#23406e]">
              <MapPin className="size-3.5 shrink-0 text-[#1556c4]" aria-hidden="true" />
              <span className="truncate">
                {m.homeAway === "FUORI" ? "In trasferta · " : m.homeAway === "CASA" ? "In casa · " : ""}
                {m.place ? venueShort(m.place) : "Campo da definire"}
              </span>
            </span>
            {(m.changes.length > 0 || m.pending.length > 0) && (
              <span className="justify-self-center rounded-full bg-[#fff3b0] px-2 py-0.5 text-[11.5px] font-bold text-[#0b2a5b]">
                {[...m.changes, ...m.pending][0]}
              </span>
            )}
          </span>
        </Link>
      ) : (
        <p className={`${CARD} m-0 rounded-tl-none px-4 py-4 text-[14.5px] text-[#4a5d7a]`} data-testid="board-next-empty">
          Nessuna gara nei prossimi 7 giorni. Il calendario completo è sempre aggiornato.
        </p>
      )}
    </section>
  );
}

/** Live countdown to the next HOME game of the week (seconds tick only on the device, after hydration). */
function HomeCountdown({ calendar, nowMs, today }: { calendar: PublicCalendar; nowMs: number; today: string }) {
  const [now, setNow] = useState(nowMs);
  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const week = useMemo(() => weekMatches(calendar.events, calendar.groups, today, null), [calendar, today]);
  const next = nextHomeKickoff(week, now);
  if (!next) return null;
  const left = countdownParts(next.startMs - now);
  const cat = categoryShort(next.entry.group, calendar.groups, next.entry.team);
  return (
    <p className="m-0 mt-1 inline-flex w-fit flex-wrap items-center gap-x-2 gap-y-1 rounded-[12px] bg-white/12 px-3 py-2 text-[13px] font-semibold backdrop-blur-sm" data-testid="board-countdown">
      <span className="scd-live-dot size-2 rounded-full bg-[#ffd600]" aria-hidden="true" />
      <span>Prossima in casa · {cat}</span>
      <span className="font-uv text-[20px] leading-none tabular-nums text-[#ffd600]" aria-hidden="true">
        {left.days > 0 ? `${left.days}g ` : ""}
        {left.hh}:{left.mm}:{left.ss}
      </span>
      <span className="sr-only">
        tra {left.days} giorni e {Number(left.hh)} ore
      </span>
    </p>
  );
}

export function HomeBoard({
  calendar,
  nowMs: serverNow,
  today,
}: {
  calendar: PublicCalendar;
  nowMs: number;
  today: string;
}) {
  const nowMs = useMinuteClock(serverNow);
  // Next club event from the published list (honours its window): the board's yellow card, never hardcoded.
  const event = clubEventsOn(today).find((e) => !e.date || e.date >= today) ?? null;
  const left = useMemo(
    () => gamesLeft(weekMatches(calendar.events, calendar.groups, today, null), nowMs),
    [calendar, today, nowMs],
  );
  return (
    <div data-testid="home-board">
      {/* 1. Hero "Questa settimana": the real lake photo with a slow zoom, the official crest,
          and a live countdown to the next home game. */}
      <section
        aria-labelledby="board-week-t"
        className="relative isolate overflow-hidden bg-[#0b3a8a] text-white"
        data-testid="board-hero"
      >
        <img
          src="/media/scd/lario-header.webp"
          alt=""
          aria-hidden="true"
          fetchPriority="high"
          decoding="async"
          className="scd-board-kb absolute inset-0 -z-20 size-full object-cover object-[center_62%]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgb(11_42_120/0.9)_0%,rgb(11_42_120/0.45)_30%,rgb(8_30_90/0.72)_50%,rgb(6_26_80/0.92)_100%)] lg:bg-[linear-gradient(90deg,rgb(6_26_80/0.94)_0%,rgb(8_30_90/0.78)_45%,rgb(11_42_120/0.2)_100%)]"
        />
        <div className={`${WRAP} relative flex min-h-[260px] items-end gap-4 pb-14 pt-6 lg:min-h-[340px] lg:pb-20`}>
          <div className="grid gap-2 lg:max-w-[620px]">
            <ClubCrestOfficial size={64} className="scd-board-pop drop-shadow-[0_6px_12px_rgb(0_0_0/0.45)] lg:hidden" />
            <h2 id="board-week-t" className="m-0 text-[30px] font-extrabold leading-tight lg:text-[48px]">
              Questa settimana
            </h2>
            <p className="m-0 text-[15px] font-semibold leading-snug lg:text-[19px]">
              Sport, crescita e comunità nel cuore dell'Alto Lario.
            </p>
            <HomeCountdown calendar={calendar} nowMs={nowMs} today={today} />
          </div>
          <ClubCrestOfficial size={150} className="scd-board-pop ml-auto hidden drop-shadow-[0_10px_20px_rgb(0_0_0/0.5)] lg:block" />
        </div>
      </section>

      {/* 2. Tiles over the hero edge, then 3. and 4. on the light panel */}
      <div className={`${WRAP} relative -mt-9 grid gap-4 lg:-mt-12 lg:gap-6`}>
        <nav aria-label="Esplora il club" className="grid grid-cols-4 gap-2 lg:gap-4">
          <Tile to="/calendario" label="Gare" icon={<BallIcon />} count={left} testId="board-tile-gare" />
          <Tile to="/allenamenti" label="Allenamenti" icon={<ConeIcon />} testId="board-tile-allenamenti" />
          <Tile to="/eventi" label="Eventi" icon={<CalendarIcon />} testId="board-tile-eventi" />
          <Tile to="/tornei" label="Iniziative" icon={<PeopleIcon />} testId="board-tile-iniziative" />
        </nav>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-end lg:gap-6">
          <NextMatch calendar={calendar} nowMs={nowMs} today={today} />
          <div className="grid grid-cols-2 gap-2 lg:gap-4">
            <Link
              to="/allenamenti"
              data-testid="board-trainings"
              className={`${CARD} scd-focus grid grid-cols-[48px_minmax(0,1fr)] items-center gap-2 p-2.5 hover:bg-[#fbfcfe]`}
            >
              <span aria-hidden="true" className="grid size-12 place-items-center rounded-[12px] bg-[#1f9d55]">
                <svg viewBox="0 0 32 32" className="size-7" fill="none" stroke="#fff" strokeWidth="2.4">
                  <path d="M13 4h6l6 20H7zM11.2 12h9.6M9.6 18h12.8M4 26h24" />
                </svg>
              </span>
              <span className="min-w-0">
                <span className="block text-[13.5px] font-extrabold leading-tight">Allenamenti</span>
                <span className="block text-[11.5px] leading-snug text-[#4a5d7a]">Della settimana, tutte le categorie</span>
              </span>
            </Link>
            {event ? (
              <Link
                to={event.href as never}
                data-testid="board-event"
                className={`${CARD} scd-focus grid grid-cols-[48px_minmax(0,1fr)] items-center gap-2 p-2.5 hover:bg-[#fbfcfe]`}
              >
                <span aria-hidden="true" className="grid size-12 place-items-center rounded-[12px] bg-[#ffd600] text-[#0b2a5b]">
                  <CalendarDays className="size-7" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13.5px] font-extrabold leading-tight">{event.title}</span>
                  <span className="block text-[11.5px] leading-snug text-[#4a5d7a]">{event.when}</span>
                </span>
              </Link>
            ) : (
              <Link
                to="/eventi"
                data-testid="board-event"
                className={`${CARD} scd-focus grid grid-cols-[48px_minmax(0,1fr)] items-center gap-2 p-2.5 hover:bg-[#fbfcfe]`}
              >
                <span aria-hidden="true" className="grid size-12 place-items-center rounded-[12px] bg-[#ffd600] text-[#0b2a5b]">
                  <CalendarDays className="size-7" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13.5px] font-extrabold leading-tight">Eventi</span>
                  <span className="block text-[11.5px] leading-snug text-[#4a5d7a]">Tornei e iniziative del club</span>
                </span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
