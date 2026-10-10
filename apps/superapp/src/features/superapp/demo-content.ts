/**
 * Contenuti DIMOSTRATIVI delle schermate riservate (Area Atleta, Area Famiglia), con la stessa
 * struttura delle tavole. Nessun nome, volto, recapito, documento, quota o gara reale: i dati veri
 * arrivano solo dopo l'autenticazione R20 (email + PIN). Verificato da demo-content.test.ts.
 */
const DEMO_DATE = { weekday: "DOM", day: "--", month: "MESE", time: "--:--" } as const;

export const athleteDemo = {
  initials: "AD",
  name: "Atleta demo",
  category: "Categoria demo",
  role: "Ruolo demo",
  number: "00",
  badges: { convocazioni: 2, messaggi: 1 },
  call: { date: DEMO_DATE, team: "Squadra demo", venue: "Campo demo · Colico", opponent: "Avversario demo", opponentShort: "Demo" },
  documents: [
    { title: "Certificato medico", sub: "Validità: dato dimostrativo" },
    { title: "Tesseramento FIGC", sub: "Stagione 2026/27 · demo" },
    { title: "Documento identità", sub: "Caricamento: dato dimostrativo" },
  ],
} as const;

export const familyDemo = {
  children: [
    { initials: "F1", name: "Figlio 1", category: "Categoria A" },
    { initials: "F2", name: "Figlio 2", category: "Categoria B" },
  ],
  payments: { percent: 70, title: "Quote stagione 2026/27", detail: "3 di 4 rate versate · demo" },
  cards: [
    { id: "cert", title: "Certificato medico", sub: "Validità: dato demo" },
    { id: "kit", title: "Kit e abbigliamento", sub: "Completato · demo" },
    { id: "figc", title: "Tesseramento FIGC", sub: "Stagione 2026/27 · demo" },
  ],
  commitments: [
    { id: "c1", kind: "allenamento" as const, when: "Lun -- · --:--", title: "Allenamento demo", place: "Centro Sportivo - Colico" },
    { id: "c2", kind: "gara" as const, when: "Dom -- · --:--", title: "Gara demo · Categoria A", place: "Campo demo" },
  ],
} as const;
