'use client';

import { INTRO_VARIANTS, replayIntro, setIntroVariant, useIntroVariant } from '@/lib/cozy/introVariant';
import { useState } from 'react';
import { resetNextSteps, skipToDay } from '@/lib/cozy/next-steps';
import { LETTER_VARIANTS, setLetterVariant, useLetterVariant } from '@/lib/cozy/letterVariant';
import { ACCOUNT_PRESETS, setAccountPreset, useDemoAccount } from '@/lib/cozy/account-demo';
import { resetAi, resetFiles, setHealthConnected, useConnections } from '@/lib/cozy/connections';

/** Desktop-only reviewer panel beside the phone frame: pick which first-run
 *  intro Cozie shows (A film / B guided) and replay it, pick the demo Momcozy
 *  account behind the letter and its hubs, and flip data-source states. Hidden on phones. */
export function DemoPanel() {
  const variant = useIntroVariant();
  const connections = useConnections();
  const account = useDemoAccount();
  const letterVariant = useLetterVariant();
  const [skipNote, setSkipNote] = useState('');

  function skip(day: 1 | 3) {
    const due = skipToDay(day);
    setSkipNote(
      due === null
        ? 'Finish a first-task card in the chat first (save the plan, rhythm or checklist).'
        : !due.length
          ? `Day ${day}: nothing new to show.`
          : due.some((d) => d.remind)
            ? `Day ${day}: the notification is on the phone. Tap it to open Cozie.`
            : `Day ${day}: reminders are off, so it waits in Cozie until she opens it.`
    );
  }

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
        <p className="demo-panel__subtitle">After the first task</p>
        <button type="button" className="demo-panel__link" onClick={() => skip(1)}>
          Skip to tomorrow
        </button>
        <button type="button" className="demo-panel__link" onClick={() => skip(3)}>
          Skip to day 3
        </button>
        <button
          type="button"
          className="demo-panel__link"
          onClick={() => {
            resetNextSteps();
            setSkipNote('Back to today. Finish a first-task card to start again.');
          }}
        >
          Reset
        </button>
        {skipNote && <p className="demo-panel__hint">{skipNote}</p>}
      </div>
    </aside>
  );
}
