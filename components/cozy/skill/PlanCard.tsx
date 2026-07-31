'use client';

// Ported from the colleague's `m` component — the generated-plan summary card.

import Link from 'next/link';
import type { LactationPlan } from '@/lib/cozy/profile';

interface Props {
  plan: LactationPlan;
  onStartTracking: () => void;
}

export function PlanCard({ plan, onStartTracking }: Props) {
  const trackingStarted = !!plan.trackingStarted;

  return (
    <div className="animate-rise self-start w-[92%] max-w-[92%] overflow-hidden rounded-[12px] border border-[var(--color-line)] bg-white shadow-[0_4px_16px_rgba(36,15,27,0.06)]">
      <div className="flex items-center gap-2 bg-[#edf7f0] px-3 py-2">
        <span className="text-[13px] text-[#2f6b45]">✓</span>
        <span className="text-[12px] font-medium text-[#2f6b45]">你的 AI 吸奶计划已生成</span>
      </div>

      <div className="space-y-2 px-3 py-3 text-[13px] leading-[18px] text-[var(--color-ink)]">
        <div>
          <b>目标</b>：{plan.goalLabel || '追奶'}
        </div>
        <div>
          <b>频次</b>：{plan.dailyFreq ?? 7} 次/天
        </div>
        <div>
          <b>Duration</b>：{plan.durationMin ?? 20} min
        </div>
        <div>
          <b>Apply to</b>：{plan.applyTo || '全天'}
        </div>
      </div>

      <div className="flex gap-2 border-t border-[var(--color-line)] px-3 py-2.5">
        <Link
          href="/cozy/schedule"
          className="rounded-[6px] px-2.5 py-1.5 text-[12px] text-[var(--color-muted)]"
        >
          查看详情
        </Link>
        {trackingStarted ? (
          <div className="rounded-[6px] bg-[var(--color-mom-50)] px-2.5 py-1.5 text-[12px] font-medium text-[var(--color-mom-700)]">
            Tracking on
          </div>
        ) : (
          <button
            type="button"
            onClick={onStartTracking}
            className="rounded-[6px] bg-[#7c1f3e] px-2.5 py-1.5 text-[12px] font-medium text-white"
          >
            Start tracking
          </button>
        )}
      </div>
    </div>
  );
}
