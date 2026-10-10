import { describe, expect, it } from "vitest";

import {
  countdown,
  homeMode,
  inSelection,
  itemState,
  marketingAllowed,
  orderTeams,
  parseConsent,
  teamFromGroup,
} from "./universe";

const G = (id: string, label: string) => ({ id, label, color: "#123456" });
const groups = [
  G("piccoli", "Piccoli Amici"),
  G("u15", "U15 · Giovanissimi"),
  G("prima", "Prima Squadra"),
  G("other", "Altre categorie"),
  G("2015", "Esordienti · 2015"),
  G("u19", "Juniores U19 Elite"),
  G("pulcini", "Pulcini"),
  G("primicalci", "Primi Calci"),
];

describe("annate", () => {
  it("ricava nome corto e sigla dall'etichetta del master", () => {
    expect(teamFromGroup(G("prima", "Prima Squadra"))).toMatchObject({
      short: "Prima",
      code: "1ª",
      group: "agonistica",
    });
    expect(teamFromGroup(G("u19", "Juniores U19 Elite"))).toMatchObject({
      short: "U19",
      code: "U19",
    });
    expect(teamFromGroup(G("u16", "U16 Elite · 2011"))).toMatchObject({
      short: "U16",
      code: "U16",
    });
    expect(teamFromGroup(G("2015", "Esordienti · 2015"))).toMatchObject({
      short: "Esordienti 2015",
      code: "E15",
      group: "base",
    });
    expect(
      teamFromGroup(G("esordienti", "Esordienti · annata da verificare")),
    ).toMatchObject({ code: "ES" });
    expect(teamFromGroup(G("primicalci", "Primi Calci"))).toMatchObject({
      code: "PC",
    });
  });

  it("ordina per età, esclude i gruppi tecnici e mette prima le seguite", () => {
    expect(orderTeams(groups).map((t) => t.id)).toEqual([
      "prima",
      "u19",
      "u15",
      "2015",
      "pulcini",
      "primicalci",
      "piccoli",
    ]);
    expect(orderTeams(groups, ["pulcini"]).map((t) => t.id)[0]).toBe("pulcini");
  });

  it("filtra per selezione", () => {
    expect(inSelection({ group: "u15" }, "all", [])).toBe(true);
    expect(inSelection({ group: "u15" }, "mine", ["u15"])).toBe(true);
    expect(inSelection({ group: "u16" }, "mine", ["u15"])).toBe(false);
    expect(inSelection({ group: "u16" }, "u15", [])).toBe(false);
  });
});

describe("stato della giornata", () => {
  // Domenica 11/10/2026 10:00 Europe/Rome = 08:00Z (ora legale).
  const ko = { date: "2026-10-11", time: "10:00", kind: "Gara" as const };
  const at = (iso: string) => Date.parse(iso);

  it("riconosce prima, durante e dopo la gara; senza orario resta sconosciuto", () => {
    expect(itemState(ko, at("2026-10-11T07:59:00Z"))).toBe("next");
    expect(itemState(ko, at("2026-10-11T08:30:00Z"))).toBe("live");
    expect(itemState(ko, at("2026-10-11T10:00:00Z"))).toBe("done");
    expect(
      itemState({ date: "2026-10-11", time: "" }, at("2026-10-11T08:30:00Z")),
    ).toBe("unknown");
  });

  it("decide il volto della home dal calendario reale", () => {
    expect(homeMode([ko], at("2026-10-10T17:30:00Z"))).toBe("vigilia");
    expect(homeMode([ko], at("2026-10-11T08:20:00Z"))).toBe("live");
    expect(homeMode([ko], at("2026-10-11T10:30:00Z"))).toBe("dopo");
    expect(homeMode([ko], at("2026-10-13T16:00:00Z"))).toBe("settimana");
    expect(
      homeMode(
        [{ ...ko, kind: "Evento" as const }],
        at("2026-10-11T08:20:00Z"),
      ),
    ).toBe("settimana");
  });

  it("conto alla rovescia oltre le 24 ore", () => {
    expect(
      countdown(at("2026-10-11T08:00:00Z"), at("2026-10-10T07:59:58Z")),
    ).toBe("24:00:02");
    expect(
      countdown(at("2026-10-11T08:00:00Z"), at("2026-10-11T08:00:00Z")),
    ).toBeNull();
  });
});

describe("consenso cookie", () => {
  it("accetta solo il formato atteso", () => {
    expect(parseConsent(null)).toBeNull();
    expect(parseConsent("{rotto")).toBeNull();
    expect(
      parseConsent(
        JSON.stringify({ v: 1, stats: true, mkt: false, ts: "2026-10-10" }),
      ),
    ).toMatchObject({ stats: true, mkt: false });
    expect(
      parseConsent(JSON.stringify({ v: 2, stats: true, mkt: true, ts: "x" })),
    ).toBeNull();
  });

  it("niente pixel senza consenso né nelle aree riservate", () => {
    const yes = { v: 1 as const, stats: true, mkt: true, ts: "x" };
    expect(marketingAllowed(null, "/")).toBe(false);
    expect(marketingAllowed({ ...yes, mkt: false }, "/")).toBe(false);
    expect(marketingAllowed(yes, "/")).toBe(true);
    expect(marketingAllowed(yes, "/eventi/christmas-lario-cup")).toBe(true);
    expect(marketingAllowed(yes, "/aree/famiglia")).toBe(false);
    expect(marketingAllowed(yes, "/core/atleta")).toBe(false);
    expect(marketingAllowed(yes, "/safeguarding")).toBe(false);
  });
});
