import { describe, expect, it } from "vitest";

import {
  ALWAYS_INFORMED,
  CHI_FA_COSA_SITES,
  CHI_FA_COSA_TABLE,
  CHI_FA_COSA_TOPICS,
  CONFIRMER_FALLBACK,
  DERVIO_ALWAYS,
  NAMED_MISSING_POSITIONS,
  NEVER_RECIPIENTS,
  POSITION_RANK,
  ROUTABLE_POSITIONS,
  SITE_STRUCTURE,
  TOPIC_LABEL,
  chiFaCosaInputSchema,
  isRoutablePosition,
  notifyAfterConfirmation,
  notifyNow,
  requesterRank,
  routeChiFaCosa,
  type ChiFaCosaRoute,
} from "./chi-fa-cosa";
import { REQUEST_CONFIRMERS, REQUEST_TEAMS, positionExists } from "./request-machine";
import { KNOWN_POSITIONS } from "./session";

const positions = (r: ChiFaCosaRoute) => r.recipients.map((x) => x.position);
const find = (r: ChiFaCosaRoute, p: string) => r.recipients.find((x) => x.position === p);

const ALL_SITES = [...CHI_FA_COSA_SITES, null] as const;
const ALL_TEAMS = [null, ...REQUEST_TEAMS.map((t) => t.key)];

describe("registry alignment", () => {
  it("every position in the table, site structure and fixed sets is a routable registry position", () => {
    const used = new Set<string>([...ALWAYS_INFORMED, ...DERVIO_ALWAYS, CONFIRMER_FALLBACK]);
    for (const rule of Object.values(CHI_FA_COSA_TABLE)) for (const e of rule.entries) used.add(e.position);
    for (const list of Object.values(SITE_STRUCTURE)) for (const p of list) used.add(p);
    for (const p of used) {
      expect(KNOWN_POSITIONS, p).toContain(p);
      expect(isRoutablePosition(p), p).toBe(true);
    }
  });

  it("families, athletes and partners are never routable", () => {
    for (const p of NEVER_RECIPIENTS) {
      expect(ROUTABLE_POSITIONS).not.toContain(p);
      expect(isRoutablePosition(p)).toBe(false);
    }
    expect([...ROUTABLE_POSITIONS, ...NEVER_RECIPIENTS].sort()).toEqual([...KNOWN_POSITIONS].sort());
  });

  it("ranks cover every routable position and only those", () => {
    expect(Object.keys(POSITION_RANK).sort()).toEqual([...ROUTABLE_POSITIONS].sort());
  });

  it("named missing positions are really missing from the registry (fail closed)", () => {
    for (const p of Object.keys(NAMED_MISSING_POSITIONS)) expect(positionExists(p), p).toBe(false);
    for (const rule of Object.values(CHI_FA_COSA_TABLE))
      for (const m of rule.missing) expect(Object.keys(NAMED_MISSING_POSITIONS)).toContain(m);
  });

  it("every topic has a label and at least one entry", () => {
    for (const t of CHI_FA_COSA_TOPICS) {
      expect(TOPIC_LABEL[t]).toBeTruthy();
      expect(CHI_FA_COSA_TABLE[t].entries.length).toBeGreaterThan(0);
    }
  });
});

describe("invariants over every topic, site and team", () => {
  for (const topic of CHI_FA_COSA_TOPICS)
    for (const site of ALL_SITES)
      for (const teamKey of ALL_TEAMS) {
        it(`${topic} · ${site ?? "sede ?"} · ${teamKey ?? "nessuna squadra"}`, () => {
          const r = routeChiFaCosa({ topic, site, teamKey });
          const ps = positions(r);
          // UD-141: DG always, and always told now.
          expect(ps).toContain("direttore-generale");
          expect(find(r, "direttore-generale")!.when).toBe("NOW");
          // Only adult registry positions, never families, minors or external people, no duplicates.
          for (const p of ps) expect(isRoutablePosition(p), p).toBe(true);
          for (const p of NEVER_RECIPIENTS) expect(ps).not.toContain(p);
          expect(new Set(ps).size).toBe(ps.length);
          // Missing positions are never recipients.
          for (const m of r.missingPositions) expect(ps).not.toContain(m.position);
          // Every recipient has a reason; output carries no address-like text.
          for (const x of r.recipients) {
            expect(x.reasons.length).toBeGreaterThan(0);
            expect(JSON.stringify(x)).not.toMatch(/@|\+39|\d{6,}/);
          }
          // UD-156: anything touching Dervio (or an unknown site) informs the Dervio set now.
          if (site !== "COLICO")
            for (const p of DERVIO_ALWAYS) {
              expect(ps, p).toContain(p);
              expect(find(r, p)!.when, p).toBe("NOW");
            }
          // Approvers are exactly the DECIDE recipients and are told now.
          expect(r.approvers).toEqual(r.recipients.filter((x) => x.duty === "DECIDE").map((x) => x.position).sort());
          for (const a of r.approvers) expect(find(r, a)!.when).toBe("NOW");
          // No requester -> never confirmed by itself.
          expect(r.status).toBe(topic === "emergenza" ? "IMMEDIATO" : "DA_CONFERMARE");
          // Deterministic.
          expect(routeChiFaCosa({ topic, site, teamKey })).toEqual(r);
        });
      }
});

