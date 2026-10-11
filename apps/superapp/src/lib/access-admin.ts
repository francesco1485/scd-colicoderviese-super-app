/**
 * Personalised access (r65). Pure rules and labels for /direzione/accessi. The database enforces the same
 * rules (scd_access_admin_guard); here they only shape the screen (what is offered, what is greyed out).
 */
import { DB_ROLES, KNOWN_POSITIONS, type DbRole } from "./session";

export const OFFICE_ROLES: readonly DbRole[] = ["DIRECTION", "SECRETARIAT", "REGISTRATION", "TOURNAMENTS"];
export const OFFICE_POSITIONS: readonly string[] = ["direzione", "presidente", "direttore-generale", "dirigenza", "segreteria"];

/** Positions that come only from the coarse role (never assigned by hand). */
export const ROLE_ONLY_POSITIONS: readonly string[] = ["famiglia", "atleta"];

/** Area positions that can be added to an account (kept equal to the SQL `assignable` list in r65). */
export const ASSIGNABLE_POSITIONS: readonly string[] = KNOWN_POSITIONS.filter((p) => !ROLE_ONLY_POSITIONS.includes(p));

export const ROLE_LABEL: Readonly<Record<DbRole, string>> = {
  DIRECTION: "Direzione",
  SECRETARIAT: "Segreteria",
  REGISTRATION: "Tesseramenti",
  TOURNAMENTS: "Tornei",
  MANAGER: "Dirigente",
  MISTER: "Mister",
  STAFF: "Staff",
  FAMILY: "Famiglia",
  ATHLETE: "Atleta",
  USER_BASE: "Base (nessuna area)",
};

/** Roles offered in the role picker, most powerful last. */
export const ROLE_ORDER: readonly DbRole[] = ["FAMILY", "ATHLETE", "STAFF", "MANAGER", "MISTER", "TOURNAMENTS", "REGISTRATION", "SECRETARIAT", "DIRECTION"];

export const POSITION_LABEL: Readonly<Record<string, string>> = {
  direzione: "Direzione",
  presidente: "Presidente",
  "direttore-generale": "Direttore generale",
  dirigenza: "Dirigenza (acquisti)",
  "responsabile-attivita-base": "Responsabile attività di base",
  "coordinatore-attivita-sportiva": "Coordinatore attività sportiva",
  "dirigente-annata": "Dirigente di annata",
  mister: "Mister",
  "responsabile-trasporti": "Responsabile trasporti (pulmini)",
  autista: "Autista (pulmini)",
  "responsabile-club-house": "Club House",
  "addetto-biglietteria": "Biglietteria",
  "responsabile-magazzino": "Magazzino",
  "responsabile-campi": "Campi e impianti",
  segreteria: "Segreteria",
  partner: "Partner / sponsor",
};

export const POSITION_GROUPS: ReadonlyArray<{ label: string; ids: readonly string[] }> = [
  { label: "Squadre", ids: ["mister", "dirigente-annata", "coordinatore-attivita-sportiva", "responsabile-attivita-base"] },
  { label: "Servizi", ids: ["responsabile-trasporti", "autista", "responsabile-magazzino", "responsabile-campi", "responsabile-club-house", "addetto-biglietteria"] },
  { label: "Ufficio (solo Direzione)", ids: ["segreteria", "dirigenza", "direttore-generale", "presidente", "direzione"] },
  { label: "Esterni", ids: ["partner"] },
];

export function isDbRoleValue(v: string): v is DbRole {
  return (DB_ROLES as readonly string[]).includes(v);
}

export function roleLabelOf(role: string): string {
  return isDbRoleValue(role) ? ROLE_LABEL[role] : role;
}

export function positionLabel(p: string): string {
  return POSITION_LABEL[p] ?? p.replace(/-/g, " ");
}

/** Can this actor edit that account at all? */
export function canEditAccount(actor: DbRole | null, target: DbRole, isSelf: boolean): boolean {
  if (isSelf || !actor) return false;
  if (actor === "DIRECTION") return true;
  if (actor === "SECRETARIAT") return !OFFICE_ROLES.includes(target);
  return false;
}

