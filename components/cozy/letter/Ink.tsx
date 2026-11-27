'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Glyph, type GlyphName } from './Glyph';

/* Text that writes itself onto the letter, word by word. Each word wipes in
 * from the left and its ink dries from wine to black. Figures in [[ ]] are
 * stamped on (the paper jolts), {icons} draw themselves, __phrases__ get a
 * hand-drawn underline and ((figures)) a hand-drawn circle once written.
 * Blank lines start new paragraphs. Hidden words keep their place, so
 * nothing below moves while it writes. Markup: lib/cozy/first-letter.ts. */

type Tok =
  | { t: 'w'; text: string; space: boolean; bold?: boolean; ul?: number; circ?: number }
  | { t: 'stat'; text: string; space: boolean }
  | { t: 'icon'; name: GlyphName; space: boolean };

const MARK = /\[\[(.+?)\]\]|\*\*(.+?)\*\*|\{(\w+)\}|__(.+?)__|\(\((.+?)\)\)/g;

function parse(markup: string): Tok[][] {
  let group = 0;
  return markup.split(/\n\s*\n/).map((para) => {
    const out: Tok[] = [];
    let space = false;
    const words = (text: string, flags: { bold?: boolean; ul?: number; circ?: number } = {}) => {
      for (const part of text.split(/(\s+)/)) {
        if (!part) continue;
        if (/^\s+$/.test(part)) {
          space = true;
          continue;
        }
        out.push({ t: 'w', text: part, space, ...flags });
        space = false;
      }
    };
    let last = 0;
    for (const m of para.matchAll(MARK)) {
      words(para.slice(last, m.index));
      if (m[1]) out.push({ t: 'stat', text: m[1], space });
      else if (m[2]) words(m[2], { bold: true });
      else if (m[3]) out.push({ t: 'icon', name: m[3] as GlyphName, space });
      else if (m[4]) words(m[4], { ul: ++group });
      else if (m[5]) words(m[5], { circ: ++group });
      space = false;
      last = (m.index ?? 0) + m[0].length;
    }
    words(para.slice(last));
    return out;
  });
}

interface Timing {
  delays: number[][];
  /** When each underline/circle group starts drawing. */
  draw: Record<number, number>;
  stats: number[];
  total: number;
}

function schedule(paras: Tok[][], wordMs: number): Timing {
  let at = 0;
  const draw: Record<number, number> = {};
  const stats: number[] = [];
  const delays = paras.map((toks, p) => {
    if (p > 0) at += 260;
    return toks.map((tok, i) => {
      if (tok.t === 'stat') at += 120;
      const d = at;
      if (tok.t === 'stat') {
        stats.push(d);
        at += 300;
      } else if (tok.t === 'icon') at += 140;
      else at += wordMs + Math.min(60, tok.text.length * 4) + (/[.,;:!?—]$/.test(tok.text) ? 120 : 0);
      const g = tok.t === 'w' ? (tok.ul ?? tok.circ) : undefined;
      const next = toks[i + 1];
      const nextG = next?.t === 'w' ? (next.ul ?? next.circ) : undefined;
      if (g && g !== nextG) {
        draw[g] = at + 80;
        at += tok.t === 'w' && tok.circ ? 520 : 300;
      }
      return d;
    });
  });
  return { delays, draw, stats, total: at };
}

interface Props {
  text: string;
  /** Start writing. */
  run: boolean;
  /** Already written (rereading, a tap to skip): shown at once. */
  done: boolean;
  onDone?: () => void;
  /** A figure was stamped on. */
  onThump?: () => void;
  /** Handwriting (Caveat) instead of the letter's type. */
  hand?: boolean;
  wordMs?: number;
  className?: string;
  /** Paragraph element; defaults to <p>. */
  as?: 'p' | 'span';
}

export function Ink({ text, run, done, onDone, onThump, hand, wordMs = 66, className, as = 'p' }: Props) {
  const paras = useMemo(() => parse(text), [text]);
  const timing = useMemo(() => schedule(paras, hand ? 78 : wordMs), [paras, hand, wordMs]);
  const [played, setPlayed] = useState(false);
  const cb = useRef({ onDone, onThump });
  cb.current = { onDone, onThump };

  useEffect(() => {
    if (!run || done) return;
    setPlayed(true);
    const ts = timing.stats.map((d) => window.setTimeout(() => cb.current.onThump?.(), d + 200));
    ts.push(window.setTimeout(() => cb.current.onDone?.(), timing.total + 160));
    return () => ts.forEach(clearTimeout);
  }, [run, done, timing]);

  const state = played ? 'is-run' : done ? 'is-done' : undefined;
  const Tag = as;
  return (
    <div className={cn('ink', hand && 'ink--hand', state, className)}>
      {paras.map((toks, p) => (
        <Tag key={p} className="ink__p">
          <Marks toks={toks} delays={timing.delays[p]} draw={timing.draw} />
        </Tag>
      ))}
    </div>
  );
}

