/**
 * Opens the app chat (SkyChat) from a page button. Since UD-121 there is one chat, Vera: a face card ("Chiedi a Vera"
 * on the Club House, sponsor or tournaments card) opens it with its area as context. SkyChat and the server both
 * re-check the area with assistant.ts resolveChat, so a younger member gets Sky and a page where the area is not
 * allowed gets Vera's general chat.
 *
 * Backward compatibility: older pages and links sent `{ persona: "<area or genny>" }` and the window events
 * "genny:open" / "crovi:open"; they are still understood (openedArea, SkyChat listeners) and map to Vera.
 */
import { normalizeChatArea, type ChatAreaId } from "./assistant";

export const ASSISTANT_OPEN_EVENT = "assistant:open";

/** Window events that open Vera's general chat: "vera:open" plus the legacy names of the same chat. */
export const VERA_OPEN_EVENTS = ["vera:open", "genny:open", "crovi:open"] as const;

export interface AssistantOpenDetail {
  /** Area of Vera's chat asked by the page; null opens the general chat (Crovi on public pages, UD-184). */
  area: ChatAreaId | null;
  /** First message sent as soon as the chat opens (Crovi's home card: input and chips, UD-184). */
  text?: string;
}

/** Longest first message a page may send (same cap as the chat input, assistant.ts MAX_INPUT_CHARS). */
const MAX_OPEN_TEXT = 400;

export function openAssistant(area: ChatAreaId | null = null, text?: string): void {
  if (typeof window === "undefined") return;
  const t = text?.trim().slice(0, MAX_OPEN_TEXT);
  window.dispatchEvent(new CustomEvent<AssistantOpenDetail>(ASSISTANT_OPEN_EVENT, { detail: t ? { area, text: t } : { area } }));
}

/** First message carried by an open event (trimmed, capped); null when absent or empty. */
export function openedText(e: Event): string | null {
  const d = (e as CustomEvent<{ text?: unknown } | null>).detail;
  if (!d || typeof d !== "object" || typeof d.text !== "string") return null;
  const t = d.text.trim().slice(0, MAX_OPEN_TEXT);
  return t || null;
}

/**
 * Area carried by an open event: `detail.area`, or the legacy `detail.persona` of UD-114 ("genny", a tip-only
 * character or an area id). Null when absent, malformed, or not a chat area.
 */
export function openedArea(e: Event): ChatAreaId | null {
  const d = (e as CustomEvent<{ area?: unknown; persona?: unknown } | null>).detail;
  if (!d || typeof d !== "object") return null;
  return normalizeChatArea(d.area ?? d.persona);
}
