/**
 * Public roster of a team (r94). Pure logic: parse what scd_public_roster returns, label the roles, decide what a
 * page may show. The age rule (adults full name, minors first name + surname initial, full names for signed-in
 * active members) is applied by the database function; the browser never sees more than the function returns.
 * Base-activity teams return the count only: the database sends no names and the page shows none.
 */

export type RosterRole = "P" | "D" | "C" | "A";

export interface RosterPlayer {
  id: string;
  name: string;
  role: RosterRole | null;
  adult: boolean;
}

export interface PublicRoster {
  team: string;
  count: number;
  players: RosterPlayer[];
}

/** Teams whose names may be shown in public (official FIGC lists). Must match scd_public_roster. */
export const ROSTER_PUBLIC_TEAMS: ReadonlySet<string> = new Set([
  "prima",
  "u19",
  "u16",
  "u15",
]);

export const ROLE_LABEL: Readonly<Record<RosterRole, string>> = {
  P: "Portiere",
  D: "Difensore",
  C: "Centrocampista",
  A: "Attaccante",
};

const ROLE_ORDER: Readonly<Record<RosterRole, number>> = {
  P: 0,
  D: 1,
  C: 2,
  A: 3,
};

export const EMPTY_ROSTER: PublicRoster = { team: "", count: 0, players: [] };

export function isRosterRole(v: unknown): v is RosterRole {
  return v === "P" || v === "D" || v === "C" || v === "A";
}

export function roleLabel(role: RosterRole | null): string | null {
  return role ? ROLE_LABEL[role] : null;
}

/** Parses the jsonb of scd_public_roster. Anything malformed becomes the empty roster. */
export function parsePublicRoster(raw: unknown): PublicRoster {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    return EMPTY_ROSTER;
  const o = raw as Record<string, unknown>;
  const team = typeof o["team"] === "string" ? o["team"] : "";
  const count = Number(o["count"]);
  const players: RosterPlayer[] = [];
  if (Array.isArray(o["players"])) {
    for (const p of o["players"]) {
      if (!p || typeof p !== "object") continue;
      const r = p as Record<string, unknown>;
      const id = typeof r["id"] === "string" ? r["id"] : "";
      const name = typeof r["name"] === "string" ? r["name"].trim() : "";
      if (!id || !name) continue;
      players.push({
        id,
        name,
        role: isRosterRole(r["role"]) ? r["role"] : null,
        adult: r["adult"] === true,
      });
    }
  }
  return {
    team,
    count:
      Number.isFinite(count) && count >= 0 ? Math.floor(count) : players.length,
    players,
  };
}

/** Players grouped for the page: by role when roles are known, otherwise one list in surname order. */
export function rosterSections(players: readonly RosterPlayer[]): {
  role: RosterRole | null;
  label: string | null;
  players: RosterPlayer[];
}[] {
  const withRole = players.filter((p) => p.role !== null);
  if (withRole.length === 0)
    return players.length
      ? [{ role: null, label: null, players: [...players] }]
      : [];
  const byRole = new Map<RosterRole | null, RosterPlayer[]>();
  for (const p of players) {
    const list = byRole.get(p.role) ?? [];
    list.push(p);
    byRole.set(p.role, list);
  }
  return [...byRole.entries()]
    .sort(
      ([a], [b]) =>
        (a === null ? 9 : ROLE_ORDER[a]) - (b === null ? 9 : ROLE_ORDER[b]),
    )
    .map(([role, list]) => ({
      role,
      label: role ? ROLE_LABEL[role] : "Ruolo da definire",
      players: list,
    }));
}

/** Initials for the avatar: first letter of the first and of the last word ("Christian B." → "CB"). */
export function initialsOf(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .map((w) => w.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]!.charAt(0);
  const last = parts.length > 1 ? parts[parts.length - 1]!.charAt(0) : "";
  return (first + last).toUpperCase();
}

/** Sentence for the count: "27 giocatori in rosa", "24 bambini iscritti" for base activity. */
export function rosterCountLabel(count: number, base: boolean): string {
  if (count === 0)
    return base
      ? "Iscritti non ancora disponibili"
      : "Rosa non ancora disponibile";
  if (base)
    return `${count} ${count === 1 ? "bambino iscritto" : "bambini iscritti"}`;
  return `${count} ${count === 1 ? "giocatore in rosa" : "giocatori in rosa"}`;
}
