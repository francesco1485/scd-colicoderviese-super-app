import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PartnerPackages } from "@/components/PartnerPackages";
import { SponsorIdeas } from "@/components/SponsorIdeas";
import { SponsorProcess } from "@/components/SponsorProcess";
import { SponsorWall } from "@/components/SponsorWall";
import { eneaLines } from "@/lib/enea-guide";
import { PARTNER_BENEFITS, PARTNER_SAMPLE } from "@/lib/partner-preview";
import { SPONSOR_IDEAS } from "@/lib/sponsor-ideas";
import { PACKAGE_STEPS, PARTNER_PACKAGES, PROPOSAL_ON_MEASURE } from "@/lib/sponsor-packages";
import { SPONSOR_FAQ, SPONSOR_PROCESS_STEPS } from "@/lib/sponsor-process";
import { SPONSORS } from "@/lib/sponsors";

/**
 * Francesco 17/10/2026 09:42: «prezzi non esposti perché li fa al momento il Presidente». No public sponsor surface
 * renders a currency symbol, a price word or digits followed by €. The components are rendered as the visitor sees them
 * (SSR markup, attributes included); the route files and the LED/spot pages are scanned as source.
 */
const PRICE = /€|\$|£|\bEUR\b|\beuro\b|\d[\d.,\s]*€|\bda\s+€|prezz|listino prezzi|sconto|scontat/i;

/** Visible text and attribute values, without class names and SVG paths (they may contain digits, never €). */
const textOf = (html: string) =>
  html
    .replace(/\s(class|d|viewBox|style|points|transform)="[^"]*"/g, "")
    .replace(/<[^>]+>/g, " ");

const noop = () => {};
const APP = resolve(__dirname, "../..");
const read = (rel: string) => readFileSync(resolve(APP, rel), "utf8");

describe("public sponsor surfaces never show a price (SSR)", () => {
  it("the four packages: no currency, «Proposta su misura» on each card, «Parliamone» to the form", () => {
    const html = renderToStaticMarkup(<PartnerPackages onChoose={noop} />);
    expect(textOf(html)).not.toMatch(PRICE);
    expect(html).toContain('id="listino"');
    for (const p of PARTNER_PACKAGES) {
      expect(html).toContain(`data-testid="package-measure-${p.id}"`);
      expect(html).toContain(`href="?pacchetto=${p.id}#proposta"`);
      expect(html).toContain(`aria-label="Parliamone: ${p.title}"`);
    }
    expect(html.split(PROPOSAL_ON_MEASURE).length - 1).toBe(PARTNER_PACKAGES.length);
    expect(html).not.toContain("package-price-");
  });

  it("the ideas grid: no currency, one «Parliamone» per idea with its id preselected", () => {
    const html = renderToStaticMarkup(<SponsorIdeas onChoose={noop} />);
    expect(textOf(html)).not.toMatch(PRICE);
    expect(html).toContain('id="idee"');
    for (const i of SPONSOR_IDEAS) expect(html).toContain(`href="?pacchetto=${i.id}#proposta"`);
  });

  it("the partner wall and every partner card: no currency", () => {
    expect(textOf(renderToStaticMarkup(<SponsorWall />))).not.toMatch(PRICE);
    for (const s of SPONSORS) {
      const html = renderToStaticMarkup(<SponsorWall initialOpen={s.slug} />);
      expect(html, s.slug).toContain('data-testid="sponsor-card"');
      expect(textOf(html), s.slug).not.toMatch(PRICE);
    }
  });

  it("FAQ and steps: no currency and no digits", () => {
    const html = renderToStaticMarkup(<SponsorProcess />);
    expect(textOf(html)).not.toMatch(PRICE);
    for (const t of [...SPONSOR_FAQ.flatMap((f) => [f.q, f.a]), ...SPONSOR_PROCESS_STEPS.flatMap((s) => [s.title, s.text]), ...PACKAGE_STEPS.flatMap((s) => [s.title, s.text])])
      expect(t).not.toMatch(PRICE);
  });

  it("Enea on /sponsor, /tornei and /eventi: no currency, no price words", () => {
    for (const ctx of ["sponsor", "tornei", "eventi"] as const)
      for (const l of eneaLines(ctx, "2026-10-17")) expect(`${l.reason} ${l.action.label}`, l.id).not.toMatch(PRICE);
  });

  it("the /partner preview: no currency", () => {
    const t = [...PARTNER_BENEFITS.flatMap((b) => [b.title, b.text]), PARTNER_SAMPLE.company, ...PARTNER_SAMPLE.tiles.flatMap((x) => [x.label, x.value])].join(" ");
    expect(t).not.toMatch(PRICE);
  });
});

describe("public sponsor source files never write a price", () => {
  const files = [
    "src/routes/sponsor.tsx",
    "src/routes/partner.tsx",
    "src/routes/ledwall.player.tsx",
    "src/routes/spot.$slug.tsx",
    "src/components/PartnerPackages.tsx",
    "src/components/SponsorIdeas.tsx",
    "src/components/SponsorWall.tsx",
    "src/components/IdeaScene.tsx",
    "src/components/PartnerForm.tsx",
    "src/components/SponsorLedwallLive.tsx",
    "src/components/scd/EneaGuide.tsx",
    "src/lib/sponsor-packages.ts",
    "src/lib/sponsor-ideas.ts",
    "src/lib/sponsor-profiles.ts",
    "src/lib/sponsor-process.ts",
    "src/lib/enea-guide.ts",
  ];
  it.each(files)("%s: no € sign, no amount followed by €, no budget ranges", (f) => {
    const src = read(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    expect(src).not.toMatch(/€|\d[\d.,\s]*€|\bEUR\b/);
    expect(src).not.toMatch(/BUDGET|formatPackagePrice|da_approvare/);
  });

  it("the public proposal form has no budget field (amounts never asked or shown)", () => {
    expect(read("src/components/PartnerForm.tsx")).not.toMatch(/Budget indicativo|f\.budget/);
  });
});
