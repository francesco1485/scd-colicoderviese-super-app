/**
 * Distinta per gli spettatori (Direzione, 13/10/2026: "distinta doppia in casa per spettatori"). Pure rules that turn
 * the pre-distinta the staff already prepares (r70, match-sheet.ts) into a second printable sheet for the stands at
 * home matches. Nothing is stored: the sheet is derived from the saved draft and the official calendar copy.
 *
 * Privacy (safeguarding, minors):
 * - full name only for a player who is certainly 18 on the match day AND plays in an adult team (Prima Squadra,
 *   Juniores). The database gives the birth year only, so "certainly 18" means born on 31/12 of that year at the
 *   latest: adult iff matchDate >= (birthYear + 18)-12-31. A missing birth year counts as a minor;
 * - everyone else: first name + surname initial ("Luca B."), never birth dates, card numbers or documents;
 * - attività di base (Pulcini, Esordienti, Primi Calci, Piccoli Amici): no names at all;
 * - adults on the bench: role and full name.
 */
import type { PublicEvent } from "./public-snapshots";
import { MATCH_SHEET_RULES, STAFF_ROLES, type StaffRole } from "./match-sheet";
import type { MatchSheetData } from "./match-sheet.functions";

/** Teams whose players may be adults: everyone else is a minor by construction. */
export const ADULT_TEAM_CODES: ReadonlySet<string> = new Set(["prima", "u19"]);

/** Calendar groups of the attività di base (config of calendario-snapshot: Esordienti per annata, Pulcini, ...). */
const BASE_GROUPS: ReadonlySet<string> = new Set([
  "2014",
  "2015",
  "esordienti",
  "pulcini",
  "primicalci",
  "piccoli",
]);
const BASE_LABEL = /pulcini|esordienti|primi\s*calci|piccoli\s*amici/i;

export const BASE_ACTIVITY_NOTE =
  "Elenco giocatori non pubblicato (attività di base)";

/** Short role labels for the stands (the official ones in STAFF_ROLE_LABEL carry notes for the staff). */
export const SPECTATOR_ROLE_LABEL: Readonly<Record<StaffRole, string>> = {
  DIRIGENTE_ACCOMPAGNATORE: "Dirigente accompagnatore",
  ALLENATORE: "Allenatore",
  ALLENATORE_IN_SECONDA: "Allenatore in seconda",
  PREPARATORE_PORTIERI: "Preparatore portieri",
  PREPARATORE_ATLETICO: "Preparatore atletico",
  MEDICO: "Medico",
  OPERATORE_SANITARIO: "Operatore sanitario",
  DIRIGENTE_ADDETTO_ARBITRO: "Addetto all'arbitro",
};

/**
 * Official channels, as listed in the club's community page (manifest source_registry). Handles are printed as
 * text: the sheet carries no tracking link.
 */
export const SOCIAL_HANDLES: ReadonlyArray<{
  network: string;
  handle: string;
}> = [
  { network: "Instagram", handle: "@s.c.d.colicoderviese" },
  { network: "Facebook", handle: "ColicoDerviese" },
  { network: "TikTok", handle: "@s.c.d..colicoderv" },
  { network: "YouTube", handle: "@S.C.D.ColicoDerviese" },
  { network: "Sito", handle: "colicoderviese.it" },
];

/** Attività di base: by team code of the sheet when known, and in any case by the calendar group or label. Fails closed. */
export function isBaseActivity(input: {
  teamCode?: string | null;
  group?: string | null;
  label?: string | null;
}): boolean {
  const code = (input.teamCode ?? "").trim();
  const group = (input.group ?? "").trim();
  if (BASE_LABEL.test(input.label ?? "")) return true;
  if (group && BASE_GROUPS.has(group)) return true;
  if (code) return !(code in MATCH_SHEET_RULES);
  // No team code: competitive only when the calendar group itself is an eleven-a-side team.
  return !(group in MATCH_SHEET_RULES);
}

/** True only when the person is 18 for sure on the match day, given the birth year alone. */
export function isCertainlyAdult(
  birthYear: number | null | undefined,
  matchDate: string,
): boolean {
  if (
    typeof birthYear !== "number" ||
    !Number.isInteger(birthYear) ||
    birthYear < 1900
  )
    return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(matchDate)) return false;
  return matchDate >= `${birthYear + 18}-12-31`;
}

