import { describe, expect, it } from "vitest";

import { OFFICIAL_ADDRESS, OFFICIAL_ORIGIN, PLANNED_ADDRESS, displayAddress, installUrl, officialOrigin } from "./install-link";

describe("install link (UD-071, official address app.colicoderviese.it)", () => {
  it("uses the official domain by default, whatever host the page is opened from", () => {
    expect(OFFICIAL_ADDRESS).toBe("app.colicoderviese.it");
    expect(OFFICIAL_ORIGIN).toBe("https://app.colicoderviese.it");
    expect(PLANNED_ADDRESS).toBe(OFFICIAL_ADDRESS);
    expect(displayAddress()).toBe("app.colicoderviese.it");
    expect(installUrl()).toBe("https://app.colicoderviese.it/installa");
    expect(officialOrigin(null)).toBe(OFFICIAL_ORIGIN);
  });

  it("honours an explicit, valid site URL and ignores invalid ones", () => {
    expect(officialOrigin("https://app.colicoderviese.it/")).toBe("https://app.colicoderviese.it");
    expect(installUrl("https://app.colicoderviese.it/some/path")).toBe("https://app.colicoderviese.it/installa");
    expect(displayAddress("not a url")).toBe(OFFICIAL_ADDRESS);
    expect(installUrl("javascript:alert(1)")).toBe(`${OFFICIAL_ORIGIN}/installa`);
  });

  it("never prints the temporary Render host", () => {
    expect(installUrl()).not.toContain("onrender.com");
    expect(displayAddress()).not.toContain("onrender.com");
  });
});
