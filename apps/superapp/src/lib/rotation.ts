/**
 * Field rotation engine (`/calendario/rotazione-campi`).
 *
 * Pure functions, no React: turns the home matches of the Master Calendario
 * snapshot into per-pitch occupancy, detects over-capacity on each pitch and
 * simulates scenarios that move youth 11v11 home matches from Colico to Dervio.
 *
 * Everything here is a SIMULATION: no match is moved for real. On 2026-10-11
 * the club decided to evaluate rotations with simulations before any notice to
 * the Comune di Dervio. Team names only, never names of minors.
 *
 * Board sources: Visual Master VR-022 `Rotazione-campi.dc.html`, `Rotazione-Dervio.dc.html`.
 */

export type MatchFormat = 11 | 9 | 7 | 5 | 3;
export type PitchId = "C1" | "C2" | "DV";
export type MovableGroup = "u15" | "u16" | "u19";
export type TeamMode = "colico" | "dervio" | "alternate";
/** Kind of pitch use: a calendar match or a hypothetical booking ("ipotesi"). */
export type BookingKind =
  "allenamento" | "gara" | "torneo" | "affitto" | "manutenzione";
export type ItemKind = "match" | BookingKind;
/** A match format, or the whole pitch (tournaments, closures, rentals). */
export type PitchFormat = MatchFormat | "full";

/** Format by calendar group. Unknown groups return null (never guessed). */
export const GROUP_FORMAT: Readonly<Record<string, MatchFormat>> = {
  prima: 11,
  u19: 11,
  u16: 11,
  u15: 11,
  "2014": 9,
  "2015": 9,
  esordienti: 9,
  pulcini: 7,
  primicalci: 5,
  piccoli: 3,
};

/** Team names shown in the UI (team names only). */
export const GROUP_LABEL: Readonly<Record<string, string>> = {
  prima: "Prima Squadra",
  u19: "Juniores U19",
  u16: "U16 Élite",
  u15: "U15",
  "2014": "Esordienti 2014",
  "2015": "Esordienti 2015",
  esordienti: "Esordienti",
  pulcini: "Pulcini",
  primicalci: "Primi Calci",
  piccoli: "Piccoli Amici",
};

/** Short tags (board "E14 + U19"). */
export const GROUP_SHORT: Readonly<Record<string, string>> = {
  prima: "1ª",
  u19: "U19",
  u16: "U16",
  u15: "U15",
  "2014": "E14",
  "2015": "E15",
  esordienti: "ES",
  pulcini: "PUL",
  primicalci: "PC",
  piccoli: "PA",
};

/** Default match length (minutes) when the calendar gives no end time. */
export const DEFAULT_DURATION: Readonly<Record<MatchFormat, number>> = {
  11: 105,
  9: 75,
  7: 60,
  5: 60,
  3: 45,
};

export const DEFAULT_BUFFER_MIN = 15;
export const DEFAULT_START_DATE = "2026-11-15";
export const DEFAULT_MAX_DERVIO_PER_DAY = 2;
/** The Comune di Dervio wants the notice at least one month before. */
export const NOTICE_DAYS = 30;
/** Matches ending after this minute need lights at Dervio (17:00). */
export const LIGHTS_AFTER_MIN = 17 * 60;

export interface PitchInfo {
  id: PitchId;
  site: "Colico" | "Dervio";
  name: string;
  surface: string;
  size: string | null;
  /** Site id in the master "16 - SEDI E IMPIANTI". */
  siteId: "SED-COL" | "SED-DER";
  /** Space id in the master "16 - SEDI E IMPIANTI" (sheet SPAZI). */
  spaceId: string;
}

export const PITCHES: Readonly<Record<PitchId, PitchInfo>> = {
  C1: {
    id: "C1",
    site: "Colico",
    name: "Campo 1",
    surface: "sintetico",
    size: "100 × 60 m",
    siteId: "SED-COL",
    spaceId: "SPA-COL-C1",
  },
  C2: {
    id: "C2",
    site: "Colico",
    name: "Campo 2",
    surface: "sintetico",
    size: "96 × 48 m",
    siteId: "SED-COL",
    spaceId: "SPA-COL-C2",
  },
  DV: {
    id: "DV",
    site: "Dervio",
    name: "Campo 1",
    surface: "erba naturale",
    size: "96 × 48 m",
    siteId: "SED-DER",
    spaceId: "SPA-DER-C1",
  },
};

/**
 * Share of the pitch one match takes. Colico campo 2 is synthetic 96 × 48 m
 * (VERIFIED, master "16 - SEDI E IMPIANTI", sheet SPAZI): same capacity as
 * Dervio campo 1. `null` would mean a format not allowed on that pitch.
 */
export const PITCH_UNITS: Readonly<
  Record<PitchId, Readonly<Record<MatchFormat, number | null>>>
> = {
  C1: { 11: 1, 9: 1 / 2, 7: 1 / 2, 5: 1 / 3, 3: 1 / 4 },
  C2: { 11: 1, 9: 1, 7: 1 / 2, 5: 1 / 3, 3: 1 / 4 },
  DV: { 11: 1, 9: 1, 7: 1 / 2, 5: 1 / 3, 3: 1 / 4 },
};

