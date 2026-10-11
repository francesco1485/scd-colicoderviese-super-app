/**
 * Pure helpers for the interior areas /quadro (board Quadro-settimanale) and
 * /gestionale (board Gestionale), built ONLY on the existing snapshot readers
 * (`loadQuadro`, `loadCalendar` in public-snapshots.ts) and board-data.ts.
 * No network, no new source. Unknown stays null ("—" in the UI), never zero.
 * Tested in quadro.test.ts.
 */
import { shortTeams, upcomingMatches, weekRange } from "./board-data";
import type {
  PublicEvent,
  PublicGroup,
  TrainingRoom,
  TrainingRotation,
  TrainingSlot,
} from "./public-snapshots";
import {
  appliesToWeek,
  findSessions,
  trainingKeyFor,
} from "./public-snapshots";

export type Field = "C1" | "C2";
export type Week = "A" | "B";
export const FIELDS: readonly Field[] = ["C1", "C2"];
export const FIELD_LABEL: Readonly<Record<Field, string>> = {
  C1: "Campo 1",
  C2: "Campo 2",
};
export const ROOM_IDS = ["SP1", "SP2", "SP3", "SP4"] as const;
/** Field-rotation simulator and facility planner inside the gestionale (built in a parallel branch). */
export const IMPIANTI_PATH = "/gestionale/impianti";
/** Coach sub-area of the gestionale (registry id "mister"). */
export const MISTER_PATH = "/gestionale/mister";
export const ZONE_IDS = ["C1_A", "C1_B", "C1_C", "C2_A", "C2_B"] as const;

const DAY_LABEL: Readonly<Record<string, string>> = {
  LUNEDÌ: "Lunedì",
  MARTEDÌ: "Martedì",
  MERCOLEDÌ: "Mercoledì",
  GIOVEDÌ: "Giovedì",
  VENERDÌ: "Venerdì",
  SABATO: "Sabato",
  DOMENICA: "Domenica",
};
/** "LUNEDÌ" -> "Lunedì". */
export const dayLabel = (day: string) => DAY_LABEL[day] ?? day;

