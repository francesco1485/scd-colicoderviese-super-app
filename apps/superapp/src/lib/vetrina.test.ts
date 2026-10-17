/**
 * Vetrina engine and palinsesto (UD-110): real destinations only, deterministic daily rotation, windows, worlds,
 * weekly rhythm, season arc, floor of 3 slots, kids' world without commerce and with Sky only there.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import * as http from "./http-policy";
import { INITIATIVES } from "./initiatives.server";
import { TOURNAMENTS } from "./tournaments";
import {
  ALL_WORLDS,
  PUBLIC_WORLDS,
  VETRINA_MAX,
  VETRINA_MIN,
  VETRINA_RHYTHM,
  inMonths,
  inPeak,
  isVetrinaWorld,
  pickAllWorlds,
  pickVetrina,
  slotEligible,
  vetrinaRoutes,
  weekdayOf,
  worldAccepts,
  type VetrinaSlot,
} from "./vetrina";
import {
  CONVENZIONI,
  VETRINA_SLOTS,
  initiativeSlot,
  vetrinaCatalogue,
} from "./vetrina-slots.server";

const APP = resolve(__dirname, "../..");
const read = (f: string) => readFileSync(resolve(APP, f), "utf8");

function routePaths(): Set<string> {
  const tree = read("src/routeTree.gen.ts");
  return new Set(
    [...tree.matchAll(/fullPath: '([^']+)'/g)].map(
      (m) => m[1]!.replace(/\/$/, "") || "/",
    ),
  );
}

const CATALOGUE = vetrinaCatalogue();
/** Two full weeks around today plus season-arc days (CLC peak, Nasazzi peak, September). */
const WEEK_A = [
  "2026-10-12",
  "2026-10-13",
  "2026-10-14",
  "2026-10-15",
  "2026-10-16",
  "2026-10-17",
  "2026-10-18",
];
const WEEK_B = [
  "2026-11-16",
  "2026-11-17",
  "2026-11-18",
  "2026-11-19",
  "2026-11-20",
  "2026-11-21",
  "2026-11-22",
];
const MORE = [
  "2026-12-08",
  "2026-12-09",
  "2027-01-11",
  "2027-04-20",
  "2027-05-22",
  "2027-06-15",
  "2027-09-14",
];
const DAYS = [...WEEK_A, ...WEEK_B, ...MORE];
const FACTS = [{}, { pressRecent: true }];

const slot = (over: Partial<VetrinaSlot>): VetrinaSlot => ({
  id: "x",
  kind: "game",
  theme: "giochi",
  kicker: "k",
  title: "t",
  text: "x",
  href: "/fantacalcio",
  cta: "c",
  visual: { kind: "type", big: "1", small: "s" },
  audience: "public",
  audiences: ["tifosi"],
  weight: 1,
  ...over,
});

