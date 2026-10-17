/** Mixed news block, tournaments hub, partner news and the consent cookie (UD-110). */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { clubFeedNews, toNews } from "./news.functions";
import {
  isNegativeHeadline,
  isRecent,
  mixNews,
  teamTagOf,
  type NewsItem,
} from "./news-mix";
import { PARTNER_NEWS, partnerNewsOn, type PartnerNews } from "./partner-news";
import { parseRss } from "./press";
import { SPONSORS } from "./sponsors";
import {
  TOURNAMENTS,
  tournamentRoutes,
  upcomingTournaments,
} from "./tournaments";
import { consentCookie, consentFromCookie, parseConsent } from "./universe";

const APP = resolve(__dirname, "../..");
const routes = new Set(
  [
    ...readFileSync(resolve(APP, "src/routeTree.gen.ts"), "utf8").matchAll(
      /fullPath: '([^']+)'/g,
    ),
  ].map((m) => m[1]!.replace(/\/$/, "") || "/"),
);

const NOW = Date.parse("2026-10-13T12:00:00Z");
const item = (over: Partial<NewsItem>): NewsItem => ({
  id: over.url ?? "x",
  title: "Colico, bella vittoria della Juniores",
  url: "https://example.org/a",
  source: "Testata",
  sourceKind: "press",
  publishedAt: "2026-10-10T08:00:00Z",
  tag: null,
  external: true,
  ...over,
});

describe("news mix", () => {
  it("keeps negative headlines out of the home highlight", () => {
    for (const t of [
      "Promozione, sconfitta per la ColicoDerviese",
      "ColicoDerviese ko in casa",
      "Under 18 Élite, una decisione dolorosa: prima di tutto i ragazzi",
      "Il Colico perde 3-0",
      "Squalifica per due giocatori",
    ])
      expect(isNegativeHeadline(t), t).toBe(true);
    for (const t of [
      "Juniores, tre punti a Dervio",
      "Christmas Lario Cup, ecco le squadre",
      "Kolbe e Colico, festa",
    ])
      expect(isNegativeHeadline(t), t).toBe(false);
  });

  it("tags the age group named in the title, never guessed", () => {
    expect(teamTagOf("Juniores Élite, vittoria a Lecco")).toBe("Juniores");
    expect(teamTagOf("Under 16, la ColicoDerviese vince")).toBe("Giovanissimi");
    expect(teamTagOf("Promozione: il Colico pareggia")).toBe("Prima Squadra");
    expect(teamTagOf("Christmas Lario Cup Female")).toBe("Femminile");
    expect(teamTagOf("Festa al centro sportivo")).toBeNull();
  });

  it("only recent items with a date (UNKNOWN is not fresh)", () => {
    expect(isRecent({ publishedAt: "2026-10-01T00:00:00Z" }, NOW, 45)).toBe(
      true,
    );
    expect(isRecent({ publishedAt: "2026-07-01T00:00:00Z" }, NOW, 45)).toBe(
      false,
    );
    expect(isRecent({ publishedAt: null }, NOW, 45)).toBe(false);
    expect(isRecent({ publishedAt: "2027-01-01T00:00:00Z" }, NOW, 45)).toBe(
      false,
    );
  });

  it("mixes sources, removes duplicates and non-https links, and rotates the lead source by day", () => {
    const press = [
      item({ url: "https://a.it/1", title: "Juniores, tre punti" }),
      item({ url: "https://a.it/2", title: "Sconfitta per il Colico" }),
      item({ url: "http://a.it/3", title: "Link non sicuro Colico" }),
    ];
    const site = [
      item({
        url: "https://www.colicoderviese.it/x",
        title: "Juniores, tre punti!",
        sourceKind: "site",
      }),
      item({
        url: "https://www.colicoderviese.it/y",
        title: "Open day Scuola Calcio",
        sourceKind: "site",
      }),
    ];
    const club = [
      item({
        url: "/eventi",
        title: "Festa del club",
        sourceKind: "club",
        external: false,
      }),
    ];
    const a = mixNews({ press, site, club }, { day: "2026-10-13", nowMs: NOW });
    expect(a.map((i) => i.title)).not.toContain("Sconfitta per il Colico");
    expect(a.map((i) => i.url)).not.toContain("http://a.it/3");
    expect(
      a.filter((i) => i.title.startsWith("Juniores, tre punti")),
    ).toHaveLength(1);
    expect(new Set(a.map((i) => i.sourceKind)).size).toBe(3);
    const b = mixNews({ press, site, club }, { day: "2026-10-14", nowMs: NOW });
    expect(a[0]!.sourceKind).not.toBe(b[0]!.sourceKind);
    expect(
      mixNews(
        { press: [], site: [], club: [] },
        { day: "2026-10-13", nowMs: NOW },
      ),
    ).toEqual([]);
  });

  it("parses the club WordPress feed without cutting titles", () => {
    const xml = `<rss><channel><item><title>Juniores - vittoria a Lecco</title><link>https://www.colicoderviese.it/2026/10/01/a/</link><pubDate>Thu, 01 Oct 2026 10:00:00 +0000</pubDate></item></channel></rss>`;
    expect(parseRss(xml, 5, false)[0]!.title).toBe(
      "Juniores - vittoria a Lecco",
    );
    expect(parseRss(xml, 5)[0]!.title).toBe("Juniores");
    expect(toNews(parseRss(xml, 5, false)[0]!, "site")).toMatchObject({
      source: "colicoderviese.it",
      tag: "Juniores",
      external: true,
    });
  });

  it("takes from the club feed only public news with a safe link", () => {
    const base = {
      kind: "news" as const,
      priority: 3 as const,
      priorityScore: 0,
      startAt: "2026-10-10T00:00:00Z",
      endAt: null,
      pinned: false,
      audience: ["public" as const],
    };
    const out = clubFeedNews([
      {
        ...base,
        id: "1",
        title: "Notizia",
        link: "https://www.colicoderviese.it/n",
      },
      { ...base, id: "2", title: "Interna", link: "/eventi" },
      { ...base, id: "3", title: "Pericolosa", link: "javascript:alert(1)" },
      { ...base, id: "4", title: "Senza link" },
      {
        ...base,
        id: "5",
        title: "Riservata",
        link: "https://x.it",
        audience: ["staff" as never],
      },
    ]);
    expect(out.map((n) => n.title)).toEqual(["Notizia", "Interna"]);
    expect(out[1]!.external).toBe(false);
  });
});

