import { writeFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { parseBoard } from "@/lib/transport";
import type { StaffPerson } from "@/lib/staff-roster";
import type { OfficeRequest } from "@/lib/transport-requests";

import { TransportCrewCard } from "./TransportCrewCard";
import { TransportRequestsOffice } from "./TransportRequestsOffice";

// Invented adults only (fixtures): no real person, no minor, no phone.
const people: StaffPerson[] = [
  { id: "resp", name: "Responsabile Esempio", role: "Responsabile servizio pulmini e autista", kind: "autista", teams: [], areas: ["pulmini"], avatar: null },
  { id: "aut1", name: "Autista Uno", role: "Dirigente autista", kind: "autista", teams: [], areas: [], avatar: null },
  { id: "aut2", name: "Autista Due", role: "Dirigente autista", kind: "autista", teams: [], areas: [], avatar: null },
  { id: "mis", name: "Mister Esempio", role: "Allenatore U15", kind: "mister", teams: ["U15"], areas: [], avatar: null },
];
const board = parseBoard({
  canManage: true,
  vehicles: [],
  drivers: [
    { id: "d1", code: "DRV-1", name: "Autista Uno", status: "ATTIVO" },
    { id: "d2", code: "DRV-2", name: "Autista Tre", status: "DA VERIFICARE" },
  ],
});

const crew = renderToStaticMarkup(<TransportCrewCard people={people} emails={{}} board={board} ackLive={false} />);
const empty = renderToStaticMarkup(<TransportCrewCard people={[]} emails={{}} board={null} ackLive={false} />);
const requests: OfficeRequest[] = [
  { id: "r1", eventId: "ev1", date: "2026-10-18", teamCode: "u15", event: "Squadra Esempio · 2026-10-18", name: "Atleta A.", direction: "ANDATA_RITORNO", stop: "Piazza Esempio", line: "VALTELLINA", note: null, status: "RICHIESTA", decisionNote: null, acknowledged: false },
  { id: "r2", eventId: "ev1", date: "2026-10-18", teamCode: "u15", event: "Squadra Esempio · 2026-10-18", name: "Atleta B.", direction: "ANDATA", stop: null, line: null, note: null, status: "CONFERMATA", decisionNote: null, acknowledged: false },
];
const office = renderToStaticMarkup(<TransportRequestsOffice initial={requests} />);

describe("TransportCrewCard", () => {
  it("shows the Responsabile as owner and the volunteer drivers from the roster", () => {
    expect(crew).toContain("Decide il Responsabile servizio pulmini");
    expect(crew).toContain("Responsabile Esempio");
    expect(crew).toContain("Autista Uno");
    expect(crew).not.toContain("Mister Esempio");
    expect(crew).toContain("3 di 4 autisti in elenco");
  });
  it("lists the names that are only on one side of roster and Master", () => {
    expect(crew).toContain("Nel Master ma non nell&#x27;elenco ruoli: Autista Tre.");
    expect(crew).toContain("Nell&#x27;elenco ruoli ma non nel Master (scheda 05 AUTISTI): Autista Due, Responsabile Esempio.");
  });
  it("says «da collegare», never zero people, when the roster is empty", () => {
    expect(empty).toContain("da collegare");
    expect(empty).not.toContain("crew-mismatch");
  });
  it("marks the presa visione step as not active yet", () => {
    expect(crew).toContain("in attivazione");
  });
  it("never renders a phone-like number", () => {
    expect(crew + office).not.toMatch(/\b\d{3}[ .]?\d{6,7}\b/);
  });
});

describe("TransportRequestsOffice", () => {
  it("names the owner and shows short names only", () => {
    expect(office).toContain("Decide il Responsabile servizio pulmini");
    expect(office).toContain("Atleta A.");
    expect(office).toContain("1 confermati · 1 da gestire");
  });
});

if (process.env["SCD_QA_HTML_CREW"]) writeFileSync(process.env["SCD_QA_HTML_CREW"], `<div style="max-width:1100px;margin:auto;display:grid;gap:16px;padding:16px;grid-template-columns:repeat(auto-fit,minmax(340px,1fr))"><div style="display:grid;gap:16px">${office}</div><div style="display:grid;gap:16px">${crew}</div></div>`);
