/**
 * "Chi sei → cosa trovi" of the signed-out home (study 15/10/2026, block A reference 4, plan action 3): a decision
 * table by profile, like the "which tool for which user" tables of the guides, that sends every visitor to the area
 * that already exists for them. Pure data: no new route, no new source. Every promise matches what the destination
 * page shows today; while the public forms are paused (PUBLIC_FORMS_LIVE = false) the "join" row goes to the official
 * contacts instead of promising a form.
 */
import { PUBLIC_FORMS_LIVE } from "./public-forms";

export type WhoId = "tifoso" | "famiglia" | "atleta" | "staff" | "sponsor";

/** Public pages a row may point to (typed so the component needs no cast). */
export type WhoHref =
  | "/calendario"
  | "/accedi"
  | "/contatti"
  | "/registrati"
  | "/sponsor"
  | "/allenamenti"
  | "/guida";

export type WhoLink = {
  to: WhoHref;
  /** Section of /guida ("Come funziona l'app"). */
  hash?: string;
  label: string;
};

export type WhoRow = {
  id: WhoId;
  /** "Tifoso" */
  who: string;
  /** "Segui il club senza registrarti" */
  claim: string;
  /** What this profile finds, three short items, each true of the destination pages. */
  finds: readonly [string, string, string];
  /** Main destination (an existing page of the app). */
  href: WhoHref;
  cta: string;
  /** Secondary link: the matching section of the guide, or another public page. */
  more?: WhoLink;
};

const JOIN_HREF: WhoHref = PUBLIC_FORMS_LIVE ? "/registrati" : "/contatti";
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
    more: { to: "/guida", hash: "tifosi", label: "Come si fa" },
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
    more: { to: "/guida", hash: "famiglie", label: "Come si fa" },
  },
  {
    id: "atleta",
    who: "Vuoi giocare con noi?",
    claim: "Dai Primi Calci alla Prima Squadra",
    finds: [
      "Giorni e campi di allenamento di ogni annata",
      "Una prova con la tua annata: basta scrivere alla segreteria",
      "Iscrizione seguita dalla segreteria, passo per passo",
    ],
    href: JOIN_HREF,
    cta: JOIN_CTA,
    more: { to: "/allenamenti", label: "Gli allenamenti" },
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
    more: { to: "/guida", hash: "mister", label: "Come si fa" },
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
