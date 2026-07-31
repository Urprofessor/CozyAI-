'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronUp, Info, ArrowUpRight } from 'lucide-react';
import { deriveNextUp, isProfileSufficient, type CozyProfile } from '@/lib/cozy/profile';

interface Props {
  profile: CozyProfile;
}

/** Sticky "What's coming up next?" briefing that sits between the topbar and
 *  the chat stream. Expanded by default; collapsible. Cold-start prompt when
 *  the profile is thin, aggregated to-dos/insights once it fills in. The ↗
 *  jumps to the full schedule page. */
export function NextUpBar({ profile }: Props) {
  const [open, setOpen] = useState(true);
  const sufficient = isProfileSufficient(profile) || !!profile.lactationPlan?.trackingStarted;
  const items = sufficient ? deriveNextUp(profile) : [];

  return (
    <div className="nextup">
      <div className="nextup__head">
        <button
          type="button"
          className="nextup__label"
          onClick={() => setOpen((o) => !o)}
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
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? 'Collapse' : 'Expand'}
        >
          {open ? <ChevronDown size={18} strokeWidth={2} /> : <ChevronUp size={18} strokeWidth={2} />}
        </button>
      </div>

      {open &&
        (sufficient ? (
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
        ))}
    </div>
  );
}
