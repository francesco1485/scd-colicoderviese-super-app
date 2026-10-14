/**
 * Minibuses in 2D under the trainings (Direzione 14/10/2026 11:00, UD-130):
 * "sotto gli allenamenti una pianta 2D di ogni pulmino come i campi e gli spogliatoi, con chi c'è dentro;
 * 3-4 pulmini; per ognuno chi sale e chi scende e dove".
 *
 * Pure logic, no I/O. It works on what the server already returned:
 *   - the van plan (src/lib/pulmini-vans.ts: riders minimised on the server, four line units);
 *   - the Pulmini board facts (src/lib/transport.ts: vehicles with seats and expiries, drivers with licence).
 *
 * Rules (fail-closed, nothing invented):
 *   - a rider sits on a seat ONLY when the Master writes the van for that rider AND a fixed seat; a rider with
 *     the van but no seat is "a bordo, posto non fissato"; a rider without the van is "da collocare";
 *   - the seat map comes from the Master seats; when they are missing the verified club layout of the
 *     Fiat Ducato 9 posti (1 autista + 8, "davanti 1 autista + 2 | centro 3 | dietro 3", indicazione del club
 *     10/10/2026) is used ONLY as a labelled "disposizione indicativa";
 *   - stops are the registered stops of the route; times only when the Master has them;
 *   - expiries and licence alerts only from dates that exist; an unknown date is never "fine".
 */
import {
  DESTINATION_COLICO,
  QUADRO_DAY_CODE,
  VAN_PASSENGER_SEATS,
  VAN_UNITS,
  WEEKDAY_CODES,
  vanFromVehicle,
  vanUnit,
  type PlanRider,
  type RouteStop,
  type VanDetail,
  type VanId,
  type VanPlan,
  type WeekdayCode,
} from "./pulmini-vans";
import type { TransportBoard } from "./transport";

// ── Seat layouts ─────────────────────────────────────────────────────────────────────────────────────

export type SeatKind = "driver" | "passenger";

export interface SeatSpec {
  /** "D" for the driver, "1".."n" for passengers. */
  id: string;
  kind: SeatKind;
}

export interface SeatRow {
  /** "Davanti", "Centro", "Dietro" or "Fila n". */
  label: string;
  seats: SeatSpec[];
}

export interface SeatLayout {
  /** Rows from the front (driver) to the back. */
  rows: SeatRow[];
  passengerSeats: number;
  /** master = seats from the Master Flotta; indicative = verified club layout, seats still to confirm. */
  source: "master" | "indicative";
  /** What is shown under the drawing. */
  note: string;
}

const seat = (id: string): SeatSpec => ({ id, kind: id === "D" ? "driver" : "passenger" });

/** Fiat Ducato M1, 9 posti = 1 autista + 8 (indicazione del club 10/10/2026): davanti D+1+2 | centro 3-5 | dietro 6-8. */
export const DUCATO_9_ROWS: readonly SeatRow[] = [
  { label: "Davanti", seats: ["D", "1", "2"].map(seat) },
  { label: "Centro", seats: ["3", "4", "5"].map(seat) },
  { label: "Dietro", seats: ["6", "7", "8"].map(seat) },
];

export const INDICATIVE_NOTE = "Disposizione indicativa: Fiat Ducato 9 posti (1 autista + 8), indicazione del club del 10/10/2026. Posti da confermare nel Master Flotta.";

/** Rows for a number of passenger seats: driver + 2 in front, then rows of 3 (the last one may be shorter). */
export function rowsForSeats(passengers: number): SeatRow[] {
  const n = Math.max(1, Math.min(60, Math.floor(passengers)));
  if (n === VAN_PASSENGER_SEATS) return DUCATO_9_ROWS.map((r) => ({ label: r.label, seats: r.seats.map((s) => ({ ...s })) }));
  const front = Math.min(2, n);
  const rows: SeatRow[] = [{ label: "Davanti", seats: [seat("D"), ...Array.from({ length: front }, (_, i) => seat(String(i + 1)))] }];
  let next = front + 1;
  let row = 2;
  while (next <= n) {
    const ids = Array.from({ length: Math.min(3, n - next + 1) }, (_, i) => seat(String(next + i)));
    rows.push({ label: `Fila ${row}`, seats: ids });
    next += ids.length;
    row += 1;
  }
  return rows;
}

export interface FleetVehicle {
  van: VanId;
  label: string;
  plate: string | null;
  seatsPassengers: number | null;
  dues: { insurance: string | null; inspection: string | null; roadTax: string | null };
}

export interface FleetDriver {
  name: string;
  status: string | null;
  licenceDue: string | null;
}

