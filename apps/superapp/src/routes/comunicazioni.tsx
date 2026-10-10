import { createFileRoute, Link } from "@tanstack/react-router";
import { Bus, CalendarClock, ChevronRight, ClipboardList, Facebook, Instagram, List, Megaphone, Newspaper, PenLine, Share2, ShieldCheck, UsersRound, Youtube, type LucideIcon } from "lucide-react";

import { BellAction, HeroHeader, Segmented, SectionHead, Sheet } from "@/components/scd/board";
import { CalendarGridIcon } from "@/components/scd/icons";
import { getPublicCalendarSnapshot } from "@/lib/calendar.functions";
import { getPublicFeed } from "@/lib/club.functions";
import { dateParts, groupShort, matchTitle, recentlyUpdated, upcomingMatches } from "@/lib/board-data";
import { romeParts } from "@/lib/home-week";
import { freshnessLabel, loadQuadro } from "@/lib/public-snapshots";
import juniores from "@/assets/scd/SCD_JUNIORES_2008_2009.png.asset.json";
import piccoli from "@/assets/scd/SCD_PICCOLI_2020_2021.png.asset.json";
import prima from "@/assets/scd/SCD_PRIMA_SQUADRA.png.asset.json";
import primi from "@/assets/scd/SCD_PRIMI_2018_2019.png.asset.json";
import pulcini from "@/assets/scd/SCD_PULCINI_2016_2017.png.asset.json";
import u12 from "@/assets/scd/SCD_U12_2015.png.asset.json";
import u13 from "@/assets/scd/SCD_U13_2014.png.asset.json";
import u15 from "@/assets/scd/SCD_U15_2012_2013.png.asset.json";
import u16 from "@/assets/scd/SCD_U16_2011.png.asset.json";

const LOGO_FILES: Record<string, string> = {
  "SCD_JUNIORES_2008_2009.png": juniores.url, "SCD_PICCOLI_2020_2021.png": piccoli.url, "SCD_PRIMA_SQUADRA.png": prima.url,
  "SCD_PRIMI_2018_2019.png": primi.url, "SCD_PULCINI_2016_2017.png": pulcini.url, "SCD_U12_2015.png": u12.url,
  "SCD_U13_2014.png": u13.url, "SCD_U15_2012_2013.png": u15.url, "SCD_U16_2011.png": u16.url,
};

const TABS = ["club", "squadre", "social"] as const;
type Tab = (typeof TABS)[number];
const QUADRO = loadQuadro();

export const Route = createFileRoute("/comunicazioni")({
  validateSearch: (s: Record<string, unknown>): { tab?: Tab | undefined } => (TABS.includes(s["tab"] as Tab) && s["tab"] !== "club" ? { tab: s["tab"] as Tab } : {}),
  loader: async () => {
    const [feed, calendar] = await Promise.all([getPublicFeed(), getPublicCalendarSnapshot()]);
    const now = romeParts(new Date().toISOString());
    return { feed, calendar, fresh: recentlyUpdated(calendar.sourceModifiedAt, new Date()), today: now?.date ?? new Date().toISOString().slice(0, 10), clock: now?.time ?? "00:00" };
  },
  head: () => ({ meta: [
    { title: "Comunicazioni — S.C.D. ColicoDerviese" },
    { name: "description", content: "Notizie, avvisi e aggiornamenti della S.C.D. ColicoDerviese: calendario, allenamenti, squadre e social del club." },
    { property: "og:title", content: "Comunicazioni — S.C.D. ColicoDerviese" },
    { property: "og:description", content: "Tutte le notizie, gli aggiornamenti e i contenuti del club." },
  ] }),
  component: Comunicazioni,
});

type Row = { id: string; icon: LucideIcon | "calendar"; title: string; sub: string; to?: string; search?: Record<string, string>; href?: string };

