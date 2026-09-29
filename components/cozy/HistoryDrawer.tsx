'use client';

import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { CozySession } from '@/lib/cozy/types';
import { ConfirmDialog, CZ } from './ui';

interface Props {
  open: boolean;
  sessions: CozySession[];
  currentSessionId: string | null;
  onClose: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onNewChat: () => void;
  onOpenSettings: () => void;
}

/** App HistoryComponent + AgentChatHistoryMenu: a left drawer revealed by
 *  sliding the whole tab page right (the page becomes a rounded, dimmed
 *  preview — see `.cz-history-open` in cozie-chat.css). Rows are grouped into
 *  Today / Earlier; long-press or right-click a row to delete it. */
export function HistoryDrawer({
  open,
  sessions,
  currentSessionId,
  onClose,
  onSelect,
  onDelete,
  onNewChat,
  onOpenSettings,
}: Props) {
  const [menuFor, setMenuFor] = useState<{ id: string; top: number } | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);
  const listRef = useRef<HTMLDivElement>(null);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const today = sessions.filter((s) => s.updatedAt >= startOfToday.getTime());
  const earlier = sessions.filter((s) => s.updatedAt < startOfToday.getTime());

  function openMenu(id: string, target: HTMLElement) {
    const list = listRef.current;
    if (!list) return;
    const top = target.getBoundingClientRect().bottom - list.getBoundingClientRect().top + list.scrollTop;
    setMenuFor({ id, top });
  }

  function rowHandlers(id: string) {
    return {
      onContextMenu: (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        openMenu(id, e.currentTarget);
      },
      onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
        if (e.pointerType === 'mouse') return;
        longPressed.current = false;
        const target = e.currentTarget;
        pressTimer.current = setTimeout(() => {
          longPressed.current = true;
          openMenu(id, target);
        }, 500);
      },
      onPointerUp: () => pressTimer.current && clearTimeout(pressTimer.current),
      onPointerLeave: () => pressTimer.current && clearTimeout(pressTimer.current),
      onClick: () => {
        if (longPressed.current) {
          longPressed.current = false;
          return;
        }
        onSelect(id);
      },
    };
  }

  function renderSection(title: string, items: CozySession[]) {
    if (!items.length) return null;
    return (
      <section key={title}>
        <h3 className="cz-history__section">{title}</h3>
        {items.map((s) => (
          <button
            key={s.id}
            type="button"
            className={cn('cz-history__row', s.id === currentSessionId && 'is-current')}
            {...rowHandlers(s.id)}
          >
            <span className="cz-history__title">{s.title || 'New chat'}</span>
            <span className="cz-history__time">{formatTime(s.updatedAt, startOfToday.getTime())}</span>
          </button>
        ))}
      </section>
    );
  }

  return (
    <>
      <aside className={cn('cz-history', open && 'is-open')} aria-label="Chat history" aria-hidden={!open}>
        <h2 className="cz-history__heading">Chat history</h2>

        <div ref={listRef} className="cz-history__list" onScroll={() => setMenuFor(null)}>
          {sessions.length === 0 ? (
            <div className="cz-history__empty">
              <strong>No chats yet</strong>
              <span>Start a new chat and it&apos;ll show up here.</span>
            </div>
          ) : (
            <>
              {renderSection('Today', today)}
              {renderSection('Earlier', earlier)}
            </>
          )}

          {menuFor && (
            <>
              <div className="cz-history__menu-scrim" onClick={() => setMenuFor(null)} />
              <div className="cz-history__menu" style={{ top: menuFor.top + 4 }}>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmId(menuFor.id);
                    setMenuFor(null);
                  }}
                >
                  <span>Delete</span>
                  <img src={`${CZ}/icons/history_delete.svg`} alt="" />
                </button>
              </div>
            </>
          )}
        </div>

        <footer className="cz-history__footer">
          <button type="button" className="cz-history__new" onClick={onNewChat}>
            <img src={`${CZ}/icons/history_new_chat.svg`} alt="" />
            <span>New chat</span>
          </button>
          <button
            type="button"
            className="cz-history__settings"
            onClick={onOpenSettings}
            aria-label="Chat settings"
          >
            <img src={`${CZ}/icons/history_settings.png`} alt="" />
          </button>
        </footer>
      </aside>

      {/* Tap the dimmed page preview to close (App: tap preview / swipe left). */}
      <div className={cn('cz-history-preview', open && 'is-open')} onClick={onClose} aria-hidden />

      {confirmId && (
        <ConfirmDialog
          title="Delete this chat?"
          message="This chat will be permanently deleted. You can't undo this."
          confirmLabel="Delete"
          onCancel={() => setConfirmId(null)}
          onConfirm={() => {
            onDelete(confirmId);
            setConfirmId(null);
          }}
        />
      )}
    </>
  );
}

/** Today → HH:mm, earlier → MM-dd (App agent_chat_history_*_format). */
function formatTime(ts: number, startOfToday: number) {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return ts >= startOfToday
    ? `${pad(d.getHours())}:${pad(d.getMinutes())}`
    : `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
