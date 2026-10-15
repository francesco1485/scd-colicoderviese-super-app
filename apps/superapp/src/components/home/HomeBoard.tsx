/**
 * Top of the public home. Template from the reference Francesco pointed to on 15/10/2026 10:05 (Eurobet home, only the
 * layout: no betting, no money), content from board VR-009:
 *   1. banner carousel with a white card and one clear button (HomePromo: welcome/sign-up, published events, season
 *      sign-up, the new squad cards);
 *   2. quick chips (LIVE badge on the games while a club game is played);
 *   3. "Prossima gara": the club's most important next game (Prima Squadra > agonistica > base, boardRank) with its
 *      live countdown, our crest VS the verified opponent crest;
 *   4. one small card: the pitches (how to get there). Members-only pages are not offered to visitors.
 * Data: the public calendar only (weekMatches, same source as /calendario); no score, no invented crest, no minor named.
 */
import { Link } from "@tanstack/react-router";
import { ChevronRight, MapPin, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { ClubCrestOfficial } from "@/components/SiteChrome";
import { venueShort } from "@/components/home/HomeSections";
import type { getPublicCalendarSnapshot } from "@/lib/calendar.functions";
import { crestFor } from "@/lib/crests";
import {
  boardDate,
  boardRank,
  countdownParts,
  kickoffMs,
  nextBoardMatch,
} from "@/lib/home-board";
import { categoryShort, matchdayClass } from "@/lib/home-matchday";
import { clubEventsOn } from "@/lib/club-events";
import { weekMatches } from "@/lib/home-today";
import { promoSlides, quickChips } from "@/lib/home-promo";
import { itemState } from "@/lib/universe";
import { matchShare } from "@/lib/share-match";
import { ShareWhatsApp } from "@/components/scd/ShareWhatsApp";
import { PromoCarousel, QuickChips } from "@/components/home/HomePromo";

type PublicCalendar = Awaited<ReturnType<typeof getPublicCalendarSnapshot>>;

const WRAP = "mx-auto w-full max-w-[1280px] px-4 lg:px-8";
const CARD =
  "rounded-[16px] bg-white shadow-[0_1px_2px_rgb(11_42_91/0.06),0_10px_24px_-14px_rgb(11_42_91/0.35)]";

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

function NextMatch({
  calendar,
  nowMs,
  today,
}: {
  calendar: PublicCalendar;
  nowMs: number;
  today: string;
}) {
  const week = useMemo(
    () => weekMatches(calendar.events, calendar.groups, today, null),
    [calendar, today],
  );
  const m = nextBoardMatch(week, nowMs, (e) =>
    boardRank(e, (g) => matchdayClass(g) === "agonistica"),
  );
  const start = m ? kickoffMs(m) : null;
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
        <img
          src={opp.src}
          alt={`Stemma ${opp.label}`}
          width={52}
          height={52}
          loading="lazy"
          decoding="async"
          className="size-[52px] rounded-full bg-white object-contain"
        />
      ) : (
        <span aria-hidden="true" className="size-[52px]" />
      )}
      <span className="text-[12.5px] font-bold leading-tight text-[#0b1e3a]">
        {opp?.label ?? "Avversario da definire"}
      </span>
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
        <span className="flex items-center gap-1 pb-1">
          {m && (
            <ShareWhatsApp
              data={matchShare({ ...m, opponent: opp?.label ?? m.opponent, place: m.place ? venueShort(m.place) : "" }, cat)}
            />
          )}
          <Link
            to="/calendario"
            className="scd-focus inline-flex h-10 items-center gap-0.5 text-[13.5px] font-bold text-[#1556c4] hover:underline"
          >
            Vedi tutte
            <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
        </span>
      </div>
      {m && date ? (
        <Link
          to="/calendario"
          search={{ annata: m.group }}
          className={`${CARD} scd-focus scd-shine grid grid-cols-[78px_minmax(0,1fr)] rounded-tl-none border-l-4 border-[#1556c4] py-3 pl-2 pr-3 hover:bg-[#fbfcfe]`}
          aria-label={[
            cat,
            weFirst
              ? `ColicoDerviese contro ${opp?.label ?? "avversario da definire"}`
              : `${opp?.label ?? "Avversario da definire"} contro ColicoDerviese`,
            `${date.wd} ${date.day} ${date.month}`,
            m.time ? `ore ${m.time}` : "orario da definire",
            m.homeAway === "CASA"
              ? "in casa"
              : m.homeAway === "FUORI"
                ? "in trasferta"
                : "",
            m.place ? venueShort(m.place) : "",
            start !== null && start > nowMs
              ? `inizia tra ${countdownParts(start - nowMs).days} giorni e ${Number(countdownParts(start - nowMs).hh)} ore`
              : "",
          ]
            .filter(Boolean)
            .join(", ")}
        >
          <span className="grid content-center justify-items-center border-r border-[#e3eaf4] pr-2 leading-none text-[#0b1e3a]">
            <span className="text-[13px] font-extrabold">{date.wd}</span>
            <span className="font-uv text-[42px] leading-[0.95]">
              {date.day}
            </span>
            <span className="text-[13px] font-extrabold">{date.month}</span>
            <span className="mt-1.5 text-[15px] font-extrabold tabular-nums">
              {m.time || "—"}
            </span>
          </span>
          <span className="grid min-w-0 gap-2 pl-2">
            <span className="grid grid-cols-[1fr_auto_1fr] items-center">
              {weFirst ? us : them}
              <span className="px-1 font-uv text-[22px] leading-none text-[#0b2a5b]">
                VS
                <span
                  aria-hidden="true"
                  className="mt-1 block h-[3px] rounded-full bg-[#ffd600]"
                />
              </span>
              {weFirst ? them : us}
            </span>
            <span className="flex min-w-0 items-center justify-center gap-1 text-[12.5px] text-[#23406e]">
              <MapPin
                className="size-3.5 shrink-0 text-[#1556c4]"
                aria-hidden="true"
              />
              <span className="truncate">
                {m.homeAway === "FUORI"
                  ? "In trasferta · "
                  : m.homeAway === "CASA"
                    ? "In casa · "
                    : ""}
                {m.place ? venueShort(m.place) : "Campo da definire"}
              </span>
            </span>
            {start !== null && <Countdown startMs={start} nowMs={nowMs} />}
            {(m.changes.length > 0 || m.pending.length > 0) && (
              <span className="justify-self-center rounded-full bg-[#fff3b0] px-2 py-0.5 text-[11.5px] font-bold text-[#0b2a5b]">
                {[...m.changes, ...m.pending][0]}
              </span>
            )}
          </span>
        </Link>
      ) : (
        <p
          className={`${CARD} m-0 rounded-tl-none px-4 py-4 text-[14.5px] text-[#4a5d7a]`}
          data-testid="board-next-empty"
        >
          Nessuna gara nei prossimi 7 giorni. Il calendario completo è sempre
          aggiornato.
        </p>
      )}
    </section>
  );
}

