import { describe, expect, it } from "vitest";

import { INSERIMENTI_COLUMNS, buildInserimento, clubDate, isoToItalian, sheetCell } from "./inserimenti";

const base = { role: "Responsabile trasporti", type: "Richiesta", area: "Pulmini", description: "Serve il pulmino per la trasferta", now: new Date("2026-10-11T08:00:00Z") };

describe("Inserimenti row builder", () => {
  it("has the ten columns of the sheet, in order", () => {
    expect(INSERIMENTI_COLUMNS).toEqual(["Data", "Inserito da (ruolo)", "Tipo", "Area", "Descrizione", "Scadenza", "Link o allegato", "Stato", "Esito", "Lavorato il"]);
  });

  it("builds a tab-separated row with Stato NUOVA and empty Esito / Lavorato il", () => {
    const r = buildInserimento({ ...base, deadline: "2026-10-17", link: "https://docs.google.com/x" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.cells).toEqual(["11/10/2026", "Responsabile trasporti", "Richiesta", "Pulmini", "Serve il pulmino per la trasferta", "17/10/2026", "https://docs.google.com/x", "NUOVA", "", ""]);
    expect(r.cells).toHaveLength(INSERIMENTI_COLUMNS.length);
    expect(r.tsv.split("\t")).toHaveLength(10);
  });

  it("leaves optional deadline and link empty", () => {
    const r = buildInserimento(base);
    expect(r.ok && r.cells[5]).toBe("");
    expect(r.ok && r.cells[6]).toBe("");
  });

  it("uses the club time zone for the date", () => {
    expect(clubDate(new Date("2026-10-10T23:30:00Z"))).toBe("11/10/2026");
  });

  it("refuses missing fields, bad dates and non-web links", () => {
    const r = buildInserimento({ role: " ", type: "", area: "", description: "", now: base.now });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["area", "description", "role", "type"]);
    const d = buildInserimento({ ...base, deadline: "2026-02-30" });
    expect(!d.ok && d.errors.deadline).toBeTruthy();
    const l = buildInserimento({ ...base, link: "javascript:alert(1)" });
    expect(!l.ok && l.errors.link).toBeTruthy();
    expect(buildInserimento({ ...base, link: "verbale.pdf" }).ok).toBe(true);
    const long = buildInserimento({ ...base, description: "a".repeat(501) });
    expect(!long.ok && long.errors.description).toBeTruthy();
  });

  it("keeps the row on one line and neutralises formulas", () => {
    const r = buildInserimento({ ...base, description: "riga 1\nriga\t2", link: "=HYPERLINK(\"x\")" });
    expect(r.ok && r.cells[4]).toBe("riga 1 riga 2");
    expect(r.ok && r.cells[6]).toBe("'=HYPERLINK(\"x\")");
    expect(r.ok && r.tsv.includes("\n")).toBe(false);
    expect(sheetCell("-5")).toBe("'-5");
    expect(sheetCell("@me")).toBe("'@me");
    expect(sheetCell("  ok  ")).toBe("ok");
  });

  it("converts ISO dates only when real", () => {
    expect(isoToItalian("2026-12-01")).toBe("01/12/2026");
    expect(isoToItalian("2026-13-01")).toBeNull();
    expect(isoToItalian("1/12/2026")).toBeNull();
  });
});
