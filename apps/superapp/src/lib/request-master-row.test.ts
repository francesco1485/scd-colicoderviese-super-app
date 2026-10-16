/**
 * The Master Calendario row prepared by the request machine must be publishable by the real converter
 * (tools/sync/calendar_public_payload.py event_of): this test feeds the row to event_of() in Python, so a change on
 * either side that breaks the round trip fails here (scd-revisore 15/10/2026).
 */
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { masterCalendarRow, type RequestRow } from "./request-machine";

const CONVERTER = fileURLToPath(new URL("../../../../tools/sync/calendar_public_payload.py", import.meta.url));

// Loads the converter by path (no import from the working directory) and runs event_of on each row.
const PY = `
import importlib.util, json, sys
spec = importlib.util.spec_from_file_location("cpp", sys.argv[1])
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
out = []
for row in json.loads(sys.stdin.read()):
    try:
        out.append({"ok": True, "event": m.event_of(row, quiet=True)})
    except m.Stop as e:
        out.append({"ok": False, "stop": str(e)})
print(json.dumps(out))
`;

type PyResult = { ok: true; event: Record<string, unknown> | null } | { ok: false; stop: string };

function eventOf(rows: Array<Record<string, string>>): PyResult[] {
  const out = execFileSync("python3", ["-I", "-c", PY, CONVERTER], { input: JSON.stringify(rows), encoding: "utf8" });
  return JSON.parse(out) as PyResult[];
}

const asSheetRow = (r: RequestRow) => Object.fromEntries(masterCalendarRow(r).map((c) => [c.column, c.value]));

const base = (over: Partial<RequestRow>): RequestRow => ({
  id: "11111111-1111-1111-1111-111111111111",
  kind: "AMICHEVOLE",
  channel: "WHATSAPP",
  teamKey: "u15",
  startsAt: "2026-10-24T13:00:00.000Z",
  venue: "Colico · Campo 1",
  homeAway: "CASA",
  scope: "REGIONALE",
  note: null,
  opponentText: "Olginatese",
  status: "CONFERMATA",
  expiresAt: null,
  sentAt: null,
  confirmedAt: "2026-10-16T10:00:00.000Z",
  decisionNote: null,
  eventId: "e",
  formStatus: "DA_PREPARARE",
  calendarCopiedAt: null,
  createdAt: "2026-10-15T13:00:00.000Z",
  club: { id: "c", name: "A.S.D. Olginatese", city: "Olginate", province: "LC", figcMatricola: null, crestKey: null },
  ...over,
});

const TEAMS = ["prima", "u19", "u16", "u15", "2014", "2015", "pulcini", "primicalci", "piccoli"] as const;

describe("Master Calendario row ↔ calendar_public_payload.event_of", () => {
  it("is published by the converter for every team, at home and away, with the same group, id and data", () => {
    const rows = TEAMS.flatMap((t) => [base({ teamKey: t }), base({ teamKey: t, homeAway: "FUORI", venue: null })]);
    const res = eventOf(rows.map(asSheetRow));
    res.forEach((r, i) => {
      const row = rows[i]!;
      expect(r.ok, `${row.teamKey} ${row.homeAway}: ${r.ok ? "" : r.stop}`).toBe(true);
      if (!r.ok || !r.event) throw new Error(`not published: ${row.teamKey}`);
      expect(r.event).toMatchObject({
        id: `EVT-AMI-${row.teamKey!.toUpperCase()}-202610241500-ASDOLGINATESE-${row.homeAway}`,
        date: "2026-10-24",
        time: "15:00",
        group: row.teamKey,
        type: "AMICHEVOLE",
        home_away: row.homeAway,
        opponent: "A.S.D. OLGINATESE",
        source: "SCD",
        match_status: "CLUB_EVENT",
      });
      expect((r.event["verification"] as Record<string, boolean>)["time_confirmed"]).toBe(true);
    });
    const home = res[0]!;
    const away = res[1]!;
    if (home.ok && away.ok) {
      expect(home.event?.["venue"]).toBe("COLICO - CAMPO 1");
      expect(home.event?.["notice"]).toEqual([]);
      expect(away.event?.["venue"]).toBe("OLGINATE");
    }
  });

  it("flags an unknown pitch as to verify instead of claiming it confirmed", () => {
    const [r] = eventOf([asSheetRow(base({ venue: null }))]);
    expect(r?.ok).toBe(true);
    if (r?.ok) {
      expect((r.event?.["verification"] as Record<string, boolean>)["venue_confirmed"]).toBe(false);
      expect(r.event?.["notice"]).toContain("Orario o sede da verificare");
    }
  });

  it("never produces a row for generic Esordienti: the converter would stop on it", () => {
    const row = asSheetRow(base({ teamKey: "esordienti" }));
    expect(row["EVENT_ID"]).toBe("");
    expect(row["CATEGORY"]).toBe("");
    const [r] = eventOf([row]);
    expect(r?.ok).toBe(false);
  });

  it("gives distinct, stable ids to two friendlies of the same team on the same day", () => {
    const a = asSheetRow(base({}))["EVENT_ID"];
    const b = asSheetRow(base({ club: { id: "d", name: "Bellano", city: "Bellano", province: "LC", figcMatricola: null, crestKey: null } }))["EVENT_ID"];
    expect(a).not.toBe(b);
    expect(asSheetRow(base({}))["EVENT_ID"]).toBe(a);
  });
});