/** Capacity entries still to verify on real measures (96 × 48: 11v11 on Colico C2, 9v9 on Dervio). */
export function unitsToVerify(pitch: PitchId, format: PitchFormat): boolean {
  if (format === "full") return false;
  if (pitch === "C2") return format === 11;
  if (pitch === "DV") return format === 9;
  return false;
}

/** Units used by a match on a pitch; formats not allowed count as a full pitch. */
export function pitchUnits(pitch: PitchId, format: PitchFormat): number {
  if (format === "full") return 1;
  return PITCH_UNITS[pitch][format] ?? 1;
}

export interface RotationMatch {
  id: string;
  /** ISO day yyyy-mm-dd. */
  date: string;
  /** Start in minutes from midnight. */
  start: number;
  /** End in minutes from midnight (calendar end, or default duration). */
  end: number;
  endKnown: boolean;
  group: string;
  label: string;
  short: string;
  format: PitchFormat;
  opponent: string;
  /** "match" for calendar matches; the booking kind for hypothetical bookings. */
  kind: ItemKind;
  /** Pitch in the calendar. */
  homePitch: PitchId;
  /** Pitch in the current scenario. */
  pitch: PitchId;
  moved: boolean;
}

/** Shape of the events we read from `calendario-snapshot-*.json`. */
export interface SnapshotEvent {
  id: string;
  date: string;
  time: string;
  end?: string | null;
  group: string;
  venue: string;
  opponent?: string | null;
  home_away?: string;
}

