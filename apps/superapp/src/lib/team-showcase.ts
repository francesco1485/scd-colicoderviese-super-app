/**
 * «Vetrina squadre» (UD-168, Francesco DG 17/10/2026 11:27-11:28): the rosters of Prima Squadra, Juniores U19 Élite
 * and Allievi U16 Élite are public, without sign-in. The age rule is applied by the database (r142
 * scd_public_team_showcase): adults first name + surname, minors and unknown ages always first name + surname initial; no photos, birth dates, ages, towns or contacts. Pure logic here: parse the payload with
 * a whitelist (any field the database might add never reaches the page), label roles and unknown values.
 * Engine: PERSONE. Measure: visits to the three pages, share of players with a role, share with recorded stats.
 */
import { ROLE_LABEL, isRosterRole, type RosterRole } from "./public-roster";
import { CREST_SHARE_IMAGE, type SharePage } from "./share";

/** The only team codes whose roster is public. Must match scd_public_team_showcase (r142). */
export const SHOWCASE_TEAMS = ["prima", "u19", "u16"] as const;
export type ShowcaseTeam = (typeof SHOWCASE_TEAMS)[number];

export function isShowcaseTeam(id: string): id is ShowcaseTeam {
  return (SHOWCASE_TEAMS as readonly string[]).includes(id);
}

/** Public name of each showcase team (Direzione 17/10/2026). Championships: official-links VERIFIED_CHAMPIONSHIPS. */
export const SHOWCASE_LABEL: Readonly<Record<ShowcaseTeam, string>> = {
  prima: "Prima Squadra",
  u19: "Juniores U19 Élite",
  u16: "Allievi U16 Élite",
};

/** Link previews of the three public pages (pageHead): no player names, official club crest only. */
export const SHOWCASE_SHARE: Readonly<Record<ShowcaseTeam, SharePage>> = Object.fromEntries(
  SHOWCASE_TEAMS.map((t) => [
    t,
    {
      path: `/squadre/${t}`,
      title: `${SHOWCASE_LABEL[t]}: rosa, staff e statistiche | SCD ColicoDerviese`,
      description: `La rosa della ${SHOWCASE_LABEL[t]} della S.C.D. ColicoDerviese: giocatori, ruoli, staff e statistiche delle gare registrate. Aperta a tutti, senza registrazione.`,
      ogTitle: `${SHOWCASE_LABEL[t]} · S.C.D. ColicoDerviese`,
      shareText: `La rosa della ${SHOWCASE_LABEL[t]} della ColicoDerviese: giocatori, ruoli e statistiche.`,
      image: CREST_SHARE_IMAGE,
    },
  ]),
) as Record<ShowcaseTeam, SharePage>;

/** Stats from the recorded matches of the season; null = not recorded (shown «da confermare», never 0). */
export interface ShowcaseStats {
  matches: number;
  appearances: number;
  goals: number;
  yellow: number;
  red: number;
}

export interface ShowcasePlayer {
  key: string;
  name: string;
  role: RosterRole | null;
  shirt: number | null;
  stats: ShowcaseStats | null;
}

export interface ShowcaseStaff {
  name: string;
  role: string;
}

/**
 * ok: the database answered. pending: the function is not there yet (r142 not applied) or the read failed: the page
 * says «da confermare» instead of an empty roster. not-public: any team other than the three.
 */
export type ShowcaseState = "ok" | "pending" | "not-public";

export interface TeamShowcase {
  state: ShowcaseState;
  team: string;
  season: string | null;
  count: number | null;
  matchesRecorded: number | null;
  players: ShowcasePlayer[];
  staff: ShowcaseStaff[];
}

export function emptyShowcase(team: string, state: ShowcaseState): TeamShowcase {
  return { state, team, season: null, count: null, matchesRecorded: null, players: [], staff: [] };
}

const count = (v: unknown): number | null =>
  typeof v === "number" && Number.isInteger(v) && v >= 0 && v < 10_000 ? v : null;

