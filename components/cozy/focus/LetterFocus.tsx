'use client';

import { cn } from '@/lib/utils';
import type { DemoAccount } from '@/lib/cozy/account-demo';
import { FOCUS_LIST, cardSummary, recommendedFor, type FocusId } from '@/lib/cozy/focus';

/** The four directions on the first letter, as cards: a check box, the name,
 *  what Cozie can do there, and one line on what it already knows (with its
 *  source), over a faint line drawing. Directions that match her Momcozy
 *  devices come first. The check box only ticks; the rest of the card opens
 *  the direction's preview sheet. */
export function FocusCards({
  account,
  chosen,
  onToggle,
  onPreview,
}: {
  account: DemoAccount;
  chosen: FocusId[];
  onToggle: (id: FocusId) => void;
  onPreview: (id: FocusId) => void;
}) {
  const cards = [...FOCUS_LIST].sort(
    (a, b) => Number(!!recommendedFor(account, b.id)) - Number(!!recommendedFor(account, a.id)),
  );

  return (
    <ul className="cz-focus__list">
      {cards.map((c) => {
        const on = chosen.includes(c.id);
        const summary = cardSummary(account, c.id);
        return (
          <li key={c.id} className={cn('cz-focus__card', on && 'is-on')} data-focus={c.id}>
            {/* Covers the card under its content: a tap anywhere but the box opens the preview. */}
            <button
              type="button"
              className="cz-focus__open"
              aria-label={`See what Cozie can do for ${c.short}`}
              onClick={(e) => {
                e.stopPropagation();
                onPreview(c.id);
              }}
            />
            <button
              type="button"
              role="checkbox"
              aria-checked={on}
              aria-label={`Keep an eye on ${c.short}`}
              className="cz-focus__check"
              onClick={(e) => {
                e.stopPropagation();
                onToggle(c.id);
              }}
            >
              <svg viewBox="0 0 16 16" aria-hidden>
                <path d="m3.8 8.4 2.7 2.7 5.7-6" />
              </svg>
            </button>
            <span className="cz-focus__text" aria-hidden>
              <strong>{c.short}</strong>
              <ul className="cz-focus__can">
                {c.can.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </span>
            <span className="cz-focus__known">
              <b>{summary.source}</b>
              {summary.text}
            </span>
            <FocusArt id={c.id} />
          </li>
        );
      })}
    </ul>
  );
}

/** Faint line drawing in the card's right side. */
export function FocusArt({ id, className = 'cz-focus__art' }: { id: FocusId; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 80 80"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {id === 'lactation' ? (
        <>
          {/* a bottle with its milk line and measuring marks */}
          <path d="M34 14V9c0-3 2.7-5 6-5s6 2 6 5v5" />
          <rect x="29" y="14" width="22" height="7" rx="2" />
          <path d="M28 21h24c2 0 3 1 3 3v45c0 4-3 7-7 7H32c-4 0-7-3-7-7V24c0-2 1-3 3-3Z" />
          <path d="M25 46c5 2.5 10 2.5 15 0s10-2.5 15 0M47 31h5M47 38h5M47 55h5M47 62h5" />
        </>
      ) : id === 'sleep' ? (
        <>
          {/* moon, stars and a cloud */}
          <path d="M48 10a27 27 0 1 0 22 42A23 23 0 0 1 48 10Z" />
          <path d="M18 12l1.6 3.6 3.6 1.6-3.6 1.6L18 22.4l-1.6-3.6-3.6-1.6 3.6-1.6ZM67 19v7M63.5 22.5h7" />
          <path d="M12 70h30a8 8 0 0 0-2-15.7A11 11 0 0 0 19 57a7 7 0 0 0-7 13Z" />
        </>
      ) : id === 'growth' ? (
        <>
          {/* a growth curve on a chart */}
          <path d="M10 70h62M10 70V10M10 22h4M10 34h4M10 46h4M10 58h4" />
          <path d="M15 63c13-4 21-17 31-27s17-15 24-17" />
          <circle cx="23" cy="59.5" r="2.6" />
          <circle cx="38" cy="45" r="2.6" />
          <circle cx="55" cy="28" r="2.6" />
        </>
      ) : (
        <>
          {/* two hearts and a little sparkle */}
          <path d="M40 68S13 52 13 33c0-9 7-15 14-15 5.2 0 9.4 3 13 7.4C43.6 21 47.8 18 53 18c7 0 14 6 14 15 0 19-27 35-27 35Z" />
          <path d="M65 15s-6-4-6-8c0-2 1.5-3.5 3-3.5 1.4 0 2.4.8 3 1.8.6-1 1.6-1.8 3-1.8 1.5 0 3 1.5 3 3.5 0 4-6 8-6 8Z" />
          <path d="M19 11l-3-4M13 17l-5-1" />
        </>
      )}
    </svg>
  );
}
