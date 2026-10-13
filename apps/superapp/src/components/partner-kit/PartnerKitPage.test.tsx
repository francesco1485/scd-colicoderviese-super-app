import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LedwallRotator } from "@/components/LedwallRotator";
import { ledwallSequence } from "@/lib/ledwall-rotation";
import { KIT_BASES, SKY_BASE, crestPx, logoPlacement, toPercent, zonePx } from "@/lib/partner-kit";
import { publicHomeRoutes } from "@/lib/public-home";
import { SPONSORS } from "@/lib/sponsors";

import { KitFigure } from "./PartnerKitPage";

const APP = resolve(__dirname, "../../..");
const REPO = resolve(APP, "../..");
const ROUTES = resolve(APP, "src/routes");
const read = (p: string) => readFileSync(p, "utf8");

describe("kit partner · SSR", () => {
  it("the render module and the page module load without window", async () => {
    expect(typeof window).toBe("undefined");
    const render = await import("@/lib/partner-kit-render");
    expect(typeof render.renderExport).toBe("function");
    expect(render.cardVenue("Colico - Campo 1, via Roma")).toBe("Colico · Campo 1");
    expect(render.cardVenue("Bellano - Comunale")).toBe("Bellano");
    expect(render.softCaps("A.S.D. BELLANO SCD")).toBe("A.S.D. Bellano SCD");
  });

  it("KitFigure renders base, logo in the zone and the official crest at the computed position", () => {
    const home = KIT_BASES.find((k) => k.id === "away")!;
    const html = renderToStaticMarkup(<KitFigure base={home} logoSrc="/media/sponsor/cut/atv.webp" aspect={2} label="ATV" caption="Divisa Away" />);
    const place = logoPlacement(2, zonePx(home.sponsor, home), home.plate);
    const logo = toPercent(place.logo, home);
    const crest = toPercent(crestPx(home)!, home);
    expect(html).toContain(home.src);
    expect(html).toContain(`left:${logo.left}%`);
    expect(html).toContain(`width:${crest.width}%`);
    expect(html).toContain("/media/brand/logo-scd.png");
    expect(html).toContain('alt="Stemma ufficiale S.C.D. ColicoDerviese"');
    expect(html).toContain('data-testid="pk-plate"');
    expect(html).toContain("Proposta");
  });

  it("before the logo size is known nothing is placed (no jump, no overflow); Sky has no extra crest", () => {
    const html = renderToStaticMarkup(<KitFigure base={SKY_BASE} logoSrc="/media/sponsor/cut/atv.webp" aspect={0} label="ATV" caption="Sky" />);
    expect(html).not.toContain("pk-kit-logo");
    expect(html).not.toContain("pk-kit-crest");
    expect(html).toContain("Proposta");
  });

  it("dedicated LED wall: one partner alternating with the club slot, own label", () => {
    const one = [SPONSORS.find((s) => s.slug === "hdi-maglia")!];
    expect(ledwallSequence(one, "2026-10-13", 1).map((s) => s.kind)).toEqual(["partner", "club"]);
    const html = renderToStaticMarkup(<LedwallRotator day="2026-10-13" nowMs={Date.parse("2026-10-13T08:00:00Z")} list={one} clubEvery={1} label="Anteprima ledwall · partner dedicato" />);
    expect(html).toContain("Anteprima ledwall · partner dedicato");
    expect(html).toContain("Passaggio successivo sul ledwall");
    expect(html).not.toContain("Partner 1 di 1");
  });
});

describe("kit partner · internal only", () => {
  const routeFiles = readdirSync(ROUTES).filter((f) => f.endsWith(".tsx"));

  it("only the two /crm/partner routes render the kit, both behind the /crm gate and noindex", () => {
    const users = routeFiles.filter((f) => /PartnerKitPage|partner-kit\.functions|partner-kit-render/.test(read(resolve(ROUTES, f))));
    expect(users.sort()).toEqual(["crm_.partner.$partnerId.tsx", "crm_.partner.nuovo.tsx"]);
    for (const f of users) {
      const src = read(resolve(ROUTES, f));
      expect(src, f).toContain("getPartnerKitData");
      expect(src, f).toContain('<WorkAreaGateView id="crm"');
      expect(src, f).toContain('"noindex"');
    }
    const fn = read(resolve(APP, "src/lib/partner-kit.functions.ts"));
    expect(fn).toMatch(/workAreaView\("crm"/);
    expect(fn).toMatch(/if \(gate\.view !== "page"\) return \{ gate, nowMs, today, calendar: null \}/);
  });

  it("no public page links to the kit pages", () => {
    expect(publicHomeRoutes().some((r) => r.startsWith("/crm"))).toBe(false);
    const publicRoutes = ["index.tsx", "sponsor.tsx", "grow.tsx", "partner.tsx", "calendario.tsx", "contatti.tsx", "societa.tsx"];
    for (const f of publicRoutes) expect(read(resolve(ROUTES, f)), f).not.toContain("/crm/partner");
    for (const f of ["home/PublicHome.tsx", "home/HomeSections.tsx", "SiteChrome.tsx", "SponsorBand.tsx"]) {
      expect(read(resolve(APP, "src/components", f)), f).not.toMatch(/crm\/partner|partner-kit/);
    }
    for (const f of ["sitemap.xml", "robots.txt"]) expect(read(resolve(REPO, f)), f).not.toContain("/crm/partner");
  });

  it("the CRM links every card and every season sponsor to its kit", () => {
    const crm = read(resolve(ROUTES, "crm.tsx"));
    expect(crm).toContain('data-testid="crm-partner-kit"');
    expect(crm).toContain("crmKitId(n)");
    expect(crm).toContain('to="/crm/partner/nuovo"');
    expect(crm).toContain("<PartnerKitGrid />");
  });

  it("nothing is uploaded, stored or mailed from the kit page", () => {
    const src = read(resolve(APP, "src/components/partner-kit/PartnerKitPage.tsx")) + read(resolve(APP, "src/lib/partner-kit-render.ts"));
    expect(src).not.toMatch(/\bfetch\(|XMLHttpRequest|localStorage|sessionStorage|indexedDB|sendBeacon|mailto:|createServerFn/);
    expect(src).toContain("URL.createObjectURL(file)");
    expect(src).toContain("URL.revokeObjectURL");
  });
});
