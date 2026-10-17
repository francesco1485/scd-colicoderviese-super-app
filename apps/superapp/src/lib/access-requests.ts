/**
 * Self-registration with office approval (r64). Pure rules shared by the public form (/registrati),
 * the server function and the office queue in /segreteria/persone.
 */

export interface AccessRequestInput {
  firstName: string;
  lastName: string;
  birthDate: string;
  email: string;
  phone: string;
  consent: boolean;
}

const EMAIL = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i;
const PHONE = /^\+?[0-9 ]{6,20}$/;

/** Clean phone as stored by the database: digits, spaces and a leading +. */
export function cleanPhone(v: string): string {
  return v.trim().replace(/[^0-9+ ]/g, "");
}

/** Age in whole years on a given day (ISO dates). */
export function ageOn(birthIso: string, todayIso: string): number | null {
  const b = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthIso);
  const t = /^(\d{4})-(\d{2})-(\d{2})$/.exec(todayIso);
  if (!b || !t) return null;
  let age = Number(t[1]) - Number(b[1]);
  if (Number(t[2]) * 100 + Number(t[3]) < Number(b[2]) * 100 + Number(b[3])) age -= 1;
  return age;
}

/** Errors in Italian, keyed by field; empty when the request can be sent. */
export function validateAccessRequest(i: AccessRequestInput, todayIso: string): Partial<Record<keyof AccessRequestInput, string>> {
  const e: Partial<Record<keyof AccessRequestInput, string>> = {};
  if (i.firstName.trim().length < 2) e.firstName = "Scrivi il nome.";
  if (i.lastName.trim().length < 2) e.lastName = "Scrivi il cognome.";
  const age = ageOn(i.birthDate, todayIso);
  if (age === null || age > 106 || i.birthDate > todayIso) e.birthDate = "Data di nascita non valida.";
  else if (age < 14) e.birthDate = "Sotto i 14 anni la registrazione la fa un genitore o tutore, con i suoi dati.";
  if (!EMAIL.test(i.email.trim()) || i.email.trim().length > 120) e.email = "E-mail non valida.";
  if (!PHONE.test(cleanPhone(i.phone))) e.phone = "Telefono non valido (es. 333 1234567).";
  if (!i.consent) e.consent = "Serve il consenso al trattamento dei dati.";
  return e;
}

export type RequestOutcome = "RECEIVED" | "MINOR_UNDER_14" | "CONSENT" | "INVALID" | "BUSY" | "ERROR";

export const OUTCOME_MESSAGE: Readonly<Record<RequestOutcome, string>> = {
  RECEIVED: "Fatto. Entra subito da \"Accedi\" con questa e-mail (o il telefono) e la tua password. All'inizio vedi calendario e attività; il resto (la tua squadra, i tuoi figli, il tuo ruolo) lo abilita la Direzione.",
  MINOR_UNDER_14: "Sotto i 14 anni la registrazione la fa un genitore o tutore, con i suoi dati.",
  CONSENT: "Serve il consenso al trattamento dei dati.",
  INVALID: "Controlla i dati inseriti e riprova.",
  BUSY: "In questo momento arrivano molte richieste: riprova tra qualche minuto.",
  ERROR: "Richiesta non inviata, riprova tra poco.",
};

export function asOutcome(v: unknown): RequestOutcome {
  return v === "RECEIVED" || v === "MINOR_UNDER_14" || v === "CONSENT" || v === "INVALID" || v === "BUSY" ? v : "ERROR";
}

/** Roles the office can grant from a request. Office roles are never granted here (r64). */
export const GRANTABLE_ROLES = [
  { id: "FAMILY", label: "Genitore / tutore" },
  { id: "ATHLETE", label: "Atleta maggiorenne o 14-17 anni" },
  { id: "MISTER", label: "Mister" },
  { id: "MANAGER", label: "Dirigente" },
  { id: "STAFF", label: "Staff" },
] as const;
export type GrantableRole = (typeof GRANTABLE_ROLES)[number]["id"];

