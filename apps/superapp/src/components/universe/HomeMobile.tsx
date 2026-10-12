/**
 * Home for phones and tablets, built on the reference board SCD_HOME_PUBBLICA_ORIGINALE_2026_27
 * (Drive, VR-010): small header with crest and name, Lario photo with "Questa settimana" and Sky
 * in the official kit, four quick actions, the day's matches card, the week's fixtures, two tiles,
 * sponsors, the club doors. Light background, white cards, blue headers. The desktop keeps its
 * own layout (src/routes/index.tsx). UD-057: nothing pushes the matches below the first screen.
 */
import { Link } from "@tanstack/react-router";
import { ArrowRight, Bell, CalendarDays, ChevronRight, Lock, MapPin, Share2, Trophy, Users } from "lucide-react";
import { useRef, type ReactNode } from "react";

import { ClubCrestOfficial } from "@/components/SiteChrome";
import { openAccessMenu } from "@/components/scd/AccessMenu";
import { titleCase, venueCase } from "@/lib/board-data";
import type { Club } from "@/lib/club.types";
import type { WeekItem } from "@/lib/home-week";
import { itemState, startMs, countdown, type Team } from "@/lib/universe";

import { ColicoNowChip, MapButton, TicketButton, TicketLine, WeatherChip } from "./MatchExtras";
import { TeamCode } from "./TeamBar";

const CREST = "/media/brand/logo-scd.webp";

/* ------------------------------------------------------------------ header */

export function MobileHeader() {
  return (
    <header className="flex h-14 items-center justify-between gap-3 bg-[var(--scd-navy)] px-4 text-white" data-testid="home-m-header">
      <Link to="/" className="flex min-w-0 items-center gap-2.5" aria-label="S.C.D. ColicoDerviese, Home">
        <ClubCrestOfficial size={40} />
        <span className="leading-[0.95]">
          <span className="font-uv-script block text-[13px] text-[var(--uv-gold)]">S.C.D.</span>
          <span className="font-title block text-[19px] font-black tracking-[0.01em]">
            COLICO<span className="text-[var(--uv-gold)]">DERVIESE</span>
          </span>
        </span>
      </Link>
      <button
        type="button"
        onClick={openAccessMenu}
        className="scd-focus inline-flex h-10 items-center gap-1.5 rounded-full bg-[var(--uv-gold)] px-3.5 text-[14px] font-extrabold text-[var(--uv-night)]"
        aria-label="Entra nelle aree: accesso alle aree della società"
        data-testid="home-enter"
      >
        <Lock className="size-4" aria-hidden="true" />
        Entra
      </button>
    </header>
  );
}

/* -------------------------------------------------------------------- hero */

export function MobileHero({ title, text, children }: { title: string; text: string; children?: ReactNode }) {
  return (
    <section className="relative isolate overflow-hidden bg-[var(--scd-navy)] text-white" data-testid="home-m-hero">
      <img src="/media/scd/lario-header.webp" alt="" className="absolute inset-0 -z-20 size-full object-cover object-[center_40%]" loading="eager" decoding="async" />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-[rgb(2_31_79/0.92)] via-[rgb(2_31_79/0.35)] to-[rgb(2_31_79/0.1)]" />
      <div className="grid min-h-[200px] grid-cols-[minmax(0,1fr)_104px] items-end gap-2 px-4 pb-6 pt-4 sm:min-h-[220px] sm:grid-cols-[minmax(0,1fr)_128px]">
        <div className="pb-2">
          <h1 className="font-title text-[30px] font-black leading-[0.95] [text-shadow:0_2px_8px_rgb(0_0_0/0.45)] sm:text-[34px]">{title}</h1>
          <p className="mt-1.5 max-w-[30ch] text-[14.5px] font-semibold leading-snug text-white/95 [text-shadow:0_1px_4px_rgb(0_0_0/0.5)] sm:text-[16px]">{text}</p>
          {children && <div className="mt-2.5 flex flex-wrap items-center gap-1.5">{children}</div>}
        </div>
        {/* Sky in the official ATV match kit, alpha cut-out (public/media/brand/sky-atv-cut.webp, KEEP_ENHANCE). */}
        <img src="/media/brand/sky-atv-cut.webp" width={520} height={1076} alt="" aria-hidden="true" className="-mb-6 h-auto w-full self-end drop-shadow-[0_10px_18px_rgb(0_0_0/0.45)]" loading="eager" decoding="async" />
      </div>
    </section>
  );
}

