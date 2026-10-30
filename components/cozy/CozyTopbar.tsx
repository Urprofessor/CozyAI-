'use client';

import { useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { CZ, showToast } from './ui';

interface Props {
  /** Profile title: "Mom and Baby" when both are known, else "Cozie". */
  title: string;
  canSelectBaby: boolean;
  onOpenHistory: () => void;
  onClose: () => void;
}

/** App TopBarComponent: 44pt glass history button (left), avatar + profile
 *  title (center), read-aloud toggle and close (right), over a blur that fades
 *  into the page. New chat lives in the history drawer. */
export function CozyTopbar({ title, canSelectBaby, onOpenHistory, onClose }: Props) {
  const [readAloud, setReadAloud] = useState(false);

  return (
    <header className="cz-topbar">
      <div className="cz-topbar__blur" aria-hidden />
      <button
        type="button"
        className="cz-glass-btn"
        onClick={onOpenHistory}
        aria-label="Open chat history"
      >
        <img src={`${CZ}/icons/menu.svg`} alt="" draggable={false} />
      </button>

      <div className="cz-topbar__profile">
        <img className="cz-topbar__avatar" src={`${CZ}/icons/avatar_mom.svg`} alt="" draggable={false} />
        <span className="cz-topbar__title">{title}</span>
        {canSelectBaby && <img src={`${CZ}/icons/chevrons.svg`} alt="" width={10} height={16} />}
      </div>

      <div className="cz-topbar__right">
        <button
          type="button"
          className="cz-glass-btn"
          aria-pressed={readAloud}
          aria-label="Read replies aloud"
          onClick={() => {
            setReadAloud((v) => !v);
            showToast('Read-aloud is coming soon.');
          }}
        >
          {readAloud ? <Volume2 size={22} strokeWidth={1.6} /> : <VolumeX size={22} strokeWidth={1.6} />}
        </button>
        <button type="button" className="cz-glass-btn" onClick={onClose} aria-label="Close Cozie">
          <img src={`${CZ}/icons/settings_close.svg`} alt="" width={22} height={22} draggable={false} />
        </button>
      </div>
    </header>
  );
}
