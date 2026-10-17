/**
 * Risultati & Classifiche — official LND data only (UD-181, Francesco DG 17/10/2026 12:33 «ok classifiche LND»).
 *
 * The app publishes standings and results only as copied from gare.lnd.it, always with the source link and the
 * fetch time. Nothing is computed, typed by hand or estimated: a missing value stays missing.
 * Attività di base teams (Piccoli Amici, Primi Calci, Pulcini, Esordienti) never have standings (SGS rule).
 *
 * This module is pure (no imports, no I/O) so that both the UI and the ingestion script
 * (scripts/ingest-lnd-standings.mjs, run with node --experimental-strip-types) use the same parser.
 * Until migration r116 is applied the UI reads the committed snapshot src/data/classifiche-lnd-snapshot.json.
 */

export const LND_HOST = "https://gare.lnd.it";
export const LND_SNAPSHOT_SCHEMA = "scd-classifiche-lnd-v1";

/** Planned refresh (not scheduled yet): every 6 hours, every hour on match weekends. */
export const LND_REFRESH_PLAN = "ogni 6 ore; ogni ora da venerdì 18:00 a lunedì 12:00";

export type CompetitionKind = "CAMPIONATO" | "COPPA";

export interface LndCompetitionRef {
  /** Stable id used in the app and in the snapshot. */
  id: string;
  /** Calendar group id of the SCD team (calendario-snapshot `groups`). */
  team: string;
  kind: CompetitionKind;
  committee: string;
  championship: string;
  group: string;
  /** Plain Italian label shown in the app. */
  label: string;
  groupLabel: string;
  /** False for cups: LND publishes no standings table for these groups. */
  hasStandings: boolean;
}

/**
 * The 4 championships and 3 cups of SCD competitive teams in 2026/27, VERIFIED on gare.lnd.it on 17/10/2026.
 */
export const LND_COMPETITIONS: readonly LndCompetitionRef[] = [
  { id: "prima-promozione-d", team: "prima", kind: "CAMPIONATO", committee: "lombardia", championship: "PR", group: "D", label: "Promozione", groupLabel: "Girone D", hasStandings: true },
  { id: "u19-juniores-elite-c", team: "u19", kind: "CAMPIONATO", committee: "lombardia", championship: "RI", group: "C", label: "Juniores Regionale U19 Élite", groupLabel: "Girone C", hasStandings: true },
  { id: "u16-allievi-elite-a", team: "u16", kind: "CAMPIONATO", committee: "lombardia", championship: "Y6", group: "A", label: "Allievi Regionali U16 Élite", groupLabel: "Girone A", hasStandings: true },
  { id: "u15-giovanissimi-so-a", team: "u15", kind: "CAMPIONATO", committee: "lombardia", championship: "GS", group: "A", label: "Giovanissimi Provinciali U15 Sondrio", groupLabel: "Girone A", hasStandings: true },
  { id: "prima-coppa-italia-11", team: "prima", kind: "COPPA", committee: "lombardia", championship: "CR", group: "11", label: "Coppa Italia Promozione", groupLabel: "Girone 11", hasStandings: false },
  { id: "u19-coppa-lombardia-6", team: "u19", kind: "COPPA", committee: "lombardia", championship: "CG", group: "6", label: "Coppa Lombardia Juniores U19 Élite", groupLabel: "Girone 6", hasStandings: false },
  { id: "u15-coppa-lombardia-15", team: "u15", kind: "COPPA", committee: "lombardia", championship: "DL", group: "15", label: "Coppa Lombardia Under 15", groupLabel: "Girone 15", hasStandings: false },
];

/** Short team names (calendar group id → label). */
export const LND_TEAM_LABEL: Readonly<Record<string, string>> = { prima: "Prima Squadra", u19: "Juniores U19", u16: "Under 16", u15: "Under 15" };

/** Calendar groups of the attività di base: no standings, no results tables, ever (SGS). */
export const BASE_ACTIVITY_GROUPS: ReadonlySet<string> = new Set(["piccoli", "primicalci", "pulcini", "esordienti", "2014", "2015"]);

export function isBaseActivityGroup(group: string): boolean {
  return BASE_ACTIVITY_GROUPS.has(group) || /^(piccoli|primi|pulcini|esordienti)/.test(group);
}

