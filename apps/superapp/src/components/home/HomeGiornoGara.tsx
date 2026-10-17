/**
 * Two quick wins on top of the public home (Francesco 17/10/2026: «attraente, interattiva, fluida e dinamica,
 * soprattutto per i ragazzi»; research docs/piattaforme/ricerche/ragazzi-social.md).
 *
 * - HomeNextMatch (I-261017-04): the next game of the club, home or away, on phone and desktop alike, with a live
 *   countdown (days/hours/minutes, updated once a minute by useMinuteClock, paused while the tab is hidden). Data:
 *   the public calendar snapshot only (nextGame). Not confirmed → «da confermare». No game in 14 days → a quiet line.
 * - HomeSfidaQuiz (I-261017-05): the challenge of the week (localStorage «Fatto!», works without storage) and the quiz
 *   of the day (three answers, right/wrong with one line). Static content from lib/home-giochi: no network, no
 *   account, no personal data. Celebration only with motion allowed (styles.css .scd-cheer).
 *
 * Engine: PERSONE (young players and families come back every week). Measured by: share of home visits that tap
 * «Prossima gara», «Fatto!» and quiz answers (to wire into the Meta/analytics platform after cookie consent).
 */
import { Link } from "@tanstack/react-router";
import { CalendarDays, Check, ChevronRight, MapPin, Sparkles, Target, X } from "lucide-react";
import { useEffect, useState } from "react";

import { HOME_CARD, HOME_LABEL } from "@/components/home/tones";
import { venueShort } from "@/components/home/HomeSections";
import { groupShort } from "@/lib/board-data";
import { crestFor } from "@/lib/crests";
import { quizOfDay, romeDateOf, sfidaKey, sfidaOfWeek } from "@/lib/home-giochi";
import { countdownLabel, countdownParts, type NextGame } from "@/lib/home-next-game";
import type { PublicGroup } from "@/lib/public-snapshots";

const WD_LONG = ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"] as const;
const MONTHS = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"] as const;
const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);
const two = (n: number) => String(n).padStart(2, "0");

/** «Sabato 17 ottobre» from a Rome calendar date. */
export function romeDayLabel(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  return `${cap(WD_LONG[d.getUTCDay()] ?? "")} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()] ?? ""}`;
}

function Pending() {
  return <span className="rounded-[4px] bg-[#ffd84a] px-1.5 py-px font-display text-[11px] font-bold uppercase tracking-[0.04em] text-[#13254d]">da confermare</span>;
}

/* --------------------------------------------------------- prossima gara */

