import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  OCCASIONS,
  areaRequestError,
  orderRequestMessage,
  parseAreaPolls,
  parseBoardAreaRequests,
  parseMyAreaRequests,
  validateOrderRequest,
  type OrderRequestInput,
} from "./area-requests";

const TODAY = "2026-10-14";
const OK: OrderRequestInput = { what: "Torta, pizzette e bibite per la merenda", when: "2026-10-24", time: "16:30", people: 25, contact: "app", occasion: "Festa di squadra" };

describe("Club House order request validation (UD-114)", () => {
  it("accepts a complete request and normalises it", () => {
    const v = validateOrderRequest({ ...OK, what: "  Torta,   pizzette  e bibite per la merenda ", people: "25" }, TODAY);
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.value).toEqual({ what: "Torta, pizzette e bibite per la merenda", when: "2026-10-24", time: "16:30", people: 25, contact: "app", occasion: "Festa di squadra" });
  });

  it("makes the time optional", () => {
    const v = validateOrderRequest({ ...OK, time: "" }, TODAY);
    expect(v.ok && v.value.time).toBeNull();
  });

  it("refuses missing or too long text, past or far days, bad times, people out of range, unknown contact or occasion", () => {
    const bad = (over: Partial<OrderRequestInput>) => {
      const v = validateOrderRequest({ ...OK, ...over }, TODAY);
      return v.ok ? null : v.errors;
    };
    expect(bad({ what: "ab" })?.what).toBeTruthy();
    expect(bad({ what: "x".repeat(301) })?.what).toBeTruthy();
    expect(bad({ when: "2026-10-13" })?.when).toMatch(/passato/);
    expect(bad({ when: "2027-10-15" })?.when).toMatch(/anno/);
    expect(bad({ when: "2026-02-30" })?.when).toBeTruthy();
    expect(bad({ time: "25:00" })?.time).toBeTruthy();
    expect(bad({ people: 0 })?.people).toBeTruthy();
    expect(bad({ people: 501 })?.people).toBeTruthy();
    expect(bad({ people: "12.5" })?.people).toBeTruthy();
    expect(bad({ contact: "whatsapp" })?.contact).toBeTruthy();
    expect(bad({ occasion: "Matrimonio" })?.occasion).toBeTruthy();
    expect(validateOrderRequest({ ...OK, when: TODAY }, TODAY).ok).toBe(true);
  });

  it("never accepts health data or payment data in the text", () => {
    expect(validateOrderRequest({ ...OK, what: "Torta senza glutine, un bimbo è celiaco" }, TODAY).ok).toBe(false);
    expect(validateOrderRequest({ ...OK, what: "Attenzione allergia alle noci" }, TODAY).ok).toBe(false);
    expect(validateOrderRequest({ ...OK, what: "Pago con carta 4111 1111 1111 1111" }, TODAY).ok).toBe(false);
  });

  it("prepares a message for the secretariat that states confirmation and payment at the till", () => {
    const v = validateOrderRequest(OK, TODAY);
    if (!v.ok) throw new Error("expected ok");
    const m = orderRequestMessage(v.value);
    expect(m).toMatch(/da confermare/);
    expect(m).toMatch(/24\/10\/2026 ore 16:30/);
    expect(m).toMatch(/Persone: 25/);
    expect(m).toMatch(/Pagamento alla cassa del club dopo la conferma/);
  });

  it("matches the server-side validation of the staged migration r103", () => {
    const sql = readFileSync(resolve(__dirname, "../../../../supabase/migrations/20261014_r103_area_requests.sql"), "utf8");
    for (const o of OCCASIONS) expect(sql).toContain(`'${o}'`);
    expect(sql).toContain("v_people > 500");
    expect(sql).toMatch(/allerg\|intolleran\|celiac/);
    expect(sql).toMatch(/enable row level security/);
    expect(sql).toMatch(/revoke all on table public\.scd_area_requests from anon, authenticated/);
    expect(sql).toMatch(/STAGED, DO NOT APPLY/);
  });
});

describe("database payload parsing", () => {
  it("keeps valid rows only", () => {
    const mine = parseMyAreaRequests([
      { id: "a", createdAt: "2026-10-14T10:00:00Z", status: "NUOVA", payload: { what: "Torta", when: "2026-10-24", people: 20, occasion: "Compleanno" } },
      { id: "b", status: "PAGATA", payload: {} },
      null,
    ]);
    expect(mine).toHaveLength(1);
    expect(mine[0]).toMatchObject({ id: "a", status: "NUOVA", people: 20, occasion: "Compleanno", time: null, answer: null });
    expect(parseMyAreaRequests("nope")).toEqual([]);
    const board = parseBoardAreaRequests([{ id: "a", status: "IN_CARICO", requester: "Mario R.", payload: { contact: "email", when: "2026-10-24", people: 3 } }]);
    expect(board[0]).toMatchObject({ requester: "Mario R.", contact: "email" });
  });

  it("reads polls with at least two options and drops a vote for an unknown option", () => {
    const polls = parseAreaPolls([
      { id: "p1", question: "Piatto della festa?", options: [{ key: "a", label: "Lasagne", votes: 3 }, { key: "b", label: "Risotto", votes: null }], myVote: "a" },
      { id: "p2", question: "Solo uno", options: [{ key: "a", label: "Uno" }] },
      { id: "p3", question: "Voto strano", options: [{ key: "a", label: "A" }, { key: "b", label: "B" }], myVote: "z" },
    ]);
    expect(polls.map((p) => p.id)).toEqual(["p1", "p3"]);
    expect(polls[0]!.options[0]!.votes).toBe(3);
    expect(polls[0]!.options[1]!.votes).toBeNull();
    expect(polls[1]!.myVote).toBeNull();
  });

  it("explains database codes in plain Italian", () => {
    expect(areaRequestError("forbidden")).toMatch(/adulti o l'account della famiglia/);
    expect(areaRequestError(undefined)).toMatch(/riprova/);
  });
});
