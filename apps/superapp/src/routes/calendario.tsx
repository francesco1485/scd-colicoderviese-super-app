import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, Clock3, Link2, MapPin, RefreshCw, Search, Share2 } from "lucide-react";

import { getPublicCalendarSnapshot } from "@/lib/calendar.functions";
import { Crest, DateBlock, PageHeader, PrimaryButton, SectionHead, Segmented, Sheet } from "@/components/scd/board";
import { BallIcon, ConeIcon } from "@/components/scd/icons";
import { dateParts, groupShort, matchTitle, monthRange, titleCase, trainingRowsFor, upcomingMatches, venueCase, weekRange } from "@/lib/board-data";
import { romeParts } from "@/lib/home-week";
import { EMPTY_MESSAGE, WINDOWS, freshnessLabel, resolveAnnata, windowEnd, loadQuadro, trainingKeyFor, type WindowDays, type PublicEvent, type PublicGroup } from "@/lib/public-snapshots";
import juniores from "@/assets/scd/SCD_JUNIORES_2008_2009.png.asset.json";
import piccoli from "@/assets/scd/SCD_PICCOLI_2020_2021.png.asset.json";
import prima from "@/assets/scd/SCD_PRIMA_SQUADRA.png.asset.json";
import primi from "@/assets/scd/SCD_PRIMI_2018_2019.png.asset.json";
import pulcini from "@/assets/scd/SCD_PULCINI_2016_2017.png.asset.json";
import u12 from "@/assets/scd/SCD_U12_2015.png.asset.json";
import u13 from "@/assets/scd/SCD_U13_2014.png.asset.json";
import u15 from "@/assets/scd/SCD_U15_2012_2013.png.asset.json";
import u16 from "@/assets/scd/SCD_U16_2011.png.asset.json";
import crovi from "@/assets/crovi/crovi-avatar-256.webp.asset.json";

/** Solo loghi ufficiali esistenti, indicati dal master per il gruppo. */
const LOGO_FILES: Record<string, string> = {
  "SCD_JUNIORES_2008_2009.png": juniores.url, "SCD_PICCOLI_2020_2021.png": piccoli.url, "SCD_PRIMA_SQUADRA.png": prima.url,
  "SCD_PRIMI_2018_2019.png": primi.url, "SCD_PULCINI_2016_2017.png": pulcini.url, "SCD_U12_2015.png": u12.url,
  "SCD_U13_2014.png": u13.url, "SCD_U15_2012_2013.png": u15.url, "SCD_U16_2011.png": u16.url,
};

