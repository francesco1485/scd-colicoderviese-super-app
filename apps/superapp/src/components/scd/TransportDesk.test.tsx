import { writeFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { draftFromEvent, parseBoard } from "@/lib/transport";

import { TransportFleetCard, TransportPlanner, TransportQueueCard } from "./TransportDesk";

const board = parseBoard({
  canManage: true,
  sync: { synced_at: "2026-10-12T07:31:47Z" },
  vehicles: [
    { id: "v1", code: "BUS-01", label: "Pulmino 1", plate: null, seatsPassengers: null, insuranceDue: "2026-10-01", inspectionDue: null, roadTaxDue: "2026-10-30" },
    { id: "v2", code: "BUS-02", label: "Pulmino 2", plate: "XX000XX", model: "Furgone 9 posti", seatsPassengers: 8, insuranceDue: "2027-03-01", inspectionDue: "2027-05-01", roadTaxDue: "2027-01-31" },
  ],
  drivers: [
    { id: "d1", code: "DRV-001", name: "Autista A", status: "ATTIVO", licenceCategory: "B", licenceDue: "2030-01-01", phone: "000 0000000" },
    { id: "d2", code: "DRV-002", name: "Autista B", status: "DA VERIFICARE", licenceDue: null, phone: null },
  ],
  rules: [],
  stops: [{ code: "FER-1", status: "DA CONFERMARE" }],
  riders: [{ teamGroup: "U15", serviceStatus: "ATTIVO", line: "DA VERIFICARE", days: {} }],
  runs: [
    { id: "r1", date: "2026-10-17", departure: "13:30", returnEstimate: "19:00", kind: "TRASFERTA", eventId: "E1", title: "U16 Élite a Lecco", destination: "Lecco", vehicleId: "v2", driverId: "d1", passengers: 8, status: "CONFERMATA" },
    { id: "r0", date: "2026-10-05", departure: "08:00", kind: "EXTRA", title: "Passata", status: "PIANIFICATA" },
  ],
})!;

describe("TransportDesk", () => {
  const today = "2026-10-12";
  const queue = renderToStaticMarkup(<TransportQueueCard board={board} now={new Date("2026-10-12T12:00:00Z")} />);
  const fleet = renderToStaticMarkup(<TransportFleetCard board={board} today={today} />);
  const list = renderToStaticMarkup(<TransportPlanner board={board} today={today} draft={null} setDraft={() => {}} onSaved={() => {}} />);
  const form = renderToStaticMarkup(
    <TransportPlanner board={board} today={today} draft={{ ...draftFromEvent({ id: "E2", date: "2026-10-18", opponent: "Real Lecco", teamLabel: "U15", place: "Lecco" }), departure: "09:00", vehicleId: "v2", passengers: "9" }} setDraft={() => {}} onSaved={() => {}} />,
  );

  it("shows the Master work queue with urgent items and the tab to open", () => {
    expect(queue).toContain("pulmino con assicurazione, revisione o bollo scaduti");
    expect(queue).toContain("Master, scheda 04 FLOTTA MEZZI");
  });

  it("shows deadlines and unconfirmed seats, never a phone even if one reaches the component", () => {
    expect(fleet).toContain("scaduta");
    expect(fleet).toContain("posti da confermare");
    expect(fleet).not.toContain("000 0000000");
    expect(fleet).toContain("ASD Volley Colico");
    expect(fleet).toContain("scadenza da inserire");
  });

  it("lists upcoming trips only and opens a prefilled form with seat warnings", () => {
    expect(list).toContain("U16 Élite a Lecco");
    expect(list).not.toContain("Passata");
    expect(list).toContain("Nuova corsa");
    expect(form).toContain('value="U15 a Real Lecco"');
    expect(form).toContain("Pulmino 2 ha 8 posti passeggeri: ne servono 9.");
    expect(form).not.toContain(">Annullata<");
  });

  it("hides the planner controls from drivers", () => {
    const html = renderToStaticMarkup(<TransportPlanner board={{ ...board, canManage: false }} today={today} draft={null} setDraft={() => {}} onSaved={() => {}} />);
    expect(html).not.toContain("Nuova corsa");
    expect(html).not.toContain("Modifica");
  });

  if (process.env["SCD_QA_HTML"]) writeFileSync(process.env["SCD_QA_HTML"], `<div class="grid gap-4 p-4" style="max-width:1100px;margin:auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr))"><div class="grid gap-4">${list}${form}</div><div class="grid gap-4">${queue}${fleet}</div></div>`);
});
