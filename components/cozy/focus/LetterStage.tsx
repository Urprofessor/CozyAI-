'use client';

import { useId, useState } from 'react';

/* Where mom and baby are, in the top right of the first letter: a
 * perforated postage stamp with the week, and a round postmark carrying the
 * date that stamps down as the letter opens. A tap opens a small note on
 * what's typical this week. */

const WEEK_NOTE = [
  'Many babies share a first real smile',
  'A growth spurt can make feeds feel nonstop for a few days',
  'One longer stretch of sleep may start to appear',
];

interface Props {
  week: number;
  /** "Nov 23" — shown on the postmark */
  date: string;
}

export function LetterStage({ week, date }: Props) {
  const [open, setOpen] = useState(false);
  const noteId = useId();
  const label = `Week ${week}, sent ${date}. What’s typical this week`;

  return (
    <div className="cz-stage-wrap">
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
        <Stamp week={week} date={date} />
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
