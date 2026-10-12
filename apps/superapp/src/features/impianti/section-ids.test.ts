import { describe, expect, it } from "vitest";

import { IMPIANTI_SECTIONS } from "./ImpiantiCalendari";
import { SECTION_IDS, isSectionId } from "./section-ids";

describe("impianti section ids", () => {
  it("match the sections the view renders, in the same order", () => {
    expect(IMPIANTI_SECTIONS.map((s) => s.id)).toEqual([...SECTION_IDS]);
  });
  it("accept only known ids", () => {
    expect(isSectionId("quadro")).toBe(true);
    expect(isSectionId("dervio")).toBe(true);
    expect(isSectionId("admin")).toBe(false);
    expect(isSectionId(undefined)).toBe(false);
    expect(isSectionId(3)).toBe(false);
  });
});
