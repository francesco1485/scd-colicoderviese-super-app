import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { SPONSORS, sponsorLabel, sponsorsToConfirm } from "./sponsors";

describe("current sponsors 2026/27", () => {
  it("has the 37 logos of the Direzione board, unique and on disk", () => {
    expect(SPONSORS).toHaveLength(37);
    expect(new Set(SPONSORS.map((s) => s.slug)).size).toBe(37);
    for (const s of SPONSORS) expect(existsSync(join(__dirname, "../../public", s.src)), s.src).toBe(true);
  });

  it("includes renewed sponsors HDI/Maglia and Saglio, and never invents a name", () => {
    expect(SPONSORS[0]?.name).toMatch(/HDI/);
    expect(SPONSORS.some((s) => s.slug === "saglio-sport")).toBe(true);
    for (const s of sponsorsToConfirm()) expect(sponsorLabel(s)).toBe(s.name && s.nameVerified ? s.name : "Sponsor della ColicoDerviese");
    expect(sponsorLabel({ slug: "x", name: null, nameVerified: false, src: "" })).toBe("Sponsor della ColicoDerviese");
  });
});
