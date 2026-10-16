import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { PUBLIC_PREFIXES } from "./http-policy";
import {
  PUBLIC_PAGES,
  SHARE_PAGES,
  canonicalUrl,
  pageHead,
  type MetaEntry,
  type PageMetaInput,
} from "./share";

/**
 * B8 — link previews. Every public page owned by the cloud lane has its own title, description, og:image (official crest
 * or official poster) and a canonical link on the official origin; no public page falls back to the generic title of
 * __root.tsx.
 */

const APP = resolve(__dirname, "../..");
const read = (p: string) => readFileSync(resolve(APP, p), "utf8");

const ROOT_TITLE = "S.C.D. ColicoDerviese — Super App";

/** Route file → registry entry used by its head(). */
const ROUTE_HEADS: ReadonlyArray<{ file: string; ref: string; page: PageMetaInput }> = [
  { file: "src/routes/index.tsx", ref: "PUBLIC_PAGES.home", page: PUBLIC_PAGES.home },
  { file: "src/routes/calendario.tsx", ref: "PUBLIC_PAGES.calendario", page: PUBLIC_PAGES.calendario },
  { file: "src/routes/eventi.index.tsx", ref: "PUBLIC_PAGES.eventi", page: PUBLIC_PAGES.eventi },
  {
    file: "src/routes/eventi.lezioni-tecnico-coordinative.tsx",
    ref: "PUBLIC_PAGES.lezioniTecnicoCoordinative",
    page: PUBLIC_PAGES.lezioniTecnicoCoordinative,
  },
  { file: "src/routes/impianti.tsx", ref: "PUBLIC_PAGES.impianti", page: PUBLIC_PAGES.impianti },
  { file: "src/routes/societa.tsx", ref: "PUBLIC_PAGES.societa", page: PUBLIC_PAGES.societa },
  { file: "src/routes/kit.tsx", ref: "PUBLIC_PAGES.kit", page: PUBLIC_PAGES.kit },
  { file: "src/routes/community.tsx", ref: "PUBLIC_PAGES.community", page: PUBLIC_PAGES.community },
  { file: "src/routes/comunicazioni.tsx", ref: "PUBLIC_PAGES.comunicazioni", page: PUBLIC_PAGES.comunicazioni },
  { file: "src/routes/top11.tsx", ref: "PUBLIC_PAGES.top11", page: PUBLIC_PAGES.top11 },
  { file: "src/routes/rassegna-stampa.tsx", ref: "PUBLIC_PAGES.rassegnaStampa", page: PUBLIC_PAGES.rassegnaStampa },
  { file: "src/routes/fantacalcio.tsx", ref: "PUBLIC_PAGES.fantacalcio", page: PUBLIC_PAGES.fantacalcio },
  { file: "src/routes/guida.tsx", ref: "PUBLIC_PAGES.guida", page: PUBLIC_PAGES.guida },
  { file: "src/routes/card.index.tsx", ref: "PUBLIC_PAGES.card", page: PUBLIC_PAGES.card },
  { file: "src/routes/fornitori.tsx", ref: "PUBLIC_PAGES.fornitori", page: PUBLIC_PAGES.fornitori },
  { file: "src/routes/sponsor.tsx", ref: "SHARE_PAGES.sponsor", page: SHARE_PAGES.sponsor },
  { file: "src/routes/sostieni.index.tsx", ref: "SHARE_PAGES.sostieni", page: SHARE_PAGES.sostieni },
  { file: "src/routes/sostieni.dona-materiale.tsx", ref: "SHARE_PAGES.donaMateriale", page: SHARE_PAGES.donaMateriale },
  { file: "src/routes/sostieni.fondo-solidale.tsx", ref: "SHARE_PAGES.fondoSolidale", page: SHARE_PAGES.fondoSolidale },
  { file: "src/routes/sostieni.proponi.tsx", ref: "SHARE_PAGES.proponi", page: SHARE_PAGES.proponi },
  { file: "src/routes/tornei.tsx", ref: "SHARE_PAGES.tornei", page: SHARE_PAGES.tornei },
  {
    file: "src/routes/eventi.christmas-lario-cup.tsx",
    ref: "SHARE_PAGES.christmasLarioCup",
    page: SHARE_PAGES.christmasLarioCup,
  },
];

/** Dynamic public routes that build their page from loader data (still through pageHead). */
const DYNAMIC_HEADS = ["src/routes/card.$tipo.tsx", "src/routes/eventi.lotteria-dello-sport.tsx"];

/**
 * Public prefixes whose head() is owned elsewhere (PC chat: access, contacts, install, privacy and safeguarding,
 * AGENTS.md SCD:SESSIONI) — they keep their own title and description and are not touched by the cloud lane.
 */
const PUBLIC_META_ELSEWHERE: Readonly<Record<string, string>> = {
  "/contatti": "PC chat (centralino)",
  "/elimina-account": "PC chat (account)",
  "/entra": "PC chat (iscrizione)",
  "/installa": "PC chat (store e /installa)",
  "/partner": "PC chat (schermata di accesso)",
  "/privacy": "PC chat (informativa)",
  "/safeguarding": "safeguarding: mai toccato nei flussi ordinari",
};

