/**
 * "Vetrina richieste" phase F1 (UD-163, Francesco 16/10/2026 14:57 and 15:44): the vocabulary of the ONE request
 * catalogue (public.scd_requests, r133 + r139 STAGED) for the external kinds. Pure, no I/O. Mirror of the SQL rules of
 * supabase/migrations/20261017_r139_requests_intake.sql (scd_request_kind_rules, scd_request_kind_positions,
 * scd_request_clean_intake, scd_request_intake_text), kept equal by intake-migration.test.ts.
 *
 * Named intake-* on purpose: "vetrina" in the code is the public home schedule (lib/vetrina.ts). On screen the block
 * is called «Vetrina richieste».
 *
 * Two doors, one register: external parties (società, aziende, scuole, privati adulti) use the single Tally form
 * "Richieste alla SCD" (lib/intake-links.ts), members ask from their in-app area (phase F2). States shown to
 * everybody: Ricevuta -> In valutazione -> Accettata | Non accolta -> In gestione -> Chiusa. Payment only after
 * acceptance, recorded by a Tesoreria person (15:44 «Li crea la Tesoreria»). Deciders are positions of
 * lib/chi-fa-cosa.ts; the DG confirms everything (13:31). No minors' data, no health data, no amounts in notices.
 *
 * Engines: TEMPO (one catalogue, the right deciders told at once) and SOLDI (tournament fees and rentals traced from
 * acceptance to payment). Measure: requests per month and kind, median hours from Ricevuta to decision, share of
 * accepted requests reconciled within 7 days of «Link inviato».
 */
import type { ChiFaCosaTopic } from "./chi-fa-cosa";

/* ------------------------------------------------------------------ kinds */

export const INTAKE_KINDS = ["ISCRIZIONE_TORNEO", "SPONSOR", "CONVENZIONE", "AFFITTO_CAMPO", "VISITA_CENTRO", "ALTRO"] as const;
export type IntakeKind = (typeof INTAKE_KINDS)[number];

export function isIntakeKind(v: unknown): v is IntakeKind {
  return typeof v === "string" && (INTAKE_KINDS as readonly string[]).includes(v);
}

export const INTAKE_KIND_LABEL: Readonly<Record<IntakeKind, string>> = {
  ISCRIZIONE_TORNEO: "Iscrizione a un torneo",
  SPONSOR: "Sponsor",
  CONVENZIONE: "Convenzione o partnership",
  AFFITTO_CAMPO: "Affitto di un campo",
  VISITA_CENTRO: "Visita ai centri",
  ALTRO: "Altra richiesta",
};

/** Value of the Tally hidden field `tipo` for each kind (config/scd-requests-intake.v1.json "kinds"). */
export const INTAKE_SLUG: Readonly<Record<IntakeKind, string>> = {
  ISCRIZIONE_TORNEO: "torneo",
  SPONSOR: "sponsor",
  CONVENZIONE: "convenzione",
  AFFITTO_CAMPO: "affitto-campo",
  VISITA_CENTRO: "visita",
  ALTRO: "altro",
};

export const INTAKE_AREAS = ["tornei", "crm", "impianti-campi", "segreteria"] as const;
export type IntakeArea = (typeof INTAKE_AREAS)[number];
export const INTAKE_AREA_LABEL: Readonly<Record<IntakeArea, string>> = {
  tornei: "Tornei",
  crm: "Sponsor e convenzioni",
  "impianti-campi": "Impianti e campi",
  segreteria: "Segreteria",
};

export const INTAKE_SITES = ["COLICO", "DERVIO"] as const;
export type IntakeSite = (typeof INTAKE_SITES)[number];
export const INTAKE_SITE_LABEL: Readonly<Record<IntakeSite, string>> = { COLICO: "Colico", DERVIO: "Dervio" };

/* ------------------------------------------------------------------ rules (mirror of scd_request_kind_rules) */

