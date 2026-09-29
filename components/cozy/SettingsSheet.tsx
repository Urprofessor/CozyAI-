'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { BottomSheet, ConfirmDialog, CZ, showToast } from './ui';

interface Props {
  open: boolean;
  title: string;
  onClose: () => void;
  onResetMemory: () => void;
  onDeleteHistory: () => void;
}

type Pending = 'reset' | 'delete' | null;

/** App AgentChatSettingsView: memory toggle, reset memory, delete all chat
 *  history. In the demo, "memory" is the Cozy profile. */
export function SettingsSheet({ open, title, onClose, onResetMemory, onDeleteHistory }: Props) {
  const [memoryOn, setMemoryOn] = useState(true);
  const [pending, setPending] = useState<Pending>(null);

  return (
    <>
      <BottomSheet open={open} onClose={onClose} label="Chat settings" className="cz-settings">
        <button type="button" className="cz-glass-btn cz-settings__close" onClick={onClose} aria-label="Close">
          <img src={`${CZ}/icons/settings_close.svg`} alt="" />
        </button>

        <img className="cz-settings__avatar" src={`${CZ}/icons/avatar_mom.svg`} alt="" />
        <p className="cz-settings__name">{title}</p>

        <div className="cz-settings__card">
          <div className="cz-settings__row">
            <img src={`${CZ}/icons/settings_memory.svg`} alt="" />
            <strong>Enable memory</strong>
            <button
              type="button"
              role="switch"
              aria-checked={memoryOn}
              aria-label="Enable memory"
              className={cn('cz-switch', memoryOn && 'is-on')}
              onClick={() => setMemoryOn((v) => !v)}
            />
          </div>
          <div className="cz-settings__divider" />
          <button type="button" className="cz-settings__row" onClick={() => setPending('reset')}>
            <img src={`${CZ}/icons/settings_reset.svg`} alt="" />
            <span className="cz-settings__text">
              <strong>Reset Cozie memory</strong>
              <span>Clear what Cozie remembers about you</span>
            </span>
          </button>
        </div>

        <div className="cz-settings__card">
          <button type="button" className="cz-settings__row" onClick={() => setPending('delete')}>
            <img src={`${CZ}/icons/settings_delete.svg`} alt="" />
            <span className="cz-settings__text">
              <strong>Delete chat history</strong>
              <span>Permanently delete all saved chats</span>
            </span>
          </button>
        </div>

        <p className="cz-settings__disclaimer">
          Deleting your chat history won&apos;t reset Cozie&apos;s memory.
          <br />
          Resetting memory won&apos;t delete your saved chats.
        </p>
      </BottomSheet>

      {pending === 'reset' && (
        <ConfirmDialog
          title="Reset Cozie's memory?"
          message="This clears everything Cozie has learned about you. Your saved chats stay."
          confirmLabel="Reset memory"
          onCancel={() => setPending(null)}
          onConfirm={() => {
            onResetMemory();
            setPending(null);
            showToast("Cozie's memory was reset.");
          }}
        />
      )}
      {pending === 'delete' && (
        <ConfirmDialog
          title="Delete all chat history?"
          message="This permanently deletes all your saved chats. Cozie's memory stays."
          confirmLabel="Delete"
          onCancel={() => setPending(null)}
          onConfirm={() => {
            onDeleteHistory();
            setPending(null);
            showToast('Chat history deleted.');
          }}
        />
      )}
    </>
  );
}
