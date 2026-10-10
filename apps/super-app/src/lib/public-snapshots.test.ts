// @ts-expect-error bun runtime types not installed
import { describe, expect, test } from "bun:test";
import { loadCalendar, loadQuadro } from "./public-snapshots";

const PII_RE = /@|\+39|\b3\d{9}\b|targa|autista|telefono/i;

describe("snapshot pubblici", () => {
  test("calendario: 156 eventi, nessuno ritirato, nessun dato personale", () => {
    const c = loadCalendar();
    expect(c.events.length).toBe(156);
    expect(c.events.some((e) => /RITIR|ANNULL/i.test(e.status))).toBe(false);
    expect(PII_RE.test(JSON.stringify(c))).toBe(false);
  });
  test("quadro: solo lun-ven, 15 fasce, pulmini zero", () => {
    const q = loadQuadro();
    expect(q.slots.length).toBe(15);
    expect(q.days.every((d) => !/SABATO|DOMENICA/.test(d))).toBe(true);
    expect(q.confirmedTrips).toBe(0);
    expect(PII_RE.test(JSON.stringify(q))).toBe(false);
  });
});

import { appliesToWeek, logoKeysFor } from "./public-snapshots";
describe("quadro: settimane e loghi", () => {
  test("rotazioni A/B valgono in entrambe le settimane", () => {
    expect(appliesToWeek("A/B", "A")).toBe(true);
    expect(appliesToWeek("A/B", "B")).toBe(true);
    expect(appliesToWeek("A", "B")).toBe(false);
  });
  test("loghi solo per annate realmente presenti", () => {
    expect(logoKeysFor("U12 2015")).toEqual(["U12"]);
    expect(logoKeysFor("—")).toEqual([]);
  });
});

describe("calendario RC2: verifiche visibili", () => {
  const c = loadCalendar();
  test("31 gare con orario o sede da confermare", () => {
    expect(c.events.filter((e) => !(e.timeConfirmed && e.venueConfirmed)).length).toBe(31);
  });
  test("14 gare con disponibilità impianto da verificare", () => {
    expect(c.events.filter((e) => e.facilityReview).length).toBe(14);
  });
  test("amichevole 11/10 con Penta Piateda nel filtro Esordienti 2015", () => {
    const e = c.events.find((x) => x.id === "EVT-ES-20261011-PENTAPIATEDA-CASA");
    expect(e?.group).toBe("2015");
    expect(e?.date).toBe("2026-10-11");
  });
  test("solo flag booleani nel modello pubblico, niente oggetto verification", () => {
    expect(JSON.stringify(c).includes("verification")).toBe(false);
    expect(c.events.every((e) => typeof e.facilityReview === "boolean")).toBe(true);
  });
});

