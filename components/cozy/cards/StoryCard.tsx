'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  daysUntil,
  deviceOf,
  fmtMinutes,
  pumpSummary,
  sleepSummary,
  useDemoAccount,
  type DemoAccount,
} from '@/lib/cozy/account-demo';
import { focusInsight, type FocusId } from '@/lib/cozy/focus';
import { ILLUSTRATIONS, type IllustrationTopic } from '@/lib/cozy/illustrations';
import { TYPE_TONE, type CardSpec, type CardTone, type DataKey } from '@/lib/cozy/story-card';
import { FocusArt } from '../focus/LetterFocus';

/* Story cards: a solid pastel card with a large serif title, one hero
 * (a big number, a thin trend line, a list or a small table), a short note,
 * an illustration and a source line. Used for the first letter's "I noticed"
 * and for card blocks in Cozie's replies (lib/cozy/story-card.ts). */

const FOCUS_TONE: Record<FocusId, CardTone> = {
  lactation: 'pink',
  sleep: 'lavender',
  growth: 'green',
  mood: 'yellow',
};

interface FrameProps {
  tone: CardTone;
  eyebrow?: string;
  title?: string;
  art?: IllustrationTopic;
  /** Big number (or similar) shown beside the illustration, under the title. */
  hero?: ReactNode;
  source?: string;
  children?: ReactNode;
  className?: string;
}

/** Two layouts, after the design team's cards:
 *  - with a hero: title across the top, then the hero and a large
 *    illustration side by side, then the rest ("Gentle Ways to Settle");
 *  - without: title and a small illustration in the top row, content below
 *    ("Signs of Active Feeding"). */
export function StoryCard({ tone, eyebrow, title, art, hero, source, children, className }: FrameProps) {
  const heading = title ? (
    <h3 className="sc__title">{title}</h3>
  ) : (
    <span className="sc__title sc__title--wait" aria-hidden />
  );
  return (
    <section className={cn('sc', `sc--${tone}`, className)}>
      {eyebrow && <p className="sc__eyebrow">{eyebrow}</p>}
      {hero ? (
        <>
          {heading}
          <div className={cn('sc__split', !art && 'is-solo')}>
            <div className="sc__split-main">{hero}</div>
            {art && <Illustration topic={art} size="large" />}
          </div>
        </>
      ) : (
        <div className={cn('sc__head', !art && 'is-solo')}>
          {heading}
          {art && <Illustration topic={art} size="small" />}
        </div>
      )}
      {children}
      {source && <p className="sc__source">{source}</p>}
    </section>
  );
}

function Illustration({ topic, size }: { topic: IllustrationTopic; size: 'large' | 'small' }) {
  const src = ILLUSTRATIONS[topic];
  const cls = cn('sc__art', `sc__art--${size}`);
  if (src) return <img className={cn(cls, 'sc__art--image')} src={src} alt="" aria-hidden />;
  if (topic === 'lactation' || topic === 'sleep' || topic === 'growth' || topic === 'mood') {
    return <FocusArt id={topic} className={cls} />;
  }
  return <SummaryArt type={topic} className={cls} />;
}

/** Big number with a small line under it. */
function Hero({ number, sub }: { number: string; sub?: string }) {
  return (
    <div className="sc__hero">
      <strong>{number}</strong>
      {sub && <span>{sub}</span>}
    </div>
  );
}

/** A thin line through the points, the last one marked. */
export function TrendLine({ values, label }: { values: number[]; label: string }) {
  if (values.length < 2) return null;
  const w = 300;
  const h = 60;
  const pad = 6;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const x = (i: number) => pad + (i * (w - pad * 2)) / (values.length - 1);
  const y = (v: number) => (max === min ? h / 2 : h - pad - ((v - min) / (max - min)) * (h - pad * 2));
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const lx = x(values.length - 1);
  const ly = y(values[values.length - 1]);
  return (
    <figure className="sc__trend">
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label}>
        <path className="sc__trend-base" d={`M${pad} ${h - 1}H${w - pad}`} />
        <path className="sc__trend-line" d={d} pathLength={1} />
        <circle className="sc__trend-dot" cx={lx} cy={ly} r="4" />
      </svg>
      <figcaption>{label}</figcaption>
    </figure>
  );
}

/* ---------- The first letter's "I noticed" ---------- */

/** The numbers behind an observation: its big figure (with where it started,
 *  so the full-screen moment can count up to it) and its trend. Shared by the
 *  card and the moment (components/cozy/focus/InsightMoment.tsx). */
export interface InsightFigures {
  tone: CardTone;
  hero?: { from: number; to: number; format: (v: number) => string; sub: string };
  trend?: { values: number[]; label: string };
}

