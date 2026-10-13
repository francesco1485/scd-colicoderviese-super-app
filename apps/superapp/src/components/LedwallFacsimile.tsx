import { Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { LedwallRotator } from "@/components/LedwallRotator";

/**
 * "Il tuo marchio sul ledwall del campo" (sponsor showcase /sponsor, area board LED-sponsor).
 * Main visual: the LED wall preview with every current partner in rotation (UD-107, LedwallRotator).
 * Secondary: the Direzione LED video of 13/10/2026 (UD-106), a FAC-SIMILE where the brand shown is only an example
 * of a rotation and no agreement is stated or implied. It loads only on request ("Guarda il video fac-simile"):
 * nothing is downloaded before the click, then it plays muted with controls.
 * Asset registry: config/scd-assets.v1.json (LED_BOARD_STILL, LED_DEMO_VIDEO, VIDEO_POSTER).
 */
export const LEDWALL_FACSIMILE = {
  poster: "/media/sponsor/ledwall-facsimile-poster.webp",
  hd: "/media/sponsor/ledwall-facsimile-1080.mp4",
  sd: "/media/sponsor/ledwall-facsimile-720.mp4",
  /** Wide screens get the 1080p file, every other screen the 720p one (first matching <source> wins). */
  hdMedia: "(min-width: 1200px)",
} as const;

function FacsimileVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!open || !v) return;
    v.muted = true;
    v.play().catch(() => undefined);
  }, [open]);

  return (
    <figure className="m-0" data-testid="ledwall-facsimile-video">
      <div className="relative overflow-hidden rounded-2xl bg-[#0a1d38] shadow-premium">
        {open ? (
          <video
            ref={ref}
            className="block aspect-video w-full object-cover"
            poster={LEDWALL_FACSIMILE.poster}
            muted
            loop
            playsInline
            controls
            preload="metadata"
            width={1280}
            height={720}
            aria-label="Fac-simile: ledwall a bordo campo con i messaggi di un marchio d'esempio in rotazione"
          >
            <source src={LEDWALL_FACSIMILE.hd} type="video/mp4" media={LEDWALL_FACSIMILE.hdMedia} />
            <source src={LEDWALL_FACSIMILE.sd} type="video/mp4" />
          </video>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="group relative block w-full focus-visible:outline-none"
            data-testid="ledwall-play"
          >
            <img
              src={LEDWALL_FACSIMILE.poster}
              alt=""
              width={1280}
              height={720}
              loading="lazy"
              decoding="async"
              className="block aspect-video w-full object-cover"
            />
            <span className="absolute inset-0 flex items-center justify-center bg-[#0a1d38]/30 transition-colors duration-150 group-hover:bg-[#0a1d38]/15">
              <span className="flex min-h-11 items-center gap-2 rounded-full bg-[#ffd600] py-2 pl-3 pr-4 text-[14px] font-bold text-[#0b1e3a] shadow-[0_10px_30px_-8px_rgb(2_20_51/0.6)] ring-4 ring-white/70 group-focus-visible:outline-3 group-focus-visible:outline-offset-2 group-focus-visible:outline-[#1898d8]">
                <Play className="size-4" fill="currentColor" aria-hidden="true" />
                Guarda il video fac-simile
              </span>
            </span>
          </button>
        )}
        <span
          className="pointer-events-none absolute left-3 top-3 rounded-full bg-[#0a1d38]/85 px-3 py-1 text-[12px] font-bold uppercase tracking-[0.06em] text-white ring-1 ring-white/25 backdrop-blur-sm"
          data-testid="ledwall-label"
        >
          Fac-simile · esempio di rotazione
        </span>
      </div>
      <figcaption className="mt-2 text-xs text-muted-foreground">
        Fac-simile per mostrare come funziona uno slot: il marchio nel video è solo un esempio di impaginazione. Il video si carica solo se lo
        avvii.
      </figcaption>
    </figure>
  );
}

export function LedwallFacsimile({ onRequest, day, nowMs }: { onRequest?: () => void; day: string; nowMs: number }) {
  return (
    <section aria-labelledby="ledwall-title" className="mx-auto mt-14 max-w-6xl px-4" data-testid="ledwall-facsimile">
      <p className="eyebrow">Campo &amp; territorio</p>
      <h2 id="ledwall-title" className="mt-1 text-3xl font-bold">Il tuo marchio sul ledwall del campo</h2>
      <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
        Tutti i partner della stagione girano sul ledwall a bordo campo. L'ordine cambia ogni giorno, così ogni marchio ha lo stesso spazio.
      </p>
      <LedwallRotator day={day} nowMs={nowMs} variant="full" className="mt-5" />
      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <div>
          <p className="text-base leading-relaxed">
            Il ledwall a bordo campo fa girare i messaggi dei partner uno dopo l'altro: ogni marchio ha il suo <strong>slot di rotazione</strong> e
            ritorna in campo a ogni giro, davanti a chi gioca e a chi guarda.
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            <li className="flex gap-2"><span aria-hidden="true" className="mt-[7px] size-1.5 flex-none rounded-full bg-[#f6c500]" />Nel tuo slot: logo, messaggio, servizi, zona e sito, in sequenza come nel video fac-simile.</li>
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
        <FacsimileVideo />
      </div>
    </section>
  );
}
