/**
 * Practical blocks of the home (UD-116, Direzione 14/10/2026 10:59: "le home devono mostrare ciò che conta
 * davvero"): urgent notices, the one club communication, "Oggi e questa settimana", the quick actions for each kind
 * of person, the weekend results (only with a real source) and the tip of the day. Shared by the public and the
 * member home. Official palette (navy, blue, light blue, white; yellow for changes and the main highlight), Big
 * Shoulders for section titles, real data only with plain empty states.
 */
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Bus,
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  Download,
  Euro,
  ExternalLink,
  FileText,
  ListChecks,
  Mail,
  MapPin,
  Megaphone,
  Ticket,
  UsersRound,
  Goal,
  LandPlot,
  Handshake,
  Armchair,
  PackageOpen,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import { venueShort } from "@/components/home/HomeSections";
import { venueCase } from "@/lib/board-data";
import type { ClubNotice } from "@/lib/club-notice";
import {
  AUDIENCE_LABEL,
  type ActionIcon,
  type HomeAudience,
  type QuickAction,
} from "@/lib/home-actions";
import { isClubWin, type ResultRow } from "@/lib/home-results";
import { WinConfetti } from "@/components/home/WinConfetti";
import type { SupportAction } from "@/lib/home-support";
import {
  splitWeek,
  type TodayEntry,
  type UrgentNotice,
} from "@/lib/home-today";
import { TIP_PERSONA, type DailyTip } from "@/lib/home-tips";
import { OFFICIAL_RESULT_LINKS } from "@/lib/official-links";
import { matchdayLabel } from "@/lib/public-home";

export const WRAP = "mx-auto w-full max-w-[1280px] px-4 lg:px-8";
const CARD =
  "rounded-[18px] bg-white shadow-[0_1px_2px_rgb(11_42_91/0.06),0_8px_24px_-12px_rgb(11_42_91/0.25)]";

function Title({
  id,
  kicker,
  children,
  more,
}: {
  id: string;
  kicker?: string;
  children: ReactNode;
  more?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-3 pb-3">
      <div className="grid gap-1">
        {kicker && (
          <span className="text-[11.5px] font-extrabold uppercase tracking-[0.12em] text-[#1556c4]">
            {kicker}
          </span>
        )}
        <h2
          id={id}
          className="m-0 font-uv text-[24px] uppercase leading-none text-[#0b2a5b] sm:text-[26px] lg:text-[30px]"
        >
          {children}
        </h2>
      </div>
      {more}
    </div>
  );
}

const MoreLink = ({
  to,
  search,
  children,
}: {
  to: string;
  search?: Record<string, string>;
  children: ReactNode;
}) => (
  <Link
    to={to as never}
    search={search as never}
    className="scd-focus inline-flex min-h-11 shrink-0 items-center gap-0.5 rounded-md text-[14px] font-semibold text-[#1556c4]"
  >
    {children}
    <ChevronRight className="size-4" aria-hidden="true" />
  </Link>
);

/* ------------------------------------------------------------- notices */

