'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CZ, MaskIcon } from '@/components/cozy/ui';

// Four tabs in the glass pill; Cozie sits apart on the right as a round
// launcher that opens full screen (see CozyShell).
const TABS = [
  { href: '/home', label: 'Home', icon: 'home' },
  { href: '/device', label: 'Device', icon: 'device' },
  { href: '/community', label: 'Community', icon: 'community' },
  { href: '/me', label: 'Me', icon: 'me' },
] as const;

interface Props {
  onOpenCozy: (launcher: HTMLElement) => void;
}

/** App-style floating glass tab bar (iOS 26 UITabBar look): 10pt labels,
 *  #3E0010 normal / #770523 selected, plus the round Cozie launcher. */
export function GlassTabBar({ onOpenCozy }: Props) {
  const pathname = usePathname();

  return (
    <nav className="glass-tab-bar" aria-label="Primary navigation">
      <div className="glass-tab-bar__pill">
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
                <MaskIcon src={`${CZ}/tab/${tab.icon}${active ? '-selected' : ''}.svg`} size={24} />
              </span>
              <span className="glass-tab-bar__label">{tab.label}</span>
            </Link>
          );
        })}
      </div>

      <button
        type="button"
        className="glass-tab-bar__cozie"
        onClick={(e) => onOpenCozy(e.currentTarget)}
        aria-label="Open Cozie AI"
      >
        <img src={`${CZ}/icons/cozie_tab.png`} alt="" draggable={false} />
      </button>
    </nav>
  );
}
