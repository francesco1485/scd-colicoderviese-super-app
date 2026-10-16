/**
 * Public home of the Super App (Francesco 16/10/2026 07:05 «sembra una accozzaglia di cose, io non capisco nulla»):
 * few blocks, one idea each, always in the same order and each with its own title, so anyone understands at a glance.
 *   1. Il club — lake cover, crest, name, one sentence, ONE big "Iscriviti" (Accedi as a small link). The three
 *      official marks live in the top bar (SiteChrome HeaderCredentials, 07:07).
 *   0. A slim bar on top: the next games scroll, Calendario and Allenamenti fixed on it (07:10: no big calendar).
 *      On the cover, the live countdown to the next home game.
 *   2. "Stasera al campo" — trainings of every team at Colico (time, pitch), Club House open, minibus zones (UD-140).
 *   2b. "In che anno sei nato?" — tap a birth year, see the team, its championship and next game, "Seguila: iscriviti".
 *   3. Dal club — three items of the day's palinsesto (lib/vetrina), static, never a carousel.
 * Data: public calendar; training timetable only (UD-140, no names or rosters); opponent crests only from the verified registry; birth years only
 * when the master declares them. No minor named, no mascot, no aerial photo of the pitch.
 */
import { Link } from "@tanstack/react-router";
import { ArrowRight, Bus, CalendarDays, Coffee, Dumbbell, Lock, UserPlus } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { loginSearch } from "@/components/scd/AccessMenu";

import { ClubCrestOfficial } from "@/components/SiteChrome";
import { useMinuteClock } from "@/lib/use-minute-clock";
import { venueShort } from "@/components/home/HomeSections";
import { groupShort } from "@/lib/board-data";
import type { getPublicCalendarSnapshot } from "@/lib/calendar.functions";
import { matchClock } from "@/lib/calendario-live";
import { crestFor } from "@/lib/crests";
import { homeTown } from "@/lib/home-matchday";
import { weekBoardEvents, weekGroups } from "@/lib/home-week-board";
import type { PublicEvent, PublicGroup } from "@/lib/public-snapshots";
import { CLUB_HOUSE_HOURS, PULMINO_ZONES, type PublicTrainingDay } from "@/lib/public-training";
import type { VetrinaSlot, VetrinaWorld } from "@/lib/vetrina";

type PublicCalendar = Awaited<ReturnType<typeof getPublicCalendarSnapshot>>;

const WRAP = "mx-auto w-full max-w-[1240px] px-4 lg:px-8";
const PANEL = "rounded-[16px] border border-[#e3eaf4] bg-white shadow-[0_10px_26px_-20px_rgb(11_42_91/0.35)]";
const KIT_FULL = "/media/kit/kit-2026-27-blu.webp";



/** "Nati 2012–2013" / "Nati 2014", only from years declared by the master. */
export function birthYears(g: Pick<PublicGroup, "years"> | undefined): string {
  const ys = [...(g?.years ?? [])].sort();
  if (ys.length === 0) return "";
  return ys.length === 1 ? `Nati ${ys[0]}` : `Nati ${ys[0]}–${ys[ys.length - 1]}`;
}

