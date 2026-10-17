/**
 * Mapping of past enrolments (Tally «Modulo Iscrizioni 2026/2027» VLAJNy, staff form PdeZNV) and of the Drive folders
 * `Cognome_Nome_Ruolo` (made by the Make scenarios «Atleti»/«Staff») to scd_documents rows (r142). Pure functions used
 * by scripts/import-enrolment-documents.mjs; self-contained (no imports) so Node can load it with type stripping.
 *
 * PROPOSED: the question-title patterns below follow the documents listed by the Direzione; they must be checked
 * against the real form (Tally load_form VLAJNy / PdeZNV) before the write mode is ever run.
 * People are matched on first name + last name + birth date (never on the name alone); Drive folders only when the
 * normalised `Cognome_Nome` matches exactly one person. Output of the script: counts only.
 */

export type ImportKind = string;

/** Acceptance questions (checkbox / consent) -> section FIRMATO kinds. Order matters: first match wins. */
export const ACCEPTANCE_PATTERNS: ReadonlyArray<[RegExp, ImportKind]> = [
  [/informativa.*privacy|trattamento dei dati/i, "INFORMATIVA_PRIVACY"],
  [/safeguarding/i, "MOG_SAFEGUARDING"],
  [/codice.*condotta.*(genitor|famigl)/i, "CODICE_CONDOTTA_GENITORE"],
  [/codice.*condotta/i, "CODICE_CONDOTTA_ATLETA"],
  [/regolamento.*(trasfert|trasport|minori)/i, "REGOLAMENTO_TRASFERTE"],
  [
    /regolamento.*(centro|impiant|struttura|generale)/i,
    "REGOLAMENTO_CENTRO_SPORTIVO",
  ],
  [/liberatoria|immagini.*video/i, "LIBERATORIA_IMMAGINI"],
  [/dichiarazione sostitutiva|445\/2000/i, "DICHIARAZIONE_SOSTITUTIVA"],
  [/pulmino|trasporto/i, "CONFERMA_PULMINO"],
  [/abbigliamento|kit/i, "CONFERMA_ABBIGLIAMENTO"],
  [/quota/i, "CONFERMA_QUOTA"],
];

/** File questions or Drive file names -> section CONSEGNATO kinds. First match wins. */
export const FILE_PATTERNS: ReadonlyArray<[RegExp, ImportKind]> = [
  [/certificat.*medic|idoneit/i, "CERTIFICATO_MEDICO"],
  [/isee/i, "ATTESTAZIONE_ISEE"],
  [/permesso.*soggiorno/i, "PERMESSO_SOGGIORNO"],
  [/foto.?tessera|fototessera/i, "FOTOTESSERA"],
  [/tessera.*sanitaria.*retro|ts.*retro/i, "TESSERA_SANITARIA_RETRO"],
  [/tessera.*sanitaria|codice.*fiscale/i, "TESSERA_SANITARIA_FRONTE"],
  [/(secondo|2).*genitor/i, "DOC_IDENTITA_GENITORE_2"],
  [/genitor|tutore/i, "DOC_IDENTITA_GENITORE"],
  [/delegat|ritiro/i, "DOC_DELEGATI_RITIRO"],
  [/giustificativ/i, "DOC_GIUSTIFICATIVO"],
  [
    /(documento|carta).*identit.*retro|identit.*retro/i,
    "DOC_IDENTITA_ATLETA_RETRO",
  ],
  [/(documento|carta).*identit|passaporto/i, "DOC_IDENTITA_ATLETA_FRONTE"],
];

export const CERT_EXPIRY_PATTERN = /scadenza.*certificat|certificat.*scad/i;

export function classify(
  text: string,
  patterns: ReadonlyArray<[RegExp, ImportKind]>,
): ImportKind | null {
  for (const [re, kind] of patterns) if (re.test(text)) return kind;
  return null;
}

/** "Rossi D'Amico", "rossì" -> "ROSSIDAMICO": accents off, letters only, upper case. */
export function normName(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z]/g, "")
    .toUpperCase();
}

