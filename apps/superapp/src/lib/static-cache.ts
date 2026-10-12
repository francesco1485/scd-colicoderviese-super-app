/**
 * Cache policy for non-hashed public files served directly by Nitro (launch L1, 2026-10-12).
 *
 * Official media in /media and the PWA icons keep their file names when they are replaced, so they get one day of
 * browser cache plus a week of stale-while-revalidate: repeat visits are instant and a replaced file is picked up
 * in the background. Hashed build files under /assets already carry `max-age=31536000, immutable` from Nitro.
 * The service worker, the web manifest and every page are deliberately NOT listed here.
 */
export const STATIC_MEDIA_CACHE_CONTROL = "public, max-age=86400, stale-while-revalidate=604800";

export const STATIC_CACHE_PATTERNS: readonly string[] = [
  "/media/**",
  "/favicon.png",
  "/apple-touch-icon.png",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable-512.png",
];

export const STATIC_CACHE_RULES: Record<string, { headers: Record<string, string> }> = Object.fromEntries(
  STATIC_CACHE_PATTERNS.map((pattern) => [pattern, { headers: { "cache-control": STATIC_MEDIA_CACHE_CONTROL } }]),
);