export const toMinutes = (t: string): number | null => {
  const m = /^(\d{1,2}):(\d{2})$/.exec((t ?? "").trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
};

export const hhmm = (min: number): string =>
  `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

/** Home pitch from the snapshot venue: "COLICO - CAMPO 1" / "COLICO - CAMPO 2". */
export function homePitchOf(venue: string): PitchId | null {
  const v = (venue ?? "").trim().toUpperCase();
  if (v.startsWith("COLICO - CAMPO 1")) return "C1";
  if (v.startsWith("COLICO - CAMPO 2")) return "C2";
  return null;
}

/**
 * Home matches of the snapshot as rotation matches, sorted by day and time.
 * Events with an unknown format, no start time or not at Colico are left out.
 */
export function homeMatches(events: readonly SnapshotEvent[]): RotationMatch[] {
  const out: RotationMatch[] = [];
  for (const e of events) {
    const pitch = homePitchOf(e.venue);
    const format = GROUP_FORMAT[e.group];
    const start = toMinutes(e.time);
    if (
      !pitch ||
      !format ||
      start === null ||
      !/^\d{4}-\d{2}-\d{2}$/.test(e.date)
    )
      continue;
    const endRaw = e.end ? toMinutes(e.end) : null;
    const endKnown = endRaw !== null && endRaw > start;
    out.push({
      id: e.id,
      date: e.date,
      start,
      end: endKnown ? (endRaw as number) : start + DEFAULT_DURATION[format],
      endKnown,
      group: e.group,
      label: GROUP_LABEL[e.group] ?? e.group,
      short: GROUP_SHORT[e.group] ?? e.group.toUpperCase(),
      format,
      opponent: (e.opponent ?? "").trim(),
      kind: "match",
      homePitch: pitch,
      pitch,
      moved: false,
    });
  }
  return out.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      a.start - b.start ||
      a.id.localeCompare(b.id),
  );
}

/** Pitch load at one instant (minutes), including the changeover buffer after each match. */
export function loadAt(
  matches: readonly RotationMatch[],
  pitch: PitchId,
  minute: number,
  buffer: number,
): { load: number; active: RotationMatch[] } {
  const active = matches.filter(
    (m) => m.pitch === pitch && m.start <= minute && minute < m.end + buffer,
  );
  return {
    load: active.reduce((acc, m) => acc + pitchUnits(pitch, m.format), 0),
    active,
  };
}

export interface OverlapResult {
  /** Ids of matches involved in an over-capacity instant. */
  ids: Set<string>;
  /** Highest load seen (1 = pitch full). */
  peak: number;
}

const EPS = 1e-9;

/** Over-capacity on one pitch for the matches of ONE day (load > 1 at any instant, buffer included). */
export function overlaps(
  dayMatches: readonly RotationMatch[],
  pitch: PitchId,
  buffer: number,
): OverlapResult {
  const ids = new Set<string>();
  let peak = 0;
  // With half-open intervals the load can only rise at a start: checking every start is exhaustive.
  for (const p of new Set(
    dayMatches.filter((m) => m.pitch === pitch).map((m) => m.start),
  )) {
    const { load, active } = loadAt(dayMatches, pitch, p, buffer);
    peak = Math.max(peak, load);
    if (load > 1 + EPS) for (const m of active) ids.add(m.id);
  }
  return { ids, peak };
}

export function groupByDay<T extends { date: string }>(
  list: readonly T[],
): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const m of list) {
    const arr = out.get(m.date);
    if (arr) arr.push(m);
    else out.set(m.date, [m]);
  }
  return out;
}

export const MOVABLE: readonly MovableGroup[] = ["u15", "u16", "u19"];

export interface ScenarioOptions {
  modes: Readonly<Record<MovableGroup, TeamMode>>;
  /** Move to Dervio only the youth 11v11 match that causes a Colico campo 1 overlap. */
  auto: boolean;
  /** Dervio can host matches only from this ISO date. */
  startDate: string;
  buffer: number;
  maxDervioPerDay: number;
  /** Natural grass: no Dervio matches December–February. */
  dervioClosedInWinter: boolean;
}

export const DEFAULT_OPTIONS: ScenarioOptions = {
  modes: { u15: "colico", u16: "colico", u19: "colico" },
  auto: false,
  startDate: DEFAULT_START_DATE,
  buffer: DEFAULT_BUFFER_MIN,
  maxDervioPerDay: DEFAULT_MAX_DERVIO_PER_DAY,
  dervioClosedInWinter: false,
};

export const isWinterDay = (iso: string): boolean => {
  const m = Number(iso.slice(5, 7));
  return m === 12 || m === 1 || m === 2;
};

const isMovable = (g: string): g is MovableGroup =>
  (MOVABLE as readonly string[]).includes(g);

/** Can this match be played at Dervio under the options? Prima Squadra always stays at Colico. */
export function dervioAllowed(
  m: RotationMatch,
  opts: Pick<ScenarioOptions, "startDate" | "dervioClosedInWinter">,
): boolean {
  if (!isMovable(m.group) || m.homePitch !== "C1") return false;
  if (m.date < opts.startDate) return false;
  if (opts.dervioClosedInWinter && isWinterDay(m.date)) return false;
  return true;
}

/**
 * Applies a scenario to fresh copies of the matches (input is never mutated).
 * 1. Per-team modes: "dervio" moves every allowed home match, "alternate" moves
 *    the 1st, 3rd, 5th… allowed home match from the start date.
 * 2. "auto": per day, while Colico campo 1 is over capacity, moves the
 *    conflicting youth 11v11 match (priority U15, U16, U19) only if it creates
 *    no overlap at Dervio and the day stays within the max matches at Dervio.
 */
export function simulate(
  matches: readonly RotationMatch[],
  opts: ScenarioOptions,
): RotationMatch[] {
  const list = matches
    .map((m) => ({ ...m, pitch: m.homePitch, moved: false }))
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        a.start - b.start ||
        a.id.localeCompare(b.id),
    );
  const counter: Record<string, number> = {};
  for (const m of list) {
    if (!dervioAllowed(m, opts) || !isMovable(m.group)) continue;
    const mode = opts.modes[m.group] ?? "colico";
    counter[m.group] = (counter[m.group] ?? 0) + 1;
    if (
      mode === "dervio" ||
      (mode === "alternate" && counter[m.group]! % 2 === 1)
    ) {
      m.pitch = "DV";
      m.moved = true;
    }
  }
  if (opts.auto) {
    for (const day of groupByDay(list).values()) {
      for (let guard = 0; guard < 8; guard++) {
        const { ids } = overlaps(day, "C1", opts.buffer);
        if (!ids.size) break;
        if (day.filter((m) => m.pitch === "DV").length >= opts.maxDervioPerDay)
          break;
        const candidates = day
          .filter(
            (m) => ids.has(m.id) && m.pitch === "C1" && dervioAllowed(m, opts),
          )
          .sort(
            (a, b) =>
              MOVABLE.indexOf(a.group as MovableGroup) -
                MOVABLE.indexOf(b.group as MovableGroup) || a.start - b.start,
          );
        const pick = candidates.find((c) => {
          c.pitch = "DV";
          const ok = overlaps(day, "DV", opts.buffer).ids.size === 0;
          c.pitch = "C1";
          return ok;
        });
        if (!pick) break;
        pick.pitch = "DV";
        pick.moved = true;
      }
    }
  }
  return list;
}

export const minusDays = (iso: string, n: number): string => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
};

export const daysBetween = (fromIso: string, toIso: string): number =>
  Math.round(
    (Date.parse(`${toIso}T12:00:00Z`) - Date.parse(`${fromIso}T12:00:00Z`)) /
      86_400_000,
  );

export type IssueCode =
  | "c1-overlap-before"
  | "c1-overlap"
  | "c2-format"
  | "c2-overlap"
  | "dv-overlap"
  | "dv-too-many"
  | "dv-lights"
  | "dv-winter"
  | "dv-notice-late"
  | "booking-conflict";

export interface Issue {
  code: IssueCode;
  severity: "crit" | "warn";
  text: string;
  matchId?: string;
}

export interface DervioMatch {
  match: RotationMatch;
  /** Last day for the notice to the Comune (30 days before). */
  noticeBy: string;
  /** Notice deadline already passed compared with today. */
  late: boolean;
  /** Days from today to the notice deadline (negative = late). */
  daysToNotice: number;
  needsLights: boolean;
  winterGrass: boolean;
}

export interface DayReport {
  date: string;
  matches: RotationMatch[];
  issues: Issue[];
  over: Record<PitchId, Set<string>>;
  peakC1: number;
}

export interface Analysis {
  days: DayReport[];
  /** Days with over-capacity on Colico campo 1. */
  conflictDays: string[];
  conflictDaysBefore: string[];
  conflictDaysAfter: string[];
  dervio: DervioMatch[];
  lateNotices: number;
  firstNotice: string | null;
  lightsNeeded: number;
  winterGrass: number;
  c2FormatDays: string[];
  dervioOverlapDays: string[];
  dervioTooManyDays: string[];
  /** Ids of hypothetical bookings that do not fit. */
  bookingConflicts: string[];
}

export interface AnalyseOptions {
  /** ISO date of today (Europe/Rome). */
  today: string;
  startDate: string;
  buffer: number;
  maxDervioPerDay: number;
  lightsVerified: boolean;
}

const shortDate = (iso: string) =>
  `${Number(iso.slice(8, 10))}/${Number(iso.slice(5, 7))}`;

export function analyse(
  simulated: readonly RotationMatch[],
  opts: AnalyseOptions,
): Analysis {
  const res: Analysis = {
    days: [],
    conflictDays: [],
    conflictDaysBefore: [],
    conflictDaysAfter: [],
    dervio: [],
    lateNotices: 0,
    firstNotice: null,
    lightsNeeded: 0,
    winterGrass: 0,
    c2FormatDays: [],
    dervioOverlapDays: [],
    dervioTooManyDays: [],
    bookingConflicts: [],
  };
  const byDay = [...groupByDay(simulated).entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  );
  for (const [date, raw] of byDay) {
    const matches = [...raw].sort((a, b) => a.start - b.start);
    const o1 = overlaps(matches, "C1", opts.buffer);
    const o2 = overlaps(matches, "C2", opts.buffer);
    const od = overlaps(matches, "DV", opts.buffer);
    const issues: Issue[] = [];
    if (o1.ids.size) {
      res.conflictDays.push(date);
      if (date < opts.startDate) {
        res.conflictDaysBefore.push(date);
        issues.push({
          code: "c1-overlap-before",
          severity: "crit",
          text: "Sovrapposto sul campo 1 prima della data Dervio: si risolve solo con gli orari",
        });
      } else {
        res.conflictDaysAfter.push(date);
        issues.push({
          code: "c1-overlap",
          severity: "crit",
          text: "Sovrapposto sul campo 1 di Colico",
        });
      }
    }
    const c2Big = matches.filter(
      (m) => m.pitch === "C2" && unitsToVerify("C2", m.format),
    );
    if (c2Big.length) {
      res.c2FormatDays.push(date);
      for (const m of c2Big)
        issues.push({
          code: "c2-format",
          severity: "warn",
          text: `${m.label}: gara a ${m.format} sul campo 2 (96 × 48): misure da verificare per l'11`,
          matchId: m.id,
        });
    } else if (o2.ids.size) {
      issues.push({
        code: "c2-overlap",
        severity: "warn",
        text: "Campo 2 oltre la capienza",
      });
    }
    for (const m of matches) {
      if (m.kind === "match") continue;
      if (o1.ids.has(m.id) || o2.ids.has(m.id) || od.ids.has(m.id)) {
        res.bookingConflicts.push(m.id);
        issues.push({
          code: "booking-conflict",
          severity: "crit",
          text: `Ipotesi "${m.label}" alle ${hhmm(m.start)}: il campo non basta`,
          matchId: m.id,
        });
      }
    }
    const dv = matches.filter((m) => m.pitch === "DV");
    const dvMatches = dv.filter((m) => m.kind === "match");
    if (od.ids.size) {
      res.dervioOverlapDays.push(date);
      issues.push({
        code: "dv-overlap",
        severity: "crit",
        text: "Sovrapposto a Dervio",
      });
    }
    if (dvMatches.length > opts.maxDervioPerDay) {
      res.dervioTooManyDays.push(date);
      issues.push({
        code: "dv-too-many",
        severity: "warn",
        text: `${dvMatches.length} gare a Dervio nello stesso giorno`,
      });
    }
    for (const m of dv) {
      const noticeBy = minusDays(m.date, NOTICE_DAYS);
      const late = noticeBy < opts.today;
      const needsLights = !opts.lightsVerified && m.end > LIGHTS_AFTER_MIN;
      const winterGrass = isWinterDay(m.date);
      res.dervio.push({
        match: m,
        noticeBy,
        late,
        daysToNotice: daysBetween(opts.today, noticeBy),
        needsLights,
        winterGrass,
      });
      if (late) {
        res.lateNotices++;
        issues.push({
          code: "dv-notice-late",
          severity: "crit",
          text: `${m.label}: avviso al Comune per il ${shortDate(m.date)} già oltre il mese`,
          matchId: m.id,
        });
      }
      if (needsLights) {
        res.lightsNeeded++;
        issues.push({
          code: "dv-lights",
          severity: "warn",
          text: `${m.label} a Dervio fino alle ${hhmm(m.end)}: luci da verificare`,
          matchId: m.id,
        });
      }
      if (winterGrass) {
        res.winterGrass++;
        issues.push({
          code: "dv-winter",
          severity: "warn",
          text: `${m.label} su erba in inverno: controllo del fondo`,
          matchId: m.id,
        });
      }
    }
    res.days.push({
      date,
      matches,
      issues,
      over: { C1: o1.ids, C2: o2.ids, DV: od.ids },
      peakC1: o1.peak,
    });
  }
  res.firstNotice = res.dervio.map((d) => d.noticeBy).sort()[0] ?? null;
  return res;
}

