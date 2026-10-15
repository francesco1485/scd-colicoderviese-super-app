/**
 * Team cards ("carte della rosa", DG 15/10/2026 09:18: "qualcosa che si apre come carta: elenco calciatori Prima
 * Squadra con staff, e gli staff delle varie annate"). Pure logic only: it turns what the existing server functions
 * already return (getPublicRoster → scd_public_roster r94, getStaffRoster → SCD_STAFF_ROSTER_JSON) into cards.
 *
 * No new source and no new rule: names come exactly as the functions return them (adults full name, minors first
 * name + surname initial, decided by the database), base-activity teams never show player cards (count only, even
 * if a list were ever returned), and a refused call (not a signed-in member) shows no card at all.
 * No photos, no faces: the front is the role letter in shirt-number style. scd_public_roster carries no shirt
 * numbers, so none is shown or invented.
 */
import { ROSTER_PUBLIC_TEAMS, ROLE_LABEL, type RosterPlayer, type RosterRole } from "./public-roster";
import { BASE_ACTIVITY_TEAMS } from "./social";
import { teamMatches, type StaffPerson } from "./staff-roster";

export const CARDS_SEASON = "2026/27";

/** Team the deck opens on and always lists first. */
export const FIRST_TEAM = "prima";

/** One line per role for the back of a player card (what the role does, never a judgement on the player). */
export const ROLE_DESCRIPTION: Readonly<Record<RosterRole, string>> = {
  P: "Difende la porta: para, guida la difesa e fa ripartire il gioco.",
  D: "Protegge la porta: marca, chiude gli spazi e imposta l'azione.",
  C: "Collega difesa e attacco: corre, recupera palla e costruisce il gioco.",
  A: "Cerca la porta: attacca la profondità, crea occasioni e segna.",
};

const NO_ROLE_DESCRIPTION = "Ruolo non ancora indicato nella lista ufficiale.";

const ROLE_ORDER: Readonly<Record<RosterRole, number>> = { P: 0, D: 1, C: 2, A: 3 };

export interface PlayerCard {
  id: string;
  name: string;
  role: RosterRole | null;
  /** Big letter on the front: P/D/C/A, "–" when the list has no role. */
  code: string;
  roleLabel: string;
  description: string;
}

export interface StaffCard {
  id: string;
  name: string;
  /** Role exactly as in the club list ("Allenatore", "Dirigente accompagnatore U15"). */
  role: string;
  /** Short code on the front, shirt-number style: ALL, VICE, PREP, DIR, RESP, STAFF. */
  code: string;
  /** Group label for the back ("Allenatore", "Preparatore", "Dirigente", …). */
  group: string;
  rank: number;
}

/** What the deck may show for a team, decided only from the function result and the existing team rules. */
export type DeckMode = "unauthorized" | "players" | "count";

export function isBaseTeam(teamId: string): boolean {
  return BASE_ACTIVITY_TEAMS.has(teamId);
}

/** Players get cards only on the official named teams (ROSTER_PUBLIC_TEAMS) that are not base activity. */
export function deckMode(teamId: string, authorized: boolean): DeckMode {
  if (!authorized) return "unauthorized";
  return ROSTER_PUBLIC_TEAMS.has(teamId) && !isBaseTeam(teamId) ? "players" : "count";
}

const collator = new Intl.Collator("it", { sensitivity: "base" });

/** Player cards in role order (P, D, C, A, then without role), names in Italian alphabetical order. */
export function playerCards(players: readonly RosterPlayer[]): PlayerCard[] {
  return [...players]
    .sort(
      (a, b) =>
        (a.role ? ROLE_ORDER[a.role] : 9) - (b.role ? ROLE_ORDER[b.role] : 9) || collator.compare(a.name, b.name),
    )
    .map((p) => ({
      id: p.id,
      name: p.name,
      role: p.role,
      code: p.role ?? "–",
      roleLabel: p.role ? ROLE_LABEL[p.role] : "Ruolo da definire",
      description: p.role ? ROLE_DESCRIPTION[p.role] : NO_ROLE_DESCRIPTION,
    }));
}

/** Count per role for the deck header ("2 P · 6 D · 7 C · 4 A"); roles with no player are left out. */
export function roleCounts(cards: readonly PlayerCard[]): { role: RosterRole; label: string; count: number }[] {
  return (Object.keys(ROLE_ORDER) as RosterRole[])
    .map((role) => ({ role, label: ROLE_LABEL[role], count: cards.filter((c) => c.role === role).length }))
    .filter((r) => r.count > 0);
}

