/**
 * Requests engine (UD-044, UD-045): anyone can describe a need in plain words
 * ("manca il detersivo in lavanderia", "spogliatoio 2 senza acqua calda",
 * "serve un altro pulmino sabato") and the club routes it to the right area.
 *
 * Pure functions: classify the text, say who handles it, list what is still
 * missing to act. Persisting the request and notifying people needs the identity
 * elevator; until then the engine prepares a complete, ready-to-send message.
 */

export type RequestArea =
  | "club-house" // cleaning, laundry, bar, kitchens
  | "magazzino" // kit and materials
  | "impianti" // pitches, lights, changing rooms, maintenance
  | "pulmini" // transport
  | "segreteria" // documents, registrations, variations
  | "tesoreria" // fees, payments, receipts
  | "infermeria" // appointments, first aid
  | "eventi" // tournaments and events
  | "sponsor" // partners and commercial
  | "direzione"; // anything that needs a decision

export type RequestKind = "materiali" | "guasto" | "variazione" | "informazione" | "segnalazione" | "proposta";
export type Urgency = "alta" | "normale";

export interface ClassifiedRequest {
  area: RequestArea;
  kind: RequestKind;
  urgency: Urgency;
  /** Clean one-line summary for the handler. */
  summary: string;
  /** Who handles it, in club words. */
  handler: string;
  /** What the requester still has to tell us before anyone can act. */
  missing: string[];
  /** True when the text is too vague to route (we ask a question instead). */
  unclear: boolean;
}

const AREA_RULES: Array<{ area: RequestArea; re: RegExp; handler: string }> = [
  { area: "club-house", re: /lavander|pulizi|detersiv|sapone|carta igienic|bar\b|cucin|club ?house|bidon|spazzatur|rifiut/i, handler: "Responsabile Club House, pulizie e lavanderia" },
  { area: "magazzino", re: /magazzin|kit|magli|divis|pallon|pettorin|conett|cinesin|materiale sportiv|borsa medic/i, handler: "Responsabile magazzino e materiali" },
  { area: "pulmini", re: /pulmin|autist|trasport|navett|passagg/i, handler: "Responsabile servizio pulmini" },
  { area: "infermeria", re: /infermer|medic|visit|certificat|ghiaccio|fisioterap|infortun/i, handler: "Infermeria e medico sociale" },
  { area: "tesoreria", re: /quot|pagament|ricevut|rimbors|fattur|bonific|cass[ae]\b/i, handler: "Tesoreria" },
  { area: "eventi", re: /torneo|evento|festa|cena|memorial|christmas/i, handler: "Responsabile eventi" },
  { area: "sponsor", re: /sponsor|partner|led|cartellon|convenzion/i, handler: "Area commerciale (SCD GROW)" },
  { area: "impianti", re: /spogliato|campo|luci|faro|illumin|docc|acqua cald|riscald|erba|porta\b|rete\b|recinzion|cancell|tribun|manutenz|rott|guast|non funzion/i, handler: "Responsabile impianti" },
  { area: "segreteria", re: /segreter|document|tesser|iscri|variazion|orario|modul|firma|pec\b|comunicat/i, handler: "Segreteria" },
];

