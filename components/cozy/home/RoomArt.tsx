import type { Slot } from '@/lib/cozy/life/script';

// Placeholder room, drawn in code until the rendered layers arrive. Follows
// the room concept in the Cozie room skill: a warm, soft-3D attic nursery —
// sloped ceiling with wooden beams, rounded light-wood furniture, a plush rug,
// a round crib, an armchair with the pink breast pumps on a stool beside it.
// Soft shading comes from gradients and blurred contact shadows.
//
// Three layers so characters can sit between them:
//   back  — the room itself
//   crib  — the crib's front rail, over Mila but behind Cozie
//   front — foreground plant and pouf, over everything
// Coordinates match lib/cozy/home/scene.ts (300×620).

const WOOD_LINE = '#d2a87c';

const SKY: Record<Slot, [string, string]> = {
  morning: ['#fde4c8', '#f6c9a2'],
  afternoon: ['#cfe5f1', '#eef4f2'],
  night: ['#28366a', '#7a6a99'],
};

export function RoomArt({ slot, layer }: { slot: Slot; layer: 'back' | 'crib' | 'front' }) {
  if (layer === 'crib') return <CribFront />;
  if (layer === 'front') return <Foreground />;
  return <Room slot={slot} />;
}

function Defs() {
  return (
    <defs>
      <linearGradient id="r-wall" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#f8e6d6" />
        <stop offset="1" stopColor="#efd2bd" />
      </linearGradient>
      <linearGradient id="r-ceil" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#fbeee3" />
        <stop offset="1" stopColor="#f1d9c6" />
      </linearGradient>
      <linearGradient id="r-beam" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#efcda6" />
        <stop offset="1" stopColor="#dcae80" />
      </linearGradient>
      <linearGradient id="r-floor" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#d9a97d" />
        <stop offset="1" stopColor="#eccaa2" />
      </linearGradient>
      <linearGradient id="r-wood" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#f3d8b4" />
        <stop offset="1" stopColor="#dfb88c" />
      </linearGradient>
      <radialGradient id="r-cream" cx="0.4" cy="0.3" r="0.8">
        <stop offset="0" stopColor="#fffcf6" />
        <stop offset="1" stopColor="#ecdccb" />
      </radialGradient>
      <radialGradient id="r-rug" cx="0.5" cy="0.4" r="0.6">
        <stop offset="0" stopColor="#fdf6ec" />
        <stop offset="1" stopColor="#efdfcb" />
      </radialGradient>
      <radialGradient id="r-pump" cx="0.38" cy="0.3" r="0.8">
        <stop offset="0" stopColor="#dca3a8" />
        <stop offset="1" stopColor="#b5737b" />
      </radialGradient>
      <radialGradient id="r-lamp" cx="0.5" cy="0.4" r="0.6">
        <stop offset="0" stopColor="#fff6d8" />
        <stop offset="1" stopColor="#f3c779" />
      </radialGradient>
      <radialGradient id="r-glow" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#ffdca0" stopOpacity="0.75" />
        <stop offset="1" stopColor="#ffdca0" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="r-sage" cx="0.4" cy="0.3" r="0.8">
        <stop offset="0" stopColor="#c7d5b5" />
        <stop offset="1" stopColor="#9fb48c" />
      </radialGradient>
      <filter id="r-soft" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="3" />
      </filter>
    </defs>
  );
}

