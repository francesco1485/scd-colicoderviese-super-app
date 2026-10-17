import { Dumbbell, HeartHandshake, Shirt, Smartphone, Stethoscope, Trophy, type LucideIcon } from "lucide-react";

import type { IdeaScene as Scene } from "@/lib/sponsor-ideas";

/**
 * The concrete picture of a sponsorship idea on /sponsor: where the brand goes, drawn as a simple club-palette scene
 * (navy, azzurro, sole, white) with a dashed «il tuo marchio» slot. Never a real or invented logo: the slot is empty
 * on purpose (SCD:ASSET, official logos only). Static: no motion, nothing to reduce.
 */

const SLOT = "rounded-[6px] border-2 border-dashed border-[#ffd84a] bg-[#ffd84a]/15 font-display font-bold uppercase tracking-[0.08em] text-[#ffe27a]";

function LedScene() {
  return (
    <div className="relative h-full w-full">
      {/* pitch in club blues, white lines */}
      <span className="absolute inset-0 bg-[repeating-linear-gradient(90deg,#0b3f86_0_28px,#0f4a99_28px_56px)]" />
      <span className="absolute top-[18%] left-1/2 size-14 -translate-x-1/2 rounded-full border-2 border-white/60" />
      <span className="absolute top-0 bottom-[34%] left-1/2 w-0.5 bg-white/60" />
      {/* the LED board along the touchline */}
      <span className="absolute inset-x-3 bottom-3 flex h-9 items-center justify-center overflow-hidden rounded-[4px] bg-[#05101f] shadow-[0_0_0_2px_#13254d,0_0_18px_rgb(127_208_255/0.45)]">
        <span className="font-display text-[13px] font-bold uppercase tracking-[0.18em] text-[#ffd84a]">Il tuo marchio · a bordo campo</span>
      </span>
    </div>
  );
}

function ShirtScene() {
  return (
    <div className="relative flex h-full w-full items-center justify-center bg-[radial-gradient(70%_90%_at_50%_0%,#2f7fd6,#13254d)]">
      <svg viewBox="0 0 120 100" className="h-[82%]" aria-hidden="true">
        <path d="M38 6 L18 16 L4 38 L20 46 L26 38 L26 96 L94 96 L94 38 L100 46 L116 38 L102 16 L82 6 Q60 20 38 6 Z" fill="#ffffff" stroke="#b8c5dd" strokeWidth="1.5" />
        <path d="M38 6 Q60 20 82 6" fill="none" stroke="#0457af" strokeWidth="3" />
        <rect x="40" y="40" width="40" height="22" rx="3" fill="rgb(255 216 74 / 0.25)" stroke="#e0a800" strokeWidth="1.6" strokeDasharray="4 3" />
        <text x="60" y="54.5" textAnchor="middle" fontSize="8" fontWeight="700" fill="#13254d" fontFamily="sans-serif">LOGO</text>
      </svg>
    </div>
  );
}

function VanScene() {
  return (
    <div className="relative flex h-full w-full items-end justify-center bg-[linear-gradient(180deg,#7fd0ff_0%,#2f7fd6_62%,#13254d_62%)] pb-2">
      <svg viewBox="0 0 200 84" className="h-[86%]" aria-hidden="true">
        <path d="M8 24 Q8 12 20 12 L130 12 Q142 12 150 22 L176 44 Q190 46 190 58 L190 66 L8 66 Z" fill="#ffffff" stroke="#b8c5dd" strokeWidth="1.5" />
        <path d="M134 18 L148 18 L168 42 L134 42 Z" fill="#cfe6fb" />
        <rect x="20" y="22" width="100" height="30" rx="4" fill="rgb(255 216 74 / 0.25)" stroke="#e0a800" strokeWidth="1.8" strokeDasharray="5 3" />
        <text x="70" y="41" textAnchor="middle" fontSize="10" fontWeight="700" fill="#13254d" fontFamily="sans-serif">IL TUO MARCHIO</text>
        <circle cx="42" cy="68" r="11" fill="#13254d" stroke="#ffffff" strokeWidth="3" />
        <circle cx="160" cy="68" r="11" fill="#13254d" stroke="#ffffff" strokeWidth="3" />
      </svg>
    </div>
  );
}

const ICON_SCENES: Readonly<Record<Exclude<Scene, "led" | "maglia" | "pulmino">, { icon: LucideIcon; slot: string; bg: string }>> = {
  torneo: { icon: Trophy, slot: "Il tuo nome sul torneo", bg: "bg-[radial-gradient(80%_100%_at_15%_0%,#ffd84a33,transparent_60%),linear-gradient(135deg,#13254d,#0457af)]" },
  digitale: { icon: Smartphone, slot: "Nell'app del club", bg: "bg-[linear-gradient(135deg,#0457af,#2f7fd6)]" },
  palestra: { icon: Dumbbell, slot: "Targhetta con il tuo nome", bg: "bg-[linear-gradient(135deg,#13254d,#2f7fd6)]" },
  fondo: { icon: HeartHandshake, slot: "Con il Fondo Solidale", bg: "bg-[radial-gradient(70%_100%_at_85%_0%,#ffd84a40,transparent_60%),linear-gradient(135deg,#0457af,#13254d)]" },
  infermeria: { icon: Stethoscope, slot: "Targhetta con il tuo nome", bg: "bg-[linear-gradient(135deg,#2f7fd6,#13254d)]" },
  kit: { icon: Shirt, slot: "Sul kit dei più piccoli", bg: "bg-[linear-gradient(135deg,#0457af,#13254d)]" },
};

function IconScene({ scene }: { scene: keyof typeof ICON_SCENES }) {
  const { icon: Icon, slot, bg } = ICON_SCENES[scene];
  return (
    <div className={`relative flex h-full w-full items-center gap-3 px-4 ${bg}`}>
      <span className="inline-flex size-16 flex-none items-center justify-center rounded-full bg-white/12 shadow-[inset_0_0_0_2px_rgb(255_255_255/0.35)]">
        <Icon className="size-9 text-white" strokeWidth={1.8} />
      </span>
      <span className={`${SLOT} px-2.5 py-2 text-[12.5px] leading-tight`}>{slot}</span>
    </div>
  );
}

const IDEA_SCENES: readonly Scene[] = ["led", "maglia", "torneo", "digitale", "pulmino", "palestra", "fondo", "infermeria", "kit"];

/** Scene of an idea or package; `label` is the accessible description of the picture. */
export function IdeaScene({ scene, label, className = "h-[112px]" }: { scene: Scene; label: string; className?: string }) {
  const s = IDEA_SCENES.includes(scene) ? scene : "digitale";
  return (
    <div role="img" aria-label={label} className={`relative overflow-hidden ${className}`} data-scene={s}>
      {s === "led" ? <LedScene /> : s === "maglia" ? <ShirtScene /> : s === "pulmino" ? <VanScene /> : <IconScene scene={s} />}
    </div>
  );
}
