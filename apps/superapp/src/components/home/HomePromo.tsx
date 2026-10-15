/**
 * Top of the public home on the reference template Francesco pointed to (15/10/2026 10:05, Eurobet home): a rounded
 * banner carousel with a white offer card and one clear button, then a row of quick chips with small badges. Club
 * material only (lake photo, official crest, published posters), no betting, no money. Slides and chips come from
 * lib/home-promo.ts. The carousel moves every PROMO_SECONDS, stops on hover, focus and touch, has a pause button
 * (WCAG 2.2.2) and never moves with reduced motion; it is a native scroll-snap strip, so swipe works everywhere.
 */
import { Link } from "@tanstack/react-router";
import {
  Building2,
  CalendarDays,
  Handshake,
  Pause,
  Play,
  Trophy,
  UserPlus,
} from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { ClubCrestOfficial } from "@/components/SiteChrome";
import {
  PROMO_SECONDS,
  autoAdvance,
  nextIndex,
  type PromoSlide,
  type QuickChip,
} from "@/lib/home-promo";

const WRAP = "mx-auto w-full max-w-[1280px] px-4 lg:px-8";

function reducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return true;
  }
}

/* ------------------------------------------------------------ slide art */

/** A shaded football drawn here (no stock image): the "object of our world" of the reference scene. */
function HeroBall({ className }: { className?: string }) {
  const uid = useId();
  const sh = `hb-sh-${uid}`;
  const gl = `hb-gl-${uid}`;
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true">
      <defs>
        <radialGradient id={sh} cx="38%" cy="32%" r="68%">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.55" stopColor="#e9eef6" />
          <stop offset="1" stopColor="#8a97ad" />
        </radialGradient>
        <radialGradient id={gl} cx="50%" cy="50%" r="50%">
          <stop offset="0.8" stopColor="rgb(0 10 40 / 0)" />
          <stop offset="1" stopColor="rgb(0 10 40 / 0.35)" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="96" fill={`url(#${sh})`} />
      <g fill="#0b1e3a">
        <path d="m100 58 30 22-11 36H81L70 80z" />
        <path d="M100 58V22l-26 12z" opacity=".85" />
        <path d="m130 80 34-12 8 30-24 10z" opacity=".85" />
        <path d="m119 116 22 10-6 34-28-10z" opacity=".85" />
        <path d="m81 116-22 10 6 34 28-10z" opacity=".85" />
        <path d="m70 80-34-12-8 30 24 10z" opacity=".85" />
      </g>
      <circle cx="100" cy="100" r="96" fill={`url(#${gl})`} />
    </svg>
  );
}

