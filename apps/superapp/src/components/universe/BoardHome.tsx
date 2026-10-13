/**
 * Home pubblica secondo la tavola madre approvata (VR-009, UD-088): testata blu con il Lario, stemma sempre visibile,
 * COLICODERVIESE su una riga, schede bianche arrotondate, icone colorate con i numeri, "Prossima gara" con il blocco
 * data, sponsor in riquadri. Solo dati reali: calendario ufficiale, sponsor 2026/27, eventi già pubblicati.
 */
import { Link } from "@tanstack/react-router";
import {
  Bell,
  CalendarDays,
  ChevronRight,
  MapPin,
  Share2,
  Shield,
  Trophy,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";

import { ClubCrestOfficial } from "@/components/SiteChrome";
import { ConeIcon, BallIcon } from "@/components/scd/icons";
import { venueCase } from "@/lib/board-data";
import type { WeekItem } from "@/lib/home-week";
import { sponsorLabel, type Sponsor } from "@/lib/sponsors";
import { countdown, itemState, startMs, type Team } from "@/lib/universe";

const LARIO = "/media/scd/lario-header.webp";
const CENTRO = "/media/scd/hero-colico.webp";

const wk = (d: string) =>
  new Intl.DateTimeFormat("it-IT", { timeZone: "UTC", weekday: "short" })
    .format(new Date(`${d}T12:00:00Z`))
    .replace(".", "")
    .toUpperCase();
const dd = (d: string) => String(Number(d.slice(8, 10)));
const mon = (d: string) =>
  new Intl.DateTimeFormat("it-IT", { timeZone: "UTC", month: "short" })
    .format(new Date(`${d}T12:00:00Z`))
    .replace(".", "")
    .toUpperCase();

/** Wordmark della tavola: S.C.D. piccolo, COLICO bianco e DERVIESE giallo sulla stessa riga. */
export function Wordmark({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <span className="grid leading-none text-white">
      <span
        className={`font-uv tracking-[0.12em] text-white/90 ${size === "lg" ? "text-[15px]" : "text-[11px]"}`}
      >
        S.C.D.
      </span>
      <span
        className={`whitespace-nowrap font-uv uppercase [text-shadow:0_2px_0_rgb(0_0_0/0.25)] ${size === "lg" ? "text-[clamp(30px,8vw,44px)]" : "text-[24px]"}`}
      >
        Colico<span className="text-[var(--uv-gold)]">derviese</span>
      </span>
    </span>
  );
}

/** Testata blu con il lago: su telefono porta stemma, nome e campanella; su tutti gli schermi ospita le storie. */
export function LarioHeader({
  onEnter,
  children,
}: {
  onEnter: () => void;
  children?: ReactNode;
}) {
  return (
    <header
      className="relative isolate overflow-hidden bg-[#06306f] text-white"
      data-testid="board-header"
    >
      <img
        src={LARIO}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 -z-10 size-full object-cover object-[center_30%] opacity-70"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgb(4_32_86/0.55)_0%,rgb(6_48_111/0.75)_70%,#06306f_100%)]"
      />
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-3 px-4 pt-3 lg:hidden">
        <Link
          to="/"
          className="scd-focus flex min-w-0 items-center gap-2.5 rounded-md"
          aria-label="S.C.D. ColicoDerviese, Home"
        >
          <ClubCrestOfficial size={46} />
          <Wordmark />
        </Link>
        <button
          type="button"
          onClick={onEnter}
          className="scd-focus relative grid size-11 place-items-center rounded-full bg-white/12"
          aria-label="Entra nelle aree della società"
          data-testid="home-enter"
        >
          <Bell className="size-6" aria-hidden="true" />
          <span
            aria-hidden="true"
            className="absolute right-2 top-2 size-2.5 rounded-full border-2 border-[#06306f] bg-[var(--uv-gold)]"
          />
        </button>
      </div>
      {children}
    </header>
  );
}

/**
 * Testata della tavola madre (VR-009, UD-088): stemma grande, S.C.D. COLICODERVIESE con la riga tricolore, il Lario
 * dietro, Sky con la divisa ufficiale, "Sport · Persone · Territorio" e, in una frase, a cosa serve l'app.
 * I numeri della settimana sono quelli del calendario ufficiale.
 */
export function BoardHero({
  games,
  home,
  onEnter,
  signedIn,
}: {
  games: number;
  home: number;
  onEnter: () => void;
  signedIn: boolean;
}) {
  return (
    <header
      className="relative isolate overflow-hidden bg-[#062a66] text-white"
      data-testid="board-hero"
    >
      <img
        src={CENTRO}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 -z-20 size-full object-cover object-[center_42%]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgb(4_26_70/0.82)_0%,rgb(5_38_96/0.62)_45%,rgb(6_42_102/0.92)_88%,#062a66_100%)] lg:bg-[linear-gradient(90deg,rgb(4_26_70/0.95)_0%,rgb(5_38_96/0.78)_48%,rgb(6_42_102/0.25)_100%)]"
      />
      <div
        aria-hidden="true"
        className="absolute -left-10 -top-6 -z-10 h-40 w-40 rotate-[-35deg] bg-[repeating-linear-gradient(90deg,var(--uv-gold)_0_10px,transparent_10px_22px)] opacity-80 lg:h-64 lg:w-64"
      />
      <div className="relative mx-auto max-w-[1200px] px-4 pb-4 pt-3 lg:px-6 lg:pb-10 lg:pt-8">
        <div className="flex items-start justify-between gap-3 lg:hidden">
          <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-white/80">
            L'app ufficiale del club
          </span>
          <button
            type="button"
            onClick={onEnter}
            className="scd-focus relative grid size-11 shrink-0 place-items-center rounded-full bg-white/15"
            aria-label={signedIn ? "Avvisi e aree" : "Entra o registrati"}
            data-testid="home-enter"
          >
            <Bell className="size-6" aria-hidden="true" />
            <span
              aria-hidden="true"
              className="absolute right-2 top-2 size-2.5 rounded-full border-2 border-[#062a66] bg-[var(--uv-gold)]"
            />
          </button>
        </div>

        <div className="mt-1 flex items-center gap-3 lg:mt-0 lg:gap-6">
          <span className="shrink-0 drop-shadow-[0_6px_14px_rgb(0_0_0/0.35)]">
            <span className="lg:hidden">
              <ClubCrestOfficial size={80} />
            </span>
            <span className="hidden lg:inline">
              <ClubCrestOfficial size={150} />
            </span>
          </span>
          <div className="min-w-0">
            <p className="m-0 font-uv text-[18px] tracking-[0.18em] text-white/90 lg:text-[28px]">
              S.C.D.
            </p>
            <h1 className="m-0 whitespace-nowrap font-uv text-[clamp(38px,11vw,96px)] uppercase leading-[0.92] [text-shadow:0_3px_0_rgb(0_0_0/0.3)]">
              Colico<span className="text-[var(--uv-gold)]">derviese</span>
            </h1>
            <span
              aria-hidden="true"
              className="mt-2 block h-[5px] w-full max-w-[420px] rounded-full bg-[linear-gradient(90deg,#1f9d55_0_33%,#f4f6fa_33%_66%,#d62b33_66%)]"
            />
          </div>
        </div>

        <div className="relative mt-3 grid gap-2.5 pr-[104px] lg:mt-6 lg:gap-3 lg:max-w-[640px] lg:pr-0">
          <p className="m-0 mb-1 -rotate-[4deg] font-uv text-[21px] italic leading-tight text-[var(--uv-gold)] lg:mb-3 lg:text-[34px]">
            Sport · Persone · Territorio
            <span className="block text-white">Sempre insieme!</span>
          </p>
          <p className="m-0 max-w-[46ch] text-[14.5px] font-medium leading-snug text-white/95 lg:text-[19px]">
            Partite, allenamenti, convocazioni e vita del club per famiglie,
            atleti e tifosi di Colico e Dervio. Tutto in un'app.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {games > 0 ? (
              <>
                <span className="whitespace-nowrap rounded-full bg-[var(--uv-gold)] px-3 py-1 text-[13.5px] font-extrabold text-[#0b2a5b] lg:text-[14px]">
                  {games} {games === 1 ? "gara" : "gare"} questa settimana
                </span>
                <span className="rounded-full bg-white/15 px-3 py-1 text-[14px] font-bold">
                  {home} in casa
                </span>
              </>
            ) : (
              <span className="rounded-full bg-white/15 px-3 py-1 text-[14px] font-bold">
                Settimana di allenamenti
              </span>
            )}
          </div>
          <div className="mt-1 flex gap-2">
            <button
              type="button"
              onClick={onEnter}
              className="scd-focus inline-flex h-11 items-center whitespace-nowrap rounded-[14px] bg-[var(--uv-gold)] px-4 text-[15px] font-extrabold text-[#0b2a5b] shadow-[0_3px_0_#b89a00] lg:h-12 lg:px-5 lg:text-[16px]"
            >
              {signedIn ? "La mia area" : "Entra o registrati"}
            </button>
            <a
              href="/calendario"
              className="scd-focus inline-flex h-11 items-center whitespace-nowrap rounded-[14px] border-2 border-white/70 px-4 text-[15px] font-bold text-white lg:h-12 lg:px-5 lg:text-[16px]"
            >
              Calendario
            </a>
          </div>
        </div>
      </div>
      <img
        src="/media/brand/sky-atv-cut.webp"
        alt="Sky, la mascotte della ColicoDerviese"
        className="pointer-events-none absolute bottom-[-64px] right-[-14px] h-[230px] w-auto object-contain object-top drop-shadow-[0_10px_20px_rgb(0_0_0/0.35)] lg:bottom-[-150px] lg:right-[6%] lg:h-[520px]"
      />
    </header>
  );
}

