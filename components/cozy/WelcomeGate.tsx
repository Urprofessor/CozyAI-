'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';

// The three intro cards live as PNGs in public/images/cozyaichat.
const CARDS = [
  '/images/cozyaichat/AI%20suggestion%20card.png',
  '/images/cozyaichat/AI%20suggestion%20card%20(1).png',
  '/images/cozyaichat/AI%20suggestion%20card%20(2).png',
];

interface Props {
  onStart: () => void;
}

/** First-run welcome shown when there's no chat history yet. Lives inside the
 *  tab shell (tab bar stays), so no full-screen mask / back arrow. */
export function WelcomeGate({ onStart }: Props) {
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="cozy-welcome">
      <div className="cozy-welcome__top">
        <span className="cozy-welcome__brand">
          <Sparkles size={18} strokeWidth={2} />
          Cozy AI
        </span>
      </div>

      <div className="cozy-welcome__body">
        <img
          className="cozy-welcome__mascot"
          src="/images/IP_%E9%AB%98%E5%85%B4.png"
          alt=""
          draggable={false}
        />
        <h1 className="cozy-welcome__title">How can I help today?</h1>
        <p className="cozy-welcome__subtitle">
          Warm answers for feeding, sleep, device support, and everyday baby care.
        </p>

        <div className="cozy-welcome__cards" aria-label="What Cozy AI offers">
          {CARDS.map((src) => (
            <img key={src} src={src} alt="" draggable={false} />
          ))}
        </div>
      </div>

      <div className="cozy-welcome__foot">
        <label className="cozy-welcome__agree">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
          />
          <span>
            I agree to{' '}
            {/* Privacy policy dialog is intentionally not wired up yet. */}
            <a role="button" tabIndex={0}>
              Privacy Statement
            </a>
          </span>
        </label>

        <button
          type="button"
          className="mc-button mc-button--lg cozy-welcome__start"
          disabled={!agreed}
          onClick={onStart}
        >
          Get Started
        </button>
      </div>
    </div>
  );
}
