import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { INTAKE_KINDS, INTAKE_SLUG } from "./intake-kinds";
import { INTAKE_FORM_PENDING, allIntakeLinks, intakeFormUrl, intakeLink } from "./intake-links";

const config = JSON.parse(readFileSync(fileURLToPath(new URL("../../../../config/scd-requests-intake.v1.json", import.meta.url)), "utf8"));
const FORM = "https://tally.so/r/abcd12";

describe("public links of the single Tally form (UD-163)", () => {
  it("uses the published form YjDovq (Francesco, 17/10/2026)", () => {
    expect(config.intakeTallyFormUrl).toBe("https://tally.so/r/YjDovq");
    expect(intakeFormUrl()).toBe("https://tally.so/r/YjDovq");
    expect(intakeLink("ISCRIZIONE_TORNEO", { torneo: "memorial-sandro-guattini" }).href).toBe("https://tally.so/r/YjDovq?tipo=torneo&torneo=memorial-sandro-guattini");
  });

  it("stays closed while the form does not exist (null)", () => {
    expect(intakeFormUrl(null)).toBeNull();
    for (const l of allIntakeLinks(null)) {
      expect(l.available).toBe(false);
      expect(l.href).toBeNull();
    }
    expect(INTAKE_FORM_PENDING).toBe("Modulo in preparazione");
  });

  it("accepts only a bare Tally form page", () => {
    expect(intakeFormUrl(FORM)).toBe(FORM);
    for (const bad of ["http://tally.so/r/abcd12", "https://tally.so/r/abcd12?x=1", "https://example.org/r/abcd12", "https://tally.so/forms/abcd12/edit", 5, ""]) {
      expect(intakeFormUrl(bad), String(bad)).toBeNull();
    }
  });

  it("adds the hidden field tipo and only known, non-personal hints", () => {
    expect(intakeLink("ISCRIZIONE_TORNEO", { torneo: "christmas-lario-cup-maschile" }, FORM).href).toBe(`${FORM}?tipo=torneo&torneo=christmas-lario-cup-maschile`);
    expect(intakeLink("ISCRIZIONE_TORNEO", { torneo: "inventato" }, FORM).href).toBe(`${FORM}?tipo=torneo`);
    expect(intakeLink("SPONSOR", { pacchetto: "ledwall" }, FORM).href).toBe(`${FORM}?tipo=sponsor&pacchetto=ledwall`);
    expect(intakeLink("SPONSOR", { pacchetto: "Mario Rossi" }, FORM).href).toBe(`${FORM}?tipo=sponsor`);
    expect(intakeLink("AFFITTO_CAMPO", { sede: "DERVIO" }, FORM).href).toBe(`${FORM}?tipo=affitto-campo&sede=dervio`);
    expect(intakeLink("ALTRO", { sede: "DERVIO", torneo: "christmas-lario-cup-maschile" }, FORM).href).toBe(`${FORM}?tipo=altro`);
  });

  it("uses the same slugs as the config and the database ingest", () => {
    expect(Object.fromEntries(INTAKE_KINDS.map((k) => [INTAKE_SLUG[k], k]))).toEqual(config.kinds);
    expect(allIntakeLinks(FORM).map((l) => new URL(l.href!).searchParams.get("tipo"))).toEqual(INTAKE_KINDS.map((k) => INTAKE_SLUG[k]));
  });
});
