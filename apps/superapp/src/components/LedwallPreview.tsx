import { useState, type CSSProperties } from "react";

import { LEDWALL_BOARD, LEDWALL_STILL, ledArt } from "@/lib/ledwall-rotation";
import { SPONSOR_ART } from "@/lib/logo-art.gen";
import { sponsorLabel, type Sponsor } from "@/lib/sponsors";

/**
 * Static LED wall preview: one partner logo on the real pitch-side board of the club still. Nothing moves and nothing
 * rotates (Francesco 15/10/2026: no "vetrine" in the apps). Honest label: it is a composite preview, not footage.
 * The physical LED wall keeps its own rotation in /ledwall/player.
 */
export function LedwallPreview({
  sponsor,
  label = "Anteprima ledwall",
  className = "",
}: {
  sponsor: Sponsor;
  label?: string;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  const name = sponsorLabel(sponsor);
  const art = SPONSOR_ART[sponsor.slug];
  const boardStyle: CSSProperties = {
    left: `${LEDWALL_BOARD.left}%`,
    top: `${LEDWALL_BOARD.top}%`,
    width: `${LEDWALL_BOARD.width}%`,
    height: `${LEDWALL_BOARD.height}%`,
  };
  return (
    <figure className={`scd-ledrot m-0 ${className}`} data-variant="full" data-testid="ledwall-preview">
      <div className="scd-ledrot-frame">
        <div className="scd-ledrot-stage">
          <img
            src={LEDWALL_STILL.src}
            srcSet={LEDWALL_STILL.srcSet}
            sizes="(min-width: 1200px) 1152px, 130vw"
            width={LEDWALL_STILL.width}
            height={LEDWALL_STILL.height}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            className="absolute inset-0 block size-full object-cover"
          />
          <div className="scd-ledrot-board" style={boardStyle} data-kind="partner" data-testid="ledwall-board">
            <div className="scd-ledrot-slot" style={{ animation: "none" }}>
              {broken ? (
                <span className="scd-ledrot-fallback">{name}</span>
              ) : (
                <img
                  src={ledArt(sponsor)}
                  alt={name}
                  width={art?.w}
                  height={art?.h}
                  loading="lazy"
                  decoding="async"
                  className="scd-ledrot-logo"
                  onError={() => setBroken(true)}
                />
              )}
            </div>
            <span aria-hidden="true" className="scd-ledrot-grid" />
          </div>
        </div>
        <span
          className="pointer-events-none absolute left-2.5 top-2.5 rounded-full bg-[#0b2a5b]/85 px-2.5 py-1 text-[11.5px] font-bold uppercase leading-none tracking-[0.06em] text-white ring-1 ring-white/25 backdrop-blur-sm sm:left-3 sm:top-3 sm:text-[12.5px]"
          data-testid="ledwall-preview-label"
        >
          {label}
        </span>
      </div>
      <figcaption className="sr-only">{`${label}: il marchio di ${name} sul ledwall a bordo campo (immagine composta, non una ripresa).`}</figcaption>
    </figure>
  );
}
