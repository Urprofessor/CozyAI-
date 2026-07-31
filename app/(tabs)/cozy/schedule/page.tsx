'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { LactationDashboard } from '@/components/cozy/skill/LactationDashboard';

export default function SchedulePage() {
  const { profile } = useProfile();
  const plan = profile.lactationPlan;
  const showDashboard = !!plan?.trackingStarted;

  return (
    <div className="schedule-page">
      <div className="schedule-page__top">
        <Link href="/cozy" className="schedule-page__back" aria-label="Back to Cozy AI">
          <ChevronLeft size={20} strokeWidth={2} />
        </Link>
        <strong>Schedule</strong>
      </div>

      <div className="schedule-page__scroll">
        {showDashboard && plan ? (
          <LactationDashboard plan={plan} />
        ) : (
          <img src="/images/schedule.png" alt="Your schedule" draggable={false} />
        )}
      </div>
    </div>
  );
}
