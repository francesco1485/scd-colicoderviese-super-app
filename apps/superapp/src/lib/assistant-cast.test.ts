import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  CAST,
  CAST_IDS,
  CAST_ROSTER,
  CAST_SHARED_RULES,
  castFiles,
  castReady,
  rosterEntry,
} from "./assistant-cast";
import { entryFor, type AssetRegistry } from "./asset-format";
import {
  detectDistress,
  distressReferral,
  relaxCopyProblems,
} from "./cast-safety";
import {
  ERA_DISCLAIMER,
  ERA_TIPS,
  dailyPick,
  romeDay,
  tipProblems,
} from "./era-nutrition-tips";
import {
  ACANFORA_DAILY_TIPS,
  ACANFORA_DISCLAIMER,
  CALL_112_WHEN,
  HEAD_KNOCK_RULE,
  KNOCK_STEPS,
  firstAidProblems,
  firstAidRooms,
} from "./first-aid-info";
import { skyRulesAnswer } from "./sky.functions";

const APP = resolve(__dirname, "../..");
const REPO = resolve(APP, "../..");
const registry = JSON.parse(
  readFileSync(resolve(REPO, "config/scd-assets.v1.json"), "utf8"),
) as AssetRegistry & {
  statuses: string[];
};
const castFolder = (id: string) =>
  registry.runtime_assets.find(
    (a) => a.path === `apps/superapp/public/media/cast/${id}/`,
  ) as Record<string, unknown> | undefined;

describe("assistant cast registry (round 4 images, roles corrected by the Direzione 14/10/2026)", () => {
  it("keeps the Canva provenance of each character", () => {
    expect(CAST.era.canvaAssetId).toBe("MAHX1G12gBc");
    expect(CAST.vera.canvaAssetId).toBe("MAHX1KTH6yk");
    expect(CAST.acanfora.canvaAssetId).toBe("MAHX1M4GK7g");
    for (const id of CAST_IDS)
      expect(CAST[id].mediaDir).toBe(`/media/cast/${CAST[id].fileStem}/`);
    // Vera keeps the legacy folder of the held round-4 image: no file is renamed, none is invented.
    expect(CAST.vera.mediaDir).toBe("/media/cast/genny/");
  });

  it("never replaces Crovi v3 or Sky", () => {
    for (const id of CAST_IDS) {
      expect(CAST[id].mediaDir).not.toMatch(/crovi|brand|sky/i);
    }
  });

  it("states the roles: Era nutritionist, Vera reception and the one chat (UD-121), Acanfora doctor", () => {
    expect(CAST.era.role).toMatch(/nutrizionista/i);
    expect(CAST.vera.name).toBe("Vera");
    expect(CAST.vera.role).toMatch(/reception/i);
    expect(CAST.vera.role).toMatch(/unica chat/i);
    expect(CAST.acanfora.role).toMatch(/medico/i);
    expect(CAST.acanfora.role).toMatch(/mai diagnosi/i);
  });

  it("shows no portrait for Era and Vera until new images are approved (the round-4 ones fit other roles)", () => {
    for (const id of ["era", "vera"] as const) {
      const folder = castFolder(CAST[id].fileStem);
      expect(castReady(id), id).toBe(false);
      expect(CAST[id].portraitHold, id).toMatch(/14\/10\/2026/);
      expect(folder?.["status"], id).toBe("ON_HOLD");
      expect(String(folder?.["hold_reason"]), id).toMatch(/14\/10\/2026/);
    }
    expect(CAST.vera.portraitHold).toMatch(/UD-121/);
    expect(castFolder("genny")?.["character"]).toBe("vera");
    expect(String(castFolder("genny")?.["hold_reason"])).toMatch(/UD-121/);
    expect(registry.statuses).toContain("ON_HOLD");
  });

  it("marks a character ready only when its files exist and are registered APPROVED", () => {
    for (const id of CAST_IDS) {
      const files = castFiles(id).map((u) => `apps/superapp/public${u}`);
      const present = files.every((f) => existsSync(resolve(REPO, f)));
      if (castReady(id)) {
        for (const f of files) {
          expect(existsSync(resolve(REPO, f)), f).toBe(true);
          const entry = entryFor(f, [
            ...registry.locked_assets,
            ...registry.runtime_assets,
          ]);
          expect(entry, f).toBeDefined();
          expect(entry?.status, f).toBe("APPROVED");
        }
      } else if (present) {
        // files may stay in public/ only while registered ON_HOLD (no half-shipped, unregistered set)
        for (const f of files)
          expect(entryFor(f, registry.runtime_assets)?.status, f).toBe(
            "ON_HOLD",
          );
      }
    }
  });

  it("registers the ready character as an approved original with its Canva provenance", () => {
    const folder = castFolder("acanfora");
    expect(folder?.["class"]).toBe("CHARACTER_CUTOUT");
    expect(folder?.["asset_class"]).toBe("GENERATE_ORIGINAL");
    expect(folder?.["status"]).toBe("APPROVED");
    expect(String(folder?.["approval_evidence"])).toMatch(
      /Ci siamo.*Vai A B C.*13\/10\/2026/,
    );
    expect(folder?.["canva_media_id"]).toBe(CAST.acanfora.canvaAssetId);
    expect(folder?.["canva_export_design_id"]).toBe(
      CAST.acanfora.canvaExportDesignId,
    );
    expect(castReady("acanfora")).toBe(true);
  });

  it("keeps the alt texts free of real-person likeness claims", () => {
    for (const id of CAST_IDS)
      expect(CAST[id].alt).not.toMatch(
        /sosia|somiglia|attore|attrice|Venere|Elena/i,
      );
  });
});

