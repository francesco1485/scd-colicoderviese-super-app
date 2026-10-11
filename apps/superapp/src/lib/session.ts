/**
 * Session roles (pure). The database (Supabase SCD, config/scd-supabase.v1.json) stores one
 * membership per organization with a coarse role (`scd_role`) and a free `scope` JSON. The area
 * registry (config/superapp-areas.v1.json) gates areas by club POSITIONS ("presidente",
 * "responsabile-trasporti"). This module turns memberships into the set of positions the gate
 * understands: the coarse role gives its baseline positions, `scope.positions` adds the ones the
 * Direction assigned (only ids the registry knows). Nothing here grants anything on its own.
 */

export const DB_ROLES = ["USER_BASE", "FAMILY", "ATHLETE", "MISTER", "STAFF", "MANAGER", "SECRETARIAT", "REGISTRATION", "TOURNAMENTS", "DIRECTION"] as const;
export type DbRole = (typeof DB_ROLES)[number];

export interface Membership {
  organization_id: string;
  organization_slug: string;
  role: string;
  scope: unknown;
  active: boolean;
}

/** Every position id the registry uses (config/superapp-areas.v1.json roles[]) plus the coarse family ones. */
export const KNOWN_POSITIONS: readonly string[] = [
  "direzione",
  "presidente",
  "direttore-generale",
  "dirigenza",
  "responsabile-attivita-base",
  "coordinatore-attivita-sportiva",
  "dirigente-annata",
  "mister",
  "responsabile-trasporti",
  "autista",
  "responsabile-club-house",
  "addetto-biglietteria",
  "responsabile-magazzino",
  "responsabile-campi",
  "segreteria",
  "famiglia",
  "atleta",
  "partner",
];

/** Positions that a coarse role carries by itself. */
export const ROLE_POSITIONS: Readonly<Record<DbRole, readonly string[]>> = {
  DIRECTION: ["direzione", "dirigenza"],
  SECRETARIAT: ["segreteria"],
  REGISTRATION: ["segreteria"],
  MANAGER: ["dirigente-annata"],
  MISTER: ["mister"],
  STAFF: [],
  TOURNAMENTS: [],
  FAMILY: ["famiglia"],
  ATHLETE: ["atleta"],
  USER_BASE: [],
};

/** Positions that open no staff area by themselves (families, athletes and partners are not staff). */
export const NON_STAFF_POSITIONS: readonly string[] = ["famiglia", "atleta", "partner"];

export function isDbRole(x: unknown): x is DbRole {
  return typeof x === "string" && (DB_ROLES as readonly string[]).includes(x);
}

function scopePositions(scope: unknown): string[] {
  if (!scope || typeof scope !== "object") return [];
  const raw = (scope as { positions?: unknown }).positions;
  if (!Array.isArray(raw)) return [];
  return raw.filter((p): p is string => typeof p === "string" && KNOWN_POSITIONS.includes(p));
}

/** Positions of a verified session, from its active memberships. Empty set when none. */
export function sessionRolesFrom(memberships: readonly Membership[]): Set<string> {
  const out = new Set<string>();
  for (const m of memberships) {
    if (!m.active) continue;
    if (isDbRole(m.role)) for (const p of ROLE_POSITIONS[m.role]) out.add(p);
    for (const p of scopePositions(m.scope)) out.add(p);
  }
  return out;
}

/** True when at least one position is a staff one (opens areas whose roles are still "to define"). */
export function isStaffSession(roles: ReadonlySet<string>): boolean {
  for (const r of roles) if (!NON_STAFF_POSITIONS.includes(r)) return true;
  return false;
}

/** What the header shows: the most telling position in plain Italian. */
export function sessionBadge(roles: ReadonlySet<string>): string {
  const order: Array<[string, string]> = [
    ["direzione", "Direzione"],
    ["segreteria", "Segreteria"],
    ["responsabile-trasporti", "Responsabile trasporti"],
    ["dirigente-annata", "Dirigente"],
    ["mister", "Mister"],
    ["autista", "Autista"],
    ["famiglia", "Famiglia"],
    ["atleta", "Atleta"],
    ["partner", "Partner"],
  ];
  for (const [id, label] of order) if (roles.has(id)) return label;
  return roles.size ? "Tesserato" : "Senza ruolo";
}

/** Keep the "next" path on our own site (no open redirects through the magic link). */
export function safeNext(next: unknown, fallback = "/aree"): string {
  if (typeof next !== "string") return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\") || next.includes("\n")) return fallback;
  return next;
}

/**
 * Where a session lands after login when no `next` was asked (UD-056 "smart link": the same
 * entrance routes each person to their own area by role). Order matters: the widest role wins.
 */
export function landingFor(roles: ReadonlySet<string>): string {
  const order: Array<[string, string]> = [
    ["direzione", "/direzione"],
    ["segreteria", "/segreteria"],
    ["responsabile-trasporti", "/pulmini"],
    ["autista", "/pulmini"],
    ["responsabile-magazzino", "/magazzino"],
    ["responsabile-club-house", "/tesoreria/club-house"],
    ["addetto-biglietteria", "/tesoreria/biglietteria"],
    ["dirigente-annata", "/gestionale/mister"],
    ["mister", "/gestionale/mister"],
    ["famiglia", "/famiglia"],
    ["atleta", "/core/atleta"],
    ["partner", "/partner"],
  ];
  for (const [id, path] of order) if (roles.has(id)) return path;
  return "/aree";
}
