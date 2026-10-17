/**
 * Area squadra (UD-183, Francesco DG 17/10/2026 12:36): pure helpers shared by the Area partite, the Area allenamenti,
 * the family card and the Segreteria monthly check. The database (r117, r118) decides who may read and write; these
 * helpers only shape input and output, and compute the «Provvisorio» state of the mister's tabellino.
 *
 * r117 and r118 were applied on 17/10/2026 after «applica r117 r118»: AREA_PARTITE_LIVE / AREA_ALLENAMENTI_LIVE are true. The pre-existing tools (convocazione r62,
 * distinta r70, tabellino r92) keep working as today.
 */

/** r117 applied on SCD PULSE? Flip to true only in the change that follows «applica r117». */
export const AREA_PARTITE_LIVE = true;
/** r118 applied on SCD PULSE? Flip to true only in the change that follows «applica r118». */
export const AREA_ALLENAMENTI_LIVE = true;

export const NOT_LIVE_TEXT = {
  partite: "Resoconto, avversari e documenti si attivano quando la Direzione approva l'aggiornamento del database (r117). Convocazione, distinta e tabellino funzionano già.",
  allenamenti: "Sedute, presenze, note e dinamiche di gioco si attivano quando la Direzione approva l'aggiornamento del database (r118).",
  verifiche: "La verifica mensile si attiva quando la Direzione approva gli aggiornamenti del database r117 e r118.",
} as const;

/* ------------------------------------------------------------------ tabellino vs official LND result */

export type TabellinoState = "NON_COMPILATO" | "PROVVISORIO" | "CONFERMATO" | "DIVERSO";

export interface Score {
  goalsFor: number;
  goalsAgainst: number;
}

/**
 * State of the mister's tabellino. It is «Provvisorio» until the Segreteria records the official LND score and the
 * two are equal; when they differ the official score wins and the mister is asked to check.
 */
export function tabellinoState(mister: Score | null, official: Score | null): TabellinoState {
  if (!mister) return "NON_COMPILATO";
  if (!official) return "PROVVISORIO";
  return mister.goalsFor === official.goalsFor && mister.goalsAgainst === official.goalsAgainst ? "CONFERMATO" : "DIVERSO";
}

export const TABELLINO_LABEL: Readonly<Record<TabellinoState, string>> = {
  NON_COMPILATO: "Tabellino da compilare",
  PROVVISORIO: "Provvisorio · in attesa del risultato ufficiale LND",
  CONFERMATO: "Confermato dal risultato ufficiale LND",
  DIVERSO: "Diverso dal risultato ufficiale LND: controlla",
};

/** Score from two nullable numbers (database rows), null unless both are known. */
export function scoreOf(goalsFor: number | null | undefined, goalsAgainst: number | null | undefined): Score | null {
  return typeof goalsFor === "number" && typeof goalsAgainst === "number" ? { goalsFor, goalsAgainst } : null;
}

/* ------------------------------------------------------------------ impediments and absence notices */

/** Reason categories (no health category on purpose: «Per motivi di salute non scrivere dettagli»). */
export const REASON_CODES = ["SCUOLA", "FAMIGLIA", "TRASPORTO", "PERSONALE", "ALTRO"] as const;
export type ReasonCode = (typeof REASON_CODES)[number];

export const REASON_LABEL: Readonly<Record<ReasonCode, string>> = {
  SCUOLA: "Scuola",
  FAMIGLIA: "Impegno di famiglia",
  TRASPORTO: "Trasporto",
  PERSONALE: "Motivi personali",
  ALTRO: "Altro",
};

export function asReason(v: unknown): ReasonCode | null {
  return typeof v === "string" && (REASON_CODES as readonly string[]).includes(v) ? (v as ReasonCode) : null;
}

export const REASON_NOTE_MAX = 140;
export const NO_HEALTH_HINT = "Non scrivere dati di salute: per quelli parla direttamente con il mister o con la segreteria.";

/* ------------------------------------------------------------------ match documents */

export const DOC_KINDS = ["REFERTO", "DISTINTA_NOSTRA", "DISTINTA_AVVERSARI", "ALTRO"] as const;
export type DocKind = (typeof DOC_KINDS)[number];

export const DOC_LABEL: Readonly<Record<DocKind, string>> = {
  REFERTO: "Referto",
  DISTINTA_NOSTRA: "Distinta SCD",
  DISTINTA_AVVERSARI: "Distinta avversari",
  ALTRO: "Altro documento",
};

export const DOC_MIME = ["application/pdf", "image/jpeg", "image/png", "image/heic", "image/webp"] as const;
export const DOC_MAX_BYTES = 15 * 1024 * 1024;

/** Problems of a file chosen for upload, in plain words ([] = ok). */
export function documentProblems(file: { type: string; size: number }): string[] {
  const out: string[] = [];
  if (!(DOC_MIME as readonly string[]).includes(file.type)) out.push("Carica un PDF o una foto (JPG, PNG, HEIC, WEBP).");
  if (file.size <= 0 || file.size > DOC_MAX_BYTES) out.push("Il file deve pesare meno di 15 MB.");
  return out;
}

