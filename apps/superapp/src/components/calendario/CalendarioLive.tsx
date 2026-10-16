/**
 * Building blocks of the public "Partite" page (/calendario) in the SCD METAL "via di mezzo" design of the home
 * (Francesco 16/10/2026: «un colore uguale e un po più metallico… mettere in pista in modo definitivo», then the same
 * design on Partite): white cards with the silver top edge, match rows like "Oggi in campo" (big time, thin bar, team
 * and opponent, venue and pitch, a small pill on the right), the live pulse on the navy band, the followed-team chips.
 *
 * Colour with purpose (21:54 «cerca di mettere anche altri colori»): sole = home game, azzurro = away game, red = live
 * only (lib/calendario-layout.ts). Rules (AGENTS.md, Direzione 13/10/2026): our side is always the official club crest
 * + "ColicoDerviese <team>"; an opponent crest appears only when crestFor() returns a verified file (never drawn, never
 * invented); no score (the calendar has none); no minor named.
 */
import { Link } from "@tanstack/react-router";
import { ChevronDown, ChevronRight, MapPin, Star } from "lucide-react";
import { useEffect, useState } from "react";

import { ClubCrestOfficial } from "@/components/SiteChrome";
import { venueShort } from "@/components/home/HomeSections";
import { GroupResultsLink } from "@/components/scd/OfficialResults";
import { dateParts, groupShort } from "@/lib/board-data";
import { PLACE_STYLE, placeTone } from "@/lib/calendario-layout";
import { eventRank, matchClock, nextKickoff, liveGames, typePrefix } from "@/lib/calendario-live";
import { matchdayClass } from "@/lib/home-matchday";
import { crestFor, opponentLabel } from "@/lib/crests";
import { countdownParts } from "@/lib/home-board";
import { matchShare } from "@/lib/share-match";
import { ShareWhatsApp } from "@/components/scd/ShareWhatsApp";
import type { PublicEvent, PublicGroup } from "@/lib/public-snapshots";

/** White card with the thin metallic top edge (same as HomeLobby). */
export const CARD =
  "relative overflow-hidden rounded-[12px] border border-[#d6deeb] bg-white shadow-[0_6px_18px_-14px_rgb(20_38_77/0.55)] before:absolute before:inset-x-0 before:top-0 before:z-[1] before:h-[3px] before:bg-[linear-gradient(90deg,#8ea2c6,#ffffff_22%,#b8c5dd_50%,#ffffff_78%,#8ea2c6)] before:content-['']";
/** Small uppercase label of the design system. */
export const LABEL = "font-display text-[11px] font-bold uppercase tracking-[0.1em] lg:text-[12px]";
const LIVE_RED = "#c40018";
const PILL = "inline-flex items-center justify-center whitespace-nowrap rounded-[4px] px-1.5 py-[2px] font-display text-[10.5px] font-bold uppercase tracking-[0.06em]";