/**
 * Decided by Francesco: «DG conferma tutto» (13:31), «Li crea la Tesoreria» (15:44, payment link by a Tesoreria person
 * after Accettata) and, VERIFIED 16:39, «decide presidente e consiglio direttivo» for AFFITTO_CAMPO and VISITA_CENTRO
 * and, VERIFIED ~16:55, «Preparo e inoltro» (answer to: "Nell'app il Consiglio Direttivo corrisponde a chi ha il ruolo
 * «Direzione». Tu, come DG, su queste due richieste cosa fai?"): the DG is a preparer of these two kinds, and the
 * Consiglio Direttivo is the Direzione (position 'direzione' / role DIRECTION, as BOARD_POSITION in chi-fa-cosa.ts). PROPOSED, to be confirmed: the deciders of the other kinds, every
 * preparer/informed/owner list, the per-kind payment-link yes/no, the 60/hour ingest cap and the contact retention
 * periods. No threshold under which the DG decides alone: not decided, not implemented. VERIFIED ~17:00: «Tengo anche
 * Direzione» (the DG keeps the role Direzione, so he can also decide rentals and visits as a Consiglio member) and
 * «No, senza pagamento» to "Le visite al centro (medico, massaggi, nutrizione) si pagano con un link della
 * Tesoreria?" and, ~17:10, «Tutte e due gratis» to the clarified question (visit of a school or group to the centre vs
 * medical visits, massage and nutrition): VISITA_CENTRO has no payment; the F4 health services will be free too.
 */

export interface IntakeKindRule {
  area: IntakeArea;
  /** Topic of lib/chi-fa-cosa.ts whose deciders this kind follows. */
  topic: ChiFaCosaTopic;
  deciders: readonly string[];
  preparers: readonly string[];
  informed: readonly string[];
  /** Positions that may own the accepted request (assign). */
  owners: readonly string[];
  siteRequired: boolean;
  /** False when the kind is never paid (VISITA_CENTRO, Francesco ~17:00 «No, senza pagamento»): no payment at all. */
  payment: boolean;
  /** False for sponsors and convenzioni: invoiced by contract, never by a payment link. */
  paymentLink: boolean;
}

const BOARD = ["direttore-generale", "presidente", "direzione"] as const;
/** Francesco 16/10/2026 16:39 for AFFITTO_CAMPO and VISITA_CENTRO. */
export const DECIDED_PRESIDENTE_CONSIGLIO = ["presidente", "direzione"] as const;
/** Kinds whose deciders Francesco decided (the others are PROPOSED). */
export const DECIDED_DECIDER_KINDS: readonly IntakeKind[] = ["AFFITTO_CAMPO", "VISITA_CENTRO"];

export const INTAKE_RULES: Readonly<Record<IntakeKind, IntakeKindRule>> = {
  ISCRIZIONE_TORNEO: {
    area: "tornei",
    topic: "tornei",
    deciders: ["responsabile-tornei", "direttore-generale", "presidente"],
    preparers: ["segreteria"],
    informed: ["coordinatore-attivita-sportiva", "tesoreria"],
    owners: ["responsabile-tornei", "segreteria"],
    siteRequired: false,
    payment: true,
    paymentLink: true,
  },
  SPONSOR: {
    area: "crm",
    topic: "sponsor",
    deciders: BOARD,
    preparers: [],
    informed: ["tesoreria"],
    owners: ["direttore-generale", "presidente", "tesoreria"],
    siteRequired: false,
    payment: true,
    paymentLink: false,
  },
  CONVENZIONE: {
    area: "crm",
    topic: "sponsor",
    deciders: BOARD,
    preparers: [],
    informed: ["tesoreria"],
    owners: ["direttore-generale", "presidente", "tesoreria"],
    siteRequired: false,
    payment: true,
    paymentLink: false,
  },
  AFFITTO_CAMPO: {
    area: "impianti-campi",
    topic: "impianti",
    // Francesco 16/10/2026 16:39 «decide presidente e consiglio direttivo» (VERIFIED); the DG handles and forwards.
    deciders: DECIDED_PRESIDENTE_CONSIGLIO,
    preparers: ["direttore-generale", "responsabile-campi"],
    informed: ["tesoreria", "responsabile-struttura-colico", "responsabile-struttura"],
    owners: ["responsabile-campi", "tesoreria", "direttore-generale"],
    siteRequired: true,
    payment: true,
    paymentLink: true,
  },
  VISITA_CENTRO: {
    area: "impianti-campi",
    topic: "impianti",
    // Francesco 16/10/2026 16:39 «decide presidente e consiglio direttivo» (VERIFIED); the DG handles and forwards.
    deciders: DECIDED_PRESIDENTE_CONSIGLIO,
    preparers: ["direttore-generale", "segreteria"],
    informed: ["responsabile-campi", "responsabile-struttura-colico", "responsabile-struttura"],
    owners: ["segreteria", "direttore-generale"],
    siteRequired: true,
    payment: false,
    paymentLink: false,
  },
  ALTRO: {
    area: "segreteria",
    topic: "comunicazioni",
    deciders: ["segreteria", "direttore-generale", "presidente"],
    preparers: [],
    informed: [],
    owners: ["segreteria"],
    siteRequired: false,
    payment: true,
    paymentLink: true,
  },
};

