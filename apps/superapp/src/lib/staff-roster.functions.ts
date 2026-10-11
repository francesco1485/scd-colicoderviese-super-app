/**
 * Staff roster on the server. Names and roles are public (the club's organigramma);
 * e-mail only when the caller is inside an open work area (verified session or staging preview). Phones are never returned by these functions.
 */
import { createServerFn } from "@tanstack/react-start";

import { workAreaView } from "./access";
import { sessionRoles } from "./auth.functions";
import { stagingPreviewEnabled } from "./impianti-access";
import { parseRoster, type StaffRoster } from "./staff-roster";

export function staffRosterPublic(env: Readonly<Record<string, string | undefined>>): StaffRoster {
  return parseRoster(env["SCD_STAFF_ROSTER_JSON"]).roster;
}

export function staffEmails(env: Readonly<Record<string, string | undefined>>, isProd: boolean, roles: ReadonlySet<string> | null = null): Record<string, string> {
  const gate = workAreaView("segreteria", { preview: stagingPreviewEnabled(env, isProd), sessionRoles: roles });
  if (gate.view !== "page") return {};
  const { contacts } = parseRoster(env["SCD_STAFF_ROSTER_JSON"]);
  const out: Record<string, string> = {};
  for (const c of contacts) if (c.email) out[c.id] = c.email;
  return out;
}

export const getStaffRoster = createServerFn({ method: "GET" }).handler(async (): Promise<StaffRoster> => staffRosterPublic(process.env));

export const getStaffEmails = createServerFn({ method: "GET" }).handler(async (): Promise<Record<string, string>> => staffEmails(process.env, import.meta.env.PROD, await sessionRoles()));
