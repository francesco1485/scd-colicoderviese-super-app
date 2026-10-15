/**
 * "Chi sei? Ecco cosa trovi": the decision table of the signed-out home (study 15/10/2026, plan action 3). Five
 * profiles, three things each finds, one button to the area that already exists and a link to the matching section
 * of the guide. Phones stack the cards; from `lg` the five sit in one row. Data in lib/home-who.ts.
 */
import { Link } from "@tanstack/react-router";
import {
  BookOpen,
  Check,
  ClipboardList,
  Flag,
  Handshake,
  Home,
  Trophy,
} from "lucide-react";

import { WHO_ROWS, type WhoId } from "@/lib/home-who";

const ICON: Record<WhoId, typeof Flag> = {
  tifoso: Flag,
  famiglia: Home,
  atleta: Trophy,
  staff: ClipboardList,
  sponsor: Handshake,
};

const WRAP = "mx-auto w-full max-w-[1280px] px-4 lg:px-8";

export function HomeWho() {
  return (
    <section
      aria-labelledby="who-t"
      className={`${WRAP} pt-8 lg:pt-12`}
      data-testid="home-who"
    >
      <div className="grid gap-1 pb-3">
        <h2
          id="who-t"
          className="scd-reveal m-0 font-uv text-[24px] uppercase leading-none text-[#0b2a5b] sm:text-[26px] lg:text-[30px]"
        >
          Chi sei? Ecco cosa trovi
        </h2>
        <p className="m-0 text-[14px] text-[#4a5d7a]">
          Un ingresso per ognuno: tifosi senza registrazione, famiglie e staff
          con il proprio accesso.
        </p>
      </div>
      <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-5 lg:gap-4">
        {WHO_ROWS.map((r) => {
          const Icon = ICON[r.id];
          return (
            <li
              key={r.id}
              data-who={r.id}
              className="flex flex-col gap-2.5 rounded-[16px] bg-white p-4 shadow-[0_1px_2px_rgb(11_42_91/0.06),0_8px_24px_-12px_rgb(11_42_91/0.25)]"
            >
              <div className="flex items-center gap-2.5">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#0b2a5b] text-[#ffd600]">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span className="grid min-w-0">
                  <span className="text-[17px] font-bold leading-tight text-[#0b1e3a]">
                    {r.who}
                  </span>
                  <span className="text-[12.5px] leading-tight text-[#4a5d7a]">
                    {r.claim}
                  </span>
                </span>
              </div>
              <ul className="m-0 grid list-none gap-1.5 p-0 text-[14px] leading-snug text-[#0b1e3a]">
                {r.finds.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check
                      className="mt-[3px] size-3.5 shrink-0 text-[#157a3f]"
                      aria-hidden="true"
                    />
                    {f}
                  </li>
                ))}
              </ul>
              {/* Phone: button and guide link side by side. Five-up row: link above, button last, so the buttons
                  of the five cards sit on one line whatever each card holds. */}
              <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 lg:flex-col lg:items-start">
                <Link
                  to={r.href as never}
                  className="scd-focus inline-flex h-11 items-center rounded-[10px] bg-[#1556c4] px-4 text-[14px] font-bold text-white transition-[filter] duration-150 hover:brightness-110"
                >
                  {r.cta}
                </Link>
                {r.guide && (
                  <Link
                    to="/guida"
                    hash={r.guide}
                    className="scd-focus inline-flex min-h-11 items-center gap-1 rounded-md text-[13.5px] font-semibold text-[#1556c4] lg:order-first"
                  >
                    <BookOpen className="size-4" aria-hidden="true" />
                    Come si fa
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
