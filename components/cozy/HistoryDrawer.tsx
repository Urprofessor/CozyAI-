'use client';

import { Trash2, X } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import type { CozySession } from '@/lib/cozy/types';

interface Props {
  open: boolean;
  sessions: CozySession[];
  currentSessionId: string | null;
  onClose: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

/** Right-side chat-history drawer: one row per archived session. */
export function HistoryDrawer({
  open,
  sessions,
  currentSessionId,
  onClose,
  onSelect,
  onDelete,
}: Props) {
  return (
    <>
      <div
        className={`cozy-history-scrim ${open ? 'is-open' : ''}`}
        onClick={onClose}
        aria-hidden={!open}
      />
      <aside
        className={`cozy-history-drawer ${open ? 'is-open' : ''}`}
        role="dialog"
        aria-label="Chat history"
        aria-hidden={!open}
      >
        <header className="cozy-history-head">
          <strong>Chat history</strong>
          <button type="button" onClick={onClose} aria-label="Close">
            <X size={18} strokeWidth={2} />
          </button>
        </header>

        {sessions.length === 0 ? (
          <div className="cozy-history-empty">
            <p>No conversations yet</p>
            <span>Your past chats with Cozy AI will show up here.</span>
          </div>
        ) : (
          <ul className="cozy-history-list">
            {sessions.map((s) => (
              <li
                key={s.id}
                className={`cozy-history-row ${s.id === currentSessionId ? 'is-active' : ''}`}
              >
                <button type="button" className="cozy-history-open" onClick={() => onSelect(s.id)}>
                  <strong>{s.title}</strong>
                  <span>{formatRelativeTime(s.updatedAt)}</span>
                </button>
                <button
                  type="button"
                  className="cozy-history-del"
                  onClick={() => onDelete(s.id)}
                  aria-label="Delete conversation"
                >
                  <Trash2 size={16} strokeWidth={1.9} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </>
  );
}
