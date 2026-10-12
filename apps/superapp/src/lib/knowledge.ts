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
}

export interface KbResult {
  level: "INTERNO" | "RISERVATO";
  items: KbItem[];
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