function Heading({ id, children, action, sub }: { id: string; children: ReactNode; action?: ReactNode; sub?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3 pb-3">
      <div className="min-w-0">
        <h2 id={id} className="m-0 font-title text-[24px] font-black uppercase leading-none tracking-[0.02em] text-[#0b1e3a] lg:text-[30px]">
          {children}
        </h2>
        {sub && <p className="m-0 mt-1 text-[13.5px] font-semibold text-[#4a5d7a]">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

/* ------------------------------------------------------------ 1. il club */

/** Official photo of the lake and the mountains (top crop of the club photo: no pitch, no people). */
const COVER = "/media/scd/lario-header.webp";

function ClubProfile({ events, groups, nowMs }: { events: readonly PublicEvent[]; groups: readonly PublicGroup[]; nowMs: number }) {
  const next = nextHome(events, nowMs);
  const ng = next ? groups.find((g) => g.id === next.e.group) : undefined;
  return (
    <section aria-labelledby="home-profile-t" className={`${PANEL} overflow-hidden`} data-testid="home-profile">
      <div className="relative h-[150px] overflow-hidden bg-[#1d5fd0] lg:h-[210px]">
        <img src={COVER} alt="Il lago di Como e le montagne dell'Alto Lario visti da Colico" decoding="async" fetchPriority="high" className="absolute inset-0 size-full object-cover object-[50%_40%]" />
        <span aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,rgb(11_42_91/0.1),rgb(11_42_91/0.7))]" />
        {next && (
          <Link
            to="/calendario"
            search={{ annata: next.e.group, vista: "settimana" }}
            className="scd-focus absolute right-3 top-3 grid max-w-[64%] gap-0.5 rounded-[12px] bg-white/95 px-3 py-2 text-left text-[#0b1e3a] shadow-[0_6px_16px_-8px_rgb(0_0_0/0.5)] backdrop-blur"
            data-testid="home-countdown"
          >
            <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-[0.06em] text-[#1556c4]">
              <span aria-hidden="true" className="scd-live-dot size-1.5 rounded-full bg-[#e11d2e]" />
              Prossima gara in casa
            </span>
            <span className="font-uv text-[22px] leading-none">{countdownLabel(next.at - nowMs)}</span>
            <span className="truncate text-[12px] font-semibold text-[#4a5d7a]">
              {groupShort(ng, next.e.category)}
              {next.e.venue ? ` · ${venueShort(next.e.venue)}` : ""}
            </span>
          </Link>
        )}
      </div>
      <div className="relative grid justify-items-center px-4 pb-5 text-center">
        <span className="-mt-12 grid size-[96px] place-items-center rounded-full bg-white shadow-[0_6px_18px_-8px_rgb(11_42_91/0.5)] ring-4 ring-white">
          <ClubCrestOfficial size={74} />
        </span>
        <h2 id="home-profile-t" className="m-0 mt-2 font-uv text-[34px] uppercase leading-none text-[#0b1e3a] lg:text-[42px]">
          S.C.D. ColicoDerviese
        </h2>
        <p className="m-0 mt-1.5 max-w-[42ch] text-[15px] leading-snug text-[#23406e]">
          Il calcio di Colico e Dervio, sull'Alto Lario: prima squadra, settore giovanile e scuola calcio.
        </p>
        <Link
          to="/registrati"
          className="scd-focus mt-4 inline-flex min-h-12 w-full max-w-[360px] items-center justify-center gap-2 rounded-[12px] bg-[#ffd600] text-[16px] font-extrabold text-[#061a3d] shadow-[0_8px_18px_-10px_rgb(180_140_0/0.8)] hover:brightness-95"
          data-testid="home-join"
        >
          <UserPlus className="size-5" aria-hidden="true" />
          Iscriviti gratis
        </Link>
        <p className="m-0 mt-2 text-[14px] text-[#4a5d7a]">
          Hai già un account?{" "}
          <Link to="/accedi" className="scd-focus inline-flex min-h-11 items-center rounded-md font-bold text-[#1556c4] underline-offset-2 hover:underline">
            Accedi
          </Link>
        </p>
      </div>
    </section>
  );
}

/* ---------------------------------------------------- 0. barra delle gare */

const WD3 = ["DOM", "LUN", "MAR", "MER", "GIO", "VEN", "SAB"] as const;

/**
 * Slim bar at the very top (Francesco 16/10 07:10 «fai una barra sopra e fai girare, poi link calendario e allenamenti
 * sulla barra»): the next games scroll (pause on hover, focus and tap; still with reduced motion), Calendario and
 * Allenamenti fixed on the right. Allenamenti are for members: the link opens the access screen first.
 */
function GamesBar({ events, groups }: { events: readonly PublicEvent[]; groups: readonly PublicGroup[] }) {
  const [paused, setPaused] = useState(false);
  const groupOf = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups]);
  const items = events.map((e) => {
    const g = groupOf.get(e.group);
    const d = new Date(`${e.date}T12:00:00Z`);
    const opp = e.opponent ? crestFor(e.opponent).label : "avversario da definire";
    return { e, g, when: `${WD3[d.getUTCDay()]} ${d.getUTCDate()} · ${e.time || "--:--"}`, text: `${groupShort(g, e.category)} ${e.homeAway === "CASA" ? "vs" : "@"} ${opp}` };
  });
  const row = (dup: boolean) =>
    items.map(({ e, g, when, text }) => (
      <li key={`${dup ? "d" : "o"}-${e.id}`} className={dup ? "scd-ticker-dup" : undefined} aria-hidden={dup || undefined}>
        <Link
          to="/calendario"
          search={{ annata: e.group, vista: "settimana" }}
          tabIndex={dup ? -1 : undefined}
          className="scd-focus inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-md px-3 text-[13px] text-[#23406e] hover:text-[#0b1e3a]"
        >
          <span aria-hidden="true" className="size-2 rounded-full" style={{ background: g?.color ?? "#668196" }} />
          <span className="font-extrabold tabular-nums text-[#1556c4]">{when}</span>
          <span className="font-semibold">{text}</span>
          {e.homeAway === "CASA" && <span className="rounded-[4px] bg-[#ffd600] px-1 text-[10px] font-extrabold uppercase text-[#061a3d]">Casa</span>}
        </Link>
      </li>
    ));
  const link = "scd-focus inline-flex min-h-11 flex-col items-center justify-center gap-0 px-2 text-[10.5px] leading-tight lg:flex-row lg:gap-1 font-extrabold text-[#0b2a5b] hover:bg-[#eef3f9] lg:px-3.5 lg:text-[13.5px]";
  return (
    <section aria-label="Prossime gare" className={`${PANEL} flex items-stretch overflow-hidden`} data-testid="home-ticker">
      <div
        className="scd-ticker min-w-0 flex-1 overflow-hidden"
        data-paused={paused}
        onPointerDown={() => setPaused((p) => !p)}
        style={{ ["--ticker-s" as string]: `${Math.max(20, items.length * 6)}s` }}
      >
        {items.length > 0 ? (
          <ul className="scd-ticker-track m-0 flex w-max list-none p-0">
            {row(false)}
            {row(true)}
          </ul>
        ) : (
          <p className="m-0 flex min-h-11 items-center px-3 text-[13px] font-semibold text-[#4a5d7a]">Nessuna gara nei prossimi 7 giorni</p>
        )}
      </div>
      <nav aria-label="Calendario e allenamenti" className="flex shrink-0 divide-x divide-[#e3eaf4] border-l border-[#e3eaf4] bg-white">
        <Link to="/calendario" className={link} data-testid="bar-calendario">
          <CalendarDays className="size-4" aria-hidden="true" />
          <span>Calendario</span>
        </Link>
        <Link to="/accedi" search={loginSearch("/allenamenti")} className={link} aria-label="Allenamenti: per i soci, accedi" data-testid="bar-allenamenti">
          <Dumbbell className="size-4" aria-hidden="true" />
          <span>Allenamenti</span>
          <Lock className="hidden size-3 opacity-60 lg:block" aria-hidden="true" />
        </Link>
      </nav>
    </section>
  );
}

