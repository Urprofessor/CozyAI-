'use client';

import { useEffect, useId, useState } from 'react';
import { cn } from '@/lib/utils';
import type { DemoAccount } from '@/lib/cozy/account-demo';
import { FOCUS_LIST, cardTeaser, defaultFocus, recommendedFor, type FocusId } from '@/lib/cozy/focus';
import { FocusIcon } from './FocusHub';

/** End of the first letter: the four directions Cozie can help with, as
 *  checkboxes. The ones that match her Momcozy devices start ticked and come
 *  first; each card already shows one thing Cozie knows. Continue opens one
 *  hub for everything she picked. */
export function LetterFocus({
  account,
  onContinue,
}: {
  account: DemoAccount;
  onContinue: (ids: FocusId[]) => void;
}) {
  const id = useId();
  const [picked, setPicked] = useState<Set<FocusId>>(() => new Set(defaultFocus(account)));
  // A different demo account means different defaults.
  useEffect(() => setPicked(new Set(defaultFocus(account))), [account]);

  const cards = FOCUS_LIST.map((f) => ({ ...f, tag: recommendedFor(account, f.id), teaser: cardTeaser(account, f.id) }));
  cards.sort((a, b) => Number(!!b.tag) - Number(!!a.tag));
  // Hub tabs follow the card order.
  const chosen = cards.filter((c) => picked.has(c.id)).map((c) => c.id);

  const toggle = (focus: FocusId) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(focus)) next.delete(focus);
      else next.add(focus);
      return next;
    });

  return (
    <section className="cz-focus" aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`}>What would you like help with?</h3>
      <p>Pick as many as you like. You can change them anytime.</p>
      <ul className="cz-focus__list">
        {cards.map((c) => {
          const on = picked.has(c.id);
          return (
            <li key={c.id}>
              <button
                type="button"
                role="checkbox"
                aria-checked={on}
                className={cn('cz-focus__card', on && 'is-on')}
                data-focus={c.id}
                onClick={() => toggle(c.id)}
              >
                <FocusIcon id={c.id} />
                <span className="cz-focus__text">
                  {c.tag && <em>{c.tag}</em>}
                  <strong>{c.title}</strong>
                  <small>{c.teaser}</small>
                </span>
                <i className="cz-focus__check" aria-hidden>
                  <svg viewBox="0 0 16 16">
                    <path d="m4 8.4 2.6 2.6L12 5.4" />
                  </svg>
                </i>
              </button>
            </li>
          );
        })}
      </ul>
      {account.devices.length > 0 && (
        <p className="cz-focus__source">
          Ticked for your {account.devices.map((d) => d.name.replace('Momcozy ', '')).join(' and ')} · from your
          Momcozy account
        </p>
      )}
      <button
        type="button"
        className="cz-letter__btn cz-letter__connect cz-focus__continue"
        disabled={!chosen.length}
        onClick={() => onContinue(chosen)}
      >
        {chosen.length ? `Continue with ${chosen.length}` : 'Pick at least one'}
      </button>
    </section>
  );
}
