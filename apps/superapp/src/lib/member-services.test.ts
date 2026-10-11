import { describe, expect, it } from "vitest";

import { PULMINI_SERVICE, memberServices, priceLine, trainingServiceFor } from "./member-services";

describe("member services", () => {
  it("lists active services first with honest price lines", () => {
    const all = memberServices();
    expect(all[0]?.status).toBe("ACTIVE");
    const laundry = all.find((s) => s.id === "lavanderia-allenamento")!;
    expect(laundry.memberOnly).toBe(true);
    expect(priceLine(laundry)).toBe("25 € al mese");
    const tecar = all.find((s) => s.id === "massaggi-tecar")!;
    expect(priceLine(tecar)).toBe("costi: chiedi al responsabile infermeria");
    expect(priceLine(all.find((s) => s.id === "nutrizione-rubrica")!)).toBe("incluso nel tesseramento");
    expect(memberServices("club-house").map((s) => s.id)).toEqual(["lavanderia-allenamento"]);
  });

  it("knows the pulmini service rules from the club communication", () => {
    expect(PULMINI_SERVICE.vehiclesInService).toBe(3);
    expect(PULMINI_SERVICE.trainingAnnate).toContain("2015");
    expect(trainingServiceFor("U15 2012/2013 + U12 2015 + U11 2016/2017")).toBe("yes");
    expect(trainingServiceFor("Primi Calci 2018-2019")).toBe("yes");
    expect(trainingServiceFor("Juniores Élite U19 (+ atleti ex U18 integrati)")).toBe("no");
    expect(trainingServiceFor("Under 16")).toBe("no");
    expect(trainingServiceFor("Piccoli Amici 2020-2021")).toBe("unknown");
    expect(trainingServiceFor("")).toBe("unknown");
  });
});
