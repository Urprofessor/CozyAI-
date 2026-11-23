'use client';

import { useEffect, useState } from 'react';

/** How the first letter opens. Reviewers flip between them from the desktop
 *  demo panel to compare:
 *  - moment: the letter appears line by line, and only "I noticed" fills the
 *            screen for a moment before settling into its card
 *  - story:  a few full-screen year-in-review pages play first (one fact
 *            each, tap to continue), the last being "I noticed", which settles
 *            into its card in the fully shown letter */
export type LetterVariant = 'moment' | 'story';

export const LETTER_VARIANTS: { id: LetterVariant; label: string; note: string }[] = [
  { id: 'moment', label: 'Letter · one moment', note: 'Line by line; only the insight fills the screen.' },
  { id: 'story', label: 'Story · year in review', note: 'A few full-screen pages, then the letter.' },
];

const KEY = 'cozyLetterVariant';
const CHANGE_EVENT = 'cozie:letter-variant';

function read(): LetterVariant {
  try {
    return localStorage.getItem(KEY) === 'story' ? 'story' : 'moment';
  } catch {
    return 'moment';
  }
}

export function setLetterVariant(v: LetterVariant) {
  try {
    localStorage.setItem(KEY, v);
  } catch {
    /* private mode — the event below still switches this tab */
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: v }));
}

/** Current letter style; follows changes from the demo panel (and other tabs). */
export function useLetterVariant(): LetterVariant {
  const [v, setV] = useState<LetterVariant>('moment');
  useEffect(() => {
    setV(read());
    const sync = () => setV(read());
    const onChange = (e: Event) => setV((e as CustomEvent<LetterVariant>).detail);
    window.addEventListener(CHANGE_EVENT, onChange);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, onChange);
      window.removeEventListener('storage', sync);
    };
  }, []);
  return v;
}
