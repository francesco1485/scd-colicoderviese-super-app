import { ArrowUpRight, Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { SpotStage } from "@/components/SponsorSpots";
import { partnerHref, spotsForLedwall } from "@/lib/sponsor-spots";
import { ledOnAir, loopSeconds, SPOT_SLOT_MS } from "@/lib/spot-schedule";
import { useNow } from "@/lib/use-spot-clock";

/**
 * The club LED wall, live on the sponsor page (Francesco 16/10/2026 20:56: «mancano i ledwall per sponsor a rotazione
 * sulla web app sponsor»). Same clock-synced rotation as the physical board (/ledwall/player, lib/spot-schedule): every
 * visitor sees the same partner at the same moment, 20 s each, every confirmed partner once per loop.
 * Video muted; the rotation stops with the pause button and never starts by itself with reduced motion (then the
 * partner on air shows its poster and plays only on request). Only sponsors of lib/sponsors.ts, spots without
 * "modifiche richieste" (lib/sponsor-spots isShowable).
 */
export function SponsorLedwallLive() {
  const spots = spotsForLedwall();
  const now = useNow(1000, 0);
  const [paused, setPaused] = useState(false);
  const [still, setStill] = useState(false);
  const [asked, setAsked] = useState(false);
  const [frozenAt, setFrozenAt] = useState<number | null>(null);
  const [visible, setVisible] = useState(true);
  const box = useRef<HTMLElement>(null);

  // Pause while the page is hidden or the board is off screen: no video download nobody watches.
  useEffect(() => {
    const el = box.current;
    const onVis = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVis);
    let io: IntersectionObserver | undefined;
    if (el && typeof IntersectionObserver === "function") {
      io = new IntersectionObserver((entries) => {
        const e = entries[0];
        if (e) setVisible(e.isIntersecting && document.visibilityState === "visible");
      });
      io.observe(el);
    }
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      io?.disconnect();
    };
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const set = () => setStill(mq.matches);
    set();
    mq.addEventListener("change", set);
    return () => mq.removeEventListener("change", set);
  }, []);

  if (spots.length === 0) return null;
  const ready = now > 0;
  const rolling = ready && !paused && (!still || asked);
  // Stopped (pause, or reduced motion before a tap): the board stays on the partner of that moment.
  const air = ledOnAir(ready ? (rolling ? now : (frozenAt ?? now)) : 0, spots);
  const current = air.current ?? spots[0]!;
  const playing = rolling && visible;
  const left = Math.max(0, Math.ceil(air.remainingMs / 1000));

  return (
    <section ref={box} className="mx-auto mt-14 max-w-6xl px-4" aria-labelledby="ledwall-title" data-testid="sponsor-ledwall">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow">Ledwall del campo</p>
          <h2 id="ledwall-title" className="mt-1 text-3xl font-bold">
            I nostri partner, a rotazione
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Ogni partner ha il suo spot di {SPOT_SLOT_MS / 1000} secondi; il giro completo dura {loopSeconds(spots.length)} secondi ed è uguale per tutti, come sul tabellone LED del campo.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (still && !asked) {
              setAsked(true);
              setPaused(false);
              setFrozenAt(null);
              return;
            }
            if (rolling) setFrozenAt(Date.now());
            else setFrozenAt(null);
            setPaused(rolling);
          }}
          className="scd-focus inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-[#c3cee0] bg-white px-4 font-display text-[15px] font-semibold text-[#13254d] hover:bg-[#eef2f8]"
          data-testid="ledwall-toggle"
        >
          {rolling ? <Pause className="size-4" aria-hidden="true" /> : <Play className="size-4" aria-hidden="true" />}
          {rolling ? "Ferma il ledwall" : "Guarda il ledwall"}
        </button>
      </div>

      <div className="mt-4 overflow-hidden rounded-[16px] ring-1 ring-[#b8c5dd]/50 shadow-[0_12px_28px_-18px_rgb(15_29_61/0.8)]">
        <SpotStage key={`${current.slug}-${air.slot}-${playing ? "on" : "off"}`} spot={current} play={playing} mountVideo={playing} startAtMs={air.elapsedMs} priority />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="m-0 flex items-center gap-2 font-semibold text-[#13254d]" aria-live="off">
          <span aria-hidden="true" className={`size-2 rounded-full ${rolling ? "scd-live-dot bg-[#ff4d5e]" : "bg-[#9aa8c2]"}`} />
          Ora in rotazione: {current.sponsorName}
          {rolling && air.next ? <span className="font-normal text-muted-foreground"> · tra {left} s {air.next.sponsorName}</span> : null}
        </p>
        <p className="m-0 text-xs text-muted-foreground">Anteprima dello spot come appare sul tabellone LED del campo.</p>
      </div>

      <ul className="m-0 mt-4 flex list-none flex-wrap gap-2 p-0" aria-label="Partner in rotazione oggi">
        {air.order.map((s) => {
          const on = s.slug === current.slug;
          const link = partnerHref(s);
          return (
            <li key={s.slug}>
              <a
                href={link.href}
                {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                aria-current={on ? "true" : undefined}
                className={`scd-focus inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 font-display text-[14px] font-semibold ring-1 ${on ? "scd-gold ring-transparent" : "bg-white text-[#13254d] ring-[#c3cee0] hover:bg-[#eef2f8]"}`}
              >
                {s.sponsorName}
                {link.external && <ArrowUpRight className="size-3.5" aria-hidden="true" />}
                {link.external && <span className="sr-only"> (sito ufficiale, apre una nuova scheda)</span>}
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
