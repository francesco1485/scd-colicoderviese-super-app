import { initialsOf } from "@/lib/public-roster";

/**
 * Avatars of the Super App (brief Direzione 2026-10-13, "Non c'è avatar"). Two shapes, both SVG, never faces:
 * - InitialsAvatar: a person as initials on a disc in the team colour (athletes, staff, anyone named on a page);
 * - ShirtAvatar: the "maglia" a signed-in user picks for themself (original SCD jersey, number + colour).
 * No photos of minors anywhere; no image is loaded.
 */

export const SHIRT_COLORS = {
  navy: { body: "#0b2a5b", trim: "#ffd600", ink: "#ffffff" },
  blue: { body: "#1556c4", trim: "#ffffff", ink: "#ffffff" },
  yellow: { body: "#ffd600", trim: "#0b2a5b", ink: "#0b2a5b" },
  white: { body: "#ffffff", trim: "#0b2a5b", ink: "#0b2a5b" },
} as const;
export type ShirtColor = keyof typeof SHIRT_COLORS;

function textColorOn(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return "#ffffff";
  const n = parseInt(m[1]!, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 165 ? "#0b1e3a" : "#ffffff";
}

export function InitialsAvatar({
  name,
  color = "#0b2a5b",
  size = 40,
  className,
}: {
  name: string;
  /** Team colour (Team.color / PublicGroup.color). */
  color?: string;
  size?: number;
  className?: string;
}) {
  const text = initialsOf(name);
  const ink = textColorOn(color);
  return (
    <svg
      viewBox="0 0 40 40"
      width={size}
      height={size}
      role="img"
      aria-label={name}
      className={className ? `shrink-0 ${className}` : "shrink-0"}
    >
      <circle cx="20" cy="20" r="19" fill={color} />
      <circle
        cx="20"
        cy="20"
        r="19"
        fill="none"
        stroke="rgb(255 255 255 / 0.35)"
        strokeWidth="1.5"
      />
      <text
        x="20"
        y="20"
        dy="0.36em"
        textAnchor="middle"
        fontSize={text.length > 1 ? 15 : 17}
        fontWeight="700"
        fill={ink}
        fontFamily="'Fira Sans', system-ui, sans-serif"
        style={{ letterSpacing: "0.02em" }}
      >
        {text}
      </text>
    </svg>
  );
}

export function ShirtAvatar({
  number,
  color = "navy",
  size = 40,
  label,
  className,
}: {
  /** Shirt number 1–99; anything else is drawn without a number. */
  number?: number | null;
  color?: ShirtColor;
  size?: number;
  /** Accessible name; default "Maglia n. X". */
  label?: string;
  className?: string;
}) {
  const c = SHIRT_COLORS[color];
  const n =
    typeof number === "number" &&
    Number.isInteger(number) &&
    number >= 1 &&
    number <= 99
      ? number
      : null;
  const name = label ?? (n ? `Maglia numero ${n}` : "Maglia SCD");
  return (
    <svg
      viewBox="0 0 40 40"
      width={size}
      height={size}
      role="img"
      aria-label={name}
      className={className ? `shrink-0 ${className}` : "shrink-0"}
    >
      <circle cx="20" cy="20" r="19" fill="#eef3f9" />
      {/* jersey: body, sleeves, collar */}
      <path
        d="M14 9.5 L17.5 8 Q20 11 22.5 8 L26 9.5 L32 13.5 L29.5 19 L26.5 17.5 V31 H13.5 V17.5 L10.5 19 L8 13.5 Z"
        fill={c.body}
        stroke={c.trim}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M13.5 29 H26.5" stroke={c.trim} strokeWidth="1.4" />
      <path
        d="M17.5 8 Q20 11 22.5 8"
        fill="none"
        stroke={c.trim}
        strokeWidth="1.4"
      />
      {n !== null && (
        <text
          x="20"
          y="22"
          dy="0.36em"
          textAnchor="middle"
          fontSize={n >= 10 ? 10 : 11}
          fontWeight="800"
          fill={c.ink}
          fontFamily="'Fira Sans', system-ui, sans-serif"
        >
          {n}
        </text>
      )}
    </svg>
  );
}
