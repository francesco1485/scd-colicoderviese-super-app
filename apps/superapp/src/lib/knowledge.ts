/**
 * Cervellone (r77, UD-077): the club's catalogue and memory, searchable by staff and by the Super App
 * assistant. Pure helpers for parsing scd_kb_search, labels and the deadline view. The database decides
 * who sees what (INTERNO for office staff, RISERVATO for Direzione).
 */

export const KB_AREAS = [
  "FEDERAZIONE",
  "TESSERAMENTI_ISCRIZIONI",
  "QUOTE_PAGAMENTI",
  "FONDO_SOLIDALE",
  "FORNITORI_FATTURE",
  "SPONSOR_CONVENZIONI",
  "TORNEI_EVENTI",
  "PULMINI_TRASPORTI",
  "IMPIANTI_COMUNI",
  "CERTIFICATI_SANITARIO",
  "STAFF_COMPENSI",
  "BANCA_INCASSI",
  "PEC_LEGALE",
  "SCUOLE_ENTI",
  "COMUNICAZIONE_MEDIA",
  "GRAFICA_LOGHI_FOTO",
  "CLUB_HOUSE_BAR",
  "BIGLIETTERIA",
  "ORGANIZZAZIONE_ORGANIGRAMMA",
  "CALENDARI_ATTIVITA",
  "MASTER_GESTIONALI",
  "TECH_PIATTAFORME",
  "ALTRE_SOCIETA",
  "NEWSLETTER_PUBBLICITA",
  "ALTRO",
] as const;
export type KbArea = (typeof KB_AREAS)[number];

export const KB_KINDS = ["DOCUMENTO", "FILE_DRIVE", "INDICE_POSTA", "ECONOMIA", "STORIA", "ENTE", "IMPIANTO", "CANVA", "REGOLA"] as const;
export type KbKind = (typeof KB_KINDS)[number];

export const KIND_LABEL: Readonly<Record<KbKind, string>> = {
  DOCUMENTO: "Documento agli atti",
  FILE_DRIVE: "File del Drive",
  INDICE_POSTA: "Posta",
  ECONOMIA: "Economia",
  STORIA: "Storia",
  ENTE: "Ente o fornitore",
  IMPIANTO: "Impianto",
  CANVA: "Grafica Canva",
  REGOLA: "Regola",
};

/** "TESSERAMENTI_ISCRIZIONI" → "Tesseramenti iscrizioni". */
export function areaLabel(area: string): string {
  const s = area.toLowerCase().replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export interface KbItem {
  id: string;
  kind: KbKind;
  area: string;
  season: string | null;
  title: string;
  summary: string | null;
  entity: string | null;
  date: string | null;
  due: string | null;
  status: string | null;
  amount: number | null;
  source: string;
  link: string | null;
  tags: string[];
  /** r98: 'fts' = full-text match, 'fuzzy' = similar title/ente/tags (typo tolerance). Absent before r98 or without a text query. */
  match?: KbMatch;
}

export type KbMatch = "fts" | "fuzzy";

export interface KbResult {
  level: "INTERNO" | "RISERVATO";
  items: KbItem[];
  /** Without a text query: visible catalogue per area. With a text query (r98): matches per area. */
  counts: Record<string, number>;
}

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);
const num = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() && Number.isFinite(Number(v))) return Number(v);
  return null;
};

/** Only http(s) links are kept: anything else would be an unsafe href. */
export function safeLink(v: unknown): string | null {
  const s = str(v);
  return s && /^https:\/\/[^\s"'<>]+$/.test(s) ? s : null;
}

export function parseKb(raw: unknown): KbResult | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const level = r["level"] === "RISERVATO" || r["level"] === "INTERNO" ? r["level"] : null;
  if (!level) return null;
  const items: KbItem[] = (Array.isArray(r["items"]) ? r["items"] : []).flatMap((x) => {
    const o = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
    const id = str(o["id"]);
    const title = str(o["titolo"]);
    if (!id || !title) return [];
    const kind = (KB_KINDS as readonly string[]).includes(String(o["kind"])) ? (o["kind"] as KbKind) : "DOCUMENTO";
    return [{
      id,
      kind,
      area: str(o["area"]) ?? "ALTRO",
      season: str(o["stagione"]),
      title,
      summary: str(o["sintesi"]),
      entity: str(o["ente"]),
      date: str(o["data"]),
      due: str(o["scadenza"]),
      status: str(o["stato"]),
      amount: num(o["importo"]),
      source: str(o["fonte"]) ?? "",
      link: safeLink(o["link"]),
      tags: Array.isArray(o["tags"]) ? o["tags"].filter((t): t is string => typeof t === "string") : [],
      ...(o["match"] === "fts" || o["match"] === "fuzzy" ? { match: o["match"] } : {}),
    }];
  });
  const counts: Record<string, number> = {};
  const c = r["counts"];
  if (c && typeof c === "object") for (const [k, v] of Object.entries(c as Record<string, unknown>)) if (typeof v === "number") counts[k] = v;
  return { level, items, counts };
}

