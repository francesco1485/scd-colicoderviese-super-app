import { describe, expect, it } from "vitest";

import snapshot from "@/data/calendario-snapshot-20261010.json";
import {
  REGISTRY_COLUMNS,
  bookingToProposal,
  bookingToRegistryRow,
  checkProposal,
  csvToProposals,
  decisionCells,
  directionBrief,
  normalizeStatus,
  parseCsv,
} from "./bookings-register";
import {
  homeMatches,
  validateBooking,
  type Booking,
  type SnapshotEvent,
} from "./rotation";

const REAL = homeMatches(snapshot.events as SnapshotEvent[]);
const base: Booking = {
  id: "abc",
  kind: "affitto",
  pitch: "C2",
  date: "2026-10-18",
  start: "18:00",
  duration: 90,
  format: "full",
  title: "ASD\tEsempio",
  rooms: ["SP3", "ARB"],
  entrance: "cancello principale",
  amount: "150",
};

describe("master row", () => {
  it("follows the master's column order, status PROPOSTA, requester position", () => {
    const cells = bookingToRegistryRow(
      base,
      "Responsabile attività di base",
    ).split("\t");
    expect(cells).toHaveLength(REGISTRY_COLUMNS.length);
    const row = Object.fromEntries(
      REGISTRY_COLUMNS.map((c, i) => [c, cells[i]]),
    );
    expect(row).toMatchObject({
      ID: "IPO-abc",
      Data: "18/10/2026",
      "Ora inizio": "18:00",
      "Ora fine": "19:30",
      Sede: "SED-COL",
      "ID spazio": "SPA-COL-C2",
      Zona: "Campo intero",
      Tipo: "Affitto a terzi",
      "Squadra o soggetto": "ASD Esempio",
      Formato: "Campo intero",
      Spogliatoi: "SPA-COL-SP3, SPA-COL-ARB",
      Ingresso: "cancello principale",
      Stato: "PROPOSTA",
      "Richiesto da": "Responsabile attività di base",
      "Approvato da": "",
      "Importo affitto": "150",
      "Avviso Comune": "Non serve",
    });
  });

  it("marks Dervio bookings as outside the season programme (no Comune deadline) and leaves the amount out of non-rentals", () => {
    const dv = bookingToRegistryRow({
      ...base,
      kind: "gara",
      amount: "",
      pitch: "DV",
      rooms: [],
      date: "2026-12-13",
      format: 7,
    }).split("\t");
    expect(dv[4]).toBe("SED-DER");
    expect(dv[5]).toBe("SPA-DER-C1");
    expect(dv[6]).toBe("Metà campo");
    expect(dv[15]).toBe("");
    expect(dv[17]).toBe(
      "Proposta, da confermare: fuori dal programma stagionale, decide la Direzione",
    );
  });

  it("validates entrance and amount", () => {
    expect(validateBooking(base)).toEqual([]);
    expect(
      validateBooking({ ...base, amount: "centocinquanta" }).join(),
    ).toMatch(/Importo/);
    expect(
      validateBooking({ ...base, kind: "gara", amount: "10" }).join(),
    ).toMatch(/solo per un affitto/);
    expect(
      validateBooking({ ...base, entrance: "chiamare 333 1234567" }).join(),
    ).toMatch(/Ingresso/);
  });
});

describe("scheda per la Direzione", () => {
  const ctx = {
    items: REAL,
    others: [],
    quadroRooms: [],
    buffer: 15,
    today: "2026-10-11",
    requestedBy: "Presidente",
  };

  it("summarises what, where, when, conflicts, rooms, entrance and rental", () => {
    const t = directionBrief(base, ctx);
    expect(t).toMatch(
      /Cosa: Affitto a terzi · ASD\tEsempio|Cosa: Affitto a terzi · ASD/,
    );
    expect(t).toMatch(
      /Dove: Colico campo 2 \(SPA-COL-C2, sintetico, 96 × 48 m\)/,
    );
    expect(t).toMatch(/Quando: domenica 18 ottobre 2026, 18:00–19:30/);
    expect(t).toMatch(/Conflitti sul campo: nessuno/);
    expect(t).toMatch(/Spogliatoi: SP3, arbitri/);
    expect(t).toMatch(/Ingresso: cancello principale/);
    expect(t).toMatch(/importo 150 €/);
    expect(t).toMatch(/Richiesto da: Presidente/);
  });

  it("reports a pitch conflict with the real calendar and the Dervio notice rules", () => {
    const clash: Booking = {
      ...base,
      kind: "gara",
      pitch: "C1",
      date: "2026-10-17",
      start: "15:00",
      format: 9,
      amount: "",
      rooms: [],
    };
    expect(directionBrief(clash, ctx)).toMatch(
      /Conflitti sul campo: SÌ.*Juniores U19 Élite 15:00/,
    );
    const dv: Booking = { ...clash, pitch: "DV", date: "2026-10-25" };
    const brief = directionBrief(dv, ctx);
    expect(brief).toMatch(/già informato con il programma stagionale/);
    expect(brief).toMatch(/avviso solo a FIGC \(LND\/SGS\) e squadra avversaria/);
    expect(brief).not.toMatch(/arbitr/i);
    expect(brief).toMatch(
      /Proposta, da confermare: fuori dal programma stagionale, decide la Direzione/,
    );
    expect(brief).not.toMatch(/GIÀ IN RITARDO|entro il/);
    expect(
      directionBrief(
        { ...base, entrance: "", rooms: [] },
        { ...ctx, requestedBy: "" },
      ),
    ).toMatch(/Ingresso: —[\s\S]*Richiesto da: —/);
  });
});