function SlideArt({ art, first }: { art: PromoSlide["art"]; first: boolean }) {
  if (art.kind === "lake") {
    return (
      <>
        <img
          src="/media/scd/lario-header.webp"
          alt=""
          aria-hidden="true"
          decoding="async"
          {...(first ? { fetchPriority: "high" as const } : { loading: "lazy" as const })}
          className="absolute inset-0 size-full object-cover object-[center_60%]"
        />
        {/* Night-blue wash like the reference's textured ground, lighter where the card sits. */}
        <span
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(180deg,rgb(6_22_70/0.55),rgb(6_22_70/0.85))] lg:bg-[linear-gradient(90deg,rgb(6_22_70/0.35)_0%,rgb(6_22_70/0.75)_60%,rgb(6_22_70/0.9)_100%)]"
        />
        {/* Objects of our world: the ball peeking behind the card, the big headline on a brush stroke, the crest. */}
        <HeroBall className="absolute left-3 top-3 size-[96px] drop-shadow-[0_14px_20px_rgb(0_0_0/0.5)] lg:-left-6 lg:top-auto lg:-bottom-16 lg:size-[260px]" />
        <span
          aria-hidden="true"
          className="absolute right-3 top-3 grid justify-items-end text-right lg:right-[6%] lg:top-1/2 lg:-translate-y-1/2"
        >
          <span className="flex items-center gap-3 lg:gap-6">
            <span className="grid justify-items-end">
              <span className="scd-brush scd-brush--full font-uv text-[44px] uppercase leading-[0.9] text-[#0b1e3a] lg:text-[118px]">
                {art.big}
              </span>
              <span className="scd-motto mt-2 pr-1 text-[17px] text-[#ffe25a] drop-shadow-[0_2px_4px_rgb(0_0_0/0.6)] lg:mt-4 lg:text-[34px]">
                {art.small}
              </span>
            </span>
            <ClubCrestOfficial
              size={170}
              className="hidden drop-shadow-[0_14px_24px_rgb(0_0_0/0.55)] lg:block"
            />
          </span>
          <ClubCrestOfficial
            size={54}
            className="mt-2 drop-shadow-[0_6px_12px_rgb(0_0_0/0.5)] lg:hidden"
          />
        </span>
      </>
    );
  }
  if (art.kind === "poster") {
    return (
      <>
        <img
          src={art.src}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          className="absolute inset-0 size-full scale-125 object-cover opacity-45 blur-[18px]"
        />
        <span aria-hidden="true" className="absolute inset-0 bg-[#0b2a5b]/55" />
        <img
          src={art.src}
          alt={art.alt}
          loading="lazy"
          decoding="async"
          className="absolute inset-y-3 left-1/2 h-[calc(100%-24px)] w-auto -translate-x-1/2 rounded-[8px] object-contain shadow-[0_12px_30px_-8px_rgb(0_0_0/0.6)] lg:inset-y-6 lg:left-auto lg:right-[9%] lg:h-[calc(100%-48px)] lg:translate-x-0"
        />
      </>
    );
  }
  return (
    <>
      <span
        aria-hidden="true"
        className="absolute inset-0 bg-[#0b2a5b] bg-[repeating-linear-gradient(115deg,rgb(255_255_255/0.05)_0_22px,transparent_22px_44px)]"
      />
      <HeroBall className="absolute -left-8 -bottom-10 size-[110px] opacity-90 drop-shadow-[0_14px_20px_rgb(0_0_0/0.5)] lg:-bottom-14 lg:left-[46%] lg:size-[220px]" />
      <span
        aria-hidden="true"
        className="absolute inset-x-4 top-3 grid justify-items-end text-right lg:inset-x-auto lg:right-[8%] lg:top-1/2 lg:-translate-y-1/2"
      >
        <span className="scd-brush scd-brush--full font-uv text-[52px] uppercase leading-[0.9] tracking-[0.02em] text-[#0b1e3a] lg:text-[130px]">
          {art.big}
        </span>
        <span className="scd-motto mt-2 text-[15px] text-[#ffe25a] drop-shadow-[0_2px_4px_rgb(0_0_0/0.6)] lg:mt-4 lg:text-[30px]">
          {art.small}
        </span>
      </span>
    </>
  );
}

/* ---------------------------------------------------------------- slide */