/* ------------------------------------------------------------------ */
/* Hypothetical bookings ("ipotesi"): browser-only, never saved        */
/* ------------------------------------------------------------------ */

export interface Booking {
  id: string;
  kind: BookingKind;
  pitch: PitchId;
  /** ISO yyyy-mm-dd. */
  date: string;
  /** "HH:MM". */
  start: string;
  /** Minutes. */
  duration: number;
  format: PitchFormat;
  /** Free text: team, event or external renter name (an organisation, never personal data). */
  title: string;
  /** Colico changing rooms the booking would use (master "16 - SEDI E IMPIANTI"). */
  rooms?: readonly RoomId[];
}

/** Colico changing rooms: SPA-COL-SP1..SP4 and the dedicated referees' room SPA-COL-ARB. */
export type RoomId = "SP1" | "SP2" | "SP3" | "SP4" | "ARB";
export const ROOMS: readonly { id: RoomId; label: string; spaceId: string }[] =
  [
    { id: "SP1", label: "SP1", spaceId: "SPA-COL-SP1" },
    { id: "SP2", label: "SP2", spaceId: "SPA-COL-SP2" },
    { id: "SP3", label: "SP3", spaceId: "SPA-COL-SP3" },
    { id: "SP4", label: "SP4", spaceId: "SPA-COL-SP4" },
    { id: "ARB", label: "Arbitri", spaceId: "SPA-COL-ARB" },
  ];