function Comunicazioni() {
  const { feed, calendar, fresh, today, clock } = Route.useLoaderData();
  const { tab = "club" } = Route.useSearch();
  const alerts = feed.items.filter((i) => i.kind === "alert");
  const alert = alerts[0];
  const news = feed.items.filter((i) => i.kind === "news" || i.kind === "event" || i.kind === "community");

  // Avvisi reali derivati dalle fonti già collegate (nessun testo dimostrativo).
  const rows = ([
    ...news.slice(0, 2).map((n): Row => ({ id: n.id, icon: Newspaper, title: n.title, sub: n.source || "S.C.D. ColicoDerviese", ...(n.link ? { href: n.link } : {}) })),
    { id: "cal", icon: "calendar", title: fresh ? "Nuovo calendario partite disponibile" : "Calendario partite 2026/27", sub: `Aggiornato il ${freshnessLabel(calendar.sourceModifiedAt)} · ${calendar.events.length} gare`, to: "/calendario" },
    { id: "quadro", icon: ClipboardList, title: "Quadro allenamenti lun–ven", sub: `Fotografia del 09/10/2026 · ${QUADRO.slots.length} fasce orarie`, to: "/allenamenti" },
    { id: "pulmini", icon: Bus, title: "Organizzazione pulmini", sub: "Nessuna corsa confermata al momento", to: "/core/impianti-calendari", search: { sezione: "dervio" } },
    { id: "safe", icon: ShieldCheck, title: "Safeguarding e tutela dei minori", sub: "Segnalazioni riservate, canale dedicato", to: "/safeguarding" },
  ] satisfies Row[] as Row[]).slice(0, 4);
  const upcoming = upcomingMatches(calendar.events, today, clock);
  const teams = calendar.groups.filter((g) => g.count > 0 && g.id !== "other").map((g) => ({ g, next: upcoming.find((e) => e.group === g.id) }));

  return (
    <main data-screen="comunicazioni">
      <HeroHeader
        title="Comunicazioni"
        subtitle={<>Tutte le notizie, gli aggiornamenti<br />e i contenuti del club.</>}
        action={<BellAction dot={alerts.length > 0 || fresh} />}
        plain
        titleGap={30}
        bottomGap={20}
        testId="comms-hero"
      >
        <Segmented
          tone="header"
          label="Sezioni comunicazioni"
          className="pb-[18px] [&>*]:h-[44px]"
          items={[
            { label: "Club", icon: Newspaper, active: tab === "club", target: { to: "/comunicazioni", search: {} } },
            { label: "Squadre", icon: UsersRound, active: tab === "squadre", target: { to: "/comunicazioni", search: { tab: "squadre" } } },
            { label: "Social", icon: Share2, active: tab === "social", target: { to: "/comunicazioni", search: { tab: "social" } } },
          ]}
        />
      </HeroHeader>
      <Sheet overlap={14}>
        <div className="lg:grid lg:grid-cols-2 lg:gap-x-8">
          <div>
            {tab === "club" && (
              <>
                <section className="relative rounded-[14px] bg-[#fdeda1] px-[12px] pb-[12px] pt-[30px] shadow-[var(--scd-card-shadow)]" aria-labelledby="avviso" data-testid="important-card">
                  <span className="absolute right-[10px] top-[8px] rounded-[6px] bg-[#e2b318] px-[8px] py-[3px] text-[12px] font-extrabold uppercase tracking-[0.03em] text-[#2a1d05]">Importante</span>
                  <div className="flex items-start gap-[12px]">
                    <span className="flex size-[54px] shrink-0 items-center justify-center rounded-full bg-[var(--scd-yellow)] shadow-[inset_0_0_0_2px_rgb(0_0_0/0.06)]"><Megaphone className="size-[28px] text-[#141a2a]" strokeWidth={2.2} aria-hidden="true" /></span>
                    <div className="min-w-0">
                      <h2 id="avviso" className="text-[18px] font-bold leading-tight text-[var(--scd-ink)]">{alert ? alert.title : "Nessun avviso urgente in corso"}</h2>
                      <p className="mt-[4px] text-[14.5px] leading-[1.25] text-[#2b3445]">{alert ? (alert.body ?? "Dettagli dal club in aggiornamento.") : "Sospensioni e variazioni urgenti compaiono qui appena pubblicate."}</p>
                      <p className="mt-[8px] flex items-center gap-[6px] text-[13px] font-medium text-[#2b3445]"><CalendarClock className="size-[16px]" aria-hidden="true" />Controllato oggi alle {clock}</p>
                    </div>
                  </div>
                </section>
                <div className="scd-card mt-[10px] px-[10px]" data-testid="comms-list">
                  {rows.map((r) => <CommsRow key={r.id} row={r} />)}
                </div>
              </>
            )}
            {tab === "squadre" && (
              <div className="scd-card px-[10px]" data-testid="comms-teams">
                {teams.map(({ g, next }) => {
                  const d = next ? dateParts(next.date) : null;
                  return (
                    <Link key={g.id} to="/calendario" search={{ annata: g.years[0] ?? g.id, vista: "prossime" }} className="flex items-center gap-[12px] border-b border-[var(--scd-line)] py-[12px] last:border-0">
                      {g.logo && LOGO_FILES[g.logo] ? <img src={LOGO_FILES[g.logo]} alt="" className="size-[38px] shrink-0 rounded-full object-contain" /> : <span className="size-[38px] shrink-0 rounded-full" style={{ background: g.color }} aria-hidden="true" />}
                      <span className="min-w-0 flex-1">
                        <span className="block text-[16px] font-bold leading-tight text-[var(--scd-ink)]">{g.label}</span>
                        <span className="mt-[2px] block text-[13.5px] text-[var(--scd-sub)]">{next && d ? `Prossima: ${matchTitle(next, groupShort(g))} · ${d.weekday} ${d.day} ${d.month}${next.time ? ` ${next.time}` : ""}` : "Nessuna gara in programma"}</span>
                      </span>
                      <ChevronRight className="size-5 shrink-0 text-[var(--scd-ink)]" strokeWidth={2.4} aria-hidden="true" />
                    </Link>
                  );
                })}
              </div>
            )}
            {tab === "social" && (
              <p className="scd-card px-[14px] py-[12px] text-[14px] leading-snug text-[var(--scd-sub)]">I profili social ufficiali non sono ancora collegati alla Super App: post e numeri compariranno solo quando la società li collegherà. Nessun numero viene stimato.</p>
            )}
          </div>

          <div>
            <SectionHead title="Social Hub" more={{ label: "Vedi tutti i post", target: { to: "/comunicazioni", search: { tab: "social" } } }} />
            <div className="scd-card grid grid-cols-3 gap-[6px] px-[10px] py-[14px]" data-testid="social-hub">
              <Social icon={Instagram} label="Instagram" bg="bg-[radial-gradient(circle_at_30%_110%,#fdf497_0%,#fd5949_45%,#d6249f_60%,#285aeb_90%)]" />
              <Social icon={Facebook} label="Facebook" bg="bg-[#1877f2]" />
              <Social icon={Youtube} label="YouTube" bg="bg-[#ff0000]" />
            </div>
            <div className="mt-[14px] grid grid-cols-2 gap-[10px]">
              <Link to="/aree/$area" params={{ area: "staff" }} className="flex h-[54px] items-center justify-center gap-[10px] rounded-[10px] bg-[var(--scd-yellow)] text-[17px] font-bold text-[var(--scd-ink)] shadow-[var(--scd-card-shadow)]"><PenLine className="size-[22px]" strokeWidth={2.4} aria-hidden="true" />Crea post</Link>
              <Link to="/comunicazioni" search={{ tab: "social" }} className="flex h-[54px] items-center justify-center gap-[10px] rounded-[10px] bg-[#dde0e6] text-[17px] font-bold text-[var(--scd-ink)] shadow-[var(--scd-card-shadow)]"><List className="size-[22px]" strokeWidth={2.4} aria-hidden="true" />Rassegna media</Link>
            </div>
            <p className="px-[6px] pt-[6px] text-[11.5px] text-[var(--scd-sub)]">"Crea post" è riservato allo staff (accesso R20): nessuna pubblicazione automatica.</p>
          </div>
        </div>
      </Sheet>
    </main>
  );
}

