/**
 * Building blocks of the public "Calendario live" page (board VR-009, screen 2): white rows with the coloured left
 * bar, the date block, the round type icon, bold title and place line; the "Prossime gare" rows with the big date
 * block; the live banner (red "In campo ora" with the minute, otherwise the countdown to the next kick-off); the
 * followed-team chips with the star.
 *
 * Rules (AGENTS.md, Direzione 13/10/2026): our side is always the official club crest + "ColicoDerviese <team>";
 * an opponent crest appears only when crestFor() returns a verified file (never a drawn shield, never invented);
 * no score (the calendar has none); no minor named. Palette of the home: navy #0b2a5b, blue #1556c4,
 * light #eef3f9, white, yellow #ffd600; red only for "live".
 */
import { Link } from "@tanstack/react-router";
import { ChevronRight, Clock3, MapPin, Star } from "lucide-react";
import { useEffect, useState } from "react";

import { ClubCrestOfficial } from "@/components/SiteChrome";
import { venueShort } from "@/components/home/HomeSections";
import { GroupResultsLink } from "@/components/scd/OfficialResults";
import { dateParts, groupShort, matchTitle } from "@/lib/board-data";
import {
  eventRank,
  gameIcon,
  matchClock,
  nextKickoff,
  liveGames,
  typePrefix,
} from "@/lib/calendario-live";
import { matchdayClass } from "@/lib/home-matchday";
import { crestFor, opponentLabel } from "@/lib/crests";
import { countdownParts } from "@/lib/home-board";
import { matchShare } from "@/lib/share-match";
import { ShareWhatsApp } from "@/components/scd/ShareWhatsApp";
import type { PublicEvent, PublicGroup } from "@/lib/public-snapshots";

export const CARD =
  "rounded-[16px] bg-white shadow-[0_1px_2px_rgb(11_42_91/0.06),0_10px_24px_-14px_rgb(11_42_91/0.35)]";
const LIVE_RED = "#c40018";

