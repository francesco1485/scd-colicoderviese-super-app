import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { CAST, CAST_IDS, castFiles, castReady } from "./assistant-cast";
import { entryFor, type AssetRegistry } from "./asset-format";
import { ACANFORA_DISCLAIMER, CALL_112_WHEN, HEAD_KNOCK_RULE, KNOCK_STEPS, firstAidProblems, firstAidRooms } from "./first-aid-info";
import { GENNY_DISCLAIMER, GENNY_TIPS, tipProblems } from "./genny-tips";

const APP = resolve(__dirname, "../..");
const REPO = resolve(APP, "../..");
const registry = JSON.parse(readFileSync(resolve(REPO, "config/scd-assets.v1.json"), "utf8")) as AssetRegistry;

describe("assistant cast registry (Direzione 'Ci siamo' round 4, 'Vai A B C' 13/10/2026)", () => {
  it("keeps the approved Canva provenance of each character", () => {
    expect(CAST.era.canvaAssetId).toBe("MAHX1G12gBc");
    expect(CAST.genny.canvaAssetId).toBe("MAHX1KTH6yk");
    expect(CAST.acanfora.canvaAssetId).toBe("MAHX1M4GK7g");
    for (const id of CAST_IDS) expect(CAST[id].mediaDir).toBe(`/media/cast/${id}/`);
  });

  it("never replaces Crovi v3 or Sky", () => {
    for (const id of CAST_IDS) {
      expect(CAST[id].mediaDir).not.toMatch(/crovi|brand|sky/i);
    }
  });

  it("marks a character ready only when its files exist and are registered", () => {
    for (const id of CAST_IDS) {
      const files = castFiles(id).map((u) => `apps/superapp/public${u}`);
      const present = files.every((f) => existsSync(resolve(REPO, f)));
      if (castReady(id)) {
        for (const f of files) {
          expect(existsSync(resolve(REPO, f)), f).toBe(true);
          expect(entryFor(f, [...registry.locked_assets, ...registry.runtime_assets]), f).toBeDefined();
        }
      } else {
        // not ready: no half-shipped set may sit in public/ unregistered
        expect(present, `${id} files present but cast not marked ready`).toBe(false);
      }
    }
  });

  it("keeps the alt texts free of real-person likeness claims", () => {
    for (const id of CAST_IDS) expect(CAST[id].alt).not.toMatch(/sosia|somiglia|attore|attrice|Venere|Elena/i);
  });
});

describe("Genny content guard (minors: no numbers, no plans, no weight)", () => {
  it("offers four to six general tips", () => {
    expect(GENNY_TIPS.length).toBeGreaterThanOrEqual(4);
    expect(GENNY_TIPS.length).toBeLessThanOrEqual(6);
    expect(new Set(GENNY_TIPS.map((t) => t.id)).size).toBe(GENNY_TIPS.length);
  });

  it("has no digits and no forbidden words in any tip", () => {
    for (const t of GENNY_TIPS) {
      expect(tipProblems(t.title), t.id).toEqual([]);
      expect(tipProblems(t.text), t.id).toEqual([]);
      expect(`${t.title} ${t.text}`).not.toMatch(/\d|dieta|peso|calorie/i);
    }
  });

  it("covers hydration, training snacks, sleep and variety", () => {
    const all = GENNY_TIPS.map((t) => `${t.title} ${t.text}`).join(" ").toLowerCase();
    for (const w of ["acqua", "prima dell'allenamento", "dopo", "dormi", "varia"]) expect(all).toContain(w);
  });

  it("the guard itself catches numbers and banned topics", () => {
    expect(tipProblems("bevi 2 litri")).toContain("contains digits");
    expect(tipProblems("segui questa dieta")).toHaveLength(1);
    expect(tipProblems("controlla il peso")).toHaveLength(1);
    expect(tipProblems("conta le calorie")).toHaveLength(1);
  });

  it("sends specific needs to the paediatrician or doctor", () => {
    expect(GENNY_DISCLAIMER).toBe("Consigli generali, per esigenze specifiche rivolgiti al pediatra o al medico.");
  });
});

describe("Dottor Acanfora first-aid guard (general info, 112, never diagnosis)", () => {
  const copy = [
    ...KNOCK_STEPS.flatMap((s) => [s.title, s.text]),
    ...CALL_112_WHEN,
    HEAD_KNOCK_RULE,
    ACANFORA_DISCLAIMER,
  ];

  it("explains the four RICE steps in plain words", () => {
    expect(KNOCK_STEPS.map((s) => s.title)).toEqual(["Riposo", "Ghiaccio", "Compressione", "Elevazione"]);
  });

  it("uses no number but 112 and no diagnostic or drug wording", () => {
    for (const t of copy) expect(firstAidProblems(t), t).toEqual([]);
    expect(firstAidProblems("prendi un antidolorifico")).toHaveLength(1);
    expect(firstAidProblems("ghiaccio per 20 minuti")).toHaveLength(1);
  });

  it("states the emergency number and that it does not diagnose", () => {
    expect(ACANFORA_DISCLAIMER).toMatch(/112/);
    expect(ACANFORA_DISCLAIMER).toMatch(/non fa diagnosi/);
    expect(CALL_112_WHEN.length).toBeGreaterThanOrEqual(4);
  });

  it("shows only verified infermeria rooms from the facility data", () => {
    const rooms = firstAidRooms();
    expect(rooms.length).toBeGreaterThan(0);
    for (const r of rooms) expect(r.name).toBe("Infermeria");
    expect(rooms.map((r) => r.site)).toContain("Centro Sportivo Colico");
  });
});
