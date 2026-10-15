/**
 * Shared board cards of the public home (Francesco's boards; since 15/10/2026 21:35 the home itself is HomeWeek, the
 * week of every team drawn like the Calendario board VR-025):
 *   - NextMatch: "Prossima gara", the club's most important next game of the week (boardRank) from the public calendar,
 *     date block, our official crest VS the verified opponent crest (crestFor; none → no image), place with a pin;
 *   - SmallCard: the two practical cards (Dove ci alleniamo, Gioca con noi, lib/home-tiles.ts);
 *   - IrideCard: Iride, the Segreteria AI on WhatsApp (UD-155).
 * The lake hero, the four big tiles, the sponsor panel and "Mondo Colico" are gone with the old idea (no big bars,
 * 16:09; sponsors only in the fixed strip; no promo cards, UD-152). Data: public calendar only; no invented crest, no
 * minor named.
 */
import { Link } from "@tanstack/react-router";
import { ChevronRight, MapPin, MessageCircle, Trophy } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { ClubCrestOfficial } from "@/components/SiteChrome";
import { BrushStroke } from "@/components/home/HeroArt";
import { venueShort } from "@/components/home/HomeSections";
import type { getPublicCalendarSnapshot } from "@/lib/calendar.functions";
import { crestFor } from "@/lib/crests";
import { boardDate, boardRank, nextBoardMatch } from "@/lib/home-board";
import { categoryShort, matchdayClass } from "@/lib/home-matchday";
import { weekMatches } from "@/lib/home-today";
import { type HomeTile, type TileIcon } from "@/lib/home-tiles";
import { SEGRETERIA_WHATSAPP } from "@/lib/install-link";

type PublicCalendar = Awaited<ReturnType<typeof getPublicCalendarSnapshot>>;

/** Same column as the rest of the home. */
const WRAP = "mx-auto w-full max-w-[1200px] px-4 lg:px-8";
/** Common white card of the boards: rounded, soft blue shadow. */
export const BOARD_CARD =
  "rounded-[18px] bg-white shadow-[0_1px_2px_rgb(11_42_91/0.06),0_10px_26px_-14px_rgb(11_42_91/0.32)]";

