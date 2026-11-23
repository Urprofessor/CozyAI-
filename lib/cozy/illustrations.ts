import type { FocusId } from './focus';
import type { SummaryType } from './story-card';

/* Illustrations for story cards, from the Momcozy design team's set.
 * Drop each file in public/cozie/illustrations/ (transparent PNG or SVG)
 * and add it here; until then a card shows its line-drawing placeholder. */

export type IllustrationTopic = FocusId | SummaryType;

export const ILLUSTRATIONS: Partial<Record<IllustrationTopic, string>> = {
  // sleep: '/cozie/illustrations/sleep.png',
  // lactation: '/cozie/illustrations/lactation.png',
  // growth: '/cozie/illustrations/growth.png',
  // mood: '/cozie/illustrations/mood.png',
  // steps: '/cozie/illustrations/steps.png',
  // checklist: '/cozie/illustrations/checklist.png',
  // tips: '/cozie/illustrations/tips.png',
  // compare: '/cozie/illustrations/compare.png',
  // number: '/cozie/illustrations/number.png',
};
