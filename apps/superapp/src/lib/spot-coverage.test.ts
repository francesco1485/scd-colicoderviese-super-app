import { describe, expect, it } from "vitest";

import { NEUTRAL_SPONSOR_LABEL, coverageGroups, coverageLabel, coverageSummary, spotCoverage } from "./spot-coverage";
import { SPONSOR_SPOTS, buildSpots, type SponsorSpot } from "./sponsor-spots";
import { SPONSORS, type Sponsor } from "./sponsors";

const sp = (slug: string, name: string | null, nameVerified = true): Sponsor => ({ slug, name, nameVerified, src: `/media/sponsor/${slug}.webp` });

describe("LED spot coverage of the season sponsors (/grow)", () => {
  it("has one row per sponsor of sponsors.ts, in the same order", () => {
    const rows = spotCoverage();
    expect(rows.map((r) => r.slug)).toEqual(SPONSORS.map((s) => s.slug));
  });

  it("matches the seven ready spots and leaves every other sponsor without one", () => {
    const sum = coverageSummary();
    expect(sum.sponsors).toBe(SPONSORS.length);
    expect(sum.withSpot).toBe(SPONSOR_SPOTS.length);
    expect(sum.withSpot).toBe(7);
    expect(sum.withoutSpot).toBe(SPONSORS.length - 7);
    expect(sum.orphanSpots).toEqual([]);
    const { ready, missing } = coverageGroups();
    expect(ready.map((r) => r.slug)).toEqual(SPONSOR_SPOTS.map((s) => s.slug));
    expect(missing.every((r) => r.spot === null)).toBe(true);
    expect(ready.length + missing.length).toBe(SPONSORS.length);
  });

  it("carries the spot status from sponsor-spots.ts and links the review page", () => {
    for (const r of coverageGroups().ready) {
      const spot = SPONSOR_SPOTS.find((s) => s.slug === r.slug)!;
      expect(r.spot?.status).toBe(spot.status);
      expect(r.spot?.reviewPath).toBe(`/spot/${spot.slug}`);
      expect(r.spot?.statusLabel.length).toBeGreaterThan(0);
    }
    const byStatus = coverageSummary().byStatus;
    expect(Object.values(byStatus).reduce((a, b) => a + b, 0)).toBe(SPONSOR_SPOTS.length);
  });

  it("never names a sponsor whose name is not verified", () => {
    const rows = spotCoverage();
    for (const s of SPONSORS.filter((x) => !x.nameVerified || !x.name)) {
      const r = rows.find((x) => x.slug === s.slug)!;
      expect(r.name).toBeNull();
      expect(r.nameToConfirm).toBe(true);
      expect(coverageLabel(r)).toBe(NEUTRAL_SPONSOR_LABEL);
    }
    expect(coverageSummary().namesToConfirm).toBe(SPONSORS.filter((x) => !x.nameVerified || !x.name).length);
  });

  it("works on any list: empty, spot of an unknown sponsor, status counts", () => {
    expect(coverageSummary([], [])).toMatchObject({ sponsors: 0, withSpot: 0, withoutSpot: 0, namesToConfirm: 0 });
    const list = [sp("a", "Alfa"), sp("b", null, false), sp("c", "Gamma")];
    const base = buildSpots(undefined, SPONSORS)[0]!;
    const spots: SponsorSpot[] = [
      { ...base, slug: "a", status: "IN_ONDA" },
      { ...base, slug: "zz", status: "DA_APPROVARE" },
    ];
    const sum = coverageSummary(list, spots);
    expect(sum).toMatchObject({ sponsors: 3, withSpot: 1, withoutSpot: 2, namesToConfirm: 1, orphanSpots: ["zz"] });
    expect(sum.byStatus).toEqual({ DA_APPROVARE: 0, MODIFICHE_RICHIESTE: 0, APPROVATO: 0, IN_ONDA: 1 });
    const rows = spotCoverage(list, spots);
    expect(rows[0]?.spot?.statusLabel).toBe("In onda");
    expect(rows[1]).toMatchObject({ name: null, nameToConfirm: true, spot: null });
  });
});
