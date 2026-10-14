/**
 * "Questa settimana" — Matchday block of the public home (UD-132, Francesco 14/10/2026 23:22: a short home that pushes
 * ragazzi and families to live the app). The games of the next 7 days from the Calendario SCD (weekMatches, same
 * source as /calendario), grouped by day, with four real filters (Tutte, In casa, Agonistica, Attività di base).
 *
 * Rules: our side is "ColicoDerviese" (annata crests stay inside); an opponent crest appears only when the verified
 * crest registry has the file (never an invented shield); "da confermare" stays soft; no score (the calendar carries
 * none). Logic lives in lib/home-matchday.ts (tested). Palette: navy #0b2a5b, blue #1556c4, light #eef3f9, white;
 * yellow only for changes.
 */
import { Link } from "@tanstack/react-router";
import { AlertTriangle, ChevronRight, MapPin } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { venueShort } from "@/components/home/HomeSections";
import type { getPublicCalendarSnapshot } from "@/lib/calendar.functions";
import { crestFor } from "@/lib/crests";
import {
  MATCHDAY_FILTERS,
  MATCHDAY_FILTER_LABEL,
  categoryColor,
  categoryShort,
  filterCounts,
  filterMatchday,
  groupByDay,
  matchdayDayLabel,
  matchdaySummary,
  matchdaySummaryLine,
  type MatchdayFilter,
} from "@/lib/home-matchday";
import { weekMatches, type TodayEntry } from "@/lib/home-today";
import type { PublicGroup } from "@/lib/public-snapshots";
import { itemState } from "@/lib/universe";

type PublicCalendar = Awaited<ReturnType<typeof getPublicCalendarSnapshot>>;

