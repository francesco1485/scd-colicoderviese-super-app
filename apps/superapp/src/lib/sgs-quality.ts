/**
 * SGS youth club quality system (typed view of `config/sgs-quality-system.v1.json`).
 *
 * The JSON at the repository root holds the PUBLIC rules of the FIGC SGS
 * "Sistema di Qualità dei Club Giovanili" (C.U. n.18 SGS, Manuale 2026): levels,
 * deadlines, roles and criteria with their obligation per level, coaching rules
 * and the organizational score table. This module adds the pure logic the
 * organigram page needs:
 * - what is mandatory for a target level;
 * - deadlines with days left (Europe/Rome calendar dates);
 * - role and criterion gaps from a club status;
 * - team-by-team coaching check, including the "Non Classificato" risk;
 * - organizational score (best item per group) against the level threshold.
 *
 * The club status is private (who covers what) and never lives in the repo: it
 * arrives from the server (env SCD_SGS_STATUS_JSON) and contains statuses and
 * qualification codes only, no names. Unknown stays UNKNOWN, never "ok".
 */
import rulesJson from "../../../../config/sgs-quality-system.v1.json";

export type Obligation = "O" | "R" | "N";
export type Level = 1 | 2 | 3 | 4 | 5;
export type CoverStatus = "COVERED" | "TO_VERIFY" | "MISSING" | "UNKNOWN";
export type CategoryId =
  | "piccoli-amici"
  | "primi-calci"
  | "pulcini"
  | "esordienti"
  | "giovanissimi"
  | "allievi"
  | "juniores";

export interface Requirement {
  id: string;
  label: string;
  levels: Obligation[];
  requirement?: string;
  qualifications?: string[];
  area?: string;
}

export interface Deadline {
  id: string;
  date: string;
  fromLevel: number;
  label: string;
  note?: string;
}

export interface Category {
  id: CategoryId;
  label: string;
  group: "base" | "agonistica" | "altra";
  births?: string;
  minPlayers?: number;
  maxPlayersPerTeam?: number;
  coachRatio?: number;
  fromLevel?: number;
  note?: string;
}

export interface ScoreItem {
  id: string;
  group: string;
  label: string;
  points: number;
}

export interface QualityRules {
  schema: string;
  season: string;
  source: { id: string; title: string; date: string; url: string; readOn: string };
  targetLevel: number;
  levels: { level: number; name: string; access: string; organizationalMinScore: number }[];
  deadlines: Deadline[];
  qualifications: Record<string, string>;
  qualificationGroups: Record<"uefaCoach" | "youthHead" | "smallAgesAlternative" | "level3ExtraTeam" | "goalkeeperCoach", string[]>;
  categories: Category[];
  coachingRules: string[];
  organizational: Requirement[];
  criteria: Requirement[];
  mandatoryEvents: { id: string; label: string; fromLevel: number }[];
  qualifyingProjects: {
    fromLevel: number;
    rule: string;
    options: { id: string; label: string; startThisSeason: boolean; note?: string }[];
  };
  organizationalScoring: { note: string; items: ScoreItem[] };
}

export const SGS_RULES = rulesJson as unknown as QualityRules;

/* ------------------------------------------------------------ validation */

const OBLIGATIONS: readonly Obligation[] = ["O", "R", "N"];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Structural problems of the rules file (empty = valid). */
export function validateRules(rules: QualityRules = SGS_RULES): string[] {
  const out: string[] = [];
  const ids = new Set<string>();
  for (const r of [...rules.organizational, ...rules.criteria]) {
    if (ids.has(r.id)) out.push(`duplicate id ${r.id}`);
    ids.add(r.id);
    if (r.levels.length !== 5 || r.levels.some((o) => !OBLIGATIONS.includes(o)))
      out.push(`${r.id}: levels must be 5 codes O/R/N`);
    // An obligation never weakens at a higher level.
    const rank = (o: Obligation) => (o === "O" ? 2 : o === "R" ? 1 : 0);
    for (let i = 1; i < r.levels.length; i++)
      if (rank(r.levels[i]!) < rank(r.levels[i - 1]!)) out.push(`${r.id}: obligation weakens at level ${i + 1}`);
  }
  for (const d of rules.deadlines) if (!ISO_DATE.test(d.date)) out.push(`deadline ${d.id}: bad date`);
  const thresholds = rules.levels.map((l) => l.organizationalMinScore);
  if (thresholds.some((t, i) => i > 0 && t <= thresholds[i - 1]!)) out.push("score thresholds must grow with the level");
  for (const q of Object.values(rules.qualificationGroups).flat())
    if (!(q in rules.qualifications)) out.push(`unknown qualification ${q}`);
  return out;
}

