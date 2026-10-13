import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { entryFor, type AssetRegistry } from "./asset-format";
import {
  CALENDAR_FORMATS,
  CREST_PROMINENCE,
  CRM_SPONSOR_ALIASES,
  KIT_BASES,
  KIT_CREST,
  LIVE_BAR,
  LIVE_FRAME,
  LIVE_PARTNER_PLATE,
  LIVE_SCORE_SAFE,
  NEUTRAL_PARTNER_LABEL,
  PLATE_PAD,
  SKY_BASE,
  crestPx,
  crmKitId,
  crmPipelineNames,
  exportPlan,
  fitContain,
  isSafeLogoSrc,
  kitSubjectLabel,
  localSubject,
  logoPlacement,
  offerItems,
  resolvePartnerSubject,
  rowsForFormat,
  slugify,
  spotFor,
  subjectFromSponsor,
  subjectLogoLowRes,
  teamShort,
  toPercent,
  weekCalendarRows,
  weekRangeLabel,
  withLocalLogo,
  zonePx,
  type CalendarRow,
} from "./partner-kit";
import type { PublicEvent } from "./public-snapshots";
import { SPONSORS } from "./sponsors";

const APP = resolve(__dirname, "../..");
const REPO = resolve(APP, "../..");
const publicFile = (url: string) => resolve(APP, "public", url.replace(/^\//, ""));
const registry = JSON.parse(readFileSync(resolve(REPO, "config/scd-assets.v1.json"), "utf8")) as AssetRegistry;
const allEntries = [...registry.locked_assets, ...registry.runtime_assets];

/** Width/height of a WebP file (VP8, VP8L or VP8X). */
function webpSize(file: string): { w: number; h: number } {
  const b = readFileSync(file);
  const fourcc = b.toString("ascii", 12, 16);
  if (fourcc === "VP8X") return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) };
  if (fourcc === "VP8L") {
    const bits = b.readUInt32LE(21);
    return { w: (bits & 0x3fff) + 1, h: ((bits >> 14) & 0x3fff) + 1 };
  }
  return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
}

