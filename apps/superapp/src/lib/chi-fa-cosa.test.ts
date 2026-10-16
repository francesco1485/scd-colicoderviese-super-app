import { describe, expect, it } from "vitest";

import {
  CHI_FA_COSA_SITES,
  CHI_FA_COSA_TABLE,
  CHI_FA_COSA_TOPICS,
  CONFIRMER_FALLBACK,
  DERVIO_ALWAYS,
  DERVIO_EMERGENCY_STRUCTURE,
  DERVIO_EXCLUDED,
  NAMED_MISSING_POSITIONS,
  NEVER_RECIPIENTS,
  SAFEGUARDING_CHANNEL_ONLY,
  POSITION_RANK,
  REQUEST_WATCHERS,
  ROUTABLE_POSITIONS,
  SITE_STRUCTURE,
  TOPIC_LABEL,
  chiFaCosaInputSchema,
  isRoutablePosition,
  notifyAfterConfirmation,
  notifyNow,
  requesterRank,
  routeChiFaCosa,
  type ChiFaCosaInput,
  type ChiFaCosaRoute,
} from "./chi-fa-cosa";
import { REQUEST_CONFIRMERS, REQUEST_TEAMS, positionExists } from "./request-machine";
import { KNOWN_POSITIONS, R138_POSITIONS } from "./session";

/** Most tests describe the routing once r138 is live (UD-161); the "r138 not live" block checks the fallback. */
const routeLive = (x: ChiFaCosaInput) => routeChiFaCosa({ r138Live: true, ...x });

const positions = (r: ChiFaCosaRoute) => r.recipients.map((x) => x.position);
const find = (r: ChiFaCosaRoute, p: string) => r.recipients.find((x) => x.position === p);

const ALL_SITES = [...CHI_FA_COSA_SITES, null] as const;
const ALL_TEAMS = [null, ...REQUEST_TEAMS.map((t) => t.key)];

describe("registry alignment", () => {
  it("every position in the table, site structure and fixed sets is a routable registry position", () => {
    const used = new Set<string>([
      ...REQUEST_WATCHERS,
      ...DERVIO_ALWAYS,
      ...DERVIO_EXCLUDED,
      ...DERVIO_EMERGENCY_STRUCTURE,
      CONFIRMER_FALLBACK,
    ]);
    for (const rule of Object.values(CHI_FA_COSA_TABLE)) for (const e of rule.entries) used.add(e.position);
    for (const list of Object.values(SITE_STRUCTURE)) for (const p of list) used.add(p);
    for (const p of used) {
      expect(KNOWN_POSITIONS, p).toContain(p);
      expect(isRoutablePosition(p, true), p).toBe(true);
    }
  });

  it("families, athletes and partners are never routable", () => {
    for (const p of NEVER_RECIPIENTS) {
      expect(ROUTABLE_POSITIONS).not.toContain(p);
      expect(isRoutablePosition(p)).toBe(false);
    }
    expect([...ROUTABLE_POSITIONS, ...NEVER_RECIPIENTS, ...SAFEGUARDING_CHANNEL_ONLY].sort()).toEqual([...KNOWN_POSITIONS].sort());
    // UD-161 D3: the safeguarding lead is never routed by this table (dedicated channel only).
    expect(isRoutablePosition("responsabile-safeguarding", true)).toBe(false);
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
          const r = routeLive({ topic, site, teamKey });
          const ps = positions(r);
          // UD-141 / UD-154: DG and Coordinatore always, and always told now.
          for (const w of ["direttore-generale", "coordinatore-attivita-sportiva"]) {
            expect(ps, w).toContain(w);
            expect(find(r, w)!.when, w).toBe("NOW");
          }
          // UD-141/UD-154: who decides or prepares is told now.
          for (const x of r.recipients) if (x.duty !== "INFORM") expect(x.when, x.position).toBe("NOW");
          // Only adult registry positions, never families, minors or external people, no duplicates.
          for (const p of ps) expect(isRoutablePosition(p, true), p).toBe(true);
          expect(ps).not.toContain("responsabile-safeguarding");
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
          if (site !== "COLICO") {
            for (const p of DERVIO_ALWAYS) {
              expect(ps, p).toContain(p);
              expect(find(r, p)!.when, p).toBe("NOW");
            }
            // UD-156: positions that do not see Dervio are never told about it (emergenza: see its own test).
            if (topic !== "emergenza") for (const p of DERVIO_EXCLUDED) expect(ps, p).not.toContain(p);
          }
          // Approvers are exactly the DECIDE recipients and are told now.
          expect(r.approvers).toEqual(r.recipients.filter((x) => x.duty === "DECIDE").map((x) => x.position).sort());
          for (const a of r.approvers) expect(find(r, a)!.when).toBe("NOW");
          // No requester -> never confirmed by itself.
          expect(r.status).toBe(topic === "emergenza" ? "IMMEDIATO" : "DA_CONFERMARE");
          // Deterministic.
          expect(routeLive({ topic, site, teamKey })).toEqual(r);
        });
      }
});

