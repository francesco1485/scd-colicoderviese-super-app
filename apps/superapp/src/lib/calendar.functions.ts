import { createServerFn } from "@tanstack/react-start";

import { sessionView } from "./auth.functions";
import { calendarFor } from "./public-access";

/**
 * Calendario: copia Drive validata (cache 5 min), ultima copia validata in memoria, oppure copia di sicurezza
 * inclusa. refresh=true forza un controllo, limitato a uno ogni 30 s.
 * UD-100 (Direzione 13/10/2026): senza accesso solo le gare (data, ora, casa/fuori, campo, squadra, avversario);
 * allenamenti, note e stemmi d'annata restano dentro. I soci collegati ricevono il dato completo.
 */
export const getPublicCalendarSnapshot = createServerFn({ method: "GET" })
  .inputValidator((d: { refresh?: boolean } | undefined) => ({ refresh: d?.refresh === true }))
  .handler(async ({ data }) => {
    const { getCalendar } = await import("./calendar-bridge.server");
    const [r, session] = await Promise.all([getCalendar({ force: data.refresh }), sessionView()]);
    // Il motivo tecnico resta nei log server; al pubblico solo l'origine.
    if (r.reason) console.warn(`[calendario] ${r.origin}: ${r.reason}`);
    return calendarFor(
      { season: r.season, sourceModifiedAt: r.sourceModifiedAt, groups: r.groups, events: r.events, origin: r.origin, throttled: r.throttled === true },
      session,
    );
  });