describe("cast roster (Direzione 14/10/2026, UD-111)", () => {
  const NEW_ROLES = [
    "accoglienza-chef",
    "biglietteria",
    "mentore-tornei",
    "mental-coach",
    "preparatore-atletico",
    "musica-relax",
    "volto-sponsor",
  ] as const;

  it("lists the three named characters and the seven new roles, each once", () => {
    const ids = CAST_ROSTER.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(["era", "vera", "acanfora", ...NEW_ROLES]);
    expect(ids).not.toContain("genny");
  });

  it("gives the new roles neutral role labels with the name still to be decided, no picture and no voice", () => {
    // Named by the Direzione on 14/10/2026 18:46 (UD-120): Garrison (Chef) and Enea (Mentore dei tornei).
    const NAMED: Record<string, string> = { "accoglienza-chef": "Garrison", "mentore-tornei": "Enea" };
    for (const id of NEW_ROLES) {
      const r = rosterEntry(id);
      if (NAMED[id]) {
        expect(r.nameTbd, id).toBe(false);
        expect(r.label, id).toBe(NAMED[id]);
      } else expect(r.nameTbd, id).toBe(true);
      expect(r.portrait.ready, id).toBe(false);
      expect(r.voice.ready, id).toBe(false);
      expect(["FACE", "TIP_ONLY", "ABSORBED"], id).toContain(r.presence);
      expect(r.decidedBy, id).toMatch(NAMED[id] ? /14\/10\/2026.*nome (Garrison|Enea)/ : /14\/10\/2026.*nome da decidere/);
    }
    expect(rosterEntry("accoglienza-chef").label).toBe("Garrison");
    expect(rosterEntry("mentore-tornei").role).toMatch(/direttore artistico/i);
  });

  it("keeps every character original, with minors' protection on and real people to refer to", () => {
    for (const r of CAST_ROSTER) {
      expect(r.origin, r.id).toBe("ORIGINAL_INSPIRED_BY_ROLE");
      expect(r.minorsProtection, r.id).toBe(true);
      expect(r.does.length, r.id).toBeGreaterThan(0);
      expect(r.rules.length, r.id).toBeGreaterThan(0);
      expect(r.refersTo.length, r.id).toBeGreaterThan(0);
      expect(`${r.label} ${r.portrait.brief}`, r.id).not.toMatch(
        /sosia|somiglia|stile (di|alla) [A-Z]|come [A-Z][a-z]+ [A-Z]/,
      );
    }
    expect(CAST_SHARED_RULES.join(" ")).toMatch(
      /mai nome, volto o voce di una persona reale/,
    );
    expect(CAST_SHARED_RULES.join(" ")).toMatch(/S\.C\.D\. ColicoDerviese/);
  });

  it("has Vera as the only chat persona, three faces, five tip-only characters and the absorbed ticket office (UD-121)", () => {
    const by = (p: string) => CAST_ROSTER.filter((r) => r.presence === p).map((r) => r.id);
    expect(by("CHAT_PERSONA")).toEqual(["vera"]);
    expect(by("FACE")).toEqual(["accoglienza-chef", "mentore-tornei", "volto-sponsor"]);
    expect(by("TIP_ONLY")).toEqual(["era", "acanfora", "mental-coach", "preparatore-atletico", "musica-relax"]);
    expect(by("ABSORBED")).toEqual(["biglietteria"]);
    for (const id of CAST_IDS)
      expect(rosterEntry(id).portrait.ready, id).toBe(castReady(id));
    expect(rosterEntry("era").role).toBe("Nutrizionista");
    expect(rosterEntry("vera").role).toBe("Reception");
    expect(rosterEntry("vera").decidedBy).toMatch(/UD-121/);
    expect(rosterEntry("acanfora").role).toBe("Medico");
  });

  it("states the hard rules of the sensitive roles", () => {
    expect(rosterEntry("era").rules.join(" ")).toMatch(
      /mai piani alimentari personali, numeri, quantità o peso per i minori/i,
    );
    expect(rosterEntry("acanfora").rules.join(" ")).toMatch(/mai diagnosi/i);
    expect(rosterEntry("mental-coach").rules.join(" ")).toMatch(
      /minori senza i genitori/,
    );
    expect(rosterEntry("preparatore-atletico").rules.join(" ")).toMatch(
      /mai piani o schede personali per i minori/i,
    );
    expect(rosterEntry("musica-relax").rules.join(" ")).toMatch(
      /non è psicoterapia/i,
    );
    expect(rosterEntry("musica-relax").refersTo).toContain(
      "Referente Tutela minori",
    );
    expect(rosterEntry("accoglienza-chef").does.join(" ")).toMatch(
      /una persona conferma, si paga alla cassa SQUBY\/SumUp/,
    );
    expect(rosterEntry("biglietteria").does.join(" ")).toMatch(
      /prevendita, solo quando è attiva/,
    );
    expect(rosterEntry("volto-sponsor").rules.join(" ")).toMatch(
      /mai inventati/,
    );
  });
});

