import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Tailwind class name merger — same helper shadcn/ui uses. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Random int in [min, max] inclusive. */
export function randInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

/** Compact relative time for chat-history rows ("Just now", "5m ago", "Yesterday"). */
export function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'Yesterday';
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