/** Minute clock: the first render uses the server time (no hydration mismatch), then it follows the device. */
function useMinuteClock(serverNow: number): number {
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

function OpponentMark({ name }: { name: string }) {
  const { src, label } = crestFor(name);
  if (!src) return null;
  return (
    <img
      src={src}
      alt={`Stemma ${label}`}
      width={20}
      height={20}
      loading="lazy"
      decoding="async"
      className="size-5 shrink-0 rounded-full bg-white object-contain"
    />
  );
}

function MatchRow({
  e,
  groups,
  nowMs,
}: {
  e: TodayEntry;
  groups: readonly PublicGroup[];
  nowMs: number;
}) {
  const state = itemState(e, nowMs);
  const live = state === "live";
  const done = state === "done";
  const changed = e.changes.length > 0;
  const opponent = e.opponent
    ? crestFor(e.opponent).label
    : "Avversario da definire";
  const weFirst = e.homeAway !== "FUORI";
  const color = categoryColor(e.group, groups);
  const cat = categoryShort(e.group, groups, e.team);
  const venue = e.place ? venueShort(e.place) : "Campo da definire";
  const us = <span className="font-bold text-[#0b2a5b]">ColicoDerviese</span>;
  const them = (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      {e.opponent && <OpponentMark name={e.opponent} />}
      <span>{opponent}</span>
    </span>
  );
  const label = [
    cat,
    weFirst ? `ColicoDerviese contro ${opponent}` : `${opponent} contro ColicoDerviese`,
    e.homeAway === "CASA" ? "in casa" : e.homeAway === "FUORI" ? "in trasferta" : "",
    e.time ? `ore ${e.time}` : "orario da definire",
    venue,
    live ? "in corso" : done ? "conclusa" : "",
    ...e.changes,
    ...e.pending,
  ]
    .filter(Boolean)
    .join(", ");
  return (
    <li data-state={state} data-changed={changed ? "true" : undefined}>
      <Link
        to="/calendario"
        search={{ annata: e.group } as never}
        aria-label={label}
        className={`scd-focus group relative flex min-h-[60px] items-center gap-3 py-2 pl-4 pr-3 transition-colors duration-150 hover:bg-[#f4f7fb] ${changed ? "bg-[#fffbe6]" : done ? "bg-[#f7f9fc]" : ""}`}
      >
        <span
          aria-hidden="true"
          className={`absolute inset-y-2.5 left-1.5 w-[3px] rounded-full ${changed ? "bg-[#ffd600]" : ""}`}
          style={changed ? undefined : { background: color }}
        />
        <span className="flex w-[50px] shrink-0 flex-col items-start">
          <span className="font-uv text-[22px] leading-none tabular-nums text-[#0b2a5b]">
            {e.time || "—"}
          </span>
          {live && (
            <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.04em] text-[#c62828]">
              <span
                aria-hidden="true"
                className="scd-live-dot size-1.5 rounded-full bg-[#e53935]"
              />
              In corso
            </span>
          )}
        </span>
        <span className="grid min-w-0 flex-1 gap-1">
          <span className="flex min-w-0 items-center gap-1.5 text-[12.5px] leading-tight text-[#4a5d7a]">
            <span
              className="inline-flex h-[20px] shrink-0 items-center rounded-full px-2 text-[11px] font-bold leading-none text-white"
              style={{ background: color }}
            >
              {cat}
            </span>
            <MapPin
              className="size-3.5 shrink-0 text-[#7a8aa3]"
              aria-hidden="true"
            />
            <span className="truncate">{venue}</span>
          </span>
          <span className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0.5 text-[15px] leading-tight text-[#0b1e3a]">
            {weFirst ? us : them}
            <span aria-hidden="true" className="shrink-0 text-[#9fb0c8]">
              ·
            </span>
            {weFirst ? them : us}
          </span>
          {(e.pending.length > 0 || changed) && (
            <span className="flex flex-wrap gap-x-2 gap-y-0.5 text-[12px] leading-tight">
              {e.pending.map((p) => (
                <span key={p} className="font-medium text-[#7a6420]">
                  {p}
                </span>
              ))}
              {e.changes.map((c) => (
                <span
                  key={c}
                  className="inline-flex items-center gap-1 font-bold text-[#0b1e3a]"
                >
                  <AlertTriangle
                    className="size-3 shrink-0 text-[#b38f00]"
                    aria-hidden="true"
                  />
                  {c}
                </span>
              ))}
            </span>
          )}
        </span>
        <span
          className={`inline-flex h-[22px] shrink-0 items-center rounded-[6px] px-1.5 text-[10.5px] font-extrabold uppercase tracking-[0.06em] ${e.homeAway === "CASA" ? "bg-[#0b2a5b] text-white" : "bg-[#e7effa] text-[#1556c4]"}`}
        >
          {e.homeAway === "CASA"
            ? "Casa"
            : e.homeAway === "FUORI"
              ? "Fuori"
              : "Gara"}
        </span>
      </Link>
    </li>
  );
}

export function HomeMatchday({
  calendar,
  nowMs,
  today,
}: {
  calendar: PublicCalendar;
  nowMs: number;
  today: string;
}) {
  const [filter, setFilter] = useState<MatchdayFilter>("tutte");
  const now = useMinuteClock(nowMs);
  const week = useMemo(
    () => weekMatches(calendar.events, calendar.groups, today, null),
    [calendar.events, calendar.groups, today],
  );
  const counts = useMemo(() => filterCounts(week), [week]);
  const summary = useMemo(
    () => matchdaySummaryLine(matchdaySummary(week)),
    [week],
  );
  const days = useMemo(
    () => groupByDay(filterMatchday(week, filter)),
    [week, filter],
  );

  return (
    <section
      aria-labelledby="matchday-t"
      className="min-w-0"
      data-testid="home-matchday"
      data-filter={filter}
    >
      <div className="flex items-end justify-between gap-3 pb-2">
        <div className="grid gap-1">
          <h2
            id="matchday-t"
            className="m-0 font-uv text-[30px] uppercase leading-none text-[#0b2a5b] lg:text-[36px]"
          >
            Questa settimana
          </h2>
          {summary && (
            <p
              className="m-0 text-[14px] font-semibold text-[#3e5272]"
              data-testid="home-matchday-summary"
            >
              {summary}
            </p>
          )}
        </div>
        <Link
          to="/calendario"
          className="scd-focus inline-flex min-h-11 shrink-0 items-center gap-0.5 rounded-md text-[14px] font-semibold text-[#1556c4]"
          data-testid="home-matchday-all"
        >
          Tutto il calendario
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      </div>

      {week.length > 0 && (
        <div
          role="group"
          aria-label="Filtra le gare"
          className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-3 [scrollbar-width:none] lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden"
          data-testid="home-matchday-filters"
        >
          <span className="sr-only" role="status" aria-live="polite">
            {`${counts[filter]} gare`}
          </span>
          {MATCHDAY_FILTERS.map((f) => {
            const on = f === filter;
            return (
              <button
                key={f}
                type="button"
                aria-pressed={on}
                onClick={() => setFilter(f)}
                data-filter={f}
                className={`scd-focus inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-[14px] font-semibold transition-colors duration-150 ${on ? "border-[#0b2a5b] bg-[#0b2a5b] text-white" : "border-[#c9d7ea] bg-white text-[#0b2a5b] hover:border-[#1556c4]"}`}
              >
                {MATCHDAY_FILTER_LABEL[f]}
                <span
                  className={`text-[12.5px] tabular-nums ${on ? "text-white/75" : "text-[#5a6b85]"}`}
                >
                  {counts[f]}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div
        className="overflow-hidden rounded-[18px] bg-white shadow-[0_1px_2px_rgb(11_42_91/0.06),0_8px_24px_-12px_rgb(11_42_91/0.25)]"
      >
        {days.length === 0 ? (
          <p
            className="m-0 px-4 py-5 text-[15px] leading-snug text-[#4a5d7a]"
            data-testid="home-matchday-empty"
          >
            {week.length === 0
              ? "Nessuna gara nei prossimi 7 giorni."
              : `Nessuna gara "${MATCHDAY_FILTER_LABEL[filter]}" nei prossimi 7 giorni.`}
          </p>
        ) : (
          days.map((d) => (
            <div
              key={d.date}
              className="border-b border-[#e6edf6] last:border-b-0"
            >
              <h3 className="m-0 bg-[#f4f7fb] px-4 py-2 text-[13px] font-bold uppercase tracking-[0.06em] text-[#0b2a5b]">
                {matchdayDayLabel(d.date, today)}
              </h3>
              <ul className="m-0 list-none divide-y divide-[#eef2f8] p-0">
                {d.entries.map((e) => (
                  <MatchRow
                    key={e.id}
                    e={e}
                    groups={calendar.groups}
                    nowMs={now}
                  />
                ))}
              </ul>
            </div>
          ))
        )}
      </div>
      <p className="m-0 px-1 pt-2 text-[12.5px] leading-snug text-[#5a6b85]">
        Dal Calendario SCD. Orari e campi "da confermare" non sono ancora
        confermati dal club.
      </p>
    </section>
  );
}