describe("UD-156 Dervio", () => {
  it("Colico alone does not pull the Dervio set beyond DG and the topic's own positions", () => {
    const r = routeLive({ topic: "pulmini", site: "COLICO" });
    expect(positions(r)).not.toContain("responsabile-attivita-base");
    expect(positions(r)).not.toContain("presidente");
  });

  it("Dervio facilities: Presidente and Consiglio Direttivo decide, UD-156 set informed, no structure position", () => {
    const r = routeLive({ topic: "impianti", site: "DERVIO" });
    expect(r.approvers).toEqual(["direzione", "presidente"]);
    expect(positions(r).sort()).toEqual([...new Set([...DERVIO_ALWAYS, "direzione"])].sort());
    for (const p of DERVIO_EXCLUDED) expect(positions(r)).not.toContain(p);
    expect(find(r, "segreteria")!.reasons.join(" ")).toMatch(/UD-156/);
  });

  it("Colico facilities: Presidente and Consiglio Direttivo decide, Colico structure informed, no Dervio structure", () => {
    const r = routeLive({ topic: "impianti", site: "COLICO" });
    expect(r.approvers).toEqual(["direzione", "presidente"]);
    expect(find(r, "responsabile-struttura-colico")!.duty).toBe("INFORM");
    expect(positions(r)).not.toContain("responsabile-struttura-dervio");
    expect(positions(r)).not.toContain("responsabile-attivita-base");
  });

  it("both sites: Dervio set, no structure position, warning to tell Colico structure separately", () => {
    const r = routeLive({ topic: "impianti", site: "ENTRAMBE" });
    expect(positions(r)).toEqual(expect.arrayContaining([...DERVIO_ALWAYS]));
    for (const p of DERVIO_EXCLUDED) expect(positions(r)).not.toContain(p);
    expect(r.approvers).toEqual(["direzione", "presidente"]);
    expect(r.warnings.join(" ")).toMatch(/avvisati a parte/);
  });

  it("matches and trainings at Dervio do not tell responsabile campi", () => {
    for (const topic of ["gara", "allenamenti"] as const) {
      expect(positions(routeLive({ topic, site: "COLICO", teamKey: "u15" })), topic).toContain("responsabile-campi");
      expect(positions(routeLive({ topic, site: "DERVIO", teamKey: "u15" })), topic).not.toContain("responsabile-campi");
    }
  });

  it("unknown site: Dervio set informed with a warning, no structure guessed", () => {
    const r = routeLive({ topic: "impianti", site: null });
    expect(r.warnings.join(" ")).toMatch(/Sede da indicare/);
    expect(r.warnings.join(" ")).toMatch(/come per Dervio/);
    expect(positions(r)).not.toContain("responsabile-struttura-colico");
    expect(positions(r)).not.toContain("responsabile-struttura-dervio");
  });
});