export function competitionUrl(c: Pick<LndCompetitionRef, "committee" | "championship" | "group">, matchday?: { number: number; leg: string }): string {
  const q = new URLSearchParams({ campionato: c.championship, girone: c.group });
  if (matchday) {
    q.set("giornata", String(matchday.number));
    q.set("leg", matchday.leg);
  }
  return `${LND_HOST}/competizione/${encodeURIComponent(c.committee)}?${q.toString().replace(/%2A/g, "*")}`;
}

/** JSON endpoint gare.lnd.it uses for its own standings panel. */
export function standingsApiUrl(c: Pick<LndCompetitionRef, "championship" | "group">, cr = "10"): string {
  return `${LND_HOST}/api/quadro-gare/girone/${cr}/${encodeURIComponent(c.championship)}/${encodeURIComponent(c.group)}/classifica`;
}

/** One standings row as published by LND: team, position, points, played, won, drawn, lost, goals for/against. */
export interface StandingRow {
  team: string;
  pos: number;
  pt: number;
  g: number;
  v: number;
  n: number;
  p: number;
  gf: number;
  gs: number;
}

export interface LndMatch {
  lndMatchId: number;
  date: string | null;
  time: string | null;
  home: string;
  away: string;
  homeGoals: number | null;
  awayGoals: number | null;
  played: boolean;
  /** LND outcome text, verbatim (e.g. "Da Giudice sportivo"). */
  label: string | null;
  rest: boolean;
}

export interface LndMatchday {
  number: number;
  leg: string;
  startDate: string | null;
  endDate: string | null;
}

export interface LndPage {
  championship: { code: string; name: string };
  group: { code: string; name: string };
  currentMatchday: LndMatchday | null;
  matchdays: LndMatchday[];
  matches: LndMatch[];
  standings: StandingRow[];
}

export class LndParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LndParseError";
  }
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);
const int = (v: unknown): number | null => (typeof v === "number" && Number.isInteger(v) ? v : null);
const realDate = (v: unknown): string | null => {
  const s = str(v);
  // LND uses 0001-01-01 for "no date".
  return s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !s.startsWith("0001") ? s : null;
};

function need(v: number | null, what: string): number {
  if (v === null || v < 0) throw new LndParseError(`standings: ${what} missing or invalid`);
  return v;
}

/** A standings row of the LND JSON (page props or API). Throws when a number is missing: never guessed. */
export function toStandingRow(raw: unknown): StandingRow {
  if (!isObj(raw)) throw new LndParseError("standings: row is not an object");
  const team = str(raw["team"]);
  if (!team) throw new LndParseError("standings: team missing");
  return {
    team,
    pos: need(int(raw["position"]), "position"),
    pt: need(int(raw["points"]), "points"),
    g: need(int(raw["played"]), "played"),
    v: need(int(raw["wins"]), "wins"),
    n: need(int(raw["draws"]), "draws"),
    p: need(int(raw["losses"]), "losses"),
    gf: need(int(raw["goalsFor"]), "goalsFor"),
    gs: need(int(raw["goalsAgainst"]), "goalsAgainst"),
  };
}

function toMatch(raw: unknown): LndMatch | null {
  if (!isObj(raw)) return null;
  const id = int(raw["id"]);
  const home = str(raw["home"]) ?? "";
  const away = str(raw["away"]) ?? "";
  if (id === null) return null;
  const played = raw["isPlayed"] === true;
  const hg = int(raw["homeGoals"]);
  const ag = int(raw["awayGoals"]);
  const time = str(raw["time"]);
  return {
    lndMatchId: id,
    date: realDate(raw["date"]),
    time: time && /^\d{2}:\d{2}/.test(time) ? time.slice(0, 5) : null,
    home,
    away,
    // LND sends 0-0 for matches not yet played: a score exists only when the match is played.
    homeGoals: played && hg !== null && hg >= 0 ? hg : null,
    awayGoals: played && ag !== null && ag >= 0 ? ag : null,
    played,
    label: str(raw["outcome"]),
    rest: raw["isRest"] === true || !home || !away,
  };
}

function toMatchday(raw: unknown): LndMatchday | null {
  if (!isObj(raw)) return null;
  const number = int(raw["number"]);
  const leg = str(raw["leg"]);
  if (number === null || !leg) return null;
  return { number, leg, startDate: realDate(raw["startDate"]), endDate: realDate(raw["endDate"]) };
}

