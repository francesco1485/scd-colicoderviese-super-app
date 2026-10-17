/**
 * "Pagine piene" (Francesco 16/10/2026 23:08: «io voglio la performance e la gestione e la creazione, non voglio
 * pagine vuote»). A page or block renders only when it has something real to show or a real action to do; a
 * placeholder ("Nessuna…", "Da attivare", "In arrivo") is never the main content of a block.
 *
 * Pure helpers, no React: the public pages use them to decide whether a block renders.
 */

/** Phrases that announce an absence instead of showing something: a block made only of these does not render. */
const PLACEHOLDER =
  /^(?:nessun[oa]?|non (?:ancora|disponibile|attiv[oa])|da (?:attivare|definire)|in (?:arrivo|preparazione|allestimento)|prossimamente|coming soon|tbd|n\/d)(?![\p{L}\p{N}])/iu;
/** Only dashes, dots or ellipses. */
const PUNCTUATION_ONLY = /^[-–—….\s]+$/u;

/** True when the text is empty or only says that something is missing / will come later. */
export function isPlaceholderText(text: string | null | undefined): boolean {
  const t = (text ?? "").trim();
  return t === "" || PUNCTUATION_ONLY.test(t) || PLACEHOLDER.test(t);
}

/**
 * True when the value has something real to show:
 * - strings: non-empty and not a placeholder phrase;
 * - numbers: finite (zero is a real value; an unknown must be null, never 0);
 * - booleans: true;
 * - arrays: at least one item with content;
 * - plain objects: at least one own value with content.
 * null, undefined, NaN, functions and symbols have no content.
 */
export function hasContent(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return !isPlaceholderText(value);
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.some(hasContent);
  if (typeof value === "object") return Object.values(value as Record<string, unknown>).some(hasContent);
  return false;
}

/** An action a page could offer; `ready` is false while it does not work yet for the person looking. */
export interface PageAction {
  id: string;
  ready: boolean;
}

/** Only the actions that work today, in the given order. */
export function readyActions<T extends PageAction>(actions: readonly T[]): T[] {
  return actions.filter((a) => a.ready);
}

/** Items of a list that have content, by the field that carries it (e.g. the title of a card). */
export function withContent<T>(items: readonly T[] | null | undefined, pick: (item: T) => unknown): T[] {
  return (items ?? []).filter((i) => hasContent(pick(i)));
}