export interface FleetFacts {
  /** False when the board is not readable for this session (no database, preview, not allowed). */
  known: boolean;
  vehicles: FleetVehicle[];
  drivers: FleetDriver[];
}

export const NO_FLEET: FleetFacts = { known: false, vehicles: [], drivers: [] };

/** Vehicles of the board mapped to the four vans by their code or label (BUS-01, P1, Pulmino 1…). */
export function fleetFromBoard(board: TransportBoard | null): FleetFacts {
  if (!board) return NO_FLEET;
  const vehicles: FleetVehicle[] = [];
  for (const v of board.vehicles) {
    const van = vanFromVehicle(v.code) ?? vanFromVehicle(v.label);
    if (!van || vehicles.some((x) => x.van === van)) continue;
    vehicles.push({
      van,
      label: v.label,
      plate: v.plate,
      seatsPassengers: v.seatsPassengers,
      dues: { insurance: v.insuranceDue, inspection: v.inspectionDue, roadTax: v.roadTaxDue },
    });
  }
  return {
    known: true,
    vehicles,
    drivers: board.drivers.map((d) => ({ name: d.name, status: d.status, licenceDue: d.licenceDue })),
  };
}

/** The seat map of one van: Master seats when known, otherwise the labelled indicative Ducato layout. */
export function seatsFor(vehicle: FleetVehicle | null | undefined): SeatLayout {
  const n = vehicle?.seatsPassengers ?? null;
  if (n !== null && Number.isInteger(n) && n >= 1 && n <= 60) {
    return { rows: rowsForSeats(n), passengerSeats: n, source: "master", note: `${n} posti passeggeri + autista, dal Master Flotta.` };
  }
  return { rows: rowsForSeats(VAN_PASSENGER_SEATS), passengerSeats: VAN_PASSENGER_SEATS, source: "indicative", note: INDICATIVE_NOTE };
}

// ── Seats ────────────────────────────────────────────────────────────────────────────────────────────

export interface SeatCell extends SeatSpec {
  rider: PlanRider | null;
}

export interface VanSeatPlan {
  van: VanId;
  layout: SeatLayout;
  rows: Array<{ label: string; seats: SeatCell[] }>;
  /** Riders the Master puts on this van. */
  aboard: PlanRider[];
  /** On this van per the Master, but without a valid fixed seat (or the seat is already taken). */
  noFixedSeat: PlanRider[];
  /** Riders whose seat is already taken by someone else, or is not in the layout. */
  seatConflicts: PlanRider[];
}

const byName = (a: PlanRider, b: PlanRider) => (a.name ?? a.team).localeCompare(b.name ?? b.team, "it") || a.key.localeCompare(b.key);

/** Seats filled ONLY from the Master: van assignment + fixed seat. Nothing is guessed. */
export function seatPlanFor(van: VanId, riders: readonly PlanRider[], layout: SeatLayout): VanSeatPlan {
  const aboard = riders.filter((r) => r.assigned === van).sort(byName);
  const taken = new Map<string, PlanRider>();
  const ids = new Set(layout.rows.flatMap((r) => r.seats.filter((s) => s.kind === "passenger").map((s) => s.id)));
  const noFixedSeat: PlanRider[] = [];
  const seatConflicts: PlanRider[] = [];
  for (const r of aboard) {
    if (r.seat && ids.has(r.seat) && !taken.has(r.seat)) taken.set(r.seat, r);
    else {
      noFixedSeat.push(r);
      if (r.seat) seatConflicts.push(r);
    }
  }
  return {
    van,
    layout,
    rows: layout.rows.map((row) => ({ label: row.label, seats: row.seats.map((s) => ({ ...s, rider: s.kind === "passenger" ? (taken.get(s.id) ?? null) : null })) })),
    aboard,
    noFixedSeat,
    seatConflicts,
  };
}

// ── Giro (route with who gets on and off) ───────────────────────────────────────────────────────────

export interface GiroStop {
  index: number;
  town: string;
  place: string | null;
  /** Planned time from the Master (andata), null when missing. */
  eta: string | null;
  /** ▲ get on going to training (andata). */
  up: PlanRider[];
  /** ▼ get off coming back (ritorno). */
  down: PlanRider[];
}

export interface Giro {
  van: VanId;
  day: WeekdayCode;
  source: VanDetail["route"]["source"];
  note: string;
  destination: string;
  stops: GiroStop[];
  /** Riding that day, but without a registered stop in the Master. */
  noStopUp: PlanRider[];
  noStopDown: PlanRider[];
  outCount: number;
  backCount: number;
}

const sameStop = (a: RouteStop | null, b: RouteStop) => a !== null && a.town === b.town && a.place === b.place;

