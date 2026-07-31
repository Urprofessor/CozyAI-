'use client';

// Ported from the colleague's `p` component — the "Skill · AI吸乳计划" offer
// card. Colors mapped to Momcozy tokens via the --color-* aliases.

interface Progress {
  current: number;
  total: number;
}

interface Props {
  title: string;
  subtitle: string;
  highlights: string[];
  cta: string;
  started?: boolean;
  completed?: boolean;
  paused?: boolean;
  progress?: Progress;
  onStart: () => void;
}

export function SkillCard({
  title,
  subtitle,
  highlights,
  cta,
  started,
  completed,
  paused,
  progress,
  onStart,
}: Props) {
  return (
    <div className="animate-rise self-start w-[92%] max-w-[92%] overflow-hidden rounded-[20px] border border-[var(--color-line)] bg-[var(--color-surface)] shadow-[0_8px_24px_rgba(36,15,27,0.06)]">
      <div className="relative overflow-hidden bg-gradient-to-br from-[#fff7f8] via-[#ffdde1]/70 to-[#ee9ca7]/35 px-4 pb-3 pt-4">
        <div className="absolute -right-6 -top-8 h-28 w-28 rounded-full bg-[#770523]/10 blur-2xl" />
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-medium tracking-[0.02em] text-[var(--color-mom-700)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-mom-700)]" />
            Skill · AI吸乳计划
          </span>
          {paused && progress && (
            <span className="rounded-full bg-[var(--color-mom-700)] px-2.5 py-1 text-[10px] font-medium text-white">
              进度 {progress.current}/{progress.total}
            </span>
          )}
        </div>
        <h3 className="text-[20px] leading-[26px] text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-brand)' }}>
          {title}
        </h3>
        <p className="mt-1 text-[13px] leading-[18px] text-[var(--color-muted)]">
          {paused && progress ? `问卷已填写至 ${progress.current}/${progress.total}，可继续完成计划` : subtitle}
        </p>
      </div>

      <div className="space-y-2 px-4 py-3">
        {paused && progress ? (
          <div className="rounded-[14px] bg-[var(--color-canvas)] px-3 py-2.5">
            <div className="mb-1.5 flex items-center justify-between text-[12px] text-[var(--color-muted)]">
              <span>填写进度</span>
              <span className="font-medium text-[var(--color-mom-700)]">
                {progress.current}/{progress.total}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-line)]">
              <div
                className="h-full rounded-full bg-[var(--color-mom-700)] transition-[width] duration-300"
                style={{ width: `${Math.max(8, (progress.current / progress.total) * 100)}%` }}
              />
            </div>
          </div>
        ) : (
          highlights.map((h) => (
            <div key={h} className="flex items-start gap-2 text-[13px] leading-[18px] text-[var(--color-ink)]">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-mom-500)]" />
              <span>{h}</span>
            </div>
          ))
        )}
      </div>

      <div className="border-t border-[var(--color-line)] px-4 py-3">
        {completed ? (
          <div className="rounded-[12px] bg-[var(--color-mom-50)] px-3 py-2.5 text-center text-[13px] font-medium text-[var(--color-mom-700)]">
            已成功生成 ✅
          </div>
        ) : started && !paused ? (
          <div className="rounded-[12px] bg-[var(--color-canvas)] px-3 py-2.5 text-center text-[13px] text-[var(--color-muted)]">
            问卷进行中…完成后会回到这里
          </div>
        ) : (
          <button
            type="button"
            onClick={onStart}
            className="flex w-full items-center justify-center gap-2 rounded-[14px] bg-[var(--color-mom-700)] px-4 py-3 text-[14px] font-medium text-white transition active:bg-[var(--color-mom-900)]"
          >
            {paused ? '继续填写' : cta}
            <span aria-hidden>→</span>
          </button>
        )}
      </div>
    </div>
  );
}
