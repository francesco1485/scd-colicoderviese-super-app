import { describe, expect, it } from "vitest";

// @ts-expect-error plain .mjs build helper without type declarations
import { nitroEtag, patchPublicAssetMeta } from "../../scripts/lib/public-asset-meta.mjs";

const entry = (route: string, size: number, etag: string) => `	"${route}": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\\"${etag}\\"",
		"mtime": "2026-10-16T21:28:08.293Z",
		"size": ${size},
		"path": "../public${route}"
	},`;

describe("patchPublicAssetMeta", () => {
  it("realigns size, etag and mtime when the file grew after Nitro's snapshot (truncated sw.js)", () => {
    const real = Buffer.from("x".repeat(30));
    const src = `const assets = {\n${entry("/sw.js", 20, "14-old")}\n${entry("/ok.js", 5, "5-same")}\n};`;
    const mtime = new Date("2026-10-17T00:00:00.000Z");
    const { source, fixed } = patchPublicAssetMeta(src, (p: string) =>
      p.endsWith("sw.js") ? { buffer: real, mtime } : { buffer: Buffer.from("abcde"), mtime },
    );
    expect(fixed).toEqual(["/sw.js 20 -> 30"]);
    expect(source).toContain('"size": 30');
    expect(source).toContain(`"etag": ${JSON.stringify(nitroEtag(real))}`);
    expect(source).toContain('"mtime": "2026-10-17T00:00:00.000Z"');
    expect(source).toContain('"size": 5');
    expect(source).toContain('"5-same');
  });

  it("uses Nitro's etag format: hex size and 27 characters of the sha1", () => {
    const tag = nitroEtag(Buffer.from("hello"));
    expect(tag).toMatch(/^"5-[A-Za-z0-9+/]{27}"$/);
  });

  it("leaves missing files untouched", () => {
    const src = entry("/gone.js", 10, "a-x");
    expect(patchPublicAssetMeta(src, () => null)).toEqual({ source: src, fixed: [] });
  });
});