/** "17:20" -> 1040 (minutes from midnight); null when not a time. */
export function toMinutes(hhmm: string): number | null {
  const m = /^(\d{1,2})[:.](\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  return h < 24 && min < 60 ? h * 60 + min : null;
}

/** 1040 -> "17:20". */
export function fromMinutes(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

/** "Lun/Mer 17:20–18:50" -> { start: 1040, end: 1130 }; null when the label has no range. */
export function parseRange(
  label: string,
): { start: number; end: number } | null {
  const m = /(\d{1,2}[:.]\d{2})\s*[–-]\s*(\d{1,2}[:.]\d{2})/.exec(label);
  if (!m) return null;
  const start = toMinutes(m[1]!);
  const end = toMinutes(m[2]!);
  return start !== null && end !== null && end > start ? { start, end } : null;
}

/** A room cell counts only when it names a group (empty and "—" mean free). */
const occupied = (v: string) => v.trim() !== "" && v.trim() !== "—";

export interface QuadroEntry {
  id: string;
  day: string;
  timeLabel: string;
  start: number;
  end: number;
  field: Field;
  /** Group text exactly as written in the master. */
  text: string;
  /** Short label ("U15 + U12 + U11"). */
  teams: string;
  /** Changing rooms of the slot (board: "Spogliatoi SP1, SP2"). */
  rooms: { id: (typeof ROOM_IDS)[number]; group: string }[];
}

/** One entry per occupied field of each slot. */
export function quadroEntries(slots: readonly TrainingSlot[]): QuadroEntry[] {
  return slots.flatMap((s) => {
    const range = parseRange(s.timeLabel) ?? { start: s.start, end: s.start };
    const rooms = ROOM_IDS.filter((id) => occupied(s.rooms[id])).map((id) => ({
      id,
      group: s.rooms[id].trim(),
    }));
    return FIELDS.filter((f) => s.fields[f].trim()).map((field) => ({
      id: `${s.day}-${s.timeLabel}-${field}`,
      day: s.day,
      timeLabel: s.timeLabel,
      start: range.start,
      end: range.end,
      field,
      text: s.fields[field].replace(/\s*\n\s*/g, " · ").trim(),
      teams: shortTeams(s.fields[field]),
      rooms,
    }));
  });
}

/** Entries grouped by day in the order of `days` (Mon–Fri), each day sorted by time then field. */
export function groupByDay(
  days: readonly string[],
  entries: readonly QuadroEntry[],
): { day: string; entries: QuadroEntry[] }[] {
  return days.map((day) => ({
    day,
    entries: entries
      .filter((e) => e.day === day)
      .sort((a, b) => a.start - b.start || a.field.localeCompare(b.field)),
  }));
}

/**
 * Comparable team key: "Juniores Élite U19 (+ atleti ex U18 integrati)" and
 * "Juniores U19 (+ ex U18)" -> "juniores u19"; "U13 — chiusura" -> "u13";
 * "Prima Squadra fino 20:30" -> "prima squadra".
 */
export function teamKey(text: string): string {
  const base = text
    .replace(/\s+—\s+(attivazione|chiusura).*$/i, "")
    .replace(/\s+fino\s+\d{1,2}[:.]\d{2}.*$/i, "")
    .replace(/\s+(?:19|20)\d{2}(?:[/-]\d{2,4})?(?=\s|$|\+)/g, "");
  return shortTeams(base).toLowerCase().trim();
}

export interface Overlap {
  day: string;
  field: Field;
  /** The two entries (earlier first). */
  a: QuadroEntry;
  b: QuadroEntry;
  from: number;
  to: number;
  minutes: number;
}

/** Two different groups on the same field of the same day with intersecting times. */
export function findOverlaps(entries: readonly QuadroEntry[]): Overlap[] {
  const out: Overlap[] = [];
  const sorted = [...entries].sort(
    (x, y) => x.start - y.start || x.end - y.end,
  );
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const a = sorted[i]!;
      const b = sorted[j]!;
      if (
        a.day !== b.day ||
        a.field !== b.field ||
        teamKey(a.text) === teamKey(b.text)
      )
        continue;
      const from = Math.max(a.start, b.start);
      const to = Math.min(a.end, b.end);
      if (to > from)
        out.push({
          day: a.day,
          field: a.field,
          a,
          b,
          from,
          to,
          minutes: to - from,
        });
    }
  }
  return out;
}

export interface OverlapGroup {
  key: string;
  days: string[];
  field: Field;
  teams: [string, string];
  from: number;
  to: number;
  minutes: number;
  /** Entry ids involved, to highlight them in the grid. */
  entryIds: string[];
}

/** Same pair, same field, same window on several days -> one item ("U19 e U16, lunedì e mercoledì"). */
export function groupOverlaps(
  overlaps: readonly Overlap[],
  days: readonly string[] = [],
): OverlapGroup[] {
  const map = new Map<string, OverlapGroup>();
  for (const o of overlaps) {
    const key = `${o.field}|${teamKey(o.a.text)}|${teamKey(o.b.text)}|${o.from}|${o.to}`;
    const g = map.get(key);
    if (g) {
      if (!g.days.includes(o.day)) g.days.push(o.day);
      g.entryIds.push(o.a.id, o.b.id);
    } else {
      map.set(key, {
        key,
        days: [o.day],
        field: o.field,
        teams: [o.a.teams, o.b.teams],
        from: o.from,
        to: o.to,
        minutes: o.minutes,
        entryIds: [o.a.id, o.b.id],
      });
    }
  }
  const order = (d: string) => (days.includes(d) ? days.indexOf(d) : 99);
  return [...map.values()]
    .map((g) => ({ ...g, days: g.days.sort((x, y) => order(x) - order(y)) }))
    .sort((x, y) => order(x.days[0]!) - order(y.days[0]!) || x.from - y.from);
}

