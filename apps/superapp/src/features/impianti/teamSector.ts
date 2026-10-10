/** Logica pura per "La mia squadra" / "Il mio settore". Solo snapshot PUBLIC_SAFE, nessun dato personale. */
import { activeEvents, quadro, type CalEvent, type QuadroSnapshot, type QuadroSlot } from './snapshot';

/** Data odierna nel fuso Europe/Rome (YYYY-MM-DD). */
export function romeToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
export const addDays = (iso: string, n: number) => { const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

/** Gruppi attivi effettivamente presenti nel calendario. */
export function activeGroups(events: CalEvent[]): string[] {
  return [...new Set(activeEvents(events).map(e => e.group))];
}
export const nextForGroup = (events: CalEvent[], group: string, from: string, n = 5) =>
  activeEvents(events).filter(e => e.group === group && e.date >= from).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).slice(0, n);

/**
 * Collegamento categoria calendario → testi Quadro C1/C2. Solo corrispondenze verificate nei testi;
 * null = "Quadro non collegato per questa categoria" (es. Esordienti 2014: nessun mapping U13↔2014 confermato).
 */
const QUADRO_MATCH: Record<string, RegExp | null> = {
  prima: /prima squadra/i,
  u19: /juniores/i,
  u16: /\bunder 16\b|\bU16\b/i,
  u15: /\bunder 15\b|\bU15\b/i,
  '2015': /\bU12 2015\b/i,
  '2014': null,
  pulcini: /\bU11 2016\/2017\b/i,
  primicalci: /primi calci/i,
  piccoli: /piccoli amici/i,
  esordienti: null,
  other: null,
};
export function trainingsFor(q: QuadroSnapshot, group: string): QuadroSlot[] | null {
  const re = QUADRO_MATCH[group];
  if (!re) return null;
  return q.slots.filter(s => re.test(s.fields.C1) || re.test(s.fields.C2));
}
export function fieldOf(s: QuadroSlot, group: string) { const re = QUADRO_MATCH[group]; if (!re) return ''; return [re.test(s.fields.C1) ? 'Campo 1' : '', re.test(s.fields.C2) ? 'Campo 2' : ''].filter(Boolean).join(' + '); }
export const trainingsForGroup = (group: string) => trainingsFor(quadro, group);

/** Anno di annata solo se esplicito nell'etichetta del gruppo. */
export const yearOf = (label: string) => label.match(/\b(20\d{2})\b/)?.[1] ?? null;

/* ---------- Settore ---------- */
export const PERIODS = [7, 15, 30, 60, 180] as const;
export type Period = (typeof PERIODS)[number];
export interface SectorFilter { groups: string[]; days: Period; homeAway: 'TUTTE' | 'CASA' | 'FUORI'; from: string }
export function sectorEvents(events: CalEvent[], f: SectorFilter) {
  const to = addDays(f.from, f.days - 1);
  return activeEvents(events)
    .filter(e => e.date >= f.from && e.date <= to)
    .filter(e => f.groups.length === 0 || f.groups.includes(e.group))
    .filter(e => f.homeAway === 'TUTTE' || e.home_away === f.homeAway)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
}
export function byDate(events: CalEvent[]) {
  const m = new Map<string, CalEvent[]>();
  events.forEach(e => m.set(e.date, [...(m.get(e.date) ?? []), e]));
  return [...m.entries()];
}
const mins = (t: string) => { const m = /^(\d{1,2}):(\d{2})/.exec(t); return m ? +m[1]! * 60 + +m[2]! : null; };
/** Possibili gare contemporanee: stessa data, stessa sede, inizio entro 120 minuti. Solo "verifica necessaria", mai errore. */
export function possibleOverlaps(events: CalEvent[]): [CalEvent, CalEvent][] {
  const out: [CalEvent, CalEvent][] = [];
  for (let i = 0; i < events.length; i++) for (let j = i + 1; j < events.length; j++) {
    const a = events[i]!, b = events[j]!;
    if (a.date !== b.date || !a.venue || a.venue.trim().toLowerCase() !== b.venue.trim().toLowerCase()) continue;
    const ta = mins(a.time), tb = mins(b.time);
    if (ta !== null && tb !== null && Math.abs(ta - tb) < 120) out.push([a, b]);
  }
  return out;
}

/** App pubblica SCD ONE (dominio approvato dalla Direzione). */
export const PUBLIC_APP_URL = 'https://scd-colicoderviese-super-app.lovable.app';
/** Link famiglie: ?annata=ANNO solo se l'anno è esplicito nell'etichetta del gruppo; altrimenti /calendario semplice. */
export const familyLink = (label: string) => { const y = yearOf(label); return `${PUBLIC_APP_URL}/calendario${y ? `?annata=${y}` : ''}`; };
