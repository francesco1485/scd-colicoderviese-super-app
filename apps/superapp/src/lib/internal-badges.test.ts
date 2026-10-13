import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { LEDWALL_FACSIMILE } from "@/components/LedwallFacsimile";
import { mayAnimate } from "./ledwall-rotation";
import { findArea } from "./areas";
import { readImageInfo, type AssetRegistry } from "./asset-format";
import { BADGED_AREAS, INTERNAL_BADGES, areaBadgeFor, lineBadgeFor, normaliseLine } from "./internal-badges";
import { PULMINI_DEMAND } from "./roster-aggregates";

const APP = resolve(__dirname, "../..");
const REPO = resolve(APP, "../..");
const registry = JSON.parse(readFileSync(resolve(REPO, "config/scd-assets.v1.json"), "utf8")) as AssetRegistry;
const publicFile = (url: string) => resolve(APP, "public", url.slice(1));
const entry = (url: string) => registry.runtime_assets.find((a) => a.path === `apps/superapp/public${url}`) as
  | (AssetRegistry["runtime_assets"][number] & { note?: string; source?: string; asset_decision?: string; use?: string })
  | undefined;

/** WebP canvas size from the VP8X chunk (1-based 24-bit fields). */
function webpSize(b: Uint8Array): { w: number; h: number } | null {
  if (String.fromCharCode(...b.subarray(12, 16)) !== "VP8X") return null;
  const w = 1 + (b[24]! | (b[25]! << 8) | (b[26]! << 16));
  const h = 1 + (b[27]! | (b[28]! << 8) | (b[29]! << 16));
  return { w, h };
}

describe("internal badges · files and registry", () => {
  const badges = Object.values(INTERNAL_BADGES);

  it("ships 8 badges, each as 192 and 384 px WebP with alpha", () => {
    expect(badges).toHaveLength(8);
    for (const b of badges) {
      for (const [url, px] of [[b.src, 192], [b.src2x, 384]] as const) {
        expect(url, b.id).toBe(`/media/interno/${b.id}-${px}.webp`);
        const bytes = new Uint8Array(readFileSync(publicFile(url)));
        expect(readImageInfo(bytes), url).toMatchObject({ format: "webp", alpha: true });
        expect(webpSize(bytes), url).toEqual({ w: px, h: px });
        expect(statSync(publicFile(url)).size, url).toBeLessThan(px === 192 ? 30_000 : 70_000);
      }
    }
  });

  it("every rendition is registered as INTERNAL_BADGE (KEEP_ENHANCE, internal use, not the crest)", () => {
    for (const b of badges) {
      for (const url of [b.src, b.src2x]) {
        const e = entry(url);
        expect(e?.class, url).toBe("INTERNAL_BADGE");
        expect(e?.asset_decision, url).toBe("KEEP_ENHANCE");
        expect(e?.use, url).toMatch(/never on public pages/);
        expect(e?.note, url).toMatch(/never a replacement for the official crest/);
      }
    }
    expect(registry.format_policy.class_rules["INTERNAL_BADGE"]).toBe("CUTOUT");
  });
});

describe("internal badges · area mapping", () => {
  it("maps the four area badges to existing registry areas", () => {
    expect(areaBadgeFor("coda")?.id).toBe("area-lavoro");
    expect(areaBadgeFor("gestionale")?.id).toBe("area-staff-dirigenti");
    expect(areaBadgeFor("mister")?.id).toBe("area-staff-dirigenti");
    expect(areaBadgeFor("organigramma")?.id).toBe("area-responsabili-attivita");
    expect(areaBadgeFor("impianti-campi")?.id).toBe("area-responsabili-attivita");
    for (const id of ["segreteria", "persone", "certificati"]) expect(areaBadgeFor(id)?.id, id).toBe("area-segreteria");
    for (const id of BADGED_AREAS) expect(findArea(id), id).toBeDefined();
  });

  it("gives no badge to areas without one, to public areas and to unknown ids", () => {
    for (const id of ["direzione", "tesoreria", "pulmini", "crm", "magazzino", "sponsor", "partner", "calendario", "squadre", "impianti", "famiglia", "nope", "", null, undefined]) {
      expect(areaBadgeFor(id as string | null | undefined), String(id)).toBeUndefined();
    }
  });

  it("the responsabili badge goes only where the registry roles are DS / coordinatori", () => {
    for (const id of BADGED_AREAS.filter((a) => areaBadgeFor(a)?.id === "area-responsabili-attivita")) {
      expect(findArea(id)?.roles, id).toEqual(expect.arrayContaining(["responsabile-attivita-base", "coordinatore-attivita-sportiva"]));
    }
    expect(findArea("mister")?.roles).toEqual(expect.arrayContaining(["mister", "dirigente-annata"]));
  });
});

