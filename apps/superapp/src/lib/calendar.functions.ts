import { createServerFn } from "@tanstack/react-start";

/**
 * Calendario pubblico: copia Drive validata (cache 5 min), ultima copia validata in memoria,
 * oppure copia di sicurezza inclusa. refresh=true forza un controllo, limitato a uno ogni 30 s.
 */
export const getPublicCalendarSnapshot = createServerFn({ method: "GET" })
  .inputValidator((d: { refresh?: boolean } | undefined) => ({ refresh: d?.refresh === true }))
  .handler(async ({ data }) => {
    const { getCalendar } = await import("./calendar-bridge.server");
    const r = await getCalendar({ force: data.refresh });
    // Il motivo tecnico resta nei log server; al pubblico solo l'origine.
    if (r.reason) console.warn(`[calendario] ${r.origin}: ${r.reason}`);
    return { season: r.season, sourceModifiedAt: r.sourceModifiedAt, groups: r.groups, events: r.events, origin: r.origin, throttled: r.throttled === true };
  });
