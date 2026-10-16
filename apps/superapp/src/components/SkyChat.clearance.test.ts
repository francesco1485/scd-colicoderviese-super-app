/**
 * Francesco 15/10/2026: the Vera button never covers content. On phones the public shell keeps, under its content,
 * the room of the bottom bar, the gap and the launcher circle, and the launcher itself stays above the bottom bar.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const sky = readFileSync(resolve(__dirname, "SkyChat.tsx"), "utf8");
const root = readFileSync(resolve(__dirname, "../routes/__root.tsx"), "utf8");

function constant(name: string): number {
  const m = sky.match(new RegExp(`const ${name} = (\\d+);`));
  if (!m) throw new Error(`${name} not found`);
  return Number(m[1]);
}

describe("Vera launcher clearance on phones", () => {
  it("covers the bottom bar, the gap and the whole launcher circle", () => {
    const nav = constant("NAV_H");
    const gap = constant("LAUNCHER_GAP");
    const size = constant("LAUNCHER_PHONE_SIZE");
    expect(sky).toContain("export const PHONE_CONTENT_CLEARANCE = NAV_H + LAUNCHER_GAP + LAUNCHER_PHONE_SIZE + 8;");
    expect(nav + gap + size + 8).toBeGreaterThan(nav + 30); // above bar + sponsor strip
    expect(sky).toContain("size-11"); // 44px circle on phones
  });

  it("keeps the launcher above the bottom bar", () => {
    expect(sky).toContain("`calc(${NAV_H + LAUNCHER_GAP}px + env(safe-area-inset-bottom))`");
  });

  it("the public shell pads its content by the clearance", () => {
    expect(root).toContain('"--shell-pb": `${PHONE_CONTENT_CLEARANCE}px`');
    expect(root).toContain("pb-[calc(var(--shell-pb)+env(safe-area-inset-bottom))]");
  });

  it("desktop: the content clears the launcher below and on the right", () => {
    const bottom = constant("LAUNCHER_DESKTOP_BOTTOM");
    const size = constant("LAUNCHER_DESKTOP_SIZE");
    const right = constant("LAUNCHER_DESKTOP_RIGHT");
    expect(sky).toContain(`lg:bottom-[${bottom}px]`);
    expect(sky).toContain(`lg:size-14`); // 56px
    expect(size).toBe(56);
    expect(sky).toContain("export const DESKTOP_CONTENT_CLEARANCE = LAUNCHER_DESKTOP_BOTTOM + LAUNCHER_DESKTOP_SIZE + 8;");
    expect(root).toContain('"--shell-pb-lg": `${DESKTOP_CONTENT_CLEARANCE}px`');
    expect(root).toContain("lg:pb-[var(--shell-pb-lg)]");
    // right gutter 48px (lg:pr-12) + the pages' own 32px covers the launcher footprint
    expect(root).toContain("lg:pr-12 2xl:pr-0");
    expect(48 + 32).toBeGreaterThanOrEqual(right + size + 8);
  });

  it("the shell starts with a skip link to the content", () => {
    expect(root).toContain('href="#contenuto"');
    expect(root).toContain("Vai al contenuto");
    expect(root).toContain('id="contenuto"');
    expect(root.indexOf('href="#contenuto"')).toBeLessThan(root.indexOf("<SiteHeader />"));
  });
});
