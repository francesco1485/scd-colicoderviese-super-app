// swap for OpponentCrest from "@/lib/crests"
import { opponentInitials } from "./opponent-initials";
/**
 * Neutral shield with the initials of the opponent's name. No crest is drawn or guessed: a real crest is shown
 * only when a verified official file exists in the crest registry (CRESTS agent, src/lib/crests.tsx).
 */

export function OpponentShield({
  name,
  size = 28,
  className = "",
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const initials = opponentInitials(name);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role="img"
      aria-label={
        name ? `Stemma non disponibile: ${name}` : "Avversario da definire"
      }
      className={`shrink-0 ${className}`}
    >
      <path
        d="M16 2.5 27 6.2v9.3c0 6.6-4.4 11.5-11 14-6.6-2.5-11-7.4-11-14V6.2L16 2.5Z"
        fill="#eef3f9"
        stroke="#9fb0c8"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <text
        x="16"
        y="19.2"
        textAnchor="middle"
        fontFamily="Fira Sans, system-ui, sans-serif"
        fontWeight="700"
        fontSize={initials.length > 1 ? 10.5 : 12}
        fill="#3e5272"
      >
        {initials}
      </text>
    </svg>
  );
}
