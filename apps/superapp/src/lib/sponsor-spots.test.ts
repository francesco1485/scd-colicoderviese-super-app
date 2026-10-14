import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import type { AssetRegistry } from "./asset-format";
import {
  HANDLE_PLACEHOLDER,
  SPONSOR_SPOTS,
  SPOT_FLOW,
  SPOT_STATUS_LABEL,
  buildSpots,
  isShowable,
  partnerHref,
  socialCaption,
  spotsForHome,
  spotsForLedwall,
  spotsInDayOrder,
  type SponsorSpot,
} from "./sponsor-spots";
import { SPONSORS } from "./sponsors";

const APP = resolve(__dirname, "../..");
const REPO = resolve(APP, "../..");
const publicFile = (url: string) => resolve(APP, "public", url.slice(1));
const registry = JSON.parse(readFileSync(resolve(REPO, "config/scd-assets.v1.json"), "utf8")) as AssetRegistry;
const addDay = (day: string, n: number) => new Date(Date.parse(`${day}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

const files = (s: SponsorSpot) => [s.master, s.poster, ...(s.preview ? [s.preview] : [])];

describe("sponsor LED spots (UD-119)", () => {
  it("has the seven ready spots of confirmed sponsors, in the order of sponsors.ts", () => {
    expect(SPONSOR_SPOTS.map((s) => s.slug)).toEqual(["hdi-maglia", "dell-oca", "atv", "carcano", "nbc", "saglio-sport", "dego-arredamenti"]);
    const order = SPONSORS.map((s) => s.slug);
    const idx = SPONSOR_SPOTS.map((s) => order.indexOf(s.slug));
    expect([...idx].sort((a, b) => a - b)).toEqual(idx);
  });

  it("lists only confirmed sponsors (sponsors.ts), with the name written there", () => {
    for (const s of SPONSOR_SPOTS) {
      const sponsor = SPONSORS.find((x) => x.slug === s.slug);
      expect(sponsor, s.slug).toBeDefined();
      expect(s.sponsorName).toBe(sponsor!.name);
    }
    // Not confirmed sponsors never enter the list.
    for (const out of ["iperal", "legea"]) expect(SPONSOR_SPOTS.some((s) => s.slug === out)).toBe(false);
  });

  it("leaves out a spot whose sponsor is not in the list", () => {
    const seeds = [{ slug: "non-confermato", driveFolderId: "x", hasPreview: true, status: "DA_APPROVARE" as const, socialHandle: null }];
    expect(buildSpots(seeds)).toEqual([]);
  });

  it("has no duplicates (slug, files, Drive folder)", () => {
    const slugs = SPONSOR_SPOTS.map((s) => s.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    const all = SPONSOR_SPOTS.flatMap(files);
    expect(new Set(all).size).toBe(all.length);
    const folders = SPONSOR_SPOTS.map((s) => s.driveFolderId);
    expect(new Set(folders).size).toBe(folders.length);
  });

  it("serves files that exist in public/, within the size budget, and registered in the asset registry", () => {
    for (const s of SPONSOR_SPOTS) {
      for (const f of files(s)) {
        expect(existsSync(publicFile(f)), f).toBe(true);
        const entry = registry.runtime_assets.find((a) => a.path === `apps/superapp/public${f}`) as
          | (AssetRegistry["runtime_assets"][number] & { note?: string; source_drive_file_id?: string })
          | undefined;
        expect(entry, f).toBeDefined();
        expect(entry!.note).toBe("spot ufficiale sponsor confermato; approvazione testi da registrare");
        expect(entry!.source_drive_file_id, f).toMatch(/^[\w-]{20,}$/);
      }
      expect(statSync(publicFile(s.master)).size, s.master).toBeLessThan(1_000_000);
      if (s.preview) expect(statSync(publicFile(s.preview)).size, s.preview).toBeLessThan(2_000_000);
    }
  });

  it("starts every spot as DA_APPROVARE and still shows it (approval follows)", () => {
    for (const s of SPONSOR_SPOTS) expect(s.status).toBe("DA_APPROVARE");
    expect(spotsForHome().map((s) => s.slug)).toEqual(SPONSOR_SPOTS.map((s) => s.slug));
    expect(spotsForLedwall().length).toBe(SPONSOR_SPOTS.length);
  });

  it("never shows a spot with MODIFICHE_RICHIESTE on the home or the LED wall", () => {
    const changed = SPONSOR_SPOTS.map((s, i) => (i === 1 ? { ...s, status: "MODIFICHE_RICHIESTE" as const } : s));
    expect(spotsForHome(changed).some((s) => s.slug === SPONSOR_SPOTS[1]!.slug)).toBe(false);
    expect(spotsForLedwall(changed).length).toBe(SPONSOR_SPOTS.length - 1);
    expect(isShowable({ slug: "hdi-maglia", status: "IN_ONDA" })).toBe(true);
    expect(isShowable({ slug: "hdi-maglia", status: "APPROVATO" })).toBe(true);
    expect(isShowable({ slug: "sconosciuto", status: "IN_ONDA" })).toBe(false);
  });

  it("rotates in a deterministic order per Rome day, every spot once per cycle", () => {
    const day = "2026-10-14";
    const a = spotsInDayOrder(spotsForHome(), day).map((s) => s.slug);
    const b = spotsInDayOrder(spotsForHome(), day).map((s) => s.slug);
    expect(a).toEqual(b);
    expect([...a].sort()).toEqual(SPONSOR_SPOTS.map((s) => s.slug).sort());
    // Over n consecutive days each spot opens the rotation exactly once.
    const n = SPONSOR_SPOTS.length;
    const leads = Array.from({ length: n }, (_, i) => spotsInDayOrder(spotsForHome(), addDay(day, i))[0]!.slug);
    expect(new Set(leads).size).toBe(n);
  });

  it("links to the official website only when documented, otherwise to /sponsor", () => {
    expect(partnerHref({ website: "https://carcano.com/" })).toEqual({ href: "https://carcano.com/", external: true });
    expect(partnerHref({})).toEqual({ href: "/sponsor", external: false });
    const withSite = SPONSOR_SPOTS.filter((s) => s.website).map((s) => s.slug);
    expect(withSite).toEqual(["hdi-maglia", "dell-oca", "carcano", "saglio-sport", "dego-arredamenti"]);
    for (const s of SPONSOR_SPOTS) if (s.website) expect(s.website).toMatch(/^https:\/\//);
  });

  it("drafts the social caption with the placeholder, never an invented handle", () => {
    for (const s of SPONSOR_SPOTS) {
      expect(s.socialHandle).toBeNull();
      expect(s.caption).toContain(HANDLE_PLACEHOLDER);
      expect(s.caption).toContain(s.sponsorName);
      expect(s.caption.startsWith("In arrivo a Colico: il nuovo LED wall del campo. Grazie a ")).toBe(true);
      expect(s.caption).not.toMatch(/@(?!handle)/);
      expect(s.caption).not.toMatch(/incredibil|straordinari|rivoluzion|esclusiv|imperdibil/i);
    }
    expect(socialCaption({ sponsorName: "X", socialHandle: "@x" })).toContain("Grazie a X @x");
  });

  it("describes the approval flow in three steps with plain labels", () => {
    expect(SPOT_FLOW.map((s) => s.label)).toEqual([
      "Proposto dal Presidente o dal commerciale",
      "Approvato dallo sponsor / Modifiche richieste",
      "In onda",
    ]);
    expect(Object.keys(SPOT_STATUS_LABEL).sort()).toEqual(["APPROVATO", "DA_APPROVARE", "IN_ONDA", "MODIFICHE_RICHIESTE"]);
  });

  it("the staged migration r105 keeps RLS on, writes only through checked security definer functions, no destructive words", () => {
    const sql = readFileSync(resolve(REPO, "supabase/migrations/20261014_r105_sponsor_spots.sql"), "utf8");
    expect(sql).toMatch(/STAGED, DO NOT APPLY/);
    expect(sql).not.toMatch(/\b(delete|drop|truncate)\b/i);
    const tables = [...sql.matchAll(/create table if not exists (public\.\w+)/g)].map((m) => m[1]);
    expect(tables.length).toBeGreaterThanOrEqual(2);
    for (const t of tables) {
      expect(sql).toContain(`alter table ${t} enable row level security;`);
      expect(sql).toContain(`revoke all on table ${t} from anon, authenticated;`);
    }
    const fns = [...sql.matchAll(/create or replace function (public\.\w+)/g)].map((m) => m[1]);
    expect(fns.length).toBeGreaterThan(2);
    expect(sql.match(/security definer/g)?.length).toBe(fns.length);
    expect(sql).not.toMatch(/grant execute[^;]*to anon/i);
    for (const status of Object.keys(SPOT_STATUS_LABEL)) expect(sql).toContain(`'${status}'`);
  });
});
