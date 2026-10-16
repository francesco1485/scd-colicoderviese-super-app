/**
 * Eventi e tornei (SCD ONE, public) in the SCD METAL "via di mezzo" style of the home (16/10/2026): a compact navy band,
 * then the content right away — tornei, iniziative, eventi del club — as rows with a coloured bar, one club colour per
 * kind (tornei sole, iniziative azzurro, club navy; lib/eventi-board.ts). Desktop: content in the centre and a right
 * column with the next useful steps. No card wall, no carousel, no photo of the pitch, no minors.
 * Data: lib/events.ts and lib/tournaments.ts (published facts), the active initiatives (server window), the lottery only
 * once the Direzione publishes it (UD-115/UD-132, unchanged), the club feed events.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CalendarDays, ChevronRight, Handshake, MessageCircle, Trophy, Users } from "lucide-react";
import type { ReactNode } from "react";

import { METAL_CARD, METAL_CTA, METAL_GHOST, METAL_LABEL, METAL_WRAP, MetalHeading, MetalPageHeader } from "@/components/scd/MetalPageHeader";
import { getPublicFeed } from "@/lib/club.functions";
import { CHRISTMAS_LARIO_CUP as CLC } from "@/lib/events";
import { CLC_DAY, EVENT_KINDS, clcAhead, countdownWords, dateBlock, otherTournaments, type EventKind } from "@/lib/eventi-board";
import { dayMonth, type Initiative } from "@/lib/initiatives";
import { getActiveInitiatives } from "@/lib/initiatives.functions";
import { KIND_LABEL, longDay, type PublicLottery } from "@/lib/lottery";
import { getPublicLottery } from "@/lib/lottery.functions";
import { romeDay } from "@/lib/public-window";
import { hasContent } from "@/lib/has-content";
import { PUBLIC_PAGES, pageHead } from "@/lib/share";
import { TOURNAMENT_STATUS_LABEL, type TournamentEdition } from "@/lib/tournaments";

export const Route = createFileRoute("/eventi/")({
  loader: async () => {
    const [feed, initiatives, lottery] = await Promise.all([
      getPublicFeed(),
      // Server-side window (Rome day): an initiative is listed only from showFrom to showUntil.
      getActiveInitiatives().catch(() => ({ today: "", items: [] as Initiative[] })),
      // Lotteria dello sport (UD-115): listed only once the Direzione publishes it, inside its window.
      getPublicLottery()
        .then((r) => r.lottery)
        .catch(() => null as PublicLottery | null),
    ]);
    // Rome day for the tournament list and the countdown: the server's when known, computed once in the loader
    // (never during render, so server and client show the same thing).
    const today = initiatives.today || romeDay(Date.now());
    return { feed, initiatives: initiatives.items, lottery, today };
  },
  head: () => pageHead(PUBLIC_PAGES.eventi),
  component: Eventi,
});

const cityOf = (city: string) => city.replace(" (LC)", "");

function Eventi() {
  const { feed, initiatives, lottery, today } = Route.useLoaderData();
  const eventi = feed.items.filter((i) => i.kind === "event");
  const others = otherTournaments(today);
  return (
    <main data-screen="eventi" className="pb-10">
      <MetalPageHeader kicker="Vivere il club · Stagione 2026/27" title="Eventi e tornei" testId="eventi-header">
        Tornei, iniziative e serate del club. Iscrizioni gratuite oggi; eventuali quote future saranno indicate su ogni
        evento.
      </MetalPageHeader>
      <div className={`${METAL_WRAP} grid grid-cols-[minmax(0,1fr)] gap-5 pt-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-6 lg:pt-6`}>
        <div className="grid min-w-0 content-start gap-6 lg:gap-8">
          <KindPills />

          <section id="tornei" aria-labelledby="eventi-tornei-t" className="scroll-mt-20" data-testid="eventi-tornei">
            <MetalHeading
              id="eventi-tornei-t"
              sub="Le date pubblicate dalla società"
              action={
                <Link to="/tornei" className="scd-focus inline-flex min-h-11 shrink-0 items-center gap-1 rounded-md font-display text-[14px] font-semibold text-[#0457af]">
                  Tutti i tornei
                  <ChevronRight className="size-4" aria-hidden="true" />
                </Link>
              }
            >
              Tornei
            </MetalHeading>
            <ClcRow today={today} />
            {others.length > 0 && (
              <ol className={`${METAL_CARD} m-0 mt-3 list-none px-4 pb-1 pt-2 lg:px-5`} aria-label="Altri tornei">
                {others.map((t) => (
                  <TournamentRow key={t.id} t={t} />
                ))}
              </ol>
            )}
          </section>

          {/* Rendered only with something to show ("pagine piene", Francesco 16/10/2026 23:08): no empty block. */}
          {(hasContent(initiatives) || lottery) && (
          <section id="iniziative" aria-labelledby="eventi-iniziative-t" className="scroll-mt-20" data-testid="eventi-iniziative">
            <MetalHeading id="eventi-iniziative-t" sub="Proposte del club e dei suoi amici, per un periodo limitato">
              Iniziative
            </MetalHeading>
            <ul className={`${METAL_CARD} m-0 list-none px-4 pb-1 pt-2 lg:px-5`}>
              {lottery && <LotteryRow lottery={lottery} />}
              {initiatives.map((i) => (
                <InitiativeRow key={i.id} item={i} />
              ))}
            </ul>
          </section>
          )}

          <section id="club" aria-labelledby="eventi-club-t" className="scroll-mt-20" data-testid="eventi-club">
            <MetalHeading id="eventi-club-t" sub="Open day, serate e feste della società">
              Dal club
            </MetalHeading>
            {eventi.length === 0 ? (
              <div className={`${METAL_CARD} grid gap-3 px-4 py-4 lg:px-5`}>
                <div>
                  <p className="m-0 font-display text-[17px] font-bold text-[#14264d]">Gli altri eventi della stagione</p>
                  <p className="m-0 mt-1 text-[14px] leading-snug text-[#52627f]">
                    Open day, tornei e serate compaiono qui appena la società li pubblica. Intanto trovi gare e allenamenti
                    nel calendario e le novità nel feed del club.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link to="/calendario" className={METAL_CTA}>
                    <CalendarDays className="size-4" aria-hidden="true" />
                    Calendario
                  </Link>
                  <Link to="/" className={METAL_GHOST}>
                    Dal club
                  </Link>
                </div>
              </div>
            ) : (
              <ul className={`${METAL_CARD} m-0 list-none px-4 pb-1 pt-2 lg:px-5`}>
                {eventi.map((e) => (
                  <li key={e.id} className="flex gap-3 border-t border-[#edf1f7] py-3 first:border-t-0">
                    <KindBar kind="club" />
                    {e.image && <img src={e.image} alt={e.title} loading="lazy" decoding="async" className="size-[72px] shrink-0 rounded-[8px] object-cover" />}
                    <div className="grid min-w-0 flex-1 content-start gap-1">
                      {e.startAt && (
                        <span className={`${METAL_LABEL} ${EVENT_KINDS.club.ink}`}>
                          {new Date(e.startAt).toLocaleDateString("it-IT", { day: "numeric", month: "long", timeZone: "Europe/Rome" })}
                        </span>
                      )}
                      <h3 className="m-0 font-display text-[18px] font-bold leading-tight text-[#14264d]">{e.title}</h3>
                      {e.body && <p className="m-0 text-[14px] leading-snug text-[#52627f]">{e.body}</p>}
                      {e.link && (
                        <a href={e.link} className={`${METAL_CTA} mt-1 w-fit`}>
                          Partecipa
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <NextSteps today={today} />
      </div>
    </main>
  );
}

/* ------------------------------------------------------------ pieces */

/** Section pills (board style): jump to tornei, iniziative, club; the dot is the colour of that kind. */
function KindPills() {
  const items: Array<{ kind: EventKind; href: string }> = [
    { kind: "torneo", href: "#tornei" },
    { kind: "iniziativa", href: "#iniziative" },
    { kind: "club", href: "#club" },
  ];
  return (
    <nav aria-label="Sezioni della pagina" className="-mb-2 flex flex-wrap gap-2" data-testid="eventi-pills">
      {items.map(({ kind, href }) => (
        <a
          key={kind}
          href={href}
          className="scd-focus inline-flex min-h-11 items-center gap-2 rounded-full border border-[#d6deeb] bg-white px-4 font-display text-[14px] font-semibold text-[#14264d] shadow-[0_4px_12px_-10px_rgb(20_38_77/0.6)] hover:border-[#0457af]"
        >
          <span aria-hidden="true" className={`size-2.5 rounded-full ${EVENT_KINDS[kind].dot}`} />
          {EVENT_KINDS[kind].label}
        </a>
      ))}
    </nav>
  );
}

function KindBar({ kind }: { kind: EventKind }) {
  return <span aria-hidden="true" className={`w-[4px] shrink-0 self-stretch rounded-full ${EVENT_KINDS[kind].bar}`} />;
}

/** Date tile of a row: day, month, weekday; "in arrivo" when the date is not published. */
function DateTile({ day, dark = false }: { day: string | null; dark?: boolean }) {
  const b = dateBlock(day);
  const box = dark ? "bg-[#13254d] text-white" : "bg-[#eef2f8] text-[#14264d]";
  if (!b)
    return (
      <span className={`grid w-[58px] shrink-0 place-items-center rounded-[10px] px-1 py-2 text-center font-display text-[11px] font-semibold leading-tight ${box}`}>
        data
        <br />
        in arrivo
      </span>
    );
  return (
    <span className={`grid w-[58px] shrink-0 content-center justify-items-center rounded-[10px] py-1.5 font-display leading-none ${box}`} aria-hidden="true">
      <span className="text-[11px] font-semibold uppercase opacity-80">{b.weekday}</span>
      <span className="text-[24px] font-bold tabular-nums">{b.day}</span>
      <span className="text-[11px] font-semibold uppercase">{b.month}</span>
    </span>
  );
}

/** Featured row of the next club tournament (sole tone): Christmas Lario Cup, male and female edition, 8 Dec 2026. */
function ClcRow({ today }: { today: string }) {
  const ahead = clcAhead(today);
  const when = countdownWords(today, CLC_DAY);
  const [male, female] = CLC.cups;
  return (
    <Link
      to="/eventi/christmas-lario-cup"
      className="scd-band-sole scd-focus group flex flex-wrap items-center gap-x-4 gap-y-3 rounded-[12px] p-4 shadow-[0_10px_24px_-18px_rgb(120_90_0/0.9)] ring-1 ring-[#c99600]/45 lg:flex-nowrap lg:p-5"
      data-testid="eventi-clc"
    >
      <DateTile day={CLC_DAY} dark />
      <span className="grid min-w-0 flex-1 basis-[180px] gap-0.5">
        <span className={`${METAL_LABEL} text-[#034a96]`}>
          Torneo · {CLC.edition}
          {ahead ? ` · ${TOURNAMENT_STATUS_LABEL.ISCRIZIONI_APERTE}` : ""}
        </span>
        <b className="font-display text-[22px] font-bold leading-[1.05] text-[#13254d] lg:text-[28px]">{CLC.name}</b>
        <span className="text-[14px] leading-snug text-[#1c2c50] lg:text-[15px]">
          {CLC.dateLabel}
          {when ? ` · ${when}` : ""}
          <span className="block">
            {male ? `${male.badge} a ${cityOf(male.city)}` : ""}
            {female ? ` · Female Edition a ${cityOf(female.city)}` : ""}
          </span>
        </span>
      </span>
      <span className="scd-navy-btn inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-[10px] px-4 font-display text-[15px] font-semibold">
        Programma e iscrizioni
        <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
      </span>
    </Link>
  );
}

function TournamentRow({ t }: { t: TournamentEdition }) {
  const body: ReactNode = (
    <>
      <DateTile day={t.status === "IN_PREPARAZIONE" || t.status === "DATE_DA_CONFERMARE" ? null : t.date} />
      <KindBar kind="torneo" />
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className={`${METAL_LABEL} ${EVENT_KINDS.torneo.ink}`}>
          {t.section} · {TOURNAMENT_STATUS_LABEL[t.status]}
        </span>
        <b className="font-display text-[17px] font-bold leading-tight text-[#14264d] lg:text-[18px]">{t.name}</b>
        <span className="text-[13px] leading-snug text-[#52627f] lg:text-[14px]">
          {t.when ? `${t.when}. ` : ""}
          {t.text}
        </span>
      </span>
      <ChevronRight className="size-5 shrink-0 self-center text-[#7a8aa8] group-hover:text-[#0457af]" aria-hidden="true" />
    </>
  );
  const cls = "scd-focus group flex min-h-11 items-stretch gap-3 rounded-md py-3";
  return (
    <li className="border-t border-[#edf1f7] first:border-t-0" data-testid={`eventi-torneo-${t.id}`}>
      {t.link ? (
        <Link to={t.link.to as never} {...(t.link.hash ? { hash: t.link.hash } : {})} className={cls}>
          {body}
        </Link>
      ) : (
        <Link to="/tornei" hash={t.id} className={cls}>
          {body}
        </Link>
      )}
    </li>
  );
}

function InitiativeRow({ item }: { item: Initiative }) {
  return (
    <li className="border-t border-[#edf1f7] first:border-t-0">
      <Link to={item.href as never} className="scd-focus group flex items-stretch gap-3 rounded-md py-3" data-testid={`eventi-initiative-${item.id}`}>
        <img src={item.flyer.src} alt="" loading="lazy" decoding="async" className="h-[84px] w-[66px] shrink-0 rounded-[8px] object-cover object-top" />
        <KindBar kind="iniziativa" />
        <span className="grid min-w-0 flex-1 content-start gap-0.5">
          <span className={`${METAL_LABEL} ${EVENT_KINDS.iniziativa.ink}`}>Iniziativa · fino al {dayMonth(item.showUntil)}</span>
          <b className="font-display text-[17px] font-bold leading-tight text-[#14264d] lg:text-[18px]">{item.title}</b>
          <span className="text-[13px] leading-snug text-[#52627f] lg:text-[14px]">{item.subtitle}</span>
          <span className="mt-0.5 inline-flex items-center gap-1 font-display text-[14px] font-semibold text-[#0457af]">
            Dettagli e contatti
            <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
          </span>
        </span>
      </Link>
    </li>
  );
}

function LotteryRow({ lottery }: { lottery: PublicLottery }) {
  return (
    <li className="border-t border-[#edf1f7] first:border-t-0">
      <Link to="/eventi/lotteria-dello-sport" className="scd-focus group flex items-stretch gap-3 rounded-md py-3" data-testid="eventi-lotteria">
        <KindBar kind="iniziativa" />
        <span className="grid min-w-0 flex-1 content-start gap-0.5">
          <span className={`${METAL_LABEL} ${EVENT_KINDS.iniziativa.ink}`}>
            Iniziativa benefica
            {lottery.sportDay ? ` · Giornata dello sport ${longDay(lottery.sportDay)}` : ""}
          </span>
          <b className="font-display text-[17px] font-bold leading-tight text-[#14264d] lg:text-[18px]">
            {lottery.title || `${KIND_LABEL[lottery.kind]} dello sport`}
          </b>
          <span className="text-[13px] leading-snug text-[#52627f] lg:text-[14px]">{lottery.beneficiary}</span>
          <span className="mt-0.5 inline-flex items-center gap-1 font-display text-[14px] font-semibold text-[#0457af]">
            Premi, biglietti e regole
            <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
          </span>
        </span>
      </Link>
    </li>
  );
}

/** Right column (desktop) / end of page (phone): the countdown to the next tournament and the useful next steps. */
function NextSteps({ today }: { today: string }) {
  const when = countdownWords(today, CLC_DAY);
  const steps: Array<{ to: string; hash?: string; label: string; sub: string; icon: ReactNode; testid: string }> = [
    { to: "/eventi/christmas-lario-cup", hash: "iscrizioni", label: "Iscrivi la tua squadra", sub: "Christmas Lario Cup, maschile e femminile", icon: <Trophy className="size-4" aria-hidden="true" />, testid: "eventi-step-iscrizioni" },
    { to: "/tornei", label: "Tutti i tornei", sub: "Date, categorie e squadre confermate", icon: <ChevronRight className="size-4" aria-hidden="true" />, testid: "eventi-step-tornei" },
    { to: "/calendario", label: "Partite e allenamenti", sub: "Il calendario della stagione", icon: <CalendarDays className="size-4" aria-hidden="true" />, testid: "eventi-step-calendario" },
    { to: "/sponsor", label: "Porta la tua azienda in un torneo", sub: "Spazi partner e visibilità", icon: <Handshake className="size-4" aria-hidden="true" />, testid: "eventi-step-sponsor" },
    { to: "/community", label: "Tifa con la comunità", sub: "Top 11, Fantacalcio e post dalla partita", icon: <Users className="size-4" aria-hidden="true" />, testid: "eventi-step-community" },
  ];
  return (
    <aside className="grid content-start gap-4" aria-label="Prossimi passi" data-testid="eventi-next">
      {when && (
        <Link to="/eventi/christmas-lario-cup" className={`${METAL_CARD} scd-focus grid gap-1 p-4 hover:border-[#0457af]`} data-testid="eventi-countdown">
          <span className={`${METAL_LABEL} text-[#0457af]`}>Prossimo torneo</span>
          <span className="font-display text-[24px] font-bold leading-none text-[#14264d]">{when.charAt(0).toUpperCase() + when.slice(1)}</span>
          <span className="text-[13px] text-[#52627f]">
            {CLC.name} · {CLC.dateLabel.toLowerCase()} · Colico e Dervio
          </span>
        </Link>
      )}
      <nav className={`${METAL_CARD} px-2 pb-2 pt-3`} aria-labelledby="eventi-next-t">
        <h2 id="eventi-next-t" className={`${METAL_LABEL} m-0 px-2 pb-1 text-[#52627f]`}>
          Prossimi passi
        </h2>
        <ul className="m-0 list-none p-0">
          {steps.map((s) => (
            <li key={s.testid}>
              <Link to={s.to as never} {...(s.hash ? { hash: s.hash } : {})} className="scd-focus group flex min-h-11 items-center gap-3 rounded-[8px] px-2 py-2 hover:bg-[#eef2f8]" data-testid={s.testid}>
                <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-[8px] bg-[#13254d] text-[#ffd23f]">
                  {s.icon}
                </span>
                <span className="grid min-w-0 flex-1">
                  <span className="font-display text-[15px] font-semibold leading-tight text-[#14264d]">{s.label}</span>
                  <span className="text-[12px] leading-snug text-[#52627f]">{s.sub}</span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-[#7a8aa8] group-hover:text-[#0457af]" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className={`${METAL_CARD} grid gap-2 p-4`} data-testid="eventi-legend">
        <span className={`${METAL_LABEL} text-[#52627f]`}>I colori della pagina</span>
        <ul className="m-0 grid list-none gap-1.5 p-0 text-[13px] text-[#14264d]">
          {(Object.keys(EVENT_KINDS) as EventKind[]).map((k) => (
            <li key={k} className="flex items-center gap-2">
              <span aria-hidden="true" className={`h-3 w-5 rounded-[3px] ${EVENT_KINDS[k].dot}`} />
              {EVENT_KINDS[k].label}
            </li>
          ))}
        </ul>
        <Link to="/contatti" className="scd-focus -mx-1 flex min-h-11 items-center gap-1.5 rounded-md px-1 text-[13px] leading-snug text-[#0457af]">
          <MessageCircle className="size-4 shrink-0" aria-hidden="true" />
          Domande su un evento? Scrivi alla segreteria
        </Link>
      </div>
    </aside>
  );
}