describe("CSV from the published sheet", () => {
  it("parses quotes, escaped quotes, commas, newlines in quotes, CRLF and empty cells", () => {
    const csv = '\uFEFFa,b,c\r\n"x, y","say ""hi""",\r\n,"multi\nline",z\n\n';
    expect(parseCsv(csv)).toEqual([
      ["a", "b", "c"],
      ["x, y", 'say "hi"', ""],
      ["", "multi\nline", "z"],
    ]);
    expect(parseCsv("")).toEqual([]);
    expect(parseCsv("only")).toEqual([["only"]]);
  });

  it("maps master rows to proposals by column name, tolerating unknown cells", () => {
    const csv = [
      REGISTRY_COLUMNS.join(","),
      'IPO-1,17/10/2026,15:00,16:15,SED-COL,SPA-COL-C1,Metà campo,Gara o amichevole,"Amichevole, U15",9 contro 9,SPA-COL-SP1,,in valutazione,Presidente,,,,Non serve,,Super App',
      "IPO-2,2026-12-13,09:00,13:00,SED-DER,SPA-DER-C1,Campo intero,Torneo o evento,Torneo,Campo intero,,,PROPOSTA,,,,,Entro il 13/11/2026,,",
      "IPO-3,31/02/2026,xx,,SED-COL,SPA-COL-ZZ,,Boh,,,,,CONFERMATA,,,,,,,",
      ",,,,,,,,,,,,,,,,,,,",
    ].join("\n");
    const ps = csvToProposals(csv);
    expect(ps.map((p) => p.id)).toEqual(["IPO-1", "IPO-2", "IPO-3"]);
    expect(ps[0]).toMatchObject({
      date: "2026-10-17",
      start: 900,
      end: 975,
      pitch: "C1",
      format: 9,
      kind: "gara",
      subject: "Amichevole, U15",
      status: "IN VALUTAZIONE",
      requestedBy: "Presidente",
    });
    expect(ps[1]).toMatchObject({
      date: "2026-12-13",
      pitch: "DV",
      format: "full",
      kind: "torneo",
      status: "PROPOSTA",
    });
    expect(ps[2]).toMatchObject({
      date: null,
      start: null,
      pitch: null,
      format: null,
      kind: null,
      status: "CONFERMATA",
    });
    expect(csvToProposals("foo,bar\n1,2")).toEqual([]);
  });

  it("recomputes conflicts against the snapshot; unknown when cells are unreadable", () => {
    const ps = csvToProposals(
      [
        REGISTRY_COLUMNS.join(","),
        "IPO-1,17/10/2026,15:00,16:15,SED-COL,SPA-COL-C1,,Gara,,9 contro 9,,,PROPOSTA,,,,,,,",
        "IPO-3,,,,,,,,,,,,PROPOSTA,,,,,,,",
      ].join("\n"),
    );
    const c = checkProposal(ps[0]!, REAL, 15);
    expect(c.checkable).toBe(true);
    expect(c.fits).toBe(false);
    expect(c.sharing.map((m) => m.group)).toContain("u19");
    expect(checkProposal(ps[1]!, REAL, 15)).toEqual({
      checkable: false,
      fits: null,
      sharing: [],
    });
  });

  it("normalises statuses and builds decision cells", () => {
    expect(normalizeStatus(" in_valutazione ")).toBe("IN VALUTAZIONE");
    expect(normalizeStatus("Respinta")).toBe("RESPINTA");
    expect(normalizeStatus("forse")).toBeNull();
    expect(decisionCells("CONFERMATA")).toEqual({
      stato: "CONFERMATA",
      note: "",
    });
    expect(decisionCells("RESPINTA", "campo\tgià occupato")).toEqual({
      stato: "RESPINTA",
      note: "Respinta: campo già occupato",
    });
    expect(decisionCells("RESPINTA").note).toMatch(/motivo da indicare/);
  });

  it("turns a local ipotesi into a proposal card", () => {
    expect(bookingToProposal(base, "Presidente")).toMatchObject({
      id: "IPO-abc",
      status: "PROPOSTA",
      source: "ipotesi",
      start: 1080,
      end: 1170,
      rooms: "SP3, ARB",
    });
  });
});
