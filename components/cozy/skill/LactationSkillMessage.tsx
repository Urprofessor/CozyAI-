'use client';

import { SkillCard } from './SkillCard';

const HIGHLIGHTS = [
  '根据你的目标和作息，生成个性化吸奶节奏',
  '追踪每次泵奶量，自动提醒下一次',
  '奶量变化趋势，及时调整计划',
];

interface Props {
  onStart: () => void;
}

/** The chip/keyword-triggered skill card. Always the initial offer state so the
 *  user can (re)make a plan each time — the generated plan surfaces separately
 *  as its own PlanCard message. */
export function LactationSkillMessage({ onStart }: Props) {
  return (
    <SkillCard
      title="AI 吸乳计划"
      subtitle="为你量身定制的科学吸奶节奏。"
      highlights={HIGHLIGHTS}
      cta="制定我的吸乳计划"
      onStart={onStart}
    />
  );
}
