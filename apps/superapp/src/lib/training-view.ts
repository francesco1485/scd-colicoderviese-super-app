/**
 * View helpers for the public training board (/allenamenti).
 * Pure functions over the quadro snapshot: no data is invented, unknown stays empty.
 */
import { appliesToWeek, type TrainingRotation, type TrainingSlot } from "./public-snapshots";

const WEEKDAYS = ["DOMENICA", "LUNEDÌ", "MARTEDÌ", "MERCOLEDÌ", "GIOVEDÌ", "VENERDÌ", "SABATO"] as const;

/** Italian weekday key ("LUNEDÌ") of an ISO date, as used by the quadro. */
export function weekdayKey(isoDate: string): string | null {
  const t = Date.parse(`${isoDate}T12:00:00Z`);
  if (Number.isNaN(t)) return null;
  return WEEKDAYS[new Date(t).getUTCDay()] ?? null;
}

/** Today when it is a training day of the board, otherwise the first day. */
export function defaultDay(days: readonly string[], todayIso: string): string {
  const k = weekdayKey(todayIso);
  return k && days.includes(k) ? k : (days[0] ?? "");
}

/** "17:20" → 1040 minutes; invalid → NaN. */
export function minutesOf(hhmm: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return Number.NaN;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  return h < 24 && mi < 60 ? h * 60 + mi : Number.NaN;
}

/** End minute of a slot: explicit end, otherwise read from "17:20–18:50". */
export function slotEnd(slot: Pick<TrainingSlot, "start" | "timeLabel"> & { end?: number }): number {
  if (typeof slot.end === "number" && slot.end > slot.start) return slot.end;
  const last = slot.timeLabel.split(/[–-]/).pop() ?? "";
  const m = minutesOf(last);
  return Number.isFinite(m) && m > slot.start ? m : slot.start + 90;
}

export type SlotState = "live" | "next" | "done" | "later";

/**
 * State of each slot of the selected day. Only the selected day equal to today gets
 * live/next/done; other days are all "later" (nothing is claimed about them).
 */
export function slotStates(
  slots: ReadonlyArray<Pick<TrainingSlot, "start" | "timeLabel"> & { end?: number }>,
  isToday: boolean,
  nowMinutes: number,
): SlotState[] {
  if (!isToday || !Number.isFinite(nowMinutes)) return slots.map(() => "later");
  let nextGiven = false;
  return slots.map((s) => {
    const end = slotEnd(s);
    if (nowMinutes >= end) return "done";
    if (nowMinutes >= s.start) return "live";
    if (!nextGiven) {
      nextGiven = true;
      return "next";
    }
    return "later";
  });
}

export interface PitchZone {
  key: string; // "A", "B", "C"
  label: string; // "U15 2012/13" or "" when free
}

/**
 * Zones of one pitch for a slot, from the rotation of that day/week starting at the same minute.
 * Returns null when the board has no zone split for that slot (the whole pitch text is used instead).
 */
export function pitchZones(
  rotations: readonly TrainingRotation[],
  day: string,
  week: "A" | "B",
  start: number,
  field: "C1" | "C2",
): PitchZone[] | null {
  const rot = rotations.find((r) => r.start === start && r.days.includes(day) && appliesToWeek(r.week, week));
  if (!rot) return null;
  const zones = Object.entries(rot.zones)
    .filter(([k]) => k.startsWith(`${field}_`))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => ({ key: k.slice(-1), label: v && v !== "—" ? v : "" }));
  return zones.length ? zones : null;
}

/** "Juniores Élite U19 (+ atleti ex U18 integrati)" stays; empty or "—" means a free pitch. */
export function isFree(text: string | undefined): boolean {
  const t = (text ?? "").trim();
  return t === "" || t === "—";
}
