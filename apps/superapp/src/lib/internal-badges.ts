/**
 * Internal badges (Direzione, 13/10/2026: "immagini fatte come interne, da usare nella super app").
 *
 * Club-made graphics for the reserved work areas and the four minibus lines. SCD:ASSET class
 * KEEP_ENHANCE: they are served as resized WebP renditions with alpha, never redrawn. They contain a
 * rendering of the crest, so they are never a replacement for the official crest
 * (`src/assets/brand/logo-scd.png.asset.json`) and never appear on public pages.
 * Registry: config/scd-assets.v1.json (class INTERNAL_BADGE).
 *
 * Mapping rules are explicit tables: an area or a line without an exact entry gets no badge.
 */

export type InternalBadgeId =
  | "area-lavoro"
  | "area-staff-dirigenti"
  | "area-segreteria"
  | "area-responsabili-attivita"
  | "pulmino-1-lago"
  | "pulmino-2-lecco"
  | "pulmino-3-valtellina"
  | "pulmino-4-chiavenna";

export interface InternalBadge {
  id: InternalBadgeId;
  /** 192 px rendition: enough for up to 64 px on a 3x screen. */
  src: string;
  /** 384 px rendition for larger uses. */
  src2x: string;
  /** Text alternative when the badge is not next to a visible label. */
  alt: string;
}

/** Every badge with its renditions (string literals: checked against the asset registry by asset-format.test.ts). */
export const INTERNAL_BADGES: Readonly<Record<InternalBadgeId, InternalBadge>> = {
  "area-lavoro": {
    id: "area-lavoro",
    src: "/media/interno/area-lavoro-192.webp",
    src2x: "/media/interno/area-lavoro-384.webp",
    alt: "Badge Area Lavoro",
  },
  "area-staff-dirigenti": {
    id: "area-staff-dirigenti",
    src: "/media/interno/area-staff-dirigenti-192.webp",
    src2x: "/media/interno/area-staff-dirigenti-384.webp",
    alt: "Badge Staff e Dirigenti",
  },
  "area-segreteria": {
    id: "area-segreteria",
    src: "/media/interno/area-segreteria-192.webp",
    src2x: "/media/interno/area-segreteria-384.webp",
    alt: "Badge Segreteria",
  },
  "area-responsabili-attivita": {
    id: "area-responsabili-attivita",
    src: "/media/interno/area-responsabili-attivita-192.webp",
    src2x: "/media/interno/area-responsabili-attivita-384.webp",
    alt: "Badge Responsabili attività · DS e coordinatori",
  },
  "pulmino-1-lago": {
    id: "pulmino-1-lago",
    src: "/media/interno/pulmino-1-lago-192.webp",
    src2x: "/media/interno/pulmino-1-lago-384.webp",
    alt: "Badge Pulmino 1 · Lago",
  },
  "pulmino-2-lecco": {
    id: "pulmino-2-lecco",
    src: "/media/interno/pulmino-2-lecco-192.webp",
    src2x: "/media/interno/pulmino-2-lecco-384.webp",
    alt: "Badge Pulmino 2 · Lecco",
  },
  "pulmino-3-valtellina": {
    id: "pulmino-3-valtellina",
    src: "/media/interno/pulmino-3-valtellina-192.webp",
    src2x: "/media/interno/pulmino-3-valtellina-384.webp",
    alt: "Badge Pulmino 3 · Valtellina",
  },
  "pulmino-4-chiavenna": {
    id: "pulmino-4-chiavenna",
    src: "/media/interno/pulmino-4-chiavenna-192.webp",
    src2x: "/media/interno/pulmino-4-chiavenna-384.webp",
    alt: "Badge Pulmino 4 · Chiavenna",
  },
};

/**
 * Work area (registry id, config/superapp-areas.v1.json) -> area badge.
 * - Lavoro: the shared work queue of the offices (/gestionale/coda, "Coda di lavoro").
 * - Staff & Dirigenti: the staff hub (/gestionale, satellite "Staff tecnico": responsabili, mister,
 *   dirigenti accompagnatori) and the mister area (roles mister, dirigente-annata).
 * - Responsabili attività (DS · coordinatori): areas whose roles are responsabile-attivita-base and
 *   coordinatore-attivita-sportiva (organigramma SGS, impianti e campi).
 * - Segreteria: the secretariat desk and its sub-areas (persone, certificati).
 * Direzione, Tesoreria, CRM, Magazzino, Pulmini and the other areas have no badge of their own.
 */
const AREA_BADGE: Readonly<Record<string, InternalBadgeId>> = {
  coda: "area-lavoro",
  gestionale: "area-staff-dirigenti",
  mister: "area-staff-dirigenti",
  organigramma: "area-responsabili-attivita",
  "impianti-campi": "area-responsabili-attivita",
  struttura: "area-responsabili-attivita",
  segreteria: "area-segreteria",
  persone: "area-segreteria",
  certificati: "area-segreteria",
  "documenti-soci": "area-segreteria",
};

export function areaBadgeFor(areaId: string | null | undefined): InternalBadge | undefined {
  const id = areaId ? AREA_BADGE[areaId] : undefined;
  return id ? INTERNAL_BADGES[id] : undefined;
}

/** Areas that show a badge (for tests and reports). */
export const BADGED_AREAS: readonly string[] = Object.keys(AREA_BADGE);

/**
 * Minibus line name, as written in LINEA_BASE of the Master Flotta e Trasporti (sheet 02 UTENTI
 * SERVIZIO) -> minibus badge. Exact names only:
 * - "VALTELLINA" is Pulmino 3, "NORD/VALCHIAVENNA" is Pulmino 4 (Chiavenna);
 * - "LAGO" and "LECCO" are Pulmino 1 and 2 only as separate lines: the master today has one combined
 *   line "LAGO/LECCO", which matches two badges and therefore gets none until the master splits it;
 * - "COLICO", "ALTO LARIO" and "DA VERIFICARE" have no badge.
 */
const LINE_BADGE: Readonly<Record<string, InternalBadgeId>> = {
  LAGO: "pulmino-1-lago",
  LECCO: "pulmino-2-lecco",
  VALTELLINA: "pulmino-3-valtellina",
  "NORD/VALCHIAVENNA": "pulmino-4-chiavenna",
  VALCHIAVENNA: "pulmino-4-chiavenna",
  CHIAVENNA: "pulmino-4-chiavenna",
};

/** Normalises a master line name: trims, upper case, no spaces around "/". */
export function normaliseLine(line: string): string {
  return line.trim().toUpperCase().replace(/\s*\/\s*/g, "/").replace(/\s+/g, " ");
}

export function lineBadgeFor(line: string | null | undefined): InternalBadge | undefined {
  if (!line) return undefined;
  const id = LINE_BADGE[normaliseLine(line)];
  return id ? INTERNAL_BADGES[id] : undefined;
}
