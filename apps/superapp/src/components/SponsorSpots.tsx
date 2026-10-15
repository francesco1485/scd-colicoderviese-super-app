import { ArrowUpRight, Check, Copy, FileCheck2, Link2, MonitorPlay, Play, Radio } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { spotReviewPath, spotReviewUrl } from "@/lib/spot-review";
import { ledOnAir, loopSeconds, passesPerHour, romeClock, spotVideoFile, upcomingSlots } from "@/lib/spot-schedule";
import { useNow, useVideoFormat } from "@/lib/use-spot-clock";
import {
  LED_MASTER,
  SPONSOR_SPOTS,
  SPOT_FLOW,
  SPOT_STATUS_LABEL,
  spotsForLedwall,
  type SponsorSpot,
  type SpotStatus,
} from "@/lib/sponsor-spots";

/**
 * Sponsor LED spots (UD-119) in the sponsor gestionale (/crm) and the spot page (/spot/$slug). No vetrine (Francesco
 * 15/10/2026): no rotating or auto-playing spots in the app; a video plays only when the user presses play. Only the
 * physical LED wall player (/ledwall/player) rotates. Data and rules: src/lib/sponsor-spots.ts.
 */

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

/* ------------------------------------------------------------ gestionale: spot list */

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

function SpotCard({ spot }: { spot: SponsorSpot }) {
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
 * Regia of the LED wall inside the sponsor gestionale: which spot is on the pitch-side board now (same clock as the
 * player), what comes next, the palinsesto of the loop and the calculated passes. Text only: no video plays here.
 */
export function SpotRegia({ spots = SPONSOR_SPOTS }: { spots?: readonly SponsorSpot[] }) {
  const now = useNow(1000);
  const showable = useMemo(() => spotsForLedwall(spots), [spots]);
  const air = useMemo(() => (now ? ledOnAir(now, showable) : null), [now, showable]);
  const excluded = spots.length - showable.length;
  const n = showable.length;
  const upcoming = air && now ? upcomingSlots(air, now, n) : [];

  return (
    <section aria-labelledby="crm-regia-title" className="mt-3 min-w-0 overflow-hidden rounded-xl bg-[#06142b] p-3 text-white sm:p-4" data-testid="crm-spot-regia">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 id="crm-regia-title" className="m-0 text-[15px] font-bold">
          Regia LED wall · sul tabellone del campo
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
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg bg-white/[0.07] p-2.5">
          <span className="block text-[12px] font-bold uppercase tracking-[0.08em] text-white/60">Sul tabellone ora</span>
          <b className="block text-[16px] leading-tight" data-testid="crm-regia-current">
            {air?.current?.sponsorName ?? (n === 0 ? "Nessuno spot in rotazione" : "…")}
          </b>
        </div>
        <div className="rounded-lg bg-white/[0.07] p-2.5">
          <span className="block text-[12px] font-bold uppercase tracking-[0.08em] text-white/60">Poi</span>
          <b className="block text-[16px] leading-tight" data-testid="crm-regia-next">
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

/** "Spot LED" section of the sponsor gestionale (/crm): a plain list of every spot, its status and the approval flow. */
export function SpotLedList({ spots = SPONSOR_SPOTS }: { spots?: readonly SponsorSpot[] }) {
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
        Gli spot girano sul LED wall del campo. Qui sono in elenco: un video parte solo se premi play.
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
          <SpotCard key={s.slug} spot={s} />
        ))}
      </ul>
      <p className="m-0 mt-3 px-1 text-[13px] leading-snug text-[var(--in-sub)]" data-testid="crm-spot-note">
        Lo stato si aggiorna dal gestionale quando sarà attivo il registro spot (migrazione da approvare). Il tag social resta «[@handle da verificare]»
        finché il profilo ufficiale dello sponsor non è verificato. L'app non pubblica nulla sui social.
      </p>
    </section>
  );
}