/* ------------------------------------------- conto alla rovescia in casa */

/** Rome wall-clock date + time → epoch ms (DST-safe through Intl). */
function romeMs(date: string, time: string): number {
  const guess = Date.parse(`${date}T${time}:00Z`);
  const off = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Rome", timeZoneName: "shortOffset" })
    .formatToParts(new Date(guess))
    .find((x) => x.type === "timeZoneName")?.value.match(/GMT([+-]\d+)/)?.[1];
  return guess - Number(off ?? 1) * 3_600_000;
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

/** Next home game with a confirmed time, from the public calendar. */
function nextHome(events: readonly PublicEvent[], nowMs: number): { e: PublicEvent; at: number } | null {
  let best: { e: PublicEvent; at: number } | null = null;
  for (const e of events) {
    if (e.homeAway !== "CASA" || !e.time) continue;
    const at = romeMs(e.date, e.time);
    if (at > nowMs && (!best || at < best.at)) best = { e, at };
  }
  return best;
}

/* ------------------------------------------------ stasera al campo */

const WD_LONG = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"] as const;

/**
 * "Stasera al campo" (Francesco 16/10 07:18 «rendere viva e accattivante anche la parte allenamenti… club house aperta e
 * servizio pulmino»; UD-140): the training evening of every team at Colico with time and pitch, the Club House open
 * Mon–Fri 17:00–21:00, the minibus service with its four zones. Timetable only; the coach's notice wins.
 */
function TrainingEvening({ day, today }: { day: PublicTrainingDay | null; today: string }) {
  if (!day || day.rows.length === 0) return null;
  const isToday = day.date === today;
  const wd = WD_LONG[new Date(`${day.date}T12:00:00Z`).getUTCDay()]!;
  const teams = new Set(day.rows.map((r) => r.teams)).size;
  return (
    <section aria-labelledby="home-training-t" className={`${PANEL} overflow-hidden`} data-testid="home-training">
      <div className="relative bg-[linear-gradient(120deg,#2b8be8,#1556c4)] px-4 pb-4 pt-4 text-white lg:px-6">
        <span aria-hidden="true" className="absolute inset-x-0 top-1/2 h-px bg-white/15" />
        <span aria-hidden="true" className="absolute left-1/2 top-1/2 size-[120px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/15" />
        <p className="relative m-0 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[12px] font-extrabold uppercase tracking-[0.06em]">
          <span aria-hidden="true" className="scd-live-dot size-1.5 rounded-full bg-[#ffd600]" />
          Porte aperte
        </p>
        <h2 id="home-training-t" className="relative m-0 mt-2 font-uv text-[34px] uppercase leading-[0.92] lg:text-[42px]">
          {isToday ? "Stasera al campo" : `${wd} al campo`}
        </h2>
        <p className="relative m-0 mt-1 text-[14.5px] text-white/85">
          {teams === 1 ? "1 squadra" : `${teams} squadre`} in allenamento al centro sportivo di Colico. Vieni a vederci.
        </p>
      </div>
      <ol className="m-0 list-none divide-y divide-[#eef2f8] p-0">
        {day.rows.map((r) => (
          <li key={r.id} className="grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 lg:px-6">
            <span className="font-uv text-[22px] leading-none tabular-nums text-[#0b1e3a]">{r.time}</span>
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-extrabold text-[#0b1e3a]">{r.teams}</span>
              {r.end && <span className="block text-[12.5px] font-semibold text-[#4a5d7a]">fino alle {r.end}</span>}
            </span>
            <span className="rounded-[6px] bg-[#e8f0fd] px-2 py-1 text-[12px] font-extrabold text-[#0b3a8c]">{r.field}</span>
          </li>
        ))}
      </ol>
      <p className="m-0 px-4 pb-1 text-[12px] text-[#5a6b85] lg:px-6">Orari della settimana tipo: fa fede l'avviso del mister.</p>
      <div className="grid gap-3 p-4 lg:grid-cols-2 lg:px-6 lg:pb-6">
        <div className="flex items-start gap-3 rounded-[14px] bg-[#fff7cc] p-3.5" data-testid="home-clubhouse">
          <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-[12px] bg-[#ffd600] text-[#061a3d]">
            <Coffee className="size-[22px]" />
          </span>
          <span className="min-w-0">
            <span className="block text-[15.5px] font-extrabold text-[#0b1e3a]">Club House aperta</span>
            <span className="block text-[13.5px] font-semibold text-[#5c4a00]">
              {CLUB_HOUSE_HOURS.days} · {CLUB_HOUSE_HOURS.from}–{CLUB_HOUSE_HOURS.to}
            </span>
            <span className="mt-0.5 block text-[13px] leading-snug text-[#4a5d7a]">Guarda l'allenamento e fermati con gli altri genitori.</span>
          </span>
        </div>
        <div className="grid gap-2.5 rounded-[14px] bg-[#eef3fb] p-3.5" data-testid="home-pulmino">
          <div className="flex items-start gap-3">
            <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-[12px] bg-[#1556c4] text-white">
              <Bus className="size-[22px]" />
            </span>
            <span className="min-w-0">
              <span className="block text-[15.5px] font-extrabold text-[#0b1e3a]">Servizio pulmino</span>
              <span className="block text-[13px] leading-snug text-[#4a5d7a]">Agli allenamenti con i pulmini del club da quattro zone.</span>
            </span>
          </div>
          <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0" aria-label="Zone servite dai pulmini">
            {PULMINO_ZONES.map((z, i) => (
              <li key={z.id} className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-white px-3 text-[13px] font-bold text-[#23406e] ring-1 ring-[#d6e2f3]">
                <span aria-hidden="true" className="grid size-5 place-items-center rounded-full bg-[#1556c4] text-[11px] font-extrabold text-white">{i + 1}</span>
                {z.label}
              </li>
            ))}
          </ul>
          <Link to="/registrati" className="scd-focus inline-flex min-h-11 items-center justify-center gap-1.5 rounded-[10px] bg-[#0b2a5b] text-[14px] font-bold text-white hover:bg-[#123a78]">
            Richiedi il posto
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------- 2. in che anno sei nato? */

interface YearTeam {
  key: string;
  g: PublicGroup;
  champ: string;
  next: PublicEvent | undefined;
}

/**
 * The game of the home (07:10 «renditi creativo, virale e geniale»): "In che anno sei nato?". A parent, a grandparent
 * or a kid taps the birth year and sees at once the team, its championship and the next game, then "Iscriviti per
 * seguirla". Years only from the master (group.years); the Prima squadra is "Adulti". Nobody is named.
 */
function YearFinder({ calendar, today }: { calendar: PublicCalendar; today: string }) {
  const teams = useMemo(() => {
    const out: YearTeam[] = [];
    for (const g of calendar.groups) {
      if (g.id === "other") continue;
      const mine = calendar.events.filter((e) => e.group === g.id);
      if (mine.length === 0) continue;
      const champ = mine.find((e) => e.type === "CAMPIONATO")?.category ?? mine[0]?.category ?? "";
      const next = mine.filter((e) => e.date >= today).sort((a, b) => (a.date + (a.time || "99")).localeCompare(b.date + (b.time || "99")))[0];
      const ys = [...(g.years ?? [])].sort();
      if (ys.length === 0) {
        if (g.id === "prima") out.push({ key: "Adulti", g, champ, next });
        continue;
      }
      for (const y of ys) out.push({ key: String(y), g, champ, next });
    }
    return out.sort((a, b) => (a.key === "Adulti" ? -1 : b.key === "Adulti" ? 1 : Number(a.key) - Number(b.key)));
  }, [calendar, today]);
  const [pick, setPick] = useState<string | null>(null);
  if (teams.length === 0) return null;
  const chosen = pick ? teams.filter((t) => t.key === pick) : [];
  const fmt = (iso: string) => new Intl.DateTimeFormat("it-IT", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" }).format(new Date(`${iso}T12:00:00Z`));
  return (
    <section aria-labelledby="home-year-t" className="overflow-hidden rounded-[20px] bg-[linear-gradient(150deg,#1d5fd0,#0b3a8c)] p-4 text-white shadow-[0_16px_34px_-20px_rgb(11_42_91/0.8)] lg:p-6" data-testid="home-years">
      <h2 id="home-year-t" className="m-0 font-uv text-[34px] uppercase leading-[0.92] lg:text-[44px]">
        In che anno
        <br />
        sei nato?
      </h2>
      <p className="m-0 mt-1.5 text-[14.5px] leading-snug text-white/85">Tocca il tuo anno o quello di tuo figlio: ti diciamo in che squadra gioca e quando scende in campo.</p>
      <div className="-mx-4 mt-3 overflow-x-auto px-4 lg:mx-0 lg:px-0">
        <ul className="m-0 flex w-max list-none gap-2 p-0 pb-1 lg:w-auto lg:flex-wrap" role="list">
          {teams.map((t) => {
            const on = t.key === pick;
            return (
              <li key={`${t.key}-${t.g.id}`}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => setPick(on ? null : t.key)}
                  className={`scd-focus min-h-12 min-w-[64px] rounded-[12px] px-3 font-uv text-[22px] leading-none transition-colors ${on ? "bg-[#ffd600] text-[#061a3d]" : "bg-white/12 text-white ring-1 ring-white/25 hover:bg-white/20"}`}
                >
                  {t.key}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <div aria-live="polite" className="mt-3">
        {chosen.length > 0 &&
          chosen.map(({ g, champ, next }) => (
            <div key={g.id} className="mt-2 grid gap-2 rounded-[16px] bg-white p-4 text-[#0b1e3a]" data-testid="home-year-card">
              <div className="flex items-center gap-3">
                <span aria-hidden="true" className="h-10 w-[5px] rounded-full" style={{ background: g.color }} />
                <span className="min-w-0">
                  <span className="block font-uv text-[26px] uppercase leading-none">{groupShort(g, g.label)}</span>
                  <span className="block text-[13.5px] font-semibold text-[#4a5d7a]">
                    {birthYears(g) || "Prima squadra"}
                    {champ ? ` · ${champ}` : ""}
                  </span>
                </span>
              </div>
              <p className="m-0 rounded-[10px] bg-[#f3f6fb] px-3 py-2.5 text-[14.5px] leading-snug">
                {next ? (
                  <>
                    <strong>Prossima gara:</strong> {fmt(next.date)}
                    {next.time ? ` alle ${next.time}` : ""}, {next.homeAway === "CASA" ? "in casa" : "in trasferta"}
                    {next.opponent ? ` contro ${crestFor(next.opponent).label}` : ""}
                    {next.venue ? ` · ${venueShort(next.venue)}` : ""}
                  </>
                ) : (
                  "Nessuna gara in programma per ora."
                )}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Link to="/registrati" className="scd-focus inline-flex min-h-11 items-center justify-center gap-1.5 rounded-[10px] bg-[#ffd600] text-[14px] font-extrabold text-[#061a3d] hover:brightness-95">
                  <UserPlus className="size-4" aria-hidden="true" />
                  Seguila: iscriviti
                </Link>
                <Link to="/calendario" search={{ annata: g.id }} className="scd-focus inline-flex min-h-11 items-center justify-center gap-1.5 rounded-[10px] bg-[#0b2a5b] text-[14px] font-bold text-white hover:bg-[#123a78]">
                  Tutte le gare
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          ))}
      </div>
    </section>
  );
}
/* ------------------------------------------------------------ 4. dal club */

/** Visual of a palinsesto item as a post image (the kit uses the official render, never the supplier price list). */
function PostMedia({ s }: { s: VetrinaSlot }) {
  const v = s.id === "kit-2026-27" ? { kind: "image" as const, src: KIT_FULL, alt: "Kit ufficiale ColicoDerviese 2026/27", fit: "contain" as const, position: "center" } : s.visual;
  if (v.kind === "image")
    return (
      <span className={`relative block aspect-[4/5] max-h-[460px] w-full overflow-hidden ${v.fit === "contain" ? "bg-[linear-gradient(160deg,#eef4ff,#d8e6ff)]" : "bg-[#0b2a5b]"}`}>
        <img src={v.src} alt={v.alt} loading="lazy" decoding="async" className={`size-full ${v.fit === "contain" ? "object-contain p-4" : "object-cover"}`} style={{ objectPosition: v.position ?? "center" }} />
      </span>
    );
  if (v.kind === "portrait")
    return (
      <span className="grid aspect-[16/9] w-full place-items-center bg-[linear-gradient(150deg,#3b82f6,#1556c4)]">
        <img src={v.src} alt={v.alt} loading="lazy" decoding="async" className="size-[110px] rounded-full object-cover ring-4 ring-white/70" />
      </span>
    );
  return (
    <span aria-hidden="true" className="relative grid aspect-[16/9] w-full content-end overflow-hidden bg-[linear-gradient(150deg,#3b82f6,#0f45a6)] p-4">
      <span className="absolute -right-2 -top-3 font-uv text-[150px] leading-none text-white/15">{v.big}</span>
      <img src="/media/brand/tex/brush-yellow.svg" alt="" className="absolute -left-6 bottom-3 w-[70%] opacity-90" />
      <span className="relative max-w-[85%] font-uv text-[38px] uppercase leading-[0.9] text-white [text-shadow:0_2px_0_rgb(6_26_61/0.35)]">{s.title}</span>
    </span>
  );
}


function News({ slots }: { slots: readonly VetrinaSlot[] }) {
  if (slots.length === 0) return null;
  return (
    <section aria-labelledby="home-news-t" data-testid="home-news">
      <Heading id="home-news-t" sub="Tornei, iniziative e novità: cambiano ogni giorno">
        Dal club
      </Heading>
      <ul className="m-0 grid list-none gap-4 p-0 lg:grid-cols-3">
        {slots.map((s) => (
          <li key={s.id}>
            <Link
              to={s.href as never}
              search={s.search as never}
              {...(s.hash ? { hash: s.hash } : {})}
              className={`${PANEL} scd-focus grid h-full overflow-hidden hover:border-[#1556c4]`}
              data-slot={s.id}
            >
              <PostMedia s={s} />
              <span className="grid gap-1 p-4">
                <span className="text-[12px] font-extrabold uppercase tracking-[0.06em] text-[#1556c4]">{s.kicker}</span>
                <span className="text-[17px] font-extrabold leading-tight text-[#0b1e3a]">{s.title}</span>
                <span className="line-clamp-3 text-[14px] leading-snug text-[#4a5d7a]">{s.text}</span>
                <span className="mt-1 inline-flex items-center gap-1 text-[14px] font-bold text-[#1556c4]">
                  {s.cta}
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
  // No mascot on the home: the Sky slot stays for the LED wall and the scuola calcio page.
  const slots = useMemo(() => {
    // One item per family (the two Christmas Lario Cup posters count once), no mascot.
    const seen = new Set<string>();
    return (vetrina?.tutti ?? []).filter((x) => {
      const fam = x.id.split("-")[0]!;
      // Pixellot stays private by default (manifest): no "dirette" promise on the public home.
      if (x.id.startsWith("sky") || x.id.startsWith("dirette") || seen.has(fam)) return false;
      seen.add(fam);
      return true;
    }).slice(0, 3);
  }, [vetrina]);
  return (
    <div className={`${WRAP} grid grid-cols-[minmax(0,1fr)] gap-6 pt-3 lg:max-w-[980px] lg:gap-8 lg:pt-5`} data-testid="home-lobby">
      <GamesBar events={week} groups={calendar.groups} />
      <ClubProfile events={calendar.events} groups={calendar.groups} nowMs={nowMs} />
      <TrainingEvening day={training} today={today} />
      <YearFinder calendar={calendar} today={today} />
      <News slots={slots} />
    </div>
  );
}
