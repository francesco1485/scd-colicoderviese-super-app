/**
 * Logo presentation shared by the LED ticker, the partner grid, the sponsor band, the footer and the affiliation
 * marks (Direzione 13/10/2026 15:31). Official files only, trimmed cut-outs (scripts/derive-logo-cutouts.py):
 * same tile for every logo, size normalised by visual area (lib/logo-fit), never upscaled. The cut-outs are made
 * for light surfaces, so tiles are always white. Partner logos are ALWAYS in full colour (UD-110, Direzione 13/10/2026:
 * "sponsor devono essere a colori"): the former greyscale-until-hover treatment is removed everywhere.
 */
import type { ReactNode } from "react";

import { CLUB_CREDENTIALS } from "@/lib/club-credentials";
import { fitLogo, sponsorArt, type Box } from "@/lib/logo-fit";
import { sponsorLabel, type Sponsor } from "@/lib/sponsors";

export function SponsorLogo({
  sponsor,
  box,
  decorative = false,
  className = "",
}: {
  sponsor: Sponsor;
  /** Inner box in CSS px: the same for every logo of a row. */
  box: Box;
  decorative?: boolean;
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
      className={`block max-w-full object-contain ${className}`}
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
 * The club's three credentials as distinct labelled items (Direzione 13/10/2026 15:55): logo + its own caption,
 * hairline dividers, consistent optical height, captions in small caps. Order and wording: lib/club-credentials.
 * - "bar": home credential bar (white), logo above the short caption on phones, logo beside title + issuer from sm.
 * - "plaque": compact white plaque in the desktop header, logo over the short caption.
 * - "list": stacked rows for the footer (logo + title + issuer).
 */
export function ClubCredentials({
  variant,
  className = "",
}: {
  variant: "bar" | "plaque" | "list";
  className?: string;
}) {
  if (variant === "list") {
    return (
      <ul
        className={`m-0 grid list-none gap-0 divide-y divide-[#e6edf6] p-0 ${className}`}
        data-testid="club-credentials"
        data-variant="list"
      >
        {CLUB_CREDENTIALS.map((c) => {
          const fit = fitLogo(c.art, { w: 76, h: 34 }, 0.62);
          return (
            <li
              key={c.id}
              className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
            >
              <span className="grid w-[76px] shrink-0 place-items-center">
                <img
                  src={c.art.src}
                  alt={c.alt}
                  width={fit.width}
                  height={fit.height}
                  decoding="async"
                  loading="lazy"
                  className="block object-contain"
                  style={{ width: fit.width, height: fit.height }}
                />
              </span>
              <span className="min-w-0 leading-tight">
                <span className="block text-[12.5px] font-bold uppercase tracking-[0.06em] text-[#0b2a5b]">
                  {c.title}
                </span>
                <span className="block text-[12px] text-[#5a6b85]">
                  {c.issuer}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    );
  }
  const plaque = variant === "plaque";
  return (
    <ul
      className={`m-0 grid list-none grid-cols-3 p-0 ${plaque ? "divide-x divide-[#dfe6f0]" : "divide-x divide-[#e3eaf3]"} ${className}`}
      data-testid="club-credentials"
      data-variant={variant}
    >
      {CLUB_CREDENTIALS.map((c) => {
        const fit = fitLogo(
          c.art,
          plaque ? { w: 58, h: 22 } : { w: 84, h: 28 },
          1,
        );
        const img = (
          <img
            src={c.art.src}
            alt=""
            width={fit.width}
            height={fit.height}
            decoding="async"
            className="block shrink-0 object-contain"
            style={{
              width: `calc(${fit.width}px * var(--logo-k, 1))`,
              height: `calc(${fit.height}px * var(--logo-k, 1))`,
            }}
          />
        );
        return (
          <li
            key={c.id}
            className={
              plaque
                ? "flex flex-col items-center justify-center gap-[3px] px-2.5"
                : "flex min-w-0 flex-col items-center justify-center gap-1.5 px-1 sm:px-3 lg:flex-row lg:gap-3 lg:px-4"
            }
            data-credential={c.id}
          >
            {img}
            <span className="sr-only">{c.alt}</span>
            {plaque ? (
              <span
                aria-hidden="true"
                className="whitespace-nowrap text-[9.5px] font-bold uppercase leading-none tracking-[0.08em] text-[#0b2a5b]"
              >
                {c.short}
              </span>
            ) : (
              <span
                aria-hidden="true"
                className="min-w-0 text-balance text-center leading-tight lg:text-left"
              >
                <span className="block text-[10px] font-bold uppercase tracking-[0.045em] text-[#0b2a5b] sm:hidden">
                  {c.short}
                </span>
                <span className="hidden text-[12px] font-bold uppercase tracking-[0.07em] text-[#0b2a5b] sm:block lg:text-[13px]">
                  {c.title}
                </span>
                <span className="hidden text-[11.5px] text-[#5a6b85] sm:block lg:text-[12.5px]">
                  {c.issuer}
                </span>
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
