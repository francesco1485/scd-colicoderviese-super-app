/**
 * Opens the app chat (SkyChat) from a page button. With a persona ("Chiedi allo chef", UD-114) the chat asks for that
 * area persona; SkyChat and the server both re-check it with assistant.ts chatPersonaFor, so a younger member or a
 * page where the persona is not allowed simply gets the usual helper (Crovi, Genny or Sky).
 */
import type { PresenceId } from "./cast-personas";

export const ASSISTANT_OPEN_EVENT = "assistant:open";

export interface AssistantOpenDetail {
  /** Area persona asked by the page; "genny" (and no value) opens the usual helper. */
  persona: PresenceId | null;
}

export function openAssistant(persona: PresenceId | null = null): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<AssistantOpenDetail>(ASSISTANT_OPEN_EVENT, { detail: { persona } }));
}

/** Persona carried by an open event (null when absent or malformed). */
export function openedPersona(e: Event): string | null {
  const d = (e as CustomEvent<Partial<AssistantOpenDetail> | null>).detail;
  return d && typeof d.persona === "string" ? d.persona : null;
}
