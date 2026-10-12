import { describe, expect, it } from "vitest";

import { PLANNED_ADDRESS, displayAddress, installUrl } from "./install-link";

describe("install link (UD-071)", () => {
  it("prefers the configured site over the current origin", () => {
    expect(displayAddress("https://app.colicoderviese.it", "https://x.onrender.com")).toBe("app.colicoderviese.it");
    expect(installUrl("https://app.colicoderviese.it", "https://x.onrender.com")).toBe("https://app.colicoderviese.it/installa");
  });
  it("falls back to the current origin, then to the planned address", () => {
    expect(displayAddress(null, "https://colicoderviese.onrender.com")).toBe("colicoderviese.onrender.com");
    expect(installUrl(null, "https://colicoderviese.onrender.com/")).toBe("https://colicoderviese.onrender.com/installa");
    expect(displayAddress(null, null)).toBe(PLANNED_ADDRESS);
    expect(displayAddress("not a url", null)).toBe(PLANNED_ADDRESS);
    expect(installUrl(null, null)).toBe(`https://${PLANNED_ADDRESS}/installa`);
  });
});
