/**
 * Contratti e logica pura per gli snapshot pubblici di prova (pacchetti Drive RC8 Quadro / RC1 Calendario).
 * DATI DI PROVA · FOTOGRAFIA 09.10.2026 · NON LIVE · NON PUBBLICARE.
 */
import quadroJson from './data/quadro_pubblico.json';
import trasportiJson from './data/trasporti_pubblico.json';
import calendarioJson from './data/calendario_pubblico.json';

export const SNAPSHOT_WATERMARK = 'DATI DI PROVA / FOTOGRAFIA 09.10.2026 — NON PUBBLICARE';
export const SNAPSHOT_DATE = '2026-10-09';

export type Day = 'LUNEDÌ' | 'MARTEDÌ' | 'MERCOLEDÌ' | 'GIOVEDÌ' | 'VENERDÌ';
export type Room = 'SP1' | 'SP2' | 'SP3' | 'SP4';
export type ZoneKey = 'C1_A' | 'C1_B' | 'C1_C' | 'C2_A' | 'C2_B';
export type Week = 'A' | 'B';

export interface QuadroSlot { sourceRow: number; day: Day; start: number; end: number; timeLabel: string; fields: { C1: string; C2: string }; rooms: Partial<Record<Room, string>> }
export interface QuadroRotation { sourceRow: number; week: 'A' | 'B' | 'A/B'; days: Day[]; start: number; end: number; timeLabel: string; zones: Partial<Record<ZoneKey, string>> }
export interface QuadroRoom { sourceRow: number; week: Week; day: Day; id: Room; start: number; end: number; group: string }
export interface QuadroSnapshot { schema: string; audience: string; generatedUTC: string; days: Day[]; slots: QuadroSlot[]; rotations: QuadroRotation[]; rooms: QuadroRoom[]; note: string }
export interface TrasportiSnapshot { schema: string; audience: string; checkedUTC: string; services: unknown[]; note: string }

export interface CalGroup { label: string; color: string; logo: string | null }
export interface CalEvent { id: string; date: string; time: string; end: string; category: string; group: string; type: string; home_away: 'CASA' | 'FUORI'; venue: string; opponent: string; round: string; source: string; notice: string[]; match_status: string; is_variation: boolean; verification?: { time_confirmed: boolean; venue_confirmed: boolean; facility_review_required: boolean } }
export interface CalendarioSnapshot { schema: string; season: string; snapshot_status: string; source_modified_at: string; source_sha256?: string; projection_revision?: string; groups: Record<string, CalGroup>; events: CalEvent[]; transport: { confirmed_trips: number; status: string; caption: string }; facilities: { reference: string; locker_room_slots?: string[]; allocations: string; note?: string } }

export const quadro = quadroJson as QuadroSnapshot;
export const trasporti = trasportiJson as TrasportiSnapshot;
export const calendario = calendarioJson as CalendarioSnapshot;

export const ROOMS: Room[] = ['SP1', 'SP2', 'SP3', 'SP4'];

/** U18 è ritirata: mai tra le categorie attive. */
export const isRetired = (text: string) => /\bU18\b/i.test(text);

export const activeEvents = (events: CalEvent[]) => events.filter(e => !isRetired(e.category) && !isRetired(e.group) && !/RITIRAT|ANNULLAT|CANCELL/i.test(e.match_status));

export const slotsForDay = (q: QuadroSnapshot, day: Day) => q.slots.filter(s => s.day === day).sort((a, b) => a.start - b.start);

export const rotationFor = (q: QuadroSnapshot, day: Day, week: Week, start: number) =>
  q.rotations.find(r => r.days.includes(day) && r.start === start && (r.week === week || r.week === 'A/B'));

export const roomsFor = (q: QuadroSnapshot, day: Day, week: Week, start: number) =>
  q.rooms.filter(r => r.day === day && r.week === week && r.start === start);

