/**
 * Simple access (UD-114, Direzione 14/10/2026 16:40): one way in, like the big apps.
 *
 *   1. Register once: name, surname, birth date, e-mail, phone (mandatory), password, consent; optional "Chi sei nel
 *      club?" (fan, member, parent of…, athlete, coach, club official, staff, volunteer, sponsor).
 *   2. One confirmation e-mail with a link, only the first time.
 *   3. From then on: e-mail + password (with "Ricordami"), or Google / Apple / Facebook when the club enables them.
 *      Forgotten password → code by e-mail → new password. Never a link at every sign-in.
 *   4. Everyone lands at once in the open area (calendar, news, events, results). Declarations that the club can
 *      check automatically (a parent whose confirmed e-mail is already in the registry with that child; an athlete
 *      with the same e-mail and birth date) open their area immediately; everything else stays open-area only and
 *      goes to the office. Coaches, officials and staff are never opened automatically: the Direttore Sportivo is
 *      notified and the Presidente authorizes.
 *
 * Pure rules only (validation, normalization, labels), shared by the form, the server function and the tests.
 */
import { ageOn, cleanPhone } from "./access-requests";
import { passwordProblem } from "./auth-remember";

export const DECLARATION_KINDS = [
  {
    id: "TIFOSO",
    label: "Tifoso o amico del club",
    hint: "Segui squadre, partite e notizie.",
  },
  { id: "SOCIO", label: "Socio", hint: "Sei iscritto all'associazione." },
  {
    id: "GENITORE",
    label: "Genitore o tutore",
    hint: "Hai un figlio o una figlia che gioca con noi.",
  },
  {
    id: "ATLETA",
    label: "Atleta",
    hint: "Giochi in una squadra della S.C.D. (dai 14 anni).",
  },
  { id: "MISTER", label: "Mister o preparatore", hint: "Alleni una squadra." },
  {
    id: "DIRIGENTE",
    label: "Dirigente",
    hint: "Hai un incarico in società o in un'annata.",
  },
  {
    id: "STAFF",
    label: "Staff o collaboratore",
    hint: "Segreteria, campi, magazzino, pulmini…",
  },
  {
    id: "VOLONTARIO",
    label: "Volontario",
    hint: "Dai una mano a eventi e tornei.",
  },
  {
    id: "SPONSOR",
    label: "Sponsor o partner",
    hint: "Rappresenti un'azienda partner.",
  },
] as const;

export type DeclarationKind = (typeof DECLARATION_KINDS)[number]["id"];

/** Declarations that never open anything by themselves: the Direttore Sportivo is told, the Presidente authorizes. */
export const ROLE_REVIEW_KINDS: readonly DeclarationKind[] = [
  "MISTER",
  "DIRIGENTE",
  "STAFF",
];

/** Declarations the database may verify on its own against the registry (staged migration r102). */
export const AUTO_CHECK_KINDS: readonly DeclarationKind[] = [
  "GENITORE",
  "ATLETA",
];

export const MAX_CHILDREN = 5;

export interface DeclaredChild {
  firstName: string;
  lastName: string;
  /** Birth year as typed ("2014"), empty when unknown. */
  birthYear: string;
}

export interface Declaration {
  kinds: DeclarationKind[];
  children: DeclaredChild[];
  /** Free text: team, role, company… at most 200 characters. */
  note: string;
}

export const EMPTY_DECLARATION: Declaration = {
  kinds: [],
  children: [],
  note: "",
};

export interface SignupInput {
  firstName: string;
  lastName: string;
  birthDate: string;
  email: string;
  phone: string;
  password: string;
  confirm: string;
  consent: boolean;
  declaration: Declaration;
}

