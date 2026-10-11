/**
 * Pre-distinta (r70, UD-069). Pure rules for the match-sheet draft the mister prepares from the call-up.
 * It is not the official sheet: for SGS youth championships the CRL Lombardia requires the "lista di presentazione"
 * on the LND portal, where the club officer copies this draft. The database (scd_staff_save_match_sheet) enforces
 * the same limits; MATCH_SHEET_RULES must stay equal to scd_match_sheet_rules (checked by a test).
 *
 * Sources (verified 2026-10-11):
 * - LND CRL Lombardia, Regolamento competizioni dilettantistiche 2026/27, art. 19.1 (captain and vice among the starters),
 *   art. 26.2 (up to 9 reserves in 2026/27);
 * - CRL Lombardia, Regolamenti SGS Campionato, art. 6 (up to 20 players listed, 7 substitutions), art. 19-20 (goalkeepers 1, 12, 22).
 */

export interface SheetRules {
  maxListed: number;
  /** null = no starters/reserves split (attività di base). */
  maxStarters: number | null;
  captainRequired: boolean;
}

const ELEVEN: SheetRules = { maxListed: 20, maxStarters: 11, captainRequired: true };
const BASE: SheetRules = { maxListed: 40, maxStarters: null, captainRequired: false };

export const MATCH_SHEET_RULES: Readonly<Record<string, SheetRules>> = {
  prima: ELEVEN,
  u19: ELEVEN,
  u18: ELEVEN,
  u17: ELEVEN,
  u16: ELEVEN,
  u15: ELEVEN,
  u14: ELEVEN,
};

export function rulesFor(teamCode: string): SheetRules {
  return MATCH_SHEET_RULES[teamCode] ?? BASE;
}

export const STAFF_ROLES = [
  "DIRIGENTE_ACCOMPAGNATORE",
  "ALLENATORE",
  "ALLENATORE_IN_SECONDA",
  "PREPARATORE_PORTIERI",
  "PREPARATORE_ATLETICO",
  "MEDICO",
  "OPERATORE_SANITARIO",
  "DIRIGENTE_ADDETTO_ARBITRO",
] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const STAFF_ROLE_LABEL: Readonly<Record<StaffRole, string>> = {
  DIRIGENTE_ACCOMPAGNATORE: "Dirigente accompagnatore ufficiale",
  ALLENATORE: "Allenatore",
  ALLENATORE_IN_SECONDA: "Allenatore in seconda",
  PREPARATORE_PORTIERI: "Preparatore dei portieri",
  PREPARATORE_ATLETICO: "Preparatore atletico",
  MEDICO: "Medico",
  OPERATORE_SANITARIO: "Operatore sanitario",
  DIRIGENTE_ADDETTO_ARBITRO: "Dirigente addetto all'arbitro (solo in casa)",
};

export function isStaffRole(v: string): v is StaffRole {
  return (STAFF_ROLES as readonly string[]).includes(v);
}

export interface SheetPlayer {
  athleteId: string;
  shirt: number;
  starter: boolean;
}

export interface SheetStaff {
  personId: string;
  role: StaffRole;
}

export interface SheetDraft {
  players: SheetPlayer[];
  staff: SheetStaff[];
  captain: string | null;
  vice: string | null;
}

/** Italian messages, same checks as scd_staff_save_match_sheet. `ready` adds the checks for "Pronta". */
export function validateSheet(d: SheetDraft, rules: SheetRules, calledUp: ReadonlySet<string>, ready: boolean): string[] {
  const errors: string[] = [];
  const n = d.players.length;
  const starters = d.players.filter((p) => p.starter).length;
  if (n > rules.maxListed) errors.push(`Troppi in lista: massimo ${rules.maxListed}.`);
  if (rules.maxStarters !== null && starters > rules.maxStarters) errors.push(`Troppi titolari: massimo ${rules.maxStarters}.`);
  if (d.players.some((p) => !Number.isInteger(p.shirt) || p.shirt < 1 || p.shirt > 99)) errors.push("Ogni giocatore in lista ha un numero di maglia da 1 a 99.");
  const shirts = d.players.map((p) => p.shirt);
  if (new Set(shirts).size !== shirts.length) errors.push("Due giocatori hanno lo stesso numero di maglia.");
  if (d.players.some((p) => !calledUp.has(p.athleteId))) errors.push("In lista c'è chi non è più convocato: toglilo.");
  if (d.captain && d.captain === d.vice) errors.push("Capitano e vice devono essere due giocatori diversi.");
  for (const [label, id] of [["Il capitano", d.captain], ["Il vice capitano", d.vice]] as const) {
    if (!id) continue;
    const p = d.players.find((x) => x.athleteId === id);
    if (!p) errors.push(`${label} deve essere in lista.`);
    else if (rules.maxStarters !== null && !p.starter) errors.push(`${label} deve essere tra i titolari.`);
  }
  if (ready) {
    if (n === 0) errors.push("La lista è vuota.");
    if (rules.captainRequired && (!d.captain || !d.vice)) errors.push("Indica capitano e vice capitano.");
    if (!d.staff.some((s) => s.role === "DIRIGENTE_ACCOMPAGNATORE")) errors.push("Indica il dirigente accompagnatore ufficiale.");
  }
  return errors;
}

/** Shirt for a player added to the list: the one he last wore for this team if free, else the lowest free number. */
export function suggestShirt(lastShirt: number | null, taken: ReadonlySet<number>): number {
  if (lastShirt && lastShirt >= 1 && lastShirt <= 99 && !taken.has(lastShirt)) return lastShirt;
  for (let i = 1; i <= 99; i++) if (!taken.has(i)) return i;
  return 99;
}

/** Starters first, then reserves, each by shirt number. */
export function sortPlayers<T extends SheetPlayer>(players: readonly T[]): T[] {
  return [...players].sort((a, b) => Number(b.starter) - Number(a.starter) || a.shirt - b.shirt);
}

/** Plain text to copy into the LND portal or a message: one line per player and per adult. */
export function sheetText(
  d: SheetDraft,
  rules: SheetRules,
  nameOf: (athleteId: string) => string,
  staffName: (personId: string) => string,
  heading: string,
): string {
  const lines = [heading, ""];
  const tag = (id: string) => (id === d.captain ? " (C)" : id === d.vice ? " (VC)" : "");
  const sorted = sortPlayers(d.players);
  if (rules.maxStarters !== null) {
    lines.push("TITOLARI");
    for (const p of sorted.filter((x) => x.starter)) lines.push(`${p.shirt}. ${nameOf(p.athleteId)}${tag(p.athleteId)}`);
    lines.push("", "RISERVE");
    for (const p of sorted.filter((x) => !x.starter)) lines.push(`${p.shirt}. ${nameOf(p.athleteId)}${tag(p.athleteId)}`);
  } else {
    lines.push("IN LISTA");
    for (const p of sorted) lines.push(`${p.shirt}. ${nameOf(p.athleteId)}${tag(p.athleteId)}`);
  }
  if (d.staff.length) {
    lines.push("", "PANCHINA");
    for (const s of d.staff) lines.push(`${STAFF_ROLE_LABEL[s.role]}: ${staffName(s.personId)}`);
  }
  return lines.join("\n");
}
