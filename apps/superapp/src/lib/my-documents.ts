/**
 * «I miei documenti» (r144, Francesco 16/10/2026): the personal document drawer. Pure helpers shared by the server
 * functions and the page: the kind catalogue (mirror of scd_doc_kinds() in
 * supabase/migrations/20261017_r144_my_documents.sql, kept equal by my-documents-migration.test.ts), parsing of the
 * database answers, status labels, MIME sniffing and safe file names for the Drive.
 *
 * Engines: TEMPO (the Segreteria stops chasing documents) and PERSONE (families see what is in order).
 * Measure: uploads in verification and open requests per week, expired documents per day (scd_doc_lamp).
 */

export type DocSection = "FIRMATO" | "CONSEGNATO";
export type DocClass = "FIRMA" | "SANITARIO" | "IDENTITA" | "ECONOMICO";
export type DocRequired = "ATLETA" | "ATLETA_MINORE" | "NO";

export interface DocKind {
  code: string;
  section: DocSection;
  docClass: DocClass;
  hasExpiry: boolean;
  required: DocRequired;
  label: string;
  /** id in config/scd-club-documents.v1.json: the club PDF that was accepted (section FIRMATO). */
  clubDocId: string | null;
}

/** Same order and values as scd_doc_kinds() in r144. */
export const DOC_KINDS: readonly DocKind[] = [
  {
    code: "INFORMATIVA_PRIVACY",
    section: "FIRMATO",
    docClass: "FIRMA",
    hasExpiry: false,
    required: "NO",
    label: "Informativa privacy",
    clubDocId: "privacy",
  },
  {
    code: "MOG_SAFEGUARDING",
    section: "FIRMATO",
    docClass: "FIRMA",
    hasExpiry: false,
    required: "NO",
    label: "Modello organizzativo Safeguarding",
    clubDocId: "safeguarding",
  },
  {
    code: "REGOLAMENTO_CENTRO_SPORTIVO",
    section: "FIRMATO",
    docClass: "FIRMA",
    hasExpiry: false,
    required: "NO",
    label: "Regolamento utilizzo centro sportivo",
    clubDocId: "regolamento-generale",
  },
  {
    code: "REGOLAMENTO_TRASFERTE",
    section: "FIRMATO",
    docClass: "FIRMA",
    hasExpiry: false,
    required: "NO",
    label: "Regolamento trasferte, trasporti e minori",
    clubDocId: "trasferte-minori",
  },
  {
    code: "CODICE_CONDOTTA_ATLETA",
    section: "FIRMATO",
    docClass: "FIRMA",
    hasExpiry: false,
    required: "NO",
    label: "Codice di condotta · Atleta",
    clubDocId: "codice-condotta",
  },
  {
    code: "CODICE_CONDOTTA_GENITORE",
    section: "FIRMATO",
    docClass: "FIRMA",
    hasExpiry: false,
    required: "NO",
    label: "Codice di condotta · Genitore e famiglia",
    clubDocId: "codice-condotta",
  },
  {
    code: "LIBERATORIA_IMMAGINI",
    section: "FIRMATO",
    docClass: "FIRMA",
    hasExpiry: false,
    required: "NO",
    label: "Liberatoria immagini, video e audio",
    clubDocId: "liberatoria",
  },
  {
    code: "DICHIARAZIONE_SOSTITUTIVA",
    section: "FIRMATO",
    docClass: "FIRMA",
    hasExpiry: false,
    required: "NO",
    label: "Dichiarazione sostitutiva (DPR 445/2000)",
    clubDocId: null,
  },
  {
    code: "CONFERMA_QUOTA",
    section: "FIRMATO",
    docClass: "FIRMA",
    hasExpiry: false,
    required: "NO",
    label: "Conferma quota",
    clubDocId: null,
  },
  {
    code: "CONFERMA_PULMINO",
    section: "FIRMATO",
    docClass: "FIRMA",
    hasExpiry: false,
    required: "NO",
    label: "Conferma pulmino",
    clubDocId: null,
  },
  {
    code: "CONFERMA_ABBIGLIAMENTO",
    section: "FIRMATO",
    docClass: "FIRMA",
    hasExpiry: false,
    required: "NO",
    label: "Conferma abbigliamento",
    clubDocId: null,
  },
  {
    code: "CERTIFICATO_MEDICO",
    section: "CONSEGNATO",
    docClass: "SANITARIO",
    hasExpiry: true,
    required: "ATLETA",
    label: "Certificato medico",
    clubDocId: null,
  },
  {
    code: "DOC_IDENTITA_ATLETA_FRONTE",
    section: "CONSEGNATO",
    docClass: "IDENTITA",
    hasExpiry: true,
    required: "ATLETA",
    label: "Documento d'identità atleta · fronte",
    clubDocId: null,
  },
  {
    code: "DOC_IDENTITA_ATLETA_RETRO",
    section: "CONSEGNATO",
    docClass: "IDENTITA",
    hasExpiry: false,
    required: "ATLETA",
    label: "Documento d'identità atleta · retro",
    clubDocId: null,
  },
  {
    code: "TESSERA_SANITARIA_FRONTE",
    section: "CONSEGNATO",
    docClass: "IDENTITA",
    hasExpiry: true,
    required: "ATLETA",
    label: "Tessera sanitaria · fronte",
    clubDocId: null,
  },
  {
    code: "TESSERA_SANITARIA_RETRO",
    section: "CONSEGNATO",
    docClass: "IDENTITA",
    hasExpiry: false,
    required: "ATLETA",
    label: "Tessera sanitaria · retro",
    clubDocId: null,
  },
  {
    code: "PERMESSO_SOGGIORNO",
    section: "CONSEGNATO",
    docClass: "IDENTITA",
    hasExpiry: true,
    required: "NO",
    label: "Permesso di soggiorno",
    clubDocId: null,
  },
  {
    code: "FOTOTESSERA",
    section: "CONSEGNATO",
    docClass: "IDENTITA",
    hasExpiry: false,
    required: "ATLETA",
    label: "Fototessera",
    clubDocId: null,
  },
  {
    code: "DOC_IDENTITA_GENITORE",
    section: "CONSEGNATO",
    docClass: "IDENTITA",
    hasExpiry: true,
    required: "ATLETA_MINORE",
    label: "Documento d'identità genitore o tutore",
    clubDocId: null,
  },
  {
    code: "DOC_IDENTITA_GENITORE_2",
    section: "CONSEGNATO",
    docClass: "IDENTITA",
    hasExpiry: true,
    required: "NO",
    label: "Documento d'identità secondo genitore",
    clubDocId: null,
  },
  {
    code: "DOC_GIUSTIFICATIVO",
    section: "CONSEGNATO",
    docClass: "IDENTITA",
    hasExpiry: false,
    required: "NO",
    label: "Documento giustificativo",
    clubDocId: null,
  },
  {
    code: "DOC_DELEGATI_RITIRO",
    section: "CONSEGNATO",
    docClass: "IDENTITA",
    hasExpiry: true,
    required: "NO",
    label: "Documento dei delegati al ritiro",
    clubDocId: null,
  },
  {
    code: "ATTESTAZIONE_ISEE",
    section: "CONSEGNATO",
    docClass: "ECONOMICO",
    hasExpiry: true,
    required: "NO",
    label: "Attestazione ISEE",
    clubDocId: null,
  },
];

