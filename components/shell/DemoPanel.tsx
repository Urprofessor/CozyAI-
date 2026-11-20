'use client';

import { INTRO_VARIANTS, replayIntro, setIntroVariant, useIntroVariant } from '@/lib/cozy/introVariant';
import { resetAi, resetFiles, setHealthConnected, useConnections } from '@/lib/cozy/connections';

/** Desktop-only reviewer panel beside the phone frame: pick which first-run
 *  intro Cozie shows (A film / B guided) and replay it, and flip the letter's
 *  connection cards between states. Hidden on phones. */
export function DemoPanel() {
  const variant = useIntroVariant();
  const connections = useConnections();

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

      <div className="demo-panel__section">
        <p className="demo-panel__subtitle">Letter cards</p>
        <button
          type="button"
          role="switch"
          aria-checked={connections.health === 'done'}
          className="demo-panel__switch"
          onClick={() => setHealthConnected(connections.health !== 'done')}
        >
          Apple Health connected
          <i aria-hidden />
        </button>
        <button
          type="button"
          className="demo-panel__link"
          disabled={connections.files.status === 'idle'}
          onClick={resetFiles}
        >
          Reset files card
        </button>
        <button
          type="button"
          className="demo-panel__link"
          disabled={connections.ai.status === 'idle'}
          onClick={resetAi}
        >
          Reset AI assistant card
        </button>
      </div>
    </aside>
  );
}
