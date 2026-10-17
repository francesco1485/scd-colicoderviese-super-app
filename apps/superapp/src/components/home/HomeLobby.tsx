/**
 * Public home of the Super App, "via di mezzo" (Francesco 16/10/2026 14:46, design board M-Home on Claude Design):
 *   1. Partite della settimana — a slim navy strip where the week's games scroll slowly (pause button; pause on hover
 *      and focus; still with reduced motion); a game being played now leaves the strip and goes to the separate
 *      "In corso" box on its left.
 *   2. Chi siamo — affiliation and FIGC membership first: official crest, Club Giovanile di 3° livello FIGC SGS,
 *      LND Lombardia, affiliata AC Monza, matricola FIGC; the three transparent marks (never on a white plate, 16/10
 *      15:05). "Registrati gratis" is a small link, not a big bar.
 *   3. Oggi in campo — the training evening (UD-140, timetable only) with "In corso" on the session running now and the
 *      Club House hours.
 *   4. Servizi e club — Kit, Club House, Pulmini, Tornei ed eventi.
 *   5. In primo piano — organized slides (HomeSlides): avatar, Iride 24 ore su 24, the day's palinsesto.
 *   Side tool: the calendar is small and collateral (desktop: month with game days; phone: the week), plus the
 *   countdown to the next home game.
 * Data: public calendar and the training timetable only. No minor named, no mascot, no photo of the pitch.
 */
import { Link } from "@tanstack/react-router";
import { ArrowRight, Bus, CalendarDays, ChevronRight, Coffee, Pause, Play, Trophy } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { loginSearch } from "@/components/scd/AccessMenu";

import { ClubCrestOfficial } from "@/components/SiteChrome";
import { useMinuteClock } from "@/lib/use-minute-clock";
import { HomeBordoCampo } from "@/components/home/HomeBordoCampo";
import { HomeSlides } from "@/components/home/HomeSlides";
import { HomeNextMatch, HomeSfidaQuiz } from "@/components/home/HomeGiornoGara";
import { HOME_CARD, HOME_LABEL } from "@/components/home/tones";
import { venueShort } from "@/components/home/HomeSections";
import { groupShort } from "@/lib/board-data";
import type { getPublicCalendarSnapshot } from "@/lib/calendar.functions";
import { matchClock } from "@/lib/calendario-live";
import { CLUB_CREDENTIALS } from "@/lib/club-credentials";
import { CLUB_PROFILE } from "@/lib/club-profile";
import { crestFor } from "@/lib/crests";
import { weekBoardEvents } from "@/lib/home-week-board";
import { romeParts, romeToIso } from "@/lib/home-week";
import type { PublicEvent, PublicGroup } from "@/lib/public-snapshots";
import { CLUB_HOUSE_HOURS, PULMINO_ZONES, type PublicTrainingDay } from "@/lib/public-training";
import type { VetrinaSlot, VetrinaWorld } from "@/lib/vetrina";

type PublicCalendar = Awaited<ReturnType<typeof getPublicCalendarSnapshot>>;

const WRAP = "mx-auto w-full max-w-[1240px] px-4 lg:px-8";
/** White card with a thin metallic top edge (design system "via di mezzo"). */
const CARD = HOME_CARD;
const GOLD = "scd-gold";
const LABEL = HOME_LABEL;
const KIT_FULL = "/media/kit/kit-2026-27-blu.webp";

const WD3 = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"] as const;
const WD_LONG = ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"] as const;
const MONTHS = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"] as const;

const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);

