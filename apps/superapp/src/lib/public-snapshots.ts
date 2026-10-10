/**
 * Adapter di consultazione per le FOTOGRAFIE pubbliche (non live) del 09/10/2026
 * di Calendario eventi e Quadro allenamenti. Non sono master: i master restano su Drive.
 * Espone solo campi in allowlist, così nessun dato personale può passare.
 */
import calendarRaw from "@/data/calendario-snapshot-20261009.json";
import quadroRaw from "@/data/quadro-snapshot-20261009.json";

export const SNAPSHOT_BANNER = "ANTEPRIMA DATI 09/10/2026 • NON LIVE • DA VERIFICARE";
export const EMPTY_MESSAGE = "Dati non disponibili in questa anteprima";

export type PublicGroup = { id: string; label: string; color: string; logo: string | null; years: string[]; count: number };
export type PublicEvent = {
  id: string; date: string; time: string; group: string; category: string;
  type: string; homeAway: "CASA" | "FUORI" | string; opponent: string; venue: string;
  round: string; source: string; status: string; isVariation: boolean; notice: string[];
  timeConfirmed: boolean; venueConfirmed: boolean; facilityReview: boolean;
};

const WITHDRAWN = /RITIRAT|ANNULLAT|CANCEL|WITHDRAWN/i;
const str = (v: unknown) => (typeof v === "string" ? v : "");

export function loadCalendar(input: unknown = calendarRaw) {
  const raw = input as any;
  const groups: PublicGroup[] = Object.entries(raw.groups ?? {}).map(([id, g]: [string, any]) => ({
    id, label: str(g?.label) || id, color: /^#[0-9a-f]{6}$/i.test(str(g?.color)) ? g.color : "#668196",
    logo: /^SCD_[A-Z0-9_]+\.png$/.test(str(g?.logo)) ? g.logo : null,
    // Annate solo se dichiarate dal master (etichetta o nome file logo ufficiale).
    years: [...new Set(`${str(g?.label)} ${str(g?.logo)}`.match(/(?<!\d)20[0-2]\d(?!\d)/g) ?? [])],
    count: 0,
  }));
  const events: PublicEvent[] = (Array.isArray(raw.events) ? raw.events : [])
    .filter((e: any) => /^\d{4}-\d{2}-\d{2}$/.test(str(e?.date)) && !WITHDRAWN.test(str(e?.match_status)))
    .map((e: any) => ({
      id: str(e.id), date: e.date, time: str(e.time), group: str(e.group), category: str(e.category),
      type: str(e.type), homeAway: str(e.home_away), opponent: str(e.opponent), venue: str(e.venue),
      round: str(e.round), source: str(e.source), status: str(e.match_status),
      isVariation: e.is_variation === true, notice: Array.isArray(e.notice) ? e.notice.filter((n: unknown) => typeof n === "string") : [],
      // Solo flag booleani: in assenza del dato si assume NON confermato.
      timeConfirmed: e.verification?.time_confirmed === true,
      venueConfirmed: e.verification?.venue_confirmed === true,
      facilityReview: e.verification?.facility_review_required === true,
    }))
    .sort((a: PublicEvent, b: PublicEvent) => (a.date + a.time).localeCompare(b.date + b.time));
  for (const g of groups) g.count = events.filter((e) => e.group === g.id).length;
  return {
    season: str(raw.season) || "2026/27",
    sourceModifiedAt: str(raw.source_modified_at),
    groups, events,
  };
}

export type TrainingSlot = {
  day: string; timeLabel: string; start: number;
  fields: { C1: string; C2: string }; rooms: Record<"SP1" | "SP2" | "SP3" | "SP4", string>;
};
export type TrainingRotation = { week: string; days: string[]; start: number; timeLabel: string; zones: Record<string, string> };

export type TrainingRoom = { week: string; day: string; id: string; start: number; end: number; group: string };

/** Week A/B comune: le rotazioni "A/B" valgono in entrambe le settimane. */
export const appliesToWeek = (rowWeek: string, week: "A" | "B") => rowWeek === week || rowWeek === "A/B";

/** Mappa testo annata -> file logo ufficiale (dal pacchetto RC1). Nessuna corrispondenza = nessun logo. */
export const LOGO_RULES: [RegExp, string][] = [
  [/prima squadra/i, "PRIMA"], [/juniores|u19|2008|2009/i, "JUNIORES"], [/u16|under ?16|2011/i, "U16"],
  [/u15|under ?15|2012|2013/i, "U15"], [/u13|2014/i, "U13"], [/u12|2015/i, "U12"],
  [/u11|pulcini|2016|2017/i, "PULCINI"], [/primi calci|2018|2019/i, "PRIMI"], [/piccoli|2020|2021/i, "PICCOLI"],
];
export function logoKeysFor(text: string): string[] {
  return LOGO_RULES.filter(([re]) => re.test(text)).map(([, k]) => k);
}