/* ----------------------------------------------------------- quick actions */

const ACTIONS: ReadonlyArray<{ label: string; to: string; icon: typeof Trophy; hash?: string }> = [
  { label: "Gare", to: "/", hash: "gare", icon: Trophy },
  { label: "Allenamenti", to: "/allenamenti", icon: CalendarDays },
  { label: "Eventi", to: "/eventi", icon: CalendarDays },
  { label: "Iniziative", to: "/community", icon: Users },
];

export function QuickActions() {
  return (
    <nav aria-label="Scorciatoie" className="-mt-5 grid grid-cols-4 gap-2 px-4" data-testid="home-m-actions">
      {ACTIONS.map((a) => {
        const Icon = a.icon;
        const cls = "scd-focus grid min-h-[76px] place-items-center gap-1 rounded-[16px] bg-white px-1 py-2.5 text-center text-[13px] font-extrabold text-[var(--scd-ink)] shadow-[0_8px_22px_-10px_rgb(2_31_79/0.45)]";
        return a.hash ? (
          <a key={a.label} href={`#${a.hash}`} className={cls}>
            <Icon className="size-6 text-[var(--scd-blue)]" strokeWidth={2.2} aria-hidden="true" />
            {a.label}
          </a>
        ) : (
          <Link key={a.label} to={a.to as never} className={cls}>
            <Icon className="size-6 text-[var(--scd-blue)]" strokeWidth={2.2} aria-hidden="true" />
            {a.label}
          </Link>
        );
      })}
    </nav>
  );
}

/* ------------------------------------------------------------ match card */

export function CardHeader({ title, more, id }: { title: ReactNode; more?: { label: string; href: string } | undefined; id?: string }) {
  return (
    <div className="flex items-center justify-between gap-2 px-4 py-2.5">
      <h2 id={id} className="m-0 flex items-center gap-2 font-title text-[17px] font-black uppercase tracking-[0.02em] text-[var(--scd-navy)]">
        {title}
      </h2>
      {more && (
        <a href={more.href} className="inline-flex items-center gap-0.5 text-[14px] font-bold text-[var(--scd-blue)]">
          {more.label}
          <ChevronRight className="size-4" aria-hidden="true" />
        </a>
      )}
    </div>
  );
}

function opponentOf(item: WeekItem): string {
  const parts = item.title.split(/\s[–-]\s/);
  if (parts.length < 2) return item.title;
  return (item.homeAway === "CASA" ? parts[1] : parts[0]) ?? item.title;
}

function Crest({ club, name, size = 52 }: { club?: Club | undefined; name: string; size?: number }) {
  const initials = name.replace(/[^A-Za-zÀ-ú ]/g, "").split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  if (club?.logo.url) return <img src={club.logo.url} alt="" width={size} height={size} className="rounded-full bg-white object-contain p-0.5" style={{ width: size, height: size }} loading="lazy" />;
  return (
    <span className="grid place-items-center rounded-full border-2 border-[var(--scd-line)] bg-[#f3f7fc] font-title text-[16px] font-black text-[var(--scd-sub)]" style={{ width: size, height: size }} aria-hidden="true">
      {initials || "?"}
    </span>
  );
}

