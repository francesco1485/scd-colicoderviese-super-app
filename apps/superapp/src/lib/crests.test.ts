import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CREST_REGISTRY,
  crestEntryFor,
  crestEntryForFixture,
  crestFor,
  normalizeOpponentName,
  opponentFromTitle,
  opponentInitials,
  opponentLabel,
  opponentSlug,
} from "./crests";

const ROOT = resolve(__dirname, "../..");

describe("normalizeOpponentName / opponentSlug", () => {
  it("strips squad markers, even when glued to the name", () => {
    expect(opponentSlug("VERCURAGO SQ.B")).toBe("vercurago");
    expect(opponentSlug("ACADEMY CASATESE MERASQ.B")).toBe(
      "academy-casatese-mera",
    );
    expect(opponentSlug("CASATESE MERATE A.S.DSQ.B")).toBe("casatese-merate");
    expect(opponentSlug("SAN GIORGIO SQ.B")).toBe("san-giorgio");
  });
  it("strips legal suffixes", () => {
    expect(opponentSlug("LESMO SSD ARL")).toBe("lesmo");
    expect(opponentSlug("REAL MILANO SSD A RL")).toBe("real-milano");
    expect(opponentSlug("LISSONE CALCIO SSDARL")).toBe("lissone-calcio");
    expect(opponentSlug("GSO BALLABIO - ASD")).toBe("gso-ballabio");
    expect(opponentSlug("CISANESE A.S.D.")).toBe("cisanese");
    expect(opponentSlug("BELLAGINA A.D.")).toBe("bellagina");
    expect(opponentSlug("POL. MANDELLO DEL LARIO")).toBe("mandello-del-lario");
    expect(opponentSlug("DUBINO ASD")).toBe("dubino");
  });
  it("keeps club words and numbers, removes accents and punctuation", () => {
    expect(normalizeOpponentName("Castello Città di Cantù")).toBe(
      "CASTELLO CITTA DI CANTU",
    );
    expect(opponentSlug("C.O.B. 91")).toBe("c-o-b-91");
    expect(opponentSlug("MEDA 1913")).toBe("meda-1913");
    expect(opponentSlug("")).toBe("");
  });
});

describe("opponentInitials", () => {
  it("uses one letter per main word, max three", () => {
    expect(opponentInitials("ALTA BRIANZA TAVERNERIO")).toBe("ABT");
    expect(opponentInitials("NUOVA SONDRIO CALCIO")).toBe("NSC");
    expect(opponentInitials("AURORA PRO PATRIA 1919")).toBe("APP");
  });
  it("skips articles and prepositions", () => {
    expect(opponentInitials("CASTELLO CITTA DI CANTU")).toBe("CC");
    expect(opponentInitials("LA DOMINANTE")).toBe("DO");
    expect(opponentInitials("POL. MANDELLO DEL LARIO")).toBe("ML");
  });
  it("uses two letters for a single word and keeps short acronyms", () => {
    expect(opponentInitials("VERCURAGO SQ.B")).toBe("VE");
    expect(opponentInitials("BIASSONO")).toBe("BI");
    expect(opponentInitials("C.O.B. 91")).toBe("COB");
    expect(opponentInitials("")).toBe("?");
  });
});

describe("opponentLabel", () => {
  it("prefers the registry display name", () => {
    expect(opponentLabel("CASATESE MERATE A.S.DSQ.B")).toBe("Casatese Merate");
    expect(opponentLabel("VERCURAGO SQ.B")).toBe("Vercurago");
  });
  it("title-cases unknown names and keeps acronyms", () => {
    expect(opponentLabel("2 ° MEMORIAL MARINA BRIGATTI")).toBe(
      "2 Memorial Marina Brigatti",
    );
    expect(opponentLabel("")).toBe("Avversario da definire");
  });
});

describe("crestFor", () => {
  it("returns a file only for VERIFIED_FILE entries", () => {
    const olg = crestFor("OLGINATESE SQ.B");
    expect(olg.src).toBe("/media/crests/olginatese.webp");
    expect(olg.label).toBe("Olginatese");
    const unknown = crestFor("SQUADRA INESISTENTE");
    expect(unknown.src).toBeNull();
    expect(unknown.initials).toBe("SI");
    expect(unknown.label).toBe("Squadra Inesistente");
  });
  it("never returns a file for blocked or not-found entries", () => {
    for (const e of CREST_REGISTRY.filter(
      (x) => x.status !== "VERIFIED_FILE",
    )) {
      expect(e.file, e.slug).toBeNull();
      expect(crestFor(e.aliases[0] ?? e.displayName).src, e.slug).toBeNull();
    }
  });
  it("resolves every alias of the registry", () => {
    for (const e of CREST_REGISTRY)
      for (const a of e.aliases) expect(crestEntryFor(a)?.slug, a).toBe(e.slug);
  });
});

