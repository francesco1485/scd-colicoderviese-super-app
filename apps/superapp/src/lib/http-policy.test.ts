import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { GEOLOCATION_PREFIXES, MEMBERS_ONLY_PREFIXES, PUBLIC_PREFIXES, SECURITY_HEADERS, assetLinksJson, permissionsPolicyFor, cacheControlFor, configuredSiteUrl, demoRedirect, isProductionEnv, isPublicPath, robotsTxt, sitemapXml } from "./http-policy";

describe("http policy (launch audit 2026-10-12)", () => {
  it("never lets browsers keep private pages or server functions", () => {
    for (const p of ["/famiglia", "/segreteria/certificati", "/direzione/accessi", "/gestionale/mister", "/accedi", "/registrati", "/_serverFn/abc"]) {
      expect(cacheControlFor(p), p).toContain("no-store");
    }
    expect(cacheControlFor("/")).toBe("public, max-age=0, must-revalidate");
    expect(cacheControlFor("/calendario")).toContain("public");
    expect(cacheControlFor("/assets/index-abc.js")).toBeNull();
    expect(isPublicPath("/sponsor")).toBe(true);
    expect(isPublicPath("/sponsorX")).toBe(false);
    // Teams are inside (UD-100): team pages are private and never stored.
    expect(isPublicPath("/squadre")).toBe(false);
    expect(isPublicPath("/squadre/u15")).toBe(false);
    expect(cacheControlFor("/squadre")).toContain("no-store");
    expect(cacheControlFor("/squadre/prima")).toContain("no-store");
    // Training schedules are inside too (UD-100): members only, never stored.
    expect(isPublicPath("/allenamenti")).toBe(false);
    expect(isPublicPath("/allenamenti?annata=2014")).toBe(false);
    expect(cacheControlFor("/allenamenti")).toContain("no-store");
    expect(MEMBERS_ONLY_PREFIXES).toContain("/allenamenti");
    for (const p of MEMBERS_ONLY_PREFIXES) expect(isPublicPath(p), p).toBe(false);
  });

  it("keeps members-only pages out of robots.txt and the sitemap (UD-100)", () => {
    const robots = robotsTxt(true, "https://app.example.it");
    const sitemap = sitemapXml("https://app.example.it");
    for (const p of MEMBERS_ONLY_PREFIXES) {
      expect(robots, p).not.toContain(`Allow: ${p}`);
      expect(sitemap, p).not.toContain(`https://app.example.it${p}<`);
    }
    expect(sitemap).not.toContain("/allenamenti");
    expect(robots).not.toContain("/allenamenti");
    expect(PUBLIC_PREFIXES).not.toContain("/allenamenti");
  });

  it("keeps the offline worker list equal to the public list", () => {
    const vite = readFileSync(fileURLToPath(new URL("../../vite.config.ts", import.meta.url)), "utf8");
    const m = /\[("\/calendario"[^\]]+)\]\.some/.exec(vite);
    expect(m).not.toBeNull();
    const list = (m?.[1] ?? "").match(/"([^"]+)"/g)?.map((x) => x.slice(1, -1)) ?? [];
    expect(list).toEqual([...PUBLIC_PREFIXES]);
  });

  it("keeps the account deletion page public, offline-ready and in the sitemap (Play / App Store 5.1.1(v))", () => {
    expect(PUBLIC_PREFIXES).toContain("/elimina-account");
    expect(isPublicPath("/elimina-account")).toBe(true);
    expect(cacheControlFor("/elimina-account")).toBe("public, max-age=0, must-revalidate");
    expect(sitemapXml("https://app.example.it")).toContain("<loc>https://app.example.it/elimina-account</loc>");
    expect(robotsTxt(true, "https://app.example.it")).toContain("Allow: /elimina-account");
  });

  it("allows geolocation only on the Pulmino in diretta driver page (r110)", () => {
    expect(SECURITY_HEADERS["permissions-policy"]).toContain("geolocation=()");
    expect(GEOLOCATION_PREFIXES).toEqual(["/pulmini"]);
    expect(permissionsPolicyFor("/pulmini")).toContain("geolocation=(self)");
    expect(permissionsPolicyFor("/pulmini")).toContain("camera=()");
    expect(permissionsPolicyFor("/pulmini")).toContain("microphone=()");
    for (const p of ["/", "/famiglia", "/pulminixyz", "/calendario", "/_serverFn/abc", "/gestionale"]) {
      expect(permissionsPolicyFor(p)).toContain("geolocation=()");
      expect(permissionsPolicyFor(p)).not.toContain("geolocation=(self)");
    }
    expect(isPublicPath("/pulmini")).toBe(false);
    expect(cacheControlFor("/pulmini")).toBe("private, no-store, max-age=0");
  });

  it("sends the security headers", () => {
    expect(SECURITY_HEADERS["x-frame-options"]).toBe("DENY");
    expect(SECURITY_HEADERS["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(SECURITY_HEADERS["strict-transport-security"]).toContain("max-age=");
  });

  it("treats only an explicit production env as production and keeps staging out of search engines", () => {
    expect(isProductionEnv({})).toBe(false);
    expect(isProductionEnv({ SCD_ENV: "production" })).toBe(true);
    expect(isProductionEnv({ SCD_ENV: "production", SCD_STAGING_GATEWAY: "1" })).toBe(false);
    expect(robotsTxt(false, null)).toBe("User-agent: *\nDisallow: /\n");
    const prod = robotsTxt(true, "https://app.example.it");
    expect(prod).toContain("Allow: /calendario");
    expect(prod).toContain("Disallow: /");
    expect(prod).toContain("Sitemap: https://app.example.it/sitemap.xml");
    expect(sitemapXml("https://app.example.it/")).toContain("<loc>https://app.example.it/sponsor</loc>");
    expect(sitemapXml("https://app.example.it/")).not.toContain("/squadre");
    expect(prod).not.toContain("Allow: /squadre");
  });

  it("validates the configured site URL and hides demo screens only in production", () => {
    expect(configuredSiteUrl({ SCD_SITE_URL: "https://app.example.it/" })).toBe("https://app.example.it");
    expect(configuredSiteUrl({ SCD_SITE_URL: "http://app.example.it" })).toBeNull();
    expect(configuredSiteUrl({ SCD_SITE_URL: "https://evil.example/path" })).toBeNull();
    expect(demoRedirect("/core/famiglia", true)).toBe("/aree");
    // /grow is the gated GROW hub (same access as /crm), no longer a demo screen.
    expect(demoRedirect("/grow", true)).toBeNull();
    expect(demoRedirect("/shop", true)).toBe("/sponsor");
    expect(demoRedirect("/shop", false)).toBeNull();
    expect(demoRedirect("/core", false)).toBeNull();
    expect(demoRedirect("/calendario", true)).toBeNull();
  });
});