/** Storage name: ascii, no separators, keeps the extension, prefixed by time so names never clash. */
export function storageName(name: string, now: number): string {
  const base = name.normalize("NFKD").replace(/[^\w.-]+/g, "_").replace(/_+/g, "_").replace(/^[._]+/, "");
  return `${now}-${(base || "documento").slice(-100)}`;
}

export function fileSizeLabel(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

/* ------------------------------------------------------------------ trainings */

export const ATTENDANCE = ["PRESENTE", "ASSENTE", "GIUSTIFICATO"] as const;
export type AttendanceStatus = (typeof ATTENDANCE)[number];

export const ATTENDANCE_LABEL: Readonly<Record<AttendanceStatus, string>> = {
  PRESENTE: "Presente",
  ASSENTE: "Assente",
  GIUSTIFICATO: "Giustificato",
};

export const SESSION_STATUS_LABEL: Readonly<Record<"PLANNED" | "DONE" | "CANCELLED", string>> = {
  PLANNED: "In programma",
  DONE: "Fatto",
  CANCELLED: "Annullato",
};

/** Google Meet only: the app streams and records nothing (no recording of minors). */
export const MEET_RE = /^https:\/\/meet\.google\.com\/[a-z0-9-]{3,40}$/;
export function isMeetUrl(v: string): boolean {
  return MEET_RE.test(v.trim());
}

export const LIVE_RULES =
  "Il collegamento è su Google Meet: l'app non trasmette e non registra nulla. Non registrare e non fotografare i ragazzi; per i minori il genitore è sempre in copia.";

export const DRILL_AUDIENCE = ["STAFF_SQUADRA", "STAFF_CLUB", "SQUADRA"] as const;
export type DrillAudience = (typeof DRILL_AUDIENCE)[number];
export const DRILL_AUDIENCE_LABEL: Readonly<Record<DrillAudience, string>> = {
  STAFF_SQUADRA: "Solo lo staff della squadra",
  STAFF_CLUB: "Tutti i mister e dirigenti del club",
  SQUADRA: "Condivisa con ragazzi e famiglie della squadra",
};

/** Session fields entered by the mister, validated before the server call ([] = ok). */
export interface SessionDraft {
  date: string;
  time: string;
  duration: number;
  field: string;
  theme: string;
  coachNotes: string;
  sharedNote: string;
  meetingUrl: string;
  liveNote: string;
}

export function sessionProblems(d: SessionDraft): string[] {
  const out: string[] = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date)) out.push("Scegli il giorno.");
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(d.time)) out.push("Scrivi l'ora come 18:30.");
  if (!Number.isInteger(d.duration) || d.duration < 15 || d.duration > 240) out.push("La durata va da 15 a 240 minuti.");
  if (d.field.length > 80) out.push("Campo: massimo 80 caratteri.");
  if (d.theme.length > 200) out.push("Tema: massimo 200 caratteri.");
  if (d.coachNotes.length > 2000) out.push("Note del mister: massimo 2000 caratteri.");
  if (d.sharedNote.length > 1000) out.push("Nota per la squadra: massimo 1000 caratteri.");
  if (d.liveNote.length > 300) out.push("Avviso live: massimo 300 caratteri.");
  if (d.meetingUrl.trim() && !isMeetUrl(d.meetingUrl)) out.push("Il link deve essere di Google Meet (https://meet.google.com/...).");
  return out;
}

/** "2026-10-20" + "18:30" in Rome → ISO instant with the right offset (CET/CEST). */
export function romeInstant(date: string, time: string): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const [hh, mm] = time.split(":").map(Number) as [number, number];
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Rome", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
      .formatToParts(new Date(guess))
      .map((p) => [p.type, p.value]),
  );
  const shown = Date.UTC(Number(parts["year"]), Number(parts["month"]) - 1, Number(parts["day"]), Number(parts["hour"]), Number(parts["minute"]));
  return new Date(guess - (shown - guess)).toISOString();
}

/** "Mario Rossi" → "Mario R." (minors outside the team staff). */
export function shortName(full: string): string {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return parts[0] ?? "";
  const first = parts[0] ?? "";
  const last = parts[parts.length - 1] ?? "";
  return `${first} ${last.charAt(0).toUpperCase()}.`;
}

/** "1040" minutes → "17:20". */
export function hhmm(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** First day from today (included) whose weekday key matches, within 7 days; null when none. */
export function nextDateFor(todayIso: string, dayKey: string, keyOf: (iso: string) => string | null): string | null {
  const t = Date.parse(`${todayIso}T12:00:00Z`);
  if (Number.isNaN(t)) return null;
  for (let i = 0; i < 7; i++) {
    const iso = new Date(t + i * 86_400_000).toISOString().slice(0, 10);
    if (keyOf(iso) === dayKey) return iso;
  }
  return null;
}
