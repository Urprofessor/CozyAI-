'use client';

import { useId } from 'react';
import type { DemoAccount } from '@/lib/cozy/account-demo';
import { FOCUS_LIST, cardTeaser, recommendedFor, type FocusId } from '@/lib/cozy/focus';
import { FocusIcon } from './FocusHub';

/** End of the first letter: the four directions Cozie can help with. Each card
 *  already shows one thing Cozie knows from the Momcozy account; the ones that
 *  match her devices come first. Tapping one opens its hub. */
export function LetterFocus({ account, onPick }: { account: DemoAccount; onPick: (id: FocusId) => void }) {
  const id = useId();
  const cards = FOCUS_LIST.map((f) => ({ ...f, tag: recommendedFor(account, f.id), teaser: cardTeaser(account, f.id) }));
  // Matches first, otherwise the fixed order.
  cards.sort((a, b) => Number(!!b.tag) - Number(!!a.tag));

  return (
    <section className="cz-focus" aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`}>What would you like help with?</h3>
      <p>Pick one to start. You can explore the others anytime.</p>
      <ul className="cz-focus__list">
        {cards.map((c) => (
          <li key={c.id}>
            <button type="button" className="cz-focus__card" data-focus={c.id} onClick={() => onPick(c.id)}>
              <FocusIcon id={c.id} />
              <span className="cz-focus__text">
                {c.tag && <em>{c.tag}</em>}
                <strong>{c.title}</strong>
                <small>{c.teaser}</small>
              </span>
              <span className="cz-focus__go" aria-hidden>
                ›
              </span>
            </button>
          </li>
        ))}
      </ul>
      {account.devices.length > 0 && (
        <p className="cz-focus__source">Numbers from your Momcozy account · {account.devices.map((d) => d.name.replace('Momcozy ', '')).join(', ')}</p>
      )}
    </section>
  );
}
