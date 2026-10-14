/**
 * Pulmini under the trainings (UD-108, Direzione 13/10/2026 17:52–17:53):
 * "devi mettere i pulmini con i ragazzi solo i nomi sotto agli allenamenti e devo sapere in ogni pulmino chi c'è
 * sempre e dove va e che percorso fa se premo sul pulmino" · "la divisione linea resta".
 *
 * Pure logic shared by the server function and the page. The four vans stay four separate units
 * (Pulmino 1 Lago, 2 Lecco, 3 Valtellina, 4 Chiavenna). A rider is put on a van by the VEHICLE written in the
 * Master Pulmini when there is one, otherwise by the exact line name (src/lib/internal-badges.ts); everything
 * else is reported as "da collocare" with its reason, never guessed.
 *
 * Privacy (fail-closed): names are produced ONLY on the server, ONLY when the database has confirmed the caller
 * may read the Pulmini board (scd_transport_board / scd_transport_rider_roster), and leave as first name +
 * surname initial (RIDER_NAME_FORMAT). The parser keeps an allowlist of fields: phones, parents, addresses,
 * stops of a single child and notes never reach the payload even if the database sends them.
 */
import { lineBadgeFor, normaliseLine, type InternalBadgeId } from "./internal-badges";
import { logoKeysFor } from "./public-snapshots";

// ── Name format (one switch for the Direzione) ───────────────────────────────────────────────────────

export type RiderNameFormat = "FIRST_NAME_SURNAME_INITIAL" | "FULL_NAME";

/**
 * How children's names are shown to the transport staff. Data minimisation: first name + surname initial
 * ("Mattia R."). The Direzione can switch to "FULL_NAME" here; nothing else changes.
 */
export const RIDER_NAME_FORMAT: RiderNameFormat = "FIRST_NAME_SURNAME_INITIAL";

