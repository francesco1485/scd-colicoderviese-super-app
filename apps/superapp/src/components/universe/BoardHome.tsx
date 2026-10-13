/**
 * Opponent side of a match card. The home itself lives in src/components/home/ (UD-095): the former board hero,
 * quick tiles, role doors and "Mondo Colico" were removed with the Direzione's review of 13/10/2026.
 * The opponent's name is real (calendar master); a crest is never drawn or guessed.
 */
import { Shield } from "lucide-react";

/** Lato avversario: nome reale dal calendario; lo stemma non si disegna né si indovina. */
export function Opponent({ name }: { name: string }) {
  return (
    <span className="grid w-[92px] justify-items-center gap-1 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-[#eef2f8] text-[#5a6b85]">
        <Shield className="size-6" aria-hidden="true" />
      </span>
      <span className="line-clamp-2 text-[13px] font-bold leading-tight text-[#0b2a5b]">
        {name || "Da definire"}
      </span>
    </span>
  );
}