export function grantableRoles(actor: DbRole | null): DbRole[] {
  if (actor === "DIRECTION") return [...ROLE_ORDER];
  if (actor === "SECRETARIAT") return ROLE_ORDER.filter((r) => !OFFICE_ROLES.includes(r));
  return [];
}

export function grantablePositions(actor: DbRole | null): string[] {
  if (actor === "DIRECTION") return [...ASSIGNABLE_POSITIONS];
  if (actor === "SECRETARIAT") return ASSIGNABLE_POSITIONS.filter((p) => !OFFICE_POSITIONS.includes(p));
  return [];
}

export interface AccountPerson {
  id: string;
  name: string;
  kind: string;
  link: string;
}

export interface Account {
  userId: string;
  email: string;
  role: DbRole;
  positions: string[];
  active: boolean;
  lastSignInAt: string | null;
  createdAt: string;
  persons: AccountPerson[];
}

export interface AccountFilter {
  q?: string | undefined;
  role?: DbRole | "tutti" | "ufficio" | undefined;
  status?: "attivi" | "sospesi" | "mai-entrati" | "tutti" | undefined;
}

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function filterAccounts(list: readonly Account[], f: AccountFilter): Account[] {
  const q = fold((f.q ?? "").trim());
  return list.filter((a) => {
    if (f.role === "ufficio" && !OFFICE_ROLES.includes(a.role)) return false;
    if (f.role && f.role !== "tutti" && f.role !== "ufficio" && a.role !== f.role) return false;
    const status = f.status ?? "attivi";
    if (status === "attivi" && !a.active) return false;
    if (status === "sospesi" && a.active) return false;
    if (status === "mai-entrati" && (a.lastSignInAt || !a.active)) return false;
    if (q && !fold([a.email, ...a.persons.map((p) => p.name), ...a.positions.map(positionLabel), roleLabelOf(a.role)].join(" ")).includes(q)) return false;
    return true;
  });
}

export interface AccountCounts {
  total: number;
  active: number;
  suspended: number;
  signedIn: number;
  office: number;
  withExtraAreas: number;
}

export function accountCounts(list: readonly Account[]): AccountCounts {
  return {
    total: list.length,
    active: list.filter((a) => a.active).length,
    suspended: list.filter((a) => !a.active).length,
    signedIn: list.filter((a) => a.lastSignInAt).length,
    office: list.filter((a) => OFFICE_ROLES.includes(a.role)).length,
    withExtraAreas: list.filter((a) => a.positions.length > 0).length,
  };
}

const ROME_DAY = new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", day: "numeric", month: "short", year: "numeric" });

export function lastSeen(iso: string | null): string {
  if (!iso) return "mai entrato";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : `ultimo accesso ${ROME_DAY.format(d)}`;
}

export const AUDIT_LABEL: Readonly<Record<string, string>> = {
  SET_ACCESS: "Accesso modificato",
  GRANT_PERSON: "Accesso dato a una persona",
  REVOKE_LINK: "Collegamento revocato",
  APPROVE_REQUEST: "Richiesta autorizzata",
  REJECT_REQUEST: "Richiesta rifiutata",
};

/** One-line Italian summary of an audit entry's detail. */
export function auditSummary(action: string, detail: Record<string, unknown>): string {
  const roleOf = (v: unknown) => (typeof v === "string" ? roleLabelOf(v) : "");
  const pos = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").map(positionLabel).join(", ") : "");
  if (action === "SET_ACCESS") {
    const b = (detail["before"] ?? {}) as Record<string, unknown>;
    const a = (detail["after"] ?? {}) as Record<string, unknown>;
    const parts: string[] = [];
    if (b["role"] !== a["role"]) parts.push(`ruolo ${roleOf(b["role"])} → ${roleOf(a["role"])}`);
    if (pos(b["positions"]) !== pos(a["positions"])) parts.push(`aree: ${pos(a["positions"]) || "nessuna"}`);
    if (b["active"] !== a["active"]) parts.push(a["active"] ? "riattivato" : "sospeso");
    return parts.join(" · ") || "nessun cambiamento";
  }
  if (action === "GRANT_PERSON" || action === "APPROVE_REQUEST") {
    const extra = pos(detail["positions"]);
    return `ruolo ${roleOf(detail["role"])}${extra ? ` · aree: ${extra}` : ""}`;
  }
  return "";
}