const FP = Array.from({ length: 32 }, (_, i) => i.toString(16).padStart(2, "0").toUpperCase()).join(":");

describe("store readiness (UD-071)", () => {
  it("serves asset links only with a valid package and fingerprint", () => {
    expect(assetLinksJson({})).toBeNull();
    expect(assetLinksJson({ SCD_ANDROID_PACKAGE: "it.colicoderviese.app" })).toBeNull();
    expect(assetLinksJson({ SCD_ANDROID_PACKAGE: "Not A Package", SCD_ANDROID_SHA256: FP })).toBeNull();
    expect(assetLinksJson({ SCD_ANDROID_PACKAGE: "it.colicoderviese.app", SCD_ANDROID_SHA256: "AB:CD" })).toBeNull();
    const json = JSON.parse(assetLinksJson({ SCD_ANDROID_PACKAGE: "it.colicoderviese.app", SCD_ANDROID_SHA256: ` ${FP.toLowerCase()} ` }) ?? "null");
    expect(json[0].target).toEqual({ namespace: "android_app", package_name: "it.colicoderviese.app", sha256_cert_fingerprints: [FP] });
    expect(json[0].relation).toEqual(["delegate_permission/common.handle_all_urls"]);
  });

  it("manifest icons exist with the declared pixel sizes (stores reject mismatches)", () => {
    const root = fileURLToPath(new URL("../../public/", import.meta.url));
    const manifest = JSON.parse(readFileSync(`${root}manifest.webmanifest`, "utf8")) as { icons: { src: string; sizes: string; purpose: string }[]; theme_color: string };
    expect(manifest.icons.map((i) => i.purpose).sort()).toEqual(["any", "any", "maskable"]);
    for (const icon of [...manifest.icons, { src: "/apple-touch-icon.png", sizes: "180x180", purpose: "apple" }]) {
      const png = readFileSync(`${root}${icon.src.slice(1)}`);
      expect(png.subarray(1, 4).toString("ascii")).toBe("PNG");
      const size = `${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`;
      expect(size, icon.src).toBe(icon.sizes);
    }
    expect(manifest.theme_color).toBe("#062a52");
  });

  it("keeps the Fondo Solidale page private: it renders the signed-in parent's children", () => {
    expect(isPublicPath("/sostieni/fondo-solidale")).toBe(false);
    expect(cacheControlFor("/sostieni/fondo-solidale")).toBe("private, no-store, max-age=0");
    expect(isPublicPath("/entra")).toBe(true);
  });
});
