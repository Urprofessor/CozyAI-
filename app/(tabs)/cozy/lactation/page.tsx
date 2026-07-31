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

const GOALS: LactationGoal[] = ['increase', 'maintain', 'wean'];
const FREQS = [5, 6, 7, 8];
const DURATIONS = [15, 20, 25, 30];
const APPLY = ['全天', '白天', '夜间'];

export default function LactationQuestionnaire() {
  const router = useRouter();
  const { profile, applyPatch } = useProfile();
  const seed = profile.lactationPlan; // pre-filled from conversation extraction

  const [goal, setGoal] = useState<LactationGoal | undefined>(seed?.goal);
  const [dailyFreq, setDailyFreq] = useState<number | undefined>(seed?.dailyFreq);
  const [durationMin, setDurationMin] = useState<number | undefined>(seed?.durationMin);
  const [applyTo, setApplyTo] = useState<string | undefined>(seed?.applyTo);

  const ready = goal && dailyFreq && durationMin && applyTo;

  function generate() {
    if (!ready) return;
    applyPatch({
      lactationPlan: {
        goal,
        goalLabel: LACTATION_GOAL_LABELS[goal],
        dailyFreq,
        durationMin,
        applyTo,
        status: 'completed',
        trackingStarted: false,
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
          onClick={() => router.push('/cozy')}
          aria-label="Back to Cozy AI"
        >
          <ChevronLeft size={20} strokeWidth={2} />
        </button>
        <strong>AI 吸乳计划</strong>
      </div>

      <div className="lac-q__scroll">
        {seed?.goal || seed?.dailyFreq ? (
          <p className="lac-q__prefill">已根据你的对话预填，确认或修改即可。</p>
        ) : null}

        <Section title="你的目标是？">
          <div className="lac-q__opts">
            {GOALS.map((g) => (
              <button
                key={g}
                type="button"
                className={`lac-q__opt ${goal === g ? 'is-on' : ''}`}
                onClick={() => setGoal(g)}
              >
                {LACTATION_GOAL_LABELS[g]}
              </button>
            ))}
          </div>
        </Section>

        <Section title="每天泵奶几次？">
          <div className="lac-q__opts lac-q__opts--row">
            {FREQS.map((f) => (
              <button
                key={f}
                type="button"
                className={`lac-q__chip ${dailyFreq === f ? 'is-on' : ''}`}
                onClick={() => setDailyFreq(f)}
              >
                {f} 次
              </button>
            ))}
          </div>
        </Section>

        <Section title="单次时长？">
          <div className="lac-q__opts lac-q__opts--row">
            {DURATIONS.map((d) => (
              <button
                key={d}
                type="button"
                className={`lac-q__chip ${durationMin === d ? 'is-on' : ''}`}
                onClick={() => setDurationMin(d)}
              >
                {d} min
              </button>
            ))}
          </div>
        </Section>

        <Section title="应用到哪些时段？">
          <div className="lac-q__opts lac-q__opts--row">
            {APPLY.map((a) => (
              <button
                key={a}
                type="button"
                className={`lac-q__chip ${applyTo === a ? 'is-on' : ''}`}
                onClick={() => setApplyTo(a)}
              >
                {a}
              </button>
            ))}
          </div>
        </Section>
      </div>

      <div className="lac-q__foot">
        <button
          type="button"
          className="mc-button mc-button--lg cozy-welcome__start"
          disabled={!ready}
          onClick={generate}
        >
          生成我的计划
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="lac-q__section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}