export const BOOKING_KIND_LABEL: Readonly<Record<BookingKind, string>> = {
  allenamento: "Allenamento extra",
  gara: "Gara o amichevole",
  torneo: "Torneo o evento",
  affitto: "Affitto a terzi",
  manutenzione: "Manutenzione o chiusura",
};

/** Sensible defaults per kind for the form. */
export const BOOKING_DEFAULTS: Readonly<
  Record<BookingKind, { duration: number; format: PitchFormat }>
> = {
  allenamento: { duration: 90, format: 7 },
  gara: { duration: 105, format: 11 },
  torneo: { duration: 240, format: "full" },
  affitto: { duration: 90, format: "full" },
  manutenzione: { duration: 240, format: "full" },
};

export const BOOKING_TITLE_MAX = 60;

const isRealDay = (iso: string): boolean => {
  const t = Date.parse(`${iso}T12:00:00Z`);
  return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === iso;
};

/** Problems with a booking draft, in plain Italian. Empty when valid. */
export function validateBooking(b: Omit<Booking, "id">): string[] {
  const out: string[] = [];
  if (!(b.kind in BOOKING_KIND_LABEL)) out.push("Tipo di ipotesi non valido.");
  if (!(b.pitch in PITCHES)) out.push("Campo non valido.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.date) || !isRealDay(b.date))
    out.push("Data non valida.");
  const start = toMinutes(b.start);
  if (start === null || start >= 24 * 60)
    out.push("Orario di inizio non valido.");
  if (!Number.isInteger(b.duration) || b.duration < 15 || b.duration > 12 * 60)
    out.push("Durata tra 15 minuti e 12 ore.");
  else if (start !== null && start + b.duration > 24 * 60)
    out.push("L'ipotesi deve finire entro mezzanotte.");
  if (b.format !== "full" && !(b.format in DEFAULT_DURATION))
    out.push("Formato non valido.");
  const rooms = b.rooms ?? [];
  if (rooms.some((r) => !ROOMS.some((x) => x.id === r)))
    out.push("Spogliatoio non valido.");
  if (rooms.length && b.pitch === "DV")
    out.push("Gli spogliatoi di Dervio non sono ancora assegnabili qui.");
  const title = (b.title ?? "").trim();
  if (title.length > BOOKING_TITLE_MAX)
    out.push(
      `Descrizione troppo lunga (massimo ${BOOKING_TITLE_MAX} caratteri).`,
    );
  if (/@|\+?\d[\d\s.-]{6,}\d/.test(title))
    out.push(
      "Niente email o numeri di telefono: solo il nome della squadra, dell'evento o dell'ente.",
    );
  if (b.kind === "affitto" && !title)
    out.push(
      "Per un affitto scrivi il nome dell'ente o della società che chiede il campo.",
    );
  return out;
}

/** A booking as an occupancy item, checked by the same capacity engine as the matches. */
export function bookingToItem(b: Booking): RotationMatch {
  const start = toMinutes(b.start) ?? 0;
  const label = b.title.trim()
    ? `${BOOKING_KIND_LABEL[b.kind]} · ${b.title.trim()}`
    : BOOKING_KIND_LABEL[b.kind];
  return {
    id: `ipotesi-${b.id}`,
    date: b.date,
    start,
    end: start + b.duration,
    endKnown: true,
    group: "ipotesi",
    label,
    short: "IP",
    format: b.format,
    opponent: "",
    kind: b.kind,
    homePitch: b.pitch,
    pitch: b.pitch,
    moved: false,
  };
}

/** Matches plus valid bookings, ready for `simulate`. Invalid bookings are skipped. */
export function withBookings(
  matches: readonly RotationMatch[],
  bookings: readonly Booking[],
): RotationMatch[] {
  return [
    ...matches,
    ...bookings
      .filter((b) => validateBooking(b).length === 0)
      .map(bookingToItem),
  ];
}

/** Parses bookings read from browser storage; anything malformed is dropped. */
export function parseStoredBookings(raw: string | null): Booking[] {
  if (!raw) return [];
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data
      .filter((b): b is Booking => {
        if (!b || typeof b !== "object") return false;
        const x = b as Record<string, unknown>;
        return (
          typeof x["id"] === "string" &&
          typeof x["title"] === "string" &&
          typeof x["start"] === "string" &&
          validateBooking(x as unknown as Booking).length === 0
        );
      })
      .slice(0, 100);
  } catch {
    return [];
  }
}