describe("UD-154 group confirmers", () => {
  it("base activity groups: Responsabile Attività di Base decides a match", () => {
    for (const k of ["2014", "2015", "esordienti", "pulcini", "primicalci", "piccoli"]) {
      const r = routeLive({ topic: "gara", site: "COLICO", teamKey: k });
      expect(r.approvers, k).toEqual(["responsabile-attivita-base"]);
      expect(find(r, "mister")!.teamKey).toBe(k);
      expect(find(r, "dirigente-annata")!.teamKey).toBe(k);
    }
  });

  it("r138 not live: groups of the direttori sportivi fall back to the Direzione and the position is reported missing", () => {
    const off = REQUEST_CONFIRMERS.filter((c) => !positionExists(c.position));
    expect(off.map((c) => c.position).sort()).toEqual(["direttore-sportivo-agonistica", "direttore-sportivo-generale"]);
    for (const rule of off)
      for (const k of rule.groups) {
        const r = routeChiFaCosa({ topic: "gara", site: "COLICO", teamKey: k });
        expect(r.approvers, k).toEqual([CONFIRMER_FALLBACK]);
        expect(r.missingPositions.map((m) => m.position)).toContain(rule.position);
        expect(positions(r)).not.toContain(rule.position);
      }
  });

  it("match without team: warning, no team staff", () => {
    const r = routeLive({ topic: "gara", site: "COLICO" });
    expect(r.warnings.join(" ")).toMatch(/Squadra da indicare/);
    expect(positions(r)).not.toContain("mister");
  });

  it("unknown team key is ignored, never guessed", () => {
    const r = routeLive({ topic: "gara", site: "COLICO", teamKey: "u18" });
    expect(r.teamKey).toBeNull();
    expect(r.warnings.join(" ")).toMatch(/non riconosciuta/);
    expect(positions(r)).not.toContain("mister");
  });

  it("segreteria prepares the Master Calendario row and the federal form", () => {
    const r = routeLive({ topic: "gara", site: "COLICO", teamKey: "pulcini" });
    expect(find(r, "segreteria")!.duty).toBe("PREPARE");
  });
});

