/**
 * Yellow brush stroke of the boards (original shape, GENERATE_ORIGINAL in SCD:ASSET terms), used under the "VS" of the
 * next-game card. The drawn lake hero that lived here left the home with the old idea (Francesco 15/10/2026 21:35).
 */
export function BrushStroke({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 600 60" preserveAspectRatio="none" aria-hidden="true" focusable="false" className={className}>
      <g fill="#ffd600">
        <path d="M6 30c18-12 52-17 96-19 70-3 150 1 230-2 74-3 160-6 238 1 14 1 22 6 24 12-1 7-9 11-22 13-62 9-140 8-214 9-88 1-170 5-252 3-46-1-82-2-96-8-8-3-9-6-4-9z" />
        <path d="M22 40c70 4 170 3 262 1 70-1 156-2 230-6l-6 4c-60 6-150 8-226 9-96 2-188 1-262-4z" opacity=".7" />
        <path d="M40 14c90-6 200-6 300-6 70 0 140 1 200 4-80 2-170 3-250 4-90 1-170 1-250-2z" opacity=".55" />
      </g>
    </svg>
  );
}
