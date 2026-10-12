/**
 * Pulmini board (r74): what the database returns from scd_transport_board, parsed and turned into
 * the pieces the /pulmini page shows. Pure: no I/O, so every rule here is unit-tested.
 * Fleet, drivers, availability, stops and service users are a copy of the Master Flotta e Trasporti;
 * trips (runs) are planned in the app. Service users arrive as counts only — never a name.
 */

export interface TransportVehicle {
  id: string;
  code: string;
  label: string;
  plate: string | null;
  model: string | null;
  ownership: string | null;
  seatsHomologated: number | null;
  seatsPassengers: number | null;
  status: string | null;
  baseAvailability: string | null;
  insuranceDue: string | null;
  inspectionDue: string | null;
  roadTaxDue: string | null;
  serviceDue: string | null;
  notes: string | null;
}

export interface TransportDriver {
  id: string;
  code: string;
  name: string;
  kind: string | null;
  status: string | null;
  licenceCategory: string | null;
  licenceDue: string | null;
  extraAvailability: string | null;
  /** Only for Direzione, Segreteria and the transport manager. */
  phone: string | null;
}

export interface DriverRule {
  code: string;
  driver: string;
  days: string | null;
  from: string | null;
  to: string | null;
  status: string | null;
  kind: string | null;
  reason: string | null;
  validFrom: string | null;
  validTo: string | null;
}

export interface TransportStop {
  code: string;
  lineId: string | null;
  line: string | null;
  position: number | null;
  town: string | null;
  place: string | null;
  status: string | null;
  eta: string | null;
}

export interface TransportRider {
  teamGroup: string | null;
  serviceStatus: string | null;
  baseType: string | null;
  line: string | null;
  stopOut: string | null;
  stopBack: string | null;
  stopStatus: string | null;
  days: Record<string, string | null>;
  weekendExtra: string | null;
}

export type RunStatus = "PIANIFICATA" | "CONFERMATA" | "ANNULLATA";
export type RunKind = "TRASFERTA" | "ALLENAMENTO" | "EXTRA";

export interface TransportRun {
  id: string;
  date: string;
  departure: string;
  returnEstimate: string | null;
  kind: RunKind;
  eventId: string | null;
  title: string;
  destination: string | null;
  meetingPoint: string | null;
  vehicleId: string | null;
  driverId: string | null;
  passengers: number | null;
  status: RunStatus;
  note: string | null;
  updatedAt: string | null;
}

export interface TransportBoard {
  canManage: boolean;
  syncedAt: string | null;
  sourceModifiedAt: string | null;
  vehicles: TransportVehicle[];
  drivers: TransportDriver[];
  rules: DriverRule[];
  stops: TransportStop[];
  riders: TransportRider[];
  runs: TransportRun[];
}

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

