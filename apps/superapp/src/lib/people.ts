/**
 * People of the club (UD-054: "un gestionale che si rispetti"). Pure shapes and rules shared by
 * the server functions (people.functions.ts) and the page (/segreteria/persone). Rows come from
 * Supabase SCD (scd_people + scd_structure_roles + scd_athletes + scd_person_events, r33–r59).
 * Rules here never invent: unknown stays null and is rendered "—".
 */

export type PersonStatus = "ACTIVE" | "PENDING" | "LEFT" | "ARCHIVED";
export type RoleKind = "DIRIGENTE" | "MISTER" | "AUTISTA" | "RESPONSABILE" | "STAFF" | "ORGANO_SOCIETARIO";
export type PersonKind = "atleta" | "staff" | "altro";

export interface PersonRole {
  id: string;
  label: string;
  kind: RoleKind;
  teamCode: string | null;
  teamName: string | null;
  areaId: string | null;
  validTo: string | null;
}

/** One row of the list. Contacts are not here: they travel only with the detail. */
export interface PersonRow {
  id: string;
  displayName: string;
  firstName: string;
  lastName: string;
  /** Year of birth only in the list (minors' full dates stay in the detail). */
  birthYear: number | null;
  minor: boolean | null;
  status: PersonStatus;
  leftAt: string | null;
  leftReason: string | null;
  kind: PersonKind;
  roles: PersonRole[];
  /** Athlete record, when the person is one. */
  athlete: { registrationStatus: string; certificateExpiresAt: string | null } | null;
  sourceId: string;
}

export interface PersonEvent {
  id: number;
  type: string;
  date: string;
  reason: string | null;
  otherClub: string | null;
  note: string | null;
}

export interface PersonDetail extends PersonRow {
  birthDate: string | null;
  email: string | null;
  phone: string | null;
  events: PersonEvent[];
  consents: Array<{ type: string; granted: boolean; givenAt: string; revokedAt: string | null }>;
}

export const STATUS_LABEL: Readonly<Record<PersonStatus, string>> = {
  ACTIVE: "Attivo",
  PENDING: "In attesa",
  LEFT: "Uscito",
  ARCHIVED: "Archiviato",
};

export const EVENT_LABEL: Readonly<Record<string, string>> = {
  ENTRATA: "Entrata",
  USCITA: "Uscita",
  TRASFERIMENTO_OUT: "Trasferimento ad altro club",
  TRASFERIMENTO_IN: "Trasferimento da altro club",
  PRESTITO_OUT: "Prestito",
  RIENTRO: "Rientro",
  CAMBIO_SQUADRA: "Cambio squadra",
  CAMBIO_RUOLO: "Cambio ruolo",
  CAMBIO_STATO: "Cambio stato",
  NOTA: "Nota",
};

export const CONSENT_LABEL: Readonly<Record<string, string>> = {
  IMMAGINI_ISTITUZIONALI: "Immagini istituzionali",
  COMUNICAZIONI_PROMOZIONALI: "Comunicazioni promozionali",
  PULMINO_SERVIZIO: "Servizio pulmino",
  USCITA_AUTONOMA: "Uscita autonoma",
  AVATAR_APP: "Avatar nell'app",
  FOTO_PARTITA_APP: "Foto partita nell'app",
};

export const ROLE_KIND_LABEL: Readonly<Record<RoleKind, string>> = {
  DIRIGENTE: "Dirigente",
  MISTER: "Mister",
  AUTISTA: "Autista",
  RESPONSABILE: "Responsabile",
  STAFF: "Staff",
  ORGANO_SOCIETARIO: "Organo societario",
};

/** Ways a person leaves, as the Direction records them (scd_person_mark_left event types). */
export const LEAVE_TYPES: ReadonlyArray<{ id: "USCITA" | "TRASFERIMENTO_OUT" | "PRESTITO_OUT"; label: string; needsClub: boolean }> = [
  { id: "USCITA", label: "Uscita dal club", needsClub: false },
  { id: "TRASFERIMENTO_OUT", label: "Trasferimento ad altro club", needsClub: true },
  { id: "PRESTITO_OUT", label: "Prestito ad altro club", needsClub: true },
];

export const LEAVE_REASONS: readonly string[] = ["Fine attività", "Cambio società", "Trasferimento residenza", "Motivi personali", "Fine incarico", "Altro"];

/* --------------------------------------------------------------- rules */

export function isMinor(birthDate: string | null, todayIso: string): boolean | null {
  if (!birthDate) return null;
  const b = Date.parse(`${birthDate}T00:00:00Z`);
  const t = Date.parse(`${todayIso}T00:00:00Z`);
  if (Number.isNaN(b) || Number.isNaN(t)) return null;
  const by = new Date(b);
  const ty = new Date(t);
  let age = ty.getUTCFullYear() - by.getUTCFullYear();
  if (ty.getUTCMonth() < by.getUTCMonth() || (ty.getUTCMonth() === by.getUTCMonth() && ty.getUTCDate() < by.getUTCDate())) age -= 1;
  return age < 18;
}

