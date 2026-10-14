/**
 * Safety rule shared by the whole assistant cast (Direzione 14/10/2026, UD-111), born with the "Musica e relax"
 * character: music and breathing help to calm down, but no character of the S.C.D. ColicoDerviese does therapy.
 * When a message shows distress the answer is a fixed referral to real people (family, mister, doctor, a
 * professional, the club's Tutela minori referent) and, for danger, 112. The model never writes it.
 *
 * Used by the rules engine (sky.functions.ts skyRulesAnswer) and by the AI pre-router (assistant.server.ts
 * bypassesModel), so the referral is the same with the AI on or off. Nothing is stored or logged: the message is only
 * matched against the patterns below.
 */
import type { SkyReply } from "./sky.functions";

export type DistressLevel = "danger" | "distress";

/** Word edges that also work after accented letters ("più", "giù"): \b does not. */
const L = "a-zàèéìòóù";
const words = (alternatives: string): RegExp =>
  new RegExp(`(?<![${L}])(?:${alternatives})(?![${L}])`, "i");

/** Self-harm or danger to life: 112 first, an adult now. */
const DANGER_RE = words(
  String.raw`farmi del male|farla finita|suicid\w*|autolesion\w*|tagliarmi|ammazzarmi|uccidermi|non voglio pi[uù] vivere|voglio morire|sparire per sempre`,
);

/** Emotional distress: referral to people, never a therapy path in chat. */
const DISTRESS_RE = words(
  String.raw`ansia|ansios[oaie]|attacc\w* di panico|panico|depress\w*|triste|tristezza|piango|piangere|non ce la faccio pi[uù]|angosci\w*|mi sento (solo|sola|gi[uù]|vuot[oa]|uno schifo|inutile)|nessuno mi capisce|odio me stess[oa]`,
);

/** Distress level of a message, or null. */
export function detectDistress(message: string): DistressLevel | null {
  if (DANGER_RE.test(message)) return "danger";
  if (DISTRESS_RE.test(message)) return "distress";
  return null;
}

export const TUTELA_LINK = {
  label: "Referente Tutela minori",
  to: "/safeguarding",
} as const;

/** Fixed referral text for a distress level (no therapy, no diagnosis, no promise). */
export function distressReferral(level: DistressLevel): SkyReply {
  if (level === "danger") {
    return {
      text: "Mi dispiace tanto che tu stia così. Se sei in pericolo o pensi di farti del male chiama subito il 112. Parlane adesso con un adulto di cui ti fidi, in famiglia o al club: il referente Tutela minori della S.C.D. ColicoDerviese ti ascolta in modo riservato. Io sono un assistente dell'app e non posso sostituire una persona.",
      mood: "alert",
      links: [TUTELA_LINK],
    };
  }
  return {
    text: "Grazie di avermelo detto. Musica e respiro possono aiutare a calmarsi, ma non sostituiscono una persona: parlane con la tua famiglia, il mister o il medico, e se serve uno psicologo può aiutarti. Al club c'è il referente Tutela minori della S.C.D. ColicoDerviese, che ti ascolta in modo riservato. Se ti senti in pericolo chiama il 112.",
    mood: "info",
    links: [TUTELA_LINK],
  };
}

/** Words that never appear in the copy of a relax / motivation character: it is not therapy and does not diagnose. */
const THERAPY_RE =
  /\b(terapia|terapie|psicoterapi\w*|terapeut\w*|diagnos\w*|curare|guarire|guarisc\w*|farmac\w*|disturb\w* (d'ansia|psichic\w*|mental\w*)|patologi\w*)\b/i;

/** Problems of one piece of relax / motivation copy; empty when it respects the rule. */
export function relaxCopyProblems(text: string): string[] {
  const hit = THERAPY_RE.exec(text);
  return hit ? [`therapy wording: ${hit[0]}`] : [];
}
