'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { useCozyVisible } from '@/components/shell/cozyClose';
import { CZ, showToast, ToastHost } from './ui';

interface Props {
  onStart: () => void;
  onClose: () => void;
}

const INTRO_VIDEO = `${CZ}/onboarding/intro.mp4`;

/** Full-screen intro film. Plays once from the top each time Cozie is opened
 *  and rests on its last frame; paused while Cozie is closed. With reduced
 *  motion it just shows that last frame. */
function IntroVideo() {
  const visible = useCozyVisible();
  const ref = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (!visible) {
      v.pause();
      return;
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    v.currentTime = 0;
    v.play().catch(() => {
      /* autoplay refused — the first frame stays up */
    });
  }, [visible]);

  return (
    <video
      ref={ref}
      className={cn('cz-consent__video', ready && 'is-ready')}
      src={INTRO_VIDEO}
      muted
      playsInline
      preload="auto"
      aria-label="What Cozie offers"
      onLoadedMetadata={(e) => {
        const v = e.currentTarget;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          v.currentTime = Math.max(0, v.duration - 0.05);
        }
      }}
      onLoadedData={() => setReady(true)}
    />
  );
}

/** App AgentChatConsentViewController: first-run activation page — the intro
 *  film full screen, with the privacy agreement and "Get started" floating
 *  over its faded bottom. */
export function WelcomeGate({ onStart, onClose }: Props) {
  const [agreed, setAgreed] = useState(false);
  const [prompt, setPrompt] = useState(false);

  function comingSoon(label: string) {
    showToast(`${label} is coming soon.`);
  }

  return (
    <div className="cz-consent">
      <IntroVideo />

      <button type="button" className="cz-glass-btn cz-consent__close" onClick={onClose} aria-label="Close Cozie">
        <img src={`${CZ}/icons/settings_close.svg`} alt="" width={22} height={22} draggable={false} />
      </button>

      <div className="cz-consent__panel">
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
      </div>

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
