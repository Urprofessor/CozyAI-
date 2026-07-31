'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { applyProfilePatch, type CozyProfile } from '@/lib/cozy/profile';
import { useDeviceId } from './useDeviceId';

const LS_KEY = 'cozyProfile';

function readLocal(): CozyProfile {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as CozyProfile) : {};
  } catch {
    return {};
  }
}

function writeLocal(p: CozyProfile) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(p));
  } catch {
    /* quota / private mode — ignore */
  }
}

/** Loads the per-device profile and exposes applyPatch — the single mutation
 *  entry point. localStorage is a warm cache + fallback (so the profile
 *  persists across routes even without Redis); Redis is authoritative when
 *  configured. */
export function useProfile() {
  const deviceId = useDeviceId();
  const [profile, setProfile] = useState<CozyProfile>({});
  const [loaded, setLoaded] = useState(false);
  const deviceRef = useRef<string | null>(null);

  useEffect(() => {
    deviceRef.current = deviceId;
  }, [deviceId]);

  // Fast local start so a plan made in the questionnaire is visible on return
  // even before (or without) a server round-trip.
  useEffect(() => {
    const local = readLocal();
    if (Object.keys(local).length) setProfile(local);
  }, []);

  useEffect(() => {
    if (!deviceId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/profile?deviceId=' + encodeURIComponent(deviceId));
        if (res.ok) {
          const data = (await res.json()) as { profile?: CozyProfile };
          // Only let the server override when it actually has data (Redis
          // configured); otherwise keep the local copy.
          if (!cancelled && data.profile && Object.keys(data.profile).length) {
            setProfile(data.profile);
            writeLocal(data.profile);
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
      writeLocal(next);
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