/* ------------------------------------------------------------ obligations */

export function obligationAt(req: Requirement, level: Level): Obligation {
  return req.levels[level - 1] ?? "N";
}

/** Requirements with the given obligation at a level. */
export function requirementsAt(list: readonly Requirement[], level: Level, ob: Obligation = "O"): Requirement[] {
  return list.filter((r) => obligationAt(r, level) === ob);
}

export function minScore(level: Level, rules: QualityRules = SGS_RULES): number {
  return rules.levels.find((l) => l.level === level)?.organizationalMinScore ?? 0;
}

/* ------------------------------------------------------------ deadlines */

export type DeadlineState = "passed" | "due-soon" | "upcoming";

export interface DeadlineView extends Deadline {
  daysLeft: number;
  state: DeadlineState;
}

/** Whole days from `fromIso` to `toIso` (both YYYY-MM-DD). */
export function daysBetween(fromIso: string, toIso: string): number {
  const a = Date.UTC(+fromIso.slice(0, 4), +fromIso.slice(5, 7) - 1, +fromIso.slice(8, 10));
  const b = Date.UTC(+toIso.slice(0, 4), +toIso.slice(5, 7) - 1, +toIso.slice(8, 10));
  return Math.round((b - a) / 86_400_000);
}

/** Deadlines that apply to a level, ordered by date, with days left from `today`. */
export function deadlinesFor(level: Level, today: string, soonDays = 21, rules: QualityRules = SGS_RULES): DeadlineView[] {
  return rules.deadlines
    .filter((d) => d.fromLevel <= level)
    .map((d) => {
      const daysLeft = daysBetween(today, d.date);
      const state: DeadlineState = daysLeft < 0 ? "passed" : daysLeft <= soonDays ? "due-soon" : "upcoming";
      return { ...d, daysLeft, state };
    })
    .sort((x, y) => x.date.localeCompare(y.date));
}

/* ------------------------------------------------------------ club status */

export interface TeamStatus {
  /** Stable slug, e.g. "u16-elite". */
  id: string;
  label: string;
  category: CategoryId;
  /** Qualification code of the head coach (see rules.qualifications); UNKNOWN when not checked. */
  headCoach: string;
}

export interface ClubStatus {
  asOf: string;
  source: string;
  /** Whether the Dichiarazione di Impegno was sent by 30/09 and for which level. */
  declaration: { sent: "YES" | "NO" | "UNKNOWN"; level: number | null };
  roles: Record<string, CoverStatus>;
  criteria: Record<string, CoverStatus>;
  teams: TeamStatus[];
  /** Registered players per category; null = not counted yet. */
  players: Partial<Record<CategoryId, number | null>>;
  /** Score items the club meets (ids of rules.organizationalScoring.items). */
  scoreItems: string[] | null;
}

const COVER: readonly CoverStatus[] = ["COVERED", "TO_VERIFY", "MISSING", "UNKNOWN"];

/** Status used when the server has no private status: everything UNKNOWN. */
export function emptyStatus(): ClubStatus {
  return { asOf: "", source: "", declaration: { sent: "UNKNOWN", level: null }, roles: {}, criteria: {}, teams: [], players: {}, scoreItems: null };
}

/**
 * Parses the private status (env SCD_SGS_STATUS_JSON). Anything malformed is
 * dropped, never guessed; names are refused (only ids, codes and counts pass).
 */
