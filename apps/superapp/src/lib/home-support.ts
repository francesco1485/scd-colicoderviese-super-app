/**
 * "Sostieni il club" strip of the home (C4, Francesco 14/10/2026: the app must be commercially productive). Three
 * actions that move money to the club, always visible right after "Oggi e questa settimana": become a partner,
 * adopt a seat of the new tribune, donate material. The Lotteria dello sport joins the strip only once the Direzione
 * publishes it (its page stays unlinked before that, UD-115).
 *
 * Pure data and helpers: no prices, no counts, no invented numbers. Every target is an existing public route.
 */

export type SupportEngine = "SPONSOR" | "DONAZIONE" | "INIZIATIVA";

export interface SupportAction {
  id: string;
  label: string;
  hint: string;
  to: string;
  hash?: string;
  engine: SupportEngine;
  /** The one action drawn with the yellow highlight. */
  primary?: boolean;
}

export const SUPPORT_ACTIONS: readonly SupportAction[] = [
  {
    id: "partner",
    label: "Diventa partner",
    hint: "LED wall, maglie, tornei e app: scegli il pacchetto per la tua azienda.",
    to: "/sponsor",
    engine: "SPONSOR",
    primary: true,
  },
  {
    id: "seggiolino",
    label: "Adotta un seggiolino",
    hint: "Un posto della nuova tribuna con il tuo nome o quello della tua famiglia.",
    to: "/sostieni",
    hash: "seggiolino-title",
    engine: "DONAZIONE",
  },
  {
    id: "materiale",
    label: "Dona materiale",
    hint: "Attrezzi per la palestra, arredi per l'infermeria: in buono stato e sicuri.",
    to: "/sostieni",
    hash: "campagne-title",
    engine: "DONAZIONE",
  },
];

export const LOTTERY_ACTION: SupportAction = {
  id: "lotteria",
  label: "Lotteria dello sport",
  hint: "Il ricavato va ai lavori del campo di calcetto della parrocchia.",
  to: "/eventi/lotteria-dello-sport",
  engine: "INIZIATIVA",
};

/** Actions shown on a given day: the three standing ones, plus the lottery only when it is public. */
export function supportActions(opts: { lotteryPublic: boolean }): SupportAction[] {
  return opts.lotteryPublic ? [...SUPPORT_ACTIONS, LOTTERY_ACTION] : [...SUPPORT_ACTIONS];
}
