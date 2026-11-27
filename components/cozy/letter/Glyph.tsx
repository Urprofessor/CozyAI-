import type { CSSProperties } from 'react';

/* Small line icons drawn into the letter. Every stroke has pathLength 1 so
 * CSS can draw it in with stroke-dashoffset. */

export type GlyphName = 'pump' | 'bottle' | 'calendar' | 'sun' | 'moon' | 'scale' | 'heart' | 'chart' | 'chat';

const PATHS: Record<GlyphName, string[]> = {
  // a flange over a small bottle
  pump: ['M4.5 3.5h7l-2 4h-3z', 'M6.5 7.5h3v1.5h-3z', 'M6 9h4l.5 1.5v3a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1v-3z'],
  bottle: ['M6.5 1.5h3v2h-3z', 'M5.5 3.5h5l1 2v7.5a1.5 1.5 0 0 1-1.5 1.5h-4A1.5 1.5 0 0 1 4.5 13V5.5z', 'M4.6 9h6.8'],
  calendar: ['M2.5 3.5h11v10h-11z', 'M2.5 6.5h11', 'M5.5 2v3M10.5 2v3', 'M5 9h1.5M7.5 9H9M10 9h1.5M5 11.2h1.5M7.5 11.2H9'],
  sun: ['M8 5.2a2.8 2.8 0 1 0 0 5.6a2.8 2.8 0 1 0 0-5.6', 'M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1'],
  moon: ['M10.8 2.2a5.8 5.8 0 1 0 3 9.6a4.8 4.8 0 0 1-3-9.6z', 'M12.5 2.5v2M11.5 3.5h2'],
  scale: ['M2.5 4.5h11v9h-11z', 'M5.5 8a2.5 2.5 0 0 1 5 0', 'M8 8l1.2-1.4'],
  heart: ['M8 13.5S2.5 10.2 2.5 6.4C2.5 4.6 3.9 3.3 5.4 3.3c1.1 0 2 .6 2.6 1.5.6-.9 1.5-1.5 2.6-1.5 1.5 0 2.9 1.3 2.9 3.1 0 3.8-5.5 7.1-5.5 7.1z'],
  chart: ['M2.5 13.5h11', 'M3.5 11l3-3.5 2.5 2 4-5'],
  chat: ['M2.5 3.5h11v7.5h-6l-3 2.5v-2.5h-2z', 'M5 6.5h6M5 8.6h4'],
};

export function Glyph({ name, className, style }: { name: GlyphName; className?: string; style?: CSSProperties }) {
  const paths = PATHS[name] ?? PATHS.heart;
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {paths.map((d, i) => (
        <path key={i} d={d} pathLength={1} style={{ '--k': i } as CSSProperties} />
      ))}
    </svg>
  );
}
