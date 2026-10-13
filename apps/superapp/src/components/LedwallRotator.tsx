import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type FocusEvent } from "react";

import {
  LEDWALL_BOARD,
  LEDWALL_CLUB_EVERY,
  LEDWALL_CLUB_TEXT,
  LEDWALL_CREST,
  LEDWALL_SLOT_MS,
  LEDWALL_STILL,
  ledwallSequence,
  mayAnimate,
  msIntoRomeDay,
  slotIndexAt,
  stepIndex,
  type LedSlot,
} from "@/lib/ledwall-rotation";
import { SPONSOR_ART } from "@/lib/logo-art.gen";
import { SPONSORS, type Sponsor } from "@/lib/sponsors";

/**
 * LED wall preview (UD-107): every current partner in rotation on the real pitch-side board of the club still.
 * The still is the background; the board layer sits exactly over the board rectangle (percent positioning), white
 * LED board with the partner logo centred, a fine pixel grid and a slight glow. A club slot (navy board) every six
 * partners. Honest label: it is a composite preview, not footage.
 *
 * Motion: one slot every 4 s, paused on hover/focus, when off screen and with the pause button (WCAG 2.2.2); with
 * prefers-reduced-motion it never advances by itself (one partner + previous/next). The polite live region speaks
 * only after a manual previous/next, never on auto-advance.
 *
 * SSR: the first slot comes from `nowMs` (server time passed by the route loader), so server and client render the
 * same markup; after mount the board re-aligns with the visitor's clock.
 */
export interface LedwallRotatorProps {
  /** Rome calendar day (YYYY-MM-DD) that seeds the order of the day. */
  day: string;
  /** Server time used for the first slot (hydration-safe). */
  nowMs: number;
  /** full: the sponsor page visual; compact: a close-up band for the home. */
  variant?: "full" | "compact";
  list?: readonly Sponsor[];
  /** Club slot after every N partners (default LEDWALL_CLUB_EVERY); 1 alternates partner and club (dedicated board). */
  clubEvery?: number;
  /** Visible label over the still (default: the rotation label). */
  label?: string;
  className?: string;
}

const LABEL = "Anteprima ledwall · i partner a rotazione";

