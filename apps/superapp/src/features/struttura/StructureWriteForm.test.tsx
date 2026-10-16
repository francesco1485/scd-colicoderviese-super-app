import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  STRUCTURE_SEGRETERIA_NOTICE,
  STRUCTURE_WRITE_OFF,
  STRUCTURE_WRITE_UNAVAILABLE,
  emptyDraft,
  type StructureDraft,
  type StructureWriteState,
} from "@/lib/structure-activities";

import { StructureWriteForm, StructureWriteNotice, type StructureWriteFormProps } from "./StructureWriteForm";

const route = readFileSync(fileURLToPath(new URL("../../routes/gestionale.struttura.tsx", import.meta.url)), "utf8");
const TODAY = "2026-10-16";
const html = (s: string) => s.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");

const props = (over: Partial<StructureWriteFormProps> = {}): StructureWriteFormProps => ({
  state: "on",
  today: TODAY,
  sites: ["COLICO", "DERVIO"],
  editing: null,
  initial: emptyDraft("COLICO", TODAY),
  onSave: vi.fn(),
  onCancelActivity: vi.fn(),
  onDone: vi.fn(),
  onClose: vi.fn(),
  ...over,
});

const editingDraft: StructureDraft = { ...emptyDraft("DERVIO", TODAY), title: "Serata soci", kind: "ATTIVITA_SERALE", area: "CLUB_HOUSE" };

describe("StructureWriteForm (fail closed)", () => {
  it("renders nothing unless the database opened writing", () => {
    for (const state of ["off", "not-applied", "unavailable"] as StructureWriteState[]) {
      expect(renderToStaticMarkup(<StructureWriteForm {...props({ state })} />), state).toBe("");
    }
  });

  it("new activity: every field has a clear Italian label, the Segreteria notice, no cancel button", () => {
    const out = html(renderToStaticMarkup(<StructureWriteForm {...props()} />));
    for (const l of ["Nuova attività", "Sede", "Dove", "Tipo di attività", "Giorno", "Dalle", "Alle", "Titolo", "Responsabile (ruolo, mai un nome)", "Turno coperto", "Note (facoltative)"]) {
      expect(out, l).toContain(l);
    }
    expect(out).toContain(STRUCTURE_SEGRETERIA_NOTICE);
    expect(out).toContain("Salva attività");
    expect(out).toContain("Chiudi senza salvare");
    expect(out).not.toContain("Annulla attività");
    expect(out).toContain("Nessuno per ora");
    expect(out).toContain("Nessun nome di persone, mai di minori");
    // Labels point at their inputs; the day is bounded like the database (7 days back, one year ahead).
    const ids = [...out.matchAll(/<label for="([^"]+)"/g)].map((m) => m[1]);
    expect(ids.length).toBeGreaterThanOrEqual(8);
    for (const id of ids) expect(out).toContain(`id="${id}"`);
    expect(out).toContain('min="2026-10-09"');
    expect(out).toContain('max="2027-10-17"');
    // No error before the first save, no optimistic row.
    expect(out).not.toContain('role="alert"');
  });

  it("only the sites passed in can be chosen", () => {
    const out = renderToStaticMarkup(<StructureWriteForm {...props({ sites: ["COLICO"] })} />);
    expect(out).toContain('value="COLICO"');
    expect(out).not.toContain('value="DERVIO"');
  });

  it("edit: loads the activity, saves changes and offers cancellation", () => {
    const out = html(renderToStaticMarkup(<StructureWriteForm {...props({ editing: { id: "11111111-1111-4111-8111-111111111111", draft: editingDraft } })} />));
    expect(out).toContain("Modifica attività");
    expect(out).toContain('value="Serata soci"');
    expect(out).toContain("Salva modifiche");
    expect(out).toContain("Annulla attività");
  });
});

describe("StructureWriteNotice", () => {
  it("explains why writing is closed, only for a missing r137 or a failed check", () => {
    expect(html(renderToStaticMarkup(<StructureWriteNotice state="not-applied" />))).toContain(STRUCTURE_WRITE_OFF);
    expect(html(renderToStaticMarkup(<StructureWriteNotice state="unavailable" />))).toContain(STRUCTURE_WRITE_UNAVAILABLE);
    expect(renderToStaticMarkup(<StructureWriteNotice state="on" />)).toBe("");
    expect(renderToStaticMarkup(<StructureWriteNotice state="off" />)).toBe("");
    expect(renderToStaticMarkup(<StructureWriteNotice state="not-applied" />)).toContain('role="status"');
  });
});

describe("/gestionale/struttura wiring", () => {
  it("opens the form card and the edit buttons only when write is 'on', and reloads after a write", () => {
    expect(route).toContain('const canWrite = data.write === "on";');
    expect(route).toMatch(/\{canWrite && \(\s*<Card id="str-decidi"/);
    expect(route).toContain("onEdit={canWrite ?");
    expect(route).toContain("<StructureWriteNotice state={data.write} />");
    expect(route).toContain("useServerFn(saveStructureActivity)");
    expect(route).toContain("useServerFn(cancelStructureActivity)");
    expect(route).toContain("void router.invalidate();");
  });
});
