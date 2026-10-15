import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, Link2, Lock, RefreshCw, Search, Share2 } from "lucide-react";

import { getSession } from "@/lib/auth.functions";
import { getPublicCalendarSnapshot } from "@/lib/calendar.functions";
import { getTrainingQuadro } from "@/lib/quadro.functions";
import { ClubCrestOfficial } from "@/components/SiteChrome";
import { ConeIcon } from "@/components/scd/icons";
import { KitTexture } from "@/components/scd/kit-texture";
import { PersonaAvatar } from "@/components/scd/SkyJolly";
import { OfficialResults } from "@/components/scd/OfficialResults";
import { CARD, GameRow, LiveBanner, NextMatchRow, TeamChips, TrainingRow, type TrainingItem } from "@/components/calendario/CalendarioLive";
import { addDays, groupShort, monthRange, trainingRowsFor, upcomingMatches, weekRange } from "@/lib/board-data";
import {
  DAY_VIEWS, dayOf, dayStrip, followedFirst, gamesOn, isDayView, nextForFollowed, nextGameDay, previousGameDay,
  readFollowed, toggleFollowed, writeFollowed, type DayView,
} from "@/lib/calendario-live";
import { romeParts } from "@/lib/home-week";
import { EMPTY_MESSAGE, WINDOWS, freshnessLabel, resolveAnnata, windowEnd, trainingKeyFor, type WindowDays, type PublicEvent, type PublicGroup } from "@/lib/public-snapshots";

