// SCD Super App — Vite config without Lovable-specific tooling.
// Replicates the plugin chain previously provided by @lovable.dev/vite-tanstack-config:
// tailwind -> tsconfig paths -> TanStack Start -> nitro (build only) -> React, plus the PWA plugin.
// Nitro picks its deploy preset from the environment (NITRO_PRESET); default is node-server,
// which is what Render runs with `node .output/server/index.mjs`.
import { defineConfig, mergeConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import viteReact from "@vitejs/plugin-react";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(async ({ command }) => {
  const plugins = [
    tailwindcss(),
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart(
      mergeConfig(
        {
          importProtection: {
            behavior: "error",
            client: { files: ["**/server/**"], specifiers: ["server-only"] },
          },
        },
        {
          // SSR error wrapper lives in src/server.ts
          server: { entry: "server" },
        },
      ),
    ),
  ];

  if (command === "build") {
    const { nitro } = await import("nitro/vite");
    plugins.push(nitro({ preset: process.env["NITRO_PRESET"] || "node-server" }));
  }

  plugins.push(
    viteReact(),
    VitePWA({
      // Update prompt: the user confirms the update.
      registerType: "prompt",
      injectRegister: null,
      devOptions: { enabled: false },
      filename: "sw.js",
      // nitro writes the client bundle to .output/public: precache from there
      outDir: ".output/public",
      manifest: false, // static manifest in public/manifest.webmanifest
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
  );

  return {
    plugins,
    resolve: {
      dedupe: ["react", "react-dom", "@tanstack/react-router", "@tanstack/react-start"],
    },
  };
});
