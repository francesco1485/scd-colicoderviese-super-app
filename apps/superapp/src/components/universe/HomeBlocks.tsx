import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarDays,
  Lock,
  MapPin,
  Share2,
  TrafficCone,
  Trophy,
} from "lucide-react";
import type { ReactNode } from "react";

import { titleCase, venueCase } from "@/lib/board-data";
import type { WeekItem } from "@/lib/home-week";
import {
  countdown,
  itemState,
  startMs,
  type HomeMode,
  type Team,
} from "@/lib/universe";

import { TeamCode } from "./TeamBar";

const CREST = "/media/brand/logo-scd.png";

/* ------------------------------------------------------------------ hero */

const Brush = ({
  className,
  color,
  delay,
}: {
  className: string;
  color: string;
  delay: string;
}) => (
  <svg
    className={`uv-brush ${className}`}
    viewBox="0 0 400 60"
    style={{ color, fill: color, animationDelay: delay }}
    aria-hidden="true"
  >
    <path d="M6 34C70 14 190 8 394 18L396 30C330 36 250 42 160 47C100 50 50 54 10 56Z" />
    <path
      d="M40 20C120 12 240 9 360 13"
      strokeWidth="3"
      fill="none"
      stroke="currentColor"
      opacity=".6"
    />
  </svg>
);

const MODE_TEXT: Record<HomeMode, (n: number) => string> = {
  settimana: () =>
    "Settimana di allenamenti: orari nel quadro della tua squadra",
  vigilia: (n) => `Vigilia: ${n} ${n === 1 ? "gara" : "gare"} in arrivo`,
  live: () => "Si gioca adesso",
  dopo: () => "Dopo gara: il risultato ufficiale arriva dal club",
};