/** Reads the Inertia page JSON embedded by gare.lnd.it (`<script data-page="app" type="application/json">`). */
export function extractPageJson(html: string): Record<string, unknown> {
  const m = /<script[^>]*data-page="app"[^>]*>([\s\S]*?)<\/script>/.exec(html);
  if (!m) throw new LndParseError("page: data-page script not found");
  let data: unknown;
  try {
    data = JSON.parse(m[1]!);
  } catch {
    throw new LndParseError("page: data-page is not JSON");
  }
  if (!isObj(data) || !isObj(data["props"])) throw new LndParseError("page: props missing");
  return data["props"];
}

/** Parses a gare.lnd.it competition page (championship + group, optionally a given matchday). */
export function parseLndPage(html: string): LndPage {
  const p = extractPageJson(html);
  if (p["step"] === "error") throw new LndParseError(`page: LND error (${str(p["message"]) ?? "servizio non raggiungibile"})`);
  if (p["step"] !== "dashboard") throw new LndParseError(`page: unexpected step ${String(p["step"])}`);
  const ch = isObj(p["championship"]) ? p["championship"] : {};
  const gr = isObj(p["group"]) ? p["group"] : {};
  const code = str(ch["code"]);
  const group = str(gr["code"]);
  if (!code || !group) throw new LndParseError("page: championship or group missing");
  return {
    championship: { code, name: str(ch["name"]) ?? code },
    group: { code: group, name: str(gr["name"]) ?? group },
    currentMatchday: toMatchday(p["currentMatchday"]),
    matchdays: (Array.isArray(p["matchdays"]) ? p["matchdays"] : []).map(toMatchday).filter((x): x is LndMatchday => x !== null),
    matches: (Array.isArray(p["matches"]) ? p["matches"] : []).map(toMatch).filter((x): x is LndMatch => x !== null),
    standings: (Array.isArray(p["standings"]) ? p["standings"] : []).map(toStandingRow),
  };
}

/** Parses the gare.lnd.it standings JSON (`{"standings":[...]}`). */
export function parseLndStandingsJson(text: string): StandingRow[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new LndParseError("standings api: not JSON");
  }
  if (!isObj(data) || !Array.isArray(data["standings"])) throw new LndParseError("standings api: standings missing");
  return data["standings"].map(toStandingRow);
}

/** Our club on LND: "COLICODERVIESE ASD" (matches) or "colicoderviese asd" (standings). */
const OURS = /colico\s*-?\s*derviese/i;
export const isOurTeam = (name: string): boolean => OURS.test(name);

/** Played matches of our club in a list, without rest days. */
export function ourPlayedMatches(matches: readonly LndMatch[]): LndMatch[] {
  return matches.filter((m) => !m.rest && m.played && m.homeGoals !== null && m.awayGoals !== null && (isOurTeam(m.home) || isOurTeam(m.away)));
}

// ------------------------------------------------------------------------------------------------ snapshot

export interface SnapshotResult {
  lnd_match_id: number;
  matchday: number | null;
  leg: string | null;
  date: string;
  time: string | null;
  home: string;
  away: string;
  home_goals: number;
  away_goals: number;
  lnd_label: string | null;
}

export interface SnapshotCompetition {
  id: string;
  team: string;
  kind: CompetitionKind;
  label: string;
  group_label: string;
  source_url: string;
  fetched_at: string;
  /** Null when LND publishes no table (cups) or it could not be read; see standings_note. */
  standings: StandingRow[] | null;
  standings_note: string | null;
  results: SnapshotResult[];
  results_note: string | null;
}

export interface LndSnapshot {
  schema: string;
  season: string;
  source: string;
  fetched_at: string;
  refresh_plan: string;
  competitions: SnapshotCompetition[];
}