/** Ordered stops of a van's line for one weekday, with who gets on (andata) and off (ritorno) at each one. */
export function giroFor(detail: VanDetail, day: WeekdayCode): Giro {
  const out = detail.regulars.filter((r) => r.days[day].out !== "no");
  const back = detail.regulars.filter((r) => r.days[day].back !== "no");
  const stops = detail.route.stops.map((s, index) => ({
    index,
    town: s.town,
    place: s.place,
    eta: s.eta,
    up: out.filter((r) => sameStop(r.up, s)).sort(byName),
    down: back.filter((r) => sameStop(r.down, s)).sort(byName),
  }));
  const placedUp = new Set(stops.flatMap((s) => s.up.map((r) => r.key)));
  const placedDown = new Set(stops.flatMap((s) => s.down.map((r) => r.key)));
  return {
    van: detail.id,
    day,
    source: detail.route.source,
    note: detail.route.note,
    destination: detail.destination || DESTINATION_COLICO,
    stops,
    noStopUp: out.filter((r) => !placedUp.has(r.key)).sort(byName),
    noStopDown: back.filter((r) => !placedDown.has(r.key)).sort(byName),
    outCount: out.length,
    backCount: back.length,
  };
}

// ── Names of minors ─────────────────────────────────────────────────────────────────────────────────

/**
 * Last guard before a child's name is drawn: first name(s) + surname initial, whatever arrives
 * ("Mattia Rossi" → "Mattia R.", "Mattia R." stays, "Mattia" stays). Null stays null.
 */
export function minorLabel(name: string | null): string | null {
  if (!name) return null;
  const parts = name.replace(/\s+/g, " ").trim().split(" ");
  if (parts.length < 2) return parts[0] || null;
  const last = parts[parts.length - 1]!;
  if (/^\p{Lu}\.$/u.test(last)) return parts.join(" ");
  // Two words: "Nome Cognome". More words: keep the first as given name, initial of the first surname word.
  return `${parts[0]} ${parts[1]!.charAt(0).toLocaleUpperCase("it-IT")}.`;
}

/** First name only, for the small label inside a seat ("Mattia R." → "Mattia"). */
export function seatShortLabel(name: string | null): string | null {
  const l = minorLabel(name);
  return l ? l.split(" ")[0]! : null;
}

// ── Alerts ──────────────────────────────────────────────────────────────────────────────────────────

export type AlertTone = "crit" | "warn" | "info";

export interface VanAlert {
  id: string;
  tone: AlertTone;
  text: string;
  van: VanId | null;
}

function isoAddDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const itDate = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");

export interface AssignmentSummary {
  active: number;
  assigned: number;
  seated: number;
}

/** How many active riders the Master already puts on a van, and how many have a fixed seat. */
export function assignmentSummary(plan: VanPlan): AssignmentSummary {
  const riders = allRiders(plan);
  return {
    active: plan.counts.active,
    assigned: riders.filter((r) => r.assigned !== null).length,
    seated: riders.filter((r) => r.assigned !== null && r.seat !== null).length,
  };
}

/** Every rider of the plan once (regulars of the four vans + riders still to place). */
export function allRiders(plan: VanPlan): PlanRider[] {
  const m = new Map<string, PlanRider>();
  for (const v of plan.vans) for (const r of v.regulars) m.set(r.key, r);
  for (const u of plan.unplaced) for (const r of u.riders) m.set(r.key, r);
  return [...m.values()];
}

/** The exact sentence of the empty seat map: what is missing in the Master, with real counts. */
export function assignmentEmptyText(plan: VanPlan): string | null {
  if (plan.mode === "locked") return null;
  const s = assignmentSummary(plan);
  if (s.active === 0) return "Nessun iscritto attivo al servizio nel Master Pulmini.";
  if (s.assigned === 0) return `Assegna i ragazzi ai pulmini nel Master Flotta: oggi 0 su ${s.active} assegnati.`;
  if (s.seated === 0) return `${s.assigned} su ${s.active} ragazzi hanno il pulmino nel Master, nessuno ha ancora un posto fisso.`;
  return null;
}

export interface AlertInput {
  plan: VanPlan;
  fleet: FleetFacts;
  /** Today in Rome (YYYY-MM-DD). */
  today: string;
}