describe("Musica e relax safety rule: distress gets a referral, never therapy", () => {
  it("recognises distress and danger, including accented words", () => {
    expect(detectDistress("prima della partita ho l'ansia")).toBe("distress");
    expect(detectDistress("mi sento giù")).toBe("distress");
    expect(detectDistress("non ce la faccio più")).toBe("distress");
    expect(detectDistress("a volte penso di farmi del male")).toBe("danger");
    expect(detectDistress("non voglio più vivere")).toBe("danger");
    expect(detectDistress("che musica mi consigli per scaldarmi?")).toBeNull();
    expect(detectDistress("quando gioca la juniores")).toBeNull();
  });

  it("refers to real people and the Tutela minori referent, with 112 for danger, and does no therapy", () => {
    for (const level of ["distress", "danger"] as const) {
      const r = distressReferral(level);
      expect(r.text).toMatch(/referente Tutela minori/);
      expect(r.text).toMatch(/112/);
      expect(r.text).toMatch(/S\.C\.D\. ColicoDerviese/);
      expect(r.links).toEqual([
        { label: "Referente Tutela minori", to: "/safeguarding" },
      ]);
      expect(relaxCopyProblems(r.text), level).toEqual([]);
    }
    expect(distressReferral("distress").text).toMatch(/psicologo/);
    expect(distressReferral("danger").mood).toBe("alert");
  });

  it("answers distress with the referral in the rules engine (AI off), before requests and intents", async () => {
    await expect(
      skyRulesAnswer({ message: "mi sento triste dopo la partita" }),
    ).resolves.toEqual(distressReferral("distress"));
    await expect(
      skyRulesAnswer({ message: "voglio farla finita" }),
    ).resolves.toEqual(distressReferral("danger"));
  });

  it("the therapy guard catches therapy and diagnosis wording", () => {
    expect(relaxCopyProblems("questa musica è una terapia")).toHaveLength(1);
    expect(relaxCopyProblems("ti faccio una diagnosi")).toHaveLength(1);
    expect(relaxCopyProblems("respira piano e ascolta la musica")).toEqual([]);
  });
});