function Room({ slot }: { slot: Slot }) {
  const [skyTop, skyBottom] = SKY[slot];
  const night = slot === 'night';
  return (
    <svg className="ch-room" viewBox="0 0 300 620" preserveAspectRatio="none" aria-hidden>
      <Defs />
      <linearGradient id="r-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={skyTop} />
        <stop offset="1" stopColor={skyBottom} />
      </linearGradient>

      {/* Wall and sloped ceiling with beams */}
      <rect width="300" height="434" fill="url(#r-wall)" />
      <path d="M0 0 H300 V44 L0 214 Z" fill="url(#r-ceil)" />
      {[
        [96, 0, 22, 202],
        [196, 0, 124, 144],
        [300, 4, 226, 86],
      ].map(([x1, y1, x2, y2]) => (
        <g key={x1}>
          <path d={`M${x1} ${y1} L${x2} ${y2}`} stroke="#c99a6c" strokeOpacity="0.35" strokeWidth="14" strokeLinecap="round" filter="url(#r-soft)" />
          <path d={`M${x1} ${y1} L${x2} ${y2}`} stroke="url(#r-beam)" strokeWidth="11" strokeLinecap="round" />
        </g>
      ))}
      <path d="M-4 216 L304 42" stroke="url(#r-beam)" strokeWidth="9" strokeLinecap="round" />

      {/* Window */}
      <rect x="186" y="238" width="110" height="128" rx="5" fill="url(#r-wood)" />
      <rect x="194" y="246" width="94" height="112" rx="2" fill="url(#r-sky)" />
      {night ? (
        <>
          {[
            [206, 262],
            [262, 256],
            [278, 290],
            [228, 300],
          ].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="1.2" fill="#fff4d6" />
          ))}
          {[
            [214, 330, 22],
            [250, 320, 26],
            [284, 336, 20],
          ].map(([x, y, r]) => (
            <ellipse key={x} cx={x} cy={y} rx={r} ry={r * 0.8} fill="#22304f" opacity="0.85" />
          ))}
          <rect x="194" y="340" width="94" height="18" fill="#f2a98a" opacity="0.35" />
        </>
      ) : (
        <>
          <ellipse cx="226" cy="270" rx="13" ry="6" fill="#fff" opacity="0.85" />
          <ellipse cx="236" cy="266" rx="9" ry="6" fill="#fff" opacity="0.85" />
          {[
            [214, 334, 22],
            [252, 326, 26],
            [284, 338, 20],
          ].map(([x, y, r]) => (
            <ellipse key={x} cx={x} cy={y} rx={r} ry={r * 0.8} fill="#a9c18f" opacity="0.8" />
          ))}
        </>
      )}
      <path d="M241 246 V358 M194 283 H288 M194 321 H288" stroke="#f0d6b4" strokeWidth="5" />
      <rect x="182" y="362" width="118" height="8" rx="3" fill="url(#r-wood)" />

      {/* Curtain on the left of the window */}
      <path d="M150 228 H300" stroke="#e3c29c" strokeWidth="4" strokeLinecap="round" />
      <circle cx="150" cy="228" r="4" fill="#e3c29c" />
      <path
        d="M164 230 C160 300 178 330 170 380 Q168 412 176 432 H198 Q190 384 198 344 C204 300 196 262 202 230 Z"
        fill="#f3e5d3"
      />
      <path d="M176 236 C174 290 184 330 180 380 M190 236 C188 290 194 320 188 380" stroke="#e2cdb4" strokeWidth="1.6" fill="none" />
      <ellipse cx="184" cy="346" rx="13" ry="4.5" fill="#e6cfb4" />

      {/* Letter on the windowsill */}
      <g transform="rotate(-6 248 356)">
        <rect x="236" y="348" width="26" height="16" rx="2" fill="#fffaf2" stroke="#e8d6c2" />
        <path d="M236 348 L249 357 L262 348" fill="none" stroke="#e1c9b0" />
        <circle cx="249" cy="357" r="2.6" fill="#d98e98" />
      </g>

      {/* Note board and calendar */}
      <rect x="118" y="262" width="52" height="44" rx="4" fill="url(#r-wood)" />
      <rect x="122" y="266" width="44" height="36" rx="2" fill="#e4c39b" />
      <rect x="126" y="270" width="16" height="15" rx="1" fill="#fbeaa9" transform="rotate(-6 134 277)" />
      <rect x="145" y="272" width="16" height="13" rx="1" fill="#f6cfd4" transform="rotate(5 153 278)" />
      <rect x="133" y="287" width="20" height="11" rx="1" fill="#fffaf0" />
      <circle cx="134" cy="271" r="1.6" fill="#c9737e" />
      <circle cx="153" cy="273" r="1.6" fill="#8fa77c" />
      <circle cx="143" cy="288" r="1.6" fill="#c9737e" />
      <rect x="128" y="316" width="32" height="34" rx="3" fill="#fffaf2" />
      <rect x="128" y="316" width="32" height="9" rx="3" fill="#c98f97" />
      {[0, 1, 2].map((r) =>
        [0, 1, 2, 3].map((c) => (
          <circle key={`${r}-${c}`} cx={134 + c * 6.6} cy={332 + r * 6} r="1.1" fill="#b89a85" />
        ))
      )}

      {/* Bookshelf with mushroom lamp */}
      <path d="M12 432 V292 Q12 262 42 262 H84 Q114 262 114 292 V432 Z" fill="url(#r-wood)" />
      <rect x="20" y="272" width="86" height="154" rx="6" fill="#e6c49c" />
      <rect x="18" y="320" width="90" height="6" rx="2" fill="#f4dab6" />
      <rect x="18" y="372" width="90" height="6" rx="2" fill="#f4dab6" />
      {[
        [26, 284, 7, 36, '#f5ece0'],
        [34, 288, 6, 32, '#eadfce'],
        [41, 282, 7, 38, '#f8f1e6'],
        [49, 290, 6, 30, '#c9d6b8'],
        [57, 286, 7, 34, '#f1e7d9'],
        [70, 300, 22, 20, '#fffaf2'],
      ].map(([x, y, w, h, c]) => (
        <rect key={`${x}-${y}`} x={x as number} y={y as number} width={w as number} height={h as number} rx="1.5" fill={c as string} />
      ))}
      <circle cx="54" cy="346" r={night ? 34 : 22} fill="url(#r-glow)" />
      <ellipse cx="54" cy="344" rx="15" ry="10" fill="url(#r-lamp)" />
      <rect x="51" y="350" width="6" height="20" rx="3" fill="#f3e6d1" />
      <rect x="78" y="346" width="22" height="24" rx="2" fill="#fffaf2" />
      <path d="M83 362 Q85 354 90 357 Q94 352 96 360 Z" fill="#b9cba6" />
      <rect x="22" y="384" width="40" height="42" rx="4" fill="#f0d3ad" />
      <rect x="66" y="384" width="38" height="42" rx="4" fill="#f0d3ad" />
      <circle cx="58" cy="405" r="1.8" fill={WOOD_LINE} />
      <circle cx="70" cy="405" r="1.8" fill={WOOD_LINE} />
      {/* Plant trailing over the top */}
      <path d="M50 262 L52 246 H72 L74 262 Z" fill="#f6efe6" />
      {[
        [56, 238, -30],
        [68, 236, 20],
        [62, 230, 0],
        [44, 250, -60],
        [34, 266, -80],
        [24, 284, -90],
        [80, 248, 50],
        [20, 304, -95],
      ].map(([x, y, rot]) => (
        <ellipse key={`${x}-${y}`} cx={x} cy={y} rx="6" ry="9" fill="#86a86d" transform={`rotate(${rot} ${x} ${y})`} />
      ))}

      {/* Floor */}
      <rect x="0" y="432" width="300" height="188" fill="url(#r-floor)" />
      {[-90, -20, 50, 120, 190, 260, 330, 400].map((x) => (
        <path key={x} d={`M${x} 432 L${150 + (x - 150) * 1.9} 620`} stroke="#b9875c" strokeOpacity="0.18" strokeWidth="1" />
      ))}
      <ellipse cx="230" cy="470" rx="70" ry="16" fill="#fff6e8" opacity={night ? 0.06 : 0.18} />
      <rect x="0" y="428" width="300" height="6" fill="#f3dfcd" />

      {/* Rug */}
      <ellipse cx="160" cy="524" rx="132" ry="46" fill="#c9a37b" opacity="0.25" filter="url(#r-soft)" />
      <ellipse cx="160" cy="516" rx="130" ry="44" fill="url(#r-rug)" />
      <ellipse cx="160" cy="516" rx="130" ry="44" fill="none" stroke="#f8eedf" strokeWidth="6" strokeDasharray="1.5 3" strokeLinecap="round" />

      {/* Armchair */}
      <ellipse cx="40" cy="476" rx="62" ry="10" fill="#b48a62" opacity="0.3" filter="url(#r-soft)" />
      <rect x="-26" y="386" width="100" height="64" rx="28" fill="url(#r-cream)" />
      <rect x="-20" y="428" width="104" height="42" rx="18" fill="url(#r-cream)" />
      <ellipse cx="80" cy="448" rx="15" ry="26" fill="url(#r-cream)" />
      <rect x="10" y="398" width="38" height="32" rx="10" fill="url(#r-sage)" transform="rotate(-10 29 414)" />

      {/* Stool with the pair of pink pumps */}
      <ellipse cx="114" cy="504" rx="30" ry="6" fill="#a87b55" opacity="0.3" filter="url(#r-soft)" />
      <path d="M100 474 L96 502 M128 474 L132 502 M114 478 L114 506" stroke="#d6ad80" strokeWidth="4.5" strokeLinecap="round" />
      <ellipse cx="114" cy="472" rx="28" ry="7.5" fill="url(#r-wood)" />
      <Pump cx={124} cy={449} />
      <Pump cx={103} cy={452} />

      {/* Basket of baby clothes */}
      <ellipse cx="94" cy="548" rx="40" ry="8" fill="#a87b55" opacity="0.25" filter="url(#r-soft)" />
      <path d="M58 516 H130 L124 546 Q94 556 64 546 Z" fill="#e3c69d" />
      {[522, 530, 538].map((y) => (
        <path key={y} d={`M60 ${y} Q94 ${y + 6} 128 ${y}`} stroke="#cfa978" strokeWidth="1.4" fill="none" />
      ))}
      <ellipse cx="94" cy="516" rx="36" ry="7" fill="#d6b385" />
      <path d="M72 514 Q84 502 96 512 Q108 500 118 514 Z" fill="#fffaf2" />
      <path d="M96 514 Q106 506 116 514 Z" fill="#bccca9" />

      {/* Folded clothes on the rug */}
      <rect x="140" y="534" width="36" height="8" rx="3" fill="#f6efe4" />
      <rect x="141" y="527" width="34" height="8" rx="3" fill="#b7c8a4" />
      <rect x="142" y="520" width="32" height="8" rx="3" fill="#fbf6ee" />
      <path d="M192 524 L206 518 H222 L236 524 L232 540 H196 Z" fill="#fbf4e6" />
      <circle cx="214" cy="528" r="1.4" fill="#d1b48c" />
      <circle cx="214" cy="534" r="1.4" fill="#d1b48c" />

      {/* Crib, back half (the front rail is its own layer) */}
      <ellipse cx="252" cy="476" rx="56" ry="9" fill="#a87b55" opacity="0.28" filter="url(#r-soft)" />
      <path d="M200 422 A52 14 0 0 1 304 422" fill="none" stroke="#e7c49b" strokeWidth="5" />
      {[206, 216, 228, 240, 252, 264, 276, 288, 298].map((x) => (
        <path key={x} d={`M${x} ${414 - Math.sin(((x - 200) / 104) * Math.PI) * 10} V440`} stroke="#ecd0ab" strokeWidth="3" strokeLinecap="round" />
      ))}
      <ellipse cx="252" cy="446" rx="50" ry="13" fill="#fffaf3" />
      <ellipse cx="252" cy="443" rx="44" ry="9" fill="#ffffff" />
    </svg>
  );
}

