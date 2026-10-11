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

/** "?crovi" in the address shows the cameo straight away, even if already seen (demo link). */
export function forceCameo(search: string): boolean {
  try {
    return new URLSearchParams(search).has("crovi");
  } catch {
    return false;
  }
}
export const FORCED_CAMEO_DELAY_MS = 1_500;
/** How long the cameo stays before leaving on its own. */
export const CAMEO_VISIBLE_MS = 9_000;

/* ------------------------------------------------------------------ poses */

/** Crovi is animated by switching between four photographed poses of the same original character. */
export const CROVI_POSES = ["wave", "point", "thumbs", "laugh"] as const;
export type CroviPose = (typeof CROVI_POSES)[number];

/** Media live under a versioned folder so phones never keep showing an older face from cache. */
const CROVI_MEDIA = "/media/crovi/v3";
export const CROVI_AVATAR = `${CROVI_MEDIA}/crovi-avatar-256.webp`;
/** Width / height of every pose frame (all frames share one canvas and one baseline). */
export const CROVI_FRAME_RATIO = 618 / 900;

export function croviFrame(pose: CroviPose, size: 440 | 900 = 440): string {
  return `${CROVI_MEDIA}/crovi-${pose}-${size}.webp`;
}

export interface PoseStep {
  pose: CroviPose;
  ms: number;
}

/** Cameo choreography: says hello, points at the chat, thumbs up, laughs, waves goodbye. */
export const CAMEO_SEQUENCE: ReadonlyArray<PoseStep> = [
  { pose: "wave", ms: 1_500 },
  { pose: "point", ms: 1_700 },
  { pose: "thumbs", ms: 1_300 },
  { pose: "laugh", ms: 1_600 },
  { pose: "wave", ms: 1_400 },
];

/** Total length of one pass through a sequence. */
export function sequenceLength(seq: ReadonlyArray<PoseStep>): number {
  return seq.reduce((t, s) => t + Math.max(0, s.ms), 0);
}

/**
 * Pose shown `elapsedMs` after the start. Without `loop` the last pose is held;
 * with `loop` the sequence repeats. Negative or invalid times show the first pose.
 */
export function poseAt(elapsedMs: number, seq: ReadonlyArray<PoseStep> = CAMEO_SEQUENCE, loop = false): CroviPose {
  const first = seq[0];
  const lastStep = seq[seq.length - 1];
  if (!first || !lastStep) return "wave";
  const total = sequenceLength(seq);
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0 || total === 0) return first.pose;
  let t = loop ? elapsedMs % total : Math.min(elapsedMs, total - 1);
  for (const step of seq) {
    if (t < step.ms) return step.pose;
    t -= step.ms;
  }
  return lastStep.pose;
}
