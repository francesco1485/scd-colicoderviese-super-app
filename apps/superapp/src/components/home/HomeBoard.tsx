/**
 * Top of the public home, rebuilt on Francesco's home board (home-originale.png, 15/10/2026 19:20 "voglio questo,
 * riprodurre questo e basta in tutto"; 19:19 no photo of the pitch):
 *   1. hero: original illustration of the Alto Lario at dusk (HeroArt, no photo), "Questa settimana" with the yellow
 *      brush stroke and the board subtitle (the crest and the wordmark sit in the header right above);
 *   2. four white tiles over the bottom of the hero: Gare, Allenamenti (for members: through the sign-in), Eventi,
 *      Iniziative (lib/home-tiles.ts);
 *   3. "Prossima gara": the club's most important next game of the week (boardRank) from the public calendar, date
 *      block, our official crest VS the verified opponent crest (crestFor; none → no image), place with a pin;
 *   4. two small cards (Dove ci alleniamo, Gioca con noi) and the Iride card (Segreteria AI on WhatsApp, UD-155);
 *   5. "I nostri sponsor": verified partners, a fair daily window (sponsorsOfTheDay), logos in colour on white tiles;
 *   6. "Mondo Colico": a designed card (no photo, no minor) to the club news.
 * Phones: one column. Desktop: the hero across the column, the tiles in a row, then two columns (game + cards left;
 * sponsors, Iride and Mondo Colico right). Data: public calendar only; no score, no invented crest, no minor named.
 */
import { Link } from "@tanstack/react-router";
import { ArrowRight, ChevronRight, Lock, MapPin, MessageCircle, Trophy } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { ClubCrestOfficial } from "@/components/SiteChrome";
import { BrushStroke, HeroArt } from "@/components/home/HeroArt";
import { venueShort } from "@/components/home/HomeSections";
import { KitTexture } from "@/components/scd/kit-texture";
import { LogoTile, SponsorLogo } from "@/components/scd/Logos";
import type { getPublicCalendarSnapshot } from "@/lib/calendar.functions";
import { crestFor } from "@/lib/crests";
import { boardDate, boardRank, nextBoardMatch } from "@/lib/home-board";
import { categoryShort, matchdayClass } from "@/lib/home-matchday";
import { weekMatches } from "@/lib/home-today";
import { bigTiles, smallTiles, type HomeTile, type TileIcon } from "@/lib/home-tiles";
import { SEGRETERIA_WHATSAPP } from "@/lib/install-link";
import { sponsorsOfTheDay } from "@/lib/public-home";

type PublicCalendar = Awaited<ReturnType<typeof getPublicCalendarSnapshot>>;

/** Same column as the rest of the home. */
const WRAP = "mx-auto w-full max-w-[1200px] px-4 lg:px-8";
/** Common white card of the boards: rounded, soft blue shadow. */
export const BOARD_CARD =
  "rounded-[18px] bg-white shadow-[0_1px_2px_rgb(11_42_91/0.06),0_10px_26px_-14px_rgb(11_42_91/0.32)]";

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

/* ------------------------------------------------------------------- hero */

