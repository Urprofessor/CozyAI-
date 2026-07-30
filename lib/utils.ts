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
