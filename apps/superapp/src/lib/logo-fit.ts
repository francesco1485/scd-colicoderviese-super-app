/**
 * Uniform logo boxes (Direzione 13/10/2026 15:31, "loghi sponsor ... sembrano fatti da bambini").
 *
 * Every logo gets the same box; inside it the size is normalised by visual area, so a wide wordmark and a square
 * badge read with the same optical weight: height = sqrt(area / aspect), clamped to the box. A logo is never shown
 * larger than its intrinsic pixels (no upscaling): low-resolution sources stay smaller until the sponsor sends a
 * better file.
 */
import { AFFILIATION_ART, SPONSOR_ART, type LogoArt } from "./logo-art.gen";
import type { Sponsor } from "./sponsors";

export interface Box {
  w: number;
  h: number;
}

export interface Fit {
  width: number;
  height: number;
  /** true when the intrinsic size, not the box, limited the logo (no upscaling). */
  capped: boolean;
}

/** Share of the box area a logo should cover (optical weight target). */
export const LOGO_AREA = 0.46;

/** Source files narrower than this are flagged as low resolution (logo to request from the sponsor). */
export const LOW_RES_WIDTH = 200;

export function fitLogo(
  art: Pick<LogoArt, "w" | "h">,
  box: Box,
  area: number = LOGO_AREA,
): Fit {
  if (!(art.w > 0 && art.h > 0 && box.w > 0 && box.h > 0))
    return { width: 0, height: 0, capped: false };
  const aspect = art.w / art.h;
  let h = Math.sqrt((box.w * box.h * area) / aspect);
  h = Math.min(h, box.h, box.w / aspect);
  let capped = false;
  if (h > art.h) {
    h = art.h;
    capped = true;
  }
  const width = Math.max(1, Math.round(h * aspect));
  return {
    width: Math.min(width, box.w),
    height: Math.max(1, Math.round(h)),
    capped,
  };
}

export const sponsorArt = (s: Pick<Sponsor, "slug">): LogoArt | null =>
  SPONSOR_ART[s.slug] ?? null;

export const isLowRes = (art: LogoArt | null): boolean =>
  !!art && (art.sourceWidth ?? art.w) < LOW_RES_WIDTH;

/** Sponsors whose only official file is below LOW_RES_WIDTH: list for the Direzione (logo request). */
export function lowResSponsors(list: readonly Sponsor[]): Sponsor[] {
  return list.filter((s) => isLowRes(sponsorArt(s)));
}

export { AFFILIATION_ART };
