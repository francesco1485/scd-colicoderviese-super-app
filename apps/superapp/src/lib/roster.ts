/**
 * Team roster for mister / dirigenti / staff (r61). Rows come from the database function
 * `scd_my_team_roster`, which already restricts them to the caller's own teams (office roles: all)
 * and returns only name, birth year, team, registration status and certificate expiry.
 * Pure helpers here; the server call lives in roster.functions.ts.
 */
import { certificateState, type CertState } from "./people";

export interface RosterRow {
  teamId: string;
  teamCode: string;
  teamName: string;
  teamStatus: string;
  personId: string;
  /** Athlete record id ("" when the server could not read it from scd_my_team_athlete_ids). */
  athleteId: string;
  displayName: string;
  birthYear: number | null;
  minor: boolean | null;
  registrationStatus: string;
  certificateExpiresAt: string | null;
}

export interface RosterDbRow {
  team_id: string;
  team_code: string;
  team_name: string;
  team_status: string;
  person_id: string;
  display_name: string;
  birth_year: number | null;
  is_minor: boolean | null;
  registration_status: string;
  medical_certificate_expires_at: string | null;
}

export function toRosterRow(r: RosterDbRow, athleteIdOf: ReadonlyMap<string, string> = new Map()): RosterRow {
  return {
    teamId: r.team_id,
    teamCode: r.team_code,
    teamName: r.team_name,
    teamStatus: r.team_status,
    personId: r.person_id,
    athleteId: athleteIdOf.get(r.person_id) ?? "",
    displayName: r.display_name.trim() || "Nome non indicato",
    birthYear: r.birth_year,
    minor: r.is_minor,
    registrationStatus: r.registration_status,
    certificateExpiresAt: r.medical_certificate_expires_at,
  };
}

/** Calendar group ids (public snapshot) → team codes in the database. Same code unless listed. */
const GROUP_TO_TEAM: Readonly<Record<string, string>> = { piccoli: "piccoliamici" };

export function teamCodeForGroup(groupId: string): string {
  return GROUP_TO_TEAM[groupId] ?? groupId;
}

export function groupForTeamCode(teamCode: string): string {
  const hit = Object.entries(GROUP_TO_TEAM).find(([, code]) => code === teamCode);
  return hit ? hit[0] : teamCode;
}

export const REGISTRATION_LABEL: Readonly<Record<string, string>> = {
  VERIFIED: "Tesserato",
  UNVERIFIED: "Tesseramento da verificare",
  PENDING: "Tesseramento in corso",
  EXPIRED: "Tesseramento scaduto",
};

export function registrationLabel(status: string): string {
  return REGISTRATION_LABEL[status] ?? "Tesseramento da verificare";
}

export interface RosterSummary {
  total: number;
  minors: number;
  registrationToCheck: number;
  certificate: Record<CertState, number>;
}

export function rosterSummary(rows: readonly RosterRow[], todayIso: string): RosterSummary {
  const certificate: Record<CertState, number> = { scaduto: 0, "in-scadenza": 0, ok: 0, sconosciuto: 0 };
  let minors = 0;
  let registrationToCheck = 0;
  for (const r of rows) {
    certificate[certificateState(r.certificateExpiresAt, todayIso)] += 1;
    if (r.minor) minors += 1;
    if (r.registrationStatus !== "VERIFIED") registrationToCheck += 1;
  }
  return { total: rows.length, minors, registrationToCheck, certificate };
}

/** Rows of one team, sorted by surname-first display (Italian collation, accents folded). */
export function rosterOf(rows: readonly RosterRow[], teamCode: string): RosterRow[] {
  const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  return rows.filter((r) => r.teamCode === teamCode).sort((a, b) => fold(a.displayName).localeCompare(fold(b.displayName), "it"));
}

/** Teams the caller can see, in the order of the rows (already sorted by code in SQL), unique. */
export function rosterTeams(rows: readonly RosterRow[]): Array<{ code: string; name: string; status: string }> {
  const seen = new Map<string, { code: string; name: string; status: string }>();
  for (const r of rows) if (!seen.has(r.teamCode)) seen.set(r.teamCode, { code: r.teamCode, name: r.teamName, status: r.teamStatus });
  return [...seen.values()];
}
