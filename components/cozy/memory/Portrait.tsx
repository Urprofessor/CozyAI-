import { cn } from '@/lib/utils';

// Warm, painterly washes for people without a portrait image yet.
const WASHES = [
  ['#f6d9b8', '#e9a98b', '#c97b6e'],
  ['#f3e4d3', '#d9b8a6', '#b98a83'],
  ['#f7e2cf', '#efc4b0', '#cf9a95'],
  ['#efe1d4', '#d8c1ae', '#a98d80'],
];

function washFor(key: string) {
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return WASHES[h % WASHES.length];
}

/** A portrait image, or a soft painted placeholder with the person's initial. */
export function Portrait({
  name,
  personKey,
  src,
  className,
}: {
  name: string;
  personKey: string;
  src?: string;
  className?: string;
}) {
  if (src) {
    return <img className={cn('mp-portrait', className)} src={src} alt="" draggable={false} />;
  }
  const [light, mid, deep] = washFor(personKey);
  return (
    <span
      className={cn('mp-portrait mp-portrait--placeholder', className)}
      style={{
        background: `radial-gradient(120% 90% at 28% 18%, #fffaf3 0%, ${light} 38%, ${mid} 72%, ${deep} 100%)`,
      }}
      aria-hidden
    >
      <span className="mp-portrait__initial">{name.slice(0, 1)}</span>
    </span>
  );
}
