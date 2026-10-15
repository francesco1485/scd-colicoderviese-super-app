import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LEDWALL_BOARD, ledwallSequence, msIntoRomeDay, slotIndexAt } from "@/lib/ledwall-rotation";
import { SPONSORS } from "@/lib/sponsors";

import { LedwallFacsimile } from "./LedwallFacsimile";
import { LedwallRotator } from "./LedwallRotator";

const src = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");

describe("LedwallRotator (SSR)", () => {
  const day = "2026-10-13";
  const nowMs = Date.parse("2026-10-13T08:00:00Z");

  it("renders on the server without window, with the honest label and the board over the still", () => {
    expect(typeof window).toBe("undefined");
    const html = renderToStaticMarkup(<LedwallRotator day={day} nowMs={nowMs} />);
    expect(html).toContain("Anteprima ledwall · i partner a rotazione");
    expect(html).toContain("ledwall-board-empty-1280.webp");
    // B3: phone renditions in the srcset, and the default stays lazy (only /sponsor asks for priority).
    expect(html).toContain("ledwall-board-empty-640.webp 640w");
    expect(html).toContain("ledwall-board-empty-960.webp 960w");
    expect(html).not.toContain('fetchPriority="high"');
    expect(html).toContain(`left:${LEDWALL_BOARD.left}%`);
    expect(html).toContain(`width:${LEDWALL_BOARD.width}%`);
    expect(html).toContain('data-variant="full"');
    expect(html).toContain('aria-roledescription="carosello"');
    expect(html).toContain('loading="lazy"');
    // No pause button before mount (motion is decided on the client); previous/next always.
    expect(html).not.toContain('data-testid="ledwall-pause"');
    expect(html).toContain("Partner precedente sul ledwall");
    expect(html).toContain("Partner successivo sul ledwall");
    // The live region starts empty: nothing is announced on load or on auto-advance.
    expect(html).toMatch(/aria-live="polite"[^>]*data-testid="ledwall-announce"><\/p>/);
  });

  it("starts from the slot of the server clock (same markup on hydration)", () => {
    const seq = ledwallSequence(SPONSORS, day);
    const expected = seq[slotIndexAt(seq.length, msIntoRomeDay(nowMs))]!;
    const html = renderToStaticMarkup(<LedwallRotator day={day} nowMs={nowMs} />);
    expect(html).toContain(`data-slot="${expected.key}"`);
    if (expected.kind === "partner") expect(html).toContain(`alt="${expected.label.replace(/'/g, "&#x27;")}"`);
  });

  it("renders the club slot as navy board text and a partner slot as a logo", () => {
    const seq = ledwallSequence(SPONSORS, day);
    const clubAt = seq.findIndex((s) => s.kind === "club");
    const midnight = Date.parse("2026-10-12T22:00:00Z"); // 00:00 in Rome (CEST)
    const club = renderToStaticMarkup(<LedwallRotator day={day} nowMs={midnight + clubAt * 4_000} />);
    expect(club).toContain('data-kind="club"');
    expect(club).toContain("PARTNER UFFICIALE");
    expect(club).toContain("S.C.D. COLICODERVIESE 2026/27");
    expect(club).toContain("Spazio del club");
    const partner = renderToStaticMarkup(<LedwallRotator day={day} nowMs={midnight} />);
    expect(partner).toContain('data-kind="partner"');
    expect(partner).toContain("scd-ledrot-logo");
    expect(partner).toContain(`Partner 1 di ${SPONSORS.length}`);
  });

  it("compact variant for the home", () => {
    expect(renderToStaticMarkup(<LedwallRotator day={day} nowMs={nowMs} variant="compact" />)).toContain('data-variant="compact"');
  });

  it("sponsor section: rotator first, video only on request", () => {
    const html = renderToStaticMarkup(<LedwallFacsimile day={day} nowMs={nowMs} />);
    const rot = html.indexOf('data-testid="ledwall-rotator"');
    const cta = html.indexOf('data-testid="ledwall-cta"');
    expect(rot).toBeGreaterThan(-1);
    expect(rot).toBeLessThan(cta);
    expect(html).toContain("Guarda il video fac-simile");
    expect(html).not.toContain("<video");
    expect(html).not.toContain(".mp4");
  });

  it("module code never touches window at load and respects reduced motion", () => {
    const file = src("./LedwallRotator.tsx");
    const top = file.slice(0, file.indexOf("export function LedwallRotator"));
    expect(top).not.toMatch(/\bwindow\.|\bdocument\./);
    expect(file).toContain("mayAnimate");
    expect(src("../styles.css")).toMatch(/prefers-reduced-motion: reduce\)\s*\{\s*\.scd-ledrot-slot \{ animation: none/);
  });

  it("appears on the public home only (never in internal pages)", () => {
    const home = src("./home/PublicHome.tsx");
    expect(home).toContain("showLedwallOnHome(");
    expect(home).toMatch(/\{ledOnHome && \(/);
    expect(home).toMatch(/<LedwallRotator day=\{day\}/);
    expect(home).toContain('to="/sponsor"');
    for (const f of ["./scd/InteriorShell.tsx", "./home/MemberHome.tsx"]) expect(src(f)).not.toContain("LedwallRotator");
  });

  it("loads the still at once with high priority when it is the first-screen visual (B3, /sponsor)", () => {
    const day = "2026-10-13";
    const nowMs = Date.parse("2026-10-13T08:00:00Z");
    const html = renderToStaticMarkup(<LedwallRotator day={day} nowMs={nowMs} priority />);
    expect(html).toContain('loading="eager"');
    expect(html).toContain('fetchPriority="high"');
    const sponsor = renderToStaticMarkup(<LedwallFacsimile day={day} nowMs={nowMs} />);
    expect(sponsor).toContain('fetchPriority="high"');
    for (const w of [640, 960, 1280, 1920]) {
      expect(existsSync(fileURLToPath(new URL(`../../public/media/sponsor/ledwall-board-empty-${w}.webp`, import.meta.url))), `${w}w`).toBe(true);
    }
  });
});