export interface PersonRef {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string | null;
}

export interface TallyField {
  title: string;
  type: string;
  /** Checkbox/consent: boolean or array of chosen options; file: array of { url?, name?, id? }; text/date: string. */
  value: unknown;
}

export interface TallySubmission {
  id: string;
  submittedAt: string;
  firstName: string | null;
  lastName: string | null;
  birthDate: string | null;
  fields: TallyField[];
}

export interface ImportRow {
  personId: string;
  kind: ImportKind;
  section: "FIRMATO" | "CONSEGNATO";
  status: "ACCETTATO" | "APPROVATO";
  acceptedAt: string | null;
  expiresAt: string | null;
  driveFileId: string | null;
  sourceId: "TALLY_VLAJNY" | "TALLY_PDEZNV" | "DRIVE_IMPORT";
  sourceRecordId: string;
}

export interface ImportSummary {
  submissions: number;
  matched: number;
  unmatched: number;
  acceptances: Record<string, number>;
  certificateDates: number;
  folders: number;
  foldersMatched: number;
  foldersAmbiguousOrUnknown: number;
  files: Record<string, number>;
  filesUnclassified: number;
  rows: number;
}

const truthy = (v: unknown): boolean =>
  v === true ||
  (Array.isArray(v) && v.length > 0) ||
  (typeof v === "string" && /^(s[iì]|yes|true|accetto|1)$/i.test(v.trim()));
const isoDate = (v: unknown): string | null => {
  if (typeof v !== "string") return null;
  const m =
    v.match(/^(\d{4})-(\d{2})-(\d{2})/) ??
    v.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return null;
  return m[0].includes("/")
    ? `${m[3]}-${m[2]}-${m[1]}`
    : `${m[1]}-${m[2]}-${m[3]}`;
};

export function personIndex(people: readonly PersonRef[]) {
  const byKey = new Map<string, PersonRef[]>();
  const byName = new Map<string, PersonRef[]>();
  for (const p of people) {
    const name = normName(p.lastName) + "_" + normName(p.firstName);
    const key = `${name}|${p.birthDate ?? ""}`;
    byKey.set(key, [...(byKey.get(key) ?? []), p]);
    byName.set(name, [...(byName.get(name) ?? []), p]);
  }
  return {
    /** Exact first + last name + birth date, unique. */
    bySubmission(
      s: Pick<TallySubmission, "firstName" | "lastName" | "birthDate">,
    ): PersonRef | null {
      if (!s.firstName || !s.lastName || !s.birthDate) return null;
      const hits =
        byKey.get(
          `${normName(s.lastName)}_${normName(s.firstName)}|${isoDate(s.birthDate) ?? ""}`,
        ) ?? [];
      return hits.length === 1 ? hits[0]! : null;
    },
    /** Folder "Cognome_Nome_Ruolo": unique person with that Cognome_Nome, else null. */
    byFolder(folder: string): PersonRef | null {
      const parts = folder.split("_").filter(Boolean);
      if (parts.length < 2) return null;
      for (let cut = parts.length; cut >= 2; cut--) {
        // usually the last part is the role; names may contain underscores (double surnames)
        for (let split = 1; split < cut; split++) {
          const name =
            normName(parts.slice(0, split).join("")) +
            "_" +
            normName(parts.slice(split, cut).join(""));
          const hits = byName.get(name) ?? [];
          if (hits.length === 1) return hits[0]!;
          if (hits.length > 1) return null;
        }
      }
      return null;
    },
  };
}

