/**
 * B3 (2026-10-15): metric-matched fallbacks keep the layout still while the self-hosted fonts download (CLS).
 * Every official family imported from @fontsource (Kaushan Script excepted: decorative, no layout role) must have a
 * "<Family> Fallback" face for each imported weight, and every font stack must name it right after the family.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = resolve(__dirname, "..");
const styles = readFileSync(resolve(SRC, "styles.css"), "utf8");
const fallbacks = readFileSync(resolve(SRC, "font-fallbacks.css"), "utf8");

const FAMILY_OF: Record<string, string> = {
  "fira-sans": "Fira Sans",
  "fira-sans-condensed": "Fira Sans Condensed",
  anton: "Anton",
  "big-shoulders-display": "Big Shoulders Display",
  barlow: "Barlow",
};

const imported = [
  ...styles.matchAll(/@import "@fontsource\/([a-z-]+)\/latin-(\d{3})";/g),
]
  .map((m) => ({ pkg: m[1]!, weight: Number(m[2]) }))
  .filter((x) => x.pkg !== "kaushan-script");

const faces = [...fallbacks.matchAll(/@font-face \{([^}]*)\}/g)].map((m) => {
  const body = m[1]!;
  const num = (k: string) =>
    Number(new RegExp(`${k}: ([\\d.]+)%`).exec(body)?.[1]);
  return {
    family: /font-family: "([^"]+)"/.exec(body)?.[1],
    weight: Number(/font-weight: (\d+)/.exec(body)?.[1]),
    src: /src: ([^;]+);/.exec(body)?.[1] ?? "",
    size: num("size-adjust"),
    ascent: num("ascent-override"),
    descent: num("descent-override"),
  };
});

describe("font fallbacks (B3 layout stability)", () => {
  it("the fallback sheet is imported by styles.css", () => {
    expect(styles).toContain('@import "./font-fallbacks.css";');
  });

  it("every imported official family and weight has a metric-matched fallback face", () => {
    expect(imported.length).toBeGreaterThanOrEqual(16);
    for (const { pkg, weight } of imported) {
      const family = FAMILY_OF[pkg];
      expect(family, pkg).toBeDefined();
      const face = faces.find(
        (f) => f.family === `${family} Fallback` && f.weight === weight,
      );
      expect(face, `${family} ${weight}`).toBeDefined();
      expect(face!.size).toBeGreaterThan(50);
      expect(face!.size).toBeLessThan(130);
      expect(face!.ascent).toBeGreaterThan(50);
      expect(face!.descent).toBeGreaterThan(0);
    }
  });

  it("uppercase titles use the caps-measured faces of the display families", () => {
    const rule = /\.uppercase \{([^}]*)\}/.exec(styles)?.[1] ?? "";
    expect(rule).toContain(
      '"Big Shoulders Display", "Big Shoulders Display Caps Fallback"',
    );
    expect(rule).toContain('"Anton", "Anton Caps Fallback"');
    for (const w of [700, 800, 900]) {
      const caps = faces.find(
        (f) =>
          f.family === "Big Shoulders Display Caps Fallback" && f.weight === w,
      );
      const mixed = faces.find(
        (f) => f.family === "Big Shoulders Display Fallback" && f.weight === w,
      );
      expect(caps!.size).toBeLessThan(mixed!.size);
    }
  });

  it("fallback faces only use local fonts (no download, nothing official redrawn)", () => {
    for (const f of faces) {
      expect(f.src, f.family).toMatch(/^local\(/);
      expect(f.src, f.family).not.toMatch(/url\(/);
      expect(f.src).toContain('local("Arial');
    }
  });

  it("every font stack names the fallback right after the official family", () => {
    const stacks = [...styles.matchAll(/--font-[a-z-]+:\s*([^;]+);/g)].map(
      (m) => m[1]!,
    );
    expect(stacks.length).toBeGreaterThan(4);
    for (const stack of stacks) {
      for (const family of Object.values(FAMILY_OF)) {
        if (!stack.startsWith(`"${family}"`)) continue;
        expect(stack, stack).toMatch(
          new RegExp(`^"${family}", "${family} (Caps )?Fallback",`),
        );
      }
    }
  });
});
