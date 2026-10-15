import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { eventSlide, iscrizioniSlide, nextIndex, promoSlides, quickChips, welcomeSlide } from "./home-promo";
import { MEMBERS_ONLY_PREFIXES } from "./http-policy";
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
  it("sign-up slide never promises a callback while the public forms are paused", () => {
    expect(iscrizioniSlide(false).cta.to).toBe("/contatti");
    expect(iscrizioniSlide(false).text).not.toMatch(/ricontatta/);
    expect(iscrizioniSlide(true).cta.to).toBe("/entra");
  });
  it("welcome credits appear only when the register grants them", () => {
    expect(welcomeSlide(false).text).not.toMatch(/crediti/);
    expect(welcomeSlide(true).text).toMatch(/50 crediti/);
    expect(welcomeSlide(true).text).not.toMatch(/€/);
  });
  it("Accedi goes to the sign-in page", () => {
    expect(promoSlides("2026-10-15", [])[0]?.secondary?.to).toBe("/accedi");
  });
  it("nextIndex wraps both ways", () => {
    expect(nextIndex(3, 4)).toBe(0);
    expect(nextIndex(0, 4, -1)).toBe(3);
    expect(nextIndex(5, 0)).toBe(0);
  });
});

describe("quick chips", () => {
  it("games badge: LIVE while a club game is played, nothing otherwise (no counts, no NUOVO: cleanup 15/10/2026)", () => {
    expect(quickChips(true)[0]?.badge).toEqual({ kind: "live" });
    expect(quickChips(false)[0]?.badge).toBeUndefined();
    for (const c of quickChips(true)) if (c.badge) expect(c.badge.kind).toBe("live");
  });
  it("all chips lead to app pages", () => {
    expect(quickChips(false).every((c) => c.to.startsWith("/"))).toBe(true);
  });
});

/**
 * The public home is rendered for visitors only (routes/index.tsx): none of its chips or board tiles may open a page
 * that answers a visitor with the access screen or a redirect to /accedi (members-only prefixes of http-policy.ts).
 */
describe("guest home never links to members-only pages", () => {
  const membersOnly = (to: string) => MEMBERS_ONLY_PREFIXES.some((p) => to === p || to.startsWith(`${p}/`));
  it("chips", () => {
    for (const c of quickChips(true)) expect(membersOnly(c.to), c.to).toBe(false);
  });
  it("board tiles", () => {
    const board = readFileSync(resolve(__dirname, "../components/home/HomeBoard.tsx"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    for (const m of board.matchAll(/to="([^"]+)"/g)) expect(membersOnly(m[1] ?? ""), m[1]).toBe(false);
  });
});

describe("every promo and chip link is a real route", () => {
  const tree = readFileSync(resolve(__dirname, "../routeTree.gen.ts"), "utf8");
  const routes = new Set([...tree.matchAll(/path: '([^']+)'/g)].map((m) => (m[1] ?? "").replace(/\/$/, "") || "/"));
  it("slides and chips", () => {
    const links = [
      ...promoSlides("2026-10-15", [ev()]).flatMap((s) => [s.cta.to, ...(s.secondary ? [s.secondary.to] : [])]),
      ...quickChips(false).map((c) => c.to),
    ];
    for (const to of links) expect(routes.has(to), to).toBe(true);
  });
});