import { findSessions } from "./public-snapshots";
describe("quadro: ricerca annata solo da Campo 1/Campo 2", () => {
  const { slots } = loadQuadro();
  const fasce = (q: string) => findSessions(slots, q).map((s) => `${s.day.slice(0, 3)} ${s.timeLabel}`);
  test("U16: lun, mer, ven solo 20:10–21:20 (anche con 'Under 16')", () => {
    const exp = ["LUN 20:10–21:20", "MER 20:10–21:20", "VEN 20:10–21:20"];
    expect(fasce("U16")).toEqual(exp);
    expect(fasce("Under 16")).toEqual(exp);
    expect(fasce("under16")).toEqual(exp);
  });
  test("U13: mar 18:00–19:20 e gio 18:00–19:30, mai nella fascia Prima Squadra", () => {
    expect(fasce("U13")).toEqual(["MAR 18:00–19:20", "GIO 18:00–19:30"]);
  });
  test("Prima Squadra: mar/gio 19:00–21:00, ven 19:00–20:30", () => {
    expect(fasce("Prima Squadra")).toEqual(["MAR 19:00–21:00", "GIO 19:00–21:00", "VEN 19:00–20:30"]);
  });
  test("2015: lun/mer 17:20–18:50; nessuna inferenza U13=2014", () => {
    expect(fasce("2015")).toEqual(["LUN 17:20–18:50", "MER 17:20–18:50"]);
    expect(fasce("2014")).toEqual([]);
  });
});

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { freshnessLabel, resolveAnnata } from "./public-snapshots";
describe("calendario RC3 mobile", () => {
  const c = loadCalendar();
  test("snapshot RC3: hash file e fonte master tracciati", () => {
    const buf = readFileSync(new URL("../data/calendario-snapshot-20261009.json", import.meta.url));
    expect(createHash("sha256").update(buf).digest("hex")).toBe("1c02963a98789028de2f1af6e40a48aeedd55dc6b027a0640a77b3d1c9c26d89");
    expect(c.sourceModifiedAt).toBe("2026-10-09T16:27:46.092Z");
  });
  test("freschezza in ora italiana: 09/10/2026 ore 18:27", () => {
    expect(freshnessLabel(c.sourceModifiedAt)).toBe("09/10/2026 ore 18:27");
  });
  test("?annata= risolve solo annate/categorie del master", () => {
    expect(resolveAnnata(c.groups, "2015")?.id).toBe("2015");
    expect(resolveAnnata(c.groups, "2011")?.id).toBe("u16");
    expect(resolveAnnata(c.groups, "2008")?.id).toBe("u19");
    expect(resolveAnnata(c.groups, "U16")?.id).toBe("u16");
    expect(resolveAnnata(c.groups, "Juniores")?.id).toBe("u19");
    expect(resolveAnnata(c.groups, "U18")).toBeNull();
  });
  test("Penta Piateda 11/10 tra Esordienti 2015", () => {
    const g = resolveAnnata(c.groups, "2015")!;
    expect(c.events.filter((e) => e.group === g.id).some((e) => e.id === "EVT-ES-20261011-PENTAPIATEDA-CASA")).toBe(true);
  });
});

import { windowEnd } from "./public-snapshots";
describe("calendario: finestre 15/30/60 giorni e 6 mesi", () => {
  test("15/30/60 giorni da oggi", () => {
    expect(windowEnd("2026-10-09", 15)).toBe("2026-10-24");
    expect(windowEnd("2026-10-09", 30)).toBe("2026-11-08");
    expect(windowEnd("2026-10-09", 60)).toBe("2026-12-08");
  });
  test("6 mesi: aritmetica di calendario, fine mese se il giorno manca", () => {
    expect(windowEnd("2026-10-09", 180)).toBe("2027-04-09");
    expect(windowEnd("2026-08-31", 180)).toBe("2027-02-28");
  });
  test("U12/2015 nel quadro: lun/mer 17:20–18:50; U13 senza 2014", () => {
    const { slots } = loadQuadro();
    expect(findSessions(slots, "U12").map((s) => `${s.day.slice(0, 3)} ${s.timeLabel}`)).toEqual(["LUN 17:20–18:50", "MER 17:20–18:50"]);
  });
});

import { trainingKeyFor } from "./public-snapshots";
describe("calendario -> allenamenti: solo chiavi verificate nel quadro", () => {
  const { slots } = loadQuadro();
  const { groups } = loadCalendar();
  const key = (id: string) => trainingKeyFor(groups.find((g) => g.id === id)!, slots);
  test("Esordienti 2015 -> 2015 con 2 sedute", () => {
    expect(key("2015")).toBe("2015");
    expect(findSessions(slots, "2015").length).toBe(2);
  });
  test("Juniores: niente 2008 senza sedute, usa 'Juniores' solo se nel quadro", () => {
    const k = key("u19");
    expect(k === null || k === "Juniores").toBe(true);
    if (k) expect(findSessions(slots, k).length).toBeGreaterThan(0);
    expect(findSessions(slots, "2008").length).toBe(0);
  });
  test("Prima Squadra -> 'Prima Squadra'", () => expect(key("prima")).toBe("Prima Squadra"));
  test("U16 -> chiave con sedute reali", () => { const k = key("u16")!; expect(findSessions(slots, k).length).toBe(3); });
  test("Esordienti 2014: nessun U13 automatico", () => {
    const g = groups.find((x) => x.years.includes("2014"));
    if (g) expect(trainingKeyFor(g, slots)).toBeNull();
  });
});
