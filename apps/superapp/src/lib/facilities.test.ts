import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  CORRECTION_KINDS,
  FACILITIES,
  clubClock,
  correctionProblems,
  correctionRow,
  correctionTsv,
  hoursLines,
  isProposed,
  publicSite,
  publicSpace,
  siteById,
  slotTimes,
  spaceById,
  spaceStatus,
  spacesOf,
  usageAt,
  validateFacilities,
  whoMayEnter,
  type FacilitiesContract,
} from "./facilities";
import { loadQuadro } from "./public-snapshots";

const repo = (p: string) => fileURLToPath(new URL(`../../../../${p}`, import.meta.url));
const clone = (): FacilitiesContract => JSON.parse(JSON.stringify(FACILITIES));

describe("facilities contract (config/scd-facilities.v1.json)", () => {
  it("is the file at the repository root, not a copy", () => {
    expect(FACILITIES).toEqual(JSON.parse(readFileSync(repo("config/scd-facilities.v1.json"), "utf8")));
    expect(FACILITIES.schema).toBe("scd.facilities.v1");
  });

  it("is structurally valid", () => {
    expect(validateFacilities()).toEqual([]);
  });

  it("holds the two sites of the master 16 - SEDI E IMPIANTI with their verified facts", () => {
    const col = siteById("SED-COL")!;
    expect(col).toMatchObject({ name: "Centro Sportivo Colico", address: "Via Lido SNC", municipality: "Colico (LC)", managed_by_scd: true });
    const der = siteById("SED-DER")!;
    expect(der).toMatchObject({ name: "Impianto Dervio", address: "Via Guglielmo Marconi 1", municipality: "Dervio (LC)", managed_by_scd: false });
  });

  it("holds the 14 master spaces with the master ids, surfaces and sizes", () => {
    const master = FACILITIES.spaces.filter((s) => s.provenance.source === "master").map((s) => s.id);
    expect(master).toEqual([
      "SPA-COL-C1", "SPA-COL-C2", "SPA-COL-SEG", "SPA-COL-CH", "SPA-COL-BAR", "SPA-COL-MAG", "SPA-COL-INF",
      "SPA-COL-BIG", "SPA-COL-SP1", "SPA-COL-SP2", "SPA-COL-SP3", "SPA-COL-SP4", "SPA-COL-ARB", "SPA-DER-C1",
    ]);
    expect(spaceById("SPA-COL-C1")).toMatchObject({ surface: "Sintetico", size: { text: "100 x 60 m" } });
    expect(spaceById("SPA-COL-C2")).toMatchObject({ surface: "Sintetico", size: { text: "96 x 48 m" } });
    expect(spaceById("SPA-DER-C1")).toMatchObject({ surface: "Erba", size: { text: "96 x 48 m" } });
    expect(spaceById("SPA-COL-ARB")?.access?.audiences).toEqual(["referees"]);
  });

  it("keeps the official homologation facts next to the master values, with their source", () => {
    const raw = FACILITIES as unknown as { technical: Record<string, { provenance: string }>; drawing_standard: { units: string; layers: string[] } };
    const der = spaceById("SPA-DER-C1") as unknown as { official: { size: { length_m: number; width_m: number }; valid_until: string; source: string } };
    expect(der.official.size).toMatchObject({ length_m: 97.8, width_m: 50 });
    expect(der.official.valid_until).toBe("2028-09-28");
    expect(der.official.source).toContain("omologazione");
    for (const [site, t] of Object.entries(raw.technical)) expect(t.provenance.length, site).toBeGreaterThan(0);
    expect(raw.drawing_standard.units).toContain("metri");
    expect(raw.drawing_standard.layers.length).toBeGreaterThanOrEqual(8);
  });

  it("marks the Dervio board zones as unverified board data", () => {
    const zones = spacesOf("SED-DER").filter((s) => s.provenance.source === "board");
    expect(zones.map((z) => z.board_code).sort()).toEqual(["AT1", "AT2", "BV1", "BV2", "C2", "SP1", "TR"]);
    for (const z of zones) expect(z.provenance.verified).toBe(false);
  });

  it("never invents hours, entrances or responsibles: all unknown values are null", () => {
    for (const s of FACILITIES.spaces) {
      expect(s.hours, s.id).toBeNull();
      expect(s.responsible_role, s.id).toBeNull();
    }
    for (const site of FACILITIES.sites) expect(site.responsible_role).toBeNull();
    expect(siteById("SED-DER")!.entrances).toBeNull();
  });

  it("gives every access list and rule a source, and flags proposals", () => {
    for (const s of FACILITIES.spaces) {
      if (s.access) expect(s.access.source.length, s.id).toBeGreaterThan(0);
      for (const r of s.rules) expect(r.source.length, s.id).toBeGreaterThan(0);
    }
    expect(isProposed(spaceById("SPA-COL-C1")!.access!.source)).toBe(true);
    expect(isProposed(spaceById("SPA-COL-ARB")!.access!.source)).toBe(false);
  });

  it("detects broken contracts", () => {
    const c = clone();
    const spaces = c.spaces as unknown as Record<string, unknown>[];
    spaces.push({ ...spaces[0], site: "SED-XXX" });
    spaces.push({ ...spaces[1], id: "SPA-COL-C1" });
    (spaces[2] as Record<string, unknown>)["layout"] = { x: 900, y: 10, w: 200, h: 20 };
    (spaces[3] as Record<string, unknown>)["hours"] = { mon: [{ from: "19:00", to: "18:00" }], xyz: [] };
    (spaces[4] as Record<string, unknown>)["entrances"] = ["ING-NOPE"];
    (spaces[5] as Record<string, unknown>)["access"] = { audiences: [], source: "" };
    (spaces[15] as Record<string, unknown>)["provenance"] = { source: "board", verified: true };
    const p = validateFacilities(c);
    expect(p.some((x) => x.includes("missing site"))).toBe(true);
    expect(p.some((x) => x.includes('space id "SPA-COL-C1" is used twice'))).toBe(true);
    expect(p.some((x) => x.includes("outside the plan"))).toBe(true);
    expect(p.some((x) => x.includes("closes before it opens"))).toBe(true);
    expect(p.some((x) => x.includes("unknown day"))).toBe(true);
    expect(p.some((x) => x.includes("not on its site"))).toBe(true);
    expect(p.some((x) => x.includes("empty access list"))).toBe(true);
    expect(p.some((x) => x.includes("cannot be verified"))).toBe(true);
  });
});