describe("UD-156 Dervio", () => {
  it("Colico alone does not pull the Dervio set beyond DG and the topic's own positions", () => {
    const r = routeChiFaCosa({ topic: "pulmini", site: "COLICO" });
    expect(positions(r)).not.toContain("responsabile-attivita-base");
    expect(positions(r)).not.toContain("presidente");
  });

  it("Dervio facilities: DG decides, Dervio structure and the UD-156 set informed, Colico structure not", () => {
    const r = routeChiFaCosa({ topic: "impianti", site: "DERVIO" });
    expect(r.approvers).toEqual(["direttore-generale"]);
    expect(positions(r)).toContain("responsabile-struttura-dervio");
    expect(positions(r)).not.toContain("responsabile-struttura-colico");
    expect(find(r, "segreteria")!.reasons.join(" ")).toMatch(/UD-156/);
  });

  it("Colico facilities: Colico structure decides, no Dervio structure", () => {
    const r = routeChiFaCosa({ topic: "impianti", site: "COLICO" });
    expect(r.approvers).toEqual(["responsabile-struttura-colico"]);
    expect(positions(r)).not.toContain("responsabile-struttura-dervio");
    expect(positions(r)).not.toContain("responsabile-attivita-base");
  });

  it("both sites: both structures and the Dervio set", () => {
    const r = routeChiFaCosa({ topic: "impianti", site: "ENTRAMBE" });
    expect(positions(r)).toEqual(expect.arrayContaining(["responsabile-struttura-colico", "responsabile-struttura-dervio", ...DERVIO_ALWAYS]));
  });

  it("unknown site: Dervio set informed with a warning, no structure guessed", () => {
    const r = routeChiFaCosa({ topic: "impianti", site: null });
    expect(r.warnings.join(" ")).toMatch(/Sede da indicare/);
    expect(r.warnings.join(" ")).toMatch(/come per Dervio/);
    expect(positions(r)).not.toContain("responsabile-struttura-colico");
    expect(positions(r)).not.toContain("responsabile-struttura-dervio");
  });
});

describe("UD-154 group confirmers", () => {
  it("base activity groups: Responsabile Attività di Base decides a match", () => {
    for (const k of ["2014", "2015", "esordienti", "pulcini", "primicalci", "piccoli"]) {
      const r = routeChiFaCosa({ topic: "gara", site: "COLICO", teamKey: k });
      expect(r.approvers, k).toEqual(["responsabile-attivita-base"]);
      expect(find(r, "mister")!.teamKey).toBe(k);
      expect(find(r, "dirigente-annata")!.teamKey).toBe(k);
    }
  });

  it("groups whose confirmer position does not exist: Direzione decides and the position is reported missing", () => {
    for (const rule of REQUEST_CONFIRMERS.filter((c) => !positionExists(c.position)))
      for (const k of rule.groups) {
        const r = routeChiFaCosa({ topic: "gara", site: "COLICO", teamKey: k });
        expect(r.approvers, k).toEqual([CONFIRMER_FALLBACK]);
        expect(r.missingPositions.map((m) => m.position)).toContain(rule.position);
        expect(positions(r)).not.toContain(rule.position);
      }
  });

  it("match without team: warning, no team staff", () => {
    const r = routeChiFaCosa({ topic: "gara", site: "COLICO" });
    expect(r.warnings.join(" ")).toMatch(/Squadra da indicare/);
    expect(positions(r)).not.toContain("mister");
  });

  it("unknown team key is ignored, never guessed", () => {
    const r = routeChiFaCosa({ topic: "gara", site: "COLICO", teamKey: "u18" });
    expect(r.teamKey).toBeNull();
    expect(r.warnings.join(" ")).toMatch(/non riconosciuta/);
    expect(positions(r)).not.toContain("mister");
  });

  it("segreteria prepares the Master Calendario row and the federal form", () => {
    const r = routeChiFaCosa({ topic: "gara", site: "COLICO", teamKey: "pulcini" });
    expect(find(r, "segreteria")!.duty).toBe("PREPARE");
  });
});

