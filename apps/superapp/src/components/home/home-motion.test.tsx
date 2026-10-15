// B4 (15/10/2026): the moving blocks of the public home never change by themselves with reduced motion.
// The home carries two of them: the promo carousel (HomePromo) and the fixed sponsor bar (SponsorBand,
// UD-134). The vitest environment is node, so the proof is a server render plus the CSS and timer rules
// that drive the client.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, className }: { children: React.ReactNode; to: string; className?: string }) => (
    <a href={to} className={className}>{children}</a>
  ),
  useRouterState: () => ({ location: { pathname: "/" } }),
}));

import { SponsorBand } from "@/components/SponsorBand";
import { PromoCarousel } from "@/components/home/HomePromo";
import { autoAdvance, promoSlides } from "@/lib/home-promo";

const src = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");
const css = src("../../styles.css");

/** Body of every `@media (prefers-reduced-motion: reduce) { ... }` block, braces balanced. */
function reducedMotionBlocks(text: string): string {
  const out: string[] = [];
  const re = /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{/g;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    let depth = 1;
    let i = m.index + m[0].length;
    for (; i < text.length && depth > 0; i++) {
      if (text[i] === "{") depth++;
      else if (text[i] === "}") depth--;
    }
    out.push(text.slice(m.index + m[0].length, i - 1));
  }
  return out.join("\n");
}

describe("home carousel with reduced motion", () => {
  it("never auto-advances with reduced motion, whatever the other state", () => {
    for (const paused of [false, true])
      for (const hold of [false, true])
        for (const length of [0, 1, 2, 5])
          expect(autoAdvance({ reduced: true, paused, hold, length })).toBe(false);
  });

  it("auto-advances only when nothing holds it and there are at least two slides", () => {
    expect(autoAdvance({ reduced: false, paused: false, hold: false, length: 3 })).toBe(true);
    expect(autoAdvance({ reduced: false, paused: true, hold: false, length: 3 })).toBe(false);
    expect(autoAdvance({ reduced: false, paused: false, hold: true, length: 3 })).toBe(false);
    expect(autoAdvance({ reduced: false, paused: false, hold: false, length: 1 })).toBe(false);
  });

  it("first render is the static state: first slide current, no pause button, announced politely", () => {
    const slides = promoSlides("2026-10-15", []);
    expect(slides.length).toBeGreaterThan(1);
    const html = renderToStaticMarkup(<PromoCarousel slides={slides} />);
    // The client starts from reduced = true and only turns motion on after reading the media query.
    expect(html).not.toContain("Ferma lo scorrimento");
    expect(html).toContain('aria-live="polite"');
    const current = html.match(/aria-current="true"/g) ?? [];
    expect(current).toHaveLength(1);
    expect(html).toContain(`aria-label="Vai a: ${slides[0]!.title}"`);
  });

  it("the timer is the only thing that moves the carousel, and it is gated by autoAdvance", () => {
    const code = src("./HomePromo.tsx");
    expect(code.match(/setTimeout\(/g)).toHaveLength(1);
    expect(code).not.toContain("setInterval(");
    expect(code).toMatch(/if \(!autoAdvance\(\{ reduced, paused, hold, length: slides\.length \}\)\) return;/);
  });
});

describe("fixed sponsor bar with reduced motion", () => {
  it("renders the marquee with the class the reduced-motion rule stops", () => {
    const html = renderToStaticMarkup(<SponsorBand />);
    expect(html).toContain('data-testid="sponsor-band"');
    expect(html).toContain("uv-marquee");
  });

  it("styles.css stops .uv-marquee with reduced motion and pauses it under the pointer", () => {
    expect(reducedMotionBlocks(css)).toMatch(/\.uv-marquee[^{]*\{\s*animation:\s*none\s*!important;/);
    expect(css).toContain('[data-testid="sponsor-band"]:hover .uv-marquee');
  });

  it("has no timer of its own: with the animation off nothing changes", () => {
    const code = src("../SponsorBand.tsx");
    expect(code).not.toMatch(/setTimeout|setInterval|requestAnimationFrame/);
  });
});
