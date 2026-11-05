'use client';

import { CZ } from './ui';

interface Props {
  /** Profile title: "Mom and Baby" when both are known, else "Cozie". */
  title: string;
  canSelectBaby: boolean;
  onOpenHistory: () => void;
  /** Opens Cozie's home (the picture-book room). */
  onOpenHome: () => void;
  /** Something new is waiting at Cozie's. */
  homeBadge: boolean;
  onClose: () => void;
}

/** App TopBarComponent: 44pt glass history button (left), avatar + profile
 *  title (center), Cozie's home and close (right), over a blur that fades
 *  into the page. New chat lives in the history drawer. */
export function CozyTopbar({ title, canSelectBaby, onOpenHistory, onOpenHome, homeBadge, onClose }: Props) {
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
          className="cz-glass-btn cz-home-btn"
          onClick={onOpenHome}
          aria-label={homeBadge ? '去 Cozie 家，有新动态' : '去 Cozie 家'}
        >
          <span className="cz-home-btn__face">
            <img src={`${CZ}/home/room/cozie_face.webp`} alt="" draggable={false} />
          </span>
          {homeBadge && <span className="cz-home-btn__dot" aria-hidden />}
        </button>
        <button type="button" className="cz-glass-btn" onClick={onClose} aria-label="Close Cozie">
          <img src={`${CZ}/icons/settings_close.svg`} alt="" width={22} height={22} draggable={false} />
        </button>
      </div>
    </header>
  );
}