describe("club clock (Europe/Rome)", () => {
  it("reads weekday and minutes in the club time zone, across midnight and DST", () => {
    expect(clubClock(new Date("2026-10-12T15:30:00Z"))).toEqual({ date: "2026-10-12", weekday: "mon", minutes: 17 * 60 + 30 });
    // 23:30 UTC on Saturday is already Sunday in Rome (CEST, +2).
    expect(clubClock(new Date("2026-10-10T23:30:00Z"))).toMatchObject({ date: "2026-10-11", weekday: "sun", minutes: 90 });
    // Winter time (CET, +1).
    expect(clubClock(new Date("2026-12-07T17:00:00Z"))).toMatchObject({ weekday: "mon", minutes: 18 * 60 });
  });
});

describe("open / closed status", () => {
  const mon1730 = { weekday: "mon" as const, minutes: 17 * 60 + 30 };
  it("is 'da inserire' when hours are unknown, never closed", () => {
    expect(spaceStatus(null, mon1730)).toEqual({ state: "unknown", label: "Orari da inserire" });
    expect(spaceStatus({ tue: [] }, mon1730).state).toBe("unknown");
    expect(spaceStatus({ mon: null }, mon1730).label).toBe("Orari di lunedì da inserire");
  });
  it("is open inside a range and closed outside, with the next opening", () => {
    const h = { mon: [{ from: "20:00", to: "22:00" }, { from: "17:00", to: "19:00" }] };
    expect(spaceStatus(h, mon1730)).toEqual({ state: "open", label: "Aperto fino alle 19:00" });
    expect(spaceStatus(h, { weekday: "mon", minutes: 19 * 60 + 15 })).toEqual({ state: "closed", label: "Chiuso · apre alle 20:00" });
    expect(spaceStatus(h, { weekday: "mon", minutes: 22 * 60 })).toEqual({ state: "closed", label: "Chiuso per oggi" });
    expect(spaceStatus({ mon: [] }, mon1730)).toEqual({ state: "closed", label: "Chiuso per oggi" });
  });
  it("lists the week with unknown days marked", () => {
    expect(hoursLines(null)).toBeNull();
    const lines = hoursLines({ mon: [{ from: "17:00", to: "19:00" }], tue: [] })!;
    expect(lines[0]).toEqual({ day: "mon", text: "17:00–19:00" });
    expect(lines[1]).toEqual({ day: "tue", text: "chiuso" });
    expect(lines[2]).toEqual({ day: "wed", text: "da inserire" });
  });
});

