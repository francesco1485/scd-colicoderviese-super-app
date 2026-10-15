import { describe, expect, it } from "vitest";

import { SPONSORS } from "./sponsors";
import {
  SEAT_PACKAGE_INTERNAL,
  FORBIDDEN_HYPE_STEMS,
  PACKAGE_STEPS,
  PARTNER_PACKAGES,
  formatAudienceNumbers,
  formatPackagePrice,
  hypeWordsIn,
  packageById,
  packageRequestNote,
  parsePackageParam,
  requestablePackages,
} from "./sponsor-packages";

const copyOf = (p: (typeof PARTNER_PACKAGES)[number]) =>
  [p.title, p.summary, p.audience, p.audienceNumbers ?? "", p.link?.label ?? "", ...p.benefits].join(" \n ");

describe("PARTNER_PACKAGES", () => {
  it("has 4 to 5 packages, each with id, title, summary, audience and at least 3 benefits", () => {
    expect(PARTNER_PACKAGES.length).toBeGreaterThanOrEqual(4);
    expect(PARTNER_PACKAGES.length).toBeLessThanOrEqual(5);
    for (const p of PARTNER_PACKAGES) {
      expect(p.id).toMatch(/^[a-z0-9-]{2,40}$/);
      expect(p.title.trim().length).toBeGreaterThan(2);
      expect(p.summary.trim().length).toBeGreaterThan(10);
      expect(p.audience.trim().length).toBeGreaterThan(10);
      expect(p.benefits.length).toBeGreaterThanOrEqual(3);
      for (const b of p.benefits) expect(b.trim().length).toBeGreaterThan(5);
    }
  });

  it("ids are unique", () => {
    const ids = PARTNER_PACKAGES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("no featured package (no showcase, Francesco 15/10/2026), the LED wall listed first", () => {
    expect(PARTNER_PACKAGES.some((p) => "featured" in p && (p as { featured?: boolean }).featured)).toBe(false);
    expect(PARTNER_PACKAGES[0]?.id).toBe("ledwall");
  });

  it("no price is a number while it is da_approvare, and today every price waits for approval", () => {
    for (const p of PARTNER_PACKAGES) {
      expect(p.price.kind).toBe("da_approvare");
      expect(Object.keys(p.price)).toEqual(["kind"]);
      for (const v of Object.values(p.price)) expect(typeof v).not.toBe("number");
      expect(formatPackagePrice(p.price)).toBe("Prezzo su richiesta · in approvazione");
    }
  });

  it("no audience numbers are invented: all are 'da misurare' and no digits appear in audience copy", () => {
    for (const p of PARTNER_PACKAGES) {
      expect(p.audienceNumbers).toBeNull();
      expect(formatAudienceNumbers(p)).toBe("Numeri: da misurare");
      expect(p.audience).not.toMatch(/\d/);
    }
  });

  it("no euro amounts anywhere in the copy", () => {
    for (const p of PARTNER_PACKAGES) expect(copyOf(p)).not.toMatch(/€|\beuro\b/i);
  });

  it("no forbidden hype words in packages and steps", () => {
    for (const p of PARTNER_PACKAGES) expect(hypeWordsIn(copyOf(p)), p.id).toEqual([]);
    for (const s of PACKAGE_STEPS) expect(hypeWordsIn(`${s.title} ${s.text}`)).toEqual([]);
  });

  it("does not name any current sponsor (this list never says who is a sponsor)", () => {
    const names = SPONSORS.flatMap((s) => (s.name && s.nameVerified ? [s.name.toLowerCase()] : []));
    for (const p of PARTNER_PACKAGES) {
      const text = copyOf(p).toLowerCase();
      for (const n of names) expect(text.includes(n), `${p.id} mentions ${n}`).toBe(false);
    }
  });

  it("the seat package is internal (UD-132): not offered on /sponsor, not requestable", () => {
    expect(packageById("seggiolino")).toBeUndefined();
    expect(SEAT_PACKAGE_INTERNAL.link?.to).toBe("/sostieni");
    expect(requestablePackages().map((p) => p.id)).not.toContain("seggiolino");
    expect(requestablePackages().map((p) => p.id)).toEqual(["ledwall", "maglia-kit", "tornei", "digitale-giovanili"]);
  });
});

describe("helpers", () => {
  it("hypeWordsIn finds stems at word start only", () => {
    expect(hypeWordsIn("Un'occasione Straordinaria e unica")).toEqual(["straordinari", "unica"]);
    expect(hypeWordsIn("Comunica con le famiglie")).toEqual([]);
    expect(FORBIDDEN_HYPE_STEMS).toContain("incredibil");
  });

  it("formatPackagePrice renders an approved euro price (for later use)", () => {
    expect(formatPackagePrice({ kind: "euro", from: 1500 })).toBe("da € 1.500");
    expect(formatPackagePrice({ kind: "euro", from: 500, to: 900 })).toBe("€ 500 – € 900");
    expect(formatPackagePrice({ kind: "euro", from: 500, to: 500 })).toBe("da € 500");
  });

  it("parsePackageParam accepts only known requestable ids", () => {
    expect(parsePackageParam("ledwall")).toBe("ledwall");
    expect(parsePackageParam("tornei")).toBe("tornei");
    expect(parsePackageParam("seggiolino")).toBeUndefined();
    expect(parsePackageParam("naming")).toBeUndefined();
    expect(parsePackageParam(42)).toBeUndefined();
    expect(parsePackageParam(undefined)).toBeUndefined();
  });

  it("packageRequestNote names the chosen package for the form message", () => {
    expect(packageRequestNote("maglia-kit")).toBe("Mi interessa il pacchetto «Maglia e kit».");
    expect(packageRequestNote("sconosciuto")).toBe("");
    expect(packageRequestNote(undefined)).toBe("");
  });

  it("'Come funziona' has 3 steps and no promised response time", () => {
    expect(PACKAGE_STEPS).toHaveLength(3);
    expect(PACKAGE_STEPS.map((s) => s.text).join(" ")).not.toMatch(/entro|\d+\s*(ore|giorni)/i);
  });
});
