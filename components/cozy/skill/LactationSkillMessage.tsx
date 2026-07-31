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
}

/** One chat message that reflects the pumping-plan skill's current state:
 *  offer card until the questionnaire is done, then the generated plan card. */
export function LactationSkillMessage({ plan, onStart, onStartTracking }: Props) {
  const completed = plan?.status === 'completed';

  if (completed && plan) {
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
        <PlanCard plan={plan} onStartTracking={onStartTracking} />
      </div>
    );
  }

  return (
    <SkillCard
      title="AI 吸乳计划"
      subtitle="为你量身定制的科学吸奶节奏。"
      highlights={HIGHLIGHTS}
      cta="制定我的吸乳计划"
      started={plan?.status === 'in_progress'}
      onStart={onStart}
    />
  );
}