const entry = (meta: MetaEntry[], key: string) =>
  meta.find((m) => ("property" in m && m.property === key) || ("name" in m && m.name === key)) as
    | { content: string }
    | undefined;
const titleOf = (meta: MetaEntry[]) => (meta.find((m) => "title" in m) as { title: string } | undefined)?.title;

describe("B8 public link previews", () => {
  it.each(ROUTE_HEADS.map((r) => [r.file, r] as const))("%s uses its own pageHead()", (_file, r) => {
    const src = read(r.file);
    expect(src).toMatch(/pageHead\(/);
    expect(src).toContain(r.ref);
    expect(src).not.toMatch(/meta:\s*\[\s*\{\s*title:/); // no hand-written head meta left beside the registry
  });

  it.each(DYNAMIC_HEADS)("%s builds its head with pageHead()", (file) => {
    expect(read(file)).toMatch(/pageHead\(/);
  });

  it.each(ROUTE_HEADS.map((r) => [r.page.path, r.page] as const))(
    "%s: title, description, og:image, canonical, never the generic root title",
    (_path, page) => {
      const head = pageHead(page);
      const title = titleOf(head.meta);
      expect(title && title.trim().length).toBeTruthy();
      expect(title).not.toBe(ROOT_TITLE);
      expect(entry(head.meta, "og:title")?.content).not.toBe(ROOT_TITLE);
      expect(entry(head.meta, "description")?.content.length).toBeGreaterThan(40);
      const img = entry(head.meta, "og:image")?.content ?? "";
      expect(img.startsWith("https://app.colicoderviese.it/")).toBe(true);
      expect(existsSync(resolve(APP, "public", `.${new URL(img).pathname}`))).toBe(true);
      expect(entry(head.meta, "og:url")?.content).toBe(canonicalUrl(page.path));
      const canonical = head.links.filter((l) => l.rel === "canonical");
      expect(canonical).toHaveLength(1);
      expect(canonical[0]?.href).toBe(canonicalUrl(page.path));
    },
  );

  it("no two public pages share a title or a canonical address", () => {
    const titles = ROUTE_HEADS.map((r) => r.page.title);
    expect(new Set(titles).size).toBe(titles.length);
    const urls = ROUTE_HEADS.map((r) => canonicalUrl(r.page.path));
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("every public prefix is covered or explicitly owned elsewhere", () => {
    const covered = new Set(ROUTE_HEADS.map((r) => r.page.path));
    for (const prefix of PUBLIC_PREFIXES) {
      expect(covered.has(prefix) || prefix in PUBLIC_META_ELSEWHERE, prefix).toBe(true);
    }
    expect(covered.has("/")).toBe(true);
  });

  it("the root keeps no canonical link (links of child routes are concatenated, not replaced)", () => {
    expect(read("src/routes/__root.tsx")).not.toMatch(/canonical/);
  });
});

describe("canonicalUrl", () => {
  it("keeps only the path on the official origin", () => {
    expect(canonicalUrl("/")).toBe("https://app.colicoderviese.it/");
    expect(canonicalUrl("/eventi/christmas-lario-cup?lang=de")).toBe(
      "https://app.colicoderviese.it/eventi/christmas-lario-cup",
    );
    expect(canonicalUrl("/tornei#christmas")).toBe("https://app.colicoderviese.it/tornei");
    expect(canonicalUrl("/calendario/")).toBe("https://app.colicoderviese.it/calendario");
    expect(canonicalUrl("kit")).toBe("https://app.colicoderviese.it/kit");
    expect(canonicalUrl("/sponsor", "https://scd-superapp-staging.onrender.com/x")).toBe(
      "https://scd-superapp-staging.onrender.com/sponsor",
    );
  });
});

describe("pageHead options", () => {
  it("a noindex page declares no canonical link", () => {
    const head = pageHead(PUBLIC_PAGES.card, { extraMeta: [{ name: "robots", content: "noindex" }], canonical: false });
    expect(head.links.filter((l) => l.rel === "canonical")).toHaveLength(0);
    expect(head.meta).toContainEqual({ name: "robots", content: "noindex" });
  });

  it("a language variant is its own canonical and og:url", () => {
    const href = "https://app.colicoderviese.it/eventi/christmas-lario-cup?lang=de";
    const head = pageHead(SHARE_PAGES.christmasLarioCup, { canonical: href });
    expect(head.links).toContainEqual({ rel: "canonical", href });
    expect(entry(head.meta, "og:url")?.content).toBe(href);
    expect(read("src/routes/eventi.christmas-lario-cup.tsx")).toMatch(/canonical: match\.search\.lang \?/);
  });

  it("appends extra meta and links after the canonical", () => {
    const head = pageHead(PUBLIC_PAGES.kit, {
      extraMeta: [{ name: "robots", content: "noindex" }],
      extraLinks: [{ rel: "alternate", hrefLang: "de", href: "https://app.colicoderviese.it/kit?lang=de" }],
    });
    expect(head.meta).toContainEqual({ name: "robots", content: "noindex" });
    expect(head.links[0]).toEqual({ rel: "canonical", href: "https://app.colicoderviese.it/kit" });
    expect(head.links[1]?.rel).toBe("alternate");
  });
});