/** They see every kind (viewers). Who decides is per kind in INTAKE_RULES. */
export const INTAKE_ALWAYS_VIEW: readonly string[] = ["direttore-generale", "presidente"];
/** Same watchers as the request machine (request-machine.ts REQUEST_WATCHERS). */
export const INTAKE_WATCHERS: readonly string[] = ["direttore-generale", "coordinatore-attivita-sportiva"];
/** UD-156, equal to chi-fa-cosa DERVIO_ALWAYS / DERVIO_EXCLUDED (tested). */
export const INTAKE_DERVIO_ALWAYS: readonly string[] = [
  "presidente",
  "direttore-generale",
  "coordinatore-attivita-sportiva",
  "responsabile-attivita-base",
  "direttore-sportivo-agonistica",
  "direttore-sportivo-generale",
  "segreteria",
];
export const INTAKE_DERVIO_EXCLUDED: readonly string[] = [
  "responsabile-struttura-dervio",
  "responsabile-campi",
  "responsabile-club-house",
  "responsabile-struttura",
  "responsabile-struttura-colico",
];

export type PositionSet = "deciders" | "preparers" | "viewers" | "owners";

/** Mirror of scd_request_kind_positions: sorted, unique, UD-156 applied for Dervio. */
export function kindPositions(kind: IntakeKind, site: IntakeSite | null, set: PositionSet): string[] {
  const r = INTAKE_RULES[kind];
  let v: string[];
  if (set === "deciders") v = [...r.deciders];
  else if (set === "preparers") v = [...r.preparers];
  else if (set === "owners") v = [...r.owners];
  else
    v = [
      ...INTAKE_WATCHERS,
      ...INTAKE_ALWAYS_VIEW,
      ...r.deciders,
      ...r.preparers,
      ...r.informed,
      ...r.owners,
      ...(site === "DERVIO" ? INTAKE_DERVIO_ALWAYS : []),
    ];
  if (site === "DERVIO") v = v.filter((p) => !INTAKE_DERVIO_EXCLUDED.includes(p));
  return [...new Set(v)].sort();
}

/* ------------------------------------------------------------------ states and phases */

export const INTAKE_STATUSES = ["RICEVUTA", "IN_VALUTAZIONE", "ACCETTATA", "RIFIUTATA", "IN_GESTIONE", "CHIUSA", "ANNULLATA"] as const;
export type IntakeStatus = (typeof INTAKE_STATUSES)[number];

/** The phases everybody sees (design §4.2). Friendlies map their r133 states onto the same phases. */
export const INTAKE_PHASES = ["RICEVUTA", "IN_VALUTAZIONE", "ACCETTATA", "IN_GESTIONE", "CHIUSA", "NON_ACCOLTA"] as const;
export type IntakePhase = (typeof INTAKE_PHASES)[number];

export const INTAKE_PHASE_LABEL: Readonly<Record<IntakePhase, string>> = {
  RICEVUTA: "Ricevuta",
  IN_VALUTAZIONE: "In valutazione",
  ACCETTATA: "Accettata",
  IN_GESTIONE: "In gestione",
  CHIUSA: "Chiusa",
  NON_ACCOLTA: "Non accolta",
};

export function phaseOf(status: string): IntakePhase | null {
  switch (status) {
    case "RICEVUTA":
    case "BOZZA":
      return "RICEVUTA";
    case "IN_VALUTAZIONE":
    case "DA_CONFERMARE":
      return "IN_VALUTAZIONE";
    case "ACCETTATA":
    case "CONFERMATA":
      return "ACCETTATA";
    case "IN_GESTIONE":
      return "IN_GESTIONE";
    case "CHIUSA":
      return "CHIUSA";
    case "RIFIUTATA":
    case "SCADUTA":
    case "ANNULLATA":
      return "NON_ACCOLTA";
    default:
      return null;
  }
}

/** Statuses of a phase (board filter). */
export function statusesOf(phase: IntakePhase): IntakeStatus[] {
  return INTAKE_STATUSES.filter((s) => phaseOf(s) === phase);
}

export const OPEN_STATUSES: readonly IntakeStatus[] = ["RICEVUTA", "IN_VALUTAZIONE", "ACCETTATA", "IN_GESTIONE"];

/* ------------------------------------------------------------------ actions (mirror of scd_intake_decide) */

export const INTAKE_ACTIONS = ["take", "accept", "reject", "start", "close", "cancel", "assign", "reclassify"] as const;
export type IntakeAction = (typeof INTAKE_ACTIONS)[number];

