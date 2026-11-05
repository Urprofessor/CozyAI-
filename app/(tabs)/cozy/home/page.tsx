'use client';

import { useRouter } from 'next/navigation';
import { CozieHomePage } from '@/components/cozy/home/CozieHomePage';
import { ToastHost } from '@/components/cozy/ui';
import { useCozieLife } from '@/hooks/useCozieLife';
import { useProfile } from '@/hooks/useProfile';

/** Direct link to Cozie's home (normally opened from the chat top bar). */
export default function CozieHomeRoute() {
  const router = useRouter();
  const life = useCozieLife();
  const { profile } = useProfile();
  return (
    <>
      <CozieHomePage
        life={life}
        profile={profile}
        onBack={() => router.push('/cozy')}
      />
      <ToastHost />
    </>
  );
}
