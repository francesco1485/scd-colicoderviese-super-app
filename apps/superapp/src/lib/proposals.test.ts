import { describe, expect, it } from "vitest";

import {
  agoLabel,
  alreadyAligned,
  compareUrgency,
  filterQueue,
  needsNote,
  parseProposal,
  parseQueue,
  proposalError,
  queueHealth,
  type Proposal,
} from "./proposals";

const NOW = "2026-10-12T10:00:00+02:00";

function raw(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    machine: "M3",
    area: "tesoreria",
    kind: "RICEVUTA_PAGAMENTO",
    title: "Ricevuta bonifico quota",
    sensitivity: "NORMALE",
    sourceKind: "MAIL",
    status: "NEW",
    open: true,
    created_at: "2026-10-10T08:00:00Z",
    ...over,
  };
}

function p(over: Record<string, unknown> = {}): Proposal {
  const out = parseProposal(raw(over));
  if (!out) throw new Error("fixture");
  return out;
}

describe("parseProposal", () => {
  it("rejects rows without id or title", () => {
    expect(parseProposal(null)).toBeNull();
    expect(parseProposal(raw({ id: "" }))).toBeNull();
    expect(parseProposal(raw({ title: "  " }))).toBeNull();
  });

  it("maps fields and falls back on unknown enums", () => {
    const x = p({ kind: "BOH", status: "WHATEVER", sensitivity: "RISERVATO", confidence: "0.8", targetState: "ESCLUSO" });
    expect(x.kind).toBe("ALTRO");
    expect(x.status).toBe("NEW");
    expect(x.reserved).toBe(true);
    expect(x.confidence).toBe(0.8);
    expect(x.targetState).toBe("ESCLUSO");
    expect(x.mine).toBe(false);
  });

  it("parses a queue and drops invalid items", () => {
    const q = parseQueue({ canReadReserved: true, items: [raw(), { id: "x" }, 5] });
    expect(q?.canReadReserved).toBe(true);
    expect(q?.items).toHaveLength(1);
    expect(parseQueue("nope")).toBeNull();
    expect(parseQueue({})).toEqual({ canReadReserved: false, items: [] });
  });
});

describe("alreadyAligned", () => {
  it("is true only for withdrawals already excluded", () => {
    expect(alreadyAligned({ kind: "RITIRO", targetState: "ESCLUSO" })).toBe(true);
    expect(alreadyAligned({ kind: "RITIRO", targetState: "IN_RITARDO" })).toBe(false);
    expect(alreadyAligned({ kind: "RICEVUTA_PAGAMENTO", targetState: "ESCLUSO" })).toBe(false);
  });
});

describe("filterQueue and compareUrgency", () => {
  const items = [
    p({ id: "a", kind: "RITIRO", targetState: "ESCLUSO" }),
    p({ id: "b", kind: "RITIRO", targetState: "IN_RITARDO" }),
    p({ id: "c", kind: "RICEVUTA_PAGAMENTO", mine: true, due_at: "2026-10-15T00:00:00Z" }),
    p({ id: "d", kind: "FONDO", area: "direzione" }),
    p({ id: "e", status: "ACCEPTED", open: false, decidedAt: "2026-10-11T09:00:00Z" }),
    p({ id: "f", status: "SNOOZED", open: false }),
  ];

  it("filters by tab", () => {
    expect(filterQueue(items, "aperte").map((x) => x.id)).toEqual(["c", "b", "d", "a"]);
    expect(filterQueue(items, "mie").map((x) => x.id)).toEqual(["c"]);
    expect(filterQueue(items, "allineate").map((x) => x.id)).toEqual(["a"]);
    expect(filterQueue(items, "RITIRO").map((x) => x.id)).toEqual(["b", "a"]);
    expect(filterQueue(items, "chiuse").map((x) => x.id)).toEqual(["e"]);
    expect(filterQueue(items, "aperte", "direzione").map((x) => x.id)).toEqual(["d"]);
  });

  it("puts open before closed and newest decision first among closed", () => {
    const closedOld = p({ id: "o", open: false, status: "REJECTED", decidedAt: "2026-10-01T00:00:00Z" });
    const closedNew = p({ id: "n", open: false, status: "REJECTED", decidedAt: "2026-10-09T00:00:00Z" });
    const sorted = [closedOld, closedNew, p({ id: "x" })].sort(compareUrgency).map((x) => x.id);
    expect(sorted).toEqual(["x", "n", "o"]);
  });
});

describe("queueHealth", () => {
  it("counts the spie", () => {
    const h = queueHealth(
      [
        p({ due_at: "2026-10-01T00:00:00Z", mine: true }),
        p({ kind: "RITIRO", targetState: "ESCLUSO", targetRef: "pos-1" }),
        p({ targetRef: "pos-2" }),
        p({ open: false, status: "REJECTED", decidedAt: "2026-10-11T00:00:00Z" }),
        p({ open: false, status: "ACCEPTED", decidedAt: "2026-09-01T00:00:00Z" }),
      ],
      NOW,
    );
    expect(h).toEqual({ open: 3, overdue: 1, mine: 1, aligned: 1, unlinked: 1, decidedLast7: 1, rejectedLast7: 1 });
  });
});

describe("small helpers", () => {
  it("requires a note only for reject and needs_info", () => {
    expect(needsNote("reject")).toBe(true);
    expect(needsNote("needs_info")).toBe(true);
    expect(needsNote("accept")).toBe(false);
  });

  it("maps error codes to plain Italian", () => {
    expect(proposalError("forbidden")).toMatch(/permessi/);
    expect(proposalError("unknown")).toMatch(/Riprova/);
    expect(proposalError(null)).toMatch(/Riprova/);
  });

  it("labels elapsed time", () => {
    expect(agoLabel(null, NOW)).toBe("—");
    expect(agoLabel("2026-10-12T07:00:00+02:00", NOW)).toBe("oggi");
    expect(agoLabel("2026-10-11T08:00:00+02:00", NOW)).toBe("ieri");
    expect(agoLabel("2026-10-05T08:00:00+02:00", NOW)).toBe("7 giorni fa");
    expect(agoLabel("2026-08-01T08:00:00+02:00", NOW)).toBe("01/08/2026");
  });
});
