import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import crest from "@/assets/brand/logo-scd.png.asset.json";
import { STATIC_CACHE_PATTERNS, STATIC_CACHE_RULES, STATIC_MEDIA_CACHE_CONTROL } from "./static-cache";

const APP = resolve(__dirname, "../..");
const REPO = resolve(APP, "../..");

function gitBlobSha(path: string): string {
  const body = readFileSync(path);
  return createHash("sha1").update(Buffer.concat([Buffer.from(`blob ${body.length}\0`), body])).digest("hex");
}

describe("launch L1 · static cache rules", () => {
  it("cache official media and PWA icons for a day with background revalidation", () => {
    expect(STATIC_MEDIA_CACHE_CONTROL).toBe("public, max-age=86400, stale-while-revalidate=604800");
    expect(STATIC_CACHE_PATTERNS).toContain("/media/**");
    for (const p of STATIC_CACHE_PATTERNS) expect(STATIC_CACHE_RULES[p]?.headers["cache-control"]).toBe(STATIC_MEDIA_CACHE_CONTROL);
  });

  it("never cache pages, server functions, the service worker or the manifest", () => {
    const keys = Object.keys(STATIC_CACHE_RULES);
    for (const forbidden of ["/**", "/", "/_serverFn/**", "/sw.js", "/manifest.webmanifest", "/accedi", "/famiglia"]) {
      expect(keys).not.toContain(forbidden);
    }
    expect(keys.every((k) => k.startsWith("/media/") || /^\/[a-z0-9-]+\.png$/.test(k))).toBe(true);
  });
});

describe("launch L1 · self-hosted fonts", () => {
  const css = readFileSync(resolve(APP, "src/styles.css"), "utf8");
  const root = readFileSync(resolve(APP, "src/routes/__root.tsx"), "utf8");

  it("no longer loads Google Fonts from the page head", () => {
    expect(root).not.toMatch(/fonts\.googleapis\.com|fonts\.gstatic\.com/);
  });

  it("imports every family the design tokens name", () => {
    for (const pkg of ["fira-sans", "fira-sans-condensed", "anton", "big-shoulders-display", "barlow", "kaushan-script"]) {
      expect(css).toContain(`@import "@fontsource/${pkg}/latin-`);
    }
  });
});

describe("launch L1 · runtime crest", () => {
  const registry = JSON.parse(readFileSync(resolve(REPO, "config/scd-assets.v1.json"), "utf8")) as {
    locked_assets: { path: string; git_blob_sha: string; derived_from?: string }[];
  };

  it("serves the registered lossless WebP of the official crest", () => {
    expect(crest.url).toBe("/media/brand/logo-scd.webp");
    const file = resolve(APP, "public", crest.url.slice(1));
    expect(existsSync(file)).toBe(true);
    const entry = registry.locked_assets.find((a) => a.path === "apps/superapp/public/media/brand/logo-scd.webp");
    expect(entry?.derived_from).toBe("assets/logo-scd.png");
    expect(gitBlobSha(file)).toBe(entry?.git_blob_sha);
  });

  it("keeps the official PNG next to it, unchanged", () => {
    const official = registry.locked_assets.find((a) => a.path === "assets/logo-scd.png");
    expect(gitBlobSha(resolve(APP, "public/media/brand/logo-scd.png"))).toBe(official?.git_blob_sha);
  });
});
