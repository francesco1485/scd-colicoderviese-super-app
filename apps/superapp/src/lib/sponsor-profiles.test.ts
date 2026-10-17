import { describe, expect, it } from "vitest";

import { NAME_TO_CONFIRM, PROFILE_UNKNOWN, SPONSOR_DETAILS, sponsorProfile, thanksLine, websiteLabel } from "./sponsor-profiles";
import { SPONSOR_SPOTS } from "./sponsor-spots";
import { SPONSORS, type Sponsor } from "./sponsors";

const bySlug = (slug: string) => SPONSORS.find((s) => s.slug === slug)!;

describe("sponsor card on the «Già con noi» wall", () => {
  it("every partner has a card; the name only when verified", () => {
    for (const s of SPONSORS) {
      const p = sponsorProfile(s);
      expect(p.name, s.slug).toBe(s.name && s.nameVerified ? s.name : null);
    }
    expect(NAME_TO_CONFIRM).toMatch(/da confermare/);
  });

  it("sector and town are never invented: null until recorded with a source", () => {
    expect(PROFILE_UNKNOWN).toBe("da confermare");
    for (const s of SPONSORS) {
      const p = sponsorProfile(s);
      const d = SPONSOR_DETAILS[s.slug];
      expect(p.sector, s.slug).toBe(d?.sector ?? null);
      expect(p.town, s.slug).toBe(d?.town ?? null);
    }
    for (const d of Object.values(SPONSOR_DETAILS)) expect(d.source.length).toBeGreaterThan(5);
  });

  it("website only from the documented spots, https only; handle only when verified", () => {
    for (const s of SPONSORS) {
      const p = sponsorProfile(s);
      const spot = SPONSOR_SPOTS.find((x) => x.slug === s.slug);
      expect(p.website, s.slug).toBe(spot?.website ?? null);
      if (p.website) expect(p.website).toMatch(/^https:\/\//);
      expect(p.socialHandle, s.slug).toBe(spot?.socialHandle ?? null);
    }
    expect(websiteLabel("https://www.dellocapetroli.com/")).toBe("www.dellocapetroli.com");
  });

  it("«Grazie a …» only for documented support: the LED spot, the kit supply", () => {
    const hdi = sponsorProfile(bySlug("hdi-maglia"));
    expect(thanksLine(hdi)).toBe("Grazie a HDI Assicurazioni · Maglia Assicurazioni per il suo spot sul LED wall a bordo campo a Colico.");
    const saglio = thanksLine(sponsorProfile(bySlug("saglio-sport")));
    expect(saglio).toContain("Grazie a Saglio Sport Cantù per il suo spot sul LED wall a bordo campo a Colico e i kit ufficiali 2026/27");
    // A partner without a spot or a documented supply gets no thanks line.
    expect(thanksLine(sponsorProfile(bySlug("gimoka")))).toBeNull();
  });

  it("no name, no thanks: an unverified partner never gets a «Grazie a» line", () => {
    const ghost: Sponsor = { slug: "hdi-maglia", name: "Nome incerto", nameVerified: false, src: "/x.webp" };
    const p = sponsorProfile(ghost);
    expect(p.name).toBeNull();
    expect(p.support).toEqual([]);
    expect(thanksLine(p)).toBeNull();
  });

  it("a spot with changes requested is not a support item", () => {
    const spots = SPONSOR_SPOTS.map((s) => (s.slug === "carcano" ? { ...s, status: "MODIFICHE_RICHIESTE" as const } : s));
    expect(sponsorProfile(bySlug("carcano"), spots).support).toEqual([]);
  });
});