export function loadQuadro() {
  const raw = quadroRaw as any;
  const slots: TrainingSlot[] = (Array.isArray(raw.slots) ? raw.slots : []).map((s: any) => ({
    day: str(s.day), timeLabel: str(s.timeLabel), start: Number(s.start) || 0,
    fields: { C1: str(s.fields?.C1), C2: str(s.fields?.C2) },
    rooms: { SP1: str(s.rooms?.SP1), SP2: str(s.rooms?.SP2), SP3: str(s.rooms?.SP3), SP4: str(s.rooms?.SP4) },
  }));
  const rotations: TrainingRotation[] = (Array.isArray(raw.rotations) ? raw.rotations : []).map((r: any) => ({
    week: str(r.week), days: Array.isArray(r.days) ? r.days.map(str) : [], start: Number(r.start) || 0,
    timeLabel: str(r.timeLabel),
    zones: Object.fromEntries(Object.entries(r.zones ?? {}).filter(([k]) => /^C[12]_[A-Z]$/.test(k)).map(([k, v]) => [k, str(v)])),
  }));
  const rooms: TrainingRoom[] = (Array.isArray(raw.rooms) ? raw.rooms : [])
    .filter((r: any) => /^SP[1-4]$/.test(str(r.id)))
    .map((r: any) => ({ week: str(r.week), day: str(r.day), id: str(r.id), start: Number(r.start) || 0, end: Number(r.end) || 0, group: str(r.group) }));
  const days: string[] = (Array.isArray(raw.days) ? raw.days : []).map(str).filter(Boolean);
  return { days, slots, rotations, rooms, generatedUTC: str(raw.generatedUTC), note: str(raw.note), confirmedTrips: 0 };
}

/** Normalizza testo master per la ricerca: minuscole, senza accenti, "Under 16" -> "u16". */
export function normalizeGroupText(t: string): string {
  return t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/\bunder\s*(\d{2})\b/g, "u$1").replace(/\s+/g, " ").trim();
}
const escapeRe = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** La query corrisponde al testo di UN campo solo come token intero (niente "16" dentro "2016"). */
export function fieldMatches(fieldText: string, query: string): boolean {
  const q = normalizeGroupText(query);
  if (!q || !fieldText) return false;
  return new RegExp(`(^|[^a-z0-9])${escapeRe(q)}($|[^a-z0-9])`).test(normalizeGroupText(fieldText));
}

export type TrainingSession = { day: string; timeLabel: string; start: number; field: "C1" | "C2"; text: string };

/** Sessioni di una annata: fonte SOLO i campi C1/C2 del quadro, mai spogliatoi o rotazioni. */
export function findSessions(slots: TrainingSlot[], query: string): TrainingSession[] {
  return slots.flatMap((s) => (["C1", "C2"] as const)
    .filter((f) => fieldMatches(s.fields[f], query))
    .map((f) => ({ day: s.day, timeLabel: s.timeLabel, start: s.start, field: f, text: s.fields[f] })));
}

/** Risolve ?annata=: id gruppo, oppure un anno dichiarato dal master. Restituisce null se non esiste. */
export function resolveAnnata(groups: PublicGroup[], value: string): PublicGroup | null {
  const v = value.trim().toLowerCase();
  if (!v) return null;
  const withEvents = groups.filter((g) => g.count > 0);
  return withEvents.find((g) => g.id.toLowerCase() === v)
    ?? withEvents.find((g) => g.years.includes(v))
    ?? withEvents.find((g) => normalizeGroupText(g.label).split(/[^a-z0-9]+/).includes(normalizeGroupText(v).replace(/\s/g, "")))
    ?? null;
}

/** "09/10/2026 ore 18:27" in ora italiana, dal timestamp del master. */
export function freshnessLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "data non disponibile";
  const p = new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).formatToParts(d);
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return `${g("day")}/${g("month")}/${g("year")} ore ${g("hour")}:${g("minute")}`;
}

/** Finestre "Prossime" del calendario originale: giorni da oggi (Europe/Rome); 180 = 6 mesi di calendario. */
export const WINDOWS = [15, 30, 60, 180] as const;
export type WindowDays = (typeof WINDOWS)[number];
/** Ultimo giorno incluso (ISO) a partire da today (YYYY-MM-DD). 6 mesi = stesso giorno, 6 mesi dopo (fine mese se manca). */
export function windowEnd(today: string, entro: WindowDays): string {
  const [y, m, d] = today.split("-").map(Number) as [number, number, number];
  if (entro === 180) {
    const last = new Date(Date.UTC(y, m - 1 + 7, 0)).getUTCDate();
    return new Date(Date.UTC(y, m - 1 + 6, Math.min(d, last))).toISOString().slice(0, 10);
  }
  return new Date(Date.UTC(y, m - 1, d + entro)).toISOString().slice(0, 10);
}

/**
 * Chiave per aprire /allenamenti dal gruppo del calendario: anno dichiarato o categoria presa
 * dall'etichetta, accettata SOLO se compare nei campi Campo 1/Campo 2 del quadro. Nessun mapping
 * implicito (es. U13=2014). null = nessuna corrispondenza verificata.
 */
export function trainingKeyFor(group: Pick<PublicGroup, "label" | "years">, slots: TrainingSlot[]): string | null {
  const label = normalizeGroupText(group.label);
  const cats = (label.match(/prima squadra|juniores|\bu\d{2}\b/g) ?? [])
    .map((c) => (c === "prima squadra" ? "Prima Squadra" : c === "juniores" ? "Juniores" : c.toUpperCase()));
  for (const k of [...group.years, ...cats]) if (findSessions(slots, k).length > 0) return k;
  return null;
}
