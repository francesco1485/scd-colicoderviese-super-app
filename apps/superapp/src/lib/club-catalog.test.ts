import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  CATALOG_WRITERS,
  CATEGORY_LABEL,
  LISTINO_CATEGORIES,
  LISTINO_TAB_LABELS,
  PUBLIC_CATALOG_TIMEOUT_MS,
  catalogWithin,
  PLATFORM_KINDS,
  cardAdditions,
  catalogCounts,
  catalogWritablePlatforms,
  clubHousePublic,
  convenzioniFor,
  draftFromEntry,
  emptyCatalogDraft,
  parseCatalogEntries,
  parseEuroInput,
  priceText,
  validateCatalogDraft,
  validityText,
  type CatalogEntry,
} from "./club-catalog";

const SQL = readFileSync(fileURLToPath(new URL("../../../../supabase/migrations/20261017_r115_club_catalog.sql", import.meta.url)), "utf8");

const row = (over: Partial<CatalogEntry> & Pick<CatalogEntry, "kind" | "platform">): CatalogEntry => ({
  id: Math.random().toString(36).slice(2),
  site: null,
  category: null,
  title: "Voce",
  body: null,
  howTo: null,
  cards: [],
  linkUrl: null,
  priceCents: null,
  days: null,
  opens: null,
  closes: null,
  validFrom: null,
  validUntil: null,
  status: "PUBBLICATA",
  sort: 100,
  updatedAt: null,
  ...over,
});

describe("writers (mirror of scd_club_catalog_writer)", () => {
  it("the SQL gate names the same roles and positions", () => {
    const writer = SQL.slice(SQL.indexOf("function public.scd_club_catalog_writer"), SQL.indexOf("revoke all on function public.scd_club_catalog_writer"));
    expect(writer).toContain("array['DIRECTION']");
    expect(writer).toContain("array['presidente','direttore-generale']");
    expect(writer).toContain("p_platform = 'CLUB_HOUSE' and public.scd_has_position(p_organization_id, array['responsabile-club-house'])");
    expect(writer).toContain("p_platform = 'TESSERE' and (public.scd_has_org_role(p_organization_id, array['SECRETARIAT']");
    expect(writer).toContain("array['segreteria']");
    expect(writer).not.toMatch(/CONVENZIONI/);
    expect(CATALOG_WRITERS.CONVENZIONI).toEqual({ roles: ["DIRECTION"], positions: ["presidente", "direttore-generale"] });
  });

  it("session rule per person", () => {
    expect(catalogWritablePlatforms(["DIRECTION"], new Set())).toEqual(["CLUB_HOUSE", "CONVENZIONI", "TESSERE"]);
    expect(catalogWritablePlatforms(["STAFF"], new Set(["responsabile-club-house"]))).toEqual(["CLUB_HOUSE"]);
    expect(catalogWritablePlatforms(["SECRETARIAT"], new Set())).toEqual(["TESSERE"]);
    expect(catalogWritablePlatforms(["FAMILY"], new Set(["genitore"]))).toEqual([]);
  });

  it("kinds per platform match the SQL constraint", () => {
    for (const [p, kinds] of Object.entries(PLATFORM_KINDS))
      for (const k of kinds) expect(SQL).toMatch(new RegExp(`platform = '${p}' and kind (=|in \\()[^)]*'${k}'`));
  });

  it("the migration records its applied state, is additive and never touches the forbidden project", () => {
    expect(SQL).toContain("APPLIED on SCD PULSE 17/10/2026");
    expect(SQL).toContain("«applica r115 r116»");
    expect(SQL).not.toMatch(/\bdrop table\b(?![^\n]*if exists)/i);
    expect(SQL).not.toContain("dfnwzwutvnwiitiffwvr");
    expect(SQL).toContain("revoke all on table public.scd_club_catalog from anon, authenticated");
  });
});

