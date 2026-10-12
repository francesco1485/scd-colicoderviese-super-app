import { describe, expect, it } from "vitest";

import { deliveryError, groupState, kitError, kitTotals, parseKitBoard, sumSizes, type KitGroup } from "./kit-order";

const raw = {
  orders: [
    {
      key: "PRE_CAMPIONATO_2026_27",
      title: "Ordine kit pre campionato 2026/27",
      components: { tshirt: 2, shorts: 1, socks: 1, bag: 1, bad: -1 },
      sourceModifiedAt: "2026-10-05T18:06:44Z",
      groups: [
        { key: "prima-squadra", label: "Prima Squadra", athletes: 22, staff: 7, sizes: { M: 7, L: 17, XL: 4, "2XL": 1, XXL: 3 }, undefined: 0, delivered: { L: 20 } },
        { key: "pulcini-u11", label: "Pulcini U11", athletes: 4, staff: 0, sizes: {}, undefined: 4, delivered: {} },
        { key: "piccoli-amici-2021", label: "Piccoli Amici 2021", athletes: 0, staff: 0, sizes: {}, undefined: 0 },
        { key: "", label: "senza chiave" },
      ],
    },
    { title: "senza chiave" },
  ],
};

describe("parseKitBoard", () => {
  it("keeps valid sizes and caps deliveries at the ordered quantity", () => {
    const orders = parseKitBoard(raw);
    expect(orders).toHaveLength(1);
    const o = orders![0]!;
    expect(o.components).toEqual({ tshirt: 2, shorts: 1, socks: 1, bag: 1 });
    expect(o.groups.map((g) => g.key)).toEqual(["prima-squadra", "pulcini-u11", "piccoli-amici-2021"]);
    expect(o.groups[0]!.sizes).toEqual({ M: 7, L: 17, XL: 4, "2XL": 1 });
    expect(o.groups[0]!.delivered).toEqual({ L: 17 });
    expect(parseKitBoard(null)).toBeNull();
    expect(parseKitBoard({ orders: "x" })).toBeNull();
  });
});

describe("totals and states", () => {
  const o = parseKitBoard(raw)![0]!;
  it("sums people, sizes and pieces to order", () => {
    const t = kitTotals(o);
    expect(t.people).toBe(33);
    expect(t.sized).toBe(29);
    expect(t.undefinedCount).toBe(4);
    expect(t.bySize.L).toBe(17);
    expect(t.pieces).toEqual({ tshirt: 58, shorts: 29, socks: 29, bag: 29 });
    expect(t.kitsDelivered).toBe(17);
    expect(t.groupsToComplete).toBe(1);
  });

  it("derives the group state", () => {
    const [prima, pulcini, vuoto] = o.groups as [KitGroup, KitGroup, KitGroup];
    expect(groupState(prima)).toBe("in-consegna");
    expect(groupState(pulcini)).toBe("taglie-mancanti");
    expect(groupState(vuoto)).toBe("vuoto");
    expect(groupState({ ...prima, delivered: {} })).toBe("da-consegnare");
    expect(groupState({ ...prima, delivered: { ...prima.sizes } })).toBe("consegnato");
    expect(sumSizes(prima.sizes)).toBe(29);
  });

  it("validates delivery counts", () => {
    const prima = o.groups[0]!;
    expect(deliveryError(prima, "L", 17)).toBeNull();
    expect(deliveryError(prima, "L", 18)).toMatch(/Al massimo 17/);
    expect(deliveryError(prima, "S", 1)).toMatch(/Al massimo 0/);
    expect(deliveryError(prima, "XXL", 1)).toMatch(/Taglia/);
    expect(deliveryError(prima, "M", 1.5)).toMatch(/intero/);
    expect(kitError("out_of_range")).toMatch(/supera/);
    expect(kitError(undefined)).toMatch(/Riprova/);
  });
});
