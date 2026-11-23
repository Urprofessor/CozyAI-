'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import type { StoryPage } from '@/lib/cozy/letter-story';
import { ILLUSTRATIONS } from '@/lib/cozy/illustrations';
import { CZ } from '../ui';

/* Year-in-review pages before the first letter ("Story" letter style): one
 * fact per full-screen page, a progress bar on top, a small Cozie drifting
 * through every page, "Tap to continue" at the bottom. Pages move on by
 * themselves after a few seconds; Skip goes straight to the letter. When the
 * last page is done the caller plays the "I noticed" moment, which settles
 * into its card. Shown over the whole letter (portalled to .cz-letter). */

const PAGE_MS = 4600;

interface Props {
  pages: StoryPage[];
  /** Any element inside the letter, to find where to draw. */
  anchor: () => HTMLElement | null;
  /** Total pages including the "I noticed" that follows, for the progress bar. */
  total: number;
  onDone: () => void;
  onSkip: () => void;
}

export function LetterStory({ pages, anchor, total, onDone, onSkip }: Props) {
  const [root, setRoot] = useState<HTMLElement | null>(null);
  const [index, setIndex] = useState(0);
  const anchorRef = useRef(anchor);
  anchorRef.current = anchor;
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    setRoot((anchorRef.current()?.closest('.cz-letter') as HTMLElement | null) ?? null);
  }, []);

  const next = () => (index + 1 >= pages.length ? doneRef.current() : setIndex(index + 1));

  // Each page moves on by itself.
  useEffect(() => {
    if (!root) return;
    const t = window.setTimeout(next, PAGE_MS);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, root]);

  if (!root) return null;
  const page = pages[index];
  const art = page.art && ILLUSTRATIONS[page.art];

  return createPortal(
    <div
      className={cn('ls', `ls--${page.tone}`)}
      role="dialog"
      aria-label="Your first six weeks"
      onClick={(e) => {
        e.stopPropagation();
        next();
      }}
    >
      <div className="ls__progress" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <i key={i} className={cn(i < index && 'is-done', i === index && 'is-now')}>
            {i === index && <b key={index} style={{ animationDuration: `${PAGE_MS}ms` }} />}
          </i>
        ))}
      </div>
      <button
        type="button"
        className="ls__skip"
        onClick={(e) => {
          e.stopPropagation();
          onSkip();
        }}
      >
        Skip
      </button>

      {/* Remounted per page so each one rises in. */}
      <div className="ls__page" key={page.id}>
        {page.eyebrow && <p className="ls__eyebrow">{page.eyebrow}</p>}
        <p className={cn('ls__big', page.big.length > 14 && 'is-long')}>{page.big}</p>
        {page.title && <p className="ls__title">{page.title}</p>}
        {page.sub && <p className="ls__sub">{page.sub}</p>}
        {page.line && <p className="ls__line">{page.line}</p>}
        {art && <img className="ls__art" src={art} alt="" />}
        {page.tone === 'night' && <Stars />}
      </div>

      {/* The same little Cozie on every page, moving between spots. */}
      <img className={cn('ls__cozie', `at-${index % 3}`)} src={`${CZ}/ip/Cozy_Magic_Light.webp`} alt="" aria-hidden />

      <p className="ls__hint">Tap to continue</p>
    </div>,
    root,
  );
}

function Stars() {
  return (
    <span className="ls__stars" aria-hidden>
      {Array.from({ length: 18 }, (_, i) => (
        <i
          key={i}
          style={{
            left: `${(i * 53) % 100}%`,
            top: `${(i * 37) % 60}%`,
            animationDelay: `${(i % 6) * 0.4}s`,
          }}
        />
      ))}
    </span>
  );
}
