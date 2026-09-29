'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CZ, MaskIcon } from '@/components/cozy/ui';

// Tab order, titles and icons follow the App's new-flow tab bar
// (TabBarItem.visibleItems: home, smart, ai, moment, mine).
const TABS = [
  { href: '/home', label: 'Home', icon: 'home' },
  { href: '/device', label: 'Device', icon: 'device' },
  { href: '/cozy', label: 'Cozie AI', icon: 'ai' },
  { href: '/community', label: 'Community', icon: 'community' },
  { href: '/me', label: 'Me', icon: 'me' },
] as const;

// Full-screen detail pages that have their own back nav — the floating tab bar
// doesn't belong under them.
const HIDE_TAB_BAR_ON = ['/cozy/schedule'];

/** App-style floating glass tab bar (iOS 26 UITabBar look): 10pt labels,
 *  #3E0010 normal / #770523 selected, the AI tab keeps its original-colour
 *  selected artwork. */
export function GlassTabBar() {
  const pathname = usePathname();

  if (HIDE_TAB_BAR_ON.some((p) => pathname.startsWith(p))) return null;

  return (
    <nav className="glass-tab-bar" aria-label="Primary navigation">
      {TABS.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`glass-tab-bar__item ${active ? 'is-active' : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            <span className="glass-tab-bar__icon">
              {tab.icon === 'ai' && active ? (
                <img src={`${CZ}/tab/ai-selected.svg`} alt="" draggable={false} />
              ) : (
                <MaskIcon
                  src={`${CZ}/tab/${tab.icon}${active && tab.icon !== 'ai' ? '-selected' : tab.icon === 'ai' ? '-normal' : ''}.svg`}
                  size={24}
                />
              )}
            </span>
            <span className="glass-tab-bar__label">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