export function HeroBand({
  mode,
  upcoming,
  children,
}: {
  mode: HomeMode;
  upcoming: number;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby="club-t"
      className="relative isolate overflow-hidden px-4 pb-6 pt-6 text-white lg:px-6 lg:pb-11 lg:pt-10"
      data-testid="home-hero"
      data-mode={mode}
    >
      <div
        aria-hidden="true"
        className="uv-hero-photo absolute inset-0 -z-30"
        style={{ backgroundImage: "url(/media/scd/lario-header.webp)" }}
      />
      <div aria-hidden="true" className="uv-lights absolute inset-0 -z-20">
        <i />
        <i />
      </div>
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <Brush
          className="-left-[15%] bottom-[-6px] w-[130%] -rotate-[5deg] lg:bottom-[-96px] lg:w-[105%]"
          color="#ffd21f"
          delay=".25s"
        />
        <Brush
          className="-right-[30%] top-2 w-[70%] -rotate-[20deg] lg:-right-[4%] lg:w-[40%]"
          color="#ffd21f"
          delay=".45s"
        />
        <Brush
          className="-left-[35%] bottom-[-24px] w-[90%] rotate-[4deg] lg:bottom-[-70px]"
          color="#1b95d3"
          delay=".65s"
        />
      </div>
      <div className="mx-auto grid max-w-[1200px] gap-[18px] lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-10">
        <div>
          <div className="flex items-center gap-3">
            <img
              src={CREST}
              alt="Stemma S.C.D. ColicoDerviese"
              className="uv-pop h-auto w-16 shrink-0 drop-shadow-[0_0_16px_rgb(255_255_255/0.35)] md:w-24 lg:w-32"
              style={{ animationDelay: ".15s" }}
            />
            <div>
              <span className="font-uv-script inline-block -rotate-6 text-[24px] text-[var(--uv-gold)] md:text-[34px] lg:text-[40px]">
                S.C.D.
              </span>
              <h1
                id="club-t"
                className="font-uv uv-slam text-[40px] uppercase leading-[0.84] [text-shadow:0_3px_0_rgb(0_0_0/0.28)] md:text-[64px] lg:text-[88px]"
                style={{ animationDelay: ".35s" }}
              >
                Colico
                <span
                  className="uv-slam block text-[var(--uv-gold)] [text-shadow:0_0_2px_var(--uv-night),0_3px_0_var(--uv-night)]"
                  style={{ animationDelay: ".55s" }}
                >
                  Derviese
                </span>
              </h1>
            </div>
          </div>
          <p className="mt-2 font-uv text-[14px] uppercase tracking-[0.16em] [text-shadow:0_2px_6px_var(--uv-night)] md:text-[16px] md:tracking-[0.24em]">
            Sport
            <b className="mx-[.3em] text-[var(--uv-gold)]" aria-hidden="true">
              •
            </b>
            Persone
            <b className="mx-[.3em] text-[var(--uv-gold)]" aria-hidden="true">
              •
            </b>
            Territorio
          </p>
          <p className="font-uv-script mt-3 hidden -rotate-[4deg] text-[34px] leading-none text-[var(--uv-gold)] [text-shadow:0_0_3px_var(--uv-night),0_3px_0_var(--uv-night)] md:block lg:text-[38px]">
            Sempre insieme, più lontano
          </p>
          <p
            role="status"
            className="mt-[14px] lg:mt-6 inline-flex items-center gap-2 rounded-full border-[1.5px] border-white/30 bg-white/10 py-2 pl-[10px] pr-[14px] text-[14.5px] font-extrabold backdrop-blur-md"
            data-testid="home-mode"
          >
            <i
              aria-hidden="true"
              className={`size-[10px] rounded-full ${mode === "live" ? "uv-blink bg-[var(--scd-red)]" : mode === "settimana" ? "bg-[#8fd3ff]" : "bg-[var(--uv-gold)]"}`}
            />
            {MODE_TEXT[mode](upcoming)}
          </p>
        </div>
        {children}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- ticket */

type TicketProps = {
  item: WeekItem | null;
  team: Team | undefined;
  nowMs: number;
  going: boolean;
  onGoing: () => void;
  onShare: () => void;
  emptyTeam?: Team | undefined;
};

export function NextTicket({
  item,
  team,
  nowMs,
  going,
  onGoing,
  onShare,
  emptyTeam,
}: TicketProps) {
  const shell =
    "uv-drop relative grid gap-3 rounded-[20px] bg-white px-4 pb-4 pt-[26px] text-[var(--scd-ink)] shadow-[0_20px_40px_rgb(0_8_30/0.45),6px_6px_0_var(--uv-gold)] lg:-rotate-[1.5deg] lg:justify-self-end lg:w-full lg:max-w-[460px]";
  if (!item) {
    return (
      <article className={shell} data-testid="next-match">
        <span className="uv-notch absolute -top-[15px] left-[14px] flex h-8 items-center rounded-l-[8px] bg-[var(--uv-gold)] pl-[14px] pr-[18px] font-uv text-[17px] uppercase tracking-[0.06em] text-[var(--uv-night)]">
          Prossima gara
        </span>
        <img
          src={CREST}
          alt=""
          className="uv-float absolute -top-[30px] right-[6px] w-[62px] drop-shadow-[0_10px_14px_rgb(0_0_0/0.35)]"
        />
        <b className="pr-14 font-uv text-[30px] uppercase leading-[0.92]">
          {emptyTeam ? emptyTeam.label.replace(/\s·\s/g, " ") : "Nessuna gara"}
        </b>
        <p className="text-[15px] leading-snug text-[var(--scd-sub)]">
          Nessuna gara nel calendario pubblico per questa selezione. Gli
          allenamenti sono nel quadro settimanale.
        </p>
        <Link
          to="/allenamenti"
          className="flex min-h-[50px] items-center justify-center gap-2 rounded-[14px] bg-[var(--uv-night)] font-uv text-[19px] uppercase tracking-[0.06em] text-[var(--uv-gold)]"
        >
          Vedi gli allenamenti{" "}
          <ArrowRight className="size-5" aria-hidden="true" />
        </Link>
      </article>
    );
  }
  const st = itemState(item, nowMs);
  const s = startMs(item);
  const cd = s !== null ? countdown(s, nowMs) : null;
  const live = st === "live";
  const home = item.homeAway === "CASA";
  const day = new Intl.DateTimeFormat("it-IT", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
  }).format(new Date(`${item.date}T12:00:00Z`));
  return (
    <article className={shell} data-testid="next-match" data-state={st}>
      <span
        className={`uv-notch absolute -top-[15px] left-[14px] flex h-8 items-center gap-[6px] rounded-l-[8px] pl-[14px] pr-[18px] font-uv text-[17px] uppercase tracking-[0.06em] ${live ? "bg-[var(--scd-red)] text-white" : "bg-[var(--uv-gold)] text-[var(--uv-night)]"}`}
      >
        {live && (
          <i
            aria-hidden="true"
            className="uv-blink size-[9px] rounded-full bg-white"
          />
        )}
        {live ? "In campo ora" : "Prossima gara"}
      </span>
      <img
        src={CREST}
        alt=""
        className="uv-float absolute -top-[30px] right-[6px] w-[62px] drop-shadow-[0_10px_14px_rgb(0_0_0/0.35)] lg:-top-10 lg:w-[78px]"
      />
      <div className="pr-14">
        <b className="flex items-center gap-2 font-uv text-[30px] uppercase leading-[0.92]">
          {team && <TeamCode team={team} size="sm" />}
          <span>
            {item.groupLabel.replace(/\s·\s/g, " ") || "S.C.D. ColicoDerviese"}
          </span>
        </b>
      </div>
      <div className="text-[17px] font-black leading-[1.25]">
        {titleCase(item.title)}
        <small className="mt-[2px] flex items-center gap-1 text-[14px] font-medium text-[var(--scd-sub)]">
          <MapPin className="size-4 shrink-0" aria-hidden="true" />
          {venueCase(item.venue) || "Sede da definire"}
        </small>
      </div>
      <div className="flex flex-wrap items-center gap-[14px]">
        <div className="min-w-[92px] rounded-[12px] bg-[var(--uv-night)] px-3 py-[7px] text-center text-white">
          <small className="block font-uv text-[13px] uppercase tracking-[0.12em] text-[#a9c8ff]">
            {day}
          </small>
          <b className="block font-uv text-[36px] leading-[0.95] text-[var(--uv-gold)]">
            {item.time || "--:--"}
          </b>
        </div>
        <div className="font-uv text-[30px] leading-none tabular-nums">
          {live ? "Live" : (cd ?? "—")}
          <small className="mt-[2px] block font-sans text-[12.5px] font-bold text-[var(--scd-sub)]">
            {live
              ? "in corso ora"
              : cd
                ? "al calcio d'inizio"
                : "orario da definire"}
          </small>
        </div>
        {item.homeAway && (
          <span
            className={`-rotate-[7deg] rounded-[6px] border-[2.5px] px-[9px] py-[6px] font-uv text-[13px] uppercase tracking-[0.1em] ${home ? "border-[#0b8a43] text-[#0b8a43]" : "border-[var(--uv-royal)] text-[var(--uv-royal)]"}`}
          >
            {home ? "Casa" : "Trasferta"}
          </span>
        )}
        {!item.certain && (
          <span className="rounded-[5px] bg-[#fff3c4] px-[6px] py-[2px] text-[11px] font-bold uppercase text-[#7a5200]">
            orario o sede da confermare
          </span>
        )}
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <button
          type="button"
          onClick={onGoing}
          aria-pressed={going}
          className={`min-h-[50px] rounded-[14px] font-uv text-[20px] uppercase tracking-[0.06em] transition-transform active:translate-y-[3px] ${going ? "bg-[#0b8a43] text-white shadow-[0_4px_0_#05532a]" : "bg-[var(--uv-night)] text-[var(--uv-gold)] shadow-[0_4px_0_#000c2a]"}`}
        >
          {going ? "Ci sarò ✓" : "Ci sarò"}
        </button>
        <button
          type="button"
          onClick={onShare}
          className="flex min-h-[50px] items-center gap-[6px] rounded-[14px] border-2 border-[var(--scd-line)] px-[14px] text-[15px] font-extrabold"
        >
          <Share2 className="size-5" aria-hidden="true" />
          Condividi
        </button>
      </div>
      {going && (
        <span
          aria-hidden="true"
          className="uv-thump pointer-events-none absolute bottom-[62px] right-4 rounded-[6px] border-[3px] border-[#0b8a43] bg-white px-[9px] py-[6px] font-uv text-[17px] uppercase tracking-[0.1em] text-[#0b8a43]"
        >
          Ci sono!
        </span>
      )}
      <Link
        to="/sponsor"
        className="flex items-center justify-between gap-2 rounded-[12px] border-2 border-dashed border-[var(--scd-line)] px-3 py-[9px] text-[13px] font-bold text-[var(--scd-sub)]"
      >
        <span>Gara presentata da</span>
        <b className="font-black text-[var(--uv-royal)]">
          Spazio partner disponibile
        </b>
      </Link>
    </article>
  );
}

/* -------------------------------------------------------------- fixtures */

export type FixtureFilter = "all" | "today" | "tomorrow" | "live";

type FixturesProps = {
  items: readonly WeekItem[];
  days: readonly string[];
  today: string;
  tomorrow: string;
  nowMs: number;
  filter: FixtureFilter;
  day: string | null;
  teamOf: (item: WeekItem) => Team | undefined;
  onFilter: (f: FixtureFilter) => void;
  onDay: (d: string | null) => void;
};

const WD = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
const longDay = (iso: string) =>
  new Intl.DateTimeFormat("it-IT", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${iso}T12:00:00Z`));

/** Lista gare densa (stile sportsbook, senza quote): filtri, striscia giorni, righe per giorno. */
export function Fixtures({
  items,
  days,
  today,
  tomorrow,
  nowMs,
  filter,
  day,
  teamOf,
  onFilter,
  onDay,
}: FixturesProps) {
  const by: Record<FixtureFilter, WeekItem[]> = {
    all: [...items],
    today: items.filter((i) => i.date === today),
    tomorrow: items.filter((i) => i.date === tomorrow),
    live: items.filter((i) => itemState(i, nowMs) === "live"),
  };
  let rows = by[filter];
  if (day && filter === "all") rows = rows.filter((i) => i.date === day);
  const groups = rows.reduce<Record<string, WeekItem[]>>((acc, i) => {
    (acc[i.date] ||= []).push(i);
    return acc;
  }, {});
  const next = items.find((i) => itemState(i, nowMs) === "next");
  const tabs: [FixtureFilter, string][] = [
    ["all", "Tutte"],
    ["today", "Oggi"],
    ["tomorrow", "Domani"],
    ["live", "Live"],
  ];
  return (
    <section
      className="overflow-hidden rounded-[18px] bg-white text-[var(--scd-ink)] shadow-[0_14px_28px_rgb(0_10_40/0.28)]"
      aria-label="Gare della settimana"
      data-testid="fixtures"
    >
      <div
        className="flex gap-[6px] px-3 pt-3"
        role="group"
        aria-label="Filtra le gare"
      >
        {tabs.map(([k, l]) => (
          <button
            key={k}
            type="button"
            aria-pressed={filter === k}
            onClick={() => {
              onFilter(k);
              onDay(null);
            }}
            className={`flex min-h-11 min-w-0 flex-1 items-center justify-center gap-[6px] rounded-[12px] border-2 px-1 text-[14.5px] font-extrabold ${filter === k ? "border-[var(--uv-night)] bg-[var(--uv-night)] text-[var(--uv-gold)]" : "border-[var(--scd-line)]"}`}
          >
            {k === "live" && (
              <span
                aria-hidden="true"
                className="size-2 rounded-full bg-[var(--scd-red)]"
              />
            )}
            {l}
            <span
              className={`grid h-5 min-w-5 place-items-center rounded-full px-[5px] text-[12px] ${filter === k ? "bg-[var(--uv-gold)] text-[var(--uv-night)]" : "bg-[#eef4ff]"}`}
            >
              {by[k].length}
            </span>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 px-3 pb-1 pt-[10px]">
        {days.map((d) => {
          const e = items.filter((i) => i.date === d);
          const dt = new Date(`${d}T12:00:00Z`);
          return (
            <button
              key={d}
              type="button"
              aria-pressed={day === d}
              onClick={() => {
                onFilter("all");
                onDay(day === d ? null : d);
              }}
              aria-label={`${WD[dt.getUTCDay()]} ${dt.getUTCDate()}: ${e.length} ${e.length === 1 ? "appuntamento" : "appuntamenti"}`}
              className={`min-h-14 rounded-[12px] py-[6px] text-center ${day === d ? "bg-[var(--uv-night)] text-white" : "bg-[#eef4ff]"}`}
            >
              <small
                className={`block font-uv text-[12px] uppercase tracking-[0.08em] ${day === d ? "text-[var(--uv-gold)]" : "text-[var(--scd-sub)]"}`}
              >
                {WD[dt.getUTCDay()]}
              </small>
              <b className="block font-uv text-[22px] leading-[1.05]">
                {dt.getUTCDate()}
              </b>
              <i className="flex h-[6px] justify-center gap-[3px]">
                {e.slice(0, 4).map((v) => (
                  <u
                    key={v.id}
                    className={`size-[6px] rounded-full ${v.homeAway === "FUORI" ? "bg-[var(--uv-royal)]" : "bg-[#0b8a43]"}`}
                  />
                ))}
              </i>
            </button>
          );
        })}
      </div>
      {rows.length === 0 ? (
        <div className="px-4 py-[22px] text-[15px] text-[var(--scd-sub)]">
          <b className="mb-1 block text-[16px] text-[var(--scd-ink)]">
            {filter === "live"
              ? "Nessuna squadra in campo ora."
              : "Nessuna gara in questo filtro."}
          </b>
          {next
            ? `La prossima: ${next.groupLabel.replace(/\s·\s/g, " ")}, ${longDay(next.date)} alle ${next.time || "orario da definire"}.`
            : "Gli allenamenti sono nel quadro settimanale della squadra."}
        </div>
      ) : (
        Object.entries(groups).map(([d, list]) => (
          <div key={d}>
            <p className="sticky top-14 z-[2] border-b border-[var(--scd-line)] bg-white px-[14px] pb-[6px] pt-3 font-uv text-[17px] uppercase tracking-[0.06em] text-[var(--scd-sub)] lg:top-[113px]">
              {d === today ? "Oggi, " : d === tomorrow ? "Domani, " : ""}
              {longDay(d)}
            </p>
            {list.map((i) => {
              const st = itemState(i, nowMs);
              const t = teamOf(i);
              return (
                <div
                  key={i.id}
                  className={`grid min-h-[68px] grid-cols-[52px_46px_1fr_auto] items-center gap-[10px] border-b border-[var(--scd-line)] px-[14px] py-[10px] ${st === "done" ? "opacity-60" : ""}`}
                >
                  <span className="font-uv text-[22px] leading-none tabular-nums">
                    {st === "live" ? (
                      <span className="text-[var(--scd-red)]">LIVE</span>
                    ) : (
                      i.time || "--:--"
                    )}
                    <small className="block font-sans text-[11.5px] font-bold text-[var(--scd-sub)]">
                      {st === "done"
                        ? "giocata"
                        : st === "live"
                          ? "in corso"
                          : i.certain
                            ? ""
                            : "da conf."}
                    </small>
                  </span>
                  {t ? (
                    <TeamCode team={t} />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="grid size-[38px] place-items-center rounded-[8px] bg-[#eef4ff]"
                    >
                      <Trophy className="size-5 text-[var(--uv-royal)]" />
                    </span>
                  )}
                  <span className="min-w-0">
                    <b className="block text-[15px] leading-tight">
                      {i.groupLabel.replace(/\s·\s/g, " ") || i.kind}
                    </b>
                    <span className="mt-[2px] block text-[13.5px] leading-tight text-[var(--scd-sub)]">
                      {titleCase(i.title)}
                      <br />
                      {venueCase(i.venue)}
                    </span>
                  </span>
                  {i.homeAway && (
                    <span
                      className={`rounded-[6px] px-2 py-[6px] font-uv text-[12.5px] tracking-[0.08em] text-white ${i.homeAway === "CASA" ? "bg-[#0b8a43]" : "bg-[var(--uv-royal)]"}`}
                    >
                      {i.homeAway === "CASA" ? "CASA" : "FUORI"}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))
      )}
    </section>
  );
}

/* ----------------------------------------------------------- shortcuts */

export function Shortcuts() {
  const ring =
    "grid size-[58px] place-items-center overflow-hidden rounded-full border-[3px] border-[var(--uv-gold)] bg-[radial-gradient(circle_at_35%_30%,#1a5fd0,var(--uv-night))] shadow-[0_8px_16px_rgb(0_0_0/0.3)] transition-transform group-hover:-translate-y-[3px] group-hover:-rotate-6";
  const item =
    "group flex min-h-12 flex-col items-center gap-[7px] text-center text-[13px] font-bold leading-[1.15] text-white";
  return (
    <nav
      aria-label="Scorciatoie"
      className="mt-[22px] grid grid-cols-5 gap-1 md:flex md:gap-[18px]"
    >
      <Link to="/calendario" className={item}>
        <span className={ring}>
          <CalendarDays className="size-[26px]" aria-hidden="true" />
        </span>
        Calendario
      </Link>
      <Link to="/allenamenti" className={item}>
        <span className={ring}>
          <TrafficCone className="size-[26px]" aria-hidden="true" />
        </span>
        Allenamenti
      </Link>
      <Link to="/core/impianti-calendari" className={item}>
        <span className={ring}>
          <MapPin className="size-[26px]" aria-hidden="true" />
        </span>
        Campi
      </Link>
      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent("crovi:open"))}
        className={item}
      >
        <span className={ring}>
          <img
            src="/media/crovi/crovi-cut.webp"
            alt=""
            className="size-full object-cover object-[50%_20%]"
          />
        </span>
        Chiedi a Crovi
      </button>
      <Link to="/aree" className={item}>
        <span className={ring}>
          <Lock className="size-[26px]" aria-hidden="true" />
        </span>
        Gestionale
      </Link>
    </nav>
  );
}

export function SectionTitle({
  id,
  children,
  more,
}: {
  id?: string;
  children: ReactNode;
  more?: ReactNode;
}) {
  return (
    <div className="mb-3 mt-[26px] flex items-end justify-between gap-3 text-white">
      <h2
        id={id}
        className="uv-underline pb-[6px] font-uv text-[30px] uppercase leading-[0.9]"
      >
        {children}
      </h2>
      {more}
    </div>
  );
}
