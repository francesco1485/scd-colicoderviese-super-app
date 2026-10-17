// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// Super App: the Nitro target is set explicitly to a Node server (the Lovable default is
// cloudflare-module). Override with NITRO_PRESET=<preset> if another runtime is chosen.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";
import { STATIC_CACHE_RULES } from "./src/lib/static-cache";

const NITRO_PRESET = process.env["NITRO_PRESET"] || "node-server";

/**
 * Nitro options. Launch L1 (2026-10-12): non-hashed public files (official media, PWA icons) get a short browser
 * cache with background revalidation, so repeat visits stop re-downloading images; hashed /assets keep Nitro's
 * immutable year. Declared as a variable because the Lovable config type lists only some Nitro keys; Nitro
 * receives the whole object (checked on the built server: /media responses carry the header).
 */
const NITRO_OPTIONS = { preset: NITRO_PRESET, routeRules: STATIC_CACHE_RULES };

/** Visible build stamp ("versione del 11/10 11:55 · abc1234") so reviewers know which deploy they see. */
const BUILD_STAMP = (() => {
  const when = new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date()).replace(",", "");
  const sha = (process.env["RENDER_GIT_COMMIT"] || process.env["GITHUB_SHA"] || "").slice(0, 7);
  return sha ? `${when} · ${sha}` : when;
})();

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  nitro: NITRO_OPTIONS,
  vite: {
    define: { __SCD_BUILD__: JSON.stringify(BUILD_STAMP) },
    plugins: [
      VitePWA({
        // Update prompt richiesto: l'utente conferma l'aggiornamento.
        registerType: "prompt",
        injectRegister: null,
        devOptions: { enabled: false },
        filename: "sw.js",
        // Node server: i file statici serviti da Nitro stanno in .output/public (sw.js incluso).
        ...(NITRO_PRESET === "node-server" ? { outDir: ".output/public" } : {}),
        manifest: false, // manifest statico in public/manifest.webmanifest
        includeAssets: ["offline.html", "favicon.png", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png"],
        workbox: {
          navigateFallback: null,
          globPatterns: ["**/*.{js,css,png,jpg,svg,woff2}", "offline.html"],
          // Le immagini grandi in /media (loghi categoria) e i font (cache HTTP immutabile) restano fuori dal precache.
          globIgnores: ["media/**", "**/*.woff", "**/*.woff2"],
          maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
          cleanupOutdatedCaches: true,
          runtimeCaching: [
            {
              // Only public pages are kept offline: private pages carry personal data (audit 2026-10-12).
              // Inlined on purpose: workbox serialises this function into sw.js, imports would not exist there.
              // Keep the list equal to PUBLIC_PREFIXES in src/lib/http-policy.ts (checked by a test).
              urlPattern: ({ request, url }) =>
                request.mode === "navigate" &&
                (url.pathname === "/" ||
                  ["/calendario", "/card", "/classifiche", "/community", "/comunicazioni", "/contatti", "/elimina-account", "/entra", "/eventi", "/fantacalcio", "/fornitori", "/guida", "/impianti", "/installa", "/kit", "/partner", "/privacy", "/rassegna-stampa", "/safeguarding", "/societa", "/sponsor", "/top11", "/tornei", "/vetta-legnone"].some(
                    (p) => url.pathname === p || url.pathname.startsWith(p + "/"),
                  )),
              handler: "NetworkFirst",
              options: {
                cacheName: "scd-pages",
                networkTimeoutSeconds: 10,
                precacheFallback: { fallbackURL: "offline.html" },
              },
            },
          ],
        },
      }),
    ],
  },
});