/** "lunedì e mercoledì", "lunedì, martedì e giovedì". */
export function joinDays(days: readonly string[]): string {
  const l = days.map((d) => dayLabel(d).toLowerCase());
  return l.length <= 1
    ? (l[0] ?? "")
    : `${l.slice(0, -1).join(", ")} e ${l[l.length - 1]}`;
}

export interface RotationRow {
  id: string;
  week: string;
  day: string;
  timeLabel: string;
  start: number;
  end: number;
  zones: Record<string, string>;
  /** Zone ids where two groups of a detected field overlap meet in this row. */
  conflictZones: string[];
}

/** Rotation rows of one day for week A or B ("A/B" rows apply to both), sorted by time. */
export function rotationFor(
  rotations: readonly TrainingRotation[],
  week: Week,
  day: string,
  overlaps: readonly Overlap[] = [],
): RotationRow[] {
  return rotations
    .filter((r) => appliesToWeek(r.week, week) && r.days.includes(day))
    .map((r, i) => {
      const range = parseRange(r.timeLabel) ?? { start: r.start, end: r.start };
      const conflictZones: string[] = [];
      for (const o of overlaps) {
        if (o.day !== day || !(range.start < o.to && o.from < range.end))
          continue;
        const keys = new Set([teamKey(o.a.text), teamKey(o.b.text)]);
        const zones = ZONE_IDS.filter(
          (z) => z.startsWith(o.field) && keys.has(teamKey(r.zones[z] ?? "")),
        );
        const present = new Set(zones.map((z) => teamKey(r.zones[z]!)));
        if (present.size === keys.size)
          for (const z of zones)
            if (!conflictZones.includes(z)) conflictZones.push(z);
      }
      return {
        id: `${r.week}-${day}-${r.timeLabel}-${i}`,
        week: r.week,
        day,
        timeLabel: r.timeLabel.replace(/^[A-Za-zÀ-ÿ/]+\s+/, ""),
        start: range.start,
        end: range.end,
        zones: r.zones,
        conflictZones,
      };
    })
    .sort((a, b) => a.start - b.start);
}

/** A cell written "Piccoli Amici fino 19:00" ends at 19:00 even if its row runs longer. */
function cellEnd(text: string, rowEnd: number): number {
  const m = /fino\s+(\d{1,2}[:.]\d{2})/i.exec(text);
  const t = m ? toMinutes(m[1]!) : null;
  return t !== null ? Math.min(t, rowEnd) : rowEnd;
}

/**
 * Same zone, same day and week, intersecting times, different groups.
 * "fino HH:MM" in a cell shortens that cell. In the 09/10 snapshot this finds week B Thursday
 * 19:00–19:30: the 18:00–19:30 row keeps U13 and Piccoli Amici in C1_B/C1_C while the
 * 19:00–19:30 row gives the same zones to the Prima Squadra.
 */
export function zoneConflicts(
  rows: readonly RotationRow[],
): { zone: string; a: RotationRow; b: RotationRow }[] {
  const out: { zone: string; a: RotationRow; b: RotationRow }[] = [];
  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      const a = rows[i]!;
      const b = rows[j]!;
      if (a.day !== b.day) continue;
      for (const z of ZONE_IDS) {
        const ta = a.zones[z] ?? "";
        const tb = b.zones[z] ?? "";
        if (!occupied(ta) || !occupied(tb) || teamKey(ta) === teamKey(tb))
          continue;
        const ea = cellEnd(ta, a.end);
        const eb = cellEnd(tb, b.end);
        if (ea > a.start && eb > b.start && a.start < eb && b.start < ea)
          out.push({ zone: z, a, b });
      }
    }
  }
  return out;
}

/**
 * For an overlap group: does the rotation sheet give the two groups separate zones of the
 * field during the overlap, week by week? (Both groups present in the same rotation row.)
 */