const BY_CODE = new Map(DOC_KINDS.map((k) => [k.code, k]));
export const UPLOAD_KINDS = DOC_KINDS.filter(
  (k) => k.section === "CONSEGNATO",
).map((k) => k.code);

export function kindInfo(code: string): DocKind | undefined {
  return BY_CODE.get(code);
}
export function kindLabel(code: string): string {
  return BY_CODE.get(code)?.label ?? "Documento";
}

export type DeliveredStatus =
  | "IN_REGOLA"
  | "IN_SCADENZA"
  | "SCADUTO"
  /** A kind that expires with no known date (or a certificate not yet in the register): never «in regola». */
  | "DA_VERIFICARE"
  | "IN_VERIFICA"
  | "RIFIUTATO"
  | "MANCANTE"
  | "NON_COLLEGATO";
export type RequestStatus =
  "APERTA" | "CARICATO_IN_VERIFICA" | "APPROVATO" | "RIFIUTATO";
export type ChipToneLike = "ok" | "warn" | "crit" | "info" | "mute";

export const STATUS_LABEL: Record<DeliveredStatus, string> = {
  IN_REGOLA: "In regola",
  IN_SCADENZA: "In scadenza",
  SCADUTO: "Scaduto",
  DA_VERIFICARE: "Scadenza da verificare",
  IN_VERIFICA: "In verifica",
  RIFIUTATO: "Da ricaricare",
  MANCANTE: "Mancante",
  NON_COLLEGATO: "Da collegare",
};
export const STATUS_TONE: Record<DeliveredStatus, ChipToneLike> = {
  IN_REGOLA: "ok",
  IN_SCADENZA: "warn",
  SCADUTO: "crit",
  DA_VERIFICARE: "warn",
  IN_VERIFICA: "info",
  RIFIUTATO: "crit",
  MANCANTE: "warn",
  NON_COLLEGATO: "mute",
};
export const REQUEST_LABEL: Record<RequestStatus, string> = {
  APERTA: "Da caricare",
  CARICATO_IN_VERIFICA: "Caricato, in verifica",
  APPROVATO: "Approvato",
  RIFIUTATO: "Da ricaricare",
};
export const REQUEST_TONE: Record<RequestStatus, ChipToneLike> = {
  APERTA: "warn",
  CARICATO_IN_VERIFICA: "info",
  APPROVATO: "ok",
  RIFIUTATO: "crit",
};

