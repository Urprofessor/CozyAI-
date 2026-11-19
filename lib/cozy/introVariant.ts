'use client';

import { useEffect, useState } from 'react';

/** Which first-run intro Cozie shows. Reviewers flip between them from the
 *  desktop demo panel to compare:
 *  - film:  A · the full-screen intro video with Get started over it
 *  - guide: B · a three-step guided intro (animated mini-phone hero, title,
 *           Continue) in the style of iOS first-run sheets
 *  - steps: C · three intro steps + one permissions step with a progress bar,
 *           then a checkmark and Cozie opens the chat herself (no letter) */
export type IntroVariant = 'film' | 'guide' | 'steps';

export const INTRO_VARIANTS: { id: IntroVariant; tag: string; label: string; note: string }[] = [
  { id: 'film', tag: 'A', label: 'Intro film', note: 'Full-screen video, then Get started.' },
  { id: 'guide', tag: 'B', label: 'Guided intro', note: 'Three animated steps with Continue.' },
  { id: 'steps', tag: 'C', label: 'Intro + permissions', note: '3 steps, 1 permissions page, then Cozie speaks first.' },
];

const KEY = 'cozyIntroVariant';
const CHANGE_EVENT = 'cozie:intro-variant';
/** Fired by the demo panel to show the intro again, even after onboarding. */
export const REPLAY_INTRO_EVENT = 'cozie:replay-intro';

function read(): IntroVariant {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'guide' || v === 'steps' ? v : 'film';
  } catch {
    return 'film';
  }
}

export function setIntroVariant(v: IntroVariant) {
  try {
    localStorage.setItem(KEY, v);
  } catch {
    /* private mode — the event below still switches this tab */
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: v }));
}

export function replayIntro() {
  window.dispatchEvent(new Event(REPLAY_INTRO_EVENT));
}

/** Current variant; follows changes from the demo panel (and other tabs). */
export function useIntroVariant(): IntroVariant {
  const [v, setV] = useState<IntroVariant>('film');
  useEffect(() => {
    setV(read());
    const sync = () => setV(read());
    const onChange = (e: Event) => setV((e as CustomEvent<IntroVariant>).detail);
    window.addEventListener(CHANGE_EVENT, onChange);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, onChange);
      window.removeEventListener('storage', sync);
    };
  }, []);
  return v;
}
