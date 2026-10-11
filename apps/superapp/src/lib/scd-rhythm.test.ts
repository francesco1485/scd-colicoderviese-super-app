import { describe, expect, it } from "vitest";

import { canAddPhoto, daysUntil, posterVisible, reminderPlan, reminderText, rhythmSlot } from "./scd-rhythm";

const base = { delivered: false, minor: false };

describe("document reminders (UD-033)", () => {
  it("counts calendar days", () => {
    expect(daysUntil("2026-10-11", "2026-11-10")).toBe(30);
    expect(daysUntil("2026-10-11", "2026-10-04")).toBe(-7);
    expect(daysUntil("2026-03-28", "2026-03-30")).toBe(2); // across the DST change
    expect(daysUntil("x", "2026-01-01")).toBeNaN();
  });

  it("notifies at 30 and 7 days, only the holder", () => {
    const d30 = reminderPlan({ ...base, todayIso: "2026-10-11", expiryIso: "2026-11-10" });
    expect(d30).toMatchObject({ stage: "d30", sendToday: true, recipients: ["person"] });
    const d20 = reminderPlan({ ...base, todayIso: "2026-10-21", expiryIso: "2026-11-10" });
    expect(d20).toMatchObject({ stage: "d30", sendToday: false });
    const d7 = reminderPlan({ ...base, minor: true, todayIso: "2026-11-03", expiryIso: "2026-11-10" });
    expect(d7).toMatchObject({ stage: "d7", sendToday: true, recipients: ["guardian"] });
  });

  it("adds the secretariat on expiry and repeats weekly afterwards", () => {
    expect(reminderPlan({ ...base, todayIso: "2026-11-10", expiryIso: "2026-11-10" })).toMatchObject({
      stage: "due",
      sendToday: true,
      recipients: ["person", "segreteria"],
    });
    expect(reminderPlan({ ...base, todayIso: "2026-11-17", expiryIso: "2026-11-10" }).sendToday).toBe(true);
    expect(reminderPlan({ ...base, todayIso: "2026-11-15", expiryIso: "2026-11-10" }).sendToday).toBe(false);
  });

  it("stays silent when delivered, far away or unknown", () => {
    expect(reminderPlan({ ...base, delivered: true, todayIso: "2026-11-10", expiryIso: "2026-11-10" }).stage).toBe("none");
    expect(reminderPlan({ ...base, todayIso: "2026-01-01", expiryIso: "2026-11-10" }).sendToday).toBe(false);
    expect(reminderPlan({ ...base, todayIso: "2026-11-10", expiryIso: null }).stage).toBe("none");
    expect(reminderPlan({ ...base, todayIso: "2026-11-10", expiryIso: "boh" }).stage).toBe("none");
  });

  it("never reveals document content", () => {
    const plan = reminderPlan({ ...base, todayIso: "2026-11-03", expiryIso: "2026-11-10" });
    expect(reminderText(plan, "Certificato medico")).toBe(
      "Promemoria: Certificato medico scade tra 7 giorni. Consegnalo in segreteria o caricalo dall'app.",
    );
    expect(reminderText(reminderPlan({ ...base, todayIso: "2026-11-12", expiryIso: "2026-11-10" }), " ")).toMatch(/^un documento è scaduto da 2 giorni/);
    expect(reminderText(reminderPlan({ ...base, todayIso: "2026-01-01", expiryIso: "2026-11-10" }), "X")).toBeNull();
  });
});

describe("weekly rhythm (UD-031, UD-032, UD-028/029)", () => {
  it("maps weekdays to slots", () => {
    expect(rhythmSlot("2026-10-12")).toBe("settimana"); // Monday
    expect(rhythmSlot("2026-10-13")).toBe("settimana");
    expect(rhythmSlot("2026-10-14")).toBe("podcast");
    expect(rhythmSlot("2026-10-15")).toBe("eventi");
    expect(rhythmSlot("2026-10-16")).toBe("eventi");
    expect(rhythmSlot("2026-10-17")).toBe("libero");
    expect(rhythmSlot("2026-10-11")).toBe("libero");
    expect(rhythmSlot("")).toBe("libero");
  });

  it("keeps posters for a week", () => {
    expect(posterVisible("2026-10-11", "2026-10-11")).toBe(true);
    expect(posterVisible("2026-10-17", "2026-10-11")).toBe(true);
    expect(posterVisible("2026-10-18", "2026-10-11")).toBe(false);
    expect(posterVisible("2026-10-10", "2026-10-11")).toBe(false);
    expect(posterVisible("2026-10-11", null)).toBe(false);
  });

  it("limits photos per match", () => {
    expect(canAddPhoto("athlete", 0)).toBe(true);
    expect(canAddPhoto("athlete", 1)).toBe(false);
    expect(canAddPhoto("manager", 2)).toBe(true);
    expect(canAddPhoto("manager", 3)).toBe(false);
    expect(canAddPhoto("athlete", -1)).toBe(false);
  });
});
