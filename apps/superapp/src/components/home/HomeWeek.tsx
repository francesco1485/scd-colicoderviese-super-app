/**
 * Public home, new idea (Francesco 15/10/2026 21:35 «avevo detto che bisogna cambiare idea di grafica»; 19:20 phone
 * boards VR-025 «voglio questo, riprodurre questo e basta in tutto»; 16:09 «queste barre così grandi io non le voglio …
 * dobbiamo performare con professionalità e qualità»).
 *
 * The home opens on the week of every team, drawn like the Calendario board:
 *   1. a thin blue title band ("Questa settimana", the dates, a small "Iscriviti al club" invitation — not a banner);
 *   2. one white card with the week strip (today + 6 days, the chosen day in the blue circle, games under each day) and
 *      the pill filters (Tutte · In casa · Agonistica · Attività di base, with counts);
 *   3. the games grouped by day as white rows with the team colour bar, time, type icon, title, place, crests (GameRow
 *      of the Calendario, same component), then the full-width blue button to the calendar;
 *   4. desktop (Eurobet structure, UD-153): a right column with the club's next big game, the two practical cards and
 *      Iride; on the phone the same cards follow the list.
 * Data: the public calendar only (games; trainings stay for members, UD-100 until Francesco decides). No hero art, no
 * mascot, no vetrina (UD-152), no minor named.
 */
import { Link } from "@tanstack/react-router";
import { ArrowRight, CalendarDays } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { CARD, GameRow } from "@/components/calendario/CalendarioLive";
import { IrideCard, NextMatch, SmallCard, useMinuteClock } from "@/components/home/HomeBoard";
import type { getPublicCalendarSnapshot } from "@/lib/calendar.functions";
import { readFollowed, toggleFollowed, writeFollowed } from "@/lib/calendario-live";
import {
  WEEK_BOARD_FILTERS,
  WEEK_BOARD_FILTER_LABEL,
  gamesLabel,
  matchesWeekFilter,
  weekBoardEvents,
  weekGroups,
  weekRangeLabel,
  weekStrip,
  type WeekBoardFilter,
} from "@/lib/home-week-board";
import { smallTiles } from "@/lib/home-tiles";

type PublicCalendar = Awaited<ReturnType<typeof getPublicCalendarSnapshot>>;

const WRAP = "mx-auto w-full max-w-[1200px] px-4 lg:px-8";

