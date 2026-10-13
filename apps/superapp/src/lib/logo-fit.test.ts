import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { readImageInfo } from "./asset-format";
import { AFFILIATION_ART, fitLogo, isLowRes, lowResSponsors, sponsorArt } from "./logo-fit";
import { SPONSORS } from "./sponsors";

const PUBLIC = resolve(__dirname, "../../public");
const REPO = resolve(__dirname, "../../../..");
const registry = JSON.parse(readFileSync(resolve(REPO, "config/scd-assets.v1.json"), "utf8")) as {
  runtime_assets: { path: string; derived_from?: string; class: string }[];
};

describe("uniform logo boxes", () => {
  const box = { w: 100, h: 40 };

  it("normalises by visual area: a wide wordmark and a square badge get similar areas", () => {
    const wide = fitLogo({ w: 1000, h: 200 }, box);
    const square = fitLogo({ w: 500, h: 500 }, box);
    const ratio = (wide.width * wide.height) / (square.width * square.height);
    expect(ratio).toBeGreaterThan(0.75);
    expect(ratio).toBeLessThan(1.34);
  });

  it("stays inside the box", () => {
    for (const art of [{ w: 2000, h: 50 }, { w: 50, h: 2000 }, { w: 300, h: 300 }]) {
      const f = fitLogo(art, box);
      expect(f.width).toBeLessThanOrEqual(box.w);
      expect(f.height).toBeLessThanOrEqual(box.h);
    }
  });

  it("never upscales a low-resolution file", () => {
    const f = fitLogo({ w: 30, h: 12 }, box);
    expect(f).toEqual({ width: 30, height: 12, capped: true });
  });

  it("guards against empty input", () => {
    expect(fitLogo({ w: 0, h: 10 }, box).width).toBe(0);
  });
});

describe("sponsor and affiliation renditions", () => {
  it("every sponsor has a trimmed transparent lossless rendition derived from its official file", () => {
    for (const s of SPONSORS) {
      const art = sponsorArt(s);
      expect(art, s.slug).not.toBeNull();
      const file = resolve(PUBLIC, art!.src.slice(1));
      expect(existsSync(file), art!.src).toBe(true);
      const info = readImageInfo(new Uint8Array(readFileSync(file)));
      expect(info, art!.src).toMatchObject({ format: "webp", lossless: true, alpha: true });
      const entry = registry.runtime_assets.find((a) => a.path === `apps/superapp/public${art!.src}`);
      expect(entry?.derived_from, art!.src).toBe(`apps/superapp/public${s.src}`);
    }
  });

  it("affiliations are only the three official marks (Monza: the registered affiliation badge only)", () => {
    expect(AFFILIATION_ART.map((a) => a.id)).toEqual(["figc-sgs-3-livello", "lnd", "insieme-al-monza"]);
    const monza = registry.runtime_assets.find((a) => a.path.endsWith("affiliazioni/cut/insieme-al-monza.webp"));
    expect(monza?.derived_from).toBe("assets/logo-monza.png");
    expect(monza?.class).toBe("OFFICIAL_AFFILIATION_LOGO");
  });

  it("flags low-resolution sources (logo to request from the sponsor)", () => {
    const low = lowResSponsors(SPONSORS).map((s) => s.slug);
    expect(low).not.toContain("hdi-maglia");
    expect(low).not.toContain("saglio-sport");
    expect(low).toContain("dell-oca");
    expect(isLowRes(null)).toBe(false);
  });
});
