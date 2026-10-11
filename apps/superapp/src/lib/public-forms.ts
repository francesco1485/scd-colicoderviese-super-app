/**
 * Public forms (contacts, registration interest, community, partner/sponsor, safeguarding) depend on R20 actions
 * that are not implemented yet (appsscript.server R20_PLANNED_ACTIONS). Until they are, the forms are replaced by the
 * club's official channels and the server functions never post anything (launch audit 2026-10-12).
 */
import { CLUB_CONTACTS } from "./catalog";
import { CLUB_PROFILE } from "./club-profile";

export const PUBLIC_FORMS_LIVE = false;

export const OFFICIAL_CHANNELS = {
  email: CLUB_PROFILE.contacts.email,
  pec: CLUB_PROFILE.contacts.pec,
  address: CLUB_PROFILE.contacts.address,
} as const;

export type FormKind = "contatti" | "iscrizione" | "community" | "partner" | "safeguarding";

export const PAUSED_COPY: Readonly<Record<FormKind, { title: string; text: string; subject: string }>> = {
  contatti: { title: "Scrivici", text: "Per domande, informazioni e richieste scrivi alla segreteria: rispondiamo dalla casella ufficiale della società.", subject: "Richiesta informazioni" },
  iscrizione: { title: "Vuoi giocare con noi?", text: "Scrivi alla segreteria con nome del ragazzo o della ragazza, anno di nascita e un recapito: ti contattiamo per una prova e per l'iscrizione.", subject: "Iscrizione / prova" },
  community: { title: "Racconta la tua partita", text: "Foto, risultati e racconti dei tifosi li raccogliamo per e-mail. Niente volti o nomi di minori senza il consenso della famiglia.", subject: "Community" },
  partner: { title: "Diventa partner", text: "Per sponsorizzazioni e forniture scrivi alla società: ti mandiamo le proposte e fissiamo un incontro.", subject: "Partnership" },
  safeguarding: { title: "Segnalazioni safeguarding", text: "Il modulo riservato dell'app non è ancora attivo. Per una segnalazione scrivi alla PEC della società con l'oggetto indicato qui sotto: la legge solo il referente safeguarding.", subject: CLUB_CONTACTS.safeguardingSubject },
};

export function mailtoFor(kind: FormKind): string {
  const to = kind === "safeguarding" ? OFFICIAL_CHANNELS.pec : OFFICIAL_CHANNELS.email;
  return `mailto:${to}?subject=${encodeURIComponent(PAUSED_COPY[kind].subject)}`;
}

export const PAUSED_OUTCOME = {
  ok: false as const,
  delivered: false as const,
  reference: null,
  status: "non_inviata",
  message: `Il modulo online non è ancora attivo: nulla è stato inviato. Scrivi a ${OFFICIAL_CHANNELS.email}.`,
};