function Slide({
  slide,
  n,
  total,
  active,
}: {
  slide: PromoSlide;
  n: number;
  total: number;
  active: boolean;
}) {
  return (
    <article
      aria-roledescription="slide"
      aria-label={`${n + 1} di ${total}: ${slide.title}`}
      aria-hidden={!active || undefined}
      className="relative flex h-full flex-col overflow-hidden rounded-[18px] bg-[#0b2a5b] shadow-[0_18px_40px_-20px_rgb(11_42_91/0.6)] lg:block lg:h-[420px]"
      data-slide={slide.id}
    >
      <div className="relative h-[190px] shrink-0 overflow-hidden lg:absolute lg:inset-0 lg:h-auto">
        <SlideArt art={slide.art} first={n === 0} />
      </div>
      <div className="relative z-[1] mx-3 -mt-12 mb-3 grid flex-1 content-start gap-1.5 rounded-[14px] bg-white p-4 shadow-[0_14px_30px_-14px_rgb(0_0_0/0.55)] lg:absolute lg:left-[4.5%] lg:top-1/2 lg:m-0 lg:w-[min(520px,44%)] lg:flex-none lg:-translate-y-1/2 lg:gap-3 lg:p-9">
        <span className="w-fit rounded-[5px] bg-[#1556c4] px-2 py-1 text-[10.5px] font-extrabold uppercase leading-none tracking-[0.08em] text-white">
          {slide.tag}
        </span>
        <h3 className="m-0 font-title text-[26px] font-black uppercase leading-[0.95] text-[#0b2a5b] lg:text-[40px]">
          {slide.title}
        </h3>
        <p className="m-0 line-clamp-2 text-[14px] leading-snug text-[#3e5272] lg:line-clamp-none lg:text-[17px]">
          {slide.text}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <Link
            to={slide.cta.to as never}
            tabIndex={active ? undefined : -1}
            className="scd-focus inline-flex h-11 items-center rounded-[8px] bg-[#ffd600] px-6 text-[15.5px] font-extrabold text-[#0b1e3a] shadow-[0_6px_14px_-6px_rgb(255_214_0/0.8)] transition-[filter] duration-150 hover:brightness-95 lg:h-12 lg:px-7 lg:text-[17px]"
          >
            {slide.cta.label}
          </Link>
          {slide.secondary && (
            <Link
              to={slide.secondary.to as never}
              tabIndex={active ? undefined : -1}
              className="scd-focus inline-flex h-11 items-center rounded-[8px] px-3 text-[15px] font-bold text-[#1556c4] underline-offset-4 hover:underline lg:h-12"
            >
              {slide.secondary.label}
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------- carousel */

export function PromoCarousel({ slides }: { slides: readonly PromoSlide[] }) {
  const track = useRef<HTMLUListElement>(null);
  const [index, setIndex] = useState(0);
  const [hold, setHold] = useState(false);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(true);
  useEffect(() => setReduced(reducedMotion()), []);

  const go = useCallback((i: number) => {
    const el = track.current;
    if (!el) return;
    const reduce = reducedMotion();
    el.scrollTo({ left: i * el.clientWidth, behavior: reduce ? "auto" : "smooth" });
  }, []);

  // The visible slide follows the scroll position (swipe, buttons or the timer).
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const onScroll = () => {
      const w = el.clientWidth || 1;
      setIndex(Math.max(0, Math.min(slides.length - 1, Math.round(el.scrollLeft / w))));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [slides.length]);

  useEffect(() => {
    if (!autoAdvance({ reduced, paused, hold, length: slides.length })) return;
    const id = window.setTimeout(
      () => go(nextIndex(index, slides.length)),
      PROMO_SECONDS * 1000,
    );
    return () => window.clearTimeout(id);
  }, [index, reduced, paused, hold, slides.length, go]);

  if (slides.length === 0) return null;
  return (
    <section
      aria-roledescription="carosello"
      aria-label="In primo piano"
      className={`${WRAP} pt-3 lg:pt-6`}
      data-testid="home-promo"
      onPointerEnter={() => setHold(true)}
      onPointerLeave={() => setHold(false)}
      onFocusCapture={() => setHold(true)}
      onBlurCapture={() => setHold(false)}
      onTouchStart={() => setHold(true)}
    >
      <h2 className="sr-only">In primo piano</h2>
      <ul
        ref={track}
        className="m-0 flex list-none snap-x snap-mandatory overflow-x-auto p-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-live={paused || reduced ? "polite" : "off"}
      >
        {slides.map((s, n) => (
          <li key={s.id} className="w-full shrink-0 snap-start snap-always">
            <Slide slide={s} n={n} total={slides.length} active={n === index} />
          </li>
        ))}
      </ul>
      {slides.length > 1 && (
        <div className="flex items-center justify-center pt-1">
          {slides.map((s, n) => (
            <button
              key={s.id}
              type="button"
              onClick={() => go(n)}
              aria-label={`Vai a: ${s.title}`}
              aria-current={n === index || undefined}
              className="scd-focus grid size-11 place-items-center rounded-full"
            >
              <span
                className={`block h-2 rounded-full transition-[width,background-color] duration-300 ${n === index ? "w-6 bg-[#1556c4]" : "w-2 bg-[#b9c7dc]"}`}
              />
            </button>
          ))}
          {!reduced && (
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              aria-label={paused ? "Riprendi lo scorrimento" : "Ferma lo scorrimento"}
              className="scd-focus grid size-11 place-items-center rounded-full text-[#0b2a5b] hover:bg-white"
            >
              {paused ? (
                <Play className="size-4" aria-hidden="true" />
              ) : (
                <Pause className="size-4" aria-hidden="true" />
              )}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

/* ---------------------------------------------------------------- chips */

type ChipIcon = (p: { className?: string; style?: React.CSSProperties; "aria-hidden"?: boolean | "true" }) => React.ReactNode;

/** Football (no football in the icon set): the same ball drawn on the board tiles. */
const FootballIcon: ChipIcon = ({ className, style }) => (
  <svg viewBox="0 0 32 32" className={className} style={style} aria-hidden="true">
    <circle cx="16" cy="16" r="13" fill="#fff" stroke="currentColor" strokeWidth="2.4" />
    <path d="m16 9.5 5.5 4-2 6.5h-7l-2-6.5z" fill="currentColor" />
    <path d="M16 9.5V3.5M21.5 13.5l5.5-2M19.5 20l3.5 5M12.5 20 9 25M10.5 13.5l-5.5-2" stroke="currentColor" strokeWidth="2" />
  </svg>
);

const CHIP_ICON: Readonly<Record<string, { icon: ChipIcon; tint: string }>> = {
  gare: { icon: FootballIcon, tint: "#0b2a5b" },
  eventi: { icon: CalendarDays, tint: "#c98a00" },
  tornei: { icon: Trophy, tint: "#c98a00" },
  iscrizioni: { icon: UserPlus, tint: "#1556c4" },
  impianti: { icon: Building2, tint: "#0b2a5b" },
  sponsor: { icon: Handshake, tint: "#1556c4" },
};

function ChipBadge({ badge }: { badge: NonNullable<QuickChip["badge"]> }) {
  const base =
    "absolute -right-1 -top-2 rounded-[5px] px-1.5 py-[3px] text-[10px] font-extrabold uppercase leading-none tracking-[0.04em]";
  return <span className={`${base} bg-[#e11d2e] text-white`}>Live</span>;
}

export function QuickChips({ chips }: { chips: readonly QuickChip[] }) {
  return (
    <nav aria-label="Vai a" className={`${WRAP} pt-3`} data-testid="home-chips">
      <ul className="-mx-4 m-0 flex list-none gap-2 overflow-x-auto px-4 pb-1 pt-2 [scrollbar-width:none] lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden">
        {chips.map((c) => {
          const meta = CHIP_ICON[c.id] ?? { icon: FootballIcon, tint: "#0b2a5b" };
          const Icon = meta.icon;
          const extra = c.badge?.kind === "live" ? ", gara in corso" : "";
          return (
            <li key={c.id} className="shrink-0">
              <Link
                to={c.to as never}
                aria-label={`${c.label}${extra}`}
                data-testid={`chip-${c.id}`}
                className="scd-focus relative inline-flex h-11 items-center gap-2 rounded-[10px] border border-[#d5dfec] bg-white px-3.5 text-[14.5px] font-semibold text-[#0b1e3a] shadow-[0_1px_2px_rgb(11_42_91/0.06)] transition-colors duration-150 hover:border-[#1556c4]"
              >
                <Icon
                  className="size-[18px]"
                  style={{ color: meta.tint }}
                  aria-hidden="true"
                />
                {c.label}
                {c.badge && <ChipBadge badge={c.badge} />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
