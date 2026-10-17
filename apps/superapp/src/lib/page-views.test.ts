import { describe, expect, it } from "vitest";

import {
  deviceFromWidth,
  normalisePagePath,
  pageSourceFrom,
  parseStatsRows,
  summarizeStats,
  trackingRefused,
  type PageViewRow,
} from "./page-views";

describe("normalisePagePath", () => {
  it("keeps public paths, cuts query and hash, lower-cases, merges slashes", () => {
    expect(normalisePagePath("/")).toBe("/");
    expect(normalisePagePath("/Calendario/?utm_source=ig#oggi")).toBe(
      "/calendario",
    );
    expect(normalisePagePath("//eventi//christmas-lario-cup-2026/")).toBe(
      "/eventi/christmas-lario-cup-2026",
    );
    expect(normalisePagePath("/?src=qr")).toBe("/");
  });

  it("collapses uuid, numeric and unusual segments to :id", () => {
    expect(
      normalisePagePath("/eventi/5d7c2b2e-1c1a-4f3e-9a51-2b2f8c0d1e3f"),
    ).toBe("/eventi/:id");
    expect(normalisePagePath("/eventi/123")).toBe("/eventi/:id");
    expect(normalisePagePath("/eventi/mario%20rossi")).toBe("/eventi/:id");
    expect(normalisePagePath(`/eventi/${"a".repeat(61)}`)).toBe("/eventi/:id");
  });

  it("counts only the public allowlist (home + public prefixes, never internal, reserved, /entra or /grow)", () => {
    for (const p of [
      "/gestionale",
      "/gestionale/numeri",
      "/GESTIONALE",
      "/direzione/accessi",
      "/core",
      "/accedi",
      "/quadro",
      "/segreteria",
      "/famiglia/x",
      "/ledwall/player",
      "//gestionale",
      "/gestionale?x=1",
      "/entra",
      "/grow",
      "/sostieni",
      "/qualcosa",
    ]) {
      expect(normalisePagePath(p), p).toBeNull();
    }
    expect(normalisePagePath("/tornei")).toBe("/tornei");
    expect(normalisePagePath("/sponsor/")).toBe("/sponsor");
  });

  it("refuses bad input", () => {
    expect(normalisePagePath("calendario")).toBeNull();
    expect(normalisePagePath("")).toBeNull();
    expect(normalisePagePath(null)).toBeNull();
    expect(normalisePagePath(`/${"a".repeat(120)}`)).toBeNull();
    expect(normalisePagePath("/a/b/c/d/e/f/g/h/i")).toBeNull();
    expect(normalisePagePath("/eventi/b/c/d/e/f/g/h")).toBe(
      "/eventi/b/c/d/e/f/g/h",
    );
    expect(normalisePagePath(`/calendario?${"x".repeat(2100)}`)).toBeNull();
  });
});

describe("pageSourceFrom", () => {
  const at = (search: string, referrer = "") =>
    pageSourceFrom({ search, referrer, host: "app.colicoderviese.it" });
  it("QR wins, then utm_source, then referrer, else direct", () => {
    expect(at("?src=qr", "https://www.instagram.com/")).toBe("qr");
    expect(at("?utm_source=Instagram_Stories")).toBe("instagram");
    expect(at("?utm_source=fb")).toBe("facebook");
    expect(at("?utm_source=whatsapp")).toBe("whatsapp");
    expect(at("?utm_source=newsletter")).toBe("other");
    expect(at("", "https://l.instagram.com/?u=x")).toBe("instagram");
    expect(at("", "https://m.facebook.com/")).toBe("facebook");
    expect(at("", "https://lm.facebook.com/")).toBe("facebook");
    expect(at("", "https://www.tiktok.com/@scd")).toBe("tiktok");
    expect(at("", "https://wa.me/39")).toBe("whatsapp");
    expect(at("", "https://web.whatsapp.com/")).toBe("whatsapp");
    expect(at("", "https://www.google.it/")).toBe("google");
    expect(at("", "https://www.tuttocampo.it/")).toBe("other");
    expect(at("", "https://app.colicoderviese.it/calendario")).toBe("direct");
    expect(at("", "not a url")).toBe("direct");
    expect(at("")).toBe("direct");
  });
});

describe("deviceFromWidth and trackingRefused", () => {
  it("maps widths", () => {
    expect(deviceFromWidth(390)).toBe("phone");
    expect(deviceFromWidth(767)).toBe("phone");
    expect(deviceFromWidth(768)).toBe("tablet");
    expect(deviceFromWidth(1023)).toBe("tablet");
    expect(deviceFromWidth(1440)).toBe("desktop");
    expect(deviceFromWidth(Number.NaN)).toBe("phone");
  });
  it("respects Do Not Track and Global Privacy Control", () => {
    expect(trackingRefused({ doNotTrack: "1" })).toBe(true);
    expect(trackingRefused({ globalPrivacyControl: true })).toBe(true);
    expect(trackingRefused({ doNotTrack: "0" })).toBe(false);
    expect(trackingRefused({ doNotTrack: null })).toBe(false);
    expect(trackingRefused(null)).toBe(true);
  });
});

describe("stats", () => {
  const rows: PageViewRow[] = [
    {
      day: "2026-10-15",
      path: "/",
      source: "instagram",
      device: "phone",
      views: 6,
    },
    {
      day: "2026-10-17",
      path: "/",
      source: "direct",
      device: "desktop",
      views: 2,
    },
    {
      day: "2026-10-17",
      path: "/calendario",
      source: "whatsapp",
      device: "phone",
      views: 2,
    },
    {
      day: "2026-09-01",
      path: "/vecchia",
      source: "google",
      device: "phone",
      views: 99,
    },
  ];

  it("parses only valid rows", () => {
    expect(
      parseStatsRows([
        ...rows,
        { day: "x", path: "/", source: "direct", device: "phone", views: 1 },
        {
          day: "2026-10-17",
          path: "/",
          source: "mail",
          device: "phone",
          views: 1,
        },
        null,
      ]),
    ).toHaveLength(4);
    expect(
      parseStatsRows([
        {
          day: "2026-10-17",
          path: "/",
          source: "direct",
          device: "phone",
          views: "3",
        },
      ])[0]!.views,
    ).toBe(3);
    expect(parseStatsRows(null)).toEqual([]);
  });

  it("summarises the period", () => {
    const s = summarizeStats(rows, "2026-10-17", 7);
    expect(s.total).toBe(10);
    expect(s.today).toBe(4);
    expect(s.socialPct).toBe(80);
    expect(s.phonePct).toBe(80);
    expect(s.topPages).toEqual([
      { path: "/", views: 8 },
      { path: "/calendario", views: 2 },
    ]);
    expect(s.bySource.map((x) => x.key)).toEqual([
      "instagram",
      "direct",
      "whatsapp",
    ]);
    expect(s.byDevice).toEqual([
      { key: "phone", views: 8, pct: 80 },
      { key: "tablet", views: 0, pct: 0 },
      { key: "desktop", views: 2, pct: 20 },
    ]);
    expect(s.trend).toEqual([
      { day: "2026-10-15", views: 6 },
      { day: "2026-10-16", views: 0 },
      { day: "2026-10-17", views: 4 },
    ]);
  });

  it("unknown percentages stay null when nothing was counted", () => {
    const s = summarizeStats([], "2026-10-17", 30);
    expect(s.total).toBe(0);
    expect(s.socialPct).toBeNull();
    expect(s.phonePct).toBeNull();
    expect(s.trend).toEqual([]);
  });
});