const EMAIL = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i;
const PHONE = /^\+?[0-9 ]{6,20}$/;
const NAME = /^[\p{L}][\p{L}' .-]{1,79}$/u;

export type SignupField =
  Exclude<keyof SignupInput, "declaration"> | "children";

/** Errors in plain Italian, keyed by field; empty when the registration can be sent. */
export function validateSignup(
  i: SignupInput,
  todayIso: string,
): Partial<Record<SignupField, string>> {
  const e: Partial<Record<SignupField, string>> = {};
  if (!NAME.test(i.firstName.trim())) e.firstName = "Scrivi il nome.";
  if (!NAME.test(i.lastName.trim())) e.lastName = "Scrivi il cognome.";
  const age = ageOn(i.birthDate, todayIso);
  if (age === null || age > 106 || i.birthDate > todayIso)
    e.birthDate = "Data di nascita non valida.";
  else if (age < 14)
    e.birthDate =
      "Sotto i 14 anni la registrazione la fa un genitore o tutore, con i suoi dati.";
  if (!EMAIL.test(i.email.trim()) || i.email.trim().length > 120)
    e.email = "E-mail non valida.";
  if (!PHONE.test(cleanPhone(i.phone)))
    e.phone = "Il telefono serve: scrivilo così, 333 1234567.";
  const pw = passwordProblem(i.password, i.confirm);
  if (pw) {
    if (/uguali|coincid|conferma/i.test(pw)) e.confirm = pw;
    else e.password = pw;
  }
  if (!i.consent) e.consent = "Serve il consenso al trattamento dei dati.";
  const childErr = childrenProblem(i.declaration, todayIso);
  if (childErr) e.children = childErr;
  return e;
}

/** A parent must name at least one child; each child needs name and surname; the year, when given, must make sense. */
export function childrenProblem(
  d: Declaration,
  todayIso: string,
): string | null {
  if (!d.kinds.includes("GENITORE")) return null;
  const filled = d.children.filter(
    (c) => c.firstName.trim() || c.lastName.trim() || c.birthYear.trim(),
  );
  if (filled.length === 0)
    return "Scrivi nome e cognome di almeno un figlio o una figlia.";
  const thisYear = Number(todayIso.slice(0, 4));
  for (const c of filled) {
    if (!NAME.test(c.firstName.trim()) || !NAME.test(c.lastName.trim()))
      return "Per ogni figlio scrivi nome e cognome.";
    const y = c.birthYear.trim();
    if (
      y &&
      (!/^\d{4}$/.test(y) || Number(y) < thisYear - 30 || Number(y) > thisYear)
    )
      return "Anno di nascita del figlio non valido (es. 2014).";
  }
  return null;
}

const KIND_IDS = new Set<string>(DECLARATION_KINDS.map((k) => k.id));

function squash(v: string, max: number): string {
  return v.replace(/\s+/g, " ").trim().slice(0, max);
}

/**
 * Normalized declaration sent to the server and stored: known kinds only (deduplicated, catalogue order),
 * children only for parents, trimmed, at most MAX_CHILDREN; "TIFOSO" when nothing was chosen (the open area).
 */
export function normalizeDeclaration(d: Declaration): Declaration {
  const kinds = DECLARATION_KINDS.map((k) => k.id).filter(
    (id) => d.kinds.includes(id) && KIND_IDS.has(id),
  );
  const children = kinds.includes("GENITORE")
    ? d.children
        .map((c) => ({
          firstName: squash(c.firstName, 80),
          lastName: squash(c.lastName, 80),
          birthYear: squash(c.birthYear, 4),
        }))
        .filter((c) => c.firstName && c.lastName)
        .slice(0, MAX_CHILDREN)
    : [];
  return {
    kinds: kinds.length ? kinds : ["TIFOSO"],
    children,
    note: squash(d.note, 200),
  };
}

export type AccessPath = "OPEN_AREA" | "AUTO_CHECK" | "ROLE_REVIEW";

/**
 * What happens after the confirmation, in the order the person reads it. Always OPEN_AREA first (everyone gets in
 * at once); AUTO_CHECK when there is something the registry can confirm; ROLE_REVIEW when the Direttore Sportivo
 * must look at it.
 */
export function accessPaths(d: Declaration): AccessPath[] {
  const n = normalizeDeclaration(d);
  const out: AccessPath[] = ["OPEN_AREA"];
  if (n.kinds.some((k) => AUTO_CHECK_KINDS.includes(k))) out.push("AUTO_CHECK");
  if (n.kinds.some((k) => ROLE_REVIEW_KINDS.includes(k)))
    out.push("ROLE_REVIEW");
  return out;
}

export const ACCESS_PATH_TEXT: Readonly<Record<AccessPath, string>> = {
  OPEN_AREA:
    "Entri subito nell'area aperta: calendario, partite, notizie, eventi e risultati.",
  AUTO_CHECK:
    "Se i tuoi dati coincidono con quelli che la società ha già (stessa e-mail e nomi dei figli o data di nascita), si apre subito anche l'area famiglia o atleta, con allenamenti e squadra.",
  ROLE_REVIEW:
    "Per mister, dirigenti e staff avvisiamo il Direttore Sportivo: dopo la verifica il Presidente ti abilita le sezioni che gestisci.",
};

export type SignupOutcome =
  | "CHECK_EMAIL"
  | "INVALID"
  | "WEAK_PASSWORD"
  | "MINOR_UNDER_14"
  | "BUSY"
  | "ERROR";

export const SIGNUP_MESSAGE: Readonly<Record<SignupOutcome, string>> = {
  CHECK_EMAIL:
    'Ti abbiamo mandato una e-mail: apri il link UNA volta sola per confermare l\'indirizzo. Da quel momento entri sempre con e-mail e password. Se avevi già un accesso, usa "Password dimenticata" in Accedi. Se non arriva entro qualche minuto controlla lo spam.',
  INVALID: "Controlla i dati inseriti e riprova.",
  WEAK_PASSWORD:
    "Password troppo facile da indovinare: scegline una più lunga o meno comune.",
  MINOR_UNDER_14:
    "Sotto i 14 anni la registrazione la fa un genitore o tutore, con i suoi dati.",
  BUSY: "In questo momento arrivano molte richieste: riprova tra qualche minuto.",
  ERROR:
    "Registrazione non riuscita, riprova tra poco. Se continua scrivi all'assistenza.",
};

/** Help desk: one place for every access problem (UD-114). */
export const SUPPORT = {
  email: "sportclubcolico@gmail.com",
  subject: "Assistenza app S.C.D. ColicoDerviese",
} as const;

export function supportMailto(context: string): string {
  const body = [
    "Ciao, ho bisogno di aiuto con l'app.",
    "",
    `Dove: ${context}`,
    "Cosa succede:",
    "E-mail con cui mi sono registrato:",
    "Telefono per richiamarmi:",
  ].join("\n");
  return `mailto:${SUPPORT.email}?subject=${encodeURIComponent(SUPPORT.subject)}&body=${encodeURIComponent(body)}`;
}

// ── Social sign-in providers ──────────────────────────────────────────────────────────────────────────

export const SOCIAL_PROVIDERS = [
  { id: "google", label: "Continua con Google" },
  { id: "apple", label: "Continua con Apple" },
  { id: "facebook", label: "Continua con Facebook" },
] as const;

export type SocialProvider = (typeof SOCIAL_PROVIDERS)[number]["id"];

/**
 * Providers switched on in Supabase Auth, read from the public `/auth/v1/settings` answer (`external` map).
 * A button is shown only when its provider is really enabled, so nobody taps a dead button.
 */
export function enabledProviders(settings: unknown): SocialProvider[] {
  if (!settings || typeof settings !== "object") return [];
  const ext = (settings as { external?: unknown }).external;
  if (!ext || typeof ext !== "object") return [];
  return SOCIAL_PROVIDERS.map((p) => p.id).filter(
    (id) => (ext as Record<string, unknown>)[id] === true,
  );
}

/** Profile data kept on the login (user metadata): no tax code, no child data beyond names and year. */
export function signupMetadata(
  i: Pick<SignupInput, "firstName" | "lastName" | "birthDate" | "phone">,
  d: Declaration,
): Record<string, unknown> {
  const n = normalizeDeclaration(d);
  return {
    first_name: squash(i.firstName, 80),
    last_name: squash(i.lastName, 80),
    birth_date: i.birthDate,
    phone: cleanPhone(i.phone),
    scd_declared: n,
    // Chosen at registration: sign-in with e-mail + password from the first time (auth-remember hasAppPassword).
    scd_password_set: true,
  };
}

// ── Social accounts: profile completion ──────────────────────────────────────────────────────────────

/** Page that asks a social account, once, for phone, birth date, consent and "Chi sei nel club?". */
export const PROFILE_PAGE = "/accedi/completa";

/** True for logins created by Google / Apple / Facebook (Supabase app_metadata.provider). */
export function isSocialUser(appMetadata: unknown): boolean {
  if (!appMetadata || typeof appMetadata !== "object") return false;
  const provider = (appMetadata as Record<string, unknown>)["provider"];
  return (
    typeof provider === "string" && provider !== "email" && provider !== "phone"
  );
}

/** Phone, birth date and consent already given (user metadata). */
export function profileComplete(userMetadata: unknown): boolean {
  if (!userMetadata || typeof userMetadata !== "object") return false;
  const m = userMetadata as Record<string, unknown>;
  return (
    typeof m["phone"] === "string" &&
    m["phone"] !== "" &&
    typeof m["birth_date"] === "string" &&
    m["birth_date"] !== "" &&
    m["scd_profile_consent"] === true
  );
}
