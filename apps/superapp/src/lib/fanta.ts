/**
 * Fantacalcio SCD (UD-094): pure rules shared by the page, the tabellino panel and the tests. The database (r92)
 * is the judge; this file only mirrors its limits so the interface can explain them before saving.
 */

export const ROSTER_SIZE = 11;
export const PER_TEAM_MAX = 4;
export const FANTA_TEAMS = ["prima", "u19", "u16", "u15"] as const;

export type FantaRole = "P" | "D" | "C" | "A";
export const ROLE_LABEL: Readonly<Record<FantaRole, string>> = {
  P: "Portiere",
  D: "Difensore",
  C: "Centrocampista",
  A: "Attaccante",
};
export const ROLES: readonly FantaRole[] = ["P", "D", "C", "A"];

/** Same table as scd_fantasy_leagues.rules written by r92. */
export const SCORING = {
  played: 1,
  goal: 3,
  goalGkDef: 4,
  assist: 1,
  yellow: -0.5,
  red: -1,
  cleanSheet: 1,
} as const;

export interface FantaCandidate {
  athleteId: string;
  team: string;
  name: string;
  adult: boolean;
  role: FantaRole | null;
  /** Points of the last recorded round, null when the athlete has none. */
  lastPoints: number | null;
}

export interface FantaMe {
  joined: boolean;
  displayName: string;
  editWeek: string;
  lockAt: string;
  roster: string[];
  monthPoints: number;
  seasonPoints: number;
  candidates: FantaCandidate[];
  lastDay: string | null;
}

export interface StandingRow {
  entryId: string;
  name: string;
  points: number;
}

export interface FantaStandings {
  month: string;
  players: number;
  monthTop: StandingRow[];
  seasonTop: StandingRow[];
}

export interface ReportPlayer {
  athleteId: string;
  displayName: string;
  birthYear: number | null;
  role: FantaRole | null;
  minutes: number;
  goals: number;
  assists: number;
  yellow: number;
  red: boolean;
  recorded: boolean;
}

export interface MatchReport {
  matchId: string;
  teamCode: string;
  startsAt: string;
  open: boolean;
  homeTeam: string;
  awayTeam: string;
  goalsFor: number | null;
  goalsAgainst: number | null;
  recordedAt: string | null;
  players: ReportPlayer[];
}

const isRole = (v: unknown): v is FantaRole =>
  v === "P" || v === "D" || v === "C" || v === "A";
const num = (v: unknown, d = 0): number =>
  typeof v === "number" && Number.isFinite(v)
    ? v
    : typeof v === "string" && v !== "" && Number.isFinite(Number(v))
      ? Number(v)
      : d;
const str = (v: unknown): string => (typeof v === "string" ? v : "");
const rec = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;

export function parseCandidate(v: unknown): FantaCandidate | null {
  const r = rec(v);
  if (!r || typeof r["athleteId"] !== "string" || typeof r["name"] !== "string")
    return null;
  return {
    athleteId: r["athleteId"],
    team: str(r["team"]),
    name: r["name"],
    adult: r["adult"] === true,
    role: isRole(r["role"]) ? r["role"] : null,
    lastPoints: r["lastPoints"] == null ? null : num(r["lastPoints"]),
  };
}

export function parseFantaMe(v: unknown): FantaMe | null {
  const r = rec(v);
  if (!r) return null;
  const cands = Array.isArray(r["candidates"])
    ? r["candidates"]
        .map(parseCandidate)
        .filter((c): c is FantaCandidate => c !== null)
    : [];
  return {
    joined: r["joined"] === true,
    displayName: str(r["displayName"]),
    editWeek: str(r["editWeek"]),
    lockAt: str(r["lockAt"]),
    roster: Array.isArray(r["roster"])
      ? r["roster"].filter((x): x is string => typeof x === "string")
      : [],
    monthPoints: num(r["monthPoints"]),
    seasonPoints: num(r["seasonPoints"]),
    candidates: cands,
    lastDay: typeof r["lastDay"] === "string" ? r["lastDay"] : null,
  };
}

function parseRows(v: unknown): StandingRow[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => {
      const r = rec(x);
      return r && typeof r["entryId"] === "string"
        ? {
            entryId: r["entryId"],
            name: str(r["name"]) || "Squadra",
            points: num(r["points"]),
          }
        : null;
    })
    .filter((x): x is StandingRow => x !== null);
}

export function parseStandings(v: unknown): FantaStandings {
  const r = rec(v);
  return {
    month: str(r?.["month"]),
    players: num(r?.["players"]),
    monthTop: parseRows(r?.["monthTop"]),
    seasonTop: parseRows(r?.["seasonTop"]),
  };
}

