/**
 * Public home v4 (UD-100, Direzione 13/10/2026): only real routes, no team content outside, no betting content,
 * no banned hero photo.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import * as http from "./http-policy";
import {
  FEATURES,
  LINK_GROUPS,
  kickoffClock,
  matchdayLabel,
  QUICK_LINKS,
  SOCIAL_LINKS,
  partnerOfTheMonth,
  publicHomeRoutes,
  trustFacts,
  verifiedSponsors,
} from "./public-home";
import { SPONSORS } from "./sponsors";

const APP = resolve(__dirname, "../..");
const read = (f: string) => readFileSync(resolve(APP, f), "utf8");
/** Source without comments: what can reach the page. */
const code = (f: string) =>
  read(f)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

/** Full paths of every route TanStack generated (src/routeTree.gen.ts). */
function routePaths(): Set<string> {
  const tree = read("src/routeTree.gen.ts");
  const paths = [...tree.matchAll(/fullPath: '([^']+)'/g)].map(
    (m) => m[1]!.replace(/\/$/, "") || "/",
  );
  return new Set(paths);
}

const PUBLIC_HOME_FILES = [
  "src/routes/index.tsx",
  "src/components/home/PublicHome.tsx",
  "src/components/home/Carousel.tsx",
  "src/lib/public-home.ts",
] as const;

describe("public home v4", () => {
  it("links only to routes that exist", () => {
    const routes = routePaths();
    for (const to of publicHomeRoutes()) {
      expect(routes.has(to.replace(/\/$/, "") || "/"), to).toBe(true);
    }
  });

  it("links anonymous visitors only to public pages, except areas marked as reserved", () => {
    const reserved = new Set(
      LINK_GROUPS.flatMap((g) => g.items)
        .filter((i) => i.reserved)
        .map((i) => i.to),
    );
    for (const to of publicHomeRoutes()) {
      // Sign-in and the pre-registration form are open to everyone but never cached (personal data).
      if (reserved.has(to) || ["/accedi", "/registrati", "/entra"].includes(to))
        continue;
      expect(http.isPublicPath(to), to).toBe(true);
    }
  });

  it("keeps teams inside: no team list or roster on the public home; the games of the week of all teams are always shown", () => {
    expect(publicHomeRoutes().some((r) => r.startsWith("/squadre"))).toBe(
      false,
    );
    for (const f of PUBLIC_HOME_FILES) {
      const src = read(f);
      expect(src, f).not.toMatch(/\/squadre/);
      expect(src, f).not.toMatch(/getPublicRoster|TeamsGrid|hallTeams/);
    }
    // Direzione 13/10 09:03: "calendario settimana deve essere sempre".
    expect(read("src/components/home/PublicHome.tsx")).toMatch(/<PublicWeek/);
    // The single calendar link of the brief lives in the quick strip.
    expect(QUICK_LINKS.filter((q) => q.to === "/calendario")).toHaveLength(1);
  });

  it("never uses the aerial photo of the sports centre nor any betting wording", () => {
    for (const f of PUBLIC_HOME_FILES) {
      const src = code(f);
      expect(src, f).not.toMatch(/hero-colico/);
      expect(src, f).not.toMatch(
        /\b(quote|scommess|bonus|casin[oò]|puntat|betting|odds)\b/i,
      );
    }
  });

  it("shows real assets only", () => {
    for (const c of FEATURES) {
      const v = c.visual;
      if (v.kind !== "image") continue;
      expect(v.src, c.id).toMatch(/^\/media\//);
      expect(() =>
        readFileSync(resolve(APP, "public", v.src.slice(1))),
      ).not.toThrow();
    }
    for (const s of SOCIAL_LINKS)
      expect(s.href).toMatch(/^https:\/\/www\.(instagram|facebook)\.com\//);
  });

  it("states the real number of partners and rotates the showcase by month", () => {
    expect(trustFacts().at(-1)!.text).toContain(String(SPONSORS.length));
    const oct = partnerOfTheMonth("2026-10-13");
    expect(oct).not.toBeNull();
    expect(partnerOfTheMonth("2026-10-31")).toBe(oct);
    expect(verifiedSponsors()).toContain(oct);
    expect(partnerOfTheMonth("2026-11-01")).not.toBe(oct);
    expect(partnerOfTheMonth("2026-10-13", [])).toBeNull();
  });

  it("gives the quick strip the brief's badges", () => {
    expect(QUICK_LINKS.find((q) => q.badge === "nuovo")?.to).toBe(
      "/eventi/christmas-lario-cup",
    );
    expect(QUICK_LINKS.find((q) => q.badge === "top")?.to).toBe("/sponsor");
  });

  it("counts down to the real kickoff and stops once the game has started", () => {
    const k = Date.parse("2026-10-17T08:30:00Z");
    expect(
      kickoffClock(k, k - (2 * 86_400 + 3 * 3_600 + 4 * 60 + 5) * 1000),
    ).toEqual({ d: 2, h: 3, m: 4, s: 5 });
    expect(kickoffClock(k, k - 999)).toBeNull();
    expect(kickoffClock(k, k)).toBeNull();
    expect(kickoffClock(k, k + 60_000)).toBeNull();
    // UNKNOWN is not zero: no kickoff time, no countdown.
    expect(kickoffClock(null, k)).toBeNull();
  });

  it("names the matchday as a family reads it", () => {
    expect(matchdayLabel("2026-10-13", "2026-10-13")).toBe("Oggi");
    expect(matchdayLabel("2026-10-14", "2026-10-13")).toBe("Domani");
    expect(matchdayLabel("2026-11-01", "2026-10-31")).toBe("Domani");
    expect(matchdayLabel("2026-10-17", "2026-10-13")).toBe("Sabato 17 ottobre");
  });

  it("keeps the sponsor ticker pausable and the motion opt-out in CSS", () => {
    const home = code("src/components/home/PublicHome.tsx");
    expect(home).toMatch(/<PartnerTicker/);
    expect(home).toMatch(/aria-pressed=\{paused\}/);
    const css = read("src/styles.css");
    expect(css).toMatch(
      /prefers-reduced-motion: reduce\)[^}]*\{[^]*\.scd-marquee-track/,
    );
  });
});
