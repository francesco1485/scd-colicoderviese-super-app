/**
 * Signed-out public home v6 "Matchday" (UD-132, Francesco 14/10/2026 23:22: a short home that pushes ragazzi and
 * families to live the app; before: 6086 px at 390 px, about seven phone screens), built on UD-116 and UD-110.
 *
 * Order: urgent notices (R20 alerts, only when there are) → the one club communication chosen by the Direzione (with
 * expiry) → "Questa settimana" (games of the next 7 days with filters, HomeMatchday.tsx) with the compact LED wall
 * strip beside it on desktop → weekend results (only with a real source) → join → credentials once → ONE partner
 * band → reduced footer. Support strip, quick actions (the bottom nav covers them), tip of the day, vetrina and news
 * are not rendered here any more; Vetrina and HomeNewsBlock stay exported for other pages.
 * Teams, rosters and trainings are not here: they live inside after sign-in (UD-100).
 * Palette: navy #0b2a5b, blue #1556c4, light #eef3f9, white; yellow #ffd600 for changes and the main CTA.
 * Real assets only (public/media); our age-group crests never appear; no minor is named.
 */
import { Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight, ChevronRight, Lock, Newspaper } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { LedwallRotator } from "@/components/LedwallRotator";
import { SponsorSpotsHome } from "@/components/SponsorSpots";
import { ClubCrestOfficial } from "@/components/SiteChrome";
import { KitTexture } from "@/components/scd/kit-texture";
import { ClubCredentials, LogoTile, SponsorLogo } from "@/components/scd/Logos";
import type { ClubNotice } from "@/lib/club-notice";
import type { PublicFeed } from "@/lib/club.types";
import { weekendResults } from "@/lib/home-results";
import { urgentNotices } from "@/lib/home-today";
import { NEWS_SOURCE_LABEL, type NewsItem } from "@/lib/news-mix";
import { partnerNewsOn } from "@/lib/partner-news";
import { timeAgo } from "@/lib/social";
import { partnerOfTheMonth } from "@/lib/public-home";
import { SPONSORS, sponsorLabel } from "@/lib/sponsors";
import {
  PUBLIC_WORLDS,
  WORLD_HINT,
  WORLD_LABEL,
  WORLD_STORAGE_KEY,
  isVetrinaWorld,
  type VetrinaSlot,
  type VetrinaWorld,
} from "@/lib/vetrina";

import { HomeBoard } from "@/components/home/HomeBoard";
import { HomeMatchday } from "@/components/home/HomeMatchday";
import { ClubNoticeCard, UrgentNotices, WeekendResults } from "@/components/home/HomePractical";
import type { getPublicCalendarSnapshot } from "@/lib/calendar.functions";
import { calendarToWeekItems } from "@/lib/home-week";
import { hasHomeMatch, showLedwallOnHome } from "@/lib/ledwall-rotation";

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
              className="m-0 max-w-[18ch] font-uv text-[30px] uppercase leading-[0.95] lg:text-[40px]"
            >
              La tua squadra, i tuoi orari, le trasferte<span className="text-[#ffd600]">.</span>
            </h2>
            <p className="m-0 max-w-[46ch] text-[15.5px] leading-snug text-white/90 lg:text-[17px]">
              Entra nell'app del club: le gare della tua squadra, le
              convocazioni da vedere e la richiesta del posto in pulmino per
              le trasferte. Un solo account per la famiglia.
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
            {fixedWorld ? "In vetrina" : "Mondo Colico"}
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
export function HomeNewsBlock({ items, nowMs }: { items: readonly NewsItem[]; nowMs: number }) {
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

/* ---------------------------------------------------------------- page */

export function PublicHome({
  calendar,
  ledwallDay,
  feed = null,
  notice = null,
  vetrina,
  nowMs,
  today,
}: {
  calendar: PublicCalendar;
  /** Mixed news highlight of the day (getHomeNews); accepted for the route contract, not rendered since UD-132. */
  news?: readonly NewsItem[];
  /** Vetrina picks of the day (getVetrina): "Mondo Colico" of the board (VR-009), back on the home since 15/10. */
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
  const alerts = useMemo(() => urgentNotices(feed?.items ?? [], nowMs, false), [feed, nowMs]);
  const results = useMemo(() => weekendResults(feed, today), [feed, today]);
  // Board order (VR-009 screen 1, Francesco 15/10/2026 06:30): urgent → communication → "Questa settimana" hero with
  // Sky, four tiles, Prossima gara, Allenamenti + next event → I nostri sponsor (ONE partner band, LED wall) → "Mondo
  // Colico" (the rotating vetrina, asked again 13/10) → the full week of games (the calendar is only one block) with
  // the LED strip → results (only with a source) → join → credentials (once) → reduced footer.
  return (
    <main data-screen="home" data-variant="public" className="min-h-dvh bg-[#eef3f9] pb-6 font-sans text-[#0b1e3a]">
      <h1 className="sr-only">S.C.D. ColicoDerviese, il club di calcio di Colico e Dervio</h1>
      <UrgentNotices items={alerts} />
      <ClubNoticeCard notice={notice} />
      <HomeBoard calendar={calendar} nowMs={nowMs} today={today} />
      <PartnerBand day={ledDay} nowMs={nowMs} ledOnHome={ledOnHome} />
      {vetrina && <Vetrina worlds={vetrina} />}
      <div
        className={`${WRAP} grid gap-5 pt-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)] lg:items-start lg:gap-8 lg:pt-8`}
        data-testid="home-matchday-layout"
      >
        <HomeMatchday calendar={calendar} nowMs={nowMs} today={today} />
        <aside aria-label="LED wall del campo" className="min-w-0 lg:sticky lg:top-[calc(var(--pub-header-h,64px)+16px)] lg:pt-[52px]">
          <SponsorSpotsHome day={ledDay} compact />
        </aside>
      </div>
      <WeekendResults rows={results} />
      <JoinBanner />
      <CredentialBar />
    </main>
  );
}
