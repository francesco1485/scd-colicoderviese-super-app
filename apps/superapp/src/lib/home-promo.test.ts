import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { eventSlide, nextIndex, promoSlides, quickChips } from "./home-promo";
import type { ClubEvent } from "./stories";

const ev = (over: Partial<ClubEvent> = {}): ClubEvent => ({
  id: "clc",
  title: "Christmas Lario Cup",
  when: "8 dicembre",
  date: "2026-12-08",
  text: "Torneo a Colico e Dervio.",
  href: "/eventi/christmas-lario-cup",
  image: "/media/eventi/christmas-lario-cup-2026-maschile.webp",
  ...over,
});

describe("promo carousel", () => {
  it("welcome first, then upcoming events, sign-up and cards; past events are left out", () => {
    const ids = promoSlides("2026-10-15", [ev(), ev({ id: "old", date: "2026-09-01" })]).map((s) => s.id);
    expect(ids).toEqual(["benvenuto", "evento-clc", "iscrizioni", "carte"]);
    expect(promoSlides("2026-10-15", []).map((s) => s.id)).toEqual(["benvenuto", "iscrizioni", "carte"]);
  });
  it("every slide has one main button to a real page and no money or betting words", () => {
    for (const s of promoSlides("2026-10-15", [ev()])) {
      expect(s.cta.to.startsWith("/")).toBe(true);
      expect(`${s.title} ${s.text} ${s.tag}`).not.toMatch(/€|euro|bonus|quota|scommess|vinci/i);
    }
  });
  it("an event slide shows the published poster whole and links to the event page", () => {
    const s = eventSlide(ev());
    expect(s.art).toEqual({ kind: "poster", src: ev().image, alt: "Locandina Christmas Lario Cup" });
    expect(s.cta.to).toBe("/eventi/christmas-lario-cup");
  });
  it("nextIndex wraps both ways", () => {
    expect(nextIndex(3, 4)).toBe(0);
    expect(nextIndex(0, 4, -1)).toBe(3);
    expect(nextIndex(5, 0)).toBe(0);
  });
});

describe("quick chips", () => {
  it("games badge: live beats the count, zero hides it", () => {
    expect(quickChips(4, true)[0]?.badge).toEqual({ kind: "live" });
    expect(quickChips(4, false)[0]?.badge).toEqual({ kind: "count", value: 4 });
    expect(quickChips(0, false)[0]?.badge).toBeUndefined();
  });
  it("all chips lead to app pages, the cards are marked new", () => {
    const chips = quickChips(1, false);
    expect(chips.every((c) => c.to.startsWith("/"))).toBe(true);
    expect(chips.find((c) => c.id === "carte")?.badge).toEqual({ kind: "new" });
  });
});

describe("every promo and chip link is a real route", () => {
  const tree = readFileSync(resolve(__dirname, "../routeTree.gen.ts"), "utf8");
  const routes = new Set([...tree.matchAll(/path: '([^']+)'/g)].map((m) => (m[1] ?? "").replace(/\/$/, "") || "/"));
  it("slides and chips", () => {
    const links = [
      ...promoSlides("2026-10-15", [ev()]).flatMap((s) => [s.cta.to, ...(s.secondary ? [s.secondary.to] : [])]),
      ...quickChips(1, false).map((c) => c.to),
    ];
    for (const to of links) expect(routes.has(to), to).toBe(true);
  });
});
