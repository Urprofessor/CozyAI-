'use client';

import { useId, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  setHealthConnected,
  statusOf,
  useConnections,
  type Connections,
  type SourceId,
  type SourceStatus,
} from '@/lib/cozy/connections';
import { openAiImport } from './memory/AiImport';
import { openFileImport } from './memory/FileImport';

const sources = [
  {
    id: 'health',
    title: 'Apple Health',
    subtitle: 'Share sleep records',
    description: 'If you choose to share your sleep records, Cozie can refer to them when you talk about your rest.',
  },
  {
    id: 'files',
    title: 'Files & reports',
    subtitle: 'PDF, Word, CSV or a photo — like a Huckleberry export',
    description:
      'Add a check-up report, a discharge summary, a baby-tracker export or a photo of one. Cozie suggests what to remember, and you choose what stays.',
  },
  {
    id: 'ai',
    title: 'Your AI assistant',
    subtitle: 'Bring what Claude, ChatGPT, Gemini or Grok knows',
    description:
      'Already talked to another AI about your pregnancy or baby? We’ll email you a short prompt to run there, then you paste the answer back here. You review everything before Cozie keeps it.',
  },
] as const satisfies readonly { id: SourceId; title: string; subtitle: string; description: string }[];

/** Collapsed-card line once a source is pending or connected. */
function statusLine(id: SourceId, status: SourceStatus, c: Connections): string | null {
  if (status === 'pending') return 'Email sent · paste the answer when ready';
  if (status !== 'done') return null;
  if (id === 'health') return 'Connected · sleep, last 30 days';
  if (id === 'files') {
    const n = c.files.names.length;
    return `${n} ${n === 1 ? 'file' : 'files'} · ${things(c.files.count)}`;
  }
  return `${things(c.ai.count)} from ${c.ai.from ?? 'your AI'}`;
}

const things = (n: number) => `${n} ${n === 1 ? 'thing' : 'things'}`;

