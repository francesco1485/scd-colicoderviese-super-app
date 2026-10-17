/** «Ruoli della rosa» (UD-168): pure helpers of the mister editor. */
import type { RosterRole } from "./public-roster";

export const ROLE_CHOICES: readonly RosterRole[] = ["P", "D", "C", "A"];

/** Rows to send: only athletes whose role differs from the saved one (null clears a role). */
export function changedRoles(
  saved: Readonly<Record<string, RosterRole | null>>,
  draft: Readonly<Record<string, RosterRole | null>>,
  athleteIds: readonly string[],
): { athleteId: string; role: RosterRole | null }[] {
  const out: { athleteId: string; role: RosterRole | null }[] = [];
  for (const id of athleteIds) {
    const before = saved[id] ?? null;
    const after = draft[id] ?? null;
    if (before !== after) out.push({ athleteId: id, role: after });
  }
  return out;
}
