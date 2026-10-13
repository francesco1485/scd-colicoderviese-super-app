/**
 * "I consigli di Genny": general, evidence-based healthy habits for young athletes (hydration,
 * what kind of snack before and after training, breakfast, variety, sleep). Fixed copy reviewed
 * against the content rules of the cast (Direzione 13/10/2026):
 * - no numbers, quantities or targets (minors), no personal plans, no body-weight topics;
 * - no medical advice: for specific needs the family talks to the paediatrician or the doctor.
 * `tipProblems` is the guard the tests run on every tip; new copy must pass it.
 */

export interface GennyTip {
  id: string;
  title: string;
  text: string;
}

export const GENNY_TIPS: readonly GennyTip[] = [
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

export const GENNY_DISCLAIMER =
  "Consigli generali, per esigenze specifiche rivolgiti al pediatra o al medico.";

/** Words that never appear in Genny's tips (no plans, no body-weight talk, no supplements). */
const FORBIDDEN = /\b(dieta|diete|peso|pesi|pesarsi|calorie|caloria|calorico|dimagr\w*|grammi|chili|kg|integrator\w*|digiun\w*)\b/i;

/** Problems of one tip text; empty when it respects the rules. */
export function tipProblems(text: string): string[] {
  const out: string[] = [];
  if (/\d/.test(text)) out.push("contains digits");
  const hit = FORBIDDEN.exec(text);
  if (hit) out.push(`forbidden word: ${hit[0]}`);
  return out;
}
