'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { CZ, showToast, ToastHost } from './ui';

interface Props {
  onStart: () => void;
}

// Intro video in place of the App's rotating capability deck. Until the final
// cut is dropped in at INTRO_VIDEO, the slot shows its placeholder backdrop.
const INTRO_VIDEO = `${CZ}/onboarding/intro.mp4`;

function IntroVideo() {
  const [ready, setReady] = useState(false);
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    setReduce(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  return (
    <div className="cz-consent__video" aria-label="What Cozie offers">
      <img
        className="cz-consent__video-ph"
        src={`${CZ}/ip/Cozy_Magic_Light.webp`}
        alt=""
        draggable={false}
      />
      <video
        className={cn(ready && 'is-ready')}
        src={INTRO_VIDEO}
        autoPlay={!reduce}
        muted
        loop
        playsInline
        preload="auto"
        onLoadedData={() => setReady(true)}
      />
    </div>
  );
}

/** App AgentChatConsentViewController: first-run activation page with the
 *  intro video, the privacy agreement and "Get started". */
export function WelcomeGate({ onStart }: Props) {
  const [agreed, setAgreed] = useState(false);
  const [prompt, setPrompt] = useState(false);

  function comingSoon(label: string) {
    showToast(`${label} is coming soon.`);
  }

  return (
    <div className="cz-consent">
      <img className="cz-page__wash" src={`${CZ}/icons/header_background.png`} alt="" aria-hidden />

      <div className="cz-consent__scroll">
        <img
          className="cz-consent__hero"
          src={`${CZ}/icons/cozie_magic_wand_light.png`}
          alt=""
          draggable={false}
        />
        <h1 className="cz-consent__title">How can I help today?</h1>
        <p className="cz-consent__subtitle">
          Warm answers for feeding, sleep, device support, and everyday baby care.
        </p>
        <IntroVideo />
      </div>

      <div className="cz-consent__agree">
        <button
          type="button"
          role="checkbox"
          aria-checked={agreed}
          aria-label="I agree to the privacy statement"
          onClick={() => setAgreed((v) => !v)}
        >
          <img src={`${CZ}/icons/${agreed ? 'consent_checked' : 'consent_unchecked'}.svg`} alt="" />
        </button>
        <span>
          I agree to{' '}
          <button type="button" className="cz-link" onClick={() => comingSoon('Privacy statement')}>
            Privacy statement
          </button>
          <span className="cz-consent__gap" />
          <button type="button" className="cz-link" onClick={() => comingSoon('Medical disclaimer')}>
            Medical disclaimer
          </button>
        </span>
      </div>

      <button
        type="button"
        className="cz-consent__start"
        onClick={() => (agreed ? onStart() : setPrompt(true))}
      >
        Get started
      </button>

      {prompt && (
        <div className="cz-alert-scrim" onClick={() => setPrompt(false)}>
          <div
            className="cz-consent-prompt"
            role="alertdialog"
            aria-label="Agree to the privacy statement"
            onClick={(e) => e.stopPropagation()}
          >
            <strong>Agree to the privacy statement</strong>
            <p>
              Please review and agree to our{' '}
              <button type="button" className="cz-link" onClick={() => comingSoon('Privacy statement')}>
                Privacy statement
              </button>{' '}
              before getting started.
            </p>
            <button
              type="button"
              className={cn('cz-consent-prompt__btn', 'is-primary')}
              onClick={() => {
                setAgreed(true);
                setPrompt(false);
                onStart();
              }}
            >
              Agree and continue
            </button>
            <button type="button" className="cz-consent-prompt__btn" onClick={() => setPrompt(false)}>
              Not now
            </button>
          </div>
        </div>
      )}

      <ToastHost />
    </div>
  );
}
