import type { Slot } from '@/lib/cozy/life/script';

// Placeholder room, drawn in code until the painted layers arrive. Kept in a
// picture-book style: warm cream walls, soft wood, warm-brown pencil lines,
// a slight hand-drawn wobble and paper grain. Coordinates match
// lib/cozy/home/scene.ts (300×400).

const INK = '#9a7a69';
const WALL = '#f7efe4';
const WAINSCOT = '#efe2d1';
const FLOOR = '#e8cfac';
const PLANK = '#d6b78f';
const WOOD = '#dcae84';
const WOOD_DARK = '#c3946a';
const ROSE = '#efc3c8';
const ROSE_DEEP = '#da959f';
const SAGE = '#bccfab';
const SAGE_DEEP = '#9fb68c';
const CREAM = '#fff9f0';
const HONEY = '#f3d79c';
const SKY_BLUE = '#b9d2df';

const SKY: Record<Slot, string> = { morning: '#fce0c3', afternoon: '#cfe5ec', night: '#424c7c' };

export function RoomArt({ slot }: { slot: Slot }) {
  const line = { stroke: INK, strokeWidth: 1.3, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

  return (
    <svg className="ch-room" viewBox="0 0 300 400" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        {/* Hand-drawn wobble on every edge. */}
        <filter id="ch-wobble" x="-2%" y="-2%" width="104%" height="104%">
          <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="7" />
          <feDisplacementMap in="SourceGraphic" scale="1.8" />
        </filter>
        {/* Paper grain, multiplied over the art. */}
        <filter id="ch-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="3" result="n" />
          <feColorMatrix
            in="n"
            type="matrix"
            values="0 0 0 0 0.45  0 0 0 0 0.35  0 0 0 0 0.3  0 0 0 0.14 0"
          />
        </filter>
        <clipPath id="ch-window">
          <path d="M110 140 V80 A40 40 0 0 1 190 80 V140 Z" />
        </clipPath>
      </defs>

      <g filter="url(#ch-wobble)">
        {/* Wall */}
        <rect x="-4" y="-4" width="308" height="258" fill={WALL} />
        <rect x="-4" y="198" width="308" height="54" fill={WAINSCOT} />
        <path d="M-4 198 H304" {...line} strokeWidth={1} fill="none" />
        {[30, 70, 230, 270].map((x) => (
          <path key={x} d={`M${x} 206 V244`} stroke={INK} strokeOpacity={0.25} strokeWidth={1} />
        ))}

        {/* Pendant lamp */}
        <path d="M150 -4 V22" {...line} fill="none" />
        <path d="M137 24 H163 L170 38 H130 Z" fill={ROSE} {...line} />
        <circle cx="150" cy="41" r="3.2" fill={slot === 'night' ? '#ffe9a8' : CREAM} {...line} strokeWidth={1} />

        {/* Window */}
        <path d="M110 140 V80 A40 40 0 0 1 190 80 V140 Z" fill={SKY[slot]} />
        <g clipPath="url(#ch-window)">
          {slot === 'morning' && (
            <>
              <circle cx="166" cy="104" r="11" fill="#f6b97c" />
              <path d="M112 132 Q130 120 150 130 T190 126 V142 H110 Z" fill="#f3cba6" />
            </>
          )}
          {slot === 'afternoon' && (
            <>
              <ellipse cx="134" cy="92" rx="13" ry="6" fill="#fff" />
              <ellipse cx="144" cy="88" rx="9" ry="6" fill="#fff" />
              <ellipse cx="172" cy="112" rx="11" ry="5" fill="#fff" />
              <path d="M110 134 Q132 122 152 132 T190 128 V142 H110 Z" fill={SAGE} />
            </>
          )}
          {slot === 'night' && (
            <>
              <circle cx="166" cy="92" r="10" fill="#fff1c4" />
              <circle cx="171" cy="88" r="9" fill={SKY.night} />
              {[
                [126, 84],
                [140, 106],
                [180, 118],
                [122, 120],
                [154, 76],
              ].map(([x, y]) => (
                <circle key={`${x}-${y}`} cx={x} cy={y} r="1.3" fill="#fff6d8" />
              ))}
            </>
          )}
        </g>
        <path d="M110 140 V80 A40 40 0 0 1 190 80 V140 Z" fill="none" {...line} strokeWidth={1.8} />
        <path d="M150 42 V140 M110 104 H190" {...line} fill="none" />
        {/* Curtains */}
        <path d="M100 56 H114 Q108 100 116 146 H100 Z" fill={ROSE} {...line} />
        <path d="M200 56 H186 Q192 100 184 146 H200 Z" fill={ROSE} {...line} />
        <path d="M96 56 H204" {...line} strokeWidth={2} fill="none" />
        {/* Sill and plant */}
        <rect x="102" y="140" width="96" height="8" rx="2" fill={WOOD} {...line} />
        <path d="M170 140 L172 128 H186 L188 140 Z" fill="#e7a98b" {...line} />
        <ellipse cx="174" cy="122" rx="5" ry="8" fill={SAGE} {...line} transform="rotate(-20 174 122)" />
        <ellipse cx="184" cy="121" rx="5" ry="8" fill={SAGE_DEEP} {...line} transform="rotate(18 184 121)" />

        {/* Floor */}
        <rect x="-4" y="250" width="308" height="154" fill={FLOOR} />
        {[284, 322, 364].map((y) => (
          <path key={y} d={`M-4 ${y} H304`} stroke={PLANK} strokeWidth={1.2} />
        ))}
        {[
          [60, 250, 284],
          [190, 250, 284],
          [120, 284, 322],
          [250, 284, 322],
          [40, 322, 364],
          [170, 322, 364],
          [100, 364, 404],
          [230, 364, 404],
        ].map(([x, y1, y2]) => (
          <path key={`${x}-${y1}`} d={`M${x} ${y1} V${y2}`} stroke={PLANK} strokeWidth={1.2} />
        ))}
        <rect x="-4" y="246" width="308" height="7" fill="#eadbc8" {...line} strokeWidth={1} />

        {/* Rug */}
        <ellipse cx="150" cy="338" rx="104" ry="34" fill={SAGE} {...line} />
        <ellipse cx="150" cy="338" rx="90" ry="26" fill="none" stroke={CREAM} strokeWidth={1.4} strokeDasharray="4 4" />

        {/* Bookshelf */}
        <rect x="16" y="120" width="58" height="132" rx="3" fill={WOOD} {...line} />
        <rect x="21" y="125" width="48" height="122" fill={WOOD_DARK} opacity={0.35} />
        <path d="M16 164 H74 M16 208 H74" {...line} fill="none" />
        {[
          [23, 140, 8, 24, ROSE_DEEP],
          [32, 144, 7, 20, SAGE_DEEP],
          [40, 138, 9, 26, HONEY],
          [50, 146, 6, 18, SKY_BLUE],
          [24, 186, 9, 22, SKY_BLUE],
          [34, 182, 8, 26, ROSE],
          [44, 188, 10, 20, SAGE],
          [26, 228, 22, 10, HONEY],
          [28, 218, 18, 10, ROSE_DEEP],
          [56, 222, 8, 24, SAGE_DEEP],
        ].map(([x, y, w, h, c]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width={w} height={h} rx="1.5" fill={c as string} {...line} strokeWidth={1} />
        ))}
        <path d="M36 120 L38 108 H52 L54 120 Z" fill="#e7a98b" {...line} />
        <ellipse cx="40" cy="100" rx="5" ry="9" fill={SAGE} {...line} transform="rotate(-24 40 100)" />
        <ellipse cx="50" cy="99" rx="5" ry="9" fill={SAGE_DEEP} {...line} transform="rotate(22 50 99)" />
        <ellipse cx="45" cy="96" rx="4" ry="9" fill={SAGE} {...line} />

        {/* Calendar */}
        <circle cx="230" cy="54" r="1.8" fill={INK} />
        <path d="M230 54 L212 64 M230 54 L248 64" {...line} strokeWidth={1} fill="none" />
        <rect x="208" y="62" width="44" height="50" rx="3" fill={CREAM} {...line} />
        <rect x="208" y="62" width="44" height="12" rx="3" fill={ROSE_DEEP} {...line} />
        {[0, 1, 2, 3].map((r) =>
          [0, 1, 2, 3, 4].map((c) => (
            <circle key={`${r}-${c}`} cx={215 + c * 7.5} cy={82 + r * 7.5} r="1.3" fill={INK} opacity={0.45} />
          ))
        )}
        <circle cx="237.5" cy="89.5" r="4" fill="none" stroke={ROSE_DEEP} strokeWidth={1.4} />

        {/* Fridge */}
        <rect x="234" y="128" width="58" height="138" rx="8" fill="#f4f2ec" {...line} />
        <path d="M234 174 H292" {...line} fill="none" />
        <rect x="240" y="142" width="3.5" height="20" rx="1.5" fill="#d2c9bb" />
        <rect x="240" y="184" width="3.5" height="30" rx="1.5" fill="#d2c9bb" />
        <circle cx="270" cy="142" r="3.2" fill={ROSE_DEEP} />
        <circle cx="282" cy="154" r="3" fill={SAGE_DEEP} />
        <g transform="rotate(-5 270 198)">
          <rect x="258" y="186" width="25" height="27" rx="1.5" fill="#fbe7a5" {...line} strokeWidth={1} />
          <path d="M262 195 H279 M262 200 H277 M262 205 H274" stroke={INK} strokeWidth={0.9} opacity={0.6} />
          <circle cx="270" cy="186" r="2.4" fill={ROSE_DEEP} />
        </g>

        {/* Crib */}
        <rect x="18" y="320" width="96" height="22" rx="4" fill={CREAM} {...line} />
        <rect x="30" y="314" width="72" height="11" rx="4" fill={ROSE} {...line} strokeWidth={1} />
        <rect x="16" y="278" width="100" height="7" rx="3" fill={WOOD} {...line} />
        {[28, 40, 52, 80, 92, 104].map((x) => (
          <path key={x} d={`M${x} 285 V320`} stroke={WOOD_DARK} strokeWidth={2} strokeLinecap="round" />
        ))}
        <rect x="16" y="278" width="6" height="74" rx="2" fill={WOOD} {...line} />
        <rect x="110" y="278" width="6" height="74" rx="2" fill={WOOD} {...line} />

        {/* Side table with the pump, a bottle and cold tea */}
        <rect x="188" y="304" width="68" height="8" rx="3" fill={WOOD} {...line} />
        <path d="M196 312 V356 M248 312 V356" {...line} strokeWidth={2.2} fill="none" />
        <path d="M194 288 Q194 274 206 274 Q218 274 218 290 Q218 304 206 304 Q194 304 194 288 Z" fill="#ffffff" {...line} />
        <circle cx="206" cy="289" r="3.4" fill={ROSE_DEEP} />
        <rect x="224" y="282" width="10" height="22" rx="3" fill={CREAM} {...line} strokeWidth={1} />
        <path d="M226 282 Q229 274 232 282" fill={HONEY} {...line} strokeWidth={1} />
        <rect x="238" y="292" width="11" height="12" rx="2" fill={SKY_BLUE} {...line} strokeWidth={1} />
        <path d="M249 295 Q254 298 249 301" fill="none" {...line} strokeWidth={1} />

        {/* Mailbox crate */}
        <g transform="rotate(-8 266 360)">
          <rect x="256" y="352" width="20" height="13" rx="1.5" fill={CREAM} {...line} strokeWidth={1} />
          <path d="M256 352 L266 360 L276 352" fill="none" {...line} strokeWidth={1} />
          <circle cx="266" cy="360" r="2.3" fill={ROSE_DEEP} />
        </g>
        <rect x="250" y="362" width="42" height="24" rx="3" fill={WOOD} {...line} />
        <path d="M250 372 H292" stroke={WOOD_DARK} strokeWidth={1.2} />
      </g>

      <rect width="300" height="400" filter="url(#ch-grain)" />
    </svg>
  );
}
