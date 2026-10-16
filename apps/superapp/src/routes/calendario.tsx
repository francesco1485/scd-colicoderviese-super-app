import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, ArrowRight, CalendarDays, ChevronLeft, ChevronRight, Link2, Lock, MapPin, RefreshCw, Search, Share2 } from "lucide-react";

import { getSession } from "@/lib/auth.functions";
import { getPublicCalendarSnapshot } from "@/lib/calendar.functions";
import { getTrainingQuadro } from "@/lib/quadro.functions";
import { ClubCrestOfficial } from "@/components/SiteChrome";
import { ConeIcon } from "@/components/scd/icons";
import { PersonaAvatar } from "@/components/scd/SkyJolly";
import { OfficialResults } from "@/components/scd/OfficialResults";
import { CARD, GameRow, LABEL, LiveBanner, NextMatchRow, TeamChips, TrainingRow, type TrainingItem } from "@/components/calendario/CalendarioLive";
import { venueShort } from "@/components/home/HomeSections";
import { PLACE_STYLE, countdownText, dayAnchor, dayHeading, groupByDay, nextHomeGame, weekCells } from "@/lib/calendario-layout";
import { opponentLabel } from "@/lib/crests";
import { siteById } from "@/lib/facilities";
import { addDays, groupShort, monthRange, trainingRowsFor, upcomingMatches, weekRange } from "@/lib/board-data";
import {
  DAY_VIEWS, dayOf, dayStrip, followedFirst, gamesOn, isDayView, nextForFollowed, nextGameDay, previousGameDay,
  readFollowed, toggleFollowed, writeFollowed, type DayView,
} from "@/lib/calendario-live";
import { romeParts } from "@/lib/home-week";
import { EMPTY_MESSAGE, WINDOWS, freshnessLabel, resolveAnnata, windowEnd, trainingKeyFor, type WindowDays, type PublicEvent, type PublicGroup } from "@/lib/public-snapshots";
import { BoardMenuButton } from "@/components/scd/BoardMenuButton";
import { PUBLIC_PAGES, pageHead } from "@/lib/share";

/*
 * Public page "Partite" (/calendario) in the SCD METAL "via di mezzo" design of the home (Francesco 16/10/2026: «un
 * colore uguale e un po più metallico… mettere in pista in modo definitivo», next step "the same design on Partite").
 * Phone: compact brushed-navy band with the official crest, the live pulse, IERI / OGGI / DOMANI / Calendario (gold =
 * active) and the calendar views; then white cards: the week with its seven days, match rows grouped by day (big
 * time, sole = home, azzurro = away, red = live only, venue and pitch, "da confermare" kept). Desktop: SiteChrome
 * sidebar, list in the centre, right column with "Prossima in casa", "Come arrivare" (/impianti) and "Rotazione
 * campi". No card wall, no carousel, no pitch photo. Followed teams ("Le mie squadre", star, kept on this device
 * only) come first. Pure logic: lib/calendario-live.ts and lib/calendario-layout.ts (tested).
 *
 * Our side is the official club crest + "ColicoDerviese <team>"; annata crests stay internal (Direzione,
 * 13/10/2026). UD-100 ("Le squadre sono dentro non fuori"): anonymous visitors get the games only (the server strips
 * trainings, notes and annata crest files) plus an "Entra per allenamenti e dettagli" hint; training rows, training
 * links and the teams link exist only for signed-in members (calendar audience "member").
 */
const VIEWS = ["prossime", "settimana", "mese", "stagione", ...DAY_VIEWS] as const;
const PLACES = ["tutte", "casa", "fuori"] as const;
type View = (typeof VIEWS)[number];
type Place = (typeof PLACES)[number];
type Search = { annata?: string | undefined; vista?: View | undefined; luogo?: Place | undefined; p?: number | undefined; entro?: WindowDays | undefined };

export const Route = createFileRoute("/calendario")({
  validateSearch: (s: Record<string, unknown>): Search => {
    const out: Search = {};
    if (typeof s["annata"] === "string" || typeof s["annata"] === "number") out.annata = String(s["annata"]).slice(0, 40);
    if (VIEWS.includes(s["vista"] as View)) out.vista = s["vista"] as View;
    if (PLACES.includes(s["luogo"] as Place)) out.luogo = s["luogo"] as Place;
    const p = Number(s["p"]);
    if (Number.isInteger(p) && p !== 0 && Math.abs(p) < 60) out.p = p;
    const en = Number(s["entro"]);
    if ((WINDOWS as readonly number[]).includes(en)) out.entro = en as WindowDays;
    return out;
  },
  loader: async () => {
    const [cal, session] = await Promise.all([getPublicCalendarSnapshot(), getSession()]);
    // Training board only for members: anonymous visitors never receive the slots in the loader data.
    const trainingSlots = cal.audience === "member" ? (await getTrainingQuadro()).quadro.slots : [];
    return { ...cal, trainingSlots, access: accessState(session), serverNow: Date.now() };
  },
  head: () => pageHead(PUBLIC_PAGES.calendario),
  component: Calendario,
});

/**
 * Base access (r85): a signed-in person with no enabled area sees calendar and activities; a suspended or not yet
 * active login is told so. Nothing personal is shown either way.
 */
type AccessState = "base" | "suspended" | null;
function accessState(s: { user: { email: string } | null; roles: string[]; memberships: unknown[] }): AccessState {
  if (!s.user) return null;
  if (s.memberships.length === 0) return "suspended";
  return s.roles.length === 0 ? "base" : null;
}

