import { Apple, Droplets, Moon, Palette, Sandwich, Sunrise } from "lucide-react";
import type { ComponentType, SVGProps } from "react";

import { CastPortrait } from "@/components/scd/CastPortrait";
import { Card } from "@/components/scd/interior-ui";
import { GENNY_DISCLAIMER, GENNY_TIPS } from "@/lib/genny-tips";

type Icon = ComponentType<SVGProps<SVGSVGElement> & { strokeWidth?: number }>;

const ICONS: Readonly<Record<string, Icon>> = {
  acqua: Droplets,
  prima: Apple,
  dopo: Sandwich,
  colazione: Sunrise,
  colori: Palette,
  sonno: Moon,
};

/**
 * "I consigli di Genny" (athlete and family area): general healthy habits for young athletes.
 * Fixed copy from src/lib/genny-tips.ts (guarded: no numbers, no plans, no body-weight talk).
 * Genny's picture shows only once it is in the app (CastPortrait readiness check).
 */
export function GennyCard({ portraitReady }: { portraitReady?: boolean }) {
  return (
    <Card
      id="fam-genny"
      title="I consigli di Genny"
      sub="Abitudini sane per chi fa sport: acqua, spuntini, colazione, varietà e sonno."
    >
      <div className="flex flex-col gap-4 px-4 pb-4 sm:px-[18px] lg:flex-row lg:items-start">
        <CastPortrait
          id="genny"
          ready={portraitReady}
          className="h-[150px] self-center lg:h-[220px] lg:self-start"
        />
        <div className="min-w-0 flex-1">
          <ul className="m-0 grid list-none grid-cols-1 gap-2.5 p-0 md:grid-cols-2" data-testid="genny-tips">
            {GENNY_TIPS.map((t) => {
              const TipIcon = ICONS[t.id] ?? Apple;
              return (
                <li key={t.id} className="flex gap-3 rounded-xl bg-[#eef5fc] px-3.5 py-3">
                  <span className="mt-[2px] flex size-9 flex-none items-center justify-center rounded-full bg-white text-[#0860A8]">
                    <TipIcon className="size-[18px]" strokeWidth={2} aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <b className="block text-[15.5px] font-bold leading-snug text-[#0b2a5b]">{t.title}</b>
                    <span className="mt-0.5 block text-[14.5px] leading-snug text-[var(--in-ink,#0d1a3a)]">{t.text}</span>
                  </span>
                </li>
              );
            })}
          </ul>
          <p role="note" className="m-0 mt-3 rounded-xl bg-[var(--in-info-bg)] px-3.5 py-3 text-[14px] leading-snug text-[var(--in-info)]">
            {GENNY_DISCLAIMER}
          </p>
        </div>
      </div>
    </Card>
  );
}
