/**
 * Compact page header of the public pages in the SCD METAL "via di mezzo" style of the home (HomeLobby): one brushed
 * navy band with the official crest, a gold kicker, the title and one line of text, then the content right away.
 * Francesco 16/10/2026: «queste barre così grandi io non le voglio» — no photo, no tall hero, no texture.
 * Shared building blocks (wrap, white card with the silver top edge, label) live here so the pages stay consistent.
 */
import type { ReactNode } from "react";

import { ClubCrestOfficial } from "@/components/SiteChrome";

/** Content width of the public pages (same as the home). */
export const METAL_WRAP = "mx-auto w-full max-w-[1240px] px-4 lg:px-8";
/** White card with a thin metallic top edge (design system "via di mezzo", same as the home CARD). */
export const METAL_CARD =
  "relative overflow-hidden rounded-[12px] border border-[#d6deeb] bg-white shadow-[0_6px_18px_-14px_rgb(20_38_77/0.55)] before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:bg-[linear-gradient(90deg,#8ea2c6,#ffffff_22%,#b8c5dd_50%,#ffffff_78%,#8ea2c6)] before:content-['']";
/** Small caps label (kickers, section labels). */
export const METAL_LABEL = "font-display text-[11px] font-bold uppercase tracking-[0.1em] lg:text-[12px]";
/** Gold action (what you touch) and the quiet secondary action. */
export const METAL_CTA =
  "scd-gold scd-focus inline-flex min-h-11 items-center gap-1.5 rounded-[10px] px-4 font-display text-[15px] font-semibold";
export const METAL_GHOST =
  "scd-focus inline-flex min-h-11 items-center gap-1.5 rounded-[10px] border border-[#c3cee0] bg-white px-4 font-display text-[15px] font-semibold text-[#13254d] hover:bg-[#eef2f8]";

/** Section heading inside the white page (title + optional short line + optional link on the right). */
export function MetalHeading({ id, children, sub, action }: { id: string; children: ReactNode; sub?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3 pb-3">
      <div className="min-w-0">
        <h2 id={id} className="m-0 font-display text-[22px] font-bold leading-tight text-[#14264d] lg:text-[26px]">
          {children}
        </h2>
        {sub && <p className="m-0 mt-0.5 text-[13px] text-[#52627f] lg:text-[14px]">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function MetalPageHeader({
  kicker,
  title,
  children,
  action,
  crest = true,
  testId,
}: {
  kicker: string;
  title: ReactNode;
  /** One short line under the title. */
  children?: ReactNode;
  /** Optional actions on the right (desktop) / under the text (phone). */
  action?: ReactNode;
  /** false on pages that show another mark next to the title. */
  crest?: boolean;
  testId?: string;
}) {
  return (
    <header className="scd-band relative overflow-hidden text-white lg:-mr-12 2xl:mr-0" data-hero="metal" data-testid={testId}>
      <span aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(60%_120%_at_88%_0%,rgb(127_208_255/0.2),transparent_70%)]" />
      <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[2px] bg-[linear-gradient(90deg,#8ea2c6,#ffffff_22%,#b8c5dd_50%,#ffffff_78%,#8ea2c6)]" />
      <div className={`${METAL_WRAP} relative grid gap-3 py-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-8 lg:py-6`}>
        <div className="flex items-center gap-3 lg:gap-5">
          {crest && (
            <>
              <ClubCrestOfficial size={52} className="shrink-0 drop-shadow-[0_8px_16px_rgb(0_0_0/0.45)] lg:hidden" />
              <ClubCrestOfficial size={76} className="hidden shrink-0 drop-shadow-[0_10px_20px_rgb(0_0_0/0.45)] lg:block" />
            </>
          )}
          <div className="grid min-w-0 gap-0.5 lg:gap-1">
            <span className={`${METAL_LABEL} text-[#ffd23f]`}>{kicker}</span>
            <h1 className="m-0 font-display text-[26px] font-bold uppercase leading-[1.02] tracking-[0.01em] lg:text-[36px]">{title}</h1>
            {children && <p className="m-0 max-w-[62ch] text-[13px] leading-snug text-[#dbe5f7] lg:text-[16px]">{children}</p>}
          </div>
        </div>
        {action && <div className="flex flex-wrap items-center gap-2 lg:justify-end">{action}</div>}
      </div>
    </header>
  );
}
