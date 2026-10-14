/** Sky: router di intenti pubblici. Risponde solo con dati reali o indirizza. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { detectDistress, distressReferral } from "./cast-safety";
import { CLUB_CONTACTS } from "./catalog";
import { JOIN_INVITE } from "./public-forms";
import { KIND_LABEL, areaPath, classifyRequest, requestMessage } from "./requests";

type M = { casa?: string; ospite?: string; golCasa?: number; golOspite?: number; dataLabel?: string; data?: string };

export type SkyReply = {
  text: string;
  mood: "info" | "success" | "alert";
  links?: { label: string; to: string }[];
  /** r99: true when the text was written by the AI assistant (the chat shows the AI notice). */
  ai?: boolean;
};

/** Plain-words needs and problems (UD-045): routed by the requests engine before the public intents. */
export const REQUEST_RE = /\b(manca|mancano|finit[oaie]|servono|serve (un|una|altro|altra|il|la|più)|rott[oaie]|guast[oaie]|non funziona|senza (acqua|luce|corrente|riscaldamento)|disservizi|segnal[oa]|propong[oa]|proporre|richiesta|richiedo|vorrei (chiedere|proporre|segnalare)|aggiung(ere|ete)|spost(are|iamo)|cambi(are|amo)|sporc[oaie])\b/i;

export const INTENTS: { id: string; re: RegExp }[] = [
  { id: "safeguarding", re: /safeguard|abus|molest|violen|bullism|riservat/i },
  { id: "allenamenti", re: /allenament|allena|quadro|seduta/i },
  { id: "prossima", re: /prossim|quando (si )?gioca|partita|gara/i },
  { id: "risultato", re: /risultat|finit|punteggio|ultima/i },
  { id: "calendario", re: /calendar|programma|giornat/i },
  { id: "iscrizione", re: /iscri|tessera|giocare|prova|open day/i },
  { id: "sponsor", re: /sponsor|partner|pubblicit|azienda/i },
  { id: "eventi", re: /event|torneo|festa|cena/i },
  { id: "shop", re: /shop|negozio|maglia|merch|acquist/i },
  { id: "dove", re: /dove|indirizz|campo|mappa|arrivare/i },
  { id: "squadre", re: /squadr|categori|annat|giovanil|scuola calcio/i },
  { id: "contatti", re: /contatt|email|telefon|segreteri|parla/i },
];

/** Intent id of a message for the rules engine (undefined = no intent). */
export function skyIntent(message: string): string | undefined {
  return INTENTS.find((i) => i.re.test(message))?.id;
}

/**
 * The keyword rules engine (no AI). Used by askSky and as the fallback / pre-router of the AI assistants
 * (assistant.server.ts): distress, safeguarding and requests are always answered here, never by the model.
 */