function BaseAccessNotice({ state }: { state: Exclude<AccessState, null> }) {
  return (
    <p role="status" className="m-0 rounded-[12px] border border-[#f2d675] bg-[#fffbea] px-3 py-2.5 text-[14.5px] leading-snug text-[#5a4500]" data-testid="base-access-notice">
      {state === "base" ? (
        <>Sei dentro. Per ora vedi calendario e <Link to="/eventi" className="font-bold underline underline-offset-2">attività</Link> del club: la Direzione abilita le funzioni del tuo ruolo (la tua squadra, i tuoi figli, il tuo lavoro) dopo aver verificato i tuoi dati.</>
      ) : (
        <>Il tuo accesso non è attivo in questo momento. Puoi consultare il calendario; per riattivarlo scrivi alla segreteria del club.</>
      )}
    </p>
  );
}

const WRAP = "mx-auto w-full max-w-[1240px] px-4 lg:px-8";
const fmt = (iso: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("it-IT", { timeZone: "UTC", ...o }).format(new Date(`${iso}T12:00:00Z`));
const romeAt = (ms: number) => romeParts(new Date(ms).toISOString()) ?? { date: new Date(ms).toISOString().slice(0, 10), time: "00:00" };

type Row =
  | { kind: "gara"; id: string; date: string; time: string; e: PublicEvent; g: PublicGroup | undefined }
  | ({ kind: "allenamento" } & TrainingItem);

/** Minute clock: server time on the first render (no hydration mismatch), then the device clock. */
function useMinuteClock(serverNow: number): number {
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

function Calendario() {
  const { season, sourceModifiedAt, groups, events, origin, access, audience, trainingSlots, serverNow } = Route.useLoaderData();
  const member = audience === "member";
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState<string | null>(null);
  async function refresh() {
    const before = `${origin}|${sourceModifiedAt}|${events.length}`;
    setRefreshing(true); setRefreshMsg(null);
    try {
      const r = await getPublicCalendarSnapshot({ data: { refresh: true } });
      const after = `${r.origin}|${r.sourceModifiedAt}|${r.events.length}`;
      if (after !== before) { await router.invalidate(); setRefreshMsg("Calendario aggiornato"); }
      else setRefreshMsg(r.throttled ? "Nessuna modifica verificata (nuovo controllo possibile tra poco)" : "Nessuna modifica verificata");
    } catch { setRefreshMsg("Aggiornamento non riuscito, riprova più tardi"); }
    finally { setRefreshing(false); setTimeout(() => setRefreshMsg(null), 5000); }
  }
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  // Tavola: la vista iniziale è "Settimana"; i link condivisi per annata/finestra aprono "Squadra".
  const view: View = search.vista ?? (search.annata || search.entro ? "prossime" : "settimana");
  const dayView: DayView | null = isDayView(view) ? view : null;
  const tab = dayView ? "Giorno" : view === "settimana" ? "Settimana" : view === "mese" ? "Mese" : "Squadra";
  const place = search.luogo ?? "tutte";
  const offset = search.p ?? 0;
  const selected = search.annata ? resolveAnnata(groups, search.annata) : null;
  const nowMs = useMinuteClock(serverNow);
  const now = romeAt(nowMs);
  const today = now.date;
  const [openId, setOpenId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [canShare, setCanShare] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  useEffect(() => setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function"), []);

  // "Le mie squadre": followed teams kept on this device only (localStorage behind try/catch in the lib).
  const [followed, setFollowed] = useState<string[]>([]);
  useEffect(() => {
    let store: Storage | null = null;
    try { store = window.localStorage; } catch { store = null; }
    setFollowed(readFollowed(store));
  }, []);
  function follow(id: string) {
    setFollowed((prev) => {
      const next = toggleFollowed(prev, id);
      let store: Storage | null = null;
      try { store = window.localStorage; } catch { store = null; }
      writeFollowed(store, next);
      return next;
    });
  }

  const set = (patch: Partial<Search>) => navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true, resetScroll: false });
  const choices = useMemo(() => followedFirst(groups, followed), [groups, followed]);
  const groupOf = (id: string) => groups.find((x) => x.id === id);

  const [from, to, label] = useMemo((): [string, string, string] => {
    if (dayView) { const d = dayOf(dayView, today); return [d, d, fmt(d, { weekday: "long", day: "numeric", month: "long" })]; }
    if (view === "settimana") { const w = weekRange(today, offset); return [w.from, w.to, w.label]; }
    if (view === "mese") { const m = monthRange(today, offset); return [m.from, m.to, m.label]; }
    if (view === "prossime") return search.entro
      ? [today, windowEnd(today, search.entro), search.entro === 180 ? "Prossimi 6 mesi" : `Prossimi ${search.entro} giorni`]
      : [today, "9999-12-31", "Da oggi in avanti"];
    return ["0000-01-01", "9999-12-31", `Tutta la stagione ${season}`];
  }, [dayView, view, offset, today, season, search.entro]);

  const matchesFilter = (e: PublicEvent) => (!selected || e.group === selected.id) && (place === "tutte" || (place === "casa" ? e.homeAway === "CASA" : e.homeAway === "FUORI"));
  const filtered = events.filter(matchesFilter);
  const visible = dayView ? gamesOn(filtered, from) : filtered.filter((e) => e.date >= from && e.date <= to);
  const trainingKey = useMemo(() => (member && selected ? trainingKeyFor(selected, trainingSlots) : null), [member, selected, trainingSlots]);

  // Calendario = partite ed eventi; il quadro allenamenti è distinto (decisione Direzione, export 10/10).
  // Gli allenamenti entrano qui solo per i soci e la PROPRIA annata scelta, settimana corrente o un giorno, sede Colico.
  const trainingRows: Row[] = useMemo(() => {
    if (!member || place === "fuori" || !selected || !trainingKey) return [];
    const days = dayView ? [from] : view === "settimana" && offset === 0 ? Array.from({ length: 7 }, (_, i) => addDays(from, i)) : [];
    return days.flatMap((date): Row[] =>
      trainingRowsFor(date, trainingSlots, trainingKey).map((t) => ({ kind: "allenamento", id: t.id, date, time: t.time, title: `Allenamento ${t.teams}`, sub: `Centro Sportivo - Colico · Campo ${t.field.slice(1)}`, teams: `${t.time}–${t.end}` })),
    );
  }, [member, dayView, view, offset, place, selected, trainingKey, from, trainingSlots]);

  const firstBlock = selected ? 6 : 8;
  const [extra, setExtra] = useState(0);
  useEffect(() => setExtra(0), [view, place, selected?.id, search.entro]);
  const limit = view === "prossime" ? firstBlock + extra : Infinity;
  const shown = visible.slice(0, limit);
  const remaining = visible.length - shown.length;
  const rows: Row[] = [...shown.map((e): Row => ({ kind: "gara", id: e.id, date: e.date, time: e.time, e, g: groupOf(e.group) })), ...trainingRows]
    .sort((a, b) => (a.date + (a.time || "99:99")).localeCompare(b.date + (b.time || "99:99")));
  const nextMatches = upcomingMatches(events, today, now.time).filter(matchesFilter).slice(0, 3);
  const mine = useMemo(() => nextForFollowed(events, followed, nowMs), [events, followed, nowMs]);
  const strip = dayStrip(today).map((d) => ({ ...d, count: gamesOn(filtered, d.date).length }));
  const emptyNext = dayView ? nextGameDay(filtered, from) : null;
  const emptyPrev = dayView === "ieri" ? previousGameDay(filtered, from) : null;

  function shareUrl() {
    const u = new URL("/calendario", window.location.origin);
    if (selected) u.searchParams.set("annata", selected.years[0] ?? selected.id);
    if (view === "prossime" && search.entro) u.searchParams.set("entro", String(search.entro));
    return u.toString();
  }
  async function copyLink() {
    const url = shareUrl();
    try {
      await navigator.clipboard.writeText(url);
      setCopied("Link copiato");
    } catch {
      const ta = document.createElement("textarea");
      ta.value = url; document.body.appendChild(ta); ta.select();
      const ok = document.execCommand("copy"); ta.remove();
      setCopied(ok ? "Link copiato" : `Copia a mano: ${url}`);
    }
    setTimeout(() => setCopied(null), 4000);
  }
  async function shareLink() {
    try { await navigator.share({ title: `Calendario SCD ${selected?.label ?? ""}`.trim(), url: shareUrl() }); } catch { /* annullato */ }
  }
  const pickTeam = (g: PublicGroup | undefined) => { set({ annata: g ? (g.years[0] ?? g.id) : undefined, p: undefined }); setOpenId(null); };
  const filtersActive = !!selected || place !== "tutte";
  const showFilters = filtersOpen || (tab !== "Squadra" && filtersActive);
  const goDay = (d: DayView) => set({ vista: d, p: undefined, entro: undefined });
  const dayTab = (on: boolean) =>
    `scd-focus relative flex min-h-[48px] min-w-0 flex-1 flex-col items-center justify-center rounded-[8px] font-display text-[13px] font-bold uppercase tracking-[0.06em] transition-colors motion-reduce:transition-none ${on ? "scd-gold" : "text-white hover:bg-white/10"}`;
  const subTab = (on: boolean) =>
    `scd-focus relative inline-flex h-11 flex-1 items-center justify-center px-4 font-display text-[15px] font-semibold lg:flex-none ${on ? "text-white after:absolute after:inset-x-3 after:bottom-0 after:h-[3px] after:rounded-t-full after:bg-[linear-gradient(90deg,#e0ab17,#ffe27a,#e0ab17)] after:content-['']" : "text-[#c9d6f0] hover:text-white"}`;
  const homeHit = useMemo(() => nextHomeGame(selected ? events.filter((e) => e.group === selected.id) : events, nowMs), [events, selected, nowMs]);
  const groupsByDay = groupByDay(rows);
  const week = tab === "Settimana" ? weekCells(from, today, filtered) : null;
  function scrollToDay(date: string) {
    const el = document.getElementById(dayAnchor(date));
    if (!el) return;
    let reduce = false;
    try { reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { reduce = false; }
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    el.focus({ preventScroll: true });
  }

  const nextBlock = (
    <section aria-labelledby="cal-next-t" className="grid gap-2">
      <div className="flex items-end justify-between gap-3">
        <h2 id="cal-next-t" className="m-0 font-display text-[19px] font-bold leading-tight text-[#14264d]">Prossime gare</h2>
        <Link to="/calendario" search={{ ...(selected ? { annata: selected.years[0] ?? selected.id } : {}), vista: "prossime" }}
          className="scd-focus inline-flex min-h-11 items-center gap-0.5 rounded-md font-display text-[14px] font-semibold text-[#0457af]">Vedi tutte<ChevronRight className="size-4" aria-hidden="true" /></Link>
      </div>
      <ul className={`${CARD} m-0 list-none p-0`} data-testid="next-matches">
        {nextMatches.length ? nextMatches.map((e) => <NextMatchRow key={e.id} e={e} g={groupOf(e.group)} nowMs={nowMs} />)
          : <li className="px-4 py-4 text-[14px] text-[#52627f]">Nessuna gara in programma{selected ? ` per ${selected.label}` : ""}.</li>}
      </ul>
    </section>
  );

  return (
    <main data-screen="calendario" className="bg-[#f3f6fb] pb-10">
      {/* SCD METAL band (as on the home): official crest, title, live pulse, day selector and calendar views */}
      <header className="scd-band relative overflow-hidden text-white lg:-mr-12 2xl:mr-0" data-testid="calendar-header">
        <span aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(60%_120%_at_88%_0%,rgb(127_208_255/0.22),transparent_70%)]" />
        <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[2px] bg-[linear-gradient(90deg,#8ea2c6,#ffffff_22%,#b8c5dd_50%,#ffffff_78%,#8ea2c6)]" />
        <div className={`${WRAP} relative grid gap-3 pt-4 lg:gap-4 lg:pt-7 ${dayView ? "pb-4 lg:pb-5" : "pb-0"}`}>
          <div className="flex items-center gap-3 lg:gap-5">
            <Link to="/" aria-label="S.C.D. ColicoDerviese, vai alla Home" className="scd-focus shrink-0 rounded-[8px]">
              <ClubCrestOfficial size={54} className="drop-shadow-[0_6px_12px_rgb(0_0_0/0.45)] lg:hidden" />
              <ClubCrestOfficial size={84} className="hidden drop-shadow-[0_10px_20px_rgb(0_0_0/0.45)] lg:block" />
            </Link>
            <div className="grid min-w-0 flex-1 gap-0.5 lg:gap-1">
              <p className={`${LABEL} m-0 text-[#ffd84a]`}>Stagione {season}<span className="hidden min-[430px]:inline"> · Colico e Dervio</span></p>
              <h1 className="m-0 font-display text-[28px] font-bold uppercase leading-none tracking-[0.01em] lg:text-[42px]">Partite</h1>
              <p className="m-0 hidden text-[16px] text-[#dbe5f7] lg:block">Le gare di tutte le squadre ColicoDerviese, in casa e in trasferta.</p>
            </div>
            <button type="button" onClick={() => setFiltersOpen((o) => !o)} aria-expanded={showFilters} aria-controls="cal-filtri" aria-label="Cerca squadra e filtri"
              className="scd-focus grid size-11 shrink-0 place-items-center rounded-full border border-white/20 bg-white/[0.07] text-white hover:bg-white/15">
              <Search className="size-[20px]" strokeWidth={2.4} aria-hidden="true" />
            </button>
            <BoardMenuButton />
          </div>
          <LiveBanner events={filtered} groups={groups} nowMs={nowMs} />
          <nav aria-label="Giorno o calendario" className="flex flex-col gap-1 lg:flex-row lg:items-end lg:justify-between lg:gap-6">
            <div className={`flex gap-1 rounded-[10px] border border-white/12 bg-black/20 p-1 lg:w-[540px] ${dayView ? "" : "lg:mb-2"}`} role="group" aria-label="Scegli il giorno">
              {strip.map((d) => (
                <button key={d.key} type="button" aria-pressed={dayView === d.key} onClick={() => goDay(d.key)} className={dayTab(dayView === d.key)}
                  aria-label={`${d.label}, ${fmt(d.date, { weekday: "long", day: "numeric", month: "long" })}${d.count ? `, ${d.count} ${d.count === 1 ? "gara" : "gare"}` : ""}`}>
                  <span className="inline-flex items-center gap-1">{d.label}{d.count > 0 && <span className={`grid h-[17px] min-w-[17px] place-items-center rounded-full px-1 text-[10.5px] leading-none tracking-normal tabular-nums ${dayView === d.key ? "bg-[#13254d] text-white" : "bg-[#ffd84a] text-[#13254d]"}`} aria-hidden="true">{d.count}</span>}</span>
                  <span className={`text-[11px] font-semibold normal-case tracking-normal ${dayView === d.key ? "text-[#4a3800]" : "text-[#b4c3de]"}`}>{fmt(d.date, { day: "numeric", month: "short" })}</span>
                </button>
              ))}
              <button type="button" aria-pressed={!dayView} onClick={() => set({ vista: selected || search.entro ? "settimana" : undefined, p: undefined, entro: undefined })} className={dayTab(!dayView)}>
                <CalendarDays className="size-[18px]" strokeWidth={2.2} aria-hidden="true" />
                <span className="text-[11px]">Calendario</span>
              </button>
            </div>
            {!dayView && (
              <div className="flex" role="group" aria-label="Vista calendario">
                {([["Settimana", () => set({ vista: selected || search.entro ? "settimana" : undefined, p: undefined, entro: undefined })], ["Mese", () => set({ vista: "mese", p: undefined, entro: undefined })], ["Squadra", () => set({ vista: "prossime", p: undefined })]] as const).map(([l, fn]) => (
                  <button key={l} type="button" aria-pressed={tab === l} onClick={fn} className={subTab(tab === l)}>{l}</button>
                ))}
              </div>
            )}
          </nav>
        </div>
      </header>

      <div className={`${WRAP} grid grid-cols-[minmax(0,1fr)] gap-5 pt-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-6 lg:pt-6`}>
        <div className="grid min-w-0 gap-4 lg:gap-5">
          {access && <BaseAccessNotice state={access} />}

          {showFilters && (
            <div id="cal-filtri" className={`${CARD} grid gap-2 p-3 pt-4`}>
              <label htmlFor="annata" className="font-display text-[15px] font-semibold text-[#14264d]">Trova la tua annata</label>
              <select id="annata" value={selected?.id ?? ""} onChange={(e) => pickTeam(choices.find((x) => x.id === e.target.value))}
                className="h-[46px] w-full rounded-[8px] border border-[#c3cee0] bg-white px-3 text-[16px] font-semibold text-[#14264d]">
                <option value="">Tutte le annate e categorie</option>
                {choices.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
              </select>
              <PlaceSwitch place={place} onChange={(pl) => set({ luogo: pl === "tutte" ? undefined : pl })} />
            </div>
          )}
          {search.annata && !selected && <p role="alert" className="m-0 text-[15px] font-semibold">Annata “{search.annata}” non presente nel calendario: mostro tutte le categorie.</p>}

          {/* Squadre: star to follow, tap to filter; followed teams first */}
          <section aria-labelledby="cal-teams-t" className="grid gap-2">
            <h2 id="cal-teams-t" className="m-0 flex flex-wrap items-baseline justify-between gap-x-2 font-display text-[17px] font-bold text-[#14264d]">
              {followed.length ? "Le mie squadre" : "Squadre"}
              <span className="font-sans text-[12.5px] font-normal text-[#52627f]">{followed.length ? "seguite su questo dispositivo" : "tocca ☆ per seguire"}</span>
            </h2>
            <TeamChips groups={choices} followed={followed} selectedId={selected?.id ?? null} label={(g) => groupShort(g, g.label)} onPick={pickTeam} onFollow={follow} />
            {mine.length > 0 && !selected && (
              <ul className={`${CARD} m-0 list-none p-0`} data-testid="cal-my-teams">
                {mine.map((e) => <NextMatchRow key={e.id} e={e} g={groupOf(e.group)} nowMs={nowMs} />)}
              </ul>
            )}
          </section>

          {tab === "Squadra" && (
            <div className={`${CARD} grid gap-2.5 p-3 pt-4`}>
              <PlaceSwitch place={place} onChange={(pl) => set({ luogo: pl === "tutte" ? undefined : pl })} />
              <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6" role="group" aria-label="Intervallo da oggi">
                {([undefined, ...WINDOWS] as (WindowDays | undefined)[]).map((w) => {
                  const on = view === "prossime" && search.entro === w;
                  return (
                    <button key={w ?? "all"} type="button" aria-pressed={on} onClick={() => set({ vista: "prossime", entro: w })}
                      className={`scd-focus min-h-11 rounded-[8px] font-display text-[14px] font-semibold ${on ? "scd-band text-white" : "bg-[#eef2f8] text-[#14264d]"}`}>
                      {w === undefined ? "Tutte" : w === 180 ? "6 mesi" : `${w} gg`}
                    </button>
                  );
                })}
                <button type="button" aria-pressed={view === "stagione"} onClick={() => set({ vista: "stagione", entro: undefined })}
                  className={`scd-focus min-h-11 rounded-[8px] font-display text-[14px] font-semibold ${view === "stagione" ? "scd-band text-white" : "bg-[#eef2f8] text-[#14264d]"}`}>Stagione</button>
              </div>
              <p className="m-0 text-[14px] font-semibold text-[#14264d]">{label} · {view === "prossime" ? `${shown.length} di ${visible.length}` : visible.length} {visible.length === 1 ? "gara" : "gare"}{selected ? ` · ${selected.label}` : ""}</p>
              {member && selected && (trainingKey
                ? <Link to="/allenamenti" search={{ annata: trainingKey }} className="scd-focus inline-flex min-h-11 w-fit items-center gap-2 rounded-[8px] border border-[#c3cee0] px-3 text-[14px] font-bold text-[#0457af]"><ConeIcon size={20} className="text-[var(--scd-orange)]" />Allenamenti della mia annata ({trainingKey})</Link>
                : <p className="m-0 text-[13px] text-[#52627f]">Allenamenti: categoria non trovata automaticamente nel <Link to="/allenamenti" className="font-bold text-[#0457af] underline">quadro settimanale</Link>.</p>)}
            </div>
          )}

          {/* Week / month navigator with arrows (real current week); the week shows its seven days like the home */}
          {(tab === "Settimana" || tab === "Mese") && (
            <div className={`${CARD} px-1 pb-1 pt-2`} data-testid="cal-week-nav">
              <div className="flex items-center gap-1">
                <button type="button" aria-label={tab === "Mese" ? "Mese precedente" : "Settimana precedente"} onClick={() => set({ p: offset - 1 || undefined })} className="scd-focus grid size-11 place-items-center rounded-full text-[#14264d] hover:bg-[#eef2f8]"><ChevronLeft className="size-6" strokeWidth={2.4} /></button>
                <p className="m-0 flex flex-1 items-center justify-center gap-2 text-center font-display text-[17px] font-bold text-[#14264d] lg:text-[19px]" aria-live="polite">
                  <CalendarDays className="size-[18px] shrink-0 text-[#0457af]" strokeWidth={2.2} aria-hidden="true" /><span className="inline-block first-letter:uppercase">{label}</span>
                </p>
                <button type="button" aria-label={tab === "Mese" ? "Mese successivo" : "Settimana successiva"} onClick={() => set({ p: offset + 1 || undefined })} className="scd-focus grid size-11 place-items-center rounded-full text-[#14264d] hover:bg-[#eef2f8]"><ChevronRight className="size-6" strokeWidth={2.4} /></button>
              </div>
              {week && (
                <ol className="m-0 grid list-none grid-cols-7 border-t border-[#edf1f7] p-0 pt-1" aria-label="Giorni della settimana" data-testid="cal-week-days">
                  {week.map((c) => {
                    const name = fmt(c.date, { weekday: "long", day: "numeric" });
                    const body = (
                      <>
                        <span className="text-[11px] font-semibold text-[#62728f]">{c.letter}</span>
                        <span className={`relative grid size-9 place-items-center rounded-full font-display text-[15px] ${c.isToday ? "bg-[#13254d] font-bold text-white" : c.games ? "font-bold text-[#14264d]" : "text-[#62728f]"}`}>
                          {c.day}
                          {c.games > 0 && <span aria-hidden="true" className={`absolute -bottom-1 size-[6px] rounded-full ring-1 ${c.home ? "bg-[#ffd84a] ring-[#c99600]" : "bg-[#1266b8] ring-[#0b4f9e]"}`} />}
                        </span>
                      </>
                    );
                    return (
                      <li key={c.date}>
                        {c.games > 0 ? (
                          <button type="button" onClick={() => scrollToDay(c.date)} aria-label={`${name}: ${c.games} ${c.games === 1 ? "gara" : "gare"}${c.home ? `, ${c.home} in casa` : ""}, vai al giorno`}
                            className="scd-focus flex min-h-11 w-full flex-col items-center gap-0.5 rounded-md py-1 hover:bg-[#eef2f8]">{body}</button>
                        ) : (
                          <span className="flex min-h-11 flex-col items-center gap-0.5 py-1" aria-label={`${name}: nessuna gara`}>{body}</span>
                        )}
                      </li>
                    );
                  })}
                </ol>
              )}
              {offset !== 0 && <div className="flex justify-center pb-1 pt-1"><button type="button" onClick={() => set({ p: undefined })} className="scd-focus min-h-11 rounded-full border border-[#c3cee0] bg-white px-4 font-display text-[14px] font-semibold text-[#14264d] hover:bg-[#eef2f8]">{tab === "Mese" ? "Torna a questo mese" : "Torna a questa settimana"}</button></div>}
            </div>
          )}
          {dayView && <h2 className="sr-only" aria-live="polite">{label}</h2>}

          <section aria-label={label} data-testid="calendar-list" data-rows={rows.length} className="grid gap-4">
            {rows.length > 0 && (
              <p className="m-0 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-[#52627f]" data-testid="cal-legend">
                <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className={`h-3.5 w-[4px] rounded-full ${PLACE_STYLE.casa.bar}`} />In casa</span>
                <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className={`h-3.5 w-[4px] rounded-full ${PLACE_STYLE.fuori.bar}`} />Trasferta</span>
                <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-3.5 w-[4px] rounded-full bg-[#c40018]" />In campo ora</span>
                <span className="ml-auto">Tocca una gara per i dettagli</span>
              </p>
            )}
            {events.length === 0 ? <p className={`${CARD} m-0 px-4 py-10 text-center text-base text-[#52627f]`}>{EMPTY_MESSAGE}</p>
              : rows.length === 0 ? (
                <div className={`${CARD} grid justify-items-center gap-2 px-4 py-7 text-center`} data-testid="calendar-empty">
                  <p className="m-0 text-[15px] font-semibold text-[#14264d]">Nessuna gara {dayView ? (dayView === "oggi" ? "oggi" : dayView === "ieri" ? "ieri" : "domani") : "in questo periodo"}{selected ? ` per ${selected.label}` : ""}.</p>
                  {(emptyNext || emptyPrev) && (
                    <div className="flex flex-wrap justify-center gap-2">
                      {emptyPrev && <button type="button" onClick={() => set({ vista: "settimana", p: weekShift(today, emptyPrev) || undefined })} className="scd-focus min-h-11 rounded-[8px] border border-[#c3cee0] bg-white px-4 font-display text-[14px] font-semibold text-[#14264d]">Ultima giornata: {fmt(emptyPrev, { weekday: "short", day: "numeric", month: "short" })}</button>}
                      {emptyNext && <button type="button" onClick={() => set({ vista: "settimana", p: weekShift(today, emptyNext) || undefined })} className="scd-focus scd-gold min-h-11 rounded-[8px] px-4 font-display text-[14px] font-semibold">Prossima giornata: {fmt(emptyNext, { weekday: "short", day: "numeric", month: "short" })}</button>}
                    </div>
                  )}
                </div>
              )
              : groupsByDay.map((day) => {
                const h = dayHeading(day.date, today);
                const games = day.rows.filter((r) => r.kind === "gara").length;
                return (
                  <section key={day.date} id={dayAnchor(day.date)} tabIndex={-1} aria-labelledby={`${dayAnchor(day.date)}-t`} className="grid scroll-mt-24 gap-2 outline-none" data-testid="cal-day">
                    <h3 id={`${dayAnchor(day.date)}-t`} className="m-0 flex items-baseline gap-2 font-display text-[18px] font-bold leading-tight text-[#14264d] lg:text-[20px]">
                      {h.lead && <span className={`${LABEL} rounded-[4px] px-1.5 py-[3px] ${h.lead === "Oggi" ? "scd-band text-white" : "bg-[#e6eefb] text-[#034a96]"}`}>{h.lead}</span>}
                      <span className="first-letter:uppercase">{h.text}</span>
                      {games > 0 && <span className="font-sans text-[13px] font-normal text-[#52627f]">{games} {games === 1 ? "gara" : "gare"}</span>}
                    </h3>
                    <ul className={`${CARD} m-0 list-none p-0`}>
                      {day.rows.map((r) => r.kind === "gara"
                        ? <GameRow key={r.id} e={r.e} g={r.g} nowMs={nowMs} open={openId === r.id} toggle={() => setOpenId(openId === r.id ? null : r.id)} followed={!!r.g && followed.includes(r.g.id)} onFollow={follow} />
                        : <TrainingRow key={r.id} r={r} />)}
                    </ul>
                  </section>
                );
              })}
            {remaining > 0 && (
              <button type="button" onClick={() => setExtra((x) => x + 8)} className="scd-focus min-h-[46px] w-full rounded-[8px] border border-[#c3cee0] bg-white font-display text-[15px] font-semibold text-[#14264d] hover:bg-[#eef2f8]">
                Mostra altre {Math.min(8, remaining)}
              </button>
            )}
            {trainingRows.length > 0 && <p className="m-0 text-[12px] text-[#52627f]">Allenamenti dal quadro settimanale lun–ven (fotografia 09/10/2026, non live).</p>}
          </section>

          {tab !== "Squadra" && (
            <button type="button" onClick={() => set({ vista: "prossime", p: undefined })}
              className="scd-focus scd-gold flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[8px] font-display text-[16px] font-semibold">
              Vedi tutte le gare <ArrowRight className="size-[18px]" strokeWidth={2.4} aria-hidden="true" />
            </button>
          )}

          {!member && (
            <Link to="/accedi" search={{ next: "/calendario" }} className={`${CARD} scd-focus flex items-center gap-3 px-3 py-3 text-[#14264d] hover:border-[#0457af]`} data-testid="cal-members-hint">
              <span className="scd-band grid size-10 shrink-0 place-items-center rounded-[8px]"><Lock className="size-5 text-[#ffd84a]" aria-hidden="true" /></span>
              <span className="min-w-0 flex-1">
                <b className="block font-display text-[16px] leading-tight">Entra per allenamenti e dettagli</b>
                <small className="block text-[13px] text-[#52627f]">Qui vedi le gare; squadre e allenamenti sono nell'area soci</small>
              </span>
              <ChevronRight className="size-5 shrink-0 text-[#0457af]" aria-hidden="true" />
            </Link>
          )}
          {member && !selected && (
            <Link to="/allenamenti" className={`${CARD} scd-focus flex items-center gap-3 px-3 py-3 text-[#14264d] hover:border-[#0457af]`} data-testid="cal-training-link">
              <ConeIcon size={24} className="shrink-0 text-[var(--scd-orange)]" />
              <span className="min-w-0 flex-1">
                <b className="block font-display text-[16px] leading-tight">Allenamenti della settimana</b>
                <small className="block text-[13px] text-[#52627f]">Campi, orari e spogliatoi di tutte le annate</small>
              </span>
              <ChevronRight className="size-5 shrink-0 text-[#0457af]" aria-hidden="true" />
            </Link>
          )}
        </div>

        <aside className="grid min-w-0 gap-4 lg:sticky lg:top-[84px] lg:gap-5" aria-label="Prossima in casa, campi e informazioni">
          <NextHomeCard hit={homeHit} g={homeHit ? groupOf(homeHit.e.group) : undefined} nowMs={nowMs} teamLabel={selected?.label ?? null} />
          <HowToGetThere member={member} />
          <Link to="/calendario/rotazione-campi" className={`${CARD} scd-focus flex items-center gap-3 px-4 py-3.5 text-[#14264d] hover:border-[#0457af]`} data-testid="cal-rotazione">
            <span className="scd-band-azzurro grid size-10 shrink-0 place-items-center rounded-[8px] text-white"><ArrowLeftRight className="size-5" aria-hidden="true" /></span>
            <span className="min-w-0 flex-1">
              <b className="block font-display text-[16px] leading-tight">Rotazione campi</b>
              <small className="block text-[13px] leading-snug text-[#52627f]">Chi usa quale campo a Colico e a Dervio. Per staff e dirigenti, con accesso.</small>
            </span>
            <Lock className="size-4 shrink-0 text-[#62728f]" aria-hidden="true" /><span className="sr-only">Riservato a staff e dirigenti</span>
          </Link>

          {tab !== "Squadra" && nextBlock}

          <div className={`${CARD} p-3 pt-4 text-[13px] text-[#14264d]`}>
            <p data-calendar-origin={origin} className="m-0 font-medium">
              {origin === "mirror"
                ? <>Calendario aggiornato {freshnessLabel(sourceModifiedAt)} (Italia), da riconfermare in caso di variazioni.</>
                : origin === "stale"
                  ? <>Ultima copia verificata del {freshnessLabel(sourceModifiedAt)} — aggiornamento temporaneamente non disponibile.</>
                  : <>Copia di sicurezza del {freshnessLabel(sourceModifiedAt)} — aggiornamenti in verifica.</>}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button type="button" onClick={refresh} disabled={refreshing} aria-label="Verifica aggiornamenti del calendario" className="scd-focus inline-flex min-h-11 items-center gap-1.5 rounded-[8px] border border-[#c3cee0] bg-white px-3 font-display text-[14px] font-semibold disabled:opacity-60">
                <RefreshCw className={`size-4 ${refreshing ? "animate-spin motion-reduce:animate-none" : ""}`} aria-hidden="true" /> Verifica
              </button>
              <button type="button" onClick={copyLink} className="scd-focus scd-gold inline-flex min-h-11 items-center gap-1.5 rounded-[8px] px-3 font-display text-[14px] font-semibold"><Link2 className="size-4" aria-hidden="true" /> Copia link {selected ? "annata" : "calendario"}</button>
              {canShare && <button type="button" onClick={shareLink} className="scd-focus inline-flex min-h-11 items-center gap-1.5 rounded-[8px] border border-[#c3cee0] bg-white px-3 font-display text-[14px] font-semibold"><Share2 className="size-4" aria-hidden="true" /> Condividi</button>}
              <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("vera:open"))} aria-label="Chiedi a Iride, l'assistente AI della segreteria" className="scd-focus inline-flex min-h-11 items-center gap-1.5 rounded-[8px] border border-[#c3cee0] bg-white px-2 font-display text-[14px] font-semibold min-[641px]:hidden">
                <PersonaAvatar persona="vera" size={24} /> Chiedi a Iride
              </button>
            </div>
            <p role="status" aria-live="polite" className="m-0 mt-1 min-h-0 text-[13px] font-semibold text-[#0457af]">{refreshMsg ?? copied}</p>
          </div>

          <OfficialResults />
        </aside>
      </div>
    </main>
  );
}

/**
 * "Prossima in casa" (right column on desktop, after the list on phones): sole band = home game. Countdown calculated
 * from the calendar kick-off; nothing shown that the calendar does not say.
 */
function NextHomeCard({ hit, g, nowMs, teamLabel }: { hit: { e: PublicEvent; at: number } | null; g: PublicGroup | undefined; nowMs: number; teamLabel: string | null }) {
  const team = hit ? groupShort(g, hit.e.category) : "";
  const opp = hit ? opponentLabel(hit.e.opponent) : "";
  return (
    <section aria-labelledby="cal-home-t" className={CARD} data-testid="cal-next-home">
      <div className="scd-band-sole px-4 pb-3 pt-4">
        <h2 id="cal-home-t" className={`${LABEL} m-0 text-[#034a96]`}>Prossima in casa{teamLabel ? ` · ${teamLabel}` : ""}</h2>
        <p className="m-0 mt-1 font-display text-[24px] font-bold leading-none text-[#13254d]">{hit ? countdownText(hit.at - nowMs) : "Nessuna in calendario"}</p>
        {hit && <p className="m-0 mt-1 text-[12px] text-[#3a4a6b]">calcolato dall'orario in calendario</p>}
      </div>
      {hit ? (
        <div className="grid gap-2 px-4 pb-4 pt-3">
          <p className="m-0 font-display text-[16px] leading-tight text-[#14264d]">
            <b>{team}</b> <span className="text-[#62728f]">con</span> {opp || "avversario da definire"}
          </p>
          <p className="m-0 text-[13px] leading-snug text-[#52627f]">
            {fmt(hit.e.date, { weekday: "long", day: "numeric", month: "long" })} · ore {hit.e.time}
            {hit.e.venue ? ` · ${venueShort(hit.e.venue)}` : ""}
            {hit.e.timeConfirmed && hit.e.venueConfirmed ? "" : " · da confermare"}
          </p>
          <Link to="/calendario" search={{ annata: g ? (g.years[0] ?? g.id) : undefined, vista: "prossime" }} className="scd-focus scd-gold mt-1 inline-flex min-h-11 w-fit items-center gap-1.5 rounded-[8px] px-3 font-display text-[14px] font-semibold">
            Le gare di {team}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      ) : (
        <p className="m-0 px-4 pb-4 pt-3 text-[13px] text-[#52627f]">Quando in calendario c’è una gara in casa con orario, la trovi qui.</p>
      )}
    </section>
  );
}

/** "Come arrivare": the two sites from the facilities master (address or "da verificare"), then the map page. */
function HowToGetThere({ member }: { member: boolean }) {
  const sites = [siteById("SED-COL"), siteById("SED-DER")].filter((s): s is NonNullable<typeof s> => Boolean(s));
  return (
    <section aria-labelledby="cal-where-t" className={`${CARD} grid gap-2.5 px-4 pb-4 pt-4`} data-testid="cal-come-arrivare">
      <h2 id="cal-where-t" className="m-0 font-display text-[19px] font-bold leading-tight text-[#14264d]">Come arrivare</h2>
      <ul className="m-0 grid list-none gap-2 p-0">
        {sites.map((s) => (
          <li key={s.id} className="flex items-start gap-2">
            <MapPin className="mt-0.5 size-4 shrink-0 text-[#0457af]" aria-hidden="true" />
            <span className="min-w-0 text-[13.5px] leading-snug">
              <b className="block font-display text-[15px] text-[#14264d]">{s.name}</b>
              <span className="text-[#52627f]">{s.address ? `${s.address}, ${s.municipality}` : `${s.municipality} · indirizzo da verificare`}</span>
            </span>
          </li>
        ))}
      </ul>
      <Link to="/impianti" className="scd-focus inline-flex min-h-11 items-center justify-center gap-1.5 rounded-[8px] border border-[#c3cee0] font-display text-[14px] font-semibold text-[#13254d] hover:bg-[#eef2f8]">
        Mappa dei campi e ingressi
        <ChevronRight className="size-4" aria-hidden="true" />
      </Link>
      {member && <Link to="/squadre" className="scd-focus inline-flex min-h-11 items-center justify-center rounded-md text-[13.5px] font-bold text-[#0457af] underline">Tutte le squadre</Link>}
    </section>
  );
}

/** Week offset from the current week to the week holding `date` (to jump to the nearest game day). */
function weekShift(today: string, date: string) {
  const a = Date.parse(`${weekRange(today).from}T12:00:00Z`);
  const b = Date.parse(`${weekRange(date).from}T12:00:00Z`);
  return Math.round((b - a) / (7 * 86_400_000));
}

function PlaceSwitch({ place, onChange }: { place: Place; onChange: (p: Place) => void }) {
  return (
    <div className="grid grid-cols-3 gap-[6px]" role="group" aria-label="Casa o trasferta">
      {PLACES.map((pl) => (
        <button key={pl} type="button" aria-pressed={place === pl} onClick={() => onChange(pl)}
          className={`scd-focus h-[40px] rounded-full text-[13px] font-bold uppercase ${place === pl ? "bg-[#1556c4] text-white" : "bg-[#eef3f9] text-[#0b2a5b]"}`}>
          {pl === "fuori" ? "Trasferta" : pl === "casa" ? "Casa" : "Tutte"}
        </button>
      ))}
    </div>
  );
}
