import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, MapPin, ShieldCheck, TrafficCone, Trophy } from "lucide-react";

import lario from "@/assets/scd/lario-header.webp.asset.json";
import {
  BellAction, Crest, DateBlock, HeroHeader, IconTile, ListRow, OpponentShield, SectionHead, Sheet, TabCard, Venue,
} from "@/components/scd/board";
import { BallIcon, CalendarGridIcon, ConeIcon, PeopleIcon } from "@/components/scd/icons";
import { getPublicCalendarSnapshot } from "@/lib/calendar.functions";
import { getPublicFeed, getPublicSchedule } from "@/lib/club.functions";
import { dateParts, recentlyUpdated, titleCase, venueCase, weekRange } from "@/lib/board-data";
import {
  calendarToWeekItems, itemsOn, mergeWeekItems, nextMatchItem, r20ItemToWeekItem, r20MatchToWeekItem, romeParts, todayAtCentre, type WeekItem,
} from "@/lib/home-week";
import { freshnessLabel, loadQuadro } from "@/lib/public-snapshots";

const QUADRO = loadQuadro();

export const Route = createFileRoute("/")({
  loader: async () => {
    const [feed, schedule, calendar] = await Promise.all([getPublicFeed(), getPublicSchedule(), getPublicCalendarSnapshot()]);
    const now = romeParts(new Date().toISOString());
    const fresh = recentlyUpdated(calendar.sourceModifiedAt, new Date());
    return { feed, schedule, calendar, fresh, today: now?.date ?? new Date().toISOString().slice(0, 10), clock: now?.time ?? "00:00" };
  },
  head: () => ({ meta: [
    { title: "Questa settimana — S.C.D. ColicoDerviese" },
    { name: "description", content: "La settimana della S.C.D. ColicoDerviese: prossima gara, allenamenti, eventi e il mondo Colico, senza accesso obbligatorio." },
    { property: "og:title", content: "Questa settimana — S.C.D. ColicoDerviese" },
    { property: "og:description", content: "Gare, allenamenti, eventi e prossima partita della S.C.D. ColicoDerviese." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Home,
});

const DAY = 86400000;
const isoOf = (d: Date) => d.toISOString().slice(0, 10);
const dayTitle = (iso: string) => new Intl.DateTimeFormat("it-IT", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" }).format(new Date(`${iso}T12:00:00Z`));

function Home() {
  const { feed, schedule, calendar, fresh, today, clock: initialClock } = Route.useLoaderData();
  const [clock, setClock] = useState(initialClock);
  const [weekOffset, setWeekOffset] = useState(0);
  useEffect(() => {
    const tick = () => setClock(romeParts(new Date().toISOString())?.time ?? initialClock);
    tick();
    const timer = setInterval(tick, 60000);
    return () => clearInterval(timer);
  }, [initialClock]);

  const publicItems = useMemo(() => [...feed.items, ...schedule.items].filter((item, index, array) => array.findIndex((o) => o.id === item.id) === index), [feed, schedule]);
  // Calendario validato (stessa fonte di /calendario) + eventuali gare/eventi R20, senza doppioni.
  const merged = useMemo(() => {
    const r20Matches = [...schedule.matches, ...(feed.nextMatch ? [feed.nextMatch] : [])];
    const r20 = [...r20Matches.map(r20MatchToWeekItem), ...publicItems.map(r20ItemToWeekItem)].filter((i): i is WeekItem => !!i);
    return mergeWeekItems(calendarToWeekItems(calendar.events, calendar.groups), r20);
  }, [calendar, schedule, feed, publicItems]);
  const opponents = useMemo(() => new Map(calendar.events.map((e) => [e.id, e.opponent])), [calendar.events]);
  const groupColor = (id: string) => calendar.groups.find((g) => g.id === id)?.color ?? "#668196";

  const next = nextMatchItem(merged, today, clock);
  const centreToday = todayAtCentre(merged, today);
  const week = weekRange(today, weekOffset);
  const days = Array.from({ length: 7 }, (_, i) => isoOf(new Date(Date.parse(`${week.from}T12:00:00Z`) + i * DAY)));
  const weekCount = days.reduce((n, d) => n + itemsOn(merged, d).length, 0);
  const news = publicItems.filter((i) => i.kind === "news").slice(0, 3);
  const alerts = feed.items.filter((i) => i.kind === "alert");
  const bellDot = alerts.length > 0 || fresh;
  const sourceNote = calendar.origin === "mirror"
    ? `Calendario SCD aggiornato ${freshnessLabel(calendar.sourceModifiedAt)}`
    : calendar.origin === "stale" ? `Ultima copia verificata del ${freshnessLabel(calendar.sourceModifiedAt)}` : `Copia di sicurezza del ${freshnessLabel(calendar.sourceModifiedAt)}`;

  return (
    <main data-screen="home">
      <HeroHeader
        title="Questa settimana"
        subtitle={<>Sport, crescita e comunità<br />nel cuore dell'Alto Lario.</>}
        action={<BellAction dot={bellDot} />}
        sky="home"
        titleGap={88}
        bottomGap={22}
        testId="home-hero"
      />
      <Sheet overlap={12}>
        <div className="lg:grid lg:grid-cols-2 lg:gap-x-8">
          <div>
            <nav aria-label="Accessi rapidi" className="grid grid-cols-4 gap-[8px]" data-testid="home-tiles">
              <IconTile label="Gare" icon={<BallIcon size={40} className="text-[#0d1630]" />} target={{ to: "/calendario", search: { vista: "prossime" } }} className="h-[96px]" />
              <IconTile label="Allenamenti" icon={<ConeIcon size={40} className="text-[var(--scd-orange)]" />} target={{ to: "/allenamenti" }} className="h-[96px]" labelClassName="text-[14.5px] tracking-[-0.02em]" />
              <IconTile label="Eventi" icon={<CalendarGridIcon size={36} className="text-[#1d2b66]" />} target={{ to: "/eventi" }} className="h-[96px]" />
              <IconTile label="Iniziative" icon={<PeopleIcon size={42} className="text-[var(--scd-green)]" />} target={{ to: "/community" }} className="h-[96px]" />
            </nav>

            <TabCard title="Prossima gara" icon={Trophy} more={{ label: "Vedi tutti", target: { to: "/calendario", search: { vista: "prossime" } } }} testId="next-match">
              {next ? <NextMatch item={next} opponent={opponents.get(next.id) ?? ""} /> : (
                <p className="px-4 py-6 text-[15px] text-[var(--scd-sub)]">Nessuna gara in programma nel calendario pubblico. Data, avversario e campo in aggiornamento dal club.</p>
              )}
            </TabCard>

            <div className="mt-[14px] grid grid-cols-2 gap-[10px]">
              <Promo to="/allenamenti" tone="green" icon={<TrafficCone className="size-[40px] text-white" strokeWidth={1.9} />} title="Allenamenti" text={`Quadro lun–ven: ${QUADRO.slots.length} fasce orarie`} />
              <Promo to="/entra" tone="yellow" icon={<PeopleIcon size={40} className="text-[#141a2a]" />} title="Open Day" text="Date in arrivo: chiedi una prova" />
            </div>
          </div>

          <div>
            <section className="mt-[14px] rounded-[12px] bg-[var(--scd-blue)] px-[8px] pb-[8px] shadow-[var(--scd-card-shadow)]" aria-labelledby="home-sponsor" data-testid="home-sponsors">
              <div className="flex h-[40px] items-center justify-between px-[4px] text-white">
                <h2 id="home-sponsor" className="text-[18px] font-semibold">I nostri sponsor</h2>
                <Link to="/grow" className="inline-flex items-center gap-[2px] text-[16px] font-semibold">Vedi tutti<ChevronRight className="size-[18px]" strokeWidth={2.6} /></Link>
              </div>
              <div className="grid grid-cols-3 gap-[8px]">
                {[1, 2, 3].map((n) => (
                  <Link key={n} to="/sponsor" className="flex h-[62px] flex-col items-center justify-center rounded-[8px] bg-white text-center leading-tight">
                    <span className="text-[13px] font-bold uppercase tracking-[0.02em] text-[var(--scd-blue)]">Spazio sponsor</span>
                    <span className="text-[11px] font-medium text-[var(--scd-sub)]">disponibile</span>
                  </Link>
                ))}
              </div>
            </section>
            <p className="px-[6px] pt-[4px] text-[11px] text-[var(--scd-sub)]">Nessun marchio pubblicato senza conferma della società.</p>

            <h2 className="px-[6px] pb-[6px] pt-[8px] text-[19px] font-bold text-[var(--scd-ink)]">Mondo Colico</h2>
            <div className="scd-card grid grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-[12px] p-[8px]" data-testid="mondo-colico">
              <img src={lario.url} alt="Il lago di Como e le montagne viste da Colico" className="h-[96px] w-full rounded-[8px] object-cover object-[50%_45%]" loading="lazy" />
              <div className="flex min-w-0 flex-col justify-between">
                <div>
                  <p className="text-[15px] font-bold leading-tight text-[var(--scd-ink)]">Mondo Colico</p>
                  <p className="mt-[3px] text-[12.5px] leading-[1.25] text-[var(--scd-sub)]">Notizie, storia, eventi e territorio sempre con noi.</p>
                </div>
                <Link to="/comunicazioni" className="mt-[6px] flex h-[32px] items-center justify-center gap-[6px] rounded-[7px] bg-[var(--scd-blue)] text-[15px] font-semibold text-white">Scopri <ArrowRight className="size-[17px]" /></Link>
              </div>
            </div>
          </div>
        </div>

        {/* Contenuti reali sotto le sezioni della tavola: stessa fonte del calendario. */}
        <div className="lg:grid lg:grid-cols-2 lg:gap-x-8">
          <section aria-labelledby="oggi-centro" data-testid="today-centre">
            <SectionHead id="oggi-centro" title="Oggi al centro sportivo" more={{ label: "Allenamenti", target: { to: "/allenamenti" } }} />
            <div className="scd-card px-[12px]">
              <p className="pt-[10px] text-[13px] font-semibold capitalize text-[var(--scd-sub)]">{dayTitle(today)}</p>
              {centreToday.length ? centreToday.map((i) => (
                <ListRow key={i.id} bar={groupColor(i.group)} className="border-b border-[var(--scd-line)] last:border-0"
                  lead={<span className="text-[17px] font-bold text-[var(--scd-ink)]">{i.time || "--:--"}</span>}
                  icon={<BallIcon size={32} className="text-[#0d1630]" />}
                  title={`${i.groupLabel} · ${titleCase(i.title)}`}
                  sub={<Venue>{venueCase(i.venue)}{i.certain ? "" : " · orario/sede da confermare"}</Venue>} />
              )) : <p className="py-4 text-[14px] text-[var(--scd-sub)]">Nessuna gara in calendario oggi a Colico o Dervio.</p>}
            </div>
          </section>

          <section aria-labelledby="settimana-scd">
            <div className="flex items-center justify-between gap-2 px-[6px] pb-[8px] pt-[14px]">
              <h2 id="settimana-scd" className="text-[20px] font-bold text-[var(--scd-ink)]">La settimana SCD</h2>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => setWeekOffset((n) => n - 1)} aria-label="Settimana precedente" className="flex size-10 items-center justify-center rounded-full text-[var(--scd-ink)]"><ChevronLeft className="size-6" /></button>
                <button type="button" onClick={() => setWeekOffset((n) => n + 1)} aria-label="Settimana successiva" className="flex size-10 items-center justify-center rounded-full text-[var(--scd-ink)]"><ChevronRight className="size-6" /></button>
              </div>
            </div>
            <div className="scd-card px-[12px] pb-[6px]" data-testid="week-days">
              <p className="pt-[10px] text-[13px] font-semibold text-[var(--scd-sub)]">{week.label} · <b data-testid="week-count">{weekCount} {weekCount === 1 ? "appuntamento" : "appuntamenti"}</b></p>
              {days.map((d) => {
                const items = itemsOn(merged, d);
                return (
                  <div key={d} data-day={d} data-count={items.length} className="border-b border-[var(--scd-line)] py-[6px] last:border-0">
                    <p className="text-[13px] font-bold uppercase tracking-[0.02em] text-[var(--scd-blue)]">{dayTitle(d)}{d === today ? " · oggi" : ""}</p>
                    {items.length ? items.map((i) => (
                      <ListRow key={i.id} bar={groupColor(i.group)} className="py-[8px]"
                        lead={<span className="text-[16px] font-bold text-[var(--scd-ink)]">{i.time || "--:--"}</span>}
                        title={<span className="text-[15px]">{i.groupLabel ? `${i.groupLabel} · ` : ""}{titleCase(i.title)}</span>}
                        sub={<>{i.homeAway === "FUORI" ? "Trasferta · " : ""}{venueCase(i.venue)}{i.certain ? "" : " · da confermare"}</>} />
                    )) : <p className="py-[4px] text-[13px] text-[var(--scd-sub)]">Nessuna gara in calendario</p>}
                  </div>
                );
              })}
            </div>
            <p className="px-[6px] pt-[6px] text-[11.5px] text-[var(--scd-sub)]">{sourceNote} · fotografia non live. <Link to="/calendario" className="font-bold text-[var(--scd-blue)]">Calendario completo</Link></p>
          </section>
        </div>

        {(news.length > 0 || alerts.length > 0) && (
          <section aria-labelledby="dal-club">
            <SectionHead id="dal-club" title="Dal club" more={{ label: "Comunicazioni", target: { to: "/comunicazioni" } }} />
            <div className="scd-card px-[12px]">
              {[...alerts, ...news].slice(0, 4).map((n) => (
                <ListRow key={n.id} bar={n.kind === "alert" ? "var(--scd-yellow)" : "var(--scd-blue)"} className="border-b border-[var(--scd-line)] last:border-0" title={n.title} sub={n.source || "S.C.D. ColicoDerviese"} />
              ))}
            </div>
          </section>
        )}

        <Link to="/safeguarding" className="mt-5 inline-flex items-center gap-2 px-[6px] text-sm font-semibold text-[var(--scd-blue)]"><ShieldCheck className="size-4" /> Safeguarding · segnalazioni riservate</Link>
      </Sheet>
    </main>
  );
}

function NextMatch({ item, opponent }: { item: WeekItem; opponent: string }) {
  const d = dateParts(item.date);
  const home = item.homeAway === "CASA";
  const opp = titleCase(opponent || (item.origin === "r20" ? item.title.split(" – ").find((t) => !/colico/i.test(t)) ?? "" : "") || "Avversario da definire");
  const team = item.groupLabel;
  const us = (
    <div className="flex min-w-0 flex-col items-center text-center">
      <Crest height={60} className="drop-shadow-none" />
      <span className="mt-[6px] text-[16.5px] font-semibold leading-[1.15] tracking-[-0.01em] text-[var(--scd-ink)]">ColicoDerviese<br />{team}</span>
    </div>
  );
  const them = (
    <div className="flex min-w-0 flex-col items-center text-center">
      <OpponentShield name={opp} size={60} />
      <span className="mt-[6px] line-clamp-3 break-words text-[16.5px] font-semibold leading-[1.15] tracking-[-0.01em] text-[var(--scd-ink)]">{opp}</span>
    </div>
  );
  return (
    <div className="grid grid-cols-[92px_minmax(0,1fr)] items-stretch py-[12px] pr-[6px]">
      <div className="flex items-center justify-center border-r border-[var(--scd-line)] pr-[2px]">
        <DateBlock weekday={d.weekday} day={d.day} month={d.month} time={item.time || "--:--"} size="lg" />
      </div>
      <div className="min-w-0 pl-[8px]">
        <div className="grid grid-cols-[minmax(0,1fr)_34px_minmax(0,1fr)] items-start gap-[2px]">
          {home ? us : them}
          <span className="mt-[16px] flex flex-col items-center text-[21px] font-extrabold italic leading-none text-[var(--scd-ink)]">VS<span className="mt-[3px] h-[3px] w-[24px] -skew-x-12 rounded-full bg-[var(--scd-yellow)]" aria-hidden="true" /></span>
          {home ? them : us}
        </div>
        <p className="mt-[10px] flex items-center justify-center gap-[5px] text-center text-[15.5px] font-medium text-[var(--scd-ink)]">
          <MapPin className="size-[19px] shrink-0 fill-[#1d2b66] text-white" strokeWidth={2} aria-hidden="true" />
          <span className="min-w-0 truncate">{venueCase(item.venue) || "Sede da definire"}</span>
        </p>
        {!item.certain && <p className="mt-[2px] text-center text-[12px] font-semibold text-[#9a6b00]">Orario/sede da confermare</p>}
      </div>
    </div>
  );
}

function Promo({ to, tone, icon, title, text }: { to: "/allenamenti" | "/entra"; tone: "green" | "yellow"; icon: React.ReactNode; title: string; text: string }) {
  return (
    <Link to={to} className="scd-card flex items-center gap-[10px] p-[6px] pr-[8px]">
      <span className={`flex size-[68px] shrink-0 items-center justify-center rounded-[9px] ${tone === "green" ? "bg-[#0a8a35]" : "bg-[var(--scd-yellow)]"}`}>{icon}</span>
      <span className="min-w-0">
        <span className="block text-[17px] font-bold leading-tight tracking-[-0.01em] text-[var(--scd-ink)]">{title}</span>
        <span className="mt-[2px] block text-[12.5px] leading-[1.2] text-[#3a4456]">{text}</span>
      </span>
    </Link>
  );
}
