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

/**
 * mailto link of the official channel. `topic` (e.g. the listino package chosen on /sponsor) is appended to the subject
 * and `body` prefills the message; both are ignored for safeguarding, whose subject must stay exactly as published.
 */
export function mailtoFor(kind: FormKind, extra: { topic?: string | undefined; body?: string | undefined } = {}): string {
  const to = kind === "safeguarding" ? OFFICIAL_CHANNELS.pec : OFFICIAL_CHANNELS.email;
  const base = PAUSED_COPY[kind].subject;
  if (kind === "safeguarding") return `mailto:${to}?subject=${encodeURIComponent(base)}`;
  const subject = extra.topic ? `${base} · ${extra.topic}` : base;
  const body = extra.body ? `&body=${encodeURIComponent(extra.body)}` : "";
  return `mailto:${to}?subject=${encodeURIComponent(subject)}${body}`;
}

/**
 * How a prospective athlete joins, in one sentence, consistent with whether the online pre-registration is live
 * (Direzione 14/10: /entra must not promise a form that is switched off).
 */
export const JOIN_INVITE = PUBLIC_FORMS_LIVE
  ? "Compila la pre-iscrizione: nessun tesseramento automatico, la segreteria ti ricontatta per una prova o l'open day."
  : `Scrivi alla segreteria (${CLUB_PROFILE.contacts.email}) con nome, anno di nascita e un recapito: ti ricontattiamo per una prova o l'open day.`;

export const PAUSED_OUTCOME = {
  ok: false as const,
  delivered: false as const,
  reference: null,
  status: "non_inviata",
  message: `Il modulo online non è ancora attivo: nulla è stato inviato. Scrivi a ${OFFICIAL_CHANNELS.email}.`,
};