const LOGOS: [RegExp, string][] = [
  [/prima/i, 'SCD_PRIMA_SQUADRA.png'],
  [/U19|juniores|2008|2009/i, 'SCD_JUNIORES_2008_2009.png'],
  [/U16|2011/i, 'SCD_U16_2011.png'],
  [/U15|2012|2013|giovanissimi/i, 'SCD_U15_2012_2013.png'],
  [/U13|2014/i, 'SCD_U13_2014.png'],
  [/U12|2015/i, 'SCD_U12_2015.png'],
  [/U11|pulcini|2016|2017/i, 'SCD_PULCINI_2016_2017.png'],
  [/primi\s*calci|2018|2019/i, 'SCD_PRIMI_2018_2019.png'],
  [/piccoli|2020|2021/i, 'SCD_PICCOLI_2020_2021.png'],
];
/** Logo annata dal pacchetto di prova; null se non riconoscibile (nessuna attribuzione inventata). */
export function logoFor(label: string | undefined): string | null {
  if (!label) return null;
  const hit = LOGOS.find(([re]) => re.test(label));
  return hit ? `/scd-preview/${hit[1]}` : null;
}

export const fmtMinutes = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

/* ---------- Calendario ---------- */
export type HomeAway = 'TUTTE' | 'CASA' | 'FUORI';
export interface CalFilter { group: string; homeAway: HomeAway; view: 'settimana' | 'mese'; anchor: string }

const toUTC = (iso: string) => new Date(`${iso}T12:00:00Z`);
const iso = (d: Date) => d.toISOString().slice(0, 10);
export function mondayOf(isoDate: string) {
  const d = toUTC(isoDate);
  const dow = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dow);
  return iso(d);
}
export function shiftAnchor(anchor: string, view: CalFilter['view'], dir: 1 | -1) {
  const d = toUTC(anchor);
  if (view === 'settimana') d.setUTCDate(d.getUTCDate() + 7 * dir);
  else { d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + dir); }
  return view === 'settimana' ? mondayOf(iso(d)) : iso(d).slice(0, 8) + '01';
}
export function rangeOf(f: Pick<CalFilter, 'view' | 'anchor'>): [string, string] {
  if (f.view === 'settimana') {
    const start = mondayOf(f.anchor); const e = toUTC(start); e.setUTCDate(e.getUTCDate() + 6);
    return [start, iso(e)];
  }
  const s = toUTC(f.anchor.slice(0, 8) + '01'); const e = new Date(s); e.setUTCMonth(e.getUTCMonth() + 1); e.setUTCDate(0);
  return [iso(s), iso(e)];
}
export function filterEvents(events: CalEvent[], f: CalFilter) {
  const [from, to] = rangeOf(f);
  return activeEvents(events)
    .filter(e => e.date >= from && e.date <= to)
    .filter(e => f.group === 'tutte' || e.group === f.group)
    .filter(e => f.homeAway === 'TUTTE' || e.home_away === f.homeAway)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
}

/* ---------- Processo CORE (solo simulazione locale) ---------- */
export const coreSteps = ['Bozza', 'Controllo campi/spogliatoi', 'Approvazione', 'Pubblicazione'] as const;
export const nextStep = (i: number) => Math.min(i + 1, coreSteps.length - 1);

export const rubricaGroups = ['Dirigenza', 'Responsabili e coordinatori', 'Staff e dirigenti', 'Personale struttura'] as const;

