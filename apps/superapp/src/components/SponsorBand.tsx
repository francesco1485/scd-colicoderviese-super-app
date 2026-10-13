import { useRouterState } from "@tanstack/react-router";

import { SponsorLogo } from "@/components/scd/Logos";
import { SPONSORS } from "@/lib/sponsors";

/**
 * Fascia sponsor sempre visibile sopra la barra di navigazione (su desktop in fondo alla pagina).
 * Sponsor in corso 2026/27 dalla tavola della Direzione (12/10/2026), loghi originali non ridisegnati: src/lib/sponsors.ts.
 */
function Plates({ hidden = false }: { hidden?: boolean }) {
  return (
    <>
      {SPONSORS.map((s) => (
        <span key={s.slug + String(hidden)} className="flex h-[28px] w-[88px] shrink-0 items-center justify-center lg:h-[38px] lg:w-[116px]" aria-hidden={hidden || undefined}>
          <SponsorLogo sponsor={s} box={{ w: 104, h: 32 }} decorative={hidden} mono={false} />
        </span>
      ))}
    </>
  );
}

export function SponsorBand() {
  // The home shows the partners as a section and in its footer strip (UD-100): no duplicate fixed band there.
  const home = useRouterState({ select: (st) => st.location.pathname === "/" });
  return (
    <aside
      aria-label="I nostri sponsor"
      data-testid="sponsor-band"
      className={`fixed inset-x-0 bottom-[calc(62px+env(safe-area-inset-bottom))] z-[39] ${home ? "hidden" : "flex"} h-[34px] items-center overflow-hidden border-t-[2px] lg:h-[46px] lg:border-t-[3px] border-[var(--uv-gold)] bg-white lg:bottom-0`}
    >
      <span className="uv-notch relative z-[1] flex h-full shrink-0 items-center bg-[var(--uv-night)] pl-[12px] pr-[20px] font-uv text-[12px] lg:pl-[14px] lg:pr-[24px] lg:text-[14px] uppercase tracking-[0.12em] text-[var(--uv-gold)]">
        Sponsor
      </span>
      <div className="uv-marquee flex w-max items-center gap-3 pl-4 [--logo-k:0.78] lg:gap-5 lg:pl-6 lg:[--logo-k:1]" style={{ animationDuration: "140s" }}>
        <Plates />
        <Plates hidden />
      </div>
    </aside>
  );
}