export function rotationSplit(
  g: OverlapGroup,
  rotations: readonly TrainingRotation[],
  overlaps: readonly Overlap[],
): { week: Week; split: boolean }[] {
  const own = overlaps.filter(
    (o) =>
      o.field === g.field &&
      o.from === g.from &&
      o.to === g.to &&
      g.entryIds.includes(o.a.id) &&
      g.entryIds.includes(o.b.id),
  );
  return (["A", "B"] as const).map((week) => ({
    week,
    split: g.days.every((day) =>
      rotationFor(
        rotations,
        week,
        day,
        own.filter((o) => o.day === day),
      ).some((r) => r.conflictZones.length > 0),
    ),
  }));
}

/** Changing rooms of one day and week, by room id, sorted by time. */
export function roomsFor(
  rooms: readonly TrainingRoom[],
  week: Week,
  day: string,
): Record<(typeof ROOM_IDS)[number], TrainingRoom[]> {
  const out = { SP1: [], SP2: [], SP3: [], SP4: [] } as Record<
    (typeof ROOM_IDS)[number],
    TrainingRoom[]
  >;
  for (const r of rooms) {
    if (!appliesToWeek(r.week, week) || r.day !== day) continue;
    const list = out[r.id as (typeof ROOM_IDS)[number]];
    if (
      list &&
      !list.some(
        (x) => x.start === r.start && x.end === r.end && x.group === r.group,
      )
    )
      list.push(r);
  }
  for (const id of ROOM_IDS) out[id].sort((a, b) => a.start - b.start);
  return out;
}

/** Distinct changing rooms named by the quadro (board: "4 spogliatoi a Colico"); null when none. */
export function roomCount(
  slots: readonly TrainingSlot[],
  rooms: readonly TrainingRoom[],
): number | null {
  const ids = new Set<string>(rooms.map((r) => r.id));
  for (const s of slots)
    for (const id of ROOM_IDS) if (occupied(s.rooms[id])) ids.add(id);
  return ids.size || null;
}

/* ───────────────────────── Gestionale ───────────────────────── */

/**
 * Calendar group for a quadro group text, used ONLY for the colour dot.
 * Explicit names or years written in both sources; no implicit category = year mapping (U13 stays unmatched).
 */
const GROUP_RULES: readonly [RegExp, string][] = [
  [/prima squadra/i, "prima"],
  [/juniores|\bu19\b/i, "u19"],
  [/\bu16\b|under\s*16/i, "u16"],
  [/\bu15\b|under\s*15/i, "u15"],
  [/\b2015\b/, "2015"],
  [/\bu11\b|pulcini/i, "pulcini"],
  [/primi calci/i, "primicalci"],
  [/piccoli amici/i, "piccoli"],
];
export function groupIdForText(text: string): string | null {
  return GROUP_RULES.find(([re]) => re.test(text))?.[1] ?? null;
}

/** Short team tag of the boards: "U15", "1ª", "E14", "PC", "PA", "PUL". */
export function teamTag(g: Pick<PublicGroup, "label">): string {
  const label = g.label;
  if (/prima squadra/i.test(label)) return "1ª";
  const u = /\bU(\d{2})\b/.exec(label);
  if (u) return `U${u[1]}`;
  const year = /esordienti\D*(20(\d{2}))/i.exec(label);
  if (year) return `E${year[2]}`;
  const words = label.split(/[·(]/)[0]!.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2)
    return words
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join("");
  return (words[0] ?? "").slice(0, 3).toUpperCase();
}

const channel = (c: number) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const luminance = (hex: string) => {
  const n = Number.parseInt(hex.slice(1), 16);
  return (
    0.2126 * channel((n >> 16) & 255) +
    0.7152 * channel((n >> 8) & 255) +
    0.0722 * channel(n & 255)
  );
};
/** WCAG contrast ratio of a colour against white. */
export const contrastOnWhite = (hex: string) => 1.05 / (luminance(hex) + 0.05);

