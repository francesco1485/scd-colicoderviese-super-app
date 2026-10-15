import { Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight, Check, ChevronLeft, ChevronRight, Copy, FileCheck2, Link2, MonitorPlay, Pause, Play, Radio } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { mayAnimate, stepIndex } from "@/lib/ledwall-rotation";
import { spotReviewPath, spotReviewUrl } from "@/lib/spot-review";
import { ledOnAir, loopSeconds, passesPerHour, romeClock, spotVideoFile, upcomingSlots } from "@/lib/spot-schedule";
import { useNow, useVideoFormat } from "@/lib/use-spot-clock";
import {
  LED_MASTER,
  SPONSOR_SPOTS,
  SPOT_FLOW,
  SPOT_STATUS_LABEL,
  partnerHref,
  spotsForLedwall,
  type SponsorSpot,
  type SpotStatus,
} from "@/lib/sponsor-spots";

/**
 * Sponsor LED spots (UD-119): "Sul LED wall" block of the public home and the "Spot LED" vetrina of the sponsor
 * gestionale (/crm). Data and rules: src/lib/sponsor-spots.ts.
 */

/** Small hook: the element is on screen (and the tab visible). Starts false on the server and before mount. */
function useOnScreen<T extends Element>(threshold = 0.25) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  const [seen, setSeen] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        const v = !!e?.isIntersecting;
        setInView(v);
        if (v) setSeen(true);
      },
      { threshold },
    );
    io.observe(el);
    const onVis = () => setPageVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVis);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [threshold]);
  return { ref, visible: inView && pageVisible, seen };
}

/** The visual of one spot: field preview 16:9, or the LED master strip on a dark panel when there is no preview. */
export function SpotStage({
  spot,
  play,
  mountVideo,
  controls,
  onEnded,
  priority,
  startAtMs,
  masterOnly,
}: {
  spot: SponsorSpot;
  play: boolean;
  mountVideo: boolean;
  controls?: boolean;
  onEnded?: () => void;
  priority?: boolean;
  /** Start the video at this point of the slot (clock-synced rotation); read once when the spot mounts. */
  startAtMs?: number | undefined;
  /** Show the LED master strip even when a field preview exists (regia of the gestionale). */
  masterOnly?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const format = useVideoFormat();
  const strip = masterOnly || spot.preview === null;
  const src = spotVideoFile(strip ? spot.master : (spot.preview ?? spot.master), format);
  const startAt = useRef(startAtMs);
  startAt.current = startAtMs;
  const onMeta = () => {
    const v = ref.current;
    const ms = startAt.current;
    if (v && ms && ms > 500 && ms < LED_MASTER.seconds * 1000 - 500) {
      try {
        v.currentTime = ms / 1000;
      } catch {
        /* not seekable yet */
      }
    }
  };

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = true;
    if (play) v.play().catch(() => undefined);
    else v.pause();
  }, [play, mountVideo, spot.slug, src]);

  const media = mountVideo ? (
    <video
      key={`${spot.slug}-${format}-${strip ? "m" : "p"}`}
      ref={ref}
      src={src}
      onLoadedMetadata={onMeta}
      poster={strip && spot.preview !== null ? undefined : spot.poster}
      muted
      playsInline
      autoPlay={play}
      preload="auto"
      controls={controls}
      onEnded={onEnded}
      width={strip ? LED_MASTER.width : 1280}
      height={strip ? LED_MASTER.height : 720}
      className="block size-full object-cover"
      aria-label={`Spot LED di ${spot.sponsorName}`}
      data-testid="spot-video"
    />
  ) : (
    <img
      key={spot.slug}
      src={spot.poster}
      width={spot.posterSize.width}
      height={spot.posterSize.height}
      alt={`Spot LED di ${spot.sponsorName}`}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className="block size-full object-cover"
      data-testid="spot-poster"
    />
  );

  return (
    <div className="relative aspect-video overflow-hidden rounded-[14px] bg-[#06142b]" data-strip={strip ? "true" : "false"}>
      {strip ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-3">
          <div className="w-full overflow-hidden rounded-[4px] ring-1 ring-white/15" style={{ aspectRatio: `${LED_MASTER.width} / ${LED_MASTER.height}` }}>
            {media}
          </div>
          <span className="text-[12px] font-semibold text-white/70">Formato del tabellone LED</span>
        </div>
      ) : (
        <div className="absolute inset-0">{media}</div>
      )}
    </div>
  );
}

