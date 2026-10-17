/**
 * Verifica mensile della Segreteria (UD-181): for each team and month, what is missing in the Area squadra.
 * Pure function: the server feeds it the official calendar copy, the match status rows of r117
 * (scd_staff_match_status) and the training sessions of r118 (scd_office_training_month). Nothing is invented:
 * a match with no row in the database simply has everything to fill in.
 *
 * The output becomes «richieste di integrazione o giustificazione» only when a person of the Segreteria presses
 * «Crea le richieste» (scd_office_create_gap_requests). NOTHING is scheduled: the planned schedule below waits for
 * Francesco's approval.
 */

export const MONTHLY_CHECK_PLAN = {
  /** 1st of each month at 08:00 Europe/Rome, for the month just ended. */
  cron: "0 8 1 * *",
  timezone: "Europe/Rome",
  status: "PROPOSED_NOT_SCHEDULED",
  text: "Proposta: il 1° di ogni mese alle 8:00 la verifica del mese appena finito è pronta per la Segreteria, che controlla e crea le richieste. Non è ancora programmata: serve l'ok di Francesco.",
} as const;

export const GAP_KINDS = ["CONVOCAZIONE", "DISTINTA", "TABELLINO", "RESOCONTO", "REFERTO", "PRESENZE"] as const;
export type GapKind = (typeof GAP_KINDS)[number];
export type MatchGapKind = Exclude<GapKind, "PRESENZE">;

export const GAP_LABEL: Readonly<Record<GapKind, string>> = {
  CONVOCAZIONE: "convocazione",
  DISTINTA: "distinta",
  TABELLINO: "tabellino",
  RESOCONTO: "resoconto",
  REFERTO: "referto",
  PRESENZE: "presenze",
};

/** What the request says is missing, with the right article. */
export const MISSING_TEXT: Readonly<Record<GapKind, string>> = {
  CONVOCAZIONE: "manca la convocazione",
  DISTINTA: "manca la distinta pronta",
  TABELLINO: "manca il tabellino",
  RESOCONTO: "manca il resoconto",
  REFERTO: "manca il referto",
  PRESENZE: "mancano le presenze",
};

/**
 * Items required for every played match (PROPOSED, to be confirmed by the Direzione: e.g. whether the attività di base
 * needs a referto). One list for every team, no team hard-coded: teams created later are checked the same way.
 */
export const REQUIRED_MATCH_ITEMS: readonly MatchGapKind[] = ["CONVOCAZIONE", "DISTINTA", "TABELLINO", "RESOCONTO", "REFERTO"];

/** Calendar types that are one match each (a TORNEO day is many matches and is not checked here). */
const CHECKED_TYPES = new Set(["CAMPIONATO", "COPPA", "AMICHEVOLE"]);

export interface CalendarMatch {
  id: string;
  date: string;
  group: string;
  type: string;
  opponent: string;
}

export interface MatchStatusRow {
  sourceRecordId: string;
  callupsSent: number;
  sheetStatus: string;
  tabellino: boolean;
  hasSummary: boolean;
  hasReferto: boolean;
}

export interface SessionRow {
  id: string;
  teamCode: string;
  /** ISO instant. */
  startsAt: string;
  status: string;
  recorded: number;
}

export interface GapItem {
  kind: GapKind;
  /** Calendar id for matches, session id for trainings. */
  ref: string;
  label: string;
}

export interface TeamGaps {
  teamCode: string;
  label: string;
  items: GapItem[];
}

export interface MonthlyInput {
  /** "2026-10" */
  month: string;
  /** Today in Rome, "2026-11-01": only what happened before today is checked. */
  today: string;
  matches: readonly CalendarMatch[];
  statuses: readonly MatchStatusRow[];
  sessions: readonly SessionRow[];
  /** Calendar group id → team code in the database. */
  teamCodeOf: (group: string) => string;
  /** Team code → short label for people ("U15"). */
  teamLabel: (teamCode: string) => string;
  required?: readonly MatchGapKind[];
}

