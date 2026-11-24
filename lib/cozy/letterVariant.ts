'use client';

import { useEffect, useState } from 'react';

/** How the first letter opens. Reviewers flip between them from the desktop
 *  demo panel to compare:
 *  - moment: just the letter, appearing line by line (the id predates the
 *            change; the full-screen moment now belongs to the story)
 *  - story:  a few full-screen year-in-review pages play first (one fact
 *            each, tap to continue), the last being "I noticed", which settles
 *            into its card in the fully shown letter
 *
 *  For now only the letter is offered: the story is commented out below and
 *  every visit gets the letter. Restore the list entry and read() to bring
 *  it back. */
export type LetterVariant = 'moment' | 'story';

export const LETTER_VARIANTS: { id: LetterVariant; label: string; note: string }[] = [
  { id: 'moment', label: 'Letter', note: 'The letter appears line by line.' },
  // { id: 'story', label: 'Story · year in review', note: 'A few full-screen pages, then the letter.' },
];

const KEY = 'cozyLetterVariant';
const CHANGE_EVENT = 'cozie:letter-variant';

function read(): LetterVariant {
  // The story is parked for now: always the letter.
  // try {
  //   return localStorage.getItem(KEY) === 'story' ? 'story' : 'moment';
  // } catch {
  //   return 'moment';
  // }
  return 'moment';
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
