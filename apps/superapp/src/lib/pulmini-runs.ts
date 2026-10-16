/**
 * Pulmini runs (UD — pulmini with driver and figurative passengers).
 *
 * Private operational data read on the server from env SCD_PULMINI_RUNS_JSON,
 * copied from the Master Pulmini: which away match a van serves, the driver's
 * display name (adult volunteer), departure, seats and how many children ride,
 * split by team. Children are NEVER named: the parser drops any field it does not
 * know, so names pasted by mistake are discarded before reaching the page.
 */

export interface TrainingRef {
  /** Weekday key as in the quadro ("LUNEDÌ"). */
  day: string;
  /** Slot start in minutes from midnight (e.g. 1040 = 17:20). */
  start: number;
}

export interface PulminoRun {
  /** Calendar event id served by this run (EVT-...), or "" for a weekday training run. */
  eventId: string;
  /** Set for weekday training runs: which slot the van serves. */
  training: TrainingRef | null;
  /** Vehicle label as written in the Master Flotta (e.g. "Pulmino 1"). */
  vehicle: string;
  /** Driver display name, adult volunteer ("Mario R."). Null when not yet assigned. */
  driver: string | null;
  /** Departure time HH:MM, null when not set. */
  departure: string | null;
  /** Meeting point, null when not set. */
  meetingPoint: string | null;
  /** Passenger seats (driver excluded). Null when the vehicle seats are not confirmed. */
  seats: number | null;
  /** Children on board, counts only, by team group id ("u15": 6). */
  riders: Record<string, number>;
  /** Accompanying adults besides the driver. */
  adults: number;
}

export interface PulminiRuns {
  asOf: string | null;
  runs: PulminoRun[];
}

/** Standard 9-seat minibus: driver + 8 passengers. Used only to draw the layout when seats are unknown. */
export const DEFAULT_PASSENGER_SEATS = 8;

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const DAYS = new Set(["LUNEDÌ", "MARTEDÌ", "MERCOLEDÌ", "GIOVEDÌ", "VENERDÌ", "SABATO", "DOMENICA"]);

function parseTraining(v: unknown): TrainingRef | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const day = typeof o["day"] === "string" ? o["day"].trim().toUpperCase() : "";
  const start = typeof o["start"] === "number" ? o["start"] : Number.NaN;
  if (!DAYS.has(day) || !Number.isInteger(start) || start < 0 || start >= 1440) return null;
  return { day, start };
}
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function text(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.replace(/\s+/g, " ").trim();
  return t ? t.slice(0, max) : null;
}

function count(v: unknown, max: number): number {
  const n = typeof v === "number" ? v : Number.NaN;
  return Number.isInteger(n) && n >= 0 ? Math.min(n, max) : 0;
}

function parseRun(v: unknown): PulminoRun | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const eventId = text(o["eventId"], 120) ?? "";
  const training = parseTraining(o["training"]);
  const vehicle = text(o["vehicle"], 40);
  if ((!eventId && !training) || !vehicle) return null;
  const departure = text(o["departure"], 5);
  const seatsRaw = o["seats"];
  const seats = typeof seatsRaw === "number" && Number.isInteger(seatsRaw) && seatsRaw > 0 && seatsRaw <= 20 ? seatsRaw : null;
  const riders: Record<string, number> = {};
  const r = o["riders"];
  if (r && typeof r === "object" && !Array.isArray(r)) {
    for (const [k, n] of Object.entries(r as Record<string, unknown>)) {
      if (/^[a-z0-9-]{1,24}$/.test(k)) {
        const c = count(n, 20);
        if (c > 0) riders[k] = c;
      }
    }
  }
  return {
    eventId,
    training,
    vehicle,
    driver: text(o["driver"], 40),
    departure: departure && TIME.test(departure) ? departure : null,
    meetingPoint: text(o["meetingPoint"], 80),
    seats,
    riders,
    adults: count(o["adults"], 8),
  };
}

