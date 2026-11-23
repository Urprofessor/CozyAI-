'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { deviceOf, pumpSummary, sleepSummary, fmtMinutes, type DemoAccount } from '@/lib/cozy/account-demo';
import { useConnections } from '@/lib/cozy/connections';
import type { MemoryProfile } from '@/lib/cozy/memory-profile';
import { deviceKey, importSources, setSourceOn, useSourcesOff, type ImportSource } from '@/lib/cozy/sources';
import { showToast } from './ui';
import { openAiImport } from './memory/AiImport';
import { openFileImport } from './memory/FileImport';
import { ShieldIcon } from './memory/ImportParts';
import { ConnectionsSky } from './ConnectionsSky';

/* Settings → Data sources: what Cozie can draw on to tailor its answers,
 * kept apart from the memory profile (what it remembers). Each source has a
 * "Use in answers" switch that really keeps it out of the chat; one-off
 * imports also list what they brought and can be deleted. New imports start
 * here too. */

interface Props {
  account: DemoAccount;
  memory: MemoryProfile;
  onBack: () => void;
  /** Ask to delete what an import brought; the sheet confirms it. */
  onDeleteImport: (imp: ImportSource) => void;
  onOpenMemory: () => void;
}

export const memoriesLabel = (n: number) => `${n} ${n === 1 ? 'memory' : 'memories'}`;

export function DataSources({ account, memory, onBack, onDeleteImport, onOpenMemory }: Props) {
  const off = useSourcesOff();
  const connections = useConnections();
  const imports = importSources(memory);
  const [openImport, setOpenImport] = useState<string | null>(null);
  const p = pumpSummary(account);
  const s = sleepSummary(account);
  const on = (key: string) => !off.has(key);

  const devices = account.devices.map((d) => ({
    key: deviceKey(d.kind),
    name: d.name.replace('Momcozy ', ''),
    what:
      d.kind === 'pump'
        ? p
          ? `Pumping sessions · about ${Math.round(p.perDay)} a day this week`
          : 'Pumping sessions'
        : d.kind === 'monitor'
          ? s
            ? `Sleep · longest stretch ${fmtMinutes(s.longestNow)}`
            : 'Sleep'
          : 'Sound sessions',
    synced: d.kind === 'pump' ? 'Synced 2 h ago' : 'Synced 1 h ago',
  }));

  return (
    <div className="ds">
      <header className="ds__head">
        <button type="button" className="ds__back" onClick={onBack}>
          ‹ Settings
        </button>
        <h2>Data sources</h2>
        <p>
          What Cozie can use to tailor its answers. Turning a source off stops Cozie using it — nothing is deleted.
        </p>
      </header>

      <ConnectionsSky connections={connections} accountOn={on('account')} />

      <p className="ds__label">Momcozy</p>
      <div className="cz-settings__card">
        <SourceRow
          icon="M"
          title="Momcozy account"
          sub={`${account.baby.name}’s profile, growth log and check-ups`}
          on={on('account')}
          onToggle={(v) => setSourceOn('account', v)}
        />
        {devices.map((d) => (
          <div key={d.key}>
            <div className="cz-settings__divider" />
            <SourceRow
              icon={d.key === 'device:pump' ? 'P' : d.key === 'device:monitor' ? 'S' : 'W'}
              title={d.name}
              sub={`${d.what} · ${d.synced}`}
              on={on(d.key)}
              onToggle={(v) => setSourceOn(d.key, v)}
            />
          </div>
        ))}
        {!deviceOf(account, 'pump') && !deviceOf(account, 'monitor') && (
          <>
            <div className="cz-settings__divider" />
            <p className="ds__empty">No Momcozy devices paired yet. Pair one in the Device tab.</p>
          </>
        )}
      </div>

      <p className="ds__label">Other apps</p>
      <div className="cz-settings__card">
        <div className="cz-settings__row ds__row">
          <span className="ds__icon is-health" aria-hidden>
            ♥
          </span>
          <span className="cz-settings__text">
            <strong>Apple Health</strong>
            <span>{connections.health === 'done' ? 'Connected · your sleep' : 'Your own sleep, to plan around your rest'}</span>
          </span>
          <button type="button" className="ds__pill" onClick={() => showToast('Apple Health is preview only in this demo.')}>
            {connections.health === 'done' ? 'Preview' : 'Connect'}
          </button>
        </div>
      </div>

      <p className="ds__label">Imported</p>
      <div className="cz-settings__card">
        {imports.length === 0 && <p className="ds__empty">Nothing imported yet.</p>}
        {imports.map((imp, i) => {
          const expanded = openImport === imp.key;
          const n = imp.entryIds.length;
          return (
            <div key={imp.key}>
              {i > 0 && <div className="cz-settings__divider" />}
              <div className="cz-settings__row ds__row">
                <button
                  type="button"
                  className="ds__expand"
                  aria-expanded={expanded}
                  onClick={() => setOpenImport(expanded ? null : imp.key)}
                >
                  <span className={cn('ds__icon', imp.kind === 'file' ? 'is-file' : 'is-ai')} aria-hidden>
                    {imp.kind === 'file' ? 'PDF' : 'AI'}
                  </span>
                  <span className="cz-settings__text">
                    <strong>{imp.kind === 'file' ? imp.from : `From ${imp.from}`}</strong>
                    <span>
                      {memoriesLabel(n)}
                      {imp.at ? ` · ${new Date(imp.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on(imp.key)}
                  aria-label={`Use ${imp.from} in answers`}
                  className={cn('cz-switch', on(imp.key) && 'is-on')}
                  onClick={() => setSourceOn(imp.key, !on(imp.key))}
                />
              </div>
              {expanded && (
                <div className="ds__actions">
                  <button type="button" onClick={onOpenMemory}>
                    See them in your memory profile
                  </button>
                  <button type="button" className="is-danger" onClick={() => onDeleteImport(imp)}>
                    {n === 1 ? 'Delete this memory' : `Delete these ${n} memories`}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="ds__add">
        <button type="button" onClick={() => openAiImport()}>
          <span className="ds__icon is-ai" aria-hidden>
            AI
          </span>
          <span className="cz-settings__text">
            <strong>Bring what your AI knows</strong>
            <span>From Claude, ChatGPT, Gemini or Grok</span>
          </span>
        </button>
        <button type="button" onClick={openFileImport}>
          <span className="ds__icon is-file" aria-hidden>
            PDF
          </span>
          <span className="cz-settings__text">
            <strong>Add a file or report</strong>
            <span>PDF, Word, a Huckleberry CSV or a photo</span>
          </span>
        </button>
      </div>

      <p className="ds__safe">
        <ShieldIcon />
        Used only to tailor Cozie’s help for you and your baby. You review every imported line before Cozie keeps it.
      </p>

    </div>
  );
}

function SourceRow({
  icon,
  title,
  sub,
  on,
  onToggle,
}: {
  icon: string;
  title: string;
  sub: string;
  on: boolean;
  onToggle: (on: boolean) => void;
}) {
  return (
    <div className="cz-settings__row ds__row">
      <span className="ds__icon" aria-hidden>
        {icon}
      </span>
      <span className="cz-settings__text">
        <strong>{title}</strong>
        <span>{on ? sub : 'Off · Cozie won’t use this'}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={`Use ${title} in answers`}
        className={cn('cz-switch', on && 'is-on')}
        onClick={() => onToggle(!on)}
      />
    </div>
  );
}