export interface FreeWindow {
  pitch: PitchId;
  start: number;
  end: number;
}

/**
 * Free windows on a pitch in one day (no use at all, changeover buffer
 * included), between `from` and `to` minutes, at least `minLength` long.
 */
export function freeWindows(
  dayItems: readonly RotationMatch[],
  pitch: PitchId,
  opts: { from: number; to: number; minLength: number; buffer: number },
): FreeWindow[] {
  const busy = dayItems
    .filter((m) => m.pitch === pitch)
    .map((m) => [m.start - opts.buffer, m.end + opts.buffer] as const)
    .sort((a, b) => a[0] - b[0]);
  const out: FreeWindow[] = [];
  let cursor = opts.from;
  for (const [s, e] of busy) {
    if (s > cursor) {
      const end = Math.min(s, opts.to);
      if (end - cursor >= opts.minLength)
        out.push({ pitch, start: cursor, end });
    }
    cursor = Math.max(cursor, e);
    if (cursor >= opts.to) break;
  }
  if (opts.to - cursor >= opts.minLength)
    out.push({ pitch, start: cursor, end: opts.to });
  return out;
}

/**
 * Would a use of `pitch` from `start` for `duration` minutes with `format` fit
 * next to what is already there? Returns the items it would share the pitch with.
 */
export function checkSlot(
  dayItems: readonly RotationMatch[],
  pitch: PitchId,
  start: number,
  duration: number,
  format: PitchFormat,
  buffer: number,
): { fits: boolean; sharing: RotationMatch[]; peak: number } {
  const probe: RotationMatch = {
    id: "__probe__",
    date: "",
    start,
    end: start + duration,
    endKnown: true,
    group: "ipotesi",
    label: "",
    short: "",
    format,
    opponent: "",
    kind: "affitto",
    homePitch: pitch,
    pitch,
    moved: false,
  };
  const same = dayItems.filter((m) => m.pitch === pitch);
  const all = [...same, probe];
  const touching = same.filter(
    (m) => m.start < probe.end + buffer && probe.start < m.end + buffer,
  );
  let peak = 0;
  for (const p of new Set(
    all.filter((m) => m.start >= start - buffer - 24 * 60).map((m) => m.start),
  )) {
    const { load, active } = loadAt(all, pitch, p, buffer);
    if (active.some((m) => m.id === probe.id)) peak = Math.max(peak, load);
  }
  // The probe's own interval may begin while others are running: also check at its start.
  peak = Math.max(peak, loadAt(all, pitch, start, buffer).load);
  return {
    fits: peak <= 1 + EPS && !unitsToVerify(pitch, format),
    sharing: touching,
    peak,
  };
}

/* ------------------------------------------------------------------ */
/* Changing rooms and the bookings register                            */
/* ------------------------------------------------------------------ */

/** A room assignment of the weekly training board (quadro snapshot `rooms`). */
export interface QuadroRoom {
  week: string;
  day: string;
  id: string;
  start: number;
  end: number;
  group: string;
}

const QUADRO_DAY = [
  "DOMENICA",
  "LUNEDÌ",
  "MARTEDÌ",
  "MERCOLEDÌ",
  "GIOVEDÌ",
  "VENERDÌ",
  "SABATO",
];

