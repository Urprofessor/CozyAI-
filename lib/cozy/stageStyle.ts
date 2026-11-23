'use client';

import { useEffect, useState } from 'react';

/** How the first letter shows where mom and baby are (top right of the
 *  letter). Reviewers flip between them from the desktop demo panel:
 *  - stamp: a postage stamp with the week, postmarked with the date
 *  - steps: a trail of baby footprints from birth, the current one lit
 *  - track: the original three-dot Birth · now · next track */
export type StageStyle = 'stamp' | 'steps' | 'track';

export const STAGE_STYLES: { id: StageStyle; label: string; note: string }[] = [
  { id: 'stamp', label: 'Stamp', note: 'A postage stamp, postmarked with the date.' },
  { id: 'steps', label: 'Footprints', note: 'Little footprints from birth to now.' },
  { id: 'track', label: 'Track', note: 'The original three-dot track.' },
];

const KEY = 'cozyStageStyle';
const CHANGE_EVENT = 'cozie:stage-style';
const DEFAULT: StageStyle = 'stamp';

function read(): StageStyle {
  try {
    const v = localStorage.getItem(KEY);
    return STAGE_STYLES.some((s) => s.id === v) ? (v as StageStyle) : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

export function setStageStyle(v: StageStyle) {
  try {
    localStorage.setItem(KEY, v);
  } catch {
    /* private mode — the event below still switches this tab */
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: v }));
}

/** Current stage style; follows changes from the demo panel (and other tabs). */
export function useStageStyle(): StageStyle {
  const [v, setV] = useState<StageStyle>(DEFAULT);
  useEffect(() => {
    setV(read());
    const sync = () => setV(read());
    const onChange = (e: Event) => setV((e as CustomEvent<StageStyle>).detail);
    window.addEventListener(CHANGE_EVENT, onChange);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, onChange);
      window.removeEventListener('storage', sync);
    };
  }, []);
  return v;
}
