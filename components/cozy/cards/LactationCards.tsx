'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import type { LactationPlan } from '@/lib/cozy/profile';
import { planCardModel, scheduleModel, type PlanBar } from '@/lib/cozy/lactation';

const CARDS = '/cozie/cards';

/** Re-render every minute so relative times ("2h 5m ago") and the
 *  past/upcoming split stay current (App refreshes Last pump per minute). */
function useMinuteTick() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);
}

// ---------- Questionnaire card (AgentLactationQuestionnaireCardView) ----------

type QuestionnaireStatus = 'start' | 'process';

/** "Lactation plan" setup card. `start` offers Create; `process` shows the
 *  saved progress with Continue. `disabled` once the plan exists (the App
 *  greys out cards that no longer apply). */
export function QuestionnaireCard({
  status,
  completed = 0,
  total = 1,
  disabled = false,
  onPrimary,
}: {
  status: QuestionnaireStatus;
  completed?: number;
  total?: number;
  disabled?: boolean;
  onPrimary: () => void;
}) {
  return (
    <div className={cn('cz-qcard', status === 'process' && 'is-process')}>
      <div className="cz-qcard__head">
        <img src={`${CARDS}/agent_questionnaire_skill.svg`} alt="" />
        <strong>Lactation plan</strong>
      </div>

      {status === 'start' ? (
        <>
          <p className="cz-qcard__desc">A pumping plan that adapts to your rhythm.</p>
          <div className="cz-qcard__benefits">
            <span>Reduces blockage risk</span>
            <i />
            <span>Trusted by 20,000+ moms</span>
            <i />
            <span>3 IBCLCs Verified</span>
          </div>
        </>
      ) : (
        <>
          <p className="cz-qcard__text">{completed} steps complete. Almost done!</p>
          <div className="cz-qcard__progress">
            <div className="cz-qcard__segments">
              {Array.from({ length: total }, (_, i) => (
                <span key={i} className={cn(i < completed && 'is-done')} />
              ))}
            </div>
            <div className="cz-qcard__progress-labels">
              <span>Progress</span>
              <span>
                {completed}/{total}
              </span>
            </div>
          </div>
        </>
      )}

      <button type="button" className="cz-qcard__btn" disabled={disabled} onClick={onPrimary}>
        {status === 'start' ? 'Create' : 'Continue'}
      </button>
    </div>
  );
}

// ---------- Plan card (AgentLactationCardView) ----------

/** Dark "Lactation" dashboard: Last pump / Next session / Sessions, today's
 *  bars (record / backfill / upcoming / add) and Today's volume. */
export function PlanCard({
  plan,
  onHeader,
  onViewData,
  onBar,
}: {
  plan: LactationPlan;
  onHeader: () => void;
  onViewData: () => void;
  onBar: (bar: PlanBar) => void;
}) {
  useMinuteTick();
  const m = planCardModel(plan);

  return (
    <div className="cz-plan" style={{ backgroundImage: `url(${CARDS}/agent_lactation_card_bg.png)` }}>
      <button type="button" className="cz-plan__head" onClick={onHeader}>
        <img src={`${CARDS}/agent_lactation_star.png`} alt="" />
        <strong>Lactation</strong>
        <img className="cz-plan__chevron" src={`${CARDS}/agent_lactation_chevron.png`} alt="" />
      </button>

      <div className="cz-plan__metrics">
        <Metric title="Last pump" value={m.lastPump} />
        <Metric
          title="Next session"
          value={m.nextSession}
          suffix={
            m.nextDayOffset && (
              <span className="cz-plan__offset">
                <img src={`${CARDS}/agent_lactation_next_day_calendar.png`} alt="" />
                {m.nextDayOffset}
              </span>
            )
          }
        />
        <Metric title="Sessions" value={m.sessions} />
      </div>

      <div className="cz-plan__chart">
        <div className="cz-plan__bars">
          {m.bars.map((bar) => (
            <Bar key={bar.key} bar={bar} onTap={() => onBar(bar)} />
          ))}
        </div>
        <div className="cz-plan__scale" aria-hidden>
          <span className="cz-plan__unit">OZ</span>
          <span style={{ top: '33.33%' }}>20</span>
          <span style={{ top: '66.67%' }}>10</span>
          <span style={{ top: '100%' }}>0</span>
        </div>
      </div>

      <div className="cz-plan__foot">
        <img src={`${CARDS}/agent_lactation_volume.png`} alt="" />
        <span className="cz-plan__foot-title">Today&apos;s volume:</span>
        <span className="cz-plan__foot-value">
          {m.todayVolume.endsWith(' OZ') ? (
            <>
              {m.todayVolume.slice(0, -3)} <small>OZ</small>
            </>
          ) : (
            m.todayVolume
          )}
        </span>
        <button type="button" className="cz-plan__viewdata" onClick={onViewData}>
          View data
        </button>
      </div>
    </div>
  );
}

