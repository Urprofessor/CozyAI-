'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import type { DemoAccount } from '@/lib/cozy/account-demo';
import { focusAsks, focusDef, focusQuestions, type FocusId, type SharperAsk } from '@/lib/cozy/focus';
import { BottomSheet, CZ, showToast } from '../ui';
import { openAiImport } from '../memory/AiImport';
import { openFileImport } from '../memory/FileImport';
import { ShieldIcon } from '../memory/ImportParts';
import { FocusIcon } from './FocusHub';
import { InsightStoryCard } from '../cards/StoryCard';

/* Light preview of one direction, opened from a focus tag on the first
 * letter: what Cozie can do there, one observation, questions to start with,
 * what would make answers sharper, and an "Include in my Cozie" switch that
 * stays in sync with the tag. Mom stays on the letter underneath. */

interface Props {
  /** The direction to preview, or null when closed. */
  id: FocusId | null;
  account: DemoAccount;
  included: boolean;
  onToggleInclude: (id: FocusId) => void;
  onClose: () => void;
  /** Into the chat with this question. */
  onAsk: (id: FocusId, question: string) => void;
}

export function FocusSheet({ id, account, included, onToggleInclude, onClose, onAsk }: Props) {
  // Keep the last direction on screen while the sheet slides away.
  const [shown, setShown] = useState<FocusId | null>(id);
  useEffect(() => {
    if (id) setShown(id);
  }, [id]);
  if (!shown) return null;

  const def = focusDef(shown);
  const ask = (a: SharperAsk) => {
    if (a.id === 'file') openFileImport();
    else if (a.id === 'ai') openAiImport();
    else showToast('Apple Health is preview only in this demo.');
  };

  return (
    <div className="cz-import-layer">
      <BottomSheet open={!!id} onClose={onClose} label={def.title} className={cn('cz-import fs', `fh--${shown}`)}>
        <span className="cz-sheet__grabber" aria-hidden />
        <button type="button" className="cz-glass-btn cz-import__close" onClick={onClose} aria-label="Close">
          <img src={`${CZ}/icons/settings_close.svg`} alt="" />
        </button>

        <div className="cz-import__scroll">
          <div className="fs-hero">
            <FocusIcon id={shown} />
            <div>
              <h2>{def.title}</h2>
              <p>{def.helpers}</p>
            </div>
          </div>

          <ul className="fs-can">
            {def.can.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>

          <InsightStoryCard account={account} id={shown} />

          <section className="fh-section">
            <h3>Ask Cozie</h3>
            <ul className="fh-questions">
              {focusQuestions(account, shown).map((q) => (
                <li key={q}>
                  <button type="button" onClick={() => onAsk(shown, q)}>
                    {q}
                    <span aria-hidden>↗</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="fh-section">
            <h3>Make answers sharper</h3>
            <ul className="fh-asks">
              {focusAsks(account, shown).map((a) => (
                <li key={a.id + a.title}>
                  <button type="button" onClick={() => ask(a)}>
                    <span className={cn('fh-asks__icon', `is-${a.id}`)} aria-hidden>
                      {a.id === 'file' ? 'PDF' : a.id === 'ai' ? 'AI' : '♥'}
                    </span>
                    <span>
                      <strong>{a.title}</strong>
                      <small>{a.gain}</small>
                    </span>
                    <span className="fh-asks__go" aria-hidden>
                      ›
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="fh-safe">
              <ShieldIcon />
              Optional. You review everything before Cozie keeps it, and can delete it anytime.
            </p>
          </section>
        </div>

        <div className="cz-import__footer fs-footer">
          <button
            type="button"
            role="switch"
            aria-checked={included}
            className="fs-include"
            onClick={() => onToggleInclude(shown)}
          >
            <span>
              <strong>Include in my Cozie</strong>
              <small>{included ? 'Cozie will keep an eye on this.' : 'Off for now. Turn on anytime.'}</small>
            </span>
            <i aria-hidden />
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
