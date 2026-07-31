'use client';

// Ported from the colleague's `h` component — the lactation tracking dashboard.
// Kept the maroon palette from the original design (a deliberate accent view).

import type { LactationPlan, LactationSession } from '@/lib/cozy/profile';

interface Props {
  plan: LactationPlan;
}

const BAR_MAX = 56;

export function LactationDashboard({ plan }: Props) {
  const sessions = plan.sessions ?? [];
  const doneCount = sessions.filter((s) => s.state === 'done').length;
  const total = plan.dailyFreq ?? 7;
  const next = sessions.find((s) => s.state === 'upcoming');
  const todayVol = plan.todayVolumeOz ?? 32;
  const ratio = total ? doneCount / total : 0;

  return (
    <div className="animate-rise w-full overflow-hidden rounded-[22px] bg-gradient-to-br from-[#8b1a3a] via-[#7c1f3e] to-[#5a1028] p-3.5 text-white shadow-[0_10px_28px_rgba(90,16,40,0.28)]">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[14px] font-medium">
          <span aria-hidden>✦</span>
          Lactation
        </div>
        <span className="text-[16px] text-white/80" aria-hidden>
          ›
        </span>
      </div>

      <div className="mb-3 grid grid-cols-3 gap-2">
        <Stat label="Last Pump" value="2h 45m ago" />
        <Stat label="Next session" value={next?.time ?? '—'} />
        <div>
          <div className="text-[10px] text-white/65">Sessions</div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[13px] font-medium">
            <svg width="16" height="16" viewBox="0 0 16 16" className="-rotate-90">
              <circle cx="8" cy="8" r="6" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2" />
              <circle
                cx="8"
                cy="8"
                r="6"
                fill="none"
                stroke="#ffc0cb"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 6 * ratio} ${2 * Math.PI * 6}`}
              />
            </svg>
            {doneCount}/{total}
          </div>
        </div>
      </div>

      <div className="relative mb-1 rounded-[16px] bg-black/15 px-2.5 pb-2 pt-3">
        <div className="absolute right-2 top-2 text-[9px] leading-[1.2] text-white/55">
          <div>oz</div>
          <div className="mt-3">20</div>
          <div className="mt-3">10</div>
          <div className="mt-3">0</div>
        </div>
        <div className="mr-6 flex items-end gap-1.5">
          {sessions.map((s) => (
            <Bar key={s.time} session={s} />
          ))}
          <div className="mb-[18px] flex flex-1 flex-col items-center">
            <div className="flex h-14 w-full max-w-[28px] items-center justify-center rounded-[8px] border border-dashed border-white/55 text-[16px] text-white/80">
              +
            </div>
          </div>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[12px] text-white/90">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/15 text-[9px]">◉</span>
          Today volume: {todayVol} oz
        </div>
        <button
          type="button"
          className="rounded-full bg-white/15 px-3 py-1.5 text-[12px] font-medium text-white ring-1 ring-white/20"
        >
          View Data
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] text-white/65">{label}</div>
      <div className="mt-0.5 text-[13px] font-medium">{value}</div>
    </div>
  );
}

function Bar({ session }: { session: LactationSession }) {
  const h = session.volumeOz ? Math.min(BAR_MAX, 16 + session.volumeOz * 2) : session.state === 'upcoming' ? 40 : 44;
  const bg =
    session.state === 'done'
      ? 'bg-[#ffc0cb]'
      : session.state === 'edit'
        ? 'bg-[#9e3a55]/90'
        : 'bg-[#6b2840]/85';
  return (
    <div className="flex flex-1 flex-col items-center gap-1">
      {session.volumeOz ? (
        <div className="text-[10px] font-medium text-[#ffdde1]">{session.volumeOz}</div>
      ) : (
        <div className="h-[14px]" />
      )}
      <div
        className={`relative flex w-full max-w-[28px] items-center justify-center rounded-t-[8px] ${bg}`}
        style={{ height: `${h}px` }}
      >
        {session.state === 'edit' && (
          <span className="text-[11px] text-white" aria-hidden>
            ✎
          </span>
        )}
      </div>
      <div className="text-[9px] text-white/70">{session.time}</div>
    </div>
  );
}