function Metric({ title, value, suffix }: { title: string; value: string; suffix?: React.ReactNode }) {
  return (
    <div className="cz-plan__metric">
      <span>{title}</span>
      <strong>
        {value}
        {suffix}
      </strong>
    </div>
  );
}

function Bar({ bar, onTap }: { bar: PlanBar; onTap: () => void }) {
  if (bar.style === 'add') {
    return (
      <button type="button" className="cz-plan__col is-add" onClick={onTap} aria-label="Log a session">
        <span className="cz-plan__track">
          <img src={`${CARDS}/agent_lactation_bar_add.png`} alt="" />
        </span>
        <span className="cz-plan__time" />
      </button>
    );
  }
  const tappable = bar.style === 'backfill' || bar.style === 'record';
  return (
    <button
      type="button"
      className={cn('cz-plan__col', `is-${bar.style}`)}
      onClick={tappable ? onTap : undefined}
      disabled={!tappable}
      aria-label={`${bar.time} ${bar.volumeText ? bar.volumeText + ' oz' : bar.style}`}
    >
      <span className="cz-plan__track">
        <span className="cz-plan__bar" style={{ height: `${Math.max(bar.heightRatio, 0.06) * (200 / 3)}%` }}>
          {bar.volumeText && <em>{bar.volumeText}</em>}
          {bar.style === 'backfill' && <img src={`${CARDS}/agent_lactation_edit.png`} alt="" />}
        </span>
      </span>
      <span className="cz-plan__time">{bar.time}</span>
    </button>
  );
}

// ---------- Schedule card (LactationScheduleAgentCardRenderer) ----------

/** "Today's pumping schedule": one row per session, tap to mark complete. */
export function ScheduleCard({
  plan,
  onToggle,
}: {
  plan: LactationPlan;
  onToggle: (index: number) => void;
}) {
  useMinuteTick();
  const [pending, setPending] = useState<number | null>(null);
  const { rows, subtitle } = scheduleModel(plan);

  function toggle(index: number) {
    if (pending !== null) return;
    // Brief spinner, like the App's round-trip to the plan service.
    setPending(index);
    setTimeout(() => {
      onToggle(index);
      setPending(null);
    }, 450);
  }

  return (
    <div className="cz-sched">
      <div className="cz-sched__head">
        <strong>Today&apos;s pumping schedule</strong>
        <span>{subtitle}</span>
      </div>
      <div className="cz-sched__rows">
        {rows.map((r) => (
          <button
            key={r.index}
            type="button"
            className={cn('cz-sched__row', r.highlighted && 'is-next', r.completed && 'is-done')}
            onClick={() => toggle(r.index)}
            aria-pressed={r.completed}
          >
            <span className="cz-sched__labels">
              <span className="cz-sched__time">{r.timeRange}</span>
              <span className="cz-sched__desc">Pumping session</span>
            </span>
            <img
              className={cn(pending === r.index && 'is-spinning')}
              src={`${CARDS}/${
                pending === r.index
                  ? 'agent_schedule_loading'
                  : r.completed
                    ? 'agent_schedule_checked'
                    : 'agent_schedule_unchecked'
              }.png`}
              alt=""
            />
          </button>
        ))}
      </div>
    </div>
  );
}
