/**
 * Posta del club (r95, UD-101): pure rules and payload parsers shared by the server functions, the Gmail sync and
 * the pages. The database is the authority (scd_comm_resolve_envelopes enforces the minors rule); the TypeScript
 * mirror here exists so the rule is unit-tested and explained in the composer with the same words.
 *
 * Minors rule (Direzione 13/10/2026):
 *   - never write to anyone under 14;
 *   - under 18 the e-mail goes to the family's guardians;
 *   - a 14-17 athlete is written to only with the guardians in copy;
 *   - unknown birth date = treated as a minor (guardians only);
 *   - an address that belongs only to children under 14 is never used, whatever audience produced it.
 */

export type Office = "DIREZIONE" | "SEGRETERIA" | "TESORERIA";
export type Confidentiality = "ORDINARIO" | "RISERVATO";
export type Channel = "EMAIL" | "APP" | "WHATSAPP";
export type Delivery = "PENDING" | "QUEUED" | "SENT" | "FAILED" | "DRAFT";
export type EnvelopeKind = "DIRECT" | "GUARDIAN" | "MINOR_WITH_GUARDIANS" | "CONTACT" | "FREE";
export type ContactKind = "ORGANIZATION" | "SUPPLIER" | "SPONSOR" | "EXTERNAL";
export type AudienceKind =
  | "ALL_MEMBERS"
  | "TEAM"
  | "BIRTH_YEAR"
  | "SPONSORS"
  | "SUPPLIERS"
  | "PERSON"
  | "FAMILY"
  | "CONTACT"
  | "FREE";

export interface Audience {
  kind: AudienceKind;
  teamId?: string;
  birthYear?: number;
  personId?: string;
  familyId?: string;
  contactId?: string;
  emails?: string[];
  /** Display only (never trusted by the database). */
  label?: string;
}

export const OFFICES: readonly Office[] = ["DIREZIONE", "SEGRETERIA", "TESORERIA"];
export const OFFICE_LABEL: Readonly<Record<Office, string>> = { DIREZIONE: "Direzione", SEGRETERIA: "Segreteria", TESORERIA: "Tesoreria" };

export const AUDIENCE_OPTIONS: ReadonlyArray<{ kind: AudienceKind; label: string; hint: string }> = [
  { kind: "ALL_MEMBERS", label: "Tutti i tesserati", hint: "Atleti adulti e, per i minori, i genitori." },
  { kind: "TEAM", label: "Una squadra", hint: "Atleti della squadra e genitori dei minori." },
  { kind: "BIRTH_YEAR", label: "Famiglie di un'annata", hint: "Atleti nati in quell'anno e loro genitori." },
  { kind: "SPONSORS", label: "Sponsor", hint: "Contatti collegati come sponsor." },
  { kind: "SUPPLIERS", label: "Fornitori", hint: "Contatti collegati come fornitori." },
  { kind: "PERSON", label: "Una persona o famiglia", hint: "Cerca per nome: per i minori scrivono i genitori." },
  { kind: "CONTACT", label: "Un'organizzazione o contatto", hint: "Enti, aziende e contatti già collegati." },
  { kind: "FREE", label: "Indirizzo libero", hint: "Uno o più indirizzi e-mail: se sono di un minore vale la stessa regola." },
];

export const ENVELOPE_LABEL: Readonly<Record<EnvelopeKind, string>> = {
  DIRECT: "adulti",
  GUARDIAN: "genitori di minori",
  MINOR_WITH_GUARDIANS: "atleti 14-17 con genitori in copia",
  CONTACT: "contatti e organizzazioni",
  FREE: "indirizzi liberi",
};

export const EXCLUDED_LABEL: Readonly<Record<string, string>> = {
  OPT_OUT: "hanno chiesto di non ricevere mail",
  NO_EMAIL: "adulti senza indirizzo e-mail",
  MINOR_NO_GUARDIAN: "minori senza un genitore con e-mail",
  BIRTH_DATE_UNKNOWN_NO_GUARDIAN: "data di nascita mancante e nessun genitore con e-mail",
  PERSON_NOT_ACTIVE: "persone uscite o archiviate",
  INVALID_EMAIL: "indirizzi non validi",
  CLUB_MAILBOX: "indirizzo della società stessa",
  UNDER_14_ADDRESS: "indirizzi di bambini sotto i 14 anni (mai usati)",
  MINOR_WITHOUT_GUARDIAN_COPY: "atleti 14-17 senza genitore in copia",
  UNKNOWN_AUDIENCE: "destinatari non riconosciuti",
};