export function mapSubmissions(
  subs: readonly TallySubmission[],
  people: readonly PersonRef[],
  sourceId: "TALLY_VLAJNY" | "TALLY_PDEZNV",
): {
  rows: ImportRow[];
  matched: number;
  unmatched: number;
  certificateDates: number;
} {
  const idx = personIndex(people);
  const rows: ImportRow[] = [];
  let matched = 0;
  let certificateDates = 0;
  for (const s of subs) {
    const p = idx.bySubmission(s);
    if (!p) continue;
    matched++;
    const certExpiry = isoDate(
      s.fields.find((f) => CERT_EXPIRY_PATTERN.test(f.title))?.value,
    );
    if (certExpiry) certificateDates++;
    for (const f of s.fields) {
      if (f.type === "FILE_UPLOAD") {
        const kind = classify(f.title, FILE_PATTERNS);
        const files = Array.isArray(f.value) ? f.value : [];
        if (!kind || files.length === 0) continue;
        rows.push({
          personId: p.id,
          kind,
          section: "CONSEGNATO",
          status: "APPROVATO",
          acceptedAt: null,
          expiresAt: kind === "CERTIFICATO_MEDICO" ? certExpiry : null,
          driveFileId: null,
          sourceId,
          sourceRecordId: `${s.id}:${kind}`,
        });
        continue;
      }
      if (CERT_EXPIRY_PATTERN.test(f.title)) continue;
      const kind = classify(f.title, ACCEPTANCE_PATTERNS);
      if (!kind || !truthy(f.value)) continue;
      if (rows.some((r) => r.sourceRecordId === `${s.id}:${kind}`)) continue;
      rows.push({
        personId: p.id,
        kind,
        section: "FIRMATO",
        status: "ACCETTATO",
        acceptedAt: s.submittedAt,
        expiresAt: null,
        driveFileId: null,
        sourceId,
        sourceRecordId: `${s.id}:${kind}`,
      });
    }
  }
  return { rows, matched, unmatched: subs.length - matched, certificateDates };
}

export interface DriveFolder {
  name: string;
  files: { id: string; name: string }[];
}

const DRIVE_ID = /^[A-Za-z0-9_-]{10,200}$/;

export function mapDriveFolders(
  folders: readonly DriveFolder[],
  people: readonly PersonRef[],
) {
  const idx = personIndex(people);
  const rows: ImportRow[] = [];
  let matched = 0;
  let unclassified = 0;
  for (const f of folders) {
    const p = idx.byFolder(f.name);
    if (!p) continue;
    matched++;
    for (const file of f.files) {
      const kind = classify(file.name, FILE_PATTERNS);
      if (!kind || !DRIVE_ID.test(file.id)) {
        unclassified++;
        continue;
      }
      rows.push({
        personId: p.id,
        kind,
        section: "CONSEGNATO",
        status: "APPROVATO",
        acceptedAt: null,
        expiresAt: null,
        driveFileId: file.id,
        sourceId: "DRIVE_IMPORT",
        sourceRecordId: `drive:${file.id}`,
      });
    }
  }
  return {
    rows,
    matched,
    ambiguousOrUnknown: folders.length - matched,
    unclassified,
  };
}

/** Counts only: no names, no ids, no file names. */
export function summarize(
  subs: {
    count: number;
    matched: number;
    unmatched: number;
    certificateDates: number;
    rows: ImportRow[];
  },
  drive: {
    count: number;
    matched: number;
    ambiguousOrUnknown: number;
    unclassified: number;
    rows: ImportRow[];
  },
): ImportSummary {
  const tally = (rows: ImportRow[], section: string) =>
    rows
      .filter((r) => r.section === section)
      .reduce<Record<string, number>>(
        (acc, r) => ({ ...acc, [r.kind]: (acc[r.kind] ?? 0) + 1 }),
        {},
      );
  const all = [...subs.rows, ...drive.rows];
  return {
    submissions: subs.count,
    matched: subs.matched,
    unmatched: subs.unmatched,
    acceptances: tally(all, "FIRMATO"),
    certificateDates: subs.certificateDates,
    folders: drive.count,
    foldersMatched: drive.matched,
    foldersAmbiguousOrUnknown: drive.ambiguousOrUnknown,
    files: tally(all, "CONSEGNATO"),
    filesUnclassified: drive.unclassified,
    rows: all.length,
  };
}
