/**
 * Signed-out public home v5 (UD-116, Direzione 14/10/2026 10:59: "il footer grande con Tutto sul club non serve
 * alle persone; le home devono mostrare ciò che conta davvero"), built on the vetrina clean-up of UD-110.
 *
 * Order: urgent notices (R20 alerts, only when there are) → the one club communication chosen by the Direzione (with
 * expiry) → "Oggi e questa settimana" (matchday card, today's games, next home game of each team) → six quick
 * actions for visitors → weekend results (only with a real source) → tip of the day (tip-only characters and Vera, UD-118)
 * → credentials once → vetrina (trimmed so nothing repeats) → news → join → ONE partner band → reduced footer.
 * Teams, rosters and trainings are not here: they live inside after sign-in (UD-100).
 * Palette: navy #0b2a5b, blue #1556c4, light #eef3f9, white; yellow #ffd600 for changes and the main CTA.
 * Real assets only (public/media); our age-group crests never appear; no minor is named.
 */
import { Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight, ChevronRight, Lock, Newspaper } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { LedwallRotator } from "@/components/LedwallRotator";
import { ClubCrestOfficial } from "@/components/SiteChrome";
import { KitTexture } from "@/components/scd/kit-texture";
import { ClubCredentials, LogoTile, SponsorLogo } from "@/components/scd/Logos";
import type { ClubNotice } from "@/lib/club-notice";
import type { PublicFeed } from "@/lib/club.types";
import { quickActions } from "@/lib/home-actions";
import { weekendResults } from "@/lib/home-results";
import { nextHomeMatchPerTeam, urgentNotices, weekMatches } from "@/lib/home-today";
import { dailyTip } from "@/lib/home-tips";
import { NEWS_SOURCE_LABEL, type NewsItem } from "@/lib/news-mix";
import { partnerNewsOn } from "@/lib/partner-news";
import { timeAgo } from "@/lib/social";
import { kickoffClock, matchdayLabel, partnerOfTheMonth, trimVetrina, vetrinaRepeats } from "@/lib/public-home";
import { SPONSORS, sponsorLabel } from "@/lib/sponsors";
import {
  EMPTY_WORLDS,
  PUBLIC_WORLDS,
  WORLD_HINT,
  WORLD_LABEL,
  WORLD_STORAGE_KEY,
  isVetrinaWorld,
  type VetrinaSlot,
  type VetrinaWorld,
} from "@/lib/vetrina";

import { sides } from "./match-sides";
import { ClubNoticeCard, DailyTipCard, PublicToday, QuickActions, SupportStrip, UrgentNotices, WeekendResults } from "@/components/home/HomePractical";
import { supportActions } from "@/lib/home-support";
import { venueShort } from "@/components/home/HomeSections";
import { venueCase } from "@/lib/board-data";
import { OpponentCrest } from "@/lib/crests";
import { publicTeamCrest } from "@/lib/team-crest";
import { addDays } from "@/lib/board-data";
import type { getPublicCalendarSnapshot } from "@/lib/calendar.functions";
import { calendarToWeekItems, romeParts, type WeekItem } from "@/lib/home-week";
import { hasHomeMatch, showLedwallOnHome } from "@/lib/ledwall-rotation";
import { itemState, orderTeams, startMs, type Team } from "@/lib/universe";

type PublicCalendar = Awaited<ReturnType<typeof getPublicCalendarSnapshot>>;

const WRAP = "mx-auto w-full max-w-[1280px] px-4 lg:px-8";

/* ------------------------------------------------- credential bar */

/**
 * The club's credentials high on the home (Direzione 13/10/2026 15:31 and 15:55): three distinct labelled items in
 * order of importance (Club Giovanile di 3° livello FIGC SGS, iscritta FIGC con LND Lombardia, affiliata AC
 * Monza), official marks only, slim white card below the practical blocks (UD-116).
 */
