/**
 * "Tesserati e famiglie: come funziona" — the club's ticket-office board (Direzione 13/10/2026) rebuilt as
 * an accessible block. Every rule and price comes from config/scd-ticketing.v1.json (CONFIRMED 12/10/2026):
 * nothing is written here that the configuration does not say.
 */
import {
  AlertTriangle,
  ChevronRight,
  Ticket,
  User,
  UserPlus,
  Users,
} from "lucide-react";
import { useId } from "react";

import { TICKETING, euro } from "@/lib/match-extras";

type Step = {
  n: number;
  who: string;
  detail: string;
  badge: "GRATIS" | "RIDOTTO";
  icon: typeof User;
};

/** The three steps of the members' rule, in the order of the club board. */
export const MEMBER_STEPS: readonly Step[] = [
  {
    n: 1,
    who: "Tesserato SCD",
    detail: "Con la tessera atleta",
    badge: "GRATIS",
    icon: User,
  },
  {
    n: 2,
    who: "2 familiari",
    detail: "Dello stesso nucleo",
    badge: "GRATIS",
    icon: Users,
  },
  {
    n: 3,
    who: "Dal terzo familiare",
    detail: "Stesso nucleo",
    badge: "RIDOTTO",
    icon: UserPlus,
  },
];

export function TicketRules() {
  const id = useId();
  const tariffs = Object.values(TICKETING.tariffs);
  return (
    <section
      aria-labelledby={`${id}-t`}
      className="scd-card overflow-hidden"
      data-testid="ticket-rules"
    >
      <header className="relative isolate overflow-hidden px-4 pb-4 pt-4 text-white sm:px-5">
        <div
          aria-hidden="true"
          className="scd-kit-stripes absolute inset-0 -z-10"
        />
        <p className="m-0 inline-flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.1em] text-[#ffe25a]">
          <Ticket className="size-4" aria-hidden="true" />
          Biglietteria · Tesserati e famiglie
        </p>
        <h2
          id={`${id}-t`}
          className="m-0 mt-1 font-uv text-[30px] uppercase leading-[0.95] sm:text-[36px]"
        >
          Come <span className="scd-brush">funziona</span>
        </h2>
      </header>

      <ol className="m-0 grid list-none gap-2 p-4 sm:grid-cols-3 sm:gap-3 sm:p-5">
        {MEMBER_STEPS.map((s) => {
          const Icon = s.icon;
          const free = s.badge === "GRATIS";
          return (
            <li
              key={s.n}
              className="relative flex items-center gap-3 rounded-[14px] border border-[#dbe3ee] bg-white p-3"
              data-testid={`ticket-step-${s.n}`}
            >
              <span
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-[#ffd600] font-uv text-[20px] text-[#0b2a5b]"
                aria-hidden="true"
              >
                {s.n}
              </span>
              <span className="grid min-w-0 flex-1 gap-0.5">
                <b className="flex items-center gap-1.5 text-[15.5px] leading-tight text-[#0b1e3a]">
                  <Icon
                    className="size-4 shrink-0 text-[#1556c4]"
                    aria-hidden="true"
                  />
                  {s.who}
                </b>
                <span className="text-[13px] text-[#4a5d7a]">{s.detail}</span>
              </span>
              <span
                className={`shrink-0 rounded-[8px] px-2.5 py-1 font-uv text-[17px] leading-none tracking-[0.02em] text-white ${free ? "bg-[#1a7f45]" : "bg-[#c8102e]"}`}
              >
                {s.badge}
              </span>
              {s.n < 3 && (
                <ChevronRight
                  className="absolute -right-3 top-1/2 hidden size-5 -translate-y-1/2 text-[#ffd600] sm:block"
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>

      <div className="grid gap-3 px-4 pb-4 sm:px-5 sm:pb-5">
        <p className="m-0 rounded-[12px] bg-[#0b2a5b] px-3 py-2.5 text-[14px] font-semibold leading-snug text-white">
          Vale per tutte le gare casalinghe di campionato con biglietto a
          pagamento, qualunque sia la categoria del tesserato.
        </p>
        <p
          className="m-0 flex gap-2 rounded-[12px] border border-[#f3c4cc] bg-[#fff1f3] px-3 py-2.5 text-[14px] leading-snug text-[#7a0f22]"
          data-testid="ticket-cup"
        >
          <AlertTriangle
            className="mt-0.5 size-4 shrink-0"
            aria-hidden="true"
          />
          <span>
            <b>Non sempre valido.</b> {TICKETING.cup}.
          </span>
        </p>

        <div className="grid gap-2">
          <h3 className="m-0 text-[15px] font-bold text-[#0b1e3a]">
            Prezzi 2026/27
          </h3>
          <ul className="m-0 grid list-none gap-1.5 p-0 sm:grid-cols-3 sm:gap-2">
            {tariffs.map((t) => (
              <li
                key={t.label}
                className="grid gap-0.5 rounded-[12px] bg-[#f4f7fb] px-3 py-2"
              >
                <span className="text-[13.5px] font-semibold text-[#0b1e3a]">
                  {t.label}
                </span>
                <span className="text-[14px] text-[#3e5272]">
                  Intero <b className="text-[#0b2a5b]">{euro(t.intero)}</b> ·
                  Ridotto <b className="text-[#0b2a5b]">{euro(t.ridotto)}</b>
                </span>
              </li>
            ))}
          </ul>
          <p className="m-0 text-[13px] leading-snug text-[#4a5d7a]">
            {TICKETING.bambiniNote}. Ridotto {TICKETING.ridottoNote}.{" "}
            {TICKETING.freeCompetitions}.
          </p>
        </div>

        <p className="m-0 text-[13px] leading-snug text-[#4a5d7a]">
          <b className="text-[#0b1e3a]">Chi rientra nel nucleo familiare?</b> I
          familiari comunicati alla società all'iscrizione o al tesseramento. Se
          non risultano negli elenchi, la posizione si aggiorna in segreteria.
        </p>
      </div>
    </section>
  );
}
