/**
 * «Prima pagina» of the public home (UD-187, Francesco DG 17/10/2026 16:36–16:40): the story of the day written every
 * morning by the Super Giornalista agent goes online by itself, VERIFIED items only (the database refuses the others,
 * r145). Types and the whitelist parser only; the read lives in front-page.functions.ts.
 *
 * The parser is the last gate before the page: unknown slots, empty titles, external or odd links are dropped, texts
 * are cut to the database limits, at most one apertura and one domanda are kept.
 */

export type FrontSlot = "apertura" | "breve" | "domanda" | "persone" | "sponsor" | "app";

export interface FrontItem {
  id: string;
  slot: FrontSlot;
  kicker: string;
  title: string;
  body: string;
  cta: string;
  /** Internal path only ("/calendario"), or "" for no link. */
  href: string;
  /** Answers of the question of the day (domanda), max 4. */
  options: string[];
}

export interface FrontPage {
  apertura: FrontItem | null;
  brevi: FrontItem[];
  domanda: FrontItem | null;
  altre: FrontItem[];
}

const SLOTS: readonly FrontSlot[] = ["apertura", "breve", "domanda", "persone", "sponsor", "app"];

export const EMPTY_FRONT_PAGE: FrontPage = { apertura: null, brevi: [], domanda: null, altre: [] };

const str = (v: unknown, max: number): string =>
  typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";

/** Internal app path only: "/..." without "//", "..", spaces or a scheme. */
export function safeHref(v: unknown): string {
  const s = str(v, 200);
  if (!s) return "";
  if (!/^\/[A-Za-z0-9/_#?=&.-]*$/.test(s) || s.includes("//") || s.includes("..")) return "";
  return s;
}

export function parseFrontItem(raw: unknown): FrontItem | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const slot = r["slot"];
  if (typeof slot !== "string" || !SLOTS.includes(slot as FrontSlot)) return null;
  const id = str(r["id"], 64);
  const title = str(r["title"], 80);
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(id) || !title) return null;
  const options = Array.isArray(r["options"])
    ? (r["options"] as unknown[]).map((o) => str(o, 60)).filter(Boolean).slice(0, 4)
    : [];
  return {
    id,
    slot: slot as FrontSlot,
    kicker: str(r["kicker"], 40),
    title,
    body: str(r["body"], 280),
    cta: str(r["cta"], 30),
    href: safeHref(r["href"]),
    options,
  };
}

/** Groups the database answer for the page; anything not understood is dropped (fail closed). */
export function parseFrontPage(raw: unknown): FrontPage {
  if (!Array.isArray(raw)) return EMPTY_FRONT_PAGE;
  const items = raw.map(parseFrontItem).filter((x): x is FrontItem => x !== null);
  return {
    apertura: items.find((i) => i.slot === "apertura") ?? null,
    brevi: items.filter((i) => i.slot === "breve").slice(0, 4),
    domanda: items.find((i) => i.slot === "domanda") ?? null,
    altre: items.filter((i) => i.slot === "persone" || i.slot === "sponsor" || i.slot === "app").slice(0, 3),
  };
}

export function frontPageEmpty(p: FrontPage): boolean {
  return !p.apertura && p.brevi.length === 0 && !p.domanda && p.altre.length === 0;
}