export interface SignedDoc {
  kind: string;
  acceptedAt: string | null;
  source: string | null;
}
export interface ConsentRow {
  type: string;
  granted: boolean;
  givenAt: string | null;
}
export interface DeliveredDoc {
  kind: string;
  status: DeliveredStatus;
  expiresAt: string | null;
  uploadedAt: string | null;
  pending: boolean;
  reviewNote: string | null;
}
export interface DocRequest {
  id: string;
  kind: string;
  note: string | null;
  due: string | null;
  status: RequestStatus;
  createdAt: string | null;
}
export interface DrawerPerson {
  personId: string;
  label: string;
  relationship: string;
  isMinor: boolean | null;
  isAthlete: boolean;
  signed: SignedDoc[];
  consents: ConsentRow[];
  delivered: DeliveredDoc[];
  requests: DocRequest[];
}
export interface Drawer {
  importDone: boolean;
  people: DrawerPerson[];
}
export interface Lamp {
  expired: number;
  expiring: number;
  requests: number;
  total: number;
}

const obj = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const str = (v: unknown): string | null =>
  typeof v === "string" && v.length > 0 ? v : null;
const num = (v: unknown): number => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
};
const DELIVERED: readonly DeliveredStatus[] = [
  "IN_REGOLA",
  "IN_SCADENZA",
  "SCADUTO",
  "DA_VERIFICARE",
  "IN_VERIFICA",
  "RIFIUTATO",
  "MANCANTE",
  "NON_COLLEGATO",
];
const REQUESTS: readonly RequestStatus[] = [
  "APERTA",
  "CARICATO_IN_VERIFICA",
  "APPROVATO",
  "RIFIUTATO",
];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** scd_my_documents answer -> typed drawer. Unknown kinds and malformed rows are dropped, never guessed. */
export function parseDrawer(raw: unknown): Drawer {
  const r = obj(raw);
  const people: DrawerPerson[] = [];
  for (const pv of arr(r["people"])) {
    const p = obj(pv);
    const personId = str(p["personId"]);
    if (!personId || !UUID.test(personId)) continue;
    people.push({
      personId,
      label: str(p["label"]) ?? "Persona",
      relationship: str(p["relationship"]) ?? "FAMILY",
      isMinor:
        typeof p["isMinor"] === "boolean" ? (p["isMinor"] as boolean) : null,
      isAthlete: p["isAthlete"] === true,
      signed: arr(p["signed"])
        .map(obj)
        .filter((s) => BY_CODE.get(String(s["kind"]))?.section === "FIRMATO")
        .map((s) => ({
          kind: String(s["kind"]),
          acceptedAt: str(s["acceptedAt"]),
          source: str(s["source"]),
        })),
      consents: arr(p["consents"])
        .map(obj)
        .filter((c) => typeof c["type"] === "string")
        .map((c) => ({
          type: String(c["type"]),
          granted: c["granted"] === true,
          givenAt: str(c["givenAt"]),
        })),
      delivered: arr(p["delivered"])
        .map(obj)
        .filter(
          (d) =>
            BY_CODE.get(String(d["kind"]))?.section === "CONSEGNATO" &&
            DELIVERED.includes(d["status"] as DeliveredStatus),
        )
        .map((d) => ({
          kind: String(d["kind"]),
          status: d["status"] as DeliveredStatus,
          expiresAt: str(d["expiresAt"]),
          uploadedAt: str(d["uploadedAt"]),
          pending: d["pending"] === true,
          reviewNote: str(d["reviewNote"]),
        }))
        .sort(
          (a, b) => UPLOAD_KINDS.indexOf(a.kind) - UPLOAD_KINDS.indexOf(b.kind),
        ),
      requests: arr(p["requests"])
        .map(obj)
        .filter(
          (q) =>
            typeof q["id"] === "string" &&
            UUID.test(String(q["id"])) &&
            BY_CODE.has(String(q["kind"])) &&
            REQUESTS.includes(q["status"] as RequestStatus),
        )
        .map((q) => ({
          id: String(q["id"]),
          kind: String(q["kind"]),
          note: str(q["note"]),
          due: str(q["due"]),
          status: q["status"] as RequestStatus,
          createdAt: str(q["createdAt"]),
        })),
    });
  }
  return { importDone: r["importDone"] === true, people };
}

