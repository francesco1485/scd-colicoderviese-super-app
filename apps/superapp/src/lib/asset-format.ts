/**
 * Asset format policy (launch L3) — pure helpers over `config/scd-assets.v1.json` → `format_policy`.
 * Marks (crest, federation, sponsor, category badges): SVG when an official vector exists, otherwise the official
 * raster with `RESEARCH_REAL_ASSET`; cut-outs PNG/WebP with alpha; photos WebP/JPG; documents PDF.
 * Nothing here alters an asset: it only reads headers and reports violations.
 */

export type ImageFormat = "png" | "webp" | "jpeg" | "svg" | "pdf" | "unknown";

export interface ImageInfo {
  format: ImageFormat;
  /** True when the file can carry transparency (PNG colour type 4/6 or tRNS, WebP alpha). */
  alpha: boolean;
  /** WebP only: true for VP8L (lossless) bitstreams. */
  lossless: boolean;
}

export interface FormatRule {
  description: string;
  formats: string[];
  preferred?: string;
  raster_requires_vector_status?: string[];
  png_requires_alpha?: boolean;
  new_webp_derivative_encoding?: "lossless";
  alpha_required?: boolean;
  must_not_be_referenced_by_runtime_code?: boolean;
  requires_rendition?: boolean;
}

export interface FormatDebt {
  path: string;
  issue: string;
  reason: string;
  action: string;
}

export interface FormatPolicy {
  version: string;
  never: string[];
  rules: Record<string, FormatRule>;
  class_rules: Record<string, string>;
  runtime_roots: string[];
  runtime_root_file_extensions: string[];
  known_format_debt: FormatDebt[];
}

export interface RegisteredAsset {
  path: string;
  class: string;
  status: string;
  git_blob_sha?: string;
  derived_from?: string;
  transform?: string;
  vector_status?: string;
  rendition?: string;
  copy_of?: string;
}

export interface VectorResearch {
  subject: string;
  raster_paths: string[];
  decision: string;
}

export interface AssetRegistry {
  locked_assets: RegisteredAsset[];
  runtime_assets: RegisteredAsset[];
  vector_research: VectorResearch[];
  format_policy: FormatPolicy;
}

/** Byte at `i`, 0 past the end (keeps header reads total on truncated files). */
const byte = (b: Uint8Array, i: number) => b[i] ?? 0;
const ascii = (b: Uint8Array, from: number, len: number) => String.fromCharCode(...b.subarray(from, from + len));
const u32be = (b: Uint8Array, at: number) => ((byte(b, at) << 24) | (byte(b, at + 1) << 16) | (byte(b, at + 2) << 8) | byte(b, at + 3)) >>> 0;
const u32le = (b: Uint8Array, at: number) => (byte(b, at) | (byte(b, at + 1) << 8) | (byte(b, at + 2) << 16) | (byte(b, at + 3) << 24)) >>> 0;

/** Reads only container headers/chunks: no decoding, no pixel access. */
export function readImageInfo(bytes: Uint8Array): ImageInfo {
  const none: ImageInfo = { format: "unknown", alpha: false, lossless: false };
  if (bytes.length >= 8 && byte(bytes, 0) === 0x89 && ascii(bytes, 1, 3) === "PNG") {
    // IHDR is the first chunk: colour type at offset 25. 4 = grey+alpha, 6 = RGBA.
    const colourType = byte(bytes, 25);
    let alpha = colourType === 4 || colourType === 6;
    let at = 8;
    while (!alpha && at + 8 <= bytes.length) {
      const len = u32be(bytes, at);
      const type = ascii(bytes, at + 4, 4);
      if (type === "tRNS") alpha = true;
      if (type === "IDAT" || type === "IEND") break;
      at += 12 + len;
    }
    return { format: "png", alpha, lossless: true };
  }
  if (bytes.length >= 16 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") {
    let alpha = false;
    let lossless = false;
    let at = 12;
    while (at + 8 <= bytes.length) {
      const type = ascii(bytes, at, 4);
      const len = u32le(bytes, at + 4);
      const data = at + 8;
      if (type === "VP8X" && data < bytes.length) alpha = alpha || (byte(bytes, data) & 0x10) !== 0;
      if (type === "ALPH") alpha = true;
      if (type === "VP8L") {
        lossless = true;
        // 1-byte signature 0x2f, then 14+14 bits of size, then 1 bit alpha_is_used.
        if (data + 4 < bytes.length) alpha = alpha || ((byte(bytes, data + 4) >> 4) & 1) === 1;
      }
      if (type === "VP8 " || type === "VP8L") break;
      at = data + len + (len % 2);
    }
    return { format: "webp", alpha, lossless };
  }
  if (bytes.length >= 3 && byte(bytes, 0) === 0xff && byte(bytes, 1) === 0xd8 && byte(bytes, 2) === 0xff) {
    return { format: "jpeg", alpha: false, lossless: false };
  }
  if (bytes.length >= 5 && ascii(bytes, 0, 5) === "%PDF-") return { format: "pdf", alpha: false, lossless: false };
  const head = new TextDecoder().decode(bytes.subarray(0, 512)).trimStart();
  if (head.startsWith("<svg") || (head.startsWith("<?xml") && head.includes("<svg"))) {
    return { format: "svg", alpha: true, lossless: true };
  }
  return none;
}