describe("UD-141 hierarchy", () => {
  it("request from the superior is confirmed and everybody is told now", () => {
    const r = routeChiFaCosa({ topic: "gara", site: "COLICO", teamKey: "pulcini", requesterPositions: ["presidente"] });
    expect(r.status).toBe("CONFERMATA");
    expect(notifyAfterConfirmation(r)).toEqual([]);
    expect(notifyNow(r)).toEqual(positions(r));
  });

  it("request from an equal is confirmed", () => {
    const r = routeChiFaCosa({ topic: "gara", site: "COLICO", teamKey: "pulcini", requesterPositions: ["responsabile-attivita-base"] });
    expect(r.status).toBe("CONFERMATA");
  });

  it("request from below waits for the superior; DG and approver now, the rest after acceptance", () => {
    const r = routeChiFaCosa({ topic: "gara", site: "COLICO", teamKey: "pulcini", requesterPositions: ["mister"] });
    expect(r.status).toBe("DA_CONFERMARE");
    expect(notifyNow(r).sort()).toEqual(["direttore-generale", "responsabile-attivita-base"]);
    expect(notifyAfterConfirmation(r)).toEqual(expect.arrayContaining(["segreteria", "mister", "dirigente-annata", "coordinatore-attivita-sportiva"]));
  });

  it("a requester with several positions counts with the highest", () => {
    expect(requesterRank(["mister", "direttore-generale"])).toBe(POSITION_RANK["direttore-generale"]);
    const r = routeChiFaCosa({ topic: "pulmini", site: "COLICO", requesterPositions: ["autista", "coordinatore-attivita-sportiva"] });
    expect(r.status).toBe("CONFERMATA");
  });

  it("families, athletes, partners and unknown positions are never a recognised requester", () => {
    for (const rp of [[], ["famiglia"], ["atleta"], ["partner"], ["nonna"], null]) {
      expect(requesterRank(rp)).toBeNull();
      const r = routeChiFaCosa({ topic: "allenamenti", site: "COLICO", requesterPositions: rp });
      expect(r.status).toBe("DA_CONFERMARE");
      expect(r.warnings.join(" ")).toMatch(/senza ruolo riconosciuto/);
    }
  });

  it("a mister cannot confirm what the Direzione must confirm for a group without its confirmer", () => {
    const k = REQUEST_CONFIRMERS.find((c) => !positionExists(c.position))?.groups[0];
    if (!k) return;
    expect(routeChiFaCosa({ topic: "gara", site: "COLICO", teamKey: k, requesterPositions: ["direttore-generale"] }).status).toBe("DA_CONFERMARE");
    expect(routeChiFaCosa({ topic: "gara", site: "COLICO", teamKey: k, requesterPositions: ["direzione"] }).status).toBe("CONFERMATA");
  });

  it("on Dervio the UD-156 set is told now even while waiting", () => {
    const r = routeChiFaCosa({ topic: "impianti", site: "DERVIO", requesterPositions: ["responsabile-struttura-dervio"] });
    expect(r.status).toBe("DA_CONFERMARE");
    for (const p of DERVIO_ALWAYS) expect(notifyNow(r)).toContain(p);
    expect(notifyAfterConfirmation(r)).toContain("responsabile-struttura-dervio");
  });
});

