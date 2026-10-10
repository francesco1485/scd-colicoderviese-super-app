import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Bell, CalendarDays, ChevronLeft, ChevronRight, Clock3, Handshake, Heart, MapPin, Share2, ShieldCheck, Trophy, Users } from "lucide-react";

import heroImg from "@/assets/hero-colico.jpg";
import { Button } from "@/components/ui/button";
import { ClubCrest } from "@/components/ui-kit";
import { ClubCrestOfficial } from "@/components/SiteChrome";
import { getPublicCalendarSnapshot } from "@/lib/calendar.functions";
import { getPublicFeed, getPublicSchedule } from "@/lib/club.functions";
import type { FeedItem, Match } from "@/lib/club.types";
import {
  calendarToWeekItems, countdownLabel, itemsOn, mergeWeekItems, nextMatchItem, r20ItemToWeekItem,
  r20MatchToWeekItem, romeParts, todayAtCentre, weekItemToMatch, type WeekItem,
} from "@/lib/home-week";
import { freshnessLabel } from "@/lib/public-snapshots";

export const Route = createFileRoute("/")({
  loader: async () => {
    const [feed, schedule, calendar] = await Promise.all([getPublicFeed(), getPublicSchedule(), getPublicCalendarSnapshot()]);
    const now = romeParts(new Date().toISOString());
    return { feed, schedule, calendar, today: now?.date ?? new Date().toISOString().slice(0, 10), clock: now?.time ?? "00:00" };
  },
  head: () => ({ meta: [
    { title: "La settimana SCD — S.C.D. ColicoDerviese" },
    { name: "description", content: "La settimana della S.C.D. ColicoDerviese: gare, eventi, notizie, community e prossima partita, senza accesso obbligatorio." },
    { property: "og:title", content: "La settimana SCD — S.C.D. ColicoDerviese" },
    { property: "og:description", content: "Gare, eventi, notizie e prossima partita della S.C.D. ColicoDerviese." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Home,
});

const DAY = 86400000;
function mondayOf(iso: string) {
  const date = new Date(`${iso}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date;
}
function dateKey(date: Date) { return date.toISOString().slice(0, 10); }
function dateLabel(value: string, options: Intl.DateTimeFormatOptions) {
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00Z` : value);
  return Number.isNaN(date.getTime()) ? "Data in aggiornamento" : new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", ...options }).format(date);
}
function share(title: string, url?: string) {
  if (typeof navigator === "undefined") return;
  const link = url || location.href;
  if (navigator.share) void navigator.share({ title, url: link }).catch(() => {});
  else if (navigator.clipboard) void navigator.clipboard.writeText(link);
}
const isUs = (team: string) => /colico/i.test(team);

/** Tre porte della Super App: un solo ingresso, tre mondi. */
const DOORS = [
  { to: "/calendario", app: "ONE", title: "Il Club", text: "Gare, allenamenti, eventi", icon: Users },
  { to: "/core", app: "CORE", title: "Area Club", text: "Impianti, staff, famiglie", icon: ShieldCheck },
  { to: "/grow", app: "GROW", title: "Sponsor & Partner", text: "Pacchetti e partnership", icon: Handshake },
] as const;

function Home() {
  const { feed, schedule, calendar, today, clock: initialClock } = Route.useLoaderData();
  const [weekOffset, setWeekOffset] = useState(0);
  const [clock, setClock] = useState(initialClock);
  const [vote, setVote] = useState<string | null>(null);
  const [favorite, setFavorite] = useState<string[]>([]);
  const weekRef = useRef<HTMLDivElement>(null);
  // Smartphone: la striscia dei giorni parte da oggi (o dal lunedì nelle altre settimane).
  useEffect(() => {
    const strip = weekRef.current;
    if (!strip || strip.scrollWidth <= strip.clientWidth) return;
    const target = strip.querySelector<HTMLElement>(`[data-day="${today}"]`);
    strip.scrollLeft = target ? Math.max(0, target.offsetLeft - strip.offsetLeft - 16) : 0;
  }, [today, weekOffset]);
  useEffect(() => {
    const tick = () => setClock(romeParts(new Date().toISOString())?.time ?? initialClock);
    tick();
    const timer = setInterval(tick, 60000);
    return () => clearInterval(timer);
  }, [initialClock]);
  const monday = useMemo(() => new Date(mondayOf(today).getTime() + weekOffset * 7 * DAY), [today, weekOffset]);
  const days = Array.from({ length: 7 }, (_, i) => new Date(monday.getTime() + i * DAY));
  const publicItems = [...feed.items, ...schedule.items].filter((item, index, array) => array.findIndex((other) => other.id === item.id) === index);

  // Calendario validato (stessa fonte di /calendario) + eventuali gare/eventi R20, senza doppioni.
  const merged = useMemo(() => {
    const r20Matches = [...schedule.matches, ...(feed.nextMatch ? [feed.nextMatch] : [])];
    const r20 = [
      ...r20Matches.map(r20MatchToWeekItem),
      ...publicItems.map(r20ItemToWeekItem),
    ].filter((i): i is WeekItem => !!i);
    return mergeWeekItems(calendarToWeekItems(calendar.events, calendar.groups), r20);
  }, [calendar, schedule, feed, publicItems]);
  const opponents = useMemo(() => new Map(calendar.events.map((e) => [e.id, e.opponent])), [calendar.events]);

  const nextItem = nextMatchItem(merged, today, clock);
  const next: Match | null = !nextItem
    ? feed.nextMatch
    : nextItem.origin === "r20" && feed.nextMatch && `r20-${feed.nextMatch.id}` === nextItem.id
      ? feed.nextMatch
      : weekItemToMatch(nextItem, opponents.get(nextItem.id) ?? "");
  const nextEvent = nextItem?.origin === "calendario" ? calendar.events.find((e) => e.id === nextItem.id) : undefined;
  const countdown = nextItem ? countdownLabel(today, nextItem.date) : null;
  const centreToday = todayAtCentre(merged, today);

  const events = publicItems.filter((item) => item.kind === "event" && item.startAt && item.startAt.slice(0, 10) >= today && item.startAt.slice(0, 10) <= dateKey(new Date(new Date(`${today}T12:00:00Z`).getTime() + 30 * DAY))).sort((a, b) => (a.startAt ?? "").localeCompare(b.startAt ?? ""));
  const news = publicItems.filter((item) => item.kind === "news" && (!item.startAt || (item.startAt.slice(0, 10) >= dateKey(monday) && item.startAt.slice(0, 10) <= dateKey(days[6]!))));
  const alerts = feed.items.filter((item) => item.kind === "alert");
  const weekCount = days.reduce((n, d) => n + itemsOn(merged, dateKey(d)).length, 0);
  const sourceNote = calendar.origin === "mirror"
    ? `Calendario SCD aggiornato ${freshnessLabel(calendar.sourceModifiedAt)}`
    : calendar.origin === "stale"
      ? `Ultima copia verificata del ${freshnessLabel(calendar.sourceModifiedAt)}`
      : `Copia di sicurezza del ${freshnessLabel(calendar.sourceModifiedAt)}`;
  function toggleFavorite(id: string) { setFavorite((list) => list.includes(id) ? list.filter((entry) => entry !== id) : [...list, id]); }

  return <main className="pb-10">
    <section className="relative isolate overflow-hidden bg-lake-deep text-primary-foreground">
      <img src={heroImg} alt="Calcio e paesaggio dell'Alto Lago" className="absolute inset-0 -z-20 h-full w-full object-cover object-center opacity-35" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-lake-deep via-lake-deep/90 to-lake-deep/65" />
      <div className="mx-auto max-w-7xl px-4 pb-6 pt-4 sm:px-6 lg:pt-6">
        <nav aria-label="Le tre aree della Super App" className="grid grid-cols-3 gap-2" data-testid="superapp-doors">
          {DOORS.map((d) => (
            <Link key={d.app} to={d.to} className="group flex min-h-[4.5rem] flex-col justify-between rounded-xl border border-primary-foreground/20 bg-lake-deep/70 p-2.5 backdrop-blur transition-colors hover:border-accent sm:flex-row sm:items-center sm:gap-3 sm:p-3">
              <span className="flex items-center justify-between gap-1">
                <d.icon className="size-5 text-accent" aria-hidden="true" />
                <span className="rounded bg-accent px-1.5 py-0.5 font-display text-[0.62rem] font-bold tracking-wider text-accent-foreground sm:order-first">{d.app}</span>
              </span>
              <span className="min-w-0 sm:flex-1">
                <strong className="block font-display text-[0.95rem] uppercase leading-tight sm:text-lg">{d.title}</strong>
                <small className="hidden text-xs text-primary-foreground/70 sm:block">{d.text}</small>
              </span>
              <ArrowRight className="hidden size-4 shrink-0 text-accent transition-transform group-hover:translate-x-1 sm:block" aria-hidden="true" />
            </Link>
          ))}
        </nav>
        <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
          <div className="min-w-0"><p className="text-xs font-bold uppercase text-accent">Colico · Dervio · Alto Lario</p><h1 className="mt-1 text-[2.1rem] font-bold leading-none sm:text-5xl">La settimana SCD</h1><p className="mt-2 text-sm text-primary-foreground/80">{dateLabel(dateKey(monday), { day: "numeric", month: "long" })} — {dateLabel(dateKey(days[6]!), { day: "numeric", month: "long", year: "numeric" })} · <b data-testid="week-count">{weekCount} {weekCount === 1 ? "appuntamento" : "appuntamenti"}</b></p></div>
          <div className="flex shrink-0 items-center gap-1"><Button variant="outline" size="icon" className="size-11 border-primary-foreground/30 bg-lake-deep/50 text-primary-foreground" onClick={() => setWeekOffset((n) => n - 1)} aria-label="Settimana precedente"><ChevronLeft /></Button><Button variant="outline" size="icon" className="size-11 border-primary-foreground/30 bg-lake-deep/50 text-primary-foreground" onClick={() => setWeekOffset((n) => n + 1)} aria-label="Settimana successiva"><ChevronRight /></Button></div>
        </div>
        {alerts.length > 0 && <div className="mt-5 border-l-4 border-accent bg-lake-deep/80 px-3 py-2 text-sm"><Bell className="mr-2 inline size-4 text-accent" />{alerts[0]!.title}</div>}
        <div ref={weekRef} className="-mx-4 mt-4 flex snap-x gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-7 sm:px-0" data-testid="week-days">
          {days.map((day) => { const items = itemsOn(merged, dateKey(day)); const active = dateKey(day) === today; return <div key={dateKey(day)} data-day={dateKey(day)} data-count={items.length} className={`min-h-28 w-[132px] shrink-0 snap-start rounded-lg border p-2.5 sm:w-auto ${active ? "border-accent bg-accent text-accent-foreground" : "border-primary-foreground/25 bg-lake-deep/65 text-primary-foreground"}`}>
            <div className="flex items-baseline justify-between gap-1"><span className="text-[0.68rem] font-bold uppercase">{dateLabel(dateKey(day), { weekday: "short" })}{active ? " · oggi" : ""}</span><strong className="font-display text-3xl leading-none">{day.getUTCDate()}</strong></div>
            <span className="mt-2 block text-[0.7rem] leading-tight">{items.length ? <>{items.slice(0, 3).map((i) => <span key={i.id} className="mb-1.5 block"><b className="font-display text-[0.8rem]">{i.time || "--:--"}</b>{!i.certain && <span className={`ml-1 rounded px-1 text-[0.58rem] font-bold uppercase ${active ? "bg-lake-deep text-accent" : "bg-accent text-accent-foreground"}`}>da conf.</span>}<span className="block line-clamp-2">{i.title}</span></span>)}{items.length > 3 && <span className="block font-bold">+{items.length - 3} altre</span>}</> : "Nessuna gara in calendario"}</span>
          </div>; })}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-primary-foreground/80"><span>{weekOffset === 0 ? "Questa settimana" : "Calendario pubblico"} · {sourceNote} · "da conf." = orario/sede da confermare</span><Link to="/calendario" search={{ vista: "settimana" }} className="inline-flex shrink-0 items-center gap-1 font-bold text-accent">Calendario completo <ArrowRight className="size-4" /></Link></div>
      </div>
    </section>

    <section className="mx-auto max-w-7xl px-4 pt-8 sm:px-6"><div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase text-primary"><span className="h-2 w-2 rounded-full bg-accent" /> Match center</div>
      <div className="grid gap-5 border-y border-border py-6 md:grid-cols-[minmax(0,1.4fr)_minmax(240px,.6fr)]" data-testid="next-match">
        <div className="min-w-0"><p className="text-xs font-bold uppercase text-muted-foreground">Prossima partita {next?.stats?.live && <span className="ml-2 text-destructive">● Live</span>}</p>{next ? <><div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-5"><div className="flex min-w-0 items-center gap-2">{isUs(next.casa) ? <ClubCrestOfficial size={40} /> : <ClubCrest name={next.casa} club={next.avversario} size={36} />}<strong className="min-w-0 break-words font-display text-lg uppercase leading-tight sm:text-2xl">{next.casa}</strong></div><span className="font-display text-2xl font-bold text-primary">VS</span><div className="flex min-w-0 items-center justify-end gap-2 text-right"><strong className="min-w-0 break-words font-display text-lg uppercase leading-tight sm:text-2xl">{next.ospite}</strong>{isUs(next.ospite) ? <ClubCrestOfficial size={40} /> : <ClubCrest name={next.ospite} club={next.avversario} size={36} />}</div></div><p className="mt-5 flex flex-wrap gap-x-5 gap-y-1 text-sm font-medium"><span>{next.squadra}{next.competizione ? ` · ${next.competizione}` : ""}</span><span><Clock3 className="mr-1 inline size-4" />{next.dataLabel || "Orario in aggiornamento"}</span>{next.campo && <span><MapPin className="mr-1 inline size-4" />{next.campo}</span>}</p>
          {nextItem && <div className="mt-3 flex flex-wrap gap-1.5"><span className={`rounded px-2 py-0.5 text-[12px] font-bold uppercase ${nextItem.certain ? "bg-secondary text-foreground" : "surface-sun"}`}>{nextItem.certain ? "Orario e sede registrati nel Calendario SCD" : "Orario/sede da confermare"}</span>{nextItem.isVariation && <span className="rounded border border-primary px-2 py-0.5 text-[12px] font-bold uppercase text-primary">Variazione</span>}{nextItem.facilityReview && <span className="rounded border border-border px-2 py-0.5 text-[12px] font-semibold text-muted-foreground">Disponibilità impianto da verificare</span>}<span className="rounded border border-border px-2 py-0.5 text-[12px] font-semibold text-muted-foreground">Fonte: {nextItem.origin === "r20" ? "gestionale R20" : `${nextEvent?.source || "Calendario SCD"} · fotografia non live`}</span></div>}</> : <><h2 className="mt-2 text-3xl font-bold">La prossima gara</h2><p className="mt-2 text-sm text-muted-foreground">Data, avversario e campo in aggiornamento dal club.</p></>}
          <div className="mt-5 flex flex-wrap items-center gap-3"><Button asChild className="h-11 bg-accent px-5 text-accent-foreground hover:bg-accent/90"><Link to="/calendario">Analizza la partita <ArrowRight /></Link></Button>{countdown !== null && <span className="text-xs font-bold uppercase text-primary">{countdown}</span>}{next?.stats?.ingressoUrl && <a className="text-sm font-bold underline" href={next.stats.ingressoUrl} target="_blank" rel="noopener noreferrer">Biglietti / ingresso</a>}</div>
        </div><div className="grid content-center gap-3 border-t border-border pt-4 text-sm md:border-l md:border-t-0 md:pl-6 md:pt-0"><p className="flex items-center gap-2 font-display text-xl font-bold uppercase"><Trophy className="size-5 text-primary" /> La partita in numeri</p>{[["Classifica", next?.stats?.classifica], ["Forma recente", next?.stats?.forma], ["Precedenti", next?.stats?.precedenti]].map(([label, value]) => <div key={label} className="flex justify-between gap-3 border-b border-border pb-2"><span className="text-muted-foreground">{label}</span><strong className="text-right">{value || "Dati in aggiornamento"}</strong></div>)}</div>
      </div>
    </section>

    <section className="mx-auto max-w-7xl px-4 pt-8 sm:px-6" aria-labelledby="oggi-centro" data-testid="today-centre">
      <div className="flex items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase text-primary">Colico · Dervio</p><h2 id="oggi-centro" className="mt-1 text-2xl font-bold">Oggi al centro sportivo</h2></div><span className="text-xs font-semibold capitalize text-muted-foreground">{dateLabel(today, { weekday: "long", day: "numeric", month: "long" })}</span></div>
      {centreToday.length ? <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{centreToday.map((i) => <li key={i.id} className="flex items-start gap-3 rounded-lg border border-border bg-card p-3" style={{ borderLeft: `5px solid ${calendar.groups.find((g) => g.id === i.group)?.color ?? "#668196"}` }}><span className="w-14 shrink-0 font-display text-2xl font-bold leading-none">{i.time || "--:--"}</span><span className="min-w-0 flex-1"><span className="block text-[12px] font-bold uppercase text-muted-foreground">{i.groupLabel}</span><strong className="block break-words text-[15px] leading-snug">{i.title}</strong><span className="mt-1 flex gap-1 text-[13px]"><MapPin className="mt-0.5 size-3.5 shrink-0" />{i.venue}</span><span className={`mt-1.5 inline-block rounded px-1.5 py-0.5 text-[11px] font-bold uppercase ${i.certain ? "bg-secondary" : "surface-sun"}`}>{i.certain ? "Registrato nel Calendario SCD" : "Orario/sede da confermare"}</span>{i.facilityReview && <span className="ml-1 text-[12px] font-semibold text-muted-foreground">· impianto da verificare</span>}</span></li>)}</ul>
        : <p className="mt-2 text-sm text-muted-foreground">Nessuna gara in calendario oggi a Colico o Dervio.</p>}
      <p className="mt-2 text-xs text-muted-foreground">Solo gare del calendario pubblico SCD nelle sedi di Colico e Dervio. Allenamenti: <Link to="/allenamenti" className="font-bold text-primary underline">quadro settimanale</Link>.</p>
    </section>

    <section className="mx-auto max-w-7xl px-4 pt-12 sm:px-6"><Heading kicker="In agenda" title="Eventi prossimi" to="/eventi" /><div className="-mx-4 mt-5 flex snap-x gap-3 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0">{events.length ? events.slice(0, 5).map((event) => <EventTile key={event.id} event={event} favorite={favorite.includes(event.id)} toggle={() => toggleFavorite(event.id)} />) : <EmptyPanel title="I prossimi eventi" text="Il programma dei prossimi 30 giorni è in aggiornamento. Torna a trovarci per le novità ufficiali." />}</div></section>

    <section className="mx-auto max-w-7xl px-4 pt-12 sm:px-6"><Heading kicker="Dal club" title="News della settimana" /><div className="mt-5 grid gap-4 md:grid-cols-[1.4fr_1fr]">{news.length ? <><NewsLead item={news[0]!} favorite={favorite.includes(news[0]!.id)} toggle={() => toggleFavorite(news[0]!.id)} /><div className="grid gap-0 border-t border-border">{news.slice(1, 4).map((item) => <div key={item.id} className="flex items-start justify-between gap-3 border-b border-border py-4"><div><p className="text-xs font-bold uppercase text-primary">{item.source || "SCD"}</p><h3 className="mt-1 text-xl font-bold leading-tight">{item.title}</h3></div><Button variant="ghost" size="icon" className="shrink-0" onClick={() => share(item.title, item.link)} aria-label={`Condividi ${item.title}`}><Share2 /></Button></div>)}{news.length < 4 && <p className="py-4 text-sm text-muted-foreground">Altre notizie in aggiornamento.</p>}</div></> : <EmptyPanel title="La voce del club" text="Le notizie ufficiali della settimana saranno pubblicate qui appena disponibili." />}</div></section>

    <section className="mt-14 bg-secondary py-12"><div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 md:grid-cols-2"><div><p className="text-xs font-bold uppercase text-primary">Community pulse</p><h2 className="mt-1 text-3xl font-bold">La parola ai tifosi</h2><p className="mt-3 max-w-md text-sm text-muted-foreground">Il sondaggio ufficiale della settimana non è ancora disponibile.</p><Link to="/community" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-primary">Vai alla community <ArrowRight className="size-4" /></Link></div><div className="border border-border bg-card p-5"><p className="text-[0.68rem] font-bold uppercase text-muted-foreground">Prova locale · non è un sondaggio ufficiale</p><h3 className="mt-2 text-xl font-bold">Cosa vorresti seguire di più?</h3><div className="mt-3 grid gap-2">{["Partite", "Eventi", "Notizie"].map((choice) => <Button key={choice} variant={vote === choice ? "default" : "outline"} className="h-10 justify-between" onClick={() => setVote(choice)}>{choice}{vote === choice && <span>✓</span>}</Button>)}</div>{vote && <p role="status" className="mt-3 text-xs text-muted-foreground">Scelta salvata solo su questa pagina. Nessun risultato reale disponibile.</p>}</div></div></section>

    <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6"><div className="flex items-center justify-between gap-3"><p className="text-xs font-bold uppercase text-primary">Accanto alla SCD</p><Link to="/grow" className="text-xs font-bold text-primary">Sponsor & Partner →</Link></div><div className="-mx-4 mt-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">{["Main sponsor", "Partner", "Istituzionali", "Sponsor evento"].map((slot) => <div key={slot} className="flex h-20 min-w-44 shrink-0 flex-col justify-center border border-border px-5"><span className="text-[0.65rem] font-bold uppercase text-muted-foreground">{slot}</span><span className="font-display text-xl font-bold uppercase text-primary">Sponsor</span></div>)}</div><p className="mt-2 text-xs text-muted-foreground">Spazi disponibili · nessun marchio pubblicato senza conferma.</p></section>

    <section className="mt-14 bg-lake-deep py-12 text-primary-foreground"><div className="mx-auto max-w-7xl px-4 sm:px-6"><p className="text-xs font-bold uppercase text-accent">Fai parte della storia</p><h2 className="mt-1 text-4xl font-bold">Entra nel club</h2><div className="mt-6 grid gap-px bg-primary-foreground/20 sm:grid-cols-2 lg:grid-cols-3">{([["Diventa tifoso", "/community", "Segui e partecipa"], ["Tesserato / Atleta", "/entra", "Chiedi una prova"], ["Famiglia", "/aree", "Accedi all'area"], ["Staff / Collaboratore", "/contatti", "Proponi collaborazione"], ["Sponsor / Partner", "/sponsor", "Richiedi proposta"], ["Altro profilo", "/contatti", "Richiedi autorizzazione"]] as const).map(([title, to, action]) => <Link key={title} to={to} className="group flex min-h-24 items-center justify-between gap-3 bg-lake-deep p-4 transition-colors hover:bg-lake"><span><strong className="block font-display text-xl uppercase">{title}</strong><small className="text-primary-foreground/70">{action}</small></span><ArrowRight className="size-5 shrink-0 text-accent transition-transform group-hover:translate-x-1" /></Link>)}</div><p className="mt-4 text-xs text-primary-foreground/70">Richieste e accessi vengono autorizzati dalla società. Il tesseramento sportivo non attribuisce automaticamente la qualità di socio.</p></div></section>

    <section className="mx-auto grid max-w-7xl gap-6 px-4 pt-12 sm:px-6 md:grid-cols-2"><div><p className="text-xs font-bold uppercase text-primary">Ultimo risultato</p>{feed.lastResult ? <p className="mt-2 text-lg font-bold">{feed.lastResult.casa} {feed.lastResult.golCasa ?? "–"} : {feed.lastResult.golOspite ?? "–"} {feed.lastResult.ospite}</p> : <p className="mt-2 text-sm text-muted-foreground">Risultati in aggiornamento.</p>}</div><div><p className="text-xs font-bold uppercase text-primary">SCD Radar</p><p className="mt-2 text-sm text-muted-foreground">Aggiornamenti e fonti verificate dal club in arrivo.</p></div></section>
    <div className="mx-auto mt-10 max-w-7xl px-4 sm:px-6"><Link to="/safeguarding" className="inline-flex items-center gap-2 text-sm font-semibold text-primary"><ShieldCheck className="size-4" /> Safeguarding · segnalazioni riservate</Link></div>
  </main>;
}

function Heading({ kicker, title, to }: { kicker: string; title: string; to?: "/eventi" }) { return <div className="flex items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase text-primary">{kicker}</p><h2 className="mt-1 text-3xl font-bold">{title}</h2></div>{to && <Link to={to} className="flex shrink-0 items-center gap-1 text-sm font-bold text-primary">Tutti <ArrowRight className="size-4" /></Link>}</div>; }
function EmptyPanel({ title, text }: { title: string; text: string }) { return <div className="flex min-h-40 w-full flex-col justify-center border-y border-border py-6"><CalendarDays className="size-6 text-primary" /><h3 className="mt-2 text-xl font-bold">{title}</h3><p className="mt-1 max-w-lg text-sm text-muted-foreground">{text}</p></div>; }
function EventTile({ event, favorite, toggle }: { event: FeedItem; favorite: boolean; toggle: () => void }) { return <article className="w-64 shrink-0 snap-start border border-border bg-card sm:w-72"><div className="relative h-36 bg-secondary">{event.image ? <img src={event.image} alt="" loading="lazy" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><CalendarDays className="size-10 text-primary/35" /></div>}<span className="absolute bottom-2 left-2 bg-accent px-2 py-1 text-xs font-bold text-accent-foreground">{event.startAt ? dateLabel(event.startAt, { day: "numeric", month: "short" }) : "Data in aggiornamento"}</span></div><div className="p-4"><p className="text-xs font-bold uppercase text-primary">{event.category || "Evento pubblico"}</p><h3 className="mt-1 line-clamp-2 min-h-12 text-xl font-bold leading-tight">{event.title}</h3>{event.venue && <p className="mt-2 text-xs text-muted-foreground"><MapPin className="mr-1 inline size-3" />{event.venue}</p>}<div className="mt-3 flex items-center justify-between"><span className="text-xs font-semibold">{event.link ? <a href={event.link} target="_blank" rel="noopener noreferrer" className="text-primary underline">Dettagli →</a> : "Dettagli in aggiornamento"}</span><div className="flex"><Button variant="ghost" size="icon" onClick={toggle} aria-label={favorite ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti"}><Heart className={favorite ? "fill-accent text-primary" : ""} /></Button><Button variant="ghost" size="icon" onClick={() => share(event.title, event.link)} aria-label="Condividi evento"><Share2 /></Button></div></div></div></article>; }
function NewsLead({ item, favorite, toggle }: { item: FeedItem; favorite: boolean; toggle: () => void }) { return <article className="relative flex min-h-64 flex-col justify-end overflow-hidden bg-lake-deep p-6 text-primary-foreground">{item.image && <img src={item.image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />}<div className="absolute inset-0 bg-gradient-to-t from-lake-deep via-lake-deep/55 to-transparent" /><div className="relative"><p className="text-xs font-bold uppercase text-accent">{item.source || "Dal club"}</p><h3 className="mt-2 max-w-lg text-3xl font-bold leading-tight">{item.title}</h3>{item.body && <p className="mt-2 line-clamp-2 max-w-lg text-sm text-primary-foreground/80">{item.body}</p>}<div className="mt-3 flex items-center gap-2">{item.link && <a href={item.link} target="_blank" rel="noopener noreferrer" className="mr-auto text-sm font-bold text-accent underline">Leggi la notizia →</a>}<Button variant="ghost" size="icon" className="text-primary-foreground" onClick={toggle} aria-label="Salva notizia"><Heart className={favorite ? "fill-accent text-accent" : ""} /></Button><Button variant="ghost" size="icon" className="text-primary-foreground" onClick={() => share(item.title, item.link)} aria-label="Condividi notizia"><Share2 /></Button></div></div></article>; }