export const INTAKE_ACTION_LABEL: Readonly<Record<IntakeAction, string>> = {
  take: "Prendi in valutazione",
  accept: "Accetta",
  reject: "Non accogliere",
  start: "Avvia la gestione",
  close: "Chiudi",
  cancel: "Annulla",
  assign: "Assegna",
  reclassify: "Cambia tipo",
};

/** Who may: "decide" = deciders only; "prepare" = deciders, preparers and the owner position. */
export const ACTION_NEEDS: Readonly<Record<IntakeAction, "decide" | "prepare">> = {
  take: "prepare",
  accept: "decide",
  reject: "decide",
  start: "prepare",
  close: "prepare",
  cancel: "decide",
  assign: "decide",
  reclassify: "decide",
};

/** From which statuses an action is offered (same as SQL). */
export const ACTION_FROM: Readonly<Record<IntakeAction, readonly IntakeStatus[]>> = {
  take: ["RICEVUTA"],
  accept: ["IN_VALUTAZIONE"],
  reject: ["IN_VALUTAZIONE"],
  start: ["ACCETTATA"],
  close: ["IN_GESTIONE"],
  cancel: OPEN_STATUSES,
  assign: OPEN_STATUSES,
  reclassify: ["RICEVUTA", "IN_VALUTAZIONE"],
};

/** Actions that need a written reason. */
export const REASON_REQUIRED: readonly IntakeAction[] = ["reject", "cancel"];

export interface IntakeCan {
  decide: boolean;
  prepare: boolean;
  contact: boolean;
  pay: boolean;
}

/** Actions to show for a row: the database decides again on every call. */
export function availableActions(row: { kind: IntakeKind; status: string; can: IntakeCan }): IntakeAction[] {
  return INTAKE_ACTIONS.filter((a) => {
    if (!(ACTION_FROM[a] as readonly string[]).includes(row.status)) return false;
    if (a === "reclassify" && row.kind !== "ALTRO") return false;
    return ACTION_NEEDS[a] === "decide" ? row.can.decide : row.can.prepare || row.can.decide;
  });
}

/* ------------------------------------------------------------------ payment (Tesoreria only) */

