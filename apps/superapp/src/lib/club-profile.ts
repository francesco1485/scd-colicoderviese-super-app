/**
 * Public profile of the club for the hall ("Chi siamo", "Squadre", "Contatti").
 *
 * Verified facts only. Values not confirmed by a source are left out on purpose:
 * founding year (contradictory sources), board officers (not in repo data),
 * Dervio street address (master: "da verificare").
 */
import { FACILITIES, type FacilitiesContract } from "./facilities";
import { VERIFIED_CHAMPIONSHIPS } from "./official-links";
import type { PublicGroup } from "./public-snapshots";

export const CLUB_PROFILE = {
  name: "S.C.D. ColicoDerviese",
  towns: ["Colico", "Dervio"] as const,
  area: "Alto Lago di Como, provincia di Lecco",
  season: "2026/27",
  figcMatricola: "26020",
  monza: {
    label: "Società affiliata AC Monza · progetto Academy",
    url: "https://www.acmonza.com/",
  },
  contacts: {
    email: "sportclubcolico@gmail.com",
    pec: "calciocolicoderviese@pec.it",
    site: "https://www.colicoderviese.it/",
    siteLabel: "www.colicoderviese.it",
    address: "Via Lido SNC, 23823 Colico (LC)",
  },
} as const;

export interface PitchFact {
  id: string;
  site: string;
  name: string;
  surface: string;
  size: string;
}

/** Pitches with surface and size from the facilities master (only fully known ones). */
export function pitchFacts(f: FacilitiesContract = FACILITIES): PitchFact[] {
  return f.spaces
    .filter((s) => s.type === "field" && s.surface && s.size?.text)
    .map((s) => ({
      id: s.id,
      site: f.sites.find((x) => x.id === s.site)?.short ?? s.site,
      name: s.name,
      surface: s.surface!,
      size: s.size!.text,
    }));
}

/** Catch-all buckets of the calendar master that are not teams. */
const NOT_A_TEAM = new Set(["other", "esordienti"]);
const WITHDRAWN = /\bU18\b|under\s?18|ritirat/i;

export interface HallTeam {
  id: string;
  label: string;
  color: string;
  logo: string | null;
  years: string[];
  matches: number;
  championship: { name: string; group: string } | null;
  /** Value for /calendario?annata=…, null when the team has no match in the calendar. */
  annata: string | null;
}

/** Order of the hall: first team, juniores, then youngest last. */
const ORDER = ["prima", "u19", "u16", "u15", "2014", "2015", "esordienti", "pulcini", "primicalci", "piccoli"];

/** Active teams from the calendar snapshot groups (withdrawn U18 and catch-all buckets excluded). */
export function hallTeams(groups: readonly PublicGroup[]): HallTeam[] {
  return groups
    .filter((g) => !NOT_A_TEAM.has(g.id) && !WITHDRAWN.test(g.label) && !WITHDRAWN.test(g.id))
    .map((g) => ({
      id: g.id,
      label: g.label,
      color: g.color,
      logo: g.logo,
      years: g.years,
      matches: g.count,
      championship: VERIFIED_CHAMPIONSHIPS[g.id] ?? null,
      annata: g.count > 0 ? (g.years[0] ?? g.id) : null,
    }))
    .sort((a, b) => rank(a.id) - rank(b.id));
}

function rank(id: string) {
  const i = ORDER.indexOf(id);
  return i === -1 ? ORDER.length : i;
}