export function parseStatus(raw: string | undefined, rules: QualityRules = SGS_RULES): ClubStatus {
  const out = emptyStatus();
  if (!raw || !raw.trim()) return out;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return out;
  }
  if (!data || typeof data !== "object") return out;
  const d = data as Record<string, unknown>;
  if (typeof d["asOf"] === "string" && ISO_DATE.test(d["asOf"])) out.asOf = d["asOf"];
  if (typeof d["source"] === "string") out.source = d["source"].slice(0, 200);
  const decl = d["declaration"] as Record<string, unknown> | undefined;
  if (decl && (decl["sent"] === "YES" || decl["sent"] === "NO" || decl["sent"] === "UNKNOWN")) {
    out.declaration.sent = decl["sent"];
    const lv = decl["level"];
    out.declaration.level = typeof lv === "number" && lv >= 1 && lv <= 5 ? lv : null;
  }
  const knownRoles = new Set(rules.organizational.map((r) => r.id));
  const knownCriteria = new Set(rules.criteria.map((r) => r.id));
  const takeMap = (v: unknown, known: Set<string>) => {
    const m: Record<string, CoverStatus> = {};
    if (v && typeof v === "object")
      for (const [k, s] of Object.entries(v as Record<string, unknown>))
        if (known.has(k) && COVER.includes(s as CoverStatus)) m[k] = s as CoverStatus;
    return m;
  };
  out.roles = takeMap(d["roles"], knownRoles);
  out.criteria = takeMap(d["criteria"], knownCriteria);
  const cats = new Set(rules.categories.map((c) => c.id));
  if (Array.isArray(d["teams"]))
    for (const t of d["teams"]) {
      if (!t || typeof t !== "object") continue;
      const r = t as Record<string, unknown>;
      const id = typeof r["id"] === "string" && /^[a-z0-9-]{1,40}$/.test(r["id"]) ? r["id"] : null;
      const label = typeof r["label"] === "string" ? r["label"].slice(0, 60) : null;
      const category = typeof r["category"] === "string" && cats.has(r["category"] as CategoryId) ? (r["category"] as CategoryId) : null;
      const coach = typeof r["headCoach"] === "string" && r["headCoach"] in rules.qualifications ? r["headCoach"] : "UNKNOWN";
      if (id && label && category) out.teams.push({ id, label, category, headCoach: coach });
    }
  const players = d["players"];
  if (players && typeof players === "object")
    for (const [k, v] of Object.entries(players as Record<string, unknown>))
      if (cats.has(k as CategoryId)) out.players[k as CategoryId] = typeof v === "number" && v >= 0 && Number.isInteger(v) ? v : null;
  const items = new Set(rules.organizationalScoring.items.map((i) => i.id));
  if (Array.isArray(d["scoreItems"])) out.scoreItems = (d["scoreItems"] as unknown[]).filter((x): x is string => typeof x === "string" && items.has(x));
  return out;
}

/* ------------------------------------------------------------ gaps */

export interface RequirementRow {
  req: Requirement;
  obligation: Obligation;
  status: CoverStatus;
  /** Mandatory at the level and not covered (MISSING). */
  gap: boolean;
  /** Mandatory at the level and not confirmed (TO_VERIFY or UNKNOWN). */
  open: boolean;
}

/** Rows for the requirements that are mandatory or recommended at the level, mandatory first. */
export function requirementRows(list: readonly Requirement[], level: Level, statuses: Record<string, CoverStatus>): RequirementRow[] {
  const rows = list
    .map((req) => {
      const obligation = obligationAt(req, level);
      const status = statuses[req.id] ?? "UNKNOWN";
      return { req, obligation, status, gap: obligation === "O" && status === "MISSING", open: obligation === "O" && (status === "TO_VERIFY" || status === "UNKNOWN") };
    })
    .filter((r) => r.obligation !== "N");
  return rows.sort((a, b) => (a.obligation === b.obligation ? 0 : a.obligation === "O" ? -1 : 1));
}

/* ------------------------------------------------------------ coaching */

export type TeamCheck = "ok" | "gap" | "verify";

export interface TeamRow {
  team: TeamStatus;
  /** True when this team carries the category's mandatory UEFA slot. */
  mandatorySlot: boolean;
  check: TeamCheck;
  reason: string;
}

export interface CategoryRow {
  category: Category;
  teams: number;
  /** ok: obligation met; gap: not met; verify: depends on unchecked qualifications; absent: no team. */
  check: TeamCheck | "absent";
  players: number | null;
  /** Players below the minimum (null when not counted). */
  belowMinimum: boolean | null;
  /** Fewer teams than required by the players-per-team ratio (null when not counted). */
  tooFewTeams: boolean | null;
}