describe("vetrina catalogue", () => {
  it("points only to routes that exist", () => {
    const routes = routePaths();
    for (const to of vetrinaRoutes(CATALOGUE))
      expect(routes.has(to), to).toBe(true);
  });

  it("public slots point to public pages; members slots are marked as such", () => {
    // Open to everyone but never cached (forms / per-session content): /entra (pre-registration), /documenti.
    const OPEN_UNCACHED = ["/entra", "/documenti"];
    for (const s of CATALOGUE) {
      if (OPEN_UNCACHED.includes(s.href)) continue;
      if (s.audience === "public")
        expect(http.isPublicPath(s.href), s.id).toBe(true);
      else expect(http.isPublicPath(s.href), s.id).toBe(false);
    }
  });

  it("an action only members can do (voting the Top 11) is offered only in the members' world (PC audit 15/10, item 5)", () => {
    const top11 = CATALOGUE.find((s) => s.id === "top11");
    expect(top11?.audiences).toEqual(["soci"]);
    for (const w of PUBLIC_WORLDS) expect(worldAccepts(top11!, w), w).toBe(false);
    expect(worldAccepts(top11!, "soci")).toBe(true);
  });

  it("the server gives the members' world only to a session it confirms, not to a caller's flag (security review 15/10)", () => {
    const fn = read("src/lib/vetrina.functions.ts");
    expect(fn).toMatch(/data\.members === true &&[\s\S]{0,160}\(await sessionView\(\)\)\.user/);
    expect(fn).not.toMatch(/data\.members\s*\?\s*\["soci"\]/);
  });

  it("anchors exist on the destination pages", () => {
    const pages: Record<string, string> = {
      "/eventi/christmas-lario-cup": read(
        "src/routes/eventi.christmas-lario-cup.tsx",
      ),
    };
    for (const s of CATALOGUE.filter((x) => x.hash)) {
      if (s.href === "/tornei")
        expect(
          TOURNAMENTS.map((t) => t.id),
          s.id,
        ).toContain(s.hash);
      else expect(pages[s.href], s.id).toMatch(new RegExp(`id="${s.hash}"`));
    }
  });

  it("uses only real files for images and portraits", () => {
    for (const s of CATALOGUE) {
      const v = s.visual;
      if (v.kind === "type") continue;
      expect(v.src, s.id).toMatch(/^\/media\//);
      expect(
        () => readFileSync(resolve(APP, "public", v.src.slice(1))),
        s.id,
      ).not.toThrow();
      expect(v.alt.length, s.id).toBeGreaterThan(5);
    }
  });

  it("has unique ids, valid weights and Sky only in the kids' world", () => {
    const ids = CATALOGUE.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of CATALOGUE) {
      expect(s.weight, s.id).toBeGreaterThanOrEqual(1);
      expect(s.weight, s.id).toBeLessThanOrEqual(5);
      expect(s.audiences.length, s.id).toBeGreaterThan(0);
      const sky = JSON.stringify(s.visual).includes("/media/brand/sky");
      if (sky) expect(s.audiences, s.id).toEqual(["bambini"]);
    }
  });

  it("does not repeat the sponsor zone, affiliations or team lists", () => {
    for (const s of CATALOGUE) {
      expect(s.href, s.id).not.toBe("/sponsor");
      expect(s.href, s.id).not.toMatch(/^\/squadre/);
      expect(s.href, s.id).not.toBe("/societa");
    }
  });

  it("reserves the convenzioni / partner-initiative kinds without inventing items", () => {
    expect(CONVENZIONI).toEqual([]);
    // A future agreement is commercial: the engine keeps it away from the kids' world.
    const conv = slot({
      id: "conv",
      kind: "convenzione",
      theme: "convenzioni",
      commercial: true,
      audiences: ["bambini", "tifosi"],
    });
    expect(worldAccepts(conv, "bambini")).toBe(false);
    expect(worldAccepts(conv, "tifosi")).toBe(true);
    expect(read("src/lib/vetrina.ts")).toMatch(/"partner-initiative"/);
  });

  it("turns initiatives into slots with the same window and page", () => {
    for (const i of INITIATIVES) {
      const s = initiativeSlot(i);
      expect(s.href).toBe(i.href);
      expect(s.showFrom).toBe(i.showFrom);
      expect(s.showUntil).toBe(i.showUntil);
      expect(s.theme).toBe("formazione");
    }
  });
});

