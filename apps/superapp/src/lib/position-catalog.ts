/**
 * Catalogo ruoli (Francesco 16/10/2026 13:35): every organigram position the club may fill, from the FIGC, LND, SGS
 * and RASD rules plus the club's own positions, ready to receive a tesserato, and a "Crea ruolo nuovo" entry for
 * extra figures. Pure logic, no network and no JSON import (the 83-position list stays on the server:
 * position-catalog.data.ts). The database side is migration r138 (STAGED until "applica r138"):
 * scd_position_catalog + scd_position_catalog_board / scd_create_custom_position / scd_set_position_status.
 *
 * No personal data: positions only; holders arrive as COUNTS (never names, never minors). Unknown stays unknown:
 * while r138 is not applied the holders are null and the page says "da collegare", never "0".
 * Who holds a position stays in the existing registry scd_structure_roles (column position_code): no second list.
 *
 * Engine: PERSONE (each role ready for a person, new figures without code) and TEMPO (requests reach the right
 * confirmer). Measure: mandatory positions with at least one holder; custom positions created and approved per season.
 */

export const POSITION_GROUPS = [
  "direzione",
  "dirigenti",
  "tecnici",
  "sgs",
  "sanitari",
  "safeguarding",
  "comunicazione",
  "servizi",
  "operativi",
] as const;
export type PositionGroup = (typeof POSITION_GROUPS)[number];

export const POSITION_GROUP_LABEL: Readonly<Record<PositionGroup, string>> = {
  direzione: "Direzione e organi statutari",
  dirigenti: "Dirigenti",
  tecnici: "Staff tecnico",
  sgs: "Settore giovanile e attività di base",
  sanitari: "Area sanitaria",
  safeguarding: "Tutela dei minori",
  comunicazione: "Comunicazione",
  servizi: "Servizi del club",
  operativi: "Operativi e volontari",
};

/** role_kind of scd_structure_roles (r59 check constraint). */
export const ROLE_KINDS = ["DIRIGENTE", "MISTER", "AUTISTA", "RESPONSABILE", "STAFF", "ORGANO_SOCIETARIO"] as const;
export type RoleKind = (typeof ROLE_KINDS)[number];

export const ROLE_KIND_LABEL: Readonly<Record<RoleKind, string>> = {
  DIRIGENTE: "Dirigente",
  MISTER: "Tecnico (mister)",
  AUTISTA: "Autista",
  RESPONSABILE: "Responsabile",
  STAFF: "Staff e collaboratori",
  ORGANO_SOCIETARIO: "Organo societario",
};

export const POSITION_STATUSES = ["ACTIVE", "PROPOSED", "RETIRED"] as const;
export type PositionStatus = (typeof POSITION_STATUSES)[number];

export const POSITION_SOURCES = ["FIGC", "LND", "SGS", "RASD", "DLGS36", "CLUB", "CUSTOM"] as const;
export type PositionSource = (typeof POSITION_SOURCES)[number];

export const SOURCE_LABEL: Readonly<Record<PositionSource, string>> = {
  FIGC: "FIGC",
  LND: "LND",
  SGS: "SGS",
  RASD: "RASD",
  DLGS36: "D.Lgs 36/2021",
  CLUB: "Club",
  CUSTOM: "Ruolo nuovo",
};

/** Who creates and approves new positions (r111 scd_is_role_creator: Presidente or Direttore Generale). */
export const POSITION_CREATORS: readonly string[] = ["presidente", "direttore-generale"];

export interface CatalogPosition {
  code: string;
  label: string;
  group: PositionGroup;
  roleKind: RoleKind;
  appPosition: string | null;
  source: PositionSource;
  sourceUrl: string | null;
  sourceRef: string | null;
  /** Qualifica used by the Portale Società LND (Organigramma) for this club; null = not used there. */
  lndLabel: string | null;
  /** Exact "Carica" texts of the FIGC Anagrafe Federale organigramma this position stands for ([] = none). */
  figcLabels: string[];
  evidence: "VERIFIED" | "INFERRED" | "PROPOSED";
  requiresLicence: boolean;
  mandatoryForClub: boolean;
  acceptsQualification: boolean;
  status: PositionStatus;
  isCustom: boolean;
  description: string;
  /** Current holders in the registry (count only). null = not known (r138 not applied or not read). */
  holders: number | null;
}

/**
 * Where the catalogue on the page comes from:
 *   "live"        scd_position_catalog_board answered (statuses and holders from the database);
 *   "not-applied" the function is missing (r138 STAGED): the repo catalogue, holders unknown;
 *   "unavailable" the read failed or no club session: the repo catalogue, holders unknown.
 */
