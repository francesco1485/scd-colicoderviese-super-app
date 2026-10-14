import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SHARE_PAGES, shareData, whatsappUrl } from "@/lib/share";
import { ShareButton } from "./ShareButton";

describe("ShareButton", () => {
  const html = renderToStaticMarkup(<ShareButton page={SHARE_PAGES.sostieni} />);

  it("is a real WhatsApp link before hydration (navigator.share takes over on click when available)", () => {
    const href = whatsappUrl(shareData(SHARE_PAGES.sostieni)).replace(/&/g, "&amp;");
    expect(html).toContain(`href="${href}"`);
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain("Condividi");
  });

  it("has a Copia link button, a polite live region and 44 px targets", () => {
    expect(html).toContain("Copia link");
    expect(html).toMatch(/role="status" aria-live="polite"/);
    const targets = html.match(/<(a|button)\b[^>]*>/g) ?? [];
    expect(targets).toHaveLength(2);
    for (const t of targets) expect(t).toMatch(/min-h-11/);
    expect(html).toMatch(/aria-label="Condividi questa pagina su WhatsApp o con un&#x27;altra app"/);
  });

  it("light tone for light backgrounds", () => {
    expect(renderToStaticMarkup(<ShareButton page={SHARE_PAGES.tornei} tone="light" />)).toContain("bg-[#0b2a5b]");
  });
});