export function LetterConnections() {
  const id = useId();
  const connections = useConnections();
  const [selected, setSelected] = useState<SourceId | null>(null);

  return (
    <section className="cz-connections" aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`}>Make it personal</h3>
      <p>Choose what you’d like to share with Cozie. You can keep reading without connecting.</p>
      <div className="cz-connections__stack">
        {sources.map((source) => {
          const open = selected === source.id;
          const panelId = `${id}-${source.id}`;
          const status = statusOf(connections, source.id);
          const line = statusLine(source.id, status, connections);
          return (
            <div key={source.id} className="cz-connections__card" data-source={source.id} data-status={status}>
              <button
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setSelected(open ? null : source.id)}
              >
                <span>
                  <strong>{source.title}</strong>
                  <small className={cn(line && 'cz-connections__status')}>{line ?? source.subtitle}</small>
                </span>
                <span className="cz-connections__art">
                  <SourceIllustration source={source.id} />
                  {status !== 'idle' && <StatusBadge status={status} />}
                </span>
                <span aria-hidden className="cz-connections__chevron">⌄</span>
              </button>
              <div id={panelId} className="cz-connections__details" hidden={!open}>
                <Details source={source} status={status} connections={connections} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Details({
  source,
  status,
  connections,
}: {
  source: (typeof sources)[number];
  status: SourceStatus;
  connections: Connections;
}) {
  if (source.id === 'ai') {
    if (status === 'pending') {
      return (
        <>
          <p>We emailed you the prompt. Run it in your AI, then paste its answer here — you’ll check every line first.</p>
          <div className="cz-connections__row">
            <button type="button" className="cz-connections__action" onClick={() => openAiImport('paste')}>
              Paste the answer
            </button>
            <button type="button" className="cz-connections__link" onClick={() => openAiImport()}>
              Send the email again
            </button>
          </div>
        </>
      );
    }
    if (status === 'done') {
      const n = connections.ai.count;
      return (
        <>
          <p>
            Cozie now knows {n} {n === 1 ? 'thing' : 'things'} from {connections.ai.from ?? 'your AI'}. You can edit or
            delete them anytime in your memory profile.
          </p>
          <button type="button" className="cz-connections__link" onClick={() => openAiImport()}>
            Import more
          </button>
        </>
      );
    }
    return (
      <>
        <p>{source.description}</p>
        <button type="button" className="cz-connections__action" onClick={() => openAiImport()}>
          Email me the steps
        </button>
      </>
    );
  }

  if (source.id === 'files') {
    if (status === 'done') {
      return (
        <>
          <p>
            Cozie learned {things(connections.files.count)} from {connections.files.names.join(', ')}. You can edit or
            delete them anytime in your memory profile.
          </p>
          <button type="button" className="cz-connections__link" onClick={openFileImport}>
            Add another file
          </button>
        </>
      );
    }
    return (
      <>
        <p>{source.description}</p>
        <button type="button" className="cz-connections__action" onClick={openFileImport}>
          Choose a file
        </button>
      </>
    );
  }

  if (status === 'done') {
    return (
      <>
        <p>Cozie can refer to your sleep records from Apple Health when you talk about your rest.</p>
        <button type="button" className="cz-connections__link" onClick={() => setHealthConnected(false)}>
          Disconnect
        </button>
      </>
    );
  }

  return (
    <>
      <p>{source.description}</p>
      <p className="cz-connections__preview">Preview only. This demo does not connect or read your data.</p>
    </>
  );
}

/** Small round badge on the illustration: a check once connected, a clock while waiting. */
function StatusBadge({ status }: { status: SourceStatus }) {
  return (
    <span className={cn('cz-connections__badge', `is-${status}`)} aria-hidden>
      <svg viewBox="0 0 16 16">
        {status === 'done' ? (
          <path d="m4.2 8.3 2.5 2.5 5-5.4" />
        ) : (
          <>
            <circle cx="8" cy="8" r="4.6" />
            <path d="M8 5.6V8l1.6 1.2" />
          </>
        )}
      </svg>
    </span>
  );
}

function SourceIllustration({ source }: { source: SourceId }) {
  return (
    <svg viewBox="0 0 80 64" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {source === 'health' ? (
        <>
          <path d="M47 32S28 21 28 12c0-9 12-12 19-3 7-9 19-6 19 3 0 9-19 20-19 20Z" />
          <path d="M5 56c11-1 16-9 25-11 7-2 12 0 19-1 5-1 7 5 1 7l-13 3m-19 8c9-6 23-1 33-7l22-16c4-4 0-8-5-5L54 44" />
        </>
      ) : source === 'files' ? (
        <>
          {/* a report with a second page behind it */}
          <path d="M30 8h22l12 12v30a4 4 0 0 1-4 4H30a4 4 0 0 1-4-4V12a4 4 0 0 1 4-4Z" />
          <path d="M52 8v12h12M33 28h22M33 35h22M33 42h14" />
          <path d="M20 16v38a6 6 0 0 0 6 6h28" />
        </>
      ) : source === 'ai' ? (
        <>
          {/* two speech bubbles passing an envelope */}
          <path d="M8 12h30a5 5 0 0 1 5 5v13a5 5 0 0 1-5 5H20l-8 6v-6H8a5 5 0 0 1-5-5V17a5 5 0 0 1 5-5Z" />
          <path d="M72 26H50a5 5 0 0 0-5 5v12a5 5 0 0 0 5 5h12l8 6v-6h2a5 5 0 0 0 5-5V31a5 5 0 0 0-5-5Z" />
          <path d="M12 20h22M12 26h14M51 34l10 7 10-7M51 34h20v10H51Z" />
        </>
      ) : (
        <>
          <path d="M25 14c7-9 23-9 30 0 6 8 11 18 11 30 0 12-11 17-26 17S14 56 14 44c0-12 5-22 11-30Z" />
          <path d="M23 17c8 5 26 5 34 0M32 23c-5 6-8 15-8 22 0 8 6 12 16 12s16-4 16-12c0-7-3-16-8-22M36 14h8" />
        </>
      )}
    </svg>
  );
}
