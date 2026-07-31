'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { applyProfilePatch, type CozyProfile } from '@/lib/cozy/profile';
import { useDeviceId } from './useDeviceId';

/** Loads the per-device profile and exposes applyPatch — the single mutation
 *  entry point. Whatever produces a patch (inline tags today) calls this. */
export function useProfile() {
  const deviceId = useDeviceId();
  const [profile, setProfile] = useState<CozyProfile>({});
  const [loaded, setLoaded] = useState(false);
  const deviceRef = useRef<string | null>(null);

  useEffect(() => {
    deviceRef.current = deviceId;
  }, [deviceId]);

  useEffect(() => {
    if (!deviceId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/profile?deviceId=' + encodeURIComponent(deviceId));
        if (res.ok) {
          const data = (await res.json()) as { profile?: CozyProfile };
          if (!cancelled && data.profile && typeof data.profile === 'object') {
            setProfile(data.profile);
          }
        }
      } catch {
        /* offline / not configured — silent */
      }
      if (!cancelled) setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [deviceId]);

  const applyPatch = useCallback((patch: Partial<CozyProfile>) => {
    setProfile((cur) => {
      const next = applyProfilePatch(cur, patch);
      const id = deviceRef.current;
      if (id) {
        fetch('/api/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deviceId: id, profile: next }),
        }).catch(() => {});
      }
      return next;
    });
  }, []);

  return { profile, loaded, applyPatch };
}
