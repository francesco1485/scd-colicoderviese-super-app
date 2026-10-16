/**
 * Colour tones of the home bands (Francesco 16/10/2026 21:54 «cerca di mettere anche altri colori»): club navy,
 * azzurro and sole (yellow), all in the brushed-metal finish of styles.css. Text colours are chosen per tone so every
 * text keeps at least 4.5:1 (navy/azzurro: white or light text; sole: navy text, navy action button).
 */
export type Tone = "navy" | "azzurro" | "sole";

export interface ToneClasses {
  band: string;
  kicker: string;
  body: string;
  muted: string;
  cta: string;
  ghost: string;
  glow: string;
}

export const TONES: Readonly<Record<Tone, ToneClasses>> = {
  navy: {
    band: "scd-band text-white",
    kicker: "text-[#ffd84a]",
    body: "text-[#dbe5f7]",
    muted: "text-[#b4c3de]",
    cta: "scd-gold",
    ghost: "text-white",
    glow: "bg-[radial-gradient(circle_at_50%_40%,rgb(127_208_255/0.35),transparent_62%)]",
  },
  azzurro: {
    band: "scd-band-azzurro text-white",
    kicker: "text-white",
    body: "text-white",
    muted: "text-white",
    cta: "scd-gold",
    ghost: "text-white",
    glow: "bg-[radial-gradient(circle_at_50%_40%,rgb(255_255_255/0.28),transparent_62%)]",
  },
  sole: {
    band: "scd-band-sole text-[#13254d]",
    kicker: "text-[#034a96]",
    body: "text-[#1c2c50]",
    muted: "text-[#3a4a6b]",
    cta: "scd-navy-btn",
    ghost: "text-[#13254d]",
    glow: "bg-[radial-gradient(circle_at_50%_40%,rgb(255_255_255/0.55),transparent_62%)]",
  },
};

/** Tone cycle for a sequence of slides: navy, azzurro, sole, navy, … */
export function toneAt(i: number): Tone {
  const order: readonly Tone[] = ["navy", "azzurro", "sole"];
  return order[((i % order.length) + order.length) % order.length]!;
}
