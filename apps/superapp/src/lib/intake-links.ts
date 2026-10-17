/**
 * Public door of the Vetrina richieste (UD-163, Francesco 16/10/2026 15:44 «Esterni Tally, soci app»): the link of
 * the ONE Tally form "Richieste alla SCD", prefilled with the hidden field `tipo` and a few non-personal hints
 * (tournament id, sponsor package id, site). The form URL comes only from config/scd-requests-intake.v1.json
 * (`intakeTallyFormUrl`); while it is null every link answers "Modulo in preparazione" and points nowhere.
 *
 * Never in the URL: names, e-mails, phones, birth dates, anything typed by a person. Members and families do not use
 * this door (in-app area, phase F2).
 */
import config from "../../../../config/scd-requests-intake.v1.json";

import { INTAKE_KINDS, INTAKE_KIND_LABEL, INTAKE_SLUG, INTAKE_TOURNAMENT_IDS, type IntakeKind, type IntakeSite } from "./intake-kinds";

/** Only a Tally form page, no query string or fragment. */
export const TALLY_FORM_URL_PATTERN = /^https:\/\/tally\.so\/r\/[A-Za-z0-9]{4,12}$/;

/** The configured form URL, or null when missing or not a Tally form page (fail closed). */
export function intakeFormUrl(raw: unknown = (config as { intakeTallyFormUrl?: unknown }).intakeTallyFormUrl): string | null {
  return typeof raw === "string" && TALLY_FORM_URL_PATTERN.test(raw) ? raw : null;
}

export const INTAKE_FORM_PENDING = "Modulo in preparazione";

export interface IntakeLinkHints {
  /** Tournament id of lib/tournaments.ts (only the known ones). */
  torneo?: string | null;
  /** Sponsor package id (slug, as in lib/sponsor-packages.ts). */
  pacchetto?: string | null;
  sede?: IntakeSite | null;
}

export interface IntakeLink {
  kind: IntakeKind;
  label: string;
  /** null while the form is not ready: the UI shows INTAKE_FORM_PENDING and no anchor. */
  href: string | null;
  available: boolean;
}

/** Link to the form branch of a kind. Unknown hints are dropped, never forwarded. */
export function intakeLink(kind: IntakeKind, hints: IntakeLinkHints = {}, formUrl: string | null = intakeFormUrl()): IntakeLink {
  const label = INTAKE_KIND_LABEL[kind];
  if (!formUrl) return { kind, label, href: null, available: false };
  const q = new URLSearchParams({ tipo: INTAKE_SLUG[kind] });
  if (kind === "ISCRIZIONE_TORNEO" && hints.torneo && (INTAKE_TOURNAMENT_IDS as readonly string[]).includes(hints.torneo)) q.set("torneo", hints.torneo);
  if (kind === "SPONSOR" && hints.pacchetto && /^[a-z0-9-]{2,40}$/.test(hints.pacchetto)) q.set("pacchetto", hints.pacchetto);
  if ((kind === "AFFITTO_CAMPO" || kind === "VISITA_CENTRO") && (hints.sede === "COLICO" || hints.sede === "DERVIO")) q.set("sede", hints.sede.toLowerCase());
  return { kind, label, href: `${formUrl}?${q.toString()}`, available: true };
}

/** Public pages where each link belongs (placement on public pages is the CLOUD chat's area, AGENTS.md SCD:SESSIONI). */
export const INTAKE_LINK_PLACES: Readonly<Record<IntakeKind, readonly string[]>> = {
  ISCRIZIONE_TORNEO: ["/tornei", "/eventi/christmas-lario-cup"],
  SPONSOR: ["/sponsor"],
  CONVENZIONE: ["/partner", "/fornitori"],
  AFFITTO_CAMPO: ["/impianti"],
  VISITA_CENTRO: ["/impianti"],
  ALTRO: ["/contatti"],
};

/** Every public link, one per kind (the gestionale lists them to copy and share). */
export function allIntakeLinks(formUrl: string | null = intakeFormUrl()): IntakeLink[] {
  return INTAKE_KINDS.map((k) => intakeLink(k, {}, formUrl));
}
