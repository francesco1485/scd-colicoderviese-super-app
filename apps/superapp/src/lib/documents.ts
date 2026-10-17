/**
 * T4 Documenti per pubblico (r81, UD-085). Pure helpers for /documenti: the Cervellone's catalogued documents
 * (scd_kb_items, kind DOCUMENTO) filtered by audience in the database. Families and athletes see only public
 * documents; for those the app links its own copy of the PDF, because they cannot open the club Drive.
 */
import { CLUB_DOCUMENTS, type ClubDocument } from "./club-documents";

export const AUDIENCES = ["FAMIGLIE", "ATLETI", "STAFF", "DIRIGENTI", "GESTIONE"] as const;
export type Audience = (typeof AUDIENCES)[number];

export const AUDIENCE_LABEL: Readonly<Record<Audience, string>> = {
  FAMIGLIE: "Famiglie",
  ATLETI: "Atleti",
  STAFF: "Staff e tecnici",
  DIRIGENTI: "Dirigenti",
  GESTIONE: "Ufficio e Direzione",
};

export const AUDIENCE_HELP: Readonly<Record<Audience, string>> = {
  FAMIGLIE: "Genitori e tutori registrati. Solo documenti pubblici.",
  ATLETI: "Atleti con account. Solo documenti pubblici.",
  STAFF: "Mister, staff tecnico, accompagnatori, segreteria.",
  DIRIGENTI: "Dirigenti di annata e Direzione.",
  GESTIONE: "Segreteria, Tesoreria e Direzione.",
};

/** Plain names for the Cervellone areas (same codes as the catalogue). */
export const AREA_LABEL: Readonly<Record<string, string>> = {
  ORGANIZZAZIONE_ORGANIGRAMMA: "Regole e organizzazione del club",
  FEDERAZIONE: "Federazione e Settore Giovanile",
  IMPIANTI_COMUNI: "Impianti e sicurezza",
  SCUOLE_ENTI: "Scuole ed enti",
  COMUNICAZIONE_MEDIA: "Immagini e comunicazione",
  SPONSOR_CONVENZIONI: "Sponsor e convenzioni",
  TORNEI_EVENTI: "Tornei ed eventi",
};

export interface LibraryDoc {
  ref: string;
  title: string;
  summary: string | null;
  area: string;
  season: string | null;
  date: string | null;
  due: string | null;
  link: string | null;
  audiences: Audience[];
  sensitivity: "PUBBLICO" | "INTERNO" | "RISERVATO";
}

export interface Library {
  audiences: Audience[];
  canEdit: boolean;
  items: LibraryDoc[];
}

type Raw = Record<string, unknown>;
const obj = (v: unknown): Raw | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Raw) : null);
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);
const isAudience = (v: unknown): v is Audience => typeof v === "string" && (AUDIENCES as readonly string[]).includes(v);
const audList = (v: unknown): Audience[] => (Array.isArray(v) ? AUDIENCES.filter((a) => v.includes(a)) : []);
const httpsLink = (v: unknown): string | null => {
  const s = str(v);
  return s && s.startsWith("https://") ? s : null;
};

export function parseDoc(v: unknown): LibraryDoc | null {
  const r = obj(v);
  const ref = r ? str(r["ref"]) : null;
  const title = r ? str(r["title"]) : null;
  if (!r || !ref || !title) return null;
  const s = r["sensitivity"];
  return {
    ref,
    title,
    summary: str(r["summary"]),
    area: str(r["area"]) ?? "ALTRO",
    season: str(r["season"]),
    date: str(r["date"])?.slice(0, 10) ?? null,
    due: str(r["due"])?.slice(0, 10) ?? null,
    link: httpsLink(r["link"]),
    audiences: audList(r["audiences"]),
    sensitivity: s === "PUBBLICO" || s === "RISERVATO" ? s : "INTERNO",
  };
}

export function parseLibrary(v: unknown): Library | null {
  const r = obj(v);
  if (!r) return null;
  return {
    audiences: Array.isArray(r["audiences"]) ? (r["audiences"] as unknown[]).filter(isAudience) : [],
    canEdit: r["canEdit"] === true,
    items: Array.isArray(r["items"]) ? r["items"].map(parseDoc).filter((d): d is LibraryDoc => d !== null) : [],
  };
}

