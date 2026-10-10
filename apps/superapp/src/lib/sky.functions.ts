/** Sky: router di intenti pubblici. Risponde solo con dati reali o indirizza. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { CLUB_CONTACTS } from "./catalog";

type M = { casa?: string; ospite?: string; golCasa?: number; golOspite?: number; dataLabel?: string; data?: string };

export type SkyReply = {
  text: string;
  mood: "info" | "success" | "alert";
  links?: { label: string; to: string }[];
};

const INTENTS: { id: string; re: RegExp }[] = [
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

export const askSky = createServerFn({ method: "POST" })
  .inputValidator((d: { message: string }) => z.object({ message: z.string().trim().min(1).max(400) }).parse(d))
  .handler(async ({ data }): Promise<SkyReply> => {
    const intent = INTENTS.find((i) => i.re.test(data.message))?.id;
    const syncing = "Il dato non è ancora sincronizzato dal gestionale: appena disponibile lo trovi in Home.";

    if (intent === "allenamenti") {
      // Solo indirizzamento al quadro pubblico: nessun orario affermato in chat.
      const { loadQuadro, findSessions, normalizeGroupText } = await import("./public-snapshots");
      const { slots } = loadQuadro();
      const year = data.message.match(/(?<!\d)20[0-2]\d(?!\d)/)?.[0];
      const cat = normalizeGroupText(data.message).match(/\bu\d{2}\b|prima squadra|juniores/)?.[0];
      const key = year ?? cat;
      if (key && findSessions(slots, key).length) return { text: `Orari e campi lun–ven per "${key.toUpperCase()}" sono nel quadro allenamenti pubblico.`, mood: "info", links: [{ label: `Allenamenti ${key.toUpperCase()}`, to: `/allenamenti?annata=${encodeURIComponent(key)}` }] };
      return { text: key ? `Non trovo "${key}" nel quadro allenamenti: cerca la tua categoria nella pagina.` : "Il quadro allenamenti lun–ven è consultabile per annata o categoria.", mood: "info", links: [{ label: "Quadro allenamenti", to: "/allenamenti" }] };
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
        return { text: "Vuoi giocare con noi? Compila la pre-iscrizione: la segreteria ti ricontatta per prova o open day.", mood: "success", links: [{ label: "Entra nella SCD", to: "/entra" }] };
      case "sponsor":
        return { text: "Pacchetti, asset e richiesta proposta sono nel Commercial Hub.", mood: "success", links: [{ label: "Diventa sponsor", to: "/sponsor" }] };
      case "eventi":
        return { text: "Gli eventi pubblicati dalla società sono nella pagina Eventi.", mood: "info", links: [{ label: "Eventi", to: "/eventi" }] };
      case "shop":
        return { text: "Lo shop ufficiale è in preparazione: nessun acquisto attivo per ora.", mood: "info", links: [{ label: "Shop & membership", to: "/shop" }] };
      case "dove":
        return { text: `Siamo a ${CLUB_CONTACTS.sede}.`, mood: "info", links: [{ label: "Parla con noi", to: "/contatti" }] };
      case "squadre":
        return { text: "Dalla scuola calcio alla Prima Squadra: scegli categoria e annata nella pre-iscrizione.", mood: "info", links: [{ label: "Categorie", to: "/entra" }] };
      case "contatti":
        return { text: "Scegli la categoria giusta e apri un ticket: arriva alla persona corretta.", mood: "info", links: [{ label: "Centro contatti", to: "/contatti" }] };
      default:
        return {
          text: "Posso aiutarti con: prossima partita, ultimo risultato, calendario, iscrizioni, sponsor, eventi, shop, dove siamo, contatti e safeguarding.",
          mood: "info",
        };
    }
  });
