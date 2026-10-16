/**
 * The fixed "how the app works" answer of the chat (Francesco 16/10/2026 13:10, "ok meno risposte fisse").
 *
 * Before: the chat answered every message containing "come funziona", "guida" or "a cosa serve" with the app guide, in
 * the browser, before the server: a parent asking "come funziona il primo allenamento di prova?" got the app guide.
 * Now the fixed answer is kept only for explicit questions about the app or about logging in / signing up
 * (isExplicitAppQuestion). Every other question goes to the model with the club context; when the AI is off or fails,
 * the legacy wide match (isLegacyAppHelp) still gives the guide, so the behaviour without the key is unchanged.
 * Safety (distress, safeguarding, requests) is always checked first by the caller (assistant.server.ts).
 */
import type { SkyReply } from "./sky.functions";

/** The app itself, named explicitly ("l'app", "applicazione", "super app"). */
const APP_WORD_RE = /\b(app|applicazione|super ?app)\b/i;
/** How-to words that, next to the app, make an app-help question. */
const APP_HOW_RE = /come funziona|come (si )?usa|come (la |lo )?uso|come si scarica|come (la |lo )?scarico|a cosa serve|guida|istruzioni|tutorial/i;
/** Login and sign-up of the app account (never the club registration of an athlete: that is "iscrizione"). */
const ACCOUNT_RE =
  /\b(come (mi |ci )?registr\w*|registrarmi|registrarsi|come (faccio ad? |posso |si fa ad? |devo )?(accedere|fare (il )?login|loggarmi|entrare con (la mia |l')?e-?mail)|accedere all'?\s?(app|area)|entrare nell'?\s?(app|area riservata)|accesso all'?\s?(app|area)|non riesco ad? (accedere|entrare|fare (il )?login)|(ho )?dimenticato la password|recuper\w* (la )?password|login)\b/i;

/** Explicit questions about the app or its account: the fixed guide answers them, with or without AI. */
export function isExplicitAppQuestion(message: string): boolean {
  return (APP_WORD_RE.test(message) && APP_HOW_RE.test(message)) || ACCOUNT_RE.test(message);
}

/** The wide match of the old browser rule: used only when the model is off or fails (behaviour without the key). */
export function isLegacyAppHelp(message: string): boolean {
  return /come funziona|guida|a cosa serve/i.test(message);
}

export const APP_HELP_REPLY: SkyReply = {
  text: "L'app è il punto unico del club: calendario e risultati aperti a tutti, aree riservate per famiglie, atleti e staff dopo l'accesso. La guida spiega ogni sezione passo per passo.",
  mood: "info",
  links: [
    { label: "Come funziona l'app", to: "/guida" },
    { label: "Entra o registrati", to: "/entra" },
  ],
};

export function appHelpReply(): SkyReply {
  return { ...APP_HELP_REPLY, links: APP_HELP_REPLY.links!.map((l) => ({ ...l })) };
}
