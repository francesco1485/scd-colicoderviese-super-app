import { describe, expect, it } from "vitest";

import {
  APPROVER_POSITIONS,
  IMPIANTI_POSITIONS,
  approvalsAccess,
  bookingsCsvUrl,
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

describe("approvals gate and CSV source", () => {
  it("lets only Presidente and Direttore generale decide", () => {
    expect(APPROVER_POSITIONS).toEqual(["presidente", "direttore-generale"]);
    expect(
      approvalsAccess(
        { position: "direttore-generale", role: "DIRECTION" },
        false,
      ).mode,
    ).toBe("tool");
    expect(
      approvalsAccess(
        { position: "responsabile-attivita-base", role: "MANAGER" },
        false,
      ),
    ).toEqual({ mode: "access", reason: "position" });
    expect(approvalsAccess(null, true).mode).toBe("preview");
    expect(approvalsAccess(null, false).mode).toBe("access");
  });

  it("accepts only an https Google Sheets URL for SCD_BOOKINGS_CSV_URL", () => {
    const ok =
      "https://docs.google.com/spreadsheets/d/e/2PACX-abc/pub?gid=0&single=true&output=csv";
    expect(bookingsCsvUrl({ SCD_BOOKINGS_CSV_URL: ok })).toBe(ok);
    expect(bookingsCsvUrl({})).toBeNull();
    expect(
      bookingsCsvUrl({
        SCD_BOOKINGS_CSV_URL: "http://docs.google.com/spreadsheets/x",
      }),
    ).toBeNull();
    expect(
      bookingsCsvUrl({
        SCD_BOOKINGS_CSV_URL: "https://evil.example/spreadsheets/x",
      }),
    ).toBeNull();
    expect(bookingsCsvUrl({ SCD_BOOKINGS_CSV_URL: "not a url" })).toBeNull();
  });
});