/** Only "nome" or "Nome I." / "Nome Cognome" shapes: letters, spaces, apostrophes, dots, hyphens. Max 60 chars. */
const NAME_RE = /^[\p{L}][\p{L}' .-]{0,59}$/u;
const ROLE_TEXT_RE = /^[\p{L}][\p{L}' ./()-]{0,59}$/u;

function parseStats(v: unknown): ShowcaseStats | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;
  const s = {
    matches: count(o["matches"]),
    appearances: count(o["appearances"]),
    goals: count(o["goals"]),
    yellow: count(o["yellow"]),
    red: count(o["red"]),
  };
  if (Object.values(s).some((x) => x === null)) return null;
  return s as ShowcaseStats;
}

/**
 * Parses scd_public_team_showcase. Whitelist: key, name, role, shirt, stats per player; name and role per staff.
 * Malformed rows are dropped; an unavailable team becomes "pending" (the page says «da confermare»).
 */
export function parseShowcase(team: string, raw: unknown): TeamShowcase {
  if (!isShowcaseTeam(team)) return emptyShowcase(team, "not-public");
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return emptyShowcase(team, "pending");
  const o = raw as Record<string, unknown>;
  if (o["available"] !== true || o["team"] !== team) return emptyShowcase(team, "pending");
  const players: ShowcasePlayer[] = [];
  if (Array.isArray(o["players"])) {
    for (const p of o["players"]) {
      if (!p || typeof p !== "object") continue;
      const r = p as Record<string, unknown>;
      const key = typeof r["key"] === "string" && /^p\d{1,4}$/.test(r["key"]) ? r["key"] : null;
      const name = typeof r["name"] === "string" ? r["name"].replace(/\s+/g, " ").trim() : "";
      if (!key || !NAME_RE.test(name)) continue;
      const shirt = count(r["shirt"]);
      players.push({
        key,
        name,
        role: isRosterRole(r["role"]) ? r["role"] : null,
        shirt: shirt !== null && shirt >= 1 && shirt <= 99 ? shirt : null,
        stats: parseStats(r["stats"]),
      });
    }
  }
  const staff: ShowcaseStaff[] = [];
  if (Array.isArray(o["staff"])) {
    for (const s of o["staff"]) {
      if (!s || typeof s !== "object") continue;
      const r = s as Record<string, unknown>;
      const name = typeof r["name"] === "string" ? r["name"].replace(/\s+/g, " ").trim() : "";
      const role = typeof r["role"] === "string" ? r["role"].replace(/\s+/g, " ").trim() : "";
      if (!NAME_RE.test(name) || !ROLE_TEXT_RE.test(role)) continue;
      staff.push({ name, role });
    }
  }
  return {
    state: "ok",
    team,
    season: typeof o["season"] === "string" && /^\d{4}\/\d{4}$/.test(o["season"]) ? o["season"] : null,
    count: count(o["count"]) ?? players.length,
    matchesRecorded: count(o["matchesRecorded"]),
    players,
    staff,
  };
}

export const UNKNOWN = "da confermare";

/** «Portiere», … or «ruolo da confermare» (today no player has a role: 0 of 315). */
export function showcaseRole(role: RosterRole | null): string {
  return role ? ROLE_LABEL[role] : `ruolo ${UNKNOWN}`;
}

/** A number or «da confermare»: an unrecorded value is never shown as 0. */
export function statText(v: number | null | undefined): string {
  return typeof v === "number" ? String(v) : UNKNOWN;
}

export interface ShowcaseSection {
  role: RosterRole | null;
  label: string;
  players: ShowcasePlayer[];
}

const ORDER: readonly (RosterRole | null)[] = ["P", "D", "C", "A", null];
const SECTION_LABEL: Readonly<Record<RosterRole, string>> = {
  P: "Portieri",
  D: "Difensori",
  C: "Centrocampisti",
  A: "Attaccanti",
};

/** Players by role (P, D, C, A), unknown roles last under «Ruolo da confermare». */
export function showcaseSections(players: readonly ShowcasePlayer[]): ShowcaseSection[] {
  return ORDER.map((role) => ({
    role,
    label: role ? SECTION_LABEL[role] : "Ruolo da confermare",
    players: players.filter((p) => p.role === role),
  })).filter((s) => s.players.length > 0);
}

/** One line under the roster about where the numbers come from. */
export function statsSourceLine(s: Pick<TeamShowcase, "matchesRecorded" | "season">): string {
  const season = s.season ? ` ${s.season}` : "";
  if (!s.matchesRecorded)
    return `Statistiche${season}: ${UNKNOWN}, nessuna gara ancora registrata nel tabellino ufficiale della società.`;
  return `Statistiche${season} dai tabellini registrati: ${s.matchesRecorded} ${s.matchesRecorded === 1 ? "gara" : "gare"}. Dove manca il dato: ${UNKNOWN}.`;
}
