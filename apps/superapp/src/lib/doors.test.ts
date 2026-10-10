import { describe, expect, test } from "bun:test";

import { DOORS, areaAllowed, countByStatus, doorsFor, type AccessProfile } from "./doors";

const p = (role: string, personType = "", email = "x@example.org"): AccessProfile => ({ name: "", role, personType, email });

describe("ingresso unico · porte per profilo", () => {
  test("senza login si vede solo il Pubblico", () => {
    expect(doorsFor(null)).toEqual(["pubblico"]);
  });

  test("famiglia: Pubblico + Famiglie, niente gestionale né commerciale", () => {
    const d = doorsFor(p("FAMILY"));
    expect(d).toEqual(["pubblico", "famiglie"]);
    expect(areaAllowed("staff", p("FAMILY"))).toBe(false);
    expect(areaAllowed("commerciale", p("FAMILY"))).toBe(false);
  });

  test("mister: Famiglie + Direzione e staff, ma non l'area Direzione", () => {
    const d = doorsFor(p("MISTER"));
    expect(d).toContain("direzione");
    expect(d).not.toContain("commerciale");
    expect(areaAllowed("staff", p("MISTER"))).toBe(true);
    expect(areaAllowed("direzione", p("MISTER"))).toBe(false);
  });

  test("direzione: tutte e quattro le porte", () => {
    expect(doorsFor(p("DIREZIONE"))).toEqual(["pubblico", "famiglie", "direzione", "commerciale"]);
    expect(areaAllowed("direzione", p("DG"))).toBe(true);
  });

  test("l'account della società vale come direzione (regola già in uso nella PWA)", () => {
    expect(doorsFor(p("", "", "sportclubcolico@gmail.com"))).toContain("commerciale");
  });

  test("ruolo commerciale: porta Commerciale senza gestionale", () => {
    const d = doorsFor(p("SPONSOR_MANAGER"));
    expect(d).toContain("commerciale");
    expect(d).not.toContain("direzione");
  });

  test("ruolo sconosciuto: nessuna porta riservata", () => {
    expect(doorsFor(p("OSPITE"))).toEqual(["pubblico"]);
    expect(areaAllowed("famiglia", null)).toBe(false);
  });

  test("ogni modulo attivo ha una destinazione, e i conteggi tornano", () => {
    const all = DOORS.flatMap((d) => d.moduli);
    for (const m of all) if (m.status === "attivo") expect(m.to).toBeTruthy();
    const c = countByStatus();
    expect(c.attivo + c["in-arrivo"] + c.bloccato).toBe(all.length);
  });
});