const fmt = (iso: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("it-IT", { timeZone: "UTC", ...o }).format(new Date(`${iso}T12:00:00Z`));

/** Our official crest and, only when the registry has the verified file, the opponent crest, stacked (home first). */
export function StackedCrests({ e, size = 34 }: { e: Pick<PublicEvent, "opponent" | "homeAway">; size?: number }) {
  const opp = e.opponent ? crestFor(e.opponent) : null;
  const them = opp?.src ? (
    <img
      src={opp.src}
      alt={`Stemma ${opp.label}`}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      className="relative shrink-0 rounded-full bg-white object-contain ring-2 ring-white"
      style={{ width: size, height: size }}
    />
  ) : null;
  const us = (
    <span className="relative grid shrink-0 place-items-center rounded-full bg-white ring-2 ring-white" style={{ width: size, height: size }}>
      <ClubCrestOfficial size={Math.round(size * 0.86)} />
    </span>
  );
  const awayFirst = e.homeAway === "FUORI";
  return (
    <span className="flex shrink-0 items-center" data-testid="stacked-crests">
      {awayFirst && them}
      <span className={awayFirst && them ? "-ml-2.5" : ""}>{us}</span>
      {!awayFirst && them && <span className="-ml-2.5">{them}</span>}
    </span>
  );
}

/* ------------------------------------------------------------------ rows */

/** "In casa" (sole) / "Trasferta" (azzurro) pill, or the red live minute. */
function PlacePill({ homeAway, live }: { homeAway: string; live: string | null }) {
  if (live)
    return (
      <span className={`${PILL} gap-1 bg-[#ffe3e6] text-[#b0001a]`} data-testid="row-live">
        <span aria-hidden="true" className="scd-live-dot size-1.5 rounded-full" style={{ background: LIVE_RED }} />
        {live}
      </span>
    );
  const s = PLACE_STYLE[placeTone(homeAway)];
  return <span className={`${PILL} ${s.pill}`}>{s.label}</span>;
}

export function GameRow({
  e,
  g,
  nowMs,
  open,
  toggle,
  followed,
  onFollow,
}: {
  e: PublicEvent;
  g: PublicGroup | undefined;
  nowMs: number;
  open: boolean;
  toggle: () => void;
  followed: boolean;
  onFollow: (id: string) => void;
}) {
  const clock = matchClock(e, nowMs);
  const live = clock.state === "live";
  const done = clock.state === "done";
  const certain = e.timeConfirmed && e.venueConfirmed;
  const tone = placeTone(e.homeAway);
  const home = tone === "casa";
  const team = groupShort(g, e.category);
  const prefix = typePrefix(e.type);
  const opp = opponentLabel(e.opponent);
  return (
    <li
      data-event-id={e.id}
      data-state={clock.state}
      data-place={tone}
      className={`relative border-t border-[#edf1f7] first:border-t-0 ${home && !done ? "bg-[linear-gradient(90deg,#fff8dc_0%,rgb(255_248_220/0)_55%)]" : ""}`}
    >
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className={`scd-focus flex w-full items-stretch gap-3 px-3 py-3 text-left lg:gap-4 lg:px-5 ${done ? "opacity-70" : ""}`}
      >
        <span className="grid w-[58px] shrink-0 content-start justify-items-start gap-1 font-display lg:w-[64px]">
          <span className={`text-[21px] font-bold leading-none tabular-nums lg:text-[23px] ${done ? "text-[#62728f]" : "text-[#14264d]"}`}>{e.time || "--:--"}</span>
          <PlacePill homeAway={e.homeAway} live={live ? clock.label : null} />
        </span>
        <span aria-hidden="true" className={`w-[4px] shrink-0 self-stretch rounded-full ${live ? "bg-[#c40018]" : PLACE_STYLE[tone].bar}`} />
        <span className="min-w-0 flex-1">
          {live && (
            <span className="mb-[2px] block font-display text-[11.5px] font-bold uppercase tracking-[0.06em]" style={{ color: LIVE_RED }}>
              In campo ora<span className="sr-only">, {clock.label} dal calcio d'inizio in calendario</span>
            </span>
          )}
          <span className="flex items-baseline gap-1.5">
            <span aria-hidden="true" className="size-[9px] shrink-0 translate-y-[-1px] rounded-full ring-2 ring-white" style={{ background: g?.color ?? "#8a9bb8" }} />
            <span className="min-w-0 break-words font-display text-[16px] leading-[1.2] text-[#14264d] lg:text-[17px]">
              {prefix && <span className="font-semibold text-[#0457af]">{prefix} · </span>}
              <span className="font-semibold text-[#52627f]">ColicoDerviese </span>
              <b className="font-bold">{team}</b>
            </span>
          </span>
          <span className="mt-0.5 block break-words text-[14px] font-semibold leading-snug text-[#14264d] lg:text-[15px]">
            <span className="font-normal text-[#62728f]">{home ? "con " : tone === "fuori" ? "a casa di " : "vs "}</span>
            {opp || "avversario da definire"}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[12.5px] leading-tight text-[#52627f] lg:text-[13px]">
            <span className="inline-flex min-w-0 items-start gap-1">
              <MapPin className="mt-[1px] size-[13px] shrink-0 text-[#0457af]" strokeWidth={2.4} aria-hidden="true" />
              <span className="min-w-0 break-words">{e.venue ? venueShort(e.venue) : "Sede da definire"}</span>
            </span>
            {done && <span className={`${PILL} bg-[#eef1f6] text-[#4a5a78]`}>Terminata</span>}
            {!certain && <span className={`${PILL} bg-[#fff3b0] text-[#5c4400]`}>da confermare</span>}
            {e.isVariation && <span className={`${PILL} border border-[#0457af] text-[#0457af]`}>Variazione</span>}
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end justify-between gap-2">
          <span className="hidden lg:block">
            <StackedCrests e={e} size={30} />
          </span>
          <ChevronDown className={`size-5 text-[#7a8aa8] transition-transform duration-200 motion-reduce:transition-none ${open ? "rotate-180" : ""}`} aria-hidden="true" />
        </span>
      </button>
      {open && (
        <div className="mx-3 mb-3 grid gap-1.5 rounded-[10px] border border-[#e3e9f3] bg-[#f5f8fc] px-3 py-3 text-[14px] text-[#14264d] lg:mx-5">
          <div>
            {fmt(e.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })} ·{" "}
            {e.time ? `${e.time}${certain ? "" : " (indicativo)"}` : "orario da definire"}
          </div>
          <div className="flex gap-1">
            <MapPin className="mt-1 size-4 shrink-0 text-[#0457af]" aria-hidden="true" />
            <span className="break-words">
              {e.venue || "Sede da definire"}
              {e.venueConfirmed ? "" : " (da confermare)"}
            </span>
          </div>
          <dl className="m-0 grid gap-1.5">
            <div>
              <dt className="inline text-[#52627f]">Categoria: </dt>
              <dd className="inline">
                {e.category}
                {e.round ? ` · giornata ${e.round}` : ""}
              </dd>
            </div>
            <div>
              <dt className="inline text-[#52627f]">Provenienza: </dt>
              <dd className="inline">
                {e.source || "Calendario SCD"} ·{" "}
                {e.status === "OFFICIAL_CALENDAR"
                  ? "calendario ufficiale"
                  : e.status === "CLUB_EVENT"
                    ? "evento organizzato dalla società (non certificato FIGC)"
                    : e.status}{" "}
                · fotografia non live
              </dd>
            </div>
          </dl>
          {e.facilityReview && <div className="font-semibold text-[#52627f]">Disponibilità impianto da verificare</div>}
          {e.notice.map((n) => (
            <div key={n} className="font-semibold">
              ⚠ {n}
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="lg:hidden">
              <StackedCrests e={e} size={30} />
            </span>
            {g && (
              <button
                type="button"
                onClick={() => onFollow(g.id)}
                aria-pressed={followed}
                className="scd-focus inline-flex min-h-11 items-center gap-1.5 rounded-full border border-[#d6deeb] bg-white px-3 text-[13.5px] font-bold text-[#14264d]"
              >
                <Star className="size-4" fill={followed ? "#ffd84a" : "none"} stroke={followed ? "#8a6d00" : "#14264d"} aria-hidden="true" />
                {followed ? `Segui già ColicoDerviese ${team}` : `Segui ColicoDerviese ${team}`}
              </button>
            )}
            <GroupResultsLink group={e.group} />
            {!done && (
              <ShareWhatsApp
                data={matchShare(
                  {
                    date: e.date,
                    time: e.time,
                    group: e.group,
                    opponent: opp,
                    homeAway: e.homeAway === "FUORI" ? "FUORI" : e.homeAway === "CASA" ? "CASA" : "",
                    place: e.venue ? venueShort(e.venue) : "",
                    pending: certain ? [] : ["Orario o campo da confermare"],
                  },
                  team,
                )}
                className="border border-[#d6deeb] bg-white"
              />
            )}
          </div>
        </div>
      )}
    </li>
  );
}

export type TrainingItem = {
  id: string;
  date: string;
  time: string;
  title: string;
  sub: string;
  teams?: string;
};

/** Members only: a training slot of the chosen annata, green bar (one tone per meaning), link to the board. */
export function TrainingRow({ r }: { r: TrainingItem }) {
  return (
    <li className="relative border-t border-[#edf1f7] first:border-t-0">
      <Link to="/allenamenti" className="scd-focus flex items-stretch gap-3 px-3 py-3 lg:gap-4 lg:px-5">
        <span className="grid w-[58px] shrink-0 content-start justify-items-start gap-1 font-display lg:w-[64px]">
          <span className="text-[21px] font-bold leading-none tabular-nums text-[#14264d] lg:text-[23px]">{r.time}</span>
          <span className={`${PILL} bg-[#e3f5ea] text-[#156b3a]`}>Allen.</span>
        </span>
        <span aria-hidden="true" className="w-[4px] shrink-0 self-stretch rounded-full bg-[#1f9d55]" />
        <span className="min-w-0 flex-1">
          <span className="block break-words font-display text-[16px] font-bold leading-[1.2] text-[#14264d]">{r.title}</span>
          <span className="mt-1 flex items-start gap-1 text-[12.5px] leading-tight text-[#52627f]">
            <MapPin className="mt-[1px] size-[13px] shrink-0 text-[#0457af]" strokeWidth={2.4} aria-hidden="true" />
            <span className="min-w-0">{r.sub}</span>
          </span>
          {r.teams && <span className="mt-[2px] block truncate text-[12px] text-[#62728f]">{r.teams}</span>}
        </span>
        <ChevronRight className="size-5 shrink-0 self-center text-[#0457af]" aria-hidden="true" />
      </Link>
    </li>
  );
}

/** Compact row of "Prossime gare" and "Le mie squadre": date block, tone bar, team and opponent, time · venue. */
export function NextMatchRow({ e, g, nowMs, testId }: { e: PublicEvent; g: PublicGroup | undefined; nowMs: number; testId?: string }) {
  const d = dateParts(e.date);
  const team = groupShort(g, e.category);
  const clock = matchClock(e, nowMs);
  const tone = placeTone(e.homeAway);
  const opp = opponentLabel(e.opponent);
  return (
    <li className="border-t border-[#edf1f7] first:border-t-0" data-testid={testId}>
      <Link
        to="/calendario"
        search={{ annata: g ? (g.years[0] ?? g.id) : undefined, vista: "prossime" }}
        className="scd-focus flex items-stretch gap-3 px-3 py-2.5 hover:bg-[#f5f8fc]"
      >
        <span className="grid w-[40px] shrink-0 justify-items-center font-display leading-none text-[#14264d]">
          <span className="text-[11px] font-bold uppercase text-[#62728f]">{d.weekday}</span>
          <span className="text-[22px] font-bold">{d.day}</span>
          <span className="text-[11px] font-bold uppercase text-[#62728f]">{d.month}</span>
        </span>
        <span aria-hidden="true" className={`w-[3px] shrink-0 self-stretch rounded-full ${clock.state === "live" ? "bg-[#c40018]" : PLACE_STYLE[tone].bar}`} />
        <span className="min-w-0 flex-1">
          <span className="block font-display text-[15px] font-bold leading-[1.2] text-[#14264d]">
            {team}
            <span className="font-normal text-[#62728f]"> {tone === "casa" ? "con" : tone === "fuori" ? "a casa di" : "vs"} </span>
            {opp || "avversario da definire"}
          </span>
          <span className="mt-0.5 block text-[12.5px] leading-tight text-[#52627f]">
            {clock.state === "live" ? <b style={{ color: LIVE_RED }}>In campo · {clock.label} · </b> : e.time ? <b className="text-[#14264d]">{e.time} · </b> : null}
            {tone === "fuori" ? "Trasferta · " : ""}
            {e.venue ? venueShort(e.venue) : "Sede da definire"}
          </span>
        </span>
        <ChevronRight className="size-5 shrink-0 self-center text-[#7a8aa8]" aria-hidden="true" />
      </Link>
    </li>
  );
}

/* ------------------------------------------------------------------ live banner */

/**
 * Pulse on the navy band: red "In campo ora" with the minute while a game is being played (from the calendar
 * kick-off), otherwise the countdown to the next kick-off. Seconds tick only on the device, after hydration.
 */
export function LiveBanner({ events, groups, nowMs }: { events: readonly PublicEvent[]; groups: readonly PublicGroup[]; nowMs: number }) {
  const [now, setNow] = useState(nowMs);
  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const live = liveGames(events, now);
  const team = (e: PublicEvent) =>
    groupShort(
      groups.find((g) => g.id === e.group),
      e.category,
    );
  if (live.length) {
    const first = live[0]!;
    const clock = matchClock(first, now);
    return (
      <p
        className="m-0 inline-flex w-fit max-w-full flex-wrap items-center gap-x-2 gap-y-1 rounded-[8px] px-3 py-1.5 font-display text-[14px] font-bold text-white shadow-[0_6px_18px_-8px_rgb(0_0_0/0.6)]"
        style={{ background: LIVE_RED }}
        data-testid="cal-live-banner"
        role="status"
      >
        <span className="scd-live-dot size-2 rounded-full bg-white" aria-hidden="true" />
        <span className="uppercase tracking-[0.06em]">In campo ora</span>
        <span className="min-w-0 truncate font-semibold">
          ColicoDerviese {team(first)} · {opponentLabel(first.opponent) || "avversario da definire"}
        </span>
        <span className="text-[19px] leading-none tabular-nums">{clock.label}</span>
        {live.length > 1 && (
          <span className="font-semibold">
            +{live.length - 1} {live.length === 2 ? "altra" : "altre"}
          </span>
        )}
      </p>
    );
  }
  const next = nextKickoff(events, now, (e) => eventRank(e, (g) => matchdayClass(g) === "agonistica"));
  if (!next) return null;
  const left = countdownParts(next.startMs - now);
  const d = dateParts(next.e.date);
  return (
    <p
      className="m-0 inline-flex w-fit max-w-full flex-wrap items-center gap-x-2 gap-y-0.5 rounded-[8px] border border-white/15 bg-white/[0.07] px-3 py-1.5 font-display text-[13.5px] text-[#dfe7f7]"
      data-testid="cal-countdown"
    >
      <span className="size-2 rounded-full bg-[#ffd84a]" aria-hidden="true" />
      <span>
        <span className={`${LABEL} mr-1.5 text-[#ffd84a]`}>Prossima gara</span>
        {team(next.e)} · {d.weekday} {d.day} {d.month}
      </span>
      <span className="text-[19px] font-bold leading-none tabular-nums text-white" aria-hidden="true">
        {left.days > 0 ? `${left.days}g ` : ""}
        {left.hh}:{left.mm}:
        <span key={left.ss} className="scd-tick">
          {left.ss}
        </span>
      </span>
      <span className="sr-only">
        tra {left.days} giorni e {Number(left.hh)} ore
      </span>
    </p>
  );
}

/* ------------------------------------------------------------------ followed teams */

export function TeamChips({
  groups,
  followed,
  selectedId,
  label,
  onPick,
  onFollow,
}: {
  groups: readonly PublicGroup[];
  followed: readonly string[];
  selectedId: string | null;
  label: (g: PublicGroup) => string;
  onPick: (g: PublicGroup | undefined) => void;
  onFollow: (id: string) => void;
}) {
  const chip = (on: boolean) => (on ? "scd-band border-[#13254d] text-white" : "border-[#d6deeb] bg-white text-[#14264d] hover:border-[#0457af]");
  return (
    <div
      className="scd-scroll-x -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 pt-0.5 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0"
      role="group"
      aria-label="Squadre: tocca per filtrare, stella per seguire"
      data-testid="cal-team-chips"
    >
      <button
        type="button"
        aria-pressed={!selectedId}
        onClick={() => onPick(undefined)}
        className={`scd-focus flex h-11 shrink-0 items-center rounded-full border px-4 font-display text-[14px] font-semibold ${chip(!selectedId)}`}
      >
        Tutte
      </button>
      {groups.map((g) => {
        const on = selectedId === g.id;
        const mine = followed.includes(g.id);
        return (
          <span key={g.id} className={`flex h-11 shrink-0 items-center rounded-full border ${chip(on)}`}>
            <button
              type="button"
              onClick={() => onFollow(g.id)}
              aria-pressed={mine}
              aria-label={mine ? `Non seguire più ${g.label}` : `Segui ${g.label}`}
              className="scd-focus grid size-11 place-items-center rounded-full"
            >
              <Star className="size-[17px]" fill={mine ? "#ffd84a" : "none"} stroke={mine ? (on ? "#ffd84a" : "#8a6d00") : on ? "#fff" : "#62728f"} strokeWidth={2.2} aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-pressed={on}
              onClick={() => onPick(on ? undefined : g)}
              className="scd-focus -ml-1.5 flex h-11 items-center gap-1.5 rounded-full pr-4 font-display text-[14px] font-semibold"
            >
              <span className="size-[9px] shrink-0 rounded-full ring-2 ring-white" style={{ background: g.color }} aria-hidden="true" />
              <span className="whitespace-nowrap">{label(g)}</span>
            </button>
          </span>
        );
      })}
    </div>
  );
}