const ctrl =
  "scd-focus grid size-11 shrink-0 place-items-center rounded-full border border-[#0b2a5b]/15 bg-white text-[#0b2a5b] transition-colors duration-150 hover:bg-[#eef3f9]";

/**
 * Public home, right after "Sostieni il club": the preview videos of the confirmed sponsors in rotation (day order),
 * muted, one after another. Only the current video loads, and only once the block is on screen; posters first.
 * Reduced motion: posters with previous/next, a video plays only when the visitor starts it.
 */
export function SponsorSpotsHome({
  day,
  className = "",
  compact = false,
}: {
  day: string;
  className?: string;
  /**
   * Public home Matchday layout (UD-132): one 16:9 strip with "In onda ora sul LED wall", the partner name and
   * "Diventa partner", no page gutter (the caller places it). Same clock, reduced-motion and pause rules.
   */
  compact?: boolean;
}) {
  // Clock-synced with the LED wall player and the gestionale regia (lib/spot-schedule.ts). Before mount the order of
  // the server day is used, so server and first client render match.
  const { ref, visible, seen } = useOnScreen<HTMLElement>();
  /** null = follow the LED wall clock; a number = the visitor moved by hand (or paused, or started a spot). */
  const [manualIdx, setManualIdx] = useState<number | null>(null);
  const [auto, setAuto] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const following = auto && !userPaused && manualIdx === null;
  // The clock ticks only while the block is on screen and following the live board (no re-render otherwise).
  const now = useNow(1000, 0, visible && following);
  const air = useMemo(() => ledOnAir(now || Date.parse(`${day}T12:00:00Z`)), [now, day]);
  const spots = air.order;
  const n = spots.length;
  const [manualPlay, setManualPlay] = useState(false);
  const [announce, setAnnounce] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    setAuto(mayAnimate(window));
    if (typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setAuto(!mq.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  // Not following (reduced motion, paused, by hand): the spot stays where it is, never changes by itself.
  const idx = manualIdx ?? Math.max(0, air.index);
  const freeze = () => setManualIdx((m) => m ?? idx);

  const go = useCallback(
    (delta: number) => {
      const next = stepIndex(idx, delta, n);
      setManualIdx(next);
      setManualPlay(!auto);
      const s = spots[next];
      if (s) setAnnounce(`${s.sponsorName}, spot ${next + 1} di ${n}`);
    },
    [idx, n, spots, auto],
  );

  if (n === 0) return null;
  const spot = spots[Math.min(idx, n - 1)]!;
  const play = visible && (auto ? !userPaused : manualPlay);
  const mountVideo = seen && (auto || manualPlay);
  const link = partnerHref(spot);

  // By hand: at the end of a spot go on to the next one; following the clock, the clock moves on by itself.
  const onEnded = () => {
    if (following) return;
    if (auto && !userPaused) setManualIdx(stepIndex(idx, 1, n));
    else setManualPlay(false);
  };

  const onAirLabel = following ? "In onda ora sul LED wall" : "Anteprima dello spot";
  const playButton = !auto && !manualPlay && (
    <button
      type="button"
      onClick={() => {
        freeze();
        setManualPlay(true);
      }}
      className="scd-focus absolute bottom-3 left-3 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#ffd600] py-2 pl-3 pr-4 text-[14px] font-bold text-[#0b1e3a] shadow-[0_10px_30px_-8px_rgb(2_20_51/0.6)]"
      data-testid="spot-play"
    >
      <Play className="size-4" fill="currentColor" aria-hidden="true" />
      Guarda lo spot
    </button>
  );

  if (compact)
    return (
      <section ref={ref} aria-labelledby="ledspot-t" className={`min-w-0 ${className}`} data-testid="home-led-spots" data-variant="compact">
        <div className="rounded-[18px] bg-white p-2.5 shadow-[0_1px_2px_rgb(11_42_91/0.06),0_8px_24px_-12px_rgb(11_42_91/0.25)]">
          <div className="relative">
            <SpotStage spot={spot} play={play} mountVideo={mountVideo} onEnded={onEnded} controls={!auto && manualPlay} priority={false} startAtMs={following ? air.elapsedMs : undefined} />
            <span className="pointer-events-none absolute left-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-full bg-[#0b2a5b]/85 px-2.5 py-1 text-[11.5px] font-bold uppercase leading-none tracking-[0.06em] text-white ring-1 ring-white/25 backdrop-blur-sm">
              {following && <span aria-hidden="true" className="scd-live-dot size-1.5 rounded-full bg-[#ff5c5c]" />}
              {onAirLabel}
            </span>
            {playButton}
          </div>
          <div className="flex items-center gap-2 px-1 pt-2.5">
            <div className="grid min-w-0 flex-1 leading-tight" aria-live="off">
              <h2 id="ledspot-t" className="m-0 text-[11.5px] font-extrabold uppercase tracking-[0.1em] text-[#1556c4]">
                Sul LED wall · {idx + 1} di {n}
              </h2>
              {link.external ? (
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="scd-focus -my-3 block truncate rounded py-3 text-[16px] font-bold text-[#0b1e3a] hover:underline"
                  data-testid="spot-sponsor"
                >
                  {spot.sponsorName}
                  <span className="sr-only"> (apre il sito del partner)</span>
                </a>
              ) : (
                <b className="truncate text-[16px] text-[#0b1e3a]" data-testid="spot-sponsor">
                  {spot.sponsorName}
                </b>
              )}
            </div>
            {auto ? (
              <button
                type="button"
                className={ctrl}
                onClick={() => {
                  if (!userPaused) freeze();
                  setUserPaused((p) => !p);
                }}
                aria-pressed={userPaused}
                aria-label={userPaused ? "Riprendi gli spot" : "Metti in pausa gli spot"}
                data-testid="spot-pause"
              >
                {userPaused ? <Play className="size-4" aria-hidden="true" /> : <Pause className="size-4" aria-hidden="true" />}
              </button>
            ) : (
              <button type="button" className={ctrl} onClick={() => go(1)} aria-label="Spot successivo">
                <ChevronRight className="size-5" aria-hidden="true" />
              </button>
            )}
            <Link
              to="/sponsor"
              search={{ pacchetto: "ledwall" }}
              className="scd-focus inline-flex min-h-11 shrink-0 items-center gap-1 rounded-[12px] bg-[#0b2a5b] px-3.5 text-[14px] font-bold text-white transition-[filter] duration-150 hover:brightness-110"
              data-testid="spot-cta"
            >
              Diventa partner
            </Link>
          </div>
        </div>
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {announce}
        </p>
      </section>
    );

  return (
    <section ref={ref} aria-labelledby="ledspot-t" className={`mx-auto w-full max-w-[1280px] px-4 pt-6 lg:px-8 lg:pt-10 ${className}`} data-testid="home-led-spots">
      <div className="grid gap-4 rounded-[22px] bg-white p-4 shadow-[0_1px_2px_rgb(11_42_91/0.06),0_8px_24px_-12px_rgb(11_42_91/0.25)] lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-center lg:gap-6 lg:p-6">
        <div className="min-w-0">
          <div className="relative">
            <SpotStage spot={spot} play={play} mountVideo={mountVideo} onEnded={onEnded} controls={!auto && manualPlay} priority={false} startAtMs={following ? air.elapsedMs : undefined} />
            <span className="pointer-events-none absolute left-2.5 top-2.5 rounded-full bg-[#0b2a5b]/85 px-2.5 py-1 text-[11.5px] font-bold uppercase leading-none tracking-[0.06em] text-white ring-1 ring-white/25 backdrop-blur-sm">
              {onAirLabel}
            </span>
            {playButton}
          </div>
        </div>
        <div className="grid min-w-0 content-start gap-3">
          <div className="grid gap-1">
            <span className="text-[11.5px] font-extrabold uppercase tracking-[0.12em] text-[#1556c4]">Novità al campo di Colico</span>
            <h2 id="ledspot-t" className="m-0 font-uv text-[24px] uppercase leading-none text-[#0b2a5b] sm:text-[26px] lg:text-[30px]">
              Sul LED wall
            </h2>
            <p className="m-0 text-[14px] leading-snug text-[#4a5d7a]">Gli spot dei nostri partner, uno dopo l'altro, come sul tabellone del campo.</p>
          </div>
          <div className="rounded-[14px] bg-[#eef3f9] p-3.5" aria-live="off">
            <b className="block text-[18px] leading-tight text-[#0b1e3a]" data-testid="spot-sponsor">
              {spot.sponsorName}
            </b>
            <span className="mt-0.5 block text-[13.5px] text-[#4a5d7a]">Partner della S.C.D. ColicoDerviese</span>
            {link.external ? (
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="scd-focus mt-2 inline-flex min-h-11 items-center gap-1 rounded-md text-[14px] font-semibold text-[#1556c4] hover:underline"
                data-testid="spot-partner-link"
              >
                Scopri il partner
                <ArrowUpRight className="size-4" aria-hidden="true" />
                <span className="sr-only">(apre il sito del partner)</span>
              </a>
            ) : (
              <Link
                to="/sponsor"
                className="scd-focus mt-2 inline-flex min-h-11 items-center gap-1 rounded-md text-[14px] font-semibold text-[#1556c4] hover:underline"
                data-testid="spot-partner-link"
              >
                Scopri il partner
                <ChevronRight className="size-4" aria-hidden="true" />
              </Link>
            )}
          </div>
          <div className="flex items-center gap-2">
            <p className="m-0 min-w-0 flex-1 text-[13px] font-semibold tabular-nums text-[#4a5d7a]" data-testid="spot-counter">
              Spot {idx + 1} di {n}
              {manualIdx !== null && auto && (
                <button type="button" onClick={() => setManualIdx(null)} className="scd-focus ml-2 rounded text-[13px] font-semibold text-[#1556c4] underline-offset-2 hover:underline" data-testid="spot-live">
                  Torna alla diretta
                </button>
              )}
            </p>
            <button type="button" className={ctrl} onClick={() => go(-1)} aria-label="Spot precedente">
              <ChevronLeft className="size-5" aria-hidden="true" />
            </button>
            {auto && (
              <button
                type="button"
                className={ctrl}
                onClick={() => {
                  if (!userPaused) freeze();
                  setUserPaused((p) => !p);
                }}
                aria-pressed={userPaused}
                aria-label={userPaused ? "Riprendi gli spot" : "Metti in pausa gli spot"}
                data-testid="spot-pause"
              >
                {userPaused ? <Play className="size-4" aria-hidden="true" /> : <Pause className="size-4" aria-hidden="true" />}
              </button>
            )}
            <button type="button" className={ctrl} onClick={() => go(1)} aria-label="Spot successivo">
              <ChevronRight className="size-5" aria-hidden="true" />
            </button>
          </div>
          <Link
            to="/sponsor"
            search={{ pacchetto: "ledwall" }}
            className="scd-focus inline-flex min-h-12 w-fit items-center gap-2 rounded-[12px] bg-[#ffd600] px-5 text-[15px] font-bold text-[#0b1e3a] transition-[filter] duration-150 hover:brightness-95"
            data-testid="spot-cta"
          >
            Vuoi il tuo spot qui?
            <ArrowRight className="size-[18px]" aria-hidden="true" />
          </Link>
        </div>
      </div>
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {announce}
      </p>
    </section>
  );
}

/* ------------------------------------------------------------ gestionale vetrina */

const BADGE: Readonly<Record<SpotStatus, string>> = {
  DA_APPROVARE: "bg-[#fff4cc] text-[#6b4e00] ring-[#f0d36b]",
  MODIFICHE_RICHIESTE: "bg-[#fde8e8] text-[#8a1c1c] ring-[#f2b8b8]",
  APPROVATO: "bg-[#e3f4ea] text-[#155c33] ring-[#a9dcbc]",
  IN_ONDA: "bg-[#e3eefc] text-[#0b3d91] ring-[#b4cff3]",
};

export function SpotStatusBadge({ status }: { status: SpotStatus }) {
  return (
    <span className={`inline-flex h-7 items-center rounded-full px-2.5 text-[12.5px] font-bold ring-1 ${BADGE[status]}`} data-status={status}>
      {SPOT_STATUS_LABEL[status]}
    </span>
  );
}

function CopyCaption({ text, sponsor }: { text: string; sponsor: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="scd-focus inline-flex min-h-10 items-center gap-1.5 rounded-[9px] border border-[var(--in-line)] bg-[#f7fbff] px-2.5 text-[13.5px] font-semibold text-[var(--in-info)]"
      aria-label={`Copia il testo social per ${sponsor}`}
    >
      {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
      {copied ? "Copiato" : "Copia testo social"}
      <span className="sr-only" aria-live="polite">
        {copied ? "Testo copiato" : ""}
      </span>
    </button>
  );
}

/**
 * B1: the review page for the company (/spot/$slug), opened from the gestionale or shown on screen during a meeting.
 * The app never sends messages (Francesco 14/10: "nessun messaggio"). If the clipboard is blocked, the address appears
 * selected in a field to copy by hand.
 */
function SpotReviewLinks({ spot }: { spot: SponsorSpot }) {
  const [state, setState] = useState<"idle" | "done" | "manual">("idle");
  const field = useRef<HTMLInputElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const url = spotReviewUrl(spot.slug);

  useEffect(() => () => window.clearTimeout(timer.current), []);
  useEffect(() => {
    if (state === "manual") field.current?.select();
  }, [state]);

  async function copy() {
    window.clearTimeout(timer.current);
    try {
      if (!navigator.clipboard?.writeText) throw new Error("clipboard unavailable");
      await navigator.clipboard.writeText(url);
      setState("done");
      timer.current = window.setTimeout(() => setState("idle"), 2500);
    } catch {
      setState("manual");
    }
  }

  const btn =
    "scd-focus inline-flex min-h-10 items-center gap-1.5 rounded-[9px] border border-[var(--in-line)] bg-[#f7fbff] px-2.5 text-[13.5px] font-semibold text-[var(--in-info)]";
  return (
    <div className="grid gap-1.5 rounded-lg border border-dashed border-[var(--in-line)] p-2.5" data-testid="crm-spot-review">
      <span className="text-[12.5px] font-bold uppercase tracking-[0.06em] text-[var(--in-sub)]">Per l'azienda</span>
      <div className="flex flex-wrap gap-1.5">
        <a href={spotReviewPath(spot.slug)} target="_blank" rel="noopener noreferrer" className={btn} data-testid="crm-spot-review-link">
          <FileCheck2 className="size-4" aria-hidden="true" /> Pagina per l'azienda
          <span className="sr-only">di {spot.sponsorName} (si apre in una nuova scheda)</span>
        </a>
        <button type="button" onClick={() => void copy()} className={btn} aria-label={`Copia il link della pagina per ${spot.sponsorName}`} data-testid="crm-spot-review-copy">
          {state === "done" ? <Check className="size-4" aria-hidden="true" /> : <Link2 className="size-4" aria-hidden="true" />}
          {state === "done" ? "Link copiato" : "Copia link"}
        </button>
      </div>
      {state === "manual" && (
        <label className="grid gap-1 text-[12.5px] text-[var(--in-sub)]">
          Copia il link a mano:
          <input ref={field} readOnly value={url} className="min-h-10 w-full rounded-md border border-[var(--in-line)] bg-white px-2 text-[13px] text-[#0b1e3a]" onFocus={(e) => e.currentTarget.select()} />
        </label>
      )}
      <span className="sr-only" aria-live="polite">
        {state === "done" ? "Link copiato" : ""}
      </span>
    </div>
  );
}

function VetrinaCard({ spot }: { spot: SponsorSpot }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="flex min-w-0 flex-col gap-2.5 rounded-xl border border-[var(--in-line)] bg-white p-3 shadow-[var(--in-card-shadow)]" data-testid="crm-spot-card">
      <div className="relative">
        <SpotStage spot={spot} play={open} mountVideo={open} controls />
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="scd-focus absolute inset-0 grid place-items-center rounded-[14px] bg-[#06142b]/20 transition-colors hover:bg-[#06142b]/5"
            aria-label={`Guarda lo spot di ${spot.sponsorName}`}
          >
            <span className="grid size-12 place-items-center rounded-full bg-[#ffd600] text-[#0b1e3a] shadow-lg">
              <Play className="size-5" fill="currentColor" aria-hidden="true" />
            </span>
          </button>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <b className="text-[15.5px] leading-tight">{spot.sponsorName}</b>
        <SpotStatusBadge status={spot.status} />
      </div>
      <p className="m-0 rounded-lg bg-[#f4f8fd] p-2.5 text-[13px] leading-snug text-[var(--in-sub)]" data-testid="crm-spot-caption">
        {spot.caption}
      </p>
      <div className="flex flex-wrap gap-1.5">
        <CopyCaption text={spot.caption} sponsor={spot.sponsorName} />
        <a
          href={spot.master}
          target="_blank"
          rel="noopener noreferrer"
          className="scd-focus inline-flex min-h-10 items-center gap-1.5 rounded-[9px] border border-[var(--in-line)] bg-[#f7fbff] px-2.5 text-[13.5px] font-semibold text-[var(--in-info)]"
        >
          <MonitorPlay className="size-4" aria-hidden="true" /> Master LED
        </a>
      </div>
      <SpotReviewLinks spot={spot} />
    </li>
  );
}

/* ------------------------------------------------------------ regia (gestionale) */

function mmss(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const sec = totalSeconds % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

/**
 * Regia of the LED wall inside the sponsor gestionale: what is on air now (same clock as the player and the home),
 * what comes next, the palinsesto of the loop and the calculated passes. Read-only: the rotation runs by itself.
 */
export function SpotRegia({ spots = SPONSOR_SPOTS }: { spots?: readonly SponsorSpot[] }) {
  const now = useNow(1000);
  const format = useVideoFormat();
  const [motionOk, setMotionOk] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined") setMotionOk(mayAnimate(window));
  }, []);
  const showable = useMemo(() => spotsForLedwall(spots), [spots]);
  const air = useMemo(() => (now ? ledOnAir(now, showable) : null), [now, showable]);
  const excluded = spots.length - showable.length;
  const n = showable.length;
  const videoRef = useRef<HTMLVideoElement>(null);
  const startAt = useRef(0);
  startAt.current = air?.elapsedMs ?? 0;
  const upcoming = air && now ? upcomingSlots(air, now, n) : [];

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    if (motionOk) v.play().catch(() => undefined);
  }, [air?.current?.slug, format, motionOk]);

  const onMeta = () => {
    const v = videoRef.current;
    const ms = startAt.current;
    if (v && ms > 500) {
      try {
        v.currentTime = ms / 1000;
      } catch {
        /* not seekable yet */
      }
    }
  };

  return (
    <section aria-labelledby="crm-regia-title" className="mt-3 min-w-0 overflow-hidden rounded-xl bg-[#06142b] p-3 text-white sm:p-4" data-testid="crm-spot-regia">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 id="crm-regia-title" className="m-0 inline-flex items-center gap-2 text-[15px] font-bold">
          <span className="relative inline-flex size-2.5">
            <span className="absolute inset-0 animate-ping rounded-full bg-[#ff4d4d] opacity-60 motion-reduce:animate-none" />
            <span className="relative inline-flex size-2.5 rounded-full bg-[#ff4d4d]" />
          </span>
          Regia LED wall · in diretta
        </h4>
        <a
          href="/ledwall/player"
          target="_blank"
          rel="noopener noreferrer"
          className="scd-focus inline-flex min-h-10 items-center gap-1.5 rounded-[9px] bg-[#ffd600] px-3 text-[13.5px] font-bold text-[#0b1e3a]"
          data-testid="crm-regia-player"
        >
          <MonitorPlay className="size-4" aria-hidden="true" /> Apri il player sul PC del LED wall
        </a>
      </div>
      <div className="mt-3 overflow-hidden rounded-[6px] bg-black ring-1 ring-white/15" style={{ aspectRatio: `${LED_MASTER.width} / ${LED_MASTER.height}` }}>
        {air?.current ? (
          <video
            key={`${air.current.slug}-${format}`}
            ref={videoRef}
            src={spotVideoFile(air.current.master, format)}
            onLoadedMetadata={onMeta}
            muted
            playsInline
            autoPlay={motionOk}
            controls={!motionOk}
            preload="auto"
            width={LED_MASTER.width}
            height={LED_MASTER.height}
            className="block size-full object-fill"
            aria-label={`In onda sul LED wall: ${air.current.sponsorName}`}
            data-testid="crm-regia-video"
          />
        ) : null}
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg bg-white/[0.07] p-2.5" aria-live="polite" aria-atomic="true">
          <span className="block text-[12px] font-bold uppercase tracking-[0.08em] text-white/60">In onda ora</span>
          <b className="block text-[16px] leading-tight" data-testid="crm-regia-current">
            {air?.current?.sponsorName ?? (n === 0 ? "Nessuno spot in rotazione" : "…")}
          </b>
        </div>
        <div className="rounded-lg bg-white/[0.07] p-2.5">
          <span className="block text-[12px] font-bold uppercase tracking-[0.08em] text-white/60">
            Poi{air ? ` · tra ${Math.ceil(air.remainingMs / 1000)} s` : ""}
          </span>
          <b className="block text-[16px] leading-tight tabular-nums" data-testid="crm-regia-next">
            {air?.next?.sponsorName ?? "…"}
          </b>
        </div>
      </div>
      <dl className="m-0 mt-2 grid grid-cols-3 gap-2 text-center" data-testid="crm-regia-stats">
        <div className="rounded-lg bg-white/[0.07] p-2">
          <dt className="text-[11.5px] text-white/60">Spot in rotazione</dt>
          <dd className="m-0 text-[18px] font-bold tabular-nums">{n}</dd>
        </div>
        <div className="rounded-lg bg-white/[0.07] p-2">
          <dt className="text-[11.5px] text-white/60">Giro completo</dt>
          <dd className="m-0 text-[18px] font-bold tabular-nums">{mmss(loopSeconds(n))}</dd>
        </div>
        <div className="rounded-lg bg-white/[0.07] p-2">
          <dt className="text-[11.5px] text-white/60">Passaggi per partner ogni ora</dt>
          <dd className="m-0 text-[18px] font-bold tabular-nums">{passesPerHour(n)}</dd>
        </div>
      </dl>
      <p className="m-0 mt-1.5 text-[12px] leading-snug text-white/60">
        Calcolato: {LED_MASTER.seconds} secondi a spot, {n} spot in giro, per ogni ora di LED wall acceso. Il pubblico non è stimato.
        {excluded > 0 ? ` ${excluded} spot fuori rotazione per modifiche richieste.` : ""}
      </p>
      {upcoming.length > 0 && (
        <ol className="m-0 mt-3 grid list-none gap-1 p-0" aria-label="Palinsesto del giro" data-testid="crm-regia-palinsesto">
          {upcoming.map(({ at, spot }, k) => (
            <li
              key={spot.slug}
              className={`flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13.5px] ${k === 0 ? "bg-[#ffd600] font-bold text-[#0b1e3a]" : "bg-white/[0.05]"}`}
              aria-current={k === 0 ? "true" : undefined}
            >
              <span className="w-[4.5rem] flex-none tabular-nums">{romeClock(at)}</span>
              <span className="min-w-0 flex-1 truncate">{spot.sponsorName}</span>
              {k === 0 ? <Radio className="size-4 flex-none" aria-label="in onda" /> : <span className="hidden flex-none sm:inline-flex"><SpotStatusBadge status={spot.status} /></span>}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

/** "Spot LED" section of the sponsor gestionale (/crm): every spot, its status and the approval flow. */
export function SpotLedVetrina({ spots = SPONSOR_SPOTS }: { spots?: readonly SponsorSpot[] }) {
  return (
    <section aria-labelledby="crm-spot-title" className="mt-4 rounded-2xl border border-[var(--in-line)] bg-white p-3 sm:p-4" data-testid="crm-spot-led">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-1 pb-2">
        <h3 id="crm-spot-title" className="m-0 text-[16px] font-bold">
          Spot LED · {spots.length} pronti
        </h3>
        <a
          href="/ledwall/player"
          target="_blank"
          rel="noopener noreferrer"
          className="scd-focus inline-flex min-h-10 items-center gap-1.5 rounded-md text-[14px] font-semibold text-[var(--in-info)]"
          data-testid="crm-spot-player"
        >
          Apri il player del LED wall <ArrowUpRight className="size-4" aria-hidden="true" />
        </a>
      </div>
      <p className="m-0 px-1 text-[14px] leading-snug text-[var(--in-sub)]">
        Gli spot girano da soli, tutti con lo stesso orologio: sul LED wall del campo, nella pagina iniziale dell'app e qui in regia.
        Nessun messaggio parte dall'app. Ogni spot ha anche una pagina per l'azienda, da aprire quando serve.
      </p>
      <SpotRegia spots={spots} />
      <ol className="m-0 mt-3 grid list-none gap-2 p-0 sm:grid-cols-3" aria-label="Come si approva uno spot" data-testid="crm-spot-flow">
        {SPOT_FLOW.map((step, i) => (
          <li key={step.key} className="flex gap-2.5 rounded-xl bg-[#e9f2fb] p-3">
            <span className="grid size-7 flex-none place-items-center rounded-full bg-white text-[13px] font-bold">{i + 1}</span>
            <span className="grid gap-0.5">
              <b className="text-[14px] leading-tight">{step.label}</b>
              <span className="text-[12.5px] leading-snug text-[var(--in-sub)]">{step.hint}</span>
            </span>
          </li>
        ))}
      </ol>
      <ul className="m-0 mt-3 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 2xl:grid-cols-3">
        {spots.map((s) => (
          <VetrinaCard key={s.slug} spot={s} />
        ))}
      </ul>
      <p className="m-0 mt-3 px-1 text-[13px] leading-snug text-[var(--in-sub)]" data-testid="crm-spot-note">
        Lo stato si aggiorna dal gestionale quando sarà attivo il registro spot (migrazione da approvare). Il tag social resta «[@handle da verificare]»
        finché il profilo ufficiale dello sponsor non è verificato. L'app non pubblica nulla sui social.
      </p>
    </section>
  );
}
