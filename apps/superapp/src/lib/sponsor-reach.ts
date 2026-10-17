/**
 * «Perché conviene» on /sponsor: the reasons a company partners with the S.C.D. ColicoDerviese, as numbers only when
 * they are documented, otherwise «da confermare» (UNKNOWN ≠ ZERO; UD-149: never visibility numbers not published).
 *
 * Engine: SOLDI. Measured by: proposals received from /sponsor#proposta per month (submitPartnerLead register).
 *
 * Sources:
 * - partners: lib/sponsors.ts (the Direzione's 2026/27 board, 12/10/2026);
 * - guest teams: lib/events.ts confirmedCount() (official posters R02/R03 of the Christmas Lario Cup);
 * - territory: ISTAT resident population at 31/12/2024 (docs/piattaforme/ricerche/storia-territorio.md, VERIFIED:
 *   Tuttitalia for Colico, Urbistat for Dervio). Residents are the territory, not an audience: labelled as such;
 * - audience at the pitch and app users: not measured yet → «da confermare».
 */
import { confirmedCount } from "./events";
import { SPONSORS, SPONSORS_AS_OF } from "./sponsors";

export interface ReachFact {
  id: "partner" | "ospiti" | "territorio" | "pubblico";
  /** Documented value, or null = «da confermare». */
  value: string | null;
  label: string;
  source: string;
}

export const REACH_TO_CONFIRM = "da confermare";

/** ISTAT residents at 31/12/2024 (VERIFIED in the territory research of 17/10/2026). */
export const RESIDENTS = { colico: 8206, dervio: 2537, asOf: "2024-12-31" } as const;

/** Thousands with a dot, independent of the runtime ICU data. */
export const groupThousands = (n: number) =>
  Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");

export function reachFacts(): ReachFact[] {
  const guests = confirmedCount();
  return [
    {
      id: "partner",
      value: String(SPONSORS.length),
      label: "aziende partner nella stagione 2026/27",
      source: `Tavola sponsor della Direzione, ${SPONSORS_AS_OF.split("-").reverse().join("/")}`,
    },
    {
      id: "ospiti",
      value: guests > 0 ? String(guests) : null,
      label: "squadre ospiti già confermate alla Christmas Lario Cup, tra vivai professionistici e club del territorio",
      source: "Locandine ufficiali del torneo",
    },
    {
      id: "territorio",
      value: `${groupThousands(RESIDENTS.colico)} + ${groupThousands(RESIDENTS.dervio)}`,
      label: "residenti a Colico e a Dervio, i due paesi del club",
      source: "ISTAT, popolazione al 31/12/2024",
    },
    {
      id: "pubblico",
      value: null,
      label: "spettatori al campo e utenti dell'app: li misuriamo prima di dichiararli",
      source: "Misura in preparazione",
    },
  ];
}

export const reachValue = (f: ReachFact) => f.value ?? REACH_TO_CONFIRM;
