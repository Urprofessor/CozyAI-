'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { ImportItem } from '@/lib/cozy/memory-import';
import { PRIVACY_POINTS, PRIVACY_TITLE } from '@/lib/cozy/import-privacy';
import { DIMENSION_LABELS } from '@/lib/cozy/memory-profile-demo';

/* Pieces shared by the two import sheets — from another AI (AiImport) and
 * from a file (FileImport): the review list and the privacy promises. */

/** Sensitive items start unticked. */
export const defaultPicks = (items: ImportItem[]) => new Set(items.filter((i) => !i.sensitive).map((i) => i.id));

export function togglePick(prev: Set<string>, id: string) {
  const next = new Set(prev);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

interface ReviewProps {
  items: ImportItem[];
  picked: Set<string>;
  onToggle: (id: string) => void;
  babyName: string;
  /** "{n} things from …" — the line under the title. */
  lead: ReactNode;
  onSave: () => void;
  backLabel: string;
  onBack: () => void;
}

/** "Here's what Cozie found": every item grouped by person, ticked unless sensitive. */
export function ImportReview({ items, picked, onToggle, babyName, lead, onSave, backLabel, onBack }: ReviewProps) {
  const groups = [
    { key: 'mom', title: 'About you', items: items.filter((i) => i.target.who === 'mom') },
    { key: 'baby', title: `About ${babyName}`, items: items.filter((i) => i.target.who === 'baby') },
  ].filter((g) => g.items.length);

  return (
    <>
      <div className="cz-import__scroll">
        <h2 className="cz-import__title">Here’s what Cozie found</h2>
        <p className="cz-import__lead">{lead} Untick anything you don’t want Cozie to remember.</p>
        {groups.map((g) => (
          <section key={g.key} className="cz-import__group">
            <h3>{g.title}</h3>
            <ul>
              {g.items.map((item) => {
                const on = picked.has(item.id);
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      className={cn('cz-import__item', !on && 'is-off')}
                      onClick={() => onToggle(item.id)}
                    >
                      <i aria-hidden />
                      <span>
                        {item.text}
                        <small>
                          {DIMENSION_LABELS[item.target.dim]}
                          {item.sensitive && <em className="cz-import__tag">Sensitive · off by default</em>}
                        </small>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
        <p className="cz-import__safe">
          <ShieldIcon />
          Used only to tailor Cozie’s help for you and your baby. Edit or delete any of it, anytime, in your memory
          profile.
        </p>
      </div>
      <div className="cz-import__footer">
        <button type="button" className="cz-primary-btn" disabled={!picked.size} onClick={onSave}>
          Remember {picked.size} {picked.size === 1 ? 'thing' : 'things'}
        </button>
        <button type="button" className="cz-import__secondary" onClick={onBack}>
          {backLabel}
        </button>
      </div>
    </>
  );
}

/** What we promise about her and her baby's data (same copy as the email). */
export function PrivacyCard({ points = PRIVACY_POINTS }: { points?: { title: string; text: string }[] }) {
  return (
    <section className="cz-import__privacy" aria-label={PRIVACY_TITLE}>
      <h3>
        <ShieldIcon />
        {PRIVACY_TITLE}
      </h3>
      <ul>
        {points.map((p) => (
          <li key={p.title}>
            <b>{p.title}</b>
            <span>{p.text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ShieldIcon() {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden>
      <path
        d="M10 2.2 3.8 4.6v4.6c0 4 2.6 7.3 6.2 8.6 3.6-1.3 6.2-4.6 6.2-8.6V4.6L10 2.2Z"
        fill="currentColor"
        opacity="0.16"
      />
      <path
        d="M10 2.2 3.8 4.6v4.6c0 4 2.6 7.3 6.2 8.6 3.6-1.3 6.2-4.6 6.2-8.6V4.6L10 2.2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="m7 10 2 2 4-4.2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