export function parseLamp(raw: unknown): Lamp {
  const r = obj(raw);
  return {
    expired: num(r["expired"]),
    expiring: num(r["expiring"]),
    requests: num(r["requests"]),
    total: num(r["total"]),
  };
}

/** What still needs the family: expired, expiring, rejected or missing documents and open requests. */
export function personTodo(p: DrawerPerson): number {
  const docs = p.delivered.filter((d) =>
    ["SCADUTO", "IN_SCADENZA", "RIFIUTATO", "MANCANTE"].includes(d.status),
  ).length;
  const reqs = p.requests.filter(
    (q) => q.status === "APERTA" || q.status === "RIFIUTATO",
  ).length;
  return docs + reqs;
}

/** One log line for a Drive file that was stored but not indexed: Drive id + error code only, never personal data. */
export function orphanLogLine(driveFileId: string, code: string | null): string {
  const id = /^[A-Za-z0-9_-]{10,200}$/.test(driveFileId) ? driveFileId : "invalid-id";
  const c = code && /^[A-Za-z0-9_]{1,40}$/.test(code) ? code : "UNKNOWN";
  return `[r144] DOC_INDEX_ORPHAN drive_file_id=${id} code=${c}`;
}

/** Short alert of the Documenti tile on La mia SCD (singular/plural). */
export function lampAlert(total: number): string {
  return total === 1 ? "1 documento da sistemare" : `${total} documenti da sistemare`;
}

/** One sentence for the «lampadina» banner (null = nothing to say). */
export function lampMessage(l: Lamp): string | null {
  const parts: string[] = [];
  if (l.expired > 0)
    parts.push(
      l.expired === 1
        ? "1 documento scaduto"
        : `${l.expired} documenti scaduti`,
    );
  if (l.expiring > 0)
    parts.push(
      l.expiring === 1
        ? "1 in scadenza entro 30 giorni"
        : `${l.expiring} in scadenza entro 30 giorni`,
    );
  if (l.requests > 0)
    parts.push(
      l.requests === 1
        ? "1 richiesta della Segreteria"
        : `${l.requests} richieste della Segreteria`,
    );
  return parts.length ? parts.join(", ") : null;
}

