/**
 * "In primo piano" — organized slides of the public home (Francesco 16/10/2026 17:28: «prevedi un po' di avatar e slide
 * organizzate con agente a supporto tutto il giorno»). One slide at a time, in this order:
 *   1. Il tuo avatar — the avatar builder, opens after sign-in. Visual: the official kit only (the avatar bases are
 *      REFERENCE_PROTOTYPE, members area only — UD-102 — until the Direzione approves them for public pages).
 *   2. Iride, 24 ore su 24 — the club's AI assistant (approved portrait), opens the chat in place.
 *   3+. The day's palinsesto items (lib/vetrina): tournaments, initiatives, the week's games.
 * Movement: advances every 7 s only while nobody is interacting; stops on hover, on focus, with the pause button, when
 * the tab is hidden and always with reduced motion. Swipe and keyboard work through native horizontal scroll-snap.
 */
import { Link } from "@tanstack/react-router";
import { ArrowRight, ChevronLeft, ChevronRight, MessageCircle, Pause, Play } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { loginSearch } from "@/components/scd/AccessMenu";
import { VERA_OPEN_EVENTS } from "@/lib/assistant-open";
import { castPortraitSrc } from "@/lib/assistant-cast";
import type { VetrinaSlot } from "@/lib/vetrina";

const KIT_FULL = "/media/kit/kit-2026-27-blu.webp";
const ADVANCE_MS = 7000;
const LABEL = "font-display text-[11px] font-bold uppercase tracking-[0.1em] lg:text-[12px]";

/** Next slide index, wrapping. */
export function nextIndex(i: number, n: number, step = 1): number {
  if (n <= 0) return 0;
  return (((i + step) % n) + n) % n;
}

function openAssistant() {
  window.dispatchEvent(new Event(VERA_OPEN_EVENTS[0]));
}

/** Visual of a palinsesto item (the kit uses the official render, never the supplier price list). */
function PostMedia({ s }: { s: VetrinaSlot }) {
  const v = s.id === "kit-2026-27" ? { kind: "image" as const, src: KIT_FULL, alt: "Kit ufficiale ColicoDerviese 2026/27", fit: "contain" as const, position: "center" } : s.visual;
  if (v.kind === "image")
    return (
      <img
        src={v.src}
        alt={v.alt}
        loading="lazy"
        decoding="async"
        className={`absolute inset-0 size-full ${v.fit === "contain" ? "object-contain p-4" : "object-cover"}`}
        style={{ objectPosition: v.position ?? "center" }}
      />
    );
  if (v.kind === "portrait")
    return (
      <span className="absolute inset-0 grid place-items-center">
        <img src={v.src} alt={v.alt} loading="lazy" decoding="async" className="size-[120px] rounded-full object-cover ring-4 ring-white/70" />
      </span>
    );
  return (
    <span aria-hidden="true" className="absolute inset-0 grid content-end overflow-hidden p-5">
      <span className="absolute -right-2 -top-4 font-display text-[150px] font-bold leading-none text-white/10">{v.big}</span>
    </span>
  );
}

function Slide({
  index,
  total,
  media,
  kicker,
  title,
  text,
  action,
  id,
}: {
  index: number;
  total: number;
  media: ReactNode;
  kicker: string;
  title: string;
  text: string;
  action: ReactNode;
  id: string;
}) {
  return (
    <li
      className="w-full shrink-0 snap-start snap-always"
      role="group"
      aria-roledescription="slide"
      aria-label={`${index + 1} di ${total}: ${title}`}
      data-slide={id}
    >
      <div className="scd-band grid h-full overflow-hidden rounded-[14px] text-white shadow-[0_10px_24px_-16px_rgb(15_29_61/0.8)] ring-1 ring-[#b8c5dd]/30 lg:grid-cols-[minmax(0,46%)_minmax(0,1fr)]">
        <div className="relative aspect-[16/9] overflow-hidden bg-[radial-gradient(circle_at_60%_35%,rgb(127_208_255/0.35),transparent_65%)] lg:aspect-auto lg:min-h-[248px]">
          {media}
        </div>
        <div className="flex flex-col gap-1.5 p-4 lg:justify-center lg:gap-2 lg:p-7">
          <span className={`${LABEL} text-[#ffd84a]`}>{kicker}</span>
          <h3 className="m-0 font-display text-[22px] font-bold leading-[1.05] lg:text-[28px]">{title}</h3>
          <p className="m-0 text-[14px] leading-snug text-[#dbe5f7] lg:text-[16px]">{text}</p>
          <div className="mt-2">{action}</div>
        </div>
      </div>
    </li>
  );
}

const CTA = "scd-gold scd-focus inline-flex min-h-11 items-center gap-1.5 rounded-[10px] px-4 font-display text-[15px] font-semibold";

