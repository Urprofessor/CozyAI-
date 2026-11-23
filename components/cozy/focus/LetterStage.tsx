'use client';

import { useId, useState } from 'react';
import { cn } from '@/lib/utils';
import type { StageStyle } from '@/lib/cozy/stageStyle';

/* Where mom and baby are, in the top right of the first letter. Three looks
 * to compare from the demo panel (lib/cozy/stageStyle.ts):
 *  - stamp: a perforated postage stamp with the week, and a round postmark
 *    carrying the date that stamps down as the letter opens
 *  - steps: baby footprints from birth to week 8, stepping in one by one,
 *    the current week lit
 *  - track: the original Birth · now · next dots
 * A tap opens a small note on what's typical this week. */

const WEEK_NOTE = [
  'Many babies share a first real smile',
  'A growth spurt can make feeds feel nonstop for a few days',
  'One longer stretch of sleep may start to appear',
];

interface Props {
  style: StageStyle;
  week: number;
  /** "Nov 23" — shown on the postmark (the stamp style) */
  date: string;
}

export function LetterStage({ style, week, date }: Props) {
  const [open, setOpen] = useState(false);
  const noteId = useId();
  const label = `Week ${week}${style === 'stamp' ? `, sent ${date}` : ''}. What’s typical this week`;

  return (
    <div className={cn('cz-stage-wrap', `is-${style}`)}>
      <button
        type="button"
        className="cz-stage-btn"
        aria-label={label}
        aria-expanded={open}
        aria-controls={noteId}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        {style === 'stamp' ? <Stamp week={week} date={date} /> : style === 'steps' ? <Footprints week={week} /> : <Track week={week} />}
      </button>
      {open && (
        <div
          id={noteId}
          className="cz-stage-note"
          role="note"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(false);
          }}
        >
          <p className="cz-stage-note__title">What’s typical at week {week}</p>
          <ul>
            {WEEK_NOTE.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
          <p className="cz-stage-note__foot">Every baby has their own pace.</p>
        </div>
      )}
    </div>
  );
}

/* ---------- Stamp ---------- */

function Stamp({ week, date }: { week: number; date: string }) {
  const [month, day] = date.toUpperCase().split(' ');
  return (
    <span className="cz-stamp" aria-hidden>
      <span className="cz-stamp__paper">
        <span className="cz-stamp__face">
          <img src="/cozie/illustrations/sleep.png" alt="" />
          <b>WEEK {week}</b>
        </span>
      </span>
      <svg className="cz-postmark" viewBox="0 0 96 56" fill="none">
        <defs>
          <path id="cz-postmark-ring" d="M28 8a20 20 0 1 1 0 40a20 20 0 1 1 0-40" />
        </defs>
        <circle cx="28" cy="28" r="25" strokeWidth="1.6" />
        <circle cx="28" cy="28" r="15.5" strokeWidth="1" />
        <text className="cz-postmark__ring">
          <textPath href="#cz-postmark-ring" startOffset="0">
            COZIE POST · MOMCOZY · COZIE POST ·
          </textPath>
        </text>
        <text className="cz-postmark__month" x="28" y="26" textAnchor="middle">
          {month}
        </text>
        <text className="cz-postmark__day" x="28" y="37" textAnchor="middle">
          {day}
        </text>
        {/* cancellation waves */}
        <path d="M56 16c5-3 10 3 15 0s10-3 15 0 6 1 9-1" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M56 24c5-3 10 3 15 0s10-3 15 0 6 1 9-1" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M56 32c5-3 10 3 15 0s10-3 15 0 6 1 9-1" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M56 40c5-3 10 3 15 0s10-3 15 0 6 1 9-1" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </span>
  );
}

/* ---------- Footprints ---------- */

const PRINTS = 8; // birth → week 8

function Footprints({ week }: { week: number }) {
  return (
    <span className="cz-trail" aria-hidden>
      <span className="cz-trail__label">
        Week {week}
        <small> of {PRINTS}</small>
      </span>
      <span className="cz-trail__path">
        {Array.from({ length: PRINTS }, (_, i) => {
          const n = i + 1;
          const state = n < week ? 'past' : n === week ? 'now' : 'next';
          return (
            <i key={i} className={cn('cz-print', `is-${state}`, i % 2 ? 'is-right' : 'is-left')} style={{ animationDelay: `${600 + i * 120}ms` }}>
              <svg viewBox="0 0 10 16">
                <path d="M5.2 15.2c-2.3 0-3.3-1.9-3.1-4.3.2-2.7 1.1-5.4 3.5-5.7 2.2-.3 3.1 1.9 2.8 4.7-.3 2.8-1.1 5.3-3.2 5.3Z" />
                <circle cx="2.3" cy="3.4" r="1.15" />
                <circle cx="4.3" cy="2.1" r="1" />
                <circle cx="6.1" cy="1.8" r="0.9" />
                <circle cx="7.7" cy="2.5" r="0.8" />
                <circle cx="8.7" cy="3.9" r="0.7" />
              </svg>
            </i>
          );
        })}
      </span>
      <span className="cz-trail__ends">
        <span>Birth</span>
        <span>Week {PRINTS}</span>
      </span>
    </span>
  );
}

/* ---------- Track (original) ---------- */

function Track({ week }: { week: number }) {
  return (
    <span className="cz-stage" aria-hidden>
      <span className="cz-stage__label">
        <i />
        Week {week}
      </span>
      <span className="cz-stage__track">
        <i className="is-past" />
        <i className="is-now" />
        <i />
      </span>
    </span>
  );
}
