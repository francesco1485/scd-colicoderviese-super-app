import { describe, expect, it } from "vitest";

import { appCopy, audienceError, filterDocs, groupByArea, needsPublic, openHref, parseLibrary, upcoming, yourAreaDocs, type LibraryDoc } from "./documents";

const TODAY = "2026-10-12";

function doc(o: Partial<LibraryDoc> & { ref: string; title: string }): LibraryDoc {
  return { summary: null, area: "ALTRO", season: null, date: null, due: null, link: null, audiences: [], sensitivity: "INTERNO", ...o };
}

describe("parseLibrary", () => {
  it("keeps valid rows, known audiences and https links only", () => {
    const lib = parseLibrary({
      audiences: ["STAFF", "BOH", "GESTIONE"],
      canEdit: true,
      items: [
        { ref: "doc:a", title: "Codice Unico di Condotta SCD", audiences: ["FAMIGLIE", "X"], sensitivity: "PUBBLICO", link: "https://drive.google.com/x", due: "2026-11-30T00:00:00" },
        { ref: "doc:b", title: "Piano", link: "javascript:alert(1)", sensitivity: "WHAT" },
        { ref: "", title: "no ref" },
      ],
    });
    expect(lib?.audiences).toEqual(["STAFF", "GESTIONE"]);
    expect(lib?.canEdit).toBe(true);
    expect(lib?.items).toHaveLength(2);
    expect(lib?.items[0]?.audiences).toEqual(["FAMIGLIE"]);
    expect(lib?.items[0]?.due).toBe("2026-11-30");
    expect(lib?.items[1]?.link).toBeNull();
    expect(lib?.items[1]?.sensitivity).toBe("INTERNO");
    expect(parseLibrary(null)).toBeNull();
  });
});

describe("app copies of public documents", () => {
  it("opens the app PDF for public documents and the club link otherwise", () => {
    const pub = doc({ ref: "doc:c", title: "Codice Unico di Condotta SCD", sensitivity: "PUBBLICO", link: "https://drive.google.com/c" });
    expect(appCopy(pub)?.id).toBe("codice-condotta");
    expect(openHref(pub)).toMatch(/^\/media\/documenti\/codice-unico-condotta/);
    const priv = doc({ ref: "doc:p", title: "Informativa Privacy SCD", sensitivity: "INTERNO", link: "https://drive.google.com/p" });
    expect(appCopy(priv)).toBeNull();
    expect(openHref(priv)).toBe("https://drive.google.com/p");
    expect(openHref(doc({ ref: "doc:z", title: "Senza link" }))).toBeNull();
  });
});

describe("grouping, filters and deadlines", () => {
  const items = [
    doc({ ref: "1", title: "Planimetria evacuazione Tribune", area: "IMPIANTI_COMUNI", audiences: ["STAFF", "GESTIONE"] }),
    doc({ ref: "2", title: "Codice Unico di Condotta SCD", area: "ORGANIZZAZIONE_ORGANIGRAMMA", audiences: ["FAMIGLIE", "STAFF"], sensitivity: "PUBBLICO", due: "2026-11-30" }),
    doc({ ref: "3", title: "Allegato 9 Tutela Minori", area: "FEDERAZIONE", audiences: ["DIRIGENTI"], due: "2026-11-15" }),
    doc({ ref: "4", title: "Offerta vecchia", area: "IMPIANTI_COMUNI", due: "2025-01-27" }),
  ];

  it("puts club rules first and labels areas in plain words", () => {
    const g = groupByArea(items);
    expect(g[0]?.area).toBe("ORGANIZZAZIONE_ORGANIGRAMMA");
    expect(g.map((x) => x.label)).toContain("Impianti e sicurezza");
    expect(g.find((x) => x.area === "IMPIANTI_COMUNI")?.items.map((d) => d.ref)).toEqual(["4", "1"]);
  });

  it("filters by audience, by upcoming deadline and by text (accent-insensitive)", () => {
    expect(filterDocs(items, "STAFF", "", TODAY).map((d) => d.ref)).toEqual(["1", "2"]);
    expect(filterDocs(items, "scadenze", "", TODAY).map((d) => d.ref)).toEqual(["2", "3"]);
    expect(filterDocs(items, "tutti", "tutèla", TODAY).map((d) => d.ref)).toEqual(["3"]);
    expect(upcoming(items, TODAY).map((d) => d.ref)).toEqual(["3", "2"]);
  });

  it("asks to make a document public before families or athletes see it", () => {
    expect(needsPublic(["FAMIGLIE"], { sensitivity: "INTERNO" })).toBe(true);
    expect(needsPublic(["STAFF"], { sensitivity: "INTERNO" })).toBe(false);
    expect(needsPublic(["ATLETI"], { sensitivity: "PUBBLICO" })).toBe(false);
    expect(audienceError("needs_public")).toMatch(/pubblico/);
    expect(audienceError("x")).toMatch(/Riprova/);
  });
});

describe("Documenti della tua area (r81 under «I miei documenti»)", () => {
  it("lists the audience's documents sorted by title with where they open, nothing for no audience", () => {
    const lib = parseLibrary({
      audiences: ["STAFF"],
      canEdit: false,
      items: [
        { ref: "b", title: "Piano allenamenti", area: "ORGANIZZAZIONE_ORGANIGRAMMA", link: "https://drive.google.com/x", audiences: ["STAFF"], sensitivity: "INTERNO" },
        { ref: "a", title: "Codice unico di condotta", area: "ORGANIZZAZIONE_ORGANIGRAMMA", link: null, audiences: ["STAFF"], sensitivity: "PUBBLICO" },
        { ref: "c", title: "Verbale interno", area: "ORGANIZZAZIONE_ORGANIGRAMMA", link: "http://insecure", audiences: ["STAFF"], sensitivity: "INTERNO" },
      ],
    });
    const out = yourAreaDocs(lib);
    expect(out.map((d) => d.ref)).toEqual(["a", "b", "c"]);
    expect(out[0]!.href).toMatch(/\.pdf$/);
    expect(out[1]!.href).toBe("https://drive.google.com/x");
    expect(out[2]!.href).toBeNull();
    expect(yourAreaDocs(null)).toEqual([]);
    expect(yourAreaDocs({ audiences: [], canEdit: false, items: lib!.items })).toEqual([]);
  });
});