export const DELIVERY_LABEL: Readonly<Record<Delivery, string>> = {
  DRAFT: "Bozza",
  PENDING: "In preparazione",
  QUEUED: "In coda",
  SENT: "Inviato",
  FAILED: "Non inviato",
};

export const CONTACT_KIND_LABEL: Readonly<Record<ContactKind, string>> = {
  SPONSOR: "Sponsor",
  SUPPLIER: "Fornitore",
  ORGANIZATION: "Ente o organizzazione",
  EXTERNAL: "Altro contatto",
};

/** Plain Italian for the error codes returned by the r95 functions. */
export function commError(code: string | null | undefined): string {
  switch (code) {
    case "SENDING_DISABLED":
      return "Invio non ancora attivo: la Direzione deve collegare la casella della società e attivare l'invio. Il messaggio resta tra le bozze.";
    case "NO_RECIPIENTS":
      return "Nessun destinatario raggiungibile con queste regole: controlla il gruppo scelto.";
    case "NOT_ALLOWED":
      return "Non hai accesso a questa conversazione.";
    case "OFFICE_NOT_ALLOWED":
      return "Puoi scrivere solo a nome del tuo ufficio.";
    case "SUBJECT_REQUIRED":
      return "Scrivi l'oggetto.";
    case "BODY_TOO_LONG":
      return "Il testo supera i 20.000 caratteri.";
    case "SAFEGUARDING_EXCLUDED":
      return "Le segnalazioni di safeguarding non passano dalla posta del club: usa il canale riservato safeguarding.";
    case "AUDIENCE_REQUIRED":
      return "Scegli a chi scrivere.";
    case "NOT_A_DRAFT":
      return "Questo messaggio non è più una bozza.";
    case "GMAIL_NOT_CONNECTED":
      return "Prima collega la casella della società: poi puoi attivare l'invio.";
    case "INVALID_EMAIL":
      return "Indirizzo e-mail non valido.";
    case "IS_CLUB_PERSON":
      return "Questo indirizzo è già di una persona del club: collegalo alla persona.";
    case "PERSON_NOT_FOUND":
      return "Persona non trovata.";
    default:
      return "Operazione non riuscita. Riprova tra poco.";
  }
}

// ------------------------------------------------------------------ addresses

