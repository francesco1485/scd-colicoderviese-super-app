import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { getPublicCalendarSnapshot } from "@/lib/calendar.functions";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Clock3, Link2, MapPin, RefreshCw, Share2 } from "lucide-react";

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
      { title: "Calendario gare 2026/27 — S.D.C. ColicoDerviese" },
      { name: "description", content: "Trova le gare della tua annata SCD: casa e trasferta, stagione 2026/27. Dati in anteprima da riconfermare." },
      { property: "og:title", content: "Calendario gare 2026/27 — S.D.C. ColicoDerviese" },
      { property: "og:description", content: "Le gare SCD della stagione 2026/27 per annata, casa e trasferta." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Calendario,
});

const DAY = 86400000;
const fmt = (iso: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("it-IT", { timeZone: "UTC", ...o }).format(new Date(`${iso}T12:00:00Z`));
const key = (d: Date) => d.toISOString().slice(0, 10);
const romeToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date());

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
  const view = search.vista ?? "prossime";
  const place = search.luogo ?? "tutte";
  const offset = search.p ?? 0;
  const selected = search.annata ? resolveAnnata(groups, search.annata) : null;
  const today = romeToday();
  const [openId, setOpenId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [canShare, setCanShare] = useState(false);
  useEffect(() => setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function"), []);

  const set = (patch: Partial<Search>) => navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true, resetScroll: false });
  const choices = groups.filter((g) => g.count > 0);

  const [from, to, label] = useMemo((): [string, string, string] => {
    const base = new Date(`${today}T12:00:00Z`);
    if (view === "settimana") {
      const mon = new Date(base.getTime() - ((base.getUTCDay() + 6) % 7) * DAY + offset * 7 * DAY);
      const sun = new Date(mon.getTime() + 6 * DAY);
      return [key(mon), key(sun), `${fmt(key(mon), { day: "numeric", month: "short" })} – ${fmt(key(sun), { day: "numeric", month: "short" })}`];
    }
    if (view === "mese") {
      const m = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + offset, 1, 12));
      const end = new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth() + 1, 0, 12));
      return [key(m), key(end), fmt(key(m), { month: "long", year: "numeric" })];
    }
    if (view === "prossime") return search.entro
      ? [today, windowEnd(today, search.entro), search.entro === 180 ? "Prossimi 6 mesi" : `Prossimi ${search.entro} giorni`]
      : [today, "9999-12-31", "Da oggi in avanti"];
    return ["0000-01-01", "9999-12-31", `Tutta la stagione ${season}`];
  }, [view, offset, today, season, search.entro]);

  const visible = events.filter((e) =>
    (!selected || e.group === selected.id) &&
    (place === "tutte" || (place === "casa" ? e.homeAway === "CASA" : e.homeAway === "FUORI")) &&
    e.date >= from && e.date <= to);
  const trainingKey = useMemo(() => (selected ? trainingKeyFor(selected, QUADRO_SLOTS) : null), [selected]);
  const firstBlock = selected ? 6 : 8;
  const [extra, setExtra] = useState(0);
  useEffect(() => setExtra(0), [view, place, selected?.id, search.entro]);
  const limit = view === "prossime" ? firstBlock + extra : Infinity;
  const shown = visible.slice(0, limit);
  const remaining = visible.length - shown.length;
  const byDate = shown.reduce<Record<string, PublicEvent[]>>((acc, e) => ((acc[e.date] ??= []).push(e), acc), {});

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

  return (
    <main className="pb-12">
      <section className="surface-deep px-4 pb-4 pt-4 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <p className="surface-sun inline-block rounded px-2 py-1 text-[13px] font-bold uppercase">Anteprima · non in tempo reale</p>
          <h1 className="mt-2 text-[1.75rem] font-bold leading-tight sm:text-4xl">Calendario gare {season}</h1>
          <div className="mt-1 flex items-start gap-2">
            <p data-calendar-origin={origin} className="flex-1 text-[15px] font-medium">
              {origin === "mirror"
                ? <>Aggiornato {freshnessLabel(sourceModifiedAt)} (Italia), da riconfermare in caso di variazioni.</>
                : origin === "stale"
                  ? <>Ultima copia verificata del {freshnessLabel(sourceModifiedAt)} — aggiornamento temporaneamente non disponibile.</>
                  : <>Copia di sicurezza del {freshnessLabel(sourceModifiedAt)} — aggiornamenti in verifica.</>}
            </p>
            <button onClick={refresh} disabled={refreshing} aria-label="Verifica aggiornamenti del calendario"
              className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-lg border-2 border-primary-foreground/40 px-3 text-[14px] font-bold disabled:opacity-60">
              <RefreshCw className={`size-4 ${refreshing ? "animate-spin motion-reduce:animate-none" : ""}`} /> Verifica
            </button>
          </div>
          <p role="status" aria-live="polite" className="min-h-0 text-[14px] font-semibold text-accent">{refreshMsg}</p>

          <label htmlFor="annata" className="mt-4 block text-base font-bold text-accent">Trova la tua annata</label>
          <select
            id="annata"
            value={selected?.id ?? ""}
            onChange={(e) => { const g = choices.find((x) => x.id === e.target.value); set({ annata: g ? (g.years[0] ?? g.id) : undefined, p: undefined }); setOpenId(null); }}
            className="mt-1 h-14 w-full rounded-lg border-2 border-accent bg-card px-3 text-lg font-bold text-foreground"
          >
            <option value="">Tutte le annate e categorie</option>
            {choices.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
          </select>
          <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]" role="group" aria-label="Squadre rapide">
            {choices.map((g) => {
              const on = selected?.id === g.id;
              return (
                <button key={g.id} aria-pressed={on} onClick={() => { set({ annata: on ? undefined : (g.years[0] ?? g.id), p: undefined }); setOpenId(null); }}
                  className={`flex h-14 min-w-20 shrink-0 items-center gap-2 rounded-lg border-2 px-2 text-[14px] font-bold ${on ? "border-accent bg-accent text-accent-foreground" : "border-primary-foreground/30 bg-card text-foreground"}`}>
                  {g.logo && LOGO_FILES[g.logo] ? <img src={LOGO_FILES[g.logo]} alt="" className="size-9 shrink-0 object-contain" /> : null}
                  <span className="whitespace-nowrap">{shortLabel(g)}</span>
                </button>
              );
            })}
          </div>
          {search.annata && !selected && <p role="alert" className="mt-2 text-[15px] font-semibold">Annata “{search.annata}” non presente nel calendario: mostro tutte le categorie.</p>}

          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={copyLink} className="surface-sun inline-flex h-12 items-center gap-2 rounded-lg px-4 text-[15px] font-bold"><Link2 className="size-5" /> Copia link {selected ? "annata" : "calendario"}</button>
            <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("crovi:open"))} aria-label="Chiedi a CROVI, assistente del club"
              className="inline-flex h-12 items-center gap-2 rounded-lg border-2 border-primary-foreground/40 px-3 text-[15px] font-bold min-[641px]:hidden">
              <img src={crovi.url} alt="" width={32} height={32} className="size-8 rounded-full" /> Chiedi a CROVI
            </button>
            {canShare && <button onClick={shareLink} className="inline-flex h-12 items-center gap-2 rounded-lg border-2 border-primary-foreground/40 px-4 text-[15px] font-bold"><Share2 className="size-5" /> Condividi</button>}
            <span role="status" aria-live="polite" className="self-center text-[15px] font-semibold text-accent">{copied}</span>
          </div>
        </div>
      </section>

      <div className="border-b border-border bg-background py-3 px-4 sm:px-6">
        <div className="mx-auto grid max-w-5xl gap-2">
          <div className="grid grid-cols-4 gap-1 rounded-lg bg-secondary p-1" role="tablist" aria-label="Periodo">
            {VIEWS.map((v) => (
              <button key={v} role="tab" aria-selected={view === v} onClick={() => set({ vista: v === "prossime" ? undefined : v, p: undefined, entro: undefined })}
                className={`h-11 rounded-md text-[14px] font-bold capitalize ${view === v ? "bg-primary text-primary-foreground" : "text-foreground"}`}>{v}</button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2" role="group" aria-label="Casa o trasferta">
            {PLACES.map((pl) => (
              <button key={pl} aria-pressed={place === pl} onClick={() => set({ luogo: pl === "tutte" ? undefined : pl })}
                className={`h-11 rounded-full border-2 text-[14px] font-bold uppercase ${place === pl ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>
                {pl === "fuori" ? "Trasferta" : pl === "casa" ? "Casa" : "Tutte"}
              </button>
            ))}
          </div>
          {view === "prossime" && (
            <div className="grid grid-cols-5 gap-1" role="group" aria-label="Intervallo da oggi">
              {([undefined, ...WINDOWS] as (WindowDays | undefined)[]).map((w) => (
                <button key={w ?? "all"} aria-pressed={search.entro === w} onClick={() => set({ entro: w })}
                  className={`h-11 rounded-md border text-[14px] font-bold ${search.entro === w ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>
                  {w === undefined ? "Tutte" : w === 180 ? "6 mesi" : `${w} gg`}
                </button>
              ))}
            </div>
          )}
          {(view === "settimana" || view === "mese") && (
            <div className="flex items-center gap-2">
              <button aria-label="Periodo precedente" onClick={() => set({ p: offset - 1 || undefined })} className="flex size-11 items-center justify-center rounded-md border border-border bg-card"><ChevronLeft /></button>
              <span className="flex-1 text-center text-base font-bold capitalize">{label}</span>
              <button aria-label="Periodo successivo" onClick={() => set({ p: offset + 1 || undefined })} className="flex size-11 items-center justify-center rounded-md border border-border bg-card"><ChevronRight /></button>
              {offset !== 0 && <button onClick={() => set({ p: undefined })} className="h-11 rounded-md border border-border bg-card px-3 text-[14px] font-bold">Vai a oggi</button>}
            </div>
          )}
          {(view === "prossime" || view === "stagione") && <p className="text-[15px] font-semibold">{label} · {view === "prossime" ? `${shown.length} di ${visible.length}` : visible.length} {visible.length === 1 ? "gara" : "gare"}</p>}
        </div>
      </div>

      <section className="mx-auto max-w-5xl pb-24 px-4 pt-3 sm:px-6">
        {selected && (
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {trainingKey
              ? <Link to="/allenamenti" search={{ annata: trainingKey }} className="inline-flex h-11 items-center rounded-lg border-2 border-primary bg-card px-4 text-[15px] font-bold text-primary">Allenamenti della mia annata ({trainingKey})</Link>
              : <><Link to="/allenamenti" className="inline-flex h-11 items-center rounded-lg border-2 border-primary bg-card px-4 text-[15px] font-bold text-primary">Quadro allenamenti</Link><span className="text-[14px] text-muted-foreground">Cerca la categoria: non trovata automaticamente nel quadro.</span></>}
          </div>
        )}
        {events.length === 0 ? <p className="py-10 text-center text-base text-muted-foreground">{EMPTY_MESSAGE}</p>
          : visible.length === 0 ? <p className="py-10 text-center text-base text-muted-foreground">Nessuna gara in questo periodo{selected ? ` per ${selected.label}` : ""}.</p>
          : <div className="grid gap-x-6 lg:grid-cols-2">
            {Object.entries(byDate).map(([date, list]) => (
              <section key={date} aria-label={fmt(date, { weekday: "long", day: "numeric", month: "long" })} className="py-2">
                <h2 className="sticky top-[57px] z-10 bg-background/95 py-1 text-base font-bold capitalize text-primary">
                  {fmt(date, { weekday: "long", day: "numeric", month: "long" })}{date === today ? " · oggi" : ""}
                </h2>
                <ul className="grid gap-2">
                  {list.map((e) => <EventCard key={e.id} e={e} g={groups.find((x) => x.id === e.group)} open={openId === e.id} toggle={() => setOpenId(openId === e.id ? null : e.id)} />)}
                </ul>
              </section>
            ))}
          </div>}
        {remaining > 0 && (
          <button onClick={() => setExtra((x) => x + 8)} className="mt-4 h-12 w-full rounded-lg border-2 border-primary bg-card text-base font-bold text-primary">
            Mostra altre {Math.min(8, remaining)}
          </button>
        )}
      </section>
    </main>
  );
}

function shortLabel(g: PublicGroup) {
  const m = g.label.match(/\b(U\d{2}|Under\s?\d{2}|Juniores|Allievi|Giovanissimi|Prima Squadra)\b/i);
  if (g.years.length) return g.years.join("/");
  return m ? m[1]!.replace(/Under\s?/i, "U") : g.label.slice(0, 14);
}

function EventCard({ e, g, open, toggle }: { e: PublicEvent; g: PublicGroup | undefined; open: boolean; toggle: () => void }) {
  const certain = e.timeConfirmed && e.venueConfirmed;
  const logo = g?.logo ? LOGO_FILES[g.logo] : undefined;
  const home = e.homeAway === "CASA";
  const opp = e.opponent || "Avversario da definire";
  return (
    <li className="overflow-hidden rounded-lg border border-border bg-card" style={{ borderLeft: `5px solid ${g?.color ?? "#668196"}` }}>
      <button onClick={toggle} aria-expanded={open} className="block w-full p-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
        <div className="flex items-start gap-3">
          <div className="w-16 shrink-0">
            <span className="block font-display text-2xl font-bold leading-none">{e.time || "--:--"}</span>
            {!certain && <span className="mt-1 block text-[13px] font-semibold text-muted-foreground">indicativo</span>}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {logo && <img src={logo} alt="" width={24} height={24} className="size-6 shrink-0 rounded-full object-contain" />}
              <span className="text-[14px] font-bold uppercase text-muted-foreground">{g?.label ?? e.category} · {e.type.toLowerCase()}</span>
            </div>
            <p className="mt-1 break-words text-[17px] font-bold leading-snug">{home ? `SCD – ${opp}` : `${opp} – SCD`}</p>
          </div>
          <span className={`shrink-0 rounded px-2 py-1 text-[13px] font-bold ${home ? "bg-primary text-primary-foreground" : "surface-sun"}`}>{home ? "CASA" : "TRASFERTA"}</span>
        </div>
        <p className="mt-2 flex gap-1 text-base"><MapPin className="mt-0.5 size-4 shrink-0" /><span className="min-w-0 break-words">{e.venue || "Sede da definire"}</span></p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className={`rounded px-2 py-0.5 text-[13px] font-bold uppercase ${certain ? "bg-secondary text-foreground" : "surface-sun"}`}>{certain ? "Orario e sede registrati nel Calendario SCD" : "Orario/sede da confermare"}</span>
          {e.isVariation && <span className="rounded border border-primary px-2 py-0.5 text-[13px] font-bold uppercase text-primary">Variazione</span>}
        </div>
        {e.facilityReview && <p className="mt-1 text-[14px] font-semibold text-muted-foreground">Disponibilità impianto da verificare</p>}
      </button>
      {open && (
        <dl className="grid gap-1.5 border-t border-border px-3 py-3 text-base">
          <div><Clock3 className="mr-1 inline size-4" />{fmt(e.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · {e.time ? `${e.time}${certain ? "" : " (indicativo)"}` : "orario da definire"}</div>
          <div className="flex gap-1"><MapPin className="mt-1 size-4 shrink-0" /><span className="break-words">{e.venue || "Sede da definire"}{e.venueConfirmed ? "" : " (da confermare)"}</span></div>
          <div><dt className="inline text-muted-foreground">Categoria: </dt><dd className="inline">{e.category}{e.round ? ` · giornata ${e.round}` : ""}</dd></div>
          <div><dt className="inline text-muted-foreground">Provenienza: </dt><dd className="inline">{e.source || "Calendario SCD"} · {e.status === "OFFICIAL_CALENDAR" ? "calendario ufficiale" : e.status === "CLUB_EVENT" ? "evento organizzato dalla società (non certificato FIGC)" : e.status} · fotografia non live</dd></div>
          {e.notice.map((n) => <div key={n} className="text-[15px] font-semibold">⚠ {n}</div>)}
        </dl>
      )}
    </li>
  );
}
