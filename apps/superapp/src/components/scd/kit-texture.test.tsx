import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PageHero } from "@/components/ui-kit";

import { HallHero } from "./hall";
import { KIT_TEXTURE_CLASS, KitTexture } from "./kit-texture";

const src = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");

/** Body of an exported function component, up to the next top-level export. */
function componentBody(file: string, name: string): string {
  const start = file.indexOf(`export function ${name}`);
  expect(start, name).toBeGreaterThanOrEqual(0);
  const next = file.indexOf("\nexport ", start + 1);
  return file.slice(start, next === -1 ? undefined : next);
}

describe("kit 2026/27 texture on shared hero bands (Direzione 13/10/2026)", () => {
  it("renders a decorative, motif-tagged layer with the kit texture class", () => {
    const html = renderToStaticMarkup(<KitTexture motif="forte" />);
    expect(html).toContain(KIT_TEXTURE_CLASS);
    expect(html).toContain('data-motif="forte"');
    expect(html).toContain('aria-hidden="true"');
    expect(renderToStaticMarkup(<KitTexture />)).toContain('data-motif="monogram"');
    expect(renderToStaticMarkup(<KitTexture overlay />)).toContain("scd-kit-stripes--overlay");
  });

  it("PageHero (sponsor, eventi, contatti, entra, shop, fornitori) carries the texture and the chosen motif", () => {
    const html = renderToStaticMarkup(
      <PageHero eyebrow="Vivere il club" title="Eventi" motif="mountains-lake">
        Sottotitolo
      </PageHero>,
    );
    expect(html).toContain(KIT_TEXTURE_CLASS);
    expect(html).toContain('data-motif="mountains-lake"');
    expect(html).toContain("line-clamp-2");
    expect(html).not.toContain("blur-3xl");
    const keep = renderToStaticMarkup(<PageHero eyebrow="x" title="y" clamp={false}>Nessun pagamento attivo</PageHero>);
    expect(keep).not.toContain("line-clamp-2");
  });

  it("HallHero (Chi siamo, Squadre) carries the texture and the chosen motif", () => {
    const html = renderToStaticMarkup(<HallHero kicker="Chi siamo" title="Un solo club" motif="forte" />);
    expect(html).toContain(KIT_TEXTURE_CLASS);
    expect(html).toContain('data-motif="forte"');
  });

  it("HeroHeader and PageHeader (comunicazioni, calendario, aree) render the texture layer", () => {
    const board = src("./board.tsx");
    expect(componentBody(board, "HeroHeader")).toMatch(/<KitTexture motif=\{motif\} \/>/);
    expect(componentBody(board, "PageHeader")).toMatch(/<KitTexture motif=\{motif\} inline \/>/);
  });

  it("public pages pick their motif and the home has no hero art", () => {
    // Partite (/calendario, 16/10/2026): the SCD METAL band of the home, no photo and no hero art.
    expect(src("../../routes/calendario.tsx")).toMatch(/className="scd-band relative overflow-hidden text-white[^"]*" data-testid="calendar-header"/);
    expect(src("../../routes/calendario.tsx")).not.toMatch(/KitTexture|lario-header/);
    expect(src("../../routes/societa.tsx")).toMatch(/<HallHero\s+motif="forte"/);
    expect(src("../../routes/eventi.index.tsx")).toMatch(/<PageHero motif="mountains-lake"/);
    // Home (16/10 05:59): no hero art; the official kit render lives in the "Dal club" kit tile.
    expect(src("../home/HomeLobby.tsx")).not.toMatch(/HeroArt/);
    expect(src("../home/HomeLobby.tsx")).toContain("/media/kit/kit-2026-27-blu.webp");
  });
});
