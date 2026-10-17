import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  AREA_ALLENAMENTI_LIVE,
  AREA_PARTITE_LIVE,
  DOC_KINDS,
  DOC_MIME,
  REASON_CODES,
  asReason,
  documentProblems,
  fileSizeLabel,
  isMeetUrl,
  romeInstant,
  scoreOf,
  sessionProblems,
  shortName,
  storageName,
  tabellinoState,
} from "./team-area";

const r117 = readFileSync(resolve(__dirname, "../../../../supabase/migrations/20261017_r117_area_partite.sql"), "utf8");
const r118 = readFileSync(resolve(__dirname, "../../../../supabase/migrations/20261017_r118_area_allenamenti.sql"), "utf8");

describe("Area squadra helpers (UD-181)", () => {
  it("stays off until «applica r117 / r118»", () => {
    expect(AREA_PARTITE_LIVE).toBe(false);
    expect(AREA_ALLENAMENTI_LIVE).toBe(false);
    expect(r117).toMatch(/STAGED: NOT APPLIED/);
    expect(r118).toMatch(/STAGED: NOT APPLIED/);
  });

  it("marks the mister's tabellino Provvisorio until it equals the official LND score", () => {
    expect(tabellinoState(null, null)).toBe("NON_COMPILATO");
    expect(tabellinoState(null, { goalsFor: 1, goalsAgainst: 0 })).toBe("NON_COMPILATO");
    expect(tabellinoState({ goalsFor: 2, goalsAgainst: 1 }, null)).toBe("PROVVISORIO");
    expect(tabellinoState({ goalsFor: 2, goalsAgainst: 1 }, { goalsFor: 2, goalsAgainst: 1 })).toBe("CONFERMATO");
    expect(tabellinoState({ goalsFor: 2, goalsAgainst: 1 }, { goalsFor: 2, goalsAgainst: 2 })).toBe("DIVERSO");
    expect(scoreOf(0, 0)).toEqual({ goalsFor: 0, goalsAgainst: 0 });
    expect(scoreOf(1, null)).toBeNull();
  });

  it("offers no health category for impediments and keeps the codes equal to the database", () => {
    expect(REASON_CODES).not.toContain("SALUTE");
    expect(asReason("SCUOLA")).toBe("SCUOLA");
    expect(asReason("MALATTIA")).toBeNull();
    const codes = /impediment_code in \(([^)]*)\)/.exec(r117)?.[1] ?? "";
    expect(codes.split(",").map((s) => s.trim().replace(/'/g, ""))).toEqual([...REASON_CODES]);
    const notice = /notice_code in \(([^)]*)\)/.exec(r118)?.[1] ?? "";
    expect(notice.split(",").map((s) => s.trim().replace(/'/g, ""))).toEqual([...REASON_CODES]);
  });

  it("accepts only documents the private bucket accepts", () => {
    const kinds = /kind in \(('REFERTO'[^)]*)\)/.exec(r117)?.[1] ?? "";
    expect(kinds.split(",").map((s) => s.trim().replace(/'/g, ""))).toEqual([...DOC_KINDS]);
    for (const mime of DOC_MIME) expect(r117).toContain(`'${mime}'`);
    expect(documentProblems({ type: "application/pdf", size: 1000 })).toEqual([]);
    expect(documentProblems({ type: "text/html", size: 1000 })).toHaveLength(1);
    expect(documentProblems({ type: "image/jpeg", size: 16 * 1024 * 1024 })).toHaveLength(1);
    expect(storageName("Referto gara 12/10 è.pdf", 1700000000000)).toBe("1700000000000-Referto_gara_12_10_e_.pdf");
    expect(storageName("../../etc", 1)).toMatch(/^1-[A-Za-z0-9._-]+$/);
    expect(storageName("", 2)).toBe("2-documento");
    expect(fileSizeLabel(800)).toBe("800 B");
    expect(fileSizeLabel(2048)).toBe("2 KB");
    expect(fileSizeLabel(3 * 1024 * 1024)).toBe("3,0 MB");
  });

  it("allows only Google Meet links, like the database", () => {
    expect(isMeetUrl("https://meet.google.com/abc-defg-hij")).toBe(true);
    expect(isMeetUrl("http://meet.google.com/abc-defg-hij")).toBe(false);
    expect(isMeetUrl("https://meet.google.com.evil.example/abc")).toBe(false);
    expect(isMeetUrl("https://zoom.us/j/123")).toBe(false);
    expect(r118).toContain("'^https://meet\\.google\\.com/[a-z0-9-]{3,40}$'");
  });

  it("validates a session draft in plain words", () => {
    const ok = { date: "2026-10-20", time: "18:30", duration: 90, field: "Campo 1", theme: "", coachNotes: "", sharedNote: "", meetingUrl: "", liveNote: "" };
    expect(sessionProblems(ok)).toEqual([]);
    expect(sessionProblems({ ...ok, time: "25:00" })).toHaveLength(1);
    expect(sessionProblems({ ...ok, duration: 5 })).toHaveLength(1);
    expect(sessionProblems({ ...ok, meetingUrl: "https://example.org" })).toEqual(["Il link deve essere di Google Meet (https://meet.google.com/...)."]);
  });

  it("converts Rome wall-clock time with daylight saving", () => {
    expect(romeInstant("2026-10-20", "18:30")).toBe("2026-10-20T16:30:00.000Z");
    expect(romeInstant("2026-11-20", "18:30")).toBe("2026-11-20T17:30:00.000Z");
  });

  it("shortens names of minors outside the team staff", () => {
    expect(shortName("Primo Esempio")).toBe("Primo E.");
    expect(shortName("Primo Secondo Esempio")).toBe("Primo E.");
    expect(shortName("Solo")).toBe("Solo");
  });

  it("keeps every new table closed and every function with a fixed search_path", () => {
    for (const sql of [r117, r118]) {
      const definer = sql.match(/security definer/g)?.length ?? 0;
      const fixed = sql.match(/security definer\s+set search_path to 'public'/g)?.length ?? 0;
      expect(definer).toBeGreaterThan(0);
      expect(fixed).toBe(definer);
      expect(sql).not.toMatch(/grant [a-z, ]+ on table/i);
      expect(sql).not.toMatch(/^\s*grant[^\n]*to anon/m);
      expect(sql).not.toMatch(/net\.http|pg_net|http_post|cron\.schedule/i);
    }
  });
});
