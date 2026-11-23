'use client';

import { useEffect, useState } from 'react';

/* The lifecycle stage the demo account is in. The Momcozy journey runs from
 * early pregnancy to weaning, and what a mom asks Cozie first is completely
 * different at each point (confirm safety → read results → when to go in →
 * help me record/calculate/plan). This is the one dimension the first-run
 * recommendations (lib/cozy/recommend.ts) key off. Demo only: the desktop
 * demo panel switches it; the default is the postpartum 1–3 month stage the
 * first "From Cozie" letter was written for. */

export type Phase = 'pregnancy' | 'postpartum';

export type LifeStage =
  | 'pre-early' // 孕早期 w1–12
  | 'pre-mid' //   孕中期 w13–27
  | 'pre-late' //  孕晚期 w28–42
  | 'pp-survival' // 产后 0–4 周
  | 'pp-order' //    产后 1–3 月
  | 'pp-develop' //  产后 3–12 月
  | 'pp-wean'; //    12 月以后 · 离乳

export interface StageMeta {
  id: LifeStage;
  phase: Phase;
  /** Label for the demo panel (Chinese, to match the source material). */
  label: string;
  note: string;
  /** Representative gestational week (pregnancy stages). */
  gestWeek?: number;
  /** Representative baby age in days (postpartum stages). */
  babyAgeDays?: number;
}

export const STAGES: StageMeta[] = [
  { id: 'pre-early', phase: 'pregnancy', label: '孕早期 w1–12', note: '确认与适应', gestWeek: 8 },
  { id: 'pre-mid', phase: 'pregnancy', label: '孕中期 w13–27', note: '感知与连接', gestWeek: 20 },
  { id: 'pre-late', phase: 'pregnancy', label: '孕晚期 w28–42', note: '负担与决策', gestWeek: 34 },
  { id: 'pp-survival', phase: 'postpartum', label: '产后 0–4 周', note: '生存模式', babyAgeDays: 14 },
  { id: 'pp-order', phase: 'postpartum', label: '产后 1–3 月', note: '秩序重建', babyAgeDays: 42 },
  { id: 'pp-develop', phase: 'postpartum', label: '产后 3–12 月', note: '发育与比较', babyAgeDays: 240 },
  { id: 'pp-wean', phase: 'postpartum', label: '12 月以后 · 离乳', note: '离乳过渡', babyAgeDays: 400 },
];

/** The stage the first letter + existing pump-plan task were built for. */
export const DEFAULT_STAGE: LifeStage = 'pp-order';

export const stageMeta = (id: LifeStage): StageMeta =>
  STAGES.find((s) => s.id === id) ?? STAGES.find((s) => s.id === DEFAULT_STAGE)!;

const KEY = 'cozyLifeStage';
const CHANGE_EVENT = 'cozie:life-stage';

export function readStage(): LifeStage {
  try {
    const v = localStorage.getItem(KEY);
    return STAGES.some((s) => s.id === v) ? (v as LifeStage) : DEFAULT_STAGE;
  } catch {
    return DEFAULT_STAGE;
  }
}

export function setLifeStage(stage: LifeStage) {
  try {
    localStorage.setItem(KEY, stage);
  } catch {
    /* private mode — the event below still updates this tab */
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: stage }));
}

/** The current demo stage; follows the demo panel. Mirrors useDemoAccount's
 *  preset plumbing (lib/cozy/account-demo.ts). */
export function useLifeStage(): LifeStage {
  const [stage, setStage] = useState<LifeStage>(DEFAULT_STAGE);
  useEffect(() => {
    setStage(readStage());
    const onChange = (e: Event) => setStage((e as CustomEvent<LifeStage>).detail);
    const onStorage = () => setStage(readStage());
    window.addEventListener(CHANGE_EVENT, onChange);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(CHANGE_EVENT, onChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);
  return stage;
}