function Marks({ toks, delays, draw }: { toks: Tok[]; delays: number[]; draw: Record<number, number> }) {
  const out: ReactNode[] = [];
  let i = 0;
  while (i < toks.length) {
    const tok = toks[i];
    const g = tok.t === 'w' ? (tok.ul ?? tok.circ) : undefined;
    if (tok.t === 'w' && g) {
      // A run of words sharing an underline or circle.
      const start = i;
      const inner: ReactNode[] = [];
      while (i < toks.length) {
        const w = toks[i];
        if (w.t !== 'w' || (w.ul ?? w.circ) !== g) break;
        if (i > start && w.space) inner.push(' ');
        inner.push(<Word key={i} tok={w} d={delays[i]} />);
        i++;
      }
      if (tok.space) out.push(' ');
      out.push(
        tok.circ ? (
          <Circled key={`g${start}`} d={draw[g]}>
            {inner}
          </Circled>
        ) : (
          <Underlined key={`g${start}`} d={draw[g]}>
            {inner}
          </Underlined>
        ),
      );
      continue;
    }
    if (tok.space) out.push(' ');
    const style = { '--d': `${delays[i]}ms` } as CSSProperties;
    if (tok.t === 'stat') {
      out.push(
        <span key={i} className="ink-stat" style={style}>
          {tok.text}
        </span>,
      );
    } else if (tok.t === 'icon') {
      out.push(<Glyph key={i} name={tok.name} className="ink-gl" style={style} />);
    } else {
      out.push(<Word key={i} tok={tok} d={delays[i]} />);
    }
    i++;
  }
  return <>{out}</>;
}

function Word({ tok, d }: { tok: Extract<Tok, { t: 'w' }>; d: number }) {
  return (
    <span className={cn('ink-w', tok.bold && 'ink-b')} style={{ '--d': `${d}ms` } as CSSProperties}>
      {tok.text}
    </span>
  );
}

/** A phrase underlined by hand, one stroke per line it wraps onto. */
function Underlined({ d, children }: { d: number; children: ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [lines, setLines] = useState<{ x: number; y: number; w: number }[]>([]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    // The strokes are positioned against the .ink block, not this inline
    // span, which has no single box once it wraps. Measured in the block's
    // own pixels: the letter may still be scaled while it rises.
    const host = (el.closest('.ink') as HTMLElement | null) ?? el;
    const measure = () => {
      const box = host.getBoundingClientRect();
      const s = host.offsetWidth ? box.width / host.offsetWidth : 1;
      const out = [...el.getClientRects()]
        .filter((r) => r.width > 4)
        .map((r) => ({ x: (r.left - box.left) / s, y: (r.bottom - box.top) / s, w: r.width / s }));
      setLines(out);
    };
    measure();
    document.fonts?.ready.then(measure);
    const ro = new ResizeObserver(measure);
    ro.observe(host);
    return () => ro.disconnect();
  }, []);

  return (
    <span ref={ref} className="ink-ul">
      {children}
      {lines.map((l, i) => (
        <svg
          key={i}
          className="ink-ul__line"
          style={{ left: l.x - 2, top: l.y - 3, width: l.w + 6, '--d': `${d + i * 200}ms` } as CSSProperties}
          viewBox={`0 0 ${l.w + 6} 8`}
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            pathLength={1}
            d={`M2 ${4 + (i % 2)} C ${l.w * 0.3} ${2.5 + (i % 2)}, ${l.w * 0.65} ${6 - (i % 2)}, ${l.w + 4} ${3.5}`}
          />
        </svg>
      ))}
    </span>
  );
}

/** A figure circled by hand. */
function Circled({ d, children }: { d: number; children: ReactNode }) {
  return (
    <span className="ink-circ" style={{ '--d': `${d}ms` } as CSSProperties}>
      {children}
      <svg className="ink-circ__ring" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden>
        <path
          pathLength={1}
          d="M62 4C38 1 8 6 4 19c-3 11 18 18 46 18s47-6 46-18C95 8 70 3 46 5"
        />
      </svg>
    </span>
  );
}
