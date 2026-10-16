import { SponsorLogo } from "@/components/scd/Logos";
import { SPONSORS } from "@/lib/sponsors";

/**
 * Fascia sponsor sempre visibile, sottile, sopra la barra di navigazione (su desktop in fondo all'area dei contenuti,
 * a destra della barra laterale).
 * Sponsor in corso 2026/27 dalla tavola della Direzione (12/10/2026), loghi originali non ridisegnati: src/lib/sponsors.ts.
 */
function Plates({ hidden = false }: { hidden?: boolean }) {
  return (
    <>
      {SPONSORS.map((s) => (
        <span key={s.slug + String(hidden)} className="flex h-[24px] w-[80px] shrink-0 items-center justify-center lg:h-[38px] lg:w-[116px]" aria-hidden={hidden || undefined}>
          <SponsorLogo sponsor={s} box={{ w: 104, h: 32 }} decorative={hidden} />
        </span>
      ))}
    </>
  );
}

export function SponsorBand() {
  // Shown on every public page, the home included (UD-134, Francesco 15/10/2026 09:18: "era ottima la barra
  // scorrevole sponsor sotto").
  return (
    <aside
      aria-label="I nostri sponsor"
      data-testid="sponsor-band"
      className="fixed inset-x-0 bottom-[calc(60px+env(safe-area-inset-bottom))] z-[39] flex h-[30px] items-center overflow-hidden border-t border-[#e3eaf4] bg-[#f7f9fc] lg:bottom-0 lg:left-[240px] lg:h-[46px] lg:bg-white lg:shadow-[0_-4px_16px_-8px_rgb(11_42_91/0.2)]"
    >
      <span className="relative z-[1] ml-2 flex h-[20px] shrink-0 items-center rounded-full bg-[#13254d] px-2.5 text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-white shadow-[4px_0_10px_6px_#f7f9fc] lg:ml-4 lg:h-[26px] lg:px-3.5 lg:text-[12px] lg:shadow-[6px_0_12px_8px_#fff]">
        Sponsor
      </span>
      <div className="uv-marquee flex w-max items-center gap-3 pl-4 [--logo-k:0.78] lg:gap-5 lg:pl-6 lg:[--logo-k:1]" style={{ animationDuration: "140s" }}>
        <Plates />
        <Plates hidden />
      </div>
      {/* Phones: a white cap at the right end where the chat button sits, so no logo hides behind it. */}
      <span aria-hidden="true" className="absolute inset-y-0 right-0 z-[1] w-[76px] bg-[#f7f9fc] lg:hidden" />
    </aside>
  );
}
