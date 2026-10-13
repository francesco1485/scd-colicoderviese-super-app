/**
 * Tornei hub (UD-110, Direzione 13/10/2026: "di eventi c'è anche il Nasazzi e la Christmas Cup è sia maschile che
 * femminile, anche il link tornei importante da sviluppare").
 *
 * Only facts the club already published or recorded; nothing is invented (UNKNOWN ≠ ZERO):
 * - Christmas Lario Cup 2026: lib/events.ts (official posters R02 maschile / R03 Female Edition, Master Tornei);
 * - Memorial José Nasazzi 2027: dates recorded in the club's Master Tornei & Iniziative (22–23 May 2027), programme,
 *   categories and registrations not published yet → status "date da confermare";
 * - Memorial Sandro Guattini: recurring youth tournament with a 2026 edition in the club archive; 2027 dates not
 *   published → "date in arrivo".
 * Guest teams are names only (crests need a verified source); no results, no minors.
 */
import { CHRISTMAS_LARIO_CUP } from "./events";

export type TournamentStatus =
  | "ISCRIZIONI_APERTE"
  | "IN_PROGRAMMA"
  | "DATE_DA_CONFERMARE"
  | "IN_PREPARAZIONE";

export const TOURNAMENT_STATUS_LABEL: Readonly<
  Record<TournamentStatus, string>
> = {
  ISCRIZIONI_APERTE: "Iscrizioni aperte",
  IN_PROGRAMMA: "In programma",
  DATE_DA_CONFERMARE: "Date da confermare",
  IN_PREPARAZIONE: "In preparazione",
};

export interface TournamentEdition {
  /** Anchor on /tornei. */
  id: string;
  name: string;
  /** "Maschile", "Femminile", "Giovanile". */
  section: string;
  /** Human date, exactly as known; null when not published. */
  when: string | null;
  /** ISO day of the (first) tournament day when certain, for ordering and windows. */
  date: string | null;
  place: string | null;
  categories: readonly string[];
  confirmedTeams: readonly string[];
  status: TournamentStatus;
  text: string;
  /** Existing page and CTA for details or registrations (null: no page yet). */
  link: { to: string; hash?: string; label: string } | null;
  poster: { src: string; alt: string } | null;
  source: string;
}

const clc = CHRISTMAS_LARIO_CUP;
type CupData = {
  city: string;
  venue: string;
  categories: readonly { title: string; note: string }[];
  confirmed: readonly { name: string; country?: string }[];
};
const clcMale: CupData = clc.cups[0]!;
const clcFemale: CupData = clc.cups[1]!;

export const TOURNAMENTS: readonly TournamentEdition[] = [
  {
    id: "christmas-lario-cup-maschile",
    name: "Christmas Lario Cup",
    section: "Maschile",
    when: clc.dateLabel,
    date: clc.start.slice(0, 10),
    place: `${clcMale.city} · ${clcMale.venue}`,
    categories: clcMale.categories.map((c) => `${c.title} · ${c.note}`),
    confirmedTeams: clcMale.confirmed.map((t) => t.name),
    status: "ISCRIZIONI_APERTE",
    text: `${clc.edition}: torneo giovanile maschile a Colico, con vivai professionistici e club del territorio.`,
    link: {
      to: "/eventi/christmas-lario-cup",
      hash: "iscrizioni",
      label: "Programma e iscrizioni",
    },
    poster: { src: clc.posters[0].src, alt: clc.posters[0].alt },
    source: clc.source,
  },
  {
    id: "christmas-lario-cup-female",
    name: "Christmas Lario Cup Female",
    section: "Femminile",
    when: clc.dateLabel,
    date: clc.start.slice(0, 10),
    place: `${clcFemale.city} · ${clcFemale.venue}`,
    categories: clcFemale.categories.map((c) => `${c.title} · ${c.note}`),
    confirmedTeams: clcFemale.confirmed.map((t) =>
      t.country ? `${t.name} (${t.country})` : t.name,
    ),
    status: "ISCRIZIONI_APERTE",
    text: `Female Edition a Dervio, in contemporanea al torneo maschile: stessa organizzazione, stesse iscrizioni.`,
    link: {
      to: "/eventi/christmas-lario-cup",
      hash: "iscrizioni",
      label: "Programma e iscrizioni",
    },
    poster: { src: clc.posters[1].src, alt: clc.posters[1].alt },
    source: clc.source,
  },
  {
    id: "memorial-jose-nasazzi",
    name: "Memorial José Nasazzi 2027",
    section: "Torneo del club",
    when: "22–23 maggio 2027",
    date: "2027-05-22",
    place: null,
    categories: [],
    confirmedTeams: [],
    status: "DATE_DA_CONFERMARE",
    text: "Lo storico torneo della società torna a maggio 2027. Categorie, campi e iscrizioni saranno pubblicati qui.",
    link: null,
    poster: null,
    source:
      "Master Tornei & Iniziative della società (date in programma, da confermare)",
  },
  {
    id: "memorial-sandro-guattini",
    name: "Memorial Sandro Guattini",
    section: "Giovanile",
    when: null,
    date: null,
    place: null,
    categories: [],
    confirmedTeams: [],
    status: "IN_PREPARAZIONE",
    text: "Torneo giovanile in ricordo di Sandro Guattini: dopo l'edizione 2026 la società prepara la prossima. Date in arrivo.",
    link: null,
    poster: null,
    source: "Archivio tornei della società (edizione 2026)",
  },
];

/** Tournaments still to be played (or without a date) on a Rome day, nearest first; undated last. */
export function upcomingTournaments(
  day: string,
  list: readonly TournamentEdition[] = TOURNAMENTS,
): TournamentEdition[] {
  return list
    .filter((t) => t.date === null || t.date >= day)
    .map((t, i) => ({ t, i }))
    .sort((a, b) => {
      if (a.t.date && b.t.date)
        return a.t.date.localeCompare(b.t.date) || a.i - b.i;
      if (a.t.date) return -1;
      if (b.t.date) return 1;
      return a.i - b.i;
    })
    .map((x) => x.t);
}

/** Every internal route the tornei hub links to. */
export function tournamentRoutes(
  list: readonly TournamentEdition[] = TOURNAMENTS,
): string[] {
  return [...new Set(list.flatMap((t) => (t.link ? [t.link.to] : [])))];
}
