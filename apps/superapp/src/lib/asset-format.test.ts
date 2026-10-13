import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { checkAsset, entryFor, mediaReferences, readImageInfo, ruleFor, type AssetRegistry } from "./asset-format";
import { logoFor } from "@/features/impianti/snapshot";

const APP = resolve(__dirname, "../..");
const REPO = resolve(APP, "../..");
const registry = JSON.parse(readFileSync(resolve(REPO, "config/scd-assets.v1.json"), "utf8")) as AssetRegistry;
const policy = registry.format_policy;
const read = (repoPath: string) => new Uint8Array(readFileSync(resolve(REPO, repoPath)));
const gitBlobSha = (repoPath: string) => execFileSync("git", ["hash-object", resolve(REPO, repoPath)], { encoding: "utf8" }).trim();

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

/** Every image/document the super app serves from public/ (repo-relative). */
const runtimeFiles = (() => {
  const exts = new Set(policy.runtime_root_file_extensions);
  return walk(resolve(APP, "public"))
    .map((f) => relative(REPO, f).split("\\").join("/"))
    .filter((f) => exts.has(f.slice(f.lastIndexOf(".") + 1).toLowerCase()))
    .filter((f) => policy.runtime_roots.some((root) => f.startsWith(root)));
})();

const sourceFiles = walk(resolve(APP, "src")).filter((f) => /\.(tsx?|css|json)$/.test(f) && !/\.test\.tsx?$/.test(f));

describe("L3 · image header reader", () => {
  const png = (colourType: number, extra: number[] = []) =>
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 0, 0, 0, 1, 0, 0, 0, 1, 8, colourType, 0, 0, 0, 0, 0, 0, 0, ...extra]);
  const riff = (chunks: number[]) => {
    const body = [0x57, 0x45, 0x42, 0x50, ...chunks];
    const n = body.length;
    return new Uint8Array([0x52, 0x49, 0x46, 0x46, n & 255, (n >> 8) & 255, 0, 0, ...body]);
  };
  const chunk = (type: string, data: number[]) => [...type].map((c) => c.charCodeAt(0)).concat([data.length, 0, 0, 0], data, data.length % 2 ? [0] : []);

  it("reads PNG alpha from the colour type and tRNS", () => {
    expect(readImageInfo(png(6))).toEqual({ format: "png", alpha: true, lossless: true });
    expect(readImageInfo(png(2)).alpha).toBe(false);
    const trns = [0, 0, 0, 2, 0x74, 0x52, 0x4e, 0x53, 0, 0, 0, 0, 0, 0];
    expect(readImageInfo(png(3, trns)).alpha).toBe(true);
  });

  it("reads WebP lossless/lossy and alpha flags", () => {
    expect(readImageInfo(riff(chunk("VP8L", [0x2f, 0, 0, 0, 0x10])))).toEqual({ format: "webp", alpha: true, lossless: true });
    expect(readImageInfo(riff(chunk("VP8L", [0x2f, 0, 0, 0, 0x00])))).toEqual({ format: "webp", alpha: false, lossless: true });
    expect(readImageInfo(riff(chunk("VP8 ", [0, 0, 0, 0])))).toEqual({ format: "webp", alpha: false, lossless: false });
    expect(readImageInfo(riff([...chunk("VP8X", [0x10, 0, 0, 0, 0, 0, 0, 0, 0, 0]), ...chunk("VP8 ", [0, 0])])).alpha).toBe(true);
  });

  it("recognises JPEG, PDF and SVG", () => {
    expect(readImageInfo(new Uint8Array([0xff, 0xd8, 0xff, 0xe0])).format).toBe("jpeg");
    expect(readImageInfo(new TextEncoder().encode("%PDF-1.7")).format).toBe("pdf");
    expect(readImageInfo(new TextEncoder().encode('<?xml version="1.0"?><svg/>')).format).toBe("svg");
    expect(readImageInfo(new Uint8Array([1, 2, 3])).format).toBe("unknown");
  });
});

describe("L3 · format policy contract", () => {
  it("states the never-rules: no regeneration, no tracing, no lossy re-encode of marks", () => {
    const text = policy.never.join(" ");
    expect(text).toMatch(/regenerate/);
    expect(text).toMatch(/vectorize/);
    expect(text).toMatch(/lossy/);
  });

  it("maps every registered class to an existing rule", () => {
    for (const e of [...registry.locked_assets, ...registry.runtime_assets]) {
      const r = ruleFor(e, policy);
      expect(r, `${e.path} (${e.class})`).toBeDefined();
      expect(policy.rules[r!.name]).toBeDefined();
    }
  });

  it("marks prefer SVG, cut-outs need alpha, photos are WebP/JPG", () => {
    expect(policy.rules["VECTOR_MARK"]?.preferred).toBe("svg");
    expect(policy.rules["CUTOUT"]?.alpha_required).toBe(true);
    expect(policy.rules["CUTOUT"]?.formats).toEqual(expect.arrayContaining(["png"]));
    expect(policy.rules["PHOTO"]?.formats).toEqual(expect.arrayContaining(["webp", "jpg"]));
    expect(policy.rules["PHOTO"]?.formats).not.toContain("png");
  });

  it("lists every raster mark without an SVG as RESEARCH_REAL_ASSET", () => {
    expect(registry.vector_research.length).toBeGreaterThan(0);
    for (const r of registry.vector_research) expect(r.decision).toBe("RESEARCH_REAL_ASSET");
  });

  it("detects a violation (synthetic PNG photo, unregistered file)", () => {
    const fake: AssetRegistry = {
      ...registry,
      runtime_assets: [...registry.runtime_assets, { path: "x/photo.png", class: "VENUE_PHOTO", status: "VERIFIED" }],
    };
    const info = { format: "png" as const, alpha: false, lossless: true };
    expect(checkAsset("x/photo.png", info, fake).join(" ")).toMatch(/not allowed for PHOTO/);
    expect(checkAsset("x/unknown.webp", info, registry)[0]).toMatch(/not registered/);
  });
});

