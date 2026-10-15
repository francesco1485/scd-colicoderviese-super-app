/**
 * Original illustration of the home hero (Francesco 15/10/2026 19:19: no photo of the pitch, no aerial or stadium photo;
 * designed graphics instead). Evening over the Alto Lario: blue sky with a few stars and the moon, three layers of
 * mountains with snow caps, the lake with light reflections and two small stylised floodlights on the shore.
 * Pure decoration (aria-hidden), no official asset redrawn, no person. GENERATE_ORIGINAL in SCD:ASSET terms.
 */
export function HeroArt({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1440 520"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
      focusable="false"
      className={className}
      data-testid="home-hero-art"
    >
      <defs>
        <linearGradient id="hh-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0b3a8c" />
          <stop offset=".5" stopColor="#1556c4" />
          <stop offset=".78" stopColor="#3f86e6" />
          <stop offset="1" stopColor="#8cbcf5" />
        </linearGradient>
        <radialGradient id="hh-dusk" cx=".72" cy=".78" r=".5">
          <stop offset="0" stopColor="#ffe9a3" stopOpacity=".55" />
          <stop offset=".45" stopColor="#ffd600" stopOpacity=".12" />
          <stop offset="1" stopColor="#ffd600" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="hh-lake" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4a8ae6" />
          <stop offset=".55" stopColor="#1556c4" />
          <stop offset="1" stopColor="#0b2f6b" />
        </linearGradient>
        <linearGradient id="hh-beam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff3b0" stopOpacity=".5" />
          <stop offset="1" stopColor="#ffd600" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="hh-glow" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#fffbe6" stopOpacity=".95" />
          <stop offset=".4" stopColor="#ffd600" stopOpacity=".35" />
          <stop offset="1" stopColor="#ffd600" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="hh-shade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#061a3d" stopOpacity=".38" />
          <stop offset=".55" stopColor="#061a3d" stopOpacity=".06" />
          <stop offset="1" stopColor="#061a3d" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="hh-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset=".6" stopColor="#0b2f6b" stopOpacity="0" />
          <stop offset="1" stopColor="#0b2f6b" stopOpacity=".55" />
        </linearGradient>
      </defs>

      <rect width="1440" height="520" fill="url(#hh-sky)" />
      <rect width="1440" height="520" fill="url(#hh-dusk)" />
      <g fill="#fff">
        <circle cx="120" cy="54" r="1.6" opacity=".8" />
        <circle cx="300" cy="96" r="1.2" opacity=".6" />
        <circle cx="470" cy="34" r="1.8" opacity=".8" />
        <circle cx="620" cy="84" r="1.1" opacity=".55" />
        <circle cx="760" cy="28" r="1.5" opacity=".75" />
        <circle cx="900" cy="104" r="1.2" opacity=".5" />
        <circle cx="1010" cy="46" r="1.6" opacity=".7" />
        <circle cx="1300" cy="36" r="1.4" opacity=".7" />
        <circle cx="1390" cy="110" r="1.1" opacity=".5" />
      </g>
      <circle cx="1150" cy="96" r="30" fill="#fff8d8" opacity=".92" />
      <circle cx="1150" cy="96" r="70" fill="#fff8d8" opacity=".1" />

      {/* Far range with snow caps */}
      <path
        d="M0 300 L110 230 L200 270 L330 160 L450 250 L560 200 L690 270 L820 170 L940 245 L1070 150 L1200 240 L1310 200 L1440 255 L1440 380 L0 380Z"
        fill="#5b97ea"
      />
      <path
        d="M330 160 L362 186 L346 188 L330 177 L313 190 L298 186Z M820 170 L852 196 L836 198 L820 187 L802 200 L788 196Z M1070 150 L1104 178 L1086 180 L1070 168 L1052 182 L1037 178Z"
        fill="#e6f0ff"
        opacity=".9"
      />
      {/* Middle range */}
      <path
        d="M0 340 L150 278 L270 322 L410 258 L550 318 L700 266 L860 326 L1000 276 L1150 330 L1300 286 L1440 322 L1440 400 L0 400Z"
        fill="#3474d6"
      />
      {/* Near shore */}
      <path
        d="M0 372 L190 336 L370 366 L560 340 L760 372 L980 344 L1200 374 L1440 348 L1440 410 L0 410Z"
        fill="#1a52b0"
      />

      {/* Lake and reflections */}
      <rect y="400" width="1440" height="120" fill="url(#hh-lake)" />
      <g stroke="#b9d6ff" strokeWidth="2" strokeLinecap="round" opacity=".38">
        <path d="M160 432h120M420 450h80M640 426h150M900 444h110M260 474h70M760 488h120M1040 478h80M1300 440h70" />
      </g>
      <g stroke="#fff3b0" strokeWidth="3" strokeLinecap="round" opacity=".55">
        <path d="M1120 424h60M1132 440h36M1140 456h20" />
      </g>

      {/* Two small floodlights on the shore (stylised, no pitch drawn) */}
      <g transform="translate(1236 300)">
        <polygon points="8,-30 -34,74 50,74" fill="url(#hh-beam)" opacity=".55" />
        <rect x="6" y="-28" width="4" height="102" fill="#c7d6ee" />
        <rect x="-4" y="-36" width="24" height="9" rx="2" fill="#fff6c2" />
        <circle cx="8" cy="-32" r="36" fill="url(#hh-glow)" />
      </g>
      <g transform="translate(1356 312)">
        <polygon points="8,-24 -28,62 44,62" fill="url(#hh-beam)" opacity=".5" />
        <rect x="6" y="-22" width="4" height="84" fill="#c7d6ee" />
        <rect x="-3" y="-29" width="22" height="8" rx="2" fill="#fff6c2" />
        <circle cx="8" cy="-26" r="30" fill="url(#hh-glow)" />
      </g>

      {/* Readability: darker on the text side and at the bottom, where the tiles overlap */}
      <rect width="1440" height="520" fill="url(#hh-shade)" />
      <rect width="1440" height="520" fill="url(#hh-fade)" />
    </svg>
  );
}

/** Yellow brush stroke under the hero title (original shape, scratchpad brush-yellow.svg). */
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