describe("who may enter", () => {
  it("speaks plain Italian and says nothing when unknown", () => {
    expect(whoMayEnter(spaceById("SPA-COL-ARB")!.access)).toBe("solo arbitri");
    expect(whoMayEnter(spaceById("SPA-COL-MAG")!.access)).toBe("ruoli autorizzati, responsabile magazzino");
    expect(whoMayEnter(null)).toBeNull();
  });
});

describe("in use now, from the training board snapshot", () => {
  const { slots } = loadQuadro();
  it("maps pitches and changing rooms of the current slot", () => {
    const u = usageAt(slots, "LUNEDÌ", 17 * 60 + 30);
    expect(u.get("C1")?.[0]?.group).toBe("U15 2012/2013 + U12 2015 + U11 2016/2017");
    expect(u.get("SP1")?.[0]?.group).toBe("U15");
    expect(u.get("SP4")?.[0]?.timeLabel).toBe("17:20–18:50");
  });
  it("ignores free cells and returns overlapping slots together", () => {
    const u = usageAt(slots, "LUNEDÌ", 20 * 60 + 15);
    expect(u.get("C1")?.map((x) => x.group)).toEqual(["Juniores Élite U19 (+ atleti ex U18 integrati)", "Under 16"]);
    expect(u.has("SP2")).toBe(false);
    expect(u.has("C2")).toBe(false);
  });
  it("is empty outside training hours and on days without a board", () => {
    expect(usageAt(slots, "LUNEDÌ", 12 * 60).size).toBe(0);
    expect(usageAt(slots, "DOMENICA", 18 * 60).size).toBe(0);
  });
  it("offers the slot start times of a day", () => {
    expect(slotTimes(slots, "LUNEDÌ").map((t) => t.label)).toEqual(["17:20", "19:00", "20:10"]);
    expect(slotTimes(slots, "SABATO")).toEqual([]);
  });
});

describe("public projection", () => {
  it("keeps public entrances only and drops the training-board link and responsibles", () => {
    const col = siteById("SED-COL")!;
    const pub = publicSite(col);
    expect(pub.entrances?.map((e) => e.id)).toEqual(["ING-COL-VIS"]);
    expect(pub.routes?.every((r) => r.audience === "public")).toBe(true);
    const sp1 = publicSpace(spaceById("SPA-COL-SP1")!, col);
    expect(sp1.quadro_key).toBeNull();
    expect(sp1.entrances).toEqual([]);
    expect(publicSpace(spaceById("SPA-COL-BIG")!, col).entrances).toEqual(["ING-COL-VIS"]);
  });
});

describe("correction row for the Drive register", () => {
  const input = {
    date: "2026-10-11",
    role: "responsabile campi",
    kind: "orari" as const,
    spaceId: "SPA-COL-BIG",
    description: "Apre\t30 minuti\nprima delle gare",
    deadline: "2026-10-31",
    link: "",
  };
  it("follows the register column order with Stato NUOVA", () => {
    expect(correctionRow(input)).toEqual([
      "11/10/2026",
      "responsabile campi",
      "Impianti · Orari di apertura",
      "Impianti · Colico · Biglietteria (SPA-COL-BIG)",
      "Apre 30 minuti prima delle gare",
      "31/10/2026",
      "",
      "NUOVA",
      "",
      "",
    ]);
    expect(FACILITIES.sources.corrections_register.columns).toHaveLength(10);
  });
  it("produces one TSV line with ten columns and no stray tabs or newlines", () => {
    const tsv = correctionTsv(input);
    expect(tsv.split("\t")).toHaveLength(10);
    expect(tsv).not.toMatch(/[\r\n]/);
  });
  it("blocks incomplete rows", () => {
    expect(correctionProblems(input)).toEqual([]);
    expect(correctionProblems({ ...input, role: " ", description: "x", spaceId: "NOPE", link: "ftp://x" })).toHaveLength(4);
    expect(CORRECTION_KINDS.map((k) => k.id)).toContain("responsabile");
  });
});
