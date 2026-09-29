'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { CZ, MaskIcon, showToast } from './ui';

const MAGIC_SRC = `${CZ}/ip/Cozy_Magic_Light.webp`;

/** App HomeComponent: the Cozie "magic" IP (plays once; replays on every new
 *  chat via `replayKey`) above an Exposure 28 greeting, centred in the space
 *  under the top bar. */
export function CozieHero({ replayKey }: { replayKey: number }) {
  const [hour, setHour] = useState<number | null>(null);
  const [src, setSrc] = useState(MAGIC_SRC);
  const blobRef = useRef<Blob | null>(null);

  useEffect(() => setHour(new Date().getHours()), []);

  // The WebP's loop count is 1, so a fresh image resource is needed to play it
  // again. A per-replay blob URL restarts it without re-downloading.
  useEffect(() => {
    if (replayKey === 0) return;
    let url: string | null = null;
    let cancelled = false;
    (async () => {
      try {
        if (!blobRef.current) blobRef.current = await (await fetch(MAGIC_SRC)).blob();
        if (cancelled) return;
        url = URL.createObjectURL(blobRef.current);
        setSrc(url);
      } catch {
        /* keep the current frame */
      }
    })();
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [replayKey]);

  // Same buckets as AgentAnalyticsOnboardingGreetingType.
  const greeting =
    hour === null
      ? ' '
      : hour < 12
        ? 'Good morning'
        : hour < 18
          ? 'Good afternoon'
          : 'Good evening';

  return (
    <div className="cz-home" key={replayKey}>
      <div className="cz-home__hero">
        <img className="cz-home__shadow" src={`${CZ}/icons/home_hero_shadow.png`} alt="" />
        <img className="cz-home__ip" src={src} alt="" draggable={false} />
      </div>
      <h1 className="cz-home__greeting">{greeting}</h1>
    </div>
  );
}

// Static demo content for the "Suggested for you" list (server-driven in the App).
const SUGGESTED = [
  'Bonnie slept from 1:10 to 2:05 pm.',
  'How much should my baby be eating?',
  'I pumped 5 oz total just now.',
];

interface PanelProps {
  showSuggestions: boolean;
  onSend: (text: string) => void;
  onLactationPlan: () => void;
  lactationActive: boolean;
}

/** App SugListComponent: "Suggested for you" chips (home only) and the quick
 *  access row (hidden while the keyboard is up via `.kb-open`). */
export function SuggestionPanel({
  showSuggestions,
  onSend,
  onLactationPlan,
  lactationActive,
}: PanelProps) {
  return (
    <div className={cn('cz-sug', !showSuggestions && 'cz-sug--chat')}>
      {showSuggestions && (
        <>
          <p className="cz-sug__label">Suggested for you</p>
          <div className="cz-sug__list">
            {SUGGESTED.map((q) => (
              <button
                key={q}
                type="button"
                className="cz-chip"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onSend(q)}
              >
                {q}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="cz-quick">
        <button
          type="button"
          className={cn('cz-quick__pill', lactationActive && 'is-active')}
          onClick={onLactationPlan}
        >
          <MaskIcon src={`${CZ}/icons/quick_bottle.svg`} size={20} />
          <span>Lactation plan</span>
        </button>
        <ComingSoonPill icon="quick_wave" label="Smart log" />
        <ComingSoonPill icon="quick_moon" label="BB Sleep Forecast" />
      </div>
    </div>
  );
}

function ComingSoonPill({ icon, label }: { icon: string; label: string }) {
  return (
    <button
      type="button"
      className="cz-quick__pill is-dimmed"
      onClick={() => showToast(`${label} is coming soon.`)}
    >
      <MaskIcon src={`${CZ}/icons/${icon}.svg`} size={20} />
      <span>{label}</span>
    </button>
  );
}
