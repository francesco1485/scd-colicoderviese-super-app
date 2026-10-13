import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * L2 accessibility guard (docs/LAUNCH_QUALITY.md): the controls audited with axe and the 44 px target
 * check must not shrink back below 44 px. Fixed heights h-8/h-9/h-10 (32/36/40 px) and h-[34px] on a
 * button, select or input in these files mean a target smaller than the club rule (PRODUCT.md).
 * The full check runs in the browser: scripts/a11y-audit.mjs.
 */
const FILES = [
  "../components/SiteChrome.tsx",
  "../components/scd/InteriorShell.tsx",
  "../components/scd/MatchSheetPanel.tsx",
  "../components/scd/PushCard.tsx",
  "../routes/segreteria_.certificati.tsx",
  "../routes/famiglia.tsx",
];
const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");
const SMALL = /\b(h-8|h-9|h-10|h-\[3[0-9]px\])\b/;

/** Opening tags of interactive elements (may span lines), with their class attribute. */
function interactiveTags(src: string): string[] {
  return [...src.matchAll(/<(button|select|input|Link|a)\b(?:[^>]|=>)*?className=(?:"[^"]*"|\{`[^`]*`\})/gs)].map((m) => m[0]);
}

describe("touch targets of audited controls", () => {
  for (const f of FILES) {
    it(`${f.split("/").pop()} has no interactive control under 44 px`, () => {
      const offenders = interactiveTags(read(f)).filter((t) => SMALL.test(t) && !/type="checkbox"|type="radio"/.test(t));
      expect(offenders).toEqual([]);
    });
  }

  it("the menu button does not point at a menu that is not in the page", () => {
    expect(read("../components/SiteChrome.tsx")).not.toMatch(/aria-controls="sa-menu"/);
  });

  it("the 'Presa visione' green keeps AA contrast with white text", () => {
    const src = read("../routes/famiglia.tsx");
    expect(src).not.toContain("#128a2e");
    expect(src).toContain("bg-[#0f7a28] text-white");
  });
});