/* ---------- Annate derivate dai testi dello snapshot Quadro ---------- */
const ANNATE: { id: string; label: string; re: RegExp }[] = [
  { id: 'prima', label: 'Prima Squadra', re: /prima squadra/i },
  { id: 'u19', label: 'Juniores U19', re: /juniores|\bU19\b/i },
  { id: 'u16', label: 'U16 · 2011', re: /\bU16\b|under 16|\b2011\b/i },
  { id: 'u15', label: 'U15 · 2012/13', re: /\bU15\b|under 15|\b2012\b/i },
  { id: 'u13', label: 'U13 · 2014', re: /\bU13\b|under 13|\b2014\b/i },
  { id: 'u12', label: 'U12 · 2015', re: /\bU12\b|\b2015\b/i },
  { id: 'u11', label: 'U11 · 2016/17', re: /\bU11\b|pulcini|\b2016\b|\b2017\b/i },
  { id: 'primicalci', label: 'Primi Calci · 2018/19', re: /primi calci|\b2018\b|\b2019\b/i },
  { id: 'piccoli', label: 'Piccoli Amici · 2020/21', re: /piccoli amici|\b2020\b|\b2021\b/i },
];
export type Annata = { id: string; label: string; re: RegExp };

export function quadroTexts(q: QuadroSnapshot): string[] {
  const t = new Set<string>();
  q.slots.forEach(s => { t.add(s.fields.C1); t.add(s.fields.C2); Object.values(s.rooms).forEach(v => v && t.add(v)); });
  q.rotations.forEach(r => Object.values(r.zones).forEach(v => v && t.add(v)));
  q.rooms.forEach(r => t.add(r.group));
  return [...t];
}
/** Solo le annate che compaiono davvero nei testi dello snapshot. */
export const annateFrom = (q: QuadroSnapshot): Annata[] => { const texts = quadroTexts(q); return ANNATE.filter(a => texts.some(t => a.re.test(t))); };
export const matchesAnnata = (text: string | undefined, a: Annata | undefined) => !!text && !!a && a.re.test(text);

/** Sessione ufficiale = solo campi master C1/C2 della fascia; rotazioni e spogliatoi indicano solo il "dove". */
export function slotHasAnnata(_q: QuadroSnapshot, slot: QuadroSlot, _week: Week, a: Annata) {
  return [slot.fields.C1, slot.fields.C2].some(t => matchesAnnata(t, a));
}

/* ---------- Stagione ---------- */
export const isInactive = (e: CalEvent) => isRetired(e.category) || isRetired(e.group) || /RITIRAT|ANNULLAT|CANCELL/i.test(e.match_status);
export function seasonByMonth(events: CalEvent[], group: string, homeAway: HomeAway) {
  const months = new Map<string, CalEvent[]>();
  events.filter(e => !isInactive(e))
    .filter(e => group === 'tutte' || e.group === group)
    .filter(e => homeAway === 'TUTTE' || e.home_away === homeAway)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    .forEach(e => { const k = e.date.slice(0, 7); months.set(k, [...(months.get(k) ?? []), e]); });
  return [...months.entries()];
}

/* ---------- Richiesta variazione (solo memoria) ---------- */
export const requestSources = ['Quadro', 'Calendario', 'Rotazione'] as const;
export const proposedFields = ['Colico Campo 1', 'Colico Campo 2', 'Dervio campo principale'] as const;
export interface VariationDraft { fonte: string; data: string; ora: string; annata: string; campo: string; motivo: string }
export function validateDraft(d: VariationDraft): string[] {
  const missing: string[] = [];
  if (!(requestSources as readonly string[]).includes(d.fonte)) missing.push('Fonte');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.data)) missing.push('Data');
  if (!/^\d{2}:\d{2}$/.test(d.ora)) missing.push('Ora');
  if (!d.annata) missing.push('Annata');
  if (!(proposedFields as readonly string[]).includes(d.campo)) missing.push('Campo proposto');
  if (d.motivo.trim().length < 10) missing.push('Motivo (almeno 10 caratteri)');
  return missing;
}

/* ---------- Verifiche pubbliche (snapshot RC2) ---------- */
export const TIME_VENUE_LABEL = 'ORARIO/SEDE DA CONFERMARE';
export const FACILITY_LABEL = 'RISORSA IMPIANTO DA VERIFICARE';
export const isProvisional = (e: CalEvent) => !e.verification || !e.verification.time_confirmed || !e.verification.venue_confirmed;
export const needsFacility = (e: CalEvent) => !!e.verification?.facility_review_required;
export const verificationLabels = (e: CalEvent) => [isProvisional(e) ? TIME_VENUE_LABEL : '', needsFacility(e) ? FACILITY_LABEL : ''].filter(Boolean);