const KIND_RULES: Array<{ kind: RequestKind; re: RegExp }> = [
  { kind: "guasto", re: /rott|guast|non funzion|non va|bloccat|perd(e|ita)|allagat|spent|senza (acqua|luce|corrente|riscaldamento)|manca (la |l')?(luce|acqua|corrente)/i },
  { kind: "materiali", re: /manc|finit|serv(e|ono)|ordin|comprar|acquist|esaurit|scort|rifornim/i },
  { kind: "variazione", re: /variazion|spost|cambi|anticip|posticip|annull|rinvi|aggiung|togli|rimuov/i },
  { kind: "proposta", re: /propon|propor|propost|idea|si potrebbe|sarebbe bello|suggerisc/i },
  { kind: "informazione", re: /\?|come (si |faccio|posso)|quando|dove|quanto cost|info/i },
  { kind: "segnalazione", re: /segnal|problem|disservizi|lamentel|sporc|disordin|rumore/i },
];

const URGENT = /urgent|subito|oggi|stasera|domani|pericol|bambin.*(rischio|pericolo)|allagat|senza corrente|senza luce|fuga di gas/i;

function clean(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** Capitalised summary of at most ~120 characters, without the trailing punctuation. */
function summarize(text: string): string {
  const t = clean(text).replace(/[.!?]+$/, "");
  const s = t.length > 120 ? `${t.slice(0, 117)}…` : t;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function classifyRequest(text: string): ClassifiedRequest {
  const t = clean(text);
  const areaHit = AREA_RULES.find((r) => r.re.test(t));
  const kindHit = KIND_RULES.find((r) => r.re.test(t));
  const area: RequestArea = areaHit?.area ?? "direzione";
  let kind: RequestKind = kindHit?.kind ?? "segnalazione";
  // Transport "needs" are runs and drivers, not goods: they are variations of the plan.
  if (area === "pulmini" && kind === "materiali") kind = "variazione";
  const unclear = t.length < 8 || (!areaHit && !kindHit);
  const urgency: Urgency = URGENT.test(t) ? "alta" : "normale";

  const missing: string[] = [];
  if (kind === "guasto" || kind === "segnalazione") {
    if (!/spogliato|campo [12]|sp[1-4]|cucin|bar|lavander|magazzin|tribun|ingress|parchegg|club ?house|dervio|colico/i.test(t)) missing.push("dove esattamente (campo, spogliatoio, locale)");
  }
  if (kind === "materiali") {
    if (!/\d/.test(t)) missing.push("quanti pezzi o confezioni");
    if (!/entro|per (il|sabato|domenica|lunedì|martedì|mercoledì|giovedì|venerdì)|urgent|subito|oggi|domani/i.test(t)) missing.push("per quando");
  }
  if (kind === "variazione") {
    if (!/\d{1,2}[:.]\d{2}|\d{1,2}\/\d{1,2}|lunedì|martedì|mercoledì|giovedì|venerdì|sabato|domenica/i.test(t)) missing.push("giorno e orario interessati");
    if (area === "pulmini" && !/squadr|u\d{2}|20\d{2}|pulcin|esordient|primi calci|piccoli amici|prima|juniores/i.test(t)) missing.push("quale squadra");
  }

  return {
    area,
    kind,
    urgency,
    summary: summarize(t),
    handler: areaHit?.handler ?? "Direzione",
    missing,
    unclear,
  };
}

export const KIND_LABEL: Record<RequestKind, string> = {
  materiali: "richiesta materiali",
  guasto: "guasto o disservizio",
  variazione: "richiesta di variazione",
  informazione: "informazione",
  segnalazione: "segnalazione",
  proposta: "proposta",
};

/** Message ready for the handler (used until requests are stored in the app). */
export function requestMessage(r: ClassifiedRequest, from = "un tesserato"): string {
  const lines = [
    `${KIND_LABEL[r.kind].charAt(0).toUpperCase() + KIND_LABEL[r.kind].slice(1)} per ${r.handler}`,
    `Da: ${from}`,
    `Urgenza: ${r.urgency}`,
    `Richiesta: ${r.summary}`,
  ];
  if (r.missing.length) lines.push(`Da precisare: ${r.missing.join("; ")}`);
  return lines.join("\n");
}

/** Where the area lives in the app (work areas are gated; public pages otherwise). */
export function areaPath(area: RequestArea): string {
  switch (area) {
    case "club-house":
      return "/tesoreria/club-house";
    case "impianti":
      return "/gestionale/impianti";
    case "eventi":
      return "/eventi";
    case "sponsor":
      return "/sponsor";
    default:
      return `/${area}`;
  }
}