export function HomeNextMatch({ next, groups, nowMs }: { next: NextGame | null; groups: readonly PublicGroup[]; nowMs: number }) {
  if (!next) {
    return (
      <p className="m-0 flex min-h-11 flex-wrap items-center gap-x-1.5 px-1 text-[14px] text-[#52627f]" data-testid="home-countdown-none">
        Nessuna gara nei prossimi 14 giorni ·
        <Link to="/calendario" className="scd-focus inline-flex min-h-11 items-center rounded-md font-display font-semibold text-[#0457af] underline-offset-2 hover:underline">
          Calendario
        </Link>
      </p>
    );
  }
  const { e } = next;
  const g = groups.find((x) => x.id === e.group);
  const team = groupShort(g, e.category) || "ColicoDerviese";
  const opp = e.opponent ? crestFor(e.opponent).label : "";
  const home = e.homeAway === "CASA";
  const left = next.at - nowMs;
  const p = countdownParts(left);
  const timePending = !next.hasTime || !e.timeConfirmed;
  const venuePending = !e.venue || !e.venueConfirmed;
  const tiles: [number, string][] = [
    [p.d, p.d === 1 ? "giorno" : "giorni"],
    [p.h, p.h === 1 ? "ora" : "ore"],
    [p.m, p.m === 1 ? "minuto" : "minuti"],
  ];
  return (
    <section aria-labelledby="home-next-t" className="relative" data-testid="home-next-match">
      <Link
        to="/calendario"
        search={{ annata: e.group, vista: "settimana" }}
        className="scd-matchday scd-lift scd-focus grid gap-3 rounded-[12px] px-4 pb-5 pt-4 text-white lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-6 lg:px-6 lg:py-5"
        data-testid="home-countdown"
      >
        <span className="grid min-w-0 gap-1.5">
          <span className="flex flex-wrap items-center gap-2">
            <span id="home-next-t" className={`${HOME_LABEL} text-[#ffd84a]`}>
              Prossima gara
            </span>
            <span className={`rounded-full px-2 py-px font-display text-[11px] font-bold uppercase tracking-[0.06em] ${home ? "bg-[#ffd84a] text-[#13254d]" : "border border-white/50 text-white"}`}>
              {home ? "In casa" : "Fuori casa"}
            </span>
          </span>
          <span className="font-display text-[24px] font-bold leading-[1.05] lg:text-[30px]">
            {team}
            <span className="font-semibold text-[#c9d6f0]"> {home ? "contro" : "a casa di"} </span>
            <span className="break-words">{opp || "avversario da definire"}</span>
          </span>
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px] text-[#dbe5f7] lg:text-[15px]">
            <CalendarDays className="size-4 shrink-0 text-[#7fd0ff]" aria-hidden="true" />
            <span className="tabular-nums">
              {romeDayLabel(e.date)}
              {next.hasTime ? ` · ore ${e.time}` : " · orario"}
            </span>
            {timePending && <Pending />}
          </span>
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px] text-[#dbe5f7] lg:text-[15px]">
            <MapPin className="size-4 shrink-0 text-[#7fd0ff]" aria-hidden="true" />
            <span className="min-w-0 break-words">{e.venue ? venueShort(e.venue) : "Campo"}</span>
            {venuePending && <Pending />}
          </span>
          {next.sameSlot > 0 && (
            <span className="text-[13px] text-[#b4c3de]">
              e {next.sameSlot === 1 ? "un'altra gara" : `altre ${next.sameSlot} gare`} alla stessa ora
            </span>
          )}
        </span>
        {next.hasTime ? (
          <span className="flex items-end gap-2" aria-hidden="true">
            {tiles.map(([v, unit]) => (
              <span key={unit} className="grid w-[72px] justify-items-center rounded-[10px] border border-white/20 bg-white/[0.08] px-2 pb-1.5 pt-2 lg:w-[84px]">
                <span key={v} className="scd-tick font-display text-[30px] font-bold leading-none tabular-nums lg:text-[38px]">
                  {unit === "giorno" || unit === "giorni" ? v : two(v)}
                </span>
                <span className="pt-1 font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-[#ffd84a]">{unit}</span>
              </span>
            ))}
            <ChevronRight className="mb-2 hidden size-6 text-[#c9d6f0] lg:block" />
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 font-display text-[14px] font-semibold text-[#ffd84a]">
            Vedi nel calendario
            <ChevronRight className="size-4" aria-hidden="true" />
          </span>
        )}
      </Link>
      {/* Screen readers: one polite update a minute at most (the clock ticks once a minute). */}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {next.hasTime ? `Prossima gara ${countdownLabel(left)}` : "Prossima gara: orario da confermare"}
      </span>
    </section>
  );
}

/* ------------------------------------------------ sfida e quiz del giorno */

function readDone(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function writeDone(key: string, on: boolean) {
  try {
    if (on) window.localStorage.setItem(key, "1");
    else window.localStorage.removeItem(key);
  } catch {
    /* storage off (private mode, blocked): the state lives in memory for this visit */
  }
}

export function HomeSfidaQuiz({ nowMs, today }: { nowMs: number; today: string }) {
  // Server render uses the server's Rome date; on the device the date follows the minute clock (changes at midnight).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const day = mounted ? romeDateOf(nowMs) : today;
  const sfida = sfidaOfWeek(day);
  const key = sfidaKey(day, sfida);
  const quiz = quizOfDay(day);

  const [done, setDone] = useState(false);
  const [cheer, setCheer] = useState(0);
  useEffect(() => setDone(readDone(key)), [key]);

  const [pick, setPick] = useState<{ id: string; i: number } | null>(null);
  const chosen = pick && pick.id === quiz.id ? pick.i : null;
  const right = chosen !== null && chosen === quiz.correct;

  const toggle = () => {
    const on = !done;
    setDone(on);
    writeDone(key, on);
    if (on) setCheer((c) => c + 1);
  };

  return (
    <section aria-label="Sfida della settimana e quiz del giorno" className={`${HOME_CARD} grid lg:grid-cols-2`} data-testid="home-giochi">
      <div className="relative grid content-start gap-2 px-4 pb-4 pt-4 lg:border-r lg:border-[#edf1f7] lg:px-6" data-testid="home-sfida">
        <span className={`${HOME_LABEL} inline-flex items-center gap-1.5 text-[#0457af]`}>
          <Target className="size-3.5" aria-hidden="true" />
          Sfida della settimana
        </span>
        <h2 className="m-0 font-display text-[21px] font-bold leading-tight text-[#14264d] lg:text-[24px]">{sfida.title}</h2>
        <p className="m-0 text-[14px] leading-snug text-[#52627f]">{sfida.how}</p>
        <div className="relative flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            onClick={toggle}
            aria-pressed={done}
            className={`scd-focus inline-flex min-h-11 items-center gap-1.5 rounded-[8px] px-4 font-display text-[16px] font-bold transition-colors ${done ? "bg-[#13254d] text-white" : "scd-gold"}`}
            data-testid="sfida-fatto"
          >
            {done ? <Check className="size-4" aria-hidden="true" /> : <Sparkles className="size-4" aria-hidden="true" />}
            {done ? "Fatto!" : "Fatto?"}
          </button>
          <span className="text-[13px] text-[#52627f]" aria-live="polite">
            {done ? "Grande! Sfida completata, la prossima arriva lunedì." : "Provala in uno spazio sicuro, anche a casa."}
          </span>
          {cheer > 0 && done && (
            <span key={cheer} aria-hidden="true" className="pointer-events-none absolute left-6 top-0">
              {["#ffd84a", "#7fd0ff", "#1556c4", "#ffd84a", "#7fd0ff"].map((c, i) => (
                <span key={i} className="scd-cheer absolute size-2 rounded-full" style={{ background: c, ["--cx" as string]: `${(i - 2) * 22}px` }} />
              ))}
            </span>
          )}
        </div>
      </div>

      <div className="grid content-start gap-2 border-t border-[#edf1f7] px-4 pb-4 pt-4 lg:border-t-0 lg:px-6" data-testid="home-quiz">
        <span className={`${HOME_LABEL} inline-flex items-center gap-1.5 text-[#0457af]`}>
          <Sparkles className="size-3.5" aria-hidden="true" />
          Quiz del giorno · {quiz.topic === "regole" ? "regole del calcio" : "Colico e Dervio"}
        </span>
        <h2 className="m-0 font-display text-[18px] font-bold leading-snug text-[#14264d] lg:text-[20px]">{quiz.q}</h2>
        <ul className="m-0 grid list-none gap-2 p-0">
          {quiz.answers.map((a, i) => {
            const isRight = chosen !== null && i === quiz.correct;
            const isWrong = chosen === i && !right;
            return (
              <li key={a}>
                <button
                  type="button"
                  onClick={() => setPick({ id: quiz.id, i })}
                  disabled={chosen !== null}
                  aria-pressed={chosen === i}
                  className={`scd-focus flex min-h-11 w-full items-center justify-between gap-2 rounded-[8px] border px-3 text-left font-display text-[15px] font-semibold transition-colors ${
                    isRight ? "border-[#1556c4] bg-[#e5efff] text-[#13254d]" : isWrong ? "border-[#c4122b] bg-[#ffeef0] text-[#8a0f20]" : "border-[#c3cee0] bg-white text-[#14264d] enabled:hover:border-[#0457af] enabled:hover:bg-[#eef3f9]"
                  } disabled:cursor-default`}
                >
                  <span>{a}</span>
                  {isRight && <Check className="size-4 shrink-0 text-[#1556c4]" aria-hidden="true" />}
                  {isWrong && <X className="size-4 shrink-0" aria-hidden="true" />}
                </button>
              </li>
            );
          })}
        </ul>
        <p className="m-0 min-h-[1.25rem] text-[14px] leading-snug text-[#14264d]" aria-live="polite" data-testid="quiz-feedback">
          {chosen === null ? (
            <span className="text-[#7a8aa8]">Una domanda nuova ogni giorno.</span>
          ) : (
            <>
              <strong className={right ? "text-[#1556c4]" : "text-[#c4122b]"}>{right ? "Giusto! " : "Non proprio. "}</strong>
              {quiz.why}
            </>
          )}
        </p>
      </div>
    </section>
  );
}