export function MobileMatchCard({
  item,
  team,
  others,
  onPick,
  teamOf,
  clubOf,
  nowMs,
  going,
  onGoing,
  onShare,
}: {
  item: WeekItem | null;
  team: Team | undefined;
  others: WeekItem[];
  onPick: (id: string) => void;
  teamOf: (i: WeekItem) => Team | undefined;
  clubOf: (name: string) => Club | undefined;
  nowMs: number;
  going: boolean;
  onGoing: () => void;
  onShare: () => void;
}) {
  const ref = useRef<HTMLElement>(null);
  const pick = (id: string) => {
    onPick(id);
    ref.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  };
  if (!item) {
    return (
      <section className="mx-4 rounded-[18px] bg-white shadow-[0_8px_22px_-12px_rgb(2_31_79/0.4)]" data-testid="home-m-match">
        <CardHeader title="Prossima gara" more={{ label: "Calendario", href: "/calendario" }} />
        <p className="px-4 pb-4 text-[14.5px] text-[var(--scd-sub)]">Nessuna gara nel calendario pubblico per questa selezione.</p>
      </section>
    );
  }
  const st = itemState(item, nowMs);
  const live = st === "live";
  const s = startMs(item);
  const cd = s !== null ? countdown(s, nowMs) : null;
  const home = item.homeAway === "CASA";
  const opp = opponentOf(item);
  const d = new Date(`${item.date}T12:00:00Z`);
  const wd = new Intl.DateTimeFormat("it-IT", { timeZone: "UTC", weekday: "short" }).format(d).replace(".", "");
  const mo = new Intl.DateTimeFormat("it-IT", { timeZone: "UTC", month: "short" }).format(d).replace(".", "");
  const total = others.length + 1;
  const us = (
    <span className="grid justify-items-center gap-1 text-center">
      <img src={CREST} alt="" width={52} height={52} className="h-[52px] w-auto" />
      <b className="text-[13px] leading-tight">
        ColicoDerviese
        <span className="block text-[12px] font-bold text-[var(--scd-sub)]">{item.groupLabel.replace(/\s·\s/g, " ")}</span>
      </b>
    </span>
  );
  const them = (
    <span className="grid justify-items-center gap-1 text-center">
      <Crest club={clubOf(opp)} name={opp} />
      <b className="text-[13px] leading-tight">{titleCase(opp)}</b>
    </span>
  );
  return (
    <section ref={ref} className="mx-4 scroll-mt-28 overflow-hidden rounded-[18px] bg-white shadow-[0_8px_22px_-12px_rgb(2_31_79/0.4)]" data-testid="home-m-match" data-state={st}>
      <div className={`flex items-center justify-between gap-2 px-4 py-2.5 text-white ${live ? "bg-[var(--scd-red)]" : "bg-[var(--scd-blue)]"}`}>
        <h2 className="m-0 flex items-center gap-2 font-title text-[16px] font-black uppercase tracking-[0.02em]">
          {live && <i aria-hidden="true" className="uv-blink size-[9px] rounded-full bg-white" />}
          {live ? "In campo ora" : total > 1 ? `In campo · ${total} gare` : "Prossima gara"}
        </h2>
        <a href="#gare" className="inline-flex items-center gap-0.5 text-[14px] font-bold text-white/95">
          Vedi tutte
          <ChevronRight className="size-4" aria-hidden="true" />
        </a>
      </div>
      <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-3 px-4 pt-3">
        <div className="grid content-start justify-items-center rounded-[12px] bg-[#eef3f9] px-1 py-2 text-center leading-none text-[var(--scd-navy)]">
          <span className="text-[12px] font-extrabold uppercase">{wd}</span>
          <span className="font-title text-[32px] font-black">{Number(item.date.slice(8, 10))}</span>
          <span className="text-[12px] font-extrabold uppercase">{mo}</span>
          <span className="mt-1 font-title text-[20px] font-black tabular-nums">{item.time || "--:--"}</span>
        </div>
        <div className="min-w-0">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            {home ? us : them}
            <span className="font-uv text-[18px] text-[var(--scd-sub)]">vs</span>
            {home ? them : us}
          </div>
          <p className="m-0 mt-2 flex items-center justify-center gap-1 text-[13px] text-[var(--scd-sub)]">
            <MapPin className="size-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{venueCase(item.venue) || "Sede da definire"}</span>
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 px-4 pt-3">
        <span className={`rounded-[6px] border-2 px-2 py-[3px] font-uv text-[12px] uppercase tracking-[0.1em] ${home ? "border-[#0b8a43] text-[#0b8a43]" : "border-[var(--scd-blue)] text-[var(--scd-blue)]"}`}>{home ? "In casa" : "Trasferta"}</span>
        {!live && cd && <span className="text-[13px] font-bold text-[var(--scd-sub)]">tra <span className="tabular-nums text-[var(--scd-ink)]">{cd}</span></span>}
        {live && <span className="text-[13px] font-bold text-[var(--scd-red)]">in corso</span>}
        {!item.certain && <span className="rounded-[5px] bg-[#fff3c4] px-[6px] py-[2px] text-[11px] font-bold uppercase text-[#7a5200]">da confermare</span>}
        {team && <TeamCode team={team} size="sm" />}
        <button type="button" onClick={onShare} aria-label="Condividi la gara" className="ml-auto inline-flex size-10 items-center justify-center rounded-full border-2 border-[var(--scd-line)]">
          <Share2 className="size-[18px]" aria-hidden="true" />
        </button>
      </div>
      <div className="px-4 pt-2">
        <WeatherChip item={item} />
      </div>
      <div className="flex flex-wrap gap-1.5 px-4 pt-3">
        <MapButton venue={item.venue} />
        <TicketButton item={item} />
        <button
          type="button"
          onClick={onGoing}
          aria-pressed={going}
          className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-[12px] px-3 text-[14.5px] font-extrabold ${going ? "bg-[#0b8a43] text-white" : "bg-[var(--scd-navy)] text-white"}`}
        >
          {going ? "Ci sarò ✓" : "Ci sarò"}
        </button>
      </div>
      <div className="px-4 pt-2">
        <TicketLine item={item} />
      </div>
      {others.length > 0 && (
        <ul className="m-0 mt-3 list-none divide-y divide-[var(--scd-line)] border-t border-[var(--scd-line)] p-0" aria-label="Le altre gare dello stesso giorno" data-testid="same-day">
          {others.map((o) => {
            const oh = o.homeAway === "CASA";
            const ost = itemState(o, nowMs);
            const ot = teamOf(o);
            return (
              <li key={o.id}>
                <button type="button" onClick={() => pick(o.id)} className="grid w-full grid-cols-[50px_44px_minmax(0,1fr)_auto] items-center gap-2 px-4 py-2 text-left" aria-label={`Metti in evidenza: ${o.groupLabel} ${o.title}`}>
                  <b className={`font-title text-[18px] font-black tabular-nums ${ost === "live" ? "text-[var(--scd-red)]" : ""}`}>{o.time || "--:--"}</b>
                  {ot ? <TeamCode team={ot} size="sm" /> : <span />}
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-extrabold leading-tight">{o.groupLabel.replace(/\s·\s/g, " ")}</span>
                    <span className="block truncate text-[12.5px] text-[var(--scd-sub)]">{titleCase(opponentOf(o))}{ost === "live" ? " · in corso" : ost === "done" ? " · finita" : ""}</span>
                  </span>
                  <span className={`rounded-[5px] border-2 px-[6px] py-[2px] font-uv text-[11px] uppercase tracking-[0.08em] ${oh ? "border-[#0b8a43] text-[#0b8a43]" : "border-[var(--scd-blue)] text-[var(--scd-blue)]"}`}>{oh ? "Casa" : "Fuori"}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <div className="h-3" />
    </section>
  );
}

/* ---------------------------------------------------------------- tiles */

export function MobileTiles() {
  return (
    <div className="mx-4 grid grid-cols-2 gap-3" data-testid="home-m-tiles">
      <Link to="/allenamenti" className="scd-focus grid grid-cols-[44px_minmax(0,1fr)] items-center gap-2.5 rounded-[16px] bg-white p-3 shadow-[0_8px_22px_-12px_rgb(2_31_79/0.4)]">
        <span className="grid size-11 place-items-center rounded-[12px] bg-[#0b8a43] text-white">
          <CalendarDays className="size-6" aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <b className="block text-[15px] leading-tight">Allenamenti</b>
          <small className="block text-[12.5px] leading-snug text-[var(--scd-sub)]">della settimana, tutte le annate</small>
        </span>
      </Link>
      <Link to="/entra" className="scd-focus grid grid-cols-[44px_minmax(0,1fr)] items-center gap-2.5 rounded-[16px] bg-white p-3 shadow-[0_8px_22px_-12px_rgb(2_31_79/0.4)]">
        <span className="grid size-11 place-items-center rounded-[12px] bg-[var(--uv-gold)] text-[var(--uv-night)]">
          <Users className="size-6" aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <b className="block text-[15px] leading-tight">Entra nella SCD</b>
          <small className="block text-[12.5px] leading-snug text-[var(--scd-sub)]">prova e pre-iscrizione</small>
        </span>
      </Link>
    </div>
  );
}

/* -------------------------------------------------------------- sponsors */

const SPONSORS: ReadonlyArray<{ name: string; src: string | null }> = [
  { name: "HDI Assicurazioni, Maglia Assicurazioni", src: "/media/sponsor/hdi-maglia-assicurazioni.webp" },
  { name: "ATV", src: null },
  { name: "Saglio Sport Cantù", src: "/media/sponsor/saglio-sport.webp" },
  { name: "Legea", src: "/media/sponsor/legea.webp" },
];

export function MobileSponsors() {
  return (
    <section className="mx-4 overflow-hidden rounded-[18px] bg-white shadow-[0_8px_22px_-12px_rgb(2_31_79/0.4)]" aria-label="I nostri sponsor" data-testid="home-m-sponsors">
      <div className="flex items-center justify-between gap-2 bg-[var(--scd-blue)] px-4 py-2.5 text-white">
        <h2 className="m-0 font-title text-[16px] font-black uppercase tracking-[0.02em]">I nostri sponsor</h2>
        <Link to="/sponsor" className="inline-flex items-center gap-0.5 text-[14px] font-bold text-white/95">
          Vedi tutti
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
      <ul className="m-0 grid list-none grid-cols-2 gap-2 p-3 sm:grid-cols-4">
        {SPONSORS.map((s) => (
          <li key={s.name} className="flex h-14 items-center justify-center rounded-[12px] border border-[var(--scd-line)] bg-white px-2">
            {s.src ? <img src={s.src} alt={s.name} className="max-h-9 w-auto" loading="lazy" decoding="async" /> : <span className="font-uv text-[22px] uppercase tracking-[0.06em] text-[var(--uv-night)]" aria-label={s.name}>{s.name}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function MobileSection({ id, title, more, children }: { id: string; title: string; more?: { label: string; href: string } | undefined; children: ReactNode }) {
  return (
    <section aria-labelledby={`${id}-t`} className="mx-4" id={id}>
      <div className="flex items-center justify-between gap-2 py-2">
        <h2 id={`${id}-t`} className="m-0 font-title text-[20px] font-black uppercase tracking-[0.02em] text-[var(--scd-navy)]">{title}</h2>
        {more && (
          <Link to={more.href as never} className="inline-flex items-center gap-0.5 text-[14px] font-bold text-[var(--scd-blue)]">
            {more.label}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

export { Bell as MobileBellIcon, ColicoNowChip as MobileColicoNow };
