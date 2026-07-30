'use client';

import { History, SquarePen } from 'lucide-react';

interface Props {
  onOpenHistory: () => void;
  onNewSession: () => void;
}

/** Cozy AI tab topbar — no back button (tab-level page). Center identity,
 *  right-side history + new-chat controls. */
export function CozyTopbar({ onOpenHistory, onNewSession }: Props) {
  return (
    <div className="cozy-topbar">
      {/* User profile — reused from the Community header (avatar + badge). */}
      <button className="avatar-button cozy-topbar__profile" type="button" aria-label="Profile">
        <img src="/figma/community-avatar.png" alt="" />
        <span>2</span>
      </button>

      <div className="cozy-topbar__identity">
        <img src="/images/IP_%E9%AB%98%E5%85%B4.png" alt="" draggable={false} />
        <strong>Cozy AI</strong>
      </div>
      <div className="cozy-topbar__actions">
        <button
          type="button"
          className="cozy-topbar__btn"
          onClick={onOpenHistory}
          aria-label="Chat history"
          title="Chat history"
        >
          <History size={18} strokeWidth={1.9} />
        </button>
        <button
          type="button"
          className="cozy-topbar__btn"
          onClick={onNewSession}
          aria-label="Start a new chat"
          title="Start a new chat"
        >
          <SquarePen size={17} strokeWidth={1.9} />
        </button>
      </div>
    </div>
  );
}
