/**
 * Opponent crests (pure). Registry: config/scd-opponent-crests.v1.json.
 * Rule (SCD:ASSET, RESEARCH_REAL_ASSET): a real crest is shown only when the registry holds a
 * verified file for that club; otherwise the UI renders a neutral shield with initials.
 * A crest is never drawn, generated or guessed here.
 */
import registryRaw from "../../../../config/scd-opponent-crests.v1.json";

// "@/lib/crests" resolves to this file: the React component lives in crests.tsx and is re-exported
// here so consumers import everything from one path. crests.tsx only uses crestFor at render time.
export { OpponentCrest } from "./crests.tsx";

export type CrestStatus =
  "VERIFIED_FILE" | "SOURCE_FOUND_DOWNLOAD_BLOCKED" | "NOT_FOUND";

export type CrestEntry = {
  slug: string;
  displayName: string;
  aliases: string[];
  status: CrestStatus;
  sourceUrl: string | null;
  verifiedAt: string | null;
  licenceNote: string;
  file: string | null;
};

export type CrestInfo = {
  /** Public URL of the verified crest file, or null (neutral shield). */
  src: string | null;
  /** 1–3 uppercase letters for the neutral shield. */
  initials: string;
  /** Readable club name ("Vercurago", "Casatese Merate"). */
  label: string;
};

const str = (v: unknown) => (typeof v === "string" ? v : "");
const STATUSES = new Set<CrestStatus>([
  "VERIFIED_FILE",
  "SOURCE_FOUND_DOWNLOAD_BLOCKED",
  "NOT_FOUND",
]);

/** Registry entries, validated field by field (an invalid row cannot leak a file path). */
export const CREST_REGISTRY: readonly CrestEntry[] = (
  (registryRaw as { entries?: unknown[] }).entries ?? []
)
  .map((e): CrestEntry | null => {
    const r = (e ?? {}) as Record<string, unknown>;
    const status = str(r["status"]) as CrestStatus;
    const slug = str(r["slug"]);
    if (!STATUSES.has(status) || !/^[a-z0-9-]+$/.test(slug)) return null;
    const file = str(r["file"]);
    return {
      slug,
      displayName: str(r["displayName"]) || slug,
      aliases: Array.isArray(r["aliases"])
        ? r["aliases"].filter((a): a is string => typeof a === "string")
        : [],
      status,
      sourceUrl: str(r["sourceUrl"]) || null,
      verifiedAt: str(r["verifiedAt"]) || null,
      licenceNote: str(r["licenceNote"]),
      file:
        status === "VERIFIED_FILE" &&
        /^\/media\/crests\/[a-z0-9-]+\.webp$/.test(file)
          ? file
          : null,
    };
  })
  .filter((e): e is CrestEntry => e !== null);

/* ------------------------------------------------------------------ names */

/** Legal suffixes and "second team" markers the FIGC calendar glues to club names. */
const SUFFIX_RE =
  /\b(?:A\.?\s?S\.?\s?D\.?C?|S\.?\s?S\.?\s?D\.?(?:\s?A\s?R\s?L|ARL)?|S\.?\s?R\.?\s?L\.?|U\.?\s?S\.?\s?D\.?|A\.?\s?C\.?\s?D\.?|G\.?\s?S\.?\s?D\.?|A\.?\s?D\.?|POL\.?|SSDARL|ASD|SSD|ARL)\b\.?/g;
const SQUAD_RE = /\s*(?:[-–·]\s*)?\bSQ\.?\s?[A-Z]\b\.?/g;

