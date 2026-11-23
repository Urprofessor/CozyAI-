'use client';

import { INTRO_VARIANTS, replayIntro, setIntroVariant, useIntroVariant } from '@/lib/cozy/introVariant';
import { showFollowUpNow } from '@/lib/cozy/first-task';
import { LETTER_VARIANTS, setLetterVariant, useLetterVariant } from '@/lib/cozy/letterVariant';
import { ACCOUNT_PRESETS, setAccountPreset, useDemoAccount } from '@/lib/cozy/account-demo';
import { STAGES, setLifeStage, useLifeStage } from '@/lib/cozy/lifecycle';
import { resetAi, resetFiles, setHealthConnected, useConnections } from '@/lib/cozy/connections';

/** Desktop-only reviewer panel beside the phone frame: pick which first-run
 *  intro Cozie shows (A film / B guided) and replay it, pick the demo Momcozy
 *  account behind the letter and its hubs, and flip data-source states. Hidden on phones. */
export function DemoPanel() {
  const variant = useIntroVariant();
  const connections = useConnections();
  const account = useDemoAccount();
  const letterVariant = useLetterVariant();
  const stage = useLifeStage();

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
        <p className="demo-panel__subtitle">Letter style</p>
        <div className="demo-panel__accounts" role="radiogroup" aria-label="How the first letter opens">
          {LETTER_VARIANTS.map((v) => (
            <button
              key={v.id}
              type="button"
              role="radio"
              aria-checked={letterVariant === v.id}
              onClick={() => {
                setLetterVariant(v.id);
                replayIntro();
              }}
            >
              <strong>{v.label}</strong>
              <small>{v.note}</small>
            </button>
          ))}
        </div>
      </div>

      <div className="demo-panel__section">
        <p className="demo-panel__subtitle">Momcozy account</p>
        <div className="demo-panel__accounts" role="radiogroup" aria-label="Demo Momcozy account">
          {ACCOUNT_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={account.preset === p.id}
              onClick={() => setAccountPreset(p.id)}
            >
              <strong>{p.label}</strong>
              <small>{p.note}</small>
            </button>
          ))}
        </div>
      </div>

      <div className="demo-panel__section">
        <p className="demo-panel__subtitle">Lifecycle stage</p>
        <p className="demo-panel__hint">
          Changes the first-run recommendations. Pregnancy stages have no Momcozy device data, so the account above
          is ignored there.
        </p>
        <div className="demo-panel__accounts" role="radiogroup" aria-label="Lifecycle stage">
          {STAGES.map((s) => (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={stage === s.id}
              onClick={() => {
                setLifeStage(s.id);
                // Replay onboarding so the stage's opener + task card show now.
                replayIntro();
              }}
            >
              <strong>{s.label}</strong>
              <small>{s.note}</small>
            </button>
          ))}
        </div>
      </div>

      <div className="demo-panel__section">
        <p className="demo-panel__subtitle">Data sources</p>
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

      <div className="demo-panel__section">
        <p className="demo-panel__subtitle">First task</p>
        <button type="button" className="demo-panel__link" onClick={showFollowUpNow}>
          Show tomorrow’s check-in now
        </button>
      </div>
    </aside>
  );
}