describe("Era nutrition guard (minors: no numbers, no plans, no weight)", () => {
  it("offers four to six general tips", () => {
    expect(ERA_TIPS.length).toBeGreaterThanOrEqual(4);
    expect(ERA_TIPS.length).toBeLessThanOrEqual(6);
    expect(new Set(ERA_TIPS.map((t) => t.id)).size).toBe(ERA_TIPS.length);
  });

  it("has no digits and no forbidden words in any tip or in the disclaimer", () => {
    for (const t of ERA_TIPS) {
      expect(tipProblems(t.title), t.id).toEqual([]);
      expect(tipProblems(t.text), t.id).toEqual([]);
      expect(`${t.title} ${t.text}`).not.toMatch(/\d|dieta|peso|calorie/i);
    }
    expect(tipProblems(ERA_DISCLAIMER)).toEqual([]);
  });

  it("covers hydration, training snacks, sleep and variety", () => {
    const all = ERA_TIPS.map((t) => `${t.title} ${t.text}`)
      .join(" ")
      .toLowerCase();
    for (const w of [
      "acqua",
      "prima dell'allenamento",
      "dopo",
      "dormi",
      "varia",
    ])
      expect(all).toContain(w);
  });

  it("the guard itself catches numbers and banned topics", () => {
    expect(tipProblems("bevi 2 litri")).toContain("contains digits");
    expect(tipProblems("segui questa dieta")).toHaveLength(1);
    expect(tipProblems("controlla il peso")).toHaveLength(1);
    expect(tipProblems("conta le calorie")).toHaveLength(1);
    expect(tipProblems("ecco il tuo piano alimentare")).toHaveLength(1);
  });

  it("never gives personal plans and sends specific needs to the paediatrician or doctor", () => {
    expect(ERA_DISCLAIMER).toMatch(/mai piani personali/);
    expect(ERA_DISCLAIMER).toMatch(/pediatra o al medico/);
  });

  it("picks the same tip for everybody on a Rome day and every tip once per cycle", () => {
    expect(dailyPick(ERA_TIPS, "2026-10-14")).toBe(
      dailyPick(ERA_TIPS, "2026-10-14"),
    );
    const seen = new Set<string>();
    for (let d = 0; d < ERA_TIPS.length; d++) {
      const day = new Date(Date.UTC(2026, 9, 14 + d))
        .toISOString()
        .slice(0, 10);
      seen.add(dailyPick(ERA_TIPS, day).id);
    }
    expect(seen.size).toBe(ERA_TIPS.length);
    expect(romeDay(new Date("2026-10-14T22:30:00Z"))).toBe("2026-10-15");
    expect(() => dailyPick([], "2026-10-14")).toThrow();
  });
});

describe("Dottor Acanfora guard (club doctor: prevention and first aid, 112, never diagnosis)", () => {
  const copy = [
    ...KNOCK_STEPS.flatMap((s) => [s.title, s.text]),
    ...ACANFORA_DAILY_TIPS.flatMap((s) => [s.title, s.text]),
    ...CALL_112_WHEN,
    HEAD_KNOCK_RULE,
    ACANFORA_DISCLAIMER,
  ];

  it("explains the four RICE steps in plain words", () => {
    expect(KNOCK_STEPS.map((s) => s.title)).toEqual([
      "Riposo",
      "Ghiaccio",
      "Compressione",
      "Elevazione",
    ]);
  });

  it("has a prevention tip for every day of a cycle", () => {
    expect(ACANFORA_DAILY_TIPS.length).toBeGreaterThanOrEqual(4);
    expect(new Set(ACANFORA_DAILY_TIPS.map((t) => t.key)).size).toBe(
      ACANFORA_DAILY_TIPS.length,
    );
  });

  it("uses no number but 112 and no diagnostic or drug wording", () => {
    for (const t of copy) expect(firstAidProblems(t), t).toEqual([]);
    expect(firstAidProblems("prendi un antidolorifico")).toHaveLength(1);
    expect(firstAidProblems("ghiaccio per 20 minuti")).toHaveLength(1);
  });

  it("states the emergency number, that he is the club doctor and that he does not diagnose", () => {
    expect(ACANFORA_DISCLAIMER).toMatch(/112/);
    expect(ACANFORA_DISCLAIMER).toMatch(/non fa diagnosi/);
    expect(ACANFORA_DISCLAIMER).toMatch(/medico del club/);
    expect(CALL_112_WHEN.length).toBeGreaterThanOrEqual(4);
  });

  it("shows only verified infermeria rooms from the facility data", () => {
    const rooms = firstAidRooms();
    expect(rooms.length).toBeGreaterThan(0);
    for (const r of rooms) expect(r.name).toBe("Infermeria");
    expect(rooms.map((r) => r.site)).toContain("Centro Sportivo Colico");
  });
});