describe("internal badges · minibus lines", () => {
  it("maps only exact line names of the Master Pulmini", () => {
    expect(lineBadgeFor("VALTELLINA")?.id).toBe("pulmino-3-valtellina");
    expect(lineBadgeFor("NORD/VALCHIAVENNA")?.id).toBe("pulmino-4-chiavenna");
    expect(lineBadgeFor(" nord / valchiavenna ")?.id).toBe("pulmino-4-chiavenna");
    expect(lineBadgeFor("LAGO")?.id).toBe("pulmino-1-lago");
    expect(lineBadgeFor("LECCO")?.id).toBe("pulmino-2-lecco");
    expect(normaliseLine("  Lago /  Lecco ")).toBe("LAGO/LECCO");
  });

  it("the combined LAGO/LECCO line, local lines and unknowns get no badge", () => {
    for (const l of ["LAGO/LECCO", "COLICO", "ALTO LARIO", "DA VERIFICARE", "VALTELLINA NORD", "", null, undefined]) {
      expect(lineBadgeFor(l as string | null | undefined), String(l)).toBeUndefined();
    }
  });

  it("current snapshot: Valtellina and Nord/Valchiavenna badged, the rest reported", () => {
    const badged = PULMINI_DEMAND.lines.filter((l) => lineBadgeFor(l));
    expect(badged.sort()).toEqual(["NORD/VALCHIAVENNA", "VALTELLINA"]);
  });
});

describe("internal badges · never on public pages", () => {
  const SRC = resolve(APP, "src");
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((n) => {
      const f = join(dir, n);
      return statSync(f).isDirectory() ? walk(f) : [f];
    });
  const users = walk(SRC)
    .filter((f) => /\.(tsx?|css)$/.test(f) && !/\.test\.tsx?$/.test(f))
    .filter((f) => /internal-badges|InternalBadge|\/media\/interno\//.test(readFileSync(f, "utf8")))
    .map((f) => relative(SRC, f).split("\\").join("/"))
    .sort();

  it("only the interior shell, the work areas and the internal pages use them", () => {
    expect(users).toEqual([
      "components/impianti-campi/ImpiantiPage.tsx",
      "components/scd/InteriorShell.tsx",
      "components/scd/InternalBadge.tsx",
      "components/scd/PulminiVans.tsx",
      "components/scd/work-area-ui.tsx",
      "lib/internal-badges.ts",
      "lib/pulmini-vans.ts",
      "routes/gestionale.index.tsx",
      "routes/pulmini.tsx",
      "styles.css",
    ]);
  });
});

describe("ledwall fac-simile (sponsor web link)", () => {
  const box = (bytes: Uint8Array, type: string) => {
    // Top-level MP4 boxes: [size u32be][type 4cc].
    let at = 0;
    const order: string[] = [];
    while (at + 8 <= bytes.length) {
      const size = ((bytes[at]! << 24) | (bytes[at + 1]! << 16) | (bytes[at + 2]! << 8) | bytes[at + 3]!) >>> 0;
      order.push(String.fromCharCode(...bytes.subarray(at + 4, at + 8)));
      if (size < 8) break;
      at += size;
    }
    return order.indexOf(type);
  };

  it("720p ≤ 3 MB and 1080p ≤ 6 MB, H.264 MP4 with moov before mdat (faststart) and no audio track", () => {
    for (const [url, max] of [[LEDWALL_FACSIMILE.sd, 3_000_000], [LEDWALL_FACSIMILE.hd, 6_000_000]] as const) {
      const bytes = new Uint8Array(readFileSync(publicFile(url)));
      expect(bytes.length, url).toBeLessThanOrEqual(max);
      const moov = box(bytes, "moov");
      const mdat = box(bytes, "mdat");
      expect(moov, url).toBeGreaterThanOrEqual(0);
      expect(moov, url).toBeLessThan(mdat);
      const text = Buffer.from(bytes).toString("latin1");
      expect(text.includes("avc1"), url).toBe(true);
      expect(/hdlr[\s\S]{8}soun/.test(text), url).toBe(false);
    }
  });

  it("poster and videos are registered as a demo, not a contract claim", () => {
    for (const url of [LEDWALL_FACSIMILE.sd, LEDWALL_FACSIMILE.hd, LEDWALL_FACSIMILE.poster]) {
      const e = entry(url);
      expect(e, url).toBeDefined();
      expect(e?.note, url).toMatch(/demo, not a contract claim/);
      expect(e?.source, url).toMatch(/Direzione upload 2026-10-13/);
    }
    expect(readImageInfo(new Uint8Array(readFileSync(publicFile(LEDWALL_FACSIMILE.poster))))).toMatchObject({ format: "webp" });
  });

  it("never names the example sponsor in the page copy", () => {
    for (const f of ["components/LedwallFacsimile.tsx", "routes/sponsor.tsx"]) {
      const text = readFileSync(resolve(APP, "src", f), "utf8");
      expect(text, f).not.toMatch(/HDI|Maglia Assicurazioni/i);
    }
    const section = readFileSync(resolve(APP, "src/components/LedwallFacsimile.tsx"), "utf8");
    expect(section).toContain("Fac-simile · esempio di rotazione");
    expect(section).toContain('preload="metadata"');
  });

  it("motion only without prefers-reduced-motion (LED wall preview; the video waits for a click)", () => {
    const win = (reduce: boolean) => ({ matchMedia: (q: string) => ({ matches: reduce && q.includes("reduce") }) as MediaQueryList });
    expect(mayAnimate(win(false))).toBe(true);
    expect(mayAnimate(win(true))).toBe(false);
    expect(mayAnimate(undefined)).toBe(false);
    const section = readFileSync(resolve(APP, "src/components/LedwallFacsimile.tsx"), "utf8");
    expect(section).not.toMatch(/autoPlay/);
    // The <video> (and so any download) exists only after the visitor opens it.
    expect(section).toMatch(/open \? \(\s*<video/);
    expect(section).toContain("Guarda il video fac-simile");
  });
});