export function LedwallRotator({
  day,
  nowMs,
  variant = "full",
  list = SPONSORS,
  clubEvery = LEDWALL_CLUB_EVERY,
  label = LABEL,
  className = "",
}: LedwallRotatorProps) {
  const slots = useMemo(() => ledwallSequence(list, day, clubEvery), [list, day, clubEvery]);
  const partners = list.length;
  const single = partners === 1;
  const [idx, setIdx] = useState(() => slotIndexAt(slots.length, msIntoRomeDay(nowMs)));
  const [auto, setAuto] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [inView, setInView] = useState(true);
  const [pageVisible, setPageVisible] = useState(true);
  const [announce, setAnnounce] = useState("");
  const [broken, setBroken] = useState<ReadonlySet<string>>(() => new Set());
  const rootRef = useRef<HTMLDivElement>(null);

  // After mount: may it move by itself, and which slot is on the board right now.
  useEffect(() => {
    const can = mayAnimate(typeof window === "undefined" ? undefined : window);
    setAuto(can);
    setIdx(slotIndexAt(slots.length, msIntoRomeDay(Date.now())));
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setAuto(!mq.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, [slots.length]);

  // Off screen (or hidden tab): no timer.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setInView(!!e?.isIntersecting), { threshold: 0.15 });
    io.observe(el);
    const onVis = () => setPageVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVis);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const visible = inView && pageVisible;
  const running = auto && !userPaused && !hovered && !focused && visible && slots.length > 1;

  useEffect(() => {
    if (!running) return;
    const t = window.setTimeout(() => setIdx((i) => stepIndex(i, 1, slots.length)), LEDWALL_SLOT_MS);
    return () => window.clearTimeout(t);
  }, [running, idx, slots.length]);

  // Warm the next logo only (lazy: the other files load when their slot comes).
  useEffect(() => {
    if (!visible || typeof Image === "undefined") return;
    const next = slots[stepIndex(idx, 1, slots.length)];
    if (next?.kind === "partner") new Image().src = next.src;
  }, [idx, slots, visible]);

  const slot: LedSlot = slots[Math.min(idx, slots.length - 1)] ?? { kind: "club", key: "club-0" };

  const go = useCallback(
    (delta: number) => {
      const n = stepIndex(idx, delta, slots.length);
      const s = slots[n];
      setIdx(n);
      setAnnounce(
        s?.kind === "partner"
          ? single
            ? s.label
            : `${s.label}, partner ${s.ordinal} di ${partners}`
          : `${LEDWALL_CLUB_TEXT.kicker}, ${LEDWALL_CLUB_TEXT.title}`,
      );
    },
    [idx, slots, partners],
  );

  const onBlur = (e: FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
  };

  const boardStyle: CSSProperties = {
    left: `${LEDWALL_BOARD.left}%`,
    top: `${LEDWALL_BOARD.top}%`,
    width: `${LEDWALL_BOARD.width}%`,
    height: `${LEDWALL_BOARD.height}%`,
  };

  const compact = variant === "compact";
  const btn =
    "scd-focus grid size-11 shrink-0 place-items-center rounded-full border border-[#0b2a5b]/15 bg-white text-[#0b2a5b] transition-colors duration-150 hover:bg-[#eef3f9]";

  return (
    <div
      ref={rootRef}
      role="region"
      aria-roledescription="carosello"
      aria-label={single ? "Anteprima del ledwall del campo dedicato al partner, alternato allo spazio del club" : "Anteprima del ledwall del campo: i partner della stagione 2026/27 a rotazione"}
      className={`scd-ledrot ${className}`}
      data-variant={variant}
      data-running={running ? "true" : "false"}
      data-testid="ledwall-rotator"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={onBlur}
    >
      <div className="scd-ledrot-frame">
        <div className="scd-ledrot-stage">
          <img
            src={LEDWALL_STILL.src}
            srcSet={LEDWALL_STILL.srcSet}
            sizes={compact ? "(min-width: 1024px) 760px, 130vw" : "(min-width: 1200px) 1152px, 130vw"}
            width={LEDWALL_STILL.width}
            height={LEDWALL_STILL.height}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            className="absolute inset-0 block size-full object-cover"
          />
          <div className="scd-ledrot-board" style={boardStyle} data-kind={slot.kind} data-testid="ledwall-board">
            <div key={`${slot.key}-${idx}`} className="scd-ledrot-slot" data-testid="ledwall-slot" data-slot={slot.key}>
              {slot.kind === "partner" ? (
                broken.has(slot.slug) ? (
                  <span className="scd-ledrot-fallback">{slot.label}</span>
                ) : (
                  <img
                    src={slot.src}
                    alt={slot.label}
                    width={SPONSOR_ART[slot.slug]?.w}
                    height={SPONSOR_ART[slot.slug]?.h}
                    loading="lazy"
                    decoding="async"
                    className="scd-ledrot-logo"
                    onError={() => setBroken((b) => new Set(b).add(slot.slug))}
                  />
                )
              ) : (
                <span className="scd-ledrot-club">
                  <img src={LEDWALL_CREST} alt="" aria-hidden="true" width={480} height={628} loading="lazy" decoding="async" />
                  <span>
                    <b>{LEDWALL_CLUB_TEXT.kicker}</b>
                    <span aria-hidden="true"> · </span>
                    {LEDWALL_CLUB_TEXT.title}
                  </span>
                </span>
              )}
            </div>
            <span aria-hidden="true" className="scd-ledrot-grid" />
          </div>
        </div>
        <span
          className="pointer-events-none absolute left-2.5 top-2.5 rounded-full bg-[#0b2a5b]/85 px-2.5 py-1 text-[11.5px] font-bold uppercase leading-none tracking-[0.06em] text-white ring-1 ring-white/25 backdrop-blur-sm sm:left-3 sm:top-3 sm:text-[12.5px]"
          data-testid="ledwall-rotator-label"
        >
          {label}
        </span>
      </div>
      <div className={`flex items-center gap-2 ${compact ? "pt-2.5" : "pt-3"}`}>
        <p className="m-0 min-w-0 flex-1 truncate text-[13px] font-semibold tabular-nums text-[#4a5d7a]" data-testid="ledwall-counter">
          {slot.kind === "partner" ? (single ? "Partner dedicato" : `Partner ${slot.ordinal} di ${partners}`) : "Spazio del club"}
        </p>
        <button type="button" className={btn} onClick={() => go(-1)} aria-label={single ? "Passaggio precedente sul ledwall" : "Partner precedente sul ledwall"}>
          <ChevronLeft className="size-5" aria-hidden="true" />
        </button>
        {auto && (
          <button
            type="button"
            className={btn}
            onClick={() => setUserPaused((p) => !p)}
            aria-pressed={userPaused}
            aria-label={userPaused ? "Riprendi la rotazione dei partner" : "Metti in pausa la rotazione dei partner"}
            data-testid="ledwall-pause"
          >
            {userPaused ? <Play className="size-4" aria-hidden="true" /> : <Pause className="size-4" aria-hidden="true" />}
          </button>
        )}
        <button type="button" className={btn} onClick={() => go(1)} aria-label={single ? "Passaggio successivo sul ledwall" : "Partner successivo sul ledwall"}>
          <ChevronRight className="size-5" aria-hidden="true" />
        </button>
      </div>
      <p className="sr-only" aria-live="polite" aria-atomic="true" data-testid="ledwall-announce">
        {announce}
      </p>
    </div>
  );
}
