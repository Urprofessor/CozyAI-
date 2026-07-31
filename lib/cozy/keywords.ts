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

// Keywords that surface the pumping-plan skill card in the chat.
export const COZY_SKILL_KEYWORDS = ['奶量变化', '吸乳计划', '追奶计划'] as const;

/** Returns the skill id to surface, or null. Only lactation for now. */
export function detectSkillTrigger(text: string): string | null {
  if (!text) return null;
  return COZY_SKILL_KEYWORDS.some((k) => text.includes(k)) ? 'lactation' : null;
}