export function parseReport(v: unknown): MatchReport | null {
  const r = rec(v);
  if (!r || typeof r["match_id"] !== "string") return null;
  const players = Array.isArray(r["players"])
    ? r["players"]
        .map((x) => {
          const p = rec(x);
          if (!p || typeof p["athlete_id"] !== "string") return null;
          return {
            athleteId: p["athlete_id"],
            displayName: str(p["display_name"]).trim() || "Nome non indicato",
            birthYear:
              typeof p["birth_year"] === "number" ? p["birth_year"] : null,
            role: isRole(p["role"]) ? p["role"] : null,
            minutes: num(p["minutes"]),
            goals: num(p["goals"]),
            assists: num(p["assists"]),
            yellow: num(p["yellow"]),
            red: p["red"] === true,
            recorded: p["recorded"] === true,
          } satisfies ReportPlayer;
        })
        .filter((x): x is ReportPlayer => x !== null)
    : [];
  return {
    matchId: r["match_id"],
    teamCode: str(r["team_code"]),
    startsAt: str(r["starts_at"]),
    open: r["open"] === true,
    homeTeam: str(r["home_team"]),
    awayTeam: str(r["away_team"]),
    goalsFor: r["goals_for"] == null ? null : num(r["goals_for"]),
    goalsAgainst: r["goals_against"] == null ? null : num(r["goals_against"]),
    recordedAt: typeof r["recorded_at"] === "string" ? r["recorded_at"] : null,
    players,
  };
}

/** Why a roster cannot be saved as it stands, in the member's words; empty when it can. */
export function rosterProblems(
  ids: readonly string[],
  candidates: readonly FantaCandidate[],
): string[] {
  const out: string[] = [];
  const set = new Set(ids);
  if (set.size > ROSTER_SIZE) out.push(`Al massimo ${ROSTER_SIZE} giocatori.`);
  const byTeam = new Map<string, number>();
  for (const c of candidates)
    if (set.has(c.athleteId)) byTeam.set(c.team, (byTeam.get(c.team) ?? 0) + 1);
  for (const [team, n] of byTeam)
    if (n > PER_TEAM_MAX)
      out.push(
        `Al massimo ${PER_TEAM_MAX} giocatori per squadra (${TEAM_LABEL[team] ?? team}: ${n}).`,
      );
  return out;
}

/** Points one recorded performance earns (same arithmetic as scd_fanta_athlete_scores). */
export function performancePoints(
  p: {
    role: FantaRole | null;
    minutes: number;
    goals: number;
    assists: number;
    yellow: number;
    red: boolean;
  },
  goalsAgainst: number | null,
): number {
  let pts = 0;
  if (p.minutes > 0) pts += SCORING.played;
  pts +=
    p.goals *
    (p.role === "P" || p.role === "D" ? SCORING.goalGkDef : SCORING.goal);
  pts += p.assists * SCORING.assist;
  pts += p.yellow * SCORING.yellow;
  if (p.red) pts += SCORING.red;
  if (p.role === "P" && p.minutes >= 60 && goalsAgainst === 0)
    pts += SCORING.cleanSheet;
  return pts;
}

/** Problems of a report before saving: the database repeats the same checks. */
export function reportProblems(
  goalsFor: number,
  goalsAgainst: number,
  rows: readonly ReportPlayer[],
): string[] {
  const out: string[] = [];
  if (
    !Number.isInteger(goalsFor) ||
    !Number.isInteger(goalsAgainst) ||
    goalsFor < 0 ||
    goalsAgainst < 0 ||
    goalsFor > 30 ||
    goalsAgainst > 30
  )
    out.push("Indica il risultato finale.");
  const scored = rows.reduce((n, r) => n + r.goals, 0);
  if (scored > goalsFor)
    out.push(
      `I gol dei giocatori (${scored}) sono più dei gol segnati (${goalsFor}).`,
    );
  if (rows.some((r) => r.minutes < 0 || r.minutes > 130))
    out.push("Minuti tra 0 e 130.");
  if (
    rows.some(
      (r) =>
        r.minutes === 0 &&
        (r.goals > 0 || r.assists > 0 || r.yellow > 0 || r.red),
    )
  )
    out.push(
      "Un giocatore con 0 minuti non può avere gol, assist o cartellini.",
    );
  return out;
}

export const TEAM_LABEL: Readonly<Record<string, string>> = {
  prima: "Prima Squadra",
  u19: "Juniores U19",
  u16: "U16",
  u15: "U15",
};

export function fmtPoints(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ",");
}

export function fantaError(code: string): string {
  switch (code) {
    case "forbidden":
      return "Accedi con il tuo account per giocare.";
    case "name":
      return "Scegli un nome squadra di 2-24 caratteri, senza parole offensive.";
    case "size":
      return `Al massimo ${ROSTER_SIZE} giocatori.`;
    case "perTeam":
      return `Al massimo ${PER_TEAM_MAX} giocatori per squadra.`;
    case "candidate":
      return "Un giocatore scelto non è più disponibile: ricarica e riprova.";
    default:
      return "Salvataggio non riuscito, riprova.";
  }
}