describe("UD-141 hierarchy", () => {
  it("request from the superior is confirmed and everybody is told now", () => {
    const r = routeLive({ topic: "gara", site: "COLICO", teamKey: "pulcini", requesterPositions: ["presidente"] });
    expect(r.status).toBe("CONFERMATA");
    expect(notifyAfterConfirmation(r)).toEqual([]);
    expect(notifyNow(r)).toEqual(positions(r));
  });

  it("request from an equal is confirmed", () => {
    const r = routeLive({ topic: "gara", site: "COLICO", teamKey: "pulcini", requesterPositions: ["responsabile-attivita-base"] });
    expect(r.status).toBe("CONFERMATA");
  });

  it("request from below waits for the superior; DG and approver now, the rest after acceptance", () => {
    const r = routeLive({ topic: "gara", site: "COLICO", teamKey: "pulcini", requesterPositions: ["mister"] });
    expect(r.status).toBe("DA_CONFERMARE");
    expect(notifyNow(r).sort()).toEqual(
      ["coordinatore-attivita-sportiva", "direttore-generale", "responsabile-attivita-base", "segreteria"].sort(),
    );
    expect(find(r, "segreteria")!.duty).toBe("PREPARE");
    expect(notifyAfterConfirmation(r).sort()).toEqual(["dirigente-annata", "mister", "responsabile-campi"]);
  });

  it("a requester with several positions counts with the highest", () => {
    expect(requesterRank(["mister", "direttore-generale"])).toBe(POSITION_RANK["direttore-generale"]);
    const r = routeLive({ topic: "pulmini", site: "COLICO", requesterPositions: ["autista", "coordinatore-attivita-sportiva"] });
    expect(r.status).toBe("CONFERMATA");
  });

  it("families, athletes, partners and unknown positions are never a recognised requester", () => {
    for (const rp of [[], ["famiglia"], ["atleta"], ["partner"], ["nonna"], null]) {
      expect(requesterRank(rp)).toBeNull();
      const r = routeLive({ topic: "allenamenti", site: "COLICO", requesterPositions: rp });
      expect(r.status).toBe("DA_CONFERMARE");
      expect(r.warnings.join(" ")).toMatch(/senza ruolo riconosciuto/);
    }
  });

  it("direttori sportivi confirm their groups (Francesco 16/10/2026 13:32, r138); Direzione above, staff below waits", () => {
    // Every confirmer position exists now: the Direzione fallback is no longer needed for any group.
    expect(REQUEST_CONFIRMERS.filter((c) => !positionExists(c.position, true))).toEqual([]);
    const cases: Array<[string, string]> = [
      ["u16", "direttore-sportivo-agonistica"],
      ["u15", "direttore-sportivo-agonistica"],
      ["prima", "direttore-sportivo-generale"],
      ["u19", "direttore-sportivo-generale"],
    ];
    for (const [k, ds] of cases) {
      const route = (rp: string[]) => routeLive({ topic: "gara", site: "COLICO", teamKey: k, requesterPositions: rp });
      expect(route([ds]).approvers, k).toEqual([ds]);
      expect(route([ds]).missingPositions, k).toEqual([]);
      for (const rp of [["direzione"], ["presidente"], ["direttore-generale"], [ds]]) expect(route(rp).status, `${k} ${rp}`).toBe("CONFERMATA");
      for (const rp of [["mister"], ["dirigente-annata"], ["segreteria"]]) expect(route(rp).status, `${k} ${rp}`).toBe("DA_CONFERMARE");
    }
  });

  it("on Dervio the UD-156 set is told now even while waiting, team staff after acceptance", () => {
    const r = routeLive({ topic: "gara", site: "DERVIO", teamKey: "pulcini", requesterPositions: ["mister"] });
    expect(r.status).toBe("DA_CONFERMARE");
    for (const p of DERVIO_ALWAYS) expect(notifyNow(r)).toContain(p);
    expect(notifyAfterConfirmation(r).sort()).toEqual(["dirigente-annata", "mister"]);
  });

  it("strings that are not registry positions degrade to da confermare (no role claimed from text)", () => {
    for (const rp of [["Presidente"], ["PRESIDENTE"], ["presidente "], ["direttore_generale"], ["DG"], ["admin"], ["direzione;presidente"], [""]]) {
      expect(requesterRank(rp), JSON.stringify(rp)).toBeNull();
      const r = routeLive({ topic: "gara", site: "COLICO", teamKey: "pulcini", requesterPositions: rp });
      expect(r.status, JSON.stringify(rp)).toBe("DA_CONFERMARE");
    }
  });
});

describe("sensitive topics", () => {
  it("health: Presidente and Consiglio Direttivo decide, infermeria and fisioterapista informed without health data", () => {
    const r = routeLive({ topic: "salute", site: "COLICO", teamKey: "u15" });
    expect(r.approvers).toEqual(["direzione", "presidente"]);
    expect(find(r, "responsabile-infermeria")!.duty).toBe("INFORM");
    expect(positions(r)).not.toContain("mister");
    expect(positions(r)).not.toContain("dirigente-annata");
    expect(find(r, "fisioterapista")!.duty).toBe("INFORM");
    expect(find(r, "fisioterapista")!.reasons.join(" ")).toMatch(/nessun dato di salute/);
    expect(r.missingPositions).toEqual([]);
    expect(r.contentLimits.join(" ")).toMatch(/salute/);
  });

  it("minors (organisational): Presidente and Consiglio Direttivo decide, no team staff, safeguarding stays separate", () => {
    const r = routeLive({ topic: "minori-organizzativo", site: "COLICO", teamKey: "pulcini" });
    expect(r.approvers).toEqual(["direzione", "presidente"]);
    expect(positions(r)).not.toContain("mister");
    // UD-161 D3: the safeguarding lead exists but is never told through this table.
    expect(positions(r)).not.toContain("responsabile-safeguarding");
    expect(r.missingPositions).toEqual([]);
    expect(r.contentLimits.join(" ")).toMatch(/canale Safeguarding/);
  });

  it("money topics forbid amounts, IBAN and codice fiscale in the notice", () => {
    for (const t of ["pagamenti", "iscrizioni", "sponsor"] as const)
      expect(routeLive({ topic: t, site: "COLICO" }).contentLimits.join(" "), t).toMatch(/IBAN/);
  });

  it("every topic forbids minors' names and copying the inbound message", () => {
    for (const t of CHI_FA_COSA_TOPICS) {
      const l = routeLive({ topic: t, site: "COLICO" }).contentLimits.join(" ");
      expect(l, t).toMatch(/minori/);
      expect(l, t).toMatch(/copiare/);
    }
  });
});

