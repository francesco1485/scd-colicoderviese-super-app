/**
 * Public home of the Super App — the agreed idea (Francesco 16/10/2026 05:59, synthesis sent the same morning):
 * bring people to the field and make the app pleasant every day. The youth sector is the engine, told to the adults
 * who decide and spend (parents, grandparents, fans, sponsors): they must find their kid's group at once, know when and
 * where it plays, feel proud and have fun; the kids must feel protagonists on and off the pitch.
 *
 * Two modes by Rome weekday (06:21, lib/home-week-board homeMode): Monday–Thursday the club's week — the small
 * ticker of the next games, then the palinsesto first; Friday–Sunday "si gioca" — the full match board after the ticker.
 * Order on match days (Eurobet structure, Skores-style match board, light everyday palette):
 *   0. the ticker of the next games (pauses on hover, focus and tap; static with reduced motion);
 *   1. the three credentials at the top, reasoned and linked where useful (LND CR Lombardia, AC Monza);
 *   2. "In campo questa settimana": a slim scoreboard with every game in a long list — time or LIVE minute, annata
 *      and birth years, crests, competition, home/away — plus "come to the field" facts; a tap opens the week calendar;
 *   3. "Le nostre squadre": each group with birth years, championship and next game;
 *   4. "Dal club": the day's palinsesto (lib/vetrina, already curated: tournaments, kit, games, services, news) as a
 *      magazine grid of mixed sizes — static, it changes from one day to the next, never a carousel;
 *   5. join, Iride, app.
 * Data: public calendar only (games; trainings stay for members, UD-100); opponent crests only from the verified
 * registry; birth years only when the master declares them (group.years). No minor named, no mascot.
 */
import { Link } from "@tanstack/react-router";
import { ArrowRight, ChevronRight, Download, ExternalLink, LogIn, MapPinned, MessageCircle, UserPlus, type LucideIcon } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { ClubCrestOfficial } from "@/components/SiteChrome";
import { useMinuteClock } from "@/components/home/HomeBoard";
import { venueShort } from "@/components/home/HomeSections";
import { groupShort } from "@/lib/board-data";
import type { getPublicCalendarSnapshot } from "@/lib/calendar.functions";
import { matchClock } from "@/lib/calendario-live";
import { CLUB_CREDENTIALS, type CredentialId } from "@/lib/club-credentials";
import { crestFor } from "@/lib/crests";
import { homeTown } from "@/lib/home-matchday";
import { homeMode, weekBoardEvents, weekGroups } from "@/lib/home-week-board";
import { SEGRETERIA_WHATSAPP } from "@/lib/install-link";
import type { PublicEvent, PublicGroup } from "@/lib/public-snapshots";
import type { VetrinaSlot, VetrinaWorld } from "@/lib/vetrina";

type PublicCalendar = Awaited<ReturnType<typeof getPublicCalendarSnapshot>>;

const WRAP = "mx-auto w-full max-w-[1240px] px-4 lg:px-8";
const PANEL = "rounded-[16px] border border-[#e3eaf4] bg-white shadow-[0_10px_26px_-20px_rgb(11_42_91/0.35)]";
const BOARD_ROWS = 12;
const KIT_FULL = "/media/kit/kit-2026-27-blu.webp";

/** Official websites the Direzione wants reachable from the marks (verified pages, project docs 15/10/2026). */
const CREDENTIAL_LINK: Partial<Record<CredentialId, string>> = {
  lnd: "https://www.crlombardia.it/",
  "insieme-al-monza": "https://www.acmonza.com/en/insieme-monza-dettaglio/mission/",
};

const TYPE_LABEL: Record<string, string> = { CAMPIONATO: "Campionato", COPPA: "Coppa", AMICHEVOLE: "Amichevole", TORNEO: "Torneo" };

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

function More({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to as never} className="scd-focus inline-flex min-h-11 shrink-0 items-center gap-0.5 rounded-md text-[14px] font-bold text-[#1556c4] hover:underline">
      {children}
      <ChevronRight className="size-4" aria-hidden="true" />
    </Link>
  );
}

function OpponentCrest({ name, size }: { name: string; size: number }) {
  const { src, label } = crestFor(name);
  if (!src) return <span aria-hidden="true" className="block rounded-full bg-[#eef3f9] ring-1 ring-[#dfe7f2]" style={{ width: size, height: size }} />;
  return <img src={src} alt={`Stemma ${label}`} width={size} height={size} loading="lazy" decoding="async" className="object-contain" style={{ width: size, height: size }} />;
}