export type CatalogSource = "live" | "not-applied" | "unavailable";

/**
 * Whether the page offers "Crea ruolo nuovo":
 *   "on"          the database says this person is a creator (Presidente / DG) and r138 is applied;
 *   "not-applied" a creator (r111 says so) but r138 is missing: the entry says "Creazione non ancora attiva";
 *   "off"         anybody else: nothing is shown.
 */
export type CreateState = "on" | "not-applied" | "off";

export function createState(source: CatalogSource, creator: boolean | null): CreateState {
  if (creator !== true) return "off";
  if (source === "live") return "on";
  if (source === "not-applied") return "not-applied";
  return "off";
}

const isRecord = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);
const str = (x: unknown): string | null => (typeof x === "string" && x.trim() ? x : null);
const oneOf = <T extends string>(list: readonly T[], x: unknown): T | null =>
  typeof x === "string" && (list as readonly string[]).includes(x) ? (x as T) : null;

/** One catalogue entry from the database or the repo config; null when malformed (dropped, never guessed). */
export function parsePosition(x: unknown, holdersKnown: boolean): CatalogPosition | null {
  if (!isRecord(x)) return null;
  const code = str(x["code"]);
  const label = str(x["label"]);
  const group = oneOf(POSITION_GROUPS, x["group"]);
  const roleKind = oneOf(ROLE_KINDS, x["roleKind"]);
  const source = oneOf(POSITION_SOURCES, x["source"]);
  const evidence = oneOf(["VERIFIED", "INFERRED", "PROPOSED"] as const, x["evidence"]);
  if (!code || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(code) || !label || !group || !roleKind || !source || !evidence) return null;
  const status = oneOf(POSITION_STATUSES, x["status"]) ?? (holdersKnown ? null : "ACTIVE");
  if (!status) return null;
  const h = x["holders"];
  const holders = holdersKnown && typeof h === "number" && Number.isInteger(h) && h >= 0 ? h : null;
  const url = str(x["sourceUrl"]);
  return {
    code,
    label,
    group,
    roleKind,
    appPosition: str(x["appPosition"]),
    source,
    sourceUrl: url && url.startsWith("https://") ? url : null,
    sourceRef: str(x["sourceRef"]),
    lndLabel: str(x["lndLabel"]),
    figcLabels: Array.isArray(x["figcLabels"]) ? x["figcLabels"].filter((l): l is string => typeof l === "string" && l.trim() !== "").slice(0, 5) : [],
    evidence,
    requiresLicence: x["requiresLicence"] === true,
    mandatoryForClub: x["mandatoryForClub"] === true,
    acceptsQualification: x["acceptsQualification"] === true,
    status,
    isCustom: x["isCustom"] === true || code.startsWith("custom-"),
    description: str(x["description"]) ?? "",
    holders,
  };
}

/** Answer of scd_position_catalog_board: null when it is not the expected shape (treated as a failed read). */
export function parseCatalogBoard(input: unknown): { canCreate: boolean; positions: CatalogPosition[] } | null {
  if (!isRecord(input) || !Array.isArray(input["positions"])) return null;
  const positions = input["positions"].map((p) => parsePosition(p, true)).filter((p): p is CatalogPosition => p !== null);
  return { canCreate: input["canCreate"] === true, positions };
}

export interface CatalogGroupView {
  group: PositionGroup;
  label: string;
  positions: CatalogPosition[];
  /** Positions with no holder; null when holders are unknown. */
  toAssign: number | null;
  mandatory: number;
}

/** Groups in the fixed order; inside, mandatory first, then by label (custom ones at the end). Retired ones last. */
export function groupCatalog(list: readonly CatalogPosition[]): CatalogGroupView[] {
  const rank = (p: CatalogPosition) => (p.status === "RETIRED" ? 3 : p.isCustom ? 2 : p.mandatoryForClub ? 0 : 1);
  return POSITION_GROUPS.map((group) => {
    const positions = list
      .filter((p) => p.group === group)
      .sort((a, b) => rank(a) - rank(b) || a.label.localeCompare(b.label, "it"));
    const open = positions.filter((p) => p.status !== "RETIRED");
    const known = open.every((p) => p.holders !== null);
    return {
      group,
      label: POSITION_GROUP_LABEL[group],
      positions,
      toAssign: known ? open.filter((p) => p.holders === 0).length : null,
      mandatory: open.filter((p) => p.mandatoryForClub).length,
    };
  }).filter((g) => g.positions.length > 0);
}

