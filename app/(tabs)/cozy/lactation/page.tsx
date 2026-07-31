'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import {
  LACTATION_GOAL_LABELS,
  seedLactationSessions,
  type LactationGoal,
} from '@/lib/cozy/profile';

type Answers = {
  goal?: LactationGoal;
  dailyFreq?: number;
  durationMin?: number;
  applyTo?: string;
};

const STEPS = [
  {
    key: 'goal' as const,
    title: '你的目标是？',
    layout: 'col' as const,
    options: (['increase', 'maintain', 'wean'] as LactationGoal[]).map((g) => ({
      value: g,
      label: LACTATION_GOAL_LABELS[g],
    })),
  },
  {
    key: 'dailyFreq' as const,
    title: '每天泵奶几次？',
    layout: 'row' as const,
    options: [5, 6, 7, 8].map((f) => ({ value: f, label: `${f} 次` })),
  },
  {
    key: 'durationMin' as const,
    title: '单次时长？',
    layout: 'row' as const,
    options: [15, 20, 25, 30].map((d) => ({ value: d, label: `${d} min` })),
  },
  {
    key: 'applyTo' as const,
    title: '应用到哪些时段？',
    layout: 'row' as const,
    options: ['全天', '白天', '夜间'].map((a) => ({ value: a, label: a })),
  },
];

const TOTAL = STEPS.length;

export default function LactationQuestionnaire() {
  const router = useRouter();
  const { profile, applyPatch } = useProfile();
  const seed = profile.lactationPlan; // pre-filled from conversation extraction

  const [answers, setAnswers] = useState<Answers>({
    goal: seed?.goal,
    dailyFreq: seed?.dailyFreq,
    durationMin: seed?.durationMin,
    applyTo: seed?.applyTo,
  });
  // Resume where they left off, if paused mid-flow.
  const [step, setStep] = useState(() => Math.min(seed?.progress?.current ?? 0, TOTAL - 1));

  const current = STEPS[step];
  const currentValue = answers[current.key];
  const isLast = step === TOTAL - 1;

  function select(value: string | number) {
    setAnswers((a) => ({ ...a, [current.key]: value }));
  }

  function next() {
    if (currentValue == null) return;
    if (isLast) {
      finish();
      return;
    }
    // Save partial progress so the chat card can offer "继续填写".
    applyPatch({
      lactationPlan: {
        ...answers,
        [current.key]: currentValue,
        status: 'in_progress',
        progress: { current: step + 1, total: TOTAL },
      },
    });
    setStep((s) => s + 1);
  }

  function finish() {
    const goal = answers.goal!;
    applyPatch({
      lactationPlan: {
        ...answers,
        goalLabel: LACTATION_GOAL_LABELS[goal],
        status: 'completed',
        trackingStarted: false,
        progress: { current: TOTAL, total: TOTAL },
        sessions: seedLactationSessions(),
        todayVolumeOz: 32,
        createdAt: Date.now(),
      },
    });
    router.push('/cozy');
  }

  return (
    <div className="lac-q">
      <div className="lac-q__top">
        <button
          type="button"
          className="schedule-page__back"
          onClick={() => (step === 0 ? router.push('/cozy') : setStep((s) => s - 1))}
          aria-label="Back"
        >
          <ChevronLeft size={20} strokeWidth={2} />
        </button>
        <strong>AI 吸乳计划</strong>
        <span className="lac-q__count">
          {step + 1}/{TOTAL}
        </span>
      </div>

      <div className="lac-q__progress">
        <div className="lac-q__progress-fill" style={{ width: `${((step + 1) / TOTAL) * 100}%` }} />
      </div>

      <div className="lac-q__scroll">
        {(seed?.goal || seed?.dailyFreq) && step === 0 ? (
          <p className="lac-q__prefill">已根据你的对话预填，确认或修改即可。</p>
        ) : null}

        <section className="lac-q__section">
          <h2>{current.title}</h2>
          <div className={`lac-q__opts ${current.layout === 'row' ? 'lac-q__opts--row' : ''}`}>
            {current.options.map((o) => (
              <button
                key={String(o.value)}
                type="button"
                className={`${current.layout === 'row' ? 'lac-q__chip' : 'lac-q__opt'} ${
                  currentValue === o.value ? 'is-on' : ''
                }`}
                onClick={() => select(o.value)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </section>
      </div>

      <div className="lac-q__foot">
        <button
          type="button"
          className="mc-button mc-button--lg cozy-welcome__start"
          disabled={currentValue == null}
          onClick={next}
        >
          {isLast ? '生成我的计划' : '下一步'}
        </button>
      </div>
    </div>
  );
}
