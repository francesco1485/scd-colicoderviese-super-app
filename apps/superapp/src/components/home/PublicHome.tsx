/**
 * Signed-out public home v4 (UD-100, brief "Public home v4", Direzione 13/10/2026).
 *
 * Creative, communicative, commercial: club identity, events, news, games, partners and joining. Structure taken
 * from the Eurobet web homepage as a LAYOUT reference only (strip → editorial carousel → CTA banner → trust
 * carousel → content of the week → partners → link accordions → footer); no betting content of any kind.
 * Teams, rosters, fixtures and team calendars are not here: they live inside after sign-in.
 * Palette: navy #0b2a5b, blue #1556c4, light #eef3f9, white; yellow #ffd600 only for accents and the main CTA.
 * Real assets only (public/media); our age-group crests never appear; no minor is named.
 */
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Gamepad2,
  GraduationCap,
  Handshake,
  HeartHandshake,
  Lock,
  MapPin,
  Newspaper,
  Pause,
  Phone,
  Play,
  Shield,
  Smartphone,
  Star,
  Ticket,
  Trophy,
  Video,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { ClubCrestOfficial } from "@/components/SiteChrome";
import { KitTexture } from "@/components/scd/kit-texture";
import { ClubCredentials, LogoTile, SponsorLogo } from "@/components/scd/Logos";
import { openCookiePrefs } from "@/components/CookieConsent";
import { SPONSOR_PACKAGES } from "@/lib/catalog";
import { CLUB_EVENTS } from "@/lib/club-events";
import type { PressItem } from "@/lib/press";
import {
  FEATURES,
  LINK_GROUPS,
  QUICK_LINKS,
  kickoffClock,
  matchdayLabel,
  partnerOfTheMonth,
  trustFacts,
  verifiedSponsors,
  type FeatureCard,
  type PublicIcon,
  type PublicLink,
} from "@/lib/public-home";
import { timeAgo } from "@/lib/social";
import { SPONSORS, sponsorLabel } from "@/lib/sponsors";

import { Carousel } from "./Carousel";
import { sides } from "./match-sides";
import { WeekGames, venueShort } from "@/components/home/HomeSections";
import { venueCase } from "@/lib/board-data";
import { OpponentCrest } from "@/lib/crests";
import { publicTeamCrest } from "@/lib/team-crest";
import { addDays } from "@/lib/board-data";
import type { getPublicCalendarSnapshot } from "@/lib/calendar.functions";
import { calendarToWeekItems, type WeekItem } from "@/lib/home-week";
import { itemState, orderTeams, startMs, type Team } from "@/lib/universe";

type PublicCalendar = Awaited<ReturnType<typeof getPublicCalendarSnapshot>>;

const ICONS: Readonly<Record<PublicIcon, LucideIcon>> = {
  trophy: Trophy,
  handshake: Handshake,
  clipboard: ClipboardList,
  newspaper: Newspaper,
  video: Video,
  gamepad: Gamepad2,
  star: Star,
  ticket: Ticket,
  calendar: CalendarDays,
  phone: Phone,
  shield: Shield,
  badge: BadgeCheck,
  map: MapPin,
  heart: HeartHandshake,
  whistle: GraduationCap,
  smartphone: Smartphone,
  building: Building2,
};

const WRAP = "mx-auto w-full max-w-[1280px] px-4 lg:px-8";

/** Internal link from the content model (route + optional search/hash). */
function To({
  link,
  className,
  children,
  ...rest
}: {
  link: PublicLink;
  className?: string;
  children: ReactNode;
} & Record<string, unknown>) {
  return (
    <Link
      to={link.to as never}
      search={link.search as never}
      {...(link.hash ? { hash: link.hash } : {})}
      className={className}
      {...rest}
    >
      {children}
    </Link>
  );
}

/* --------------------------------------------------------- quick strip */