export const PAYMENT_STATUSES = ["NON_DOVUTO", "DA_PAGARE", "LINK_INVIATO", "PAGATO_DA_RISCONTRARE", "RISCONTRATO", "ANNULLATO"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export const PAYMENT_LABEL: Readonly<Record<PaymentStatus, string>> = {
  NON_DOVUTO: "Nessun pagamento",
  DA_PAGARE: "Da pagare",
  LINK_INVIATO: "Link inviato",
  PAGATO_DA_RISCONTRARE: "Pagato, da riscontrare",
  RISCONTRATO: "Riscontrato",
  ANNULLATO: "Annullato",
};

/** Same pattern as the SQL check on payment_link: https only, a host with a dot, no spaces, <= 300 chars. */
export const PAYMENT_LINK_PATTERN = /^https:\/\/[A-Za-z0-9.-]+\.[A-Za-z]{2,}(\/\S*)?$/;

export interface PaymentDraft {
  status: string;
  amountEuro: string;
  link: string;
}

export type PaymentCheck =
  | { ok: true; value: { status: PaymentStatus; amountCents: number | null; link: string | null } }
  | { ok: false; error: string };

/** Browser-side check of the Tesoreria form (the database checks again, the browser is never trusted). */
export function checkPayment(d: PaymentDraft, opts: { linkAllowed: boolean; hasStoredLink: boolean; hasStoredAmount: boolean }): PaymentCheck {
  if (!(PAYMENT_STATUSES as readonly string[]).includes(d.status)) return { ok: false, error: "Scegli lo stato del pagamento." };
  const status = d.status as PaymentStatus;
  let amountCents: number | null = null;
  const a = d.amountEuro.trim().replace(/\s/g, "");
  if (a) {
    if (!/^\d{1,6}([.,]\d{1,2})?$/.test(a)) return { ok: false, error: "Importo non valido: usa il formato 25 o 25,50." };
    amountCents = Math.round(Number(a.replace(",", ".")) * 100);
    if (amountCents > 10_000_000) return { ok: false, error: "Importo troppo alto." };
  }
  const link = d.link.trim() || null;
  if (link) {
    if (!opts.linkAllowed) return { ok: false, error: "Per sponsor e convenzioni niente link: contratto e fattura." };
    if (link.length > 300 || !PAYMENT_LINK_PATTERN.test(link)) return { ok: false, error: "Il link deve iniziare con https:// e non avere spazi." };
  }
  if (status === "LINK_INVIATO" && !link && !opts.hasStoredLink) return { ok: false, error: "Incolla il link di pagamento creato dalla Tesoreria." };
  if ((status === "DA_PAGARE" || status === "LINK_INVIATO") && amountCents === null && !opts.hasStoredAmount)
    return { ok: false, error: "Indica l'importo." };
  return { ok: true, value: { status, amountCents, link } };
}

export function formatEuro(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "—";
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(cents / 100);
}

/* ------------------------------------------------------------------ free text (mirror of scd_request_intake_text) */

/**
 * Health words (security review 16/10/2026). Stems match at the start of a word, whole words only as words, so
 * "entusiasma" or "fantasma" are not health but "asma" is; "autista" (driver) and "operatore" are not health, "autismo"
 * and "operata" are. Deliberately broad on the safe side: a note that only looks medical (e.g. "farmacia") is removed
 * as a whole too. The SQL of r139 (scd_request_intake_text) uses the same lists: '\m(prefixes)|\m(words)\M'.
 */
export const HEALTH_PREFIXES: readonly string[] = [
  "diagnos", "patolog", "malat", "allergi", "intolleran", "farmac", "terapi", "sintom", "infortun", "disabil",
  "certificat[oi] medic", "celiac", "diabet", "epiless", "ricover", "frattur", "psicolog", "gravidanz", "incinta",
  "handicap", "autism", "autistic",
];
export const HEALTH_WORDS: readonly string[] = ["asma", "gesso", "dsa", "adhd", "operat[oaie]", "ferit[oaie]"];
export const HEALTH_PATTERN = new RegExp(`\\b(?:${HEALTH_PREFIXES.join("|")})|\\b(?:${HEALTH_WORDS.join("|")})\\b`, "i");
export const HEALTH_REMOVED = "[testo rimosso: possibili dati di salute]";

/**
 * Contact redaction of r139 (scd_intake_redact; r133's scd_request_redact stays as it is live). Same strings in SQL:
 * plain e-mails, obfuscated e-mails ("nome at dominio it", "nome [at] dominio [dot] it", "nome(at)dominio.it") and
 * phone numbers whose digits are split by spaces, dots, dashes, slashes or brackets (9+ digits; a date like 24/10/2026
 * has 8 and stays). A date followed by a time may be redacted as a phone: accepted, safety first.
 */
export const INTAKE_EMAIL_PATTERN = "[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}";
const OBF_SEP = String.raw`(?:\s*(?:\[dot\]|\(dot\)|\[punto\]|\(punto\)|\.)\s*|\s+(?:dot|punto)\s+|\s+)`;
export const INTAKE_EMAIL_OBFUSCATED_PATTERN =
  String.raw`[A-Za-z0-9._%+-]+(?:\s*(?:\[at\]|\(at\))\s*|\s+(?:at|chiocciola)\s+)[A-Za-z0-9-]+(?:` +
  OBF_SEP +
  String.raw`[A-Za-z0-9-]+)?` +
  OBF_SEP +
  String.raw`(?:it|com|net|org|eu|info|biz|ch)(?![A-Za-z0-9])`;
export const INTAKE_PHONE_PATTERN = String.raw`(\+|00)?\(?[0-9](?:[ .()/-]{0,2}[0-9]){8,}`;

export function redactIntake(text: string): string {
  return text
    .replace(new RegExp(INTAKE_EMAIL_PATTERN, "g"), "[email]")
    .replace(new RegExp(INTAKE_EMAIL_OBFUSCATED_PATTERN, "gi"), "[email]")
    .replace(new RegExp(INTAKE_PHONE_PATTERN, "g"), "[telefono]");
}

/**
 * Organisation name and role of an external contact must not hide an e-mail or a phone number (r139
 * scd_request_contact_clean refuses them when scd_intake_redact would change them).
 */
export function contactFieldSafe(value: string | null | undefined): boolean {
  return !value || redactIntake(value) === value;
}

/** Contacts redacted, health text removed as a whole, max 500 chars (same rule as the database). */
export function cleanIntakeText(text: string | null | undefined): string | null {
  if (!text || !text.trim()) return null;
  if (HEALTH_PATTERN.test(text)) return HEALTH_REMOVED;
  const red = redactIntake(text);
  // eslint-disable-next-line no-control-regex
  return red.replace(/[\u0000-\u001f\u007f]+/g, " ").trim().slice(0, 500);
}

/* ------------------------------------------------------------------ fields (mirror of scd_request_clean_intake) */

export const INTAKE_TOURNAMENT_IDS = [
  "christmas-lario-cup-maschile",
  "christmas-lario-cup-female",
  "memorial-jose-nasazzi",
  "memorial-sandro-guattini",
] as const;

export const INTAKE_FIELDS: Readonly<Record<IntakeKind, readonly string[]>> = {
  ISCRIZIONE_TORNEO: ["tournament", "category", "teams", "city", "province", "figcMatricola", "note"],
  SPONSOR: ["sector", "packages", "note"],
  CONVENZIONE: ["proposal", "sector", "note"],
  AFFITTO_CAMPO: ["date", "slot", "pitch", "activity", "people", "note"],
  VISITA_CENTRO: ["date", "date2", "people", "ageBand", "note"],
  ALTRO: ["subject", "note"],
};

export const ORG_KINDS = ["SOCIETA", "AZIENDA", "SCUOLA", "ENTE", "PRIVATO"] as const;

const ENUM_LABEL: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  orgKind: { SOCIETA: "Società sportiva", AZIENDA: "Azienda", SCUOLA: "Scuola", ENTE: "Ente o associazione", PRIVATO: "Privato" },
  proposal: { SCONTO_TESSERATI: "Sconto ai tesserati", VENDITA_CONGIUNTA: "Vendita congiunta", FORNITURA: "Fornitura", ALTRO: "Altro" },
  slot: { MATTINA: "mattina", POMERIGGIO: "pomeriggio", SERA: "sera" },
  pitch: { CAMPO_11: "campo a 11", CAMPO_7: "campo a 7", CAMPO_5: "campo a 5", INDIFFERENTE: "campo indifferente" },
  activity: { ALLENAMENTO: "Allenamento", PARTITA: "Partita", TORNEO: "Torneo", EVENTO: "Evento", ALTRO: "Altro" },
  ageBand: { BAMBINI: "bambini", RAGAZZI: "ragazzi", ADULTI: "adulti", MISTO: "età miste" },
  subject: { INFORMAZIONI: "Informazioni", COLLABORAZIONE: "Collaborazione", PROPOSTA: "Proposta", ALTRO: "Altro" },
  tournament: {
    "christmas-lario-cup-maschile": "Christmas Lario Cup",
    "christmas-lario-cup-female": "Christmas Lario Cup · Female",
    "memorial-jose-nasazzi": "Memorial José Nasazzi",
    "memorial-sandro-guattini": "Memorial Sandro Guattini",
  },
};

