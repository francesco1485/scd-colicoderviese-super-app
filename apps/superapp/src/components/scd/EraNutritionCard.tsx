import {
  Apple,
  Droplets,
  Moon,
  Palette,
  Sandwich,
  Sparkles,
  Sunrise,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";

import { CastPortrait } from "@/components/scd/CastPortrait";
import { Card } from "@/components/scd/interior-ui";
import {
  ERA_DISCLAIMER,
  ERA_TIPS,
  dailyPick,
  romeDay,
} from "@/lib/era-nutrition-tips";

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
 * "I consigli di Era" (athlete and family area): Era is the club nutritionist (Direzione 14/10/2026). A highlighted
 * "consiglio del giorno" (same tip for everybody on a Rome day) and the other general healthy habits for young athletes.
 * Fixed copy from src/lib/era-nutrition-tips.ts (guarded: no numbers, no plans, no body-weight talk).
 * Era's picture shows only once the Direzione approves an image that fits the role (CastPortrait readiness check):
 * until then the card works without any portrait.
 */
export function EraNutritionCard({
  portraitReady,
  day,
}: {
  portraitReady?: boolean;
  day?: string;
}) {
  const today = dailyPick(ERA_TIPS, day ?? romeDay());
  const TodayIcon = ICONS[today.id] ?? Apple;
  return (
    <Card
      id="fam-era"
      title="I consigli di Era"
      sub="La nutrizionista del club: buone abitudini per chi fa sport, uguali per tutti."
    >
      <div className="flex flex-col gap-4 px-4 pb-4 sm:px-[18px] lg:flex-row lg:items-start">
        <CastPortrait
          id="era"
          ready={portraitReady}
          className="h-[150px] self-center lg:h-[220px] lg:self-start"
        />
        <div className="min-w-0 flex-1">
          <section
            aria-labelledby="era-oggi"
            className="mb-3 flex gap-3 rounded-xl border-2 border-[#ffd600] bg-white px-3.5 py-3"
            data-testid="era-tip-today"
          >
            <span className="mt-[2px] flex size-9 flex-none items-center justify-center rounded-full bg-[#0b2a5b] text-[#ffd600]">
              <TodayIcon
                className="size-[18px]"
                strokeWidth={2}
                aria-hidden="true"
              />
            </span>
            <span className="min-w-0">
              <span
                id="era-oggi"
                className="flex items-center gap-1.5 text-[13px] font-bold uppercase tracking-wide text-[#0860A8]"
              >
                <Sparkles
                  className="size-3.5"
                  strokeWidth={2}
                  aria-hidden="true"
                />
                Il consiglio di oggi
              </span>
              <b className="block text-[15.5px] font-bold leading-snug text-[#0b2a5b]">
                {today.title}
              </b>
              <span className="mt-0.5 block text-[14.5px] leading-snug text-[var(--in-ink,#0d1a3a)]">
                {today.text}
              </span>
            </span>
          </section>
          <ul
            className="m-0 grid list-none grid-cols-1 gap-2.5 p-0 md:grid-cols-2"
            data-testid="era-tips"
          >
            {ERA_TIPS.filter((t) => t.id !== today.id).map((t) => {
              const TipIcon = ICONS[t.id] ?? Apple;
              return (
                <li
                  key={t.id}
                  className="flex gap-3 rounded-xl bg-[#eef5fc] px-3.5 py-3"
                >
                  <span className="mt-[2px] flex size-9 flex-none items-center justify-center rounded-full bg-white text-[#0860A8]">
                    <TipIcon
                      className="size-[18px]"
                      strokeWidth={2}
                      aria-hidden="true"
                    />
                  </span>
                  <span className="min-w-0">
                    <b className="block text-[15.5px] font-bold leading-snug text-[#0b2a5b]">
                      {t.title}
                    </b>
                    <span className="mt-0.5 block text-[14.5px] leading-snug text-[var(--in-ink,#0d1a3a)]">
                      {t.text}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
          <p
            role="note"
            className="m-0 mt-3 rounded-xl bg-[var(--in-info-bg)] px-3.5 py-3 text-[14px] leading-snug text-[var(--in-info)]"
          >
            {ERA_DISCLAIMER}
          </p>
        </div>
      </div>
    </Card>
  );
}
