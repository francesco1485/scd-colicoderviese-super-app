import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  CREST_SHARE_IMAGE,
  SHARE_PAGES,
  absoluteUrl,
  pageMeta,
  shareData,
  shareMessage,
  whatsappUrl,
  type MetaEntry,
  type SharePageKey,
} from "./share";

const APP = resolve(__dirname, "../..");
const REPO = resolve(APP, "../..");
const read = (p: string) => readFileSync(resolve(APP, p), "utf8");

const prop = (meta: MetaEntry[], key: string) =>
  meta.find((m) => ("property" in m && m.property === key) || ("name" in m && m.name === key)) as
    | { content: string }
    | undefined;

describe("absoluteUrl", () => {
  it("builds absolute URLs on the official public origin", () => {
    expect(absoluteUrl("/sponsor")).toBe("https://app.colicoderviese.it/sponsor");
    expect(absoluteUrl("sostieni")).toBe("https://app.colicoderviese.it/sostieni");
    expect(absoluteUrl("/tornei#christmas")).toBe("https://app.colicoderviese.it/tornei#christmas");
  });
  it("uses a configured site URL and ignores invalid ones", () => {
    expect(absoluteUrl("/tornei", "https://example.org/x")).toBe("https://example.org/tornei");
    expect(absoluteUrl("/tornei", "not a url")).toBe("https://app.colicoderviese.it/tornei");
  });
  it("passes absolute URLs through", () => {
    expect(absoluteUrl("https://app.colicoderviese.it/a")).toBe("https://app.colicoderviese.it/a");
  });
});

describe("WhatsApp link", () => {
  it("encodes text and link in one wa.me message without a recipient", () => {
    const url = whatsappUrl({ text: "Sostieni la ColicoDerviese: àèì & più?", url: "https://app.colicoderviese.it/sostieni" });
    expect(url.startsWith("https://wa.me/?text=")).toBe(true);
    const text = url.slice("https://wa.me/?text=".length);
    expect(text).not.toMatch(/[ &?:]/);
    expect(decodeURIComponent(text)).toBe("Sostieni la ColicoDerviese: àèì & più? https://app.colicoderviese.it/sostieni");
  });
  it("uses the page share text and absolute URL", () => {
    const d = shareData(SHARE_PAGES.sostieni);
    expect(d.url).toBe("https://app.colicoderviese.it/sostieni");
    expect(shareMessage(d)).toBe(`${SHARE_PAGES.sostieni.shareText} https://app.colicoderviese.it/sostieni`);
    expect(new URL(whatsappUrl(d)).searchParams.get("text")).toBe(shareMessage(d));
  });
});