/* ------------------------------------------------------------ 0. ticker */

const WD3 = ["DOM", "LUN", "MAR", "MER", "GIO", "VEN", "SAB"] as const;

/** Small bar that scrolls the next games (Francesco 16/10 06:21); pauses on hover, focus and tap, still with reduced motion. */
function Ticker({ events, groups }: { events: readonly PublicEvent[]; groups: readonly PublicGroup[] }) {
  const [paused, setPaused] = useState(false);
  const groupOf = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups]);
  if (events.length === 0) return null;
  const items = events.map((e) => {
    const g = groupOf.get(e.group);
    const d = new Date(`${e.date}T12:00:00Z`);
    const opp = e.opponent ? crestFor(e.opponent).label : "da definire";
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
  return (
    <section aria-label="Prossime gare" className={`${PANEL} flex items-stretch overflow-hidden`} data-testid="home-ticker">
      <span className="flex shrink-0 items-center bg-[#0b2a5b] px-3 text-[11px] font-extrabold uppercase tracking-[0.08em] text-white">Prossime gare</span>
      <div
        className="scd-ticker min-w-0 flex-1 overflow-hidden"
        data-paused={paused}
        onPointerDown={() => setPaused((p) => !p)}
        style={{ ["--ticker-s" as string]: `${Math.max(20, items.length * 6)}s` }}
      >
        <ul className="scd-ticker-track m-0 flex w-max list-none p-0">
          {row(false)}
          {row(true)}
        </ul>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ 1. credits */

function Credentials() {
  return (
    <section aria-label="Riconoscimenti e affiliazioni della società" className={`${PANEL} grid grid-cols-3 divide-x divide-[#eef2f8] py-2`} data-testid="home-credentials">
      {CLUB_CREDENTIALS.map((c) => {
        const href = CREDENTIAL_LINK[c.id];
        const body = (
          <>
            <img src={c.art.src} alt={c.alt} height={34} decoding="async" className="h-[30px] w-auto max-w-[88%] object-contain lg:h-[38px]" />
            <span className="text-center text-[11px] font-extrabold uppercase leading-tight tracking-[0.04em] text-[#0b2a5b] lg:text-[12px]">{c.short}</span>
            {href && (
              <span className="inline-flex items-center gap-0.5 text-[10.5px] font-bold text-[#1556c4] lg:text-[11.5px]">
                Sito ufficiale
                <ExternalLink className="size-3" aria-hidden="true" />
              </span>
            )}
          </>
        );
        const cls = "grid min-h-[86px] content-center justify-items-center gap-1 px-1.5 py-1";
        return href ? (
          <a key={c.id} href={href} target="_blank" rel="noopener noreferrer" className={`${cls} scd-focus rounded-[10px] hover:bg-[#f6f9fd]`} aria-label={`${c.title}, ${c.issuer}: sito ufficiale (apre una nuova scheda)`}>
            {body}
          </a>
        ) : (
          <div key={c.id} className={cls}>
            {body}
          </div>
        );
      })}
    </section>
  );
}

/* ------------------------------------------------------------- 2. board */

function BoardRow({ e, g, nowMs }: { e: PublicEvent; g: PublicGroup | undefined; nowMs: number }) {
  const clock = matchClock(e, nowMs);
  const home = e.homeAway === "CASA";
  const opp = e.opponent ? crestFor(e.opponent).label : "Avversario da definire";
  const us = `ColicoDerviese ${groupShort(g, e.category)}`;
  const sides: [ReactNode, string, boolean][] = [
    [<ClubCrestOfficial key="us" size={22} />, us, true],
    [<OpponentCrest key="them" name={e.opponent} size={20} />, opp, false],
  ];
  if (!home) sides.reverse();
  const years = birthYears(g);
  const certain = e.timeConfirmed && e.venueConfirmed;
  return (
    <li>
      <Link
        to="/calendario"
        search={{ annata: e.group, vista: "settimana" }}
        className="scd-focus grid grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-2.5 px-3 py-2.5 hover:bg-[#f6f9fd] lg:gap-4 lg:px-4"
        aria-label={`${sides.map((s) => s[1]).join(" contro ")}, ${e.time ? `ore ${e.time}` : "orario da definire"}, ${e.category}, ${home ? "in casa" : "in trasferta"}${certain ? "" : ", da confermare"}`}
      >
        <span className="grid justify-items-center leading-none">
          {clock.state === "live" ? (
            <span className="inline-flex items-center gap-1 rounded-[6px] bg-[#e11d2e] px-1.5 py-[3px] text-[12px] font-extrabold text-white">
              <span className="scd-live-dot size-1.5 rounded-full bg-white" aria-hidden="true" />
              {clock.label}
            </span>
          ) : (
            <span className={`text-[15px] font-extrabold tabular-nums ${clock.state === "done" ? "text-[#8a98ad]" : "text-[#0b1e3a]"}`}>{e.time || "--:--"}</span>
          )}
          {clock.state === "done" && <span className="mt-1 text-[10px] font-bold uppercase text-[#8a98ad]">Finita</span>}
        </span>
        <span className="grid min-w-0 gap-1">
          {sides.map(([crest, name, ours]) => (
            <span key={name} className="flex min-w-0 items-center gap-2">
              <span className="grid size-[22px] shrink-0 place-items-center">{crest}</span>
              <span className={`truncate text-[14px] leading-tight ${ours ? "font-extrabold text-[#0b1e3a]" : "font-semibold text-[#23406e]"}`}>{name}</span>
            </span>
          ))}
          <span className="truncate text-[11.5px] font-semibold text-[#5a6b85]">
            {TYPE_LABEL[e.type] ? `${TYPE_LABEL[e.type]} · ` : ""}
            {e.category}
            {e.venue ? ` · ${venueShort(e.venue)}` : ""}
          </span>
        </span>
        <span className="grid justify-items-end gap-1">
          {years && <span className="rounded-[6px] px-1.5 py-[2px] text-[11px] font-extrabold text-white" style={{ background: g?.color ?? "#668196" }}>{years.replace("Nati ", "")}</span>}
          <span className={`rounded-[5px] px-1.5 py-[2px] text-[10.5px] font-extrabold uppercase ${home ? "bg-[#ffd600] text-[#061a3d]" : "bg-[#eef2f8] text-[#4a5d7a]"}`}>{home ? "Casa" : "Trasf."}</span>
          {!certain && <span className="text-[10.5px] font-bold text-[#8a6d00]">da conf.</span>}
        </span>
      </Link>
    </li>
  );
}

function MatchBoard({ events, groups, today, nowMs }: { events: readonly PublicEvent[]; groups: readonly PublicGroup[]; today: string; nowMs: number }) {
  const groupOf = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups]);
  const days = useMemo(() => weekGroups(events, "tutte", today), [events, today]);
  const home = events.filter((e) => e.homeAway === "CASA");
  const towns = [...new Set(home.map((e) => homeTown(e.venue)).filter(Boolean))].sort((a, b) => (a === "Colico" ? -1 : b === "Colico" ? 1 : a.localeCompare(b)));
  const live = events.some((e) => matchClock(e, nowMs).state === "live");
  let left = BOARD_ROWS;
  return (
    <section aria-labelledby="home-board-t" data-testid="home-board">
      <Heading
        id="home-board-t"
        sub={
          events.length === 0
            ? "Nessuna gara nei prossimi 7 giorni"
            : `${events.length === 1 ? "1 gara" : `${events.length} gare`} · ${home.length} in casa${towns.length ? ` a ${towns.join(" e ")}` : ""}${live ? " · si gioca adesso" : ""}`
        }
        action={<More to="/calendario">Calendario</More>}
      >
        In campo questa settimana
      </Heading>
      {events.length === 0 ? (
        <p className={`${PANEL} m-0 px-4 py-5 text-[15px] text-[#4a5d7a]`} data-testid="home-board-empty">
          Nessuna gara nei prossimi 7 giorni. Trovi tutte le gare nel calendario.
        </p>
      ) : (
        <div className={`${PANEL} overflow-hidden`}>
          {days.map((d) => {
            if (left <= 0) return null;
            const rows = d.events.slice(0, left);
            left -= rows.length;
            return (
              <div key={d.date}>
                <h3 className="m-0 flex items-center justify-between bg-[#f3f6fb] px-3 py-1.5 text-[12.5px] font-extrabold uppercase tracking-[0.06em] text-[#0b2a5b] lg:px-4">
                  <span>{d.label}</span>
                  <span className="text-[#5a6b85]">{d.events.length === 1 ? "1 gara" : `${d.events.length} gare`}</span>
                </h3>
                <ul className="m-0 list-none divide-y divide-[#eef2f8] p-0">
                  {rows.map((e) => (
                    <BoardRow key={e.id} e={e} g={groupOf.get(e.group)} nowMs={nowMs} />
                  ))}
                </ul>
              </div>
            );
          })}
          <div className="grid grid-cols-2 gap-2 border-t border-[#eef2f8] p-2.5">
            <Link to="/calendario" search={{ vista: "settimana" }} className="scd-focus inline-flex min-h-11 items-center justify-center gap-1.5 rounded-[10px] bg-[#0b2a5b] text-[14px] font-bold text-white hover:bg-[#123a78]">
              Tutta la settimana
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link to="/impianti" className="scd-focus inline-flex min-h-11 items-center justify-center gap-1.5 rounded-[10px] bg-[#ffd600] text-[14px] font-extrabold text-[#061a3d] hover:brightness-95">
              <MapPinned className="size-4" aria-hidden="true" />
              Vieni al campo
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------- 3. teams */

function Teams({ calendar, today }: { calendar: PublicCalendar; today: string }) {
  const teams = useMemo(() => {
    return calendar.groups
      .filter((g) => g.id !== "other" && calendar.events.some((e) => e.group === g.id))
      .map((g) => {
        const mine = calendar.events.filter((e) => e.group === g.id);
        const champ = mine.find((e) => e.type === "CAMPIONATO")?.category ?? mine[0]?.category ?? "";
        const next = mine.filter((e) => e.date >= today).sort((a, b) => (a.date + (a.time || "99")).localeCompare(b.date + (b.time || "99")))[0];
        return { g, champ, next };
      });
  }, [calendar, today]);
  if (teams.length === 0) return null;
  const fmt = (iso: string) =>
    new Intl.DateTimeFormat("it-IT", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" }).format(new Date(`${iso}T12:00:00Z`));
  return (
    <section aria-labelledby="home-teams-t" data-testid="home-teams">
      <Heading id="home-teams-t" sub="Trova la squadra di tuo figlio: annata, campionato e prossima gara">
        Le nostre squadre
      </Heading>
      <ul className="-mx-4 m-0 flex list-none snap-x gap-3 overflow-x-auto px-4 pb-1 lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0">
        {teams.map(({ g, champ, next }) => (
          <li key={g.id} className="w-[72vw] max-w-[260px] shrink-0 snap-start lg:w-auto lg:max-w-none">
            <Link
              to="/calendario"
              search={{ annata: g.id }}
              className={`${PANEL} scd-focus relative grid h-full gap-1 overflow-hidden p-3.5 pl-4 hover:border-[#1556c4]`}
            >
              <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[5px]" style={{ background: g.color }} />
              <span className="font-title text-[20px] font-black uppercase leading-none text-[#0b1e3a]">{groupShort(g, g.label)}</span>
              <span className="text-[13px] font-extrabold" style={{ color: g.color }}>
                {birthYears(g) || (g.id === "prima" ? "Prima squadra" : "Annata da confermare")}
              </span>
              <span className="truncate text-[12.5px] text-[#4a5d7a]">{champ}</span>
              <span className="mt-1 border-t border-[#eef2f8] pt-1.5 text-[12.5px] font-semibold text-[#23406e]">
                {next ? (
                  <>
                    Prossima: {fmt(next.date)}
                    {next.time ? ` · ${next.time}` : ""}
                    {next.opponent ? ` · ${next.homeAway === "CASA" ? "in casa" : "fuori"}` : ""}
                  </>
                ) : (
                  "Nessuna gara in programma"
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------------------------------------------------------- 4. magazine */

function SlotVisual({ s, big }: { s: VetrinaSlot; big: boolean }) {
  const v = s.id === "kit-2026-27" ? { kind: "image" as const, src: KIT_FULL, alt: "Kit ufficiale ColicoDerviese 2026/27", fit: "contain" as const, position: "center" } : s.visual;
  if (v.kind === "image")
    return (
      <img
        src={v.src}
        alt={v.alt}
        loading="lazy"
        decoding="async"
        className={`absolute inset-0 -z-10 size-full ${v.fit === "contain" ? "object-contain p-3" : "object-cover"}`}
        style={{ objectPosition: v.position ?? "center" }}
      />
    );
  if (v.kind === "portrait")
    return <img src={v.src} alt={v.alt} loading="lazy" decoding="async" className="absolute right-3 top-3 -z-10 size-[64px] rounded-full object-cover ring-2 ring-white/70" />;
  return (
    <span aria-hidden="true" className={`absolute right-3 top-2 -z-10 font-uv leading-none text-white/25 ${big ? "text-[120px]" : "text-[64px]"}`}>
      {v.big}
    </span>
  );
}

const TONES = ["bg-[linear-gradient(150deg,#1d5fd0,#0b2f6b)]", "bg-[linear-gradient(150deg,#0f7a3d,#0a4f2a)]", "bg-[linear-gradient(150deg,#c23c3f,#7d1f22)]", "bg-[linear-gradient(150deg,#7654b8,#40287a)]", "bg-[linear-gradient(150deg,#148b99,#0a5560)]"];

function Magazine({ slots }: { slots: readonly VetrinaSlot[] }) {
  if (slots.length === 0) return null;
  return (
    <section aria-labelledby="home-mag-t" data-testid="home-magazine">
      <Heading id="home-mag-t" sub="Notizie, iniziative, tornei e giochi: cambia ogni giorno">
        Dal club
      </Heading>
      <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 lg:grid-cols-4 lg:grid-rows-[repeat(2,minmax(150px,auto))]">
        {slots.map((s, i) => {
          const big = i === 0;
          const image = s.visual.kind === "image" || s.id === "kit-2026-27";
          const kitLight = s.id === "kit-2026-27";
          return (
            <li key={s.id} className={big ? "col-span-2 lg:row-span-2" : ""}>
              <Link
                to={s.href as never}
                search={s.search as never}
                {...(s.hash ? { hash: s.hash } : {})}
                className={`scd-focus relative isolate flex h-full flex-col justify-end overflow-hidden rounded-[16px] p-3.5 shadow-[0_10px_24px_-16px_rgb(11_42_91/0.5)] transition-transform duration-200 hover:-translate-y-0.5 ${
                  big ? "min-h-[260px] lg:min-h-[320px] lg:p-5" : "min-h-[170px]"
                } ${kitLight ? "bg-[linear-gradient(160deg,#eef4ff,#d8e6ff)]" : image ? "bg-[#0b2a5b]" : TONES[i % TONES.length]}`}
                data-slot={s.id}
              >
                <SlotVisual s={s} big={big} />
                {image && !kitLight && <span aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,transparent_35%,rgb(6_26_61/0.88))]" />}
                <span className={`text-[11px] font-extrabold uppercase tracking-[0.1em] ${kitLight ? "text-[#1556c4]" : "text-[#ffd600]"}`}>{s.kicker}</span>
                <span className={`font-title font-black uppercase leading-[0.95] ${big ? "text-[28px] lg:text-[36px]" : "text-[19px]"} ${kitLight ? "text-[#0b1e3a]" : "text-white"}`}>{s.title}</span>
                {big && <span className={`mt-1 max-w-[46ch] text-[13.5px] leading-snug ${kitLight ? "text-[#23406e]" : "text-white/85"}`}>{s.text}</span>}
                <span className={`mt-1.5 inline-flex items-center gap-1 text-[13px] font-bold ${kitLight ? "text-[#1556c4]" : "text-white"}`}>
                  {s.cta}
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* --------------------------------------------------------------- 5. join */

type Service = { id: string; icon: LucideIcon; title: string; text: string; cta: string; to?: string; href?: string };

const SERVICES: readonly Service[] = [
  { id: "iride", icon: MessageCircle, title: "Iride, segreteria AI", text: "Risponde su WhatsApp 24 ore su 24.", cta: "Scrivi", href: SEGRETERIA_WHATSAPP.chatUrl },
  { id: "app", icon: Download, title: "Installa l'app", text: "Gare e comunicazioni sul telefono.", cta: "Installa", to: "/installa" },
];

function ServiceRow({ s }: { s: Service }) {
  const body = (
    <>
      <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-[12px] bg-[#e8f0fd] text-[#1556c4]">
        <s.icon className="size-[22px]" strokeWidth={2.1} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-extrabold leading-tight text-[#0b1e3a]">{s.title}</span>
        <span className="mt-0.5 block text-[13px] leading-snug text-[#4a5d7a]">{s.text}</span>
      </span>
      <span className="inline-flex min-h-10 shrink-0 items-center rounded-[10px] bg-[#eef3f9] px-3.5 text-[14px] font-bold text-[#1556c4]">{s.cta}</span>
    </>
  );
  const cls = `${PANEL} scd-focus flex items-center gap-3 p-3 hover:border-[#1556c4]`;
  return (
    <li>
      {s.href ? (
        <a href={s.href} target="_blank" rel="noopener noreferrer" className={cls} aria-label={`${s.title}: ${s.cta} (apre WhatsApp in una nuova scheda)`} data-service={s.id}>
          {body}
        </a>
      ) : (
        <Link to={s.to as never} className={cls} data-service={s.id}>
          {body}
        </Link>
      )}
    </li>
  );
}

function JoinPanel() {
  return (
    <section aria-labelledby="home-join-t" className={`${PANEL} grid gap-3 p-4`} data-testid="home-join-panel">
      <div className="flex items-center gap-3">
        <ClubCrestOfficial size={44} />
        <div className="min-w-0">
          <h2 id="home-join-t" className="m-0 font-title text-[22px] font-black uppercase leading-none text-[#0b1e3a]">
            Entra nel club
          </h2>
          <p className="m-0 mt-1 text-[13px] leading-snug text-[#4a5d7a]">Allenamenti, convocazioni e la tua area con un solo account.</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Link to="/accedi" className="scd-focus inline-flex min-h-11 items-center justify-center gap-1.5 rounded-[10px] border-2 border-[#0b2a5b] text-[14.5px] font-bold text-[#0b2a5b] hover:bg-[#eef3f9]">
          <LogIn className="size-4" aria-hidden="true" />
          Accedi
        </Link>
        <Link to="/registrati" className="scd-focus inline-flex min-h-11 items-center justify-center gap-1.5 rounded-[10px] bg-[#ffd600] text-[14.5px] font-extrabold text-[#061a3d] hover:brightness-95" data-testid="home-join">
          <UserPlus className="size-4" aria-hidden="true" />
          Registrati
        </Link>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- page */

export function HomeLobby({
  calendar,
  vetrina,
  nowMs: serverNow,
  today,
}: {
  calendar: PublicCalendar;
  vetrina?: Readonly<Record<VetrinaWorld, readonly VetrinaSlot[]>> | undefined;
  nowMs: number;
  today: string;
}) {
  const nowMs = useMinuteClock(serverNow);
  const week = useMemo(() => weekBoardEvents(calendar.events, today), [calendar.events, today]);
  const slots = (vetrina?.tutti ?? []).slice(0, 5);
  const mode = homeMode(today);
  return (
    <div className={`${WRAP} grid grid-cols-[minmax(0,1fr)] gap-7 pt-4 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:gap-7 lg:pt-6`} data-testid="home-lobby">
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-7 lg:gap-9">
        <Ticker events={week} groups={calendar.groups} />
        <Credentials />
        {mode === "partite" ? (
          <>
            <MatchBoard events={week} groups={calendar.groups} today={today} nowMs={nowMs} />
            <Teams calendar={calendar} today={today} />
            <Magazine slots={slots} />
          </>
        ) : (
          <>
            <Magazine slots={slots} />
            <Teams calendar={calendar} today={today} />
          </>
        )}
        <div className="grid gap-3 lg:hidden">
          <JoinPanel />
          <ul className="m-0 grid list-none gap-2.5 p-0">
            {SERVICES.map((s) => (
              <ServiceRow key={s.id} s={s} />
            ))}
          </ul>
        </div>
      </div>
      <aside className="hidden min-w-0 gap-3 lg:sticky lg:top-[calc(var(--pub-header-h)+20px)] lg:grid" aria-label="Il tuo club" data-testid="home-rail">
        <JoinPanel />
        <ul className="m-0 grid list-none gap-2.5 p-0">
          {SERVICES.map((s) => (
            <ServiceRow key={s.id} s={s} />
          ))}
        </ul>
      </aside>
    </div>
  );
}
