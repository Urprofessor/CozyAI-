'use client';

import type { LactationPlan } from '@/lib/cozy/profile';
import { SkillCard } from './SkillCard';
import { PlanCard } from './PlanCard';

const HIGHLIGHTS = [
  '根据你的目标和作息，生成个性化吸奶节奏',
  '追踪每次泵奶量，自动提醒下一次',
  '奶量变化趋势，及时调整计划',
];

interface Props {
  plan?: LactationPlan;
  onStart: () => void;
  onStartTracking: () => void;
  onViewDetail: () => void;
}

/** One chat message reflecting the pumping-plan skill's current state:
 *  offer → in-progress "继续填写" → generated plan card. */
export function LactationSkillMessage({ plan, onStart, onStartTracking, onViewDetail }: Props) {
  const status = plan?.status;

  if (status === 'completed' && plan) {
    return (
      <div className="flex flex-col self-start w-full gap-2">
        <SkillCard
          title="AI 吸乳计划"
          subtitle="为你量身定制的科学吸奶节奏。"
          highlights={HIGHLIGHTS}
          cta="制定我的吸乳计划"
          completed
          onStart={onStart}
        />
        <PlanCard plan={plan} onStartTracking={onStartTracking} onViewDetail={onViewDetail} />
      </div>
    );
  }

  return (
    <SkillCard
      title="AI 吸乳计划"
      subtitle="为你量身定制的科学吸奶节奏。"
      highlights={HIGHLIGHTS}
      cta="制定我的吸乳计划"
      paused={status === 'in_progress'}
      progress={status === 'in_progress' ? plan?.progress : undefined}
      onStart={onStart}
    />
  );
}