/** Urgent notices (R20 alerts in their window): red strip on top, only when there is one. */
export function UrgentNotices({ items }: { items: readonly UrgentNotice[] }) {
  if (items.length === 0) return null;
  return (
    <section
      aria-label="Avvisi urgenti"
      className={`${WRAP} pt-4`}
      data-testid="home-urgent"
    >
      <ul className="m-0 grid list-none gap-2 p-0">
        {items.map((n) => (
          <li
            key={n.id}
            className="flex items-start gap-3 rounded-[14px] border border-[#f3b4b4] bg-[#fff1f1] px-4 py-3 text-[#7a1010]"
          >
            <AlertTriangle
              className="mt-0.5 size-5 shrink-0"
              aria-hidden="true"
            />
            <span className="grid min-w-0 gap-0.5">
              <b className="text-[15.5px] leading-snug">{n.title}</b>
              {n.body && (
                <span className="text-[14px] leading-snug">{n.body}</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The one communication chosen by the Direzione (with expiry), or nothing. */
export function ClubNoticeCard({ notice }: { notice: ClubNotice | null }) {
  if (!notice) return null;
  const urgent = notice.tone === "urgente";
  return (
    <section
      aria-labelledby="comunicazione-t"
      className={`${WRAP} pt-4`}
      data-testid="club-notice"
      data-tone={notice.tone}
    >
      <div
        className={`flex flex-col gap-3 rounded-[18px] px-4 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-6 ${urgent ? "bg-[#ffd600] text-[#0b1e3a]" : "bg-[#0b2a5b] text-white"}`}
      >
        <div className="flex min-w-0 items-start gap-3">
          <Megaphone
            className={`mt-0.5 size-6 shrink-0 ${urgent ? "text-[#0b2a5b]" : "text-[#ffd600]"}`}
            aria-hidden="true"
          />
          <div className="grid min-w-0 gap-1">
            <span
              className={`text-[11.5px] font-extrabold uppercase tracking-[0.12em] ${urgent ? "text-[#0b2a5b]" : "text-[#ffd600]"}`}
            >
              Comunicazione del club
            </span>
            <h2
              id="comunicazione-t"
              className="m-0 text-[18px] font-bold leading-snug lg:text-[20px]"
            >
              {notice.title}
            </h2>
            <p
              className={`m-0 text-[14.5px] leading-snug ${urgent ? "text-[#0b1e3a]" : "text-white/85"}`}
            >
              {notice.text}
            </p>
          </div>
        </div>
        {notice.href && (
          <Link
            to={notice.href as never}
            className={`scd-focus inline-flex h-12 shrink-0 items-center gap-2 self-start rounded-[12px] px-5 text-[15px] font-bold sm:self-center ${urgent ? "bg-[#0b2a5b] text-white" : "bg-[#ffd600] text-[#0b1e3a]"}`}
          >
            {notice.cta ?? "Leggi"}
            <ArrowRight className="size-[18px]" aria-hidden="true" />
          </Link>
        )}
      </div>
    </section>
  );
}

/* -------------------------------------------------------- today & week */

const timeOf = (e: TodayEntry) =>
  e.time ? (e.end ? `${e.time}–${e.end}` : e.time) : "";

function EntryRow({ e }: { e: TodayEntry }) {
  const changed = e.changes.length > 0;
  const game = e.kind === "gara";
  const what = game
    ? `${e.homeAway === "FUORI" ? `${venueCase(e.opponent || "Avversario da definire")} – ColicoDerviese` : `ColicoDerviese – ${venueCase(e.opponent || "Avversario da definire")}`}`
    : "Allenamento";
  return (
    <li
      className={`relative flex items-start gap-3 border-t border-[#eef2f8] py-3 pl-[18px] pr-3 first:border-t-0 lg:pr-4 ${changed ? "bg-[#fffbe6]" : ""}`}
      data-kind={e.kind}
      data-changed={changed ? "true" : undefined}
    >
      <span
        aria-hidden="true"
        className={`absolute inset-y-2 left-1.5 w-[4px] rounded-full ${changed ? "bg-[#ffd600]" : game ? "bg-[#1556c4]" : "bg-[#9cc3ea]"}`}
      />
      <span className="flex w-[72px] shrink-0 flex-col gap-1">
        <span className="font-title text-[22px] font-black tabular-nums leading-none text-[#0b2a5b]">
          {e.time || "—"}
        </span>
        {e.end && (
          <span className="text-[12px] font-semibold text-[#5a6b85]">
            fino {e.end}
          </span>
        )}
      </span>
      <span className="grid min-w-0 flex-1 gap-1">
        <span className="flex flex-wrap items-center gap-1.5">
          <span
            className={`inline-flex h-[20px] items-center rounded-[6px] px-1.5 text-[10.5px] font-extrabold uppercase tracking-[0.06em] ${game ? "bg-[#0b2a5b] text-white" : "bg-[#e7effa] text-[#1556c4]"}`}
          >
            {game
              ? e.homeAway === "CASA"
                ? "Gara in casa"
                : e.homeAway === "FUORI"
                  ? "Gara fuori"
                  : "Gara"
              : "Allenamento"}
          </span>
          <b className="text-[15px] leading-tight text-[#0b1e3a]">{e.team}</b>
          {e.forNames.map((n) => (
            <span
              key={n}
              className="inline-flex h-[20px] items-center rounded-full bg-[#ffd600] px-2 text-[11px] font-bold text-[#0b1e3a]"
            >
              {n}
            </span>
          ))}
        </span>
        {game && (
          <span className="text-[14px] font-semibold leading-snug text-[#0b2a5b]">
            {what}
          </span>
        )}
        <span className="flex items-center gap-1 text-[13px] leading-snug text-[#4a5d7a]">
          <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
          {e.place
            ? game
              ? venueShort(e.place)
              : e.place
            : "Campo da definire"}
          {!e.time && <span> · orario da definire</span>}
        </span>
        {e.pending.length > 0 && (
          <span className="flex flex-wrap gap-1.5">
            {e.pending.map((c) => (
              <span
                key={c}
                className="inline-flex min-h-[22px] items-center rounded-full border border-[#e2c766] bg-[#fff8db] px-2 py-0.5 text-[11.5px] font-semibold leading-tight text-[#6b5200]"
              >
                {c}
              </span>
            ))}
          </span>
        )}
        {changed && (
          <span className="flex flex-wrap gap-1.5" aria-label="Cambi">
            {e.changes.map((c) => (
              <span
                key={c}
                className="inline-flex min-h-[22px] items-center gap-1 rounded-full bg-[#ffd600] px-2 py-0.5 text-[11.5px] font-bold leading-tight text-[#0b1e3a]"
              >
                <AlertTriangle className="size-3 shrink-0" aria-hidden="true" />
                {c}
              </span>
            ))}
          </span>
        )}
      </span>
      <span className="sr-only">{timeOf(e)}</span>
    </li>
  );
}

function DayGroup({
  date,
  today,
  entries,
}: {
  date: string;
  today: string;
  entries: readonly TodayEntry[];
}) {
  return (
    <div className="border-b border-[#e6edf6] last:border-b-0">
      <h3 className="m-0 flex items-center gap-2 bg-[linear-gradient(90deg,#f1f5fb,#fff)] px-4 py-2 text-[13px] font-bold uppercase tracking-[0.05em] text-[#0b2a5b]">
        {matchdayLabel(date, today)}
      </h3>
      <ul className="m-0 list-none p-0">
        {entries.map((e) => (
          <EntryRow key={e.id} e={e} />
        ))}
      </ul>
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="m-0 px-4 py-4 text-[14.5px] leading-snug text-[#4a5d7a]">
      {children}
    </p>
  );
}

/**
 * Signed in: the person's teams and children, today first, then the rest of the week grouped by day. Changes are
 * counted in the heading and highlighted in yellow.
 */
export function MyWeek({
  entries,
  today,
  hasScope,
  failed,
  note,
}: {
  entries: readonly TodayEntry[];
  today: string;
  /** False when no team or child is linked to the account yet. */
  hasScope: boolean;
  failed: boolean;
  note?: ReactNode;
}) {
  const { today: now, later, changes } = splitWeek(entries, today);
  const days = [...new Set(later.map((e) => e.date))];
  return (
    <section
      aria-labelledby="oggi-t"
      className={`${WRAP} pt-5 lg:pt-8`}
      data-testid="home-today"
      data-scope="mine"
    >
      <Title
        id="oggi-t"
        kicker={
          changes > 0
            ? `${changes} ${changes === 1 ? "cambio" : "cambi"} da guardare`
            : "Le tue squadre"
        }
        more={
          <MoreLink to="/calendario" search={{ vista: "settimana" }}>
            Calendario
          </MoreLink>
        }
      >
        Oggi e questa settimana
      </Title>
      <div className={`${CARD} overflow-hidden`}>
        {failed ? (
          <Empty>
            Non riusciamo a leggere le tue squadre in questo momento. Riprova
            tra poco; il calendario completo resta disponibile.
          </Empty>
        ) : !hasScope ? (
          <Empty>
            Il tuo account non è ancora collegato a una squadra o a un ragazzo.
            Lo collega la segreteria: intanto trovi tutte le gare nel
            calendario.
          </Empty>
        ) : (
          <>
            <div data-testid="home-today-now">
              <h3 className="m-0 flex items-center gap-2 px-4 pb-1 pt-3 text-[12px] font-extrabold uppercase tracking-[0.12em] text-[#1556c4]">
                Oggi
              </h3>
              {now.length ? (
                <ul className="m-0 list-none p-0">
                  {now.map((e) => (
                    <EntryRow key={e.id} e={e} />
                  ))}
                </ul>
              ) : (
                <Empty>
                  Oggi niente gare né allenamenti per le tue squadre.
                </Empty>
              )}
            </div>
            <div
              className="border-t border-[#dbe5f1]"
              data-testid="home-today-week"
            >
              <h3 className="m-0 px-4 pb-1 pt-3 text-[12px] font-extrabold uppercase tracking-[0.12em] text-[#1556c4]">
                Nei prossimi giorni
              </h3>
              {days.length ? (
                days.map((d) => (
                  <DayGroup
                    key={d}
                    date={d}
                    today={today}
                    entries={later.filter((e) => e.date === d)}
                  />
                ))
              ) : (
                <Empty>
                  Nessun altro impegno in calendario questa settimana.
                </Empty>
              )}
            </div>
          </>
        )}
      </div>
      {note && (
        <p className="m-0 px-1 pt-2 text-[12.5px] leading-snug text-[#5a6b85]">
          {note}
        </p>
      )}
    </section>
  );
}

/* ------------------------------------------------------- quick actions */

const ACTION_ICON: Readonly<Record<ActionIcon, LucideIcon>> = {
  trial: Goal,
  ticket: Ticket,
  map: MapPin,
  card: CreditCard,
  install: Download,
  mail: Mail,
  callup: BadgeCheck,
  bus: Bus,
  calendar: CalendarDays,
  euro: Euro,
  docs: FileText,
  team: UsersRound,
  check: ClipboardCheck,
  sheet: ClipboardList,
  pitch: LandPlot,
  tasks: ListChecks,
  megaphone: Megaphone,
};

/** Up to six big buttons for this kind of person. */
export function QuickActions({
  audience,
  actions,
}: {
  audience: HomeAudience;
  actions: readonly QuickAction[];
}) {
  return (
    <section
      aria-labelledby="azioni-t"
      className={`${WRAP} pt-6 lg:pt-10`}
      data-testid="quick-actions"
      data-audience={audience}
    >
      <Title id="azioni-t" kicker={AUDIENCE_LABEL[audience]}>
        Vai subito a
      </Title>
      <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 lg:gap-4">
        {actions.map((a) => {
          const Icon = ACTION_ICON[a.icon];
          return (
            <li key={a.id} className="flex">
              <Link
                to={a.to as never}
                search={a.search as never}
                {...(a.hash ? { hash: a.hash } : {})}
                className={`scd-focus scd-lift group flex min-h-[112px] w-full flex-col justify-between gap-2 p-4 lg:min-h-[124px] lg:flex-row lg:items-center lg:justify-start lg:gap-4 lg:p-5 ${CARD} hover:bg-[#f4f7fb]`}
                data-action={a.id}
              >
                <span className="grid size-12 shrink-0 place-items-center rounded-[14px] bg-[#e6eefa] text-[#1556c4] lg:size-14">
                  <Icon
                    className="size-6 lg:size-7"
                    strokeWidth={1.9}
                    aria-hidden="true"
                  />
                </span>
                <span className="grid min-w-0 gap-0.5">
                  <b className="text-[16px] leading-tight text-[#0b1e3a] lg:text-[17px]">
                    {a.label}
                  </b>
                  <span className="text-[13px] leading-snug text-[#4a5d7a]">
                    {a.hint}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------- support */

const SUPPORT_ICON: Record<string, LucideIcon> = {
  partner: Handshake,
  seggiolino: Armchair,
  materiale: PackageOpen,
  lotteria: Ticket,
};

/**
 * "Sostieni il club" (C4): the actions that bring money to the club, right after the week. Navy band so it reads as
 * one block; the partner action carries the only yellow highlight. No prices or counts here: each page says them.
 */
export function SupportStrip({ actions }: { actions: readonly SupportAction[] }) {
  if (actions.length === 0) return null;
  return (
    <section
      aria-labelledby="sostieni-t"
      className={`${WRAP} pt-6 lg:pt-10`}
      data-testid="support-strip"
    >
      <div className="relative isolate overflow-hidden rounded-[22px] bg-[#0b2a5b] p-4 text-white sm:p-5 lg:p-7">
        <div
          aria-hidden="true"
          className="absolute -right-16 -top-20 -z-10 size-64 rounded-full bg-[#1556c4] opacity-40 blur-2xl"
        />
        <div className="flex flex-wrap items-end justify-between gap-2 pb-4">
          <div className="grid gap-1">
            <span className="text-[11.5px] font-extrabold uppercase tracking-[0.12em] text-[#ffd600]">
              Colico e Dervio crescono con voi
            </span>
            <h2
              id="sostieni-t"
              className="m-0 font-uv text-[24px] uppercase leading-none sm:text-[26px] lg:text-[30px]"
            >
              Sostieni il club
            </h2>
          </div>
          <p className="m-0 max-w-[46ch] text-[14px] leading-snug text-white/80">
            Aziende, famiglie e tifosi: ogni aiuto va a campi, attrezzature e ragazzi.
          </p>
        </div>
        <ul
          className={`m-0 grid list-none gap-3 p-0 ${actions.length > 3 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3"}`}
        >
          {actions.map((a) => {
            const Icon = SUPPORT_ICON[a.id] ?? Handshake;
            return (
              <li key={a.id} className="flex">
                <Link
                  to={a.to as never}
                  {...(a.hash ? { hash: a.hash } : {})}
                  data-support={a.id}
                  className={`scd-focus group flex min-h-[76px] w-full items-center gap-3 rounded-[16px] p-3.5 transition-colors duration-150 sm:min-h-[132px] sm:flex-col sm:items-start sm:justify-between lg:p-4 ${
                    a.primary
                      ? "bg-[#ffd600] text-[#0b1e3a] hover:brightness-95"
                      : "bg-white/[0.08] text-white ring-1 ring-white/15 hover:bg-white/[0.14]"
                  }`}
                >
                  <span
                    className={`grid size-11 shrink-0 place-items-center rounded-[12px] ${
                      a.primary ? "bg-[#0b2a5b] text-[#ffd600]" : "bg-white/10 text-[#ffd600]"
                    }`}
                  >
                    <Icon className="size-[22px]" strokeWidth={1.9} aria-hidden="true" />
                  </span>
                  <span className="grid min-w-0 flex-1 gap-0.5">
                    <b className="flex items-center gap-1 text-[16px] leading-tight lg:text-[17px]">
                      {a.label}
                      <ArrowRight
                        className="size-4 transition-transform duration-150 group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </b>
                    <span
                      className={`text-[13px] leading-snug ${a.primary ? "text-[#24385a]" : "text-white/80"}`}
                    >
                      {a.hint}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- results */

/**
 * Weekend results, only when a real source has them; standings are the official federation pages. A ColicoDerviese
 * win gets the "Vittoria" badge and a confetti burst (UD-134: only when we win).
 */
export function WeekendResults({ rows }: { rows: readonly ResultRow[] }) {
  if (rows.length === 0) return null;
  const standings = OFFICIAL_RESULT_LINKS.filter((l) => l.group);
  const wins = rows.filter(isClubWin).map((r) => r.id);
  return (
    <section
      aria-labelledby="risultati-t"
      className={`${WRAP} pt-6 lg:pt-10`}
      data-testid="weekend-results"
    >
      <Title id="risultati-t" kicker="Il weekend">
        Risultati
      </Title>
      <div
        className={`${CARD} relative grid gap-0 overflow-hidden lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]`}
      >
        {wins.length > 0 && <WinConfetti winIds={wins} />}
        <ul className="m-0 list-none divide-y divide-[#e6edf6] p-0">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex items-center gap-3 px-4 py-3"
              data-win={wins.includes(r.id) || undefined}
            >
              <span className="w-[86px] shrink-0 text-[12px] font-bold uppercase tracking-[0.04em] text-[#5a6b85]">
                {r.team}
              </span>
              <span className="min-w-0 flex-1 text-[14.5px] font-semibold leading-snug text-[#0b1e3a]">
                {venueCase(r.home)} – {venueCase(r.away)}
              </span>
              {wins.includes(r.id) && (
                <span className="shrink-0 rounded-full bg-[#ffd600] px-2.5 py-1 text-[11.5px] font-extrabold uppercase tracking-[0.06em] text-[#0b1e3a]">
                  Vittoria
                </span>
              )}
              <b className="shrink-0 font-title text-[22px] tabular-nums text-[#0b2a5b]">
                {r.homeGoals}–{r.awayGoals}
              </b>
            </li>
          ))}
        </ul>
        <div className="grid content-start gap-1 border-t border-[#e6edf6] bg-[#f4f7fb] px-4 py-3 lg:border-l lg:border-t-0">
          <span className="text-[12px] font-bold uppercase tracking-[0.1em] text-[#1556c4]">
            Classifiche ufficiali
          </span>
          {standings.map((l) => (
            <a
              key={l.id}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="scd-focus inline-flex min-h-11 items-center gap-1.5 text-[14px] font-semibold text-[#0b2a5b] hover:underline"
            >
              {l.label}
              <ExternalLink
                className="size-3.5 shrink-0 text-[#5a6b85]"
                aria-hidden="true"
              />
              <span className="sr-only">(apre gare.lnd.it)</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- the tip */

/** Tip of the day, in rotation between the tip-only characters and Iride (UD-121, UD-155). */
export function DailyTipCard({
  tip,
  signedIn,
}: {
  tip: DailyTip;
  signedIn: boolean;
}) {
  const p = TIP_PERSONA[tip.persona];
  const link = tip.link && (!tip.link.members || signedIn) ? tip.link : null;
  return (
    <section
      aria-labelledby="consiglio-t"
      className={`${WRAP} pt-6 lg:pt-10`}
      data-testid="daily-tip"
      data-persona={tip.persona}
    >
      <div
        className={`${CARD} flex flex-col gap-3 p-4 sm:flex-row sm:items-start lg:p-5`}
      >
        <span
          aria-hidden="true"
          className="grid size-14 shrink-0 place-items-center rounded-full bg-[#0b2a5b] font-uv text-[28px] leading-none text-[#ffd600]"
        >
          {p.initial}
        </span>
        <div className="grid min-w-0 flex-1 gap-1">
          <span className="text-[11.5px] font-extrabold uppercase tracking-[0.12em] text-[#1556c4]">
            Il consiglio del giorno · {p.name}, {p.role}
          </span>
          <h2
            id="consiglio-t"
            className="m-0 text-[18px] font-bold leading-snug text-[#0b1e3a]"
          >
            {tip.title}
          </h2>
          <p className="m-0 text-[14.5px] leading-snug text-[#3e5272]">
            {tip.text}
          </p>
          <p className="m-0 text-[12.5px] leading-snug text-[#5a6b85]">
            {tip.disclaimer}
          </p>
          {link && (
            <Link
              to={link.to as never}
              {...(link.hash ? { hash: link.hash } : {})}
              className="scd-focus inline-flex min-h-11 w-fit items-center gap-1 rounded-md text-[14.5px] font-bold text-[#1556c4]"
            >
              {link.label}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