describe("L3 · registered assets follow the policy", () => {
  const debt = new Set(policy.known_format_debt.map((d) => d.path));

  it("every super app runtime file is registered", () => {
    expect(runtimeFiles.length).toBeGreaterThan(40);
    const missing = runtimeFiles.filter((f) => !entryFor(f, [...registry.locked_assets, ...registry.runtime_assets]));
    expect(missing).toEqual([]);
  });

  it("runtime files comply (format, alpha, vector status, lossless derivatives)", () => {
    const problems = runtimeFiles.flatMap((f) => checkAsset(f, readImageInfo(read(f)), registry));
    expect(problems).toEqual([]);
  });

  it("canonical locked assets comply, except the listed legacy debt", () => {
    const problems = registry.locked_assets
      .filter((a) => existsSync(resolve(REPO, a.path)) && !debt.has(a.path))
      .flatMap((a) => checkAsset(a.path, readImageInfo(read(a.path)), registry));
    expect(problems).toEqual([]);
  });

  it("the debt list is exact: each entry exists, is registered and really violates", () => {
    for (const d of policy.known_format_debt) {
      expect(existsSync(resolve(REPO, d.path)), d.path).toBe(true);
      const entry = registry.locked_assets.find((a) => a.path === d.path);
      expect(entry, d.path).toBeDefined();
      // A lossy RGB copy of a mark/cut-out: the debt is real, so it must not silently become compliant.
      const info = readImageInfo(read(d.path));
      expect(info.lossless || info.alpha, d.path).toBe(false);
    }
  });

  it("registered git blob hashes still match (official files untouched)", () => {
    for (const a of [...registry.locked_assets, ...registry.runtime_assets]) {
      if (!a.git_blob_sha || a.path.endsWith("/") || !existsSync(resolve(REPO, a.path))) continue;
      expect(gitBlobSha(a.path), a.path).toBe(a.git_blob_sha);
    }
  });
});

describe("L3 · runtime code references", () => {
  /** URLs the app actually serves: /media literals in code and the `url` of every *.asset.json (not `derived_from`). */
  const refs = [
    ...new Set([
      ...sourceFiles.filter((f) => !f.endsWith(".json")).flatMap((f) => mediaReferences(readFileSync(f, "utf8"))),
      ...sourceFiles
        .filter((f) => f.endsWith(".asset.json"))
        .map((f) => (JSON.parse(readFileSync(f, "utf8")) as { url?: string }).url)
        .filter((u): u is string => typeof u === "string" && u.startsWith("/media/")),
    ]),
  ];
  const originals = registry.runtime_assets.filter((a) => ruleFor(a, policy)?.rule.must_not_be_referenced_by_runtime_code);

  it("every /media path in the code exists and is registered", () => {
    expect(refs.length).toBeGreaterThan(10);
    for (const r of refs) {
      const repoPath = `apps/superapp/public${r}`;
      expect(existsSync(resolve(REPO, repoPath)), r).toBe(true);
      expect(entryFor(repoPath, [...registry.locked_assets, ...registry.runtime_assets]), r).toBeDefined();
    }
  });

  it("source originals are not served by the code; their rendition exists and derives from them", () => {
    expect(originals.length).toBe(9);
    for (const o of originals) {
      expect(refs.includes(o.path.replace("apps/superapp/public", "")), o.path).toBe(false);
      const rendition = registry.runtime_assets.find((a) => a.path === o.rendition);
      expect(rendition?.derived_from, o.path).toBe(o.path);
      expect(existsSync(resolve(REPO, o.rendition!))).toBe(true);
    }
  });

  it("category badges are served as the 96 px lossless rendition (max 34 px on screen)", () => {
    const url = logoFor("U15 2012/13")!;
    const info = readImageInfo(read(`apps/superapp/public${url}`));
    expect(info).toMatchObject({ format: "webp", lossless: true });
    expect(statSync(resolve(APP, "public", url.slice(1))).size).toBeLessThan(40_000);
    const json = JSON.parse(readFileSync(resolve(APP, "src/assets/scd/SCD_U15_2012_2013.png.asset.json"), "utf8"));
    expect(json.url).toBe(url);
    expect(json.derived_from).toBe("/media/scd/SCD_U15_2012_2013.png");
  });
});
