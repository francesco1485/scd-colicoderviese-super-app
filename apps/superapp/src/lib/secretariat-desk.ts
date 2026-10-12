/**
 * Secretariat desk (r73): the day's work queue as counts only — no names, no personal data.
 * The database function scd_secretariat_desk returns the raw counters; this module turns them
 * into the ordered lines the /segreteria page shows, each with where to go to act on it.
 */

export type DeskCounts = {
  as_of: string;
  access_requests_pending: number;
  people_pending: number;
  athletes_without_team: number;
  registration_unverified: number;
  cert_missing: number;
  cert_expired: number;
  cert_expiring_30: number;
  cert_declared: number;
  callups_pending_72h: number;
  callups_total_72h: number;
  accounts_never_signed_in: number;
};

export type DeskTone = "urgent" | "todo" | "info";

export type DeskLine = {
  id: string;
  count: number;
  label: string;
  tone: DeskTone;
  /** Route to open; the query string pre-selects the right filter where the page supports it. */
  href: string;
};

const KEYS: ReadonlyArray<keyof DeskCounts> = [
  "access_requests_pending",
  "people_pending",
  "athletes_without_team",
  "registration_unverified",
  "cert_missing",
  "cert_expired",
  "cert_expiring_30",
  "cert_declared",
  "callups_pending_72h",
  "callups_total_72h",
  "accounts_never_signed_in",
];

/** Accepts the jsonb payload of scd_secretariat_desk; null when the shape is not the expected one. */
export function parseDeskCounts(raw: unknown): DeskCounts | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const out: Record<string, number | string> = { as_of: typeof r["as_of"] === "string" ? r["as_of"] : "" };
  for (const k of KEYS) {
    const v = r[k];
    const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
    if (!Number.isFinite(n) || n < 0) return null;
    out[k] = n;
  }
  return out as DeskCounts;
}

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

/** The lines of the desk, most urgent first; zero counts are left out so the desk reads as a to-do list. */
export function deskLines(c: DeskCounts): DeskLine[] {
  const all: DeskLine[] = [
    { id: "cert_expired", count: c.cert_expired, tone: "urgent", href: "/segreteria/certificati", label: `${c.cert_expired} ${plural(c.cert_expired, "certificato scaduto", "certificati scaduti")}` },
    { id: "callups_pending", count: c.callups_pending_72h, tone: "urgent", href: "/segreteria/persone", label: `${c.callups_pending_72h} ${plural(c.callups_pending_72h, "convocazione senza risposta", "convocazioni senza risposta")} per le gare delle prossime 72 ore` },
    { id: "access_requests", count: c.access_requests_pending, tone: "todo", href: "/direzione/accessi", label: `${c.access_requests_pending} ${plural(c.access_requests_pending, "richiesta di accesso da esaminare", "richieste di accesso da esaminare")}` },
    { id: "people_pending", count: c.people_pending, tone: "todo", href: "/segreteria/persone?stato=pending", label: `${c.people_pending} ${plural(c.people_pending, "persona in attesa di conferma", "persone in attesa di conferma")}` },
    { id: "no_team", count: c.athletes_without_team, tone: "todo", href: "/segreteria/persone?squadra=nessuna", label: `${c.athletes_without_team} ${plural(c.athletes_without_team, "atleta senza squadra", "atleti senza squadra")}` },
    { id: "cert_expiring", count: c.cert_expiring_30, tone: "todo", href: "/segreteria/certificati", label: `${c.cert_expiring_30} ${plural(c.cert_expiring_30, "certificato in scadenza", "certificati in scadenza")} entro 30 giorni` },
    { id: "registration", count: c.registration_unverified, tone: "info", href: "/segreteria/persone", label: `${c.registration_unverified} ${plural(c.registration_unverified, "tesseramento da verificare", "tesseramenti da verificare")}` },
    { id: "cert_missing", count: c.cert_missing, tone: "info", href: "/segreteria/certificati", label: `${c.cert_missing} ${plural(c.cert_missing, "atleta senza data certificato", "atleti senza data certificato")}` },
    { id: "cert_declared", count: c.cert_declared, tone: "info", href: "/segreteria/certificati", label: `${c.cert_declared} ${plural(c.cert_declared, "certificato dichiarato dalla famiglia, da vedere", "certificati dichiarati dalle famiglie, da vedere")}` },
    { id: "never_signed_in", count: c.accounts_never_signed_in, tone: "info", href: "/direzione/accessi", label: `${c.accounts_never_signed_in} ${plural(c.accounts_never_signed_in, "account mai entrato", "account mai entrati")}` },
  ];
  return all.filter((l) => l.count > 0);
}

/** Headline for the desk card: "Tutto in ordine" or "N cose da fare, M urgenti". */
export function deskHeadline(lines: DeskLine[]): string {
  if (lines.length === 0) return "Tutto in ordine: nessuna coda aperta.";
  const urgent = lines.filter((l) => l.tone === "urgent").length;
  const n = lines.length;
  const base = `${n} ${plural(n, "cosa da fare", "cose da fare")}`;
  return urgent ? `${base}, ${urgent} ${plural(urgent, "urgente", "urgenti")}.` : `${base}.`;
}
