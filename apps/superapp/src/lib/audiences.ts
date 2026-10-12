/**
 * The four doors of the Super App (config/superapp-audiences.v1.json, UD-078): fans, members and
 * families, people who work in the club, partners. Pure data + validation; the routes exist already.
 */
import raw from "../../../../config/superapp-audiences.v1.json";

export type DoorLogin = "none" | "account" | "role";

export interface DoorTask {
  label: string;
  to: string;
  hint: string;
  login?: boolean;
}

export interface Door {
  id: "tifosi" | "associati" | "lavoro" | "partner";
  label: string;
  promise: string;
  who: string;
  login: DoorLogin;
  satellites: string[];
  tasks: DoorTask[];
}

interface AudiencesContract {
  schema: string;
  rules: string[];
  doors: Door[];
}

export const AUDIENCES = raw as unknown as AudiencesContract;
export const DOORS: readonly Door[] = AUDIENCES.doors;

export const LOGIN_LABEL: Readonly<Record<DoorLogin, string>> = {
  none: "Senza account",
  account: "Con il tuo account",
  role: "Con il ruolo dato dalla società",
};

export function doorById(id: string): Door | undefined {
  return DOORS.find((d) => d.id === id);
}

/** The door a role landing (satellite slug) belongs to. */
export function doorOfSatellite(slug: string): Door | undefined {
  return DOORS.find((d) => d.satellites.includes(slug));
}

/** Contract problems (empty = valid): unique ids, every satellite in one door, tasks to known routes. */
export function validateAudiences(c: AudiencesContract, satellites: readonly string[], routes: ReadonlySet<string>): string[] {
  const problems: string[] = [];
  if (c.schema !== "scd.audiences.v1") problems.push(`schema "${c.schema}" is not scd.audiences.v1`);
  const ids = new Set<string>();
  const seen = new Map<string, string>();
  for (const d of c.doors) {
    if (ids.has(d.id)) problems.push(`door "${d.id}" is duplicated`);
    ids.add(d.id);
    if (!d.tasks.length) problems.push(`door "${d.id}" has no tasks`);
    for (const s of d.satellites) {
      if (!satellites.includes(s)) problems.push(`door "${d.id}" lists unknown satellite "${s}"`);
      if (seen.has(s)) problems.push(`satellite "${s}" is in "${seen.get(s)}" and "${d.id}"`);
      seen.set(s, d.id);
    }
    for (const t of d.tasks) {
      const path = t.to.split("#")[0]!;
      if (!routes.has(path)) problems.push(`door "${d.id}" task "${t.label}" points to a missing route ${t.to}`);
    }
  }
  for (const s of satellites) if (!seen.has(s)) problems.push(`satellite "${s}" belongs to no door`);
  return problems;
}
