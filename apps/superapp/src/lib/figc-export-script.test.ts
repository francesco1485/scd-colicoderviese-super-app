import { describe, expect, it } from "vitest";

import { FIGC_EXPORT_BOOKMARKLET, FIGC_EXPORT_SOURCE, FIGC_PORTAL_HOST, FIGC_STORICO_ENDPOINT } from "./figc-export-script";
import { OWN_CLUB_CODE, exportCareerSchema, exportFileSchema, exportRosterSchema } from "./figc-history";

describe("FIGC portal export script", () => {
  it("is valid JavaScript (compiles without running)", () => {
    expect(() => new Function(FIGC_EXPORT_SOURCE)).not.toThrow();
  });

  it("is a bookmarklet whose decoded body is the readable source", () => {
    expect(FIGC_EXPORT_BOOKMARKLET.startsWith("javascript:")).toBe(true);
    expect(decodeURIComponent(FIGC_EXPORT_BOOKMARKLET.slice("javascript:".length))).toBe(FIGC_EXPORT_SOURCE);
  });

  it("contains no external URL and loads no remote code", () => {
    expect(FIGC_EXPORT_SOURCE).not.toMatch(/https?:\/\//i);
    expect(FIGC_EXPORT_SOURCE).not.toMatch(/\/\/[a-z0-9.-]+\.[a-z]{2,}/i);
    expect(FIGC_EXPORT_SOURCE).not.toMatch(/\beval\(|new Function|import\(|createElement\(["']script|XMLHttpRequest|sendBeacon|WebSocket/);
    // The only network call is the portal's own storico page, same origin.
    const fetches = [...FIGC_EXPORT_SOURCE.matchAll(/fetch\(([^,]+),/g)].map((m) => m[1]!.trim());
    expect(fetches).toEqual(["STORICO + encodeURIComponent(todo[i])"]);
    expect(FIGC_EXPORT_SOURCE).toContain(`var STORICO = "${FIGC_STORICO_ENDPOINT}"`);
    expect(FIGC_EXPORT_SOURCE).toContain('credentials: "same-origin"');
  });

  it("runs only on the LND portal, for our club, throttled", () => {
    expect(FIGC_EXPORT_SOURCE).toContain(`var HOST = "${FIGC_PORTAL_HOST}"`);
    expect(FIGC_EXPORT_SOURCE).toContain("location.hostname !== HOST");
    expect(FIGC_EXPORT_SOURCE).toContain(`var CLUB_CODE = "${OWN_CLUB_CODE}"`);
    expect(FIGC_EXPORT_SOURCE).toContain("await sleep(250)");
    expect(FIGC_EXPORT_SOURCE).toContain('querySelector("#next-page")');
  });

  it("never collects fiscal codes: the CF cell is skipped and no field carries it", () => {
    expect(FIGC_EXPORT_SOURCE).toContain("CF_RE.test(c)) continue;");
    expect(FIGC_EXPORT_SOURCE).not.toMatch(/fiscal|codice_fiscale|codiceFiscale|\bcf\s*:/i);
  });

  it("writes exactly the fields of the export schema", () => {
    const keysOf = (re: RegExp) => {
      const m = re.exec(FIGC_EXPORT_SOURCE);
      expect(m, re.source).not.toBeNull();
      return [...m![1]!.matchAll(/(\w+):/g)].map((x) => x[1]).sort();
    };
    expect(keysOf(/out\.push\(\{ (matricola: mat, name[^}]*)\}/)).toEqual(Object.keys(exportRosterSchema.shape).sort());
    expect(keysOf(/out\.push\(\{ (matricola: mat, season[^}]*)\}/)).toEqual(Object.keys(exportCareerSchema.shape).sort());
    expect(keysOf(/var data = \{ ([^}]*)\}/)).toEqual(Object.keys(exportFileSchema.shape).sort());
    expect(FIGC_EXPORT_SOURCE).toContain('kind: "scd-figc-export", version: 1');
    expect(FIGC_EXPORT_SOURCE).toContain('"scd-figc-storico-" + new Date().toISOString().slice(0, 10) + ".json"');
  });
});
