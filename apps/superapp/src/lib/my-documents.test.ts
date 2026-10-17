import { describe, expect, it } from "vitest";

import { CLUB_DOCUMENTS } from "./club-documents";
import {
  DOC_KINDS,
  MAX_UPLOAD_BYTES,
  UPLOAD_KINDS,
  docErrorMessage,
  driveFileName,
  kindLabel,
  lampMessage,
  parseDrawer,
  parseLamp,
  personTodo,
  sniffMime,
} from "./my-documents";

// Invented ids only: no real people in tests.
const ID = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

describe("my documents catalogue", () => {
  it("has unique codes, Italian labels and real club PDFs for signed documents", () => {
    expect(new Set(DOC_KINDS.map((k) => k.code)).size).toBe(DOC_KINDS.length);
    for (const k of DOC_KINDS) {
      expect(k.label.length).toBeGreaterThan(3);
      if (k.clubDocId)
        expect(
          CLUB_DOCUMENTS.some((d) => d.id === k.clubDocId),
          k.code,
        ).toBe(true);
      if (k.clubDocId) expect(k.section).toBe("FIRMATO");
    }
    expect(UPLOAD_KINDS).toContain("CERTIFICATO_MEDICO");
    expect(UPLOAD_KINDS).not.toContain("INFORMATIVA_PRIVACY");
    expect(
      DOC_KINDS.find((k) => k.code === "ATTESTAZIONE_ISEE")?.docClass,
    ).toBe("ECONOMICO");
    expect(
      DOC_KINDS.filter((k) => k.docClass === "SANITARIO").map((k) => k.code),
    ).toEqual(["CERTIFICATO_MEDICO"]);
    expect(kindLabel("NOPE")).toBe("Documento");
  });
});

describe("parseDrawer", () => {
  it("keeps valid rows, drops unknown kinds, statuses and ids", () => {
    const d = parseDrawer({
      importDone: true,
      people: [
        {
          personId: ID(1),
          label: "Bimbo P.",
          relationship: "FIGLIO",
          isMinor: true,
          isAthlete: true,
          signed: [
            {
              kind: "INFORMATIVA_PRIVACY",
              acceptedAt: "2026-09-01T10:00:00Z",
              source: "TALLY_VLAJNY",
            },
            { kind: "CERTIFICATO_MEDICO" },
          ],
          consents: [{ type: "IMMAGINI_ISTITUZIONALI", granted: true }],
          delivered: [
            { kind: "FOTOTESSERA", status: "MANCANTE" },
            {
              kind: "CERTIFICATO_MEDICO",
              status: "SCADUTO",
              expiresAt: "2026-10-01",
            },
            { kind: "FOTOTESSERA", status: "BOH" },
            { kind: "INFORMATIVA_PRIVACY", status: "IN_REGOLA" },
          ],
          requests: [
            {
              id: ID(9),
              kind: "ATTESTAZIONE_ISEE",
              status: "APERTA",
              note: "per il Fondo",
            },
            { id: "x", kind: "FOTOTESSERA", status: "APERTA" },
          ],
        },
        { personId: "not-a-uuid", label: "X" },
      ],
    });
    expect(d.importDone).toBe(true);
    expect(d.people).toHaveLength(1);
    const p = d.people[0]!;
    expect(p.signed.map((s) => s.kind)).toEqual(["INFORMATIVA_PRIVACY"]);
    expect(p.delivered.map((x) => `${x.kind}:${x.status}`)).toEqual([
      "CERTIFICATO_MEDICO:SCADUTO",
      "FOTOTESSERA:MANCANTE",
    ]);
    expect(p.requests.map((r) => r.id)).toEqual([ID(9)]);
    expect(personTodo(p)).toBe(3);
  });

  it("returns an empty drawer for garbage", () => {
    expect(parseDrawer(null)).toEqual({ importDone: false, people: [] });
    expect(parseDrawer("x")).toEqual({ importDone: false, people: [] });
  });
});

describe("lampadina", () => {
  it("counts and says it in Italian", () => {
    const l = parseLamp({ expired: 1, expiring: "2", requests: 0, total: 3 });
    expect(l).toEqual({ expired: 1, expiring: 2, requests: 0, total: 3 });
    expect(lampMessage(l)).toBe(
      "1 documento scaduto, 2 in scadenza entro 30 giorni",
    );
    expect(lampMessage(parseLamp({}))).toBeNull();
    expect(parseLamp({ expired: -4 }).expired).toBe(0);
  });
});

describe("upload checks", () => {
  const bytes = (...b: number[]) => new Uint8Array(b);
  it("sniffs the real type from the first bytes", () => {
    expect(sniffMime(new TextEncoder().encode("%PDF-1.7\n"))).toBe(
      "application/pdf",
    );
    expect(sniffMime(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
    expect(
      sniffMime(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0)),
    ).toBe("image/png");
    expect(
      sniffMime(bytes(0, 0, 0, 0x18, ...new TextEncoder().encode("ftypheic"))),
    ).toBe("image/heic");
    expect(
      sniffMime(bytes(0, 0, 0, 0x18, ...new TextEncoder().encode("ftypisom"))),
    ).toBeNull();
    expect(sniffMime(new TextEncoder().encode("MZ\x90\x00"))).toBeNull();
    expect(sniffMime(new TextEncoder().encode("<svg"))).toBeNull();
    expect(sniffMime(bytes())).toBeNull();
  });

  it("names Drive files from kind and date only", () => {
    expect(
      driveFileName("CERTIFICATO_MEDICO", "application/pdf", "2026-10-17"),
    ).toBe("certificato_medico_2026-10-17.pdf");
    expect(driveFileName("../../x", "image/jpeg", "bad")).toBe("x_data.jpg");
    expect(MAX_UPLOAD_BYTES).toBe(10 * 1024 * 1024);
  });

  it("has a message for every code", () => {
    for (const c of [
      "NOT_ALLOWED",
      "BAD_FILE",
      "UPLOAD_OFF",
      "ARCHIVE_FAILED",
      "NOTE_REQUIRED",
      "CERT_ROLE",
      undefined,
    ])
      expect(docErrorMessage(c).length).toBeGreaterThan(10);
    expect(docErrorMessage("UPLOAD_OFF")).toContain(
      "Caricamento in preparazione",
    );
  });
});
