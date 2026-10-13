/**
 * <OpponentCrest name size /> — the verified crest file when the registry holds one, otherwise a
 * neutral shield with the opponent's initials (navy outline, never yellow). No crest is ever drawn
 * or generated for a club: see src/lib/crests.ts and config/scd-opponent-crests.v1.json.
 */
import { crestFor } from "./crests";

const NAVY = "#0b2a5b";

export function OpponentCrest({
  name,
  size = 40,
  className = "",
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const { src, initials, label } = crestFor(name);
  const alt = label ? `Stemma ${label}` : "Avversario da definire";
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        className={`shrink-0 rounded-full bg-white object-contain ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  const fontSize = initials.length >= 3 ? size * 0.3 : size * 0.36;
  return (
    <svg
      viewBox="0 0 40 44"
      width={size}
      height={size}
      role="img"
      aria-label={
        label ? `${label} (stemma non disponibile)` : "Avversario da definire"
      }
      className={`shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <path
        d="M20 2.5 L35.5 7.5 V21 C35.5 31 28.5 38 20 41.5 C11.5 38 4.5 31 4.5 21 V7.5 Z"
        fill="#eef3f9"
        stroke={NAVY}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <text
        x="20"
        y="24.5"
        textAnchor="middle"
        dominantBaseline="middle"
        fill={NAVY}
        fontFamily="'Fira Sans', system-ui, sans-serif"
        fontWeight="700"
        fontSize={(fontSize / size) * 40}
        letterSpacing="0.02em"
      >
        {initials}
      </text>
    </svg>
  );
}
