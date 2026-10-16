/**
 * Promo band at the bottom of the public home (Francesco 16/10/2026 21:43, UD-143). The promos of the day come from
 * lib/home-promos (sponsor call, Sky in the official match kit every second day, "Sostieni i nostri colori",
 * announced convenzioni). One promo at a time; it moves every 8 s only while nobody is interacting: stops on hover,
 * on focus, with the pause button, when the tab is hidden and always with reduced motion.
 * Official artwork only: sponsor logos from lib/sponsors (never redrawn), Sky = sky-atv-cut.webp (official mascot
 * cutout in the match kit), kit = official render.
 */
import { Link } from "@tanstack/react-router";
import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { useEffect, useState } from "react";

import { LogoTile, SponsorLogo } from "@/components/scd/Logos";
import { nextIndex } from "@/components/home/HomeSlides";
import { TONES } from "@/components/home/tones";
import { promosForDay, sponsorWindow, type Promo } from "@/lib/home-promos";
import { sponsorLabel } from "@/lib/sponsors";

const ADVANCE_MS = 8000;
const SKY_SRC = "/media/brand/sky-atv-cut.webp";
const KIT_SRC = "/media/kit/kit-2026-27-blu.webp";
const CTA =
  "scd-focus inline-flex min-h-11 items-center gap-1.5 rounded-[10px] px-4 font-display text-[15px] font-semibold";
const GHOST =
  "scd-focus inline-flex min-h-11 items-center rounded-[10px] px-3 font-display text-[15px] font-semibold underline-offset-4 hover:underline";

function Visual({ p, day }: { p: Promo; day: string }) {
  if (p.kind === "sky")
    return (
      <span className={`absolute inset-0 grid place-items-center ${TONES[p.tone].glow}`}>
        <img
          src={SKY_SRC}
          alt="Sky, la mascotte del club, nella divisa gara con i marchi degli sponsor"
          loading="lazy"
          decoding="async"
          className="absolute inset-0 m-auto h-[92%] w-full object-contain drop-shadow-[0_14px_22px_rgb(0_0_0/0.45)]"
        />
      </span>
    );
  if (p.kind === "colori")
    return (
      <span className={`absolute inset-0 grid place-items-center ${TONES[p.tone].glow}`}>
        <img
          src={KIT_SRC}
          alt="Kit ufficiale ColicoDerviese 2026/27"
          loading="lazy"
          decoding="async"
          className="absolute inset-0 m-auto h-[80%] w-full object-contain drop-shadow-[0_12px_20px_rgb(0_0_0/0.45)]"
        />
      </span>
    );
  if (p.kind === "convenzione" && p.sponsor)
    return (
      <span className="absolute inset-0 grid place-items-center p-6">
        <LogoTile className="h-[120px] w-[220px] p-4">
          <SponsorLogo sponsor={p.sponsor} box={{ w: 180, h: 88 }} />
        </LogoTile>
      </span>
    );
  // "A bordo campo": the sponsor of the day big, then the next confirmed sponsors in turn.
  const row = sponsorWindow(day, 7).filter((s) => s.slug !== p.sponsor?.slug).slice(0, 6);
  return (
    <span className="absolute inset-0 grid content-center gap-3 p-4 lg:p-6">
      {p.sponsor && (
        <span className="grid gap-1.5">
          <span className={`font-display text-[11px] font-bold uppercase tracking-[0.1em] ${TONES[p.tone].kicker}`}>Oggi in primo piano</span>
          <LogoTile className="h-[78px] w-full p-3 lg:h-[96px]">
            <SponsorLogo sponsor={p.sponsor} box={{ w: 200, h: 64 }} />
          </LogoTile>
        </span>
      )}
      <ul className="m-0 grid list-none grid-cols-3 gap-2 p-0" aria-label="Altri sponsor a bordo campo">
        {row.map((s) => (
          <li key={s.slug}>
            <LogoTile className="h-[46px] w-full p-1.5 lg:h-[54px]">
              <SponsorLogo sponsor={s} box={{ w: 84, h: 34 }} />
            </LogoTile>
          </li>
        ))}
      </ul>
    </span>
  );
}

