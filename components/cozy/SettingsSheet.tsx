'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { BottomSheet, ConfirmDialog, CZ, showToast } from './ui';
import type { DemoAccount } from '@/lib/cozy/account-demo';
import type { MemoryProfile } from '@/lib/cozy/memory-profile';
import { setSourceOn, useSourcesOff, type ImportSource } from '@/lib/cozy/sources';
import { DataSources, memoriesLabel } from './DataSources';

interface Props {
  open: boolean;
  title: string;
  onClose: () => void;
  onResetMemory: () => void;
  onDeleteHistory: () => void;
  /** 'sources' shows Settings → Data sources in the same sheet. */
  view: 'main' | 'sources';
  onView: (view: 'main' | 'sources') => void;
  account: DemoAccount;
  memory: MemoryProfile;
  onForget: (ids: string[]) => void;
  onOpenMemory: () => void;
}

type Pending = 'reset' | 'delete' | null;

/** App AgentChatSettingsView: memory toggle, reset memory, data sources,
 *  delete all chat history. In the demo, "memory" is the Cozy profile.
 *  Data sources open as a second view inside the same sheet. */
export function SettingsSheet({
  open,
  title,
  onClose,
  onResetMemory,
  onDeleteHistory,
  view,
  onView,
  account,
  memory,
  onForget,
  onOpenMemory,
}: Props) {
  const [memoryOn, setMemoryOn] = useState(true);
  const [pending, setPending] = useState<Pending>(null);
  const [deletingImport, setDeletingImport] = useState<ImportSource | null>(null);
  const off = useSourcesOff();
  const sourceCount = 1 + account.devices.length; // account + devices
  const sourcesOn = [!off.has('account'), ...account.devices.map((d) => !off.has(`device:${d.kind}`))].filter(
    Boolean,
  ).length;

  return (
    <>
      <BottomSheet open={open} onClose={onClose} label="Chat settings" className="cz-settings">
        <button type="button" className="cz-glass-btn cz-settings__close" onClick={onClose} aria-label="Close">
          <img src={`${CZ}/icons/settings_close.svg`} alt="" />
        </button>

        {view === 'sources' ? (
          <DataSources
            account={account}
            memory={memory}
            onBack={() => onView('main')}
            onDeleteImport={setDeletingImport}
            onOpenMemory={onOpenMemory}
          />
        ) : (
          <>
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
              <button type="button" className="cz-settings__row" onClick={() => onView('sources')}>
                <span className="ds__icon" aria-hidden>
                  ⇄
                </span>
                <span className="cz-settings__text">
                  <strong>Data sources</strong>
                  <span>
                    {sourcesOn} of {sourceCount} in use · devices, imports and apps
                  </span>
                </span>
                <span className="ds__chevron" aria-hidden>
                  ›
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
          </>
        )}
      </BottomSheet>

      {deletingImport && (
        <ConfirmDialog
          title={`Delete ${memoriesLabel(deletingImport.entryIds.length)}?`}
          message={`Everything Cozie learned from ${deletingImport.kind === 'file' ? deletingImport.from : `your ${deletingImport.from} answer`} will be forgotten. This can’t be undone.`}
          confirmLabel="Delete"
          onCancel={() => setDeletingImport(null)}
          onConfirm={() => {
            onForget(deletingImport.entryIds);
            setSourceOn(deletingImport.key, true); // no switch left behind for a gone source
            setDeletingImport(null);
            showToast('Deleted. Cozie has forgotten them.');
          }}
        />
      )}
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