describe("validateCatalogDraft (mirror of scd_club_catalog_clean)", () => {
  it("opening hours need site, days and two different times", () => {
    const d = { ...emptyCatalogDraft("ORARIO"), title: "Apertura serale", days: "Lunedì–venerdì", opens: "17:00", closes: "21:00" };
    const ok = validateCatalogDraft("CLUB_HOUSE", d);
    expect(ok).toMatchObject({ ok: true, value: { site: "COLICO", priceCents: null, category: null } });
    expect(validateCatalogDraft("CLUB_HOUSE", { ...d, site: null })).toEqual({ ok: false, code: "site" });
    expect(validateCatalogDraft("CLUB_HOUSE", { ...d, closes: "17:00" })).toEqual({ ok: false, code: "time" });
    expect(validateCatalogDraft("CLUB_HOUSE", { ...d, days: "" })).toEqual({ ok: false, code: "days" });
  });

  it("a price list item without price stays to be confirmed, never 0", () => {
    const d = { ...emptyCatalogDraft("LISTINO"), title: "Caffè" };
    expect(validateCatalogDraft("CLUB_HOUSE", d)).toMatchObject({ ok: true, value: { priceCents: null, category: "BAR" } });
    expect(validateCatalogDraft("CLUB_HOUSE", { ...d, price: "1,20" })).toMatchObject({ ok: true, value: { priceCents: 120 } });
    expect(validateCatalogDraft("CLUB_HOUSE", { ...d, price: "uno" })).toEqual({ ok: false, code: "price" });
    expect(validateCatalogDraft("CLUB_HOUSE", { ...d, category: "VINI" })).toEqual({ ok: false, code: "category" });
  });

  it("refuses kinds of other platforms, contacts and bad links", () => {
    expect(validateCatalogDraft("CLUB_HOUSE", { ...emptyCatalogDraft("CONVENZIONE"), title: "Negozio", body: "x" })).toEqual({ ok: false, code: "kind" });
    const c = { ...emptyCatalogDraft("CONVENZIONE"), title: "Negozio di prova", body: "Sconto 10%" };
    expect(validateCatalogDraft("CONVENZIONI", c)).toMatchObject({ ok: true });
    expect(validateCatalogDraft("CONVENZIONI", { ...c, body: "chiama 333 1234567" })).toEqual({ ok: false, code: "contact" });
    expect(validateCatalogDraft("CONVENZIONI", { ...c, howTo: "scrivi a a@b.it" })).toEqual({ ok: false, code: "contact" });
    expect(validateCatalogDraft("CONVENZIONI", { ...c, linkUrl: "http://x.it" })).toEqual({ ok: false, code: "link" });
    expect(validateCatalogDraft("CONVENZIONI", { ...c, validFrom: "2026-05-01", validUntil: "2026-04-01" })).toEqual({ ok: false, code: "date" });
    expect(validateCatalogDraft("CONVENZIONI", { ...c, validFrom: "2026-02-31" })).toEqual({ ok: false, code: "date" });
    expect(validateCatalogDraft("CONVENZIONI", { ...c, body: "" })).toEqual({ ok: false, code: "body" });
  });

  it("a delimited date is not a phone number; phone numbers with dashes stay refused", () => {
    const c = { ...emptyCatalogDraft("CONVENZIONE"), title: "Negozio di prova", body: "Sconto 10%" };
    expect(validateCatalogDraft("CONVENZIONI", { ...c, body: "Valida fino al 2026-10-31" })).toMatchObject({ ok: true });
    expect(validateCatalogDraft("CONVENZIONI", { ...c, body: "Dal 2026-10-01 al 2026-10-31" })).toMatchObject({ ok: true });
    expect(validateCatalogDraft("CONVENZIONI", { ...c, body: "Chiama 0341-94-01-23" })).toEqual({ ok: false, code: "contact" });
    expect(validateCatalogDraft("CONVENZIONI", { ...c, body: "Chiama 3331-23-45-67" })).toEqual({ ok: false, code: "contact" });
    expect(validateCatalogDraft("CONVENZIONI", { ...c, body: "Chiama 12026-10-311" })).toEqual({ ok: false, code: "contact" });
  });

  it("a slow or failed public read falls back to 'da confermare' (not ready) within the timeout", async () => {
    expect(PUBLIC_CATALOG_TIMEOUT_MS).toBe(2000);
    const fallback = { ready: false, entries: [] };
    const never = new Promise<typeof fallback>(() => {});
    expect(await catalogWithin(never, fallback, 10)).toBe(fallback);
    expect(await catalogWithin(Promise.reject(new Error("x")), fallback, 10)).toBe(fallback);
    const ok = { ready: true, entries: [] };
    expect(await catalogWithin(Promise.resolve(ok), fallback, 10)).toBe(ok);
  });

  it("the till categories include photo services", () => {
    expect(LISTINO_CATEGORIES).toEqual(["BAR", "CUCINA", "MERCHANDISING", "SERVIZI_FOTO"]);
    expect(CATEGORY_LABEL["SERVIZI_FOTO"]).toBe("Servizi foto");
    expect(LISTINO_TAB_LABELS).toEqual(["Bar", "Cucina", "Merchandising", "Servizi foto"]);
    const d = { ...emptyCatalogDraft("LISTINO"), title: "Foto squadra", category: "SERVIZI_FOTO" };
    expect(validateCatalogDraft("CLUB_HOUSE", d)).toMatchObject({ ok: true, value: { category: "SERVIZI_FOTO" } });
  });

  it("a card benefit needs at least one card; cards are deduplicated and sorted", () => {
    const b = { ...emptyCatalogDraft("CARD_VANTAGGIO"), title: "Sconto al bar" };
    expect(validateCatalogDraft("TESSERE", b)).toEqual({ ok: false, code: "cards" });
    expect(validateCatalogDraft("TESSERE", { ...b, cards: ["tesserato", "partner", "tesserato"] })).toMatchObject({ ok: true, value: { cards: ["partner", "tesserato"] } });
  });
});

