/**
 * One register for three platforms that until 17/10/2026 had no data entry (Francesco, DG, 17/10/2026 12:22: «quando
 * sarà pronta la piattaforma delle tessere, convenzioni e delle Club House per lavorarci e iniziare a inserire tutto»):
 *   - 07 Club House Colico e Dervio: opening hours per site, price list, group menus. The evening events are NOT here:
 *     they are the r135 register "Attività in struttura" (area CLUB_HOUSE, kind ATTIVITA_SERALE, /gestionale/struttura).
 *   - 19 Convenzioni: partner, offer, validity, how to use it, category, cards that give access, link.
 *   - Tessere (club cards): other card or membership types, benefits and rules ADDED to the three cards of
 *     config/scd-club-cards.v1.json (lib/club-cards.ts), which stay the Direzione's policy and are never duplicated.
 * Storage: Supabase SCD PULSE table scd_club_catalog (migration r115, APPLIED 17/10/2026 after «applica r115»:
 * part1 tables, part2 clean+save; part3 = tightened date strip, pending). This file is pure:
 * types, the writer rule mirror, the input check (mirror of scd_club_catalog_clean), parsing and the public views.
 * Nothing is invented: a missing price is "prezzo da confermare", an empty list is "da confermare", never zero.
 */
import { CLUB_CARD_IDS, type ClubCardId } from "@/lib/club-cards";

export const CATALOG_PLATFORMS = ["CLUB_HOUSE", "CONVENZIONI", "TESSERE"] as const;
export type CatalogPlatform = (typeof CATALOG_PLATFORMS)[number];

export const CATALOG_KINDS = ["ORARIO", "LISTINO", "MENU_GRUPPI", "CONVENZIONE", "CARD_TIPO", "CARD_VANTAGGIO", "CARD_REGOLA"] as const;
export type CatalogKind = (typeof CATALOG_KINDS)[number];

export const PLATFORM_KINDS: Readonly<Record<CatalogPlatform, readonly CatalogKind[]>> = {
  CLUB_HOUSE: ["ORARIO", "LISTINO", "MENU_GRUPPI"],
  CONVENZIONI: ["CONVENZIONE"],
  TESSERE: ["CARD_VANTAGGIO", "CARD_REGOLA", "CARD_TIPO"],
};

export const PLATFORM_LABEL: Readonly<Record<CatalogPlatform, string>> = {
  CLUB_HOUSE: "Club House",
  CONVENZIONI: "Convenzioni",
  TESSERE: "Tessere e card",
};

export const KIND_LABEL: Readonly<Record<CatalogKind, string>> = {
  ORARIO: "Orario di apertura",
  LISTINO: "Voce del listino",
  MENU_GRUPPI: "Menu per gruppi",
  CONVENZIONE: "Convenzione",
  CARD_TIPO: "Altro tipo di tessera",
  CARD_VANTAGGIO: "Vantaggio di una card",
  CARD_REGOLA: "Regola delle card",
};

export const CATALOG_SITES = ["COLICO", "DERVIO"] as const;
export type CatalogSite = (typeof CATALOG_SITES)[number];
export const SITE_LABEL: Readonly<Record<CatalogSite, string>> = { COLICO: "Colico", DERVIO: "Dervio" };

/** Same categories as the Club House cash register; the till preview tabs come from here (LISTINO_TAB_LABELS). */
export const LISTINO_CATEGORIES = ["BAR", "CUCINA", "MERCHANDISING", "SERVIZI_FOTO"] as const;
export const CONVENZIONE_CATEGORIES = ["RISTORAZIONE", "SPORT_SALUTE", "NEGOZI", "SERVIZI", "ALTRO"] as const;
export const CATEGORY_LABEL: Readonly<Record<string, string>> = {
  BAR: "Bar",
  CUCINA: "Cucina",
  MERCHANDISING: "Merchandising",
  SERVIZI_FOTO: "Servizi foto",
  RISTORAZIONE: "Ristorazione",
  SPORT_SALUTE: "Sport e salute",
  NEGOZI: "Negozi",
  SERVIZI: "Servizi",
  ALTRO: "Altro",
};
/** Tabs of the till preview of /tesoreria and /tesoreria/club-house: the same categories as the Club House cash register
 *  (VERIFIED from a photo of the till, 17/10/2026: bar, cucina, merchandising, servizi fotografici). */