export function insightFigures(account: DemoAccount, id: FocusId): InsightFigures {
  const tone = FOCUS_TONE[id];
  const p = pumpSummary(account);
  const s = sleepSummary(account);
  if (id === 'sleep' && s) {
    return {
      tone,
      hero: {
        from: s.longestWeekAgo,
        to: s.longestNow,
        format: fmtMinutes,
        sub: `Longest stretch, up from ${fmtMinutes(s.longestWeekAgo)}`,
      },
      trend: { values: s.longest, label: 'Longest sleep each day · last 7 days' },
    };
  }
  if (id === 'lactation' && p) {
    return {
      tone,
      hero: {
        from: p.avgMl,
        to: p.nightMl,
        format: (v) => `${Math.round(v)} ml`,
        sub: `Your 3 a.m. session · ${p.avgMl} ml on average`,
      },
      trend: { values: p.perDayMl, label: 'Pumped each day · last 7 days' },
    };
  }
  if (id === 'growth') {
    const weights = account.growth.flatMap((g) => (g.weightKg ? [g.weightKg] : []));
    if (weights.length < 2) return { tone };
    return {
      tone,
      hero: {
        from: weights[0],
        to: weights[weights.length - 1],
        format: (v) => `${v.toFixed(1)} kg`,
        sub: `Up from ${weights[0]} kg at birth`,
      },
      trend: { values: weights, label: `Weight since birth · check-up in ${daysUntil(account.nextCheckup.date)} days` },
    };
  }
  if (id === 'mood' && p) {
    return {
      tone,
      hero: {
        from: 0,
        to: p.nightsPumped,
        format: (v) => `${Math.round(v)} of 7`,
        sub: 'Nights with a 3 a.m. pump this week',
      },
    };
  }
  return { tone };
}

/** "I noticed" for one direction — the first letter, and each direction's
 *  preview sheet and hub. Without device data it says what would fill it in. */
export function InsightStoryCard({ account, id }: { account: DemoAccount; id: FocusId }) {
  const insight = focusInsight(account, id);
  if (!insight) {
    const baby = account.baby.name;
    return (
      <StoryCard
        tone={FOCUS_TONE[id]}
        eyebrow={id === 'mood' ? 'For you' : 'I noticed'}
        title={id === 'mood' ? 'Cozie is here for you, too' : 'Nothing from a device yet'}
        art={id}
        className="sc--insight"
      >
        <p className="sc__note">
          {id === 'lactation'
            ? 'Pair a Momcozy pump and Cozie will see every session here. Until then, a pumping log or a quick chat works too.'
            : id === 'sleep'
              ? `Pair a Momcozy monitor and Cozie will see how ${baby} sleeps. Until then, a sleep tracker export or a quick chat works too.`
              : 'Talk about anything — the hard nights, the small wins, the things nobody asks you about.'}
        </p>
      </StoryCard>
    );
  }
  const f = insightFigures(account, id);
  const hero = f.hero && <Hero number={f.hero.format(f.hero.to)} sub={f.hero.sub} />;
  const trend = f.trend && <TrendLine values={f.trend.values} label={f.trend.label} />;
  return (
    <StoryCard
      tone={FOCUS_TONE[id]}
      eyebrow="I noticed"
      title={insight.title}
      art={id}
      hero={hero}
      source={`From ${insight.source.replace(/^Momcozy /, 'your ')}`}
      className="sc--insight"
    >
      {trend}
      <p className="sc__note">{insight.text}</p>
    </StoryCard>
  );
}

/* ---------- Card blocks in Cozie's replies ---------- */

