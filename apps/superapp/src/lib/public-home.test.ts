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
import { MENU_GROUPS, isHiddenFromMenu, menuSections, searchMenu } from "./site-menu";
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
  "src/components/home/HomePractical.tsx",
  "src/components/home/HomeLobby.tsx",
  "src/lib/home-week-board.ts",
  "src/components/home/HomePromo.tsx",
  "src/lib/home-board.ts",
  "src/components/home/WinConfetti.tsx",
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
    // Direzione 13/10 09:03 "calendario settimana deve essere sempre" + 15/10 22:04 Eurobet rebuild: the week of every
    // team as event cards, right after the chips and the one static match banner.
    expect(home).toMatch(/<HomeLobby calendar=\{calendar\}/);
    const lobby = code("src/components/home/HomeLobby.tsx");
    expect(lobby).toMatch(/weekBoardEvents\(calendar\.events, today\)/);
    expect(lobby).toContain('data-testid="home-lobby"');
    expect(lobby).toContain("Nessuna gara nei prossimi 7 giorni");
    expect(lobby).not.toMatch(/publicTeamCrest|team-crest/);
    // 16/10 14:46 "via di mezzo": slim strip of the week's games with a separate "In corso" box, affiliation and FIGC
    // membership first with a small "registrati", Oggi in campo, Servizi e club, Dal club; the calendar is a small side
    // tool (month on desktop, week on phone) with the countdown to the next home game.
    for (const id of ["home-ticker", "home-live-box", "bar-calendario", "bar-allenamenti", "home-profile", "home-countdown", "home-join", "home-training", "home-services", "home-month", "home-week", "home-news"])
      expect(lobby).toContain(`data-testid="${id}"`);
    expect(lobby).not.toMatch(/data-testid="home-(board|tabs|feed|inside|video|highlights)"/);
    // Allenamenti are for members: the bar opens the access screen first.
    expect(lobby).toMatch(/to="\/accedi" search=\{loginSearch\("\/allenamenti"\)\}/);
    // The three marks are transparent and never on a white plate; no photo of the pitch or the centre on the home.
    expect(lobby).toContain("CLUB_CREDENTIALS.map");
    expect(lobby).toContain("drop-shadow(0_0_1px_rgb(255_255_255/0.95))");
    expect(lobby).not.toMatch(/aerea|aerial|centro-sportivo\.(webp|jpg)/i);
    expect(lobby).not.toMatch(/Carousel|slide|HeroArt|SkyJolly|PersonaAvatar|Pixellot/i);
    // The three official marks live in the top bar, CR Lombardia and Monza linked.
    const chrome = code("src/components/SiteChrome.tsx");
    expect(chrome).toContain('data-testid="header-credentials"');
    // Never on a white plate (16/10 15:05): the marks sit on the blue bar, transparent, with a light halo.
    const creds = chrome.slice(chrome.indexOf("function HeaderCredentials"), chrome.indexOf("export function SiteHeader"));
    expect(creds).not.toMatch(/\bbg-white\b/);
    expect(creds).toContain("drop-shadow(0_0_1px_rgb(255_255_255/0.95))");
    expect(chrome).toContain('"https://www.crlombardia.it/"');
    expect(chrome).toContain('"https://www.acmonza.com/en/insieme-monza-dettaglio/mission/"');
  });

  it("home order (15/10 07:04, UD-134 09:18, new idea 21:35): notices, communication, lobby, results; no stories, no partner band", () => {
    const home = code("src/components/home/PublicHome.tsx");
    const body = home.slice(home.indexOf("export function PublicHome"));
    const order = [
      "<UrgentNotices",
      "<ClubNoticeCard",
      "<HomeLobby",
      "<WeekendResults",
    ];
    const at = order.map((t) => body.indexOf(t));
    for (const [i, p] of at.entries()) expect(p, order[i]).toBeGreaterThan(-1);
    expect([...at].sort((x, y) => x - y)).toEqual(at);
    // Off the public home since UD-132; PublicToday and HomeNewsBlock deleted (PC audit 15/10, item 8).
    for (const gone of [
      "<PublicWeek",
      "<PublicToday",
      "<SupportStrip",
      "<QuickActions",
      "<DailyTipCard",
      "<HomeNewsBlock",
      "<JoinBanner",
      "<CredentialBar",
      // UD-134: stories were "una cavolata"; partner news and the LED spot moved to /sponsor.
      "<HomeStories",
      "<PartnerBand",
      "<SponsorSpotsHome",
    ])
      expect(body, gone).not.toContain(gone);
    // UD-152 (15/10 13:54): no vetrina / "In evidenza" on any home.
    expect(home).not.toMatch(/<Vetrina[\s/>]|In evidenza/);
    expect(code("src/components/home/MemberHome.tsx")).not.toMatch(/<Vetrina[\s/>]|In vetrina/);
    // Dead code removed (PC audit 15/10, item 8): no news block, no carousel, no unused news fetch on the home.
    expect(home).not.toMatch(/HomeNewsBlock|NewsItem/);
    expect(code("src/routes/index.tsx")).not.toMatch(/getHomeNews/);
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
    // 07:04 "fuori ogni logica": every block once — credentials only in the footer, ONE LED (the live spot in the
    // partner band), no join banner (Entra is in the header and in the bottom bar).
    expect(home).not.toMatch(/<CredentialBar|<JoinBanner|<LedwallRotator /);
    // UD-134: no partner band and no LED spot on the home; partners scroll in the fixed SponsorBand.
    expect(home).not.toMatch(/<PartnerBand |<SponsorSpotsHome /);
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
    // UD-134: the scrolling sponsor bar is back on the home (no home exception in the band or in the shell).
    const band = code("src/components/SponsorBand.tsx");
    expect(band).not.toMatch(/useRouterState|\? "hidden"/);
    expect(code("src/routes/__root.tsx")).not.toMatch(/pathname === "\/"/);
    // UD-134: one assistant only — the Crovi greeting bubble beside Vera's launcher is gone.
    const chat = code("src/components/SkyChat.tsx");
    expect(chat).not.toMatch(/crovi-cameo|CroviActor|cameoLine/);
  });

  it("UD-116 + light footer (16/10 05:59): reduced footer (logo, contacts, app + social, credits sentence, legal links), no link index", () => {
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
      /\{CREDENTIALS_SENTENCE\}/,
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
      ).toBe(item.publicMenu !== false);
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

  it("cleanup 15/10/2026: no ONE/CORE/GROW badge, no build stamp in the footer copy; publicMenu: false keeps a page out of the menu (no page uses it today)", () => {
    const sections = menuSections();
    const labels = sections.flatMap((g) => g.items).map((i) => i.label);
    // Every public page of the index is in the menu: the six "placeholder" candidates are real public pages.
    for (const shown of [
      "Fantacalcio SCD",
      "Top 11 della settimana",
      "Dicono di noi",
      "Le card 2026/27",
      "Kit ufficiale 2026/27",
      "Richiedi una proposta",
    ])
      expect(labels, shown).toContain(shown);
    expect(isHiddenFromMenu({ to: "/x", publicMenu: false })).toBe(true);
    expect(isHiddenFromMenu({ to: "/x" })).toBe(false);
    for (const kept of [
      "Home",
      "Chi siamo",
      "Calendario gare",
      "Mappa campi",
      "Comunicazioni",
      "Eventi",
      "Tornei",
      "Christmas Lario Cup",
      "Tifosi",
      "Gioca con noi",
      "Contatti",
      "La mia SCD",
      "Le squadre",
      "Allenamenti",
      "Sponsor & Partner",
      "Fornitori",
      "Documenti della società",
      "Tutela dei minori",
      "Registrati nell'app",
      "Guida all'app",
      "Area famiglia",
      "Area partner",
      "Social e video",
      "Installa l'app",
      "Privacy",
    ])
      expect(labels, kept).toContain(kept);
    const chrome = code("src/components/SiteChrome.tsx");
    const drawer = chrome.slice(chrome.indexOf("export function MenuDrawer"), chrome.indexOf("type TabDef"));
    expect(drawer).not.toMatch(/\{g\.app\}/);
    const footer = chrome.slice(chrome.indexOf("export function SiteFooter"));
    expect(footer).not.toMatch(/versione del/);
    expect(footer).toMatch(/data-build=\{BUILD_STAMP\}/);
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

  it("UD-110: the press list is off the home (reached from the menu and the vetrina slot, never listed on the home)", () => {
    const home = code("src/components/home/PublicHome.tsx");
    expect(home).not.toMatch(/PressItem|press\.slice/);
    expect(publicHomeRoutes()).not.toContain("/rassegna");
  });
});
