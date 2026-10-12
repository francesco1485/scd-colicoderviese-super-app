import { describe, expect, it } from "vitest";

import { WORK_AREA_IDS, findArea } from "./areas";
import {
  CRM_PIPELINE,
  DRIVE_MASTERS,
  PULMINI_FLEET,
  WORK_AREAS,
  areaSources,
  driveUrl,
  factStamp,
  nextWeekend,
  purchaseSteps,
  weekendMatches,
  type WorkAreaId,
} from "./work-areas";

/** The only Drive file ids the club gave on 2026-10-11. */
const GIVEN_IDS = [
  "1p78Kgla_cCjYxCPjksS8lHxmlFQxuvpd1aBXv6-1H1s",
  "1eBhjOymnJF6GfE-6-GRuo7UYgkE82ad24_VnY097n9Q",
  "1-5-MUnrrAltflJSATe6bKkjm_3SItO0gvadi_PXPoAQ",
  "1RacFticU85AWw4Sgkz60hqUfsXRGcCpd5heKH6Tkqak",
  "1N2MisMPM79Uboj70A7PPMdCGNf043-GX6WjBrAyT3rg",
  "1vcEMucnKtoJ9ICE4FwB5tDwMW16msSATZetxWGwU-2I",
  "15Dew9ankJXHsZMVD426BHwYD-u9TKVtQWVMOWcSLnwk",
  // Suppliers master, approved by Direzione as the suppliers source (decision N2, UD-082).
  "1l9_mmmo9zuALF2IrQvevhBFaNYFCWzOOjjyDuphQGsY",
];

describe("work area contract", () => {
  it("covers exactly the work areas of the registry, with their canonical paths", () => {
    expect(Object.keys(WORK_AREAS).sort()).toEqual([...WORK_AREA_IDS].sort());
    for (const a of Object.values(WORK_AREAS)) {
      expect(a.path, a.id).toBe(findArea(a.id)!.path);
      expect(a.insertRoles.length, a.id).toBeGreaterThan(0);
      expect(a.sources, a.id).toContain("inserimenti");
    }
  });

  it("links only the Drive files whose ids were given, with the Sheets URL pattern", () => {
    const linked = Object.values(DRIVE_MASTERS).filter((m) => m.fileId !== null).map((m) => m.fileId);
    expect([...linked].sort()).toEqual([...GIVEN_IDS].sort());
    for (const id of WORK_AREA_IDS as readonly WorkAreaId[]) {
      for (const s of areaSources(id)) {
        if (s.url) expect(GIVEN_IDS.some((g) => s.url === `https://docs.google.com/spreadsheets/d/${g}/edit`), `${id} ${s.name}`).toBe(true);
        else expect(s.note, `${id} ${s.name}`).toBeTruthy();
      }
    }
    expect(driveUrl(null)).toBeNull();
    expect(driveUrl("short")).toBeNull();
    expect(driveUrl("../../etc/passwd-aaaaaaaaaaaaaaaaaaaaaa")).toBeNull();
  });

  it("names each area's masters as the brief says", () => {
    const names = (id: WorkAreaId) => areaSources(id).map((s) => s.name);
    expect(names("pulmini")).toContain("05_PULMINI - Master Flotta e Trasporti");
    expect(names("crm")).toEqual(expect.arrayContaining(["MASTER CONTATTI", "Master Sponsor"]));
    expect(names("tesoreria")).toContain("Gestionale economico");
    expect(names("segreteria")).toEqual(expect.arrayContaining(["R20 · gestionale operativo", "Database Iscrizioni", "Master Calendario 2026/27"]));
  });
});

describe("verified facts", () => {
  it("Pulmini: Master Flotta of 2026-10-11, seats unknown", () => {
    expect(PULMINI_FLEET).toMatchObject({ vehicles: 4, driversRegistered: 6, driversActive: 3, membersActive: 50, membersTotal: 61, runsPlanned: 0, seatsConfirmed: null });
    expect(factStamp(PULMINI_FLEET)).toBe("dato al 11/10/2026, fonte 05_PULMINI - Master Flotta e Trasporti");
  });

  it("CRM: 7 active and 5 to renew, prospects and negotiations unknown", () => {
    expect(CRM_PIPELINE.active).toEqual(["ATV", "ATL", "New Generation", "EdilMelos", "Officine Pedroncelli", "Coperture Rasero", "Noratech"]);
    expect(CRM_PIPELINE.expiredToRenew).toEqual(["MDS", "Consilia", "Attività di Recupero", "Essegi", "Bottazzi"]);
    expect(CRM_PIPELINE.prospects).toBeNull();
    expect(CRM_PIPELINE.negotiations).toBeNull();
  });

  it("purchase steps come from the registry flow", () => {
    expect(purchaseSteps()).toEqual(["Richiesta", "Approvazione", "Ordine", "Fattura", "Pagamento"]);
  });
});

describe("coming weekend", () => {
  it("is the first Saturday after today and its Sunday", () => {
    expect(nextWeekend("2026-10-10")).toEqual({ sat: "2026-10-17", sun: "2026-10-18" }); // Saturday
    expect(nextWeekend("2026-10-11")).toEqual({ sat: "2026-10-17", sun: "2026-10-18" }); // Sunday
    expect(nextWeekend("2026-10-14")).toEqual({ sat: "2026-10-17", sun: "2026-10-18" }); // Wednesday
    expect(nextWeekend("2026-12-28")).toEqual({ sat: "2027-01-02", sun: "2027-01-03" });
  });

  it("filters weekend matches, away only on request, in time order", () => {
    const ev = [
      { id: "c", date: "2026-10-18", time: "15:30", homeAway: "FUORI" },
      { id: "a", date: "2026-10-17", time: "10:30", homeAway: "FUORI" },
      { id: "b", date: "2026-10-17", time: "15:00", homeAway: "CASA" },
      { id: "x", date: "2026-10-24", time: "10:00", homeAway: "FUORI" },
    ];
    expect(weekendMatches(ev, "2026-10-11").map((e) => e.id)).toEqual(["a", "b", "c"]);
    expect(weekendMatches(ev, "2026-10-11", true).map((e) => e.id)).toEqual(["a", "c"]);
  });
});
