'use client';

interface Props {
  onOpenHistory: () => void;
  onNewSession: () => void;
}

/** Cozy AI tab topbar: history (left), identity (center), new-chat (right).
 *  The left/right controls use the pre-styled button PNGs from /public/icon. */
export function CozyTopbar({ onOpenHistory, onNewSession }: Props) {
  return (
    <div className="cozy-topbar">
      <button
        type="button"
        className="cozy-topbar__iconbtn cozy-topbar__history"
        onClick={onOpenHistory}
        aria-label="Chat history"
        title="Chat history"
      >
        <img src="/icon/Button%20Group.png" alt="" draggable={false} />
      </button>

      <div className="cozy-topbar__identity">
        <img src="/images/IP_%E9%AB%98%E5%85%B4.png" alt="" draggable={false} />
        <strong>Cozy AI</strong>
      </div>

      <button
        type="button"
        className="cozy-topbar__iconbtn cozy-topbar__new"
        onClick={onNewSession}
        aria-label="Start a new chat"
        title="Start a new chat"
      >
        <img src="/icon/Trailing.png" alt="" draggable={false} />
      </button>
    </div>
  );
}