function titleWord(w: string): string {
  return w
    .split(/([' -])/)
    .map((p) => (p.length > 1 || /[a-zà-ü]/i.test(p) ? p.charAt(0).toLocaleUpperCase("it-IT") + p.slice(1).toLocaleLowerCase("it-IT") : p))
    .join("");
}

function cleanName(v: unknown): string | null {
  if (typeof v !== "string") return null;
  // Letters, spaces, apostrophes and hyphens only: digits (phones, codes) or symbols drop the value.
  const t = v.replace(/\s+/g, " ").trim();
  if (!t || t.length > 40 || !/^[\p{L}][\p{L}' -]*$/u.test(t)) return null;
  return t;
}

/** "MATTIA", "ROSSI" → "Mattia R." (or "Mattia Rossi" with FULL_NAME). Null when the first name is missing or invalid. */
export function riderDisplayName(first: unknown, last: unknown, format: RiderNameFormat = RIDER_NAME_FORMAT): string | null {
  const f = cleanName(first);
  if (!f) return null;
  const l = cleanName(last);
  const firstOut = f.split(" ").map(titleWord).join(" ");
  if (!l) return firstOut;
  if (format === "FULL_NAME") return `${firstOut} ${l.split(" ").map(titleWord).join(" ")}`;
  return `${firstOut} ${l.charAt(0).toLocaleUpperCase("it-IT")}.`;
}

// ── The four vans ────────────────────────────────────────────────────────────────────────────────────

export type VanId = "p1" | "p2" | "p3" | "p4";

export interface BoardStop {
  town: string;
  place: string | null;
}

export interface VanUnit {
  id: VanId;
  number: 1 | 2 | 3 | 4;
  label: string;
  line: string;
  badge: InternalBadgeId;
  /** Normalised Master line names whose stops describe this van's route (first match wins). */
  stopLines: readonly string[];
  /** Route drawn on the club's line board 2026/27: used ONLY when the Master has no stops for the van. */
  boardRoute: readonly BoardStop[] | null;
}

export const VAN_UNITS: readonly VanUnit[] = [
  {
    id: "p1",
    number: 1,
    label: "Pulmino 1",
    line: "Lago",
    badge: "pulmino-1-lago",
    stopLines: ["LAGO", "LAGO/LECCO"],
    boardRoute: [
      { town: "Lecco", place: "Bertacchi" },
      { town: "Mandello", place: "Sacro Cuore" },
      { town: "Lierna", place: "Corotto" },
      { town: "Bonzeno", place: null },
      { town: "Bellano", place: "Stazione" },
      { town: "Dervio", place: "Cinese" },
    ],
  },
  { id: "p2", number: 2, label: "Pulmino 2", line: "Lecco", badge: "pulmino-2-lecco", stopLines: ["LECCO", "LAGO/LECCO"], boardRoute: null },
  {
    id: "p3",
    number: 3,
    label: "Pulmino 3",
    line: "Valtellina",
    badge: "pulmino-3-valtellina",
    stopLines: ["VALTELLINA"],
    boardRoute: [
      { town: "Morbegno", place: "Forestale / Stazione" },
      { town: "Cosio", place: null },
      { town: "Mantello", place: "Piazza" },
      { town: "Piantedo", place: "La Veronese" },
    ],
  },
  {
    id: "p4",
    number: 4,
    label: "Pulmino 4",
    line: "Chiavenna",
    badge: "pulmino-4-chiavenna",
    stopLines: ["NORD/VALCHIAVENNA", "VALCHIAVENNA/NORD", "VALCHIAVENNA", "CHIAVENNA"],
    boardRoute: [
      { town: "Chiavenna", place: "CRAI" },
      { town: "Prata Camporcaccio", place: null },
      { town: "Gordona", place: "Bus" },
      { town: "Samolaco", place: null },
      { town: "Somaggia", place: null },
      { town: "Novate Mezzola", place: null },
      { town: "Nuova Olonio", place: null },
    ],
  },
];

const BADGE_TO_VAN: Readonly<Record<string, VanId>> = Object.fromEntries(VAN_UNITS.map((v) => [v.badge, v.id]));

export function vanUnit(id: VanId): VanUnit {
  return VAN_UNITS.find((v) => v.id === id)!;
}

/** Passenger seats of a standard club van: 8 + the driver (the Master has no confirmed seats yet). */
export const VAN_PASSENGER_SEATS = 8;
export const DESTINATION_COLICO = "Centro Sportivo Colico";

/** "P3", "Pulmino 3", "BUS-03", "3" → "p3". Anything else → null. */
export function vanFromVehicle(vehicle: string | null | undefined): VanId | null {
  if (!vehicle) return null;
  const m = /^(?:P|PULMINO|BUS|MEZZO)?[\s._-]*0?([1-4])$/i.exec(vehicle.trim());
  return m ? (`p${m[1]}` as VanId) : null;
}

export type Placement = { van: VanId; by: "vehicle" | "line" } | { van: null; reason: string };

/** Vehicle first, then exact line name; otherwise the reason it cannot be placed. */
export function placeRider(vehicle: string | null, line: string | null): Placement {
  const byVehicle = vanFromVehicle(vehicle);
  if (byVehicle) return { van: byVehicle, by: "vehicle" };
  const badge = lineBadgeFor(line);
  const byLine = badge ? BADGE_TO_VAN[badge.id] : undefined;
  if (byLine) return { van: byLine, by: "line" };
  const l = line ? normaliseLine(line) : "";
  if (l === "LAGO/LECCO") return { van: null, reason: "Linea LAGO/LECCO unica nel Master: da dividere tra Pulmino 1 Lago e Pulmino 2 Lecco" };
  if (!l || l === "DA VERIFICARE") return { van: null, reason: "Linea da verificare nel Master" };
  return { van: null, reason: `Linea ${l} senza un pulmino delle quattro linee` };
}

// ── Riders (allowlisted) ─────────────────────────────────────────────────────────────────────────────

export const WEEKDAY_CODES = ["LUN", "MAR", "MER", "GIO", "VEN"] as const;
export type WeekdayCode = (typeof WEEKDAY_CODES)[number];
export const QUADRO_DAY_CODE: Readonly<Record<string, WeekdayCode>> = { "LUNEDÌ": "LUN", "MARTEDÌ": "MAR", "MERCOLEDÌ": "MER", "GIOVEDÌ": "GIO", "VENERDÌ": "VEN" };
export const DAY_LABEL: Readonly<Record<WeekdayCode, string>> = { LUN: "Lun", MAR: "Mar", MER: "Mer", GIO: "Gio", VEN: "Ven" };

/** yes = confirmed, ask = asked but "DA CONFERMARE" in the Master, no = not on board. */
export type RideFlag = "yes" | "ask" | "no";

export function rideFlag(v: unknown): RideFlag {
  if (typeof v !== "string") return "no";
  const t = v.trim().toUpperCase();
  if (!t || t === "NO" || t === "-" || t === "—" || t === "N") return "no";
  if (/DA\s+CONFERM|PROVVISOR|DA\s+FORMALIZZ|\?/.test(t)) return "ask";
  return "yes";
}

/** One rider as it may leave the server: no codes, no phones, no stops, no notes. */
export interface PlanRider {
  /** Opaque per-response key (r1, r2…): not the Master code. */
  key: string;
  /** Display name (RIDER_NAME_FORMAT) or null when names are not available to this session. */
  name: string | null;
  /** Team group as in the Master ("U15 2012-2013"). */
  team: string;
  /** Provisional / to formalise riders are flagged; inactive riders never reach the plan. */
  provisional: boolean;
  days: Record<WeekdayCode, { out: RideFlag; back: RideFlag }>;
  /** Van written in the Master for this rider (MEZZO / PULMINO column) — never inferred from the line. */
  assigned: VanId | null;
  /** Fixed seat written in the Master ("1".."8"), when present. */
  seat: string | null;
  /** Where the rider gets on (andata) / off (ritorno): ONLY a registered stop of the van's route, never free text. */
  up: RouteStop | null;
  down: RouteStop | null;
  /** ok = stop found on the route; missing = no stop in the Master; unmatched = text not among the route's stops. */
  stopIssue: { out: StopIssue; back: StopIssue };
}

export type StopIssue = "ok" | "missing" | "unmatched";

/** Shape read from the database (scd_transport_board riders or scd_transport_rider_roster). Extra keys are ignored. */
export interface RawRider {
  teamGroup?: unknown;
  serviceStatus?: unknown;
  line?: unknown;
  vehicle?: unknown;
  days?: unknown;
  firstName?: unknown;
  lastName?: unknown;
  /** Stop text of the Master: read only to match a registered stop; the text itself never leaves. */
  stopOut?: unknown;
  stopBack?: unknown;
  /** Fixed seat of the Master, when the copy carries it. */
  seat?: unknown;
}

function str(v: unknown, max = 80): string | null {
  if (typeof v !== "string") return null;
  const t = v.replace(/\s+/g, " ").trim();
  return t ? t.slice(0, max) : null;
}

export function isInactive(status: unknown): boolean {
  return (str(status) ?? "").toUpperCase() === "NON ATTIVO";
}

// ── Training slots ───────────────────────────────────────────────────────────────────────────────────

export interface SlotInput {
  day: string;
  start: number;
  timeLabel: string;
  /** Teams on the pitches (C1 + C2 of the quadro), free text. */
  teams: string;
  /** Pulmini service rule for this slot (member-services trainingServiceFor). */
  served: "yes" | "no" | "unknown";
}

/** Team keys of a free text ("Under 13" → U13, "U11 2016/2017" → PULCINI). */
export function teamKeys(text: string): string[] {
  const t = text.replace(/under\s*(\d{2})/gi, "U$1");
  return logoKeysFor(t);
}

export interface SlotVan {
  van: VanId;
  out: PlanRider[];
  back: PlanRider[];
  /** More riders than passenger seats in one direction. */
  overCapacity: boolean;
}

export interface Unplaced {
  reason: string;
  riders: PlanRider[];
}

export interface PlanSlot {
  day: string;
  start: number;
  timeLabel: string;
  served: "yes" | "no" | "unknown";
  /** True when a youth team trains in the slot (only those can have riders: the first team has no service). */
  youth: boolean;
  vans: SlotVan[];
  unplaced: Unplaced[];
  /** Riders whose team trains in a slot where the service is not provided (UD-051): counted, not placed. */
  notServed: number;
}

export interface RouteStop {
  town: string;
  place: string | null;
  eta: string | null;
}

export interface VanRoute {
  stops: RouteStop[];
  source: "master" | "board" | "none";
  /** Shown under the route: where it comes from and what is still to confirm. */
  note: string;
}

export interface VanDetail {
  id: VanId;
  label: string;
  line: string;
  badge: InternalBadgeId;
  destination: string;
  seats: number;
  route: VanRoute;
  /** Riders of this van across the week, with their days (who is always on board). */
  regulars: PlanRider[];
  /** Users registered on this van's line in the Master (counts only, for sessions without names). */
  lineUsers: number | null;
  /** True when lineUsers counts the combined LAGO/LECCO line shared by Pulmino 1 and 2. */
  lineShared: boolean;
}

export type PlanMode = "names" | "no-names" | "locked";

export interface VanPlan {
  mode: PlanMode;
  /** Why names are not shown (null in "names" mode). */
  namesNote: string | null;
  /** Last copy of the Master (ISO) when known. */
  asOf: string | null;
  slots: PlanSlot[];
  vans: VanDetail[];
  /** Weekly riders that cannot be put on any of the four vans, by reason (counts, and names in "names" mode). */
  unplaced: Unplaced[];
  counts: { active: number; placed: number; unplaced: number };
}

export interface RawStop {
  line?: unknown;
  position?: unknown;
  town?: unknown;
  place?: unknown;
  eta?: unknown;
}

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export function vanRoute(unit: VanUnit, stops: readonly RawStop[] | null): VanRoute {
  if (stops) {
    for (const lineName of unit.stopLines) {
      const own = stops
        .filter((s) => normaliseLine(str(s.line) ?? "") === lineName)
        .sort((a, b) => (typeof a.position === "number" ? a.position : 9999) - (typeof b.position === "number" ? b.position : 9999))
        .map((s) => {
          const eta = str(s.eta, 5);
          return { town: titleWord(str(s.town) ?? "—"), place: str(s.place, 120), eta: eta && HHMM.test(eta) ? eta : null };
        });
      if (own.length) {
        const shared = lineName === "LAGO/LECCO";
        const timed = own.some((s) => s.eta);
        return {
          stops: own,
          source: "master",
          note: `Fermate dal Master Pulmini${shared ? " (linea comune LAGO/LECCO: la divisione tra Pulmino 1 e 2 è da definire)" : ""}.${timed ? "" : " Orari non ancora nel Master."}`,
        };
      }
    }
  }
  if (unit.boardRoute) {
    return {
      stops: unit.boardRoute.map((s) => ({ ...s, eta: null })),
      source: "board",
      note: "Percorso dalla tavola linee 2026/27, da confermare. Orari non disponibili.",
    };
  }
  return { stops: [], source: "none", note: "Percorso non ancora nel Master né nella tavola linee." };
}

function stopKey(v: string): string {
  return v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

const hasWord = (hay: string, needle: string) => needle !== "" && ` ${hay} `.includes(` ${needle} `);

/**
 * Matches the stop text of a rider to ONE registered stop of the route. Exact "town place" or place first,
 * then the town alone when only one stop of the route is in that town. Anything else is "unmatched":
 * the raw text (it may be a home address) is never returned.
 */
export function matchStop(text: unknown, stops: readonly RouteStop[]): { stop: RouteStop | null; issue: StopIssue } {
  const t = typeof text === "string" ? stopKey(text) : "";
  if (!t || t === "DA DEFINIRE" || t === "DA CONFERMARE" || t === "NO") return { stop: null, issue: "missing" };
  const keyed = stops.map((s) => ({ s, town: stopKey(s.town), place: s.place ? stopKey(s.place) : "" }));
  const exact = keyed.filter((k) => t === `${k.town} ${k.place}`.trim() || (k.place !== "" && t === k.place));
  if (exact.length === 1) return { stop: exact[0]!.s, issue: "ok" };
  const both = keyed.filter((k) => hasWord(t, k.town) && k.place !== "" && hasWord(t, k.place));
  if (both.length === 1) return { stop: both[0]!.s, issue: "ok" };
  const town = keyed.filter((k) => hasWord(t, k.town));
  if (town.length === 1) return { stop: town[0]!.s, issue: "ok" };
  return { stop: null, issue: "unmatched" };
}

function seatOf(v: unknown): string | null {
  const t = typeof v === "number" && Number.isInteger(v) ? String(v) : typeof v === "string" ? v.trim() : "";
  return /^[1-9]\d?$/.test(t) ? t : null;
}

export interface BuildInput {
  /** Riders as read from the database; null when this session may not read them. */
  riders: readonly RawRider[] | null;
  /** True only when the database confirmed the caller may see names AND names came with the roster. */
  withNames: boolean;
  stops: readonly RawStop[] | null;
  slots: readonly SlotInput[];
  asOf: string | null;
  /** Counts by line from the Master snapshot, for sessions without rider rows. */
  lineCounts?: Readonly<Record<string, number>>;
  namesNote?: string | null;
}

function lineUsersFor(unit: VanUnit, counts: Readonly<Record<string, number>> | undefined): { n: number | null; shared: boolean } {
  if (!counts) return { n: null, shared: false };
  let n = 0;
  let hit = false;
  let shared = 0;
  for (const [line, c] of Object.entries(counts)) {
    const p = placeRider(null, line);
    if (p.van === unit.id) {
      n += c;
      hit = true;
    } else if (normaliseLine(line) === "LAGO/LECCO" && unit.stopLines.includes("LAGO/LECCO")) shared += c;
  }
  if (hit) return { n, shared: false };
  return shared > 0 ? { n: shared, shared: true } : { n: null, shared: false };
}

function groupUnplaced(list: Array<{ reason: string; rider: PlanRider }>): Unplaced[] {
  const by = new Map<string, PlanRider[]>();
  for (const { reason, rider } of list) by.set(reason, [...(by.get(reason) ?? []), rider]);
  return [...by.entries()].map(([reason, riders]) => ({ reason, riders })).sort((a, b) => b.riders.length - a.riders.length);
}

const byName = (a: PlanRider, b: PlanRider) => (a.name ?? a.team).localeCompare(b.name ?? b.team, "it") || a.team.localeCompare(b.team, "it");

/** The whole plan: per slot, the vans with who goes and who comes back; per van, route and regular riders. */
export function buildVanPlan(input: BuildInput): VanPlan {
  const mode: PlanMode = input.riders === null ? "locked" : input.withNames ? "names" : "no-names";
  type Placed = { rider: PlanRider; teamKeys: string[]; placement: Placement };
  const placed: Placed[] = [];
  const routes = new Map<VanId, VanRoute>(VAN_UNITS.map((u) => [u.id, vanRoute(u, input.stops)]));
  let i = 0;
  for (const r of input.riders ?? []) {
    if (isInactive(r.serviceStatus)) continue;
    const team = str(r.teamGroup, 60) ?? "Squadra da verificare";
    const daysRaw = r.days && typeof r.days === "object" && !Array.isArray(r.days) ? (r.days as Record<string, unknown>) : {};
    const days = Object.fromEntries(WEEKDAY_CODES.map((d) => [d, { out: rideFlag(daysRaw[`${d}_A`]), back: rideFlag(daysRaw[`${d}_R`]) }])) as PlanRider["days"];
    const status = (str(r.serviceStatus) ?? "").toUpperCase();
    i += 1;
    const placement = placeRider(str(r.vehicle, 20), str(r.line));
    const routeStops = placement.van ? routes.get(placement.van)!.stops : [];
    const up = matchStop(r.stopOut, routeStops);
    const down = matchStop(r.stopBack, routeStops);
    placed.push({
      rider: {
        key: `r${i}`,
        name: mode === "names" ? riderDisplayName(r.firstName, r.lastName) : null,
        team,
        provisional: status !== "" && status !== "ATTIVO",
        days,
        assigned: placement.van !== null && placement.by === "vehicle" ? placement.van : null,
        seat: placement.van !== null && placement.by === "vehicle" ? seatOf(r.seat) : null,
        up: up.stop,
        down: down.stop,
        stopIssue: { out: up.issue, back: down.issue },
      },
      teamKeys: teamKeys(team),
      placement,
    });
  }

  const slots: PlanSlot[] = input.slots.map((s) => {
    const day = QUADRO_DAY_CODE[s.day];
    const keys = new Set(teamKeys(s.teams));
    const youth = [...keys].some((k) => k !== "PRIMA");
    const here = day ? placed.filter((p) => p.teamKeys.some((k) => keys.has(k))) : [];
    const riding = here.filter((p) => p.rider.days[day!].out !== "no" || p.rider.days[day!].back !== "no");
    if (s.served === "no") return { day: s.day, start: s.start, timeLabel: s.timeLabel, served: s.served, youth, vans: [], unplaced: [], notServed: riding.length };
    const vans: SlotVan[] = [];
    for (const unit of VAN_UNITS) {
      const mine = riding.filter((p) => p.placement.van === unit.id);
      if (!mine.length) continue;
      const out = mine.filter((p) => p.rider.days[day!].out !== "no").map((p) => p.rider).sort(byName);
      const back = mine.filter((p) => p.rider.days[day!].back !== "no").map((p) => p.rider).sort(byName);
      vans.push({ van: unit.id, out, back, overCapacity: out.length > VAN_PASSENGER_SEATS || back.length > VAN_PASSENGER_SEATS });
    }
    const unplaced = groupUnplaced(
      riding.flatMap((p) => (p.placement.van === null ? [{ reason: p.placement.reason, rider: p.rider }] : [])).sort((a, b) => byName(a.rider, b.rider)),
    );
    return { day: s.day, start: s.start, timeLabel: s.timeLabel, served: s.served, youth, vans, unplaced, notServed: 0 };
  });

  const vans: VanDetail[] = VAN_UNITS.map((unit) => ({
    id: unit.id,
    label: unit.label,
    line: unit.line,
    badge: unit.badge,
    destination: DESTINATION_COLICO,
    seats: VAN_PASSENGER_SEATS,
    route: routes.get(unit.id)!,
    regulars: placed
      .filter((p) => p.placement.van === unit.id && WEEKDAY_CODES.some((d) => p.rider.days[d].out !== "no" || p.rider.days[d].back !== "no"))
      .map((p) => p.rider)
      .sort(byName),
    lineUsers: lineUsersFor(unit, input.lineCounts).n,
    lineShared: lineUsersFor(unit, input.lineCounts).shared,
  }));

  const unplaced = groupUnplaced(placed.flatMap((p) => (p.placement.van === null ? [{ reason: p.placement.reason, rider: p.rider }] : [])));
  const placedCount = placed.filter((p) => p.placement.van !== null).length;
  return {
    mode,
    namesNote: mode === "names" ? null : (input.namesNote ?? null),
    asOf: input.asOf,
    slots,
    vans,
    unplaced,
    counts: { active: placed.length, placed: placedCount, unplaced: placed.length - placedCount },
  };
}

/** Riders grouped by team for a session without names ("U12 2015" → 3). */
export function teamCounts(riders: readonly PlanRider[]): Array<[string, number]> {
  const m = new Map<string, number>();
  for (const r of riders) m.set(r.team, (m.get(r.team) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "it"));
}

/** Short team label: "U15 2012-2013" → "U15", "PULCINI 2016-2017" → "Pulcini". */
export function shortTeam(team: string): string {
  const t = team.replace(/\s+\d{4}(?:[-/]\d{2,4})?$/, "").trim();
  return /^U\d{2}/i.test(t) ? t.split(" ")[0]!.toUpperCase() : t.split(" ").map(titleWord).join(" ");
}

/** Every string value of a payload (for privacy tests and guards). */
export function payloadStrings(v: unknown, out: string[] = []): string[] {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) for (const x of v) payloadStrings(x, out);
  else if (v && typeof v === "object") for (const x of Object.values(v)) payloadStrings(x, out);
  return out;
}

/** Italian phone shapes (mobile, landline, +39): never allowed in the van payload. */
export const PHONE_PATTERN = /(?:\+?39[\s.-]?)?(?:3\d{2}|0\d{1,3})[\s.-]?\d{3}[\s.-]?\d{3,4}/;