/** "Entra nella tua area": le quattro porte della tavola (atleta, famiglia, staff) più i tifosi. */
export function RoleDoors() {
  const doors: Array<{
    to: string;
    label: string;
    sub: string;
    bg: string;
    fg: string;
  }> = [
    {
      to: "/famiglia",
      label: "Famiglia",
      sub: "Figli, impegni, richieste",
      bg: "#ffd600",
      fg: "#0b2a5b",
    },
    {
      to: "/la-mia-scd",
      label: "Atleta",
      sub: "Convocazioni e giochi",
      bg: "#1556c4",
      fg: "#ffffff",
    },
    {
      to: "/aree",
      label: "Staff",
      sub: "Gestionale del club",
      bg: "#0b2a5b",
      fg: "#ffffff",
    },
    {
      to: "/squadre",
      label: "Tifoso",
      sub: "Segui le squadre",
      bg: "#0f9d58",
      fg: "#ffffff",
    },
  ];
  return (
    <Card
      className="p-3"
      data-testid="role-doors"
      aria-label="Entra nella tua area"
    >
      <h2 className="m-0 px-1 pb-2 text-[17px] font-extrabold text-[#0b2a5b]">
        Entra nella tua area
      </h2>
      <ul className="m-0 grid list-none grid-cols-2 gap-2 p-0">
        {doors.map((d) => (
          <li key={d.label}>
            <a
              href={d.to}
              className="scd-focus flex min-h-[74px] flex-col justify-center rounded-[14px] px-3 py-2"
              style={{ background: d.bg, color: d.fg }}
            >
              <b className="font-uv text-[22px] uppercase leading-none">
                {d.label}
              </b>
              <span className="mt-1 text-[12.5px] font-semibold opacity-90">
                {d.sub}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Card({
  children,
  className = "",
  ...rest
}: { children: ReactNode; className?: string } & Record<string, unknown>) {
  return (
    <section
      className={`rounded-[18px] bg-white shadow-[0_6px_20px_-10px_rgb(6_42_99/0.35)] ${className}`}
      {...rest}
    >
      {children}
    </section>
  );
}

function CardHead({
  title,
  icon,
  more,
}: {
  title: string;
  icon?: ReactNode;
  more?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 px-4 pb-2 pt-3.5">
      <h2 className="m-0 flex items-center gap-2 text-[17px] font-extrabold text-[#0b2a5b]">
        {icon}
        {title}
      </h2>
      {more}
    </div>
  );
}

function More({
  to,
  children = "Vedi tutti",
}: {
  to: string;
  children?: ReactNode;
}) {
  return (
    <a
      href={to}
      className="scd-focus inline-flex min-h-11 items-center gap-0.5 rounded-md text-[14px] font-bold text-[#1556c4]"
    >
      {children}
      <ChevronRight className="size-4" aria-hidden="true" />
    </a>
  );
}

/** "Questa settimana": il centro sportivo sul lago, con i numeri veri della settimana. */
export function WeekHero({ games, home }: { games: number; home: number }) {
  return (
    <section
      className="relative isolate min-h-[168px] overflow-hidden rounded-[18px] bg-[#0b3a8c] text-white shadow-[0_10px_26px_-12px_rgb(6_42_99/0.6)] lg:min-h-[230px]"
      data-testid="week-hero"
    >
      <img
        src={CENTRO}
        alt="Il centro sportivo di Colico sul lago"
        className="absolute inset-0 -z-10 size-full object-cover object-[center_40%]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgb(4_30_80/0.92)_0%,rgb(4_30_80/0.6)_55%,rgb(4_30_80/0.1)_100%)]"
      />
      <div className="grid max-w-[30ch] gap-1.5 p-4 lg:p-6">
        <h2 className="m-0 font-uv text-[30px] uppercase leading-none lg:text-[40px]">
          Questa settimana
        </h2>
        <p className="m-0 text-[15px] leading-snug text-white/90">
          Sport, crescita e comunità nel cuore dell'Alto Lario.
        </p>
        {games > 0 && (
          <p className="m-0 mt-1 flex flex-wrap gap-2 text-[13.5px] font-bold">
            <span className="rounded-full bg-[var(--uv-gold)] px-2.5 py-1 text-[#0b2a5b]">
              {games} {games === 1 ? "gara" : "gare"}
            </span>
            <span className="rounded-full bg-white/15 px-2.5 py-1">
              {home} in casa
            </span>
          </p>
        )}
      </div>
    </section>
  );
}

/** Le quattro icone della tavola, con i conteggi veri dove esistono. */
export function QuickTiles({
  games,
  events,
}: {
  games: number;
  events: number;
}) {
  const tiles: Array<{
    to: string;
    label: string;
    icon: ReactNode;
    count?: number;
  }> = [
    {
      to: "/calendario",
      label: "Gare",
      icon: <BallIcon className="size-8 text-[#0b2a5b]" />,
      count: games,
    },
    {
      to: "/allenamenti",
      label: "Allenamenti",
      icon: <ConeIcon className="size-8 text-[#f26b1d]" />,
    },
    {
      to: "/eventi",
      label: "Eventi",
      icon: (
        <CalendarDays
          className="size-8 text-[#1556c4]"
          strokeWidth={2}
          aria-hidden="true"
        />
      ),
      count: events,
    },
    {
      to: "/squadre",
      label: "Squadre",
      icon: (
        <Users
          className="size-8 text-[#0f9d58]"
          strokeWidth={2}
          aria-hidden="true"
        />
      ),
    },
  ];
  return (
    <Card
      className="grid grid-cols-4 divide-x divide-[#e6edf6] px-1 py-3"
      aria-label="Accesso rapido"
      data-testid="quick-tiles"
    >
      {tiles.map((t) => (
        <a
          key={t.to}
          href={t.to}
          className="scd-focus flex min-h-[78px] flex-col items-center justify-center gap-1.5 rounded-[12px] px-1 text-[#0b2a5b] hover:bg-[#f2f6fc]"
        >
          <span className="flex items-center gap-1">
            {t.icon}
            {t.count ? (
              <b className="font-uv text-[26px] leading-none">{t.count}</b>
            ) : null}
          </span>
          <span className="text-[13px] font-bold">{t.label}</span>
        </a>
      ))}
    </Card>
  );
}

function DateBlock({
  date,
  time,
  tone = "navy",
}: {
  date: string;
  time: string;
  tone?: "navy" | "light";
}) {
  const dark = tone === "navy";
  return (
    <span
      className={`grid w-[68px] shrink-0 place-items-center rounded-[12px] py-2 text-center leading-none ${dark ? "bg-[#0b2a5b] text-white" : "bg-[#eef4fc] text-[#0b2a5b]"}`}
    >
      <span className="text-[12px] font-bold tracking-wide">{wk(date)}</span>
      <span className="font-uv text-[32px]">{dd(date)}</span>
      <span className="text-[12px] font-bold tracking-wide">{mon(date)}</span>
      {time && (
        <span
          className={`mt-1 text-[14px] font-extrabold ${dark ? "text-[var(--uv-gold)]" : "text-[#1556c4]"}`}
        >
          {time}
        </span>
      )}
    </span>
  );
}

/** Lato avversario: nome reale dal calendario; lo stemma non si disegna né si indovina. */
function Opponent({ name }: { name: string }) {
  return (
    <span className="grid w-[92px] justify-items-center gap-1 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-[#eef2f8] text-[#5a6b85]">
        <Shield className="size-6" aria-hidden="true" />
      </span>
      <span className="line-clamp-2 text-[13px] font-bold leading-tight text-[#0b2a5b]">
        {name || "Da definire"}
      </span>
    </span>
  );
}

function sides(item: WeekItem): { opponent: string; weHome: boolean } {
  const parts = item.title.split(/\s+[–-]\s+/);
  const weFirst = /\b(scd|colico)/i.test(parts[0] ?? "");
  const opponent = (weFirst ? parts[1] : parts[0]) ?? "";
  return {
    opponent: opponent.trim(),
    weHome: item.homeAway ? item.homeAway === "CASA" : weFirst,
  };
}

/** "Prossima gara" della tavola: blocco data, stemma SCD contro avversaria, campo, conto alla rovescia. */
export function NextMatchCard({
  item,
  team,
  nowMs,
  going,
  onGoing,
  onShare,
  others,
}: {
  item: WeekItem | null;
  team?: Team | undefined;
  nowMs: number;
  going: boolean;
  onGoing: () => void;
  onShare: () => void;
  others: readonly WeekItem[];
}) {
  return (
    <Card className="overflow-hidden" data-testid="next-match">
      <div className="flex items-center justify-between bg-[#0b2a5b] px-4 py-2 text-white">
        <h2 className="m-0 flex items-center gap-2 font-uv text-[17px] uppercase tracking-[0.06em]">
          <Trophy className="size-4 text-[var(--uv-gold)]" aria-hidden="true" />
          Prossima gara
        </h2>
        <a
          href="/calendario"
          className="scd-focus inline-flex min-h-9 items-center text-[13.5px] font-bold text-white/90"
        >
          Vedi tutte
          <ChevronRight className="size-4" aria-hidden="true" />
        </a>
      </div>
      {!item ? (
        <p className="m-0 px-4 py-5 text-[15px] text-[#3a4d6b]">
          Nessuna gara in calendario nei prossimi giorni: è settimana di
          allenamenti.
        </p>
      ) : (
        <NextMatchBody
          item={item}
          team={team}
          nowMs={nowMs}
          going={going}
          onGoing={onGoing}
          onShare={onShare}
          others={others}
        />
      )}
    </Card>
  );
}

function NextMatchBody({
  item,
  team,
  nowMs,
  going,
  onGoing,
  onShare,
  others,
}: {
  item: WeekItem;
  team?: Team | undefined;
  nowMs: number;
  going: boolean;
  onGoing: () => void;
  onShare: () => void;
  others: readonly WeekItem[];
}) {
  const { opponent, weHome } = sides(item);
  const s = startMs(item);
  const left = s !== null ? countdown(s, nowMs) : null;
  const live = itemState(item, nowMs) === "live";
  const us = (
    <span className="grid w-[92px] justify-items-center gap-1 text-center">
      <ClubCrestOfficial size={50} />
      <span className="text-[13px] font-bold leading-tight text-[#0b2a5b]">
        ColicoDerviese
        <span className="block font-semibold text-[#5a6b85]">
          {team?.short ?? item.groupLabel.split("·")[0]}
        </span>
      </span>
    </span>
  );
  return (
    <div className="grid gap-3 p-4">
      <div className="flex items-center gap-3">
        <DateBlock date={item.date} time={item.time} />
        <div className="flex min-w-0 flex-1 items-center justify-around gap-1">
          {weHome ? us : <Opponent name={opponent} />}
          <span className="font-uv text-[20px] text-[#9aa8bd]">VS</span>
          {weHome ? <Opponent name={opponent} /> : us}
        </div>
      </div>
      {item.venue && (
        <p className="m-0 flex items-start gap-1.5 text-[14px] text-[#3a4d6b]">
          <MapPin
            className="mt-0.5 size-4 shrink-0 text-[#1556c4]"
            aria-hidden="true"
          />
          {venueCase(item.venue)}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {item.homeAway && (
          <span
            className={`rounded-[6px] px-2 py-0.5 text-[12.5px] font-extrabold uppercase tracking-wide ${item.homeAway === "CASA" ? "bg-[var(--uv-gold)] text-[#0b2a5b]" : "border-2 border-[#1556c4] text-[#1556c4]"}`}
          >
            {item.homeAway === "CASA" ? "In casa" : "Trasferta"}
          </span>
        )}
        {live ? (
          <span className="rounded-[6px] bg-[#d6202c] px-2 py-0.5 text-[12.5px] font-extrabold uppercase text-white">
            In campo ora
          </span>
        ) : (
          left && (
            <span className="text-[14px] text-[#3a4d6b]">
              Calcio d'inizio tra{" "}
              <b className="tabular-nums text-[#0b2a5b]">{left}</b>
            </span>
          )
        )}
        {!item.certain && (
          <span className="rounded-[6px] bg-[#fff4c2] px-2 py-0.5 text-[12px] font-bold text-[#6b5200]">
            Orario o campo da confermare
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onGoing}
          aria-pressed={going}
          className={`scd-focus h-11 flex-1 rounded-[12px] text-[15px] font-extrabold ${going ? "bg-[#0f9d58] text-white" : "bg-[#1556c4] text-white"}`}
        >
          {going ? "Ci sarò ✓" : "Ci sarò"}
        </button>
        <button
          type="button"
          onClick={onShare}
          className="scd-focus inline-flex h-11 items-center gap-1.5 rounded-[12px] border border-[#d5dfec] px-4 text-[15px] font-bold text-[#0b2a5b]"
        >
          <Share2 className="size-4" aria-hidden="true" />
          Condividi
        </button>
      </div>
      {others.length > 0 && (
        <p className="m-0 text-[13.5px] text-[#5a6b85]">
          Lo stesso giorno giocano anche altre {others.length} squadre: le trovi
          nelle prossime gare.
        </p>
      )}
    </div>
  );
}

/** "Prossime gare" con il filo colorato della squadra, come la schermata calendario della tavola. */
export function UpcomingGames({
  items,
  teamOf,
}: {
  items: readonly WeekItem[];
  teamOf: (i: WeekItem) => Team | undefined;
}) {
  return (
    <Card data-testid="upcoming-games">
      <CardHead title="Prossime gare" more={<More to="/calendario" />} />
      {items.length === 0 ? (
        <p className="m-0 px-4 pb-4 text-[14.5px] text-[#3a4d6b]">
          Nessuna gara nei prossimi 7 giorni.
        </p>
      ) : (
        <ul className="m-0 list-none px-2 pb-2">
          {items.map((i) => {
            const t = teamOf(i);
            return (
              <li key={i.id}>
                <a
                  href={`/calendario?annata=${encodeURIComponent(i.group)}`}
                  className="scd-focus flex items-center gap-3 rounded-[12px] px-2 py-2.5 hover:bg-[#f2f6fc]"
                >
                  <span
                    aria-hidden="true"
                    className="h-12 w-1 shrink-0 rounded-full"
                    style={{ background: t?.color ?? "#1556c4" }}
                  />
                  <DateBlock date={i.date} time={i.time} tone="light" />
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-[15px] text-[#0b2a5b]">
                      {i.title}
                    </b>
                    <span className="block truncate text-[13px] text-[#5a6b85]">
                      {t?.short ?? i.groupLabel}
                      {i.venue ? ` · ${venueCase(i.venue)}` : ""}
                    </span>
                  </span>
                  {i.homeAway && (
                    <span
                      className={`shrink-0 rounded-[5px] px-1.5 py-0.5 text-[11px] font-extrabold uppercase ${i.homeAway === "CASA" ? "bg-[var(--uv-gold)] text-[#0b2a5b]" : "border border-[#1556c4] text-[#1556c4]"}`}
                    >
                      {i.homeAway === "CASA" ? "Casa" : "Fuori"}
                    </span>
                  )}
                  <ChevronRight
                    className="size-5 shrink-0 text-[#9aa8bd]"
                    aria-hidden="true"
                  />
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

/** Le due schede affiancate della tavola: allenamenti della settimana e l'evento del club. */
export function SideTiles({
  event,
}: {
  event: { title: string; when: string; href: string } | null;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <a
        href="/allenamenti"
        className="scd-focus flex items-center gap-3 rounded-[18px] bg-white p-3 shadow-[0_6px_20px_-10px_rgb(6_42_99/0.35)]"
      >
        <span className="grid size-12 shrink-0 place-items-center rounded-[12px] bg-[#0f9d58]">
          <ConeIcon className="size-7 text-white" />
        </span>
        <span className="min-w-0">
          <b className="block text-[14.5px] leading-tight text-[#0b2a5b]">
            Allenamenti della settimana
          </b>
          <span className="block text-[12.5px] text-[#5a6b85]">
            Orari e campi di tutte le categorie
          </span>
        </span>
      </a>
      {event && (
        <a
          href={event.href}
          className="scd-focus flex items-center gap-3 rounded-[18px] bg-white p-3 shadow-[0_6px_20px_-10px_rgb(6_42_99/0.35)]"
        >
          <span className="grid size-12 shrink-0 place-items-center rounded-[12px] bg-[var(--uv-gold)]">
            <Trophy className="size-7 text-[#0b2a5b]" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <b className="block text-[14.5px] leading-tight text-[#0b2a5b]">
              {event.title}
            </b>
            <span className="block text-[12.5px] text-[#5a6b85]">
              {event.when}
            </span>
          </span>
        </a>
      )}
    </div>
  );
}

/** "I nostri sponsor": riquadri bianchi con i loghi, a rotazione giornaliera tra quelli confermati. */
export function SponsorCards({ sponsors }: { sponsors: readonly Sponsor[] }) {
  return (
    <Card data-testid="sponsor-cards">
      <CardHead title="I nostri sponsor" more={<More to="/sponsor" />} />
      <ul className="m-0 grid list-none grid-cols-3 gap-2 px-3 pb-3">
        {sponsors.map((s, i) => (
          <li key={s.slug} className={i >= 3 ? "hidden lg:block" : ""}>
            <span className="grid h-[64px] place-items-center rounded-[12px] border border-[#e3eaf4] bg-white p-2">
              <img
                src={s.src}
                alt={sponsorLabel(s)}
                className="max-h-full max-w-full object-contain"
                loading="lazy"
              />
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** "Mondo Colico": il territorio e la società. */
export function MondoColico() {
  return (
    <Card
      className="flex items-stretch gap-3 overflow-hidden p-0"
      data-testid="mondo-colico"
    >
      <img
        src={CENTRO}
        alt=""
        aria-hidden="true"
        className="w-[38%] shrink-0 object-cover object-[center_45%]"
        loading="lazy"
      />
      <div className="grid gap-1 py-3 pr-3">
        <h2 className="m-0 text-[17px] font-extrabold text-[#0b2a5b]">
          Mondo Colico
        </h2>
        <p className="m-0 text-[13.5px] leading-snug text-[#3a4d6b]">
          La società, i campi di Colico e Dervio, la storia e il territorio.
        </p>
        <a
          href="/societa"
          className="scd-focus mt-1 inline-flex h-10 items-center justify-self-start rounded-[10px] bg-[#1556c4] px-4 text-[14px] font-bold text-white"
        >
          Scopri
        </a>
      </div>
    </Card>
  );
}
