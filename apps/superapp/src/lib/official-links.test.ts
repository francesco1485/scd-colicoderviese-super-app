import { describe, expect, it } from "vitest";

import { CLUB_PROFILE, hallTeams, pitchFacts } from "./club-profile";
import { OFFICIAL_RESULT_LINKS, PUBLICATION_RULE, RESULT_LINKS, SECONDARY_RESULT_LINKS, VERIFIED_CHAMPIONSHIPS, resultLinkFor } from "./official-links";
import { loadCalendar } from "./public-snapshots";

describe("official result links", () => {
  it("uses https only and labels every link official or secondary", () => {
    expect(RESULT_LINKS.length).toBeGreaterThan(0);
    for (const l of RESULT_LINKS) {
      expect(new URL(l.url).protocol, l.id).toBe("https:");
      expect(["official", "secondary"], l.id).toContain(l.authority);
      expect(l.label.trim(), l.id).not.toBe("");
    }
    expect(new Set(RESULT_LINKS.map((l) => l.id)).size).toBe(RESULT_LINKS.length);
  });

  it("keeps federation sources official and Tuttocampo secondary", () => {
    for (const l of OFFICIAL_RESULT_LINKS) {
      expect(new URL(l.url).hostname, l.id).toMatch(/(^|\.)lnd\.it$|(^|\.)crlombardia\.it$|^apps\.apple\.com$/);
    }
    expect(SECONDARY_RESULT_LINKS.map((l) => new URL(l.url).hostname)).toEqual(["www.tuttocampo.it"]);
  });

  it("links the four verified championships to their gare.lnd.it group", () => {
    expect(resultLinkFor("prima")?.url).toBe("https://gare.lnd.it/competizione/lombardia?campionato=PR&girone=D");
    expect(resultLinkFor("u19")?.url).toBe("https://gare.lnd.it/competizione/lombardia?campionato=RI&girone=C");
    expect(resultLinkFor("u16")?.url).toBe("https://gare.lnd.it/competizione/lombardia?campionato=Y6&girone=A");
    expect(resultLinkFor("u15")?.url).toBe("https://gare.lnd.it/competizione/lombardia?campionato=GS&girone=A");
    // Attività di base: no standings link, ever (SGS).
    for (const g of ["pulcini", "primicalci", "piccoli", "esordienti", "2014", "2015"]) expect(resultLinkFor(g), g).toBeNull();
    expect(resultLinkFor(undefined)).toBeNull();
    expect(VERIFIED_CHAMPIONSHIPS["prima"]).toEqual({ name: "Promozione", group: "Girone D" });
  });

  it("states the UD-181 rule: only official LND data, with source and link", () => {
    expect(PUBLICATION_RULE).toBe("Pubblichiamo solo i dati ufficiali LND, con fonte e link.");
  });
});

describe("club profile", () => {
  it("lists active teams from the calendar groups, without U18 or catch-all buckets", () => {
    const teams = hallTeams(loadCalendar().groups);
    const ids = teams.map((t) => t.id);
    expect(ids[0]).toBe("prima");
    expect(ids[1]).toBe("u19");
    expect(ids).not.toContain("other");
    expect(ids).not.toContain("esordienti");
    expect(teams.some((t) => /U18|under\s?18/i.test(t.label))).toBe(false);
    // Championship only where verified; others carry the category only.
    expect(teams.filter((t) => t.championship).map((t) => t.id).sort()).toEqual(["prima", "u15", "u16", "u19"]);
    // A team without matches never links to an empty calendar filter.
    for (const t of teams) expect(t.annata === null, t.id).toBe(t.matches === 0);
  });

  it("drops a withdrawn U18 group if the master still lists it", () => {
    const teams = hallTeams([
      { id: "u18", label: "U18 Regionale", color: "#000000", logo: null, years: [], count: 0 },
      { id: "prima", label: "Prima Squadra", color: "#000000", logo: null, years: [], count: 3 },
    ]);
    expect(teams.map((t) => t.id)).toEqual(["prima"]);
  });

  it("takes pitch facts from the facilities master only", () => {
    expect(pitchFacts().map((p) => `${p.site} ${p.name} ${p.surface} ${p.size}`)).toEqual([
      "Colico Campo 1 Sintetico 100 x 60 m",
      "Colico Campo 2 Sintetico 96 x 48 m",
      "Dervio Campo Dervio Erba 96 x 48 m",
    ]);
  });

  it("carries the official channels and no founding year", () => {
    expect(CLUB_PROFILE.contacts.email).toBe("sportclubcolico@gmail.com");
    expect(CLUB_PROFILE.contacts.pec.toLowerCase()).toBe("calciocolicoderviese@pec.it");
    expect(CLUB_PROFILE.figcMatricola).toBe("26020");
    expect(JSON.stringify(CLUB_PROFILE)).not.toMatch(/fondat|19\d\d|20[01]\d/i);
  });
});
