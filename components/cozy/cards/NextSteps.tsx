'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { daysUntil, fmtMinutes, type DemoAccount } from '@/lib/cozy/account-demo';
import type { GuidanceKind } from '@/lib/cozy/first-guidance';
import {
  nextStepsPlan,
  readQuickLog,
  saveQuickLog,
  setStepReminder,
  useNextSteps,
  type QuickLog,
  type StepDay,
} from '@/lib/cozy/next-steps';
import { showToast } from '../ui';
import { StoryCard, TrendLine } from './StoryCard';

/* The first-task cards' "what's next" (lib/cozy/next-steps.ts): the promised
 * timeline in the card's Done state, and the cards that keep each promise
 * when she comes back. */

const WHEN: Record<StepDay, string> = { 1: 'Tomorrow', 3: 'Day 3' };

/** "What's next" in a finished first-task card: tomorrow, then day 3, and a
 *  reminder so she doesn't have to remember to come back. */
export function NextStepsPanel({ account, kind }: { account: DemoAccount; kind: GuidanceKind }) {
  const plan = nextStepsPlan(account, kind);
  const status = useNextSteps(kind);
  const [asking, setAsking] = useState(false);

  async function toggle() {
    if (status.remind) {
      setStepReminder(kind, false);
      return;
    }
    setAsking(true);
    try {
      if ('Notification' in window && Notification.permission === 'default') await Notification.requestPermission();
    } catch {
      /* unsupported (e.g. iOS Safari outside a home-screen app) */
    }
    setAsking(false);
    setStepReminder(kind, true);
    showToast('Cozie will let you know when it’s ready.');
  }

  return (
    <div className="sc__panel ns">
      <p className="ns__label">What’s next</p>
      <ol className="ns__steps">
        {plan.steps.map((s) => (
          <li key={s.day} className={cn(status.delivered.includes(s.day) && 'is-done')}>
            <span className="ns__dot" aria-hidden />
            <span className="ns__when">{status.delivered.includes(s.day) ? 'Ready' : WHEN[s.day]}</span>
            <strong>{s.title}</strong>
            <small>{s.text}</small>
          </li>
        ))}
      </ol>
      <div className="ns__remind">
        <span>{plan.remind}</span>
        <button
          type="button"
          role="switch"
          aria-checked={status.remind}
          aria-label={plan.remind}
          disabled={asking}
          className={cn('cz-switch', status.remind && 'is-on')}
          onClick={toggle}
        />
      </div>
    </div>
  );
}

/** The line under an unfinished first-task card: what she'll get for doing it. */
export function NextStepsOffer({ account, kind }: { account: DemoAccount; kind: GuidanceKind }) {
  const offer = nextStepsPlan(account, kind).offer;
  return offer ? <p className="ns__offer">{offer}</p> : null;
}

/* ---------- The cards that keep the promise ---------- */

const TONE = { 'pump-plan': 'pink', 'sleep-plan': 'lavender', checkup: 'green', mood: 'yellow' } as const;
const ART = { 'pump-plan': 'lactation', 'sleep-plan': 'sleep', checkup: 'checklist', mood: 'mood' } as const;

