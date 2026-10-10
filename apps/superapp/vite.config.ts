// Standard TanStack Start + Vite config (replaces @lovable.dev/vite-tanstack-config).
// It reproduces the parts of the Lovable wrapper the app relies on in production:
// tailwindcss, tsconfig paths + "@" alias, tanstackStart (with the src/server.ts entry and
// the same import protection), nitro (build only), @vitejs/plugin-react, React/Query dedupe.
// Lovable-only pieces (sandbox detection, HMR gate, preview asset proxy, build diagnostics,
// devtools injection) are intentionally not ported.
//
// Deploy target: nitro preset "vercel" by default (writes .vercel/output).
// Override locally with NITRO_PRESET=node-server (then: node .output/server/index.mjs).
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { VitePWA } from "vite-plugin-pwa";

const NITRO_PRESET = process.env["NITRO_PRESET"] || "vercel";
// Where nitro publishes the client files (the PWA service worker must land there too).
const PUBLIC_OUT_DIR = NITRO_PRESET === "vercel" ? ".vercel/output/static" : ".output/public";

export default defineConfig(({ command }) => ({
  server: { host: "::", port: 8080 },
  resolve: {
    alias: { "@": `${process.cwd()}/src` },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },
  plugins: [
    tailwindcss(),
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      // Same defaults the Lovable wrapper applied.
      importProtection: {
        behavior: "error",
        client: { files: ["**/server/**"], specifiers: ["server-only"] },
      },
      // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
      // nitro/vite builds from this
      server: { entry: "server" },
    }),
    ...(command === "build" ? [nitro({ preset: NITRO_PRESET })] : []),
    viteReact(),
    VitePWA({
      // Update prompt richiesto: l'utente conferma l'aggiornamento.
      registerType: "prompt",
      injectRegister: null,
      devOptions: { enabled: false },
      filename: "sw.js",
      outDir: PUBLIC_OUT_DIR,
      manifest: false, // manifest statico in public/manifest.webmanifest
      includeAssets: ["offline.html", "favicon.png", "icon-512.png"],
      workbox: {
        navigateFallback: null,
        globPatterns: ["**/*.{js,css,png,jpg,svg,woff2}", "offline.html"],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ request, url }) =>
              request.mode === "navigate" && !url.pathname.startsWith("/~oauth"),
            handler: "NetworkFirst",
            options: {
              cacheName: "scd-pages",
              networkTimeoutSeconds: 4,
              precacheFallback: { fallbackURL: "offline.html" },
            },
          },
        ],
      },
    }),
  ],
}));
