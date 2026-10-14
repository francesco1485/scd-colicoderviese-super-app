/**
 * "I consigli di Era", la nutrizionista del club (Direzione 14/10/2026: Era = Nutrizionista, UD-111; since UD-121 a
 * "consiglio del giorno" only, no chat). General, evidence-based healthy habits for young athletes (hydration, what kind of snack before and
 * after training, breakfast, variety, sleep) and one "consiglio del giorno" chosen by the Rome date.
 * Fixed copy reviewed against the content rules of the cast:
 * - no numbers, quantities or targets (minors), no personal plans, no body-weight topics;
 * - no medical advice: for specific needs the family talks to the paediatrician or the doctor.
 * `tipProblems` is the guard the tests run on every tip; new copy must pass it.
 */

export interface NutritionTip {
  id: string;
  title: string;
  text: string;
}

export const ERA_TIPS: readonly NutritionTip[] = [
  {
    id: "acqua",
    title: "Bevi spesso, non solo quando hai sete",
    text: "Porta sempre la borraccia: bevi prima, nelle pause e dopo l'allenamento. L'acqua basta; bibite zuccherate ed energy drink non servono.",
  },
  {
    id: "prima",
    title: "Prima dell'allenamento, qualcosa di leggero",
    text: "Se hai fame poco prima, scegli cibi facili da digerire: un frutto, pane o crackers, uno yogurt. Fritti e cibi pesanti lasciali per un'altra volta.",
  },
  {
    id: "dopo",
    title: "Dopo, ricarica le energie",
    text: "Finito lo sport va bene uno spuntino come latte o yogurt, un panino o della frutta; poi a casa un pasto completo con pasta, pane o riso, proteine e verdure.",
  },
  {
    id: "colazione",
    title: "La colazione è il primo allenamento",
    text: "Non saltarla: latte o yogurt, pane o cereali e un frutto ti danno la carica per la scuola e per il campo.",
  },
  {
    id: "colori",
    title: "Mangia a colori",
    text: "Varia ogni giorno: frutta e verdura di colori diversi, legumi, pesce, carne, uova e latticini. Nessun cibo è magico e nessuno è proibito.",
  },
  {
    id: "sonno",
    title: "Dormi bene, si cresce anche così",
    text: "Il riposo fa parte dell'allenamento: orari regolari e schermi spenti un po' prima di dormire aiutano il corpo a recuperare.",
  },
];

export const ERA_DISCLAIMER =
  "Consigli generali della nutrizionista del club, mai piani personali: per esigenze specifiche rivolgiti al pediatra o al medico.";

/** Words that never appear in Era's tips (no plans, no body-weight talk, no supplements). */
const FORBIDDEN =
  /\b(dieta|diete|peso|pesi|pesarsi|calorie|caloria|calorico|dimagr\w*|grammi|chili|kg|integrator\w*|digiun\w*|piano alimentare|bmi)\b/i;

/** Problems of one tip text; empty when it respects the rules. */
export function tipProblems(text: string): string[] {
  const out: string[] = [];
  if (/\d/.test(text)) out.push("contains digits");
  const hit = FORBIDDEN.exec(text);
  if (hit) out.push(`forbidden word: ${hit[0]}`);
  return out;
}

/** Calendar day in Europe/Rome (YYYY-MM-DD): server and browser pick the same daily tip. */
export function romeDay(at: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

/**
 * One item per day, the same for everybody on that day, every item once per cycle (days since the epoch modulo the
 * list length). Shared by Era's and Dottor Acanfora's "consiglio del giorno".
 */
export function dailyPick<T>(items: readonly T[], day: string): T {
  if (items.length === 0) throw new Error("dailyPick: empty list");
  const days = Math.floor(Date.parse(`${day}T12:00:00Z`) / 86_400_000);
  const i = ((days % items.length) + items.length) % items.length;
  return items[i] as T;
}
