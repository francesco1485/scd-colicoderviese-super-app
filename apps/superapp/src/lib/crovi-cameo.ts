/**
 * Crovi cameo (UD-026): once per visit Crovi peeks in next to the chat button and says one short,
 * page-relevant line. Lines are fixed copy: no facts are invented (no scores, times or names),
 * they only point to where the real information is.
 */

export interface CameoLine {
  text: string;
  /** Suggested question to send when the visitor taps "Chiedi a Crovi". */
  ask: string;
}

const LINES: ReadonlyArray<{ prefix: string; line: CameoLine }> = [
  { prefix: "/calendario", line: { text: "Gli orari cambiano più spesso del meteo sul lago: prima di partire ricontrolla qui, che io lo aggiorno dalle fonti ufficiali.", ask: "Prossima partita" } },
  { prefix: "/squadre", line: { text: "Dalla Prima ai Piccoli Amici: dimmi l'annata e ti porto dritto al suo calendario.", ask: "Calendario" } },
  { prefix: "/impianti", line: { text: "Cerchi lo spogliatoio o l'ingresso giusto? Tocca la mappa: ti accompagno io, senza fretta.", ask: "Dove siete?" } },
  { prefix: "/eventi", line: { text: "Tornei, feste e serate: se c'è da organizzare qualcosa, io la checklist ce l'ho già in tasca.", ask: "Eventi" } },
  { prefix: "/sponsor", line: { text: "Vuoi vedere il tuo marchio a bordo campo? Scrivimi, ti spiego come funziona.", ask: "Diventare sponsor" } },
  { prefix: "/contatti", line: { text: "Segreteria, mail, PEC: dimmi cosa ti serve e ti dico a chi scrivere.", ask: "Contatti" } },
];

const DEFAULT_LINE: CameoLine = {
  text: "Ciao, sono Crovi, quello della biglietteria. Di calcio dilettanti so quasi tutto: chiedimi pure!",
  ask: "Prossima partita",
};

/** Line for the current page; reserved areas (interior pages) get no cameo. */
export function cameoLine(pathname: string): CameoLine | null {
  if (isInterior(pathname)) return null;
  const hit = LINES.find((l) => pathname === l.prefix || pathname.startsWith(`${l.prefix}/`));
  return hit ? hit.line : DEFAULT_LINE;
}

const INTERIOR = ["/gestionale", "/quadro", "/segreteria", "/tesoreria", "/crm", "/magazzino", "/pulmini", "/direzione", "/safeguarding", "/core"];

export function isInterior(pathname: string): boolean {
  return INTERIOR.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Delay before the cameo: between 18 and 32 seconds, from a 0..1 random value. */
export function cameoDelayMs(random: number): number {
  const r = Math.min(1, Math.max(0, random));
  return Math.round(18_000 + r * 14_000);
}

export const CAMEO_SEEN_KEY = "scd-crovi-cameo";
/** How long the cameo stays before leaving on its own. */
export const CAMEO_VISIBLE_MS = 9_000;