export const LISTINO_TAB_LABELS: readonly string[] = LISTINO_CATEGORIES.map((c) => CATEGORY_LABEL[c] ?? c);

export const CATALOG_STATUSES = ["BOZZA", "PUBBLICATA", "ARCHIVIATA"] as const;
export type CatalogStatus = (typeof CATALOG_STATUSES)[number];
export const STATUS_LABEL: Readonly<Record<CatalogStatus, string>> = { BOZZA: "Bozza", PUBBLICATA: "Pubblicata", ARCHIVIATA: "Archiviata" };

export const CARD_LABEL: Readonly<Record<ClubCardId, string>> = { tesserato: "Tesserato", sostenitore: "Sostenitore", partner: "Partner" };

/**
 * Who writes each platform (mirror of scd_club_catalog_writer in r115, kept equal by club-catalog.test.ts). Existing
 * roles and positions only (config/scd-position-catalog.v1.json): nobody's permissions are changed. The Direzione
 * writes everything; Club House also its responsible; Tessere also the Segreteria; Convenzioni only the Direzione.
 */
export const CATALOG_WRITERS: Readonly<Record<CatalogPlatform, { roles: readonly string[]; positions: readonly string[] }>> = {
  CLUB_HOUSE: { roles: ["DIRECTION"], positions: ["presidente", "direttore-generale", "responsabile-club-house"] },
  CONVENZIONI: { roles: ["DIRECTION"], positions: ["presidente", "direttore-generale"] },
  TESSERE: { roles: ["DIRECTION", "SECRETARIAT"], positions: ["presidente", "direttore-generale", "segreteria"] },
};

export const WRITER_TEXT: Readonly<Record<CatalogPlatform, string>> = {
  CLUB_HOUSE: "Direzione e Responsabile Club House",
  CONVENZIONI: "Direzione",
  TESSERE: "Direzione e Segreteria",
};

/** Session rule (UX only: the database decides with scd_club_catalog_access). */
export function catalogWritablePlatforms(dbRoles: readonly string[], positions: ReadonlySet<string>): CatalogPlatform[] {
  return CATALOG_PLATFORMS.filter((p) => {
    const w = CATALOG_WRITERS[p];
    return dbRoles.some((r) => w.roles.includes(r)) || w.positions.some((x) => positions.has(x));
  });
}

export interface CatalogEntry {
  id: string;
  platform: CatalogPlatform;
  kind: CatalogKind;
  site: CatalogSite | null;
  category: string | null;
  title: string;
  body: string | null;
  howTo: string | null;
  cards: ClubCardId[];
  linkUrl: string | null;
  /** Euro cents; null = price to be confirmed (never 0 by default). */
  priceCents: number | null;
  days: string | null;
  opens: string | null;
  closes: string | null;
  validFrom: string | null;
  validUntil: string | null;
  /** Absent in the public read (only published rows are returned there). */
  status: CatalogStatus;
  sort: number;
  updatedAt: string | null;
}

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);
const isOneOf = <T extends string>(list: readonly T[], v: unknown): v is T => typeof v === "string" && (list as readonly string[]).includes(v);