/**
 * One person, many hats (UD-189, r121). The office ticks everything the person is — parent of one or more children,
 * athlete, one or more organigram positions — and the app account gets the highest base level among them. The base
 * level opens nothing by itself (r100: sections are granted one by one by the Direzione); it only says which area the
 * person lands in. Order = r64 rank (a level only ever goes up).
 */
export const BASE_RANK: readonly GrantableRole[] = ["ATHLETE", "FAMILY", "STAFF", "MANAGER", "MISTER"];

/** organigram role_kind (scd_structure_roles) -> base level of the account. */
export const KIND_BASE: Readonly<Record<string, GrantableRole>> = {
  ORGANO_SOCIETARIO: "MANAGER",
  DIRIGENTE: "MANAGER",
  RESPONSABILE: "MANAGER",
  MISTER: "MISTER",
  STAFF: "STAFF",
  AUTISTA: "STAFF",
};

export interface HatChoice {
  parent: boolean;
  athlete: boolean;
  /** role_kind of every position ticked (new or already held). */
  positionKinds: readonly string[];
}

/** Highest base level among the hats; null when nothing is ticked yet. */
export function baseRoleFor(h: HatChoice): GrantableRole | null {
  const hats: GrantableRole[] = [];
  if (h.athlete) hats.push("ATHLETE");
  if (h.parent) hats.push("FAMILY");
  for (const k of h.positionKinds) {
    const b = KIND_BASE[k];
    if (b) hats.push(b);
  }
  if (!hats.length) return null;
  return hats.reduce((best, r) => (BASE_RANK.indexOf(r) > BASE_RANK.indexOf(best) ? r : best));
}

/**
 * Which ticked card stays when several cards are the same human: the one already holding organigram roles, then the
 * one with a birth date, then the first ticked. The others are merged into it (r121 scd_merge_people).
 */
export function cardToKeep<C extends { personId: string; roleCount: number; birthYear: number | null }>(ticked: readonly C[]): C | null {
  if (!ticked.length) return null;
  return [...ticked].sort((a, b) => b.roleCount - a.roleCount || Number(b.birthYear !== null) - Number(a.birthYear !== null))[0] ?? null;
}

/** Positions only Presidente or Direttore generale assign (r111 scd_is_creator_position). */
export const CREATOR_POSITIONS: readonly string[] = ["presidente", "direttore-generale"];

/** Codes that describe a tesseramento or a working relationship, not an organigram seat (catalogue note 16/10). */
export function isSeatPosition(code: string): boolean {
  return !code.startsWith("rasd-tessera-") && !code.startsWith("ls-");
}

/** Pairs of active cards with the same name (accents and case folded), to check as possible duplicates. */
export function duplicateNamePairs<P extends { id: string; displayName: string; status: string; birthYear: number | null }>(people: readonly P[]): Array<[P, P]> {
  const key = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
  const groups = new Map<string, P[]>();
  for (const p of people) {
    if (p.status === "LEFT") continue;
    const k = key(p.displayName);
    if (!k) continue;
    groups.set(k, [...(groups.get(k) ?? []), p]);
  }
  const out: Array<[P, P]> = [];
  for (const g of groups.values()) {
    for (let i = 0; i < g.length; i++)
      for (let j = i + 1; j < g.length; j++) {
        const x = g[i]!;
        const y = g[j]!;
        // Two different known birth years are two people (often parent and child with the same name).
        if (x.birthYear !== null && y.birthYear !== null && x.birthYear !== y.birthYear) continue;
        out.push([x, y]);
      }
  }
  return out;
}

export const MATCH_LABEL: Readonly<Record<string, string>> = {
  EMAIL: "stessa e-mail",
  NAME_BIRTH: "stesso nome e data di nascita",
  NAME: "stesso nome",
};

/** Simple fixed-window limiter for the public endpoint (per server instance). */
export function createRateLimiter(limit: number, windowMs: number) {
  const hits = new Map<string, number[]>();
  return (key: string, now = Date.now()): boolean => {
    const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
    if (recent.length >= limit) {
      hits.set(key, recent);
      return false;
    }
    recent.push(now);
    hits.set(key, recent);
    if (hits.size > 5000) for (const [k, v] of hits) if (v.every((t) => now - t >= windowMs)) hits.delete(k);
    return true;
  };
}