describe("sensitive topics", () => {
  it("health: infermeria decides, no team staff even with a team, fisioterapista reported missing, no health details", () => {
    const r = routeChiFaCosa({ topic: "salute", site: "COLICO", teamKey: "u15" });
    expect(r.approvers).toEqual(["responsabile-infermeria"]);
    expect(positions(r)).not.toContain("mister");
    expect(positions(r)).not.toContain("dirigente-annata");
    expect(r.missingPositions.map((m) => m.position)).toContain("fisioterapista");
    expect(r.contentLimits.join(" ")).toMatch(/salute/);
  });

  it("minors (organisational): presidente decides, no team staff, safeguarding reports stay in their own channel", () => {
    const r = routeChiFaCosa({ topic: "minori-organizzativo", site: "COLICO", teamKey: "pulcini" });
    expect(r.approvers).toEqual(["presidente"]);
    expect(positions(r)).not.toContain("mister");
    expect(r.missingPositions.map((m) => m.position)).toContain("responsabile-safeguarding");
    expect(r.contentLimits.join(" ")).toMatch(/canale Safeguarding/);
  });

  it("money topics forbid amounts, IBAN and codice fiscale in the notice", () => {
    for (const t of ["pagamenti", "iscrizioni", "sponsor"] as const)
      expect(routeChiFaCosa({ topic: t, site: "COLICO" }).contentLimits.join(" "), t).toMatch(/IBAN/);
  });

  it("every topic forbids minors' names and copying the inbound message", () => {
    for (const t of CHI_FA_COSA_TOPICS) {
      const l = routeChiFaCosa({ topic: t, site: "COLICO" }).contentLimits.join(" ");
      expect(l, t).toMatch(/minori/);
      expect(l, t).toMatch(/copiare/);
    }
  });
});

describe("emergency", () => {
  it("is immediate: everybody now, whoever asks, with 112 first and site structure", () => {
    const r = routeChiFaCosa({ topic: "emergenza", site: "DERVIO", teamKey: "u19", requesterPositions: ["mister"] });
    expect(r.status).toBe("IMMEDIATO");
    expect(notifyAfterConfirmation(r)).toEqual([]);
    expect(positions(r)).toEqual(expect.arrayContaining(["presidente", "direttore-generale", "responsabile-struttura-dervio", "mister"]));
    expect(r.contentLimits.join(" ")).toMatch(/112/);
  });
});

describe("other topics", () => {
  it("pulmini: responsabile trasporti decides, drivers and team staff informed", () => {
    const r = routeChiFaCosa({ topic: "pulmini", site: "COLICO", teamKey: "u16" });
    expect(r.approvers).toEqual(["responsabile-trasporti"]);
    expect(positions(r)).toEqual(expect.arrayContaining(["autista", "mister", "dirigente-annata"]));
  });

  it("allenamenti: coordinatore decides, group responsible informed", () => {
    const r = routeChiFaCosa({ topic: "allenamenti", site: "COLICO", teamKey: "piccoli" });
    expect(r.approvers).toEqual(["coordinatore-attivita-sportiva"]);
    expect(find(r, "responsabile-attivita-base")!.duty).toBe("INFORM");
  });

  it("iscrizioni, pagamenti, comunicazioni, tornei, sponsor have their owner", () => {
    expect(routeChiFaCosa({ topic: "iscrizioni", site: "COLICO" }).approvers).toEqual(["segreteria"]);
    expect(routeChiFaCosa({ topic: "pagamenti", site: "COLICO" }).approvers).toEqual(["tesoreria"]);
    expect(routeChiFaCosa({ topic: "comunicazioni", site: "COLICO" }).approvers).toEqual(["segreteria"]);
    expect(routeChiFaCosa({ topic: "tornei", site: "COLICO" }).approvers).toEqual(["responsabile-tornei"]);
    expect(routeChiFaCosa({ topic: "sponsor", site: "COLICO" }).approvers).toEqual(["presidente"]);
  });

  it("recipients are ordered: deciders first, then preparers, then informed", () => {
    const r = routeChiFaCosa({ topic: "gara", site: "DERVIO", teamKey: "2014" });
    const order = { DECIDE: 0, PREPARE: 1, INFORM: 2 } as const;
    const duties = r.recipients.map((x) => order[x.duty]);
    expect(duties).toEqual([...duties].sort((a, b) => a - b));
  });
});

describe("input validation", () => {
  it("rejects unknown topics and sites", () => {
    expect(chiFaCosaInputSchema.safeParse({ topic: "mercato", site: "COLICO" }).success).toBe(false);
    expect(chiFaCosaInputSchema.safeParse({ topic: "gara", site: "LECCO" }).success).toBe(false);
    expect(() => routeChiFaCosa({ topic: "gara" as never, site: "MILANO" as never })).toThrow();
  });

  it("accepts the minimal input", () => {
    expect(chiFaCosaInputSchema.safeParse({ topic: "gara", site: null }).success).toBe(true);
  });
});