/** Days from today to a due date; negative when expired. */
export function dueIn(todayIso: string, dueIso: string): number {
  return Math.round((Date.parse(`${dueIso.slice(0, 10)}T12:00:00Z`) - Date.parse(`${todayIso}T12:00:00Z`)) / 86_400_000);
}

export type DueTone = "crit" | "warn" | "info" | "mute";

/** Expired or within 15 days = crit, within 60 = warn, later = info. */
export function dueTone(days: number): DueTone {
  if (days < 0) return "crit";
  if (days <= 15) return "crit";
  if (days <= 60) return "warn";
  return "info";
}

export function dueText(days: number): string {
  if (days < -1) return `scaduto da ${-days} giorni`;
  if (days === -1) return "scaduto ieri";
  if (days === 0) return "scade oggi";
  if (days === 1) return "scade domani";
  if (days > 120) {
    const months = Math.round(days / 30.4);
    return months >= 24 ? `tra ${Math.round(months / 12)} anni` : `tra ${months} mesi`;
  }
  return `tra ${days} giorni`;
}

/** Seasons offered in the filter, newest first, from 2011/12 (mailbox opening) to the current one. */
export function seasonsUntil(todayIso: string): string[] {
  const y = Number(todayIso.slice(0, 4));
  const m = Number(todayIso.slice(5, 7));
  const last = m >= 7 ? y : y - 1;
  const out: string[] = [];
  for (let s = last; s >= 2011; s--) out.push(`${s}/${String(s + 1).slice(2)}`);
  return out;
}

/** Lower case without accents ("Società" → "societa"), one output char group per input char. */
const FOLD_EXTRA: Readonly<Record<string, string>> = { æ: "ae", œ: "oe", ø: "o", ß: "ss", đ: "d", ł: "l", ð: "d", þ: "th" };

function foldChar(c: string): string {
  const base = c.normalize("NFD").replace(/\p{M}+/gu, "").toLowerCase();
  return FOLD_EXTRA[base] ?? base;
}

export function foldText(s: string): string {
  return Array.from(s, foldChar).join("");
}

/**
 * Search terms exactly as scd_kb_search builds them (r98, scd_kb_query_terms): no accents, lower case,
 * only [a-z0-9] tokens, single letters dropped (single digits kept: "3 livello"), no duplicates,
 * first 8 terms, each at most 40 characters.
 */
export function kbSearchTerms(query: string | null | undefined): string[] {
  const out: string[] = [];
  for (const raw of foldText(query ?? "").split(/[^a-z0-9]+/)) {
    const t = raw.slice(0, 40);
    if (!t || (t.length < 2 && !/^[0-9]$/.test(t)) || out.includes(t)) continue;
    out.push(t);
    if (out.length === 8) break;
  }
  return out;
}

/** True when the query has something to search for (the server would run a text search). */
export function hasSearchText(query: string | null | undefined): boolean {
  return kbSearchTerms(query).length > 0;
}

export interface HighlightPart {
  text: string;
  hit: boolean;
}

const WORD = /[\p{L}\p{N}]/u;

/**
 * Splits `text` into plain and highlighted parts: a term is highlighted where a word starts with it
 * (prefix search), ignoring case and accents. Pure data: the UI renders parts as text nodes, never HTML.
 */
export function highlightParts(text: string, terms: readonly string[]): HighlightPart[] {
  if (!text) return [];
  const usable = terms.filter((t) => t.length > 0);
  if (usable.length === 0) return [{ text, hit: false }];
  const chars = Array.from(text);
  // folded string plus, for every folded code unit, the index of the original char it came from
  let folded = "";
  const origin: number[] = [];
  chars.forEach((c, i) => {
    const f = foldChar(c);
    folded += f;
    for (let k = 0; k < f.length; k++) origin.push(i);
  });
  const hit = new Array<boolean>(chars.length).fill(false);
  for (const term of usable) {
    let from = 0;
    for (;;) {
      const at = folded.indexOf(term, from);
      if (at < 0) break;
      const startChar = origin[at]!;
      const prev = startChar > 0 ? chars[startChar - 1]! : "";
      if (!prev || !WORD.test(prev)) {
        const endChar = origin[at + term.length - 1]!;
        for (let i = startChar; i <= endChar; i++) hit[i] = true;
      }
      from = at + 1;
    }
  }
  const parts: HighlightPart[] = [];
  chars.forEach((c, i) => {
    const last = parts[parts.length - 1];
    if (last && last.hit === hit[i]) last.text += c;
    else parts.push({ text: c, hit: hit[i]! });
  });
  return parts;
}

/** Splits results into full-text matches and similar ones (typo tolerance), keeping server order. */
export function splitByMatch(items: readonly KbItem[]): { exact: KbItem[]; similar: KbItem[] } {
  const exact: KbItem[] = [];
  const similar: KbItem[] = [];
  for (const it of items) (it.match === "fuzzy" ? similar : exact).push(it);
  return { exact, similar };
}

/** Areas with the most items first (ties alphabetical), for the empty-state suggestions. */
export function topAreas(counts: Readonly<Record<string, number>>, n = 6): string[] {
  return Object.entries(counts)
    .filter(([a, c]) => c > 0 && (KB_AREAS as readonly string[]).includes(a))
    .sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))
    .slice(0, n)
    .map(([a]) => a);
}