function CredentialBar() {
  return (
    <section
      aria-label="Riconoscimenti e affiliazioni del club"
      className={`${WRAP} pt-6 lg:pt-10`}
      data-testid="affiliation-strip"
    >
      <div className="rounded-[16px] bg-white px-3 py-2 [--logo-k:1] lg:py-2.5 lg:[--logo-k:1.2]">
        <ClubCredentials variant="bar" className="mx-auto max-w-[1040px]" />
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ CTA banner */

function JoinBanner() {
  return (
    <div className={`${WRAP} pt-6 lg:pt-10`}>
      <section
        aria-labelledby="entra-t"
        className="relative isolate overflow-hidden rounded-[20px] bg-[#0b2a5b] text-white"
        data-testid="join-banner"
      >
        <picture>
          <source
            media="(min-width: 1024px)"
            srcSet="/media/scd/lario-header.webp"
          />
          <img
            src="/media/scd/lario-header.webp"
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            className="absolute inset-0 -z-10 size-full object-cover object-[78%_center] lg:object-[center_40%]"
          />
        </picture>
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgb(11_42_91/0.55)_0%,rgb(11_42_91/0.92)_62%)] lg:bg-[linear-gradient(90deg,rgb(11_42_91/0.96)_0%,rgb(11_42_91/0.86)_45%,rgb(11_42_91/0.2)_100%)]"
        />
        <div className="grid gap-4 px-5 pb-6 pt-16 sm:px-8 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center lg:gap-8 lg:px-10 lg:py-9">
          <ClubCrestOfficial size={72} className="hidden lg:block" />
          <div className="grid gap-2">
            <h2
              id="entra-t"
              className="m-0 font-uv text-[34px] uppercase leading-[0.95] lg:text-[44px]"
            >
              Entra nel club<span className="text-[#ffd600]">.</span>
            </h2>
            <p className="m-0 max-w-[46ch] text-[15.5px] leading-snug text-white/90 lg:text-[17px]">
              Segui la società, gioca al Fantacalcio e ricevi avvisi e
              convocazioni nell'app. Un solo account per famiglia, atleti e
              tifosi.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Link
              to="/registrati"
              className="scd-focus inline-flex h-12 items-center gap-2 rounded-[12px] bg-[#ffd600] px-6 text-[16px] font-bold text-[#0b1e3a] transition-[filter] duration-150 hover:brightness-95"
              data-testid="home-signup"
            >
              Registrati
              <ArrowRight className="size-[18px]" aria-hidden="true" />
            </Link>
            <Link
              to="/accedi"
              search={{ next: undefined }}
              className="scd-focus inline-flex h-12 items-center rounded-[12px] border border-white/70 px-6 text-[16px] font-semibold text-white transition-colors duration-150 hover:bg-white/10"
              data-testid="home-enter"
            >
              Entra
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------- vetrina */

/** Visual of a vetrina slot: real poster/flyer/board, a small cast portrait, or an original typographic panel. */
function SlotVisual({ slot }: { slot: VetrinaSlot }) {
  const v = slot.visual;
  if (v.kind === "portrait")
    return (
      <span className="relative flex size-full items-center justify-center overflow-hidden bg-[radial-gradient(120%_120%_at_85%_15%,#1556c4_0%,#0b2a5b_62%)]">
        <KitTexture motif="mountains-lake" overlay />
        <img
          src={v.src}
          alt={v.alt}
          width={112}
          height={112}
          loading="lazy"
          decoding="async"
          className="relative size-[96px] rounded-full bg-white object-cover shadow-[0_8px_22px_-8px_rgb(0_0_0/0.55)] ring-4 ring-white/90 lg:size-[112px]"
        />
      </span>
    );
  if (v.kind === "type")
    return (
      <span className="relative block size-full overflow-hidden bg-[radial-gradient(120%_120%_at_90%_10%,#1556c4_0%,#0b2a5b_58%)]">
        <span
          aria-hidden="true"
          className={`absolute -bottom-5 right-3 font-uv leading-none text-[#ffd600] ${v.big.length > 3 ? "text-[96px]" : "text-[130px]"}`}
        >
          {v.big}
        </span>
        <span className="absolute left-4 top-4 max-w-[62%] font-uv text-[21px] uppercase leading-[0.95] text-white">
          {v.small}
        </span>
      </span>
    );
  return (
    <img
      src={v.src}
      alt={v.alt}
      loading="lazy"
      decoding="async"
      style={{ objectPosition: v.position }}
      className={`size-full ${v.fit === "contain" ? "bg-white object-contain p-2" : "object-cover"}`}
    />
  );
}

function SlotCard({ slot }: { slot: VetrinaSlot }) {
  const members = slot.audience === "members";
  return (
    <Link
      to={slot.href as never}
      {...(slot.hash ? { hash: slot.hash } : {})}
      {...(slot.search ? { search: slot.search as never } : {})}
      className="scd-focus scd-lift group flex h-full w-full flex-col overflow-hidden rounded-[16px] bg-white shadow-[0_1px_2px_rgb(11_42_91/0.06),0_8px_24px_-12px_rgb(11_42_91/0.25)] hover:shadow-[0_1px_2px_rgb(11_42_91/0.08),0_14px_30px_-12px_rgb(11_42_91/0.35)]"
      data-slot={slot.id}
      data-kind={slot.kind}
      data-audience={slot.audience}
    >
      <span className="relative block aspect-[274/160] w-full overflow-hidden border-b border-[#e6edf6]">
        <span className="scd-zoom block size-full">
          <SlotVisual slot={slot} />
        </span>
        {slot.badge && (
          <span className="absolute left-3 top-3 rounded-full bg-[#ffd600] px-2.5 py-1 text-[11px] font-extrabold uppercase leading-none tracking-[0.06em] text-[#0b1e3a]">
            {slot.badge}
          </span>
        )}
        {members && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-extrabold uppercase leading-none tracking-[0.06em] text-[#0b2a5b] shadow-sm">
            <Lock className="size-3" aria-hidden="true" />
            Per i tesserati
          </span>
        )}
      </span>
      <span className="flex flex-1 flex-col gap-1 px-4 pb-4 pt-3">
        <span className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-[#1556c4]">{slot.kicker}</span>
        <span className="text-[18px] font-bold leading-tight text-[#0b1e3a]">{slot.title}</span>
        <span className="text-[14px] leading-snug text-[#4a5d7a]">{slot.text}</span>
        <span className="mt-auto inline-flex items-center gap-1 pt-2 text-[14px] font-semibold text-[#1556c4]">
          {slot.cta}
          <ArrowRight
            className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </span>
      </span>
    </Link>
  );
}

function readWorld(): VetrinaWorld {
  try {
    const v = window.localStorage.getItem(WORLD_STORAGE_KEY);
    return isVetrinaWorld(v) && v !== "soci" ? v : "tutti";
  } catch {
    return "tutti";
  }
}

function saveWorld(w: VetrinaWorld) {
  try {
    window.localStorage.setItem(WORLD_STORAGE_KEY, w);
  } catch {
    /* storage blocked: the choice lasts for this visit */
  }
}

/** "Il tuo mondo": the visitor picks a world (no age, no profile, no tracking; stored on this device only). */
function WorldChips({ value, onChange }: { value: VetrinaWorld; onChange: (w: VetrinaWorld) => void }) {
  return (
    <div className="flex flex-col gap-1.5 pb-3 sm:flex-row sm:items-center sm:gap-3">
      <span id="mondo-l" className="text-[12px] font-bold uppercase tracking-[0.1em] text-[#5a6b85]">
        Il tuo mondo
      </span>
      <div
        role="radiogroup"
        aria-labelledby="mondo-l"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
        data-testid="world-chips"
      >
        {PUBLIC_WORLDS.map((w) => {
          const on = w === value;
          return (
            <button
              key={w}
              type="button"
              role="radio"
              aria-checked={on}
              title={WORLD_HINT[w]}
              onClick={() => onChange(w)}
              data-world={w}
              className={`scd-focus inline-flex min-h-11 shrink-0 items-center rounded-full border px-4 text-[14px] font-semibold transition-colors duration-150 ${on ? "border-[#0b2a5b] bg-[#0b2a5b] text-white" : "border-[#c9d7ea] bg-white text-[#0b2a5b] hover:border-[#1556c4]"}`}
            >
              {WORLD_LABEL[w]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * La vetrina (UD-110) with its palinsesto: one rotating showcase right after the games of the week. The picks of the
 * day for every world come from the server (getVetrina, Rome day); the visitor's world is chosen with the chips
 * (public home) or fixed (member home: "soci"). Phones swipe a single row, desktop sees every slot in a grid.
 */
export function Vetrina({
  worlds,
  fixedWorld,
  embedded = false,
}: {
  worlds: Readonly<Record<VetrinaWorld, readonly VetrinaSlot[]>>;
  /** Member home: the world comes from the session, no chips. */
  fixedWorld?: VetrinaWorld;
  /** Inside another layout column (member home): no page gutter. */
  embedded?: boolean;
}) {
  const [world, setWorld] = useState<VetrinaWorld>(fixedWorld ?? "tutti");
  useEffect(() => {
    if (!fixedWorld) setWorld(readWorld());
  }, [fixedWorld]);
  const choose = (w: VetrinaWorld) => {
    setWorld(w);
    saveWorld(w);
  };
  const slots = worlds[world] ?? [];
  const any = Object.values(worlds).some((l) => l.length > 0);
  if (!any) return null;
  return (
    <section
      aria-labelledby="vetrina-t"
      className={embedded ? "min-w-0" : `${WRAP} pt-6 lg:pt-10`}
      data-testid="vetrina"
      data-world={world}
    >
      <div className="flex items-end justify-between gap-3 pb-3">
        <div className="grid gap-1">
          <span className="text-[11.5px] font-extrabold uppercase tracking-[0.12em] text-[#1556c4]">
            Oggi nel club · cambia ogni giorno
          </span>
          <h2
            id="vetrina-t"
            className="scd-reveal m-0 font-uv text-[24px] uppercase leading-none text-[#0b2a5b] sm:text-[26px] lg:text-[30px]"
          >
            In vetrina
          </h2>
        </div>
        <Link
          to="/eventi"
          className="scd-focus inline-flex min-h-11 shrink-0 items-center gap-0.5 rounded-md text-[14px] font-semibold text-[#1556c4]"
        >
          Tutti gli eventi
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
      {!fixedWorld && <WorldChips value={world} onChange={choose} />}
      <ul
        className={`-mx-4 m-0 flex list-none snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] lg:mx-0 lg:grid lg:snap-none lg:gap-4 lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden ${embedded ? "lg:grid-cols-2" : "lg:grid-cols-3"}`}
        aria-label={`Contenuti in vetrina oggi: ${WORLD_LABEL[world]}`}
        aria-live="polite"
      >
        {slots.map((s) => (
          <li key={s.id} className="flex shrink-0 basis-[80%] snap-start sm:basis-[calc((100%-12px)/2)] lg:basis-auto">
            <SlotCard slot={s} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------------------------------------------------------------- news */

/**
 * Le notizie (UD-110, 19:03): a short mixed feed — newspapers on every age group, recent articles of the club website
 * and club news — each item opening the original. Negative headlines are filtered on the server (they stay on
 * /rassegna-stampa); with nothing recent the block says so and links to the press review.
 */
function HomeNewsBlock({ items, nowMs }: { items: readonly NewsItem[]; nowMs: number }) {
  return (
    <section aria-labelledby="notizie-t" className={`${WRAP} pt-8 lg:pt-12`} data-testid="home-news">
      <div className="flex items-end justify-between gap-3 pb-3">
        <h2
          id="notizie-t"
          className="scd-reveal m-0 font-uv text-[24px] uppercase leading-none text-[#0b2a5b] sm:text-[26px] lg:text-[30px]"
        >
          Le notizie
        </h2>
        <Link
          to="/rassegna-stampa"
          className="scd-focus inline-flex min-h-11 shrink-0 items-center gap-0.5 rounded-md text-[14px] font-semibold text-[#1556c4]"
        >
          Tutte<span className="max-sm:hidden">&nbsp;le notizie</span>
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
      <div className="overflow-hidden rounded-[16px] bg-white shadow-[0_1px_2px_rgb(11_42_91/0.06),0_8px_24px_-12px_rgb(11_42_91/0.25)]">
        {items.length > 0 ? (
          <ul className="m-0 grid list-none divide-y divide-[#e6edf6] p-0 lg:grid-cols-2 lg:divide-y-0 lg:[&>li]:border-b lg:[&>li]:border-[#e6edf6]">
            {items.map((n) => {
              const inner = (
                <>
                  <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-[#e6eefa] text-[#1556c4]">
                    <Newspaper className="size-[18px]" aria-hidden="true" />
                  </span>
                  <span className="grid min-w-0 flex-1 gap-0.5">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] font-semibold uppercase tracking-[0.05em] text-[#5a6b85]">
                      <span>{NEWS_SOURCE_LABEL[n.sourceKind]}</span>
                      <span aria-hidden="true">·</span>
                      <span className="normal-case tracking-normal">{n.source}</span>
                      {n.publishedAt && <span className="normal-case tracking-normal">· {timeAgo(n.publishedAt, nowMs)}</span>}
                      {n.tag && (
                        <span className="rounded-full bg-[#ffd600] px-1.5 py-[2px] text-[10px] font-extrabold leading-none text-[#0b1e3a]">
                          {n.tag}
                        </span>
                      )}
                    </span>
                    <span className="line-clamp-2 text-[15px] font-semibold leading-snug text-[#0b1e3a] group-hover:underline">
                      {n.title}
                    </span>
                  </span>
                  <ArrowUpRight className="mt-1 size-4 shrink-0 text-[#9fb0c8]" aria-hidden="true" />
                </>
              );
              return (
                <li key={n.id}>
                  {n.external ? (
                    <a
                      href={n.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="scd-focus group flex items-start gap-3 px-4 py-3.5 hover:bg-[#f4f7fb]"
                    >
                      {inner}
                      <span className="sr-only">(apre il sito di {n.source})</span>
                    </a>
                  ) : (
                    <Link to={n.url as never} className="scd-focus group flex items-start gap-3 px-4 py-3.5 hover:bg-[#f4f7fb]">
                      {inner}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="m-0 flex items-center gap-3 px-4 py-4 text-[14.5px] text-[#4a5d7a]" data-testid="home-news-empty">
            <Newspaper className="size-5 shrink-0 text-[#1556c4]" aria-hidden="true" />
            Nessuna notizia recente in questo momento: la rassegna si aggiorna da sola.
          </p>
        )}
      </div>
    </section>
  );
}

/* --------------------------------------------------------- partner band */

const monthName = (day: string) =>
  new Intl.DateTimeFormat("it-IT", { timeZone: "UTC", month: "long" }).format(
    new Date(`${day.slice(0, 7)}-15T12:00:00Z`),
  );

/**
 * The ONE partner band of the home (UD-116 "una sola fascia sobria", after UD-110): the LED wall with every partner
 * in rotation (UD-107), the partner of the month, partner news only when a partner has sent one, and the two links
 * (all partners, become a partner). Logos always in colour.
 */
function PartnerBand({ day, nowMs, ledOnHome }: { day: string; nowMs: number; ledOnHome: boolean }) {
  const showcase = partnerOfTheMonth(day);
  const news = partnerNewsOn(day);
  return (
    <section aria-labelledby="partner-t" className={`${WRAP} pt-8 lg:pt-12`} data-testid="partner-band">
      <div className="flex items-end justify-between gap-3 pb-3">
        <h2
          id="partner-t"
          className="scd-reveal m-0 font-uv text-[24px] uppercase leading-none text-[#0b2a5b] sm:text-[26px] lg:text-[30px]"
        >
          I nostri partner
        </h2>
        <Link
          to="/sponsor"
          className="scd-focus inline-flex min-h-11 shrink-0 items-center gap-0.5 rounded-md text-[14px] font-semibold text-[#1556c4]"
          data-testid="all-partners"
        >
          Tutti i {SPONSORS.length} partner
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
      <div className="grid gap-4 rounded-[16px] bg-white p-4 shadow-[0_1px_2px_rgb(11_42_91/0.06),0_8px_24px_-12px_rgb(11_42_91/0.25)] lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-center lg:p-5">
        {ledOnHome && (
          <div data-testid="home-ledwall" className="min-w-0">
            <LedwallRotator day={day} nowMs={nowMs} variant="compact" />
          </div>
        )}
        <div className="grid content-start gap-3">
          {showcase && (
            <div className="flex items-center gap-3.5 rounded-[12px] bg-[#eef3f9] p-3" data-testid="partner-of-month">
              <LogoTile className="h-[60px] w-[96px] shrink-0">
                <SponsorLogo sponsor={showcase} box={{ w: 80, h: 44 }} decorative />
              </LogoTile>
              <span className="grid min-w-0 flex-1 gap-0.5">
                <span className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-[#1556c4]">
                  Partner del mese · {monthName(day)}
                </span>
                <b className="text-[16px] leading-tight text-[#0b1e3a]">{sponsorLabel(showcase)}</b>
              </span>
            </div>
          )}
          {news.length > 0 && (
            <ul className="m-0 grid list-none gap-0 divide-y divide-[#e6edf6] p-0" data-testid="partner-news">
              {news.slice(0, 2).map((n) => (
                <li key={n.id} className="py-2">
                  {n.url ? (
                    <a href={n.url} target="_blank" rel="noopener noreferrer" className="scd-focus grid gap-0.5 hover:underline">
                      <span className="text-[12px] font-semibold uppercase tracking-[0.05em] text-[#5a6b85]">{n.label}</span>
                      <b className="text-[15px] leading-snug text-[#0b1e3a]">{n.title}</b>
                      <span className="sr-only">(apre il sito del partner)</span>
                    </a>
                  ) : (
                    <span className="grid gap-0.5">
                      <span className="text-[12px] font-semibold uppercase tracking-[0.05em] text-[#5a6b85]">{n.label}</span>
                      <b className="text-[15px] leading-snug text-[#0b1e3a]">{n.title}</b>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
          <Link
            to="/sponsor"
            hash="proposta"
            className="scd-focus inline-flex h-12 w-fit items-center gap-2 rounded-[12px] bg-[#0b2a5b] px-5 text-[15px] font-bold text-white transition-[filter] duration-150 hover:brightness-110"
            data-testid="home-ledwall-cta"
          >
            Diventa partner
            <ArrowRight className="size-[18px]" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ matchday */

const pad = (n: number) => String(n).padStart(2, "0");

/** Seconds tick while the card is on screen; the first render uses the server clock (no hydration mismatch). */
function useTick(serverNow: number): number {
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

function Side({
  crest,
  name,
  sub,
}: {
  crest: ReactNode;
  name: string;
  sub?: string;
}) {
  return (
    <span className="flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center">
      <span className="grid size-[46px] place-items-center rounded-full bg-white shadow-[0_6px_18px_-6px_rgb(0_0_0/0.45)] lg:size-[64px]">
        {crest}
      </span>
      <span className="line-clamp-2 text-[14px] font-semibold leading-tight text-white lg:text-[15px]">
        {name}
      </span>
      {sub && (
        <span className="-mt-1 text-[12.5px] font-medium leading-tight text-[#ffd600]">
          {sub}
        </span>
      )}
    </span>
  );
}

function Segment({ value, unit }: { value: number; unit: string }) {
  const v = pad(value);
  return (
    <span className="flex flex-col items-center gap-1">
      <span className="grid h-[40px] w-full place-items-center overflow-hidden rounded-[10px] bg-white/[0.08] ring-1 ring-inset ring-white/15 lg:h-[56px]">
        <span
          key={v}
          className="scd-tick font-uv text-[26px] leading-none tabular-nums text-white lg:text-[38px]"
        >
          {v}
        </span>
      </span>
      <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-white/70">
        {unit}
      </span>
    </span>
  );
}

/**
 * Matchday card: the next kickoff of the week (or the game in play) from the official calendar, with a live
 * countdown. Our side is the official club crest + "ColicoDerviese" and the team label (annata crests stay inside);
 * no score is shown because the calendar carries none (nothing is invented).
 */
function Matchday({
  item,
  team,
  serverNow,
  today,
}: {
  item: WeekItem;
  team: Team | undefined;
  serverNow: number;
  today: string;
}) {
  const now = useTick(serverNow);
  const kickoff = startMs(item);
  const state = itemState(item, now);
  const clock = kickoffClock(kickoff, now);
  const { opponent: raw, weHome } = sides(item);
  const opponent = raw ? venueCase(raw) : "Avversario da definire";
  const us = team?.short ?? item.groupLabel.split("·")[0]!.trim();
  const ours = (
    <Side
      crest={
        <img
          src={publicTeamCrest()}
          alt=""
          width={34}
          height={44}
          className="h-[34px] w-auto object-contain lg:h-[46px]"
        />
      }
      name="ColicoDerviese"
      sub={us}
    />
  );
  const theirs = (
    <Side crest={<OpponentCrest name={raw} size={36} />} name={opponent} />
  );
  const day = matchdayLabel(item.date, today);
  const live = state === "live";
  const eyebrow = live
    ? "In campo ora"
    : state === "done"
      ? "Gara terminata"
      : day === "Oggi"
        ? "Oggi si gioca"
        : "Prossimo calcio d'inizio";
  const meta = [
    item.homeAway === "CASA"
      ? "Casa"
      : item.homeAway === "FUORI"
        ? "Fuori"
        : "",
    item.venue ? venueShort(item.venue) : "",
  ].filter(Boolean);
  return (
    <aside
      aria-label={`${eyebrow}: ${weHome ? `ColicoDerviese ${us} contro ${opponent}` : `${opponent} contro ColicoDerviese ${us}`}`}
      className="scd-matchday rounded-[18px] p-4 text-white lg:p-6"
      data-testid="matchday"
      data-state={state}
    >
      <KitTexture motif="mountains-lake" overlay />
      <svg
        aria-hidden="true"
        viewBox="0 0 400 200"
        preserveAspectRatio="xMidYMax slice"
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[70%] w-full text-white/[0.07]"
      >
        <g fill="none" stroke="currentColor" strokeWidth="1.5">
          <line x1="200" y1="0" x2="200" y2="200" />
          <circle cx="200" cy="200" r="70" />
          <circle cx="200" cy="200" r="3" fill="currentColor" />
        </g>
      </svg>
      <div className="flex items-center justify-between gap-3">
        <span
          className={`inline-flex items-center gap-2 text-[11.5px] font-extrabold uppercase tracking-[0.14em] ${live ? "text-white" : "text-[#ffd600]"}`}
        >
          {live && (
            <span
              aria-hidden="true"
              className="scd-live-dot size-2 rounded-full bg-[#ff5c5c]"
            />
          )}
          {eyebrow}
        </span>
        {!item.certain && (
          <span className="rounded-full bg-white/12 px-2 py-[3px] text-[11px] font-semibold text-white/85 ring-1 ring-inset ring-white/20">
            da confermare
          </span>
        )}
      </div>

      <div className="mt-2 flex items-start gap-2 lg:mt-5">
        {weHome ? ours : theirs}
        <span
          aria-hidden="true"
          className="mt-[12px] shrink-0 font-uv text-[22px] leading-none text-white/55 lg:mt-[20px] lg:text-[26px]"
        >
          VS
        </span>
        {weHome ? theirs : ours}
      </div>

      <p className="m-0 mt-2 text-center text-[13.5px] leading-snug text-white/80 lg:mt-4 lg:text-[14.5px]">
        <b className="font-semibold text-white">
          {day}
          {item.time ? ` · ${item.time}` : ""}
        </b>
        {meta.length > 0 && ` · ${meta.join(" · ")}`}
      </p>

      <div className="mt-3 lg:mt-5">
        {clock ? (
          <>
            <div aria-hidden="true" className="grid grid-cols-4 gap-2">
              <Segment value={clock.d} unit="giorni" />
              <Segment value={clock.h} unit="ore" />
              <Segment value={clock.m} unit="min" />
              <Segment value={clock.s} unit="sec" />
            </div>
            <span className="sr-only">
              {`Mancano ${clock.d} giorni, ${clock.h} ore e ${clock.m} minuti al calcio d'inizio.`}
            </span>
          </>
        ) : (
          <div className="grid h-[60px] place-items-center rounded-[12px] bg-white/[0.08] ring-1 ring-inset ring-white/15 lg:h-[82px]">
            <span className="font-uv text-[30px] uppercase leading-none text-[#ffd600] lg:text-[38px]">
              {live
                ? "In corso"
                : state === "done"
                  ? "Fischio finale"
                  : "Orario da definire"}
            </span>
          </div>
        )}
      </div>

      <Link
        to="/calendario"
        search={{ annata: item.group } as never}
        className="scd-focus mt-5 hidden min-h-11 w-full items-center justify-center gap-1.5 rounded-[12px] bg-[#ffd600] text-[15px] font-bold text-[#0b1e3a] transition-[filter,transform] duration-150 hover:brightness-95 active:scale-[0.98] lg:inline-flex"
      >
        Dettagli gara
        <ArrowRight className="size-[18px]" aria-hidden="true" />
      </Link>
    </aside>
  );
}

/* ---------------------------------------------------------------- page */

/** Rome "HH:MM" of an instant. */
const romeClock = (ms: number) => romeParts(new Date(ms).toISOString())?.time ?? "00:00";

/**
 * "Oggi e questa settimana" for anonymous visitors: the matchday card of the next game (or the one in play),
 * today's games of every team and the next home game of each team. Fixtures only (teams are inside, UD-100).
 */
function PublicWeek({ calendar, nowMs, today }: { calendar: PublicCalendar; nowMs: number; today: string }) {
  const teams = useMemo(() => new Map(orderTeams(calendar.groups).map((t) => [t.id, t])), [calendar.groups]);
  const nowHHMM = romeClock(nowMs);
  const todayGames = useMemo(() => weekMatches(calendar.events, calendar.groups, today, null, 1), [calendar, today]);
  const nextHome = useMemo(
    () => nextHomeMatchPerTeam(calendar.events, calendar.groups, today, nowHHMM),
    [calendar, today, nowHHMM],
  );
  const lastDay = addDays(today, 6);
  const highlight = useMemo(() => {
    const games = calendarToWeekItems(calendar.events, calendar.groups)
      .filter((i) => i.date >= today && i.date <= lastDay && itemState(i, nowMs) !== "done")
      .sort((a, b) => (a.date + (a.time || "99:99")).localeCompare(b.date + (b.time || "99:99")));
    return games.find((g) => itemState(g, nowMs) === "live") ?? games[0] ?? null;
  }, [calendar, today, lastDay, nowMs]);
  return (
    <PublicToday
      todayGames={todayGames}
      nextHome={nextHome}
      today={today}
      lead={
        highlight ? (
          <Matchday item={highlight} team={teams.get(highlight.group)} serverNow={nowMs} today={today} />
        ) : undefined
      }
    />
  );
}

export function PublicHome({
  calendar,
  news = [],
  vetrina = EMPTY_WORLDS,
  ledwallDay,
  feed = null,
  notice = null,
  nowMs,
  today,
}: {
  calendar: PublicCalendar;
  /** Mixed news highlight of the day (getHomeNews). */
  news?: readonly NewsItem[];
  /** Vetrina picks of the day for every world, from the server (getVetrina). */
  vetrina?: Readonly<Record<VetrinaWorld, readonly VetrinaSlot[]>>;
  /** Server Rome day for the LED wall and the partner band (defaults to today). */
  ledwallDay?: string;
  /** R20 public feed (alerts and weekend results); null when R20 did not answer in time. */
  feed?: PublicFeed | null;
  /** The one club communication of the day (getClubNotice), or null. */
  notice?: ClubNotice | null;
  nowMs: number;
  today: string;
}) {
  const ledDay = ledwallDay ?? today;
  const ledOnHome = useMemo(
    () =>
      showLedwallOnHome(ledDay, {
        homeMatch: hasHomeMatch(calendarToWeekItems(calendar.events, calendar.groups), ledDay),
      }),
    [calendar, ledDay],
  );
  const actions = useMemo(() => quickActions("visitatore"), []);
  const alerts = useMemo(() => urgentNotices(feed?.items ?? [], nowMs, false), [feed, nowMs]);
  const results = useMemo(() => weekendResults(feed, today), [feed, today]);
  const tip = useMemo(() => dailyTip(ledDay), [ledDay]);
  // Nothing repeats (UD-110, UD-116): vetrina slots that only open a page already in the quick actions, the news
  // block or the partner band are left out of the vetrina.
  const worlds = useMemo(() => trimVetrina(vetrina, vetrinaRepeats(actions)), [vetrina, actions]);
  // UD-116 order (+ C4 support strip after the week): urgent → communication → oggi e settimana → sostieni il club → quick actions → results → tip → credentials (once) →
  // vetrina → news → join → ONE partner band → reduced footer.
  return (
    <main data-screen="home" data-variant="public" className="min-h-dvh bg-[#eef3f9] pb-6 font-sans text-[#0b1e3a]">
      <h1 className="sr-only">S.C.D. ColicoDerviese, il club di calcio di Colico e Dervio</h1>
      <UrgentNotices items={alerts} />
      <ClubNoticeCard notice={notice} />
      <PublicWeek calendar={calendar} nowMs={nowMs} today={today} />
      <SupportStrip actions={supportActions({ lotteryPublic: false })} />
      <QuickActions audience="visitatore" actions={actions} />
      <WeekendResults rows={results} />
      <DailyTipCard tip={tip} signedIn={false} />
      <CredentialBar />
      <Vetrina worlds={worlds} />
      <HomeNewsBlock items={news} nowMs={nowMs} />
      <JoinBanner />
      <PartnerBand day={ledDay} nowMs={nowMs} ledOnHome={ledOnHome} />
    </main>
  );
}
