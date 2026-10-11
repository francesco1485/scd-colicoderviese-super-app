/**
 * "Inserisci" action of the work areas: builds ONE ready-to-paste row for the Drive sheet
 * "Inserimenti a Sky" (the club's intake register). Pure and tested: the app writes nothing,
 * the person pastes the row into the sheet they already have access to.
 *
 * Column order (header of the sheet):
 * Data · Inserito da (ruolo) · Tipo · Area · Descrizione · Scadenza · Link o allegato · Stato · Esito · Lavorato il
 * New rows always start with Stato = NUOVA and empty Esito / Lavorato il (filled by who works them).
 */
export const INSERIMENTI_COLUMNS = [
  "Data",
  "Inserito da (ruolo)",
  "Tipo",
  "Area",
  "Descrizione",
  "Scadenza",
  "Link o allegato",
  "Stato",
  "Esito",
  "Lavorato il",
] as const;

export const INSERIMENTO_TYPES = ["Richiesta", "Segnalazione", "Documento", "Scadenza", "Dato da aggiornare", "Idea"] as const;
export type InserimentoType = (typeof INSERIMENTO_TYPES)[number];

export const INSERIMENTO_NEW_STATE = "NUOVA";
export const DESCRIPTION_MAX = 500;

export interface InserimentoInput {
  /** Role of who inserts (never a personal name: the sheet tracks roles). */
  role: string;
  type: string;
  /** Area label, e.g. "Pulmini" or "Tesoreria · Club House". */
  area: string;
  description: string;
  /** Optional deadline, ISO YYYY-MM-DD. */
  deadline?: string;
  /** Optional link (http/https) or attachment name. */
  link?: string;
  /** Injected for tests; defaults to now. */
  now?: Date;
}

export type InserimentoResult =
  | { ok: true; cells: string[]; tsv: string }
  | { ok: false; errors: Partial<Record<"role" | "type" | "area" | "description" | "deadline" | "link", string>> };

/** "11/10/2026" in the club's time zone. */
export function clubDate(d: Date): string {
  return new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
}

/** ISO date (YYYY-MM-DD) to "dd/mm/yyyy"; null when not a real calendar date. */
export function isoToItalian(iso: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const [, y, mo, d] = m;
  const date = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d)));
  if (date.getUTCFullYear() !== Number(y) || date.getUTCMonth() !== Number(mo) - 1 || date.getUTCDate() !== Number(d)) return null;
  return `${d}/${mo}/${y}`;
}

/**
 * One cell, safe to paste into Google Sheets: no tabs or line breaks (they would split
 * the row), collapsed spaces, and a leading apostrophe when the text would be read as a
 * formula (=, +, -, @), so nothing pasted can execute.
 */
export function sheetCell(value: string): string {
  const flat = value.replace(/[\t\r\n]+/g, " ").replace(/\s{2,}/g, " ").trim();
  return /^[=+\-@]/.test(flat) ? `'${flat}` : flat;
}

export function buildInserimento(input: InserimentoInput): InserimentoResult {
  const errors: Extract<InserimentoResult, { ok: false }>["errors"] = {};
  const role = input.role.trim();
  const type = input.type.trim();
  const area = input.area.trim();
  const description = input.description.trim();
  const deadline = (input.deadline ?? "").trim();
  const link = (input.link ?? "").trim();

  if (!role) errors.role = "Scegli il tuo ruolo.";
  if (!type) errors.type = "Scegli il tipo.";
  if (!area) errors.area = "Area mancante.";
  if (!description) errors.description = "Scrivi una descrizione.";
  else if (description.length > DESCRIPTION_MAX) errors.description = `Massimo ${DESCRIPTION_MAX} caratteri.`;
  let deadlineIt = "";
  if (deadline) {
    const it = isoToItalian(deadline);
    if (!it) errors.deadline = "Data non valida.";
    else deadlineIt = it;
  }
  if (link && /^[a-z][a-z0-9+.-]*:/i.test(link) && !/^https?:\/\//i.test(link)) errors.link = "Solo link http o https, oppure il nome del file.";
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const cells = [
    clubDate(input.now ?? new Date()),
    role,
    type,
    area,
    description,
    deadlineIt,
    link,
    INSERIMENTO_NEW_STATE,
    "",
    "",
  ].map(sheetCell);
  return { ok: true, cells, tsv: cells.join("\t") };
}
