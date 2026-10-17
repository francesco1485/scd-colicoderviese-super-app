/**
 * Pure logic of the public /tornei hub (Francesco 17/10/2026 08:22: «la piattaforma sponsor e tornei fa pietà…
 * migliorala»; IDEE I-261017-24 poster structure: annate in a row, six service icons, «Vivi il Lago» band).
 *
 * Engine: PERSONE (teams that sign up, families that come to the lake) and SOLDI (tournament partners).
 * Measured by: clicks on «Iscrivi la squadra» and on «Condividi» per tournament (Meta platform 22, once analytics
 * consent exists), and the confirmed guest teams published by the organisation.
 *
 * Rules (UNKNOWN ≠ ZERO):
 * - a tournament gets a full card only when date, place and an existing programme/registration page are published;
 *   otherwise it is one compact «In arrivo» row (no empty trophy card);
 * - a service is "confermato" only when its text is in lib/tournaments.ts (taken from the official posters and the
 *   tournament page); every other service reads «da confermare»;
 * - the «Vivi il Lago» facts are VERIFIED public facts from docs/piattaforme/ricerche/storia-territorio.md, each with
 *   its source; no opening hours, prices or offers of third parties.
 */
import { eventCountdown } from "./events";
import {
  upcomingTournaments,
  type TournamentEdition,
  type TournamentServiceId,
} from "./tournaments";

export const TOURNAMENT_SERVICE_IDS: readonly TournamentServiceId[] = [
  "partite",
  "ristorazione",
  "foto-video",
  "organizzazione",
  "ospitalita",
  "territorio",
];

export const TOURNAMENT_SERVICE_LABEL: Readonly<Record<TournamentServiceId, string>> = {
  partite: "Partite garantite",
  ristorazione: "Ristorazione",
  "foto-video": "Foto e video",
  organizzazione: "Organizzazione",
  ospitalita: "Ospitalità",
  territorio: "Territorio",
};

export const TO_CONFIRM = "da confermare";

export interface ServiceFact {
  id: TournamentServiceId;
  label: string;
  confirmed: boolean;
  /** Published text, or «da confermare». */
  text: string;
}

/** The six services of a tournament, in poster order; unknown ones are «da confermare», never implied. */
export function serviceFacts(t: Pick<TournamentEdition, "services">): ServiceFact[] {
  return TOURNAMENT_SERVICE_IDS.map((id) => {
    const text = t.services?.[id]?.trim();
    return {
      id,
      label: TOURNAMENT_SERVICE_LABEL[id],
      confirmed: Boolean(text),
      text: text || TO_CONFIRM,
    };
  });
}

/** Full card only with date, place and an existing page for programme and registrations. */
export function isPublished(t: TournamentEdition): boolean {
  return Boolean(t.date && t.when && t.place && t.link);
}

export interface TournamentBoard {
  /** Next published tournament with an exact start: the hero with the countdown. */
  hero: TournamentEdition | null;
  /** Published tournaments, nearest first (full cards). */
  published: TournamentEdition[];
  /** Tournaments without a published programme (one compact «In arrivo» row each). */
  coming: TournamentEdition[];
}

/** Splits the upcoming tournaments of a Rome day into hero, full cards and «In arrivo» rows. */
export function tournamentBoard(
  today: string,
  list?: readonly TournamentEdition[],
): TournamentBoard {
  const upcoming = upcomingTournaments(today, list);
  const published = upcoming.filter(isPublished);
  const coming = upcoming.filter((t) => !isPublished(t));
  const hero = published.find((t) => Boolean(t.startAt)) ?? null;
  return { hero, published, coming };
}

/**
 * Editions of the same event on the same day (Christmas Lario Cup maschile + Female Edition): the hero names them
 * together instead of repeating the event twice.
 */
export function sameDayEditions(
  hero: TournamentEdition | null,
  published: readonly TournamentEdition[],
): TournamentEdition[] {
  if (!hero) return [];
  return published.filter((t) => t.date === hero.date && t.startAt === hero.startAt);
}

export interface CountdownView {
  /** Still ahead: days/hours/minutes/seconds; null once started. */
  parts: { d: number; h: number; m: number; s: number } | null;
  /** Readable sentence for screen readers and the share line. */
  words: string;
}

/** Live countdown to a tournament start (same arithmetic as the tournament page, lib/events.ts). */
export function countdownView(nowMs: number, startAt: string | undefined): CountdownView | null {
  if (!startAt || Number.isNaN(Date.parse(startAt))) return null;
  const parts = eventCountdown(nowMs, startAt);
  if (!parts) return { parts: null, words: "Si gioca" };
  const words =
    parts.d > 1
      ? `Mancano ${parts.d} giorni`
      : parts.d === 1
        ? "Manca 1 giorno"
        : parts.h > 0
          ? `Mancano ${parts.h} ore`
          : parts.m > 1
            ? `Mancano ${parts.m} minuti`
            : "Manca 1 minuto";
  return { parts, words };
}

export interface LakeFact {
  id: "colico" | "montecchio" | "dervio" | "lago";
  title: string;
  text: string;
  source: string;
}

/**
 * «Vivi il Lago» band: what a guest team finds around the pitches. VERIFIED in the territory research of 17/10/2026
 * (pages opened and read; dates with a documented conflict are left out).
 */
export const LAKE_FACTS: readonly LakeFact[] = [
  {
    id: "colico",
    title: "Colico",
    text: "Porta della Valtellina e della Valchiavenna, con l'Abbazia di Piona sulla penisola di Olgiasca: chiesa dedicata nel 1138.",
    source: "comoanditslake.com, Colico; it.wikipedia.org, Abbazia di Piona",
  },
  {
    id: "montecchio",
    title: "Forte Montecchio Nord",
    text: "Il forte della Frontiera Nord a Colico, costruito tra il 1912 e il 1914 e demilitarizzato nel 1981.",
    source: "it.wikipedia.org, Forte Montecchio Nord",
  },
  {
    id: "dervio",
    title: "Dervio",
    text: "La Torre di Orezia dell'XI secolo, simbolo dello stemma, e il borgo fortificato di Corenno Plinio.",
    source: "it.wikipedia.org, Dervio e Corenno Plinio",
  },
  {
    id: "lago",
    title: "Il lago",
    text: "La Breva, il vento da sud del pomeriggio, porta vela e windsurf tra Colico e Dervio; a piedi c'è il Sentiero del Viandante.",
    source: "labreva.com; it.wikipedia.org, Sentiero del Viandante",
  },
];