function Pump({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      <path
        d={`M${cx - 12} ${cy + 9} Q${cx - 12} ${cy + 15} ${cx} ${cy + 15} Q${cx + 12} ${cy + 15} ${cx + 12} ${cy + 9} Z`}
        fill="#ffffff"
        fillOpacity="0.75"
        stroke="#d9dbe2"
        strokeWidth="0.8"
      />
      <ellipse cx={cx} cy={cy} rx="12.5" ry="14.5" fill="url(#r-pump)" />
      <circle cx={cx} cy={cy - 6.5} r="4.6" fill="#f3dcde" />
      <path d={`M${cx - 2.2} ${cy - 7.5} H${cx + 2.2} M${cx - 2.2} ${cy - 5.5} H${cx + 2.2}`} stroke="#c7868d" strokeWidth="0.8" />
      <ellipse cx={cx - 4.5} cy={cy - 1} rx="3" ry="5" fill="#ffffff" opacity="0.25" />
    </g>
  );
}

function CribFront() {
  return (
    <svg className="ch-room" viewBox="0 0 300 620" preserveAspectRatio="none" aria-hidden>
      {[204, 214, 226, 238, 250, 262, 274, 286, 298].map((x) => (
        <path key={x} d={`M${x} 448 V${470 + Math.sin(((x - 200) / 104) * Math.PI) * 4}`} stroke="#ead0ad" strokeWidth="3.4" strokeLinecap="round" />
      ))}
      <path d="M200 448 A52 14 0 0 0 304 448" fill="none" stroke="#e7c49b" strokeWidth="5.5" />
      <path d="M200 470 A52 10 0 0 0 304 470" fill="none" stroke="#dcb487" strokeWidth="5" />
      <path d="M210 474 V488 M292 474 V488" stroke="#d6ad80" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function Foreground() {
  return (
    <svg className="ch-room" viewBox="0 0 300 620" preserveAspectRatio="none" aria-hidden>
      <defs>
        <radialGradient id="f-cream" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#fffaf2" />
          <stop offset="1" stopColor="#e6d4bf" />
        </radialGradient>
      </defs>
      {/* Knitted pouf with a sage throw, bottom right */}
      <ellipse cx="292" cy="606" rx="64" ry="48" fill="url(#f-cream)" />
      {[0, 1, 2, 3, 4].map((i) => (
        <path key={i} d={`M${236 + i * 6} ${574 + i * 4} Q292 ${560 + i * 10} 348 ${574 + i * 4}`} stroke="#ead9c4" strokeWidth="2" fill="none" />
      ))}
      <path d="M248 572 Q280 556 312 566 L318 620 H262 Q252 596 248 572 Z" fill="#a9bc94" />
      <path d="M262 620 V630 M270 620 V630 M278 620 V630" stroke="#a9bc94" strokeWidth="2" />
      {/* Leafy plant, bottom left, slightly soft */}
      <g opacity="0.95">
        {[
          [8, 560, -30, 14],
          [26, 548, 10, 13],
          [-4, 584, -60, 15],
          [36, 576, 40, 12],
          [16, 590, -10, 14],
        ].map(([x, y, rot, r]) => (
          <ellipse key={`${x}-${y}`} cx={x} cy={y} rx={r * 0.7} ry={r} fill="#7f9f66" transform={`rotate(${rot} ${x} ${y})`} />
        ))}
        <path d="M-10 620 Q8 600 12 620 Z" fill="#e7cfaa" />
      </g>
    </svg>
  );
}