/** Darkens a team colour just enough for white text at AA (4.5:1), as the board does (#2A9CB7 -> #217c92). */
export function readableOnWhite(hex: string, min = 4.5): string {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return "#3b5683";
  let n = Number.parseInt(hex.slice(1), 16);
  let rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  let out = hex.toLowerCase();
  for (let i = 0; i < 40 && contrastOnWhite(out) < min; i++) {
    rgb = rgb.map((c) => Math.round(c * 0.95));
    n = (rgb[0]! << 16) | (rgb[1]! << 8) | rgb[2]!;
    out = `#${n.toString(16).padStart(6, "0")}`;
  }
  return out;
}

/** Next match of every group from now (today + HH:MM in Europe/Rome); null when the snapshot has none. */
export function nextMatchByGroup(
  events: readonly PublicEvent[],
  today: string,
  nowHHMM: string,
): Map<string, PublicEvent | null> {
  const out = new Map<string, PublicEvent | null>();
  for (const e of events) if (!out.has(e.group)) out.set(e.group, null);
  for (const e of upcomingMatches(events, today, nowHHMM))
    if (!out.get(e.group)) out.set(e.group, e);
  return out;
}

export interface MatchSplit {
  total: number;
  home: number;
  away: number;
  /** Events whose home/away field is neither CASA nor FUORI. */
  other: number;
}

export function matchSplit(events: readonly PublicEvent[]): MatchSplit {
  const home = events.filter((e) => e.homeAway === "CASA").length;
  const away = events.filter((e) => e.homeAway === "FUORI").length;
  return {
    total: events.length,
    home,
    away,
    other: events.length - home - away,
  };
}

/** Most frequent category string of a group's events ("Giovanissimi U15"); null without events. */
export function mainCategory(events: readonly PublicEvent[]): string | null {
  const count = new Map<string, number>();
  for (const e of events)
    if (e.category) count.set(e.category, (count.get(e.category) ?? 0) + 1);
  let best: string | null = null;
  let n = 0;
  for (const [c, k] of count)
    if (k > n) {
      best = c;
      n = k;
    }
  return best;
}

export interface TeamSummary {
  id: string;
  label: string;
  tag: string;
  color: string;
  category: string | null;
  next: PublicEvent | null;
  split: MatchSplit;
  /** Weekly sessions in the quadro; null when no verified match between calendar group and quadro text. */
  weeklySessions: number | null;
  trainingKey: string | null;
}

/** One card per calendar group that has matches in the snapshot (plus "other" only when used). */
export function teamSummaries(
  groups: readonly PublicGroup[],
  events: readonly PublicEvent[],
  slots: readonly TrainingSlot[],
  today: string,
  nowHHMM: string,
): TeamSummary[] {
  const next = nextMatchByGroup(events, today, nowHHMM);
  return groups
    .filter((g) => g.count > 0)
    .map((g) => {
      const own = events.filter((e) => e.group === g.id);
      const key = trainingKeyFor(g, [...slots]);
      return {
        id: g.id,
        label: g.label,
        tag: teamTag(g),
        color: readableOnWhite(g.color),
        category: mainCategory(own),
        next: next.get(g.id) ?? null,
        split: matchSplit(own),
        weeklySessions: key ? findSessions([...slots], key).length : null,
        trainingKey: key,
      };
    })
    .sort((a, b) => {
      // Next match first (date + time), teams without a next match at the end.
      const ka = a.next ? `${a.next.date}${a.next.time}` : "9";
      const kb = b.next ? `${b.next.date}${b.next.time}` : "9";
      return ka.localeCompare(kb) || a.label.localeCompare(b.label, "it");
    });
}

/** Matches of the week (Mon–Sun) of `today`, from the calendar snapshot. */
export function matchesInWeek(
  events: readonly PublicEvent[],
  today: string,
): { from: string; to: string; label: string; events: PublicEvent[] } {
  const w = weekRange(today);
  return {
    ...w,
    events: events.filter((e) => e.date >= w.from && e.date <= w.to),
  };
}
