/**
 * Account deletion request (Google Play account-deletion policy, Apple App Store 5.1.1(v)) — 2026-10-13.
 * Pure helpers shared by the public page /elimina-account and the button in La mia SCD.
 * The request goes to the existing Secretariat work queue (scd_proposals, r79) through
 * scd_account_deletion_request (r96). Nothing is deleted from the client: the Secretariat executes it.
 */
import { CLUB_PROFILE } from "./club-profile";

export const DELETION_EMAIL = CLUB_PROFILE.contacts.email;
export const DELETION_SUBJECT = "Eliminazione account App SCD";
export const DELETION_PATH = "/elimina-account";
/** Maximum time the club gives itself to answer (GDPR art. 12: one month). */
export const DELETION_DAYS = 30;

/** What the Secretariat deletes. */
export const DELETED_ITEMS: readonly { title: string; text: string }[] = [
  {
    title: "Il tuo account",
    text: "l'accesso all'app con la tua e-mail e i ruoli abilitati sul tuo profilo.",
  },
  {
    title: "Squadre che segui",
    text: "l'elenco delle squadre e degli eventi che hai scelto di seguire.",
  },
  {
    title: "Post e foto",
    text: "i post, le foto e le reazioni che hai pubblicato nell'app.",
  },
  {
    title: "Giochi",
    text: "la tua squadra del Fantacalcio SCD, i punti e i voti della Top 11.",
  },
  {
    title: "Avatar e notifiche",
    text: "l'immagine del profilo e l'iscrizione alle notifiche sul telefono.",
  },
];

/** What the club must keep by law even after the deletion. */
export const KEPT_ITEMS: readonly { title: string; text: string }[] = [
  {
    title: "Tesseramento FIGC",
    text: "i dati del tesseramento di atleti, staff e dirigenti, richiesti dalle norme federali.",
  },
  {
    title: "Documenti contabili",
    text: "ricevute, quote e pagamenti, da conservare 10 anni per legge (art. 2220 Codice civile).",
  },
  {
    title: "Storico dei consensi",
    text: "quando hai dato o tolto un consenso, per poter dimostrare di averlo rispettato.",
  },
];

export type DeletionOutcome =
  "RECEIVED" | "ALREADY" | "INVALID" | "BUSY" | "NOT_SIGNED_IN" | "ERROR";

const OUTCOMES: readonly DeletionOutcome[] = [
  "RECEIVED",
  "ALREADY",
  "INVALID",
  "BUSY",
  "NOT_SIGNED_IN",
  "ERROR",
];

export function asDeletionOutcome(v: unknown): DeletionOutcome {
  return typeof v === "string" && (OUTCOMES as readonly string[]).includes(v)
    ? (v as DeletionOutcome)
    : "ERROR";
}

export const DELETION_MESSAGE: Readonly<Record<DeletionOutcome, string>> = {
  RECEIVED: `Richiesta ricevuta. La segreteria controlla che l'account sia tuo e lo elimina entro ${DELETION_DAYS} giorni; ti scrive all'e-mail dell'account quando ha finito.`,
  ALREADY:
    "Hai già una richiesta aperta: la segreteria la sta seguendo. Non serve mandarne un'altra.",
  INVALID: "Controlla nome ed e-mail: servono per trovare il tuo account.",
  BUSY: `In questo momento arrivano molte richieste. Riprova tra qualche minuto oppure scrivi a ${DELETION_EMAIL}.`,
  NOT_SIGNED_IN:
    "Entra con il tuo account per chiedere l'eliminazione dall'app, oppure usa il modulo qui sotto.",
  ERROR: `Invio non riuscito: nulla è stato registrato. Scrivi a ${DELETION_EMAIL} con oggetto "${DELETION_SUBJECT}".`,
};

/** True when the outcome means the request is in the queue (new or already open). */
export const isDelivered = (o: DeletionOutcome) =>
  o === "RECEIVED" || o === "ALREADY";

export interface PublicDeletionInput {
  name: string;
  email: string;
  note: string;
  confirm: boolean;
}

export function validatePublicDeletion(
  i: PublicDeletionInput,
): Partial<Record<keyof PublicDeletionInput, string>> {
  const errors: Partial<Record<keyof PublicDeletionInput, string>> = {};
  const name = i.name.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 120)
    errors.name = "Scrivi nome e cognome.";
  const email = i.email.trim();
  if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email) || email.length > 160)
    errors.email = "Scrivi l'e-mail con cui entri nell'app.";
  if (i.note.length > 300) errors.note = "Massimo 300 caratteri.";
  if (!i.confirm) errors.confirm = "Conferma di voler eliminare l'account.";
  return errors;
}

/** mailto: fallback with the request already written, used when the online queue is not reachable. */
export function deletionMailto(input?: {
  name?: string;
  email?: string;
}): string {
  const lines = [
    "Chiedo l'eliminazione del mio account dell'App S.C.D. ColicoDerviese.",
    input?.name ? `Nome e cognome: ${input.name}` : "Nome e cognome:",
    input?.email
      ? `E-mail dell'account: ${input.email}`
      : "E-mail dell'account:",
  ];
  return `mailto:${DELETION_EMAIL}?subject=${encodeURIComponent(DELETION_SUBJECT)}&body=${encodeURIComponent(lines.join("\n"))}`;
}