export interface RoomClash {
  room: RoomId;
  /** Who already has it: a team of the training board or another ipotesi. */
  by: string;
  start: number;
  end: number;
  source: "quadro" | "ipotesi";
  /** Training board week ("A", "B", "A/B") when the clash comes from the quadro. */
  week?: string;
}

/**
 * Rooms of a booking draft already assigned in the same slot: weekly training
 * board (week A/B cannot be determined automatically, so both are checked and
 * reported) and other ipotesi on the same day. The changeover buffer applies.
 */
export function roomClashes(
  draft: Omit<Booking, "id">,
  others: readonly Booking[],
  quadroRooms: readonly QuadroRoom[],
  buffer: number,
): RoomClash[] {
  const rooms = draft.rooms ?? [];
  const start = toMinutes(draft.start);
  if (!rooms.length || start === null || draft.pitch === "DV") return [];
  const end = start + draft.duration;
  const hit = (s: number, e: number) => s < end + buffer && start < e + buffer;
  const out: RoomClash[] = [];
  const day = isRealDay(draft.date)
    ? QUADRO_DAY[new Date(`${draft.date}T12:00:00Z`).getUTCDay()]
    : null;
  for (const room of rooms) {
    for (const q of quadroRooms) {
      if (
        q.day !== day ||
        q.id !== room ||
        !q.group.trim() ||
        q.group.trim() === "—"
      )
        continue;
      if (hit(q.start, q.end))
        out.push({
          room,
          by: q.group.trim(),
          start: q.start,
          end: q.end,
          source: "quadro",
          week: q.week,
        });
    }
    for (const b of others) {
      if (
        b.date !== draft.date ||
        !(b.rooms ?? []).includes(room) ||
        b.pitch === "DV"
      )
        continue;
      const bs = toMinutes(b.start);
      if (bs === null) continue;
      if (hit(bs, bs + b.duration))
        out.push({
          room,
          by: b.title.trim() || BOOKING_KIND_LABEL[b.kind],
          start: bs,
          end: bs + b.duration,
          source: "ipotesi",
        });
    }
  }
  return out;
}

export interface RoomGuidance {
  text: string;
  /** "fonte" when the rule comes from a club master, "regola proposta" otherwise. */
  basis: "fonte" | "regola proposta";
}

/** Short "how to use the changing rooms" notes per booking type. */
export function roomGuidance(kind: BookingKind): RoomGuidance[] {
  const referee: RoomGuidance = {
    text: "Arbitri: spogliatoio arbitri dedicato.",
    basis: "fonte",
  };
  const free15: RoomGuidance = {
    text: "Lasciare lo spogliatoio libero 15 minuti prima del turno successivo.",
    basis: "regola proposta",
  };
  switch (kind) {
    case "gara":
      return [
        {
          text: "Squadra ospite: uno spogliatoio SP assegnato; squadra di casa nel suo SP.",
          basis: "regola proposta",
        },
        referee,
        free15,
      ];
    case "torneo":
      return [
        {
          text: "Uno spogliatoio per squadra a turni, scritto nel programma del torneo.",
          basis: "regola proposta",
        },
        referee,
        free15,
      ];
    case "affitto":
      return [
        {
          text: "Un SP assegnato all'ente; apertura e chiusura con un responsabile SCD.",
          basis: "regola proposta",
        },
        free15,
      ];
    case "allenamento":
      return [
        {
          text: "Usa lo spogliatoio della squadra dal Quadro settimanale; se è occupato scegline uno libero.",
          basis: "regola proposta",
        },
        free15,
      ];
    case "manutenzione":
      return [
        {
          text: "Spogliatoi non necessari, salvo lavori al loro interno.",
          basis: "regola proposta",
        },
      ];
  }
}

/** Column order of "17 - PRENOTAZIONI IMPIANTI 2026-27 (master)". */
export const REGISTRY_COLUMNS = [
  "ID",
  "Data",
  "Ora inizio",
  "Ora fine",
  "Sede",
  "ID spazio",
  "Zona",
  "Tipo",
  "Squadra o soggetto",
  "Formato",
  "Spogliatoi",
  "Ingresso",
  "Stato",
  "Richiesto da",
  "Approvato da",
  "Importo affitto",
  "Contratto o link",
  "Avviso Comune",
  "Note",
  "Origine",
] as const;

export const REGISTRY_URL =
  "https://docs.google.com/spreadsheets/d/14Idop9OuCWGMaxVgiQgGSpM5E7mNaO6SL6kt_i_lSVY/edit";