export const CONSENT_LABEL: Record<string, string> = {
  IMMAGINI_ISTITUZIONALI: "Foto e video sui canali del club",
  COMUNICAZIONI_PROMOZIONALI: "Comunicazioni promozionali",
  PULMINO_SERVIZIO: "Servizio pulmino",
  USCITA_AUTONOMA: "Uscita autonoma",
  AVATAR_APP: "Avatar nell'app",
  FOTO_PARTITA_APP: "Foto delle partite nell'app",
};

/* ------------------------------------------------------------------ upload checks */

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export type UploadMime =
  "application/pdf" | "image/jpeg" | "image/png" | "image/heic";
const EXT: Record<UploadMime, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/heic": "heic",
};
const HEIC_BRANDS = new Set([
  "heic",
  "heix",
  "hevc",
  "hevx",
  "heim",
  "heis",
  "mif1",
  "msf1",
]);

/** The real type from the first bytes (the browser's type is never trusted). null = not accepted. */
export function sniffMime(bytes: Uint8Array): UploadMime | null {
  const b = bytes;
  if (
    b.length >= 5 &&
    b[0] === 0x25 &&
    b[1] === 0x50 &&
    b[2] === 0x44 &&
    b[3] === 0x46 &&
    b[4] === 0x2d
  )
    return "application/pdf";
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff)
    return "image/jpeg";
  if (
    b.length >= 8 &&
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((v, i) => b[i] === v)
  )
    return "image/png";
  if (
    b.length >= 12 &&
    String.fromCharCode(b[4]!, b[5]!, b[6]!, b[7]!) === "ftyp"
  ) {
    const brand = String.fromCharCode(b[8]!, b[9]!, b[10]!, b[11]!);
    if (HEIC_BRANDS.has(brand)) return "image/heic";
  }
  return null;
}

/**
 * Name of the file on the Drive: built from the kind and the date only ("certificato_medico_2026-10-17.pdf"), so the
 * original name (often with names or tax codes) never reaches the archive. Ascii, no separators.
 */
export function driveFileName(
  kind: string,
  mime: UploadMime,
  isoDate: string,
): string {
  const base =
    kind
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "") || "documento";
  const day = /^\d{4}-\d{2}-\d{2}$/.test(isoDate) ? isoDate : "data";
  return `${base}_${day}.${EXT[mime]}`;
}

/** Plain Italian for the codes of r144 and of the upload path. */
export function docErrorMessage(code: string | null | undefined): string {
  switch (code) {
    case "NOT_ALLOWED":
      return "Non puoi caricare o vedere questo documento con il tuo accesso.";
    case "BAD_KIND":
      return "Tipo di documento non previsto.";
    case "REQUEST_CLOSED":
      return "Questa richiesta è già chiusa.";
    case "BAD_FILE":
      return "File non accettato: carica un PDF o una foto (JPG, PNG, HEIC) fino a 10 MB.";
    case "TOO_LARGE":
      return "Il file deve pesare al massimo 10 MB.";
    case "TOO_MANY":
      return "Hai caricato molti file oggi: riprova domani o scrivi alla Segreteria.";
    case "NO_SERVICE":
    case "UPLOAD_OFF":
      return "Caricamento in preparazione: per ora consegna il documento alla Segreteria.";
    case "ARCHIVE_FAILED":
      return "L'archivio del club non ha confermato il salvataggio. Riprova tra poco.";
    case "NOTE_REQUIRED":
      return "Scrivi il motivo: la famiglia lo legge e ricarica il documento.";
    case "EXPIRY_REQUIRED":
      return "Inserisci la data di scadenza del certificato.";
    case "BAD_DATE":
      return "Data non valida.";
    case "NOT_PENDING":
      return "Il documento è già stato verificato.";
    case "CERT_ROLE":
      return "Il certificato lo approva chi ha il ruolo Segreteria o Direzione.";
    case "PERSON_NOT_FOUND":
      return "Persona non trovata.";
    case "NOT_FOUND":
      return "Documento non trovato.";
    default:
      return "Operazione non riuscita. Riprova tra poco.";
  }
}
