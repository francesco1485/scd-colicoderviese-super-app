/**
 * "Chi sei → cosa trovi" of the signed-out home (study 15/10/2026, block A reference 4, plan action 3): a decision
 * table by profile, like the "which tool for which user" tables of the guides, that sends every visitor to the area
 * that already exists for them. Pure data: no new route, no new source. Every destination is a page of the app or
 * the matching section of /guida; while the public forms are paused (PUBLIC_FORMS_LIVE = false) the "join" rows go
 * to the official contacts instead of promising a form.
 */
import { PUBLIC_FORMS_LIVE } from "./public-forms";

export type WhoId = "tifoso" | "famiglia" | "atleta" | "staff" | "sponsor";

export type WhoRow = {
  id: WhoId;
  /** "Tifoso" */
  who: string;
  /** "Segui il club senza registrarti" */
  claim: string;
  /** What this profile finds, three short items. */
  finds: readonly [string, string, string];
  /** Main destination (an existing page of the app). */
  href: string;
  cta: string;
  /** Anchor of the matching section of /guida ("Come funziona l'app"), when the guide has one. */
  guide?: string;
};

const JOIN_HREF = PUBLIC_FORMS_LIVE ? "/registrati" : "/contatti";
const JOIN_CTA = PUBLIC_FORMS_LIVE ? "Registrati" : "Scrivi alla segreteria";

export const WHO_ROWS: readonly WhoRow[] = [
  {
    id: "tifoso",
    who: "Tifoso",
    claim: "Segui il club senza registrarti",
    finds: [
      "Tutte le gare della settimana e i risultati",
      "Campi di Colico e Dervio, come arrivare e biglietteria",
      "Tornei, feste ed eventi",
    ],
    href: "/calendario",
    cta: "Vai al calendario",
    guide: "tifosi",
  },
  {
    id: "famiglia",
    who: "Famiglia",
    claim: "Genitori e tutori dei ragazzi",
    finds: [
      "Convocazioni con ora e luogo del ritrovo",
      "Certificato medico, tesseramento e quote",
      "Pulmino e documenti del club",
    ],
    href: "/accedi",
    cta: "Entra nell'area famiglie",
    guide: "famiglie",
  },
  {
    id: "atleta",
    who: "Vuoi giocare con noi?",
    claim: "Dai Primi Calci alla Prima Squadra",
    finds: [
      "Le squadre 2026/27 e i giorni di allenamento",
      "Una prova con la tua annata",
      "Come iscriversi, passo per passo",
    ],
    href: JOIN_HREF,
    cta: JOIN_CTA,
    guide: "famiglie",
  },
  {
    id: "staff",
    who: "Mister e dirigenti",
    claim: "Chi segue una squadra",
    finds: [
      "Convocazioni e distinta della gara",
      "Campi, rotazione e richieste",
      "Avvisi e documenti del club",
    ],
    href: "/accedi",
    cta: "Entra nell'area staff",
    guide: "mister",
  },
  {
    id: "sponsor",
    who: "Sponsor e partner",
    claim: "Aziende del territorio",
    finds: [
      "Pacchetti e visibilità su campi e ledwall",
      "I partner che già ci sostengono",
      "Proposta e incontro con la Direzione",
    ],
    href: "/sponsor",
    cta: "Scopri i pacchetti",
  },
];