/** Alerts for the transport manager, most urgent first. Only from data that exists. */
export function vanAlerts({ plan, fleet, today }: AlertInput): VanAlert[] {
  const out: VanAlert[] = [];
  const soon = isoAddDays(today, 30);
  const vehicleOf = (id: VanId) => fleet.vehicles.find((v) => v.van === id) ?? null;

  if (plan.mode !== "locked") {
    // Over capacity: riders of the van (by vehicle or line) on one day and direction > passenger seats.
    for (const v of plan.vans) {
      const layout = seatsFor(vehicleOf(v.id));
      const worst: string[] = [];
      for (const d of WEEKDAY_CODES) {
        const a = v.regulars.filter((r) => r.days[d].out !== "no").length;
        const b = v.regulars.filter((r) => r.days[d].back !== "no").length;
        if (a > layout.passengerSeats) worst.push(`${DAY_SHORT[d]} andata ${a}`);
        if (b > layout.passengerSeats) worst.push(`${DAY_SHORT[d]} ritorno ${b}`);
      }
      if (worst.length) {
        out.push({
          id: `over-${v.id}`,
          tone: "crit",
          van: v.id,
          text: `${v.label} oltre i posti (${layout.passengerSeats}${layout.source === "indicative" ? " indicativi" : ""}): ${worst.join(", ")}. Serve un secondo giro o un altro pulmino.`,
        });
      }
      const seats = seatPlanFor(v.id, v.regulars, layout);
      if (seats.aboard.length > layout.passengerSeats) {
        out.push({ id: `assigned-over-${v.id}`, tone: "crit", van: v.id, text: `${v.label}: ${seats.aboard.length} ragazzi assegnati nel Master su ${layout.passengerSeats} posti.` });
      }
      if (seats.seatConflicts.length) {
        out.push({ id: `seat-${v.id}`, tone: "warn", van: v.id, text: `${v.label}: ${seats.seatConflicts.length} posti fissi doppi o fuori pianta nel Master.` });
      }
      const noStop = v.regulars.filter((r) => WEEKDAY_CODES.some((d) => (r.days[d].out !== "no" && !r.up) || (r.days[d].back !== "no" && !r.down))).length;
      if (noStop) {
        out.push({ id: `stop-${v.id}`, tone: "warn", van: v.id, text: `${v.label}: ${noStop} ${noStop === 1 ? "ragazzo senza fermata registrata" : "ragazzi senza fermata registrata"} sulla linea.` });
      }
    }
    const s = assignmentSummary(plan);
    if (s.active > 0 && s.assigned < s.active) {
      out.push({ id: "no-vehicle", tone: "warn", van: null, text: `Ragazzi senza pulmino nel Master Flotta: ${s.active - s.assigned} su ${s.active} (assegnati ${s.assigned}).` });
    }
  }

  if (fleet.known) {
    for (const v of fleet.vehicles) {
      const label = vanUnit(v.van).label;
      for (const [key, name] of [["insurance", "assicurazione"], ["inspection", "revisione"], ["roadTax", "bollo"]] as const) {
        const due = v.dues[key];
        if (!due) continue;
        if (due < today) out.push({ id: `due-${v.van}-${key}`, tone: "crit", van: v.van, text: `${label}: ${name} scaduta il ${itDate(due)}.` });
        else if (due <= soon) out.push({ id: `due-${v.van}-${key}`, tone: "warn", van: v.van, text: `${label}: ${name} in scadenza il ${itDate(due)}.` });
      }
    }
    for (const d of fleet.drivers) {
      if (!d.licenceDue) continue;
      if (d.licenceDue < today) out.push({ id: `licence-${d.name}`, tone: "crit", van: null, text: `Patente di ${d.name} scaduta il ${itDate(d.licenceDue)}.` });
      else if (d.licenceDue <= soon) out.push({ id: `licence-${d.name}`, tone: "warn", van: null, text: `Patente di ${d.name} in scadenza il ${itDate(d.licenceDue)}.` });
    }
  }

  const rank: Record<AlertTone, number> = { crit: 0, warn: 1, info: 2 };
  return out.sort((a, b) => rank[a.tone] - rank[b.tone]);
}

// ── Days ────────────────────────────────────────────────────────────────────────────────────────────

export const DAY_SHORT: Readonly<Record<WeekdayCode, string>> = { LUN: "Lun", MAR: "Mar", MER: "Mer", GIO: "Gio", VEN: "Ven" };

/** Quadro day ("MERCOLEDÌ") → weekday code; anything else → Monday. */
export function weekdayOf(quadroDay: string | null | undefined): WeekdayCode {
  return (quadroDay && QUADRO_DAY_CODE[quadroDay]) || "LUN";
}

/** The four vans in order (for tabs), with their fleet row when the board has it. */
export function vanTabs(fleet: FleetFacts): Array<{ id: VanId; label: string; line: string; vehicle: FleetVehicle | null }> {
  return VAN_UNITS.map((u) => ({ id: u.id, label: u.label, line: u.line, vehicle: fleet.vehicles.find((v) => v.van === u.id) ?? null }));
}