const FIELD_LABEL: Readonly<Record<string, string>> = {
  orgKind: "Chi chiede",
  tournament: "Torneo",
  category: "Categoria",
  teams: "Squadre",
  city: "Città",
  province: "Provincia",
  figcMatricola: "Matricola FIGC",
  sector: "Settore",
  packages: "Pacchetti",
  proposal: "Proposta",
  date: "Data",
  date2: "Seconda data",
  slot: "Fascia",
  pitch: "Campo",
  activity: "Attività",
  people: "Persone",
  ageBand: "Età",
  subject: "Oggetto",
  note: "Nota",
};

const itDate = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
};

/**
 * Lines "label: value" of a catalogue row's payload, in the order of INTAKE_FIELDS, for the cards. Unknown keys are
 * not shown (the database never stores them). Values are the cleaned ones of the database.
 */
export function payloadLines(kind: IntakeKind, payload: Record<string, unknown> | null | undefined): Array<{ label: string; value: string }> {
  if (!payload || typeof payload !== "object") return [];
  const out: Array<{ label: string; value: string }> = [];
  for (const key of ["orgKind", ...INTAKE_FIELDS[kind]]) {
    const raw = payload[key];
    if (raw === null || raw === undefined || raw === "") continue;
    let value: string;
    if (Array.isArray(raw)) value = raw.filter((x) => typeof x === "string").join(", ");
    else if (typeof raw === "number") value = String(raw);
    else if (typeof raw === "string") value = ENUM_LABEL[key]?.[raw] ?? (key === "date" || key === "date2" ? itDate(raw) : raw);
    else continue;
    if (value) out.push({ label: FIELD_LABEL[key] ?? key, value });
  }
  return out;
}