const QUADRO_SLOTS = loadQuadro().slots;
const VIEWS = ["prossime", "settimana", "mese", "stagione"] as const;
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
  loader: () => getPublicCalendarSnapshot(),
  head: () => ({
    meta: [
      { title: "Calendario 2026/27 — S.C.D. ColicoDerviese" },
      { name: "description", content: "Gare e allenamenti della settimana, del mese e della tua squadra SCD: casa e trasferta, stagione 2026/27. Dati da riconfermare in caso di variazioni." },
      { property: "og:title", content: "Calendario 2026/27 — S.C.D. ColicoDerviese" },
      { property: "og:description", content: "Le gare SCD della stagione 2026/27 per settimana, mese e squadra." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Calendario,
});

const fmt = (iso: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("it-IT", { timeZone: "UTC", ...o }).format(new Date(`${iso}T12:00:00Z`));
const romeNow = () => romeParts(new Date().toISOString()) ?? { date: new Date().toISOString().slice(0, 10), time: "00:00" };

type Row =
  | { kind: "gara"; id: string; date: string; time: string; e: PublicEvent; g: PublicGroup | undefined }
  | { kind: "allenamento"; id: string; date: string; time: string; title: string; sub: string; teams?: string };

function Calendario() {
  const { season, sourceModifiedAt, groups, events, origin } = Route.useLoaderData();
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
  const tab = view === "settimana" ? "Settimana" : view === "mese" ? "Mese" : "Squadra";
  const place = search.luogo ?? "tutte";
  const offset = search.p ?? 0;
  const selected = search.annata ? resolveAnnata(groups, search.annata) : null;
  const [now, setNow] = useState(romeNow);
  useEffect(() => { const t = setInterval(() => setNow(romeNow()), 60000); return () => clearInterval(t); }, []);
  const today = now.date;
  const [openId, setOpenId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [canShare, setCanShare] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  useEffect(() => setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function"), []);

  const set = (patch: Partial<Search>) => navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true, resetScroll: false });
  const choices = groups.filter((g) => g.count > 0);
  const groupOf = (id: string) => groups.find((x) => x.id === id);

  const [from, to, label] = useMemo((): [string, string, string] => {
    if (view === "settimana") { const w = weekRange(today, offset); return [w.from, w.to, w.label]; }
    if (view === "mese") { const m = monthRange(today, offset); return [m.from, m.to, m.label]; }
    if (view === "prossime") return search.entro
      ? [today, windowEnd(today, search.entro), search.entro === 180 ? "Prossimi 6 mesi" : `Prossimi ${search.entro} giorni`]
      : [today, "9999-12-31", "Da oggi in avanti"];
    return ["0000-01-01", "9999-12-31", `Tutta la stagione ${season}`];
  }, [view, offset, today, season, search.entro]);

  const matchesFilter = (e: PublicEvent) => (!selected || e.group === selected.id) && (place === "tutte" || (place === "casa" ? e.homeAway === "CASA" : e.homeAway === "FUORI"));
  const visible = events.filter((e) => matchesFilter(e) && e.date >= from && e.date <= to);
  const trainingKey = useMemo(() => (selected ? trainingKeyFor(selected, QUADRO_SLOTS) : null), [selected]);

  // Allenamenti dal quadro lun–ven: solo nella settimana corrente (fotografia 09/10/2026), sede Colico.
  const trainingRows: Row[] = useMemo(() => {
    if (view !== "settimana" || offset !== 0 || place === "fuori" || (selected && !trainingKey)) return [];
    return Array.from({ length: 7 }, (_, i) => addDaysIso(from, i)).flatMap((date): Row[] => {
      const list = trainingRowsFor(date, QUADRO_SLOTS, trainingKey ?? undefined);
      if (!list.length) return [];
      if (trainingKey) return list.map((t) => ({ kind: "allenamento", id: t.id, date, time: t.time, title: `Allenamento ${t.teams}`, sub: `Centro Sportivo - Colico · Campo ${t.field.slice(1)}`, teams: `${t.time}–${t.end}` }));
      const teams = [...new Set(list.flatMap((t) => t.teams.split(" + ")))];
      return [{ kind: "allenamento", id: `all-${date}`, date, time: list[0]!.time, title: `Allenamenti · ${teams.length} ${teams.length === 1 ? "gruppo" : "gruppi"}`, sub: "Centro Sportivo - Colico", teams: `${list[0]!.time}–${list.reduce((m, t) => (t.end > m ? t.end : m), "")} · ${teams.join(", ")}` }];
    });
  }, [view, offset, place, selected, trainingKey, from]);

  const firstBlock = selected ? 6 : 8;
  const [extra, setExtra] = useState(0);
  useEffect(() => setExtra(0), [view, place, selected?.id, search.entro]);
  const limit = view === "prossime" ? firstBlock + extra : Infinity;
  const shown = visible.slice(0, limit);
  const remaining = visible.length - shown.length;
  const rows: Row[] = [...shown.map((e): Row => ({ kind: "gara", id: e.id, date: e.date, time: e.time, e, g: groupOf(e.group) })), ...trainingRows]
    .sort((a, b) => (a.date + (a.time || "99:99")).localeCompare(b.date + (b.time || "99:99")));
  const nextMatches = upcomingMatches(events, today, now.time).filter(matchesFilter).slice(0, 2);

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

  return (
    <main data-screen="calendario">
      <PageHeader
        title="Calendario"
        testId="calendar-header"
        action={
          <button type="button" onClick={() => setFiltersOpen((o) => !o)} aria-expanded={filtersOpen || (tab !== "Squadra" && filtersActive)} aria-controls="cal-filtri" aria-label="Cerca squadra e filtri" className="flex size-11 items-center justify-center text-white">
            <Search className="size-[28px]" strokeWidth={2.2} aria-hidden="true" />
          </button>
        }
      />
      <Sheet overlap={14} className="bg-white lg:bg-[var(--scd-page)]">
        <div className="mx-auto max-w-3xl px-[6px] pt-[8px]">
          <Segmented
            label="Vista calendario"
            items={[
              { label: "Settimana", active: tab === "Settimana", onClick: () => set({ vista: selected || search.entro ? "settimana" : undefined, p: undefined, entro: undefined }) },
              { label: "Mese", active: tab === "Mese", onClick: () => set({ vista: "mese", p: undefined, entro: undefined }) },
              { label: "Squadra", active: tab === "Squadra", onClick: () => set({ vista: "prossime", p: undefined }) },
            ]}
          />

          {(filtersOpen || (tab !== "Squadra" && filtersActive)) && (
            <div id="cal-filtri" className="mt-[12px] grid gap-[8px] rounded-[12px] bg-[var(--scd-page)] p-[10px]">
              <label htmlFor="annata" className="text-[14px] font-bold text-[var(--scd-ink)]">Trova la tua annata</label>
              <select id="annata" value={selected?.id ?? ""} onChange={(e) => pickTeam(choices.find((x) => x.id === e.target.value))}
                className="h-[46px] w-full rounded-[9px] border border-[#cfd5df] bg-white px-3 text-[16px] font-semibold text-[var(--scd-ink)]">
                <option value="">Tutte le annate e categorie</option>
                {choices.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
              </select>
              <PlaceSwitch place={place} onChange={(pl) => set({ luogo: pl === "tutte" ? undefined : pl })} />
            </div>
          )}
          {search.annata && !selected && <p role="alert" className="mt-2 text-[15px] font-semibold">Annata “{search.annata}” non presente nel calendario: mostro tutte le categorie.</p>}

          {tab === "Squadra" && (
            <div className="mt-[12px] grid gap-[10px]">
              <div className="scd-scroll-x -mx-[18px] flex gap-[8px] overflow-x-auto px-[18px] pb-[2px]" role="group" aria-label="Squadre rapide">
                <button type="button" aria-pressed={!selected} onClick={() => pickTeam(undefined)} className={`flex h-[46px] shrink-0 items-center rounded-[10px] px-[14px] text-[14px] font-bold ${!selected ? "bg-[var(--scd-blue)] text-white" : "bg-[#eef0f3] text-[var(--scd-ink)]"}`}>Tutte</button>
                {choices.map((g) => {
                  const on = selected?.id === g.id;
                  return (
                    <button key={g.id} type="button" aria-pressed={on} onClick={() => pickTeam(on ? undefined : g)}
                      className={`flex h-[46px] shrink-0 items-center gap-[7px] rounded-[10px] pl-[6px] pr-[12px] text-[14px] font-bold ${on ? "bg-[var(--scd-blue)] text-white" : "bg-[#eef0f3] text-[var(--scd-ink)]"}`}>
                      {g.logo && LOGO_FILES[g.logo] ? <img src={LOGO_FILES[g.logo]} alt="" className="size-[34px] shrink-0 rounded-full bg-white object-contain" /> : <span className="size-[12px] shrink-0 rounded-full" style={{ background: g.color }} aria-hidden="true" />}
                      <span className="whitespace-nowrap">{shortLabel(g)}</span>
                    </button>
                  );
                })}
              </div>
              <PlaceSwitch place={place} onChange={(pl) => set({ luogo: pl === "tutte" ? undefined : pl })} />
              <div className="grid grid-cols-6 gap-[5px]" role="group" aria-label="Intervallo da oggi">
                {([undefined, ...WINDOWS] as (WindowDays | undefined)[]).map((w) => {
                  const on = view === "prossime" && search.entro === w;
                  return (
                    <button key={w ?? "all"} type="button" aria-pressed={on} onClick={() => set({ vista: "prossime", entro: w })}
                      className={`h-[36px] rounded-[8px] text-[13px] font-bold ${on ? "bg-[var(--scd-blue)] text-white" : "bg-[#eef0f3] text-[var(--scd-ink)]"}`}>
                      {w === undefined ? "Tutte" : w === 180 ? "6 mesi" : `${w} gg`}
                    </button>
                  );
                })}
                <button type="button" aria-pressed={view === "stagione"} onClick={() => set({ vista: "stagione", entro: undefined })}
                  className={`h-[36px] rounded-[8px] text-[13px] font-bold ${view === "stagione" ? "bg-[var(--scd-blue)] text-white" : "bg-[#eef0f3] text-[var(--scd-ink)]"}`}>Stagione</button>
              </div>
              <p className="text-[14px] font-semibold text-[var(--scd-ink)]">{label} · {view === "prossime" ? `${shown.length} di ${visible.length}` : visible.length} {visible.length === 1 ? "gara" : "gare"}{selected ? ` · ${selected.label}` : ""}</p>
              {selected && (trainingKey
                ? <Link to="/allenamenti" search={{ annata: trainingKey }} className="inline-flex h-[42px] w-fit items-center gap-2 rounded-[9px] border-2 border-[var(--scd-blue)] px-[12px] text-[14px] font-bold text-[var(--scd-blue)]"><ConeIcon size={20} className="text-[var(--scd-orange)]" />Allenamenti della mia annata ({trainingKey})</Link>
                : <p className="text-[13px] text-[var(--scd-sub)]">Allenamenti: categoria non trovata automaticamente nel <Link to="/allenamenti" className="font-bold text-[var(--scd-blue)] underline">quadro settimanale</Link>.</p>)}
            </div>
          )}

          {tab !== "Squadra" && (
            <div className="mt-[14px] flex items-center gap-1">
              <button type="button" aria-label={tab === "Mese" ? "Mese precedente" : "Settimana precedente"} onClick={() => set({ p: offset - 1 || undefined })} className="flex size-11 items-center justify-center text-[var(--scd-ink)]"><ChevronLeft className="size-[28px]" strokeWidth={2.4} /></button>
              <p className="flex flex-1 items-center justify-center gap-[8px] text-[19px] font-bold capitalize text-[var(--scd-ink)]" aria-live="polite">
                <CalendarDays className="size-[22px]" strokeWidth={2.3} aria-hidden="true" />{label}
              </p>
              <button type="button" aria-label={tab === "Mese" ? "Mese successivo" : "Settimana successiva"} onClick={() => set({ p: offset + 1 || undefined })} className="flex size-11 items-center justify-center text-[var(--scd-ink)]"><ChevronRight className="size-[28px]" strokeWidth={2.4} /></button>
            </div>
          )}
          {tab !== "Squadra" && offset !== 0 && <div className="flex justify-center"><button type="button" onClick={() => set({ p: undefined })} className="h-[34px] rounded-full bg-[#eef0f3] px-[14px] text-[13px] font-bold text-[var(--scd-ink)]">Torna a oggi</button></div>}

          <section className="mt-[6px]" aria-label={label} data-testid="calendar-list" data-rows={rows.length}>
            {events.length === 0 ? <p className="py-10 text-center text-base text-[var(--scd-sub)]">{EMPTY_MESSAGE}</p>
              : rows.length === 0 ? <p className="py-8 text-center text-[15px] text-[var(--scd-sub)]">Nessuna gara in questo periodo{selected ? ` per ${selected.label}` : ""}.</p>
              : <ul className="divide-y divide-[var(--scd-line)] lg:grid lg:grid-cols-2 lg:gap-x-8 lg:divide-y-0">
                {rows.map((r) => r.kind === "gara"
                  ? <EventRow key={r.id} e={r.e} g={r.g} open={openId === r.id} toggle={() => setOpenId(openId === r.id ? null : r.id)} />
                  : <TrainingRowItem key={r.id} r={r} />)}
              </ul>}
            {remaining > 0 && (
              <button type="button" onClick={() => setExtra((x) => x + 8)} className="mt-3 h-[44px] w-full rounded-[9px] border-2 border-[var(--scd-blue)] bg-white text-[15px] font-bold text-[var(--scd-blue)]">
                Mostra altre {Math.min(8, remaining)}
              </button>
            )}
            {trainingRows.length > 0 && <p className="pt-[4px] text-[12px] text-[var(--scd-sub)]">Allenamenti dal quadro settimanale lun–ven (fotografia 09/10/2026, non live).</p>}
          </section>

          {tab !== "Squadra" && (
            <>
              <PrimaryButton className="mt-[14px]" onClick={() => set({ vista: "prossime", p: undefined })}>Vedi tutti gli eventi <ArrowRight className="size-[20px]" strokeWidth={2.4} /></PrimaryButton>
              <SectionHead title="Prossime gare" more={{ label: "Vedi tutti", target: { to: "/calendario", search: { ...(selected ? { annata: selected.years[0] ?? selected.id } : {}), vista: "prossime" } } }} />
              <ul className="divide-y divide-[var(--scd-line)]" data-testid="next-matches">
                {nextMatches.length ? nextMatches.map((e) => <NextMatchRow key={e.id} e={e} g={groupOf(e.group)} />)
                  : <li className="py-4 text-[14px] text-[var(--scd-sub)]">Nessuna gara in programma{selected ? ` per ${selected.label}` : ""}.</li>}
              </ul>
            </>
          )}

          <div className="mt-[18px] rounded-[12px] bg-[var(--scd-page)] p-[12px] text-[13px] text-[var(--scd-ink)] lg:bg-white">
            <p data-calendar-origin={origin} className="font-medium">
              {origin === "mirror"
                ? <>Calendario aggiornato {freshnessLabel(sourceModifiedAt)} (Italia), da riconfermare in caso di variazioni.</>
                : origin === "stale"
                  ? <>Ultima copia verificata del {freshnessLabel(sourceModifiedAt)} — aggiornamento temporaneamente non disponibile.</>
                  : <>Copia di sicurezza del {freshnessLabel(sourceModifiedAt)} — aggiornamenti in verifica.</>}
            </p>
            <div className="mt-[8px] flex flex-wrap items-center gap-[8px]">
              <button type="button" onClick={refresh} disabled={refreshing} aria-label="Verifica aggiornamenti del calendario" className="inline-flex h-[38px] items-center gap-1.5 rounded-[8px] bg-white px-[10px] text-[13px] font-bold shadow-[var(--scd-card-shadow)] disabled:opacity-60 lg:bg-[var(--scd-page)]">
                <RefreshCw className={`size-4 ${refreshing ? "animate-spin motion-reduce:animate-none" : ""}`} /> Verifica
              </button>
              <button type="button" onClick={copyLink} className="inline-flex h-[38px] items-center gap-1.5 rounded-[8px] bg-[var(--scd-yellow)] px-[10px] text-[13px] font-bold"><Link2 className="size-4" /> Copia link {selected ? "annata" : "calendario"}</button>
              {canShare && <button type="button" onClick={shareLink} className="inline-flex h-[38px] items-center gap-1.5 rounded-[8px] bg-white px-[10px] text-[13px] font-bold shadow-[var(--scd-card-shadow)]"><Share2 className="size-4" /> Condividi</button>}
              <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("crovi:open"))} aria-label="Chiedi a CROVI, assistente del club" className="inline-flex h-[38px] items-center gap-1.5 rounded-[8px] bg-white px-[8px] text-[13px] font-bold shadow-[var(--scd-card-shadow)] min-[641px]:hidden">
                <img src={crovi.url} alt="" width={24} height={24} className="size-6 rounded-full" /> Chiedi a CROVI
              </button>
            </div>
            <p role="status" aria-live="polite" className="mt-[4px] min-h-0 text-[13px] font-semibold text-[var(--scd-blue)]">{refreshMsg ?? copied}</p>
          </div>
        </div>
      </Sheet>
    </main>
  );
}

function addDaysIso(iso: string, n: number) {
  return new Date(Date.parse(`${iso}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
}

function PlaceSwitch({ place, onChange }: { place: Place; onChange: (p: Place) => void }) {
  return (
    <div className="grid grid-cols-3 gap-[6px]" role="group" aria-label="Casa o trasferta">
      {PLACES.map((pl) => (
        <button key={pl} type="button" aria-pressed={place === pl} onClick={() => onChange(pl)}
          className={`h-[36px] rounded-full text-[13px] font-bold uppercase ${place === pl ? "bg-[var(--scd-blue)] text-white" : "bg-[#eef0f3] text-[var(--scd-ink)]"}`}>
          {pl === "fuori" ? "Trasferta" : pl === "casa" ? "Casa" : "Tutte"}
        </button>
      ))}
    </div>
  );
}

function shortLabel(g: PublicGroup) {
  const m = g.label.match(/\b(U\d{2}|Under\s?\d{2}|Juniores|Allievi|Giovanissimi|Prima Squadra)\b/i);
  if (g.years.length) return g.years.join("/");
  return m ? m[1]!.replace(/Under\s?/i, "U") : g.label.slice(0, 14);
}

function Lead({ date, time }: { date: string; time: string }) {
  const d = dateParts(date);
  return (
    <span className="block w-[78px] shrink-0 leading-none text-[var(--scd-ink)]">
      <span className="block whitespace-nowrap text-[14px] font-bold uppercase tracking-[-0.01em]">{d.weekday} {d.day} {d.month}</span>
      <span className="mt-[6px] block text-[19px] font-bold">{time || "--:--"}</span>
    </span>
  );
}

function EventRow({ e, g, open, toggle }: { e: PublicEvent; g: PublicGroup | undefined; open: boolean; toggle: () => void }) {
  const certain = e.timeConfirmed && e.venueConfirmed;
  const home = e.homeAway === "CASA";
  const team = groupShort(g, e.category);
  const kind = e.type ? e.type.charAt(0) + e.type.slice(1).toLowerCase() : "Gara";
  return (
    <li data-event-id={e.id}>
      <button type="button" onClick={toggle} aria-expanded={open} className="flex w-full items-center gap-[12px] py-[13px] text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--scd-blue)]">
        <span className="w-[4px] shrink-0 self-stretch rounded-full" style={{ background: g?.color ?? "#668196" }} aria-hidden="true" />
        <Lead date={e.date} time={e.time} />
        <span className="flex w-[44px] shrink-0 justify-center"><BallIcon size={40} className="text-[#0d1630]" title="Partita" /></span>
        <span className="min-w-0 flex-1">
          <span className="block break-words text-[16.5px] font-bold leading-[1.2] tracking-[-0.01em] text-[var(--scd-ink)]">{kind !== "Campionato" ? `${kind} · ` : ""}{matchTitle(e, team)}</span>
          <span className="mt-[3px] flex items-start gap-[3px] text-[14px] font-medium leading-[1.25] text-[var(--scd-sub)]">
            <MapPin className="mt-[2px] size-[14px] shrink-0" strokeWidth={2.4} aria-hidden="true" />
            <span className="min-w-0 break-words">{home ? "" : "Trasferta · "}{venueCase(e.venue) || "Sede da definire"}
              {!certain && <span className="ml-[5px] whitespace-nowrap rounded bg-[#fff3c4] px-[5px] text-[11px] font-bold uppercase text-[#8a5a00]">da confermare</span>}
              {e.isVariation && <span className="ml-[5px] whitespace-nowrap rounded border border-[var(--scd-blue)] px-[4px] text-[11px] font-bold uppercase text-[var(--scd-blue)]">Variazione</span>}
            </span>
          </span>
        </span>
      </button>
      {open && (
        <dl className="mb-[12px] ml-[16px] grid gap-1.5 rounded-[10px] bg-[var(--scd-page)] px-3 py-3 text-[14px]">
          <div><Clock3 className="mr-1 inline size-4" />{fmt(e.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · {e.time ? `${e.time}${certain ? "" : " (indicativo)"}` : "orario da definire"}</div>
          <div className="flex gap-1"><MapPin className="mt-1 size-4 shrink-0" /><span className="break-words">{e.venue || "Sede da definire"}{e.venueConfirmed ? "" : " (da confermare)"}</span></div>
          <div><dt className="inline text-[var(--scd-sub)]">Categoria: </dt><dd className="inline">{e.category}{e.round ? ` · giornata ${e.round}` : ""}</dd></div>
          <div><dt className="inline text-[var(--scd-sub)]">Provenienza: </dt><dd className="inline">{e.source || "Calendario SCD"} · {e.status === "OFFICIAL_CALENDAR" ? "calendario ufficiale" : e.status === "CLUB_EVENT" ? "evento organizzato dalla società (non certificato FIGC)" : e.status} · fotografia non live</dd></div>
          {e.facilityReview && <div className="font-semibold text-[var(--scd-sub)]">Disponibilità impianto da verificare</div>}
          {e.notice.map((n) => <div key={n} className="font-semibold">⚠ {n}</div>)}
        </dl>
      )}
    </li>
  );
}

function TrainingRowItem({ r }: { r: Extract<Row, { kind: "allenamento" }> }) {
  return (
    <li>
      <Link to="/allenamenti" className="flex items-center gap-[12px] py-[13px]">
        <span className="w-[4px] shrink-0 self-stretch rounded-full bg-[var(--scd-green)]" aria-hidden="true" />
        <Lead date={r.date} time={r.time} />
        <span className="flex w-[44px] shrink-0 justify-center"><ConeIcon size={40} className="text-[var(--scd-orange)]" title="Allenamento" /></span>
        <span className="min-w-0 flex-1">
          <span className="block break-words text-[16.5px] font-bold leading-[1.2] tracking-[-0.01em] text-[var(--scd-ink)]">{r.title}</span>
          <span className="mt-[3px] flex items-start gap-[3px] text-[14px] font-medium leading-[1.25] text-[var(--scd-sub)]"><MapPin className="mt-[2px] size-[14px] shrink-0" strokeWidth={2.4} aria-hidden="true" /><span className="min-w-0">{r.sub}</span></span>
          {r.teams && <span className="mt-[2px] block truncate text-[12px] font-medium text-[var(--scd-sub)]">{r.teams}</span>}
        </span>
      </Link>
    </li>
  );
}

function NextMatchRow({ e, g }: { e: PublicEvent; g: PublicGroup | undefined }) {
  const d = dateParts(e.date);
  const team = groupShort(g, e.category);
  const opp = titleCase(e.opponent || "Avversario da definire");
  const home = e.homeAway === "CASA";
  return (
    <li>
      <Link to="/calendario" search={{ annata: g ? (g.years[0] ?? g.id) : undefined, vista: "prossime" }} className="flex items-center gap-[12px] py-[12px]">
        <span className="w-[4px] shrink-0 self-stretch rounded-full" style={{ background: g?.color ?? "#668196" }} aria-hidden="true" />
        <span className="w-[54px] shrink-0"><DateBlock weekday={d.weekday} day={d.day} month={d.month} /></span>
        <Crest height={56} className="drop-shadow-none" />
        <span className="min-w-0 flex-1">
          <span className="block text-[15.5px] font-bold leading-[1.25] text-[var(--scd-ink)]">{home ? <>ColicoDerviese {team}<br />vs {opp}</> : <>{opp}<br />vs ColicoDerviese {team}</>}</span>
          <span className="mt-[4px] block text-[13px] text-[var(--scd-sub)]">{e.time ? `${e.time} · ` : ""}{venueCase(e.venue) || "Sede da definire"}</span>
        </span>
        <ChevronRight className="size-[24px] shrink-0 text-[var(--scd-ink)]" strokeWidth={2.4} aria-hidden="true" />
      </Link>
    </li>
  );
}

