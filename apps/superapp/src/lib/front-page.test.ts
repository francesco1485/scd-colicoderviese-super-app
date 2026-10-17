import { beforeEach, describe, expect, it } from "vitest";

import { FRONT_PAGE_URL, cachedFrontPage, readFrontPage, resetFrontPageCache } from "./front-page.functions";
import {
  EMPTY_FRONT_PAGE,
  frontPageEmpty,
  looksPersonal,
  parseFrontFile,
  parseFrontItem,
  parseFrontItems,
  safeHref,
} from "./front-page";

const item = (o: Record<string, unknown> = {}) => ({ id: "x-1", slot: "breve", title: "Titolo", verified: true, ...o });
const DAY = "2026-10-17";
const file = (o: Record<string, unknown> = {}) => ({ day: DAY, items: [item({ slot: "apertura" })], ...o });

const respond = (body: unknown, init: ResponseInit = {}) => async () =>
  new Response(typeof body === "string" ? body : JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" }, ...init });

describe("front page parser (UD-187)", () => {
  it("keeps internal app paths only", () => {
    for (const ok of ["/calendario", "/eventi/christmas-lario-cup", "/sponsor#proposta"]) expect(safeHref(ok)).toBe(ok);
    for (const bad of ["https://evil.example", "//evil.example", "/../admin", "javascript:alert(1)", "/a b", "/%2F%2Fevil", "calendario", 42])
      expect(safeHref(bad)).toBe("");
  });

  it("accepts only items marked verified: true", () => {
    expect(parseFrontItem(item())).not.toBeNull();
    expect(parseFrontItem(item({ verified: false }))).toBeNull();
    expect(parseFrontItem(item({ verified: "true" }))).toBeNull();
    expect(parseFrontItem({ id: "x", slot: "breve", title: "t" })).toBeNull();
  });

  it("drops items with unknown slot, bad id or empty title", () => {
    expect(parseFrontItem(item({ slot: "banner" }))).toBeNull();
    expect(parseFrontItem(item({ id: "Bad Id" }))).toBeNull();
    expect(parseFrontItem(item({ title: "   " }))).toBeNull();
    expect(parseFrontItem(null)).toBeNull();
  });

  it("cuts texts to the limits and options to four strings", () => {
    const p = parseFrontItem(item({ slot: "domanda", title: "t".repeat(200), body: "b".repeat(500), options: ["a", "b", 7, "c", "d", "e"] }));
    expect(p?.title).toHaveLength(80);
    expect(p?.body).toHaveLength(280);
    expect(p?.options).toEqual(["a", "b", "c", "d"]);
  });

  it("drops anything that looks like personal data, keeps match facts", () => {
    for (const bad of ["Chiama il 333 1234567", "+39 0341 940000", "scrivi a mario.rossi@example.org", "nato il 12/03/2012", "il 2012-03-12", "RSSMRA80A01F205X", "IT60X0542811101000000123456"])
      expect(looksPersonal(bad)).toBe(true);
    for (const ok of ["Alle 15:30 la Prima Squadra", "U16 Élite alle 18.00", "vinta 2-1", "stagione 2026/27", "6ª giornata", "Matricola FIGC 26020", "mancano 52 giorni"])
      expect(looksPersonal(ok)).toBe(false);
    expect(parseFrontItem(item({ body: "Info al 333 1234567" }))).toBeNull();
    expect(parseFrontItem(item({ slot: "domanda", options: ["scrivi a a@b.it"] }))).toBeNull();
  });

  it("groups one apertura, up to four brevi, one domanda, three others; duplicate ids once", () => {
    const page = parseFrontItems([
      item({ id: "a1", slot: "apertura" }),
      item({ id: "a2", slot: "apertura" }),
      ...[1, 2, 3, 4, 5].map((n) => item({ id: `b${n}` })),
      item({ id: "b1" }),
      item({ id: "d1", slot: "domanda" }),
      item({ id: "s1", slot: "sponsor" }),
      item({ id: "p1", slot: "persone" }),
      item({ id: "app1", slot: "app" }),
      item({ id: "app2", slot: "app" }),
    ]);
    expect(page.apertura?.id).toBe("a1");
    expect(page.brevi.map((b) => b.id)).toEqual(["b1", "b2", "b3", "b4"]);
    expect(page.domanda?.id).toBe("d1");
    expect(page.altre).toHaveLength(3);
  });

  it("shows a file only for today and when not switched off", () => {
    expect(parseFrontFile(file(), DAY).apertura?.id).toBe("x-1");
    expect(parseFrontFile(file({ day: "2026-10-16" }), DAY)).toEqual(EMPTY_FRONT_PAGE);
    expect(parseFrontFile(file({ day: "2026-10-18" }), DAY)).toEqual(EMPTY_FRONT_PAGE);
    expect(parseFrontFile(file({ off: true }), DAY)).toEqual(EMPTY_FRONT_PAGE);
    expect(parseFrontFile([item()], DAY)).toEqual(EMPTY_FRONT_PAGE);
    expect(frontPageEmpty(parseFrontFile(undefined, DAY))).toBe(true);
  });
});

describe("front page server read (UD-187)", () => {
  beforeEach(() => resetFrontPageCache());

  it("reads the data-branch file without following redirects", async () => {
    const calls: [string, RequestInit | undefined][] = [];
    const page = await readFrontPage(DAY, async (url, init) => (calls.push([url, init]), respond(file())()));
    expect(page.apertura?.title).toBe("Titolo");
    expect(calls[0]?.[0]).toBe(FRONT_PAGE_URL);
    expect(calls[0]?.[1]?.redirect).toBe("error");
  });

  it("fails closed: HTTP error, bad JSON, oversize, network error, bad day", async () => {
    expect(await readFrontPage(DAY, respond(file(), { status: 404 }))).toEqual(EMPTY_FRONT_PAGE);
    expect(await readFrontPage(DAY, respond("{not json"))).toEqual(EMPTY_FRONT_PAGE);
    expect(await readFrontPage(DAY, respond(JSON.stringify(file({ pad: "x".repeat(40_000) }))))).toEqual(EMPTY_FRONT_PAGE);
    expect(await readFrontPage(DAY, async () => { throw new Error("network"); })).toEqual(EMPTY_FRONT_PAGE);
    expect(await readFrontPage("17/10/2026", respond(file()))).toEqual(EMPTY_FRONT_PAGE);
  });

  it("caches a good answer for 5 minutes and re-reads on a new day", async () => {
    let n = 0;
    const f = async () => (n++, respond(file())());
    await cachedFrontPage(DAY, 0, f);
    await cachedFrontPage(DAY, 4 * 60_000, f);
    expect(n).toBe(1);
    await cachedFrontPage(DAY, 6 * 60_000, f);
    expect(n).toBe(2);
    await cachedFrontPage("2026-10-18", 6 * 60_000 + 1, f);
    expect(n).toBe(3);
  });
});

describe("front page links for the router", () => {
  it("splits path, query and hash", async () => {
    const { splitHref } = await import("./front-page");
    expect(splitHref("/sponsor#proposta")).toEqual({ to: "/sponsor", search: {}, hash: "proposta" });
    expect(splitHref("/calendario?annata=u15&vista=settimana")).toEqual({ to: "/calendario", search: { annata: "u15", vista: "settimana" }, hash: "" });
    expect(splitHref("/eventi/christmas-lario-cup")).toEqual({ to: "/eventi/christmas-lario-cup", search: {}, hash: "" });
    expect(splitHref("")).toBeNull();
    expect(parseFrontItem(item({ href: "/sponsor#proposta" }))?.link).toEqual({ to: "/sponsor", search: {}, hash: "proposta" });
  });

  it("removes duplicate answers", () => {
    expect(parseFrontItem(item({ slot: "domanda", options: ["Sì", "Sì", "No"] }))?.options).toEqual(["Sì", "No"]);
  });
});
