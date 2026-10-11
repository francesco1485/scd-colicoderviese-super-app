import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

import { memberServices, priceLine } from "@/lib/member-services";

/**
 * "Per i tesserati" bar (UD-049): one horizontal strip inside the work areas with the
 * services and initiatives reserved to members, so the club can steer bookings and
 * purchases (laundry, infermeria, Club House…). Never shown on public pages.
 */
export function MemberServicesBar({ area }: { area?: string }) {
  const items = memberServices();
  if (!items.length) return null;
  return (
    <section aria-label="Iniziative per i tesserati" className="scd-scroll-x -mx-1 flex gap-2 overflow-x-auto px-1 pb-1" data-testid="member-services-bar">
      <span className="sticky left-0 z-[1] flex shrink-0 items-center gap-1.5 rounded-full bg-[var(--in-ink)] px-3 py-1.5 text-[12.5px] font-extrabold uppercase tracking-[0.05em] text-white">
        <Sparkles className="size-3.5" strokeWidth={2.2} aria-hidden="true" />
        Per i tesserati
      </span>
      {items.map((s) => {
        const here = area === s.area;
        return (
          <Link
            key={s.id}
            to={s.area === "club-house" ? "/tesoreria/club-house" : s.area === "infermeria" ? "/infermeria" : "/aree"}
            className={`flex min-w-[230px] max-w-[280px] shrink-0 flex-col gap-0.5 rounded-[14px] border px-3 py-2 text-left ${here ? "border-[var(--in-ink)] bg-white" : "border-[var(--in-line)] bg-white/80"}`}
          >
            <span className="flex items-center justify-between gap-2">
              <b className="truncate text-[14px]">{s.title}</b>
              {s.status === "PLANNED" && <span className="shrink-0 rounded-full bg-[#fff2cc] px-2 text-[11px] font-bold text-[#8a5a00]">in arrivo</span>}
            </span>
            <span className="line-clamp-2 text-[12.5px] leading-snug text-[var(--in-sub)]">{s.text}</span>
            <span className="text-[12.5px] font-bold text-[var(--in-info)]">{priceLine(s)}</span>
          </Link>
        );
      })}
    </section>
  );
}