export function birthYear(birthDate: string | null): number | null {
  const m = birthDate ? /^(\d{4})-\d{2}-\d{2}$/.exec(birthDate) : null;
  return m ? Number(m[1]) : null;
}

/** Athlete when there is an athlete record; staff when a structure role is active; otherwise "altro". */
export function personKind(hasAthlete: boolean, roles: readonly PersonRole[]): PersonKind {
  if (hasAthlete) return "atleta";
  if (roles.length > 0) return "staff";
  return "altro";
}

/** Certificate state for the list: expired, expiring within 30 days, ok, unknown. */
export type CertState = "scaduto" | "in-scadenza" | "ok" | "sconosciuto";

export function certificateState(expiresAt: string | null, todayIso: string): CertState {
  if (!expiresAt) return "sconosciuto";
  const e = Date.parse(`${expiresAt}T00:00:00Z`);
  const t = Date.parse(`${todayIso}T00:00:00Z`);
  if (Number.isNaN(e) || Number.isNaN(t)) return "sconosciuto";
  const days = Math.round((e - t) / 86_400_000);
  if (days < 0) return "scaduto";
  if (days <= 30) return "in-scadenza";
  return "ok";
}

export const CERT_LABEL: Readonly<Record<CertState, string>> = { scaduto: "Certificato scaduto", "in-scadenza": "Certificato in scadenza", ok: "Certificato valido", sconosciuto: "Certificato: data non nota" };

export interface PeopleFilter {
  q?: string | undefined;
  kind?: PersonKind | "tutti" | undefined;
  status?: PersonStatus | "tutti" | undefined;
  team?: string | undefined;
}

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export function filterPeople(list: readonly PersonRow[], f: PeopleFilter): PersonRow[] {
  const q = f.q ? fold(f.q) : "";
  return list.filter((p) => {
    if (f.status && f.status !== "tutti" && p.status !== f.status) return false;
    if (!f.status && p.status === "LEFT") return false;
    if (f.kind && f.kind !== "tutti" && p.kind !== f.kind) return false;
    if (f.team && !p.roles.some((r) => r.teamCode === f.team)) return false;
    if (q) {
      const hay = fold(`${p.displayName} ${p.roles.map((r) => `${r.label} ${r.teamCode ?? ""} ${r.teamName ?? ""}`).join(" ")}`);
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export interface PeopleCounts {
  active: number;
  athletes: number;
  staff: number;
  minors: number;
  left: number;
  certificateIssues: number;
}

export function peopleCounts(list: readonly PersonRow[], todayIso: string): PeopleCounts {
  const active = list.filter((p) => p.status === "ACTIVE");
  return {
    active: active.length,
    athletes: active.filter((p) => p.kind === "atleta").length,
    staff: active.filter((p) => p.kind === "staff").length,
    minors: active.filter((p) => p.minor === true).length,
    left: list.filter((p) => p.status === "LEFT").length,
    certificateIssues: active.filter((p) => p.athlete && ["scaduto", "in-scadenza"].includes(certificateState(p.athlete.certificateExpiresAt, todayIso))).length,
  };
}

/** Sort: last name, first name (Italian collation, accents folded). */
export function sortPeople(list: readonly PersonRow[]): PersonRow[] {
  return [...list].sort((a, b) => fold(`${a.lastName} ${a.firstName}`).localeCompare(fold(`${b.lastName} ${b.firstName}`), "it"));
}

/** Teams seen in the roles, for the filter chips. */
export function teamsOf(list: readonly PersonRow[]): Array<{ code: string; name: string }> {
  const m = new Map<string, string>();
  for (const p of list) for (const r of p.roles) if (r.teamCode) m.set(r.teamCode, r.teamName ?? r.teamCode);
  return [...m].map(([code, name]) => ({ code, name })).sort((a, b) => a.code.localeCompare(b.code, "it"));
}

/** "11/10/2026" from "2026-10-11". */
export function itDate(iso: string | null): string {
  const m = iso ? /^(\d{4})-(\d{2})-(\d{2})/.exec(iso) : null;
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "—";
}

/** Validation of a new person as typed by the Direction (no invented defaults). */
export interface NewPersonInput {
  firstName: string;
  lastName: string;
  birthDate: string;
  email: string;
  phone: string;
  kind: "atleta" | "staff";
  roleLabel: string;
  roleKind: RoleKind | "";
  note: string;
}

export function validateNewPerson(i: NewPersonInput): string[] {
  const errors: string[] = [];
  if (i.firstName.trim().length < 2) errors.push("Nome mancante.");
  if (i.lastName.trim().length < 2) errors.push("Cognome mancante.");
  if (i.birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(i.birthDate)) errors.push("Data di nascita non valida.");
  if (i.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(i.email.trim())) errors.push("E-mail non valida.");
  if (i.kind === "staff") {
    if (i.roleLabel.trim().length < 3) errors.push("Per lo staff serve il ruolo (come lo scrive la società).");
    if (!i.roleKind) errors.push("Per lo staff serve il tipo di ruolo.");
  }
  return errors;
}