/** Parses the jsonb of scd_transport_board; null when the caller may not see the board. */
export function parseBoard(raw: unknown): TransportBoard | null {
  if (!raw || typeof raw !== "object") return null;
  const r = obj(raw);
  const sync = obj(r["sync"]);
  const vehicles = arr(r["vehicles"]).map((x) => {
    const o = obj(x);
    return {
      id: str(o["id"]) ?? "",
      code: str(o["code"]) ?? "",
      label: str(o["label"]) ?? str(o["code"]) ?? "Pulmino",
      plate: str(o["plate"]),
      model: str(o["model"]),
      ownership: str(o["ownership"]),
      seatsHomologated: num(o["seatsHomologated"]),
      seatsPassengers: num(o["seatsPassengers"]),
      status: str(o["status"]),
      baseAvailability: str(o["baseAvailability"]),
      insuranceDue: str(o["insuranceDue"]),
      inspectionDue: str(o["inspectionDue"]),
      roadTaxDue: str(o["roadTaxDue"]),
      serviceDue: str(o["serviceDue"]),
      notes: str(o["notes"]),
    };
  }).filter((v) => v.id);
  const drivers = arr(r["drivers"]).map((x) => {
    const o = obj(x);
    return {
      id: str(o["id"]) ?? "",
      code: str(o["code"]) ?? "",
      name: str(o["name"]) ?? str(o["code"]) ?? "Autista",
      kind: str(o["kind"]),
      status: str(o["status"]),
      licenceCategory: str(o["licenceCategory"]),
      licenceDue: str(o["licenceDue"]),
      extraAvailability: str(o["extraAvailability"]),
      phone: str(o["phone"]),
    };
  }).filter((d) => d.id);
  const rules = arr(r["rules"]).map((x) => {
    const o = obj(x);
    return {
      code: str(o["code"]) ?? "",
      driver: str(o["driver"]) ?? "",
      days: str(o["days"]),
      from: str(o["from"]),
      to: str(o["to"]),
      status: str(o["status"]),
      kind: str(o["kind"]),
      reason: str(o["reason"]),
      validFrom: str(o["validFrom"]),
      validTo: str(o["validTo"]),
    };
  }).filter((x) => x.code && x.driver);
  const stops = arr(r["stops"]).map((x) => {
    const o = obj(x);
    return {
      code: str(o["code"]) ?? "",
      lineId: str(o["lineId"]),
      line: str(o["line"]),
      position: num(o["position"]),
      town: str(o["town"]),
      place: str(o["place"]),
      status: str(o["status"]),
      eta: str(o["eta"]),
    };
  }).filter((s) => s.code);
  const riders = arr(r["riders"]).map((x) => {
    const o = obj(x);
    const days: Record<string, string | null> = {};
    for (const [k, v] of Object.entries(obj(o["days"]))) days[k] = str(v);
    return {
      teamGroup: str(o["teamGroup"]),
      serviceStatus: str(o["serviceStatus"]),
      baseType: str(o["baseType"]),
      line: str(o["line"]),
      stopOut: str(o["stopOut"]),
      stopBack: str(o["stopBack"]),
      stopStatus: str(o["stopStatus"]),
      days,
      weekendExtra: str(o["weekendExtra"]),
    };
  });
  const runs = arr(r["runs"]).map((x) => {
    const o = obj(x);
    const status = str(o["status"]);
    const kind = str(o["kind"]);
    return {
      id: str(o["id"]) ?? "",
      date: str(o["date"]) ?? "",
      departure: str(o["departure"]) ?? "",
      returnEstimate: str(o["returnEstimate"]),
      kind: (kind === "ALLENAMENTO" || kind === "EXTRA" ? kind : "TRASFERTA") as RunKind,
      eventId: str(o["eventId"]),
      title: str(o["title"]) ?? "Corsa",
      destination: str(o["destination"]),
      meetingPoint: str(o["meetingPoint"]),
      vehicleId: str(o["vehicleId"]),
      driverId: str(o["driverId"]),
      passengers: num(o["passengers"]),
      status: (status === "CONFERMATA" || status === "ANNULLATA" ? status : "PIANIFICATA") as RunStatus,
      note: str(o["note"]),
      updatedAt: str(o["updatedAt"]),
    };
  }).filter((t) => t.id && t.date && t.departure);
  return {
    canManage: r["canManage"] === true,
    syncedAt: str(sync["synced_at"]),
    sourceModifiedAt: str(sync["source_modified_at"]),
    vehicles,
    drivers,
    rules,
    stops,
    riders,
    runs,
  };
}

/* ------------------------------------------------------------ availability */

const DAY_CODES = ["DOM", "LUN", "MAR", "MER", "GIO", "VEN", "SAB"] as const;

/** "LUN", "MAR"… for an ISO date (Europe/Rome calendar day). */
export function dayCode(isoDate: string): (typeof DAY_CODES)[number] {
  const d = new Date(`${isoDate}T12:00:00Z`);
  return DAY_CODES[d.getUTCDay()]!;
}

