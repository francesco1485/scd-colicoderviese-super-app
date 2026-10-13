import { describe, expect, it } from "vitest";

import { CALLUP_PUSH_TEXT, FAMILY_CALLUP_COPY, MISTER_CALLUP_COPY, MY_RESPONSE_LABEL, RESPONSE_LABEL, asOutcome, asResponse, callupsToWithdraw, matchTitle, meetingAtLiteral, outcomeCounts, respondedMessage, responseCounts, responseSummary, romeDay, romeTime, sendButtonLabel, validateCallupInput } from "./callups";

describe("callups", () => {
  it("builds the title from SCD's side", () => {
    expect(matchTitle("ARS ROVAGNATE", "FUORI")).toEqual({ title: "ARS ROVAGNATE - ColicoDerviese", home: "ARS ROVAGNATE", away: "ColicoDerviese" });
    expect(matchTitle("", "CASA").title).toBe("ColicoDerviese - Avversario da definire");
  });

  it("maps unknown database values to safe states", () => {
    expect(asResponse("CONFIRMED")).toBe("CONFIRMED");
    expect(asResponse("anything")).toBe("PENDING");
    expect(asOutcome("CERTIFICATE")).toBe("CERTIFICATE");
    expect(asOutcome("boom")).toBe("ERROR");
  });

  it("counts answers and outcomes", () => {
    expect(responseCounts([{ response: "CONFIRMED" }, { response: "DECLINED" }, { response: "PENDING" }, { response: "CONFIRMED" }])).toEqual({ total: 4, confirmed: 2, declined: 1, pending: 1 });
    expect(outcomeCounts([{ outcome: "SENT" }, { outcome: "SENT" }, { outcome: "CERTIFICATE" }])).toMatchObject({ SENT: 2, CERTIFICATE: 1, REGISTRATION: 0 });
  });

  it("validates the call-up form", () => {
    const ok = { date: "2026-10-18", meetingTime: "13:45", meetingPlace: "Campo di Colico", kitNote: "", athleteIds: ["a"] };
    expect(validateCallupInput(ok)).toEqual([]);
    expect(validateCallupInput({ ...ok, athleteIds: [] })).toContain("Scegli almeno un ragazzo.");
    expect(validateCallupInput({ ...ok, meetingTime: "25:00" })).toHaveLength(1);
    expect(validateCallupInput({ ...ok, athleteIds: Array.from({ length: 41 }, (_, i) => String(i)) })).toContain("Al massimo 40 convocati per gara.");
  });

  it("writes the meeting time in Rome time for the database", () => {
    expect(meetingAtLiteral("2026-10-18", "13:45")).toBe("2026-10-18 13:45:00 Europe/Rome");
    expect(meetingAtLiteral("2026-10-18", "")).toBeNull();
  });

  it("formats times in Rome", () => {
    expect(romeTime("2026-10-18T11:45:00Z")).toBe("13:45");
    expect(romeTime(null)).toBe("");
    expect(romeDay("2026-10-18T11:45:00Z")).toBe("domenica 18 ottobre");
  });
});

describe("withdrawing call-ups (r68)", () => {
  it("withdraws only call-ups whose athlete was unticked", () => {
    const sent = [{ callupId: "c1", athleteId: "a1" }, { callupId: "c2", athleteId: "a2" }];
    expect(callupsToWithdraw(sent, new Set(["a1", "a3"]))).toEqual(["c2"]);
    expect(callupsToWithdraw(sent, new Set(["a1", "a2"]))).toEqual([]);
    expect(callupsToWithdraw([], new Set())).toEqual([]);
  });

  it("says on the button what will happen", () => {
    expect(sendButtonLabel(5, 0)).toBe("Invia convocazione (5)");
    expect(sendButtonLabel(4, 1)).toBe("Invia convocazione (4) · togli 1");
    expect(sendButtonLabel(0, 2)).toBe("Togli 2 dalla convocazione");
  });

  it("never removes call-up rows (history kept)", async () => {
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const sql = readFileSync(fileURLToPath(new URL("../../../../supabase/migrations/20261011_r68_callup_withdraw.sql", import.meta.url)), "utf8");
    expect(sql).not.toMatch(/\bdelete\s+from\b/i);
    expect(sql).toContain("withdrawn_at = now()");
  });
});

describe("a call-up is mandatory, not an RSVP (UD-099)", () => {
  const allCopy = [
    ...Object.values(RESPONSE_LABEL),
    ...Object.values(MY_RESPONSE_LABEL),
    ...Object.values(FAMILY_CALLUP_COPY),
    ...Object.values(MISTER_CALLUP_COPY),
    CALLUP_PUSH_TEXT,
    respondedMessage("CONFIRMED"),
    respondedMessage("DECLINED"),
  ];

  it("labels the family card as acknowledgement and impediment", () => {
    expect(MY_RESPONSE_LABEL).toEqual({ PENDING: "Convocato · da prendere visione", CONFIRMED: "Presa visione", DECLINED: "Impedimento segnalato" });
    expect(FAMILY_CALLUP_COPY.acknowledge).toBe("Presa visione");
    expect(FAMILY_CALLUP_COPY.report).toBe("Segnala un impedimento");
    expect(FAMILY_CALLUP_COPY.reportConfirm).toBe("Conferma segnalazione");
    expect(FAMILY_CALLUP_COPY.reportNote).toBe(
      "La convocazione resta valida: il mister riceve la segnalazione e decide. Per motivi di salute non scrivere dettagli: parlane con il mister o con la segreteria.",
    );
  });

  it("labels the mister panel as seen / not seen / impediments", () => {
    expect(RESPONSE_LABEL).toEqual({ PENDING: "Non ancora vista", CONFIRMED: "Vista", DECLINED: "Impedimento segnalato" });
    const c = responseCounts([{ response: "CONFIRMED" }, { response: "CONFIRMED" }, { response: "PENDING" }, { response: "DECLINED" }]);
    expect(responseSummary(c)).toEqual({ seen: "Viste 2", toSee: "Da vedere 1", impediments: "Impedimenti 1" });
    expect(MISTER_CALLUP_COPY.familiesHint).toBe("Le famiglie prendono visione dalla loro pagina.");
  });

  it("asks to open the app to take notice in the push text", () => {
    expect(CALLUP_PUSH_TEXT).toBe("Nuova convocazione: apri l'app per prenderne visione");
  });

  it("never offers a choice to attend", () => {
    for (const text of allCopy) expect(text).not.toMatch(/ci sar[òoà]|non ci sar|parteciper/i);
  });

  it("keeps the convocation valid when an impediment is reported", () => {
    expect(respondedMessage("DECLINED")).toContain("la convocazione resta valida");
  });
});
