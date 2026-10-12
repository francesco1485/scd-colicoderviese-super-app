/**
 * HTTP policy applied by src/server.ts to every response (launch audit 2026-10-12).
 * - private pages and server functions are never stored by browsers or the offline worker (no-store);
 * - standard security headers on every response;
 * - /healthz and /robots.txt answered here.
 * Pure functions so they can be tested.
 */

/** Pages anyone may see without signing in (and that may be cached by the offline worker). */
export const PUBLIC_PREFIXES: readonly string[] = [
  "/allenamenti",
  "/calendario",
  "/community",
  "/comunicazioni",
  "/contatti",
  "/eventi",
  "/fornitori",
  "/guida",
  "/impianti",
  "/installa",
  "/partner",
  "/privacy",
  "/safeguarding",
  "/shop",
  "/societa",
  "/sponsor",
  "/squadre",
];

export function isPublicPath(pathname: string): boolean {
  if (pathname === "/" || pathname === "") return true;
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Static build assets (hashed file names) keep their own caching. */
export function isStaticAsset(pathname: string): boolean {
  return /^\/(assets|media)\//.test(pathname) || /\.(js|css|png|jpe?g|webp|svg|ico|woff2?|webmanifest|json|txt|xml)$/.test(pathname);
}

/**
 * Cache-Control for a dynamic response, or null to leave it untouched.
 * Server functions and every non-public page: private, no-store.
 */
export function cacheControlFor(pathname: string): string | null {
  if (pathname.startsWith("/_serverFn")) return "private, no-store, max-age=0";
  if (isStaticAsset(pathname)) return null;
  if (isPublicPath(pathname)) return "public, max-age=0, must-revalidate";
  return "private, no-store, max-age=0";
}

export const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  "strict-transport-security": "max-age=31536000; includeSubDomains",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "same-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  "content-security-policy": "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'",
  "cross-origin-opener-policy": "same-origin",
};

export function isProductionEnv(env: Readonly<Record<string, string | undefined>>): boolean {
  return (env["SCD_ENV"] ?? "").toLowerCase() === "production" && env["SCD_STAGING_GATEWAY"] !== "1";
}

/** robots.txt: staging is never indexed; production exposes only the public pages. */
export function robotsTxt(production: boolean, siteUrl: string | null): string {
  if (!production) return "User-agent: *\nDisallow: /\n";
  const lines = ["User-agent: *", "Allow: /$", ...PUBLIC_PREFIXES.map((p) => `Allow: ${p}`), "Disallow: /"];
  if (siteUrl) lines.push("", `Sitemap: ${siteUrl.replace(/\/$/, "")}/sitemap.xml`);
  return `${lines.join("\n")}\n`;
}

export function sitemapXml(siteUrl: string): string {
  const base = siteUrl.replace(/\/$/, "");
  const urls = ["/", ...PUBLIC_PREFIXES.filter((p) => p !== "/privacy")].map((p) => `  <url><loc>${base}${p === "/" ? "/" : p}</loc></url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
}

/** Configured public URL of this deployment (SCD_SITE_URL), validated; null when missing or invalid. */
export function configuredSiteUrl(env: Readonly<Record<string, string | undefined>>): string | null {
  const v = (env["SCD_SITE_URL"] ?? "").trim().replace(/\/$/, "");
  return /^https:\/\/[a-z0-9.-]+(:\d+)?$/i.test(v) ? v : null;
}

/**
 * Demo screens (demo data, "Paga ora", old e-mail + PIN wording) are not part of the launch:
 * in production they redirect to the real pages (audit 2026-10-12). Staging keeps them for comparison.
 */
export function demoRedirect(pathname: string, production: boolean): string | null {
  if (!production) return null;
  if (pathname === "/core" || pathname.startsWith("/core/")) return "/aree";
  if (pathname === "/grow" || pathname.startsWith("/grow/")) return "/sponsor";
  return null;
}

/**
 * Digital Asset Links for the future Play Store app (Trusted Web Activity wrapping this PWA).
 * Served only when the Direzione has set SCD_ANDROID_PACKAGE (e.g. it.colicoderviese.app) and
 * SCD_ANDROID_SHA256 (one or more comma-separated signing-certificate fingerprints, AA:BB:... format).
 * Returns null when not configured or invalid, so the route answers 404 instead of a wrong claim.
 */
const ANDROID_PACKAGE_RE = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;
const SHA256_FINGERPRINT_RE = /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/;

export function assetLinksJson(env: Readonly<Record<string, string | undefined>>): string | null {
  const pkg = env["SCD_ANDROID_PACKAGE"]?.trim();
  const raw = env["SCD_ANDROID_SHA256"]?.trim();
  if (!pkg || !raw || !ANDROID_PACKAGE_RE.test(pkg)) return null;
  const fingerprints = raw.split(",").map((f) => f.trim().toUpperCase()).filter(Boolean);
  if (fingerprints.length === 0 || !fingerprints.every((f) => SHA256_FINGERPRINT_RE.test(f))) return null;
  return JSON.stringify([
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: { namespace: "android_app", package_name: pkg, sha256_cert_fingerprints: fingerprints },
    },
  ]);
}
