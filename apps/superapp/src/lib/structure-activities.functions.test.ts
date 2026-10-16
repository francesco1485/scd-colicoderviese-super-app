import { afterEach, describe, expect, it, vi } from "vitest";

import {
  STRUCTURE_NOTICED,
  STRUCTURE_WRITE_DENIED,
  STRUCTURE_WRITE_FAILED,
  STRUCTURE_WRITE_MESSAGES,
  STRUCTURE_WRITE_OFF,
} from "./structure-activities";
import {
  STRUCTURE_DENIED,
  STRUCTURE_NOT_LINKED,
  STRUCTURE_READ_FAILED,
  STRUCTURE_UNREACHABLE,
  emptyStructureBoard,
  structureOffMessage,
  structureReadError,
  structureWriteOutcome,
  writeProbe,
} from "./structure-activities.functions";

describe("structureOffMessage (registry not read, r135 applied)", () => {
  it("says why the registry was not read and never asks to apply r135", () => {
    expect(structureOffMessage("unreachable")).toBe("Registro non raggiungibile, riprova più tardi");
    expect(structureOffMessage("not-linked")).toBe("Accesso al registro non collegato al tuo profilo club");
    expect(structureOffMessage(null)).toBeNull();
    for (const m of [STRUCTURE_UNREACHABLE, STRUCTURE_NOT_LINKED]) expect(m).not.toMatch(/applica|da attivare|in preparazione/i);
  });
});

describe("structureReadError (r135 read failures)", () => {
  afterEach(() => vi.restoreAllMocks());

  it("shows the permission message only for insufficient_privilege (42501), without logging", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(structureReadError({ code: "42501" })).toBe(STRUCTURE_DENIED);
    expect(warn).not.toHaveBeenCalled();
  });

  it("any other failure is a generic retry message and logs only the error code", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const err = { code: "22023", message: "invalid range for org 11111111-1111-4111-8111-111111111111", details: "x", hint: "y" };
    expect(structureReadError(err)).toBe("Lettura non riuscita, riprova più tardi");
    expect(STRUCTURE_READ_FAILED).toBe("Lettura non riuscita, riprova più tardi");
    expect(warn).toHaveBeenCalledTimes(1);
    const logged = String(warn.mock.calls[0]?.[0]);
    expect(logged).toContain("22023");
    expect(logged).not.toContain("invalid range");
    expect(logged).not.toContain("11111111");
  });

  it("an error without a code is generic too", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(structureReadError({})).toBe(STRUCTURE_READ_FAILED);
    expect(structureReadError(null)).toBe(STRUCTURE_READ_FAILED);
    expect(String(warn.mock.calls[0]?.[0])).toContain("unknown");
  });
});

describe("structureWriteOutcome (r137 write answers)", () => {
  afterEach(() => vi.restoreAllMocks());

  it("missing function = 'Scrittura non ancora attiva' (r137 not applied), never a crash", () => {
    for (const err of [{ code: "PGRST202", message: "Could not find the function" }, { code: "42883", message: "function does not exist" }]) {
      expect(structureWriteOutcome("create", null, err)).toEqual({ ok: false, message: STRUCTURE_WRITE_OFF });
    }
    expect(STRUCTURE_WRITE_OFF).toMatch(/^Scrittura non ancora attiva/);
  });

  it("42501 = not a writer; any other error is generic and logs only the code", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(structureWriteOutcome("update", null, { code: "42501", message: "not allowed" })).toEqual({ ok: false, message: STRUCTURE_WRITE_DENIED });
    expect(warn).not.toHaveBeenCalled();
    expect(structureWriteOutcome("cancel", null, { code: "23514", message: "violates check for org 11111111-1111" })).toEqual({ ok: false, message: STRUCTURE_WRITE_FAILED });
    expect(String(warn.mock.calls[0]?.[0])).toContain("23514");
    expect(String(warn.mock.calls[0]?.[0])).not.toContain("11111111");
  });

  it("maps database codes to plain messages and says 'Segreteria avvisata' only when the notice is confirmed", () => {
    expect(structureWriteOutcome("create", { ok: false, code: "contact" }, null)).toEqual({ ok: false, message: STRUCTURE_WRITE_MESSAGES.contact });
    expect(structureWriteOutcome("create", { ok: false, code: "weird" }, null)).toEqual({ ok: false, message: STRUCTURE_WRITE_FAILED });
    expect(structureWriteOutcome("create", "garbage", null)).toEqual({ ok: false, message: STRUCTURE_WRITE_FAILED });
    expect(structureWriteOutcome("create", { ok: true, id: "x", noticed: true }, null)).toEqual({ ok: true, message: `Attività salvata.${STRUCTURE_NOTICED}` });
    expect(structureWriteOutcome("update", { ok: true, id: "x" }, null)).toEqual({ ok: true, message: "Modifiche salvate." });
    expect(structureWriteOutcome("update", { ok: true, unchanged: true, noticed: false }, null)).toEqual({ ok: true, message: "Nessuna modifica da salvare." });
    expect(structureWriteOutcome("cancel", { ok: true, noticed: true }, null).message).toMatch(/^Attività annullata\. La Segreteria è stata avvisata/);
  });
});

describe("writeProbe (scd_structure_write_access)", () => {
  afterEach(() => vi.restoreAllMocks());

  it("missing function, failure, or the parsed answer", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(writeProbe({ data: null, error: { code: "PGRST202", message: "Could not find the function public.scd_structure_write_access" } })).toBe("missing");
    expect(writeProbe({ data: null, error: { code: "57014", message: "timeout" } })).toBe("error");
    expect(warn).toHaveBeenCalledTimes(1);
    expect(writeProbe({ data: { canWrite: true }, error: null })).toEqual({ canWrite: true });
    expect(writeProbe({ data: { canWrite: "yes" }, error: null })).toEqual({ canWrite: false });
  });

  it("an empty board never offers writing", () => {
    expect(emptyStructureBoard({ view: "access", preview: false }).write).toBe("off");
  });
});
