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

/** A child of the signed-in family, reduced to what the training board needs: first name and birth year. */
export interface TrainingKid {
  firstName: string;
  birthYear: number;
}

/**
 * Children of the caller's family for the "I tuoi ragazzi" shortcuts on /allenamenti (Direzione 14/10: the parent must
 * reach "the training of this week" in one tap). Only minors with a known birth year; the first name only, never the
 * surname; one chip per child, sorted youngest last, at most 6.
 */
export function trainingKids(members: ReadonlyArray<{ displayName: string; birthYear: number | null; minor: boolean | null; relationship: string }>): TrainingKid[] {
  const seen = new Set<string>();
  const out: TrainingKid[] = [];
  for (const m of members) {
    if (m.minor !== true || m.birthYear === null || !Number.isInteger(m.birthYear)) continue;
    if (/^(genitore|madre|padre|tutore|referente)$/i.test(m.relationship.trim())) continue;
    const firstName = m.displayName.trim().split(/\s+/)[0] ?? "";
    if (!firstName || firstName === "Nome") continue;
    const key = `${firstName.toLowerCase()}|${m.birthYear}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ firstName, birthYear: m.birthYear });
  }
  return out.sort((a, b) => a.birthYear - b.birthYear).slice(0, 6);
}