describe("pageMeta", () => {
  const keys = Object.keys(SHARE_PAGES) as SharePageKey[];

  it.each(keys)("%s: full Open Graph + Twitter entries, absolute og:url and og:image, nothing empty", (key) => {
    const page = SHARE_PAGES[key];
    const meta = pageMeta(page);
    expect(meta[0]).toEqual({ title: page.title });
    for (const k of [
      "description",
      "og:type",
      "og:title",
      "og:description",
      "og:url",
      "og:image",
      "og:image:alt",
      "twitter:card",
      "twitter:title",
      "twitter:image",
    ])
      expect(prop(meta, k)?.content.trim(), `${key} ${k}`).toBeTruthy();
    for (const m of meta) {
      const v = "title" in m ? m.title : m.content;
      expect(v.trim().length, `${key} ${JSON.stringify(m)}`).toBeGreaterThan(0);
    }
    expect(prop(meta, "og:url")?.content).toBe(`https://app.colicoderviese.it${page.path}`);
    expect(prop(meta, "og:image")?.content).toMatch(/^https:\/\/app\.colicoderviese\.it\/.+\.(png|webp|jpe?g)$/);
    // One entry per key: no duplicate og/twitter tags.
    const ids = meta.map((m) => ("title" in m ? "title" : "property" in m ? m.property : m.name));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("square crest uses the summary card, the portrait poster the large card", () => {
    expect(prop(pageMeta(SHARE_PAGES.sponsor), "twitter:card")?.content).toBe("summary");
    expect(prop(pageMeta(SHARE_PAGES.christmasLarioCup), "twitter:card")?.content).toBe("summary_large_image");
  });

  it("share texts are short, specific and without hype words", () => {
    const texts = keys.map((k) => SHARE_PAGES[k].shareText);
    expect(new Set(texts).size).toBe(texts.length);
    for (const t of texts) {
      expect(t.length).toBeGreaterThan(20);
      expect(t.length).toBeLessThanOrEqual(160);
      expect(t).not.toMatch(/incredibil|imperdibil|esclusiv|straordinari|unic[oa]\b|!/i);
      expect(t).not.toMatch(/https?:/);
    }
  });

  it("dates in share texts are only the ones already published on the page (Christmas Lario Cup 8/12/2026)", () => {
    for (const k of keys) {
      const t = SHARE_PAGES[k].shareText;
      const dates = t.match(/\d{1,2}\/\d{1,2}\/\d{4}/g) ?? [];
      if (k === "christmasLarioCup") expect(dates).toEqual(["8/12/2026"]);
      else expect(dates, k).toEqual([]);
    }
    expect(read("src/lib/events.ts")).toMatch(/start: "2026-12-08/);
  });
});

describe("og:image uses official assets only", () => {
  const registry = JSON.parse(readFileSync(resolve(REPO, "config/scd-assets.v1.json"), "utf8")) as {
    runtime_assets: { path: string; class: string }[];
  };
  const registered = (src: string) =>
    registry.runtime_assets.find((a) => {
      const p = `apps/superapp/public${src}`;
      return a.path === p || (a.path.endsWith("/") && p.startsWith(a.path));
    });

  it.each(Object.keys(SHARE_PAGES) as SharePageKey[])("%s: image is a served file registered in config/scd-assets.v1.json", (key) => {
    const img = SHARE_PAGES[key].image;
    expect(existsSync(resolve(APP, "public", img.src.slice(1))), img.src).toBe(true);
    expect(["APP_ICON", "EVENT_POSTER", "OFFICIAL_CLUB_LOGO"]).toContain(registered(img.src)?.class);
    expect(img.alt.length).toBeGreaterThan(5);
  });

  it("crest image is the official crest on the club background", () => {
    expect(registered(CREST_SHARE_IMAGE.src)?.class).toBe("APP_ICON");
  });
});

/** Public pages of C3: each route head() is built by pageMeta and the page shows the ShareButton. */
const ROUTES: { file: string; key: SharePageKey; path: string }[] = [
  { file: "src/routes/sponsor.tsx", key: "sponsor", path: "/sponsor" },
  { file: "src/routes/sostieni.index.tsx", key: "sostieni", path: "/sostieni" },
  { file: "src/routes/sostieni.dona-materiale.tsx", key: "donaMateriale", path: "/sostieni/dona-materiale" },
  { file: "src/routes/sostieni.fondo-solidale.tsx", key: "fondoSolidale", path: "/sostieni/fondo-solidale" },
  { file: "src/routes/sostieni.proponi.tsx", key: "proponi", path: "/sostieni/proponi" },
  { file: "src/routes/eventi.lotteria-dello-sport.tsx", key: "lotteria", path: "/eventi/lotteria-dello-sport" },
  { file: "src/routes/tornei.tsx", key: "tornei", path: "/tornei" },
  { file: "src/routes/eventi.christmas-lario-cup.tsx", key: "christmasLarioCup", path: "/eventi/christmas-lario-cup" },
];

describe("C3 routes", () => {
  it.each(ROUTES)("$path: head() uses pageMeta (og:image + og:title) and the page renders ShareButton", ({ file, key, path }) => {
    const src = read(file);
    expect(SHARE_PAGES[key].path).toBe(path);
    expect(src).toContain(`createFileRoute("${path === "/sostieni" ? "/sostieni/" : path}")`);
    expect(src).toMatch(new RegExp(`pageMeta\\((SHARE_PAGES\\.${key}|page)\\)`));
    expect(src).toContain(`<ShareButton page={SHARE_PAGES.${key}}`);
    // No hand-written og tags left behind (relative og:image was not usable by WhatsApp).
    expect(src).not.toMatch(/property: "og:/);
    const meta = pageMeta(SHARE_PAGES[key]);
    expect(prop(meta, "og:image")?.content).toMatch(/^https:\/\//);
    expect(prop(meta, "og:title")?.content).toBeTruthy();
  });

  it("the lottery keeps noindex before publication but always carries Open Graph", () => {
    const src = read("src/routes/eventi.lotteria-dello-sport.tsx");
    expect(src).toMatch(/\.\.\.pageMeta\(page\)/);
    expect(src).toMatch(/name: "robots", content: "noindex"/);
  });
});
