'use client';

import { SquarePen } from 'lucide-react';

interface Props {
  onNewSession: () => void;
}

/** Cozy AI tab topbar — no back button (tab-level page). Center identity,
 *  right-side "new chat" restart. */
export function CozyTopbar({ onNewSession }: Props) {
  return (
    <div className="cozy-topbar">
      <div className="cozy-topbar__identity">
        <img src="/images/IP_%E9%AB%98%E5%85%B4.png" alt="" draggable={false} />
        <strong>Cozy AI</strong>
        <img className="beta" src="/icon/Beta.png" alt="Beta" draggable={false} />
      </div>
      <button
        type="button"
        className="cozy-topbar__new"
        onClick={onNewSession}
        aria-label="Start a new chat"
        title="Start a new chat"
      >
        <SquarePen size={17} strokeWidth={1.9} />
      </button>
    </div>
  );
}