const zoneOf = (pitch: PitchId, format: PitchFormat): string => {
  const w = pitchUnits(pitch, format);
  return w >= 0.999
    ? "Campo intero"
    : w >= 0.49
      ? "Metà campo"
      : w >= 0.33
        ? "Un terzo"
        : "Un quarto";
};
const itDate = (iso: string) =>
  `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const cell = (v: string) => v.replace(/[\t\r\n]+/g, " ").trim();

/**
 * One TSV row for the bookings master, in REGISTRY_COLUMNS order. Status is
 * always PROPOSTA: approval happens in the sheet. Unknown cells stay empty for
 * the manager to fill (who asked, who approves, amount, contract, entrance).
 */
export function bookingToRegistryRow(b: Booking): string {
  const start = toMinutes(b.start) ?? 0;
  const p = PITCHES[b.pitch];
  const roomIds = (b.rooms ?? []).map(
    (r) => ROOMS.find((x) => x.id === r)?.spaceId ?? r,
  );
  const values: string[] = [
    `IPO-${b.id}`,
    itDate(b.date),
    hhmm(start),
    hhmm(start + b.duration),
    p.siteId,
    p.spaceId,
    zoneOf(b.pitch, b.format),
    BOOKING_KIND_LABEL[b.kind],
    b.title,
    b.format === "full" ? "Campo intero" : `${b.format} contro ${b.format}`,
    roomIds.join(", "),
    "",
    "PROPOSTA",
    "",
    "",
    "",
    "",
    b.pitch === "DV"
      ? `Entro il ${itDate(minusDays(b.date, NOTICE_DAYS))}`
      : "Non serve",
    "",
    "Super App /gestionale/impianti (ipotesi)",
  ];
  return values.map(cell).join("\t");
}

/* ------------------------------------------------------------------ */
/* Presentation helpers (pure)                                         */
/* ------------------------------------------------------------------ */

export interface ScenarioPreset {
  id: "now" | "auto" | "u15" | "u16" | "u19" | "alternate";
  label: string;
  modes: Record<MovableGroup, TeamMode>;
  auto: boolean;
}

export const PRESETS: readonly ScenarioPreset[] = [
  {
    id: "now",
    label: "Calendario attuale",
    modes: { u15: "colico", u16: "colico", u19: "colico" },
    auto: false,
  },
  {
    id: "auto",
    label: "Solo i conflitti a Dervio",
    modes: { u15: "colico", u16: "colico", u19: "colico" },
    auto: true,
  },
  {
    id: "u15",
    label: "U15 a Dervio",
    modes: { u15: "dervio", u16: "colico", u19: "colico" },
    auto: false,
  },
  {
    id: "u16",
    label: "U16 a Dervio",
    modes: { u15: "colico", u16: "dervio", u19: "colico" },
    auto: false,
  },
  {
    id: "u19",
    label: "U19 a Dervio",
    modes: { u15: "colico", u16: "colico", u19: "dervio" },
    auto: false,
  },
  {
    id: "alternate",
    label: "U15, U16, U19 alternate",
    modes: { u15: "alternate", u16: "alternate", u19: "alternate" },
    auto: false,
  },
];

export const MODE_LABEL: Readonly<Record<TeamMode, string>> = {
  colico: "Sempre a Colico",
  dervio: "Sempre a Dervio",
  alternate: "Una sì e una no a Dervio",
};

export interface ZoneSlot {
  match: RotationMatch;
  /** Left edge as a share of the pitch length (0..1). */
  x: number;
  /** Width as a share of the pitch length. */
  w: number;
  /** True when the match does not fit in the remaining space. */
  overflow: boolean;
}

/**
 * Lays out the matches active on a pitch at one instant: biggest formats first,
 * each takes its share of the pitch from left to right. Whatever does not fit
 * is marked `overflow` (board: "E14 · 9 contro 9: non ci sta").
 */
export function layoutPitch(
  active: readonly RotationMatch[],
  pitch: PitchId,
): ZoneSlot[] {
  const sorted = [...active].sort(
    (a, b) =>
      pitchUnits(pitch, b.format) - pitchUnits(pitch, a.format) ||
      a.start - b.start,
  );
  let x = 0;
  return sorted.map((m) => {
    const w = pitchUnits(pitch, m.format);
    if (x + w > 1 + EPS) return { match: m, x: 0, w, overflow: true };
    const slot = { match: m, x, w, overflow: false };
    x += w;
    return slot;
  });
}

/** Time slots of a day on Colico: distinct start times of home matches. */
export function daySlots(dayMatches: readonly RotationMatch[]): number[] {
  return [...new Set(dayMatches.map((m) => m.start))].sort((a, b) => a - b);
}

/** Today's ISO date in the club's time zone. */
export function clubToday(now: Date = new Date()): string {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

const WEEKDAYS = [
  "domenica",
  "lunedì",
  "martedì",
  "mercoledì",
  "giovedì",
  "venerdì",
  "sabato",
];
const WEEKDAYS_SHORT = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
const MONTHS = [
  "gennaio",
  "febbraio",
  "marzo",
  "aprile",
  "maggio",
  "giugno",
  "luglio",
  "agosto",
  "settembre",
  "ottobre",
  "novembre",
  "dicembre",
];

export const longDay = (iso: string): string => {
  const d = new Date(`${iso}T12:00:00Z`);
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
};
export const shortDay = (iso: string): string => {
  const d = new Date(`${iso}T12:00:00Z`);
  return `${WEEKDAYS_SHORT[d.getUTCDay()]} ${d.getUTCDate()}`;
};
export const ddmm = (iso: string): string =>
  `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
