import { afterEach, describe, expect, it, vi } from "vitest";

import {
  STRUCTURE_DENIED,
  STRUCTURE_NOT_LINKED,
  STRUCTURE_READ_FAILED,
  STRUCTURE_UNREACHABLE,
  structureOffMessage,
  structureReadError,
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