/*
 * Public page "Calendario live" (board VR-009 screen 2, Francesco 15/10/2026): hero with the lake photo, the official
 * crest and the live pulse (red minute during a game, countdown otherwise); IERI / OGGI / DOMANI / Calendario tabs;
 * week header with arrows on the real current week; white rows with coloured bar, date block, round type icon,
 * bold title, place; the blue full-width button; "Prossime gare". Followed teams ("Le mie squadre", star, kept on
 * this device only) come first. Pure logic: lib/calendario-live.ts (tested).
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
  head: () => ({
    meta: [
      { title: "Calendario 2026/27 — S.C.D. ColicoDerviese" },
      { name: "description", content: "Le gare SCD di ieri, oggi, domani e della settimana: casa e trasferta, stagione 2026/27. Dati da riconfermare in caso di variazioni." },
      { property: "og:title", content: "Calendario 2026/27 — S.C.D. ColicoDerviese" },
      { property: "og:description", content: "Le gare SCD della stagione 2026/27 per giorno, settimana, mese e squadra." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
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

const WRAP = "mx-auto w-full max-w-[1280px] px-4 lg:px-8";
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
  const tabBtn = (on: boolean) => `scd-focus relative flex h-[48px] min-w-0 flex-1 flex-col items-center justify-center rounded-[12px] text-[13px] font-extrabold uppercase tracking-[0.03em] transition-colors ${on ? "bg-[#0b2a5b] text-white shadow-[0_4px_12px_-4px_rgb(11_42_91/0.6)]" : "text-[#0b2a5b] hover:bg-[#eef3f9]"}`;

  const nextBlock = (
    <section aria-labelledby="cal-next-t" className="grid gap-[10px]">
      <div className="flex items-end justify-between gap-3">
        <h2 id="cal-next-t" className="m-0 inline-flex items-center rounded-[12px] bg-[#1556c4] py-[8px] pl-3 pr-7 font-uv text-[17px] uppercase leading-none tracking-[0.03em] text-white shadow-[0_6px_14px_-8px_rgb(11_42_91/0.7)] [clip-path:polygon(0_0,88%_0,100%_100%,0_100%)]">Prossime gare</h2>
        <Link to="/calendario" search={{ ...(selected ? { annata: selected.years[0] ?? selected.id } : {}), vista: "prossime" }}
          className="scd-focus inline-flex h-[36px] items-center gap-0.5 rounded-full bg-white px-3 text-[13.5px] font-bold text-[#1556c4] shadow-[0_1px_3px_rgb(11_42_91/0.14)] hover:underline">Vedi tutte<ChevronRight className="size-4" aria-hidden="true" /></Link>
      </div>
      <ul className="m-0 grid list-none gap-[8px] p-0" data-testid="next-matches">
        {nextMatches.length ? nextMatches.map((e) => <NextMatchRow key={e.id} e={e} g={groupOf(e.group)} nowMs={nowMs} />)
          : <li className={`${CARD} px-4 py-4 text-[14px] text-[#4a5d7a]`}>Nessuna gara in programma{selected ? ` per ${selected.label}` : ""}.</li>}
      </ul>
    </section>
  );

  return (
    <main data-screen="calendario" className="bg-[#eef3f9] pb-10">
      {/* Hero: lake photo with a slow zoom, official crest, title and the live pulse */}
      <header className="relative isolate overflow-hidden bg-[#0b2a5b] text-white" data-testid="calendar-header">
        <img src="/media/scd/lario-header.webp" alt="" aria-hidden="true" fetchPriority="high" decoding="async"
          className="scd-board-kb absolute inset-0 -z-20 size-full object-cover object-[center_62%]" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgb(11_42_120/0.88)_0%,rgb(11_42_120/0.35)_45%,rgb(6_26_80/0.9)_100%)] lg:bg-[linear-gradient(90deg,rgb(6_26_80/0.95)_0%,rgb(8_30_90/0.8)_50%,rgb(11_42_120/0.3)_100%)]" />
        <KitTexture motif="mountains-lake" overlay />
        <div className={`${WRAP} relative grid gap-3 pb-14 pt-5 lg:pb-20 lg:pt-8`}>
          <div className="flex items-center gap-3">
            <Link to="/" aria-label="S.C.D. ColicoDerviese, vai alla Home" className="scd-focus shrink-0 rounded-[8px]">
              <ClubCrestOfficial size={62} className="scd-board-pop drop-shadow-[0_6px_12px_rgb(0_0_0/0.45)] lg:hidden" />
              <ClubCrestOfficial size={96} className="scd-board-pop hidden drop-shadow-[0_8px_16px_rgb(0_0_0/0.5)] lg:block" />
            </Link>
            <div className="min-w-0 flex-1">
              <p className="m-0 text-[12.5px] font-extrabold uppercase tracking-[0.12em] text-[#ffd600] lg:text-[14px]">Stagione {season}</p>
              <h1 className="m-0 font-uv text-[38px] uppercase leading-[0.95] lg:text-[64px]">Calendario live</h1>
              <p className="m-0 mt-1 hidden text-[17px] font-semibold text-white/90 lg:block">Le gare di tutte le squadre ColicoDerviese, in casa e in trasferta.</p>
            </div>
            <button type="button" onClick={() => setFiltersOpen((o) => !o)} aria-expanded={showFilters} aria-controls="cal-filtri" aria-label="Cerca squadra e filtri"
              className="scd-focus grid size-11 shrink-0 place-items-center rounded-full bg-white/12 text-white backdrop-blur-sm hover:bg-white/20">
              <Search className="size-[22px]" strokeWidth={2.4} aria-hidden="true" />
            </button>
          </div>
          <LiveBanner events={filtered} groups={groups} nowMs={nowMs} />
        </div>
      </header>

      <div className={`${WRAP} relative -mt-9 grid gap-5 lg:-mt-12 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start lg:gap-8`}>
        <div className="grid min-w-0 gap-4">
          {/* IERI / OGGI / DOMANI + Calendario */}
          <nav aria-label="Giorno o calendario" className={`${CARD} grid gap-2 p-2`}>
            <div className="flex gap-1.5" role="group" aria-label="Scegli il giorno">
              {strip.map((d) => (
                <button key={d.key} type="button" aria-pressed={dayView === d.key} onClick={() => goDay(d.key)} className={tabBtn(dayView === d.key)}
                  aria-label={`${d.label}, ${fmt(d.date, { weekday: "long", day: "numeric", month: "long" })}${d.count ? `, ${d.count} ${d.count === 1 ? "gara" : "gare"}` : ""}`}>
                  <span className="inline-flex items-center gap-1">{d.label}{d.count > 0 && <span className="grid h-[17px] min-w-[17px] place-items-center rounded-full bg-[#ffd600] px-1 text-[10.5px] font-extrabold leading-none tracking-normal text-[#0b2a5b] tabular-nums" aria-hidden="true">{d.count}</span>}</span>
                  <span className={`text-[11px] font-bold normal-case tracking-normal ${dayView === d.key ? "text-white/80" : "text-[#4a5d7a]"}`}>{fmt(d.date, { day: "numeric", month: "short" })}</span>
                </button>
              ))}
              <button type="button" aria-pressed={!dayView} onClick={() => set({ vista: selected || search.entro ? "settimana" : undefined, p: undefined, entro: undefined })} className={tabBtn(!dayView)}>
                <CalendarDays className="size-[18px]" strokeWidth={2.4} aria-hidden="true" />
                <span className="text-[11px]">Calendario</span>
              </button>
            </div>
            {!dayView && (
              <div className="flex gap-1.5 border-t border-[#e3eaf4] pt-2" role="group" aria-label="Vista calendario">
                {([["Settimana", () => set({ vista: selected || search.entro ? "settimana" : undefined, p: undefined, entro: undefined })], ["Mese", () => set({ vista: "mese", p: undefined, entro: undefined })], ["Squadra", () => set({ vista: "prossime", p: undefined })]] as const).map(([l, fn]) => (
                  <button key={l} type="button" aria-pressed={tab === l} onClick={fn}
                    className={`scd-focus h-[44px] flex-1 rounded-full text-[13.5px] font-bold ${tab === l ? "bg-[#1556c4] text-white" : "text-[#0b2a5b] hover:bg-[#eef3f9]"}`}>{l}</button>
                ))}
              </div>
            )}
          </nav>

          {access && <BaseAccessNotice state={access} />}

          {showFilters && (
            <div id="cal-filtri" className={`${CARD} grid gap-[8px] p-3`}>
              <label htmlFor="annata" className="text-[14px] font-bold text-[#0b1e3a]">Trova la tua annata</label>
              <select id="annata" value={selected?.id ?? ""} onChange={(e) => pickTeam(choices.find((x) => x.id === e.target.value))}
                className="h-[46px] w-full rounded-[10px] border border-[#cfd8e6] bg-white px-3 text-[16px] font-semibold text-[#0b1e3a]">
                <option value="">Tutte le annate e categorie</option>
                {choices.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
              </select>
              <PlaceSwitch place={place} onChange={(pl) => set({ luogo: pl === "tutte" ? undefined : pl })} />
            </div>
          )}
          {search.annata && !selected && <p role="alert" className="m-0 text-[15px] font-semibold">Annata “{search.annata}” non presente nel calendario: mostro tutte le categorie.</p>}

          {/* Squadre: star to follow, tap to filter; followed teams first */}
          <section aria-labelledby="cal-teams-t" className="grid gap-2">
            <h2 id="cal-teams-t" className="m-0 flex items-baseline justify-between gap-2 text-[15px] font-extrabold text-[#0b2a5b]">
              {followed.length ? "Le mie squadre" : "Squadre"}
              <span className="text-[12.5px] font-semibold text-[#4a5d7a]">{followed.length ? "seguite su questo dispositivo" : "tocca ☆ per seguire"}</span>
            </h2>
            <TeamChips groups={choices} followed={followed} selectedId={selected?.id ?? null} label={(g) => groupShort(g, g.label)} onPick={pickTeam} onFollow={follow} />
            {mine.length > 0 && !selected && (
              <ul className="m-0 grid list-none gap-[8px] p-0" data-testid="cal-my-teams">
                {mine.map((e) => <NextMatchRow key={e.id} e={e} g={groupOf(e.group)} nowMs={nowMs} />)}
              </ul>
            )}
          </section>

          {tab === "Squadra" && (
            <div className={`${CARD} grid gap-[10px] p-3`}>
              <PlaceSwitch place={place} onChange={(pl) => set({ luogo: pl === "tutte" ? undefined : pl })} />
              <div className="grid grid-cols-3 gap-[6px] sm:grid-cols-6" role="group" aria-label="Intervallo da oggi">
                {([undefined, ...WINDOWS] as (WindowDays | undefined)[]).map((w) => {
                  const on = view === "prossime" && search.entro === w;
                  return (
                    <button key={w ?? "all"} type="button" aria-pressed={on} onClick={() => set({ vista: "prossime", entro: w })}
                      className={`scd-focus h-[40px] rounded-[10px] text-[13px] font-bold ${on ? "bg-[#1556c4] text-white" : "bg-[#eef3f9] text-[#0b2a5b]"}`}>
                      {w === undefined ? "Tutte" : w === 180 ? "6 mesi" : `${w} gg`}
                    </button>
                  );
                })}
                <button type="button" aria-pressed={view === "stagione"} onClick={() => set({ vista: "stagione", entro: undefined })}
                  className={`scd-focus h-[40px] rounded-[10px] text-[13px] font-bold ${view === "stagione" ? "bg-[#1556c4] text-white" : "bg-[#eef3f9] text-[#0b2a5b]"}`}>Stagione</button>
              </div>
              <p className="m-0 text-[14px] font-semibold text-[#0b1e3a]">{label} · {view === "prossime" ? `${shown.length} di ${visible.length}` : visible.length} {visible.length === 1 ? "gara" : "gare"}{selected ? ` · ${selected.label}` : ""}</p>
              {member && selected && (trainingKey
                ? <Link to="/allenamenti" search={{ annata: trainingKey }} className="inline-flex h-[44px] w-fit items-center gap-2 rounded-[10px] border-2 border-[#1556c4] px-[12px] text-[14px] font-bold text-[#1556c4]"><ConeIcon size={20} className="text-[var(--scd-orange)]" />Allenamenti della mia annata ({trainingKey})</Link>
                : <p className="m-0 text-[13px] text-[#4a5d7a]">Allenamenti: categoria non trovata automaticamente nel <Link to="/allenamenti" className="font-bold text-[#1556c4] underline">quadro settimanale</Link>.</p>)}
            </div>
          )}

          {/* Week / month header with arrows (real current week), or the day heading */}
          {(tab === "Settimana" || tab === "Mese") && (
            <div className="grid gap-1">
              <div className={`${CARD} flex items-center gap-1 px-1 py-1`}>
                <button type="button" aria-label={tab === "Mese" ? "Mese precedente" : "Settimana precedente"} onClick={() => set({ p: offset - 1 || undefined })} className="scd-focus grid size-11 place-items-center rounded-full text-[#0b2a5b] hover:bg-[#eef3f9]"><ChevronLeft className="size-[26px]" strokeWidth={2.6} /></button>
                <p className="m-0 flex flex-1 items-center justify-center gap-[8px] text-center text-[17px] font-extrabold text-[#0b2a5b] lg:text-[19px]" aria-live="polite">
                  <CalendarDays className="size-[20px] shrink-0 text-[#1556c4]" strokeWidth={2.4} aria-hidden="true" /><span className="inline-block first-letter:uppercase">{label}</span>
                </p>
                <button type="button" aria-label={tab === "Mese" ? "Mese successivo" : "Settimana successiva"} onClick={() => set({ p: offset + 1 || undefined })} className="scd-focus grid size-11 place-items-center rounded-full text-[#0b2a5b] hover:bg-[#eef3f9]"><ChevronRight className="size-[26px]" strokeWidth={2.6} /></button>
              </div>
              {offset !== 0 && <div className="flex justify-center"><button type="button" onClick={() => set({ p: undefined })} className="scd-focus h-[36px] rounded-full bg-white px-[14px] text-[13px] font-bold text-[#0b2a5b] shadow-[0_1px_3px_rgb(11_42_91/0.14)]">{tab === "Mese" ? "Torna a questo mese" : "Torna a questa settimana"}</button></div>}
            </div>
          )}
          {dayView && <h2 className="m-0 text-[19px] font-extrabold text-[#0b2a5b] first-letter:uppercase" aria-live="polite">{label}</h2>}

          <section aria-label={label} data-testid="calendar-list" data-rows={rows.length}>
            {events.length === 0 ? <p className={`${CARD} m-0 px-4 py-10 text-center text-base text-[#4a5d7a]`}>{EMPTY_MESSAGE}</p>
              : rows.length === 0 ? (
                <div className={`${CARD} grid justify-items-center gap-2 px-4 py-7 text-center`} data-testid="calendar-empty">
                  <p className="m-0 text-[15px] font-semibold text-[#0b1e3a]">Nessuna gara {dayView ? (dayView === "oggi" ? "oggi" : dayView === "ieri" ? "ieri" : "domani") : "in questo periodo"}{selected ? ` per ${selected.label}` : ""}.</p>
                  {(emptyNext || emptyPrev) && (
                    <div className="flex flex-wrap justify-center gap-2">
                      {emptyPrev && <button type="button" onClick={() => set({ vista: "settimana", p: weekShift(today, emptyPrev) || undefined })} className="scd-focus h-[44px] rounded-full bg-[#eef3f9] px-4 text-[14px] font-bold text-[#0b2a5b]">Ultima giornata: {fmt(emptyPrev, { weekday: "short", day: "numeric", month: "short" })}</button>}
                      {emptyNext && <button type="button" onClick={() => set({ vista: "settimana", p: weekShift(today, emptyNext) || undefined })} className="scd-focus h-[44px] rounded-full bg-[#1556c4] px-4 text-[14px] font-bold text-white">Prossima giornata: {fmt(emptyNext, { weekday: "short", day: "numeric", month: "short" })}</button>}
                    </div>
                  )}
                </div>
              )
              : <ul className="m-0 grid list-none gap-[8px] p-0 xl:grid-cols-1">
                {rows.map((r) => r.kind === "gara"
                  ? <GameRow key={r.id} e={r.e} g={r.g} nowMs={nowMs} open={openId === r.id} toggle={() => setOpenId(openId === r.id ? null : r.id)} followed={!!r.g && followed.includes(r.g.id)} onFollow={follow} />
                  : <TrainingRow key={r.id} r={r} />)}
              </ul>}
            {remaining > 0 && (
              <button type="button" onClick={() => setExtra((x) => x + 8)} className="scd-focus mt-3 h-[46px] w-full rounded-[12px] border-2 border-[#1556c4] bg-white text-[15px] font-bold text-[#1556c4]">
                Mostra altre {Math.min(8, remaining)}
              </button>
            )}
            {trainingRows.length > 0 && <p className="m-0 pt-[6px] text-[12px] text-[#4a5d7a]">Allenamenti dal quadro settimanale lun–ven (fotografia 09/10/2026, non live).</p>}
          </section>

          {tab !== "Squadra" && (
            <button type="button" onClick={() => set({ vista: "prossime", p: undefined })}
              className="scd-focus flex h-[50px] w-full items-center justify-center gap-2 rounded-[12px] bg-[#1556c4] text-[16.5px] font-bold text-white shadow-[0_6px_14px_-6px_rgb(21_86_196/0.7)] hover:bg-[#124bb0]">
              Vedi tutti gli eventi <ArrowRight className="size-[20px]" strokeWidth={2.4} aria-hidden="true" />
            </button>
          )}

          {!member && (
            <Link to="/accedi" search={{ next: "/calendario" }} className={`${CARD} scd-focus flex items-center gap-3 px-3 py-3 text-[#0b1e3a]`} data-testid="cal-members-hint">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#0b2a5b]"><Lock className="size-5 text-[#ffd600]" aria-hidden="true" /></span>
              <span className="min-w-0 flex-1">
                <b className="block text-[15px] leading-tight">Entra per allenamenti e dettagli</b>
                <small className="block text-[13px] text-[#4a5d7a]">Qui vedi le gare; squadre e allenamenti sono nell'area soci</small>
              </span>
              <ChevronRight className="size-5 shrink-0 text-[#1556c4]" aria-hidden="true" />
            </Link>
          )}
          {member && !selected && (
            <Link to="/allenamenti" className={`${CARD} scd-focus flex items-center gap-3 px-3 py-3 text-[#0b1e3a]`} data-testid="cal-training-link">
              <ConeIcon size={24} className="shrink-0 text-[var(--scd-orange)]" />
              <span className="min-w-0 flex-1">
                <b className="block text-[15px] leading-tight">Allenamenti della settimana</b>
                <small className="block text-[13px] text-[#4a5d7a]">Campi, orari e spogliatoi di tutte le annate</small>
              </span>
              <ChevronRight className="size-5 shrink-0 text-[#1556c4]" aria-hidden="true" />
            </Link>
          )}
        </div>

        <aside className="grid min-w-0 gap-5 lg:sticky lg:top-4" aria-label="Prossime gare e informazioni">
          {tab !== "Squadra" && nextBlock}

          <div className={`${CARD} p-3 text-[13px] text-[#0b1e3a]`}>
            <p data-calendar-origin={origin} className="m-0 font-medium">
              {origin === "mirror"
                ? <>Calendario aggiornato {freshnessLabel(sourceModifiedAt)} (Italia), da riconfermare in caso di variazioni.</>
                : origin === "stale"
                  ? <>Ultima copia verificata del {freshnessLabel(sourceModifiedAt)} — aggiornamento temporaneamente non disponibile.</>
                  : <>Copia di sicurezza del {freshnessLabel(sourceModifiedAt)} — aggiornamenti in verifica.</>}
            </p>
            <div className="mt-[8px] flex flex-wrap items-center gap-[8px]">
              <button type="button" onClick={refresh} disabled={refreshing} aria-label="Verifica aggiornamenti del calendario" className="scd-focus inline-flex h-[40px] items-center gap-1.5 rounded-[10px] bg-[#eef3f9] px-[12px] text-[13px] font-bold disabled:opacity-60">
                <RefreshCw className={`size-4 ${refreshing ? "animate-spin motion-reduce:animate-none" : ""}`} aria-hidden="true" /> Verifica
              </button>
              <button type="button" onClick={copyLink} className="scd-focus inline-flex h-[40px] items-center gap-1.5 rounded-[10px] bg-[#ffd600] px-[12px] text-[13px] font-bold text-[#0b2a5b]"><Link2 className="size-4" aria-hidden="true" /> Copia link {selected ? "annata" : "calendario"}</button>
              {canShare && <button type="button" onClick={shareLink} className="scd-focus inline-flex h-[40px] items-center gap-1.5 rounded-[10px] bg-[#eef3f9] px-[12px] text-[13px] font-bold"><Share2 className="size-4" aria-hidden="true" /> Condividi</button>}
              <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("vera:open"))} aria-label="Chiedi a Iride, l'assistente AI della segreteria" className="scd-focus inline-flex h-[40px] items-center gap-1.5 rounded-[10px] bg-[#eef3f9] px-[8px] text-[13px] font-bold min-[641px]:hidden">
                <PersonaAvatar persona="vera" size={24} /> Chiedi a Iride
              </button>
            </div>
            <p role="status" aria-live="polite" className="m-0 mt-[4px] min-h-0 text-[13px] font-semibold text-[#1556c4]">{refreshMsg ?? copied}</p>
          </div>

          <OfficialResults />
          <p className="m-0 text-[13px] text-[#4a5d7a]">
            Dove si gioca: <Link to="/impianti" className="font-bold text-[#1556c4] underline">mappa dei campi di Colico e Dervio</Link>
            {member && <> · <Link to="/squadre" className="font-bold text-[#1556c4] underline">tutte le squadre</Link></>}
          </p>
        </aside>
      </div>
    </main>
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
