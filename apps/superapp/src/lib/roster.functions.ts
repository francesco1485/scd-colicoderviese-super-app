/**
 * Scoped reads for signed-in people (r61). Each call runs with the caller's own Supabase session;
 * the database functions decide what comes back:
 *   - scd_my_team_roster: the caller's teams (from active structure roles in the master; office roles: all teams);
 *   - scd_my_family: the caller and, for guardians, the people of their own family.
 * No table is read directly here, so no contact, fiscal code or full birth date reaches the browser.
 */
import { createServerFn } from "@tanstack/react-start";

import { sessionView } from "./auth.functions";
import { toRosterRow, type RosterDbRow, type RosterRow } from "./roster";
import { serverSupabase } from "./supabase.server";

export type ScopedState = "unconfigured" | "signed-out" | "no-organization" | "ok" | "error";

export interface MyRoster {
  state: ScopedState;
  rows: RosterRow[];
}

export interface FamilyMember {
  personId: string;
  displayName: string;
  relationship: string;
  birthYear: number | null;
  minor: boolean | null;
  teamCodes: string[];
  registrationStatus: string | null;
  certificateExpiresAt: string | null;
}

export interface MyFamily {
  state: ScopedState;
  members: FamilyMember[];
}

type FamilyDbRow = {
  person_id: string;
  display_name: string;
  relationship: string;
  birth_year: number | null;
  is_minor: boolean | null;
  team_codes: string[] | null;
  registration_status: string | null;
  medical_certificate_expires_at: string | null;
};

async function scope() {
  const s = await sessionView();
  if (!s.configured) return { state: "unconfigured" as const };
  if (!s.user) return { state: "signed-out" as const };
  const org = s.memberships[0] ?? null;
  if (!org) return { state: "no-organization" as const };
  const sb = serverSupabase();
  if (!sb) return { state: "unconfigured" as const };
  return { state: "ok" as const, org, sb };
}

export const getMyRoster = createServerFn({ method: "GET" }).handler(async (): Promise<MyRoster> => {
  const c = await scope();
  if (c.state !== "ok") return { state: c.state, rows: [] };
  const [roster, ids] = await Promise.all([
    c.sb.rpc("scd_my_team_roster", { p_organization_id: c.org.organizationId }),
    c.sb.rpc("scd_my_team_athlete_ids", { p_organization_id: c.org.organizationId }),
  ]);
  if (roster.error) return { state: "error", rows: [] };
  const athleteIdOf = new Map(((ids.data ?? []) as Array<{ person_id: string; athlete_id: string }>).map((r) => [r.person_id, r.athlete_id]));
  return { state: "ok", rows: ((roster.data ?? []) as RosterDbRow[]).map((r) => toRosterRow(r, athleteIdOf)) };
});

export const getMyFamily = createServerFn({ method: "GET" }).handler(async (): Promise<MyFamily> => {
  const c = await scope();
  if (c.state !== "ok") return { state: c.state, members: [] };
  const { data, error } = await c.sb.rpc("scd_my_family", { p_organization_id: c.org.organizationId });
  if (error) return { state: "error", members: [] };
  return {
    state: "ok",
    members: ((data ?? []) as FamilyDbRow[]).map((m) => ({
      personId: m.person_id,
      displayName: m.display_name.trim() || "Nome non indicato",
      relationship: m.relationship,
      birthYear: m.birth_year,
      minor: m.is_minor,
      teamCodes: m.team_codes ?? [],
      registrationStatus: m.registration_status,
      certificateExpiresAt: m.medical_certificate_expires_at,
    })),
  };
});

/**
 * Fondo Solidale application form (security review 14/10/2026): only what the form needs leaves the server — id, name,
 * relationship and minor flag. No birth year, teams, registration status or medical certificate date, on the first
 * render or on in-app navigation.
 */
export const getMyFamilyForFund = createServerFn({ method: "GET" }).handler(async (): Promise<MyFamily> => {
  const c = await scope();
  if (c.state !== "ok") return { state: c.state, members: [] };
  const { data, error } = await c.sb.rpc("scd_my_family", { p_organization_id: c.org.organizationId });
  if (error) return { state: "error", members: [] };
  return {
    state: "ok",
    members: ((data ?? []) as FamilyDbRow[]).map((m) => ({
      personId: m.person_id,
      displayName: m.display_name.trim() || "Nome non indicato",
      relationship: m.relationship,
      birthYear: null,
      minor: m.is_minor,
      teamCodes: [],
      registrationStatus: null,
      certificateExpiresAt: null,
    })),
  };
});