/** Rows from the database; malformed rows are dropped, a non-array is null (unknown, never an empty list). */
export function parseCatalogEntries(input: unknown, opts: { publicRead?: boolean } = {}): CatalogEntry[] | null {
  if (!Array.isArray(input)) return null;
  const out: CatalogEntry[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const id = str(r["id"]);
    const title = str(r["title"]);
    if (!id || !title || !isOneOf(CATALOG_PLATFORMS, r["platform"]) || !isOneOf(CATALOG_KINDS, r["kind"])) continue;
    if (!PLATFORM_KINDS[r["platform"]].includes(r["kind"])) continue;
    const status: CatalogStatus = opts.publicRead ? "PUBBLICATA" : isOneOf(CATALOG_STATUSES, r["status"]) ? r["status"] : "BOZZA";
    const price = r["priceCents"];
    out.push({
      id,
      platform: r["platform"],
      kind: r["kind"],
      site: isOneOf(CATALOG_SITES, r["site"]) ? r["site"] : null,
      category: str(r["category"]),
      title,
      body: str(r["body"]),
      howTo: str(r["howTo"]),
      cards: Array.isArray(r["cards"]) ? (r["cards"] as unknown[]).filter((c): c is ClubCardId => isOneOf(CLUB_CARD_IDS, c)) : [],
      linkUrl: typeof r["linkUrl"] === "string" && /^https:\/\/\S+$/.test(r["linkUrl"]) ? r["linkUrl"] : null,
      priceCents: typeof price === "number" && Number.isInteger(price) && price >= 0 ? price : null,
      days: str(r["days"]),
      opens: str(r["opens"]),
      closes: str(r["closes"]),
      validFrom: str(r["validFrom"]),
      validUntil: str(r["validUntil"]),
      status,
      sort: typeof r["sort"] === "number" ? r["sort"] : 100,
      updatedAt: str(r["updatedAt"]),
    });
  }
  return out;
}

/* ------------------------------------------------------------------------------------------------ input (draft) */

export interface CatalogDraft {
  kind: CatalogKind;
  site: CatalogSite | null;
  category: string | null;
  title: string;
  body: string;
  howTo: string;
  cards: ClubCardId[];
  linkUrl: string;
  /** What the person typed, in euro ("2,50"); empty = price to be confirmed. */
  price: string;
  days: string;
  opens: string;
  closes: string;
  validFrom: string;
  validUntil: string;
  status: CatalogStatus;
  sort: number;
}

export type CatalogWriteCode =
  | "input"
  | "kind"
  | "status"
  | "title"
  | "body"
  | "how_to"
  | "days"
  | "contact"
  | "site"
  | "link"
  | "cards"
  | "price"
  | "time"
  | "date"
  | "category"
  | "not_found";

export const CATALOG_WRITE_MESSAGES: Readonly<Record<CatalogWriteCode, string>> = {
  input: "Dati non validi: ricontrolla il modulo.",
  kind: "Tipo di voce non valido per questa piattaforma.",
  status: "Stato non valido.",
  title: "Il titolo deve avere da 2 a 80 caratteri.",
  body: "Manca il testo (offerta, descrizione o regola), al massimo 600 caratteri.",
  how_to: "«Come usarla» può avere al massimo 300 caratteri.",
  days: "Scrivi i giorni (es. «Lunedì–venerdì»), massimo 60 caratteri.",
  contact: "Niente e-mail o numeri di telefono nei testi: per il contatto del partner usa il link.",
  site: "Scegli la sede: Colico o Dervio.",
  link: "Il link deve iniziare con https:// (massimo 300 caratteri).",
  cards: "Scegli almeno una card.",
  price: "Prezzo non valido: scrivilo in euro, es. 2,50. Lascia vuoto se è da confermare.",
  time: "Orari non validi: apertura e chiusura nel formato 17:00, diversi tra loro.",
  date: "Date non valide: la fine non può essere prima dell'inizio.",
  category: "Scegli la categoria.",
  not_found: "Voce non trovata: ricarica la pagina.",
};

export function isCatalogWriteCode(v: unknown): v is CatalogWriteCode {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(CATALOG_WRITE_MESSAGES, v);
}

const MAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const PHONE = /(\+|00)?[0-9]([ ./-]?[0-9]){8,}/;
/** A plausible delimited YYYY-MM-DD date (19xx/20xx, month 01-12, day 01-31): dropped before the phone check, so
 *  "2026-10-31" passes while "0341-94-01-23" or "3331-23-45-67" stay phone numbers. Mirror of scd_club_catalog_clean. */
const ISO_DATE = /(?<!\d)(19|20)\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])(?!\d)/g;
const TIME = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