const norm = (s: string) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Keywords that tie a catalogued public document to the app's own PDF (config/scd-club-documents.v1.json). */
const PUBLIC_KEYS: ReadonlyArray<[string, string]> = [
  ["regolamento-generale", "regolamento generale"],
  ["codice-condotta", "codice unico di condotta"],
  ["trasferte-minori", "regolamento trasferte"],
  ["safeguarding", "safeguarding"],
  ["privacy", "informativa privacy"],
  ["liberatoria", "liberatoria"],
];

/** The app's PDF for a public document, when there is one. */
export function appCopy(d: Pick<LibraryDoc, "title" | "sensitivity">, docs: readonly ClubDocument[] = CLUB_DOCUMENTS): ClubDocument | null {
  if (d.sensitivity !== "PUBBLICO") return null;
  const t = norm(d.title);
  const hit = PUBLIC_KEYS.find(([, k]) => t.includes(k));
  return hit ? (docs.find((x) => x.id === hit[0]) ?? null) : null;
}

/** Where a document opens for this viewer: the app PDF for public documents, otherwise the club link. */
export function openHref(d: LibraryDoc): string | null {
  return appCopy(d)?.file ?? d.link;
}

/**
 * «Documenti della tua area» on /documenti for signed-in people outside the office: the r81 catalogue rows the
 * database already filtered for their audience (family, athlete, staff, mister), sorted by title, with where they open.
 * Nothing disappears when the page turned into «I miei documenti» (Francesco 16/10/2026).
 */
export interface AreaDocLink {
  ref: string;
  title: string;
  href: string | null;
  due: string | null;
}
export function yourAreaDocs(lib: Library | null): AreaDocLink[] {
  if (!lib || lib.audiences.length === 0) return [];
  return [...lib.items]
    .sort((a, b) => a.title.localeCompare(b.title, "it"))
    .map((d) => ({ ref: d.ref, title: d.title, href: openHref(d), due: d.due }));
}

export interface AreaGroup {
  area: string;
  label: string;
  items: LibraryDoc[];
}

/** Documents grouped by area: club rules first, then the rest alphabetically by label. */
export function groupByArea(items: readonly LibraryDoc[]): AreaGroup[] {
  const map = new Map<string, LibraryDoc[]>();
  for (const d of items) map.set(d.area, [...(map.get(d.area) ?? []), d]);
  const label = (a: string) => AREA_LABEL[a] ?? a.replace(/_/g, " ").toLowerCase().replace(/^./, (c) => c.toUpperCase());
  return [...map.entries()]
    .map(([area, docs]) => ({ area, label: label(area), items: [...docs].sort((a, b) => a.title.localeCompare(b.title)) }))
    .sort((a, b) => (a.area === "ORGANIZZAZIONE_ORGANIGRAMMA" ? -1 : b.area === "ORGANIZZAZIONE_ORGANIGRAMMA" ? 1 : a.label.localeCompare(b.label)));
}

export type DocFilter = "tutti" | Audience | "scadenze";

export function filterDocs(items: readonly LibraryDoc[], f: DocFilter, q: string, today: string): LibraryDoc[] {
  const needle = norm(q.trim());
  return items
    .filter((d) => (f === "tutti" ? true : f === "scadenze" ? d.due !== null && d.due >= today : d.audiences.includes(f)))
    .filter((d) => (needle ? norm(`${d.title} ${d.summary ?? ""} ${d.area}`).includes(needle) : true));
}

/** Documents with a deadline still ahead, nearest first. */
export function upcoming(items: readonly LibraryDoc[], today: string, limit = 5): LibraryDoc[] {
  return items.filter((d) => d.due !== null && d.due >= today).sort((a, b) => (a.due ?? "").localeCompare(b.due ?? "")).slice(0, limit);
}

/** Audiences that need the document to be public first (families and athletes). */
export function needsPublic(next: readonly Audience[], d: Pick<LibraryDoc, "sensitivity">): boolean {
  return d.sensitivity !== "PUBBLICO" && next.some((a) => a === "FAMIGLIE" || a === "ATLETI");
}

const ERRORS: Readonly<Record<string, string>> = {
  forbidden: "Solo la Direzione decide chi vede i documenti.",
  not_found: "Il documento non è più nel catalogo: ricarica la pagina.",
  needs_public: "Per famiglie e atleti il documento deve diventare pubblico: conferma la casella.",
  reserved: "Un documento riservato non può andare allo staff.",
};
export function audienceError(code: string | null | undefined): string {
  return (code && ERRORS[code]) || "Salvataggio non riuscito. Riprova tra poco.";
}