function CommsRow({ row }: { row: Row }) {
  const Icon = row.icon;
  const body = (
    <>
      <span className="flex w-[36px] shrink-0 justify-center text-[#141a2a]">{Icon === "calendar" ? <CalendarGridIcon size={30} /> : <Icon className="size-[28px]" strokeWidth={2.1} aria-hidden="true" />}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15.5px] font-bold leading-[1.2] text-[var(--scd-ink)]">{row.title}</span>
        <span className="mt-[3px] block text-[13.5px] leading-[1.2] text-[var(--scd-sub)]">{row.sub}</span>
      </span>
      {(row.href || row.to) && <ChevronRight className="size-[22px] shrink-0 text-[var(--scd-ink)]" strokeWidth={2.4} aria-hidden="true" />}
    </>
  );
  const cls = "flex items-center gap-[12px] border-b border-[var(--scd-line)] py-[13px] last:border-0";
  if (row.href) return <a href={row.href} target="_blank" rel="noopener noreferrer" className={cls}>{body}</a>;
  if (!row.to) return <div className={cls}>{body}</div>;
  return <Link to={row.to} search={row.search as never} className={cls}>{body}</Link>;
}

function Social({ icon: Icon, label, bg }: { icon: LucideIcon; label: string; bg: string }) {
  return (
    <div className="flex items-center gap-[8px]">
      <span className={`flex size-[48px] shrink-0 items-center justify-center rounded-[11px] ${bg}`}><Icon className="size-[28px] text-white" strokeWidth={2} aria-label={label} /></span>
      <span className="min-w-0 leading-tight">
        <span className="block text-[18px] font-extrabold text-[var(--scd-ink)]">—</span>
        <span className="block text-[11px] text-[var(--scd-sub)]">follower</span>
        <span className="block text-[11px] font-semibold text-[var(--scd-blue)]">in arrivo</span>
      </span>
    </div>
  );
}
