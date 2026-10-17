import { describe, expect, it } from "vitest";

import { readFrontPage } from "./front-page.functions";
import { EMPTY_FRONT_PAGE, frontPageEmpty, parseFrontItem, parseFrontPage, safeHref } from "./front-page";

const item = (o: Record<string, unknown>) => ({ id: "x-1", slot: "breve", title: "Titolo", ...o });

describe("front page parser (UD-187, r145)", () => {
  it("keeps internal app paths only", () => {
    expect(safeHref("/calendario")).toBe("/calendario");
    expect(safeHref("/eventi/christmas-lario-cup")).toBe("/eventi/christmas-lario-cup");
    expect(safeHref("/sponsor#proposta")).toBe("/sponsor#proposta");
    for (const bad of ["https://evil.example", "//evil.example", "/../admin", "javascript:alert(1)", "/a b", "calendario", 42])
      expect(safeHref(bad)).toBe("");
  });

  it("drops items with unknown slot, bad id or empty title", () => {
    expect(parseFrontItem(item({ slot: "banner" }))).toBeNull();
    expect(parseFrontItem(item({ id: "Bad Id" }))).toBeNull();
    expect(parseFrontItem(item({ title: "   " }))).toBeNull();
    expect(parseFrontItem(null)).toBeNull();
  });

  it("cuts texts to the database limits and options to four", () => {
    const p = parseFrontItem(item({ slot: "domanda", title: "t".repeat(200), body: "b".repeat(500), options: ["a", "b", "c", "d", "e", 7] }));
    expect(p?.title).toHaveLength(80);
    expect(p?.body).toHaveLength(280);
    expect(p?.options).toEqual(["a", "b", "c", "d"]);
  });

  it("groups one apertura, up to four brevi, one domanda and three others", () => {
    const page = parseFrontPage([
      item({ id: "a1", slot: "apertura" }),
      item({ id: "a2", slot: "apertura" }),
      ...[1, 2, 3, 4, 5].map((n) => item({ id: `b${n}` })),
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

  it("is empty (and the block hidden) for anything that is not an array", () => {
    expect(parseFrontPage({ items: [] })).toEqual(EMPTY_FRONT_PAGE);
    expect(frontPageEmpty(parseFrontPage(undefined))).toBe(true);
  });

  it("reads through the public RPC and fails closed", async () => {
    const calls: unknown[] = [];
    const ok = { rpc: (fn: string, args: Record<string, unknown>) => (calls.push([fn, args]), Promise.resolve({ data: [item({ slot: "apertura" })], error: null })) };
    const page = await readFrontPage("2026-10-17", ok);
    expect(page.apertura?.title).toBe("Titolo");
    expect(calls).toEqual([["scd_public_front_page", { p_org_slug: "scd-colicoderviese", p_day: "2026-10-17" }]]);
    const err = { rpc: () => Promise.resolve({ data: null, error: { message: "function does not exist" } }) };
    expect(await readFrontPage("2026-10-17", err)).toEqual(EMPTY_FRONT_PAGE);
    const thrown = { rpc: () => Promise.reject(new Error("network")) };
    expect(await readFrontPage("2026-10-17", thrown)).toEqual(EMPTY_FRONT_PAGE);
    expect(await readFrontPage("17/10/2026", ok)).toEqual(EMPTY_FRONT_PAGE);
    expect(await readFrontPage("2026-10-17", null)).toEqual(EMPTY_FRONT_PAGE);
  });
});
