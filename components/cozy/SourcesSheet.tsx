'use client';

import { BottomSheet, CZ } from './ui';

const WHO_URL = 'https://www.who.int/';

// Demo sources — every row links to the WHO site.
const SOURCES = [
  {
    title: 'Breastfeeding',
    summary: 'Guidance on exclusive breastfeeding, feeding frequency and supporting mothers.',
    type: 'World Health Organization',
  },
  {
    title: 'Newborn health',
    summary: 'Essential newborn care, growth and warning signs in the first weeks of life.',
    type: 'World Health Organization',
  },
  {
    title: 'Infant and young child feeding',
    summary: 'Recommendations on milk intake, responsive feeding and safe preparation.',
    type: 'World Health Organization',
  },
];

/** App AgentChatSourcesView: "Source (N)" sheet listing the reply's sources;
 *  tapping a row opens the page (the App uses an in-app web view). */
export function SourcesSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <BottomSheet open={open} onClose={onClose} label="Sources" className="cz-sources">
      <div className="cz-sources__grabber" />
      <header className="cz-sources__head">
        <strong>Source ({SOURCES.length})</strong>
        <button type="button" className="cz-glass-btn" onClick={onClose} aria-label="Close">
          <img src={`${CZ}/icons/settings_close.svg`} alt="" />
        </button>
      </header>
      <div className="cz-sources__list">
        {SOURCES.map((s) => (
          <a
            key={s.title}
            className="cz-sources__row"
            href={WHO_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            <strong>{s.title}</strong>
            <span className="cz-sources__summary">{s.summary}</span>
            <span className="cz-sources__type">{s.type}</span>
          </a>
        ))}
      </div>
    </BottomSheet>
  );
}