/** Live countdown to a kick-off (seconds tick only on the device, after hydration: first render = server time). */
function Countdown({ startMs, nowMs }: { startMs: number; nowMs: number }) {
  const [now, setNow] = useState(nowMs);
  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  if (startMs <= now) return null;
  const left = countdownParts(startMs - now);
  return (
    <span
      className="inline-flex items-center gap-2 justify-self-center rounded-full bg-[#0b2a5b] px-3 py-1 text-[12px] font-bold text-white"
      data-testid="board-countdown"
    >
      <span
        className="scd-live-dot size-2 rounded-full bg-[#ffd600]"
        aria-hidden="true"
      />
      Mancano
      <span
        className="font-uv text-[17px] leading-none tabular-nums text-[#ffd600]"
        aria-hidden="true"
      >
        {left.days > 0 ? `${left.days}g ` : ""}
        {left.hh}:{left.mm}:
        <span key={left.ss} className="scd-tick">
          {left.ss}
        </span>
      </span>
      <span className="sr-only">
        {left.days} giorni e {Number(left.hh)} ore
      </span>
    </span>
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
  const week = useMemo(
    () => weekMatches(calendar.events, calendar.groups, today, null),
    [calendar, today],
  );
  const live = week.some((e) => e.kind === "gara" && itemState(e, nowMs) === "live");
  const chips = quickChips(live);
  const slides = useMemo(() => promoSlides(today, clubEventsOn(today)), [today]);
  return (
    <div data-testid="home-board">
      {/* 1. Banner carousel and 2. quick chips (reference template, Francesco 15/10 10:05). */}
      <PromoCarousel slides={slides} />
      <QuickChips chips={chips} />

      {/* 3. The club's most important next game and 4. the pitches card (lg:self-start: no empty column below it). */}
      <div className={`${WRAP} relative grid gap-4 pt-5 lg:gap-6 lg:pt-8`}>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-stretch lg:gap-6">
          <NextMatch calendar={calendar} nowMs={nowMs} today={today} />
          {/* Visitors' home: the Allenamenti tile (members-only page, access screen for guests) is gone (cleanup 15/10/2026). */}
          <div className="grid gap-2 lg:gap-4 lg:self-start lg:pt-[30px]">
            <Link
              to="/impianti"
              data-testid="board-impianti"
              className={`${CARD} scd-focus grid grid-cols-[48px_minmax(0,1fr)] items-center gap-2 p-2.5 hover:bg-[#fbfcfe]`}
            >
              <span
                aria-hidden="true"
                className="grid size-12 place-items-center rounded-[12px] bg-[#ffd600] text-[#0b2a5b]"
              >
                <MapPin className="size-7" />
              </span>
              <span className="min-w-0">
                <span className="block text-[13.5px] font-extrabold leading-tight">
                  Campi e come arrivare
                </span>
                <span className="block text-[11.5px] leading-snug text-[#4a5d7a]">
                  Colico e Dervio
                </span>
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