describe("emergency", () => {
  it("is immediate: everybody now, whoever asks, with 112 first", () => {
    const r = routeLive({ topic: "emergenza", site: "COLICO", teamKey: "u19", requesterPositions: ["mister"] });
    expect(r.status).toBe("IMMEDIATO");
    expect(notifyAfterConfirmation(r)).toEqual([]);
    expect(positions(r)).toEqual(
      expect.arrayContaining(["presidente", "direttore-generale", "responsabile-struttura-colico", "mister"]),
    );
    expect(r.contentLimits.join(" ")).toMatch(/112/);
  });

  it("emergenza at Dervio also tells the Dervio structure positions (Francesco 16/10/2026 11:58)", () => {
    const r = routeLive({ topic: "emergenza", site: "DERVIO", teamKey: "u19" });
    for (const p of DERVIO_EMERGENCY_STRUCTURE) {
      expect(positions(r), p).toContain(p);
      expect(find(r, p)!.reasons.join(" ")).toMatch(/Francesco 16\/10\/2026/);
    }
    expect(positions(r)).not.toContain("responsabile-campi");
    expect(positions(r)).not.toContain("responsabile-struttura-colico");
  });
});

describe("other topics", () => {
  it("pulmini: responsabile trasporti decides, drivers and team staff informed", () => {
    const r = routeLive({ topic: "pulmini", site: "COLICO", teamKey: "u16" });
    expect(r.approvers).toEqual(["responsabile-trasporti"]);
    expect(positions(r)).toEqual(expect.arrayContaining(["autista", "mister", "dirigente-annata"]));
  });

  it("allenamenti: coordinatore decides, group responsible informed", () => {
    const r = routeLive({ topic: "allenamenti", site: "COLICO", teamKey: "piccoli" });
    expect(r.approvers).toEqual(["coordinatore-attivita-sportiva"]);
    expect(find(r, "responsabile-attivita-base")!.duty).toBe("INFORM");
  });

  it("iscrizioni, pagamenti, comunicazioni, tornei, sponsor have their owner", () => {
    expect(routeLive({ topic: "iscrizioni", site: "COLICO" }).approvers).toEqual(["segreteria"]);
    expect(routeLive({ topic: "pagamenti", site: "COLICO" }).approvers).toEqual(["tesoreria"]);
    expect(routeLive({ topic: "comunicazioni", site: "COLICO" }).approvers).toEqual(["segreteria"]);
    expect(routeLive({ topic: "tornei", site: "COLICO" }).approvers).toEqual(["responsabile-tornei"]);
    expect(routeLive({ topic: "sponsor", site: "COLICO" }).approvers).toEqual(["direzione", "presidente"]);
  });

  it("board topics: only Presidente or Direzione confirm, the DG waits (Presidente decides too)", () => {
    for (const topic of ["sponsor", "minori-organizzativo", "salute", "impianti"] as const) {
      for (const rp of [["presidente"], ["direzione"]])
        expect(routeLive({ topic, site: "COLICO", requesterPositions: rp }).status, `${topic} ${rp}`).toBe("CONFERMATA");
      for (const rp of [["direttore-generale"], ["responsabile-infermeria"], ["responsabile-struttura-colico"]])
        expect(routeLive({ topic, site: "COLICO", requesterPositions: rp }).status, `${topic} ${rp}`).toBe("DA_CONFERMARE");
    }
  });

  it("recipients are ordered: deciders first, then preparers, then informed", () => {
    const r = routeLive({ topic: "gara", site: "DERVIO", teamKey: "2014" });
    const order = { DECIDE: 0, PREPARE: 1, INFORM: 2 } as const;
    const duties = r.recipients.map((x) => order[x.duty]);
    expect(duties).toEqual([...duties].sort((a, b) => a - b));
  });
});

