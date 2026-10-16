// Runs after `vite build`: realigns Nitro's public asset sizes with the files on disk (see lib/public-asset-meta.mjs).
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { patchPublicAssetMeta } from "./lib/public-asset-meta.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const serverDir = resolve(root, ".output/server");
const index = resolve(serverDir, "index.mjs");

if (!existsSync(index)) {
  console.log("[public-asset-meta] .output/server/index.mjs not found: nothing to fix");
  process.exit(0);
}

const { source, fixed } = patchPublicAssetMeta(readFileSync(index, "utf8"), (relPath) => {
  const file = resolve(serverDir, relPath);
  if (!existsSync(file)) return null;
  return { buffer: readFileSync(file), mtime: statSync(file).mtime };
});

if (fixed.length > 0) writeFileSync(index, source);
console.log(`[public-asset-meta] ${fixed.length} file(s) realigned${fixed.length ? `: ${fixed.join(", ")}` : ""}`);
