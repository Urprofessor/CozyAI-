'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Hexagon, House, Orbit, UserRound } from 'lucide-react';

const SIDE_TABS = [
  { href: '/home', label: 'Home', icon: House },
  { href: '/device', label: 'Device', icon: Hexagon },
] as const;

const SIDE_TABS_RIGHT = [
  { href: '/community', label: 'Community', icon: Orbit },
  { href: '/me', label: 'Me', icon: UserRound },
] as const;

/** iOS 26-style floating liquid-glass tab bar with the Cozy AI center slot. */
export function GlassTabBar() {
  const pathname = usePathname();
  const cozyActive = pathname.startsWith('/cozy');

  return (
    <nav className="glass-tab-bar" aria-label="Primary navigation">
      {SIDE_TABS.map((tab) => (
        <TabItem key={tab.href} {...tab} active={pathname.startsWith(tab.href)} />
      ))}

      <Link
        href="/cozy"
        className={`glass-tab-bar__item ${cozyActive ? 'is-active' : ''}`}
        aria-label="Cozy AI"
      >
        <span className="glass-tab-bar__icon">
          <img
            src="/images/IP_%E9%AB%98%E5%85%B4.png"
            alt=""
            draggable={false}
            className="glass-tab-bar__cozy"
          />
        </span>
        <span>Cozy AI</span>
      </Link>

      {SIDE_TABS_RIGHT.map((tab) => (
        <TabItem key={tab.href} {...tab} active={pathname.startsWith(tab.href)} />
      ))}
    </nav>
  );
}

function TabItem({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: typeof House;
  active: boolean;
}) {
  return (
    <Link href={href} className={`glass-tab-bar__item ${active ? 'is-active' : ''}`}>
      <span className="glass-tab-bar__icon">
        <Icon size={22} strokeWidth={1.9} />
      </span>
      <span>{label}</span>
    </Link>
  );
}
