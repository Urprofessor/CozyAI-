'use client';

import { INTRO_VARIANTS, replayIntro, setIntroVariant, useIntroVariant } from '@/lib/cozy/introVariant';

/** Desktop-only reviewer panel beside the phone frame: pick which first-run
 *  intro Cozie shows (A film / B guided) and replay it. Hidden on phones. */
export function DemoPanel() {
  const variant = useIntroVariant();

  return (
    <aside className="demo-panel" aria-label="Demo controls">
      <p className="demo-panel__eyebrow">Demo controls</p>
      <h2 className="demo-panel__title">Cozie intro</h2>

      <div className="demo-panel__opts" role="radiogroup" aria-label="Intro version">
        {INTRO_VARIANTS.map((v) => (
          <button
            key={v.id}
            type="button"
            role="radio"
            aria-checked={variant === v.id}
            className="demo-panel__opt"
            onClick={() => {
              setIntroVariant(v.id);
              replayIntro();
            }}
          >
            <span className="demo-panel__tag">{v.tag}</span>
            <strong>{v.label}</strong>
            <small>{v.note}</small>
          </button>
        ))}
      </div>

      <button type="button" className="demo-panel__replay" onClick={replayIntro}>
        Replay intro
      </button>
      <p className="demo-panel__hint">Opens Cozie on the intro. Your chats and memory are kept.</p>
    </aside>
  );
}