describe("input validation", () => {
  it("rejects unknown topics and sites", () => {
    expect(chiFaCosaInputSchema.safeParse({ topic: "mercato", site: "COLICO" }).success).toBe(false);
    expect(chiFaCosaInputSchema.safeParse({ topic: "gara", site: "LECCO" }).success).toBe(false);
    expect(() => routeLive({ topic: "gara" as never, site: "MILANO" as never })).toThrow();
  });

  it("accepts the minimal input", () => {
    expect(chiFaCosaInputSchema.safeParse({ topic: "gara", site: null }).success).toBe(true);
  });
});

describe("r138 not live (UD-161, review R1): fail closed", () => {
  it("r138 positions are not routable and are reported as not yet active", () => {
    for (const p of R138_POSITIONS) expect(isRoutablePosition(p), p).toBe(false);
    const r = routeChiFaCosa({ topic: "impianti", site: "DERVIO" });
    for (const p of ["direttore-sportivo-agonistica", "direttore-sportivo-generale"]) {
      expect(positions(r)).not.toContain(p);
      expect(r.missingPositions.find((m) => m.position === p)?.reason).toMatch(/non ancora attivo/);
    }
    for (const p of DERVIO_ALWAYS.filter((x) => !R138_POSITIONS.includes(x))) expect(positions(r), p).toContain(p);
    const h = routeChiFaCosa({ topic: "salute", site: "COLICO" });
    expect(positions(h)).not.toContain("fisioterapista");
    expect(h.missingPositions.map((m) => m.position)).toEqual(["fisioterapista"]);
  });

  it("the default is not live, and only an explicit true turns r138 positions on", () => {
    expect(routeChiFaCosa({ topic: "gara", site: "COLICO", teamKey: "u15" }).approvers).toEqual([CONFIRMER_FALLBACK]);
    expect(routeChiFaCosa({ topic: "gara", site: "COLICO", teamKey: "u15", r138Live: true }).approvers).toEqual(["direttore-sportivo-agonistica"]);
  });
});

describe("D2: direttori sportivi rank above the coordinatore (Francesco 16/10/2026)", () => {
  it("ranks DS between DG and coordinatore", () => {
    for (const ds of ["direttore-sportivo-agonistica", "direttore-sportivo-generale"]) {
      expect(POSITION_RANK[ds]!).toBeLessThan(POSITION_RANK["coordinatore-attivita-sportiva"]!);
      expect(POSITION_RANK[ds]!).toBeGreaterThan(POSITION_RANK["direttore-generale"]!);
    }
  });

  it("a request of the coordinatore for U15 waits for the DS; the DS's own request is confirmed", () => {
    const route = (rp: string[]) => routeLive({ topic: "gara", site: "COLICO", teamKey: "u15", requesterPositions: rp });
    expect(route(["coordinatore-attivita-sportiva"]).status).toBe("DA_CONFERMARE");
    expect(route(["responsabile-attivita-base"]).status).toBe("DA_CONFERMARE");
    expect(route(["direttore-sportivo-agonistica"]).status).toBe("CONFERMATA");
    expect(route(["direttore-generale"]).status).toBe("CONFERMATA");
  });
});