/** Validates the committed snapshot; drops anything that does not match the shape (never patched). */
export function loadLndSnapshot(raw: unknown): LndSnapshot {
  const r = isObj(raw) ? raw : {};
  const comps = Array.isArray(r["competitions"]) ? r["competitions"] : [];
  const known = new Map(LND_COMPETITIONS.map((c) => [c.id, c]));
  const out: SnapshotCompetition[] = [];
  for (const c of comps) {
    if (!isObj(c)) continue;
    const ref = known.get(String(c["id"]));
    const url = str(c["source_url"]);
    const at = str(c["fetched_at"]);
    if (!ref || !url || !url.startsWith(`${LND_HOST}/`) || !at || Number.isNaN(Date.parse(at))) continue;
    if (isBaseActivityGroup(ref.team)) continue;
    let standings: StandingRow[] | null = null;
    if (ref.hasStandings && Array.isArray(c["standings"]) && c["standings"].length) {
      try {
        standings = c["standings"].map((s) =>
          toStandingRow(isObj(s) ? { team: s["team"], position: s["pos"], points: s["pt"], played: s["g"], wins: s["v"], draws: s["n"], losses: s["p"], goalsFor: s["gf"], goalsAgainst: s["gs"] } : s),
        );
      } catch {
        standings = null;
      }
    }
    const results: SnapshotResult[] = (Array.isArray(c["results"]) ? c["results"] : []).flatMap((x) => {
      if (!isObj(x)) return [];
      const id = int(x["lnd_match_id"]);
      const date = realDate(x["date"]);
      const hg = int(x["home_goals"]);
      const ag = int(x["away_goals"]);
      const home = str(x["home"]);
      const away = str(x["away"]);
      if (id === null || !date || hg === null || ag === null || hg < 0 || ag < 0 || !home || !away) return [];
      return [{ lnd_match_id: id, matchday: int(x["matchday"]), leg: str(x["leg"]), date, time: str(x["time"]), home, away, home_goals: hg, away_goals: ag, lnd_label: str(x["lnd_label"]) }];
    });
    out.push({
      id: ref.id,
      team: ref.team,
      kind: ref.kind,
      label: ref.label,
      group_label: ref.groupLabel,
      source_url: url,
      fetched_at: at,
      standings,
      standings_note: str(c["standings_note"]),
      results: results.sort((a, b) => b.date.localeCompare(a.date)),
      results_note: str(c["results_note"]),
    });
  }
  return {
    schema: str(r["schema"]) ?? LND_SNAPSHOT_SCHEMA,
    season: str(r["season"]) ?? "",
    source: str(r["source"]) ?? "gare.lnd.it",
    fetched_at: str(r["fetched_at"]) ?? "",
    refresh_plan: str(r["refresh_plan"]) ?? LND_REFRESH_PLAN,
    competitions: out,
  };
}

export function competitionsOfTeam(s: LndSnapshot, team: string): SnapshotCompetition[] {
  if (isBaseActivityGroup(team)) return [];
  return s.competitions.filter((c) => c.team === team);
}

/** Last results of a team across championship and cups, newest first. */
export function latestResults(s: LndSnapshot, team: string, limit = 5): (SnapshotResult & { competition: SnapshotCompetition })[] {
  return competitionsOfTeam(s, team)
    .flatMap((c) => c.results.map((r) => ({ ...r, competition: c })))
    .sort((a, b) => (b.date + (b.time ?? "")).localeCompare(a.date + (a.time ?? "")))
    .slice(0, limit);
}

export function ourStanding(rows: readonly StandingRow[] | null): StandingRow | null {
  return rows?.find((r) => isOurTeam(r.team)) ?? null;
}

export type Outcome = "V" | "N" | "P";

/** Outcome of an official result for our club: null when our name is on both sides or on neither. */
export function outcomeForUs(r: Pick<SnapshotResult, "home" | "away" | "home_goals" | "away_goals">): Outcome | null {
  const h = isOurTeam(r.home);
  const a = isOurTeam(r.away);
  if (h === a) return null;
  const us = h ? r.home_goals : r.away_goals;
  const them = h ? r.away_goals : r.home_goals;
  return us > them ? "V" : us === them ? "N" : "P";
}

/** Cup record (won / drawn / lost) counted from the official results in the snapshot; labelled as counted. */
export function cupRecord(c: SnapshotCompetition): { v: number; n: number; p: number; played: number } {
  const o = c.results.map(outcomeForUs).filter((x): x is Outcome => x !== null);
  return { v: o.filter((x) => x === "V").length, n: o.filter((x) => x === "N").length, p: o.filter((x) => x === "P").length, played: o.length };
}

/** LND outcome texts that mean the result is not final yet. */
export function pendingNote(label: string | null): string | null {
  if (!label) return null;
  return /attesa/i.test(label) ? "In attesa della decisione del Giudice sportivo" : null;
}

/** Display name: our club as ColicoDerviese, the others exactly as LND writes them (upper case). */
export function teamName(name: string): string {
  return isOurTeam(name) ? "ColicoDerviese" : name.toUpperCase();
}

/** "17/10/2026 alle 12:40" in Europe/Rome. */
export function fetchedLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "data non nota";
  const f = new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const parts = Object.fromEntries(f.formatToParts(d).map((p) => [p.type, p.value]));
  return `${parts["day"]}/${parts["month"]}/${parts["year"]} alle ${parts["hour"]}:${parts["minute"]}`;
}
