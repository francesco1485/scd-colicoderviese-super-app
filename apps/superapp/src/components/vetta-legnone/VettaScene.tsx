import { VETTA_LEVELS } from "@/lib/vetta-legnone";

/**
 * Lake and mountain drawn with plain SVG shapes (no artwork of people, no photo): the Lario at the bottom, the
 * Legnone pyramid above, the sun of the club yellow behind it and a dotted trail that climbs from the shore (Riva)
 * to the summit (Vetta) through the five levels. Decorative: the levels are explained in text in the ladder section.
 */
const STOPS: ReadonlyArray<{ x: number; y: number; anchor: "start" | "end" }> = [
  { x: 92, y: 214, anchor: "end" },
  { x: 168, y: 184, anchor: "start" },
  { x: 150, y: 146, anchor: "end" },
  { x: 214, y: 108, anchor: "start" },
  { x: 236, y: 52, anchor: "start" },
];

export function VettaScene({ className = "" }: { className?: string }) {
  const trail = STOPS.map((s, i) => `${i === 0 ? "M" : "L"}${s.x} ${s.y}`).join(" ");
  return (
    <svg
      viewBox="0 0 400 260"
      role="img"
      aria-label="Il lago e il monte Legnone: un sentiero sale dalla riva alla vetta in cinque tappe"
      className={className}
      data-testid="vetta-scene"
    >
      <style>{"@keyframes vl-flag{0%,100%{transform:skewY(0deg)}50%{transform:skewY(-8deg)}}"}</style>
      <defs>
        <linearGradient id="vl-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0f1d3d" />
          <stop offset="0.55" stopColor="#1266b8" />
          <stop offset="1" stopColor="#7fd0ff" />
        </linearGradient>
        <linearGradient id="vl-mount" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2a4a8a" />
          <stop offset="1" stopColor="#13254d" />
        </linearGradient>
        <linearGradient id="vl-mount-far" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1b5fa8" />
          <stop offset="1" stopColor="#1a3f78" />
        </linearGradient>
        <linearGradient id="vl-lake" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1b95d3" />
          <stop offset="1" stopColor="#0457af" />
        </linearGradient>
        <radialGradient id="vl-sun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff3b0" />
          <stop offset="0.6" stopColor="#ffd84a" />
          <stop offset="1" stopColor="#ffd84a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="260" rx="22" fill="url(#vl-sky)" />
      <circle cx="318" cy="70" r="46" fill="url(#vl-sun)" />
      <circle cx="318" cy="70" r="22" fill="#ffd82a" />
      {/* far ridges */}
      <path d="M0 196 L58 150 L96 170 L140 128 L178 160 L210 150 L262 108 L310 150 L350 132 L400 168 L400 230 L0 230 Z" fill="url(#vl-mount-far)" opacity="0.85" />
      {/* the Legnone pyramid */}
      <path d="M40 232 L150 118 L236 44 L262 70 L300 112 L372 232 Z" fill="url(#vl-mount)" />
      <path d="M236 44 L262 70 L250 74 L240 66 L228 78 L216 68 Z" fill="#ffffff" />
      <path d="M236 44 L300 112 L372 232 L300 232 Z" fill="#0f1d3d" opacity="0.35" />
      {/* lake */}
      <path d="M0 222 C 80 214, 150 230, 220 222 S 340 214, 400 222 L400 260 L0 260 Z" fill="url(#vl-lake)" />
      <g stroke="#ffffff" strokeOpacity="0.55" strokeWidth="2" strokeLinecap="round" fill="none">
        <path d="M24 240 q10 -5 20 0 t20 0" />
        <path d="M132 248 q10 -5 20 0 t20 0" />
        <path d="M262 238 q10 -5 20 0 t20 0" />
        <path d="M330 250 q10 -5 20 0 t20 0" />
      </g>
      {/* trail and stops */}
      <path d={trail} fill="none" stroke="#ffd84a" strokeWidth="3" strokeDasharray="2 7" strokeLinecap="round" />
      {STOPS.map((s, i) => {
        const level = VETTA_LEVELS[i];
        const top = i === STOPS.length - 1;
        return (
          <g key={level?.id ?? i}>
            <circle cx={s.x} cy={s.y} r={top ? 7 : 5.5} fill={top ? "#ffd84a" : "#ffffff"} stroke="#13254d" strokeWidth="2" />
            <text
              x={s.anchor === "end" ? s.x - 10 : s.x + 10}
              y={s.y + 4}
              textAnchor={s.anchor}
              fontFamily="Fira Sans Condensed, Fira Sans, system-ui, sans-serif"
              fontWeight="700"
              fontSize="13"
              fill={top ? "#ffd84a" : "#ffffff"}
              style={{ paintOrder: "stroke" }}
              stroke="#0f1d3d"
              strokeWidth="3"
              strokeLinejoin="round"
            >
              {level?.name}
            </text>
          </g>
        );
      })}
      {/* summit flag in the club colours */}
      <path d="M236 44 L236 18" stroke="#ffffff" strokeWidth="2" />
      <path d="M236 18 L256 24 L236 31 Z" fill="#ffd84a" className="origin-[236px_24px] motion-safe:animate-[vl-flag_2.4s_ease-in-out_infinite]" />
    </svg>
  );
}