/** Plain words for the holders chip. Unknown is never zero. */
export function holdersLabel(p: Pick<CatalogPosition, "holders" | "status">): string {
  if (p.status === "PROPOSED") return "da approvare";
  if (p.status === "RETIRED") return "ritirato";
  if (p.holders === null) return "da collegare";
  if (p.holders === 0) return "da assegnare";
  return p.holders === 1 ? "1 assegnato" : `${p.holders} assegnati`;
}

/* ------------------------------------------------------------------ new position (custom) */

/** Same folding as scd_position_slug in r138: lower case, accents folded, non alphanumerics to "-", at most 50, no hyphen at the ends. */
export function positionSlug(label: string): string {
  const from = "àáâäèéêëìíîïòóôöùúûüç'’";
  const to = "aaaaeeeeiiiioooouuuuc  ";
  const folded = [...label.trim().toLowerCase()].map((c) => {
    const i = from.indexOf(c);
    return i >= 0 ? to[i] : c;
  });
  return folded
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50)
    .replace(/-+$/, "");
}

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+/;
const PHONE = /(\+|00)?[0-9]([ ./-]?[0-9]){8,}/;

export interface CustomPositionDraft {
  label: string;
  group: string;
  roleKind: string;
  description: string;
}

export type DraftCode = "label" | "contact" | "group" | "roleKind" | "description" | "exists";

export const DRAFT_MESSAGES: Readonly<Record<DraftCode, string>> = {
  label: "Scrivi il nome del ruolo (da 3 a 80 caratteri, con almeno due lettere o cifre).",
  contact: "Niente e-mail o numeri di telefono nel nome o nella descrizione: solo il nome del ruolo.",
  group: "Scegli l'area del ruolo.",
  roleKind: "Scegli il tipo di ruolo.",
  description: "La descrizione può avere al massimo 300 caratteri.",
  exists: "Esiste già un ruolo con questo nome.",
};

/** Checks of scd_create_custom_position, repeated here so the form answers at once (the database checks again). */
export function validateCustomDraft(
  d: CustomPositionDraft,
  existingLabels: readonly string[] = [],
): { ok: true; value: { label: string; group: PositionGroup; roleKind: RoleKind; description: string; code: string } } | { ok: false; code: DraftCode } {
  const label = d.label.trim().replace(/\s+/g, " ");
  const description = d.description.trim();
  if (label.length < 3 || label.length > 80) return { ok: false, code: "label" };
  if (EMAIL.test(label) || PHONE.test(label) || EMAIL.test(description) || PHONE.test(description)) return { ok: false, code: "contact" };
  const slug = positionSlug(label);
  if (slug.length < 2) return { ok: false, code: "label" };
  if (description.length > 300) return { ok: false, code: "description" };
  const group = oneOf(POSITION_GROUPS, d.group);
  if (!group) return { ok: false, code: "group" };
  const roleKind = oneOf(ROLE_KINDS, d.roleKind);
  if (!roleKind) return { ok: false, code: "roleKind" };
  if (existingLabels.some((l) => l.trim().replace(/\s+/g, " ").toLowerCase() === label.toLowerCase())) return { ok: false, code: "exists" };
  return { ok: true, value: { label, group, roleKind, description, code: `custom-${slug}` } };
}

export interface CatalogWriteOutcome {
  ok: boolean;
  message: string;
}

export const CATALOG_WRITE_OFF = "Creazione non ancora attiva: la Direzione deve applicare il catalogo ruoli (r138).";
export const CATALOG_WRITE_DENIED = "Solo il Presidente o il Direttore generale creano e approvano i ruoli.";
export const CATALOG_WRITE_FAILED = "Salvataggio non riuscito, riprova più tardi.";
export const CATALOG_WRITE_NO_SESSION = "Accesso al registro non collegato al tuo profilo club.";

/* ------------------------------------------------------------------ is r138 live? */

/** Label sent to scd_position_slug (r138, executable by authenticated) and the answer only r138 gives. */
export const R138_PROBE_LABEL = "Probe R138";
export const R138_PROBE_ANSWER = "probe-r138";

/**
 * Answer of the r138 probe. Live only when the function answers exactly; missing function, any error or any other
 * answer = not live (fail closed: r138 positions stay off and the UD-154 fallback holds).
 */
export function r138ProbeResult(data: unknown, error: unknown): boolean {
  return !error && data === R138_PROBE_ANSWER;
}