/** Strict parser: invalid JSON or shapes give an empty list, never an exception. */
export function parseRuns(raw: string | undefined | null): PulminiRuns {
  if (!raw || !raw.trim()) return { asOf: null, runs: [] };
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { asOf: null, runs: [] };
  }
  if (!data || typeof data !== "object") return { asOf: null, runs: [] };
  const o = data as Record<string, unknown>;
  const asOf = typeof o["asOf"] === "string" && DATE.test(o["asOf"]) ? o["asOf"] : null;
  const list = Array.isArray(o["runs"]) ? o["runs"] : [];
  return { asOf, runs: list.map(parseRun).filter((x): x is PulminoRun => x !== null).slice(0, 60) };
}

export function ridersTotal(run: PulminoRun): number {
  return Object.values(run.riders).reduce((a, b) => a + b, 0);
}

export interface SeatPlan {
  /** Seats drawn in the van (driver excluded). */
  seats: number;
  /** True when the number of seats comes from the Master (not the default layout). */
  confirmed: boolean;
  /** One entry per seat, in drawing order: a team id for an occupied seat, "adult", or null when free. */
  occupancy: Array<string | null>;
  /** Children + adults that do not fit in the seats drawn. */
  overflow: number;
}

/**
 * Seat map for one van: children grouped by team, then accompanying adults, then free seats.
 * Without a run the layout is the standard 9-seat van, all seats free.
 */
export function seatPlan(run: PulminoRun | null): SeatPlan {
  const seats = run?.seats ?? DEFAULT_PASSENGER_SEATS;
  const people: string[] = [];
  if (run) {
    for (const [team, n] of Object.entries(run.riders).sort(([a], [b]) => a.localeCompare(b))) {
      for (let i = 0; i < n; i++) people.push(team);
    }
    for (let i = 0; i < run.adults; i++) people.push("adult");
  }
  const occupancy = Array.from({ length: seats }, (_, i) => people[i] ?? null);
  return { seats, confirmed: run?.seats != null, occupancy, overflow: Math.max(0, people.length - seats) };
}

/** Runs indexed by calendar event, keeping all vans of a trip (training runs excluded). */
export function runsByEvent(runs: readonly PulminoRun[]): Map<string, PulminoRun[]> {
  const m = new Map<string, PulminoRun[]>();
  for (const r of runs) if (r.eventId) m.set(r.eventId, [...(m.get(r.eventId) ?? []), r]);
  return m;
}

/** Key of a training slot, shared by runs and the quadro. */
export function trainingKey(day: string, start: number): string {
  return `${day}@${start}`;
}

/** Weekday training runs indexed by slot key. */
export function runsByTraining(runs: readonly PulminoRun[]): Map<string, PulminoRun[]> {
  const m = new Map<string, PulminoRun[]>();
  for (const r of runs) {
    if (!r.training) continue;
    const k = trainingKey(r.training.day, r.training.start);
    m.set(k, [...(m.get(k) ?? []), r]);
  }
  return m;
}

/**
 * Pulmini service for every signed-in member (Francesco 16/10/2026 23:34: base access includes "le dinamiche del
 * servizio pulmini: zone, orari, corse attive", no children's names). Only what a family needs to know how the service
 * works: vehicle, departure, meeting point, seats and how many ride in total. The driver's name and the split by team
 * stay in the staff area; a parent sees their own child's run in the family area (scd_transport_live_view, own family).
 */
export interface PulminoServiceRun {
  eventId: string;
  training: TrainingRef | null;
  vehicle: string;
  departure: string | null;
  meetingPoint: string | null;
  seats: number | null;
  /** Total children on board (count only), never by name or team. */
  riders: number;
  driverAssigned: boolean;
}

export function serviceView(runs: readonly PulminoRun[]): PulminoServiceRun[] {
  return runs.map((r) => ({
    eventId: r.eventId,
    training: r.training ? { day: r.training.day, start: r.training.start } : null,
    vehicle: r.vehicle,
    departure: r.departure,
    meetingPoint: r.meetingPoint,
    seats: r.seats,
    riders: ridersTotal(r),
    driverAssigned: r.driver !== null,
  }));
}
