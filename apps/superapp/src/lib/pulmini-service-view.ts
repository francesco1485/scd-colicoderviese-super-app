/** Pure helpers for the pulmini service view shown to every member (no names, see pulmini-runs.ts serviceView). */
import type { PulminoServiceRun } from "./pulmini-runs";

/** Training runs of one weekday ("LUNEDÌ"), by departure time; match runs are listed in the calendar, not here. */
export function serviceRunsForDay(runs: readonly PulminoServiceRun[], day: string): PulminoServiceRun[] {
  const key = day.trim().toUpperCase();
  return runs
    .filter((r) => r.training !== null && r.training.day === key)
    .sort((a, b) => (a.training!.start - b.training!.start) || (a.departure ?? "").localeCompare(b.departure ?? ""));
}