const fmt = (iso: string, o: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("it-IT", { timeZone: "UTC", ...o }).format(
    new Date(`${iso}T12:00:00Z`),
  );

/* ------------------------------------------------------------------ icons */

/** Round type icon of a row: ball = partita, trophy = coppa/torneo, cone = allenamento (members only). */
export function TypeIcon({
  kind,
  live = false,
}: {
  kind: "ball" | "trophy" | "cone";
  live?: boolean;
}) {
  const bg =
    kind === "cone"
      ? "bg-[#fff1e8]"
      : kind === "trophy"
        ? "bg-[#fff7cc]"
        : "bg-[#eef3f9]";
  return (
    <span
      aria-hidden="true"
      className={`relative grid size-10 shrink-0 place-items-center rounded-full ${bg} lg:size-11`}
    >
      {kind === "ball" && (
        <svg viewBox="0 0 32 32" className="size-7">
          <circle
            cx="16"
            cy="16"
            r="13"
            fill="#fff"
            stroke="#0b2a5b"
            strokeWidth="2"
          />
          <path d="m16 9.5 5.5 4-2 6.5h-7l-2-6.5z" fill="#0b2a5b" />
          <path
            d="M16 9.5V3.5M21.5 13.5l5.5-2M19.5 20l3.5 5M12.5 20 9 25M10.5 13.5l-5.5-2"
            stroke="#0b2a5b"
            strokeWidth="1.6"
          />
        </svg>
      )}
      {kind === "trophy" && (
        <svg viewBox="0 0 32 32" className="size-7">
          <path
            d="M10 5h12v6a6 6 0 0 1-12 0z"
            fill="#ffd600"
            stroke="#0b2a5b"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M10 8H6a4 4 0 0 0 4 5M22 8h4a4 4 0 0 1-4 5"
            fill="none"
            stroke="#0b2a5b"
            strokeWidth="2"
          />
          <path
            d="M16 17v5M11 27h10M12.5 22h7l1 5h-9z"
            fill="#0b2a5b"
            stroke="#0b2a5b"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      )}
      {kind === "cone" && (
        <svg viewBox="0 0 32 32" className="size-7">
          <path d="M13 4h6l6 20H7z" fill="#ff6a1a" />
          <path d="M11.2 12h9.6M9.6 18h12.8" stroke="#fff" strokeWidth="2.4" />
          <rect x="4" y="24" width="24" height="4" rx="1.5" fill="#ff6a1a" />
        </svg>
      )}
      {live && (
        <span
          className="scd-live-dot absolute -right-0.5 -top-0.5 size-3 rounded-full ring-2 ring-white"
          style={{ background: LIVE_RED }}
        />
      )}
    </span>
  );
}

/** Our official crest and, only when the registry has the verified file, the opponent crest, stacked (home first). */
export function StackedCrests({
  e,
  size = 34,
}: {
  e: Pick<PublicEvent, "opponent" | "homeAway">;
  size?: number;
}) {
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
    <span
      className="relative grid shrink-0 place-items-center rounded-full bg-white ring-2 ring-white"
      style={{ width: size, height: size }}
    >
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

function DateLead({
  date,
  time,
  clock,
  timeOnly = false,
}: {
  date: string;
  time: string;
  clock: ReturnType<typeof matchClock>;
  /** Rows already grouped under a day heading (home week board): the time only, as on the board. */
  timeOnly?: boolean;
}) {
  const d = dateParts(date);
  if (timeOnly)
    return (
      <span className="grid w-[46px] shrink-0 justify-items-center leading-none text-[#0b2a5b] lg:w-[54px]">
        {clock.state === "live" ? (
          <span
            className="rounded-[5px] px-1 py-[3px] text-[13px] font-extrabold tabular-nums text-white"
            style={{ background: LIVE_RED }}
          >
            {clock.label}
          </span>
        ) : (
          <span
            className={`text-[17px] font-extrabold tabular-nums lg:text-[18px] ${clock.state === "done" ? "text-[#4a5d7a]" : ""}`}
          >
            {time || "--:--"}
          </span>
        )}
      </span>
    );
  return (
    <span className="grid w-[50px] shrink-0 justify-items-center leading-none text-[#0b2a5b] lg:w-[56px]">
      <span className="text-[12px] font-extrabold uppercase">{d.weekday}</span>
      <span className="font-uv text-[30px] leading-[0.95] lg:text-[34px]">
        {d.day}
      </span>
      <span className="text-[12px] font-extrabold uppercase">{d.month}</span>
      {clock.state === "live" ? (
        <span
          className="mt-1 rounded-[5px] px-1 py-[2px] text-[12px] font-extrabold tabular-nums text-white"
          style={{ background: LIVE_RED }}
        >
          {clock.label}
        </span>
      ) : (
        <span
          className={`mt-1 text-[13.5px] font-extrabold tabular-nums ${clock.state === "done" ? "text-[#4a5d7a]" : ""}`}
        >
          {time || "--:--"}
        </span>
      )}
    </span>
  );
}

export function GameRow({
  e,
  g,
  nowMs,
  open,
  toggle,
  followed,
  onFollow,
  timeOnly = false,
}: {
  e: PublicEvent;
  g: PublicGroup | undefined;
  nowMs: number;
  open: boolean;
  toggle: () => void;
  followed: boolean;
  onFollow: (id: string) => void;
  /** Under a day heading: show the kick-off time only (home week board). */
  timeOnly?: boolean;
}) {
  const clock = matchClock(e, nowMs);
  const live = clock.state === "live";
  const done = clock.state === "done";
  const certain = e.timeConfirmed && e.venueConfirmed;
  const home = e.homeAway === "CASA";
  const team = groupShort(g, e.category);
  const prefix = typePrefix(e.type);
  const title = matchTitle(
    { homeAway: e.homeAway, opponent: opponentLabel(e.opponent) },
    `ColicoDerviese ${team}`,
  );
  return (
    <li
      data-event-id={e.id}
      data-state={clock.state}
      className={`${CARD} relative overflow-hidden`}
    >
      <span
        className="absolute inset-y-0 left-0 w-[5px]"
        style={{ background: live ? LIVE_RED : (g?.color ?? "#668196") }}
        aria-hidden="true"
      />
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className={`scd-focus flex w-full items-center gap-[10px] py-[12px] pl-[14px] pr-[10px] text-left lg:gap-[14px] lg:pl-[18px] lg:pr-[14px] ${done ? "opacity-75" : ""}`}
      >
        <DateLead date={e.date} time={e.time} clock={clock} timeOnly={timeOnly} />
        <TypeIcon kind={gameIcon(e.type)} live={live} />
        <span className="min-w-0 flex-1">
          {live && (
            <span
              className="mb-[3px] inline-flex items-center gap-1 text-[11.5px] font-extrabold uppercase tracking-[0.04em]"
              style={{ color: LIVE_RED }}
            >
              <span
                className="scd-live-dot size-1.5 rounded-full"
                style={{ background: LIVE_RED }}
                aria-hidden="true"
              />
              In campo · {clock.label}
              <span className="sr-only">
                {" "}
                dal calcio d'inizio in calendario
              </span>
            </span>
          )}
          <span className="block break-words text-[15.5px] font-extrabold leading-[1.2] text-[#0b1e3a] lg:text-[17px]">
            {prefix ? `${prefix} · ` : ""}
            {title}
          </span>
          <span className="mt-[4px] flex items-start gap-[3px] text-[13px] font-medium leading-[1.25] text-[#4a5d7a] lg:text-[14px]">
            <MapPin
              className="mt-[1px] size-[14px] shrink-0 text-[#1556c4]"
              strokeWidth={2.4}
              aria-hidden="true"
            />
            <span className="min-w-0 break-words">
              {home ? "" : "Trasferta · "}
              {e.venue ? venueShort(e.venue) : "Sede da definire"}
              {done && (
                <span className="ml-[5px] whitespace-nowrap rounded bg-[#eef3f9] px-[5px] text-[11px] font-bold uppercase text-[#23406e]">
                  Terminata
                </span>
              )}
              {!certain && (
                <span className="ml-[5px] whitespace-nowrap rounded bg-[#fff3b0] px-[5px] text-[11px] font-bold uppercase text-[#6b4f00]">
                  da confermare
                </span>
              )}
              {e.isVariation && (
                <span className="ml-[5px] whitespace-nowrap rounded border border-[#1556c4] px-[4px] text-[11px] font-bold uppercase text-[#1556c4]">
                  Variazione
                </span>
              )}
            </span>
          </span>
        </span>
        <StackedCrests e={e} size={30} />
      </button>
      {open && (
        <div className="mx-[12px] mb-[12px] grid gap-1.5 rounded-[12px] bg-[#eef3f9] px-3 py-3 text-[14px] text-[#0b1e3a]">
          <div>
            <Clock3 className="mr-1 inline size-4" aria-hidden="true" />
            {fmt(e.date, {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}{" "}
            ·{" "}
            {e.time
              ? `${e.time}${certain ? "" : " (indicativo)"}`
              : "orario da definire"}
          </div>
          <div className="flex gap-1">
            <MapPin className="mt-1 size-4 shrink-0" aria-hidden="true" />
            <span className="break-words">
              {e.venue || "Sede da definire"}
              {e.venueConfirmed ? "" : " (da confermare)"}
            </span>
          </div>
          <dl className="m-0 grid gap-1.5">
            <div>
              <dt className="inline text-[#4a5d7a]">Categoria: </dt>
              <dd className="inline">
                {e.category}
                {e.round ? ` · giornata ${e.round}` : ""}
              </dd>
            </div>
            <div>
              <dt className="inline text-[#4a5d7a]">Provenienza: </dt>
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
          {e.facilityReview && (
            <div className="font-semibold text-[#4a5d7a]">
              Disponibilità impianto da verificare
            </div>
          )}
          {e.notice.map((n) => (
            <div key={n} className="font-semibold">
              ⚠ {n}
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {g && (
              <button
                type="button"
                onClick={() => onFollow(g.id)}
                aria-pressed={followed}
                className="scd-focus inline-flex h-[40px] items-center gap-1.5 rounded-full bg-white px-3 text-[13.5px] font-bold text-[#0b2a5b] shadow-[0_1px_3px_rgb(11_42_91/0.15)]"
              >
                <Star
                  className="size-4"
                  fill={followed ? "#ffd600" : "none"}
                  stroke={followed ? "#8a6d00" : "#0b2a5b"}
                  aria-hidden="true"
                />
                {followed
                  ? `Segui già ColicoDerviese ${team}`
                  : `Segui ColicoDerviese ${team}`}
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
                    opponent: opponentLabel(e.opponent),
                    homeAway: e.homeAway === "FUORI" ? "FUORI" : e.homeAway === "CASA" ? "CASA" : "",
                    place: e.venue ? venueShort(e.venue) : "",
                    pending: certain ? [] : ["Orario o campo da confermare"],
                  },
                  team,
                )}
                className="bg-white shadow-[0_1px_3px_rgb(11_42_91/0.15)]"
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

export function TrainingRow({ r }: { r: TrainingItem }) {
  const d = dateParts(r.date);
  return (
    <li className={`${CARD} scd-rise relative overflow-hidden`}>
      <span
        className="absolute inset-y-0 left-0 w-[5px] bg-[#1f9d55]"
        aria-hidden="true"
      />
      <Link
        to="/allenamenti"
        className="scd-focus flex items-center gap-[10px] py-[12px] pl-[14px] pr-[10px] lg:gap-[14px] lg:pl-[18px]"
      >
        <span className="grid w-[50px] shrink-0 justify-items-center leading-none text-[#0b2a5b] lg:w-[56px]">
          <span className="text-[12px] font-extrabold uppercase">
            {d.weekday}
          </span>
          <span className="font-uv text-[30px] leading-[0.95] lg:text-[34px]">
            {d.day}
          </span>
          <span className="text-[12px] font-extrabold uppercase">
            {d.month}
          </span>
          <span className="mt-1 text-[13.5px] font-extrabold tabular-nums">
            {r.time}
          </span>
        </span>
        <TypeIcon kind="cone" />
        <span className="min-w-0 flex-1">
          <span className="block break-words text-[15.5px] font-extrabold leading-[1.2] text-[#0b1e3a]">
            {r.title}
          </span>
          <span className="mt-[4px] flex items-start gap-[3px] text-[13px] font-medium leading-[1.25] text-[#4a5d7a]">
            <MapPin
              className="mt-[1px] size-[14px] shrink-0 text-[#1556c4]"
              strokeWidth={2.4}
              aria-hidden="true"
            />
            <span className="min-w-0">{r.sub}</span>
          </span>
          {r.teams && (
            <span className="mt-[2px] block truncate text-[12px] font-medium text-[#4a5d7a]">
              {r.teams}
            </span>
          )}
        </span>
        <ChevronRight
          className="size-5 shrink-0 text-[#1556c4]"
          aria-hidden="true"
        />
      </Link>
    </li>
  );
}

/** "Prossime gare" row of the board: big date block, crests, "ColicoDerviese <categoria> vs <avversario>", venue, chevron. */
export function NextMatchRow({
  e,
  g,
  nowMs,
  testId,
}: {
  e: PublicEvent;
  g: PublicGroup | undefined;
  nowMs: number;
  testId?: string;
}) {
  const d = dateParts(e.date);
  const team = groupShort(g, e.category);
  const clock = matchClock(e, nowMs);
  const home = e.homeAway === "CASA";
  return (
    <li
      className={`${CARD} scd-rise relative overflow-hidden`}
      data-testid={testId}
    >
      <span
        className="absolute inset-y-0 left-0 w-[5px]"
        style={{
          background:
            clock.state === "live" ? LIVE_RED : (g?.color ?? "#668196"),
        }}
        aria-hidden="true"
      />
      <Link
        to="/calendario"
        search={{
          annata: g ? (g.years[0] ?? g.id) : undefined,
          vista: "prossime",
        }}
        className="scd-focus grid grid-cols-[62px_auto_minmax(0,1fr)_auto] items-center gap-[10px] py-[12px] pl-[14px] pr-[10px] hover:bg-[#fbfcfe]"
      >
        <span className="grid justify-items-center border-r border-[#e3eaf4] pr-[8px] leading-none text-[#0b2a5b]">
          <span className="text-[12.5px] font-extrabold">{d.weekday}</span>
          <span className="font-uv text-[40px] leading-[0.95]">{d.day}</span>
          <span className="text-[12.5px] font-extrabold">{d.month}</span>
        </span>
        <StackedCrests e={e} size={38} />
        <span className="min-w-0">
          <span className="block text-[15px] font-extrabold leading-[1.2] text-[#0b1e3a]">
            {matchTitle(
              { homeAway: e.homeAway, opponent: opponentLabel(e.opponent) },
              `ColicoDerviese ${team}`,
            )}
          </span>
          <span className="mt-[4px] flex items-start gap-[3px] text-[12.5px] font-medium leading-[1.25] text-[#4a5d7a]">
            <MapPin
              className="mt-[1px] size-[13px] shrink-0 text-[#1556c4]"
              strokeWidth={2.4}
              aria-hidden="true"
            />
            <span className="min-w-0 break-words">
              {clock.state === "live" ? (
                <b style={{ color: LIVE_RED }}>In campo · {clock.label} · </b>
              ) : e.time ? (
                <b className="text-[#0b2a5b]">{e.time} · </b>
              ) : null}
              {home ? "" : "Trasferta · "}
              {e.venue ? venueShort(e.venue) : "Sede da definire"}
            </span>
          </span>
        </span>
        <ChevronRight
          className="size-6 shrink-0 text-[#0b2a5b]"
          strokeWidth={2.4}
          aria-hidden="true"
        />
      </Link>
    </li>
  );
}

/* ------------------------------------------------------------------ live banner */

/**
 * Hero pulse: red "In campo ora" with the minute while a game is being played (from the calendar kick-off), otherwise
 * the countdown to the next kick-off. Seconds tick only on the device, after hydration.
 */
export function LiveBanner({
  events,
  groups,
  nowMs,
}: {
  events: readonly PublicEvent[];
  groups: readonly PublicGroup[];
  nowMs: number;
}) {
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
        className="m-0 inline-flex w-fit max-w-full flex-wrap items-center gap-x-2 gap-y-1 rounded-[12px] px-3 py-2 text-[13.5px] font-bold text-white shadow-[0_6px_18px_-8px_rgb(0_0_0/0.6)]"
        style={{ background: LIVE_RED }}
        data-testid="cal-live-banner"
        role="status"
      >
        <span
          className="scd-live-dot size-2 rounded-full bg-white"
          aria-hidden="true"
        />
        <span>In campo ora</span>
        <span className="min-w-0 truncate font-semibold">
          ColicoDerviese {team(first)} ·{" "}
          {opponentLabel(first.opponent) || "avversario da definire"}
        </span>
        <span className="font-uv text-[20px] leading-none tabular-nums">
          {clock.label}
        </span>
        {live.length > 1 && (
          <span className="font-semibold">
            +{live.length - 1} {live.length === 2 ? "altra" : "altre"}
          </span>
        )}
      </p>
    );
  }
  const next = nextKickoff(events, now, (e) =>
    eventRank(e, (g) => matchdayClass(g) === "agonistica"),
  );
  if (!next) return null;
  const left = countdownParts(next.startMs - now);
  const d = dateParts(next.e.date);
  return (
    <p
      className="m-0 inline-flex w-fit max-w-full flex-wrap items-center gap-x-2 gap-y-1 rounded-[12px] bg-white/12 px-3 py-2 text-[13px] font-semibold text-white backdrop-blur-sm"
      data-testid="cal-countdown"
    >
      <span
        className="scd-live-dot size-2 rounded-full bg-[#ffd600]"
        aria-hidden="true"
      />
      <span>
        Prossima gara · {team(next.e)} · {d.weekday} {d.day} {d.month}
      </span>
      <span
        className="font-uv text-[20px] leading-none tabular-nums text-[#ffd600]"
        aria-hidden="true"
      >
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
  return (
    <div
      className="scd-scroll-x -mx-4 flex gap-[8px] overflow-x-auto px-4 pb-[4px] pt-[2px] lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0"
      role="group"
      aria-label="Squadre: tocca per filtrare, stella per seguire"
      data-testid="cal-team-chips"
    >
      <button
        type="button"
        aria-pressed={!selectedId}
        onClick={() => onPick(undefined)}
        className={`scd-focus flex h-[44px] shrink-0 items-center rounded-full px-[16px] text-[14px] font-bold ${!selectedId ? "bg-[#0b2a5b] text-white" : "bg-white text-[#0b2a5b] shadow-[0_1px_3px_rgb(11_42_91/0.14)]"}`}
      >
        Tutte
      </button>
      {groups.map((g) => {
        const on = selectedId === g.id;
        const mine = followed.includes(g.id);
        return (
          <span
            key={g.id}
            className={`flex h-[44px] shrink-0 items-center rounded-full ${on ? "bg-[#0b2a5b] text-white" : "bg-white text-[#0b2a5b] shadow-[0_1px_3px_rgb(11_42_91/0.14)]"}`}
          >
            <button
              type="button"
              onClick={() => onFollow(g.id)}
              aria-pressed={mine}
              aria-label={
                mine ? `Non seguire più ${g.label}` : `Segui ${g.label}`
              }
              className="scd-focus grid size-[44px] place-items-center rounded-full"
            >
              <Star
                className="size-[18px]"
                fill={mine ? "#ffd600" : "none"}
                stroke={
                  mine ? (on ? "#ffd600" : "#8a6d00") : on ? "#fff" : "#4a5d7a"
                }
                strokeWidth={2.2}
                aria-hidden="true"
              />
            </button>
            <button
              type="button"
              aria-pressed={on}
              onClick={() => onPick(on ? undefined : g)}
              className="scd-focus -ml-1 flex h-[44px] items-center gap-[7px] rounded-full pr-[14px] text-[14px] font-bold"
            >
              <span
                className="size-[10px] shrink-0 rounded-full ring-2 ring-white"
                style={{ background: g.color }}
                aria-hidden="true"
              />
              <span className="whitespace-nowrap">{label(g)}</span>
            </button>
          </span>
        );
      })}
    </div>
  );
}