export async function skyRulesAnswer(data: { message: string }): Promise<SkyReply> {
    // Distress first (UD-111, cast-safety.ts): a fixed referral to real people, never therapy, never a request.
    const distress = detectDistress(data.message);
    if (distress) return distressReferral(distress);
    const intent = skyIntent(data.message);
    if (intent !== "safeguarding" && REQUEST_RE.test(data.message)) {
      const r = classifyRequest(data.message);
      if (r.unclear) return { text: "Dimmi in due parole cosa serve e dove (per esempio: \"manca il sapone in lavanderia\" oppure \"spogliatoio 2 senza acqua calda\").", mood: "info" };
      const ask = r.missing.length ? ` Per sistemarla mi manca: ${r.missing.join("; ")}.` : "";
      const urgent = r.urgency === "alta" ? " La segno come urgente." : "";
      return {
        text: `Ho capito: ${KIND_LABEL[r.kind]} per ${r.handler}.${urgent}${ask} Finché l'accesso con il tuo ruolo non è attivo, copia questo testo e mandalo alla segreteria:\n\n${requestMessage(r)}`,
        mood: r.urgency === "alta" ? "alert" : "success",
        links: [{ label: "Area di competenza", to: areaPath(r.area) }, { label: "Contatti segreteria", to: "/contatti" }],
      };
    }
    const syncing = "Il dato non è ancora sincronizzato dal gestionale: appena disponibile lo trovi in Home.";

    if (intent === "allenamenti") {
      // Solo indirizzamento al quadro allenamenti, che è nell'area soci (UD-100): nessun orario affermato in chat.
      const { findSessions, normalizeGroupText } = await import("./public-snapshots");
      const { loadQuadro } = await import("./quadro-data.server");
      const { slots } = loadQuadro();
      const year = data.message.match(/(?<!\d)20[0-2]\d(?!\d)/)?.[0];
      const cat = normalizeGroupText(data.message).match(/\bu\d{2}\b|prima squadra|juniores/)?.[0];
      const key = year ?? cat;
      if (key && findSessions(slots, key).length) return { text: `Orari e campi lun–ven per "${key.toUpperCase()}" sono nel quadro allenamenti dell'area soci: entra con il tuo account.`, mood: "info", links: [{ label: `Allenamenti ${key.toUpperCase()}`, to: `/allenamenti?annata=${encodeURIComponent(key)}` }] };
      return { text: key ? `Non trovo "${key}" nel quadro allenamenti: cerca la tua categoria nella pagina.` : "Il quadro allenamenti lun–ven è nell'area soci: entra e cerca la tua annata o categoria.", mood: "info", links: [{ label: "Quadro allenamenti", to: "/allenamenti" }] };
    }
    if (intent === "prossima" || intent === "calendario") {
      // Il calendario pubblico esiste: indirizza lì, senza affermare orari o avversari non letti.
      const { loadCalendar, resolveAnnata } = await import("./public-snapshots");
      const year = data.message.match(/(?<!\d)20[0-2]\d(?!\d)/)?.[0];
      const g = year ? resolveAnnata(loadCalendar().groups, year) : null;
      if (g) return { text: `Le gare dell'annata ${year} (${g.label}) sono nel calendario pubblico, con casa/trasferta e sede.`, mood: "info", links: [{ label: `Calendario ${year}`, to: `/calendario?annata=${year}` }] };
      return {
        text: year ? `Non trovo l'annata ${year} nel calendario pubblico: scegli la tua annata dalla pagina.` : "Date, orari e sedi delle gare sono nel calendario pubblico: scegli la tua annata.",
        mood: "info", links: [{ label: "Calendario gare", to: "/calendario" }],
      };
    }
    if (intent === "risultato") {
      const { r20 } = await import("./appsscript.server");
      const res = await r20.call<{ next?: M; last?: M; prossima?: M; ultimo?: M }>("public.match");
      const m = res.ok ? (res.data?.last ?? res.data?.ultimo) : null;
      if (!m?.casa) return { text: syncing, mood: "alert", links: [{ label: "Vai alla Home", to: "/" }] };
      const score = ` ${m.golCasa ?? "-"}-${m.golOspite ?? "-"}`;
      return { text: `${m.casa} – ${m.ospite}${score}${m.dataLabel || m.data ? ` · ${m.dataLabel ?? m.data}` : ""}`, mood: "info" };
    }
    switch (intent) {
      case "safeguarding":
        return {
          text: `Per la tua tutela non raccolgo segnalazioni in chat. Usa il canale riservato oppure la PEC ${CLUB_CONTACTS.pec} con oggetto "${CLUB_CONTACTS.safeguardingSubject}". In caso di pericolo immediato chiama il 112.`,
          mood: "alert",
          links: [{ label: "Canale Safeguarding", to: "/safeguarding" }],
        };
      case "iscrizione":
        return { text: `Vuoi giocare con noi? ${JOIN_INVITE}`, mood: "success", links: [{ label: "Entra nella SCD", to: "/entra" }] };
      case "sponsor":
        return { text: "Pacchetti, asset e richiesta proposta sono nel Commercial Hub.", mood: "success", links: [{ label: "Diventa sponsor", to: "/sponsor" }] };
      case "eventi":
        return { text: "Gli eventi pubblicati dalla società sono nella pagina Eventi.", mood: "info", links: [{ label: "Eventi", to: "/eventi" }] };
      case "shop":
        return { text: "Lo shop ufficiale è in preparazione: nessun acquisto attivo per ora.", mood: "info", links: [{ label: "Shop & membership", to: "/shop" }] };
      case "dove":
        return { text: `Siamo a ${CLUB_CONTACTS.sede}.`, mood: "info", links: [{ label: "Parla con noi", to: "/contatti" }] };
      case "squadre":
        return { text: "Dalla scuola calcio alla Prima Squadra: categorie e annate sono nella pagina Entra nella SCD.", mood: "info", links: [{ label: "Categorie", to: "/entra" }] };
      case "contatti":
        return { text: "Scegli la categoria giusta e apri un ticket: arriva alla persona corretta.", mood: "info", links: [{ label: "Centro contatti", to: "/contatti" }] };
      default:
        return {
          text: "Posso aiutarti con: prossima partita, ultimo risultato, calendario, iscrizioni, sponsor, eventi, shop, dove siamo, contatti e safeguarding.",
          mood: "info",
        };
    }
}

export const askSky = createServerFn({ method: "POST" })
  .inputValidator((d: { message: string }) => z.object({ message: z.string().trim().min(1).max(400) }).parse(d))
  .handler(async ({ data }): Promise<SkyReply> => skyRulesAnswer(data));