function Heading({ id, children, action, sub }: { id: string; children: ReactNode; action?: ReactNode; sub?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3 pb-3">
      <div className="min-w-0">
        <h2 id={id} className="m-0 font-display text-[22px] font-bold leading-tight text-[#14264d] lg:text-[26px]">
          {children}
        </h2>
        {sub && <p className="m-0 mt-0.5 text-[13px] text-[#52627f] lg:text-[14px]">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

/* ------------------------------------------------------------ helpers */

/** Rome wall-clock date + time → epoch ms (DST-safe, same helper as the calendar). */
export function romeMs(date: string, time: string): number {
  return Date.parse(romeToIso(date, time));
}

/** "tra 2 giorni e 3 ore" / "tra 4 ore e 10 minuti" / "tra 12 minuti". */
export function countdownLabel(ms: number): string {
  const min = Math.max(0, Math.floor(ms / 60_000));
  const d = Math.floor(min / 1440);
  const h = Math.floor((min % 1440) / 60);
  const m = min % 60;
  const n = (v: number, one: string, many: string) => `${v} ${v === 1 ? one : many}`;
  if (d > 0) return `tra ${n(d, "giorno", "giorni")}${h ? ` e ${n(h, "ora", "ore")}` : ""}`;
  if (h > 0) return `tra ${n(h, "ora", "ore")}${m ? ` e ${n(m, "minuto", "minuti")}` : ""}`;
  return `tra ${n(m, "minuto", "minuti")}`;
}

/** Countdown split for the digit tiles: whole days, hours and minutes left (never negative). */
export function countdownParts(ms: number): { d: number; h: number; m: number } {
  const min = Math.max(0, Math.floor(ms / 60_000));
  return { d: Math.floor(min / 1440), h: Math.floor((min % 1440) / 60), m: min % 60 };
}

/** Next home game with a time, from the public calendar. */
export function nextHome(events: readonly PublicEvent[], nowMs: number): { e: PublicEvent; at: number } | null {
  const n = nextGame(events, nowMs, { homeOnly: true, horizonDays: Infinity });
  return n && n.hasTime ? { e: n.e, at: n.at } : null;
}

export type NextGame = {
  e: PublicEvent;
  /** Kick-off in epoch ms (Rome wall clock); start of the day when the time is not known. */
  at: number;
  hasTime: boolean;
  /** Other games of the club at the same date and time. */
  sameSlot: number;
};

/**
 * Next game of the club (home or away) from the public calendar, within `horizonDays` (default 14).
 * Games without a time count until the end of their Rome day and sort at the start of it.
 * With `homeOnly` only games in casa with a time are considered (the old nextHome behaviour).
 */
export function nextGame(
  events: readonly PublicEvent[],
  nowMs: number,
  { homeOnly = false, horizonDays = 14 }: { homeOnly?: boolean; horizonDays?: number } = {},
): NextGame | null {
  const limit = nowMs + horizonDays * 86_400_000;
  let best: { e: PublicEvent; at: number; hasTime: boolean } | null = null;
  for (const e of events) {
    if (homeOnly && (e.homeAway !== "CASA" || !e.time)) continue;
    const hasTime = /^\d{2}:\d{2}$/.test(e.time);
    const at = romeMs(e.date, hasTime ? e.time : "00:00");
    const stillOn = hasTime ? at > nowMs : romeMs(e.date, "23:59") > nowMs;
    if (!stillOn || at > limit) continue;
    if (!best || at < best.at || (at === best.at && hasTime && !best.hasTime)) best = { e, at, hasTime };
  }
  if (!best) return null;
  const b = best;
  const sameSlot = events.filter((x) => x !== b.e && x.date === b.e.date && x.time === b.e.time && (!homeOnly || x.homeAway === "CASA")).length;
  return { ...b, sameSlot };
}

/** The week's games split for the strip: games being played now go to the "In corso" box, the others scroll. */
export function splitLive(events: readonly PublicEvent[], nowMs: number): { live: PublicEvent[]; strip: PublicEvent[] } {
  const live: PublicEvent[] = [];
  const strip: PublicEvent[] = [];
  for (const e of events) {
    const s = matchClock(e, nowMs).state;
    if (s === "live") live.push(e);
    else if (s !== "done") strip.push(e);
  }
  return { live, strip };
}

/** True while a training session of today is running (Rome HH:MM between start and end). */
export function sessionRunning(row: { time: string; end: string }, nowHHMM: string): boolean {
  if (!row.time || !row.end) return false;
  return nowHHMM >= row.time && nowHHMM < row.end;
}

/** Monday-first month grid of `ym` ("2026-10"): leading blanks then 1..n. */
export function monthGrid(ym: string): (number | null)[] {
  const [y, m] = ym.split("-").map(Number) as [number, number];
  const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lead = (first + 6) % 7;
  return [...Array.from({ length: lead }, () => null), ...Array.from({ length: days }, (_, i) => i + 1)];
}

/** Monday-first week (7 ISO dates) containing `day`. */
export function weekOf(day: string): string[] {
  const d = new Date(`${day}T12:00:00Z`);
  const back = (d.getUTCDay() + 6) % 7;
  return Array.from({ length: 7 }, (_, i) => new Date(d.getTime() + (i - back) * 86_400_000).toISOString().slice(0, 10));
}

/* ------------------------------------------- 1. partite della settimana */

function stripItem(e: PublicEvent, g: PublicGroup | undefined) {
  const d = new Date(`${e.date}T12:00:00Z`);
  const opp = e.opponent ? crestFor(e.opponent).label : "avversario da definire";
  return {
    when: `${WD3[d.getUTCDay()]} ${e.time || "orario da definire"}`,
    team: groupShort(g, e.category),
    text: e.homeAway === "CASA" ? `con ${opp}` : `a ${opp}`,
  };
}

/**
 * Slim strip on top of the page (14:46 «partite della settimana… come la barra in basso sponsor, quando ci vai sopra si
 * apre, camminano lentamente e in risalto solo in piccolo, poi diventano in live su una casella a parte»).
 */
function WeekStrip({ events, groups, nowMs }: { events: readonly PublicEvent[]; groups: readonly PublicGroup[]; nowMs: number }) {
  const [paused, setPaused] = useState(false);
  const groupOf = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups]);
  const { live, strip } = useMemo(() => splitLive(events, nowMs), [events, nowMs]);
  const row = (dup: boolean) =>
    strip.map((e) => {
      const it = stripItem(e, groupOf.get(e.group));
      return (
        <li key={`${dup ? "d" : "o"}-${e.id}`} className={dup ? "scd-ticker-dup" : undefined} aria-hidden={dup || undefined}>
          <Link
            to="/calendario"
            search={{ annata: e.group, vista: "settimana" }}
            tabIndex={dup ? -1 : undefined}
            className="scd-focus mx-1 inline-flex min-h-11 origin-center items-center gap-1.5 whitespace-nowrap rounded-full border border-white/15 bg-white/[0.07] px-3 font-display text-[13px] text-[#dfe7f7] transition-transform duration-200 hover:scale-[1.06] hover:bg-white hover:text-[#14264d] focus-visible:bg-white focus-visible:text-[#14264d] lg:text-[14px]"
          >
            <span className="tabular-nums opacity-75">{it.when}</span>
            <strong className="font-semibold">{it.team}</strong>
            <span>{it.text}</span>
            {e.homeAway === "CASA" ? <span className="font-bold text-[#ffd23f]">· in casa</span> : <span className="opacity-75">· fuori</span>}
          </Link>
        </li>
      );
    });
  const first = live[0];
  const liveText = (e: PublicEvent) => {
    const it = stripItem(e, groupOf.get(e.group));
    return `${it.team} ${it.text}`;
  };
  return (
    <section aria-label="Partite della settimana" className="scd-band border-b border-[#b8c5dd]/25 text-white lg:-mr-12 2xl:mr-0" data-testid="home-ticker">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-stretch lg:flex-nowrap">
        <div
          className={`${first ? "flex" : "hidden lg:flex"} min-h-11 w-full items-center gap-2 border-b border-white/10 bg-black/20 px-4 lg:w-auto lg:border-b-0 lg:border-r lg:px-5`}
          data-testid="home-live-box"
        >
          <span aria-hidden="true" className={`size-2 rounded-full ${first ? "scd-live-dot bg-[#ff4d5e]" : "bg-[#5d6f94]"}`} />
          <span className={`${LABEL} text-[#c9d6f0]`}>In corso</span>
          {first ? (
            <Link to="/calendario" search={{ annata: first.group, vista: "settimana" }} className="scd-focus min-h-11 truncate rounded-md font-display text-[14px] font-semibold text-white">
              {liveText(first)} · {matchClock(first, nowMs).label}
              {live.length > 1 ? ` · +${live.length - 1}` : ""}
            </Link>
          ) : (
            <span className="font-display text-[14px] text-[#b4c3de]">nessuna gara ora</span>
          )}
        </div>
        <div className="flex min-w-0 basis-full items-center lg:flex-1 lg:basis-0">
          <span className={`${LABEL} hidden shrink-0 px-4 text-[#ffd23f] lg:inline`}>Partite della settimana</span>
          {strip.length > 0 && (
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              aria-pressed={paused}
              aria-label={paused ? "Fai scorrere le gare" : "Ferma lo scorrimento delle gare"}
              className="scd-focus grid min-h-11 w-11 shrink-0 place-items-center text-[#c9d6f0] hover:text-white"
              data-testid="bar-pause"
            >
              {paused ? <Play className="size-4" aria-hidden="true" /> : <Pause className="size-4" aria-hidden="true" />}
            </button>
          )}
          <div
            className="scd-ticker min-w-0 flex-1 overflow-hidden py-1 [mask-image:linear-gradient(90deg,transparent,#000_4%,#000_96%,transparent)]"
            data-paused={paused}
            style={{ ["--ticker-s" as string]: `${Math.max(30, strip.length * 8)}s` }}
          >
            {strip.length > 0 ? (
              <ul className="scd-ticker-track m-0 flex w-max list-none p-0">
                {row(false)}
                {row(true)}
              </ul>
            ) : (
              <p className="m-0 flex min-h-11 items-center px-3 font-display text-[13px] text-[#b4c3de]">{live.length > 0 ? "Nessun'altra gara nei prossimi 7 giorni" : "Nessuna gara nei prossimi 7 giorni"}</p>
            )}
          </div>
          <Link
            to="/calendario"
            className="scd-focus inline-flex min-h-11 shrink-0 items-center gap-1 px-3 font-display text-[13px] font-semibold text-[#c9d6f0] hover:text-white lg:px-5"
            data-testid="bar-calendario"
          >
            Tutte
            <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------- 2. chi siamo */

const MARK_H: Record<string, string> = {
  "figc-sgs-3-livello": "h-[30px] lg:h-[48px]",
  lnd: "h-[32px] lg:h-[52px]",
  "insieme-al-monza": "h-[34px] lg:h-[56px]",
};

function ClubAffiliation() {
  return (
    <section
      aria-labelledby="home-club-t"
      className="scd-band relative overflow-hidden text-white lg:-mr-12 2xl:mr-0"
      data-testid="home-profile"
    >
      <span aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(60%_120%_at_88%_0%,rgb(127_208_255/0.22),transparent_70%)]" />
      <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[2px] bg-[linear-gradient(90deg,#8ea2c6,#ffffff_22%,#b8c5dd_50%,#ffffff_78%,#8ea2c6)]" />
      <div className={`${WRAP} relative grid gap-4 py-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-8 lg:py-8`}>
        <div className="flex items-center gap-4 lg:gap-8">
          <ClubCrestOfficial size={92} className="shrink-0 drop-shadow-[0_10px_20px_rgb(0_0_0/0.45)] lg:hidden" />
          <ClubCrestOfficial size={164} className="hidden shrink-0 drop-shadow-[0_10px_24px_rgb(0_0_0/0.45)] lg:block" />
          <div className="grid min-w-0 gap-1 lg:gap-2">
            <span className={`${LABEL} text-[#ffd23f]`}>Stagione 2026/27 · Colico e Dervio</span>
            <h2 id="home-club-t" className="m-0 font-display text-[22px] font-bold uppercase leading-[1.05] tracking-[0.01em] lg:text-[40px]">
              S.C.D. ColicoDerviese
            </h2>
            <p className="m-0 text-[13px] leading-snug text-[#dbe5f7] lg:text-[19px]">
              <span className="block">
                Club Giovanile di 3° livello <strong className="text-white">FIGC · Settore Giovanile e Scolastico</strong>
              </span>
              <span className="block">Campionati con LND Lombardia · società affiliata AC Monza</span>
            </p>
            <span className="font-display text-[12px] text-[#b4c3de] lg:text-[14px]">Matricola FIGC {CLUB_PROFILE.figcMatricola}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 lg:flex-col lg:items-end lg:gap-4">
          <ul className="m-0 flex list-none items-center gap-3 p-0 lg:gap-5" aria-label="Riconoscimenti e affiliazioni">
            {CLUB_CREDENTIALS.map((c) => (
              <li key={c.id} className="flex">
                <img
                  src={c.art.src}
                  alt={c.alt}
                  decoding="async"
                  className={`${MARK_H[c.id] ?? "h-8"} w-auto object-contain [filter:drop-shadow(0_0_1px_rgb(255_255_255/0.95))_drop-shadow(0_0_6px_rgb(255_255_255/0.55))]`}
                />
              </li>
            ))}
          </ul>
          <p className="m-0 font-display text-[13px] text-[#c9d6f0] lg:text-[15px]">
            Famiglie e atleti:{" "}
            <Link to="/registrati" className="scd-focus inline-flex min-h-11 items-center rounded-md font-bold text-[#ffd23f] underline underline-offset-2" data-testid="home-join">
              registrati gratis
            </Link>
            {" · "}
            <Link to="/accedi" className="scd-focus inline-flex min-h-11 items-center rounded-md font-semibold text-white underline-offset-2 hover:underline">
              accedi
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------- 3. oggi in campo */

function TodayOnPitch({ day, today, nowMs }: { day: PublicTrainingDay | null; today: string; nowMs: number }) {
  if (!day || day.rows.length === 0) return null;
  const isToday = day.date === today;
  const nowHHMM = romeParts(new Date(nowMs).toISOString())?.time ?? "00:00";
  const d = new Date(`${day.date}T12:00:00Z`);
  const label = `${WD_LONG[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
  return (
    <section aria-labelledby="home-training-t" className={`${CARD} px-4 pb-3 pt-4 lg:px-6`} data-testid="home-training">
      <Heading
        id="home-training-t"
        sub={`${label} · Centro sportivo di Colico`}
        action={
          <Link to="/accedi" search={loginSearch("/allenamenti")} className="scd-focus inline-flex min-h-11 items-center gap-1 rounded-md font-display text-[14px] font-semibold text-[#0457af]" data-testid="bar-allenamenti" aria-label="Tutti gli allenamenti: per i soci, accedi">
            Tutti
            <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
        }
      >
        {isToday ? "Oggi in campo" : `${cap(WD_LONG[d.getUTCDay()] ?? "")} in campo`}
      </Heading>
      <ol className="m-0 list-none p-0">
        {day.rows.map((r) => {
          const on = isToday && sessionRunning(r, nowHHMM);
          return (
            <li key={r.id} className="flex items-center gap-3 border-t border-[#edf1f7] py-2.5">
              <span className="w-[54px] shrink-0 font-display">
                <span className="block text-[17px] font-bold tabular-nums text-[#14264d]">{r.time}</span>
                {r.end && <span className="block text-[11px] text-[#7a8aa8]">fine {r.end}</span>}
              </span>
              <span aria-hidden="true" className={`w-[3px] self-stretch rounded-full ${on ? "bg-[#ff4d5e]" : "bg-[#c3cee0]"}`} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-display text-[16px] font-bold text-[#14264d]">{r.teams}</span>
                <span className="block text-[12px] text-[#52627f]">{r.field}</span>
              </span>
              {on ? (
                <span className="inline-flex items-center gap-1.5 rounded-[4px] bg-[#ffe3e6] px-2 py-0.5 font-display text-[11px] font-bold tracking-[0.06em] text-[#c4122b]">
                  <span aria-hidden="true" className="scd-live-dot size-1.5 rounded-full bg-[#ff4d5e]" />
                  IN CORSO
                </span>
              ) : (
                <span className="rounded-[4px] bg-[#eef1f6] px-2 py-0.5 font-display text-[11px] font-bold tracking-[0.06em] text-[#62728f]">ALLE {r.time}</span>
              )}
            </li>
          );
        })}
      </ol>
      <p className="m-0 flex items-center gap-2 border-t border-[#edf1f7] pt-2.5 text-[13px] text-[#7a5800]" data-testid="home-clubhouse">
        <span aria-hidden="true" className={`grid size-6 place-items-center rounded-[6px] ${GOLD}`}>
          <Coffee className="size-3.5" />
        </span>
        Club House aperta {CLUB_HOUSE_HOURS.days.toLowerCase()} {CLUB_HOUSE_HOURS.from}–{CLUB_HOUSE_HOURS.to}
      </p>
      <p className="m-0 pt-1.5 text-[12px] text-[#7a8aa8]">Orari della settimana tipo: fa fede l'avviso del mister.</p>
    </section>
  );
}

/* ------------------------------------------------------ 4. servizi e club */

function ServiceCard({ to, search, art, kicker, title, text, cta, testid }: { to: string; search?: object; art: ReactNode; kicker: string; title: string; text: string; cta: string; testid: string }) {
  return (
    <li className="min-w-0">
      <Link to={to as never} search={search as never} className={`${CARD} scd-focus flex h-full flex-col hover:border-[#0457af]`} data-testid={testid}>
        <span className="relative block h-[112px] overflow-hidden lg:h-[124px]">{art}</span>
        <span className="flex flex-1 flex-col gap-1 p-3.5">
          <span className={`${LABEL} text-[#0457af]`}>{kicker}</span>
          <span className="font-display text-[17px] font-bold leading-tight text-[#14264d]">{title}</span>
          <span className="text-[13px] leading-snug text-[#52627f]">{text}</span>
          <span className={`mt-auto inline-flex w-fit items-center gap-1 rounded-[8px] px-3 py-1.5 font-display text-[14px] font-semibold ${GOLD}`}>
            {cta}
            <ArrowRight className="size-4" aria-hidden="true" />
          </span>
        </span>
      </Link>
    </li>
  );
}

function Services() {
  return (
    <section aria-labelledby="home-services-t" data-testid="home-services">
      <Heading id="home-services-t">Servizi e club</Heading>
      <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 lg:grid-cols-4 lg:gap-4">
        <ServiceCard
          to="/kit"
          testid="home-shop"
          kicker="Kit 2026/27"
          title="Kit ufficiale del club"
          text="Kit atleti e Primi Calci: cosa contiene, quanto costa e come si ordina."
          cta="Vedi i kit"
          art={
            <>
              <span aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_70%_40%,#3f7fe6,#13254d_70%)]" />
              <img src={KIT_FULL} alt="Kit ufficiale ColicoDerviese 2026/27" loading="lazy" decoding="async" className="absolute left-1/2 top-2 h-[96px] -translate-x-1/2 object-contain drop-shadow-[0_8px_14px_rgb(0_0_0/0.45)] lg:h-[108px]" />
            </>
          }
        />
        <ServiceCard
          to="/impianti"
          testid="home-clubhouse-card"
          kicker="Club House"
          title={`Aperta ${CLUB_HOUSE_HOURS.days.toLowerCase()}`}
          text={`Dalle ${CLUB_HOUSE_HOURS.from} alle ${CLUB_HOUSE_HOURS.to}, durante gli allenamenti.`}
          cta="Dove siamo"
          art={
            <span className={`absolute inset-0 grid place-items-center ${GOLD}`}>
              <span className="inline-flex items-center gap-2 font-display text-[30px] font-bold text-[#13254d] lg:text-[36px]">
                <Coffee className="size-8" aria-hidden="true" />
                {CLUB_HOUSE_HOURS.from.slice(0, 2)}–{CLUB_HOUSE_HOURS.to.slice(0, 2)}
              </span>
            </span>
          }
        />
        <ServiceCard
          to="/pulmini"
          testid="home-pulmino"
          kicker="Pulmini"
          title="Il pulmino ti porta al campo"
          text="Per gli atleti iscritti. Il posto lo conferma la segreteria."
          cta="Scopri"
          art={
            <span className="absolute inset-0 bg-[linear-gradient(135deg,#13254d,#0457af)]">
              <Bus className="absolute left-1/2 top-[38%] size-12 -translate-x-1/2 -translate-y-1/2 text-[#ffd23f]" strokeWidth={1.6} aria-hidden="true" />
              <span className="absolute inset-x-2 bottom-2 flex flex-wrap justify-center gap-1">
                {PULMINO_ZONES.map((z) => (
                  <span key={z.id} className="rounded-full border border-white/45 px-2 font-display text-[11px] font-semibold text-white">
                    {z.label}
                  </span>
                ))}
              </span>
            </span>
          }
        />
        <ServiceCard
          to="/eventi/christmas-lario-cup"
          testid="home-eventi"
          kicker="Tornei ed eventi"
          title="Christmas Lario Cup"
          text="Martedì 8 dicembre, edizione maschile e femminile."
          cta="Scopri"
          art={
            <span className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_30%_30%,#7fd0ff,#0457af_45%,#13254d)]">
              <span className="grid place-items-center gap-1 text-center font-display text-[24px] font-bold uppercase leading-[0.9] text-white lg:text-[28px]">
                <Trophy className="size-7 text-[#ffd84a]" aria-hidden="true" />
                <span>8 dicembre</span>
              </span>
            </span>
          }
        />
      </ul>
    </section>
  );
}

/* ----------------------------------------------------- calendario a lato */

function MonthCard({ events, today, nowMs, groups }: { events: readonly PublicEvent[]; today: string; nowMs: number; groups: readonly PublicGroup[] }) {
  const ym = today.slice(0, 7);
  const gameDays = useMemo(() => new Set(events.filter((e) => e.date.startsWith(ym)).map((e) => Number(e.date.slice(8, 10)))), [events, ym]);
  const cells = monthGrid(ym);
  const todayN = Number(today.slice(8, 10));
  const m = Number(ym.slice(5, 7)) - 1;
  const next = nextHome(events, nowMs);
  const ng = next ? groups.find((g) => g.id === next.e.group) : undefined;
  return (
    <aside className="hidden flex-col gap-4 lg:flex" aria-label="Calendario e prossima gara in casa">
      <div className={`${CARD} p-4`} data-testid="home-month">
        <div className="flex items-baseline justify-between pb-2">
          <span className="font-display text-[19px] font-bold capitalize text-[#14264d]">
            {MONTHS[m]} {ym.slice(0, 4)}
          </span>
        </div>
        <div className="grid grid-cols-7 gap-0.5 text-center">
          {["L", "M", "M", "G", "V", "S", "D"].map((d, i) => (
            <span key={i} className="pb-1 text-[11px] font-semibold text-[#7a8aa8]">
              {d}
            </span>
          ))}
          {cells.map((n, i) =>
            n === null ? (
              <span key={`b${i}`} />
            ) : (
              <span
                key={n}
                className={`relative grid h-8 place-items-center rounded-full font-display text-[14px] ${n === todayN ? "bg-[#13254d] font-bold text-white" : "text-[#14264d]"}`}
              >
                {n}
                {gameDays.has(n) && <span className="sr-only">, giorno di gare</span>}
                {gameDays.has(n) && <span aria-hidden="true" className="absolute bottom-0.5 size-[5px] rounded-full bg-[#ffd23f] ring-1 ring-[#c99600]" />}
              </span>
            ),
          )}
        </div>
        <div className="mt-2 flex items-center gap-3 text-[12px] text-[#52627f]">
          <span className="inline-flex items-center gap-1">
            <span aria-hidden="true" className="size-[7px] rounded-full bg-[#ffd23f] ring-1 ring-[#c99600]" />
            gare
          </span>
          <span className="inline-flex items-center gap-1">
            <span aria-hidden="true" className="size-2.5 rounded-full bg-[#13254d]" />
            oggi
          </span>
        </div>
        <Link to="/calendario" className="scd-focus mt-3 flex min-h-11 items-center justify-center gap-1.5 rounded-[8px] border border-[#c3cee0] font-display text-[15px] font-semibold text-[#13254d] hover:bg-[#eef2f8]">
          <CalendarDays className="size-4" aria-hidden="true" />
          Apri il calendario
        </Link>
      </div>
      {next && (
        <Link to="/calendario" search={{ annata: next.e.group, vista: "settimana" }} className={`${CARD} scd-focus grid gap-1 p-4 hover:border-[#0457af]`} data-testid="home-countdown">
          <span className={`${LABEL} text-[#0457af]`}>Prossima gara in casa</span>
          <span className="font-display text-[22px] font-bold leading-none text-[#14264d]">{countdownLabel(next.at - nowMs)}</span>
          <span className="text-[13px] text-[#52627f]">
            {groupShort(ng, next.e.category)}
            {next.e.opponent ? ` · con ${crestFor(next.e.opponent).label}` : ""}
            {next.e.venue ? ` · ${venueShort(next.e.venue)}` : ""}
          </span>
        </Link>
      )}
    </aside>
  );
}

/** Phone: the week with the game days and a link to the month (the calendar stays collateral). */
function WeekDays({ events, today }: { events: readonly PublicEvent[]; today: string }) {
  const days = weekOf(today);
  const has = new Set(events.map((e) => e.date));
  return (
    <nav aria-label="Questa settimana" className={`${CARD} flex items-center gap-1 px-2 py-2 lg:hidden`} data-testid="home-week">
      <ol className="m-0 grid flex-1 list-none grid-cols-7 p-0">
        {days.map((d) => {
          const dt = new Date(`${d}T12:00:00Z`);
          const on = d === today;
          return (
            <li key={d}>
              <Link to="/calendario" search={{ vista: "settimana" }} className="scd-focus flex min-h-11 flex-col items-center gap-0.5 rounded-md" aria-label={`${WD_LONG[dt.getUTCDay()]} ${dt.getUTCDate()}${has.has(d) ? ", giorno di gare" : ""}`}>
                <span className="text-[11px] font-semibold text-[#7a8aa8]">{"DLMMGVS"[dt.getUTCDay()]}</span>
                <span className={`relative grid size-8 place-items-center rounded-full font-display text-[15px] ${on ? "bg-[#13254d] font-bold text-white" : "text-[#14264d]"}`}>
                  {dt.getUTCDate()}
                  {has.has(d) && <span aria-hidden="true" className="absolute -bottom-0.5 size-[5px] rounded-full bg-[#ffd23f] ring-1 ring-[#c99600]" />}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
      <Link to="/calendario" className="scd-focus flex min-h-11 flex-col items-center justify-center border-l border-[#e3e9f3] px-2 font-display text-[11px] font-semibold text-[#0457af]">
        <CalendarDays className="size-5" aria-hidden="true" />
        Mese
      </Link>
    </nav>
  );
}

/* ---------------------------------------------------------------- page */

export function HomeLobby({
  calendar,
  vetrina,
  training = null,
  nowMs: serverNow,
  today,
}: {
  calendar: PublicCalendar;
  vetrina?: Readonly<Record<VetrinaWorld, readonly VetrinaSlot[]>> | undefined;
  training?: PublicTrainingDay | null;
  nowMs: number;
  today: string;
}) {
  const nowMs = useMinuteClock(serverNow);
  const week = useMemo(() => weekBoardEvents(calendar.events, today), [calendar.events, today]);
  const slots = useMemo(() => {
    // One item per family, no mascot; no "dirette" promise on the public home (video stays private);
    // the games of the old "Gioca" block are reached from Servizi e club and the menu.
    const seen = new Set<string>();
    return (vetrina?.tutti ?? [])
      .filter((x) => {
        const fam = x.id.split("-")[0]!;
        if (x.id.startsWith("sky") || x.id.startsWith("dirette") || x.id.startsWith("crea") || seen.has(fam)) return false;
        seen.add(fam);
        return true;
      })
      .slice(0, 4);
  }, [vetrina]);
  return (
    <div data-testid="home-lobby">
      <WeekStrip events={week} groups={calendar.groups} nowMs={nowMs} />
      <ClubAffiliation />
      <div className={`${WRAP} grid grid-cols-[minmax(0,1fr)] gap-5 pt-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-6 lg:pt-6`}>
        <div className="grid min-w-0 gap-5 lg:gap-7">
          <WeekDays events={calendar.events} today={today} />
          <TodayOnPitch day={training} today={today} nowMs={nowMs} />
          <HomeSlides slots={slots} />
          <Services />
        </div>
        <MonthCard events={calendar.events} today={today} nowMs={nowMs} groups={calendar.groups} />
      </div>
      <div className={`${WRAP} pb-6 pt-5 lg:pb-10 lg:pt-7`}>
        <HomeBordoCampo day={today} />
      </div>
    </div>
  );
}
