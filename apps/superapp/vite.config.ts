// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// Super App: the Nitro target is set explicitly to a Node server (the Lovable default is
// cloudflare-module). Override with NITRO_PRESET=<preset> if another runtime is chosen.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

const NITRO_PRESET = process.env["NITRO_PRESET"] || "node-server";

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
  nitro: {
    preset: NITRO_PRESET,
  },
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
        includeAssets: ["offline.html", "favicon.png", "icon-512.png"],
        workbox: {
          navigateFallback: null,
          globPatterns: ["**/*.{js,css,png,jpg,svg,woff2}", "offline.html"],
          // Le immagini grandi in /media (loghi categoria) restano fuori dal precache.
          globIgnores: ["media/**"],
          maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
          cleanupOutdatedCaches: true,
          runtimeCaching: [
            {
              urlPattern: ({ request, url }) =>
                request.mode === "navigate" && !url.pathname.startsWith("/~oauth"),
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
