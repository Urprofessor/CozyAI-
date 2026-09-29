'use client';

import { CZ, MaskIcon } from './ui';

interface Props {
  /** Profile title: "Mom and Baby" when both are known, else "Cozie". */
  title: string;
  canSelectBaby: boolean;
  onOpenHistory: () => void;
  onNewSession: () => void;
  newSessionEnabled: boolean;
}

/** App TopBarComponent: 44pt glass history button (left), avatar + profile
 *  title (center), 44pt glass new-chat button (right), over a blur that fades
 *  into the page. */
export function CozyTopbar({
  title,
  canSelectBaby,
  onOpenHistory,
  onNewSession,
  newSessionEnabled,
}: Props) {
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

      <button
        type="button"
        className="cz-glass-btn"
        onClick={onNewSession}
        disabled={!newSessionEnabled}
        // App: only shown once a conversation exists (chat mode).
        style={{ visibility: newSessionEnabled ? 'visible' : 'hidden' }}
        aria-label="Start a new chat"
      >
        <MaskIcon src={`${CZ}/icons/new_conversation_figma.svg`} size={24} />
      </button>
    </header>
  );
}
