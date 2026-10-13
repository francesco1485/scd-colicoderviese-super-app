/**
 * Logo presentation shared by the LED ticker, the partner grid, the sponsor band, the footer and the affiliation
 * marks (Direzione 13/10/2026 15:31). Official files only, trimmed cut-outs (scripts/derive-logo-cutouts.py):
 * same tile for every logo, size normalised by visual area (lib/logo-fit), never upscaled. The cut-outs are made
 * for light surfaces, so tiles are always white. On desktop with a pointer, logos are greyscale until hover/focus.
 */
import { Fragment, type ReactNode } from "react";

import { AFFILIATION_ART, fitLogo, sponsorArt, type Box } from "@/lib/logo-fit";
import { sponsorLabel, type Sponsor } from "@/lib/sponsors";

export function SponsorLogo({
  sponsor,
  box,
  decorative = false,
  mono = true,
  className = "",
}: {
  sponsor: Sponsor;
  /** Inner box in CSS px: the same for every logo of a row. */
  box: Box;
  decorative?: boolean;
  /** Greyscale until hover (desktop, pointer devices only). */
  mono?: boolean;
  className?: string;
}) {
  const art = sponsorArt(sponsor);
  const src = art?.src ?? sponsor.src;
  const fit = art
    ? fitLogo(art, box)
    : { width: box.w, height: box.h, capped: false };
  return (
    <img
      src={src}
      alt={decorative ? "" : sponsorLabel(sponsor)}
      width={fit.width}
      height={fit.height}
      loading="lazy"
      decoding="async"
      draggable={false}
      data-low-res={fit.capped || undefined}
      className={`block max-w-full object-contain ${mono ? "scd-logo-mono" : ""} ${className}`}
      // --logo-k lets a container shrink every logo of a row by the same factor (e.g. the phone sponsor band).
      style={{
        width: `calc(${fit.width}px * var(--logo-k, 1))`,
        height: `calc(${fit.height}px * var(--logo-k, 1))`,
      }}
    />
  );
}

/** White tile with hairline border; children: one SponsorLogo. */
export function LogoTile({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`scd-logo-tile grid place-items-center rounded-[10px] border border-[#e1e8f2] bg-white ${className}`}
    >
      {children}
    </span>
  );
}

/**
 * The three official affiliation marks (FIGC SGS Club 3° livello, LND, Insieme al Monza): only the registered
 * official files, cut out and trimmed; Monza is the registered "Insieme al Monza" affiliation badge only.
 */
export function AffiliationMarks({
  box,
  gapClass = "gap-4",
  divider = true,
  className = "",
}: {
  box: Box;
  gapClass?: string;
  divider?: boolean;
  className?: string;
}) {
  return (
    <ul
      className={`m-0 flex list-none items-center p-0 ${gapClass} ${className}`}
      data-testid="affiliation-marks"
    >
      {AFFILIATION_ART.map((a, i) => {
        const fit = fitLogo(a, box, 0.62);
        return (
          <Fragment key={a.id}>
            {divider && i > 0 && (
              <li
                aria-hidden="true"
                className="h-7 w-px shrink-0 bg-[#d7e0ec]"
              />
            )}
            <li className="flex shrink-0 items-center">
              <img
                src={a.src}
                alt={a.label}
                width={fit.width}
                height={fit.height}
                decoding="async"
                className="block object-contain"
                style={{
                  width: `calc(${fit.width}px * var(--logo-k, 1))`,
                  height: `calc(${fit.height}px * var(--logo-k, 1))`,
                }}
              />
            </li>
          </Fragment>
        );
      })}
    </ul>
  );
}