/** Strips accents, dotted acronyms and squad markers: "CASATESE MERATE A.S.DSQ.B" → "CASATESE MERATE". */
export function normalizeOpponentName(raw: string): string {
  return (
    (raw || "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toUpperCase()
      // "MERASQ.B" / "A.S.DSQ.B": the squad marker glued to the previous token
      .replace(/SQ\.?\s?B\b/g, " SQ.B")
      .replace(SQUAD_RE, " ")
      .replace(SUFFIX_RE, " ")
      .replace(/[^A-Z0-9]+/g, " ")
      .trim()
  );
}

/** Stable slug of an opponent: "VERCURAGO SQ.B" → "vercurago". */
export function opponentSlug(name: string): string {
  return normalizeOpponentName(name).toLowerCase().replace(/\s+/g, "-");
}

const BY_ALIAS = new Map<string, CrestEntry>();
const BY_SLUG = new Map<string, CrestEntry>();
for (const e of CREST_REGISTRY) {
  BY_SLUG.set(e.slug, e);
  for (const a of e.aliases) BY_ALIAS.set(normalizeOpponentName(a), e);
}

/** Registry entry for a calendar opponent string, by alias first, then by slug. */
export function crestEntryFor(name: string): CrestEntry | null {
  const norm = normalizeOpponentName(name);
  if (!norm) return null;
  return BY_ALIAS.get(norm) ?? BY_SLUG.get(opponentSlug(name)) ?? null;
}

const SMALL = new Set([
  "DI",
  "DEL",
  "DELLA",
  "DELLE",
  "DEI",
  "DE",
  "LA",
  "IL",
  "LO",
  "E",
  "SAN",
  "SANTA",
  "SANT",
  "CITTA",
]);
const TRUNC_TAIL = /^(MERA|CALC|MER)$/; // residue of glued squad markers, e.g. "MERASQ.B" → "MERA"

/** Initials for the neutral shield: "Alta Brianza Tavernerio" → "ABT", "Vercurago" → "VE", "C.O.B. 91" → "COB". */
export function opponentInitials(name: string): string {
  const norm = normalizeOpponentName(name);
  if (!norm) return "?";
  const words = norm.split(" ").filter((w) => w && !TRUNC_TAIL.test(w));
  const letters = words.filter((w) => /[A-Z]/.test(w));
  const main = letters.filter((w) => !SMALL.has(w));
  const pick = (main.length ? main : letters).slice(0, 3);
  if (pick.length === 1) {
    const w = pick[0]!;
    return w.length <= 3 && w === w.replace(/[^A-Z]/g, "") ? w : w.slice(0, 2);
  }
  if (pick.length === 0) return norm.replace(/\s/g, "").slice(0, 2);
  return pick.map((w) => w.charAt(0)).join("");
}

/** Readable label from a raw calendar string ("CASATESE MERATE A.S.DSQ.B" → "Casatese Merate"). */
export function opponentLabel(name: string): string {
  const entry = crestEntryFor(name);
  if (entry) return entry.displayName;
  const norm = normalizeOpponentName(name);
  if (!norm) return "Avversario da definire";
  return norm
    .split(" ")
    .map((w) =>
      /^\d/.test(w) || (w.length <= 3 && !SMALL.has(w) && w !== "SAN")
        ? w
        : w.charAt(0) + w.slice(1).toLowerCase(),
    )
    .join(" ")
    .replace(/\bCitta\b/g, "Città")
    .replace(/\bCantu\b/g, "Cantù")
    .replace(/\bMuggio\b/g, "Muggiò");
}

/** What the UI needs for one opponent: verified file or neutral-shield data. */
export function crestFor(name: string): CrestInfo {
  const entry = crestEntryFor(name);
  return {
    src: entry?.file ?? null,
    initials: opponentInitials(name),
    label: entry?.displayName ?? opponentLabel(name),
  };
}

/** Opponent side of a "SCD – Avversario" / "Avversario – SCD" title (home-week items). */
export function opponentFromTitle(title: string): string {
  const parts = title.split(/\s+[–-]\s+/);
  if (parts.length < 2) return "";
  const weFirst = /\b(scd|colico)/i.test(parts[0] ?? "");
  return ((weFirst ? parts[1] : parts[0]) ?? "").trim();
}
