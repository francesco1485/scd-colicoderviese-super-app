import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Bell, CalendarDays, ChevronLeft, ChevronRight, Clock3, Heart, MapPin, Radio, Share2, ShieldCheck, Trophy } from "lucide-react";

import heroImg from "@/assets/hero-colico.jpg";
import { Button } from "@/components/ui/button";
import { ClubCrest } from "@/components/ui-kit";
import { getPublicFeed, getPublicSchedule } from "@/lib/club.functions";
import type { FeedItem, Match } from "@/lib/club.types";

export const Route = createFileRoute("/")({
  loader: async () => {
    const [feed, schedule] = await Promise.all([getPublicFeed(), getPublicSchedule()]);
    return { feed, schedule, today: new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()) };
  },
  head: () => ({ meta: [
    { title: "La settimana SCD — S.D.C. ColicoDerviese" },
    { name: "description", content: "La settimana della S.D.C. ColicoDerviese: gare, eventi, notizie, community e prossima partita, senza accesso obbligatorio." },
    { property: "og:title", content: "La settimana SCD — S.D.C. ColicoDerviese" },
    { property: "og:description", content: "Gare, eventi, notizie e prossima partita della S.D.C. ColicoDerviese." },
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
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Data in aggiornamento" : new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", ...options }).format(date);
}
function share(title: string, url?: string) {
  if (typeof navigator === "undefined") return;
  const link = url || location.href;
  if (navigator.share) void navigator.share({ title, url: link }).catch(() => {});
  else if (navigator.clipboard) void navigator.clipboard.writeText(link);
}

function Home() {
  const { feed, schedule, today } = Route.useLoaderData();
  const [weekOffset, setWeekOffset] = useState(0);
  const [now, setNow] = useState<number | null>(null);
  const [vote, setVote] = useState<string | null>(null);
  const [favorite, setFavorite] = useState<string[]>([]);
  useEffect(() => { setNow(Date.now()); const timer = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(timer); }, []);
  const monday = useMemo(() => new Date(mondayOf(today).getTime() + weekOffset * 7 * DAY), [today, weekOffset]);
  const days = Array.from({ length: 7 }, (_, i) => new Date(monday.getTime() + i * DAY));
  const next = feed.nextMatch;
  const allMatches = schedule.matches.length ? schedule.matches : next ? [next] : [];
  const publicItems = [...feed.items, ...schedule.items].filter((item, index, array) => array.findIndex((other) => other.id === item.id) === index);
  const events = publicItems.filter((item) => item.kind === "event" && item.startAt && item.startAt.slice(0, 10) >= today && item.startAt.slice(0, 10) <= dateKey(new Date(new Date(`${today}T12:00:00Z`).getTime() + 30 * DAY))).sort((a, b) => (a.startAt ?? "").localeCompare(b.startAt ?? ""));
  const news = publicItems.filter((item) => item.kind === "news" && (!item.startAt || (item.startAt.slice(0, 10) >= dateKey(monday) && item.startAt.slice(0, 10) <= dateKey(days[6]!))));
  const alerts = feed.items.filter((item) => item.kind === "alert");
  const weekItems = (day: Date) => {
    const key = dateKey(day);
    return [
      ...allMatches.filter((m) => m.startAt?.slice(0, 10) === key).map((m) => ({ id: m.id, title: `${m.casa} – ${m.ospite}`, kind: "Gara" })),
      ...publicItems.filter((i) => ["event", "community"].includes(i.kind) && i.startAt?.slice(0, 10) === key).map((i) => ({ id: i.id, title: i.title, kind: i.kind === "event" ? "Evento" : "Iniziativa" })),
    ];
  };
  const countdown = next?.startAt && now && new Date(next.startAt).getTime() > now ? Math.ceil((new Date(next.startAt).getTime() - now) / DAY) : null;
  function toggleFavorite(id: string) { setFavorite((list) => list.includes(id) ? list.filter((entry) => entry !== id) : [...list, id]); }
  return <main className="pb-10">
    <section className="relative isolate overflow-hidden bg-lake-deep text-primary-foreground">
      <img src={heroImg} alt="Calcio e paesaggio dell'Alto Lago" className="absolute inset-0 -z-20 h-full w-full object-cover object-center opacity-35" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-lake-deep via-lake-deep/90 to-lake-deep/65" />
      <div className="mx-auto max-w-7xl px-4 pb-7 pt-7 sm:px-6 lg:pt-10">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
          <div className="min-w-0"><p className="text-xs font-bold uppercase text-accent">Colico · Dervio · Alto Lario</p><h1 className="mt-1 text-4xl font-bold leading-none sm:text-5xl">La settimana SCD</h1><p className="mt-2 text-sm text-primary-foreground/80">{dateLabel(dateKey(monday), { day: "numeric", month: "long" })} — {dateLabel(dateKey(days[6]!), { day: "numeric", month: "long", year: "numeric" })}</p></div>
          <div className="flex shrink-0 items-center gap-1"><Button variant="outline" size="icon" className="size-11 border-primary-foreground/30 bg-lake-deep/50 text-primary-foreground" onClick={() => setWeekOffset((n) => n - 1)} aria-label="Settimana precedente"><ChevronLeft /></Button><Button variant="outline" size="icon" className="size-11 border-primary-foreground/30 bg-lake-deep/50 text-primary-foreground" onClick={() => setWeekOffset((n) => n + 1)} aria-label="Settimana successiva"><ChevronRight /></Button></div>
        </div>
        {alerts.length > 0 && <div className="mt-5 border-l-4 border-accent bg-lake-deep/80 px-3 py-2 text-sm"><Bell className="mr-2 inline size-4 text-accent" />{alerts[0]!.title}</div>}
        <div className="-mx-4 mt-5 flex snap-x gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-7 sm:px-0">
          {days.map((day) => { const items = weekItems(day); const active = dateKey(day) === today; return <div key={dateKey(day)} className={`min-h-28 w-[104px] shrink-0 snap-start border p-3 sm:w-auto ${active ? "border-accent bg-accent text-accent-foreground" : "border-primary-foreground/25 bg-lake-deep/65 text-primary-foreground"}`}><span className="block text-[0.68rem] font-bold uppercase">{dateLabel(dateKey(day), { weekday: "short" })}</span><strong className="block font-display text-3xl leading-none">{day.getUTCDate()}</strong><span className="mt-3 block text-[0.68rem] leading-tight">{items.length ? items.slice(0, 2).map((i) => <span key={i.id} className="mb-1 block line-clamp-2"><b>{i.kind}</b> · {i.title}</span>) : "Nessun appuntamento pubblicato"}</span></div>; })}
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 text-xs text-primary-foreground/75"><span>{weekOffset === 0 ? "Questa settimana" : "Calendario pubblico"} · solo appuntamenti confermati</span><Link to="/calendario" className="inline-flex shrink-0 items-center gap-1 font-bold text-accent">Calendario completo <ArrowRight className="size-4" /></Link></div>
      </div>
    </section>

    <section className="mx-auto max-w-7xl px-4 pt-8 sm:px-6"><div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase text-primary"><span className="h-2 w-2 rounded-full bg-accent" /> Match center</div>
      <div className="grid gap-5 border-y border-border py-6 md:grid-cols-[minmax(0,1.4fr)_minmax(240px,.6fr)]">
        <div className="min-w-0"><p className="text-xs font-bold uppercase text-muted-foreground">Prossima partita {next?.stats?.live && <span className="ml-2 text-destructive">● Live</span>}</p>{next ? <><div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-5"><div className="flex min-w-0 items-center gap-2"><ClubCrest name={next.casa} club={/colico/i.test(next.casa) ? undefined : next.avversario} size={36} /><strong className="min-w-0 break-words font-display text-lg uppercase leading-tight sm:text-2xl">{next.casa}</strong></div><span className="font-display text-2xl font-bold text-primary">VS</span><div className="flex min-w-0 items-center justify-end gap-2 text-right"><strong className="min-w-0 break-words font-display text-lg uppercase leading-tight sm:text-2xl">{next.ospite}</strong><ClubCrest name={next.ospite} club={/colico/i.test(next.casa) ? next.avversario : undefined} size={36} /></div></div><p className="mt-5 flex flex-wrap gap-x-5 gap-y-1 text-sm font-medium"><span>{next.squadra}{next.competizione ? ` · ${next.competizione}` : ""}</span><span><Clock3 className="mr-1 inline size-4" />{next.dataLabel || "Orario in aggiornamento"}</span>{next.campo && <span><MapPin className="mr-1 inline size-4" />{next.campo}</span>}</p></> : <><h2 className="mt-2 text-3xl font-bold">La prossima gara</h2><p className="mt-2 text-sm text-muted-foreground">Data, avversario e campo in aggiornamento dal club.</p></>}
          <div className="mt-5 flex flex-wrap items-center gap-3"><Button asChild className="h-11 bg-accent px-5 text-accent-foreground hover:bg-accent/90"><Link to="/calendario">Analizza la partita <ArrowRight /></Link></Button>{countdown !== null && <span className="text-xs font-bold uppercase text-primary">{countdown === 1 ? "Domani" : `Tra ${countdown} giorni`}</span>}{next?.stats?.ingressoUrl && <a className="text-sm font-bold underline" href={next.stats.ingressoUrl} target="_blank" rel="noopener noreferrer">Biglietti / ingresso</a>}</div>
        </div><div className="grid content-center gap-3 border-t border-border pt-4 text-sm md:border-l md:border-t-0 md:pl-6 md:pt-0"><p className="flex items-center gap-2 font-display text-xl font-bold uppercase"><Trophy className="size-5 text-primary" /> La partita in numeri</p>{[["Classifica", next?.stats?.classifica], ["Forma recente", next?.stats?.forma], ["Precedenti", next?.stats?.precedenti]].map(([label, value]) => <div key={label} className="flex justify-between gap-3 border-b border-border pb-2"><span className="text-muted-foreground">{label}</span><strong className="text-right">{value || "Dati in aggiornamento"}</strong></div>)}</div>
      </div>
    </section>

    <section className="mx-auto max-w-7xl px-4 pt-12 sm:px-6"><Heading kicker="In agenda" title="Eventi prossimi" to="/eventi" /><div className="-mx-4 mt-5 flex snap-x gap-3 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0">{events.length ? events.slice(0, 5).map((event) => <EventTile key={event.id} event={event} favorite={favorite.includes(event.id)} toggle={() => toggleFavorite(event.id)} />) : <EmptyPanel title="I prossimi eventi" text="Il programma dei prossimi 30 giorni è in aggiornamento. Torna a trovarci per le novità ufficiali." />}</div></section>

    <section className="mx-auto max-w-7xl px-4 pt-12 sm:px-6"><Heading kicker="Dal club" title="News della settimana" /><div className="mt-5 grid gap-4 md:grid-cols-[1.4fr_1fr]">{news.length ? <><NewsLead item={news[0]!} favorite={favorite.includes(news[0]!.id)} toggle={() => toggleFavorite(news[0]!.id)} /><div className="grid gap-0 border-t border-border">{news.slice(1, 4).map((item) => <div key={item.id} className="flex items-start justify-between gap-3 border-b border-border py-4"><div><p className="text-xs font-bold uppercase text-primary">{item.source || "SCD"}</p><h3 className="mt-1 text-xl font-bold leading-tight">{item.title}</h3></div><Button variant="ghost" size="icon" className="shrink-0" onClick={() => share(item.title, item.link)} aria-label={`Condividi ${item.title}`}><Share2 /></Button></div>)}{news.length < 4 && <p className="py-4 text-sm text-muted-foreground">Altre notizie in aggiornamento.</p>}</div></> : <EmptyPanel title="La voce del club" text="Le notizie ufficiali della settimana saranno pubblicate qui appena disponibili." />}</div></section>

    <section className="mt-14 bg-secondary py-12"><div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 md:grid-cols-2"><div><p className="text-xs font-bold uppercase text-primary">Community pulse</p><h2 className="mt-1 text-3xl font-bold">La parola ai tifosi</h2><p className="mt-3 max-w-md text-sm text-muted-foreground">Il sondaggio ufficiale della settimana non è ancora disponibile.</p><Link to="/community" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-primary">Vai alla community <ArrowRight className="size-4" /></Link></div><div className="border border-border bg-card p-5"><p className="text-[0.68rem] font-bold uppercase text-muted-foreground">Prova locale · non è un sondaggio ufficiale</p><h3 className="mt-2 text-xl font-bold">Cosa vorresti seguire di più?</h3><div className="mt-3 grid gap-2">{["Partite", "Eventi", "Notizie"].map((choice) => <Button key={choice} variant={vote === choice ? "default" : "outline"} className="h-10 justify-between" onClick={() => setVote(choice)}>{choice}{vote === choice && <span>✓</span>}</Button>)}</div>{vote && <p role="status" className="mt-3 text-xs text-muted-foreground">Scelta salvata solo su questa pagina. Nessun risultato reale disponibile.</p>}</div></div></section>

    <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6"><p className="text-xs font-bold uppercase text-primary">Accanto alla SCD</p><div className="-mx-4 mt-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">{["Main sponsor", "Partner", "Istituzionali", "Sponsor evento"].map((slot) => <div key={slot} className="flex h-20 min-w-44 shrink-0 flex-col justify-center border border-border px-5"><span className="text-[0.65rem] font-bold uppercase text-muted-foreground">{slot}</span><span className="font-display text-xl font-bold uppercase text-primary">Sponsor</span></div>)}</div><p className="mt-2 text-xs text-muted-foreground">Spazi disponibili · nessun marchio pubblicato senza conferma.</p></section>

    <section className="mt-14 bg-lake-deep py-12 text-primary-foreground"><div className="mx-auto max-w-7xl px-4 sm:px-6"><p className="text-xs font-bold uppercase text-accent">Fai parte della storia</p><h2 className="mt-1 text-4xl font-bold">Entra nel club</h2><div className="mt-6 grid gap-px bg-primary-foreground/20 sm:grid-cols-2 lg:grid-cols-3">{([["Diventa tifoso", "/community", "Segui e partecipa"], ["Tesserato / Atleta", "/entra", "Chiedi una prova"], ["Famiglia", "/aree", "Accedi all'area"], ["Staff / Collaboratore", "/contatti", "Proponi collaborazione"], ["Sponsor / Partner", "/sponsor", "Richiedi proposta"], ["Altro profilo", "/contatti", "Richiedi autorizzazione"]] as const).map(([title, to, action]) => <Link key={title} to={to} className="group flex min-h-24 items-center justify-between gap-3 bg-lake-deep p-4 transition-colors hover:bg-lake"><span><strong className="block font-display text-xl uppercase">{title}</strong><small className="text-primary-foreground/70">{action}</small></span><ArrowRight className="size-5 shrink-0 text-accent transition-transform group-hover:translate-x-1" /></Link>)}</div><p className="mt-4 text-xs text-primary-foreground/70">Richieste e accessi vengono autorizzati dalla società. Il tesseramento sportivo non attribuisce automaticamente la qualità di socio.</p></div></section>

    <section className="mx-auto grid max-w-7xl gap-6 px-4 pt-12 sm:px-6 md:grid-cols-3"><div><p className="text-xs font-bold uppercase text-primary">Oggi al centro sportivo</p><p className="mt-2 text-sm text-muted-foreground">Nessuna attività pubblica confermata per oggi.</p></div><div><p className="text-xs font-bold uppercase text-primary">Ultimo risultato</p>{feed.lastResult ? <p className="mt-2 text-lg font-bold">{feed.lastResult.casa} {feed.lastResult.golCasa ?? "–"} : {feed.lastResult.golOspite ?? "–"} {feed.lastResult.ospite}</p> : <p className="mt-2 text-sm text-muted-foreground">Risultati in aggiornamento.</p>}</div><div><p className="text-xs font-bold uppercase text-primary">SCD Radar</p><p className="mt-2 text-sm text-muted-foreground">Aggiornamenti e fonti verificate dal club in arrivo.</p></div></section>
    <div className="mx-auto mt-10 max-w-7xl px-4 sm:px-6"><Link to="/safeguarding" className="inline-flex items-center gap-2 text-sm font-semibold text-primary"><ShieldCheck className="size-4" /> Safeguarding · segnalazioni riservate</Link></div>
  </main>;
}

function Heading({ kicker, title, to }: { kicker: string; title: string; to?: "/eventi" }) { return <div className="flex items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase text-primary">{kicker}</p><h2 className="mt-1 text-3xl font-bold">{title}</h2></div>{to && <Link to={to} className="flex shrink-0 items-center gap-1 text-sm font-bold text-primary">Tutti <ArrowRight className="size-4" /></Link>}</div>; }
function EmptyPanel({ title, text }: { title: string; text: string }) { return <div className="flex min-h-40 w-full flex-col justify-center border-y border-border py-6"><CalendarDays className="size-6 text-primary" /><h3 className="mt-2 text-xl font-bold">{title}</h3><p className="mt-1 max-w-lg text-sm text-muted-foreground">{text}</p></div>; }
function EventTile({ event, favorite, toggle }: { event: FeedItem; favorite: boolean; toggle: () => void }) { return <article className="w-64 shrink-0 snap-start border border-border bg-card sm:w-72"><div className="relative h-36 bg-secondary">{event.image ? <img src={event.image} alt="" loading="lazy" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><CalendarDays className="size-10 text-primary/35" /></div>}<span className="absolute bottom-2 left-2 bg-accent px-2 py-1 text-xs font-bold text-accent-foreground">{event.startAt ? dateLabel(event.startAt, { day: "numeric", month: "short" }) : "Data in aggiornamento"}</span></div><div className="p-4"><p className="text-xs font-bold uppercase text-primary">{event.category || "Evento pubblico"}</p><h3 className="mt-1 line-clamp-2 min-h-12 text-xl font-bold leading-tight">{event.title}</h3>{event.venue && <p className="mt-2 text-xs text-muted-foreground"><MapPin className="mr-1 inline size-3" />{event.venue}</p>}<div className="mt-3 flex items-center justify-between"><span className="text-xs font-semibold">{event.link ? <a href={event.link} target="_blank" rel="noopener noreferrer" className="text-primary underline">Dettagli →</a> : "Dettagli in aggiornamento"}</span><div className="flex"><Button variant="ghost" size="icon" onClick={toggle} aria-label={favorite ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti"}><Heart className={favorite ? "fill-accent text-primary" : ""} /></Button><Button variant="ghost" size="icon" onClick={() => share(event.title, event.link)} aria-label="Condividi evento"><Share2 /></Button></div></div></div></article>; }
function NewsLead({ item, favorite, toggle }: { item: FeedItem; favorite: boolean; toggle: () => void }) { return <article className="relative flex min-h-64 flex-col justify-end overflow-hidden bg-lake-deep p-6 text-primary-foreground">{item.image && <img src={item.image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />}<div className="absolute inset-0 bg-gradient-to-t from-lake-deep via-lake-deep/55 to-transparent" /><div className="relative"><p className="text-xs font-bold uppercase text-accent">{item.source || "Dal club"}</p><h3 className="mt-2 max-w-lg text-3xl font-bold leading-tight">{item.title}</h3>{item.body && <p className="mt-2 line-clamp-2 max-w-lg text-sm text-primary-foreground/80">{item.body}</p>}<div className="mt-3 flex items-center gap-2">{item.link && <a href={item.link} target="_blank" rel="noopener noreferrer" className="mr-auto text-sm font-bold text-accent underline">Leggi la notizia →</a>}<Button variant="ghost" size="icon" className="text-primary-foreground" onClick={toggle} aria-label="Salva notizia"><Heart className={favorite ? "fill-accent text-accent" : ""} /></Button><Button variant="ghost" size="icon" className="text-primary-foreground" onClick={() => share(item.title, item.link)} aria-label="Condividi notizia"><Share2 /></Button></div></div></article>; }