describe("palinsesto", () => {
  it("defines the seven days with themes and focus worlds", () => {
    for (let d = 0; d < 7; d++) {
      const r = VETRINA_RHYTHM[d as 0];
      expect(r.themes.length, String(d)).toBeGreaterThan(0);
      expect(r.focus.length, String(d)).toBeGreaterThan(0);
    }
    expect(VETRINA_RHYTHM[1].themes).toEqual([
      "partner",
      "convenzioni",
      "card",
    ]);
    expect(VETRINA_RHYTHM[3].themes).toEqual(["servizi"]);
    expect(weekdayOf("2026-10-13")).toBe(2);
    expect(weekdayOf("2026-10-18")).toBe(0);
    expect(Number.isNaN(weekdayOf("bad"))).toBe(true);
  });

  it("every world on every day gets between 3 and 6 slots, all real routes", () => {
    const routes = routePaths();
    for (const facts of FACTS)
      for (const day of DAYS)
        for (const w of ALL_WORLDS) {
          const out = pickVetrina(CATALOGUE, day, facts, VETRINA_MAX, w);
          expect(out.length, `${day} ${w}`).toBeGreaterThanOrEqual(VETRINA_MIN);
          expect(out.length, `${day} ${w}`).toBeLessThanOrEqual(VETRINA_MAX);
          expect(new Set(out.map((s) => s.id)).size).toBe(out.length);
          for (const s of out)
            expect(routes.has(s.href), `${day} ${w} ${s.id}`).toBe(true);
        }
  });

  it("the kids' world never gets commercial slots and always has a kid-friendly one", () => {
    for (const day of DAYS) {
      const out = pickVetrina(
        CATALOGUE,
        day,
        { pressRecent: true },
        VETRINA_MAX,
        "bambini",
      );
      for (const s of out) {
        expect(s.commercial, `${day} ${s.id}`).not.toBe(true);
        expect(s.audiences, `${day} ${s.id}`).toContain("bambini");
        expect(
          ["promo", "kit", "convenzione", "partner-initiative"],
          `${day} ${s.id}`,
        ).not.toContain(s.kind);
      }
      expect(
        out.some((s) => s.kidFriendly),
        day,
      ).toBe(true);
    }
  });

  it("Sky never appears outside the kids' world", () => {
    for (const day of DAYS)
      for (const w of ALL_WORLDS.filter((x) => x !== "bambini"))
        for (const s of pickVetrina(CATALOGUE, day, {}, VETRINA_MAX, w))
          expect(JSON.stringify(s.visual), `${day} ${w}`).not.toContain(
            "/media/brand/sky",
          );
  });

  it("follows the weekly rhythm: Monday card/kit, Wednesday services, Saturday live video (tifosi/famiglie)", () => {
    const mon = pickVetrina(
      CATALOGUE,
      "2026-10-19",
      {},
      VETRINA_MAX,
      "famiglie",
    ).map((s) => s.id);
    expect(mon).toEqual(expect.arrayContaining(["promo-card", "kit-2026-27"]));
    const wed = pickVetrina(
      CATALOGUE,
      "2026-10-21",
      {},
      VETRINA_MAX,
      "famiglie",
    ).map((s) => s.id);
    expect(wed).toEqual(
      expect.arrayContaining([
        "servizio-infermeria",
        "servizio-segreteria",
        "servizio-nutrizione",
      ]),
    );
    const sat = pickVetrina(
      CATALOGUE,
      "2026-10-24",
      {},
      VETRINA_MAX,
      "tifosi",
    ).map((s) => s.id);
    expect(sat).toContain("dirette-video");
    // Services are not on air on a Monday (outside their day) for the families' world.
    expect(mon).not.toContain("servizio-infermeria");
  });

  it("season arc: September–October peak for registrations, Christmas Lario Cup from 1 November to 8 December", () => {
    const isc = VETRINA_SLOTS.find((s) => s.id === "iscrizioni")!;
    expect(inPeak(isc, "2026-10-13")).toBe(true);
    expect(inPeak(isc, "2026-11-13")).toBe(false);
    expect(
      pickVetrina(CATALOGUE, "2026-10-19", {}, VETRINA_MAX, "famiglie")[0]!.id,
    ).toBe("iscrizioni");
    const clc = VETRINA_SLOTS.find((s) => s.id === "clc-maschile")!;
    expect(inPeak(clc, "2026-10-31")).toBe(false);
    expect(inPeak(clc, "2026-11-01")).toBe(true);
    expect(inPeak(clc, "2026-12-08")).toBe(true);
    for (const w of ["tutti", "bambini", "tifosi"] as const) {
      const ids = pickVetrina(CATALOGUE, "2026-11-17", {}, VETRINA_MAX, w).map(
        (s) => s.id,
      );
      expect(ids.slice(0, 2).sort(), w).toEqual(["clc-female", "clc-maschile"]);
    }
    // After the event both editions disappear.
    for (const w of ALL_WORLDS) {
      const ids = pickVetrina(CATALOGUE, "2026-12-09", {}, VETRINA_MAX, w).map(
        (s) => s.id,
      );
      expect(ids).not.toContain("clc-maschile");
      expect(ids).not.toContain("clc-female");
    }
  });

  it("Memorial Nasazzi peaks from its recorded date only", () => {
    const n = VETRINA_SLOTS.find((s) => s.id === "nasazzi")!;
    expect(n).toBeDefined();
    // Confirmed by the Direzione 17/10/2026: no «da confermare» left in the slot.
    expect(n.text).not.toMatch(/da confermare/);
    expect(n.cta).toBe("Scopri il torneo");
    expect(inPeak(n, "2027-04-20")).toBe(true);
    expect(inPeak(n, "2026-10-20")).toBe(false);
    expect(
      pickVetrina(CATALOGUE, "2027-04-20", {}, VETRINA_MAX, "tifosi").map(
        (s) => s.id,
      ),
    ).toContain("nasazzi");
    expect(
      pickVetrina(CATALOGUE, "2027-05-25", {}, VETRINA_MAX, "tifosi").map(
        (s) => s.id,
      ),
    ).not.toContain("nasazzi");
  });

  it("is deterministic per day and world, and changes across days", () => {
    for (const w of PUBLIC_WORLDS) {
      expect(pickVetrina(CATALOGUE, "2026-10-15", {}, VETRINA_MAX, w)).toEqual(
        pickVetrina(CATALOGUE, "2026-10-15", {}, VETRINA_MAX, w),
      );
    }
    const signatures = new Set(
      WEEK_A.map((d) =>
        pickVetrina(CATALOGUE, d, {}, VETRINA_MAX, "tutti")
          .map((s) => s.id)
          .join(","),
      ),
    );
    expect(signatures.size).toBeGreaterThan(4);
  });

  it("honours windows, data conditions and fails closed on a bad day", () => {
    const perico = CATALOGUE.find((s) => s.id.startsWith("initiative-"))!;
    expect(slotEligible(perico, "2026-10-17", {}, "ragazzi")).toBe(false); // before showFrom
    expect(slotEligible(perico, "2026-10-20", {}, "ragazzi")).toBe(true); // Tuesday, formazione
    expect(slotEligible(perico, "2026-12-01", {}, "ragazzi")).toBe(false); // after showUntil
    const press = CATALOGUE.find((s) => s.id === "dicono-di-noi")!;
    expect(slotEligible(press, "2026-10-18", {}, "tifosi")).toBe(false);
    expect(
      slotEligible(press, "2026-10-18", { pressRecent: true }, "tifosi"),
    ).toBe(true);
    expect(pickVetrina(CATALOGUE, "not-a-day")).toEqual([]);
    expect(pickVetrina(CATALOGUE, "2026-10-13", {}, 0)).toEqual([]);
    expect(inMonths(12, 11, 2)).toBe(true);
    expect(inMonths(3, 11, 2)).toBe(false);
  });

  it("keeps the first occurrence of duplicate ids and fills from evergreen slots", () => {
    const a = slot({ id: "a", weight: 5, weekdays: [0, 1, 2, 3, 4, 5, 6] });
    const b = slot({ id: "b", evergreen: true, theme: "eventi" });
    const c = slot({ id: "c", evergreen: true, theme: "eventi" });
    const out = pickVetrina(
      [a, { ...a, title: "dup" }, b, c],
      "2026-10-13",
      {},
      6,
      "tifosi",
    );
    expect(out.map((s) => s.id).sort()).toEqual(["a", "b", "c"]);
    expect(out.find((s) => s.id === "a")!.title).toBe("t");
  });

  it("returns the picks of every world, soci only when asked", () => {
    const all = pickAllWorlds(CATALOGUE, "2026-10-13", {}, PUBLIC_WORLDS);
    expect(all.soci).toEqual([]);
    for (const w of PUBLIC_WORLDS)
      expect(all[w].length).toBeGreaterThanOrEqual(VETRINA_MIN);
    expect(isVetrinaWorld("bambini")).toBe(true);
    expect(isVetrinaWorld("adulti")).toBe(false);
  });

  it("is served by the server function only (catalogue never imported by client code)", () => {
    for (const f of [
      "src/components/home/PublicHome.tsx",
      "src/components/home/MemberHome.tsx",
      "src/routes/index.tsx",
    ]) {
      expect(read(f), f).not.toMatch(/vetrina-slots\.server/);
    }
    expect(read("src/lib/vetrina.functions.ts")).toMatch(
      /await import\("\.\/vetrina-slots\.server"\)/,
    );
  });
});