export function NextStepCard({
  account,
  kind,
  day,
  onSend,
}: {
  account: DemoAccount;
  kind: GuidanceKind;
  day: StepDay;
  onSend: (text: string) => void;
}) {
  const title = nextStepsPlan(account, kind).steps.find((s) => s.day === day)?.title ?? '';
  const frame = (body: React.ReactNode, hero?: React.ReactNode, source?: string) => (
    <StoryCard
      tone={TONE[kind]}
      eyebrow={day === 1 ? 'As promised' : 'Day 3'}
      title={title}
      art={ART[kind]}
      hero={hero}
      source={source}
      className="sc--chat ft ns-card"
    >
      {body}
    </StoryCard>
  );

  if (kind === 'pump-plan' && account.pumping) {
    const days = account.pumping;
    if (day === 1) {
      // "Yesterday" is the latest day in her M5 log.
      const y = days[days.length - 1];
      const total = y.sessions.reduce((s, x) => s + x.ml, 0);
      const night = y.sessions.find((s) => s.time < '05:00');
      return frame(
        <p className="sc__note">
          {total} ml in all{night ? `, and your night session was the fullest at ${night.ml} ml` : ''}.
          The times are working — let’s keep them.
        </p>,
        <Hero number={`${y.sessions.length} of ${y.sessions.length}`} sub="Sessions on your plan yesterday" />,
        'From your M5 pump',
      );
    }
    const last3 = days.slice(-3).map((d) => d.sessions.reduce((s, x) => s + x.ml, 0));
    const holding = last3[2] >= last3[0] * 0.95;
    return frame(
      <>
        <TrendLine values={last3} label="Pumped each day · last 3 days" />
        <p className="sc__note">
          {holding
            ? 'Steady. The new times are holding your supply, so there’s nothing to change.'
            : 'A little lower than three days ago — worth watching, not worrying. One missed session can do it.'}
        </p>
      </>,
      <Hero number={`${last3[2]} ml`} sub={`Yesterday, from ${last3[0]} ml three days ago`} />,
      'From your M5 pump',
    );
  }

  if (kind === 'sleep-plan' && account.sleep) {
    const nights = account.sleep;
    const baby = account.baby.name;
    if (day === 1) {
      const [prev, last] = nights.slice(-2);
      return frame(
        <p className="sc__note">
          Up from {fmtMinutes(prev.longestMin)} the night before, with {last.nightWakes} night wakes. Keep the
          evening calm and dim again tonight.
        </p>,
        <Hero number={fmtMinutes(last.longestMin)} sub={`${baby}’s longest stretch last night`} />,
        'From your BM04 monitor',
      );
    }
    const last3 = nights.slice(-3);
    return frame(
      <>
        <ul className="sc__log">
          {last3.map((n, i) => (
            <li key={n.date} className={cn(i === last3.length - 1 && 'is-next')}>
              <time>{new Date(`${n.date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short' })}</time>
              <span>
                Longest {fmtMinutes(n.longestMin)} · {n.nightWakes} wakes
              </span>
            </li>
          ))}
        </ul>
        <p className="sc__note">The long stretch is growing night by night. The rhythm is working — keep it going.</p>
      </>,
      undefined,
      'From your BM04 monitor',
    );
  }

  if (kind === 'checkup') return day === 1 ? frame(<QuickLogForm account={account} />) : frame(<DoctorNote account={account} />);

  if (kind === 'mood') {
    return frame(
      <>
        <p className="sc__note">How was last night for you?</p>
        <div className="ns__choices">
          {['It was okay', 'Pretty rough', 'Really hard'].map((t) => (
            <button key={t} type="button" onClick={() => onSend(t)}>
              {t}
            </button>
          ))}
        </div>
      </>,
    );
  }

  return null;
}

function Hero({ number, sub }: { number: string; sub: string }) {
  return (
    <div className="sc__hero">
      <strong>{number}</strong>
      <span>{sub}</span>
    </div>
  );
}

const FEEDS = ['6–7 times', '8–9 times', '10 or more'];
const SLEEPS = ['About 2 h', 'About 3 h', '4 h or more'];

/** Day 1 without a device: two taps on yesterday, kept for day 3's note. */
function QuickLogForm({ account }: { account: DemoAccount }) {
  const [log, setLog] = useState<QuickLog>(() => readQuickLog());
  const baby = account.baby.name;
  const pick = (patch: QuickLog) => {
    const next = { ...log, ...patch };
    setLog(next);
    saveQuickLog(next);
    if (next.feeds && next.sleep) showToast('Saved for his check-up note.');
  };
  return (
    <>
      <p className="ns__q">How often did {baby} feed yesterday?</p>
      <div className="ns__choices">
        {FEEDS.map((f) => (
          <button key={f} type="button" className={cn(log.feeds === f && 'is-on')} onClick={() => pick({ feeds: f })}>
            {f}
          </button>
        ))}
      </div>
      <p className="ns__q">His longest sleep?</p>
      <div className="ns__choices">
        {SLEEPS.map((s) => (
          <button key={s} type="button" className={cn(log.sleep === s && 'is-on')} onClick={() => pick({ sleep: s })}>
            {s}
          </button>
        ))}
      </div>
      {log.feeds && log.sleep && <p className="ns__saved">✓ Saved. On day 3 it goes into his note for the doctor.</p>}
    </>
  );
}

/** Day 3 without a device: what she logged, ready to bring to the check-up. */
function DoctorNote({ account }: { account: DemoAccount }) {
  const log = readQuickLog();
  const weighed = account.growth.filter((g) => g.weightKg);
  const latest = weighed[weighed.length - 1];
  const rows = [
    ['Feeds', log.feeds ? `${log.feeds} a day` : 'Not logged yet'],
    ['Longest sleep', log.sleep ?? 'Not logged yet'],
    ...(latest ? [['Last weight', `${latest.weightKg} kg · ${latest.label.toLowerCase()}`]] : []),
    ['Check-up', `${account.nextCheckup.label} · in ${daysUntil(account.nextCheckup.date)} days`],
  ];
  return (
    <>
      <dl className="sc__panel ns__note">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <p className="sc__note">Show this at the appointment, or ask me what to raise with the doctor.</p>
    </>
  );
}