/** Same pattern as the database (r95). */
const EMAIL_RE = /^[^@\s<>",;]+@[^@\s<>",;]+\.[^@\s<>",;]+$/;

export function normalizeEmail(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

export function isValidEmail(s: string | null | undefined): boolean {
  return EMAIL_RE.test(normalizeEmail(s));
}

/** Free-text list ("a@b.it; c@d.it\n e@f.it") → unique normalised addresses, in order. */
export function parseEmailList(text: string): string[] {
  const out: string[] = [];
  for (const raw of text.split(/[\s,;]+/)) {
    const e = normalizeEmail(raw.replace(/^<|>$/g, ""));
    if (e && !out.includes(e)) out.push(e);
  }
  return out;
}

// ------------------------------------------------------------------ minors rule (mirror of scd_comm_resolve_*)

export interface RulePerson {
  id: string;
  name: string;
  birthDate: string | null;
  email: string | null;
  status: "ACTIVE" | "PENDING" | "LEFT" | "ARCHIVED";
  athlete: boolean;
  optOut?: boolean;
  teamIds?: string[];
}

export interface RuleFamilyMember {
  familyId: string;
  personId: string;
  isGuardian: boolean;
}

export interface RuleContact {
  id: string;
  email: string;
  label: string;
  kind: ContactKind | "PERSON";
  status: "PROPOSTO" | "COLLEGATO" | "SCARTATO";
  personId?: string | null;
}

export interface Envelope {
  email: string;
  cc: string[];
  kind: EnvelopeKind;
  label: string;
  personId: string | null;
  familyId: string | null;
  contactId: string | null;
  guardianForPersonId: string | null;
}

export interface Resolution {
  envelopes: Envelope[];
  excluded: Record<string, number>;
}

/** Whole years between birth date and today (YYYY-MM-DD), or null when unknown. */
export function ageOn(birthDate: string | null | undefined, today: string): number | null {
  if (!birthDate || !/^\d{4}-\d{2}-\d{2}/.test(birthDate) || !/^\d{4}-\d{2}-\d{2}/.test(today)) return null;
  const [by, bm, bd] = birthDate.slice(0, 10).split("-").map(Number) as [number, number, number];
  const [ty, tm, td] = today.slice(0, 10).split("-").map(Number) as [number, number, number];
  let age = ty - by;
  if (tm < bm || (tm === bm && td < bd)) age -= 1;
  return age;
}

export type AgeBand = "ADULT" | "U18" | "U14" | "UNKNOWN";

export function ageBand(age: number | null): AgeBand {
  if (age === null) return "UNKNOWN";
  if (age < 14) return "U14";
  if (age < 18) return "U18";
  return "ADULT";
}

export const AGE_BAND_LABEL: Readonly<Record<AgeBand, string>> = {
  ADULT: "adulto",
  U18: "14-17 anni: scrive con i genitori in copia",
  U14: "sotto i 14: scrivono solo i genitori",
  UNKNOWN: "età non nota: scrivono i genitori",
};

const KIND_RANK: Readonly<Record<EnvelopeKind, number>> = { DIRECT: 1, MINOR_WITH_GUARDIANS: 2, GUARDIAN: 3, CONTACT: 4, FREE: 5 };

function bump(map: Record<string, number>, key: string) {
  map[key] = (map[key] ?? 0) + 1;
}

/**
 * Pure mirror of scd_comm_resolve_core + scd_comm_resolve_envelopes. Used by tests and by the composer to explain
 * the rule; the envelopes actually sent are always resolved again by the database at queue time.
 */
export function resolveEnvelopes(
  input: { people: readonly RulePerson[]; members: readonly RuleFamilyMember[]; contacts?: readonly RuleContact[]; mailbox: string },
  audience: Audience,
  today: string,
): Resolution {
  const excluded: Record<string, number> = {};
  const contacts = input.contacts ?? [];
  const mailbox = normalizeEmail(input.mailbox);
  const byId = new Map(input.people.map((p) => [p.id, p]));
  const validOf = (p: RulePerson) => (p.email && isValidEmail(p.email) ? normalizeEmail(p.email) : null);
  const active = (p: RulePerson) => p.status === "ACTIVE" || p.status === "PENDING";
  const freeEmails = audience.kind === "FREE" ? [...new Set((audience.emails ?? []).map(normalizeEmail).filter(Boolean))] : [];

  const picked = contacts.filter(
    (c) =>
      (audience.kind === "SPONSORS" && c.kind === "SPONSOR" && c.status === "COLLEGATO") ||
      (audience.kind === "SUPPLIERS" && c.kind === "SUPPLIER" && c.status === "COLLEGATO") ||
      (audience.kind === "CONTACT" && c.id === audience.contactId && c.status !== "SCARTATO"),
  );

  const targets = input.people.filter((p) => {
    switch (audience.kind) {
      case "ALL_MEMBERS":
        return p.status === "ACTIVE" && p.athlete;
      case "TEAM":
        return p.status === "ACTIVE" && p.athlete && !!audience.teamId && (p.teamIds ?? []).includes(audience.teamId);
      case "BIRTH_YEAR":
        return p.status === "ACTIVE" && p.athlete && !!p.birthDate && Number(p.birthDate.slice(0, 4)) === audience.birthYear;
      case "PERSON":
        return p.id === audience.personId;
      case "FAMILY":
        return input.members.some((m) => m.personId === p.id && m.familyId === audience.familyId);
      case "FREE":
        return !!p.email && freeEmails.includes(normalizeEmail(p.email));
      default:
        return picked.some((c) => c.personId === p.id);
    }
  });
  if (!["ALL_MEMBERS", "TEAM", "BIRTH_YEAR", "PERSON", "FAMILY", "SPONSORS", "SUPPLIERS", "CONTACT", "FREE"].includes(audience.kind)) {
    bump(excluded, "UNKNOWN_AUDIENCE");
  }

  const guardiansOf = (minor: RulePerson) => {
    const families = input.members.filter((m) => m.personId === minor.id).map((m) => m.familyId);
    const out: Array<{ person: RulePerson; email: string; familyId: string }> = [];
    for (const m of input.members) {
      if (!m.isGuardian || m.personId === minor.id || !families.includes(m.familyId)) continue;
      const g = byId.get(m.personId);
      if (!g || !active(g) || g.optOut) continue;
      const gAge = ageOn(g.birthDate, today);
      if (gAge !== null && gAge < 18) continue;
      const email = validOf(g);
      if (!email || out.some((x) => x.person.id === g.id)) continue;
      out.push({ person: g, email, familyId: m.familyId });
    }
    return out;
  };

  const candidates: Envelope[] = [];
  for (const p of targets) {
    const age = ageOn(p.birthDate, today);
    const email = validOf(p);
    const minor = age === null || age < 18;
    const guardians = minor ? guardiansOf(p) : [];
    if (!active(p)) {
      bump(excluded, "PERSON_NOT_ACTIVE");
      continue;
    }
    if (p.optOut) {
      bump(excluded, "OPT_OUT");
      continue;
    }
    if (!minor) {
      if (!email) bump(excluded, "NO_EMAIL");
      else candidates.push({ email, cc: [], kind: "DIRECT", label: p.name, personId: p.id, familyId: null, contactId: null, guardianForPersonId: null });
      continue;
    }
    if (guardians.length === 0) {
      bump(excluded, age === null ? "BIRTH_DATE_UNKNOWN_NO_GUARDIAN" : "MINOR_NO_GUARDIAN");
      continue;
    }
    if (age !== null && age >= 14 && email) {
      candidates.push({
        email,
        cc: [...new Set(guardians.map((g) => g.email))].sort(),
        kind: "MINOR_WITH_GUARDIANS",
        label: p.name,
        personId: p.id,
        familyId: guardians[0]?.familyId ?? null,
        contactId: null,
        guardianForPersonId: null,
      });
      continue;
    }
    for (const g of guardians) {
      candidates.push({ email: g.email, cc: [], kind: "GUARDIAN", label: g.person.name, personId: g.person.id, familyId: g.familyId, contactId: null, guardianForPersonId: p.id });
    }
  }
  for (const c of picked) {
    if (c.personId) continue;
    candidates.push({ email: normalizeEmail(c.email), cc: [], kind: "CONTACT", label: c.label, personId: null, familyId: null, contactId: c.id, guardianForPersonId: null });
  }
  for (const e of freeEmails) {
    if (input.people.some((p) => p.email && normalizeEmail(p.email) === e)) continue;
    if (!isValidEmail(e)) {
      bump(excluded, "INVALID_EMAIL");
      continue;
    }
    if (e === mailbox) {
      bump(excluded, "CLUB_MAILBOX");
      continue;
    }
    const c = contacts.find((x) => normalizeEmail(x.email) === e && x.status !== "SCARTATO");
    candidates.push({ email: e, cc: [], kind: c ? "CONTACT" : "FREE", label: c?.label ?? e, personId: null, familyId: null, contactId: c?.id ?? null, guardianForPersonId: null });
  }

  const u14 = under14Addresses(input.people, input.members, today);
  const best = new Map<string, Envelope>();
  for (const c of candidates) {
    if (u14.has(c.email)) {
      bump(excluded, "UNDER_14_ADDRESS");
      continue;
    }
    const cc = c.cc.filter((x) => x !== c.email && !u14.has(x));
    if (c.kind === "MINOR_WITH_GUARDIANS" && cc.length === 0) {
      bump(excluded, "MINOR_WITHOUT_GUARDIAN_COPY");
      continue;
    }
    const prev = best.get(c.email);
    if (!prev || KIND_RANK[c.kind] < KIND_RANK[prev.kind] || (KIND_RANK[c.kind] === KIND_RANK[prev.kind] && c.label < prev.label)) {
      best.set(c.email, { ...c, cc });
    }
  }
  const envelopes = [...best.values()].sort((a, b) => (a.kind === b.kind ? (a.label === b.label ? a.email.localeCompare(b.email) : a.label.localeCompare(b.label)) : a.kind.localeCompare(b.kind)));
  return { envelopes, excluded };
}

/** Addresses that belong to some child under 14 and to no adult or guardian (never used). */
export function under14Addresses(people: readonly RulePerson[], members: readonly RuleFamilyMember[], today: string): Set<string> {
  const child = new Set<string>();
  const adult = new Set<string>();
  const guardians = new Set(members.filter((m) => m.isGuardian).map((m) => m.personId));
  for (const p of people) {
    if (!p.email) continue;
    const e = normalizeEmail(p.email);
    const age = ageOn(p.birthDate, today);
    if (age !== null && age < 14) child.add(e);
    if ((age !== null && age >= 18) || guardians.has(p.id)) adult.add(e);
  }
  return new Set([...child].filter((e) => !adult.has(e)));
}

/** Counts per envelope kind for the composer summary. */
export function envelopeBreakdown(envelopes: ReadonlyArray<{ kind: string }>): Array<{ kind: EnvelopeKind; label: string; count: number }> {
  const order: EnvelopeKind[] = ["DIRECT", "GUARDIAN", "MINOR_WITH_GUARDIANS", "CONTACT", "FREE"];
  return order
    .map((k) => ({ kind: k, label: ENVELOPE_LABEL[k], count: envelopes.filter((e) => e.kind === k).length }))
    .filter((x) => x.count > 0);
}

// ------------------------------------------------------------------ inbound matching (mirror of scd_comm_record_inbound)

export type InboundMatch =
  | { kind: "OWN" }
  | { kind: "PERSON"; personId: string }
  | { kind: "CONTACT"; contactId: string; office: Office }
  | { kind: "PROPOSED"; contactId: string | null }
  | { kind: "DISCARDED"; contactId: string };

export function matchInboundAddress(
  from: string,
  people: ReadonlyArray<Pick<RulePerson, "id" | "email" | "status" | "birthDate">>,
  contacts: readonly RuleContact[],
  mailbox: string,
  today: string,
): InboundMatch {
  const e = normalizeEmail(from);
  if (e === normalizeEmail(mailbox)) return { kind: "OWN" };
  const persons = people
    .filter((p) => p.email && normalizeEmail(p.email) === e && (p.status === "ACTIVE" || p.status === "PENDING"))
    .sort((a, b) => Number((ageOn(b.birthDate, today) ?? 0) >= 18) - Number((ageOn(a.birthDate, today) ?? 0) >= 18));
  const person = persons[0];
  if (person) return { kind: "PERSON", personId: person.id };
  const c = contacts.find((x) => normalizeEmail(x.email) === e);
  if (!c) return { kind: "PROPOSED", contactId: null };
  if (c.status === "SCARTATO") return { kind: "DISCARDED", contactId: c.id };
  if (c.status === "PROPOSTO") return { kind: "PROPOSED", contactId: c.id };
  return { kind: "CONTACT", contactId: c.id, office: c.kind === "SUPPLIER" ? "TESORERIA" : c.kind === "SPONSOR" ? "DIREZIONE" : "SEGRETERIA" };
}

// ------------------------------------------------------------------ daily cap (mirror of scd_comm_outbox_claim)

export interface BatchPlan {
  /** Envelopes to send in this run. */
  take: number;
  /** Room left today after this run. */
  roomAfter: number;
  /** Envelopes that wait for the next run or for tomorrow. */
  deferred: number;
  /** True when the daily cap, not the batch size, stops the run. */
  capReached: boolean;
}

export function planDailyBatch(o: { queued: number; sentToday: number; cap: number; batchMax: number }): BatchPlan {
  const queued = Math.max(0, Math.floor(o.queued));
  const room = Math.max(0, Math.floor(o.cap) - Math.max(0, Math.floor(o.sentToday)));
  const take = Math.min(queued, room, Math.max(0, Math.floor(o.batchMax)));
  return { take, roomAfter: room - take, deferred: queued - take, capReached: queued > take && take === room };
}

/** "Oggi 120 su 400 · 30 in coda" plus, when over the cap, when the rest leaves. */
export function capSummary(o: { sentToday: number; cap: number; queued: number }): string {
  const room = Math.max(0, o.cap - o.sentToday);
  const base = `Oggi inviate ${o.sentToday} su ${o.cap}`;
  if (o.queued === 0) return base;
  if (o.queued <= room) return `${base} · ${o.queued} in coda, partono con il prossimo giro`;
  return `${base} · ${o.queued} in coda: ${room} oggi, ${o.queued - room} da domani (limite giornaliero di Gmail)`;
}

// ------------------------------------------------------------------ signature

/** Footer appended to every outgoing e-mail: who wrote it, for which office, and that replies come back to the club. */
export function signature(senderName: string | null | undefined, office: Office | null | undefined): string {
  const who = (senderName ?? "").trim() || "Lo staff";
  const where = office ? OFFICE_LABEL[office] : "Società";
  return `\n\n--\n${who} · ${where}\nS.C.D. ColicoDerviese · Colico e Dervio\nRispondi a questa e-mail: la risposta arriva alla società e resta agli atti.`;
}

// ------------------------------------------------------------------ payloads from the database

export interface CommSettings {
  mailbox: string;
  sendingEnabled: boolean;
  gmailConnected: boolean;
  connectedAt: string | null;
  dailyCap: number;
  lastSyncAt: string | null;
  sentToday: number;
  queued: number;
  failedToday: number;
}

export interface ThreadSummary {
  id: string;
  channel: Channel;
  subject: string;
  confidentiality: Confidentiality;
  office: Office;
  counterpartKind: string;
  counterpartLabel: string | null;
  status: "APERTO" | "CHIUSO";
  unread: boolean;
  lastMessageAt: string;
  contactId: string | null;
  messages: number;
  drafts: number;
  queued: number;
  last: { direction: "IN" | "OUT"; snippet: string; from: string | null; at: string | null; delivery: Delivery | null; senderName: string | null } | null;
}

export interface ContactProposal {
  id: string;
  email: string;
  displayName: string | null;
  firstSeenAt: string | null;
  messages: number;
  lastSubject: string | null;
}

export interface Inbox {
  me: string | null;
  offices: Office[];
  settings: CommSettings;
  threads: ThreadSummary[];
  proposals: ContactProposal[];
}

export interface ThreadMessage {
  id: string;
  direction: "IN" | "OUT";
  office: Office | null;
  subject: string;
  body: string;
  from: string | null;
  fromName: string | null;
  to: string[];
  cc: string[];
  delivery: Delivery | null;
  audience: Audience | null;
  recipients: number;
  attachments: number;
  queuedAt: string | null;
  sentAt: string | null;
  receivedAt: string | null;
  createdAt: string;
  mine: boolean;
  senderName: string | null;
  status: Record<string, number>;
}

export interface ThreadDetail {
  id: string;
  subject: string;
  confidentiality: Confidentiality;
  office: Office;
  channel: Channel;
  status: "APERTO" | "CHIUSO";
  counterpartKind: string;
  counterpartLabel: string | null;
  audience: Audience | null;
  contactId: string | null;
  canManage: boolean;
  messages: ThreadMessage[];
}

export interface ResolvePreview {
  total: number;
  recipients: Envelope[];
  excluded: Record<string, number>;
}

export interface Directory {
  people: Array<{ id: string; label: string; hasEmail: boolean; band: AgeBand }>;
  families: Array<{ id: string; label: string }>;
  contacts: Array<{ id: string; label: string; email: string; kind: string; orgName: string | null }>;
  teams: Array<{ id: string; label: string; athletes: number }>;
  birthYears: Array<{ year: number; athletes: number }>;
  counts: { sponsors: number; suppliers: number };
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown): string | null => (typeof v === "string" ? v : null);
const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : 0);
const bool = (v: unknown): boolean => v === true;
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const strs = (v: unknown): string[] => arr(v).filter((x): x is string => typeof x === "string");
const oneOf = <T extends string>(v: unknown, xs: readonly T[], d: T): T => (typeof v === "string" && (xs as readonly string[]).includes(v) ? (v as T) : d);
const DELIVERIES: readonly Delivery[] = ["PENDING", "QUEUED", "SENT", "FAILED", "DRAFT"];
const ENVELOPE_KINDS: readonly EnvelopeKind[] = ["DIRECT", "GUARDIAN", "MINOR_WITH_GUARDIANS", "CONTACT", "FREE"];
const AUDIENCE_KINDS: readonly AudienceKind[] = ["ALL_MEMBERS", "TEAM", "BIRTH_YEAR", "SPONSORS", "SUPPLIERS", "PERSON", "FAMILY", "CONTACT", "FREE"];

export function parseAudience(v: unknown): Audience | null {
  if (!isObj(v)) return null;
  const kind = str(v["kind"]);
  if (!kind || !(AUDIENCE_KINDS as readonly string[]).includes(kind)) return null;
  const a: Audience = { kind: kind as AudienceKind };
  const teamId = str(v["teamId"]);
  const personId = str(v["personId"]);
  const familyId = str(v["familyId"]);
  const contactId = str(v["contactId"]);
  const label = str(v["label"]);
  if (teamId) a.teamId = teamId;
  if (personId) a.personId = personId;
  if (familyId) a.familyId = familyId;
  if (contactId) a.contactId = contactId;
  if (label) a.label = label;
  if (v["birthYear"] !== undefined && v["birthYear"] !== null) a.birthYear = num(v["birthYear"]);
  if (Array.isArray(v["emails"])) a.emails = strs(v["emails"]);
  return a;
}

function parseOffice(v: unknown): Office | null {
  return typeof v === "string" && (OFFICES as readonly string[]).includes(v) ? (v as Office) : null;
}

export function parseInbox(v: unknown): Inbox | null {
  if (!isObj(v)) return null;
  const s = isObj(v["settings"]) ? v["settings"] : {};
  return {
    me: str(v["me"]),
    offices: strs(v["offices"]).map(parseOffice).filter((x): x is Office => x !== null),
    settings: {
      mailbox: str(s["mailbox"]) ?? "sportclubcolico@gmail.com",
      sendingEnabled: bool(s["sendingEnabled"]),
      gmailConnected: bool(s["gmailConnected"]),
      connectedAt: str(s["connectedAt"]),
      dailyCap: num(s["dailyCap"]) || 400,
      lastSyncAt: str(s["lastSyncAt"]),
      sentToday: num(s["sentToday"]),
      queued: num(s["queued"]),
      failedToday: num(s["failedToday"]),
    },
    threads: arr(v["threads"]).filter(isObj).map((t) => {
      const last = isObj(t["last"]) ? t["last"] : null;
      return {
        id: str(t["id"]) ?? "",
        channel: oneOf(t["channel"], ["EMAIL", "APP", "WHATSAPP"] as const, "EMAIL"),
        subject: str(t["subject"]) ?? "",
        confidentiality: oneOf(t["confidentiality"], ["ORDINARIO", "RISERVATO"] as const, "ORDINARIO"),
        office: parseOffice(t["office"]) ?? "SEGRETERIA",
        counterpartKind: str(t["counterpartKind"]) ?? "EXTERNAL",
        counterpartLabel: str(t["counterpartLabel"]),
        status: oneOf(t["status"], ["APERTO", "CHIUSO"] as const, "APERTO"),
        unread: bool(t["unread"]),
        lastMessageAt: str(t["lastMessageAt"]) ?? "",
        contactId: str(t["contactId"]),
        messages: num(t["messages"]),
        drafts: num(t["drafts"]),
        queued: num(t["queued"]),
        last: last
          ? {
              direction: oneOf(last["direction"], ["IN", "OUT"] as const, "OUT"),
              snippet: str(last["snippet"]) ?? "",
              from: str(last["from"]),
              at: str(last["at"]),
              delivery: last["delivery"] == null ? null : oneOf(last["delivery"], DELIVERIES, "DRAFT"),
              senderName: str(last["senderName"]),
            }
          : null,
      };
    }).filter((t) => t.id !== ""),
    proposals: arr(v["proposals"]).filter(isObj).map((c) => ({
      id: str(c["id"]) ?? "",
      email: str(c["email"]) ?? "",
      displayName: str(c["displayName"]),
      firstSeenAt: str(c["firstSeenAt"]),
      messages: num(c["messages"]),
      lastSubject: str(c["lastSubject"]),
    })).filter((c) => c.id !== ""),
  };
}

export function parseThread(v: unknown): ThreadDetail | null {
  if (!isObj(v) || !str(v["id"])) return null;
  return {
    id: str(v["id"]) ?? "",
    subject: str(v["subject"]) ?? "",
    confidentiality: oneOf(v["confidentiality"], ["ORDINARIO", "RISERVATO"] as const, "ORDINARIO"),
    office: parseOffice(v["office"]) ?? "SEGRETERIA",
    channel: oneOf(v["channel"], ["EMAIL", "APP", "WHATSAPP"] as const, "EMAIL"),
    status: oneOf(v["status"], ["APERTO", "CHIUSO"] as const, "APERTO"),
    counterpartKind: str(v["counterpartKind"]) ?? "EXTERNAL",
    counterpartLabel: str(v["counterpartLabel"]),
    audience: parseAudience(v["audience"]),
    contactId: str(v["contactId"]),
    canManage: bool(v["canManage"]),
    messages: arr(v["messages"]).filter(isObj).map((m) => ({
      id: str(m["id"]) ?? "",
      direction: oneOf(m["direction"], ["IN", "OUT"] as const, "OUT"),
      office: parseOffice(m["office"]),
      subject: str(m["subject"]) ?? "",
      body: str(m["body"]) ?? "",
      from: str(m["from"]),
      fromName: str(m["fromName"]),
      to: strs(m["to"]),
      cc: strs(m["cc"]),
      delivery: m["delivery"] == null ? null : oneOf(m["delivery"], DELIVERIES, "DRAFT"),
      audience: parseAudience(m["audience"]),
      recipients: num(m["recipients"]),
      attachments: num(m["attachments"]),
      queuedAt: str(m["queuedAt"]),
      sentAt: str(m["sentAt"]),
      receivedAt: str(m["receivedAt"]),
      createdAt: str(m["createdAt"]) ?? "",
      mine: bool(m["mine"]),
      senderName: str(m["senderName"]),
      status: isObj(m["status"]) ? Object.fromEntries(Object.entries(m["status"]).map(([k, n]) => [k, num(n)])) : {},
    })),
  };
}

export function parseResolve(v: unknown): ResolvePreview | null {
  if (!isObj(v) || v["ok"] !== true) return null;
  return {
    total: num(v["total"]),
    recipients: arr(v["recipients"]).filter(isObj).map((r) => ({
      email: str(r["email"]) ?? "",
      cc: strs(r["cc"]),
      kind: oneOf(r["kind"], ENVELOPE_KINDS, "FREE"),
      label: str(r["label"]) ?? str(r["email"]) ?? "",
      personId: str(r["personId"]),
      familyId: str(r["familyId"]),
      contactId: str(r["contactId"]),
      guardianForPersonId: str(r["guardianForPersonId"]),
    })),
    excluded: isObj(v["excluded"]) ? Object.fromEntries(Object.entries(v["excluded"]).map(([k, n]) => [k, num(n)])) : {},
  };
}

export function parseDirectory(v: unknown): Directory | null {
  if (!isObj(v)) return null;
  const counts = isObj(v["counts"]) ? v["counts"] : {};
  return {
    people: arr(v["people"]).filter(isObj).map((p) => ({
      id: str(p["id"]) ?? "",
      label: str(p["label"]) ?? "",
      hasEmail: bool(p["hasEmail"]),
      band: oneOf(p["band"], ["ADULT", "U18", "U14", "UNKNOWN"] as const, "UNKNOWN"),
    })),
    families: arr(v["families"]).filter(isObj).map((f) => ({ id: str(f["id"]) ?? "", label: str(f["label"]) ?? "" })),
    contacts: arr(v["contacts"]).filter(isObj).map((c) => ({
      id: str(c["id"]) ?? "",
      label: str(c["label"]) ?? "",
      email: str(c["email"]) ?? "",
      kind: str(c["kind"]) ?? "EXTERNAL",
      orgName: str(c["orgName"]),
    })),
    teams: arr(v["teams"]).filter(isObj).map((t) => ({ id: str(t["id"]) ?? "", label: str(t["label"]) ?? "", athletes: num(t["athletes"]) })),
    birthYears: arr(v["birthYears"]).filter(isObj).map((y) => ({ year: num(y["year"]), athletes: num(y["athletes"]) })),
    counts: { sponsors: num(counts["sponsors"]), suppliers: num(counts["suppliers"]) },
  };
}

// ------------------------------------------------------------------ inbox filters

export type InboxFilter = "tutte" | "non-lette" | "aperte" | "riservate" | "ordinarie" | "bozze" | "nuovi-contatti";

export const INBOX_FILTERS: ReadonlyArray<{ id: InboxFilter; label: string }> = [
  { id: "tutte", label: "Tutte" },
  { id: "non-lette", label: "Non lette" },
  { id: "aperte", label: "Aperte" },
  { id: "riservate", label: "Riservate" },
  { id: "ordinarie", label: "Ordinarie" },
  { id: "bozze", label: "Bozze" },
  { id: "nuovi-contatti", label: "Nuovi contatti" },
];

export function filterThreads(threads: readonly ThreadSummary[], filter: InboxFilter, office: Office | "TUTTI", q: string): ThreadSummary[] {
  const needle = q.trim().toLowerCase();
  return threads.filter((t) => {
    if (office !== "TUTTI" && t.office !== office) return false;
    if (filter === "non-lette" && !t.unread) return false;
    if (filter === "aperte" && t.status !== "APERTO") return false;
    if (filter === "riservate" && t.confidentiality !== "RISERVATO") return false;
    if (filter === "ordinarie" && t.confidentiality !== "ORDINARIO") return false;
    if (filter === "bozze" && t.drafts === 0) return false;
    if (filter === "nuovi-contatti") return false;
    if (needle && !`${t.subject} ${t.counterpartLabel ?? ""} ${t.last?.snippet ?? ""}`.toLowerCase().includes(needle)) return false;
    return true;
  });
}

export function inboxCounts(inbox: Inbox | null): { unread: number; open: number; proposals: number; drafts: number } {
  if (!inbox) return { unread: 0, open: 0, proposals: 0, drafts: 0 };
  return {
    unread: inbox.threads.filter((t) => t.unread).length,
    open: inbox.threads.filter((t) => t.status === "APERTO").length,
    proposals: inbox.proposals.length,
    drafts: inbox.threads.reduce((n, t) => n + t.drafts, 0),
  };
}

/** Subject of a reply: one "Re: " prefix, never stacked. */
export function replySubject(subject: string): string {
  const s = subject.trim();
  return /^re:\s/i.test(s) ? s : `Re: ${s}`.slice(0, 250);
}

/** Audience to answer the counterpart of a thread: the last inbound sender, else the thread's own audience. */
export function replyAudience(thread: Pick<ThreadDetail, "audience" | "messages">): Audience | null {
  const lastIn = [...thread.messages].reverse().find((m) => m.direction === "IN" && m.from);
  if (lastIn?.from) return { kind: "FREE", emails: [normalizeEmail(lastIn.from)], label: lastIn.fromName ?? lastIn.from };
  return thread.audience;
}
