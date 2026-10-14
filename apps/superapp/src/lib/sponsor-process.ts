/**
 * "Come lavoriamo" and FAQ of the /sponsor page (backlog B2).
 *
 * Pure data. Every sentence is a process fact already stated in the repo:
 * - spot flow (proposto → approvato / modifiche richieste → in onda) and LED master size: `sponsor-spots.ts`
 *   (SPOT_FLOW, LED_MASTER, socialCaption, HANDLE_PLACEHOLDER), UD-119;
 * - prices "in approvazione", packages "da soli o insieme", audience numbers "da misurare", contratto e fattura
 *   by the club, no online payment: `sponsor-packages.ts` and `PartnerPackages.tsx`;
 * - LED wall at the Colico pitch: `sponsor-packages.ts` (ledwall package) and the home "Sul LED wall" block.
 * No prices, no audience/reach numbers, no tax or legal claims. Tested in sponsor-process.test.ts.
 */
import { LED_MASTER } from "./sponsor-spots";

export interface ProcessStep {
  /** Stable id, also used for the element id on the page. */
  id: string;
  title: string;
  text: string;
}

export interface SponsorFaq {
  id: string;
  q: string;
  a: string;
}

/** Spot standard as written on the page: "20 secondi, 1920x164". */
export const SPOT_STANDARD_TEXT = `${LED_MASTER.seconds} secondi, ${LED_MASTER.width}x${LED_MASTER.height}`;

export const SPONSOR_PROCESS_STEPS: readonly ProcessStep[] = [
  {
    id: "contatto",
    title: "Primo contatto",
    text: "Parli con il Presidente o con il commerciale del club, oppure ci scrivi dal modulo qui sotto.",
  },
  {
    id: "pacchetto",
    title: "Scelta del pacchetto",
    text: "Scegliete insieme il pacchetto: LED wall, maglie, tornei o app. Si possono prendere da soli o insieme.",
  },
  {
    id: "spot",
    title: "Proposta dello spot",
    text: `Il club prepara lo spot LED nello standard del campo (${SPOT_STANDARD_TEXT}) e lo propone alla tua azienda.`,
  },
  {
    id: "approvazione",
    title: "Approvazione",
    text: "La tua azienda approva lo spot oppure chiede modifiche. Finché ci sono modifiche richieste, lo spot non va in onda.",
  },
  {
    id: "in-onda",
    title: "In onda",
    text: "Lo spot entra in rotazione sul LED wall e nella vetrina dell'app, con il tag social della tua azienda.",
  },
];

export const SPONSOR_FAQ: readonly SponsorFaq[] = [
  {
    id: "costo",
    q: "Quanto costa?",
    a: "I prezzi dei pacchetti sono in approvazione dalla Direzione. Scrivici e ti facciamo una proposta.",
  },
  {
    id: "spot-chi",
    q: "Chi prepara lo spot?",
    a: "Lo prepara il club, nel formato del LED wall del campo, e lo propone alla tua azienda prima della messa in onda.",
  },
  {
    id: "spot-modifica",
    q: "Posso cambiare lo spot durante la stagione?",
    a: "Sì. Chiedi una modifica: il club prepara la nuova versione e te la propone prima di rimetterla in rotazione.",
  },
  {
    id: "spot-dove",
    q: "Dove si vede lo spot?",
    a: "Sul LED wall a bordo campo a Colico e nella vetrina «Sul LED wall» della pagina iniziale dell'app, in rotazione con gli altri partner.",
  },
  {
    id: "social",
    q: "Ci taggate sui social?",
    a: "Sì. Il club prepara il testo social con il tag della tua azienda; usiamo solo il profilo ufficiale, dopo averlo verificato.",
  },
  {
    id: "numeri",
    q: "Quante persone vedono lo spot?",
    a: "Non lo sappiamo ancora: i numeri sono da misurare e non li stimiamo. Ti diciamo chi frequenta il campo e chi usa l'app.",
  },
  {
    id: "fattura",
    q: "Fate fattura? Si paga online?",
    a: "Contratto e fattura li fa la società. Non c'è nessun pagamento online: ogni accordo passa da una proposta.",
  },
];
