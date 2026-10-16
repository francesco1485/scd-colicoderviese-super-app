/**
 * Nitro (node-server preset) records size and etag of every public file in .output/server/index.mjs while it builds,
 * and serves each file with that recorded Content-Length. vite-plugin-pwa writes .output/public/sw.js again after
 * that snapshot (it adds the precache list), so the recorded size was smaller than the real file and browsers got a
 * truncated sw.js: "ServiceWorker script evaluation failed", no offline copy and no "Installa app" prompt
 * (found live on 17/10/2026: 23436 of 23956 bytes served).
 *
 * patchPublicAssetMeta() rewrites size, etag and mtime of every entry whose file on disk no longer matches, using the
 * same etag format as Nitro: "<size in hex>-<sha1 base64, 27 chars>".
 */
import { createHash } from "node:crypto";

/** Nitro etag for a file content. */
export function nitroEtag(buffer) {
  const hash = createHash("sha1").update(buffer).digest("base64").slice(0, 27);
  return `"${buffer.length.toString(16)}-${hash}"`;
}

const ENTRY = /("(\/[^"]+)": \{\s*"type": "[^"]*",\s*"etag": )"\\"[^"]*\\""(,\s*"mtime": )"[^"]*"(,\s*"size": )(\d+)(,\s*"path": "([^"]+)")/g;

/**
 * @param {string} source content of .output/server/index.mjs
 * @param {(relPath: string) => { buffer: Buffer, mtime: Date } | null} readFile reads a public file by the "path" of the entry
 * @returns {{ source: string, fixed: string[] }}
 */
export function patchPublicAssetMeta(source, readFile) {
  const fixed = [];
  const out = source.replace(ENTRY, (all, head, route, mtimeKey, sizeKey, size, pathPart, relPath) => {
    const file = readFile(relPath);
    if (!file || file.buffer.length === Number(size)) return all;
    fixed.push(`${route} ${size} -> ${file.buffer.length}`);
    const etag = JSON.stringify(nitroEtag(file.buffer));
    return `${head}${etag}${mtimeKey}"${file.mtime.toISOString()}"${sizeKey}${file.buffer.length}${pathPart}`;
  });
  return { source: out, fixed };
}
