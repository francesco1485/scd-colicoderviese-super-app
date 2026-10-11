import { describe, expect, it } from "vitest";

import {
  IMPIANTI_POSITIONS,
  POSITION_LABEL,
  impiantiAccess,
  stagingPreviewEnabled,
} from "./impianti-access";

describe("impianti access gate", () => {
  it("reads the four positions from the registry, each with a label", () => {
    expect(IMPIANTI_POSITIONS).toEqual([
      "presidente",
      "direttore-generale",
      "responsabile-attivita-base",
      "coordinatore-attivita-sportiva",
    ]);
    for (const p of IMPIANTI_POSITIONS)
      expect(POSITION_LABEL[p], p).toBeTruthy();
  });

  it("opens the tool only to a verified session with an allowed position", () => {
    expect(
      impiantiAccess({ position: "presidente", role: "DIRECTION" }, false),
    ).toEqual({ mode: "tool", position: "presidente" });
    expect(
      impiantiAccess(
        { position: "coordinatore-attivita-sportiva", role: "MANAGER" },
        false,
      ).mode,
    ).toBe("tool");
    expect(
      impiantiAccess({ position: "mister", role: "MISTER" }, false),
    ).toEqual({ mode: "access", reason: "position" });
    // A coarse role alone is not enough: MANAGER covers other positions too.
    expect(impiantiAccess({ position: null, role: "MANAGER" }, false)).toEqual({
      mode: "access",
      reason: "position",
    });
    expect(impiantiAccess(null, false)).toEqual({
      mode: "access",
      reason: "no-session",
    });
  });

  it("shows the staging preview when the flag is on and there is no allowed session", () => {
    expect(impiantiAccess(null, true)).toEqual({ mode: "preview" });
    expect(
      impiantiAccess({ position: "presidente", role: "DIRECTION" }, true).mode,
    ).toBe("tool");
  });

  it("never enables the preview in a production deploy", () => {
    const pw = "x".repeat(24);
    expect(stagingPreviewEnabled({}, false)).toBe(false);
    expect(stagingPreviewEnabled({ SCD_STAGING_PREVIEW: "1" }, false)).toBe(
      true,
    );
    expect(stagingPreviewEnabled({ SCD_STAGING_PREVIEW: "1" }, true)).toBe(
      false,
    );
    expect(
      stagingPreviewEnabled(
        { SCD_STAGING_PREVIEW: "1", SCD_STAGING_PASSWORD: "short" },
        true,
      ),
    ).toBe(false);
    expect(
      stagingPreviewEnabled(
        { SCD_STAGING_PREVIEW: "1", SCD_STAGING_PASSWORD: pw },
        true,
      ),
    ).toBe(true);
    expect(
      stagingPreviewEnabled(
        {
          SCD_STAGING_PREVIEW: "1",
          SCD_STAGING_PASSWORD: pw,
          SCD_ENV: "production",
        },
        true,
      ),
    ).toBe(false);
    expect(
      stagingPreviewEnabled(
        { SCD_STAGING_PREVIEW: "true", SCD_STAGING_PASSWORD: pw },
        true,
      ),
    ).toBe(false);
  });
});
