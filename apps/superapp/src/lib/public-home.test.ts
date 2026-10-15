/**
 * Public home v5 (UD-100, UD-110, UD-116 — Direzione 14/10/2026): only real routes, no team content outside, no betting
 * content, no banned hero photo, practical blocks first, the link index in the menu (not in the footer).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import * as http from "./http-policy";
import {
  LINK_GROUPS,
  kickoffClock,
  matchdayLabel,
  SOCIAL_LINKS,
  partnerOfTheMonth,
  publicHomeRoutes,
  trimVetrina,
  verifiedSponsors,
  vetrinaRepeats,
} from "./public-home";
import { quickActions } from "./home-actions";
import { MENU_GROUPS, menuSections, searchMenu } from "./site-menu";
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
  "src/components/home/HomePractical.tsx",
  "src/components/home/HomeMatchday.tsx",
  "src/components/home/HomeBoard.tsx",
  "src/lib/home-board.ts",
  "src/lib/public-home.ts",
] as const;

describe("public home v5", () => {
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

  it("keeps teams inside: no team list, roster or training on the public home; today's games and the next home game of each team are shown", () => {
    expect(
      publicHomeRoutes().some(
        (r) => r.startsWith("/squadre") || r.startsWith("/allenamenti"),
      ),
    ).toBe(false);
    for (const f of PUBLIC_HOME_FILES) {
      const src = read(f);
      expect(src, f).not.toMatch(/\/squadre/);
      expect(src, f).not.toMatch(
        /getPublicRoster|TeamsGrid|hallTeams|getTrainingQuadro|quadro-data/,
      );
    }
    const home = code("src/components/home/PublicHome.tsx");
    // Direzione 13/10 09:03 "calendario settimana deve essere sempre" + UD-132 Matchday: the games of the next 7 days.
    expect(home).toMatch(/<HomeMatchday calendar=\{calendar\}/);
    const week = code("src/components/home/HomeMatchday.tsx");
    expect(week).toMatch(
      /weekMatches\(calendar\.events, calendar\.groups, today, null\)/,
    );
    expect(week).toContain('data-testid="home-matchday"');
    expect(week).toContain("Nessuna gara nei prossimi 7 giorni.");
    // Opponent crest only from the verified registry: no neutral shield, no invented crest.
    expect(week).toMatch(/const \{ src, label \} = crestFor\(name\);\s*if \(!src\) return null;/);
    expect(week).not.toMatch(/OpponentCrest|publicTeamCrest|team-crest/);
    // Filters are real buttons with aria-pressed.
    expect(week).toMatch(/<button[\s\S]{0,80}type="button"[\s\S]{0,40}aria-pressed=\{on\}/);
  });

  it("VR-009 board order (15/10): board top, ONE partner band, Mondo Colico vetrina, week + LED strip, results, join, credentials", () => {
    const home = code("src/components/home/PublicHome.tsx");
    const body = home.slice(home.indexOf("export function PublicHome"));
    const order = [
      "<UrgentNotices",
      "<ClubNoticeCard",
      "<HomeBoard",
      "<PartnerBand",
      "<Vetrina ",
      "<HomeMatchday",
      "<SponsorSpotsHome",
      "<WeekendResults",
      "<JoinBanner",
      "<CredentialBar",
    ];
    const at = order.map((t) => body.indexOf(t));
    for (const [i, p] of at.entries()) expect(p, order[i]).toBeGreaterThan(-1);
    expect([...at].sort((x, y) => x - y)).toEqual(at);
    // Off the public home since UD-132 (components kept for other pages).
    for (const gone of [
      "<PublicWeek",
      "<PublicToday",
      "<SupportStrip",
      "<QuickActions",
      "<DailyTipCard",
      "<HomeNewsBlock",
    ])
      expect(body, gone).not.toContain(gone);
    expect(home).toMatch(/export function Vetrina\(/);
    expect(home).toMatch(/export function HomeNewsBlock\(/);
    // The old 11-link quick strip and the big sponsor zone are gone.
    expect(home).not.toMatch(
      /QuickStrip|QUICK_LINKS|SponsorZone|partner-news-empty/,
    );
  });

  it("UD-116: the vetrina leaves out slots that only repeat a page the home already opens", () => {
    const repeats = vetrinaRepeats(quickActions("visitatore"));
    expect(repeats).toEqual(
      expect.arrayContaining([
        "/entra",
        "/card",
        "/installa",
        "/rassegna-stampa",
        "/sponsor",
      ]),
    );
    const s = (id: string, href: string) => ({ id, href });
    const out = trimVetrina(
      {
        tutti: [s("a", "/entra"), s("b", "/tornei")],
        bambini: [s("c", "/card")],
      },
      repeats,
    );
    expect(out.tutti.map((x) => x.id)).toEqual(["b"]);
    // A world is never emptied by the trim.
    expect(out.bambini.map((x) => x.id)).toEqual(["c"]);
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

  it("shows real social profiles only", () => {
    for (const s of SOCIAL_LINKS)
      expect(s.href).toMatch(/^https:\/\/www\.(instagram|facebook)\.com\//);
  });

  it("rotates the partner of the month over verified partners", () => {
    const oct = partnerOfTheMonth("2026-10-13");
    expect(oct).not.toBeNull();
    expect(partnerOfTheMonth("2026-10-31")).toBe(oct);
    expect(verifiedSponsors()).toContain(oct);
    expect(partnerOfTheMonth("2026-11-01")).not.toBe(oct);
    expect(partnerOfTheMonth("2026-10-13", [])).toBeNull();
    expect(SPONSORS.length).toBeGreaterThan(0);
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

  it("UD-110/UD-116: nothing repeated — one credential strip, one partner band, no trust carousel, no logo grids, no accordions in the body", () => {
    const home = code("src/components/home/PublicHome.tsx");
    expect(home.match(/<CredentialBar \/>/g)).toHaveLength(1);
    expect(home.match(/<PartnerBand /g)).toHaveLength(1);
    expect(home.match(/<LedwallRotator /g)).toHaveLength(1);
    for (const gone of [
      /<Trust\b/,
      /<PartnerTicker\b/,
      /<Partners\b/,
      /<LinkGroups\b/,
      /<WeekNews\b/,
      /<Featured\b/,
      /Perché la ColicoDerviese/,
      /Tutto sul club/,
    ])
      expect(home).not.toMatch(gone);
    // Partners link once to the full list.
    expect(home).toMatch(/Tutti i \{SPONSORS\.length\} partner/);
  });

  it("UD-116: the footer is reduced (logo, contacts, social, install, legal links, federal credits) and has no link index", () => {
    const chrome = code("src/components/SiteChrome.tsx");
    const footer = chrome.slice(chrome.indexOf("export function SiteFooter"));
    expect(footer).not.toMatch(/LINK_GROUPS|Tutto sul club|footer-group-/);
    expect(chrome).not.toMatch(/FooterSponsors|SPONSORS\.map/);
    for (const must of [
      /<ClubCrestOfficial/,
      /CLUB_PROFILE\.contacts\.email/,
      /CLUB_PROFILE\.contacts\.pec/,
      /CLUB_PROFILE\.contacts\.address/,
      /SOCIAL_LINKS\.map/,
      /to="\/installa"/,
      /href="\/privacy"/,
      /openCookiePrefs/,
      /to="\/safeguarding"/,
      /href="\/elimina-account"/,
      /<ClubCredentials variant="list"/,
    ])
      expect(footer).toMatch(must);
  });

  it("UD-116: the menu reaches every page of the former footer index, and its search finds them", () => {
    const sections = menuSections();
    const inMenu = new Set(
      sections
        .flatMap((g) => g.items)
        .map(
          (i) =>
            `${i.to}#${i.hash ?? ""}?${new URLSearchParams(i.search ?? {}).toString()}`,
        ),
    );
    for (const item of LINK_GROUPS.flatMap((g) => g.items))
      expect(
        inMenu.has(
          `${item.to}#${item.hash ?? ""}?${new URLSearchParams(item.search ?? {}).toString()}`,
        ),
        item.label,
      ).toBe(true);
    const routes = routePaths();
    for (const i of sections.flatMap((g) => g.items))
      expect(routes.has(i.to.replace(/\/$/, "") || "/"), i.to).toBe(true);
    expect(sections.slice(0, MENU_GROUPS.length).map((g) => g.id)).toEqual(
      MENU_GROUPS.map((g) => g.id),
    );
    expect(searchMenu("kit").map((i) => i.to)).toContain("/kit");
    expect(searchMenu("iscrizioni").map((i) => i.to)).toContain("/entra");
    expect(searchMenu("CHRISTMAS lario").map((i) => i.to)).toContain(
      "/eventi/christmas-lario-cup",
    );
    expect(searchMenu("   ")).toEqual([]);
    expect(searchMenu("zzzz")).toEqual([]);
    // The drawer renders the sections and the search.
    const chrome = code("src/components/SiteChrome.tsx");
    expect(chrome).toMatch(/menuSections\(\)/);
    expect(chrome).toMatch(/searchMenu\(query, sections\)/);
  });

  it("UD-110: partner logos are always in colour (no greyscale anywhere on public logos)", () => {
    for (const f of [
      "src/components/scd/Logos.tsx",
      "src/components/home/PublicHome.tsx",
      "src/components/home/HomePractical.tsx",
      "src/components/SponsorBand.tsx",
      "src/components/SiteChrome.tsx",
      "src/routes/sponsor.tsx",
    ]) {
      const src = code(f);
      expect(src, f).not.toMatch(/scd-logo-mono|grayscale|mono=/);
    }
    expect(read("src/styles.css")).not.toMatch(
      /\.scd-logo-mono|grayscale\(1\)/,
    );
  });

  it("UD-110: the press list is off the home (only the vetrina slot and the filtered news block link to /rassegna-stampa)", () => {
    const home = code("src/components/home/PublicHome.tsx");
    expect(home).not.toMatch(/PressItem|press\.slice/);
    expect(home).toMatch(/to="\/rassegna-stampa"/);
    expect(publicHomeRoutes()).not.toContain("/rassegna");
  });
});
