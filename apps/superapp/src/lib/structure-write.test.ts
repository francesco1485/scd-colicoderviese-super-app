import { describe, expect, it } from "vitest";

import {
  STRUCTURE_RESPONSIBLE_OPTIONS,
  STRUCTURE_WRITE_MESSAGES,
  draftFromActivity,
  emptyDraft,
  isStructureWriteCode,
  parseWriteAccess,
  structureCanWrite,
  structureOrganization,
  structureWriteState,
  validateCancelReason,
  validateStructureDraft,
  type StructureActivity,
  type StructureDraft,
} from "./structure-activities";

const TODAY = "2026-10-16";
const ok: StructureDraft = {
  site: "DERVIO",
  area: "CLUB_HOUSE",
  kind: "ATTIVITA_SERALE",
  title: "  Serata soci ",
  date: "2026-10-18",
  start: "19:00",
  end: "23:00",
  responsibleRole: "responsabile-club-house",
  covered: false,
  notes: "  ",
};

describe("structureCanWrite (UD-159: DG and Presidente decide)", () => {
  it("opens to the Direzione role and the presidente / direttore-generale positions only", () => {
    expect(structureCanWrite(["DIRECTION"], new Set())).toBe(true);
    expect(structureCanWrite(["STAFF"], new Set(["presidente"]))).toBe(true);
    expect(structureCanWrite(["STAFF"], new Set(["direttore-generale"]))).toBe(true);
  });

  it("keeps out the Segreteria and every other reader", () => {
    expect(structureCanWrite(["SECRETARIAT"], new Set(["segreteria"]))).toBe(false);
    expect(structureCanWrite(["REGISTRATION"], new Set(["segreteria"]))).toBe(false);
    for (const p of ["coordinatore-attivita-sportiva", "responsabile-attivita-base", "responsabile-struttura-colico", "responsabile-campi", "direzione", "dirigenza"]) {
      expect(structureCanWrite(["STAFF"], new Set([p])), p).toBe(false);
    }
    expect(structureCanWrite([], new Set())).toBe(false);
  });
});

describe("structureOrganization (one selector for read and write)", () => {
  const m = (organizationId: string, role: string) => ({ organizationId, organization: organizationId, role });

  it("prefers the organization where the caller writes, then where they read, never a blind first one", () => {
    expect(structureOrganization([m("other", "FAMILY"), m("scd", "DIRECTION")], new Set())?.organizationId).toBe("scd");
    expect(structureOrganization([m("other", "FAMILY"), m("scd", "SECRETARIAT")], new Set())?.organizationId).toBe("scd");
    expect(structureOrganization([m("a", "SECRETARIAT"), m("b", "DIRECTION")], new Set())?.organizationId).toBe("b");
    expect(structureOrganization([m("scd", "FAMILY")], new Set())).toBeNull();
    expect(structureOrganization([], new Set(["presidente"]))).toBeNull();
  });
});

describe("structureWriteState (fail closed)", () => {
  it("opens the form only when the database says canWrite", () => {
    expect(structureWriteState(true, { canWrite: true })).toBe("on");
    expect(structureWriteState(false, { canWrite: true })).toBe("on");
    expect(structureWriteState(true, { canWrite: false })).toBe("off");
  });

  it("explains a missing r137 or a failed check only to writers by session", () => {
    expect(structureWriteState(true, "missing")).toBe("not-applied");
    expect(structureWriteState(true, "error")).toBe("unavailable");
    expect(structureWriteState(false, "missing")).toBe("off");
    expect(structureWriteState(false, "error")).toBe("off");
    expect(structureWriteState(true, null)).toBe("off");
  });

  it("reads anything but {canWrite: true} as no", () => {
    expect(parseWriteAccess({ canWrite: true })).toEqual({ canWrite: true });
    for (const v of [null, undefined, "true", [], { canWrite: "true" }, { canWrite: 1 }, {}]) expect(parseWriteAccess(v)).toEqual({ canWrite: false });
  });
});