/** One-line summary of a row (title of the card): kind and the most telling field, never an organisation name. */
export function rowTitle(kind: IntakeKind, payload: Record<string, unknown> | null | undefined): string {
  const p = payload ?? {};
  const lab = (key: string) => {
    const v = p[key];
    return typeof v === "string" ? (ENUM_LABEL[key]?.[v] ?? v) : null;
  };
  switch (kind) {
    case "ISCRIZIONE_TORNEO":
      return [lab("tournament") ?? "Torneo", lab("category")].filter(Boolean).join(" · ");
    case "SPONSOR":
      return ["Sponsor", lab("sector")].filter(Boolean).join(" · ");
    case "CONVENZIONE":
      return [lab("proposal") ?? "Convenzione", lab("sector")].filter(Boolean).join(" · ");
    case "AFFITTO_CAMPO":
      return ["Affitto campo", typeof p["date"] === "string" ? itDate(p["date"]) : null, lab("slot")].filter(Boolean).join(" · ");
    case "VISITA_CENTRO":
      return ["Visita ai centri", typeof p["date"] === "string" ? itDate(p["date"]) : null].filter(Boolean).join(" · ");
    case "ALTRO":
      return lab("subject") ?? "Altra richiesta";
  }
}

/* ------------------------------------------------------------------ rows from the database */

export interface IntakeEvent {
  at: string;
  action: string;
  note: string | null;
}

/** Cleaned payload of a row: only strings, numbers and lists of strings (what the database stores). */
export type IntakePayload = Record<string, string | number | string[]>;

/** Keep only serialisable scalar values of a payload (the database never stores anything else). */
export function parsePayload(raw: unknown): IntakePayload {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: IntakePayload = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === "string" || (typeof v === "number" && Number.isFinite(v))) out[k] = v;
    else if (Array.isArray(v)) out[k] = v.filter((x): x is string => typeof x === "string");
  }
  return out;
}

export interface IntakeRow {
  id: string;
  publicCode: string | null;
  kind: IntakeKind;
  area: IntakeArea | null;
  site: IntakeSite | null;
  status: IntakeStatus;
  phase: IntakePhase;
  payload: IntakePayload;
  ownerPosition: string | null;
  receivedAt: string;
  decidedAt: string | null;
  decisionNote: string | null;
  hasContact: boolean;
  paymentStatus: PaymentStatus | null;
  paymentAmountCents: number | null;
  paymentLink: string | null;
  can: IntakeCan;
  owners: string[];
  paymentLinkAllowed: boolean;
  events: IntakeEvent[];
}

const str = (v: unknown): string | null => (typeof v === "string" && v ? v : null);
const bool = (v: unknown): boolean => v === true;

/** Parse one board row; malformed rows are dropped (never guessed). */
export function parseIntakeRow(raw: unknown): IntakeRow | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id = str(r["id"]);
  const kind = r["kind"];
  const status = str(r["status"]);
  if (!id || !isIntakeKind(kind) || !status || !(INTAKE_STATUSES as readonly string[]).includes(status)) return null;
  const phase = phaseOf(status)!;
  const can = (r["can"] && typeof r["can"] === "object" ? r["can"] : {}) as Record<string, unknown>;
  const pay = str(r["paymentStatus"]);
  const site = str(r["site"]);
  const area = str(r["area"]);
  return {
    id,
    publicCode: str(r["publicCode"]),
    kind,
    area: area && (INTAKE_AREAS as readonly string[]).includes(area) ? (area as IntakeArea) : null,
    site: site === "COLICO" || site === "DERVIO" ? site : null,
    status: status as IntakeStatus,
    phase,
    payload: parsePayload(r["payload"]),
    ownerPosition: str(r["ownerPosition"]),
    receivedAt: str(r["receivedAt"]) ?? "",
    decidedAt: str(r["decidedAt"]),
    decisionNote: str(r["decisionNote"]),
    hasContact: bool(r["hasContact"]),
    paymentStatus: pay && (PAYMENT_STATUSES as readonly string[]).includes(pay) ? (pay as PaymentStatus) : null,
    paymentAmountCents: typeof r["paymentAmountCents"] === "number" ? r["paymentAmountCents"] : null,
    paymentLink: str(r["paymentLink"]),
    can: { decide: bool(can["decide"]), prepare: bool(can["prepare"]), contact: bool(can["contact"]), pay: bool(can["pay"]) },
    owners: Array.isArray(r["owners"]) ? r["owners"].filter((x): x is string => typeof x === "string") : [],
    paymentLinkAllowed: r["paymentLinkAllowed"] === true,
    events: Array.isArray(r["events"])
      ? r["events"]
          .filter((e): e is Record<string, unknown> => !!e && typeof e === "object")
          .map((e) => ({ at: str(e["at"]) ?? "", action: str(e["action"]) ?? "", note: str(e["note"]) }))
          .filter((e) => e["at"] && e["action"])
      : [],
  };
}

