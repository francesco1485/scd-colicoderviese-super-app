/**
 * Staff roster on the server. People are inside (UD-100, Direzione 13/10/2026): names and roles only for a
 * signed-in member (verified session), never for anonymous callers, who get an empty roster plus an explicit
 * not-authorized flag. E-mail only when the caller is inside an open work area (verified session or staging
 * preview). Phones are never returned by these functions.
 */
import { createServerFn } from "@tanstack/react-start";

import { workAreaView } from "./access";
import { sessionRoles, sessionView } from "./auth.functions";
import { isSignedInMember, NOT_AUTHORIZED, type NotAuthorized, type SessionLike } from "./public-access";
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

export type StaffRosterResult = (StaffRoster & { authorized: true }) | (StaffRoster & NotAuthorized);

/** Pure guard: the roster for a signed-in member, an empty roster with the explicit refusal for anyone else. */
export function staffRosterFor(env: Readonly<Record<string, string | undefined>>, session: SessionLike | null): StaffRosterResult {
  if (!isSignedInMember(session)) return { ...parseRoster(undefined).roster, ...NOT_AUTHORIZED };
  return { ...staffRosterPublic(env), authorized: true };
}

export const getStaffRoster = createServerFn({ method: "GET" }).handler(async (): Promise<StaffRosterResult> => staffRosterFor(process.env, await sessionView()));

export const getStaffEmails = createServerFn({ method: "GET" }).handler(async (): Promise<Record<string, string>> => staffEmails(process.env, import.meta.env.PROD, await sessionRoles()));
