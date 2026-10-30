'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { CozyChat } from '@/components/cozy/Chat';
import { CozyCloseContext, CozyVisibleContext } from './cozyClose';
import { GlassTabBar } from './GlassTabBar';

const RETURN_KEY = 'cozyReturnTo';
const LAUNCHER_R = 31; // half the 62pt launcher button

/** Tab pages + tab bar + Cozie. Cozie opens over the current tab as a
 *  full-screen layer that grows out of the launcher button (circle reveal), so
 *  the tab underneath stays put and shows through while it opens and closes.
 *  It stays mounted once loaded, so reopening is instant. /cozy remains a real
 *  route for direct entry. */
export function CozyShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const onCozyRoute = pathname.startsWith('/cozy');
  const [open, setOpen] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const originRef = useRef({ x: 0, y: 0 });

  // Navigating away from inside Cozie (e.g. the lactation questionnaire)
  // leaves the overlay behind.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const reveal = useCallback((from: number, to: number, ms: number) => {
    const stage = stageRef.current;
    if (!stage || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return null;
    const { x, y } = originRef.current;
    const box = stage.getBoundingClientRect();
    const far = Math.hypot(Math.max(x, box.width - x), Math.max(y, box.height - y));
    const circle = (r: number) => `circle(${r === Infinity ? far : r}px at ${x}px ${y}px)`;
    return stage.animate([{ clipPath: circle(from) }, { clipPath: circle(to) }], {
      duration: ms,
      easing: 'cubic-bezier(0.3, 0, 0.2, 1)',
      fill: 'forwards',
    });
  }, []);

  const openCozy = useCallback(
    (launcher: HTMLElement) => {
      const stage = stageRef.current;
      if (!stage) return;
      const box = stage.getBoundingClientRect();
      const b = launcher.getBoundingClientRect();
      originRef.current = { x: b.left + b.width / 2 - box.left, y: b.top + b.height / 2 - box.top };
      sessionStorage.setItem(RETURN_KEY, pathname);
      setOpen(true);
      const anim = reveal(LAUNCHER_R, Infinity, 520);
      if (anim) anim.onfinish = () => anim.cancel();
    },
    [pathname, reveal]
  );

  const close = useCallback(() => {
    if (!open) {
      router.push(sessionStorage.getItem(RETURN_KEY) || '/home');
      return;
    }
    const anim = reveal(Infinity, LAUNCHER_R, 420);
    if (!anim) return setOpen(false);
    anim.onfinish = () => {
      setOpen(false);
      anim.cancel();
    };
  }, [open, reveal, router]);

  return (
    <CozyCloseContext.Provider value={close}>
      {children}
      {!onCozyRoute && <GlassTabBar onOpenCozy={openCozy} />}
      {!onCozyRoute && (
        <div
          ref={stageRef}
          className={cn('cozy-stage', open && 'is-open')}
          inert={!open}
          aria-hidden={!open}
        >
          <CozyVisibleContext.Provider value={open}>
            <CozyChat />
          </CozyVisibleContext.Provider>
        </div>
      )}
    </CozyCloseContext.Provider>
  );
}