export const extensionOf = (path: string) => {
  const ext = path.slice(path.lastIndexOf(".") + 1).toLowerCase();
  return ext === "jpg" ? "jpeg" : ext;
};

const normFormats = (formats: string[]) => formats.map((f) => (f === "jpg" ? "jpeg" : f));

/** Most specific registry entry for a file: exact path first, then the longest folder prefix ending in "/". */
export function entryFor(path: string, entries: RegisteredAsset[]): RegisteredAsset | undefined {
  const exact = entries.find((e) => e.path === path);
  if (exact) return exact;
  return entries
    .filter((e) => e.path.endsWith("/") && path.startsWith(e.path))
    .sort((a, b) => b.path.length - a.path.length)[0];
}

export function ruleFor(entry: RegisteredAsset, policy: FormatPolicy): { name: string; rule: FormatRule } | undefined {
  const name = policy.class_rules[entry.class];
  const rule = name ? policy.rules[name] : undefined;
  return name && rule ? { name, rule } : undefined;
}

const coveredByResearch = (path: string, research: VectorResearch[]) =>
  research.some((r) => r.decision === "RESEARCH_REAL_ASSET" && r.raster_paths.some((p) => p === path || (p.endsWith("/") && path.startsWith(p))));

/**
 * Violations of the format policy for one file. `info` comes from {@link readImageInfo}.
 * Returns human-readable messages; empty means compliant.
 */
export function checkAsset(path: string, info: ImageInfo, registry: AssetRegistry): string[] {
  const policy = registry.format_policy;
  const entry = entryFor(path, [...registry.locked_assets, ...registry.runtime_assets]);
  if (!entry) return [`${path}: not registered in config/scd-assets.v1.json`];
  const resolved = ruleFor(entry, policy);
  if (!resolved) return [`${path}: class ${entry.class} has no format rule`];
  const { name, rule } = resolved;
  const problems: string[] = [];
  const ext = extensionOf(path);
  if (!normFormats(rule.formats).includes(ext)) problems.push(`${path}: .${ext} not allowed for ${name} (${rule.formats.join(", ")})`);
  if (info.format !== "unknown" && info.format !== ext) problems.push(`${path}: extension .${ext} but content is ${info.format}`);
  if (rule.alpha_required && !info.alpha) problems.push(`${path}: ${name} requires an alpha channel`);
  if (rule.png_requires_alpha && info.format === "png" && !info.alpha) problems.push(`${path}: opaque PNG mark, serve WebP instead`);
  if (rule.preferred === "svg" && info.format !== "svg") {
    const status = entry.vector_status;
    const ok = (status && rule.raster_requires_vector_status?.includes(status)) || coveredByResearch(path, registry.vector_research);
    if (!ok) problems.push(`${path}: raster mark without vector_status RESEARCH_REAL_ASSET or a vector_research entry`);
  }
  if (rule.new_webp_derivative_encoding === "lossless" && entry.derived_from && info.format === "webp" && !info.lossless) {
    problems.push(`${path}: derivative of a mark must be lossless WebP`);
  }
  return problems;
}

/** Paths of `/media/...` files referenced in source text (string literals). */
export function mediaReferences(source: string): string[] {
  return [...source.matchAll(/["'`](\/media\/[A-Za-z0-9_./-]+\.[a-z0-9]+)["'`]/g)].map((m) => m[1] as string);
}