export interface CoachingResult {
  teams: TeamRow[];
  categories: CategoryRow[];
  /** A mandatory coaching slot is not covered: the club would be "Non Classificato". */
  unclassifiedRisk: "yes" | "no" | "unknown";
}

const SMALL_AGES: readonly CategoryId[] = ["piccoli-amici", "primi-calci"];

/** Mandatory-slot qualification: UEFA (or ante 1998); for Piccoli Amici/Primi Calci also the small-ages alternatives. */
export function meetsMandatory(category: CategoryId, q: string, rules: QualityRules = SGS_RULES): boolean {
  const g = rules.qualificationGroups;
  return g.uefaCoach.includes(q) || (SMALL_AGES.includes(category) && g.smallAgesAlternative.includes(q));
}

/** 3rd level, any other team: mandatory qualification or Grassroots Livello E. */
export function meetsLevel3Extra(category: CategoryId, q: string, rules: QualityRules = SGS_RULES): boolean {
  return meetsMandatory(category, q, rules) || rules.qualificationGroups.level3ExtraTeam.includes(q);
}

/**
 * Team-by-team check.
 * - Giovanissimi and Allievi: every team is a mandatory slot (UEFA).
 * - Base categories: at least one team per category with the mandatory qualification;
 *   the best-qualified team carries the slot.
 * - From the 3rd level every other team needs UEFA or Livello E (alternatives for the small ages).
 * - Juniores is not a mandatory category: from the 3rd level it follows the "other team" rule.
 */
export function checkCoaching(status: ClubStatus, level: Level, rules: QualityRules = SGS_RULES): CoachingResult {
  const rows: TeamRow[] = [];
  const cats: CategoryRow[] = [];
  let anyGap = false;
  let anyVerify = false;

  for (const category of rules.categories) {
    const teams = status.teams.filter((t) => t.category === category.id);
    const players = status.players[category.id] ?? null;
    const applies = !category.fromLevel || level >= category.fromLevel || category.group === "base";
    let check: CategoryRow["check"];

    if (category.group === "agonistica") {
      let catCheck: TeamCheck = "ok";
      for (const team of teams) {
        const r = mandatoryRow(team, true, rules);
        rows.push(r);
        if (r.check === "gap") catCheck = "gap";
        else if (r.check === "verify" && catCheck === "ok") catCheck = "verify";
      }
      check = teams.length === 0 ? "absent" : catCheck;
      if (applies && level >= 3 && teams.length === 0) anyGap = true;
    } else if (category.group === "base") {
      const best = [...teams].sort((a, b) => rankQualification(category.id, b.headCoach, rules) - rankQualification(category.id, a.headCoach, rules));
      const slot = best[0];
      for (const team of teams) {
        if (team === slot) rows.push(mandatoryRow(team, true, rules));
        else rows.push(extraRow(team, level, rules));
      }
      if (!slot) check = "absent";
      else check = rows.find((r) => r.team === slot)!.check;
    } else {
      for (const team of teams) rows.push(extraRow(team, level, rules));
      check = teams.length === 0 ? "absent" : rows.filter((r) => r.team.category === category.id).some((r) => r.check === "gap") ? "gap" : rows.filter((r) => r.team.category === category.id).some((r) => r.check === "verify") ? "verify" : "ok";
    }

    if (category.group !== "altra") {
      if (check === "gap") anyGap = true;
      if (check === "verify") anyVerify = true;
      if (check === "absent" && category.group === "base") anyGap = true;
    }

    const belowMinimum = players === null || category.minPlayers === undefined ? null : players < category.minPlayers;
    const tooFewTeams =
      players === null || category.maxPlayersPerTeam === undefined ? null : teams.length < Math.ceil(players / category.maxPlayersPerTeam);
    cats.push({ category, teams: teams.length, check, players, belowMinimum, tooFewTeams });
  }

  const unclassifiedRisk = status.teams.length === 0 ? "unknown" : anyGap ? "yes" : anyVerify ? "unknown" : "no";
  return { teams: rows, categories: cats, unclassifiedRisk };
}