describe("tornei hub", () => {
  it("lists the Christmas Lario Cup and the Memorial Nasazzi twice (maschile and femminile) and Guattini, without invented details", () => {
    const ids = TOURNAMENTS.map((t) => t.id);
    expect(ids).toEqual([
      "christmas-lario-cup-maschile",
      "christmas-lario-cup-female",
      "memorial-jose-nasazzi",
      "memorial-jose-nasazzi-female",
      "memorial-sandro-guattini",
    ]);
    const nas = TOURNAMENTS[2]!;
    // Confirmed by the Direzione 17/10/2026 with the official posters of the 7th edition.
    expect(nas.status).toBe("ISCRIZIONI_APERTE");
    expect(nas.when).toBe("22–23 maggio 2027");
    expect(nas.annate?.map((a) => a.big)).toEqual(["2016", "2017"]);
    expect(nas.confirmedTeams).toEqual(["Sporting Braga", "Spezia", "Renate", "AlbinoLeffe", "Calcio Lecco", "Folgore Caratese"]);
    expect(nas.startAt).toBeUndefined();
    const fem = TOURNAMENTS[3]!;
    expect(fem.section).toBe("Femminile");
    expect(fem.place).toBe("Dervio (LC) · Centro Sportivo Comunale");
    expect(fem.confirmedTeams).toEqual([]);
    expect(fem.registersWith).toBe(nas.id);
    expect(TOURNAMENTS[4]!.when).toBeNull();
    for (const to of tournamentRoutes()) expect(routes.has(to), to).toBe(true);
    for (const t of TOURNAMENTS)
      if (t.poster)
        expect(() =>
          readFileSync(resolve(APP, "public", t.poster!.src.slice(1))),
        ).not.toThrow();
  });

  it("orders upcoming tournaments and drops the ones already played", () => {
    expect(upcomingTournaments("2026-10-13").map((t) => t.id)[0]).toBe(
      "christmas-lario-cup-maschile",
    );
    const after = upcomingTournaments("2026-12-09").map((t) => t.id);
    expect(after).not.toContain("christmas-lario-cup-maschile");
    expect(after).toEqual([
      "memorial-jose-nasazzi",
      "memorial-jose-nasazzi-female",
      "memorial-sandro-guattini",
    ]);
  });
});

describe("partner news", () => {
  it("starts empty (nothing invented) and validates future items", () => {
    expect(PARTNER_NEWS).toEqual([]);
    const ok: PartnerNews = {
      id: "n1",
      sponsorSlug: SPONSORS[0]!.slug,
      title: "Nuova sede",
      text: "x",
      publishedAt: "2026-10-10",
      source: "Post del partner",
      url: "https://x.it",
    };
    const list: PartnerNews[] = [
      ok,
      { ...ok, id: "n2", sponsorSlug: "sconosciuto" },
      { ...ok, id: "n3", url: "http://x.it" },
      { ...ok, id: "n4", publishedAt: "2026-10-20" },
      { ...ok, id: "n5", showUntil: "2026-10-01" },
    ];
    const out = partnerNewsOn("2026-10-13", list);
    expect(out.map((n) => n.id)).toEqual(["n1"]);
    expect(out[0]!.label).toBe(SPONSORS[0]!.name);
  });
});

describe("cookie consent persistence fallback", () => {
  it("mirrors the choice in a first-party cookie and reads it back", () => {
    const raw = JSON.stringify({
      v: 1,
      stats: false,
      mkt: false,
      ts: "2026-10-13T10:00:00.000Z",
    });
    const c = consentCookie(raw, true);
    expect(c).toMatch(/^scd-consent=/);
    expect(c).toMatch(/Max-Age=15552000; Path=\/; SameSite=Lax; Secure$/);
    const header = `foo=1; ${c.split(";")[0]}; bar=2`;
    expect(parseConsent(consentFromCookie(header))).toMatchObject({
      v: 1,
      stats: false,
    });
    expect(consentFromCookie("foo=1")).toBeNull();
    expect(consentCookie(raw, false)).not.toMatch(/Secure/);
  });
});