export function toMinutes(hhmm: string | null | undefined): number | null {
  if (!hhmm) return null;
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(hhmm.trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

function ruleCoversDay(days: string | null, code: string): boolean {
  if (!days) return false;
  const d = days.toUpperCase();
  if (d === "TUTTI" || d === "TUTTI I GIORNI") return true;
  return d.split(/[^A-Z]+/).includes(code);
}

/** Default length of a trip when no return time is written: 4 hours. */
export const DEFAULT_RUN_MINUTES = 240;

/**
 * Warnings for a driver on a date and time window, from the Master's availability rules.
 * Rules are advice for the transport manager, not a block: the manager decides.
 */
export function driverWarnings(rules: readonly DriverRule[], driverCode: string, date: string, departure: string, returnEstimate: string | null): string[] {
  const start = toMinutes(departure);
  if (start === null) return [];
  const endRaw = toMinutes(returnEstimate);
  const end = endRaw !== null && endRaw > start ? endRaw : start + DEFAULT_RUN_MINUTES;
  const code = dayCode(date);
  const out: string[] = [];
  for (const r of rules) {
    if (r.driver !== driverCode || !ruleCoversDay(r.days, code)) continue;
    if (r.validFrom && date < r.validFrom) continue;
    if (r.validTo && date > r.validTo) continue;
    const from = toMinutes(r.from);
    const to = toMinutes(r.to);
    const status = (r.status ?? "").toUpperCase();
    if (status.startsWith("DISPONIBILE FINO") && to !== null && end > to) {
      out.push(`Disponibile fino alle ${r.to}: il rientro previsto è più tardi.`);
    } else if (status === "NON DISPONIBILE" && overlaps(start, end, from ?? 0, to ?? 24 * 60)) {
      out.push(`Non disponibile ${r.from ?? ""}${r.to ? `–${r.to}` : ""}${r.reason ? ` (${r.reason})` : ""}.`.replace(/\s+\(/, " ("));
    } else if (status === "DA VERIFICARE" && overlaps(start, end, from ?? 0, to ?? 24 * 60)) {
      out.push(`Da verificare: ${r.reason ?? "vincolo nel Master"}.`);
    }
  }
  return out;
}

function overlaps(a1: number, a2: number, b1: number, b2: number): boolean {
  return a1 < b2 && b1 < a2;
}

/** Same van or same driver on two live trips of the same day whose windows overlap. */
export function runClash(runs: readonly TransportRun[], candidate: { id?: string | null; date: string; departure: string; returnEstimate: string | null; vehicleId: string | null; driverId: string | null }): "vehicle" | "driver" | null {
  const s = toMinutes(candidate.departure);
  if (s === null) return null;
  const eRaw = toMinutes(candidate.returnEstimate);
  const e = eRaw !== null && eRaw > s ? eRaw : s + DEFAULT_RUN_MINUTES;
  for (const t of runs) {
    if (t.status === "ANNULLATA" || t.date !== candidate.date || (candidate.id && t.id === candidate.id)) continue;
    const ts = toMinutes(t.departure);
    if (ts === null) continue;
    const teRaw = toMinutes(t.returnEstimate);
    const te = teRaw !== null && teRaw > ts ? teRaw : ts + DEFAULT_RUN_MINUTES;
    if (!overlaps(s, e, ts, te)) continue;
    if (candidate.vehicleId && t.vehicleId === candidate.vehicleId) return "vehicle";
    if (candidate.driverId && t.driverId === candidate.driverId) return "driver";
  }
  return null;
}

/* ---------------------------------------------------------- service users */

/** Teams no longer active this season: users still filed under them are a data error. */
const WITHDRAWN = /\bU18\b/i;

export interface DemandSummary {
  total: number;
  active: number;
  byMode: Record<string, number>;
  byGroup: Record<string, number>;
  byLine: Record<string, number>;
  weekdaysToConfirm: number;
}

const isActive = (r: TransportRider) => (r.serviceStatus ?? "").toUpperCase() !== "NON ATTIVO";

export function demandSummary(riders: readonly TransportRider[]): DemandSummary {
  const out: DemandSummary = { total: riders.length, active: 0, byMode: {}, byGroup: {}, byLine: {}, weekdaysToConfirm: 0 };
  for (const r of riders) {
    if (!isActive(r)) continue;
    out.active++;
    const mode = (r.baseType ?? "DA DEFINIRE").replace(/^PROVVISORIO\s+/i, "").replace(/\s+DA FORMALIZZARE$/i, "");
    out.byMode[mode] = (out.byMode[mode] ?? 0) + 1;
    const g = r.teamGroup ?? "DA VERIFICARE";
    out.byGroup[g] = (out.byGroup[g] ?? 0) + 1;
    const l = r.line ?? "DA VERIFICARE";
    out.byLine[l] = (out.byLine[l] ?? 0) + 1;
    if (Object.values(r.days).some((v) => (v ?? "").toUpperCase() === "DA CONFERMARE")) out.weekdaysToConfirm++;
  }
  return out;
}

/* ------------------------------------------------------------ work queue */

export type QueueTone = "urgent" | "todo" | "info";

export interface QueueItem {
  id: string;
  count: number;
  label: string;
  tone: QueueTone;
  /** Which tab of the Master the fix belongs to. */
  where: string;
}

const isoToday = (now: Date) => now.toISOString().slice(0, 10);

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * What the transport manager has to fix in the Master, most urgent first. Zero counts are dropped.
 * Expiry dates: past = urgent, within 30 days = to do, missing = to do (unknown is not "fine").
 */
export function workQueue(b: TransportBoard, now: Date = new Date()): QueueItem[] {
  const today = isoToday(now);
  const soon = addDays(today, 30);
  const vehicleDates = (v: TransportVehicle) => [v.insuranceDue, v.inspectionDue, v.roadTaxDue];
  const expired = b.vehicles.filter((v) => vehicleDates(v).some((d) => d !== null && d < today)).length;
  const expiring = b.vehicles.filter((v) => vehicleDates(v).some((d) => d !== null && d >= today && d <= soon)).length;
  const noDates = b.vehicles.filter((v) => vehicleDates(v).some((d) => d === null)).length;
  const noSeats = b.vehicles.filter((v) => v.seatsPassengers === null).length;
  const noPlate = b.vehicles.filter((v) => !v.plate).length;
  const driversToCheck = b.drivers.filter((d) => /VERIFICARE|ANAGRAFARE/i.test(d.status ?? "")).length;
  const licenceMissing = b.drivers.filter((d) => /ATTIVO/i.test(d.status ?? "") && !d.licenceDue).length;
  const licenceExpired = b.drivers.filter((d) => d.licenceDue !== null && d.licenceDue < today).length;
  const stopsToConfirm = b.stops.filter((s) => /CONFERMARE|UNIFORMARE|DEFINIRE/i.test(s.status ?? "")).length;
  const active = b.riders.filter(isActive);
  const withdrawn = active.filter((r) => WITHDRAWN.test(r.teamGroup ?? "")).length;
  const lineUnknown = active.filter((r) => /VERIFICARE/i.test(r.line ?? "") || !r.line).length;
  const stopUnknown = active.filter((r) => /CONFERMARE|UNIFORMARE|DEFINIRE|PROPOSTA/i.test(r.stopStatus ?? "")).length;
  const daysUnknown = active.filter((r) => Object.values(r.days).some((v) => (v ?? "").toUpperCase() === "DA CONFERMARE")).length;
  const items: QueueItem[] = [
    { id: "vehicle-expired", count: expired, tone: "urgent", where: "04 FLOTTA MEZZI", label: plural(expired, "pulmino con assicurazione, revisione o bollo scaduti", "pulmini con assicurazione, revisione o bollo scaduti") },
    { id: "licence-expired", count: licenceExpired, tone: "urgent", where: "05 AUTISTI", label: plural(licenceExpired, "autista con patente scaduta", "autisti con patente scaduta") },
    { id: "withdrawn-team", count: withdrawn, tone: "urgent", where: "02 UTENTI SERVIZIO", label: plural(withdrawn, "utente ancora segnato in U18, squadra ritirata", "utenti ancora segnati in U18, squadra ritirata") },
    { id: "vehicle-expiring", count: expiring, tone: "todo", where: "04 FLOTTA MEZZI", label: plural(expiring, "pulmino con una scadenza entro 30 giorni", "pulmini con una scadenza entro 30 giorni") },
    { id: "vehicle-seats", count: noSeats, tone: "todo", where: "04 FLOTTA MEZZI", label: plural(noSeats, "pulmino senza posti confermati", "pulmini senza posti confermati") },
    { id: "vehicle-dates", count: noDates, tone: "todo", where: "04 FLOTTA MEZZI", label: plural(noDates, "pulmino senza date di assicurazione, revisione o bollo", "pulmini senza date di assicurazione, revisione o bollo") },
    { id: "vehicle-plate", count: noPlate, tone: "todo", where: "04 FLOTTA MEZZI", label: plural(noPlate, "pulmino senza targa", "pulmini senza targa") },
    { id: "driver-check", count: driversToCheck, tone: "todo", where: "05 AUTISTI", label: plural(driversToCheck, "autista da verificare o da anagrafare", "autisti da verificare o da anagrafare") },
    { id: "licence-missing", count: licenceMissing, tone: "todo", where: "05 AUTISTI", label: plural(licenceMissing, "autista attivo senza scadenza patente", "autisti attivi senza scadenza patente") },
    { id: "rider-line", count: lineUnknown, tone: "todo", where: "02 UTENTI SERVIZIO", label: plural(lineUnknown, "utente senza linea assegnata", "utenti senza linea assegnata") },
    { id: "stops-confirm", count: stopsToConfirm, tone: "info", where: "11 TRATTE FERMATE", label: plural(stopsToConfirm, "fermata da confermare", "fermate da confermare") },
    { id: "rider-stop", count: stopUnknown, tone: "info", where: "02 UTENTI SERVIZIO", label: plural(stopUnknown, "utente con fermata da confermare", "utenti con fermata da confermare") },
    { id: "rider-days", count: daysUnknown, tone: "info", where: "02 UTENTI SERVIZIO", label: plural(daysUnknown, "utente con giorni di servizio da confermare", "utenti con giorni di servizio da confermare") },
  ];
  return items.filter((i) => i.count > 0);
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Live trips (not cancelled) of a calendar event, in departure order. */
export function runsForEvent(runs: readonly TransportRun[], eventId: string): TransportRun[] {
  return runs.filter((r) => r.eventId === eventId && r.status !== "ANNULLATA").sort((a, b) => a.departure.localeCompare(b.departure));
}

/** Italian message for a refusal code returned by scd_transport_plan_run. */
export function planErrorMessage(code: string | null | undefined): string {
  switch (code) {
    case "forbidden":
      return "Solo Direzione, Segreteria e responsabile trasporti possono organizzare le corse.";
    case "missing":
      return "Servono almeno data, orario di partenza e titolo della corsa.";
    case "vehicle":
      return "Il pulmino scelto non è più nella flotta: ricarica la pagina.";
    case "driver":
      return "L'autista scelto non è più in elenco: ricarica la pagina.";
    case "vehicle_busy":
      return "Quel pulmino è già su un'altra corsa nella stessa fascia oraria.";
    case "driver_busy":
      return "Quell'autista è già su un'altra corsa nella stessa fascia oraria.";
    case "not_found":
      return "La corsa non esiste più: ricarica la pagina.";
    default:
      return "Salvataggio non riuscito. Riprova tra poco.";
  }
}