export function HomeBordoCampo({ day }: { day: string }) {
  const promos = promosForDay(day);
  const n = promos.length;
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [holding, setHolding] = useState(false);
  const [still, setStill] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const set = () => setStill(mq.matches);
    set();
    mq.addEventListener("change", set);
    return () => mq.removeEventListener("change", set);
  }, []);

  useEffect(() => {
    if (paused || holding || still || n < 2) return;
    const t = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      setActive((i) => nextIndex(i, n));
    }, ADVANCE_MS);
    return () => window.clearInterval(t);
  }, [paused, holding, still, n]);

  if (n === 0) return null;
  const i = Math.min(active, n - 1);
  const p = promos[i]!;
  const t = TONES[p.tone];
  const btn =
    "scd-focus grid size-11 place-items-center rounded-full border border-[#c3cee0] bg-white text-[#13254d] hover:bg-[#eef2f8]";

  return (
    <section
      aria-labelledby="home-promo-t"
      aria-roledescription="carosello"
      data-testid="home-promo"
      className="min-w-0"
      onMouseEnter={() => setHolding(true)}
      onMouseLeave={() => setHolding(false)}
      onFocus={() => setHolding(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHolding(false);
      }}
    >
      <div className="flex items-end justify-between gap-3 pb-3">
        <div className="min-w-0">
          <h2 id="home-promo-t" className="m-0 font-display text-[22px] font-bold leading-tight text-[#14264d] lg:text-[26px]">
            Con noi, a bordo campo
          </h2>
          <p className="m-0 mt-0.5 text-[13px] text-[#52627f] lg:text-[14px]">Sponsor, colori del club e convenzioni</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {!still && n > 1 && (
            <button
              type="button"
              className={btn}
              onClick={() => setPaused((x) => !x)}
              aria-label={paused ? "Riprendi lo scorrimento delle promozioni" : "Ferma lo scorrimento delle promozioni"}
              data-testid="promo-pause"
            >
              {paused ? <Play className="size-4" aria-hidden="true" /> : <Pause className="size-4" aria-hidden="true" />}
            </button>
          )}
          {n > 1 && (
            <>
              <button type="button" className={btn} onClick={() => setActive(nextIndex(i, n, -1))} aria-label="Promozione precedente">
                <ChevronLeft className="size-5" aria-hidden="true" />
              </button>
              <button type="button" className={btn} onClick={() => setActive(nextIndex(i, n))} aria-label="Promozione successiva">
                <ChevronRight className="size-5" aria-hidden="true" />
              </button>
            </>
          )}
        </div>
      </div>

      <div
        role="group"
        aria-roledescription="slide"
        aria-label={`${i + 1} di ${n}: ${p.title}`}
        data-promo={p.id}
        data-tone={p.tone}
        className={`${t.band} grid overflow-hidden rounded-[14px] shadow-[0_10px_24px_-16px_rgb(15_29_61/0.8)] ring-1 ring-[#b8c5dd]/30 lg:grid-cols-[minmax(0,1fr)_minmax(0,42%)]`}
      >
        <div className="flex flex-col gap-1.5 p-4 lg:justify-center lg:gap-2 lg:p-7">
          <span className={`font-display text-[11px] font-bold uppercase tracking-[0.1em] ${t.kicker} lg:text-[12px]`}>{p.kicker}</span>
          <h3 className="m-0 font-display text-[22px] font-bold leading-[1.05] lg:text-[28px]">{p.title}</h3>
          <p className={`m-0 text-[14px] leading-snug ${t.body} lg:text-[16px]`}>{p.text}</p>
          {p.kind === "bordo-campo" && p.sponsor && (
            <p className={`m-0 text-[13px] ${t.muted}`}>Oggi in primo piano: {sponsorLabel(p.sponsor)}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Link to={p.cta.to} {...(p.cta.hash ? { hash: p.cta.hash } : {})} className={`${t.cta} ${CTA}`} data-testid={`promo-cta-${p.kind}`}>
              {p.cta.label}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            {p.secondary && (
              <Link to={p.secondary.to} className={`${t.ghost} ${GHOST}`}>
                {p.secondary.label}
              </Link>
            )}
          </div>
        </div>
        <div className="relative order-first aspect-[16/10] overflow-hidden lg:order-none lg:aspect-auto lg:min-h-[300px]">
          <Visual p={p} day={day} />
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {paused || still ? `Promozione ${i + 1} di ${n}: ${p.title}` : ""}
      </p>
      {n > 1 && (
        <ol className="m-0 mt-2 flex list-none justify-center gap-0 p-0" aria-label="Scegli la promozione">
          {promos.map((x, k) => (
            <li key={x.id}>
              <button
                type="button"
                onClick={() => setActive(k)}
                aria-label={`Vai a: ${x.title}`}
                aria-current={k === i ? "true" : undefined}
                className="scd-focus grid size-11 place-items-center rounded-full"
              >
                <span
                  aria-hidden="true"
                  className={`block h-2 rounded-full motion-safe:transition-[width] motion-safe:duration-200 ${k === i ? "w-6 bg-[#13254d]" : "w-2 bg-[#b8c5dd]"}`}
                />
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