export function parseIntakeRows(raw: unknown): IntakeRow[] {
  return Array.isArray(raw) ? raw.map(parseIntakeRow).filter((r): r is IntakeRow => r !== null) : [];
}

export interface IntakeNotice {
  at: string;
  action: string;
  requestId: string;
  publicCode: string | null;
  kind: IntakeKind;
  status: string;
  site: IntakeSite | null;
}

export function parseIntakeNotices(raw: unknown): IntakeNotice[] {
  if (!Array.isArray(raw)) return [];
  const out: IntakeNotice[] = [];
  for (const n of raw) {
    if (!n || typeof n !== "object") continue;
    const r = n as Record<string, unknown>;
    const at = str(r["at"]);
    const action = str(r["action"]);
    const requestId = str(r["requestId"]);
    if (!at || !action || !requestId || !isIntakeKind(r["kind"])) continue;
    const site = str(r["site"]);
    out.push({
      at,
      action,
      requestId,
      publicCode: str(r["publicCode"]),
      kind: r["kind"],
      status: str(r["status"]) ?? "",
      site: site === "COLICO" || site === "DERVIO" ? site : null,
    });
  }
  return out;
}

export const EVENT_LABEL: Readonly<Record<string, string>> = {
  RICEVUTA: "Ricevuta",
  IN_VALUTAZIONE: "In valutazione",
  ACCETTATA: "Accettata",
  RIFIUTATA: "Non accolta",
  IN_GESTIONE: "In gestione",
  CHIUSA: "Chiusa",
  ANNULLATA: "Annullata",
  ASSEGNATA: "Assegnata",
  RICLASSIFICATA: "Tipo cambiato",
  PAGAMENTO: "Pagamento aggiornato",
  CONTATTI_CANCELLATI: "Recapiti cancellati",
};

/** Counters per phase (unknown stays unknown: the caller passes null rows when the board was not read). */
export function phaseCounts(rows: readonly IntakeRow[] | null): Record<IntakePhase, number> | null {
  if (!rows) return null;
  const c = Object.fromEntries(INTAKE_PHASES.map((p) => [p, 0])) as Record<IntakePhase, number>;
  for (const r of rows) c[r.phase] += 1;
  return c;
}

/** Accepted requests whose payment the Tesoreria still has to record or reconcile. */
export function paymentsToFollow(rows: readonly IntakeRow[] | null): number | null {
  if (!rows) return null;
  return rows.filter(
    (r) =>
      (r.status === "ACCETTATA" || r.status === "IN_GESTIONE" || r.status === "CHIUSA") &&
      (r.paymentStatus === null || r.paymentStatus === "DA_PAGARE" || r.paymentStatus === "LINK_INVIATO" || r.paymentStatus === "PAGATO_DA_RISCONTRARE"),
  ).length;
}

/** Message for a database answer code (Italian, never a technical message). */
export function intakeError(code: string | null | undefined): string {
  switch (code) {
    case "forbidden":
      return "Non è una decisione del tuo ruolo per questo tipo di richiesta.";
    case "state":
      return "La richiesta è già in un'altra fase: ricarica la pagina.";
    case "reason":
      return "Scrivi il motivo (almeno qualche parola): resta nel registro.";
    case "health":
      return "Niente dati di salute nelle note: riformula senza.";
    case "owner":
      return "Scegli una delle posizioni proposte.";
    case "kind":
      return "Tipo di richiesta non valido.";
    case "not_found":
      return "Richiesta non trovata.";
    case "link":
      return "Il link deve iniziare con https:// e non avere spazi.";
    case "no_payment":
      return "Questo tipo di richiesta è senza pagamento.";
    case "link_not_allowed":
      return "Per sponsor e convenzioni niente link: contratto e fattura.";
    case "amount":
      return "Importo mancante o non valido.";
    default:
      return "Operazione non riuscita, riprova più tardi.";
  }
}

/* ------------------------------------------------------------------ r139 probe */

/**
 * Answer of the r139 probe (scd_intake_kinds, harmless). Live only when the function answers exactly the F1 kinds;
 * missing function, any error or any other answer = not live (fail closed: the Vetrina says «in preparazione»).
 */
export function r139ProbeResult(data: unknown, error: unknown): boolean {
  return !error && Array.isArray(data) && data.length === INTAKE_KINDS.length && INTAKE_KINDS.every((k, i) => data[i] === k);
}