/** A card block from a reply; `open` while it is still streaming in. */
export function ChatCard({ spec, open }: { spec: CardSpec | null; open: boolean }) {
  if (!spec) return <StoryCard tone="cream" className="sc--chat sc--loading" />;
  if (spec.kind === 'data') return <DataCard dataKey={spec.key} />;

  const tone = spec.tone ?? TYPE_TONE[spec.type];
  return (
    <StoryCard
      tone={tone}
      title={spec.title}
      art={spec.type}
      source={open ? undefined : 'Cozie summary · general guidance, not medical advice'}
      className="sc--chat"
    >
      {(spec.number || spec.items.length > 0 || spec.rows.length > 0) && (
        <div className="sc__panel">
          {spec.number && <Hero number={spec.number} sub={spec.unit} />}
          {spec.type === 'compare' && spec.rows.length > 0 && (
            <table className="sc__compare">
              {spec.columns && (
                <thead>
                  <tr>
                    <th />
                    <th>{spec.columns[0]}</th>
                    <th>{spec.columns[1]}</th>
                  </tr>
                </thead>
              )}
              <tbody>
                {spec.rows.map((r) => (
                  <tr key={r[0]}>
                    <th>{r[0]}</th>
                    <td>{r[1]}</td>
                    <td>{r[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {spec.items.length > 0 &&
            (spec.type === 'steps' ? (
              <ol className="sc__steps">
                {spec.items.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ol>
            ) : (
              <ul className={cn('sc__list', spec.type === 'checklist' && 'sc__list--check')}>
                {spec.items.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            ))}
        </div>
      )}
      {spec.note && <p className="sc__note">{spec.note}</p>}
    </StoryCard>
  );
}

/** Her own numbers, drawn from the Momcozy account — the model only asks for
 *  the card, so these figures are never written by it. */
function DataCard({ dataKey }: { dataKey: DataKey }) {
  const account = useDemoAccount();
  const baby = account.baby.name;

  if (dataKey === 'pumping-week') {
    const p = pumpSummary(account);
    if (!p)
      return (
        <NoData
          tone="pink"
          title="No pumping data yet"
          text="Pair a Momcozy pump, or add a pumping log, and your week shows up here."
        />
      );
    return (
      <StoryCard
        tone="pink"
        title="Your pumping week"
        art="lactation"
        source={`From your ${deviceOf(account, 'pump')!.name.replace('Momcozy ', '')} · last 7 days`}
        className="sc--chat"
        hero={
          <Hero
            number={`${Math.round(p.perDay)} a day`}
            sub={`About ${p.avgMl} ml each · 3 a.m. is your fullest (${p.nightMl} ml)`}
          />
        }
      >
        <TrendLine values={p.perDayMl} label={`Pumped each day: ${p.firstDayMl} → ${p.lastDayMl} ml`} />
      </StoryCard>
    );
  }

  if (dataKey === 'sleep-week') {
    const s = sleepSummary(account);
    if (!s)
      return (
        <NoData
          tone="lavender"
          title="No sleep data yet"
          text={`Pair a Momcozy monitor, or add a sleep tracker export, and ${baby}’s week shows up here.`}
        />
      );
    return (
      <StoryCard
        tone="lavender"
        title={`${baby}’s sleep this week`}
        art="sleep"
        source={`From your ${deviceOf(account, 'monitor')!.name.replace('Momcozy ', '')} · last 7 days`}
        className="sc--chat"
        hero={
          <Hero
            number={fmtMinutes(s.longestNow)}
            sub={`Longest stretch · night wakes ${s.wakesWeekAgo} → ${s.wakesNow}`}
          />
        }
      >
        <TrendLine
          values={s.longest}
          label={`Longest sleep each day · about ${fmtMinutes(s.avgTotalMin)} a day in total`}
        />
      </StoryCard>
    );
  }

  const fmt = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  if (!account.growth.length)
    return (
      <NoData
        tone="green"
        title="No growth log yet"
        text={`Add a weigh-in in the Momcozy app and ${baby}’s growth shows up here.`}
      />
    );
  const latest = account.growth[account.growth.length - 1];
  return (
    <StoryCard
      tone="green"
      title={`${baby}’s growth`}
      art="growth"
      source={`From ${baby}’s profile in the Momcozy app`}
      className="sc--chat"
      hero={<Hero number={`${latest.weightKg} kg`} sub={`Up from ${account.growth[0].weightKg} kg at birth`} />}
    >
      <ul className="sc__log">
        {account.growth.map((g) => (
          <li key={g.label}>
            <time>{fmt(g.date)}</time>
            {g.label} ·{' '}
            {[g.weightKg && `${g.weightKg} kg`, g.lengthCm && `${g.lengthCm} cm`].filter(Boolean).join(' · ')}
          </li>
        ))}
        <li className="is-next">
          <time>{fmt(account.nextCheckup.date)}</time>
          {account.nextCheckup.label} · in {daysUntil(account.nextCheckup.date)} days
        </li>
      </ul>
    </StoryCard>
  );
}

function NoData({ tone, title, text }: { tone: CardTone; title: string; text: string }) {
  return (
    <StoryCard tone={tone} title={title} className="sc--chat">
      <p className="sc__note">{text}</p>
    </StoryCard>
  );
}

/** Placeholder drawings for summary cards until the illustrations arrive. */
function SummaryArt({ type, className }: { type: IllustrationTopic; className: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 80 80"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {type === 'checklist' ? (
        <>
          <rect x="18" y="12" width="44" height="58" rx="6" />
          <path d="M31 12V8h18v4M27 30l4 4 7-8M27 46l4 4 7-8M44 31h11M44 47h11M27 62h28" />
        </>
      ) : type === 'compare' ? (
        <>
          <path d="M40 10v58M24 68h32M14 24h52" />
          <path d="M14 24 6 44h16ZM66 24l-8 20h16Z" />
        </>
      ) : type === 'number' ? (
        <>
          <circle cx="40" cy="40" r="26" />
          <path d="M40 24v16l10 8" />
        </>
      ) : (
        <>
          <path d="M22 14h36a4 4 0 0 1 4 4v48a4 4 0 0 1-4 4H22a4 4 0 0 1-4-4V18a4 4 0 0 1 4-4Z" />
          <path d="M28 28h24M28 40h24M28 52h14" />
          <circle cx="58" cy="60" r="10" />
          <path d="M54 60l3 3 5-6" />
        </>
      )}
    </svg>
  );
}