const cleanSpaces = (s: string) => s.replace(/\s+/g, " ").trim();

/** "MARIO ROSSI" -> "Mario Rossi"; mixed-case names stay as written. */
function readableCase(s: string): string {
  if (s !== s.toUpperCase()) return s;
  return s
    .toLowerCase()
    .split(" ")
    .map((w) =>
      w.replace(
        /(^|['’-])(\p{L})/gu,
        (_, p: string, c: string) => p + c.toUpperCase(),
      ),
    )
    .join(" ");
}

/**
 * Name printed on the sheet. Adult: as registered. Minor: first word + initial of the second word ("Luca Bianchi" ->
 * "Luca B.", "Marco De Luca" -> "Marco D."). A first name in two words ("Gian Marco Rossi" -> "Gian M.") shows even
 * less, never more.
 */
export function spectatorName(displayName: string, adult: boolean): string {
  const full = readableCase(cleanSpaces(displayName.replace(/[<>]/g, "")));
  if (!full) return "—";
  if (adult) return full;
  const [first, second] = full.split(" ");
  if (!second) return first!;
  const initial = second.match(/\p{L}/u)?.[0];
  return initial ? `${first} ${initial.toUpperCase()}.` : first!;
}

export interface SpectatorLine {
  shirt: number;
  name: string;
  starter: boolean;
  /** "C" captain, "VC" vice. */
  mark: "C" | "VC" | null;
}

export interface SpectatorStaffLine {
  role: string;
  name: string;
}

/** By shirt number; when the team has starters, starters first. */
export function orderByShirt<T extends { shirt: number; starter: boolean }>(
  lines: readonly T[],
  splitStarters: boolean,
): T[] {
  return [...lines].sort(
    (a, b) =>
      (splitStarters ? Number(b.starter) - Number(a.starter) : 0) ||
      a.shirt - b.shirt,
  );
}

/** "1A" -> "1ª giornata · andata", "12R" -> "12ª giornata · ritorno"; other values as given, empty when unknown. */
export function roundLabel(round: string): string {
  const r = round.trim().toUpperCase();
  const m = /^(\d{1,2})([AR])$/.exec(r);
  if (m)
    return `${Number(m[1])}ª giornata · ${m[2] === "A" ? "andata" : "ritorno"}`;
  return round.trim();
}

const TYPE_LABEL: Readonly<Record<string, string>> = {
  CAMPIONATO: "Campionato",
  COPPA: "Coppa",
  TORNEO: "Torneo",
  AMICHEVOLE: "Amichevole",
};

/** "Campionato · Juniores U19 Élite". */
export function competitionLabel(type: string, category: string): string {
  const t =
    TYPE_LABEL[type.trim().toUpperCase()] ??
    (type.trim() ? readableCase(type.trim()) : "Gara");
  return category.trim() ? `${t} · ${category.trim()}` : t;
}

/** Field of the home ground: "COLICO - CAMPO 1" -> "Colico · Campo 1". */
export function fieldLabel(venue: string): string {
  const v = cleanSpaces(venue);
  if (!v) return "Campo da definire";
  return v
    .split(/\s+-\s+/)
    .map((p) => readableCase(p))
    .join(" · ");
}

export type SpectatorState =
  "ok" | "no-event" | "not-home" | "signed-out" | "error";

export interface SpectatorSheet {
  state: SpectatorState;
  eventId: string;
  date: string;
  time: string;
  field: string;
  competition: string;
  round: string;
  /** Our team as named in the calendar ("Prima Squadra"). */
  teamLabel: string;
  teamCode: string;
  /** Opponent as written in the official calendar (crest and readable name come from the registry). */
  opponent: string;
  base: boolean;
  status: "NONE" | "DRAFT" | "READY";
  splitStarters: boolean;
  /** Empty numbered lines for a side without names (opponent, or our side before the sheet is saved). */
  blankLines: number;
  players: SpectatorLine[];
  staff: SpectatorStaffLine[];
}

export function emptySpectatorSheet(
  state: SpectatorState,
  eventId = "",
): SpectatorSheet {
  return {
    state,
    eventId,
    date: "",
    time: "",
    field: "",
    competition: "",
    round: "",
    teamLabel: "",
    teamCode: "",
    opponent: "",
    base: false,
    status: "NONE",
    splitStarters: false,
    blankLines: 20,
    players: [],
    staff: [],
  };
}

/**
 * Spectator sheet from the calendar event and the staff's saved draft. Returns only what may be printed for the
 * public: formatted names, shirts, starter flag, captain marks, bench roles. No ids, birth years or responses.
 */
export function buildSpectatorSheet(
  event: PublicEvent | null,
  groupLabel: string,
  sheet: MatchSheetData | null,
): SpectatorSheet {
  if (!event) return emptySpectatorSheet("no-event");
  if (event.homeAway !== "CASA")
    return { ...emptySpectatorSheet("not-home", event.id), date: event.date };
  const teamCode = sheet?.state === "ok" ? sheet.teamCode : "";
  const base = isBaseActivity({
    teamCode,
    group: event.group,
    label: `${event.category} ${groupLabel}`,
  });
  const head: SpectatorSheet = {
    ...emptySpectatorSheet("ok", event.id),
    date: event.date,
    time: event.time,
    field: fieldLabel(event.venue),
    competition: competitionLabel(event.type, event.category),
    round: roundLabel(event.round),
    teamLabel: groupLabel || event.category,
    teamCode,
    opponent: event.opponent,
    base,
  };
  if (!sheet || sheet.state === "signed-out")
    return { ...head, state: "signed-out" };
  if (sheet.state === "error") return { ...head, state: "error" };
  if (base) return head;
  if (sheet.state !== "ok") return head; // no call-up yet: printable with empty lines

  const splitStarters = sheet.rules.maxStarters !== null;
  const adultTeam = ADULT_TEAM_CODES.has(sheet.teamCode);
  const byId = new Map(sheet.calledUp.map((c) => [c.athleteId, c]));
  const players = orderByShirt(
    sheet.players.flatMap((p): SpectatorLine[] => {
      const c = byId.get(p.athleteId);
      if (!c) return [];
      const adult = adultTeam && isCertainlyAdult(c.birthYear, event.date);
      const mark =
        p.athleteId === sheet.captain
          ? "C"
          : p.athleteId === sheet.vice
            ? "VC"
            : null;
      return [
        {
          shirt: p.shirt,
          name: spectatorName(c.displayName, adult),
          starter: splitStarters ? p.starter : false,
          mark,
        },
      ];
    }),
    splitStarters,
  );
  const rank = (r: StaffRole) => STAFF_ROLES.indexOf(r);
  const staff = [...sheet.staff]
    .sort((a, b) => rank(a.role) - rank(b.role))
    .map((s) => ({
      role: SPECTATOR_ROLE_LABEL[s.role],
      name: spectatorName(s.displayName, true),
    }));
  return {
    ...head,
    status: sheet.status,
    splitStarters,
    blankLines: Math.min(sheet.rules.maxListed, 20),
    players,
    staff,
  };
}

/**
 * Opponent list typed by the staff before printing (not stored): one player per line, "10 Mario Rossi" or
 * "10. Mario Rossi". Names are printed in full only for an adult team (Prima Squadra), otherwise as "Mario R.":
 * we never know the age of the opponent's players.
 */
export function parseOpponentList(
  text: string,
  teamCode: string,
  max = 20,
): SpectatorLine[] {
  const adult = teamCode === "prima";
  const seen = new Set<number>();
  const out: SpectatorLine[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const m = /^\s*(\d{1,2})\s*[.)\-–:]?\s+(.+?)\s*$/.exec(raw);
    if (!m) continue;
    const shirt = Number(m[1]);
    if (shirt < 1 || shirt > 99 || seen.has(shirt)) continue;
    seen.add(shirt);
    out.push({
      shirt,
      name: spectatorName(m[2]!, adult),
      starter: false,
      mark: null,
    });
    if (out.length >= max) break;
  }
  return orderByShirt(out, false);
}