describe("kit partner · subject resolution", () => {
  it("resolves every season sponsor by slug with its cut-out logo", () => {
    for (const s of SPONSORS) {
      const sub = resolvePartnerSubject(s.slug);
      expect(sub?.source, s.slug).toBe("sponsors");
      expect(sub?.sponsorSlug).toBe(s.slug);
      expect(sub?.logoSrc && existsSync(publicFile(sub.logoSrc)), s.slug).toBe(true);
    }
  });

  it("never prints an unverified name: 'Partner' instead", () => {
    const unverified = SPONSORS.filter((s) => !s.nameVerified || !s.name);
    expect(unverified.length).toBeGreaterThan(0);
    for (const s of unverified) expect(kitSubjectLabel(subjectFromSponsor(s))).toBe(NEUTRAL_PARTNER_LABEL);
    expect(kitSubjectLabel(resolvePartnerSubject("hdi-maglia")!)).toBe("HDI Assicurazioni · Maglia Assicurazioni");
    expect(kitSubjectLabel({ name: "   ", nameVerified: true })).toBe(NEUTRAL_PARTNER_LABEL);
    expect(kitSubjectLabel({ name: "Bigamonti", nameVerified: false })).toBe(NEUTRAL_PARTNER_LABEL);
  });

  it("maps CRM contract names to the sponsor kit only through the explicit alias table", () => {
    for (const [name, slug] of Object.entries(CRM_SPONSOR_ALIASES)) {
      expect(SPONSORS.some((s) => s.slug === slug), slug).toBe(true);
      expect(crmKitId(name)).toBe(slug);
    }
    expect(crmKitId("New Generation")).toBe("crm-new-generation");
    expect(crmKitId("Officine Pedroncelli")).toBe("crm-officine-pedroncelli");
  });

  it("every CRM card resolves to a kit; names without an official logo keep logo null", () => {
    for (const n of crmPipelineNames()) {
      const sub = resolvePartnerSubject(crmKitId(n));
      expect(sub, n).not.toBeNull();
      if (!CRM_SPONSOR_ALIASES[n]) {
        expect(sub!.source).toBe("crm");
        expect(sub!.logoSrc).toBeNull();
        expect(kitSubjectLabel(sub!)).toBe(n);
      }
    }
  });

  it("works from a future CRM record id with its logo, refusing unsafe logo URLs", () => {
    const ctx = { crmRecords: [{ id: "crm-acme-42", name: "Acme", logoSrc: "/media/sponsor/crm/acme.webp" }, { id: "crm-x", name: null, logoSrc: "https://evil.example/x.png" }] };
    const a = resolvePartnerSubject("crm-acme-42", ctx)!;
    expect(a).toMatchObject({ source: "crm", name: "Acme", nameVerified: true, logoSrc: "/media/sponsor/crm/acme.webp" });
    const x = resolvePartnerSubject("crm-x", ctx)!;
    expect(x.logoSrc).toBeNull();
    expect(kitSubjectLabel(x)).toBe(NEUTRAL_PARTNER_LABEL);
  });

  it("unknown ids give null (no made-up subject)", () => {
    for (const id of ["", "nuovo-sponsor", "crm-nessuno", "x".repeat(200), "../etc"]) expect(resolvePartnerSubject(id), id).toBeNull();
  });

  it("local prospect: blob URL only, typed name kept, nothing else accepted", () => {
    expect(localSubject("  Ditta Rossi ", "blob:http://x/1")).toMatchObject({ id: "locale", source: "local", name: "Ditta Rossi", nameVerified: true, logoSrc: "blob:http://x/1" });
    expect(localSubject("", "data:image/png;base64,AAA").logoSrc).toBeNull();
    expect(kitSubjectLabel(localSubject("", null))).toBe(NEUTRAL_PARTNER_LABEL);
    const hdi = resolvePartnerSubject("hdi-maglia")!;
    expect(withLocalLogo(hdi, "blob:http://x/2")).toMatchObject({ logoSrc: "blob:http://x/2", logoSize: null, sponsorSlug: "hdi-maglia" });
    expect(withLocalLogo(hdi, "https://x/y.png")).toBe(hdi);
    expect(isSafeLogoSrc("/media/sponsor/cut/atv.webp")).toBe(true);
    expect(isSafeLogoSrc("//evil.example/a.png")).toBe(false);
    expect(isSafeLogoSrc("javascript:alert(1)")).toBe(false);
  });

  it("flags low-resolution cut-outs (ask the partner for the original file)", () => {
    expect(subjectLogoLowRes(resolvePartnerSubject("atl-iveco")!)).toBe(true);
    expect(subjectLogoLowRes(resolvePartnerSubject("hdi-maglia")!)).toBe(false);
    expect(subjectLogoLowRes(localSubject("x", "blob:a"))).toBe(false);
  });

  it("slugify is stable and ASCII", () => {
    expect(slugify("Attività di Recupero")).toBe("attivita-di-recupero");
    expect(slugify("Na.gi Car")).toBe("na-gi-car");
  });
});