export function HomeSlides({ slots }: { slots: readonly VetrinaSlot[] }) {
  const track = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [holding, setHolding] = useState(false);
  const [still, setStill] = useState(false);

  const renders: Array<(i: number, n: number) => ReactNode> = [];
  const titles: string[] = [];
  const push = (title: string, render: (i: number, n: number) => ReactNode) => {
    titles.push(title);
    renders.push(render);
  };
  push("Crea il tuo avatar", (i, n) => (
    <Slide
      key="avatar"
      id="avatar"
      index={i}
      total={n}
      kicker="Avatar"
      title="Crea il tuo avatar"
      text="Scegli soprannome, numero e la divisa del club: il tuo campione entra nell'app con te."
      media={
        <span className="absolute inset-0 grid place-items-center">
          <img src={KIT_FULL} alt="Kit ufficiale ColicoDerviese 2026/27" loading="lazy" decoding="async" className="h-[78%] w-auto object-contain drop-shadow-[0_12px_20px_rgb(0_0_0/0.45)]" />
          <span aria-hidden="true" className="scd-gold absolute bottom-3 right-3 rounded-[8px] px-2.5 py-1 font-display text-[13px] font-bold uppercase tracking-[0.04em]">
            Il tuo nome · 10
          </span>
        </span>
      }
      action={
        <Link to="/accedi" search={loginSearch("/la-mia-scd/campione")} className={CTA} data-testid="slide-avatar">
          Crea il tuo avatar
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      }
    />
  ));
  push("Chiedi a Iride", (i, n) => (
    <Slide
      key="iride"
      id="iride"
      index={i}
      total={n}
      kicker="Assistente del club · 24 ore su 24"
      title="Chiedi a Iride"
      text="Gare della settimana, campi, biglietteria e iscrizioni: Iride risponde a qualsiasi ora con i dati pubblicati dal club. Per ciò che serve a una persona ti indica la segreteria."
      media={
        <span className="absolute inset-0 grid place-items-center">
          <img src={castPortraitSrc("vera", 440)} alt="Iride, l'assistente AI della segreteria" loading="lazy" decoding="async" className="h-[92%] w-auto object-contain drop-shadow-[0_12px_20px_rgb(0_0_0/0.45)]" />
          <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-black/35 px-2.5 py-1 font-display text-[12px] font-semibold text-white">
            <span aria-hidden="true" className="scd-live-dot size-2 rounded-full bg-[#3ddc84]" />
            Online ora
          </span>
        </span>
      }
      action={
        <button type="button" onClick={openAssistant} className={CTA} data-testid="slide-iride">
          <MessageCircle className="size-4" aria-hidden="true" />
          Scrivi a Iride
        </button>
      }
    />
  ));
  for (const s of slots)
    push(s.title, (i, n) => (
      <Slide
        key={s.id}
        id={s.id}
        index={i}
        total={n}
        kicker={s.kicker}
        title={s.title}
        text={s.text}
        media={<PostMedia s={s} />}
        action={
          <Link to={s.href as never} search={s.search as never} {...(s.hash ? { hash: s.hash } : {})} className={CTA} data-slot={s.id}>
            {s.cta}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        }
      />
    ));
  const n = renders.length;

  const go = useCallback(
    (i: number, smooth = true) => {
      const el = track.current;
      if (!el) return;
      el.scrollTo({ left: i * el.clientWidth, behavior: smooth && !still ? "smooth" : "auto" });
    },
    [still],
  );

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
      go(nextIndex(active, n));
    }, ADVANCE_MS);
    return () => window.clearInterval(t);
  }, [paused, holding, still, n, active, go]);

  const onScroll = () => {
    const el = track.current;
    if (!el || el.clientWidth === 0) return;
    setActive(Math.round(el.scrollLeft / el.clientWidth));
  };

  const btn = "scd-focus grid size-11 place-items-center rounded-full border border-[#c3cee0] bg-white text-[#13254d] hover:bg-[#eef2f8]";
  return (
    <section
      aria-labelledby="home-news-t"
      aria-roledescription="carosello"
      data-testid="home-news"
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
          <h2 id="home-news-t" className="m-0 font-display text-[22px] font-bold leading-tight text-[#14264d] lg:text-[26px]">
            In primo piano
          </h2>
          <p className="m-0 mt-0.5 text-[13px] text-[#52627f] lg:text-[14px]">Avatar, assistente e novità del club</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {!still && n > 1 && (
            <button type="button" className={btn} onClick={() => setPaused((p) => !p)} aria-pressed={paused} aria-label={paused ? "Riprendi lo scorrimento" : "Ferma lo scorrimento"} data-testid="slides-pause">
              {paused ? <Play className="size-4" aria-hidden="true" /> : <Pause className="size-4" aria-hidden="true" />}
            </button>
          )}
          <button type="button" className={btn} onClick={() => go(nextIndex(active, n, -1))} aria-label="Slide precedente">
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
          <button type="button" className={btn} onClick={() => go(nextIndex(active, n))} aria-label="Slide successiva">
            <ChevronRight className="size-5" aria-hidden="true" />
          </button>
        </div>
      </div>
      <ul
        ref={track}
        onScroll={onScroll}
        className="m-0 flex list-none snap-x snap-mandatory overflow-x-auto overscroll-x-contain p-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {renders.map((render, i) => render(i, n))}
      </ul>
      <p className="sr-only" aria-live="polite">
        {paused || holding || still ? `Slide ${active + 1} di ${n}: ${titles[active] ?? ""}` : ""}
      </p>
      <ol className="m-0 mt-2 flex list-none justify-center gap-0 p-0" aria-label="Scegli la slide">
        {titles.map((t, i) => (
          <li key={t + i}>
            <button type="button" onClick={() => go(i)} aria-label={`Vai a: ${t}`} aria-current={i === active ? "true" : undefined} className="scd-focus grid size-11 place-items-center rounded-full">
              <span aria-hidden="true" className={`block h-2 rounded-full motion-safe:transition-[width] motion-safe:duration-200 ${i === active ? "w-6 bg-[#13254d]" : "w-2 bg-[#b8c5dd]"}`} />
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
