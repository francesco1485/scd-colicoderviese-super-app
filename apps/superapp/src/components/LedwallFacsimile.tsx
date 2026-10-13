import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/**
 * "Il tuo marchio sul ledwall del campo" (sponsor web link /sponsor, area board LED-sponsor).
 * The video is a FAC-SIMILE given by the Direzione on 13/10/2026 to start promoting the pitch-side LED
 * board: the brand shown is only an example of a rotation and no agreement is stated or implied.
 * Muted loop; with prefers-reduced-motion it does not start by itself (poster + play button).
 * Asset registry: config/scd-assets.v1.json (class LED_DEMO_VIDEO / VIDEO_POSTER).
 */
export const LEDWALL_FACSIMILE = {
  poster: "/media/sponsor/ledwall-facsimile-poster.webp",
  hd: "/media/sponsor/ledwall-facsimile-1080.mp4",
  sd: "/media/sponsor/ledwall-facsimile-720.mp4",
  /** Wide screens get the 1080p file, every other screen the 720p one (first matching <source> wins). */
  hdMedia: "(min-width: 1200px)",
} as const;

/** Whether the video may start by itself: never when the visitor asked for reduced motion. */
export function mayAutoplay(win: Pick<Window, "matchMedia"> | undefined): boolean {
  if (!win || typeof win.matchMedia !== "function") return false;
  return !win.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function LedwallFacsimile({ onRequest }: { onRequest?: () => void }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = true;
    if (!mayAutoplay(typeof window === "undefined" ? undefined : window)) return;
    v.play().catch(() => setPlaying(false));
  }, []);

  const toggle = () => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) {
      v.muted = true;
      v.play().catch(() => setPlaying(false));
    } else v.pause();
  };

  return (
    <section aria-labelledby="ledwall-title" className="mx-auto mt-14 max-w-6xl px-4" data-testid="ledwall-facsimile">
      <p className="eyebrow">Campo &amp; territorio</p>
      <h2 id="ledwall-title" className="mt-1 text-3xl font-bold">Il tuo marchio sul ledwall del campo</h2>
      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <figure className="m-0">
          <div className="relative overflow-hidden rounded-2xl bg-[#0a1d38] shadow-premium">
            <video
              ref={ref}
              className="block aspect-video w-full object-cover"
              poster={LEDWALL_FACSIMILE.poster}
              muted
              loop
              playsInline
              preload="metadata"
              width={1280}
              height={720}
              aria-label="Fac-simile: ledwall a bordo campo con i messaggi di un marchio d'esempio in rotazione"
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
            >
              <source src={LEDWALL_FACSIMILE.hd} type="video/mp4" media={LEDWALL_FACSIMILE.hdMedia} />
              <source src={LEDWALL_FACSIMILE.sd} type="video/mp4" />
            </video>
            <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-[#0a1d38]/85 px-3 py-1 text-[12.5px] font-bold uppercase tracking-[0.06em] text-white ring-1 ring-white/25 backdrop-blur-sm" data-testid="ledwall-label">
              Fac-simile · esempio di rotazione
            </span>
            {playing ? (
              <button
                type="button"
                onClick={toggle}
                aria-label="Metti in pausa il video del ledwall"
                className="absolute bottom-3 right-3 flex size-11 items-center justify-center rounded-full bg-[#0a1d38]/80 text-white ring-1 ring-white/30 backdrop-blur-sm transition-transform duration-150 hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--scd-yellow,#f6c500)]"
              >
                <Pause className="size-5" aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                onClick={toggle}
                aria-label="Guarda il video del ledwall"
                className="absolute inset-0 flex items-center justify-center bg-[#0a1d38]/20 transition-colors duration-150 hover:bg-[#0a1d38]/10 focus-visible:outline-none"
                data-testid="ledwall-play"
              >
                <span className="flex size-16 items-center justify-center rounded-full bg-[#f6c500] text-[#0a1d38] shadow-[0_10px_30px_-8px_rgb(2_20_51/0.6)] ring-4 ring-white/70">
                  <Play className="ml-1 size-7" fill="currentColor" aria-hidden="true" />
                </span>
              </button>
            )}
          </div>
          <figcaption className="mt-2 text-xs text-muted-foreground">
            Fac-simile per mostrare come funziona la rotazione: il marchio nel video è solo un esempio di impaginazione, non un elenco dei partner del club.
          </figcaption>
        </figure>
        <div>
          <p className="text-base leading-relaxed">
            Il ledwall a bordo campo fa girare i messaggi dei partner uno dopo l'altro: ogni marchio ha il suo <strong>slot di rotazione</strong> e
            ritorna in campo a ogni giro, davanti a chi gioca e a chi guarda.
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            <li className="flex gap-2"><span aria-hidden="true" className="mt-[7px] size-1.5 flex-none rounded-full bg-[#f6c500]" />Nel tuo slot: logo, messaggio, servizi, zona e sito, in sequenza come nel fac-simile.</li>
            <li className="flex gap-2"><span aria-hidden="true" className="mt-[7px] size-1.5 flex-none rounded-full bg-[#f6c500]" />Numero di slot, durata e periodo si definiscono nella proposta, in base alla disponibilità.</li>
            <li className="flex gap-2"><span aria-hidden="true" className="mt-[7px] size-1.5 flex-none rounded-full bg-[#f6c500]" />I contenuti si concordano con la società prima della messa in onda.</li>
          </ul>
          <a
            href="#proposta"
            onClick={onRequest}
            className="surface-sun mt-6 inline-flex min-h-11 items-center rounded-lg px-5 py-2.5 text-sm font-bold uppercase"
            data-testid="ledwall-cta"
          >
            Richiedi una proposta per il ledwall
          </a>
        </div>
      </div>
    </section>
  );
}
