import { describe, expect, it } from "vitest";

import {
  ACCEPTANCE_PATTERNS,
  FILE_PATTERNS,
  classify,
  mapDriveFolders,
  mapSubmissions,
  normName,
  summarize,
  type PersonRef,
} from "./enrolment-import";
import { DOC_KINDS } from "./my-documents";

// Invented people only.
const people: PersonRef[] = [
  { id: "p1", firstName: "Bimbo", lastName: "Prova", birthDate: "2016-03-04" },
  {
    id: "p2",
    firstName: "Anna",
    lastName: "D'Esempio",
    birthDate: "2012-01-01",
  },
  { id: "p3", firstName: "Luca", lastName: "Doppio", birthDate: "2013-05-05" },
  { id: "p4", firstName: "Luca", lastName: "Doppio", birthDate: "2014-06-06" },
];

describe("enrolment import mapping", () => {
  it("maps only to kinds of the r144 catalogue, in the right section", () => {
    const sec = new Map(DOC_KINDS.map((k) => [k.code, k.section]));
    for (const [, k] of ACCEPTANCE_PATTERNS)
      expect(sec.get(k), k).toBe("FIRMATO");
    for (const [, k] of FILE_PATTERNS) expect(sec.get(k), k).toBe("CONSEGNATO");
    expect(classify("Allega il certificato medico", FILE_PATTERNS)).toBe(
      "CERTIFICATO_MEDICO",
    );
    expect(classify("Documento identità genitore", FILE_PATTERNS)).toBe(
      "DOC_IDENTITA_GENITORE",
    );
    expect(classify("Carta d'identità atleta retro", FILE_PATTERNS)).toBe(
      "DOC_IDENTITA_ATLETA_RETRO",
    );
    expect(classify("Codice di condotta genitori", ACCEPTANCE_PATTERNS)).toBe(
      "CODICE_CONDOTTA_GENITORE",
    );
    expect(normName("D'Èsempio")).toBe("DESEMPIO");
  });

  it("matches submissions on name + surname + birth date, never on the name alone", () => {
    const subs = [
      {
        id: "s1",
        submittedAt: "2026-08-01T10:00:00Z",
        firstName: "bimbo",
        lastName: "PROVA",
        birthDate: "04/03/2016",
        fields: [
          {
            title: "Accetto l'informativa privacy",
            type: "CHECKBOXES",
            value: ["Accetto"],
          },
          { title: "Modello Safeguarding", type: "CHECKBOX", value: true },
          { title: "Liberatoria immagini", type: "CHECKBOX", value: false },
          {
            title: "Certificato medico",
            type: "FILE_UPLOAD",
            value: [{ name: "x.pdf" }],
          },
          {
            title: "Data di scadenza del certificato",
            type: "INPUT_DATE",
            value: "2027-02-01",
          },
        ],
      },
      {
        id: "s2",
        submittedAt: "2026-08-02T10:00:00Z",
        firstName: "Luca",
        lastName: "Doppio",
        birthDate: null,
        fields: [],
      },
      {
        id: "s3",
        submittedAt: "2026-08-02T10:00:00Z",
        firstName: "Nessuno",
        lastName: "Mai",
        birthDate: "2010-01-01",
        fields: [],
      },
    ];
    const out = mapSubmissions(subs, people, "TALLY_VLAJNY");
    expect(out.matched).toBe(1);
    expect(out.unmatched).toBe(2);
    expect(out.certificateDates).toBe(1);
    expect(out.rows.map((r) => `${r.kind}:${r.status}`).sort()).toEqual([
      "CERTIFICATO_MEDICO:CARICATO_IN_VERIFICA",
      "INFORMATIVA_PRIVACY:ACCETTATO",
      "MOG_SAFEGUARDING:ACCETTATO",
    ]);
    expect(
      out.rows.find((r) => r.kind === "CERTIFICATO_MEDICO")?.expiresAt,
    ).toBe("2027-02-01");
    expect(
      out.rows.find((r) => r.kind === "INFORMATIVA_PRIVACY")?.acceptedAt,
    ).toBe("2026-08-01T10:00:00Z");
    expect(new Set(out.rows.map((r) => r.sourceRecordId)).size).toBe(
      out.rows.length,
    );
  });

  it("never writes an approved document: imported files wait for the Segreteria", () => {
    const subs = mapSubmissions(
      [
        {
          id: "s9",
          submittedAt: "2026-08-01T10:00:00Z",
          firstName: "Bimbo",
          lastName: "Prova",
          birthDate: "2016-03-04",
          fields: [
            { title: "Certificato medico", type: "FILE_UPLOAD", value: [{ name: "c.pdf" }] },
            { title: "Fototessera", type: "FILE_UPLOAD", value: [{ name: "f.jpg" }] },
          ],
        },
      ],
      people,
      "TALLY_VLAJNY",
    );
    const drive = mapDriveFolders(
      [{ name: "D'Esempio_Anna_Atleta", files: [{ id: "1AbCdEfGhIjKlMn", name: "certificato medico.pdf" }] }],
      people,
    );
    const files = [...subs.rows, ...drive.rows].filter((r) => r.section === "CONSEGNATO");
    expect(files.length).toBe(3);
    for (const r of files) expect(r.status).toBe("CARICATO_IN_VERIFICA");
    expect(JSON.stringify([...subs.rows, ...drive.rows])).not.toContain("APPROVATO");
  });

  it("uses Drive folders only when Cognome_Nome is unique, and summarises with counts only", () => {
    const d = mapDriveFolders(
      [
        {
          name: "Prova_Bimbo_Atleta",
          files: [
            { id: "1AbCdEfGhIjKlMn", name: "certificato medico.pdf" },
            { id: "1ZzZzZzZzZzZzZz", name: "IMG_0001.jpg" },
          ],
        },
        {
          name: "Doppio_Luca_Atleta",
          files: [{ id: "1QqQqQqQqQqQqQq", name: "fototessera.jpg" }],
        },
        {
          name: "D'Esempio_Anna_Atleta",
          files: [
            { id: "1WwWwWwWwWwWwWw", name: "tessera sanitaria fronte.jpg" },
          ],
        },
      ],
      people,
    );
    expect(d.matched).toBe(2);
    expect(d.ambiguousOrUnknown).toBe(1);
    expect(d.unclassified).toBe(1);
    expect(d.rows.map((r) => r.kind).sort()).toEqual([
      "CERTIFICATO_MEDICO",
      "TESSERA_SANITARIA_FRONTE",
    ]);
    const s = summarize(
      { count: 0, matched: 0, unmatched: 0, certificateDates: 0, rows: [] },
      { count: 3, ...d },
    );
    expect(s.files).toEqual({
      CERTIFICATO_MEDICO: 1,
      TESSERA_SANITARIA_FRONTE: 1,
    });
    expect(JSON.stringify(s)).not.toMatch(
      /Prova|Bimbo|Anna|1AbCd|certificato medico\.pdf|p1/,
    );
  });
});