function realDay(s: string): boolean {
  if (!DAY.test(s)) return false;
  const d = new Date(`${s}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** "2,50" / "2.5" / "2" -> 250 cents; "" -> null (da confermare); anything else -> "invalid". */
export function parseEuroInput(s: string): number | null | "invalid" {
  const t = s.trim().replace(/\s|€/g, "");
  if (!t) return null;
  const m = /^(\d{1,4})(?:[.,](\d{1,2}))?$/.exec(t);
  if (!m) return "invalid";
  const cents = Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0") || 0);
  return cents <= 1_000_000 ? cents : "invalid";
}

/** 250 -> "2,50 €"; null -> "prezzo da confermare". */
export function priceText(cents: number | null): string {
  if (cents === null) return "prezzo da confermare";
  return `${(cents / 100).toFixed(2).replace(".", ",")} €`;
}

/** The payload for scd_club_catalog_save, or the first problem (same order and codes as scd_club_catalog_clean). */
export function validateCatalogDraft(
  platform: CatalogPlatform,
  d: CatalogDraft,
): { ok: true; value: Record<string, unknown> } | { ok: false; code: CatalogWriteCode } {
  const fail = (code: CatalogWriteCode) => ({ ok: false as const, code });
  if (!PLATFORM_KINDS[platform].includes(d.kind)) return fail("kind");
  if (!isOneOf(CATALOG_STATUSES, d.status)) return fail("status");
  const title = d.title.trim();
  const body = d.body.trim();
  const howTo = d.howTo.trim();
  const days = d.days.trim();
  const link = d.linkUrl.trim();
  if (title.length < 2 || title.length > 80) return fail("title");
  if (body.length > 600) return fail("body");
  if (howTo.length > 300) return fail("how_to");
  if (days.length > 60) return fail("days");
  const text = [title, body, howTo, days].join(" ");
  if (MAIL.test(text) || PHONE.test(text.replace(ISO_DATE, " "))) return fail("contact");
  if (link && (link.length > 300 || !/^https:\/\/\S+$/.test(link))) return fail("link");
  const price = parseEuroInput(d.price);
  if (price === "invalid") return fail("price");
  if ((d.opens && !TIME.test(d.opens)) || (d.closes && !TIME.test(d.closes))) return fail("time");
  if ((d.validFrom && !realDay(d.validFrom)) || (d.validUntil && !realDay(d.validUntil))) return fail("date");
  if (d.validFrom && d.validUntil && d.validUntil < d.validFrom) return fail("date");
  const cards = [...new Set(d.cards)].filter((c) => isOneOf(CLUB_CARD_IDS, c)).sort();

  const v: Record<string, unknown> = {
    platform,
    kind: d.kind,
    site: d.site,
    category: d.category,
    title,
    body: body || null,
    howTo: howTo || null,
    cards,
    linkUrl: link || null,
    priceCents: price,
    days: days || null,
    opens: d.opens || null,
    closes: d.closes || null,
    validFrom: d.validFrom || null,
    validUntil: d.validUntil || null,
    status: d.status,
    sort: Number.isInteger(d.sort) && d.sort >= 0 && d.sort <= 9999 ? d.sort : 100,
  };
  switch (d.kind) {
    case "ORARIO":
      if (!d.site) return fail("site");
      if (days.length < 2) return fail("days");
      if (!d.opens || !d.closes || d.opens === d.closes) return fail("time");
      Object.assign(v, { category: null, priceCents: null, cards: [] });
      break;
    case "LISTINO":
      if (!isOneOf(LISTINO_CATEGORIES, d.category)) return fail("category");
      Object.assign(v, { opens: null, closes: null, days: null });
      break;
    case "MENU_GRUPPI":
      if (!body) return fail("body");
      Object.assign(v, { category: null, opens: null, closes: null });
      break;
    case "CONVENZIONE":
      if (!body) return fail("body");
      if (!isOneOf(CONVENZIONE_CATEGORIES, d.category)) return fail("category");
      Object.assign(v, { priceCents: null, opens: null, closes: null, days: null });
      break;
    case "CARD_TIPO":
      if (!body) return fail("body");
      Object.assign(v, { category: null, opens: null, closes: null, days: null, cards: [] });
      break;
    case "CARD_VANTAGGIO":
      if (cards.length === 0) return fail("cards");
      Object.assign(v, { category: null, priceCents: null, opens: null, closes: null, days: null });
      break;
    case "CARD_REGOLA":
      if (!body) return fail("body");
      Object.assign(v, { category: null, priceCents: null, opens: null, closes: null, days: null });
      break;
  }
  return { ok: true, value: v };
}

export function emptyCatalogDraft(kind: CatalogKind): CatalogDraft {
  return {
    kind,
    site: kind === "ORARIO" ? "COLICO" : null,
    category: kind === "LISTINO" ? "BAR" : kind === "CONVENZIONE" ? "NEGOZI" : null,
    title: "",
    body: "",
    howTo: "",
    cards: [],
    linkUrl: "",
    price: "",
    days: "",
    opens: "",
    closes: "",
    validFrom: "",
    validUntil: "",
    status: "BOZZA",
    sort: 100,
  };
}

export function draftFromEntry(e: CatalogEntry): CatalogDraft {
  return {
    kind: e.kind,
    site: e.site,
    category: e.category,
    title: e.title,
    body: e.body ?? "",
    howTo: e.howTo ?? "",
    cards: [...e.cards],
    linkUrl: e.linkUrl ?? "",
    price: e.priceCents === null ? "" : (e.priceCents / 100).toFixed(2).replace(".", ","),
    days: e.days ?? "",
    opens: e.opens ?? "",
    closes: e.closes ?? "",
    validFrom: e.validFrom ?? "",
    validUntil: e.validUntil ?? "",
    status: e.status,
    sort: e.sort,
  };
}

/* ------------------------------------------------------------------------------------------------ write state */

/** "on" opens the editor; "not-applied" = r115 not on the database; "unavailable" = read failed; "off" = not a writer. */
export type CatalogWriteState = "on" | "not-applied" | "unavailable" | "off";

export const CATALOG_NOT_APPLIED =
  "Inserimento non ancora attivo: il registro (migrazione r115) aspetta l'ok di Francesco («applica r115»).";
export const CATALOG_UNAVAILABLE = "Registro non raggiungibile ora, riprova più tardi.";
export const CATALOG_DENIED = "Non puoi modificare questa piattaforma con il tuo ruolo.";
export const CATALOG_FAILED = "Salvataggio non riuscito, riprova più tardi.";
export const CATALOG_NO_SESSION = "Accesso non valido: entra con il tuo account del club.";

export interface CatalogWriteOutcome {
  ok: boolean;
  message: string;
}

/** What the platform shows to whoever has not received it yet: entered data only, the rest "da confermare". */
export const TO_CONFIRM = "da confermare";

/** Rome calendar day of an instant (YYYY-MM-DD). */
export function romeToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** "fino al 31/12/2026" / "dal 01/11/2026" / "validità da confermare". */
export function validityText(e: Pick<CatalogEntry, "validFrom" | "validUntil">): string {
  const it = (s: string) => s.split("-").reverse().join("/");
  if (e.validFrom && e.validUntil) return `dal ${it(e.validFrom)} al ${it(e.validUntil)}`;
  if (e.validUntil) return `fino al ${it(e.validUntil)}`;
  if (e.validFrom) return `dal ${it(e.validFrom)}, scadenza da confermare`;
  return `validità ${TO_CONFIRM}`;
}

/** Longest wait of a public page (SSR loader) for the register: after it the page renders with "da confermare". */
export const PUBLIC_CATALOG_TIMEOUT_MS = 2000;

/** Resolves with the read, or with `fallback` when it fails or takes longer than `ms`. Never rejects. */
export function catalogWithin<T>(read: Promise<T>, fallback: T, ms: number = PUBLIC_CATALOG_TIMEOUT_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), ms);
  });
  return Promise.race([read.catch(() => fallback), late]).finally(() => clearTimeout(timer));
}

/* ------------------------------------------------------------------------------------------------ public views */

export interface ClubHousePublic {
  hours: Record<CatalogSite, CatalogEntry[]>;
  listino: Array<{ category: string; label: string; items: CatalogEntry[] }>;
  menus: CatalogEntry[];
}

const bySort = (a: CatalogEntry, b: CatalogEntry) => a.sort - b.sort || a.title.localeCompare(b.title, "it");

export function clubHousePublic(entries: readonly CatalogEntry[]): ClubHousePublic {
  const ch = entries.filter((e) => e.platform === "CLUB_HOUSE");
  const hours: Record<CatalogSite, CatalogEntry[]> = { COLICO: [], DERVIO: [] };
  for (const e of ch) if (e.kind === "ORARIO" && e.site) hours[e.site].push(e);
  hours.COLICO.sort(bySort);
  hours.DERVIO.sort(bySort);
  const listino = LISTINO_CATEGORIES.map((c) => ({
    category: c,
    label: CATEGORY_LABEL[c] ?? c,
    items: ch.filter((e) => e.kind === "LISTINO" && e.category === c).sort(bySort),
  })).filter((g) => g.items.length > 0);
  return { hours, listino, menus: ch.filter((e) => e.kind === "MENU_GRUPPI").sort(bySort) };
}

/** Published convenzioni; with a card, only those that card gives access to or that need no card. */
export function convenzioniFor(entries: readonly CatalogEntry[], card?: ClubCardId): CatalogEntry[] {
  return entries
    .filter((e) => e.platform === "CONVENZIONI" && e.kind === "CONVENZIONE")
    .filter((e) => !card || e.cards.length === 0 || e.cards.includes(card))
    .sort(bySort);
}

/** Card additions: benefits of a card (or of any card), extra rules, other card types. */
export function cardAdditions(entries: readonly CatalogEntry[], card?: ClubCardId) {
  const t = entries.filter((e) => e.platform === "TESSERE");
  return {
    benefits: t.filter((e) => e.kind === "CARD_VANTAGGIO" && (!card || e.cards.includes(card))).sort(bySort),
    rules: t.filter((e) => e.kind === "CARD_REGOLA" && (!card || e.cards.length === 0 || e.cards.includes(card))).sort(bySort),
    types: card ? [] : t.filter((e) => e.kind === "CARD_TIPO").sort(bySort),
  };
}

/** "Bar · Cucina" style summary of what has been entered, for the editor header. */
export function catalogCounts(entries: readonly CatalogEntry[]): Record<CatalogKind, { total: number; published: number }> {
  const out = Object.fromEntries(CATALOG_KINDS.map((k) => [k, { total: 0, published: 0 }])) as Record<CatalogKind, { total: number; published: number }>;
  for (const e of entries) {
    if (e.status === "ARCHIVIATA") continue;
    out[e.kind].total++;
    if (e.status === "PUBBLICATA") out[e.kind].published++;
  }
  return out;
}

/** What each platform needs first, in the order the responsible should enter it. */
export const FIRST_STEPS: Readonly<Record<CatalogPlatform, readonly string[]>> = {
  CLUB_HOUSE: [
    "Orari di apertura di Colico e di Dervio (una riga per fascia: giorni, apertura, chiusura).",
    "Listino del bar: una voce per prodotto con il prezzo vero; senza prezzo resta «da confermare».",
    "Menu per gruppi (squadre ospiti, tornei, feste): cosa comprende e, se deciso, il prezzo a persona.",
    "Serate ed eventi: in Attività in struttura, area Club House, tipo «Attività serale».",
  ],
  CONVENZIONI: [
    "Una convenzione per ogni partner che ha già detto sì: nome, offerta, come usarla, validità.",
    "Le card che danno accesso (Tesserato, Sostenitore, Partner) oppure nessuna se vale per tutti.",
    "Il link del partner (https) se serve un contatto: niente telefoni o e-mail nel testo.",
  ],
  TESSERE: [
    "La regola che manca: la data di scadenza delle card (oggi «da confermare»).",
    "I vantaggi di ogni card oltre a quelli già decisi dalla Direzione.",
    "Altri tipi di tessera del club (per esempio la tessera socio), con chi la riceve e come si ottiene.",
  ],
};
