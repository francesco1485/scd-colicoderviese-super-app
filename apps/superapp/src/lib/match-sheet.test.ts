import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { MATCH_SHEET_RULES, STAFF_ROLES, rulesFor, sheetText, sortPlayers, suggestShirt, validateSheet, type SheetDraft } from "./match-sheet";

const sql = readFileSync(fileURLToPath(new URL("../../../../supabase/migrations/20261011_r70_match_sheet_draft.sql", import.meta.url)), "utf8");
const A = "00000000-0000-4000-8000-00000000000";
const called = new Set([1, 2, 3, 4].map((i) => A + i));
const d = (o: Partial<SheetDraft>): SheetDraft => ({ players: [], staff: [], captain: null, vice: null, ...o });

describe("pre-distinta (r70)", () => {
  it("keeps the eleven-a-side team codes and the staff roles equal to the database", () => {
    const eleven = /when p_team_code in \(([^)]+)\) then 11/.exec(sql)?.[1]?.match(/'([a-z0-9]+)'/g)?.map((x) => x.slice(1, -1)) ?? [];
    expect([...eleven].sort()).toEqual(Object.keys(MATCH_SHEET_RULES).sort());
    for (const r of STAFF_ROLES) expect(sql).toContain(`'${r}'`);
    expect(rulesFor("u15")).toEqual({ maxListed: 20, maxStarters: 11, captainRequired: true });
    expect(rulesFor("pulcini").maxStarters).toBeNull();
  });

  it("checks numbers, starters, captain and the ready requirements", () => {
    const r = rulesFor("u15");
    const ok = d({ players: [{ athleteId: A + 1, shirt: 1, starter: true }, { athleteId: A + 2, shirt: 7, starter: true }, { athleteId: A + 3, shirt: 12, starter: false }], captain: A + 1, vice: A + 2 });
    expect(validateSheet(ok, r, called, false)).toEqual([]);
    expect(validateSheet(ok, r, called, true)).toEqual(["Indica il dirigente accompagnatore ufficiale."]);
    expect(validateSheet({ ...ok, staff: [{ personId: A + 9, role: "DIRIGENTE_ACCOMPAGNATORE" }] }, r, called, true)).toEqual([]);
    expect(validateSheet({ ...ok, vice: A + 3 }, r, called, false)).toContain("Il vice capitano deve essere tra i titolari.");
    expect(validateSheet(d({ players: [{ athleteId: A + 1, shirt: 5, starter: true }, { athleteId: A + 2, shirt: 5, starter: true }] }), r, called, false)).toContain("Due giocatori hanno lo stesso numero di maglia.");
    expect(validateSheet(d({ players: [{ athleteId: A + 8, shirt: 5, starter: true }] }), r, called, false)).toContain("In lista c'è chi non è più convocato: toglilo.");
    const twelve = d({ players: Array.from({ length: 12 }, (_, i) => ({ athleteId: A + 1, shirt: i + 1, starter: true })) });
    expect(validateSheet(twelve, r, new Set([A + 1]), false)).toContain("Troppi titolari: massimo 11.");
    expect(validateSheet(d({ players: [{ athleteId: A + 1, shirt: 3, starter: false }] }), rulesFor("pulcini"), called, true)).toEqual(["Indica il dirigente accompagnatore ufficiale."]);
  });

  it("suggests the last shirt if free, else the lowest free number", () => {
    expect(suggestShirt(10, new Set([1, 2]))).toBe(10);
    expect(suggestShirt(1, new Set([1, 2]))).toBe(3);
    expect(suggestShirt(null, new Set())).toBe(1);
  });

  it("writes the copy text with starters first, C and VC marked", () => {
    const draft = d({ players: [{ athleteId: A + 3, shirt: 14, starter: false }, { athleteId: A + 2, shirt: 9, starter: true }, { athleteId: A + 1, shirt: 1, starter: true }], captain: A + 2, vice: A + 1, staff: [{ personId: "p", role: "DIRIGENTE_ACCOMPAGNATORE" }] });
    expect(sortPlayers(draft.players).map((p) => p.shirt)).toEqual([1, 9, 14]);
    const text = sheetText(draft, rulesFor("u15"), (id) => `Atleta ${id.slice(-1)}`, () => "Mario Rossi", "U15 – Test");
    expect(text).toBe("U15 – Test\n\nTITOLARI\n1. Atleta 1 (VC)\n9. Atleta 2 (C)\n\nRISERVE\n14. Atleta 3\n\nPANCHINA\nDirigente accompagnatore ufficiale: Mario Rossi");
  });

  it("stores no document numbers, phones or e-mails", () => {
    const code = sql.split("\n").filter((l) => !l.trim().startsWith("--")).join("\n");
    expect(code).not.toMatch(/fiscal|document_number|phone|email/i);
  });
});
