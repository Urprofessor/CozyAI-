'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronUp, Info, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { deriveNextUp, isProfileSufficient, type CozyProfile } from '@/lib/cozy/profile';

interface Props {
  profile: CozyProfile;
  /** True once the chat stream is scrolled down past the top — auto-collapses
   *  the briefing so it gets out of the way while reading a long reply. */
  scrolled?: boolean;
}

/** "What's coming up next?" briefing that sits between the topbar and the chat
 *  stream. Auto-collapses on scroll (and re-expands back at the top); a manual
 *  tap overrides that until the scroll direction flips again. Cold-start prompt
 *  when the profile is thin, aggregated to-dos/insights once it fills in. The ↗
 *  jumps to the full schedule page. */
export function NextUpBar({ profile, scrolled = false }: Props) {
  const sufficient = isProfileSufficient(profile) || !!profile.lactationPlan?.trackingStarted;
  const items = sufficient ? deriveNextUp(profile) : [];

  // Manual override lives only within the current scroll regime: taps stick
  // until `scrolled` flips, then auto (open = !scrolled) takes over again.
  const [manual, setManual] = useState<boolean | null>(null);
  const prevScrolled = useRef(scrolled);
  useEffect(() => {
    if (prevScrolled.current !== scrolled) {
      prevScrolled.current = scrolled;
      setManual(null);
    }
  }, [scrolled]);

  const open = manual !== null ? manual : !scrolled;
  const toggle = () => setManual(!open);

  return (
    <div className="nextup">
      <div className="nextup__head">
        <button
          type="button"
          className="nextup__label"
          onClick={toggle}
          aria-expanded={open}
        >
          <Info size={16} strokeWidth={2} />
          <span>What&rsquo;s coming up next?</span>
        </button>

        <Link href="/cozy/schedule" className="nextup__jump" aria-label="Open schedule">
          <ArrowUpRight size={18} strokeWidth={2} />
        </Link>

        <button
          type="button"
          className="nextup__toggle"
          onClick={toggle}
          aria-label={open ? 'Collapse' : 'Expand'}
        >
          {open ? <ChevronDown size={18} strokeWidth={2} /> : <ChevronUp size={18} strokeWidth={2} />}
        </button>
      </div>

      <div className={cn('nextup__body', !open && 'nextup__body--collapsed')} aria-hidden={!open}>
        {sufficient ? (
          <ul className="nextup__list">
            {items.map((it) => (
              <li key={it.key}>
                <strong>{it.label}</strong>
                <span>{it.detail}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="nextup__cold">
            <strong>We&rsquo;re still learning your rhythm.</strong>
            <span>Chat and log a little more — the forecasts get sharper the more I know.</span>
          </div>
        )}
      </div>
    </div>
  );
}
