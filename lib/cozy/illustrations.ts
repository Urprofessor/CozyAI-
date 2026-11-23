import type { FocusId } from './focus';
import type { SummaryType } from './story-card';

/* Illustrations for story cards, from the Momcozy design team's card set
 * (cut from their boards with the card colour made transparent, so they sit
 * on any card colour). Higher-resolution originals can replace these files
 * in public/cozie/illustrations/ without code changes. A topic with no
 * entry falls back to its line drawing. */

export type IllustrationTopic = FocusId | SummaryType;

const DIR = '/cozie/illustrations';

export const ILLUSTRATIONS: Partial<Record<IllustrationTopic, string>> = {
  // The four directions
  lactation: `${DIR}/lactation.png`, // mom nursing in an armchair
  sleep: `${DIR}/sleep.png`, // baby asleep, arms up
  growth: `${DIR}/growth.png`, // baby on a scale
  mood: `${DIR}/mood.png`, // mom holding her baby
  // Card blocks in replies
  steps: `${DIR}/settle.png`, // mom settling baby in a cot
  tips: `${DIR}/respond.png`, // mom watching baby in a cot
  checklist: `${DIR}/growth.png`,
  number: `${DIR}/lactation.png`,
  compare: `${DIR}/sleep.png`,
};