function rankQualification(category: CategoryId, q: string, rules: QualityRules): number {
  if (rules.qualificationGroups.uefaCoach.includes(q)) return 4;
  if (meetsMandatory(category, q, rules)) return 3;
  if (q === "UNKNOWN") return 2;
  if (rules.qualificationGroups.level3ExtraTeam.includes(q)) return 1;
  return 0;
}

function mandatoryRow(team: TeamStatus, mandatorySlot: boolean, rules: QualityRules): TeamRow {
  if (team.headCoach === "UNKNOWN") return { team, mandatorySlot, check: "verify", reason: "Squadra obbligatoria: verificare sul Portale la qualifica UEFA dell'allenatore." };
  if (meetsMandatory(team.category, team.headCoach, rules)) return { team, mandatorySlot, check: "ok", reason: `${rules.qualifications[team.headCoach]}: requisito obbligatorio coperto.` };
  return {
    team,
    mandatorySlot,
    check: "gap",
    reason: SMALL_AGES.includes(team.category)
      ? "Serve un allenatore UEFA, un preparatore atletico dell'albo, un laureato in Scienze Motorie o un diplomato ISEF."
      : "Serve un allenatore con qualifica UEFA: senza, il club risulta \"Non Classificato\".",
  };
}

function extraRow(team: TeamStatus, level: Level, rules: QualityRules): TeamRow {
  if (level < 3) return { team, mandatorySlot: false, check: "ok", reason: "Squadra aggiuntiva: al 1° e 2° livello è raccomandato un tecnico qualificato." };
  if (team.headCoach === "UNKNOWN") return { team, mandatorySlot: false, check: "verify", reason: "3° livello: verificare se l'allenatore ha UEFA o il corso Grassroots Livello E." };
  if (meetsLevel3Extra(team.category, team.headCoach, rules)) return { team, mandatorySlot: false, check: "ok", reason: `${rules.qualifications[team.headCoach]}: valido per il 3° livello.` };
  return { team, mandatorySlot: false, check: "gap", reason: "3° livello: serve UEFA oppure il corso SGS Grassroots Livello E." };
}

/* ------------------------------------------------------------ score */

export interface ScoreResult {
  points: number;
  threshold: number;
  reached: boolean;
  /** Best item counted for each group. */
  counted: ScoreItem[];
}

/** Organizational score: for each group only the highest item met counts. Null items = not assessed. */
export function organizationalScore(itemIds: readonly string[] | null, level: Level, rules: QualityRules = SGS_RULES): ScoreResult | null {
  if (itemIds === null) return null;
  const met = rules.organizationalScoring.items.filter((i) => itemIds.includes(i.id));
  const best = new Map<string, ScoreItem>();
  for (const i of met) {
    const cur = best.get(i.group);
    if (!cur || i.points > cur.points) best.set(i.group, i);
  }
  const counted = [...best.values()];
  const points = counted.reduce((s, i) => s + i.points, 0);
  const threshold = minScore(level, rules);
  return { points, threshold, reached: points >= threshold, counted };
}

/* ------------------------------------------------------------ summary */

export interface QualitySummary {
  level: Level;
  missing: number;
  open: number;
  covered: number;
  mandatoryTotal: number;
}

/** Counts across mandatory roles and criteria at the level. */
export function summarize(status: ClubStatus, level: Level, rules: QualityRules = SGS_RULES): QualitySummary {
  const rows = [
    ...requirementRows(rules.organizational, level, status.roles),
    ...requirementRows(rules.criteria, level, status.criteria),
  ].filter((r) => r.obligation === "O");
  return {
    level,
    missing: rows.filter((r) => r.gap).length,
    open: rows.filter((r) => r.open).length,
    covered: rows.filter((r) => r.status === "COVERED").length,
    mandatoryTotal: rows.length,
  };
}

export const COVER_LABEL: Readonly<Record<CoverStatus, string>> = {
  COVERED: "coperto",
  TO_VERIFY: "da verificare",
  MISSING: "mancante",
  UNKNOWN: "non ancora rilevato",
};

export const OBLIGATION_LABEL: Readonly<Record<Obligation, string>> = {
  O: "obbligatorio",
  R: "raccomandato",
  N: "non obbligatorio",
};
