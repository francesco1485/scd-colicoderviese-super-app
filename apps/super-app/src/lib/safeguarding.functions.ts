/**
 * Canale Safeguarding: modulo e server function SEPARATI dal CRM, dalla
 * community e dai ticket ordinari. Destinazione unica: safeguarding.submit.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { SubmitOutcome } from "./club.types";

const schema = z
  .object({
    ruolo: z.enum(["coinvolto", "testimone", "genitore", "altro"]),
    fatti: z.string().trim().min(20, "Descrivi i fatti (almeno 20 caratteri)").max(6000),
    luogoPeriodo: z.string().trim().max(300).optional().default(""),
    persone: z.string().trim().max(1000).optional().default(""),
    testimoni: z.string().trim().max(1000).optional().default(""),
    allegati: z.string().trim().max(1000).optional().default(""),
    urgente: z.boolean().default(false),
    anonimo: z.boolean().default(false),
    nome: z.string().trim().max(120).optional().default(""),
    contatto: z.string().trim().max(160).optional().default(""),
  })
  .refine((d) => d.anonimo || d.contatto.length >= 5, {
    message: "Indica un recapito oppure scegli l'invio senza recapito",
    path: ["contatto"],
  });

export const submitSafeguarding = createServerFn({ method: "POST" })
  .inputValidator((d: z.input<typeof schema>) => schema.parse(d))
  .handler(async ({ data }): Promise<SubmitOutcome> => {
    const { r20 } = await import("./appsscript.server");
    const payload = data.anonimo ? { ...data, nome: "", contatto: "" } : data;
    const res = await r20.planned<{ reference?: string }>("safeguarding.submit", {
      ...payload,
      channel: "safeguarding",
    });
    // Nessun log del contenuto: dati sensibili.
    if (res.ok) {
      return {
        ok: true,
        delivered: true,
        reference: res.data?.reference ?? null,
        status: "ricevuta_riservata",
        message: "Segnalazione ricevuta in modo riservato dal referente safeguarding.",
      };
    }
    return {
      ok: false,
      delivered: false,
      reference: null,
      status: "non_inviata",
      message:
        "Il canale digitale riservato non è ancora attivo sul gestionale e la segnalazione NON è stata salvata. Usa subito la PEC indicata qui sotto.",
    };
  });