const STAFF_RULES: readonly { rank: number; code: string; group: string; re: RegExp }[] = [
  { rank: 1, code: "VICE", group: "Vice allenatore", re: /\b(second[oa]|vice|collaborator[ei]?)\b.*\b(allenator|mister)/i },
  { rank: 2, code: "PREP", group: "Preparatore", re: /preparator|allenatore (dei |portieri)/i },
  { rank: 0, code: "ALL", group: "Allenatore", re: /allenator|mister/i },
  { rank: 3, code: "DIR", group: "Dirigente", re: /dirigent|team manager|direttore sportivo|accompagnat/i },
  { rank: 4, code: "RESP", group: "Responsabile", re: /responsabil|coordinator|direttore generale|president|segretari|tesorier/i },
];

export function staffRole(role: string): { rank: number; code: string; group: string } {
  const hit = STAFF_RULES.find((r) => r.re.test(role));
  return hit ? { rank: hit.rank, code: hit.code, group: hit.group } : { rank: 5, code: "STAFF", group: "Staff" };
}

export interface DeckTeam {
  id: string;
  label: string;
  years: readonly string[];
}

/** Text the staff team labels are matched against: id, calendar label and birth years ("u15 U15 · Giovanissimi"). */
export function teamText(team: DeckTeam): string {
  return [team.id, team.label, ...team.years].join(" ");
}

/**
 * Staff following this team, from the staff roster only (drivers excluded: they follow vans, not teams).
 * Order: head coach, vice, preparatori, dirigenti, responsabili, other staff; then name.
 */
export function staffCards(people: readonly StaffPerson[], team: DeckTeam): StaffCard[] {
  const text = teamText(team);
  return people
    .filter((p) => p.kind !== "autista" && p.teams.some((t) => teamMatches(text, t)))
    .map((p) => ({ id: p.id, name: p.name, role: p.role, ...staffRole(p.role) }))
    .sort((a, b) => a.rank - b.rank || collator.compare(a.name, b.name));
}

/** Switcher order: Prima Squadra first, then the annate in the order they already come in (hallTeams order). */
export function deckTeams<T extends { id: string }>(teams: readonly T[]): T[] {
  const first = teams.filter((t) => t.id === FIRST_TEAM);
  return [...first, ...teams.filter((t) => t.id !== FIRST_TEAM)];
}

/** Team from the URL, only among the known teams; anything else opens the Prima Squadra (or the first team). */
export function pickTeam(value: unknown, ids: readonly string[]): string | null {
  const v = typeof value === "string" ? value.toLowerCase() : "";
  if (ids.includes(v)) return v;
  if (ids.includes(FIRST_TEAM)) return FIRST_TEAM;
  return ids[0] ?? null;
}

/** Short team name for the cards ("Esordienti · 2014" → "Esordienti 2014"). */
export function teamShortName(label: string): string {
  return label.replace(/\s·\s/g, " ").trim();
}

/** Screen-reader hint inside the card button (the visible face gives the name; aria-pressed gives the state). */
export function flipHint(flipped: boolean): string {
  return flipped ? "Retro della carta. Premi per tornare al fronte." : "Premi per girare la carta.";
}

/**
 * Name on a card: adults as the roster writes them; minors always first name + surname initial ("Luca V."), even when
 * the roster function returns the full name to signed-in members (r94). Applied on the server before the page data.
 */
export function cardName(p: Pick<RosterPlayer, "name" | "adult">): string {
  if (p.adult) return p.name;
  const parts = p.name.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return parts[0] ?? "";
  const last = parts[parts.length - 1] ?? "";
  if (/^\p{L}\.$/u.test(last)) return `${parts[0]} ${last}`;
  return `${parts[0]} ${last.charAt(0).toUpperCase()}.`;
}

/**
 * Data minimisation for /squadre/carte (server side): players only for teams that show player cards, minors reduced
 * to first name + initial; staff only for the selected team, without avatars, areas or drivers.
 */
export function minimizeDeck<
  R extends { team: string; count: number; players: readonly RosterPlayer[] },
  S extends { people: readonly StaffPerson[] },
>(roster: R | null, staff: S, team: DeckTeam | null): { roster: R | null; staff: S } {
  const outRoster =
    roster && team
      ? {
          ...roster,
          players:
            deckMode(team.id, true) === "players"
              ? roster.players.map((p) => ({ ...p, name: cardName(p) }))
              : [],
        }
      : roster;
  const keep = team ? new Set(staffCards(staff.people, team).map((c) => c.id)) : new Set<string>();
  const people = staff.people
    .filter((p) => keep.has(p.id))
    .map((p) => ({ ...p, areas: [], avatar: null }));
  return { roster: outRoster, staff: { ...staff, people } };
}