function QuickStrip() {
  return (
    <nav
      aria-label="In evidenza"
      className="border-b border-[#dbe5f1] bg-white"
      data-testid="quick-strip"
    >
      <ul
        className={`${WRAP} m-0 flex list-none gap-1 overflow-x-auto py-1 lg:py-2 [mask-image:linear-gradient(90deg,#000_82%,transparent)] [scrollbar-width:none] lg:justify-between lg:[mask-image:none] lg:gap-0 lg:overflow-visible [&::-webkit-scrollbar]:hidden`}
      >
        {QUICK_LINKS.map((q) => {
          const Icon = ICONS[q.icon];
          return (
            <li key={q.label} className="shrink-0 lg:flex-1">
              <To
                link={q}
                className="scd-focus group relative flex h-[54px] min-w-[84px] lg:h-[62px] flex-col items-center justify-center gap-1 rounded-[12px] px-2 text-center text-[#0b2a5b] transition-colors duration-150 hover:bg-[#eef3f9]"
              >
                <Icon
                  className="size-[22px] text-[#1556c4]"
                  strokeWidth={1.8}
                  aria-hidden="true"
                />
                <span className="whitespace-nowrap text-[12.5px] font-semibold leading-none">
                  {q.label}
                </span>
                {q.badge && (
                  <span
                    className={`absolute right-1.5 top-1 rounded-full px-1.5 py-[2px] text-[9.5px] font-extrabold uppercase leading-none tracking-[0.06em] ${q.badge === "nuovo" ? "bg-[#ffd600] text-[#0b1e3a]" : "bg-[#1556c4] text-white"}`}
                  >
                    {q.badge === "nuovo" ? "Nuovo" : "Top"}
                  </span>
                )}
              </To>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/* ------------------------------------------------- credential bar */

/**
 * The club's credentials high on the home (Direzione 13/10/2026 15:31 and 15:55): three distinct labelled items in
 * order of importance (Club Giovanile di 3° livello FIGC SGS, iscritta FIGC con LND Lombardia, affiliata AC
 * Monza), official marks only, slim white bar with hairline dividers under the quick strip.
 */
function CredentialBar() {
  return (
    <section
      aria-label="Riconoscimenti e affiliazioni del club"
      className="border-b border-[#dbe5f1] bg-white"
      data-testid="affiliation-strip"
    >
      <div className={`${WRAP} py-2 [--logo-k:1] lg:py-2.5 lg:[--logo-k:1.2]`}>
        <ClubCredentials variant="bar" className="mx-auto max-w-[1040px]" />
      </div>
    </section>
  );
}

/* ---------------------------------------------------- editorial cards */

function SponsorMosaic() {
  const logos = verifiedSponsors().slice(0, 6);
  return (
    <div className="grid size-full grid-cols-3 grid-rows-2 gap-1.5 bg-[#eef3f9] p-2.5">
      {logos.map((s) => (
        <span
          key={s.slug}
          className="grid place-items-center rounded-[8px] bg-white p-1.5"
        >
          <SponsorLogo
            sponsor={s}
            box={{ w: 76, h: 30 }}
            decorative
            mono={false}
          />
        </span>
      ))}
    </div>
  );
}

function FeatureVisualView({ card }: { card: FeatureCard }) {
  const v = card.visual;
  if (v.kind === "sponsors") return <SponsorMosaic />;
  if (v.kind === "type")
    return (
      <div className="relative size-full overflow-hidden bg-[radial-gradient(120%_120%_at_90%_10%,#1556c4_0%,#0b2a5b_58%)]">
        <span
          aria-hidden="true"
          className={`absolute -bottom-6 right-3 font-uv leading-none text-[#ffd600] ${v.big.length > 3 ? "text-[110px]" : "text-[150px]"}`}
        >
          {v.big}
        </span>
        <span className="absolute left-4 top-4 max-w-[60%] font-uv text-[22px] uppercase leading-[0.95] text-white">
          {v.small}
        </span>
      </div>
    );
  return (
    <img
      src={v.src}
      alt={v.alt}
      loading="lazy"
      decoding="async"
      style={{ objectPosition: v.position }}
      className={`size-full ${v.fit === "contain" ? "bg-white object-contain p-6" : "object-cover"}`}
    />
  );
}

function FeatureCardView({ card }: { card: FeatureCard }) {
  return (
    <To
      link={card}
      className="scd-focus scd-lift group flex w-full flex-col overflow-hidden rounded-[16px] bg-white shadow-[0_1px_2px_rgb(11_42_91/0.06),0_8px_24px_-12px_rgb(11_42_91/0.25)] hover:shadow-[0_1px_2px_rgb(11_42_91/0.08),0_14px_30px_-12px_rgb(11_42_91/0.35)]"
    >
      <span className="relative block aspect-[274/170] w-full overflow-hidden border-b border-[#e6edf6]">
        <span className="scd-zoom block size-full">
          <FeatureVisualView card={card} />
        </span>
        {card.badge && (
          <span className="absolute left-3 top-3 rounded-full bg-[#ffd600] px-2.5 py-1 text-[11px] font-extrabold uppercase leading-none tracking-[0.06em] text-[#0b1e3a]">
            {card.badge}
          </span>
        )}
      </span>
      <span className="flex flex-1 flex-col gap-1 px-4 pb-4 pt-3">
        <span className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-[#1556c4]">
          {card.kicker}
        </span>
        <span className="text-[18px] font-bold leading-tight text-[#0b1e3a]">
          {card.title}
        </span>
        <span className="text-[14px] leading-snug text-[#4a5d7a]">
          {card.text}
        </span>
        <span className="mt-auto inline-flex items-center gap-1 pt-2 text-[14px] font-semibold text-[#1556c4]">
          Scopri
          <ArrowRight
            className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </span>
      </span>
    </To>
  );
}

const CARD_BASIS =
  "basis-[80%] sm:basis-[calc((100%-16px)/2)] md:basis-[calc((100%-32px)/3)] lg:basis-[calc((100%-48px)/4)]";

function Featured() {
  return (
    <div className={`${WRAP} pt-6 lg:pt-8`} data-testid="featured">
      <Carousel
        title="In primo piano"
        titleId="primo-piano-t"
        label="Contenuti in primo piano"
        itemClass={CARD_BASIS}
      >
        {FEATURES.map((c) => (
          <FeatureCardView key={c.id} card={c} />
        ))}
      </Carousel>
    </div>
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

/* --------------------------------------------------------- trust cards */

function Trust() {
  const facts = trustFacts(SPONSORS.length);
  return (
    <div className="mt-8 border-y border-[#dbe5f1] bg-white py-8 lg:mt-12 lg:py-10">
      <div className={WRAP} data-testid="trust">
        <Carousel
          title="Perché la ColicoDerviese"
          titleId="perche-t"
          label="Perché scegliere la ColicoDerviese"
          itemClass={CARD_BASIS}
        >
          {facts.map((f) => {
            const Icon = ICONS[f.icon];
            return (
              <To
                key={f.title}
                link={f}
                className="scd-focus scd-lift group flex w-full flex-col gap-3 rounded-[16px] border border-[#dfe8f3] bg-[#f7f9fc] p-5 hover:border-[#b9cde6] hover:bg-white"
              >
                <span className="grid size-11 place-items-center rounded-full bg-[#0b2a5b] text-[#ffd600]">
                  <Icon
                    className="size-[22px]"
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                </span>
                <span className="text-[15px] font-extrabold uppercase leading-tight tracking-[0.04em] text-[#0b2a5b]">
                  {f.title}
                </span>
                <span className="text-[14px] leading-snug text-[#4a5d7a]">
                  {f.text}
                </span>
              </To>
            );
          })}
        </Carousel>
      </div>
    </div>
  );
}

/* ---------------------------------------------------- this week's news */

const WEEK_FALLBACK = [
  {
    to: "/comunicazioni",
    icon: Newspaper,
    title: "Comunicazioni del club",
    text: "Avvisi e novità della società, aggiornati dalla segreteria.",
  },
  {
    to: "/top11",
    icon: Star,
    title: "Top 11 della settimana",
    text: "Vota i migliori in campo: si premia ogni mese in club house.",
  },
  {
    to: "/fantacalcio",
    icon: Gamepad2,
    title: "Fantacalcio SCD",
    text: "Scegli i tuoi 11 tra i giocatori del club, gratis.",
  },
] as const;

function WeekNews({
  press,
  nowMs,
  today,
}: {
  press: readonly PressItem[];
  nowMs: number;
  today: string;
}) {
  const event = CLUB_EVENTS.find((e) => e.date >= today) ?? null;
  const items = press.slice(0, 4);
  return (
    <section
      aria-labelledby="club-settimana-t"
      className={`${WRAP} pt-8 lg:pt-12`}
      data-testid="week-news"
    >
      <div className="flex items-end justify-between gap-3 pb-3">
        <h2
          id="club-settimana-t"
          className="scd-reveal m-0 font-uv text-[24px] uppercase leading-none text-[#0b2a5b] sm:text-[26px] lg:text-[30px]"
        >
          Questa settimana nel club
        </h2>
        <Link
          to="/rassegna"
          className="scd-focus inline-flex min-h-11 shrink-0 items-center gap-0.5 rounded-md text-[14px] font-semibold text-[#1556c4]"
        >
          Tutte<span className="max-sm:hidden">&nbsp;le notizie</span>
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {event && (
          <Link
            to={event.href as never}
            className="scd-focus scd-lift group grid grid-cols-[112px_minmax(0,1fr)] overflow-hidden rounded-[16px] bg-[#0b2a5b] text-white shadow-[0_8px_24px_-12px_rgb(11_42_91/0.45)] sm:grid-cols-[160px_minmax(0,1fr)] lg:grid-cols-[200px_minmax(0,1fr)]"
          >
            <img
              src={event.image}
              alt={`Locandina ${event.title}`}
              loading="lazy"
              decoding="async"
              className="h-full min-h-[150px] w-full object-cover object-top"
            />
            <span className="flex flex-col gap-1.5 p-4 lg:p-5">
              <span className="w-fit rounded-full bg-[#ffd600] px-2 py-[3px] text-[10.5px] font-extrabold uppercase leading-none tracking-[0.06em] text-[#0b1e3a]">
                Evento · {event.when}
              </span>
              <span className="font-uv text-[26px] uppercase leading-[0.95] lg:text-[32px]">
                {event.title}
              </span>
              <span className="text-[14px] leading-snug text-white/85">
                {event.text}
              </span>
              <span className="mt-auto inline-flex items-center gap-1 pt-1 text-[14px] font-semibold text-[#ffd600]">
                Programma e iscrizioni
                <ArrowRight
                  className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </span>
            </span>
          </Link>
        )}
        <div className="overflow-hidden rounded-[16px] bg-white shadow-[0_1px_2px_rgb(11_42_91/0.06),0_8px_24px_-12px_rgb(11_42_91/0.25)]">
          {items.length > 0 ? (
            <ul className="m-0 list-none divide-y divide-[#e6edf6] p-0">
              {items.map((p) => (
                <li key={p.url}>
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="scd-focus group flex items-start gap-3 px-4 py-3.5 hover:bg-[#f4f7fb]"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-[#e6eefa] text-[#1556c4]">
                      <Newspaper className="size-[18px]" aria-hidden="true" />
                    </span>
                    <span className="grid min-w-0 flex-1 gap-0.5">
                      <span className="text-[12px] font-semibold uppercase tracking-[0.05em] text-[#5a6b85]">
                        {p.source}
                        {p.publishedAt
                          ? ` · ${timeAgo(p.publishedAt, nowMs)}`
                          : ""}
                      </span>
                      <span className="line-clamp-2 text-[15px] font-semibold leading-snug text-[#0b1e3a] group-hover:underline">
                        {p.title}
                      </span>
                    </span>
                    <ArrowUpRight
                      className="mt-1 size-4 shrink-0 text-[#9fb0c8]"
                      aria-hidden="true"
                    />
                    <span className="sr-only">
                      (apre il sito della testata)
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="m-0 list-none divide-y divide-[#e6edf6] p-0">
              {WEEK_FALLBACK.map((w) => (
                <li key={w.to}>
                  <Link
                    to={w.to}
                    className="scd-focus flex items-center gap-3 px-4 py-4 hover:bg-[#f4f7fb]"
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-[10px] bg-[#e6eefa] text-[#1556c4]">
                      <w.icon className="size-5" aria-hidden="true" />
                    </span>
                    <span className="grid min-w-0 flex-1 gap-0.5">
                      <b className="text-[15.5px] leading-tight text-[#0b1e3a]">
                        {w.title}
                      </b>
                      <span className="text-[13.5px] leading-snug text-[#4a5d7a]">
                        {w.text}
                      </span>
                    </span>
                    <ChevronRight
                      className="size-5 shrink-0 text-[#9fb0c8]"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- partners */

const monthName = (day: string) =>
  new Intl.DateTimeFormat("it-IT", { timeZone: "UTC", month: "long" }).format(
    new Date(`${day.slice(0, 7)}-15T12:00:00Z`),
  );

const PACKAGE_IDS = ["main", "naming", "team", "digital"];

function Partners({ today }: { today: string }) {
  const verified = verifiedSponsors();
  const logos = verified.slice(0, 18);
  const showcase = partnerOfTheMonth(today);
  const shownPackages = PACKAGE_IDS.map((id) =>
    SPONSOR_PACKAGES.find((p) => p.id === id),
  ).filter((p): p is (typeof SPONSOR_PACKAGES)[number] => !!p);
  return (
    <section
      aria-labelledby="partner-t"
      className={`${WRAP} pt-8 lg:pt-12`}
      data-testid="partners"
    >
      <div className="flex items-end justify-between gap-3 pb-3">
        <h2
          id="partner-t"
          className="scd-reveal m-0 font-uv text-[24px] uppercase leading-none text-[#0b2a5b] sm:text-[26px] lg:text-[30px]"
        >
          Partner e sponsor
        </h2>
        <Link
          to="/sponsor"
          className="scd-focus inline-flex min-h-11 shrink-0 items-center gap-0.5 rounded-md text-[14px] font-semibold text-[#1556c4]"
        >
          Tutti i {SPONSORS.length} partner
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="flex flex-col gap-4 rounded-[16px] bg-white p-4 shadow-[0_1px_2px_rgb(11_42_91/0.06),0_8px_24px_-12px_rgb(11_42_91/0.25)] lg:p-5">
          <p className="m-0 text-[14px] leading-snug text-[#4a5d7a]">
            Le aziende che sostengono la stagione 2026/27 della ColicoDerviese.
          </p>
          <ul className="m-0 grid list-none grid-cols-3 gap-2 p-0 sm:grid-cols-4 lg:grid-cols-6">
            {logos.map((s, i) => (
              <li
                key={s.slug}
                className={i >= 12 ? "max-lg:hidden" : undefined}
              >
                <LogoTile className="h-[68px] px-2">
                  <SponsorLogo sponsor={s} box={{ w: 92, h: 38 }} />
                </LogoTile>
              </li>
            ))}
          </ul>
          {showcase && (
            <div className="mt-auto flex items-center gap-3.5 rounded-[12px] bg-[#eef3f9] p-3">
              <LogoTile className="h-[56px] w-[88px] shrink-0">
                <SponsorLogo
                  sponsor={showcase}
                  box={{ w: 72, h: 40 }}
                  decorative
                  mono={false}
                />
              </LogoTile>
              <span className="grid min-w-0 gap-0.5">
                <span className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-[#1556c4]">
                  In vetrina a {monthName(today)}
                </span>
                <b className="text-[16px] leading-tight text-[#0b1e3a]">
                  {sponsorLabel(showcase)}
                </b>
              </span>
            </div>
          )}
        </div>
        <div
          className="relative isolate flex flex-col gap-4 overflow-hidden rounded-[16px] bg-[#0b2a5b] p-5 text-white lg:p-6"
          data-testid="become-partner"
        >
          <span
            aria-hidden="true"
            className="absolute -right-16 -top-16 -z-10 size-56 rounded-full bg-[#1556c4]/45 blur-2xl"
          />
          <div className="grid gap-1.5">
            <span className="w-fit rounded-full bg-[#ffd600] px-2.5 py-1 text-[11px] font-extrabold uppercase leading-none tracking-[0.06em] text-[#0b1e3a]">
              Diventa partner
            </span>
            <h3 className="m-0 font-uv text-[30px] uppercase leading-[0.95] lg:text-[36px]">
              Il tuo marchio sul campo
            </h3>
            <p className="m-0 text-[14.5px] leading-snug text-white/85">
              LED a bordo campo, divise, eventi e app: famiglie e tifosi di
              Colico e Dervio, ogni settimana.
            </p>
          </div>
          <ul className="m-0 grid list-none gap-2.5 p-0">
            {shownPackages.map((p) => (
              <li key={p.id} className="flex gap-2.5">
                <Check
                  className="mt-[3px] size-[18px] shrink-0 text-[#ffd600]"
                  strokeWidth={2.4}
                  aria-hidden="true"
                />
                <span className="text-[14.5px] leading-snug">
                  <b className="font-semibold">{p.nome}</b>
                  <span className="text-white/80"> · {p.pitch}</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-auto flex flex-wrap items-center gap-2.5 pt-1">
            <Link
              to="/sponsor"
              hash="proposta"
              className="scd-focus inline-flex h-12 items-center gap-2 rounded-[12px] bg-[#ffd600] px-5 text-[15.5px] font-bold text-[#0b1e3a] transition-[filter] duration-150 hover:brightness-95"
            >
              Richiedi una proposta
              <ArrowRight className="size-[18px]" aria-hidden="true" />
            </Link>
            <Link
              to="/contatti"
              className="scd-focus inline-flex h-12 items-center rounded-[12px] px-3 text-[15px] font-semibold text-white underline decoration-white/40 underline-offset-4 hover:decoration-white"
            >
              Parla con noi
            </Link>
          </div>
          <p className="m-0 text-[12.5px] text-white/65">
            Proposte su misura, nessun pagamento online.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------- link accordions */

function LinkGroups() {
  return (
    <section
      aria-labelledby="tutto-t"
      className={`${WRAP} pb-4 pt-8 lg:pt-12`}
      data-testid="link-groups"
    >
      <h2
        id="tutto-t"
        className="scd-reveal m-0 pb-3 font-uv text-[24px] uppercase leading-none text-[#0b2a5b] sm:text-[26px] lg:text-[30px]"
      >
        Tutto sul club
      </h2>
      <div className="grid gap-2.5 md:grid-cols-2 lg:grid-cols-3 lg:items-start">
        {LINK_GROUPS.map((g) => (
          <details
            key={g.id}
            className="group rounded-[14px] border border-[#dbe5f1] bg-white open:shadow-[0_8px_24px_-14px_rgb(11_42_91/0.3)]"
          >
            <summary className="scd-focus flex min-h-[52px] cursor-pointer list-none items-center justify-between gap-3 rounded-[14px] px-4 text-[15.5px] font-bold text-[#0b2a5b] [&::-webkit-details-marker]:hidden">
              {g.title}
              <ChevronDown
                className="size-5 shrink-0 text-[#1556c4] transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
                aria-hidden="true"
              />
            </summary>
            <ul className="m-0 grid list-none gap-0.5 px-2 pb-3 pt-0">
              {g.items.map((it) => (
                <li key={it.label}>
                  <To
                    link={it}
                    className="scd-focus flex min-h-11 items-center justify-between gap-2 rounded-[10px] px-2 text-[15px] text-[#24385a] hover:bg-[#eef3f9]"
                  >
                    <span>{it.label}</span>
                    {it.reserved ? (
                      <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#5a6b85]">
                        <Lock className="size-3.5" aria-hidden="true" />
                        riservata
                      </span>
                    ) : (
                      <ChevronRight
                        className="size-4 text-[#9fb0c8]"
                        aria-hidden="true"
                      />
                    )}
                  </To>
                </li>
              ))}
              {g.id === "app" && (
                <li>
                  <button
                    type="button"
                    onClick={openCookiePrefs}
                    className="scd-focus flex min-h-11 w-full items-center justify-between gap-2 rounded-[10px] px-2 text-left text-[15px] text-[#24385a] hover:bg-[#eef3f9]"
                  >
                    Preferenze cookie
                    <ChevronRight
                      className="size-4 text-[#9fb0c8]"
                      aria-hidden="true"
                    />
                  </button>
                </li>
              )}
            </ul>
          </details>
        ))}
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

/* ------------------------------------------------------ partner ticker */

/** Pitch-side LED board: verified partners scroll by; pausable (WCAG 2.2.2), static with reduced motion. */
function PartnerTicker() {
  const logos = verifiedSponsors();
  const [paused, setPaused] = useState(false);
  if (logos.length < 4) return null;
  const row = (copy: boolean) => (
    <ul
      aria-hidden={copy || undefined}
      className={`m-0 flex list-none gap-3 p-0 pr-3 ${copy ? "scd-marquee-copy" : ""}`}
    >
      {logos.map((s) => (
        <li key={s.slug} className="shrink-0">
          <LogoTile className="h-[52px] w-[120px] border-white/0 shadow-[inset_0_-2px_0_rgb(11_42_91/0.08),0_1px_0_rgb(255_255_255/0.35)] lg:h-[58px] lg:w-[132px]">
            <SponsorLogo
              sponsor={s}
              box={{ w: 104, h: 36 }}
              decorative={copy}
              mono={false}
            />
          </LogoTile>
        </li>
      ))}
    </ul>
  );
  return (
    <section
      aria-label="Partner della stagione 2026/27"
      className="scd-ledband mt-8 border-y-2 border-[#ffd600] py-3 lg:mt-12"
      data-testid="partner-ticker"
    >
      <div className={`${WRAP} flex items-center gap-3 lg:gap-5`}>
        <Link
          to="/sponsor"
          className="scd-focus shrink-0 rounded-md font-uv text-[17px] uppercase leading-[0.95] text-white max-sm:hidden lg:text-[20px]"
        >
          Partner
          <br />
          <span className="text-[#ffd600]">2026/27</span>
        </Link>
        <div
          className="scd-marquee relative min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_5%,#000_95%,transparent)]"
          data-paused={paused ? "true" : "false"}
        >
          <div className="scd-marquee-track">
            {row(false)}
            {row(true)}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-pressed={paused}
          aria-label={
            paused
              ? "Riprendi lo scorrimento dei partner"
              : "Metti in pausa lo scorrimento dei partner"
          }
          className="scd-focus scd-marquee-btn grid size-11 shrink-0 place-items-center rounded-full border border-white/35 text-white transition-colors duration-150 hover:bg-white/10"
        >
          {paused ? (
            <Play className="size-4" aria-hidden="true" />
          ) : (
            <Pause className="size-4" aria-hidden="true" />
          )}
        </button>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- page */

/** Games of the next 7 days of every team (official calendar snapshot): always on the public home. */
function PublicWeek({
  calendar,
  nowMs,
  today,
}: {
  calendar: PublicCalendar;
  nowMs: number;
  today: string;
}) {
  const teams = useMemo(
    () => new Map(orderTeams(calendar.groups).map((t) => [t.id, t])),
    [calendar.groups],
  );
  const lastDay = addDays(today, 6);
  const items = useMemo(
    () =>
      calendarToWeekItems(calendar.events, calendar.groups)
        .filter(
          (i) =>
            i.kind === "Gara" &&
            i.date >= today &&
            i.date <= lastDay &&
            itemState(i, nowMs) !== "done",
        )
        .sort((a, b) =>
          (a.date + (a.time || "99:99")).localeCompare(
            b.date + (b.time || "99:99"),
          ),
        ),
    [calendar, today, lastDay, nowMs],
  );
  const highlight =
    items.find((g) => itemState(g, nowMs) === "live") ?? items[0] ?? null;
  if (items.length === 0) return null;
  return (
    <div className="mx-auto max-w-[1280px] px-4 pt-5 sm:px-6 lg:px-8">
      <WeekGames
        items={items}
        teamOf={(i: WeekItem) => teams.get(i.group)}
        highlightId={highlight?.id ?? null}
        nowMs={nowMs}
        lead={
          highlight ? (
            <Matchday
              item={highlight}
              team={teams.get(highlight.group)}
              serverNow={nowMs}
              today={today}
            />
          ) : undefined
        }
      />
    </div>
  );
}

export function PublicHome({
  press,
  calendar,
  nowMs,
  today,
}: {
  press: readonly PressItem[];
  calendar: PublicCalendar;
  nowMs: number;
  today: string;
}) {
  return (
    <main
      data-screen="home"
      data-variant="public"
      className="min-h-dvh bg-[#eef3f9] pb-6 font-sans text-[#0b1e3a]"
    >
      <h1 className="sr-only">
        S.C.D. ColicoDerviese, il club di calcio di Colico e Dervio
      </h1>
      <QuickStrip />
      <CredentialBar />
      <PublicWeek calendar={calendar} nowMs={nowMs} today={today} />
      <Featured />
      <PartnerTicker />
      <JoinBanner />
      <Trust />
      <WeekNews press={press} nowMs={nowMs} today={today} />
      <Partners today={today} />
      <LinkGroups />
    </main>
  );
}