function localStore(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function HomeWeek({ calendar, nowMs: serverNow, today }: { calendar: PublicCalendar; nowMs: number; today: string }) {
  const nowMs = useMinuteClock(serverNow);
  const [filter, setFilter] = useState<WeekBoardFilter>("tutte");
  const [day, setDay] = useState<string | null>(null);
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set());
  const [followed, setFollowed] = useState<string[]>([]);

  useEffect(() => setFollowed(readFollowed(localStore())), []);

  const events = useMemo(() => weekBoardEvents(calendar.events, today), [calendar.events, today]);
  const strip = useMemo(() => weekStrip(events, today, filter), [events, today, filter]);
  const groups = useMemo(() => weekGroups(events, filter, today, day), [events, filter, today, day]);
  const counts = useMemo(() => {
    const scope = day ? events.filter((e) => e.date === day) : events;
    const out = {} as Record<WeekBoardFilter, number>;
    for (const f of WEEK_BOARD_FILTERS) out[f] = scope.filter((e) => matchesWeekFilter(e, f)).length;
    return out;
  }, [events, day]);
  const groupOf = useMemo(() => new Map(calendar.groups.map((g) => [g.id, g])), [calendar.groups]);

  const toggleOpen = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const follow = (id: string) =>
    setFollowed((prev) => {
      const next = toggleFollowed(prev, id);
      writeFollowed(localStore(), next);
      return next;
    });

  return (
    <section aria-labelledby="home-week-t" data-testid="home-week">
      {/* 1. Thin title band: content first, no hero (16:09). */}
      <div className="bg-[linear-gradient(120deg,#1d5fd0_0%,#1149a8_45%,#0b2a5b_100%)] text-white lg:-mr-12 2xl:mr-0">
        <div className={`${WRAP} flex flex-wrap items-end justify-between gap-x-4 gap-y-1 pb-[54px] pt-3 lg:pb-[64px] lg:pt-6`}>
          <div className="min-w-0">
            <h2 id="home-week-t" className="m-0 font-uv text-[27px] leading-none tracking-[0.005em] lg:text-[38px]">
              Questa settimana
            </h2>
            <p className="m-0 mt-1 text-[14px] font-semibold text-white/90 lg:text-[16px]">
              Tutte le squadre · {weekRangeLabel(today)}
            </p>
          </div>
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

      <div className={`${WRAP} relative z-[1] -mt-[42px] grid grid-cols-[minmax(0,1fr)] gap-4 lg:-mt-[48px] lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-6`}>
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3">
          {/* 2. Week strip + pill filters. */}
          <div className={`${CARD} p-2.5 lg:p-4`} data-testid="home-week-strip">
            <div role="group" aria-label="Giorni della settimana" className="grid grid-cols-7 gap-0.5">
              {strip.map((d) => {
                const on = day === d.date;
                return (
                  <button
                    key={d.date}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setDay(on ? null : d.date)}
                    aria-label={`${d.today ? "Oggi, " : ""}${d.short} ${d.day}: ${d.count === 0 ? "nessuna gara" : gamesLabel(d.count)}`}
                    className="scd-focus grid min-h-[64px] justify-items-center content-center gap-1 rounded-[12px] py-1 hover:bg-[#f3f7fc]"
                  >
                    <span className={`text-[11px] font-extrabold tracking-[0.04em] ${d.today ? "text-[#1556c4]" : "text-[#4a5d7a]"}`}>
                      {d.today ? "OGGI" : d.short}
                    </span>
                    <span
                      className={`grid size-9 place-items-center rounded-full text-[16px] font-extrabold tabular-nums ${
                        on
                          ? "bg-[#1556c4] text-white shadow-[0_6px_14px_-6px_rgb(21_86_196/0.8)]"
                          : d.today
                            ? "text-[#1556c4] ring-2 ring-[#1556c4]/35"
                            : "text-[#0b1e3a]"
                      }`}
                    >
                      {d.day}
                    </span>
                    <span className="flex h-2 items-center gap-[3px]" aria-hidden="true">
                      {Array.from({ length: Math.min(d.count, 3) }, (_, i) => (
                        <span key={i} className={`size-[5px] rounded-full ${on ? "bg-[#1556c4]" : "bg-[#ffb800]"}`} />
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="-mx-2.5 mt-2 overflow-x-auto px-2.5 lg:-mx-4 lg:px-4">
              <div role="group" aria-label="Filtra le gare" className="flex w-max gap-2 pb-0.5">
                {WEEK_BOARD_FILTERS.map((f) => {
                  const on = filter === f;
                  return (
                    <button
                      key={f}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setFilter(f)}
                      className={`scd-focus inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 text-[14px] font-bold transition-colors ${
                        on ? "bg-[#0b2a5b] text-white" : "bg-[#eef3f9] text-[#0b2a5b] hover:bg-[#e2eaf5]"
                      }`}
                    >
                      {WEEK_BOARD_FILTER_LABEL[f]}
                      <span className={`text-[12px] tabular-nums ${on ? "text-white/80" : "text-[#4a5d7a]"}`}>{counts[f]}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 3. Games by day. */}
          {groups.length === 0 ? (
            <p className={`${CARD} m-0 px-4 py-5 text-[15px] text-[#4a5d7a]`} data-testid="home-week-empty">
              {events.length === 0
                ? "Nessuna gara nei prossimi 7 giorni. Trovi tutte le gare nel calendario."
                : "Nessuna gara con questa scelta. Prova un altro giorno o un altro filtro."}
            </p>
          ) : (
            groups.map((g) => (
              <section key={g.date} aria-labelledby={`hw-${g.date}`} className="grid gap-2">
                <h3 id={`hw-${g.date}`} className="m-0 flex items-baseline justify-between px-1 pt-1">
                  <span className="text-[15px] font-extrabold text-[#0b1e3a] lg:text-[16px]">{g.label}</span>
                  <span className="text-[13px] font-bold text-[#4a5d7a]">{gamesLabel(g.events.length)}</span>
                </h3>
                <ul className="m-0 grid list-none gap-2 p-0">
                  {g.events.map((e) => (
                    <GameRow
                      key={e.id}
                      e={e}
                      g={groupOf.get(e.group)}
                      nowMs={nowMs}
                      open={open.has(e.id)}
                      toggle={() => toggleOpen(e.id)}
                      followed={followed.includes(e.group)}
                      onFollow={follow}
                      timeOnly
                    />
                  ))}
                </ul>
              </section>
            ))
          )}
          {day && (
            <button
              type="button"
              onClick={() => setDay(null)}
              className="scd-focus inline-flex min-h-11 items-center justify-center rounded-[12px] text-[14.5px] font-bold text-[#1556c4] hover:underline"
            >
              Mostra tutta la settimana
            </button>
          )}
          <Link
            to="/calendario"
            className="scd-focus inline-flex min-h-12 items-center justify-center gap-2 rounded-[14px] bg-[#1556c4] px-4 text-[15px] font-bold text-white transition-[filter] duration-150 hover:brightness-110"
            data-testid="home-week-all"
          >
            <CalendarDays className="size-[18px]" aria-hidden="true" />
            Apri il calendario completo
          </Link>
          <p className="m-0 px-1 text-[12.5px] leading-snug text-[#4a5d7a]">
            Dal Calendario SCD. Orari e campi "da confermare" non sono ancora confermati dal club.
          </p>
        </div>

        {/* 4. Right column (desktop) / after the list (phone). */}
        <aside className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 lg:pt-[52px]" aria-label="Prossima gara e contatti" data-testid="home-week-side">
          <NextMatch calendar={calendar} nowMs={nowMs} today={today} />
          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-1 lg:gap-3">
            {smallTiles().map((t) => (
              <SmallCard key={t.id} tile={t} />
            ))}
          </div>
          <IrideCard />
        </aside>
      </div>
    </section>
  );
}