describe("validateStructureDraft (mirror of scd_structure_activity_clean)", () => {
  it("accepts a valid draft and trims title, empty notes and role", () => {
    const v = validateStructureDraft(ok, TODAY);
    expect(v).toEqual({ ok: true, value: { ...ok, title: "Serata soci", notes: null } });
    const w = validateStructureDraft({ ...ok, responsibleRole: "", covered: true, start: "22:00", end: "01:00" }, TODAY);
    expect(w.ok && w.value.responsibleRole).toBe(null);
    expect(w.ok && w.value.covered).toBe(true);
  });

  it("refuses with the same codes as the database", () => {
    const cases: Array<[Partial<StructureDraft> | Record<string, unknown>, string]> = [
      [{ site: "LECCO" }, "site"],
      [{ area: "BAR" }, "area"],
      [{ kind: "PARTITA" }, "kind"],
      [{ title: "x" }, "title"],
      [{ title: "x".repeat(81) }, "title"],
      [{ title: "Chiamare mario.rossi@example.com" }, "contact"],
      [{ title: "Chiama 333 123 4567" }, "contact"],
      [{ notes: "tel 0341-93.12.34" }, "contact"],
      [{ notes: "x".repeat(301) }, "notes"],
      [{ responsibleRole: "Mario Rossi" }, "role"],
      [{ covered: "si" }, "input"],
      [{ date: "2026-02-30" }, "date"],
      [{ date: "18/10/2026" }, "date"],
      [{ date: "2026-10-08" }, "date_range"],
      [{ date: "2027-10-18" }, "date_range"],
      [{ start: "25:00" }, "time"],
      [{ start: "7:00" }, "time"],
      [{ start: "19:00", end: "19:00" }, "time"],
    ];
    for (const [over, code] of cases) expect(validateStructureDraft({ ...ok, ...over }, TODAY), JSON.stringify(over)).toEqual({ ok: false, code });
    expect(validateStructureDraft({ ...ok, date: "2026-10-09" }, TODAY).ok).toBe(true);
    expect(validateStructureDraft({ ...ok, date: "2027-10-17" }, TODAY).ok).toBe(true);
  });

  it("has a plain Italian message for every code, never technical words", () => {
    for (const [code, msg] of Object.entries(STRUCTURE_WRITE_MESSAGES)) {
      expect(isStructureWriteCode(code)).toBe(true);
      expect(msg, code).not.toMatch(/\b(rpc|sql|42501|null|undefined|uuid|jsonb)\b/i);
    }
    expect(isStructureWriteCode("toString")).toBe(false);
    expect(isStructureWriteCode("nope")).toBe(false);
  });
});

describe("validateCancelReason", () => {
  it("is optional, short and without contacts", () => {
    expect(validateCancelReason("  ")).toEqual({ ok: true, value: null });
    expect(validateCancelReason(null)).toEqual({ ok: true, value: null });
    expect(validateCancelReason(" Pioggia ")).toEqual({ ok: true, value: "Pioggia" });
    expect(validateCancelReason("x".repeat(301))).toEqual({ ok: false, code: "reason" });
    expect(validateCancelReason("chiamare 333 123 4567")).toEqual({ ok: false, code: "contact" });
  });
});

describe("draftFromActivity / emptyDraft", () => {
  it("turns a registered activity into Rome day and times (DST aware)", () => {
    const a: StructureActivity = {
      id: "11111111-1111-4111-8111-111111111111",
      site: "COLICO",
      area: "CAMPO",
      kind: "CHIUSURA",
      title: "Chiusura",
      startsAt: "2026-10-24T20:00:00Z",
      endsAt: "2026-10-24T23:30:00Z",
      responsibleRole: null,
      covered: true,
      status: "PREVISTA",
      notes: null,
    };
    expect(draftFromActivity(a)).toEqual({
      site: "COLICO",
      area: "CAMPO",
      kind: "CHIUSURA",
      title: "Chiusura",
      date: "2026-10-24",
      start: "22:00",
      end: "01:30",
      responsibleRole: null,
      covered: true,
      notes: null,
    });
    // After the change to winter time (25/10/2026) Rome is UTC+1.
    expect(draftFromActivity({ ...a, startsAt: "2026-11-02T18:00:00Z", endsAt: "2026-11-02T19:00:00Z" })?.start).toBe("19:00");
    expect(draftFromActivity({ ...a, startsAt: "nope" })).toBeNull();
  });

  it("starts empty (the title is required) and offers role ids only", () => {
    const d = emptyDraft("DERVIO", TODAY);
    expect(d.site).toBe("DERVIO");
    expect(d.date).toBe(TODAY);
    expect(validateStructureDraft(d, TODAY)).toEqual({ ok: false, code: "title" });
    for (const r of STRUCTURE_RESPONSIBLE_OPTIONS) expect(r).toMatch(/^[a-z0-9-]{2,60}$/);
  });
});
