/**
 * «Prima pagina» of the public home (UD-187, Francesco DG 17/10/2026 16:36–16:40): the story of the day written every
 * morning by the Super Giornalista agent goes online by itself, VERIFIED items only.
 *
 * Channel (scd-sicurezza review 17/10/2026): the agent never touches the database. It commits ONE file,
 * front-page.json, to the data branch data/front-page (same pattern as data/calendar-public); the server reads it
 * (front-page.functions.ts) and this parser is the gate before the page. Fail closed everywhere:
 * - the file must be for the server's Rome day (no early or stale front page) and must not be switched off ("off");
 * - only items with verified === true; unknown slots, bad ids, empty titles, external or odd links are dropped;
 * - texts are cut to fixed limits; at most one apertura, four brevi, one domanda, three others;
 * - any item whose text looks like personal data (phone number, e-mail, a full date that could be a birth date,
 *   fiscal code, IBAN) is dropped whole: the agent's rules forbid them, this is the safety net.
 */

export type FrontSlot = "apertura" | "breve" | "domanda" | "persone" | "sponsor" | "app";

export interface FrontItem {
  id: string;
  slot: FrontSlot;
  kicker: string;
  title: string;
  body: string;
  cta: string;
  /** Internal path only ("/calendario", "/sponsor#proposta"), or "" for no link. */
  href: string;
  /** href split for the router (TanStack reads query and hash only from search/hash, never from `to`). */
  link: FrontLink | null;
  /** Answers of the question of the day (domanda), max 4. */
  options: string[];
}

export interface FrontLink {
  to: string;
  search: Record<string, string>;
  hash: string;
}

export interface FrontPage {
  apertura: FrontItem | null;
  brevi: FrontItem[];
  domanda: FrontItem | null;
  altre: FrontItem[];
}

const SLOTS: readonly FrontSlot[] = ["apertura", "breve", "domanda", "persone", "sponsor", "app"];

/** Largest file the server accepts (bytes). */
export const FRONT_PAGE_MAX_BYTES = 32_768;
const MAX_ITEMS = 20;

export const EMPTY_FRONT_PAGE: FrontPage = { apertura: null, brevi: [], domanda: null, altre: [] };

const str = (v: unknown, max: number): string =>
  typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";

/** Internal app path only: "/..." without "//", "..", spaces, "%", "\" or a scheme. */
export function safeHref(v: unknown): string {
  const s = str(v, 200);
  if (!s) return "";
  if (!/^\/[A-Za-z0-9/_#?=&.-]*$/.test(s) || s.includes("//") || s.includes("..")) return "";
  return s;
}

/**
 * True when a text looks like personal data that must never be public: phone numbers (7+ digits, spaces or dots
 * allowed), e-mail addresses, full numeric dates (dd/mm/yyyy, yyyy-mm-dd), Italian fiscal codes, IBAN.
 * Times ("15:30"), scores ("2-1"), years ("2026/27") and match days ("6ª giornata") pass.
 */
export function looksPersonal(text: string): boolean {
  const t = text.toUpperCase();
  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/.test(t)) return true;
  if (/(?:\+|\b)\d[\d .]{6,}\d\b/.test(t.replace(/\b\d{1,2}[:.]\d{2}\b/g, ""))) return true;
  if (/\b\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}\b/.test(t) || /\b\d{4}-\d{2}-\d{2}\b/.test(t)) return true;
  if (/\b[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]\b/.test(t)) return true;
  if (/\bIT\d{2}[A-Z]\d{10}[A-Z0-9]{12}\b/.test(t.replace(/\s+/g, ""))) return true;
  return false;
}

/** Splits a safe internal href into path, query (simple key=value pairs) and hash; null when there is none. */
export function splitHref(href: string): FrontLink | null {
  if (!href) return null;
  const [beforeHash, hash = ""] = href.split("#", 2) as [string, string?];
  const [to, query = ""] = beforeHash.split("?", 2) as [string, string?];
  const search: Record<string, string> = {};
  for (const pair of query.split("&")) {
    if (!pair) continue;
    const [k, v = ""] = pair.split("=", 2) as [string, string?];
    if (/^[A-Za-z0-9_-]{1,30}$/.test(k) && /^[A-Za-z0-9_.-]{0,60}$/.test(v)) search[k] = v;
  }
  return { to: to || "/", search, hash: /^[A-Za-z0-9_-]{0,60}$/.test(hash) ? hash : "" };
}

export function parseFrontItem(raw: unknown): FrontItem | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (r["verified"] !== true) return null;
  const slot = r["slot"];
  if (typeof slot !== "string" || !SLOTS.includes(slot as FrontSlot)) return null;
  const id = str(r["id"], 64);
  const title = str(r["title"], 80);
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(id) || !title) return null;
  const options = Array.isArray(r["options"])
    ? [...new Set((r["options"] as unknown[]).map((o) => str(o, 60)).filter(Boolean))].slice(0, 4)
    : [];
  const href = safeHref(r["href"]);
  const item: FrontItem = {
    id,
    slot: slot as FrontSlot,
    kicker: str(r["kicker"], 40),
    title,
    body: str(r["body"], 280),
    cta: str(r["cta"], 30),
    href,
    link: splitHref(href),
    options,
  };
  if (looksPersonal([item.kicker, item.title, item.body, item.cta, ...item.options].join(" \n "))) return null;
  return item;
}

/** Groups a list of raw items for the page; anything not understood is dropped (fail closed). */
export function parseFrontItems(raw: unknown): FrontPage {
  if (!Array.isArray(raw)) return EMPTY_FRONT_PAGE;
  const seen = new Set<string>();
  const items = raw
    .slice(0, MAX_ITEMS)
    .map(parseFrontItem)
    .filter((x): x is FrontItem => x !== null && !seen.has(x.id) && (seen.add(x.id), true));
  return {
    apertura: items.find((i) => i.slot === "apertura") ?? null,
    brevi: items.filter((i) => i.slot === "breve").slice(0, 4),
    domanda: items.find((i) => i.slot === "domanda") ?? null,
    altre: items.filter((i) => i.slot === "persone" || i.slot === "sponsor" || i.slot === "app").slice(0, 3),
  };
}

/**
 * The whole file: `{ "day": "YYYY-MM-DD", "off": false, "items": [...] }`. Shown only when `day` is the server's
 * Rome day and `off` is not true (the Direzione's switch: «spegni la prima pagina» in chat rewrites the file).
 */
export function parseFrontFile(raw: unknown, today: string): FrontPage {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return EMPTY_FRONT_PAGE;
  const r = raw as Record<string, unknown>;
  if (r["day"] !== today || r["off"] === true) return EMPTY_FRONT_PAGE;
  return parseFrontItems(r["items"]);
}

export function frontPageEmpty(p: FrontPage): boolean {
  return !p.apertura && p.brevi.length === 0 && !p.domanda && p.altre.length === 0;
}
