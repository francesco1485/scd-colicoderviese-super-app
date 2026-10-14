import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FormsPausedNotice } from "@/components/scd/FormsPausedNotice";
import { isPublicPath, sitemapXml } from "@/lib/http-policy";
import { SPOT_ANSWER_AFTER_MAIL } from "@/lib/spot-review";

const src = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");

describe("spot review page /spot/$slug (B1)", () => {
  const page = src("../routes/spot.$slug.tsx");
  const form = src("./PartnerForm.tsx");
  const ui = src("./SponsorSpots.tsx");

  it("is a noindex page out of the public prefixes (no sitemap, no cache), with a friendly not-found to /sponsor", () => {
    expect(page).toContain('createFileRoute("/spot/$slug")');
    expect(page).toContain("spotReviewMeta(");
    expect(page).toContain("throw notFound()");
    expect(page).toContain("notFoundComponent: SpotNotFound");
    expect(page).toMatch(/Spot non trovato[\s\S]*to="\/sponsor"/);
    expect(isPublicPath("/spot/carcano")).toBe(false);
  });

  it("is not linked from the navigation, the menu or the sitemap", () => {
    for (const nav of ["./SiteChrome.tsx", "./scd/hall.tsx", "../lib/site-menu.ts", "../lib/http-policy.ts"]) {
      expect(src(nav), nav).not.toMatch(/["'`]\/spot\b/);
    }
    expect(sitemapXml("https://app.colicoderviese.it")).not.toContain("/spot");
  });

  it("shows status, where it runs, the standard and the two answers", () => {
    expect(page).toContain("<SpotStatusBadge status={spot.status} />");
    expect(page).toContain("SPOT_WHERE.map");
    expect(page).toContain("SPOT_STANDARD_TEXT");
    expect(page).toContain("SPOT_ANSWER_LABEL.approvato");
    expect(page).toContain("SPOT_ANSWER_LABEL.modifiche");
    expect(page).toContain('aria-live="polite"');
    expect(page).toContain('htmlFor="spot-changes"');
  });

  it("answers through the existing sponsor proposal form (no new endpoint, table or e-mail sender)", () => {
    expect(page).toContain("<PartnerForm ");
    expect(page).toContain('tipo="sponsor"');
    expect(page).not.toMatch(/createServerFn|useServerFn|fetch\(|supabase|mailto:/);
    expect(form).toContain("useServerFn(submitPartnerLead)");
    expect(form).toContain('import { submitPartnerLead } from "@/lib/club.functions";');
    expect(form.match(/useServerFn\(/g)).toHaveLength(1);
    expect(form).toContain("preset?.receivedNote && outcome?.delivered");
  });

  it("CRM vetrina: page link, copy link with fallback, no WhatsApp or other message (Francesco 14/10: nessun messaggio)", () => {
    expect(ui).toContain("<SpotReviewLinks spot={spot} />");
    expect(ui).toContain("Pagina per l'azienda");
    expect(ui).toContain("navigator.clipboard?.writeText");
    expect(ui).toContain('setState("manual")');
    expect(ui).not.toContain("spotReviewWhatsapp");
    expect(ui).not.toContain("wa.me");
    expect(ui).not.toMatch(/mailto:|sendMessage|\/gestionale\/posta/);
  });

  it("paused e-mail box: spot topic as subject, the note on what happens next, its own copy", () => {
    const html = renderToStaticMarkup(
      <FormsPausedNotice
        kind="partner"
        topic="Spot carcano: approvato"
        body="Spot carcano: approvato."
        note={SPOT_ANSWER_AFTER_MAIL}
        copy={{ title: "Manda la risposta al club", text: "La risposta parte dalla tua posta." }}
      />,
    );
    expect(html).toContain("Manda la risposta al club");
    expect(html).toContain('data-testid="forms-paused-note"');
    expect(html).toContain(encodeURIComponent("Partnership · Spot carcano: approvato"));
    expect(html).not.toContain("Ricevuto");
  });

  it("the safeguarding notice ignores note and copy", () => {
    const html = renderToStaticMarkup(<FormsPausedNotice kind="safeguarding" note="X nota" copy={{ title: "Titolo X", text: "Testo X" }} />);
    expect(html).not.toContain("X nota");
    expect(html).not.toContain("Titolo X");
  });
});