export function isMonth(v: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(v);
}

/** "2026-11-01" → "2026-10". */
export function previousMonth(today: string): string {
  const [y, m] = today.split("-").map(Number) as [number, number];
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
}

/** "2026-10" → "2026-10-01" (the database month key). */
export function monthStart(month: string): string {
  return `${month}-01`;
}

export function monthLabel(month: string): string {
  const s = new Intl.DateTimeFormat("it-IT", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-15T12:00:00Z`));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function romeDate(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}

function shortDate(date: string): string {
  const [, m, d] = date.split("-");
  return `${d}/${m}`;
}

function titleCaseWord(s: string): string {
  return s
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function missingFor(status: MatchStatusRow | undefined, required: readonly MatchGapKind[]): MatchGapKind[] {
  return required.filter((k) => {
    if (!status) return true;
    switch (k) {
      case "CONVOCAZIONE":
        return status.callupsSent <= 0;
      case "DISTINTA":
        return status.sheetStatus !== "READY";
      case "TABELLINO":
        return !status.tabellino;
      case "RESOCONTO":
        return !status.hasSummary;
      case "REFERTO":
        return !status.hasReferto;
    }
  });
}

/** What is missing, team by team, for one month. Teams with nothing missing are left out. */
export function monthlyGaps(input: MonthlyInput): TeamGaps[] {
  if (!isMonth(input.month)) return [];
  const required = input.required ?? REQUIRED_MATCH_ITEMS;
  const byId = new Map(input.statuses.map((s) => [s.sourceRecordId, s]));
  const teams = new Map<string, GapItem[]>();
  const push = (team: string, item: GapItem) => {
    const list = teams.get(team) ?? [];
    list.push(item);
    teams.set(team, list);
  };

  const matches = input.matches
    .filter((e) => e.group && e.group !== "other" && CHECKED_TYPES.has(e.type.toUpperCase()))
    .filter((e) => e.date.startsWith(`${input.month}-`) && e.date < input.today)
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  for (const e of matches) {
    const team = input.teamCodeOf(e.group);
    const missing = missingFor(byId.get(e.id), required);
    if (!missing.length) continue;
    const who = `${input.teamLabel(team)} contro ${titleCaseWord(e.opponent) || "avversario da definire"} del ${shortDate(e.date)}`;
    for (const k of missing) push(team, { kind: k, ref: e.id, label: `${who}: ${MISSING_TEXT[k]}`.slice(0, 160) });
  }

  const sessions = input.sessions
    .map((s) => ({ ...s, day: romeDate(s.startsAt) }))
    .filter((s) => s.day.startsWith(`${input.month}-`) && s.day < input.today && s.status !== "CANCELLED" && s.recorded <= 0)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt) || a.id.localeCompare(b.id));
  for (const s of sessions) {
    push(s.teamCode, { kind: "PRESENZE", ref: s.id, label: `${input.teamLabel(s.teamCode)}, allenamento del ${shortDate(s.day)}: ${MISSING_TEXT.PRESENZE}`.slice(0, 160) });
  }

  return [...teams.entries()]
    .map(([teamCode, items]) => ({ teamCode, label: input.teamLabel(teamCode), items }))
    .sort((a, b) => a.label.localeCompare(b.label, "it"));
}

/** Flat list for scd_office_create_gap_requests. */
export function gapRequestItems(gaps: readonly TeamGaps[]): Array<{ teamCode: string; kind: GapKind; ref: string; label: string }> {
  return gaps.flatMap((t) => t.items.map((i) => ({ teamCode: t.teamCode, kind: i.kind, ref: i.ref, label: i.label })));
}

export function gapCounts(gaps: readonly TeamGaps[]): Record<GapKind, number> {
  const out = Object.fromEntries(GAP_KINDS.map((k) => [k, 0])) as Record<GapKind, number>;
  for (const t of gaps) for (const i of t.items) out[i.kind] += 1;
  return out;
}