describe("prices and validity", () => {
  it("parses euro input and prints prices", () => {
    expect(parseEuroInput("")).toBeNull();
    expect(parseEuroInput("2")).toBe(200);
    expect(parseEuroInput("2,5")).toBe(250);
    expect(parseEuroInput("2.50 €")).toBe(250);
    expect(parseEuroInput("-1")).toBe("invalid");
    expect(parseEuroInput("2,555")).toBe("invalid");
    expect(priceText(null)).toBe("prezzo da confermare");
    expect(priceText(250)).toBe("2,50 €");
    expect(priceText(0)).toBe("0,00 €");
  });

  it("validity text never invents an end date", () => {
    expect(validityText({ validFrom: null, validUntil: null })).toBe("validità da confermare");
    expect(validityText({ validFrom: "2026-11-01", validUntil: null })).toBe("dal 01/11/2026, scadenza da confermare");
    expect(validityText({ validFrom: null, validUntil: "2026-12-31" })).toBe("fino al 31/12/2026");
  });

  it("round-trips an entry into the form", () => {
    const e = row({ platform: "CLUB_HOUSE", kind: "LISTINO", category: "BAR", title: "Caffè", priceCents: 120 });
    expect(draftFromEntry(e).price).toBe("1,20");
    expect(validateCatalogDraft("CLUB_HOUSE", draftFromEntry(e))).toMatchObject({ ok: true, value: { priceCents: 120 } });
  });
});

describe("parseCatalogEntries", () => {
  it("non-array is unknown (null), malformed rows are dropped", () => {
    expect(parseCatalogEntries(null)).toBeNull();
    expect(parseCatalogEntries({})).toBeNull();
    const out = parseCatalogEntries([
      { id: "a", platform: "CLUB_HOUSE", kind: "LISTINO", title: "Caffè", category: "BAR", priceCents: 120, status: "BOZZA", cards: [] },
      { id: "b", platform: "CLUB_HOUSE", kind: "CONVENZIONE", title: "Wrong platform" },
      { id: "c", platform: "TESSERE", kind: "CARD_VANTAGGIO", title: "X", cards: ["partner", "oro"], linkUrl: "javascript:alert(1)" },
      { platform: "TESSERE", kind: "CARD_REGOLA", title: "No id" },
    ]);
    expect(out?.map((e) => e.id)).toEqual(["a", "c"]);
    expect(out?.[1]?.cards).toEqual(["partner"]);
    expect(out?.[1]?.linkUrl).toBeNull();
    expect(parseCatalogEntries([{ id: "a", platform: "CLUB_HOUSE", kind: "LISTINO", title: "Caffè", status: "BOZZA" }], { publicRead: true })?.[0]?.status).toBe("PUBBLICATA");
  });
});

describe("public views", () => {
  const entries: CatalogEntry[] = [
    row({ platform: "CLUB_HOUSE", kind: "ORARIO", site: "DERVIO", title: "Sabato", days: "Sabato", opens: "15:00", closes: "19:00" }),
    row({ platform: "CLUB_HOUSE", kind: "LISTINO", category: "CUCINA", title: "Panino", priceCents: null }),
    row({ platform: "CLUB_HOUSE", kind: "LISTINO", category: "BAR", title: "Caffè", priceCents: 120, sort: 1 }),
    row({ platform: "CONVENZIONI", kind: "CONVENZIONE", title: "Negozio", cards: ["sostenitore"] }),
    row({ platform: "CONVENZIONI", kind: "CONVENZIONE", title: "Per tutti", cards: [] }),
    row({ platform: "TESSERE", kind: "CARD_VANTAGGIO", title: "Sconto", cards: ["partner"] }),
    row({ platform: "TESSERE", kind: "CARD_TIPO", title: "Tessera socio", body: "Soci" }),
  ];

  it("Club House: hours per site, listino in till order, empty site stays empty", () => {
    const v = clubHousePublic(entries);
    expect(v.hours.COLICO).toEqual([]);
    expect(v.hours.DERVIO.map((h) => h.title)).toEqual(["Sabato"]);
    expect(v.listino.map((g) => g.category)).toEqual(["BAR", "CUCINA"]);
    expect(v.menus).toEqual([]);
  });

  it("convenzioni and card additions per card", () => {
    expect(convenzioniFor(entries).map((c) => c.title)).toEqual(["Negozio", "Per tutti"]);
    expect(convenzioniFor(entries, "partner").map((c) => c.title)).toEqual(["Per tutti"]);
    expect(cardAdditions(entries, "partner").benefits.map((b) => b.title)).toEqual(["Sconto"]);
    expect(cardAdditions(entries, "tesserato").benefits).toEqual([]);
    expect(cardAdditions(entries).types.map((t) => t.title)).toEqual(["Tessera socio"]);
    expect(cardAdditions(entries, "partner").types).toEqual([]);
  });

  it("counts skip archived rows", () => {
    const c = catalogCounts([...entries, row({ platform: "CLUB_HOUSE", kind: "LISTINO", category: "BAR", title: "Vecchio", status: "ARCHIVIATA" }), row({ platform: "CLUB_HOUSE", kind: "LISTINO", category: "BAR", title: "Bozza", status: "BOZZA" })]);
    expect(c.LISTINO).toEqual({ total: 3, published: 2 });
  });
});
