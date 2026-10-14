import { Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight, Check, ChevronLeft, ChevronRight, Copy, MonitorPlay, Pause, Play } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { mayAnimate, stepIndex } from "@/lib/ledwall-rotation";
import {
  LED_MASTER,
  SPONSOR_SPOTS,
  SPOT_FLOW,
  SPOT_STATUS_LABEL,
  partnerHref,
  spotsForHome,
  spotsInDayOrder,
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
function SpotStage({
  spot,
  play,
  mountVideo,
  controls,
  onEnded,
  priority,
}: {
  spot: SponsorSpot;
  play: boolean;
  mountVideo: boolean;
  controls?: boolean;
  onEnded?: () => void;
  priority?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const src = spot.preview ?? spot.master;
  const strip = spot.preview === null;

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = true;
    if (play) v.play().catch(() => undefined);
    else v.pause();
  }, [play, mountVideo, spot.slug]);

  const media = mountVideo ? (
    <video
      key={spot.slug}
      ref={ref}
      src={src}
      poster={spot.poster}
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
export function SponsorSpotsHome({ day, className = "" }: { day: string; className?: string }) {
  const spots = useMemo(() => spotsInDayOrder(spotsForHome(), day), [day]);
  const n = spots.length;
  const { ref, visible, seen } = useOnScreen<HTMLElement>();
  const [idx, setIdx] = useState(0);
  const [auto, setAuto] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
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

  const go = useCallback(
    (delta: number) => {
      const next = stepIndex(idx, delta, n);
      setIdx(next);
      setManualPlay(false);
      const s = spots[next];
      if (s) setAnnounce(`${s.sponsorName}, spot ${next + 1} di ${n}`);
    },
    [idx, n, spots],
  );

  if (n === 0) return null;
  const spot = spots[Math.min(idx, n - 1)]!;
  const play = visible && (auto ? !userPaused : manualPlay);
  const mountVideo = seen && (auto || manualPlay);
  const link = partnerHref(spot);

  const onEnded = () => {
    if (auto && !userPaused) setIdx((i) => stepIndex(i, 1, n));
    else setManualPlay(false);
  };

  return (
    <section ref={ref} aria-labelledby="ledspot-t" className={`mx-auto w-full max-w-[1280px] px-4 pt-6 lg:px-8 lg:pt-10 ${className}`} data-testid="home-led-spots">
      <div className="grid gap-4 rounded-[22px] bg-white p-4 shadow-[0_1px_2px_rgb(11_42_91/0.06),0_8px_24px_-12px_rgb(11_42_91/0.25)] lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-center lg:gap-6 lg:p-6">
        <div className="min-w-0">
          <div className="relative">
            <SpotStage spot={spot} play={play} mountVideo={mountVideo} onEnded={onEnded} controls={!auto && manualPlay} priority={false} />
            <span className="pointer-events-none absolute left-2.5 top-2.5 rounded-full bg-[#0b2a5b]/85 px-2.5 py-1 text-[11.5px] font-bold uppercase leading-none tracking-[0.06em] text-white ring-1 ring-white/25 backdrop-blur-sm">
              Anteprima dello spot
            </span>
            {!auto && !manualPlay && (
              <button
                type="button"
                onClick={() => setManualPlay(true)}
                className="scd-focus absolute bottom-3 left-3 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#ffd600] py-2 pl-3 pr-4 text-[14px] font-bold text-[#0b1e3a] shadow-[0_10px_30px_-8px_rgb(2_20_51/0.6)]"
                data-testid="spot-play"
              >
                <Play className="size-4" fill="currentColor" aria-hidden="true" />
                Guarda lo spot
              </button>
            )}
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
            </p>
            <button type="button" className={ctrl} onClick={() => go(-1)} aria-label="Spot precedente">
              <ChevronLeft className="size-5" aria-hidden="true" />
            </button>
            {auto && (
              <button
                type="button"
                className={ctrl}
                onClick={() => setUserPaused((p) => !p)}
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
    </li>
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
          rel="noopener"
          className="scd-focus inline-flex min-h-10 items-center gap-1.5 rounded-md text-[14px] font-semibold text-[var(--in-info)]"
          data-testid="crm-spot-player"
        >
          Apri il player del LED wall <ArrowUpRight className="size-4" aria-hidden="true" />
        </a>
      </div>
      <p className="m-0 px-1 text-[14px] leading-snug text-[var(--in-sub)]">
        Gli spot girano già sulla pagina iniziale dell'app e sul LED wall. Niente invio per mail: lo spot si mostra allo sponsor dall'app.
      </p>
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