/** Minute clock: server time on the first render (no hydration mismatch), then the device clock. */
export function useMinuteClock(serverNow: number): number {
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

/* ------------------------------------------------------------------ icons */

/** Coloured board icons of the four big tiles (original drawings). */
function TileGlyph({ icon }: { icon: TileIcon }) {
  const common = { viewBox: "0 0 48 48", "aria-hidden": true, focusable: false, className: "size-[40px] lg:size-[46px]" } as const;
  switch (icon) {
    case "gare":
      return (
        <svg {...common}>
          <defs>
            <clipPath id="tg-ball">
              <circle cx="24" cy="24" r="19" />
            </clipPath>
          </defs>
          <circle cx="24" cy="24" r="19" fill="#fff" />
          <g clipPath="url(#tg-ball)" fill="#0b2a5b">
            <path d="M24 16.5l7.1 5.2-2.7 8.4h-8.8l-2.7-8.4z" />
            <path d="M24 1l6 4.4-2.3 6.9h-7.4L18 5.4z" />
            <path d="M44.8 16.6l-1 7.4-6.6 2.2-4.4-6 3-7z" />
            <path d="M38 44l-7.2 1.3-3.5-6.2 4.4-5.9 6.9 1.6z" />
            <path d="M10 44l7.2 1.3 3.5-6.2-4.4-5.9-6.9 1.6z" />
            <path d="M3.2 16.6l1 7.4 6.6 2.2 4.4-6-3-7z" />
          </g>
          <g stroke="#0b2a5b" strokeWidth="1.6" strokeLinecap="round">
            <path d="M24 12.3v4.2M31.1 21.7l5-1.6M28.4 30.1l3.3 3.9M19.6 30.1l-3.3 3.9M16.9 21.7l-5-1.6" />
          </g>
          <circle cx="24" cy="24" r="19" fill="none" stroke="#0b2a5b" strokeWidth="2.6" />
        </svg>
      );
    case "allenamenti":
      return (
        <svg {...common}>
          <path d="M19.5 6h9l10 32h-29z" fill="#f2661b" />
          <path d="M16.2 17h15.6l2.2 7H14z M12.6 28.5h22.8l1.6 5H11z" fill="#fff" />
          <rect x="5" y="37" width="38" height="6" rx="2" fill="#f2661b" />
        </svg>
      );
    case "eventi":
      return (
        <svg {...common}>
          <rect x="5" y="8" width="38" height="35" rx="5" fill="#0b2a5b" />
          <rect x="5" y="8" width="38" height="10" rx="5" fill="#1556c4" />
          <rect x="13" y="4" width="4" height="9" rx="2" fill="#0b2a5b" />
          <rect x="31" y="4" width="4" height="9" rx="2" fill="#0b2a5b" />
          <g fill="#fff">
            <rect x="11" y="22" width="6" height="5" rx="1" />
            <rect x="21" y="22" width="6" height="5" rx="1" />
            <rect x="31" y="22" width="6" height="5" rx="1" />
            <rect x="11" y="31" width="6" height="5" rx="1" />
            <rect x="21" y="31" width="6" height="5" rx="1" />
          </g>
          <rect x="31" y="31" width="6" height="5" rx="1" fill="#ffd600" />
        </svg>
      );
    case "iniziative":
      return (
        <svg {...common}>
          <circle cx="24" cy="13" r="6.5" fill="#2f9e44" />
          <path d="M12 38c0-7.5 5.4-13 12-13s12 5.5 12 13z" fill="#2f9e44" />
          <circle cx="10.5" cy="18" r="5" fill="#46b85c" />
          <path d="M1.5 38c0-6 4-10.5 9-10.5 2.3 0 4.4.9 6 2.4C14 32 13 35 13 38z" fill="#46b85c" />
          <circle cx="37.5" cy="18" r="5" fill="#46b85c" />
          <path d="M46.5 38c0-6-4-10.5-9-10.5-2.3 0-4.4.9-6 2.4C34 32 35 35 35 38z" fill="#46b85c" />
        </svg>
      );
    case "campi":
      return (
        <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false" className="size-7 lg:size-9">
          <path d="M19.5 7h9l9.5 30h-28z" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinejoin="round" />
          <path d="M16.5 19h15M13.6 28h20.8" stroke="#fff" strokeWidth="3.2" />
          <path d="M6 40h36" stroke="#fff" strokeWidth="3.6" strokeLinecap="round" />
        </svg>
      );
    case "gioca":
      return (
        <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false" className="size-7 lg:size-9">
          <circle cx="24" cy="14" r="6" fill="#0b2a5b" />
          <path d="M13 37c0-7 4.9-12 11-12s11 5 11 12z" fill="#0b2a5b" />
          <circle cx="11" cy="18.5" r="4.6" fill="#0b2a5b" />
          <path d="M3 37c0-5.6 3.6-9.6 8-9.6 2 0 3.8.7 5.2 2-2 2.2-3.2 4.9-3.2 7.6z" fill="#0b2a5b" />
          <circle cx="37" cy="18.5" r="4.6" fill="#0b2a5b" />
          <path d="M45 37c0-5.6-3.6-9.6-8-9.6-2 0-3.8.7-5.2 2 2 2.2 3.2 4.9 3.2 7.6z" fill="#0b2a5b" />
        </svg>
      );
  }
}

/* ------------------------------------------------------------ next match */

/** Section heading of the boards: blue tab label on the left, "Vedi tutti" on the right. */
function TabHeading({ id, icon, children, to, linkLabel }: { id: string; icon: ReactNode; children: ReactNode; to: string; linkLabel: string }) {
  return (
    <div className="flex items-end justify-between">
      <h2
        id={id}
        className="m-0 inline-flex items-center gap-1.5 rounded-t-[12px] bg-[linear-gradient(90deg,#1556c4,#1d5fd0)] py-[8px] pl-3.5 pr-8 font-uv text-[16px] uppercase leading-none tracking-[0.03em] text-white [clip-path:polygon(0_0,86%_0,100%_100%,0_100%)]"
      >
        {icon}
        {children}
      </h2>
      <Link
        to={to as never}
        className="scd-focus inline-flex min-h-11 items-center gap-0.5 rounded-md text-[14px] font-bold text-[#1556c4] hover:underline"
      >
        {linkLabel}
        <ChevronRight className="size-4" aria-hidden="true" />
      </Link>
    </div>
  );
}

export function NextMatch({ calendar, nowMs, today }: { calendar: PublicCalendar; nowMs: number; today: string }) {
  const week = useMemo(() => weekMatches(calendar.events, calendar.groups, today, null), [calendar, today]);
  const m = nextBoardMatch(week, nowMs, (e) => boardRank(e, (g) => matchdayClass(g) === "agonistica"));
  const date = m ? boardDate(m.date) : null;
  const opp = m?.opponent ? crestFor(m.opponent) : null;
  const weFirst = m?.homeAway !== "FUORI";
  const cat = m ? categoryShort(m.group, calendar.groups, m.team) : "";
  const side = (crest: ReactNode, name: string, sub: string) => (
    <span className="grid min-w-0 justify-items-center gap-1.5 text-center">
      <span className="grid h-[58px] place-items-center lg:h-[66px]">{crest}</span>
      <span className="text-[14px] font-bold leading-tight text-[#0b1e3a] lg:text-[15.5px]">
        {name}
        {sub && <span className="block">{sub}</span>}
      </span>
    </span>
  );
  const us = side(<ClubCrestOfficial size={58} />, "ColicoDerviese", cat);
  const them = side(
    opp?.src ? (
      <img
        src={opp.src}
        alt={`Stemma ${opp.label}`}
        width={56}
        height={56}
        loading="lazy"
        decoding="async"
        className="size-[56px] object-contain"
      />
    ) : (
      <span aria-hidden="true" className="size-[56px]" />
    ),
    opp?.label ?? "Avversario da definire",
    "",
  );
  return (
    <section aria-labelledby="board-next-t" data-testid="board-next-match">
      <TabHeading id="board-next-t" icon={<Trophy className="size-4" aria-hidden="true" />} to="/calendario" linkLabel="Vedi tutti">
        Prossima gara
      </TabHeading>
      {m && date ? (
        <Link
          to="/calendario"
          search={{ annata: m.group }}
          className={`${BOARD_CARD} scd-focus grid grid-cols-[76px_minmax(0,1fr)] rounded-tl-none border-l-[5px] border-[#1556c4] py-3.5 pl-2 pr-3 hover:bg-[#fbfcfe] lg:grid-cols-[96px_minmax(0,1fr)] lg:py-5`}
          aria-label={[
            cat,
            weFirst
              ? `ColicoDerviese contro ${opp?.label ?? "avversario da definire"}`
              : `${opp?.label ?? "Avversario da definire"} contro ColicoDerviese`,
            `${date.wd} ${date.day} ${date.month}`,
            m.time ? `ore ${m.time}` : "orario da definire",
            m.homeAway === "CASA" ? "in casa" : m.homeAway === "FUORI" ? "in trasferta" : "",
            m.place ? venueShort(m.place) : "",
          ]
            .filter(Boolean)
            .join(", ")}
        >
          <span className="grid content-center justify-items-center border-r-2 border-[#e3eaf4] pr-2 leading-none text-[#0b1e3a]">
            <span className="text-[15px] font-extrabold lg:text-[17px]">{date.wd}</span>
            <span className="font-uv text-[46px] leading-[0.95] lg:text-[56px]">{date.day}</span>
            <span className="text-[15px] font-extrabold lg:text-[17px]">{date.month}</span>
            <span className="mt-2 text-[16px] font-extrabold tabular-nums lg:text-[18px]">{m.time || "—"}</span>
          </span>
          <span className="grid min-w-0 gap-2.5 pl-2.5">
            <span className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1">
              {weFirst ? us : them}
              <span className="px-1 text-center font-uv text-[24px] leading-none text-[#0b2a5b] lg:text-[28px]">
                VS
                <BrushStroke className="mx-auto mt-1 block h-[6px] w-[28px]" />
              </span>
              {weFirst ? them : us}
            </span>
            <span className="flex min-w-0 items-center justify-center gap-1.5 text-[13.5px] text-[#23406e] lg:text-[14.5px]">
              <MapPin className="size-4 shrink-0 text-[#1556c4]" aria-hidden="true" />
              <span className="truncate">
                {m.homeAway === "FUORI" ? "In trasferta · " : ""}
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
        <p className={`${BOARD_CARD} m-0 rounded-tl-none px-4 py-5 text-[15px] text-[#4a5d7a]`} data-testid="board-next-empty">
          Nessuna gara nei prossimi 7 giorni. Trovi tutte le gare nel calendario.
        </p>
      )}
    </section>
  );
}

/* --------------------------------------------------------------- cards */

const SMALL_TONE: Record<string, string> = {
  campi: "bg-[#2f9e44]",
  gioca: "bg-[#ffd600]",
};

export function SmallCard({ tile }: { tile: HomeTile }) {
  return (
    <Link
      to={tile.to as never}
      search={tile.search as never}
      {...(tile.hash ? { hash: tile.hash } : {})}
      className={`${BOARD_CARD} scd-focus scd-lift grid grid-cols-[46px_minmax(0,1fr)] items-center gap-2.5 p-2.5 lg:grid-cols-[64px_minmax(0,1fr)] lg:gap-3 lg:p-4`}
      data-tile={tile.id}
    >
      <span aria-hidden="true" className={`grid size-[46px] place-items-center rounded-[12px] lg:size-16 lg:rounded-[14px] ${SMALL_TONE[tile.id] ?? "bg-[#1556c4]"}`}>
        <TileGlyph icon={tile.icon} />
      </span>
      <span className="min-w-0">
        <span className="block text-[14px] font-extrabold leading-tight text-[#0b1e3a] lg:text-[17px]">{tile.label}</span>
        {tile.hint && <span className="mt-0.5 block text-[12px] leading-snug text-[#4a5d7a] lg:text-[14px]">{tile.hint}</span>}
      </span>
    </Link>
  );
}

/** Iride, the AI Segreteria on WhatsApp (UD-155): same facts as the /installa card, no avatar until the official file lands. */
export function IrideCard() {
  return (
    <section
      aria-labelledby="home-iride-t"
      className={`${BOARD_CARD} grid grid-cols-[52px_minmax(0,1fr)] items-center gap-3 p-3.5 lg:p-4`}
      data-testid="home-iride"
    >
      <span aria-hidden="true" className="grid size-[52px] place-items-center rounded-full bg-[#e8f0fd] text-[#1556c4]">
        <MessageCircle className="size-6" strokeWidth={2.2} />
      </span>
      <span className="min-w-0">
        <span className="block text-[11.5px] font-extrabold uppercase tracking-[0.1em] text-[#1556c4]">Segreteria AI · WhatsApp</span>
        <h2 id="home-iride-t" className="m-0 text-[16.5px] font-extrabold leading-tight text-[#0b1e3a]">
          Iride risponde 24/7
        </h2>
        <span className="block text-[13px] leading-snug text-[#4a5d7a]">Gare, iscrizioni, richieste.</span>
      </span>
      <a
        href={SEGRETERIA_WHATSAPP.chatUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="scd-focus col-span-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-[12px] bg-[#1556c4] px-4 text-[14.5px] font-bold text-white transition-[filter] duration-150 hover:brightness-110"
        aria-label="Scrivi a Iride su WhatsApp (apre una nuova scheda)"
      >
        <MessageCircle className="size-[18px]" aria-hidden="true" />
        Scrivi su WhatsApp
      </a>
    </section>
  );
}
