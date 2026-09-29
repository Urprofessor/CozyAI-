// Handoff keyword triggers — checked client-side on the user's message before
// even calling the LLM. Fast path for the obvious cases so we don't burn tokens
// on "my pump is broken, refund please" going through the AI.

export const COZY_HANDOFF_KEYWORDS = [
  'broken', 'defective', 'damaged', 'refund', 'replacement', 'complaint',
  '损坏', '坏了', '退款', '退货', '换货', '投诉',
  'not working', 'stopped working', "won't turn on",
] as const;

export function detectHandoffTrigger(text: string): boolean {
  if (!text) return false;
  const low = text.toLowerCase();
  return COZY_HANDOFF_KEYWORDS.some((k) => low.includes(k.toLowerCase()));
}

// Card keyword triggers — a client-side backstop for the model's [[SKILL:*]]
// tags, so the demo reliably surfaces the lactation cards. The card itself is
// chosen by plan state (setup card vs plan dashboard); see Chat.tsx.

/** Today's schedule / next session → schedule card. Checked first. */
export const COZY_SCHEDULE_KEYWORDS = [
  "today's schedule", 'todays schedule', 'pumping schedule', 'pump schedule',
  'next session', 'next pump', 'when should i pump', 'when do i pump',
  '今天的安排', '今日安排', '今天安排', '吸奶安排', '泵奶安排', '日程',
  '下一次吸奶', '下次吸奶', '下一次泵奶', '什么时候吸奶',
] as const;

/** Pumping plan / supply goals → setup card or plan dashboard. */
export const COZY_LACTATION_KEYWORDS = [
  'lactation plan', 'pumping plan', 'pump plan', 'my plan',
  'milk supply', 'increase supply', 'increase my supply', 'boost supply',
  'low supply', 'maintain supply', 'wean', 'weaning',
  '吸乳计划', '吸奶计划', '泵奶计划', '追奶', '奶量变化', '增加奶量',
  '奶量少', '奶不够', '维持奶量', '断奶', '离乳',
] as const;

export type CardSkill = 'lactation' | 'schedule';

/** Returns the card skill to surface for a user message, or null. */
export function detectSkillTrigger(text: string): CardSkill | null {
  if (!text) return null;
  const low = text.toLowerCase();
  const has = (list: readonly string[]) => list.some((k) => low.includes(k.toLowerCase()));
  if (has(COZY_SCHEDULE_KEYWORDS)) return 'schedule';
  if (has(COZY_LACTATION_KEYWORDS)) return 'lactation';
  return null;
}