describe("kit partner · geometry", () => {
  it("bases match the files on disk and are registered as internal mockups", () => {
    for (const b of [...KIT_BASES, SKY_BASE]) {
      expect(existsSync(publicFile(b.src)), b.src).toBe(true);
      expect(webpSize(publicFile(b.src)), b.src).toEqual({ w: b.w, h: b.h });
      const e = entryFor(`apps/superapp/public${b.src}`, allEntries);
      expect(e?.class, b.src).toBe("PARTNER_KIT_MOCKUP_BASE");
      expect(e?.status).toBe("REFERENCE_PROTOTYPE");
    }
    expect(KIT_CREST.src).toBe("/media/brand/logo-scd.png");
    expect(entryFor("apps/superapp/public/media/brand/logo-scd.png", allEntries)).toBeDefined();
  });

  it("zones stay inside their image", () => {
    for (const b of [...KIT_BASES, SKY_BASE]) {
      const z = zonePx(b.sponsor, b);
      expect(z.x).toBeGreaterThanOrEqual(0);
      expect(z.y).toBeGreaterThanOrEqual(0);
      expect(z.x + z.w).toBeLessThanOrEqual(b.w);
      expect(z.y + z.h).toBeLessThanOrEqual(b.h);
    }
  });

  it("fitContain centres and never overflows", () => {
    const box = { x: 10, y: 20, w: 200, h: 60 };
    for (const a of [0.5, 1, 3.333, 5.25, 12]) {
      const r = fitContain(a, box);
      expect(r.w / r.h).toBeCloseTo(a, 6);
      expect(r.x).toBeGreaterThanOrEqual(box.x - 1e-9);
      expect(r.y).toBeGreaterThanOrEqual(box.y - 1e-9);
      expect(r.x + r.w).toBeLessThanOrEqual(box.x + box.w + 1e-9);
      expect(r.y + r.h).toBeLessThanOrEqual(box.y + box.h + 1e-9);
      expect(r.x + r.w / 2).toBeCloseTo(box.x + box.w / 2, 6);
      expect(r.y + r.h / 2).toBeCloseTo(box.y + box.h / 2, 6);
    }
    expect(fitContain(0, box).w).toBe(0);
    expect(fitContain(Number.NaN, box).w).toBe(0);
  });

  it("logo + plate stay in the zone, centred on the zone centre", () => {
    for (const b of [...KIT_BASES, SKY_BASE]) {
      const z = zonePx(b.sponsor, b);
      for (const a of [1, 2.3, 5.25]) {
        const { logo, plate } = logoPlacement(a, z, b.plate);
        const outer = plate ?? logo;
        expect(outer.x).toBeGreaterThanOrEqual(z.x - 1e-6);
        expect(outer.y).toBeGreaterThanOrEqual(z.y - 1e-6);
        expect(outer.x + outer.w).toBeLessThanOrEqual(z.x + z.w + 1e-6);
        expect(outer.y + outer.h).toBeLessThanOrEqual(z.y + z.h + 1e-6);
        expect(logo.x + logo.w / 2).toBeCloseTo(z.x + z.w / 2, 6);
        expect(logo.y + logo.h / 2).toBeCloseTo(z.y + z.h / 2, 6);
        if (plate) expect(plate.h - logo.h).toBeCloseTo(2 * z.h * PLATE_PAD, 6);
      }
    }
    expect(KIT_BASES.find((k) => k.id === "home")!.plate).toBe(false);
    expect(SKY_BASE.plate).toBe(false);
  });

  it("crest: official aspect, centred on the board anchor, a little larger ('in primo piano')", () => {
    expect(CREST_PROMINENCE).toBeGreaterThan(1);
    expect(CREST_PROMINENCE).toBeLessThan(1.6);
    for (const b of KIT_BASES) {
      const c = crestPx(b)!;
      expect(c.w / c.h).toBeCloseTo(KIT_CREST.w / KIT_CREST.h, 6);
      expect(c.h).toBeCloseTo((b.crest!.h / 100) * b.h * CREST_PROMINENCE, 6);
      expect(c.x + c.w / 2).toBeCloseTo((b.crest!.cx / 100) * b.w, 6);
      expect(c.y + c.h / 2).toBeCloseTo((b.crest!.cy / 100) * b.h, 6);
      // Crest and sponsor zone do not overlap.
      const z = zonePx(b.sponsor, b);
      expect(c.y + c.h <= z.y || c.x >= z.x + z.w).toBe(true);
    }
    expect(crestPx(SKY_BASE)).toBeNull();
  });

  it("toPercent converts pixels to CSS percentages of the image", () => {
    expect(toPercent({ x: 68, y: 77, w: 340, h: 385 }, { w: 680, h: 770 })).toEqual({ left: 10, top: 10, width: 50, height: 50 });
  });

  it("live frame: the partner bar and plate never cover the score bug area", () => {
    const overlap = (a: typeof LIVE_BAR, b: typeof LIVE_BAR) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    expect(overlap(LIVE_BAR, LIVE_SCORE_SAFE)).toBe(false);
    expect(overlap(LIVE_PARTNER_PLATE, LIVE_SCORE_SAFE)).toBe(false);
    expect(LIVE_BAR.y + LIVE_BAR.h).toBe(LIVE_FRAME.h);
    expect(LIVE_PARTNER_PLATE.x + LIVE_PARTNER_PLATE.w).toBeLessThanOrEqual(LIVE_FRAME.w);
  });
});

