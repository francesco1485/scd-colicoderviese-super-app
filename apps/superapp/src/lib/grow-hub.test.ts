import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { GROW_AUDIENCE_LABEL, GROW_STATUS_LABEL, GROW_TOOLS, growStatusCounts } from "./grow-hub";
import { demoRedirect, isPublicPath } from "./http-policy";
import { INTAKE_LINK_PLACES } from "./intake-links";
import { SATELLITES } from "./satellites";

const APP = resolve(__dirname, "../..");
const read = (p: string) => readFileSync(resolve(APP, p), "utf8");
const route = (p: string) => `src/routes/${p.replace(/^\//, "").replace(/\//g, ".")}.tsx`;

/** Where the element with each hash id lives. */
const HASH_HOME: Readonly<Record<string, string>> = {
  "crm-kit-title": "src/routes/crm.tsx",
  "crm-spot-title": "src/components/SponsorSpots.tsx",
  listino: "src/components/PartnerPackages.tsx",
  proposta: "src/routes/sponsor.tsx",
};

describe("SCD GROW hub tools", () => {
  it("links only routes that exist, and every hash points to a real id", () => {
    for (const t of GROW_TOOLS) {
      if (t.to) {
        const file = existsSync(resolve(APP, route(t.to))) ? route(t.to) : `src/routes/${t.to.slice(1)}.index.tsx`;
        expect(existsSync(resolve(APP, file)), `${t.id} → ${t.to}`).toBe(true);
      }
      if (t.hash) {
        const home = HASH_HOME[t.hash];
        expect(home, `${t.id}#${t.hash}`).toBeDefined();
        expect(read(home!), `${t.id}#${t.hash}`).toContain(`id="${t.hash}"`);
      }
      if (t.href) expect(existsSync(resolve(APP, route(t.href))), t.href).toBe(true);
      expect(t.to && t.href, `${t.id}: one link only`).toBeFalsy();
    }
  });

  it("tools still to build have no fake link, except the existing partner access screen", () => {
    for (const t of GROW_TOOLS.filter((x) => x.status === "da-fare")) {
      if (t.id === "partner") expect(t.to).toBe("/partner");
      else expect(t.to ?? t.href).toBeUndefined();
    }
  });

  it("has Italian labels for every status and audience, and counts every tool once", () => {
    for (const t of GROW_TOOLS) {
      expect(GROW_STATUS_LABEL[t.status]).toBeTruthy();
      expect(GROW_AUDIENCE_LABEL[t.audience]).toBeTruthy();
    }
    const c = growStatusCounts();
    expect(c.attivo + c.parziale + c["da-fare"]).toBe(GROW_TOOLS.length);
    expect(new Set(GROW_TOOLS.map((t) => t.id)).size).toBe(GROW_TOOLS.length);
  });

  it("sends companies to the public proposal form /sponsor#proposta", () => {
    const p = GROW_TOOLS.find((t) => t.id === "proposta")!;
    expect(p).toMatchObject({ to: "/sponsor", hash: "proposta", audience: "pubblica" });
    expect(isPublicPath("/sponsor")).toBe(true);
    const sponsor = read("src/routes/sponsor.tsx");
    expect(sponsor).toMatch(/id="proposta" tabIndex=\{-1\}/);
    expect(sponsor).toContain("scroll-mt-20");
  });

  it("carries no amounts, prospects or personal data", () => {
    const src = read("src/lib/grow-hub.ts");
    expect(src).not.toMatch(/€|\beuro\b|@[a-z0-9.-]+\.[a-z]{2,}|\+39|sponsor-development/i);
  });
});

describe("/grow page (internal, same access as /crm)", () => {
  const src = read("src/routes/grow.tsx");

  it("is gated by the crm work area and never indexed", () => {
    expect(src).toContain('getWorkAreaGate({ data: { area: "crm" } })');
    expect(src).toContain('<WorkAreaGateView id="crm" gate={gate}>');
    expect(src).toContain('{ name: "robots", content: "noindex" }');
    expect(src).toContain('workAreaHead("crm", loaderData?.gate)');
    expect(isPublicPath("/grow")).toBe(false);
  });

  it("is reachable in production (no demo redirect) and no public page sends visitors there", () => {
    expect(demoRedirect("/grow", true)).toBeNull();
    expect(INTAKE_LINK_PLACES.SPONSOR).not.toContain("/grow");
    for (const s of SATELLITES) {
      const preview = (s as { preview?: { to: string } }).preview;
      if (preview) expect(preview.to).not.toBe("/grow");
    }
  });

  it("reads sponsors and spots from their files, with no second register or prospect data", () => {
    expect(src).toContain('from "@/lib/spot-coverage"');
    expect(src).not.toMatch(/sponsor-development|createServerFn|fetch\(|localStorage|mailto:/);
    expect(src).not.toContain("/crm/partner");
  });

  it("uses the METAL palette with one meaning per tone and safe external links", () => {
    expect(src).toContain('className="scd-band relative');
    expect(src).toContain("scd-gold");
    expect(src).toMatch(/scd-band-azzurro[^"]*text-white/);
    expect(src).toContain("scd-band-sole");
    expect(src).not.toMatch(/scd-band-sole[^"]*scd-gold|scd-gold[^"]*scd-band-sole/);
    const blanks = src.match(/target="_blank"/g) ?? [];
    const safe = src.match(/target="_blank"\s+rel="noopener noreferrer"/g) ?? [];
    expect(blanks.length).toBeGreaterThan(0);
    expect(safe.length).toBe(blanks.length);
    expect(src).not.toContain("#8fa3c7");
  });

  it("keeps the colour classes byte-identical to the shared block", () => {
    const css = read("src/styles.css");
    expect(css).toContain("/* More club colours (Francesco 16/10/2026 21:54");
    expect(css.indexOf(".scd-band-azzurro {")).toBeLessThan(css.indexOf(".scd-gold {"));
    expect(css).toContain(".scd-navy-btn {");
  });
});

describe("/sponsor claims", () => {
  it("does not promise measurements that do not exist yet", () => {
    const s = read("src/routes/sponsor.tsx");
    expect(s).not.toMatch(/misurabile|Impression, click e lead/i);
    expect(read("src/lib/catalog.ts")).not.toMatch(/Visibilità misurabile/);
  });
});