function Hero() {
  return (
    <section
      aria-labelledby="home-hero-t"
      className="relative isolate overflow-hidden bg-[#0b3a8c] text-white lg:-mr-12 2xl:mr-0"
      data-testid="home-hero"
    >
      <HeroArt className="absolute inset-0 -z-10 size-full" />
      <div className={`${WRAP} pb-[60px] pt-4 sm:pt-5 lg:pb-[84px] lg:pt-8`}>
        <h2
          id="home-hero-t"
          className="m-0 font-uv text-[32px] leading-[0.95] tracking-[0.005em] drop-shadow-[0_3px_14px_rgb(6_26_61/0.45)] min-[400px]:text-[34px] lg:text-[52px]"
        >
          Questa settimana
        </h2>
        <BrushStroke className="mt-1 block h-[9px] w-[140px] lg:h-[12px] lg:w-[220px]" />
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
          <p className="m-0 max-w-[21rem] text-[15px] font-semibold leading-[1.25] drop-shadow-[0_2px_10px_rgb(6_26_61/0.5)] lg:max-w-none lg:text-[18px]">
            Sport, crescita e comunità nel cuore dell'Alto Lario.
          </p>
          {/* Visitors only (the public home): a small, clear invitation, not a banner (UD-152, handover 15/10 19:55). */}
          <Link
            to="/registrati"
            className="scd-focus inline-flex min-h-11 items-center gap-1 rounded-md text-[14.5px] font-bold text-[#ffd600] underline decoration-[#ffd600]/60 underline-offset-4 hover:decoration-[#ffd600]"
            data-testid="home-join"
          >
            Iscriviti al club
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function BigTile({ tile }: { tile: HomeTile }) {
  return (
    <li className="min-w-0">
      <Link
        to={tile.to as never}
        search={tile.search as never}
        {...(tile.hash ? { hash: tile.hash } : {})}
        aria-label={tile.members ? `${tile.label}: per i soci, entra per vederli` : tile.label}
        className={`${BOARD_CARD} scd-focus scd-lift relative grid h-full min-h-[92px] place-items-center content-center gap-1.5 px-1 py-3 text-center lg:min-h-[120px] lg:gap-2`}
        data-tile={tile.id}
      >
        <TileGlyph icon={tile.icon} />
        <span className="text-[13px] font-bold leading-tight text-[#0b1e3a] min-[400px]:text-[13.5px] lg:text-[16px]">
          {tile.label}
        </span>
        {tile.members && (
          <span className="absolute right-1.5 top-1.5 grid size-5 place-items-center rounded-full bg-[#eef3f9] text-[#4a5d7a]">
            <Lock className="size-3" aria-hidden="true" />
          </span>
        )}
      </Link>
    </li>
  );
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

function NextMatch({ calendar, nowMs, today }: { calendar: PublicCalendar; nowMs: number; today: string }) {
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

function SmallCard({ tile }: { tile: HomeTile }) {
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
function IrideCard() {
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

function SponsorPanel({ today }: { today: string }) {
  const picks = useMemo(() => sponsorsOfTheDay(today, 6), [today]);
  if (picks.length === 0) return null;
  return (
    <section
      aria-labelledby="home-sponsor-t"
      className="rounded-[18px] bg-[linear-gradient(120deg,#1d5fd0_0%,#1149a8_50%,#0b3a8c_100%)] p-3 pb-3.5 shadow-[0_12px_28px_-14px_rgb(11_42_91/0.55)] lg:p-4"
      data-testid="home-sponsors"
    >
      <div className="flex items-center justify-between gap-2 px-1 pb-2">
        <h2 id="home-sponsor-t" className="m-0 text-[18px] font-extrabold leading-none text-white lg:text-[20px]">
          I nostri sponsor
        </h2>
        <Link
          to="/sponsor"
          className="scd-focus inline-flex min-h-11 items-center gap-0.5 rounded-md text-[14px] font-bold text-white hover:underline"
        >
          Vedi tutti
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
      <ul className="m-0 grid list-none grid-cols-3 gap-2 p-0">
        {picks.map((s) => (
          <li key={s.slug}>
            <LogoTile className="h-[60px] w-full rounded-[12px] border-0 px-2 lg:h-[72px]">
              <SponsorLogo sponsor={s} box={{ w: 92, h: 38 }} />
            </LogoTile>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** "Mondo Colico" of the board, with a designed graphic instead of the photo of the boys (no faces, no pitch photo). */
function MondoColico() {
  return (
    <section aria-labelledby="home-mondo-t" data-testid="home-mondo">
      <h2 id="home-mondo-t" className="m-0 px-1 pb-2 text-[19px] font-extrabold leading-none text-[#0b1e3a] lg:text-[21px]">
        Mondo Colico
      </h2>
      <Link
        to="/comunicazioni"
        className={`${BOARD_CARD} scd-focus scd-lift grid grid-cols-[minmax(0,46%)_minmax(0,1fr)] overflow-hidden`}
        aria-label="Mondo Colico: notizie, storie, eventi e territorio. Scopri"
      >
        <span aria-hidden="true" className="relative grid min-h-[124px] place-items-center overflow-hidden bg-[radial-gradient(120%_120%_at_80%_10%,#1d5fd0_0%,#0b2f6b_65%)] lg:min-h-[150px]">
          <KitTexture motif="mountains-lake" overlay />
          <span className="relative grid justify-items-center gap-1">
            <ClubCrestOfficial size={58} className="drop-shadow-[0_6px_14px_rgb(0_0_0/0.4)]" />
            <span className="font-uv text-[15px] uppercase leading-none tracking-[0.06em] text-[#ffd600]">Colico · Dervio</span>
          </span>
        </span>
        <span className="flex min-w-0 flex-col gap-1 p-3.5 lg:p-4">
          <span className="text-[16px] font-extrabold leading-tight text-[#0b1e3a]">Mondo Colico</span>
          <span className="text-[13px] leading-snug text-[#4a5d7a]">Notizie, storie, eventi e territorio, sempre con noi.</span>
          <span className="mt-auto inline-flex min-h-10 w-fit items-center gap-1.5 rounded-[10px] bg-[#1556c4] px-4 text-[14px] font-bold text-white">
            Scopri
            <ArrowRight className="size-4" aria-hidden="true" />
          </span>
        </span>
      </Link>
    </section>
  );
}

/* ------------------------------------------------------------------ board */

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
  return (
    <div data-testid="home-board">
      <Hero />
      <div className={`${WRAP} relative z-[1] -mt-[58px] lg:-mt-[80px]`}>
        <ul className="m-0 grid list-none grid-cols-4 gap-2 p-0 lg:gap-4" aria-label="Sezioni" data-testid="home-tiles">
          {bigTiles().map((t) => (
            <BigTile key={t.id} tile={t} />
          ))}
        </ul>
      </div>
      <div className={`${WRAP} grid gap-4 pt-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-start lg:gap-6 lg:pt-8`}>
        <div className="grid min-w-0 gap-4 lg:gap-5">
          <NextMatch calendar={calendar} nowMs={nowMs} today={today} />
          <div className="grid grid-cols-2 gap-2.5 lg:gap-4">
            {smallTiles().map((t) => (
              <SmallCard key={t.id} tile={t} />
            ))}
          </div>
        </div>
        <div className="grid min-w-0 gap-4 lg:gap-5">
          <SponsorPanel today={today} />
          <IrideCard />
          <MondoColico />
        </div>
      </div>
    </div>
  );
}