describe("kit partner · calendar card", () => {
  const ev = (o: Partial<PublicEvent>): PublicEvent => ({
    id: o.id ?? Math.random().toString(36).slice(2),
    date: "2026-10-17",
    time: "15:00",
    group: "u15",
    category: "U15",
    type: "CAMPIONATO",
    homeAway: "CASA",
    opponent: "BELLANO",
    venue: "Colico - Campo 1",
    round: "",
    source: "",
    status: "",
    isVariation: false,
    notice: ["nota interna"],
    timeConfirmed: true,
    venueConfirmed: true,
    facilityReview: false,
    ...o,
  });
  const groups = [{ id: "u15", label: "U15 2012/13" }, { id: "prima", label: "Prima Squadra" }, { id: "eso", label: "Esordienti 2014" }];

  it("keeps only games of the next seven days, not yet started today, in time order", () => {
    const rows = weekCalendarRows(
      [
        ev({ id: "late", date: "2026-10-19", time: "20:30", group: "prima", homeAway: "FUORI", opponent: "Dervio", venue: "Lecco - Stadio, via X" }),
        ev({ id: "train", type: "ALLENAMENTO" }),
        ev({ id: "past", date: "2026-10-12" }),
        ev({ id: "out", date: "2026-10-20" }),
        ev({ id: "done", date: "2026-10-13", time: "09:00" }),
        ev({ id: "today", date: "2026-10-13", time: "18:00" }),
        ev({ id: "cancel", status: "ANNULLATA" }),
        ev({ id: "sat", group: "eso", timeConfirmed: false }),
      ],
      groups,
      "2026-10-13",
      "12:00",
    );
    expect(rows.map((r) => r.id)).toEqual(["today", "sat", "late"]);
    expect(rows[1]).toMatchObject({ team: "Esordienti 2014", confirmed: false, homeAway: "CASA" });
    expect(rows[2]).toMatchObject({ team: "Prima", homeAway: "FUORI", opponent: "Dervio" });
    // Allowlisted fields only: no notes, no people.
    expect(Object.keys(rows[0]!).sort()).toEqual(["confirmed", "date", "homeAway", "id", "opponent", "team", "time", "venue"]);
  });

  it("team labels follow the home rules", () => {
    expect(teamShort("Juniores U19 Élite")).toBe("U19");
    expect(teamShort("U16 2010/11")).toBe("U16");
    expect(teamShort("Primi Calci 2018/19")).toBe("Primi Calci");
    expect(teamShort("Altro gruppo · x")).toBe("Altro gruppo");
  });

  it("fits the rows to each format with an honest '+N'", () => {
    const rows = Array.from({ length: 15 }, (_, i) => ({ id: String(i) }) as CalendarRow);
    expect(rowsForFormat(rows.slice(0, 7), "4x5")).toMatchObject({ more: 0 });
    expect(rowsForFormat(rows, "4x5").shown.length + rowsForFormat(rows, "4x5").more).toBe(15);
    expect(rowsForFormat(rows, "4x5").shown.length).toBe(CALENDAR_FORMATS["4x5"].rows - 1);
    expect(rowsForFormat(rows, "9x16").shown.length).toBe(CALENDAR_FORMATS["9x16"].rows - 1);
    expect(rowsForFormat([], "9x16")).toEqual({ shown: [], more: 0 });
  });

  it("labels the week", () => {
    expect(weekRangeLabel("2026-10-13")).toBe("13 – 19 ottobre 2026");
    expect(weekRangeLabel("2026-10-28")).toBe("28 ottobre – 3 novembre 2026");
  });
});

describe("kit partner · spots and offer", () => {
  it("every season sponsor has its 9:16 spot and poster, registered as LED demo videos", () => {
    const dir = resolve(APP, "public/media/sponsor/spot");
    const files = readdirSync(dir);
    expect(files.filter((f) => f.endsWith(".mp4")).length).toBe(SPONSORS.length);
    for (const s of SPONSORS) {
      const spot = spotFor(s.slug)!;
      expect(existsSync(publicFile(spot.src)), spot.src).toBe(true);
      expect(existsSync(publicFile(spot.poster)), spot.poster).toBe(true);
      expect(entryFor(`apps/superapp/public${spot.src}`, allEntries)?.class).toBe("LED_DEMO_VIDEO");
      expect(entryFor(`apps/superapp/public${spot.poster}`, allEntries)?.class).toBe("VIDEO_POSTER");
    }
    expect(spotFor(null)).toBeNull();
    expect(spotFor("crm-new-generation")).toBeNull();
  });

  it("export plan: nine PNG with unique names derived from the subject", () => {
    const plan = exportPlan(resolvePartnerSubject("saglio-sport")!);
    expect(plan.length).toBe(9);
    expect(new Set(plan.map((p) => p.filename)).size).toBe(9);
    for (const p of plan) expect(p.filename).toMatch(/^scd-kit-saglio-sport-[a-z0-9x-]+\.png$/);
    expect(exportPlan(localSubject("Ditta Rossi", null))[0]!.filename).toBe("scd-kit-ditta-rossi-ledwall.png");
    expect(exportPlan(localSubject("", null))[0]!.filename).toBe("scd-kit-nuovo-partner-ledwall.png");
  });

  it("offer summary lists what the partner gets, never an amount", () => {
    const withSpot = offerItems({ sponsorSlug: "hdi-maglia" });
    const without = offerItems({ sponsorSlug: null });
    expect(withSpot.length).toBe(without.length + 1);
    for (const t of withSpot) expect(t).not.toMatch(/€|\beuro\b|\d+[.,]\d{2}/i);
    expect(withSpot.join(" ")).toMatch(/proposta/);
  });
});
