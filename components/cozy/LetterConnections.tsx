'use client';

import { useId, useState } from 'react';

const sources = [
  {
    id: 'health',
    title: 'Apple Health',
    subtitle: 'Share sleep records',
    description: 'If you choose to share your sleep records, Cozie can refer to them when you talk about your rest.',
  },
  {
    id: 'devices',
    title: 'Momcozy devices',
    subtitle: 'Share pumping records',
    description: 'If you choose to share pumping records from a compatible Momcozy device, Cozie can use them when you talk about your routine.',
  },
] as const;

export function LetterConnections() {
  const id = useId();
  const [selected, setSelected] = useState<(typeof sources)[number]['id'] | null>(null);

  return (
    <section className="cz-connections" aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`}>Make it personal</h3>
      <p>Choose what you’d like to share with Cozie. You can keep reading without connecting.</p>
      <div className="cz-connections__stack">
        {sources.map((source) => {
          const open = selected === source.id;
          const panelId = `${id}-${source.id}`;
          return (
            <div key={source.id} className="cz-connections__card" data-source={source.id}>
              <button
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setSelected(open ? null : source.id)}
              >
                <span>
                  <strong>{source.title}</strong>
                  <small>{source.subtitle}</small>
                </span>
                <SourceIllustration source={source.id} />
                <span aria-hidden className="cz-connections__chevron">⌄</span>
              </button>
              <div id={panelId} className="cz-connections__details" hidden={!open}>
                <p>{source.description}</p>
                <p className="cz-connections__preview">Preview only. This demo does not connect or read your data.</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SourceIllustration({ source }: { source: (typeof sources)[number]['id'] }) {
  return (
    <svg viewBox="0 0 80 64" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {source === 'health' ? (
        <>
          <path d="M47 32S28 21 28 12c0-9 12-12 19-3 7-9 19-6 19 3 0 9-19 20-19 20Z" />
          <path d="M5 56c11-1 16-9 25-11 7-2 12 0 19-1 5-1 7 5 1 7l-13 3m-19 8c9-6 23-1 33-7l22-16c4-4 0-8-5-5L54 44" />
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