/* ---------- Segmentazione fasce per intersezione (half-open) ---------- */
const overlaps = (s: number, e: number, a: number, b: number) => s < b && e > a;
const weekOk = (w: string, week: Week) => w === week || w === 'A/B';
export function rotationsOverlappingSlot(q: QuadroSnapshot, day: Day, week: Week, start: number, end: number) {
  return q.rotations.filter(r => r.days.includes(day) && weekOk(r.week, week) && overlaps(r.start, r.end, start, end)).sort((a, b) => a.start - b.start || a.end - b.end);
}
export function roomsOverlapping(q: QuadroSnapshot, day: Day, week: Week, start: number, end: number) {
  return q.rooms.filter(r => r.day === day && r.week === week && overlaps(r.start, r.end, start, end)).sort((a, b) => a.start - b.start);
}
/** Normalizza suffissi temporali ('fino alle…', 'chiusura', 'attivazione') per non creare falsi conflitti. */
export const normGroup = (t: string) => t.replace(/\s*[—–-]?\s*(fino(\s+alle)?\s+\d{1,2}[:.]\d{2}|chiusura|attivazione)\s*$/i, '').replace(/\s+/g, ' ').trim().toLowerCase();
const isBlank = (t: string | undefined) => !t || /^[—–-]?$/.test(t.trim());
export interface ZoneCell { values: string[]; conflict: boolean }
export interface Segment { start: number; end: number; label: string; rotations: QuadroRotation[]; zones: Record<ZoneKey, ZoneCell>; rooms: Record<Room, ZoneCell> }
const ZONES: ZoneKey[] = ['C1_A', 'C1_B', 'C1_C', 'C2_A', 'C2_B'];
const cell = (vals: (string | undefined)[]): ZoneCell => {
  const values = [...new Set(vals.filter((v): v is string => !isBlank(v)))];
  return { values, conflict: new Set(values.map(normGroup)).size > 1 };
};
export function segmentSlots(q: QuadroSnapshot, day: Day, week: Week, slot: Pick<QuadroSlot, 'start' | 'end'>): Segment[] {
  const rots = rotationsOverlappingSlot(q, day, week, slot.start, slot.end);
  const cuts = new Set([slot.start, slot.end]);
  rots.forEach(r => [r.start, r.end].forEach(t => { if (t > slot.start && t < slot.end) cuts.add(t); }));
  const pts = [...cuts].sort((a, b) => a - b);
  return pts.slice(0, -1).map((a, i) => {
    const b = pts[i + 1]!;
    const active = rots.filter(r => overlaps(r.start, r.end, a, b));
    const rms = roomsOverlapping(q, day, week, a, b);
    return { start: a, end: b, label: `${fmtMinutes(a)}–${fmtMinutes(b)}`, rotations: active,
      zones: Object.fromEntries(ZONES.map(k => [k, cell(active.map(r => r.zones[k]))])) as Record<ZoneKey, ZoneCell>,
      rooms: Object.fromEntries(ROOMS.map(id => [id, cell(rms.filter(r => r.id === id).map(r => r.group))])) as Record<Room, ZoneCell> };
  });
}

/* ---------- Gestione (sola lettura) ---------- */
export const needsCheck = (e: CalEvent) => isProvisional(e) || needsFacility(e);
/** Prossime gare attive dalla data indicata (inclusa), ordinate. */
export const upcoming = (events: CalEvent[], from: string, n: number) =>
  activeEvents(events).filter(e => e.date >= from).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).slice(0, n);
export const toVerify = (events: CalEvent[]) =>
  activeEvents(events).filter(isProvisional).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
