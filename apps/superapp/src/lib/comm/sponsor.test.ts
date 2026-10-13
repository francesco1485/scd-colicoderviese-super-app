import { describe, expect, it } from "vitest";

import { filterThreads, type ThreadSummary } from "./rules";
import { isSponsorThread, normalizeCompany, parsePostaSearch, sponsorComposerSeed, sponsorContactsFor } from "./sponsor";

const contacts = [
  { id: "c1", label: "Marco Pedroncelli", email: "marco@officinepedroncelli.it", kind: "SPONSOR", orgName: "Officine Pedroncelli S.r.l." },
  { id: "c2", label: "Amministrazione", email: "amministrazione@officinepedroncelli.it", kind: "SPONSOR", orgName: "Officine Pedroncelli" },
  { id: "c3", label: "Noratech", email: "info@noratech.example", kind: "SPONSOR", orgName: null },
  { id: "c4", label: "Ferramenta ATL", email: "ordini@atl.example", kind: "SUPPLIER", orgName: "ATL" },
];

describe("sponsor composer prefill", () => {
  it("'Scrivi a tutti i partner' prefills all linked sponsors, written by the Direzione", () => {
    const s = sponsorComposerSeed({ contacts, offices: ["SEGRETERIA", "DIREZIONE"], sponsorsLinked: 3 });
    expect(s).toEqual({ office: "DIREZIONE", audience: { kind: "SPONSORS", label: "Tutti gli sponsor e partner" }, note: null, sponsorName: null });
    expect(sponsorComposerSeed({ contacts: [], offices: ["SEGRETERIA"], sponsorsLinked: 0 })).toMatchObject({ office: "SEGRETERIA", note: expect.stringContaining("Nessun indirizzo sponsor") });
  });

  it("'Scrivi allo sponsor' prefills the sponsor's contact, ignoring case, accents and legal form", () => {
    const one = sponsorComposerSeed({ name: "NORATECH", contacts, offices: ["DIREZIONE"] });
    expect(one.audience).toEqual({ kind: "CONTACT", contactId: "c3", label: "Noratech" });
    expect(one.note).toBeNull();
    const many = sponsorComposerSeed({ name: "Officine Pedroncelli", contacts, offices: ["DIREZIONE"] });
    expect(many.audience).toMatchObject({ kind: "CONTACT", contactId: "c1" });
    expect(many.note).toContain("2 indirizzi");
  });

  it("never takes an address of another kind and offers to link one when the sponsor has none", () => {
    const s = sponsorComposerSeed({ name: "ATL", contacts, offices: ["DIREZIONE"] });
    expect(s.audience).toBeNull();
    expect(s.sponsorName).toBe("ATL");
    expect(s.note).toContain("non c'è ancora un indirizzo");
    expect(sponsorContactsFor("A", contacts)).toEqual([]);
    expect(normalizeCompany("Coperture Rasero S.n.c.")).toBe("coperturerasero");
  });

  it("reads only the expected search params", () => {
    expect(parsePostaSearch({ scrivi: "sponsor", nome: "  EdilMelos\n" })).toEqual({ scrivi: "sponsor", nome: "EdilMelos" });
    expect(parsePostaSearch({ scrivi: "tutti", nome: 3 })).toEqual({});
  });
});

describe("SPONSOR tag in the Posta del club", () => {
  const t = (over: Partial<ThreadSummary>): ThreadSummary => ({
    id: "t", channel: "EMAIL", subject: "s", confidentiality: "ORDINARIO", office: "DIREZIONE", counterpartKind: "EXTERNAL", counterpartLabel: null,
    status: "APERTO", unread: false, lastMessageAt: "", contactId: null, messages: 1, drafts: 0, queued: 0, last: null, ...over,
  });
  it("tags threads with a sponsor contact or written to all sponsors, and filters them", () => {
    const threads = [t({ id: "a", counterpartKind: "SPONSOR" }), t({ id: "b", counterpartKind: "AUDIENCE", counterpartLabel: "Sponsor collegati" }), t({ id: "c", counterpartKind: "SUPPLIER" })];
    expect(threads.map(isSponsorThread)).toEqual([true, true, false]);
    expect(filterThreads(threads, "sponsor", "TUTTI", "").map((x) => x.id)).toEqual(["a", "b"]);
  });
});