describe("second catalogue batch (2026-10-13)", () => {
  it("resolves new aliases to their real crest files", () => {
    expect(crestFor("PONTELAMBRESE A.S.D.").src).toBe("/media/crests/pontelambrese.webp");
    expect(crestFor("DI.PO A.S.D.").src).toBe("/media/crests/di-po.webp");
    expect(crestFor("VALMADRERA C.G. POL.").src).toBe("/media/crests/valmadrera-cg.webp");
    expect(crestFor("LESMO SSD ARL").src).toBe("/media/crests/lesmo.webp");
    expect(crestFor("PENTA PIATEDA").src).toBe("/media/crests/penta-piateda.webp");
  });
  it("keeps MISSING clubs on the neutral shield", () => {
    const v = crestEntryFor("VERCURAGO SQ.B");
    expect(v?.status).toBe("MISSING");
    expect(crestFor("VERCURAGO SQ.B").src).toBeNull();
  });
  it("ties every crest to the official fixtures it appears in", () => {
    const raw = JSON.parse(
      readFileSync(resolve(ROOT, "src/data/calendario-snapshot-20261010.json"), "utf8"),
    ) as { events: { id: string; opponent?: string }[] };
    const clubFixtures = raw.events.filter((e) => e.opponent && !/MEMORIAL/i.test(e.opponent));
    for (const ev of clubFixtures) {
      expect(crestEntryForFixture(ev.id)?.slug, ev.id).toBe(crestEntryFor(ev.opponent!)?.slug);
    }
    expect(crestEntryForFixture("EVT-PRIMA-12A-BIASSONO-CASA")?.file).toBe("/media/crests/biassono.webp");
  });
  it("records tuttocampo references only on tuttocampo.it", () => {
    for (const e of CREST_REGISTRY)
      if (e.tuttocampoUrl) expect(e.tuttocampoUrl, e.slug).toMatch(/^https:\/\/(www\.)?tuttocampo\.it\//);
    expect(CREST_REGISTRY.filter((e) => e.tuttocampoUrl).length).toBeGreaterThan(50);
  });
});

describe("third catalogue batch (2026-10-15)", () => {
  it("resolves the new official-site crests", () => {
    expect(crestFor("LISSONE CALCIO SSDARL").src).toBe("/media/crests/lissone-calcio.webp");
    expect(crestFor("LA DOMINANTE").src).toBe("/media/crests/la-dominante.webp");
    expect(crestFor("G.S.O. MISSAGLIA A.S.D.").src).toBe("/media/crests/gso-missaglia.webp");
    expect(crestFor("CINISELLO").src).toBe("/media/crests/cinisello.webp");
  });
  it("gives every Promozione girone D 2026/27 club a real crest", () => {
    const gironeD = [
      "A. CASATI CALCIO ARCORE",
      "ALTA BRIANZA TAVERNERIO",
      "ARDITA CITTADELLA 1934",
      "ARS ROVAGNATE",
      "BIASSONO",
      "C.O.B. 91",
      "CANTU SAN PAOLO A.S.D.",
      "COSTAMASNAGA",
      "DI.PO A.S.D.",
      "LESMO SSD ARL",
      "LISSONE CALCIO SSDARL",
      "MARIANO CALCIO",
      "OLYMPIC MORBEGNO",
      "PONTELAMBRESE A.S.D.",
      "VIBE RONCHESE",
    ];
    for (const club of gironeD) expect(crestFor(club).src, club).toMatch(/^\/media\/crests\/[a-z0-9-]+\.webp$/);
  });
  it("never maps the ambiguous 'SAN GIORGIO' (Molteno) to another club's crest", () => {
    expect(crestEntryFor("SAN GIORGIO SQ.B")?.status).toBe("MISSING");
    expect(crestFor("SAN GIORGIO").src).toBeNull();
  });
});

describe("registry integrity", () => {
  it("every referenced file exists and no two entries share a slug", () => {
    const slugs = new Set<string>();
    for (const e of CREST_REGISTRY) {
      expect(slugs.has(e.slug), e.slug).toBe(false);
      slugs.add(e.slug);
      if (e.status === "VERIFIED_FILE") {
        expect(e.file, e.slug).toMatch(/^\/media\/crests\/[a-z0-9-]+\.webp$/);
        expect(
          existsSync(resolve(ROOT, "public", e.file!.slice(1))),
          e.file!,
        ).toBe(true);
        expect(e.sourceUrl, e.slug).toMatch(/^https:\/\//);
        expect(e.verifiedAt, e.slug).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
      expect(e.licenceNote).toBe(
        "club trademark, used nominatively in fixture lists",
      );
    }
  });
  it("covers every opponent of the public calendar snapshot (verified or explicitly not found)", () => {
    const raw = JSON.parse(
      readFileSync(
        resolve(ROOT, "src/data/calendario-snapshot-20261010.json"),
        "utf8",
      ),
    ) as {
      events: { opponent?: string }[];
    };
    const names = [
      ...new Set(raw.events.map((e) => e.opponent ?? "").filter(Boolean)),
    ];
    const unresolved = names.filter(
      (n) => !/MEMORIAL/i.test(n) && !crestEntryFor(n),
    );
    expect(unresolved).toEqual([]);
  });
});

describe("opponentFromTitle", () => {
  it("picks the side that is not SCD", () => {
    expect(opponentFromTitle("SCD – OLGINATESE")).toBe("OLGINATESE");
    expect(opponentFromTitle("MEDA 1913 – SCD")).toBe("MEDA 1913");
    expect(opponentFromTitle("Festa del club")).toBe("");
  });
});
