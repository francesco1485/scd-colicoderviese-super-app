/**
 * Header of the public content pages opened from the vetrina (/tornei, /rassegna-stampa, /kit): same graphic system
 * as the public home (navy, Lario scenery, Anton caps title with the yellow keyword, white cards on the light page).
 * "Stesse impostazioni grafiche da per tutto" (Direzione 13/10/2026).
 */
import type { ReactNode } from "react";
import { BoardMenuButton } from "@/components/scd/BoardMenuButton";

export const PUBLIC_WRAP = "mx-auto w-full max-w-[1280px] px-4 lg:px-8";

export function PublicPageHeader({
  eyebrow,
  title,
  accent,
  children,
  action,
}: {
  eyebrow: string;
  /** First part of the title (white). */
  title: string;
  /** Keyword of the title (yellow). */
  accent?: string;
  children?: ReactNode;
  /** Optional row under the subtitle (e.g. the ShareButton of a public page). */
  action?: ReactNode;
}) {
  return (
    <header
      className="relative isolate overflow-hidden bg-[#0b2a5b] text-white"
      data-hero="page"
    >
      <img
        src="/media/scd/lario-header.webp"
        alt=""
        aria-hidden="true"
        decoding="async"
        className="absolute inset-0 -z-10 size-full object-cover object-[center_55%] opacity-55"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgb(7_29_66/0.5),#0b2a5b_92%)] lg:bg-[linear-gradient(90deg,rgb(11_42_91/0.96)_0%,rgb(11_42_91/0.82)_50%,rgb(11_42_91/0.35)_100%)]"
      />
      <div className={`${PUBLIC_WRAP} pb-7 pt-6 lg:pb-12 lg:pt-12`}>
        <div className="flex items-start justify-between gap-3">
          <p className="m-0 text-[12px] font-extrabold uppercase tracking-[0.14em] text-[#ffd600]">
            {eyebrow}
          </p>
          <BoardMenuButton className="-mr-1 -mt-2" />
        </div>
        <h1 className="m-0 mt-2 font-uv text-[38px] uppercase leading-[0.95] sm:text-[46px] lg:text-[60px]">
          {title}
          {accent && <span className="text-[#ffd600]"> {accent}</span>}
        </h1>
        {children && (
          <div className="mt-3 max-w-[60ch] text-[15.5px] leading-snug text-white/90 lg:text-[17px]">
            {children}
          </div>
        )}
        {action && <div className="mt-4 lg:mt-5">{action}</div>}
      </div>
    </header>
  );
}
